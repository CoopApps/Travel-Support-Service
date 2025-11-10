/**
 * Setup Platform Admin and Create Tenants on Railway
 *
 * This script:
 * 1. Creates platform_admins table if needed
 * 2. Creates a platform admin account
 * 3. Creates tenant(s) like Sheffield Community Transport
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Railway database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
  ssl: false,
});

async function setup() {
  const client = await pool.connect();

  try {
    console.log('🔌 Connected to Railway database');

    // 1. Create platform_admins table
    console.log('\n📋 Creating platform_admins table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        admin_id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);
    console.log('✅ platform_admins table ready');

    // 2. Create platform super admin
    console.log('\n👤 Creating platform super admin...');
    const adminPassword = 'PlatformAdmin2024!';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminResult = await client.query(`
      INSERT INTO platform_admins (username, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            updated_at = NOW()
      RETURNING admin_id, username, email, role
    `, ['admin', 'admin@commonwealth.co.uk', hashedPassword, 'super_admin']);

    console.log('✅ Platform Admin created:', adminResult.rows[0]);

    // 3. Create Sheffield Community Transport tenant
    console.log('\n🏢 Creating Sheffield Community Transport tenant...');
    const sheffieldResult = await client.query(`
      INSERT INTO tenants (
        company_name,
        subdomain,
        domain,
        contact_name,
        contact_email,
        contact_phone,
        address,
        is_active,
        organization_type,
        cooperative_model,
        app_id,
        base_price,
        currency,
        billing_cycle,
        created_at,
        updated_at
      ) VALUES (
        'Sheffield Community Transport',
        'sheffield',
        'sheffield.travel-supportbackend-production.up.railway.app',
        'Admin',
        'admin@sheffieldtransport.co.uk',
        '+44 114 123 4567',
        'Sheffield, UK',
        true,
        'transport',
        'multi-stakeholder',
        1,
        99.00,
        'GBP',
        'monthly',
        NOW(),
        NOW()
      )
      ON CONFLICT (subdomain) DO UPDATE
        SET company_name = EXCLUDED.company_name,
            domain = EXCLUDED.domain,
            updated_at = NOW()
      RETURNING tenant_id, company_name, subdomain
    `);

    const sheffieldTenant = sheffieldResult.rows[0];
    console.log('✅ Sheffield tenant created:', sheffieldTenant);

    // 4. Create Sheffield tenant admin user
    console.log('\n👤 Creating Sheffield admin user...');
    const sheffieldAdminPassword = 'Sheffield2024!';
    const sheffieldHashedPassword = await bcrypt.hash(sheffieldAdminPassword, 10);

    const sheffieldUserResult = await client.query(`
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
        'Sheffield Administrator',
        'admin@sheffieldtransport.co.uk',
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
    `, [sheffieldTenant.tenant_id, sheffieldHashedPassword]);

    console.log('✅ Sheffield admin user created:', sheffieldUserResult.rows[0]);

    console.log('\n🎉 Setup complete!');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🏛️  PLATFORM ADMIN (Commonwealth Management)');
    console.log('   URL: https://travel-supportbackend-production.up.railway.app/platform-admin');
    console.log('   Username: admin');
    console.log('   Password: PlatformAdmin2024!');
    console.log('   Role: super_admin\n');

    console.log('🏢 SHEFFIELD COMMUNITY TRANSPORT (Tenant Admin)');
    console.log('   URL: https://travel-supportbackend-production.up.railway.app/');
    console.log('   Username: admin');
    console.log('   Password: Sheffield2024!');
    console.log('   Role: admin (tenant)\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT: Change these passwords after first login!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(console.error);
