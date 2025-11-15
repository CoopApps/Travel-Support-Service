const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runFareMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  // Detect if local or remote
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🚀 Running Cooperative Fare System Migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-cooperative-fare-system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables were created
    const tables = [
      'fare_calculation_settings',
      'cooperative_commonwealth_fund',
      'cooperative_commonwealth_contributions',
      'cooperative_commonwealth_distributions',
      'fare_tiers',
      'trip_fare_records'
    ];

    console.log('📋 Verifying tables...\n');
    for (const table of tables) {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM ${table}`
      );
      console.log(`✓ ${table}: ${result.rows[0].count} rows`);
    }

    console.log('\n🎉 Cooperative Fare Transparency System ready!');
    console.log('\nFeatures enabled:');
    console.log('  • Transparent cost breakdowns (wages, fuel, vehicle, overhead)');
    console.log('  • Dynamic pricing (fare decreases as passengers join)');
    console.log('  • Surplus allocation (reserves, dividends, commonwealth)');
    console.log('  • Cooperative commonwealth fund tracking');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runFareMigration();
