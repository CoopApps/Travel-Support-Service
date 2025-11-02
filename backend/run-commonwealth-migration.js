/**
 * Migration Runner for Co-operative Commonwealth
 *
 * Safely migrates database from old subscription tier model to new organization type model
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
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

    // Check current schema
    const hasOldSchema = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'subscription_tier'
      );
    `);

    const hasNewSchema = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'organization_type'
      );
    `);

    if (!hasOldSchema.rows[0].exists) {
      console.log('❌ Old schema not found. Database may already be migrated or corrupted.');
      return;
    }

    if (hasNewSchema.rows[0].exists) {
      console.log('ℹ️  New schema columns already exist. Skipping migration.');
      console.log('   Database appears to already be migrated.\n');

      // Show current tenants
      const tenants = await client.query('SELECT tenant_id, company_name, organization_type, discount_percentage FROM tenants');
      console.log('📊 Current tenants:');
      tenants.rows.forEach(t => {
        console.log(`   ${t.tenant_id}: ${t.company_name} (${t.organization_type}, ${t.discount_percentage}% discount)`);
      });
      return;
    }

    // Count existing tenants
    const count = await client.query('SELECT COUNT(*) FROM tenants');
    const tenantCount = parseInt(count.rows[0].count);

    console.log(`📊 Found ${tenantCount} tenant(s) to migrate\n`);

    if (tenantCount > 0) {
      const tenants = await client.query('SELECT tenant_id, company_name, subscription_tier FROM tenants');
      console.log('Tenants to be migrated:');
      tenants.rows.forEach(t => {
        console.log(`   - ${t.company_name} (${t.subscription_tier})`);
      });
      console.log('');
    }

    console.log('🚀 Starting migration...\n');

    // Step 1: Run organization types migration
    console.log('📝 Step 1: Adding organization type columns...');
    const migration1Path = path.join(__dirname, 'migrations', 'add-organization-types.sql');

    if (fs.existsSync(migration1Path)) {
      const migration1SQL = fs.readFileSync(migration1Path, 'utf8');
      await client.query(migration1SQL);
      console.log('✅ Organization types migration complete\n');
    } else {
      console.log('⚠️  Migration file not found: add-organization-types.sql');
      console.log('   Skipping to commonwealth migration...\n');
    }

    // Step 2: Run commonwealth refactor migration
    console.log('📝 Step 2: Refactoring to Co-operative Commonwealth...');
    const migration2Path = path.join(__dirname, 'migrations', 'refactor-to-cooperative-commonwealth.sql');

    if (!fs.existsSync(migration2Path)) {
      console.log('❌ Migration file not found: refactor-to-cooperative-commonwealth.sql');
      return;
    }

    const migration2SQL = fs.readFileSync(migration2Path, 'utf8');
    await client.query(migration2SQL);
    console.log('✅ Commonwealth refactor migration complete\n');

    // Verify migration
    console.log('🔍 Verifying migration...');
    const newColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenants' AND column_name IN ('organization_type', 'base_price', 'discount_percentage')
      ORDER BY column_name;
    `);

    console.log(`✅ New columns added: ${newColumns.rows.map(c => c.column_name).join(', ')}\n`);

    // Check commonwealth apps
    const apps = await client.query('SELECT app_name, app_code FROM commonwealth_apps');
    console.log(`📱 Commonwealth apps: ${apps.rows.length}`);
    apps.rows.forEach(app => {
      console.log(`   - ${app.app_name} (${app.app_code})`);
    });
    console.log('');

    // Show migrated tenants
    const migratedTenants = await client.query(`
      SELECT tenant_id, company_name, organization_type, cooperative_model,
             base_price, discount_percentage, currency
      FROM tenants
    `);

    console.log('📊 Migrated tenants:');
    migratedTenants.rows.forEach(t => {
      const actualPrice = t.base_price * (1 - t.discount_percentage / 100);
      console.log(`   ${t.tenant_id}: ${t.company_name}`);
      console.log(`      Type: ${t.organization_type}${t.cooperative_model ? ` (${t.cooperative_model} model)` : ''}`);
      console.log(`      Pricing: ${t.currency} ${t.base_price} → ${actualPrice.toFixed(2)} (${t.discount_percentage}% discount)`);
    });

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Refresh your frontend');
    console.log('   3. Your tenants should now appear!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

runMigrations();
