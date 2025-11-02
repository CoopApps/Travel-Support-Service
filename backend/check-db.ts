import { query } from './src/config/database';

async function checkDatabase() {
  try {
    console.log('\n=== Platform Admins ===');
    const admins = await query('SELECT admin_id, username, email, created_at FROM platform_admins ORDER BY admin_id');
    console.log(JSON.stringify(admins, null, 2));

    console.log('\n=== Tenants ===');
    const tenants = await query('SELECT tenant_id, company_name, subdomain, subscription_tier, is_active FROM tenants ORDER BY tenant_id');
    console.log(JSON.stringify(tenants, null, 2));

    console.log('\n=== Tenant Users ===');
    const users = await query('SELECT user_id, tenant_id, username, email, role FROM tenant_users ORDER BY tenant_id, user_id');
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabase();
