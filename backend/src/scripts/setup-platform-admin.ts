/**
 * Platform Admin Setup Script
 *
 * Creates the necessary tables for platform admin functionality:
 * - tenants table (with enhanced fields)
 * - platform_admins table
 */

import { Client } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupPlatformAdmin() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create platform_admins table
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
    console.log('✅ platform_admins table created');

    // Drop and recreate tenants table to ensure all columns exist
    console.log('\n📋 Dropping existing tenants table if any...');
    await client.query(`DROP TABLE IF EXISTS tenants CASCADE;`);

    console.log('📋 Creating tenants table...');
    await client.query(`
      CREATE TABLE tenants (
        tenant_id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255) UNIQUE,
        subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'professional', 'enterprise')),
        is_active BOOLEAN DEFAULT true,

        -- Contact information
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,

        -- Limits
        max_users INTEGER DEFAULT 5,
        max_customers INTEGER DEFAULT 100,

        -- Features (JSONB)
        features JSONB DEFAULT '{}',

        -- Theme customization (JSONB)
        theme JSONB DEFAULT '{}',

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT unique_subdomain CHECK (subdomain ~ '^[a-z0-9-]+$')
      );
    `);
    console.log('✅ tenants table created');

    // Create index on subdomain for fast lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
    `);
    console.log('✅ Index created on tenants.subdomain');

    // Create default super admin if it doesn't exist
    console.log('\n👤 Creating default super admin...');
    const defaultPassword = 'admin123';  // Should be changed after first login
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const existingAdmin = await client.query(
      'SELECT admin_id FROM platform_admins WHERE username = $1',
      ['admin']
    );

    if (existingAdmin.rows.length === 0) {
      await client.query(
        `INSERT INTO platform_admins (username, email, password_hash, role)
         VALUES ($1, $2, $3, $4)`,
        ['admin', 'admin@travelapp.local', hashedPassword, 'super_admin']
      );
      console.log('✅ Default super admin created');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!');
    } else {
      console.log('ℹ️  Super admin already exists, skipping');
    }

    // Create demo tenant if it doesn't exist
    console.log('\n🏢 Creating demo tenant...');
    const existingTenant = await client.query(
      'SELECT tenant_id FROM tenants WHERE subdomain = $1',
      ['demo']
    );

    if (existingTenant.rows.length === 0) {
      await client.query(
        `INSERT INTO tenants (
          company_name, subdomain, subscription_tier, contact_email,
          max_users, max_customers, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)`,
        ['Demo Transport Company', 'demo', 'professional', 'demo@travelapp.local', 10, 500]
      );
      console.log('✅ Demo tenant created (subdomain: demo)');
    } else {
      console.log('ℹ️  Demo tenant already exists, skipping');
    }

    console.log('\n✅ Platform admin setup complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Login to platform admin at: http://localhost:5173/platform-admin');
    console.log('2. Change the default admin password');
    console.log('3. Create your tenants');
    console.log('4. Each tenant will be accessible at: http://{subdomain}.localhost:5173');

  } catch (error) {
    console.error('❌ Error setting up platform admin:', error);
    throw error;
  } finally {
    await client.end();
    console.log('\n📤 Database connection closed');
  }
}

// Run the setup
setupPlatformAdmin()
  .then(() => {
    console.log('\n🎉 Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });
