# ReturnDesk — Technical Interview & Code Defense Guide

This guide breaks down the entire ReturnDesk project in simple, clear technical terms. Use it to prepare for the technical interview, code walkthroughs, and architecture defense.

---

## 1. High-Level Architecture (The 30-Second Explanation)

```
[Browser (Next.js 15)] 
        │  (HTTP / JSON REST API)
        ▼
[Express Server] 
  ├── 1. Routes (`routes/requests.js`)       → Maps URLs to handlers
  ├── 2. Validators (`validators/requests.js`) → Zod input schema checking (400)
  ├── 3. Controllers (`controllers/requests.js`)→ Handles req / res
  ├── 4. Services (`services/requests.js`)     → Authoritative Business Rules (422/409)
  └── 5. Queries (`queries/requests.js`)       → Parameterized Raw SQL
        │
        ▼
[PostgreSQL Database] 
  ├── Custom ENUMs (`request_status`, `return_reason`, `resolution_type`)
  ├── Sequence (`request_ref_seq` for atomic `RD-000001` references)
  └── Partial Unique Index (`unique_active_item_request` for Rule 3)
```

**Why this structure?**
- **Separation of Concerns**: Controllers only handle HTTP; Services only handle business rules; Queries only talk to PostgreSQL.
- **Easy to Test & Explain**: You can test business rules in `services/` without spinning up a web server.

---

## 2. Database Schema (`server/src/db/schema.sql`)

### Key Design Highlights:

```sql
-- 1. ENUMs: Restricts values at the database engine level
CREATE TYPE request_status AS ENUM ('Open', 'In Review', 'Approved', 'Rejected', 'Completed');
CREATE TYPE return_reason AS ENUM ('Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind');
CREATE TYPE resolution_type AS ENUM ('Refund', 'Replacement', 'Store Credit');

-- 2. Sequence: Generates human-readable IDs atomically without race conditions
CREATE SEQUENCE IF NOT EXISTS request_ref_seq START 1;
-- In inserts: ('RD-' || LPAD(nextval('request_ref_seq')::text, 6, '0'))

-- 3. Main Requests Table
CREATE TABLE IF NOT EXISTS return_requests (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       VARCHAR(12)     UNIQUE NOT NULL,
  customer_name   VARCHAR(255)    NOT NULL,
  customer_email  VARCHAR(255)    NOT NULL,
  order_id        VARCHAR(100)    NOT NULL,
  item_name       VARCHAR(255)    NOT NULL,
  item_sku        VARCHAR(100),
  quantity        INTEGER         NOT NULL CHECK (quantity >= 1),
  reason          return_reason   NOT NULL,
  status          request_status  NOT NULL DEFAULT 'Open',
  resolution      resolution_type,
  refund_amount   NUMERIC(10, 2),
  is_removed      BOOLEAN         NOT NULL DEFAULT FALSE,
  removed_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- 4. Business Rule 3: Partial Unique Index (Crucial Interview Point)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_item_request
  ON return_requests (order_id, item_name)
  WHERE status NOT IN ('Rejected', 'Completed')
    AND is_removed = FALSE;

-- 5. Notes Table: Append-only
CREATE TABLE IF NOT EXISTS notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID        NOT NULL REFERENCES return_requests(id),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Interview Defense on Schema:
1. **Why `UUID` for PK?** Prevents enumeration attacks (someone guessing sequential database IDs).
2. **Why `NUMERIC(10, 2)` for money?** Avoids IEEE 754 binary floating-point rounding errors common with `FLOAT`.
3. **Why `TIMESTAMPTZ`?** Timezone-aware timestamping ensures accurate chronological sorting across timezones.
4. **Why a Partial Unique Index?** It only checks uniqueness for *active* requests. When a request is `Rejected`, `Completed`, or soft-deleted (`is_removed = TRUE`), it automatically falls out of the index so a customer can raise a new return for that item later.

---

## 3. The 5 Business Rules Explained Simply (`services/requests.js`)

All five business rules are strictly enforced on the server in `server/src/services/requests.js`:

### Rule 1 — Status Flow (State Machine)
- **Allowed Transitions**:
  - `Open` → `In Review`
  - `In Review` → `Approved` OR `Rejected`
  - `Approved` → `Completed`
  - `Rejected` & `Completed` are **final** (no further transitions).
- **Code Enforcement**:
  ```javascript
  const LEGAL_TRANSITIONS = {
    'Open':      ['In Review'],
    'In Review': ['Approved', 'Rejected'],
    'Approved':  ['Completed'],
    'Rejected':  [],
    'Completed': [],
  };
  function validateStatusTransition(currentStatus, nextStatus) {
    if (!LEGAL_TRANSITIONS[currentStatus].includes(nextStatus)) {
      throw new AppError(422, 'INVALID_STATUS_TRANSITION', `Cannot transition from "${currentStatus}" to "${nextStatus}".`);
    }
  }
  ```

---

### Rule 2 — Approval Requires Resolution
- **Sub-rules**:
  1. `Approved` must specify one of: `Refund`, `Replacement`, or `Store Credit`.
  2. If `Refund`: `refund_amount` must exist and be `> 0`.
  3. If `Replacement` or `Store Credit`: `refund_amount` must be `null`.
- **Code Enforcement**:
  ```javascript
  function validateApprovalResolution(resolution, refundAmount) {
    if (!resolution) throw new AppError(422, 'RESOLUTION_REQUIRED', 'Resolution is required on approval.');
    if (resolution === 'Refund') {
      if (!refundAmount || refundAmount <= 0) {
        throw new AppError(422, 'REFUND_AMOUNT_REQUIRED', 'Refund requires an amount greater than 0.');
      }
    } else {
      if (refundAmount != null) {
        throw new AppError(422, 'REFUND_AMOUNT_NOT_ALLOWED', `Refund amount not allowed for ${resolution}.`);
      }
    }
  }
  ```

---

### Rule 3 — One Live Request Per Item
- **Rule**: A customer cannot have 2 active requests for the same item on the same order simultaneously.
- **Dual Enforcement**:
  1. **Application check**: `queries.findActiveRequestForItem(order_id, item_name)` gives a friendly `409 DUPLICATE_ACTIVE_REQUEST`.
  2. **Database safeguard**: The partial unique index `unique_active_item_request` prevents race conditions if two requests are submitted at the exact same millisecond.

---

### Rule 4 — Locked Once Decided
- **Rule**: Once a return reaches `Approved`, `Rejected`, or `Completed`, customer and item details cannot be edited. Notes can still be added.
- **Code Enforcement**:
  ```javascript
  const DECIDED_STATUSES = ['Approved', 'Rejected', 'Completed'];
  if (DECIDED_STATUSES.includes(request.status)) {
    throw new AppError(422, 'REQUEST_LOCKED', `Cannot edit details of a "${request.status}" request.`);
  }
  ```

---

### Rule 5 — Soft Deletion / Removal
- **Rule**: Only `Open` or `Rejected` requests can be removed. The record stays in PostgreSQL (`is_removed = TRUE, removed_at = NOW()`) but disappears from all active API lists and lookups.
- **Code Enforcement**:
  ```javascript
  if (!['Open', 'Rejected'].includes(request.status)) {
    throw new AppError(422, 'REMOVAL_NOT_ALLOWED', `Only "Open" or "Rejected" requests can be removed.`);
  }
  await queries.softDeleteRequest(id);
  ```

---

## 4. Query Layer & Server-Side Filtering (`queries/requests.js`)

All filtering, searching, sorting, and pagination are executed in PostgreSQL—**zero client-side row dumping**.

### Dynamic SQL Query Construction:
```javascript
async function findRequests({ search, status, reason, sortBy, sortOrder, page, limit }) {
  const safeSortBy = sortBy || 'created_at';
  const safeSortOrder = (sortOrder || 'desc').toUpperCase();
  const offset = (page - 1) * limit;

  const conditions = ['is_removed = FALSE'];
  const params = [];

  // Multi-field search
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(customer_name ILIKE $${idx} OR order_id ILIKE $${idx} OR reference ILIKE $${idx})`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}::request_status`);
  }

  if (reason) {
    params.push(reason);
    conditions.push(`reason = $${params.length}::return_reason`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  
  // Stable pagination tiebreaker
  const orderClause = `ORDER BY ${safeSortBy} ${safeSortOrder}, id ASC`;

  // 1. Total count query
  const countResult = await pool.query(`SELECT COUNT(*) FROM return_requests ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  // 2. Paginated data query
  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT * FROM return_requests ${whereClause} ${orderClause} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataResult.rows, total };
}
```

---

## 5. REST API & Error Pipeline

### Standardized Response Envelopes:
- **Success Response (`200` / `201`)**:
  ```json
  {
    "data": { "id": "...", "reference": "RD-000001", "status": "Open" },
    "pagination": { "page": 1, "limit": 10, "total": 33, "totalPages": 4 }
  }
  ```
- **Error Response (`400` / `404` / `409` / `422`)**:
  ```json
  {
    "error": {
      "code": "INVALID_STATUS_TRANSITION",
      "message": "Cannot transition from \"Open\" to \"Approved\"."
    }
  }
  ```

### HTTP Error Codes Used:
- `400 Bad Request`: Zod input validation failure or malformed UUID (`INVALID_ID`).
- `404 Not Found`: Request ID does not exist or has been soft-deleted.
- `409 Conflict`: Duplicate active request for the same item on the same order.
- `422 Unprocessable Entity`: Business rule violations (illegal status transition, editing locked requests, invalid resolution amount).
- `500 Internal Error`: Unexpected server crashes (stack traces logged server-side only).

---

## 6. Frontend Architecture (`client/`)

- **Framework**: Next.js 15 (App Router) + React 19 + Tailwind CSS.
- **Debounced Search (`TopBar.js`)**: 250ms debounce updates query parameters smoothly without firing an API call on every single keystroke.
- **Optimistic UI (`NotesSidebar.js`)**: When an agent writes a note, the UI immediately appends it while the API request completes in the background. If the request fails, it automatically rolls back.
- **Locked UI State**: When viewing an `Approved`, `Rejected`, or `Completed` return, form inputs are disabled and an informative locked notification banner is shown.

---

## 7. Key Trade-offs & Designs Rejected

| Approach Rejected | Why It Was Rejected | What We Chose Instead |
|---|---|---|
| **Prisma / Drizzle ORM** | Partial indexes and complex dynamic WHERE clauses are harder to express and optimize in ORMs. | **Raw Parameterized SQL via `pg`**: Full transparency, zero overhead, precise query control. |
| **Client-Side Filtering** | Inefficient; breaks pagination when dataset grows large. | **Server-Side SQL Filtering**: `ILIKE`, `LIMIT`, and `OFFSET` in PostgreSQL. |
| **Hard `DELETE`** | Destroys financial and operational audit trails. | **Soft Deletion (`is_removed = TRUE`)**: Preserves complete database history. |
| **Client Reference Generation** | Prone to duplicate collisions under concurrency. | **PostgreSQL Sequence**: Atomic, race-condition-free reference generation. |

---

## 8. Top 5 Questions Interviewers Will Ask & How to Answer

### Q1: "How did you prevent two requests being raised for the same item at the same time?"
> **Answer:** *"I implemented two layers of protection. In the application service layer, we check `findActiveRequestForItem`. But because two simultaneous requests could race past that check, the true safety net is a PostgreSQL **partial unique index** on `(order_id, item_name) WHERE status NOT IN ('Rejected', 'Completed') AND is_removed = FALSE`. PostgreSQL acquires a unique index lock during insert—one succeeds, and the other fails with error `23505`, which our error handler converts to `409 DUPLICATE_ACTIVE_REQUEST`."*

### Q2: "Why did you use `NUMERIC(10,2)` instead of `FLOAT` for refund amounts?"
> **Answer:** *"Floating-point numbers in binary systems suffer from precision issues (e.g. `0.1 + 0.2 != 0.3`). In e-commerce and finance, exact base-10 decimal precision is mandatory, which is why PostgreSQL's `NUMERIC(10,2)` is used."*

### Q3: "How did you prevent SQL injection on dynamic sort columns?"
> **Answer:** *"Because column names in `ORDER BY` cannot use parameterized `$1` placeholders, I validated all sort inputs against an allowlist enum in Zod (`SORT_FIELDS = ['created_at', 'updated_at', 'status', 'reason']`). Unapproved column names are rejected with `400 Bad Request` before reaching the query layer."*

### Q4: "How does the system ensure notes are never edited or deleted?"
> **Answer:** *"The notes table is append-only by design. There are no `PATCH` or `DELETE` endpoints for notes in the API, no update queries in the data layer, and the table schema has no `updated_at` column."*

### Q5: "How does soft deletion interact with the unique constraint?"
> **Answer:** *"The partial unique index has the condition `AND is_removed = FALSE`. When a request is soft-deleted, `is_removed` becomes `TRUE`, which immediately removes that row from the partial index. This allows a customer to raise a new return for that item in the future without violating uniqueness."*
