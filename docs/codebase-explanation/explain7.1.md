# EXPLAIN 7.1 — Database Implementation in Code

This document explains the raw SQL implementation, migrations, queries, and constraints in `server/src/db/` and `server/src/queries/`.

---

## 1. Schema DDL (`server/src/db/schema.sql`)

```sql
-- Custom Enum Types
CREATE TYPE request_status AS ENUM ('Open', 'In Review', 'Approved', 'Rejected', 'Completed');
CREATE TYPE return_reason AS ENUM ('Damaged', 'Wrong Item', 'Size Issue', 'Not As Described', 'Changed Mind');
CREATE TYPE resolution_type AS ENUM ('Refund', 'Replacement', 'Store Credit');

-- Atomic Sequential Numbering
CREATE SEQUENCE IF NOT EXISTS request_ref_seq START 1;

-- Table Definition
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

-- Partial Unique Index (Rule 3)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_item_request
  ON return_requests (order_id, item_name)
  WHERE status NOT IN ('Rejected', 'Completed')
    AND is_removed = FALSE;

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID        NOT NULL REFERENCES return_requests(id),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Deep Dive: How the Partial Unique Index Works

```sql
CREATE UNIQUE INDEX unique_active_item_request
  ON return_requests (order_id, item_name)
  WHERE status NOT IN ('Rejected', 'Completed')
    AND is_removed = FALSE;
```

### Why this index is a masterclass in SQL design:
1. **The Problem**: A standard `UNIQUE(order_id, item_name)` index would prevent a customer from *ever* returning that item again, even if their first return was rejected 6 months ago.
2. **The Solution**: The `WHERE` clause makes this a **partial index**. PostgreSQL only indexes rows where the status is active (`Open`, `In Review`, `Approved`) and `is_removed = FALSE`.
3. **Automatic Lifecycle Handling**:
   - When a ticket moves to `Rejected` or `Completed`, PostgreSQL automatically drops the row from the unique index.
   - When a ticket is soft-deleted (`is_removed = TRUE`), it also drops from the index.
   - The customer is now free to create a new return request for that item without violating uniqueness!

---

## 3. Server-Side SQL Filtering Query (`server/src/queries/requests.js`)

```javascript
async function findRequests({ search, status, reason, sortBy, sortOrder, page, limit }) {
  const safeSortBy = sortBy || 'created_at';
  const safeSortOrder = (sortOrder || 'desc').toUpperCase();
  const offset = (page - 1) * limit;

  const conditions = ['is_removed = FALSE'];
  const params = [];

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
  const orderClause = `ORDER BY ${safeSortBy} ${safeSortOrder}, id ASC`;

  // 1. Get total count
  const countResult = await pool.query(`SELECT COUNT(*) FROM return_requests ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  // 2. Get paginated rows
  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT * FROM return_requests ${whereClause} ${orderClause} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return { rows: dataResult.rows, total };
}
```
