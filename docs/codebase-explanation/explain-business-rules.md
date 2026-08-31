# The 5 Business Rules — Code Logic Walkthrough

## 📁 Primary File: `server/src/services/requests.js`

All 5 business rules live in this **one file**. This is the most important server-side file in the entire codebase. If an interviewer says "show me the business logic", this is the file you open.

---

## How This File Works (The Big Picture)

```
[HTTP Request arrives]
        ↓
   routes/requests.js     → maps the URL to a controller function
        ↓
   validators/requests.js → checks JSON shape (Zod) → 400 if bad input
        ↓
   controllers/requests.js → extracts req.body, req.params
        ↓
★  services/requests.js    → enforces the 5 Business Rules ← YOU ARE HERE
        ↓
   queries/requests.js     → runs parameterized SQL against PostgreSQL
```

The key idea:
- **Controllers** handle HTTP (what came in, what goes out).
- **Services** handle DOMAIN (is this allowed by our rules?).
- **Services never touch `req` or `res`**. They only work with plain data and throw `AppError`.

---

## AppError — The Weapon Services Use

Before reading the rules, understand `AppError`:

```javascript
// server/src/utils/AppError.js

class AppError extends Error {
  constructor(statusCode, errorCode, message) {
    super(message);
    this.statusCode = statusCode;  // HTTP status (400, 404, 409, 422...)
    this.errorCode = errorCode;    // Machine-readable code ('REQUEST_LOCKED')
  }
}
```

When a service function calls `throw new AppError(422, 'REQUEST_LOCKED', '...')`:
1. Execution immediately stops in that function.
2. Express's global error handler (`middleware/errorHandler.js`) catches it.
3. It sends a standardized JSON response to the client:
```json
{
  "error": {
    "code": "REQUEST_LOCKED",
    "message": "Request details cannot be edited once it has reached \"Approved\" status."
  }
}
```

---

## ─────────────────────────────────────────────────────
## RULE 1 — Status Flow (State Machine)
## ─────────────────────────────────────────────────────

### What the rule says:
A return request must move forward only through allowed steps.  
You cannot skip steps or reverse steps.

### Allowed paths:
```
Open  →  In Review  →  Approved  →  Completed
                  →  Rejected          (final)
                                   (final)
```

### Where in the file:

**Lines 23–29**: The transition map (lookup table)
```javascript
const LEGAL_TRANSITIONS = {
  'Open':      ['In Review'],            // Open can only go to In Review
  'In Review': ['Approved', 'Rejected'], // In Review can branch two ways
  'Approved':  ['Completed'],            // Approved can only close out
  'Rejected':  [],                       // [] means FINAL — no transitions allowed
  'Completed': [],                       // [] means FINAL — no transitions allowed
};
```

**Lines 38–50**: The validation function
```javascript
function validateStatusTransition(currentStatus, nextStatus) {
  const allowed = LEGAL_TRANSITIONS[currentStatus];
  // Check: is the requested next status in the allowed list?
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      422,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from "${currentStatus}" to "${nextStatus}".`
    );
  }
}
```

**Lines 172–173**: Where it is called
```javascript
// Inside transitionStatus() function
validateStatusTransition(request.status, status); // Always called first
```

### How to trace it end-to-end:
1. Agent clicks "Move to Approved" on an `Open` request.
2. Frontend sends `PATCH /api/requests/:id/status` with `{ status: 'Approved' }`.
3. `transitionStatus()` loads the current request from DB → status = `'Open'`.
4. Calls `validateStatusTransition('Open', 'Approved')`.
5. Checks `LEGAL_TRANSITIONS['Open']` → `['In Review']`.
6. `'Approved'` is NOT in `['In Review']` → throws `AppError(422, 'INVALID_STATUS_TRANSITION')`.
7. Agent sees error: *"Cannot transition from 'Open' to 'Approved'."*

---

## ─────────────────────────────────────────────────────
## RULE 2 — Approval Must Have a Valid Resolution
## ─────────────────────────────────────────────────────

### What the rule says:
When moving a request to `Approved`, the agent must decide **how** the customer is compensated.
- If `Refund` → must provide a dollar amount greater than 0.
- If `Replacement` or `Store Credit` → must NOT provide any dollar amount.

### Where in the file:

**Lines 52–82**: The validation function (has 3 sub-rules inside)
```javascript
function validateApprovalResolution(resolution, refundAmount) {

  // Sub-rule 2a: Resolution is mandatory on any Approval
  if (!resolution) {
    throw new AppError(422, 'RESOLUTION_REQUIRED', '...');
  }

  if (resolution === 'Refund') {
    // Sub-rule 2b: Refund must have a positive amount
    if (!refundAmount || refundAmount <= 0) {
      throw new AppError(422, 'REFUND_AMOUNT_REQUIRED', '...');
    }
  } else {
    // Sub-rule 2c: Non-Refund resolutions cannot have any amount
    if (refundAmount != null) {
      throw new AppError(422, 'REFUND_AMOUNT_NOT_ALLOWED', '...');
    }
  }
}
```

**Lines 179–184**: Where it is called
```javascript
if (status === 'Approved') {
  validateApprovalResolution(resolution, refund_amount); // Guard
  finalResolution = resolution;
  // Only writes refund_amount to DB if resolution = 'Refund'
  finalRefundAmount = resolution === 'Refund' ? refund_amount : null;
}
```

### Key Detail — Why `!= null` instead of `!`?

```javascript
if (refundAmount != null)   // checks for null AND undefined
// vs
if (refundAmount)           // would also treat 0 as falsy
```

`0` is a falsy value in JavaScript, so if we used `if (!refundAmount)`, passing `refund_amount: 0` would slip through. Using `!= null` explicitly catches all non-null values including `0`.

---

## ─────────────────────────────────────────────────────
## RULE 3 — One Active Return Per Item (Per Order)
## ─────────────────────────────────────────────────────

### What the rule says:
A customer cannot have two open/active return tickets for the same item on the same order at the same time.

### This rule is enforced in TWO places (dual layer):

#### Layer 1 — Application layer (friendly error, race-condition-prone):

**Lines 88–101**: Inside `createRequest()`
```javascript
async function createRequest(data) {
  // Query DB: is there already an active request for this order+item?
  const duplicate = await queries.findActiveRequestForItem(data.order_id, data.item_name);
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_ACTIVE_REQUEST', '...');
  }
  return queries.insertRequest(data);
}
```

**Lines 143–157**: Re-checked inside `updateRequestDetails()` too
```javascript
// If agent changes order_id or item_name during an edit, re-validate
const newOrderId = fields.order_id ?? request.order_id;
const newItemName = fields.item_name ?? request.item_name;

if (newOrderId !== request.order_id || newItemName !== request.item_name) {
  const duplicate = await queries.findActiveRequestForItem(newOrderId, newItemName, id);
  // 'id' is passed so the query excludes the current request from the check
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_ACTIVE_REQUEST', '...');
  }
}
```

#### Layer 2 — Database layer (race-condition-proof):

In `server/src/db/schema.sql`, this partial unique index acts as the final safety net:
```sql
CREATE UNIQUE INDEX unique_active_item_request
  ON return_requests (order_id, item_name)
  WHERE status NOT IN ('Rejected', 'Completed')
    AND is_removed = FALSE;
```

If two requests are submitted at the **exact same millisecond** (race condition), the application check might allow both through. But PostgreSQL's index lock ensures only one INSERT succeeds. The second gets `pg error 23505` (unique constraint violation), which `errorHandler.js` catches and converts to `409 DUPLICATE_ACTIVE_REQUEST`.

---

## ─────────────────────────────────────────────────────
## RULE 4 — Details Locked Once Decided
## ─────────────────────────────────────────────────────

### What the rule says:
Once a request reaches `Approved`, `Rejected`, or `Completed`, the agent can no longer edit customer details, item info, reason, or quantity. Only internal notes can still be added.

### Where in the file:

**Line 32**: The constant that defines "decided"
```javascript
const DECIDED_STATUSES = ['Approved', 'Rejected', 'Completed'];
```

**Lines 134–141**: Inside `updateRequestDetails()`
```javascript
async function updateRequestDetails(id, fields) {
  const request = await queries.findRequestById(id);

  // Rule 4: Check if decided before allowing any edit
  if (DECIDED_STATUSES.includes(request.status)) {
    throw new AppError(
      422,
      'REQUEST_LOCKED',
      `Request details cannot be edited once it has reached "${request.status}" status. Notes can still be added.`
    );
  }

  // If we reach here, the request is Open or In Review — edits are allowed
  const updated = await queries.updateRequest(id, fields);
  return updated;
}
```

**Lines 190–198**: Why notes are exempt from this rule
```javascript
async function addNote(requestId, content) {
  // Notice: NO check for DECIDED_STATUSES here
  // Notes can be added at any status — by design
  const request = await queries.findRequestById(requestId);
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }
  return queries.insertNote(requestId, content);
}
```

### Frontend Reflection (client/app/requests/[id]/page.js):
The UI also enforces this visually:
```javascript
const isDecided = ['Approved', 'Rejected', 'Completed'].includes(request.status);

// Inputs become disabled
<input disabled={isDecided} />

// Save button disappears
{!isDecided && <button>Save Changes</button>}
```

---

## ─────────────────────────────────────────────────────
## RULE 5 — Soft Deletion (Only Open or Rejected)
## ─────────────────────────────────────────────────────

### What the rule says:
Only `Open` and `Rejected` requests can be taken off the desk. You cannot remove a request that is `In Review`, `Approved`, or `Completed` (active or financially committed).

Records are **never** physically deleted. They are hidden by setting `is_removed = TRUE`.

### Where in the file:

**Lines 200–218**: Inside `removeRequest()`
```javascript
async function removeRequest(id) {
  const request = await queries.findRequestById(id);
  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found.');
  }

  // Rule 5: Status guard — only Open or Rejected can be removed
  if (!['Open', 'Rejected'].includes(request.status)) {
    throw new AppError(
      422,
      'REMOVAL_NOT_ALLOWED',
      `Only requests with status "Open" or "Rejected" can be removed. ` +
        `This request is "${request.status}".`
    );
  }

  // Soft-delete: sets is_removed = TRUE, removed_at = NOW()
  // The row remains in the DB forever for auditing
  await queries.softDeleteRequest(id);
  return { data: { message: `Request ${request.reference} has been removed.` } };
}
```

### What the query actually executes (in `queries/requests.js`):
```sql
UPDATE return_requests
SET is_removed = TRUE, removed_at = NOW()
WHERE id = $1;
```

**No `DELETE` statement is ever run**. The record persists in PostgreSQL permanently.

### How soft-delete interacts with Rule 3 (Partial Index):
Once `is_removed = TRUE`, the row exits the partial unique index:
```sql
WHERE status NOT IN ('Rejected', 'Completed')
  AND is_removed = FALSE    ← removed rows fall out of this index
```
This means the customer can raise a brand-new return for that same item in the future.

---

## Summary: Rule Map

| Rule | Function Where Enforced | Trigger | Error Code |
|---|---|---|---|
| **1. Status Flow** | `validateStatusTransition()` → `transitionStatus()` | Every status change | `INVALID_STATUS_TRANSITION` (422) |
| **2. Approval Resolution** | `validateApprovalResolution()` → `transitionStatus()` | Status = `'Approved'` | `RESOLUTION_REQUIRED` / `REFUND_AMOUNT_REQUIRED` (422) |
| **3. One Active Request** | `createRequest()` + `updateRequestDetails()` + DB index | Create + Edit | `DUPLICATE_ACTIVE_REQUEST` (409) |
| **4. Locked When Decided** | `updateRequestDetails()` | Any detail edit | `REQUEST_LOCKED` (422) |
| **5. Soft Delete Only** | `removeRequest()` | DELETE request | `REMOVAL_NOT_ALLOWED` (422) |
