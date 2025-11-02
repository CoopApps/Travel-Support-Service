-- Performance Indexes for Multi-Tenant Travel Support System
-- Created: 2025-11-01
-- Purpose: Optimize query performance for tenant-scoped operations

-- ==============================================================================
-- TENANT-SCOPED INDEXES
-- ==============================================================================
-- These indexes optimize the most common query pattern: filtering by tenant_id

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
-- Optimize trip queries by date, status, and assignments

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
-- Improve JOIN performance and referential integrity checks

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
-- FINANCIAL/BILLING INDEXES
-- ==============================================================================

-- Invoices
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_tenant_status
  ON tenant_invoices(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_tenant_date
  ON tenant_invoices(tenant_id, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_customer
  ON tenant_invoices(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_due_date
  ON tenant_invoices(tenant_id, due_date)
  WHERE status = 'pending';

-- Payroll
CREATE INDEX IF NOT EXISTS idx_tenant_payroll_tenant_period
  ON tenant_payroll(tenant_id, pay_period_start, pay_period_end);

CREATE INDEX IF NOT EXISTS idx_tenant_payroll_driver
  ON tenant_payroll(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_payroll_status
  ON tenant_payroll(tenant_id, status);

-- ==============================================================================
-- MAINTENANCE & COMPLIANCE INDEXES
-- ==============================================================================

-- Vehicle Maintenance
CREATE INDEX IF NOT EXISTS idx_tenant_maintenance_tenant_vehicle
  ON tenant_maintenance(tenant_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_tenant_maintenance_date
  ON tenant_maintenance(tenant_id, maintenance_date DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_maintenance_due
  ON tenant_maintenance(tenant_id, next_due_date)
  WHERE status = 'scheduled';

-- Driver Training
CREATE INDEX IF NOT EXISTS idx_tenant_training_driver
  ON tenant_driver_training(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_training_expiry
  ON tenant_driver_training(tenant_id, expiry_date)
  WHERE expiry_date IS NOT NULL;

-- Permits
CREATE INDEX IF NOT EXISTS idx_tenant_permits_tenant_status
  ON tenant_permits(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_permits_expiry
  ON tenant_permits(tenant_id, expiry_date);

-- Holidays
CREATE INDEX IF NOT EXISTS idx_tenant_holidays_tenant_date
  ON tenant_holidays(tenant_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_tenant_holidays_driver
  ON tenant_holidays(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_holidays_status
  ON tenant_holidays(tenant_id, status);

-- Safeguarding
CREATE INDEX IF NOT EXISTS idx_tenant_safeguarding_customer
  ON tenant_safeguarding(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_tenant_safeguarding_date
  ON tenant_safeguarding(tenant_id, incident_date DESC);

-- ==============================================================================
-- MESSAGING & COMMUNICATION INDEXES
-- ==============================================================================

-- Messages
CREATE INDEX IF NOT EXISTS idx_tenant_messages_recipient
  ON tenant_messages(tenant_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_messages_sender
  ON tenant_messages(tenant_id, sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_messages_unread
  ON tenant_messages(tenant_id, recipient_id, is_read)
  WHERE is_read = false;

-- Driver Messages
CREATE INDEX IF NOT EXISTS idx_tenant_driver_messages_driver
  ON tenant_driver_messages(tenant_id, driver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_driver_messages_unread
  ON tenant_driver_messages(tenant_id, driver_id, is_read)
  WHERE is_read = false;

-- ==============================================================================
-- SOCIAL OUTINGS INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_social_outings_date
  ON tenant_social_outings(tenant_id, outing_date);

CREATE INDEX IF NOT EXISTS idx_tenant_social_outings_status
  ON tenant_social_outings(tenant_id, status);

-- ==============================================================================
-- COST CENTER & TIMESHEET INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_cost_centers_tenant_active
  ON tenant_cost_centers(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_timesheets_driver_date
  ON tenant_timesheets(tenant_id, driver_id, timesheet_date DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_timesheets_status
  ON tenant_timesheets(tenant_id, status);

-- ==============================================================================
-- OFFICE STAFF INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_office_staff_tenant_active
  ON tenant_office_staff(tenant_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_office_staff_user
  ON tenant_office_staff(tenant_id, user_id);

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
  ON tenant_providers(tenant_id, provider_type);

-- ==============================================================================
-- TENANT SETTINGS INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_settings_key
  ON tenant_settings(tenant_id, setting_key);

-- ==============================================================================
-- FEEDBACK INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_feedback_date
  ON tenant_feedback(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_feedback_status
  ON tenant_feedback(tenant_id, status);

-- ==============================================================================
-- ANALYZE TABLES
-- ==============================================================================
-- Update statistics for query planner after creating indexes

ANALYZE tenant_users;
ANALYZE tenant_customers;
ANALYZE tenant_drivers;
ANALYZE tenant_vehicles;
ANALYZE tenant_trips;
ANALYZE tenant_invoices;
ANALYZE tenant_payroll;
ANALYZE tenant_maintenance;
ANALYZE tenant_driver_training;
ANALYZE tenant_permits;
ANALYZE tenant_holidays;
ANALYZE tenant_safeguarding;
ANALYZE tenant_messages;
ANALYZE tenant_driver_messages;
ANALYZE tenant_social_outings;
ANALYZE tenant_cost_centers;
ANALYZE tenant_timesheets;
ANALYZE tenant_office_staff;
ANALYZE tenant_fuelcards;
ANALYZE tenant_providers;
ANALYZE tenant_settings;
ANALYZE tenant_feedback;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
-- Use these to verify indexes are being used:
--
-- EXPLAIN ANALYZE SELECT * FROM tenant_customers WHERE tenant_id = 2 AND is_active = true;
-- EXPLAIN ANALYZE SELECT * FROM tenant_trips WHERE tenant_id = 2 AND trip_date = '2025-01-15';
-- EXPLAIN ANALYZE SELECT * FROM tenant_messages WHERE tenant_id = 2 AND recipient_id = 5 AND is_read = false;
--
-- Look for "Index Scan" or "Bitmap Index Scan" in the output
-- Avoid "Seq Scan" for large tables
