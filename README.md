# ReturnDesk

## 1. Overview
ReturnDesk is a full-stack return management application for online store support agents to raise customer returns, review items, execute legal status transitions, record resolutions (Refund, Replacement, Store Credit), and append chronological internal notes.

---

## 2. Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js, JavaScript
- **Database**: PostgreSQL (Local / Hosted)
- **Database Access**: `pg` (Raw Parameterized SQL)
- **Validation**: Zod

---

## 3. Database Schema & Architecture

### Tables & Data Types
1. **`return_requests`**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `reference`: `VARCHAR(12) UNIQUE NOT NULL` (Generated atomically via sequence `'RD-' || LPAD(nextval('request_ref_seq')::text, 6, '0')`)
   - `customer_name`: `VARCHAR(255) NOT NULL`
   - `customer_email`: `VARCHAR(255) NOT NULL`
   - `order_id`: `VARCHAR(100) NOT NULL`
   - `item_name`: `VARCHAR(255) NOT NULL`
   - `item_sku`: `VARCHAR(100)`
   - `quantity`: `INTEGER NOT NULL CHECK (quantity >= 1)`
   - `reason`: `return_reason ENUM ('Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind')`
   - `status`: `request_status ENUM ('Open', 'In Review', 'Approved', 'Rejected', 'Completed') DEFAULT 'Open'`
   - `resolution`: `resolution_type ENUM ('Refund', 'Replacement', 'Store Credit')`
   - `refund_amount`: `NUMERIC(10, 2)`
   - `is_removed`: `BOOLEAN NOT NULL DEFAULT FALSE`
   - `removed_at`: `TIMESTAMPTZ`
   - `created_at`, `updated_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

2. **`notes`**:
   - `id`: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `request_id`: `UUID NOT NULL REFERENCES return_requests(id)`
   - `content`: `TEXT NOT NULL`
   - `created_at`: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`

### Partial Unique Index (Rule 3)
```sql
CREATE UNIQUE INDEX unique_active_item_request
  ON return_requests (order_id, item_name)
  WHERE status NOT IN ('Rejected', 'Completed')
    AND is_removed = FALSE;
```

---

## 4. API Design, Endpoints & Error Reporting

### REST Endpoints
| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Health probe | `200` |
| `GET` | `/api/requests` | List returns (search, filter, sort, pagination in SQL) | `200`, `400` |
| `POST` | `/api/requests` | Raise a new return request | `201`, `400`, `409` |
| `GET` | `/api/requests/:id` | Fetch return details with chronological notes | `200`, `400`, `404` |
| `PATCH` | `/api/requests/:id` | Update editable details (Open / In Review only) | `200`, `400`, `404`, `422` |
| `PATCH` | `/api/requests/:id/status` | Transition status with resolution validation | `200`, `400`, `404`, `422` |
| `POST` | `/api/requests/:id/notes` | Append internal note (allowed at any status) | `201`, `400`, `404` |
| `DELETE` | `/api/requests/:id` | Soft-delete request (Open / Rejected only) | `200`, `400`, `404`, `422` |

### Response Structure & Error Reporting
All responses use a predictable JSON envelope:
- **Success**: `{ "data": <payload>, "pagination": { "page": 1, "limit": 10, "total": 33, "totalPages": 4 } }`
- **Business Rule Refusal / Error**:
  ```json
  {
    "error": {
      "code": "INVALID_STATUS_TRANSITION",
      "message": "Cannot transition from 'Open' to 'Approved'. Legal transitions from 'Open': 'In Review'."
    }
  }
  ```
- **Error Codes**: `VALIDATION_ERROR` (400), `INVALID_ID` (400), `NOT_FOUND` (404), `DUPLICATE_ACTIVE_REQUEST` (409), `INVALID_STATUS_TRANSITION` (422), `REQUEST_LOCKED` (422), `REMOVAL_NOT_ALLOWED` (422).

---

## 5. Clean Machine Setup & Running

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally on port 5432

### Step 1: Database Setup
1. Create PostgreSQL database:
   ```sql
   CREATE DATABASE returndesk;
   ```
2. Configure `server/.env` (copy from `server/.env.example`):
   ```env
   PORT=3001
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=returndesk
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password
   CLIENT_URL=http://localhost:3000
   ```

### Step 2: Backend Setup & Seed Script
```bash
cd server
npm install

# 1. Test database connection
npm run db:check

# 2. Run DDL schema migration
npm run db:setup

# 3. Populate database with 33 realistic requests across all statuses + 17 notes
npm run db:seed

# 4. Start backend Express server (http://localhost:3001)
npm run dev
```

### Step 3: Frontend Setup
In a new terminal:
```bash
cd client
npm install
npm run dev
# Open http://localhost:3000 in your browser
```

---

## 6. Design Decisions & Why

1. **Raw SQL over ORM**: Full control over query plans, parameterized queries, and PostgreSQL-specific features like partial unique indexes (`WHERE status NOT IN ('Rejected', 'Completed') AND is_removed = FALSE`).
2. **Layered Express Architecture (`Routes → Validators → Controllers → Services → Queries`)**: Separates HTTP handling from business logic, ensuring business rules in the service layer are easily testable and explainable.
3. **Database Sequence for References**: PostgreSQL sequence `request_ref_seq` generates monotonic, human-readable IDs (`RD-000001`) atomically without race conditions.
4. **Server-Side Search & Pagination**: ILIKE substring search, multi-field filtering, and pagination are handled directly in PostgreSQL via `LIMIT`/`OFFSET` and `COUNT(*)`, preventing client-side memory bloat.
5. **Optimistic UI with Prefetching**: Instant UI state feedback on note submission, status transitions, and Next.js route prefetching.

---

## 7. Assumptions Made

1. **Single-Desk Agent Mode**: Single-agent operational workflow without authentication system per the brief.
2. **Customer Contact**: Customer email serves as the primary contact detail.
3. **Item Identity**: An item is identified by the `(order_id, item_name)` pair. `item_sku` is an optional auxiliary SKU.
4. **Notes Author**: System-wide internal desk notes without individual author accounts.

---

## 8. What is Incomplete / Next Steps

- **Damaged Item Image Uploads**: Cloud/S3 storage integration for customer-uploaded proof photos.
- **Customer Email Webhooks**: Automated notification triggers on status transitions (e.g., Refund processed).
- **Cursor/Keyset Pagination**: Implementing keyset pagination for scaling past hundreds of thousands of records.

---

## 9. Time Spent
- **Hours Spent**: Roughly **9 hours** (from 2:00 PM to 11:00 PM) covering PostgreSQL schema design, Express API and business rules enforcement, automated verification tests, Next.js frontend implementation, and final audit.
