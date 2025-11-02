const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkAll() {
  const tables = [
    'tenant_invoices', 'tenant_payroll', 'tenant_maintenance', 
    'tenant_driver_training', 'tenant_holidays', 'tenant_safeguarding',
    'tenant_messages', 'tenant_driver_messages', 'tenant_social_outings',
    'tenant_cost_centers', 'tenant_timesheets', 'tenant_office_staff',
    'tenant_providers', 'tenant_settings', 'tenant_feedback'
  ];
  
  for (const table of tables) {
    const result = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [table]);
    if (result.rows.length > 0) {
      console.log(`\n${table}:`);
      const cols = result.rows.map(r => r.column_name).join(', ');
      console.log(`  ${cols}`);
    } else {
      console.log(`\n${table}: TABLE NOT FOUND`);
    }
  }
  await pool.end();
}

checkAll();
