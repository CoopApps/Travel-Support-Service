/**
 * Create Dividend Schedule Settings Table
 *
 * Stores automated dividend calculation settings for each tenant:
 * - Enable/disable automation
 * - Frequency (monthly/quarterly)
 * - Allocation percentages
 * - Auto-distribution settings
 * - Notification preferences
 */

const { Client } = require('pg');
require('dotenv').config();

async function createDividendScheduleSettingsTable() {
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

    // Create dividend schedule settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS section22_dividend_schedule_settings (
        setting_id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,

        -- Automation control
        enabled BOOLEAN DEFAULT false,
        frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly')),

        -- Allocation percentages (must total 100%)
        reserves_percent DECIMAL(5, 2) DEFAULT 20.00,
        business_percent DECIMAL(5, 2) DEFAULT 30.00,
        dividend_percent DECIMAL(5, 2) DEFAULT 50.00,

        -- Distribution settings
        auto_distribute BOOLEAN DEFAULT false,
        notification_email VARCHAR(255),

        -- Audit fields
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Ensure one setting per tenant
        UNIQUE(tenant_id)
      );
    `);

    console.log('✅ section22_dividend_schedule_settings table created');

    // Create index on tenant_id for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dividend_schedule_tenant
      ON section22_dividend_schedule_settings(tenant_id);
    `);

    console.log('✅ Indexes created');

    // Add check constraint to ensure percentages total 100%
    await client.query(`
      ALTER TABLE section22_dividend_schedule_settings
      DROP CONSTRAINT IF EXISTS chk_dividend_percentages_total;

      ALTER TABLE section22_dividend_schedule_settings
      ADD CONSTRAINT chk_dividend_percentages_total
      CHECK (reserves_percent + business_percent + dividend_percent = 100);
    `);

    console.log('✅ Constraints added');

    console.log('\n📊 Dividend Schedule Settings Table Structure:');
    console.log('- setting_id: Unique identifier');
    console.log('- tenant_id: Foreign key to tenants table');
    console.log('- enabled: Whether automation is enabled');
    console.log('- frequency: monthly or quarterly');
    console.log('- reserves_percent: % allocated to reserves');
    console.log('- business_percent: % allocated to business costs');
    console.log('- dividend_percent: % allocated to dividend pool');
    console.log('- auto_distribute: Auto-mark distributions as paid');
    console.log('- notification_email: Email for notifications');
    console.log('- created_at, updated_at: Audit timestamps');

    console.log('\n✅ All dividend schedule settings tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating dividend schedule settings table:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
createDividendScheduleSettingsTable()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
