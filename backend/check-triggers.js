const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkTriggers() {
  try {
    console.log('\n=== Checking triggers on tenant_users table ===\n');

    const result = await pool.query(`
      SELECT
        tgname AS trigger_name,
        tgtype,
        proname AS function_name,
        pg_get_triggerdef(t.oid) AS trigger_definition
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE c.relname = 'tenant_users'
        AND NOT tgisinternal
    `);

    console.log(JSON.stringify(result.rows, null, 2));

    console.log('\n=== Checking subscriptions table structure ===\n');
    const subsResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'subscriptions'
      ORDER BY ordinal_position
    `);

    console.log(JSON.stringify(subsResult.rows, null, 2));

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkTriggers();
