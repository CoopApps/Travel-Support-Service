/**
 * Add member_type Column to Dividend Tables
 *
 * Adds member_type ('customer' or 'driver') to support multi-model cooperatives:
 * - Worker co-ops: dividends to drivers
 * - Passenger co-ops: dividends to customers
 * - Hybrid co-ops: dividends to both
 */

const { Client } = require('pg');
require('dotenv').config();

async function addMemberTypeToDividends() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add member_type column to section22_member_dividends
    await client.query(`
      ALTER TABLE section22_member_dividends
      ADD COLUMN IF NOT EXISTS member_type VARCHAR(20) DEFAULT 'customer';
    `);

    console.log('✅ Added member_type column to section22_member_dividends');

    // Update constraint to allow both 'customer' and 'driver'
    await client.query(`
      ALTER TABLE section22_member_dividends
      DROP CONSTRAINT IF EXISTS chk_member_type;

      ALTER TABLE section22_member_dividends
      ADD CONSTRAINT chk_member_type
      CHECK (member_type IN ('customer', 'driver'));
    `);

    console.log('✅ Added check constraint for member_type');

    // Create index on member_type for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_member_dividends_member_type
      ON section22_member_dividends(member_type);
    `);

    console.log('✅ Created index on member_type');

    console.log('\n📊 Multi-Model Dividend Support Enabled:');
    console.log('- Worker Co-ops: Dividends distributed to drivers');
    console.log('- Passenger Co-ops: Dividends distributed to customers');
    console.log('- Hybrid Co-ops: Dividends split between both groups');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
addMemberTypeToDividends()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
