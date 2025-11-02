const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'travel_support_dev',
    user: 'postgres',
    password: '1234'
  });

  try {
    console.log('📦 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!');

    const migrationPath = path.join(__dirname, 'database', 'migrations', 'create-admin-module-tables.sql');
    console.log('📖 Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running Company Admin module migration...');
    await client.query(sql);

    console.log('\n✅ Company Admin migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  ✓ tenant_office_staff');
    console.log('  ✓ tenant_cost_centers');
    console.log('  ✓ tenant_cost_center_expenses');
    console.log('  ✓ tenant_driver_timesheets');
    console.log('  ✓ tenant_company_settings');
    console.log('\nCreated views:');
    console.log('  ✓ view_office_staff_with_managers');
    console.log('  ✓ view_cost_center_utilization');
    console.log('  ✓ view_pending_timesheet_approvals');
    console.log('\n🎉 All done! The Company Admin module database is ready.');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
