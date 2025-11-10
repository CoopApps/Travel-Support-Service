/**
 * Setup Railway Tenant - Create tenant and admin user in Railway database
 *
 * Run this script to create your first tenant and admin user in Railway.
 */

const { Pool } = require('pg');

// Railway database connection from variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@postgres.railway.internal:5432/railway',
  ssl: false, // No SSL needed for internal Railway connection
});

async function setupTenant() {
  const client = await pool.connect();

  try {
    console.log('🔌 Connected to Railway database');

    // 1. Create tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (
        company_name,
        subdomain,
        domain,
        is_active,
        app_id,
        organization_type,
        created_at,
        updated_at
      ) VALUES (
        'Demo Transport Company',
        'travel-supportbackend-production',
        'travel-supportbackend-production.up.railway.app',
        true,
        1,
        'transport',
        NOW(),
        NOW()
      )
      ON CONFLICT (subdomain) DO UPDATE
        SET company_name = EXCLUDED.company_name,
            domain = EXCLUDED.domain,
            updated_at = NOW()
      RETURNING tenant_id, company_name, subdomain
    `);

    const tenant = tenantResult.rows[0];
    console.log('✅ Tenant created/updated:', tenant);

    // 2. Create admin user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    const userResult = await client.query(`
      INSERT INTO tenant_users (
        tenant_id,
        username,
        full_name,
        email,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        $1,
        'admin',
        'System Administrator',
        'admin@demo.com',
        $2,
        'admin',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, username) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            updated_at = NOW()
      RETURNING user_id, username, email, role
    `, [tenant.tenant_id, hashedPassword]);

    const user = userResult.rows[0];
    console.log('✅ Admin user created/updated:', user);

    console.log('\n🎉 Setup complete!');
    console.log('\n📋 Login credentials:');
    console.log('   URL: https://travel-supportbackend-production.up.railway.app');
    console.log('   Username: admin');
    console.log('   Password: Admin123!');
    console.log('\n✨ You can now log in to your application!');

  } catch (error) {
    console.error('❌ Error setting up tenant:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupTenant().catch(console.error);
