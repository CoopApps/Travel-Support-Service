/**
 * Run Dual Service Architecture Migration
 *
 * This script adds support for both Community Transport and Community Bus services
 * to the multi-tenant platform.
 *
 * Usage:
 *   node run-dual-service-migration.js
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
    console.error('   Set it in your .env file or run with: DATABASE_URL=your_url node run-dual-service-migration.js');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');

  // Detect if this is a local or remote database
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  const pool = new Pool({
    connectionString,
    ssl: isLocal ? false : {
      rejectUnauthorized: false // Railway/remote requires SSL
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-dual-service-architecture.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📝 Migration file loaded');

    // Execute the migration
    console.log('🚀 Running dual service architecture migration...');
    console.log('   This may take a minute...');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Summary of changes:');
    console.log('  📊 Tenant Configuration:');
    console.log('     - Added service_transport_enabled column');
    console.log('     - Added service_bus_enabled column');
    console.log('     - Added active_service_view column');
    console.log('');
    console.log('  🚌 Section 22 Bus Service Tables:');
    console.log('     - Created section22_bus_routes (route management)');
    console.log('     - Created section22_route_stops (stop sequences)');
    console.log('     - Created section22_timetables (service schedules)');
    console.log('     - Created section22_bus_bookings (seat bookings)');
    console.log('     - Created section22_seat_availability (real-time tracking)');
    console.log('');
    console.log('  👤 User Preferences:');
    console.log('     - Created user_service_preferences table');
    console.log('');
    console.log('  💰 Subscription Support:');
    console.log('     - Updated subscriptions table with module support');
    console.log('');
    console.log('  ⚡ Automation:');
    console.log('     - Created seat availability trigger function');
    console.log('     - Created helper views for common queries');
    console.log('');
    console.log('  📈 Views Created:');
    console.log('     - v_active_bus_routes');
    console.log('     - v_todays_bus_services');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Build ServiceToggle component (frontend)');
    console.log('  2. Create bus service API routes (backend)');
    console.log('  3. Build bus service UI pages (frontend)');
    console.log('  4. Test dual service functionality');

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
