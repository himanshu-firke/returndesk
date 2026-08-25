# ReturnDesk — Engineering PRD

## Product Overview
ReturnDesk is an internal support-agent tool for managing return/replacement requests for a small online store.
Agents raise requests, work them through a defined lifecycle, and close them out.
There is NO customer-facing portal. NO authentication system required.

---

## Entities

### Return Request
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| reference | string | Auto-generated, human-readable (e.g. RD-000001) |
| customer_name | string | Required |
| customer_email | string | Required, contact info |
| order_id | string | Required |
| item_name | string | Required |
| item_sku | string | Optional |
| quantity | integer | Required, > 0 |
| reason | enum | Damaged / Wrong Item / Size Issue / Not As Described / Changed Mind |
| status | enum | Open / In Review / Approved / Rejected / Completed |
| resolution | enum | Refund / Replacement / Store Credit — only when Approved |
| refund_amount | decimal | Only when resolution = Refund, must be > 0 |
| is_removed | boolean | Soft delete flag |
| removed_at | timestamp | When removed |
| created_at | timestamp | |
| updated_at | timestamp | Updated on every change |

### Note
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| request_id | UUID | FK to return_requests.id |
| content | text | Required |
| created_at | timestamp | |

Notes are append-only. Never edited or deleted.

---

## Functional Requirements

### Raise a Request
- Create a return request with all required fields
- System auto-generates the reference (agent never types it)
- Starts in Open status

### Find Requests (List)
- Search by: customer name, order ID, reference (text search)
- Filter by: status, reason
- Sort by: created_at, updated_at, status, reason (asc/desc)
- Paginate results
- ALL of above happen server-side in SQL

### Work a Request (Detail)
- View all request details
- View all notes in chronological order
- Add a note (any status, any time)
- Transition status (only legal transitions)
- Edit customer/item details (only if not yet decided)
- Remove request (soft delete, only Open/Rejected)

---

## Status Lifecycle
Open -> In Review -> Approved -> Completed
                 -> Rejected

Rejected and Completed are FINAL.

---

## Technical Requirements

### Mandatory Stack
- Frontend: Next.js App Router + React + Tailwind CSS
- Backend: Node.js + Express (separate service)
- Database: PostgreSQL (local)
- Language: JavaScript
- DB access: pg (raw SQL)
- Validation: Zod

### Frontend Requirements
- Status immediately readable (badges/colors)
- Only legal actions offered
- Search debounced
- Loading, empty, error states all handled
- Server errors surfaced to user
- Responsive down to 375px

### Error Handling
- Appropriate HTTP status codes
- Consistent error body: { error: { code, message } }
- Never 200 with error body
- Never 500 for anticipated failures

---

## Seed Data
- At least 30 requests
- All statuses represented
- All reasons represented
- Notes on some requests
- Must work from a clean database

---

## Evaluation Weights
- Business rules: 25%
- Data model: 20%
- API design: 20%
- Frontend: 20%
- Code quality: 10%
- Submission/README: 5%

---

## Ambiguities & Assumptions
See /docs/DECISIONS.md for full list.

Key assumptions:
- No authentication system needed
- Same item = same (order_id, item_name) combination
- Reference format: RD-XXXXXX (6-digit zero-padded sequence)
- Customer contact = email + name
- Notes have no author field (no auth)
- Default sort: created_at DESC
