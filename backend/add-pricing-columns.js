/**
 * Add missing pricing columns to tenants table
 */
const { Client } = require('pg');
require('dotenv').config();

async function addPricingColumns() {
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

    // Check if columns exist
    const columns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tenants'
        AND column_name IN ('base_price', 'currency', 'billing_cycle')
    `);

    const existingColumns = columns.rows.map(r => r.column_name);
    console.log('📊 Checking pricing columns:');
    console.log(`   base_price: ${existingColumns.includes('base_price') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   currency: ${existingColumns.includes('currency') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   billing_cycle: ${existingColumns.includes('billing_cycle') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log('');

    if (existingColumns.length === 3) {
      console.log('✅ All pricing columns already exist!');
      return;
    }

    console.log('🚀 Adding missing pricing columns...\n');

    // Add base_price
    if (!existingColumns.includes('base_price')) {
      console.log('1️⃣ Adding base_price column...');
      await client.query(`
        ALTER TABLE tenants
        ADD COLUMN base_price DECIMAL(10,2) DEFAULT 100.00
      `);
      console.log('   ✅ Added base_price\n');
    }

    // Add currency
    if (!existingColumns.includes('currency')) {
      console.log('2️⃣ Adding currency column...');
      await client.query(`
        ALTER TABLE tenants
        ADD COLUMN currency VARCHAR(3) DEFAULT 'GBP'
      `);
      console.log('   ✅ Added currency\n');
    }

    // Add billing_cycle
    if (!existingColumns.includes('billing_cycle')) {
      console.log('3️⃣ Adding billing_cycle column...');
      await client.query(`
        ALTER TABLE tenants
        ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly'
          CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual'))
      `);
      console.log('   ✅ Added billing_cycle\n');
    }

    // Set default values for existing tenants
    console.log('4️⃣ Setting default values for existing tenants...');
    await client.query(`
      UPDATE tenants
      SET
        base_price = COALESCE(base_price, 100.00),
        currency = COALESCE(currency, 'GBP'),
        billing_cycle = COALESCE(billing_cycle, 'monthly')
      WHERE base_price IS NULL OR currency IS NULL OR billing_cycle IS NULL
    `);
    console.log('   ✅ Default values set\n');

    // Verify
    console.log('5️⃣ Verifying changes...\n');
    const tenants = await client.query(`
      SELECT tenant_id, company_name, organization_type, base_price, currency, billing_cycle, discount_percentage
      FROM tenants
    `);

    console.log('📊 Updated tenants:');
    tenants.rows.forEach(t => {
      const actualPrice = t.base_price * (1 - t.discount_percentage / 100);
      console.log(`   ${t.tenant_id}: ${t.company_name}`);
      console.log(`      Type: ${t.organization_type}`);
      console.log(`      Pricing: ${t.currency} ${t.base_price} → ${actualPrice.toFixed(2)} (${t.discount_percentage}% discount)`);
      console.log(`      Cycle: ${t.billing_cycle}`);
    });
    console.log('');

    console.log('✅ Pricing columns added successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await client.end();
  }
}

addPricingColumns();
