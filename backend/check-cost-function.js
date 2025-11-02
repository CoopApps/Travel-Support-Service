const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkFunction() {
  try {
    console.log('\n=== Checking calculate_tenant_monthly_cost function ===\n');

    const result = await pool.query(`
      SELECT pg_get_functiondef(oid) AS function_definition
      FROM pg_proc
      WHERE proname = 'calculate_tenant_monthly_cost'
    `);

    console.log(result.rows[0]?.function_definition || 'Function not found');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkFunction();
