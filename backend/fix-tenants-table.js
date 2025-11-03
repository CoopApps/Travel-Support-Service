/**
 * Fix Tenants Table - Add missing is_active column
 */

const { Client } = require('pg');

async function fixTenantsTable() {
  const client = new Client({
    connectionString: 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🔧 Adding missing is_active column to tenants table...');

    await client.query(`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    console.log('✅ Column added successfully!\n');

    // Verify the column exists
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Tenants table columns:\n');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type})`);
    });

    console.log('\n✅ Tenants table fixed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixTenantsTable();
