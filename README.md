# ReturnDesk — Return Management System

ReturnDesk is a full-stack return management application built for online store support agents to process customer return requests, execute legal status transitions, record resolutions (Refund, Replacement, Store Credit), append internal notes, and maintain a complete audit trail.

---

## 🏛️ Architecture Overview

The system uses a clean separation of concerns between client and server:

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js 15 App                      │
│        (React 19, Tailwind CSS, App Router)             │
└────────────────────────────┬────────────────────────────┘
                             │ JSON REST API
┌────────────────────────────▼────────────────────────────┐
│                    Express Backend                      │
│  Routes → Validators (Zod) → Controllers → Services     │
└────────────────────────────┬────────────────────────────┘
                             │ Parameterized SQL
┌────────────────────────────▼────────────────────────────┐
│                  PostgreSQL Database                    │
│   ENUMs + Partial Unique Indexes + Sequences + Triggers  │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities
- **Frontend (`/client`)**: Next.js App Router, React 19, Tailwind CSS, Lucide icons. Matches OpsCenter enterprise UI with responsive layouts, debounced search, multi-filter dropdowns, active filter chips, locked detail states, and structured error/empty screens.
- **API Boundary (`/server/src/routes` & `/validators`)**: Zod validation schemas validating types, enums, string lengths, and positive numbers.
- **Service Layer (`/server/src/services`)**: Authoritative business logic enforcing status flow state machine, approval resolutions, duplicate protection, and editing locks.
- **Query Layer (`/server/src/queries`)**: Raw parameterized SQL using `pg` pool. No dynamic string concatenation.
- **Database (`/server/src/db/schema.sql`)**: PostgreSQL schema with `request_status`, `return_reason`, `resolution_type` ENUMs, sequential human-readable reference sequence (`RD-000001`), and partial unique indexes.

---

## ⚖️ Business Rules & Enforcement

| # | Business Rule | Backend Enforcement | Database Safeguard | Frontend UX |
|---|---|---|---|---|
| **1** | **Status Lifecycle**<br>`Open` → `In Review`<br>`In Review` → `Approved` / `Rejected`<br>`Approved` → `Completed` | `LEGAL_TRANSITIONS` map throws `422 INVALID_STATUS_TRANSITION` on any illegal move. | PostgreSQL `request_status` ENUM | Only legal next actions are presented as action buttons. |
| **2** | **Approval Resolution**<br>Must specify Refund, Replacement, or Store Credit.<br>Refund requires amount > 0. | `validateApprovalResolution` enforces resolution presence and positive amount if Refund. Non-refund resolutions reject refund amounts. | PostgreSQL `resolution_type` ENUM and `NUMERIC(10,2)` type | Modal prompts for resolution. Refund amount input dynamically appears only for Refund. |
| **3** | **One Live Request Per Item**<br>No two active requests for same (order_id, item_name). | Service pre-checks active records and throws `409 DUPLICATE_ACTIVE_REQUEST`. | `CREATE UNIQUE INDEX unique_active_item_request ON return_requests (order_id, item_name) WHERE status NOT IN ('Rejected', 'Completed') AND is_removed = FALSE;` | Inline error banner highlights duplicate item conflict immediately. |
| **4** | **Locked Once Decided**<br>Approved, Rejected, Completed cannot have details edited. | `DECIDED_STATUSES` check throws `422 REQUEST_LOCKED` on PATCH of details. | Update query guarded by status check. | Form fields disabled, banner indicates locked state, "Save Changes" hidden. Notes remain addable. |
| **5** | **Soft Deletion / Removal**<br>Only Open or Rejected can be removed. Record remains in DB. | `softDeleteRequest` sets `is_removed = TRUE` and `removed_at = NOW()`. Throws `422 REMOVAL_NOT_ALLOWED` for other statuses. | Partial indexes exclude `is_removed = TRUE`. | "Remove" action only rendered for Open and Rejected. Filtered list automatically hides removed items. |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v22)
- PostgreSQL 14+ running locally (default port: 5432)

---

### 1. Database Setup

1. Configure your `.env` in `server/.env`:
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=returndesk
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   CLIENT_URL=http://localhost:3000
   ```

2. Create the database (if not already created):
   ```bash
   # Run in PostgreSQL CLI or pgAdmin:
   CREATE DATABASE returndesk;
   ```

3. Run verification, schema migration, and seed data:
   ```bash
   cd server
   npm install

   # Verify database connectivity
   npm run db:check

   # Apply schema (ENUMs, Tables, Partial Indexes, Sequences)
   npm run db:setup

   # Seed 33 realistic requests across all statuses, reasons, and resolutions + 17 notes
   npm run db:seed
   ```

4. Start the Express API server:
   ```bash
   npm run dev
   # API runs at http://localhost:3001
   # Health check at http://localhost:3001/api/health
   ```

---

### 2. Frontend Setup

1. In a new terminal, start the Next.js frontend:
   ```bash
   cd client
   npm install
   npm run dev
   # Frontend runs at http://localhost:3000
   ```

2. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 REST API Reference

All responses follow a consistent envelope structure:

- **Success**: `{ data: <payload>, pagination?: <metadata> }`
- **Error**: `{ error: { code: "<ERROR_CODE>", message: "<Description>", details?: [...] } }`

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Service health probe | `200` |
| `GET` | `/api/requests` | List requests (with search, filter, sort, pagination) | `200`, `400` |
| `POST` | `/api/requests` | Raise a new return request | `201`, `400`, `409` |
| `GET` | `/api/requests/:id` | Fetch request details with notes | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id` | Edit customer/item details (if not decided) | `200`, `400`, `404`, `422` |
| `PATCH` | `/api/requests/:id/status` | Transition status (Rule 1 & Rule 2) | `200`, `400`, `404`, `422` |
| `POST` | `/api/requests/:id/notes` | Append internal note (allowed at any status) | `201`, `400`, `404` |
| `DELETE` | `/api/requests/:id` | Soft-delete request (Open/Rejected only) | `200`, `400`, `404`, `422` |

---

## 💡 Documented Assumptions

1. **Authentication**: Single-desk agent mode without user authentication, per assignment specification.
2. **Item Identity**: An item is uniquely identified within an order by `(order_id, item_name)`. `item_sku` is an optional supplementary identifier.
3. **Reference Generation**: Atomic sequence `request_ref_seq` formatted as `RD-XXXXXX` (e.g. `RD-000001`), ensuring collision-free numbering even under high concurrency.
4. **Pagination**: Standard SQL `LIMIT` / `OFFSET` with total count metadata. For multi-million row datasets, cursor-based pagination on `(created_at, id)` is recommended.
