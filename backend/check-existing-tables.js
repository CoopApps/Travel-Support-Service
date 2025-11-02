const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'travel_support_dev',
    user: 'postgres',
    password: '1234'
  });

  try {
    await client.connect();

    console.log('Checking existing tables:\n');

    const tablesToCheck = [
      'tenants',
      'tenant_drivers',
      'tenant_office_staff',
      'tenant_cost_centers',
      'tenant_payroll_periods'
    ];

    for (const table of tablesToCheck) {
      const result = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      if (result.rows.length > 0) {
        console.log(`✓ ${table}:`);
        result.rows.forEach(r => {
          console.log(`    - ${r.column_name} (${r.data_type})`);
        });
      } else {
        console.log(`✗ ${table}: DOES NOT EXIST`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
