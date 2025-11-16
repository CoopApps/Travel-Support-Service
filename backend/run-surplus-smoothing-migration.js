/**
 * Add Surplus Smoothing System
 *
 * Allows profitable trips to subsidize less profitable ones within the same route.
 * Benefits: More services run, better member experience, fairer distribution.
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

    console.log('📋 Running migration: add-surplus-smoothing.sql');
    console.log('   This will add:');
    console.log('   - Route surplus pool tracking');
    console.log('   - Surplus transaction history');
    console.log('   - Surplus smoothing configuration');
    console.log('   - Helper functions for threshold calculation');
    console.log('   - Enhanced service viability view\n');

    const migrationPath = path.join(__dirname, 'migrations', 'add-surplus-smoothing.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify new tables
    console.log('🔍 Verifying new tables:');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('section22_route_surplus_pool', 'section22_surplus_transactions')
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log('  Tables created:');
      tablesResult.rows.forEach(row => {
        console.log(`    ✓ ${row.table_name}`);
      });
    }

    // Verify new columns
    console.log('\n🔍 Verifying route configuration columns:');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'section22_bus_routes'
      AND column_name IN (
        'use_surplus_smoothing',
        'max_surplus_subsidy_percent',
        'max_service_subsidy_percent',
        'cancellation_policy'
      )
      ORDER BY column_name
    `);

    if (columnsResult.rows.length > 0) {
      console.log('  Smoothing configuration columns:');
      columnsResult.rows.forEach(row => {
        console.log(`    ✓ ${row.column_name} (${row.data_type})`);
      });
    }

    // Verify functions
    console.log('\n🔍 Verifying helper functions:');
    const functionsResult = await client.query(`
      SELECT proname as function_name
      FROM pg_proc
      WHERE proname IN ('calculate_available_subsidy', 'calculate_threshold_with_smoothing')
      ORDER BY proname
    `);

    if (functionsResult.rows.length > 0) {
      console.log('  Functions created:');
      functionsResult.rows.forEach(row => {
        console.log(`    ✓ ${row.function_name}()`);
      });
    }

    // Verify view updated
    console.log('\n🔍 Verifying views:');
    const viewsResult = await client.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
      AND table_name = 'section22_service_viability'
    `);

    if (viewsResult.rows.length > 0) {
      console.log('  ✓ section22_service_viability (updated with surplus smoothing)');
    }

    console.log('\n🎉 Surplus smoothing migration complete!');
    console.log('\nHow it works:');
    console.log('  1. Profitable trips add surplus to route pool');
    console.log('  2. Future trips can use surplus to lower minimum passenger threshold');
    console.log('  3. Example: Need 4 passengers normally, but with £20 surplus only need 2!');
    console.log('  4. Configurable limits prevent over-subsidization');
    console.log('\nNext steps:');
    console.log('  1. Create surplus management service');
    console.log('  2. Update cost calculator to apply surplus smoothing');
    console.log('  3. Build surplus pool dashboard for transparency');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
