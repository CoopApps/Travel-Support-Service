/**
 * Reset and Initialize Database
 * Drops all existing objects and creates fresh schema
 */

const { Client } = require('pg');

async function resetAndInitialize() {
  const client = new Client({
    connectionString: 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🧹 Step 1: Cleaning up existing objects...');
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('✅ Database cleaned\n');

    console.log('🏗️  Step 2: Creating all tables...\n');

    // Create tables in correct dependency order
    await client.query(`
      -- 1. TENANTS (no dependencies)
      CREATE TABLE tenants (
        tenant_id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        subdomain VARCHAR(100) UNIQUE NOT NULL,
        domain VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(50),
        address TEXT,
        subscription_tier VARCHAR(50) DEFAULT 'basic',
        subscription_status VARCHAR(50) DEFAULT 'active',
        organization_type VARCHAR(50) DEFAULT 'private_company',
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);

      -- 2. USERS
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
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
      CREATE INDEX idx_users_tenant_id ON users(tenant_id);
      CREATE INDEX idx_users_email ON users(email);

      -- 3. CUSTOMERS
      CREATE TABLE tenant_customers (
        customer_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
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
      CREATE INDEX idx_customers_tenant_id ON tenant_customers(tenant_id);

      -- 4. DRIVERS
      CREATE TABLE tenant_drivers (
        driver_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        license_number VARCHAR(100),
        license_expiry DATE,
        employment_type VARCHAR(50) DEFAULT 'employee',
        hourly_rate DECIMAL(10, 2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_drivers_tenant_id ON tenant_drivers(tenant_id);

      -- 5. VEHICLES
      CREATE TABLE tenant_vehicles (
        vehicle_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        registration VARCHAR(20) NOT NULL,
        make VARCHAR(100),
        model VARCHAR(100),
        year INTEGER,
        capacity INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, registration)
      );
      CREATE INDEX idx_vehicles_tenant_id ON tenant_vehicles(tenant_id);

      -- 6. SCHEDULES
      CREATE TABLE tenant_schedules (
        schedule_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        customer_id INTEGER REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES tenant_drivers(driver_id) ON DELETE SET NULL,
        vehicle_id INTEGER REFERENCES tenant_vehicles(vehicle_id) ON DELETE SET NULL,
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
      CREATE INDEX idx_schedules_tenant_id ON tenant_schedules(tenant_id);
      CREATE INDEX idx_schedules_date ON tenant_schedules(scheduled_date);

      -- 7. ADDITIONAL TABLES
      CREATE TABLE tenant_holidays (
        holiday_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        type VARCHAR(50) DEFAULT 'annual_leave',
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tenant_training_types (
        training_type_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        validity_period_months INTEGER,
        is_mandatory BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tenant_training_records (
        training_record_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,
        training_type_id INTEGER REFERENCES tenant_training_types(training_type_id) ON DELETE CASCADE,
        completion_date DATE NOT NULL,
        expiry_date DATE,
        status VARCHAR(50) DEFAULT 'valid',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tenant_maintenance (
        maintenance_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        vehicle_id INTEGER REFERENCES tenant_vehicles(vehicle_id) ON DELETE CASCADE,
        maintenance_date DATE NOT NULL,
        maintenance_type VARCHAR(100),
        description TEXT,
        cost DECIMAL(10, 2),
        next_service_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tenant_providers (
        provider_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100),
        contact_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE tenant_fuel_cards (
        fuel_card_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        card_number VARCHAR(50) NOT NULL,
        provider VARCHAR(100),
        assigned_to_driver_id INTEGER REFERENCES tenant_drivers(driver_id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Core tables created successfully!\n');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`✅ Verified ${result.rows.length} tables created:\n`);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE RESET AND INITIALIZATION COMPLETED!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetAndInitialize();
