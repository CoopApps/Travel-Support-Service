/**
 * Migration Runner: Create Bus Table Views
 * Creates database views to map bus_* table names to section22_* tables
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
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-bus-table-views.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration: add-bus-table-views.sql');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\nCreated views:');
    console.log('  - bus_routes -> section22_bus_routes');
    console.log('  - bus_timetables -> section22_timetables');
    console.log('  - bus_bookings -> section22_bus_bookings');
    console.log('  - bus_route_stops -> section22_route_stops');
    console.log('  - bus_seat_availability -> section22_seat_availability');

    // Verify views were created
    const result = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'bus_%'
      ORDER BY table_name
    `);

    console.log('\n📊 Verification - Bus-related objects in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Database connection closed');
  }
}

runMigration();
