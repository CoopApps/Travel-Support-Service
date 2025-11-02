const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function listTenants() {
  try {
    const result = await pool.query(`
      SELECT
        tenant_id,
        company_name,
        subdomain,
        contact_email,
        (SELECT COUNT(*) FROM tenant_customers WHERE tenant_id = tenants.tenant_id) as customer_count,
        (SELECT COUNT(*) FROM tenant_drivers WHERE tenant_id = tenants.tenant_id) as driver_count,
        (SELECT COUNT(*) FROM tenant_providers WHERE tenant_id = tenants.tenant_id) as provider_count
      FROM tenants
      ORDER BY tenant_id
    `);

    console.log('\n📊 Current Tenants:\n');
    console.log('─'.repeat(100));

    result.rows.forEach(tenant => {
      console.log(`\nTenant ID: ${tenant.tenant_id}`);
      console.log(`Company: ${tenant.company_name}`);
      console.log(`Subdomain: ${tenant.subdomain}`);
      console.log(`Email: ${tenant.contact_email}`);
      console.log(`Data: Customers: ${tenant.customer_count} | Drivers: ${tenant.driver_count} | Providers: ${tenant.provider_count}`);
      console.log('─'.repeat(100));
    });

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

listTenants();
