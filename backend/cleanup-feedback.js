const { Pool } = require('pg');
require('dotenv').config();

async function cleanup() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const indexes = [
      'idx_feedback_tenant',
      'idx_feedback_customer',
      'idx_feedback_status',
      'idx_feedback_type',
      'idx_feedback_created',
      'idx_feedback_assigned'
    ];

    for (const idx of indexes) {
      try {
        await pool.query(`DROP INDEX IF EXISTS ${idx}`);
        console.log(`Dropped ${idx}`);
      } catch (e) {
        console.log(`Error dropping ${idx}:`, e.message);
      }
    }

    await pool.query('DROP TABLE IF EXISTS tenant_customer_feedback CASCADE');
    await pool.query('DROP FUNCTION IF EXISTS update_feedback_timestamp CASCADE');
    console.log('Cleaned up all feedback objects');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await pool.end();
  }
}

cleanup();
