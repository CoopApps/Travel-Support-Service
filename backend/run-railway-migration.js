/**
 * Run Section 19/22 Compliance Migration on Railway
 *
 * This script connects to the Railway PostgreSQL database and runs
 * the compliance migration.
 *
 * Usage:
 *   node run-railway-migration.js
 *
 * Make sure DATABASE_URL is set in your environment or .env file
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  // Use DATABASE_URL from environment (Railway provides this)
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('   Set it in your .env file or run with: DATABASE_URL=your_url node run-railway-migration.js');
    process.exit(1);
  }

  console.log('🔗 Connecting to Railway database...');

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false // Railway requires SSL
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-section-19-22-compliance.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📝 Migration file loaded');

    // Execute the migration
    console.log('🚀 Running migration...');
    console.log('   This may take a minute...');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Summary of changes:');
    console.log('  - Enhanced tenant_organizational_permits (13 new columns)');
    console.log('  - Enhanced tenants table (3 new columns)');
    console.log('  - Enhanced tenant_drivers (18 new columns)');
    console.log('  - Enhanced tenant_vehicles (14 new columns)');
    console.log('  - Created local_bus_service_registrations table');
    console.log('  - Created tenant_financial_surplus table');
    console.log('  - Created section19_passenger_class_definitions table');
    console.log('  - Created permit_compliance_alerts table');
    console.log('  - Created 6 standard passenger class definitions');
    console.log('  - Created 8 Traffic Commissioner area definitions');

    client.release();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
