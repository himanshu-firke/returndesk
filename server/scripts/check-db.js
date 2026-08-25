/**
 * scripts/check-db.js
 *
 * Quick connectivity check. Run after creating .env to verify
 * the database connection works before running setup or seed.
 *
 * Usage: node scripts/check-db.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'returndesk',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    const res = await client.query('SELECT current_database(), current_user, version()');
    const row = res.rows[0];
    console.log('✓ Connection successful');
    console.log(`  Database : ${row.current_database}`);
    console.log(`  User     : ${row.current_user}`);
    console.log(`  PG       : ${row.version.split(' ').slice(0, 2).join(' ')}`);
    console.log('\n  Next step: node scripts/setup-db.js');
  } catch (err) {
    console.error('✗ Connection failed:', err.message);
    console.error('\n  Check your .env file — DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT');
    process.exit(1);
  } finally {
    await client.end();
  }
}

check();
