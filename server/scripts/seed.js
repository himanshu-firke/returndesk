/**
 * scripts/seed.js
 *
 * Populates the database with sample return requests and notes.
 * Safe to re-run — clears all existing data first.
 *
 * Coverage:
 *  - 33 requests total
 *  - All 5 statuses represented
 *  - All 5 reasons represented
 *  - 6 distinct customers
 *  - Approved requests with all three resolutions
 *  - Notes on 9 requests
 *
 * Usage: node scripts/seed.js
 */

require('dotenv').config();
const { Client } = require('pg');

// ─── Sample Customers ────────────────────────────────────────
const CUSTOMERS = [
  { name: 'Sarah Johnson',  email: 'sarah.j@example.com' },
  { name: 'Mike Chen',      email: 'mike.chen@example.com' },
  { name: 'Emma Williams',  email: 'emma.w@example.com' },
  { name: 'James Brown',    email: 'j.brown@example.com' },
  { name: 'Priya Patel',    email: 'priya.patel@example.com' },
  { name: 'Tom Davis',      email: 't.davis@example.com' },
];

const [sarah, mike, emma, james, priya, tom] = CUSTOMERS;

// ─── Seed Data ───────────────────────────────────────────────
// Each entry is inserted directly into the DB with the status already set.
// (Bypassing the API is intentional for seeding — the API enforces transitions.)
//
// IMPORTANT: All "active" (non-Rejected, non-Completed) requests must have
// unique (order_id, item_name) pairs to satisfy the partial unique index.

const REQUESTS = [
  // ── Open (8 requests) ──────────────────────────────────────
  {
    customer: sarah, order_id: 'ORD-1001', item_name: 'Blue Denim Jacket',  item_sku: 'BDJ-M',  quantity: 1, reason: 'Damaged',          status: 'Open',
  },
  {
    customer: mike,  order_id: 'ORD-1002', item_name: 'White Sneakers',     item_sku: 'WS-42',  quantity: 1, reason: 'Wrong Item',        status: 'Open',
  },
  {
    customer: emma,  order_id: 'ORD-1003', item_name: 'Leather Wallet',     item_sku: null,     quantity: 1, reason: 'Changed Mind',      status: 'Open',
  },
  {
    customer: james, order_id: 'ORD-1004', item_name: 'Silk Blouse',        item_sku: 'SB-S',   quantity: 2, reason: 'Not As Described',  status: 'Open',
  },
  {
    customer: priya, order_id: 'ORD-1005', item_name: 'Running Shoes',      item_sku: 'RS-38',  quantity: 1, reason: 'Size Issue',         status: 'Open',
  },
  {
    customer: tom,   order_id: 'ORD-1006', item_name: 'Yoga Pants',         item_sku: null,     quantity: 1, reason: 'Damaged',           status: 'Open',
  },
  {
    customer: sarah, order_id: 'ORD-1007', item_name: 'Aviator Sunglasses', item_sku: 'AVS-01', quantity: 1, reason: 'Wrong Item',        status: 'Open',
  },
  {
    customer: mike,  order_id: 'ORD-1008', item_name: 'Wool Sweater',       item_sku: 'WS-L',   quantity: 1, reason: 'Size Issue',         status: 'Open',
  },

  // ── In Review (6 requests) ─────────────────────────────────
  {
    customer: emma,  order_id: 'ORD-1009', item_name: 'Stainless Watch',    item_sku: 'SW-BLK', quantity: 1, reason: 'Damaged',           status: 'In Review',
  },
  {
    customer: james, order_id: 'ORD-1010', item_name: 'Leather Handbag',    item_sku: null,     quantity: 1, reason: 'Not As Described',  status: 'In Review',
  },
  {
    customer: priya, order_id: 'ORD-1011', item_name: 'Cotton T-Shirt',     item_sku: 'CTS-XL', quantity: 3, reason: 'Changed Mind',      status: 'In Review',
  },
  {
    customer: tom,   order_id: 'ORD-1012', item_name: 'Slim Fit Jeans',     item_sku: 'SFJ-32', quantity: 1, reason: 'Wrong Item',        status: 'In Review',
  },
  {
    customer: sarah, order_id: 'ORD-1013', item_name: 'Strappy Sandals',    item_sku: 'SS-37',  quantity: 1, reason: 'Size Issue',         status: 'In Review',
  },
  {
    customer: mike,  order_id: 'ORD-1014', item_name: 'Canvas Backpack',    item_sku: 'CB-GRY', quantity: 1, reason: 'Damaged',           status: 'In Review',
  },

  // ── Approved (5 requests) ─────────────────────────────────
  // Covers all 3 resolution types
  {
    customer: emma,  order_id: 'ORD-1015', item_name: 'Oxford Dress Shoes', item_sku: 'ODS-43', quantity: 1, reason: 'Wrong Item',        status: 'Approved', resolution: 'Refund',       refund_amount: 89.99,
  },
  {
    customer: james, order_id: 'ORD-1016', item_name: 'Waterproof Raincoat',item_sku: 'WRC-M',  quantity: 1, reason: 'Not As Described',  status: 'Approved', resolution: 'Replacement',  refund_amount: null,
  },
  {
    customer: priya, order_id: 'ORD-1017', item_name: 'Tracksuit Set',      item_sku: 'TS-S',   quantity: 1, reason: 'Size Issue',         status: 'Approved', resolution: 'Store Credit', refund_amount: null,
  },
  {
    customer: tom,   order_id: 'ORD-1018', item_name: 'Khaki Shorts',       item_sku: null,     quantity: 2, reason: 'Damaged',           status: 'Approved', resolution: 'Refund',       refund_amount: 34.99,
  },
  {
    customer: sarah, order_id: 'ORD-1019', item_name: 'Polo Shirt',         item_sku: 'PS-WHT', quantity: 1, reason: 'Changed Mind',      status: 'Approved', resolution: 'Store Credit', refund_amount: null,
  },

  // ── Rejected (6 requests) ─────────────────────────────────
  {
    customer: mike,  order_id: 'ORD-2001', item_name: 'Wool Blazer',        item_sku: null,     quantity: 1, reason: 'Changed Mind',      status: 'Rejected',
  },
  {
    customer: emma,  order_id: 'ORD-2002', item_name: 'Cargo Pants',        item_sku: 'CP-BLK', quantity: 1, reason: 'Not As Described',  status: 'Rejected',
  },
  {
    customer: james, order_id: 'ORD-2003', item_name: 'Sports Jersey',      item_sku: null,     quantity: 1, reason: 'Wrong Item',        status: 'Rejected',
  },
  {
    customer: priya, order_id: 'ORD-2004', item_name: 'Formal Dress Shirt', item_sku: 'FDS-L',  quantity: 1, reason: 'Damaged',           status: 'Rejected',
  },
  {
    customer: tom,   order_id: 'ORD-2005', item_name: 'Rubber Flip Flops',  item_sku: null,     quantity: 1, reason: 'Size Issue',         status: 'Rejected',
  },
  {
    customer: sarah, order_id: 'ORD-2006', item_name: 'Gym Duffel Bag',     item_sku: 'GDB-L',  quantity: 1, reason: 'Not As Described',  status: 'Rejected',
  },

  // ── Completed (8 requests) ────────────────────────────────
  {
    customer: mike,  order_id: 'ORD-3001', item_name: 'Winter Parka',       item_sku: 'WP-XL',  quantity: 1, reason: 'Damaged',           status: 'Completed', resolution: 'Refund',       refund_amount: 149.99,
  },
  {
    customer: emma,  order_id: 'ORD-3002', item_name: 'Ankle Boots',        item_sku: 'AB-38',  quantity: 1, reason: 'Wrong Item',        status: 'Completed', resolution: 'Replacement',  refund_amount: null,
  },
  {
    customer: james, order_id: 'ORD-3003', item_name: 'Zip-Up Hoodie',      item_sku: 'ZUH-M',  quantity: 1, reason: 'Size Issue',         status: 'Completed', resolution: 'Store Credit', refund_amount: null,
  },
  {
    customer: priya, order_id: 'ORD-3004', item_name: 'Trail Running Shoes', item_sku: 'TRS-40', quantity: 1, reason: 'Damaged',           status: 'Completed', resolution: 'Refund',       refund_amount: 79.99,
  },
  {
    customer: tom,   order_id: 'ORD-3005', item_name: 'Linen Trousers',     item_sku: null,     quantity: 2, reason: 'Not As Described',  status: 'Completed', resolution: 'Replacement',  refund_amount: null,
  },
  {
    customer: sarah, order_id: 'ORD-3006', item_name: 'One-Piece Swimwear', item_sku: 'OPS-M',  quantity: 1, reason: 'Changed Mind',      status: 'Completed', resolution: 'Store Credit', refund_amount: null,
  },
  {
    customer: mike,  order_id: 'ORD-3007', item_name: 'Knit Beanie',        item_sku: null,     quantity: 2, reason: 'Wrong Item',        status: 'Completed', resolution: 'Refund',       refund_amount: 24.99,
  },
  {
    customer: emma,  order_id: 'ORD-3008', item_name: 'Cashmere Scarf',     item_sku: 'CS-GRY', quantity: 1, reason: 'Size Issue',         status: 'Completed', resolution: 'Store Credit', refund_amount: null,
  },
];

// ─── Notes to attach ─────────────────────────────────────────
// Keyed by request index (0-based, matching REQUESTS array above)
const NOTES_BY_INDEX = {
  0: [  // ORD-1001 Blue Denim Jacket (Open)
    'Customer reports item arrived with a tear in the left sleeve. Photos requested.',
    'Photos received — damage is clearly visible. Preparing for review.',
  ],
  8: [  // ORD-1009 Stainless Watch (In Review)
    'Customer submitted unboxing video showing crack on watch face.',
    'Contacted supplier for warranty claim. Awaiting response.',
  ],
  13: [ // ORD-1014 Canvas Backpack (In Review)
    'Delivery photo confirms parcel arrived crushed. Courier claim filed.',
  ],
  14: [ // ORD-1015 Oxford Dress Shoes (Approved - Refund)
    'Customer sent size-comparison photo. Wrong size confirmed.',
    'Refund of £89.99 approved and processed to original payment method.',
  ],
  15: [ // ORD-1016 Waterproof Raincoat (Approved - Replacement)
    'Item described as waterproof but failed basic water resistance test per customer video.',
    'Replacement approved. New unit dispatched via express shipping.',
  ],
  19: [ // ORD-2001 Wool Blazer (Rejected)
    'Request raised 45 days after purchase — outside the 30-day return window for Change of Mind returns.',
    'Request rejected. Customer notified by email.',
  ],
  24: [ // ORD-2006 Gym Duffel Bag (Rejected)
    'Customer claims colour differs from website but product matches current listing photos.',
    'Request rejected — no product discrepancy found.',
  ],
  25: [ // ORD-3001 Winter Parka (Completed)
    'Defective zip confirmed by quality team.',
    'Full refund of £149.99 processed. Customer confirmed receipt.',
  ],
  26: [ // ORD-3002 Ankle Boots (Completed)
    'Wrong size shipped — confirmed against original order.',
    'Correct size dispatched. Customer confirmed delivery. Case closed.',
  ],
};

// ─── Main seed function ───────────────────────────────────────

async function seed() {
  const client = process.env.DATABASE_URL
    ? new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      })
    : new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'returndesk',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    await client.query('BEGIN');

    // Clear existing data and reset the reference sequence
    await client.query('TRUNCATE TABLE notes, return_requests RESTART IDENTITY CASCADE');
    await client.query('ALTER SEQUENCE request_ref_seq RESTART WITH 1');
    console.log('✓ Cleared existing data');

    // Insert requests and capture their generated IDs
    const insertedIds = [];

    for (const req of REQUESTS) {
      const result = await client.query(
        `INSERT INTO return_requests
           (reference, customer_name, customer_email, order_id, item_name, item_sku,
            quantity, reason, status, resolution, refund_amount)
         VALUES
           ('RD-' || LPAD(nextval('request_ref_seq')::text, 6, '0'),
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          req.customer.name,
          req.customer.email,
          req.order_id,
          req.item_name,
          req.item_sku ?? null,
          req.quantity,
          req.reason,
          req.status,
          req.resolution ?? null,
          req.refund_amount ?? null,
        ]
      );
      insertedIds.push(result.rows[0].id);
    }

    console.log(`✓ Inserted ${REQUESTS.length} requests`);

    // Insert notes for the designated requests
    let noteCount = 0;
    for (const [indexStr, notes] of Object.entries(NOTES_BY_INDEX)) {
      const requestId = insertedIds[parseInt(indexStr, 10)];
      for (const content of notes) {
        await client.query(
          `INSERT INTO notes (request_id, content) VALUES ($1, $2)`,
          [requestId, content]
        );
        noteCount++;
      }
    }

    console.log(`✓ Inserted ${noteCount} notes`);

    await client.query('COMMIT');

    console.log('\n✓ Seed complete!');
    console.log(`  ${REQUESTS.length} requests  |  ${noteCount} notes`);
    console.log('\n  Status breakdown:');
    const breakdown = {};
    for (const r of REQUESTS) {
      breakdown[r.status] = (breakdown[r.status] || 0) + 1;
    }
    for (const [status, count] of Object.entries(breakdown)) {
      console.log(`    ${status.padEnd(12)}: ${count}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
