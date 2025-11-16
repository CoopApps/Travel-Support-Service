/**
 * Add passenger check-in tracking to bus bookings
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

    console.log('📋 Running migration: add-bus-passenger-checkin.sql');
    const migrationPath = path.join(__dirname, 'migrations', 'add-bus-passenger-checkin.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the columns exist
    console.log('🔍 Verifying check-in columns were added:');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'section22_bus_bookings'
      AND column_name IN ('boarded_at', 'checked_in_by', 'no_show_reason', 'boarding_notes')
      ORDER BY column_name
    `);

    if (verifyResult.rows.length === 4) {
      console.log('  ✅ All check-in columns added:');
      verifyResult.rows.forEach(row => {
        console.log(`    - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
    } else {
      console.log(`  ⚠️ Expected 4 columns, found ${verifyResult.rows.length}`);
    }

    // Check status constraint
    console.log('\n🔍 Verifying status constraint:');
    const constraintResult = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'section22_bus_bookings_status_check'
    `);

    if (constraintResult.rows.length > 0) {
      console.log('  ✅ Status constraint updated');
      console.log(`    ${constraintResult.rows[0].definition}`);
    } else {
      console.log('  ❌ Status constraint not found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
