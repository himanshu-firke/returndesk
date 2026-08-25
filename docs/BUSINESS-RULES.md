# ReturnDesk — Business Rules

Every rule here MUST be enforced on the server (Express).
The frontend hides illegal actions, but the API must also reject them directly.

---

## Rule 1: Status Flow

### Legal Transitions
| From | To |
|---|---|
| Open | In Review |
| In Review | Approved |
| In Review | Rejected |
| Approved | Completed |

### Illegal Transitions (examples)
- Open → Approved (skip)
- Open → Rejected (skip)
- Open → Completed (skip)
- Approved → Open (reverse)
- Approved → Rejected (wrong branch)
- Rejected → anything (final state)
- Completed → anything (final state)

### Why it exists
Ensures every request is reviewed before being decided, and prevents ad-hoc state manipulation.

### Where enforced
server/src/services/requests.js → validateStatusTransition()

### HTTP response when violated
- Status: 422 Unprocessable Entity
- Code: INVALID_STATUS_TRANSITION
- Message: "Cannot transition from [current] to [requested]. Legal transitions from [current]: [list]"

---

## Rule 2: Approval Needs a Resolution

### Sub-rules
2a. When transitioning to Approved, a resolution MUST be provided.
    Valid resolutions: Refund, Replacement, Store Credit

2b. If resolution = Refund, refund_amount must be provided and > 0.

2c. If resolution = Replacement or Store Credit, refund_amount must be null/absent.
    If a non-zero amount is sent with Replacement or Store Credit, it is rejected.

### Why it exists
An approval without knowing the outcome (refund how much? replacement?) is incomplete.

### Where enforced
server/src/services/requests.js → validateApproval()

### HTTP response when violated
- Status: 422 Unprocessable Entity
- 2a: Code: RESOLUTION_REQUIRED, Message: "A resolution is required when approving a request."
- 2b: Code: REFUND_AMOUNT_REQUIRED, Message: "A refund amount greater than zero is required when resolution is Refund."
- 2c: Code: REFUND_AMOUNT_NOT_ALLOWED, Message: "Refund amount must not be set when resolution is Replacement or Store Credit."

---

## Rule 3: One Live Request Per Item

### Definition of "live"
A request is live if its status is NOT Rejected and NOT Completed,
and is_removed = false.

### Definition of "same item"
Same (order_id, item_name) combination.
Assumption: orders belong to one customer, so order_id + item_name uniquely identifies
a customer's item within an order.

### Database enforcement
Partial unique index:
CREATE UNIQUE INDEX unique_active_item_request
ON return_requests (order_id, item_name)
WHERE status NOT IN ('Rejected', 'Completed') AND is_removed = false;

This means when a request moves to Rejected or Completed, it leaves the index,
allowing a new request to be created for the same item.

### Why it exists
Prevents agents from accidentally creating duplicate work for the same issue.

### Where enforced
- Primary: PostgreSQL partial unique index (DB-level enforcement)
- Secondary: Application-level pre-check in service for a better error message

### HTTP response when violated
- Status: 409 Conflict
- Code: DUPLICATE_ACTIVE_REQUEST
- Message: "An active request already exists for item [item_name] on order [order_id]."

---

## Rule 4: Locked Once Decided

### When a request is locked
Once status reaches Approved, Rejected, or Completed.

### What is locked
These fields cannot be edited after the request is decided:
- customer_name
- customer_email
- order_id
- item_name
- item_sku
- quantity
- reason

### What is NOT locked
- Notes can still be added at any point in any status.

### Why it exists
Audit integrity — the record of what was decided should not be retroactively altered.

### Where enforced
server/src/services/requests.js → validateNotLocked()

### HTTP response when violated
- Status: 422 Unprocessable Entity
- Code: REQUEST_LOCKED
- Message: "Request details cannot be edited once it has been Approved, Rejected, or Completed."

---

## Rule 5: Removal (Soft Delete)

### What removal means
Setting is_removed = true and removed_at = NOW() on the record.
The record stays in PostgreSQL forever.

### Visibility after removal
- The GET /api/requests list EXCLUDES removed requests (is_removed = false filter always applied)
- GET /api/requests/:id returns 404 for removed requests (as if they don't exist)

### Who can be removed
Only requests in Open or Rejected status.
In Review, Approved, and Completed cannot be removed.

### Why it exists
Preserves the audit trail. A request that was worked on (In Review, Approved, Completed)
should not disappear — it may have business significance.

### Where enforced
server/src/services/requests.js → validateRemoval()

### HTTP response when violated
- Status: 422 Unprocessable Entity
- Code: REMOVAL_NOT_ALLOWED
- Message: "Only requests with status Open or Rejected can be removed."

---

## Additional Validation Rules (Not explicitly business rules but server-enforced)

### Note Immutability
- Notes can only be created, never edited or deleted.
- No PATCH /notes or DELETE /notes endpoints exist.

### Reference Generation
- References are server-generated: RD-XXXXXX format (6-digit zero-padded)
- Uses a PostgreSQL sequence: request_ref_seq
- The client never sends a reference — it is ignored if provided.

### Quantity
- Must be a positive integer (>= 1)

### Reason Enum
- Must be one of: Damaged, Wrong Item, Size Issue, Not As Described, Changed Mind

### Status Enum
- Must be one of: Open, In Review, Approved, Rejected, Completed
- Cannot be set directly on creation (always starts as Open)

### Resolution Enum
- Must be one of: Refund, Replacement, Store Credit
- Can only be set when transitioning to Approved

---

## Business Rule Test Matrix

### Status Transitions
| Transition | Expected |
|---|---|
| Open -> In Review | PASS |
| In Review -> Approved | PASS (with resolution) |
| In Review -> Rejected | PASS |
| Approved -> Completed | PASS |
| Open -> Approved | FAIL (422) |
| Open -> Completed | FAIL (422) |
| Open -> Rejected | FAIL (422) |
| In Review -> Open | FAIL (422) |
| Approved -> Open | FAIL (422) |
| Approved -> Rejected | FAIL (422) |
| Rejected -> anything | FAIL (422) |
| Completed -> anything | FAIL (422) |

### Resolution + Refund
| Resolution | Amount | Expected |
|---|---|---|
| Refund | 50.00 | PASS |
| Replacement | null | PASS |
| Store Credit | null | PASS |
| Approved, no resolution | - | FAIL (422) |
| Refund | 0 | FAIL (422) |
| Refund | null | FAIL (422) |
| Replacement | 50.00 | FAIL (422) |
| Store Credit | 50.00 | FAIL (422) |

### Duplicate Check
| Scenario | Expected |
|---|---|
| New request, no existing | PASS |
| Existing request Open | FAIL (409) |
| Existing request In Review | FAIL (409) |
| Existing request Approved | FAIL (409) |
| Existing request Rejected | PASS |
| Existing request Completed | PASS |
| Existing request Removed | PASS |

### Locking
| Status | Edit Details | Add Note |
|---|---|---|
| Open | PASS | PASS |
| In Review | PASS | PASS |
| Approved | FAIL (422) | PASS |
| Rejected | FAIL (422) | PASS |
| Completed | FAIL (422) | PASS |

### Removal
| Status | Expected |
|---|---|
| Open | PASS |
| Rejected | PASS |
| In Review | FAIL (422) |
| Approved | FAIL (422) |
| Completed | FAIL (422) |
