const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || '1234'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'travel_support_dev'}`;

async function runDriverSMSMigrations() {
  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Migration 1: Add SMS fields to driver_messages table
    console.log('📋 Migration 1: Adding SMS fields to driver_messages table...');
    const migration1Path = path.join(__dirname, 'src', 'migrations', 'add-driver-messaging-fields.sql');
    const migration1SQL = fs.readFileSync(migration1Path, 'utf-8');
    await client.query(migration1SQL);
    console.log('✅ SMS fields added to driver_messages table');

    // Verify columns added
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'driver_messages'
      AND column_name IN ('delivery_method', 'email_subject', 'sms_body', 'status', 'is_draft', 'scheduled_at', 'sent_at', 'delivered_at', 'failed_reason')
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 New columns added to driver_messages:');
    columns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name}: ${col.data_type}`);
    });

    // Migration 2: Create driver SMS delivery log table
    console.log('\n📋 Migration 2: Creating driver SMS delivery log table...');
    const migration2Path = path.join(__dirname, 'src', 'migrations', 'create-driver-sms-delivery-log.sql');
    const migration2SQL = fs.readFileSync(migration2Path, 'utf-8');
    await client.query(migration2SQL);
    console.log('✅ Driver SMS delivery log table created');

    // Verify table creation
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'driver_sms_delivery_log'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ Verified: driver_sms_delivery_log table exists');

      // Show table structure
      const logColumns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'driver_sms_delivery_log'
        ORDER BY ordinal_position;
      `);

      console.log('\n📊 driver_sms_delivery_log structure:');
      logColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    } else {
      console.log('❌ Warning: driver_sms_delivery_log table not found after migration');
    }

    console.log('\n✅ All driver SMS migrations completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runDriverSMSMigrations();
