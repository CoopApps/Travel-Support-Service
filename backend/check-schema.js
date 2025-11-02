const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkSchema() {
  const tables = ['tenant_vehicles', 'tenant_drivers', 'tenant_customers', 'tenant_trips', 'tenant_permits', 'tenant_fuelcards'];
  
  for (const table of tables) {
    const result = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [table]);
    if (result.rows.length > 0) {
      console.log(`\n${table}:`);
      result.rows.forEach(row => console.log(`  - ${row.column_name}`));
    }
  }
  await pool.end();
}

checkSchema();
