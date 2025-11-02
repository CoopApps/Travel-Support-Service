const { Client } = require('pg');

async function checkData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'travel_support_dev',
    user: 'postgres',
    password: '1234'
  });

  try {
    await client.connect();

    const tables = [
      'tenant_payroll_periods',
      'tenant_payroll_entries',
      'tenant_payroll_fuel',
      'tenant_payroll_history',
      'tenant_payroll_hours',
      'tenant_payroll_settings'
    ];

    console.log('Checking for data in existing payroll tables:\n');

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table}: ${result.rows[0].count} rows`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkData();
