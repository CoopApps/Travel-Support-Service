const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Reading migration file...');
    const sql = fs.readFileSync(__dirname + '/migrations/add-universal-messaging-fields.sql', 'utf8');

    console.log('Executing migration...');
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Added new columns to tenant_messages table:');
    console.log('  - delivery_method (in-app, email, sms, both)');
    console.log('  - email_subject');
    console.log('  - sms_body');
    console.log('  - status (draft, scheduled, sending, sent, delivered, failed)');
    console.log('  - is_draft');
    console.log('  - scheduled_at');
    console.log('  - sent_at');
    console.log('  - delivered_at');
    console.log('  - failed_reason');
    console.log('\nCreated indexes:');
    console.log('  - idx_tenant_messages_status');
    console.log('  - idx_tenant_messages_is_draft');
    console.log('  - idx_tenant_messages_scheduled');
    console.log('\nExisting messages updated with default values');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
