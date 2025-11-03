/**
 * Database Initialization Script
 * Creates essential tables for the Travel Support System
 */

require('dotenv').config();
const { Client } = require('pg');

async function initializeDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create tenants table
    console.log('Creating tenants table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        subscription_tier VARCHAR(50) DEFAULT 'basic',
        subscription_status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settings JSONB DEFAULT '{}'::jsonb
      );
    `);
    console.log('✅ Tenants table created');

    // Create users table
    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, email)
      );
    `);
    console.log('✅ Users table created');

    // Create customers table
    console.log('Creating customers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        postcode VARCHAR(20),
        date_of_birth DATE,
        notes TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Customers table created');

    // Create drivers table
    console.log('Creating drivers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        license_number VARCHAR(100),
        license_expiry DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Drivers table created');

    // Create vehicles table
    console.log('Creating vehicles table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        registration VARCHAR(20) UNIQUE NOT NULL,
        make VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        capacity INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Vehicles table created');

    // Create schedules table
    console.log('Creating schedules table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
        vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
        pickup_address TEXT,
        pickup_postcode VARCHAR(20),
        destination_address TEXT,
        destination_postcode VARCHAR(20),
        scheduled_date DATE NOT NULL,
        scheduled_time TIME,
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Schedules table created');

    // Create indexes for performance
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON drivers(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_tenant_id ON schedules(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(scheduled_date);
    `);
    console.log('✅ Indexes created');

    console.log('\n🎉 Database initialization completed successfully!\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run initialization
initializeDatabase();
