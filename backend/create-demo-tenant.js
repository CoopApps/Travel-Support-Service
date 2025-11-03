/**
 * Create Demo Tenant and Admin User
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createDemoTenant() {
  const client = new Client({
    connectionString: 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Tenant details
    const companyName = 'Demo Transport Company';
    const subdomain = 'demo';
    const contactEmail = 'admin@demo.com';

    // Admin user details
    const adminEmail = 'admin@demo.com';
    const adminPassword = 'Admin123!'; // Change this!
    const adminFirstName = 'Admin';
    const adminLastName = 'User';

    console.log('🏢 Creating tenant...');

    // Check if tenant already exists
    const existingTenant = await client.query(
      'SELECT tenant_id FROM tenants WHERE subdomain = $1',
      [subdomain]
    );

    let tenantId;

    if (existingTenant.rows.length > 0) {
      tenantId = existingTenant.rows[0].tenant_id;
      console.log(`⚠️  Tenant '${subdomain}' already exists (ID: ${tenantId})`);
    } else {
      const tenantResult = await client.query(
        `INSERT INTO tenants (company_name, subdomain, contact_email, subscription_tier, subscription_status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING tenant_id`,
        [companyName, subdomain, contactEmail, 'premium', 'active']
      );

      tenantId = tenantResult.rows[0].tenant_id;
      console.log(`✅ Tenant created: ${companyName} (subdomain: ${subdomain})`);
      console.log(`   Tenant ID: ${tenantId}\n`);
    }

    console.log('👤 Creating admin user...');

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
      [tenantId, adminEmail]
    );

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  Admin user already exists for ${adminEmail}`);
      console.log('\n📝 Using existing credentials:');
    } else {
      // Hash password
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, adminEmail, passwordHash, adminFirstName, adminLastName, 'admin', true]
      );

      console.log(`✅ Admin user created: ${adminEmail}\n`);
      console.log('📝 Login credentials:');
    }

    console.log('='.repeat(60));
    console.log('🎉 SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Your login details:\n');
    console.log(`   Company: ${companyName}`);
    console.log(`   Subdomain: ${subdomain}`);
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n🌐 Login URL:');
    console.log(`   https://travel-supportbackend-production.up.railway.app/api/tenants/${tenantId}/login`);
    console.log('\n💡 Make a POST request with:');
    console.log(`   {`);
    console.log(`     "email": "${adminEmail}",`);
    console.log(`     "password": "${adminPassword}"`);
    console.log(`   }`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDemoTenant();
