const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkDriverSchema() {
  try {
    console.log('\n📋 DRIVER TABLE SCHEMA:\n');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'tenant_drivers'
      ORDER BY ordinal_position
    `);

    columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n\n💰 PAYMENT PROVIDERS:\n');
    const providers = await pool.query(`
      SELECT provider_id, tenant_id, provider_name, provider_type, rate_per_trip, is_active
      FROM tenant_providers
      ORDER BY tenant_id, provider_id
    `);

    if (providers.rows.length === 0) {
      console.log('  No providers found in database');
      console.log('\n  Creating sample providers...');

      // Create default providers
      await pool.query(`
        INSERT INTO tenant_providers (tenant_id, provider_name, provider_type, rate_per_trip, is_active)
        VALUES
          (1, 'NHS', 'nhs', 15.00, true),
          (1, 'Local Authority', 'local_authority', 12.50, true),
          (1, 'Private Insurance', 'private', 18.00, true),
          (2, 'NHS', 'nhs', 15.00, true),
          (2, 'Sheffield Council', 'local_authority', 13.00, true)
        ON CONFLICT DO NOTHING
      `);

      const newProviders = await pool.query(`
        SELECT provider_id, tenant_id, provider_name, provider_type, rate_per_trip
        FROM tenant_providers
        ORDER BY tenant_id, provider_id
      `);

      console.log('\n  ✅ Created providers:');
      newProviders.rows.forEach(p => {
        console.log(`    - Tenant ${p.tenant_id}: ${p.provider_name} (${p.provider_type}) - £${p.rate_per_trip}/trip`);
      });
    } else {
      providers.rows.forEach(p => {
        console.log(`  - Tenant ${p.tenant_id}: ${p.provider_name} (${p.provider_type}) - £${p.rate_per_trip}/trip`);
      });
    }

    console.log('\n\n👤 EXISTING DRIVERS:\n');
    const drivers = await pool.query(`
      SELECT driver_id, tenant_id, name, email, employment_type, is_active
      FROM tenant_drivers
      ORDER BY tenant_id, driver_id
    `);

    if (drivers.rows.length === 0) {
      console.log('  No drivers found');
    } else {
      drivers.rows.forEach(d => {
        console.log(`  - Tenant ${d.tenant_id}: ${d.name} (${d.email}) - ${d.employment_type}`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkDriverSchema();
