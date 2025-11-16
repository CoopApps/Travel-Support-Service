/**
 * Add Cooperative Pricing Model
 *
 * Implements flexible pricing models, member management, and surplus distribution
 * for Section 22 community bus services operating as cooperatives.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📋 Running migration: add-cooperative-pricing-model.sql');
    console.log('   This will add:');
    console.log('   - Flexible pricing configuration to routes');
    console.log('   - Cooperative member management');
    console.log('   - Service cost tracking');
    console.log('   - Dynamic pricing snapshots');
    console.log('   - Surplus distribution system');
    console.log('   - Member dividend tracking\n');

    const migrationPath = path.join(__dirname, 'migrations', 'add-cooperative-pricing-model.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify new tables
    console.log('🔍 Verifying new tables:');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'section22_%'
      ORDER BY table_name
    `);

    console.log('  Tables created/updated:');
    tablesResult.rows.forEach(row => {
      console.log(`    ✓ ${row.table_name}`);
    });

    // Verify route configuration columns
    console.log('\n🔍 Verifying route configuration columns:');
    const routeColumnsResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'section22_bus_routes'
      AND column_name IN (
        'pricing_model',
        'minimum_fare_floor',
        'maximum_acceptable_fare',
        'booking_opens_days_advance',
        'booking_cutoff_hours',
        'surplus_reserves_percent',
        'surplus_business_percent',
        'surplus_dividend_percent',
        'non_member_surcharge_percent'
      )
      ORDER BY column_name
    `);

    console.log('  Route configuration columns:');
    routeColumnsResult.rows.forEach(row => {
      console.log(`    ✓ ${row.column_name} (${row.data_type})`);
    });

    // Verify view created
    console.log('\n🔍 Verifying views:');
    const viewsResult = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name LIKE 'section22_%'
    `);

    if (viewsResult.rows.length > 0) {
      console.log('  Views created:');
      viewsResult.rows.forEach(row => {
        console.log(`    ✓ ${row.table_name}`);
      });
    }

    console.log('\n🎉 Cooperative pricing model migration complete!');
    console.log('\nNext steps:');
    console.log('  1. Configure pricing models for each route');
    console.log('  2. Add cooperative members');
    console.log('  3. Set up cost tracking for services');
    console.log('  4. Configure surplus distribution settings');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
