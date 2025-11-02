/**
 * Force cleanup of old columns after partial migration
 */
const { Client } = require('pg');
require('dotenv').config();

async function forceCleanup() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check current state
    const hasOldColumns = await client.query(`
      SELECT
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_tier') as has_tier,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_users') as has_max_users,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'max_customers') as has_max_customers,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'organization_type') as has_org_type,
        EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'app_id') as has_app_id;
    `);

    const state = hasOldColumns.rows[0];
    console.log('📊 Current schema state:');
    console.log(`   subscription_tier: ${state.has_tier ? '✅ EXISTS (needs removal)' : '❌ REMOVED'}`);
    console.log(`   max_users: ${state.has_max_users ? '✅ EXISTS (needs removal)' : '❌ REMOVED'}`);
    console.log(`   max_customers: ${state.has_max_customers ? '✅ EXISTS (needs removal)' : '❌ REMOVED'}`);
    console.log(`   organization_type: ${state.has_org_type ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   app_id: ${state.has_app_id ? '✅ EXISTS' : '❌ MISSING (needs adding)'}`);
    console.log('');

    if (!state.has_tier && !state.has_max_users && !state.has_max_customers) {
      console.log('✅ Old columns already removed! Schema is clean.');
      return;
    }

    // Show current tenants
    const tenants = await client.query('SELECT tenant_id, company_name, subscription_tier, max_users, max_customers, organization_type FROM tenants');
    console.log('📋 Current tenants:');
    tenants.rows.forEach(t => {
      console.log(`   ${t.tenant_id}: ${t.company_name}`);
      console.log(`      OLD: tier=${t.subscription_tier}, max_users=${t.max_users}, max_customers=${t.max_customers}`);
      console.log(`      NEW: org_type=${t.organization_type}`);
    });
    console.log('');

    console.log('🚀 Starting cleanup...\n');

    // Step 1: Drop the view that depends on subscription_tier
    console.log('1️⃣ Dropping dependent view...');
    await client.query('DROP VIEW IF EXISTS cooperative_overview CASCADE');
    console.log('   ✅ View dropped\n');

    // Step 2: Drop check constraint
    if (state.has_tier) {
      console.log('2️⃣ Dropping check constraint on subscription_tier...');
      await client.query('ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_subscription_tier_check');
      console.log('   ✅ Constraint dropped\n');
    }

    // Step 3: Drop old columns
    console.log('3️⃣ Dropping old columns...');
    if (state.has_tier) {
      await client.query('ALTER TABLE tenants DROP COLUMN IF EXISTS subscription_tier');
      console.log('   ✅ Dropped subscription_tier');
    }
    if (state.has_max_users) {
      await client.query('ALTER TABLE tenants DROP COLUMN IF EXISTS max_users');
      console.log('   ✅ Dropped max_users');
    }
    if (state.has_max_customers) {
      await client.query('ALTER TABLE tenants DROP COLUMN IF EXISTS max_customers');
      console.log('   ✅ Dropped max_customers');
    }
    console.log('');

    // Step 4: Add app_id if missing
    if (!state.has_app_id) {
      console.log('4️⃣ Adding app_id column...');

      // Create apps table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS commonwealth_apps (
          app_id SERIAL PRIMARY KEY,
          app_name VARCHAR(255) NOT NULL UNIQUE,
          app_code VARCHAR(50) NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          config JSONB DEFAULT '{}'
        )
      `);

      // Insert travel_support app
      await client.query(`
        INSERT INTO commonwealth_apps (app_name, app_code, description, is_active)
        VALUES (
          'Travel Support System',
          'travel_support',
          'Accessible transportation management system for third sector organizations',
          true
        ) ON CONFLICT (app_code) DO NOTHING
      `);

      // Add app_id column
      await client.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS app_id INTEGER REFERENCES commonwealth_apps(app_id) ON DELETE RESTRICT');

      // Set default app_id
      await client.query(`
        UPDATE tenants
        SET app_id = (SELECT app_id FROM commonwealth_apps WHERE app_code = 'travel_support')
        WHERE app_id IS NULL
      `);

      // Make it required
      await client.query('ALTER TABLE tenants ALTER COLUMN app_id SET NOT NULL');

      console.log('   ✅ Added app_id column\n');
    }

    // Step 5: Verify cleanup
    console.log('5️⃣ Verifying cleanup...\n');
    const finalState = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenants'
        AND column_name IN ('subscription_tier', 'max_users', 'max_customers', 'organization_type', 'app_id')
      ORDER BY column_name;
    `);

    console.log('📊 Final columns:');
    finalState.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name}`);
    });
    console.log('');

    // Show final tenants
    const finalTenants = await client.query(`
      SELECT tenant_id, company_name, organization_type, discount_percentage, app_id
      FROM tenants
    `);
    console.log('📋 Migrated tenants:');
    finalTenants.rows.forEach(t => {
      console.log(`   ${t.tenant_id}: ${t.company_name}`);
      console.log(`      Type: ${t.organization_type}, Discount: ${t.discount_percentage}%, App: ${t.app_id}`);
    });
    console.log('');

    console.log('✅ Cleanup complete! Old subscription tier model has been removed.');
    console.log('   The database is now using the new organization type pricing model.\n');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

forceCleanup();
