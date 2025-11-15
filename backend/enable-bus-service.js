/**
 * Enable Bus Service for a Tenant
 *
 * Usage:
 *   DATABASE_URL=your_url node enable-bus-service.js [tenant_id]
 *   If no tenant_id is provided, it will enable for all tenants
 */

const { Pool } = require('pg');

async function enableBusService() {
  const tenantId = process.argv[2]; // Optional tenant ID

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // First, show current status
    const current = await client.query(
      'SELECT tenant_id, company_name, service_transport_enabled, service_bus_enabled, active_service_view FROM tenants ORDER BY tenant_id'
    );

    console.log('📋 Current Tenant Status:\n');
    current.rows.forEach(row => {
      console.log(`  ID: ${row.tenant_id} | ${row.company_name}`);
      console.log(`     Transport: ${row.service_transport_enabled ? '✅' : '❌'} | Bus: ${row.service_bus_enabled ? '✅' : '❌'} | Active: ${row.active_service_view || 'transport'}\n`);
    });

    // Enable bus service
    let updateQuery;
    let updateParams;

    if (tenantId) {
      updateQuery = `
        UPDATE tenants
        SET service_bus_enabled = true,
            service_transport_enabled = true
        WHERE tenant_id = $1
        RETURNING tenant_id, company_name, service_bus_enabled, service_transport_enabled
      `;
      updateParams = [tenantId];
      console.log(`🔧 Enabling bus service for tenant ID ${tenantId}...\n`);
    } else {
      updateQuery = `
        UPDATE tenants
        SET service_bus_enabled = true,
            service_transport_enabled = true
        RETURNING tenant_id, company_name, service_bus_enabled, service_transport_enabled
      `;
      updateParams = [];
      console.log('🔧 Enabling bus service for ALL tenants...\n');
    }

    const result = await client.query(updateQuery, updateParams);

    console.log('✅ Bus service enabled:\n');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.company_name} (ID: ${row.tenant_id})`);
      console.log(`    Transport: ${row.service_transport_enabled ? '✅' : '❌'} | Bus: ${row.service_bus_enabled ? '✅' : '❌'}\n`);
    });

    console.log('\n📝 Next Steps:');
    console.log('  1. Log into the application');
    console.log('  2. Look for the Service Toggle button at the top');
    console.log('  3. Click to switch between Community Transport and Community Bus');
    console.log('  4. Navigate to /bus/dashboard to access bus service features\n');

    await client.end();
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

enableBusService();
