const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const TENANT_ID = 1; // Demo Transport Company

async function clearDemoData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('\n🗑️  Clearing Demo Transport Company data...\n');

    // Delete schedules
    const schedules = await client.query(
      'DELETE FROM tenant_schedules WHERE tenant_id = $1 RETURNING schedule_id',
      [TENANT_ID]
    );
    console.log(`✓ Deleted ${schedules.rowCount} schedules`);

    // Delete customers
    const customers = await client.query(
      'DELETE FROM tenant_customers WHERE tenant_id = $1 RETURNING customer_id',
      [TENANT_ID]
    );
    console.log(`✓ Deleted ${customers.rowCount} customers`);

    // Delete drivers
    const drivers = await client.query(
      'DELETE FROM tenant_drivers WHERE tenant_id = $1 RETURNING driver_id',
      [TENANT_ID]
    );
    console.log(`✓ Deleted ${drivers.rowCount} drivers`);

    // Delete vehicles
    const vehicles = await client.query(
      'DELETE FROM tenant_vehicles WHERE tenant_id = $1 RETURNING vehicle_id',
      [TENANT_ID]
    );
    console.log(`✓ Deleted ${vehicles.rowCount} vehicles`);

    // Delete providers
    const providers = await client.query(
      'DELETE FROM tenant_providers WHERE tenant_id = $1 RETURNING provider_id',
      [TENANT_ID]
    );
    console.log(`✓ Deleted ${providers.rowCount} providers`);

    await client.query('COMMIT');

    console.log('\n✅ Demo data cleared successfully!');
    console.log('\n📋 Remaining:');
    console.log('   - Tenant: Demo Transport Company');
    console.log('   - Admin user: admin / demo123');
    console.log('   - Access: http://demo.localhost:5174/\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

clearDemoData().catch(error => {
  console.error('Failed to clear demo data:', error);
  process.exit(1);
});
