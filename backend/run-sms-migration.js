const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || '1234'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'travel_support_dev'}`;

async function runSMSMigration() {
  const client = new Client({
    connectionString,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'src', 'migrations', 'create-sms-delivery-log.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('\n📋 Running SMS delivery log migration...');
    await client.query(migrationSQL);
    console.log('✅ SMS delivery log table created successfully');

    // Verify table creation
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'sms_delivery_log'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('✅ Verified: sms_delivery_log table exists');

      // Show table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sms_delivery_log'
        ORDER BY ordinal_position;
      `);

      console.log('\n📊 Table Structure:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    } else {
      console.log('❌ Warning: sms_delivery_log table not found after migration');
    }

    console.log('\n✅ SMS migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSMSMigration();
