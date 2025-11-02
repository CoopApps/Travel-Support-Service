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

    const migrationPath = path.join(__dirname, 'database', 'migrations', 'create-payroll-tables.sql');
    console.log('📖 Reading migration file...');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running payroll migration...');
    await client.query(sql);

    console.log('✅ Payroll migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  ✓ tenant_payroll_periods');
    console.log('  ✓ tenant_payroll_records');
    console.log('  ✓ tenant_freelance_submissions');
    console.log('  ✓ tenant_payroll_movements');
    console.log('\nUpdated tables:');
    console.log('  ✓ tenant_drivers (added payroll fields)');
    console.log('\n🎉 All done! The payroll module is ready to use.');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
