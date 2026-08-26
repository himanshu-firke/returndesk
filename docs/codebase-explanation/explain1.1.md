# EXPLAIN 1.1 — Product Representation in Code

This document connects the product concepts from `explain1.0.md` to the actual files and modules in this repository.

---

## 1. Where Product Functionality Lives

| Business Concept | Frontend Implementation | Backend Implementation | Database Representation |
|---|---|---|---|
| **Return Request** | `client/app/requests/` | `server/src/routes/requests.js` & `services/requests.js` | `return_requests` table in PostgreSQL |
| **Internal Notes** | `client/components/NotesSidebar.js` | `server/src/services/requests.js` (`addNote`) | `notes` table in PostgreSQL |
| **Search & Filtering** | `client/app/requests/page.js` | `server/src/queries/requests.js` (`findRequests`) | SQL `WHERE` clauses with `ILIKE` and `ENUM` comparisons |
| **Reference Generation** | UI displays `req.reference` | Database default expression | Sequence `request_ref_seq` |

---

## 2. The Core Business Entities

### Entity 1: `ReturnRequest`
Represents a single return ticket raised against a specific item in an order.
- **Key Fields**:
  - `id`: UUID (Primary Key)
  - `reference`: Human-readable identifier (`RD-000001`)
  - `customer_name`, `customer_email`: Customer contact information
  - `order_id`, `item_name`, `item_sku`, `quantity`: Product and purchase details
  - `reason`: Why the return was requested (`Damaged`, `Wrong Item`, `Size Issue`, `Not As Described`, `Changed Mind`)
  - `status`: Current state (`Open`, `In Review`, `Approved`, `Rejected`, `Completed`)
  - `resolution`: How the return is resolved (`Refund`, `Replacement`, `Store Credit`)
  - `refund_amount`: Monetary refund value in dollars and cents
  - `is_removed`, `removed_at`: Soft-delete status

### Entity 2: `Note`
Represents an append-only internal communication entry written by agents during investigation.
- **Key Fields**:
  - `id`: UUID (Primary Key)
  - `request_id`: Foreign key pointing to `return_requests.id`
  - `content`: Text message
  - `created_at`: Timestamp (notes have no `updated_at` because they are immutable)

---

## 3. Important Files Implementing the Core Product

- **[`server/src/db/schema.sql`](file:///c:/Users/Himanshu/OneDrive/Documents/frido-assignment/server/src/db/schema.sql)**: Defines the PostgreSQL tables, ENUM types, and constraints.
- **[`server/src/services/requests.js`](file:///c:/Users/Himanshu/OneDrive/Documents/frido-assignment/server/src/services/requests.js)**: Contains the core product business rules (state machine, approval resolution validation, locking, soft deletion).
- **[`client/app/requests/page.js`](file:///c:/Users/Himanshu/OneDrive/Documents/frido-assignment/client/app/requests/page.js)**: The main dashboard interface showing the table of return requests.
- **[`client/app/requests/[id]/page.js`](file:///c:/Users/Himanshu/OneDrive/Documents/frido-assignment/client/app/requests/[id]/page.js)**: The single return detail/edit view where lifecycle decisions take place.
