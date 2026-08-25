# ReturnDesk — Technical Decisions

---

## D1: Backend — Next.js Route Handlers vs. Express

**Options:**
- A: Next.js Route Handlers (same project as frontend)
- B: Separate Express service

**Chosen:** B — Separate Express service

**Why:**
- Clean separation: frontend and backend are distinct services
- Express is more familiar and explicit for a backend-first evaluation
- Simpler to reason about the backend in isolation
- User explicitly requested Express

**Trade-offs:**
- Two processes to run (mitigated by clear README instructions)
- CORS configuration required
- NEXT_PUBLIC_API_URL environment variable needed

---

## D2: Language — JavaScript vs. TypeScript

**Options:**
- A: TypeScript
- B: JavaScript

**Chosen:** B — JavaScript

**Why:**
- User explicitly requested JavaScript
- Simpler setup, faster to write, easier to explain line-by-line in an interview
- Zod provides runtime validation which catches most of the errors TypeScript would catch at compile time

**Trade-offs:**
- No compile-time type checking
- More discipline needed to avoid type-related bugs
- Compensated by Zod schemas defining the shape of all inputs

---

## D3: Database Access — Prisma vs. Drizzle vs. Raw SQL (pg)

**Options:**
- A: Prisma
- B: Drizzle ORM
- C: Raw SQL with pg

**Chosen:** C — Raw SQL with pg

**Why:**
- User explicitly requested raw SQL + pg
- Total control over queries — every SQL statement is readable and explainable
- Natural fit for partial unique index (which Prisma doesn't support natively)
- No ORM magic to explain away in an interview
- Filtering/sorting/pagination queries are plain SQL — easy to inspect and optimize

**Trade-offs:**
- More verbose for CRUD operations
- No auto-generated migrations (schema.sql is the source of truth)
- Slightly more boilerplate for parameterized queries
- Compensated by a clean queries/ layer that keeps SQL organized

---

## D4: Validation — Zod

**Options:**
- A: Zod
- B: Joi
- C: express-validator

**Chosen:** A — Zod

**Why:**
- Schema-first: define once, reuse across validators
- Excellent, structured error messages (easy to format as { code, message })
- Works naturally with Express via a simple validate middleware
- Easy to explain: "I defined a Zod schema, passed it to a middleware, and it validates req.body/req.query before the controller runs"

**Trade-offs:**
- One more dependency
- Slightly different API from Joi (which is older and more battle-tested)

---

## D5: Error Response Format

**Chosen format:**
```json
{
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from Open to Approved."
  }
}
```

For validation errors (400):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": [
      { "field": "quantity", "message": "Expected number, received string" }
    ]
  }
}
```

**Why:**
- Machine-readable code field allows frontend to handle errors programmatically
- Human-readable message for display
- Consistent shape across all error types
- details array only present for validation errors where field-level feedback is useful

**HTTP status codes used:**
- 400 Bad Request: validation errors (wrong types, missing required fields)
- 404 Not Found: request/note doesn't exist or is removed
- 409 Conflict: duplicate active request
- 422 Unprocessable Entity: business rule violation (correct shape, wrong state)
- 500 Internal Server Error: unexpected errors (no details leaked to client)

---

## D6: Soft Delete Strategy

**Chosen:** is_removed BOOLEAN + removed_at TIMESTAMP

**Why:**
- Simple and explicit
- Easy to query: WHERE is_removed = false
- removed_at provides audit timestamp
- Partial unique index uses is_removed = false as a condition

**Alternative considered:** deleted_at IS NULL pattern (NULL = not deleted)
- Rejected because: is_removed = false is more explicit and readable in queries
- Both approaches are valid; explicit boolean is easier to explain

---

## D7: Reference Generation

**Format:** RD-XXXXXX (e.g., RD-000001, RD-000042)

**Why:**
- RD prefix identifies it as ReturnDesk
- 6-digit zero-padded number supports up to 999,999 requests before overflow
- Purely numeric suffix makes it easy to sort or search

**Implementation:** PostgreSQL sequence (request_ref_seq)
```sql
CREATE SEQUENCE request_ref_seq START 1;
-- On INSERT:
'RD-' || LPAD(nextval('request_ref_seq')::text, 6, '0')
```

**Why a sequence vs. UUID vs. count-based:**
- Sequence is atomic and gap-safe (no race conditions)
- Human-readable (UUID is not)
- count(*) + 1 has race condition under concurrent inserts

---

## D8: Duplicate Prevention Strategy (Rule 3)

**Chosen:** Partial unique index on (order_id, item_name) WHERE status NOT IN ('Rejected', 'Completed') AND is_removed = false

**Why:**
- Database-level enforcement — cannot be bypassed by the application
- When a request is closed (Rejected/Completed), it automatically "leaves" the index
- New request for same item is then allowed
- Application layer also pre-checks for a meaningful error message (409 with details)

**Why (order_id, item_name) not (customer_email, order_id, item_name):**
- An order belongs to one customer — order_id alone implies the customer
- Simpler index, same protection

---

## D9: Pagination Strategy

**Chosen:** Offset-based pagination (LIMIT/OFFSET)

**Why:**
- Simplest to implement and explain
- Sufficient for the scale of a small online store's return desk
- Evaluator expects this at intern level
- Cursor-based pagination would be over-engineered here

**Parameters:**
- page (1-indexed, default 1)
- limit (default 20, max 100)
- Response includes: { data, pagination: { page, limit, total, totalPages } }

---

## D10: Ambiguities and Assumptions

| Ambiguity | Assumption |
|---|---|
| No auth mentioned | No login/session system. Single-agent mode. State clearly in README. |
| "Customer info" fields | customer_name + customer_email |
| "How to reach them" | customer_email |
| "Same item" definition | Same (order_id, item_name) combination |
| Notes author field | No author (no auth system) |
| Sortable fields | created_at, updated_at, status, reason |
| Reference format | RD-XXXXXX |
| item_sku optional | Yes — item_name is the primary identifier for duplicate check |
