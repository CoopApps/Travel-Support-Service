const { Client } = require('pg');

async function checkTable() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'travel_support_dev',
    user: 'postgres',
    password: '1234'
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tenant_payroll_periods'
      ORDER BY ordinal_position
    `);

    console.log('Existing tenant_payroll_periods columns:');
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
