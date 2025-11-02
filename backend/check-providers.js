const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkProviders() {
  try {
    const columns = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenant_providers'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 TENANT_PROVIDERS COLUMNS:\n');
    console.log(columns.rows.map(c => `  - ${c.column_name}`).join('\n'));

    const data = await pool.query('SELECT * FROM tenant_providers LIMIT 5');
    console.log('\n\n💰 SAMPLE PROVIDER DATA:\n');
    console.log(JSON.stringify(data.rows, null, 2));

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
  }
}

checkProviders();
