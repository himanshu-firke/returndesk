const { Pool } = require('pg');

// Single shared connection pool for the entire server process.
// pg's Pool handles connection lifecycle automatically.
//
// Cloud PostgreSQL providers (Neon, Supabase, Render Postgres) provide a single
// DATABASE_URL connection string. If present, use it (with SSL required).
// Falls back to individual host/port/name/user/password vars for local development.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'returndesk',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
