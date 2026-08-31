/**
 * scripts/setup-db.js
 *
 * Reads schema.sql and applies it to the configured PostgreSQL database.
 * Run once on a fresh database, or re-run safely (all statements use IF NOT EXISTS).
 *
 * Usage: node scripts/setup-db.js
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setup() {
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

    const schemaPath = path.join(__dirname, '../src/db/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);

    console.log('✓ Schema applied successfully');
    console.log('  Run "node scripts/seed.js" to populate with sample data');
  } catch (err) {
    console.error('✗ Error applying schema:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setup();
