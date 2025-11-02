const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function cleanAndMigrate() {
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

    // Drop old payroll tables and view
    console.log('\n🗑️  Dropping old payroll tables...');
    await client.query('DROP VIEW IF EXISTS view_monthly_payroll_summary CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_movements CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_history CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_settings CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_fuel CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_hours CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_entries CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_periods CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_payroll_records CASCADE');
    await client.query('DROP TABLE IF EXISTS tenant_freelance_submissions CASCADE');
    await client.query('DROP FUNCTION IF EXISTS update_payroll_timestamp CASCADE');
    console.log('✅ Old tables dropped');

    // Read and execute new migration
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'create-payroll-tables.sql');
    console.log('\n📖 Reading new migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Creating new payroll tables...');
    await client.query(sql);

    console.log('\n✅ Payroll migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  ✓ tenant_payroll_periods');
    console.log('  ✓ tenant_payroll_records');
    console.log('  ✓ tenant_freelance_submissions');
    console.log('  ✓ tenant_payroll_movements');
    console.log('\nUpdated tables:');
    console.log('  ✓ tenant_drivers (added payroll fields)');
    console.log('\n🎉 All done! The payroll module is ready to use.');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanAndMigrate();
