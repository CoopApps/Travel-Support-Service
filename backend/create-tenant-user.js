/**
 * Create tenant_users table and admin user
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createTenantUser() {
  const client = new Client({
    connectionString: 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🏗️  Creating tenant_users table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_users (
        user_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        full_name VARCHAR(255),
        phone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, username)
      );

      CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_users_username ON tenant_users(username);
    `);

    console.log('✅ tenant_users table created\n');

    // Create admin user
    const tenantId = 1;
    const username = 'admin';
    const email = 'admin@demo.com';
    const password = 'Admin123!';
    const fullName = 'Demo Admin';

    console.log('👤 Creating admin user...');

    // Check if user exists
    const existing = await client.query(
      'SELECT user_id FROM tenant_users WHERE tenant_id = $1 AND username = $2',
      [tenantId, username]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠️  User '${username}' already exists`);
    } else {
      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(
        `INSERT INTO tenant_users (tenant_id, username, email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tenantId, username, email, passwordHash, fullName, 'admin', true]
      );

      console.log(`✅ Admin user created\n`);
    }

    console.log('='.repeat(60));
    console.log('🎉 SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Login credentials:\n');
    console.log(`   Tenant ID: ${tenantId}`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n🌐 Login with:');
    console.log(`   POST https://travel-supportbackend-production.up.railway.app/api/tenants/${tenantId}/login`);
    console.log(`   Body: { "username": "${username}", "password": "${password}" }`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTenantUser();
