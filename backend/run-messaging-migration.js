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
    const sql = fs.readFileSync(__dirname + '/migrations/create-messaging-tables.sql', 'utf8');

    console.log('Executing migration...');
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('Created tables:');
    console.log('  - tenant_messages');
    console.log('  - customer_message_reads');
    console.log('  - customer_messages_to_office');
    console.log('\nSample messages inserted for tenant 2');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
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
