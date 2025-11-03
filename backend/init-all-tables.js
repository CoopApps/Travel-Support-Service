/**
 * Comprehensive Database Initialization Script
 * Runs all SQL migrations to create the complete database schema
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration(client, filePath, name) {
  try {
    console.log(`\n📄 Running migration: ${name}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    console.log(`✅ ${name} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} failed:`, error.message);
    return false;
  }
}

async function initializeDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('=' .repeat(60));
    console.log('🚀 Starting comprehensive database initialization');
    console.log('=' .repeat(60));

    // STEP 1: Create core tables
    console.log('\n📦 STEP 1: Creating core tables...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        tenant_id SERIAL PRIMARY KEY,
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
        settings JSONB DEFAULT '{}'::jsonb,
        organization_type VARCHAR(50) DEFAULT 'private_company'
      );

      CREATE TABLE IF NOT EXISTS users (
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

      CREATE TABLE IF NOT EXISTS tenant_customers (
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

      CREATE TABLE IF NOT EXISTS tenant_drivers (
        driver_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        license_number VARCHAR(100),
        license_expiry DATE,
        is_active BOOLEAN DEFAULT true,
        employment_type VARCHAR(50) DEFAULT 'employee',
        hourly_rate DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tenant_vehicles (
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

      CREATE TABLE IF NOT EXISTS tenant_schedules (
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

      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON tenant_customers(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON tenant_drivers(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON tenant_vehicles(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_tenant_id ON tenant_schedules(tenant_id);
    `);
    console.log('✅ Core tables created');

    // STEP 2: Run SQL migrations from files
    console.log('\n📦 STEP 2: Running SQL migrations...');

    const migrations = [
      { file: 'database/migrations/create-payroll-tables.sql', name: 'Payroll Tables' },
      { file: 'database/migrations/create-admin-module-tables.sql', name: 'Admin Module Tables' },
      { file: 'migrations/create-safeguarding-tables.sql', name: 'Safeguarding Tables' },
      { file: 'migrations/create-messaging-tables.sql', name: 'Messaging Tables' },
      { file: 'migrations/create-invoice-tables.sql', name: 'Invoice Tables' },
      { file: 'migrations/create-invoice-reminder-tables.sql', name: 'Invoice Reminders' },
      { file: 'migrations/create-feedback-table.sql', name: 'Feedback Table' },
      { file: 'migrations/create-vehicle-incidents-table.sql', name: 'Vehicle Incidents' },
      { file: 'migrations/create-driver-hours-fuel-tables.sql', name: 'Driver Hours & Fuel' },
    ];

    for (const migration of migrations) {
      const filePath = path.join(__dirname, migration.file);
      if (fs.existsSync(filePath)) {
        await runMigration(client, filePath, migration.name);
      } else {
        console.log(`⚠️  Skipping ${migration.name} - file not found`);
      }
    }

    // STEP 3: Create additional essential tables
    console.log('\n📦 STEP 3: Creating additional essential tables...');

    await client.query(`
      -- Holidays/Permits
      CREATE TABLE IF NOT EXISTS tenant_holidays (
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

      CREATE TABLE IF NOT EXISTS tenant_permits (
        permit_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        driver_id INTEGER REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,
        permit_type VARCHAR(100) NOT NULL,
        permit_number VARCHAR(100),
        issue_date DATE,
        expiry_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Training
      CREATE TABLE IF NOT EXISTS tenant_training_types (
        training_type_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        validity_period_months INTEGER,
        is_mandatory BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tenant_training_records (
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

      -- Maintenance
      CREATE TABLE IF NOT EXISTS tenant_maintenance (
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

      -- Social Outings
      CREATE TABLE IF NOT EXISTS tenant_social_outings (
        outing_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        outing_date DATE NOT NULL,
        location VARCHAR(255),
        max_capacity INTEGER,
        status VARCHAR(50) DEFAULT 'planned',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Providers
      CREATE TABLE IF NOT EXISTS tenant_providers (
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

      -- Fuel Cards
      CREATE TABLE IF NOT EXISTS tenant_fuel_cards (
        fuel_card_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        card_number VARCHAR(50) NOT NULL,
        provider VARCHAR(100),
        assigned_to_driver_id INTEGER REFERENCES tenant_drivers(driver_id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tenant_fuel_transactions (
        transaction_id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        fuel_card_id INTEGER REFERENCES tenant_fuel_cards(fuel_card_id) ON DELETE CASCADE,
        transaction_date TIMESTAMP NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        litres DECIMAL(10, 2),
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Additional tables created');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATABASE INITIALIZATION COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n✅ Your database is ready with ALL tables!');

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run initialization
initializeDatabase();
