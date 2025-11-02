-- Performance Indexes for Multi-Tenant Travel Support System (Safe Version)
-- Created: 2025-11-01
-- Purpose: Optimize query performance for tenant-scoped operations
-- NOTE: Only includes indexes for tables/columns that currently exist

-- ==============================================================================
-- CORE TENANT-SCOPED INDEXES
-- ==============================================================================

-- Users table
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_active
  ON tenant_users(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_users_username
  ON tenant_users(tenant_id, username);

CREATE INDEX IF NOT EXISTS idx_tenant_users_email
  ON tenant_users(tenant_id, email);

-- Customers table
CREATE INDEX IF NOT EXISTS idx_tenant_customers_tenant_active
  ON tenant_customers(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_customers_name
  ON tenant_customers(tenant_id, name);

CREATE INDEX IF NOT EXISTS idx_tenant_customers_email
  ON tenant_customers(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_tenant_customers_phone
  ON tenant_customers(tenant_id, phone);

-- Drivers table
CREATE INDEX IF NOT EXISTS idx_tenant_drivers_tenant_active
  ON tenant_drivers(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_drivers_user_id
  ON tenant_drivers(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_drivers_license
  ON tenant_drivers(tenant_id, license_number);

-- Vehicles table
CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_tenant_active
  ON tenant_vehicles(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_registration
  ON tenant_vehicles(tenant_id, registration);

CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_type
  ON tenant_vehicles(tenant_id, vehicle_type);

-- ==============================================================================
-- TRIP/SCHEDULE INDEXES
-- ==============================================================================

-- Trips table - composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tenant_trips_tenant_date
  ON tenant_trips(tenant_id, trip_date);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_tenant_status
  ON tenant_trips(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_tenant_customer
  ON tenant_trips(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_tenant_driver
  ON tenant_trips(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_tenant_vehicle
  ON tenant_trips(tenant_id, vehicle_id);

-- Composite index for driver schedule queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_tenant_trips_driver_date
  ON tenant_trips(tenant_id, driver_id, trip_date)
  WHERE status != 'cancelled';

-- Composite index for customer trip history
CREATE INDEX IF NOT EXISTS idx_tenant_trips_customer_date
  ON tenant_trips(tenant_id, customer_id, trip_date DESC);

-- ==============================================================================
-- FOREIGN KEY INDEXES
-- ==============================================================================

-- Trip foreign keys
CREATE INDEX IF NOT EXISTS idx_trips_customer_fk
  ON tenant_trips(customer_id);

CREATE INDEX IF NOT EXISTS idx_trips_driver_fk
  ON tenant_trips(driver_id);

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_fk
  ON tenant_trips(vehicle_id);

-- Customer user relationship
CREATE INDEX IF NOT EXISTS idx_customers_user_fk
  ON tenant_customers(user_id);

-- Driver user relationship
CREATE INDEX IF NOT EXISTS idx_drivers_user_fk
  ON tenant_drivers(user_id);

-- ==============================================================================
-- INVOICE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_tenant_status
  ON tenant_invoices(tenant_id, invoice_status);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_tenant_date
  ON tenant_invoices(tenant_id, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_customer
  ON tenant_invoices(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_due_date
  ON tenant_invoices(tenant_id, due_date)
  WHERE invoice_status = 'pending';

-- ==============================================================================
-- PERMITS INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_permits_tenant_status
  ON tenant_permits(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_permits_expiry
  ON tenant_permits(tenant_id, expiry_date);

CREATE INDEX IF NOT EXISTS idx_tenant_permits_type
  ON tenant_permits(tenant_id, permit_type);

-- ==============================================================================
-- HOLIDAYS INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_holidays_tenant_date
  ON tenant_holidays(tenant_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_tenant_holidays_driver
  ON tenant_holidays(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_holidays_status
  ON tenant_holidays(tenant_id, status);

-- ==============================================================================
-- MESSAGING INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_messages_tenant_created
  ON tenant_messages(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_messages_customer
  ON tenant_messages(tenant_id, target_customer_id);

CREATE INDEX IF NOT EXISTS idx_tenant_messages_priority
  ON tenant_messages(tenant_id, priority);

-- ==============================================================================
-- SOCIAL OUTINGS INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_social_outings_date
  ON tenant_social_outings(tenant_id, outing_date);

CREATE INDEX IF NOT EXISTS idx_tenant_social_outings_status
  ON tenant_social_outings(tenant_id, status);

-- ==============================================================================
-- COST CENTER INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_cost_centers_tenant_active
  ON tenant_cost_centers(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_cost_centers_category
  ON tenant_cost_centers(tenant_id, category);

-- ==============================================================================
-- OFFICE STAFF INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_office_staff_tenant_active
  ON tenant_office_staff(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_office_staff_email
  ON tenant_office_staff(tenant_id, email);

-- ==============================================================================
-- FUEL CARD INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_fuelcards_tenant_active
  ON tenant_fuelcards(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_fuelcards_driver
  ON tenant_fuelcards(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_fuelcards_card_number
  ON tenant_fuelcards(tenant_id, card_number_last_four);

-- ==============================================================================
-- PROVIDER INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_providers_tenant_active
  ON tenant_providers(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_providers_type
  ON tenant_providers(tenant_id, type);

-- ==============================================================================
-- TENANT SETTINGS INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_settings_key
  ON tenant_settings(tenant_id);

-- ==============================================================================
-- ANALYZE TABLES
-- ==============================================================================

ANALYZE tenant_users;
ANALYZE tenant_customers;
ANALYZE tenant_drivers;
ANALYZE tenant_vehicles;
ANALYZE tenant_trips;
ANALYZE tenant_invoices;
ANALYZE tenant_permits;
ANALYZE tenant_holidays;
ANALYZE tenant_messages;
ANALYZE tenant_social_outings;
ANALYZE tenant_cost_centers;
ANALYZE tenant_office_staff;
ANALYZE tenant_fuelcards;
ANALYZE tenant_providers;
ANALYZE tenant_settings;
