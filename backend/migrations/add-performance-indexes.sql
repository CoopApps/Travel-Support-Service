-- ============================================================================
-- PERFORMANCE MIGRATION: Add Database Indexes
-- ============================================================================
--
-- This migration adds indexes to improve query performance on frequently
-- accessed columns. These indexes are specifically designed for the common
-- query patterns in the application.
--
-- Run time: ~5-10 minutes depending on data size
-- Impact: May briefly lock tables during index creation
-- Recommendation: Run during low-traffic period
-- ============================================================================

-- ============================================================================
-- CORE TENANT TABLES - Most frequently queried
-- ============================================================================

-- tenant_users: Login queries, user lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_username_tenant
ON tenant_users(tenant_id, username);

CREATE INDEX IF NOT EXISTS idx_tenant_users_email_tenant
ON tenant_users(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_tenant_users_active
ON tenant_users(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_users_role
ON tenant_users(tenant_id, role);

-- tenant_customers: Customer lists, active customers, login-enabled
CREATE INDEX IF NOT EXISTS idx_tenant_customers_active
ON tenant_customers(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_customers_login_enabled
ON tenant_customers(tenant_id, is_login_enabled)
WHERE is_login_enabled = true;

CREATE INDEX IF NOT EXISTS idx_tenant_customers_name
ON tenant_customers(tenant_id, full_name);

CREATE INDEX IF NOT EXISTS idx_tenant_customers_archived
ON tenant_customers(tenant_id, is_archived)
WHERE is_archived = false;

-- tenant_drivers: Driver lists, active drivers, vehicle assignments
CREATE INDEX IF NOT EXISTS idx_tenant_drivers_active
ON tenant_drivers(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_drivers_vehicle
ON tenant_drivers(tenant_id, vehicle_id)
WHERE vehicle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_drivers_archived
ON tenant_drivers(tenant_id, is_archived)
WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_tenant_drivers_login_enabled
ON tenant_drivers(tenant_id, is_login_enabled)
WHERE is_login_enabled = true;

-- tenant_vehicles: Vehicle lists, active vehicles, wheelchair accessible
CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_active
ON tenant_vehicles(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_wheelchair
ON tenant_vehicles(tenant_id, wheelchair_accessible)
WHERE wheelchair_accessible = true;

CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_registration
ON tenant_vehicles(tenant_id, registration);

CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_archived
ON tenant_vehicles(tenant_id, is_archived)
WHERE is_archived = false;

-- ============================================================================
-- TRIPS - High volume, complex queries
-- ============================================================================

-- tenant_trips: Date queries, status queries, driver/customer lookups
CREATE INDEX IF NOT EXISTS idx_tenant_trips_date
ON tenant_trips(tenant_id, trip_date);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_date_status
ON tenant_trips(tenant_id, trip_date, status);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_driver_date
ON tenant_trips(tenant_id, driver_id, trip_date);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_customer_date
ON tenant_trips(tenant_id, customer_id, trip_date);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_vehicle_date
ON tenant_trips(tenant_id, vehicle_id, trip_date);

CREATE INDEX IF NOT EXISTS idx_tenant_trips_status
ON tenant_trips(tenant_id, status);

-- Composite for dashboard queries (today's trips)
CREATE INDEX IF NOT EXISTS idx_tenant_trips_today_dashboard
ON tenant_trips(tenant_id, trip_date, status, driver_id);

-- ============================================================================
-- INVOICES - Financial queries, status tracking
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_status
ON tenant_invoices(tenant_id, invoice_status);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_date
ON tenant_invoices(tenant_id, invoice_date);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_due_date
ON tenant_invoices(tenant_id, due_date);

CREATE INDEX IF NOT EXISTS idx_tenant_invoices_customer
ON tenant_invoices(tenant_id, customer_id);

-- Overdue invoices query
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_overdue
ON tenant_invoices(tenant_id, due_date, invoice_status)
WHERE invoice_status NOT IN ('paid', 'cancelled');

-- Invoice line items
CREATE INDEX IF NOT EXISTS idx_tenant_invoice_line_items_invoice
ON tenant_invoice_line_items(invoice_id);

-- ============================================================================
-- SCHEDULES & ASSIGNMENTS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_schedules_date
ON tenant_schedules(tenant_id, schedule_date);

CREATE INDEX IF NOT EXISTS idx_tenant_schedules_driver_date
ON tenant_schedules(tenant_id, driver_id, schedule_date);

CREATE INDEX IF NOT EXISTS idx_tenant_driver_assignments_driver
ON tenant_driver_assignments(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_driver_assignments_customer
ON tenant_driver_assignments(tenant_id, customer_id);

-- ============================================================================
-- MAINTENANCE & VEHICLE TRACKING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_vehicle_maintenance_vehicle
ON tenant_vehicle_maintenance(tenant_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_tenant_vehicle_maintenance_due
ON tenant_vehicle_maintenance(tenant_id, next_service_date);

CREATE INDEX IF NOT EXISTS idx_tenant_vehicle_incidents_vehicle
ON tenant_vehicle_incidents(tenant_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_tenant_vehicle_incidents_date
ON tenant_vehicle_incidents(tenant_id, incident_date);

-- ============================================================================
-- TRAINING & COMPLIANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_training_records_driver
ON tenant_training_records(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_training_records_expiry
ON tenant_training_records(tenant_id, expiry_date);

CREATE INDEX IF NOT EXISTS idx_tenant_driver_permits_driver
ON tenant_driver_permits(tenant_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_tenant_driver_permits_expiry
ON tenant_driver_permits(tenant_id, expiry_date);

-- ============================================================================
-- PAYROLL
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_payroll_periods_dates
ON tenant_payroll_periods(tenant_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_tenant_payroll_records_period
ON tenant_payroll_records(tenant_id, period_id);

CREATE INDEX IF NOT EXISTS idx_tenant_payroll_records_driver
ON tenant_payroll_records(tenant_id, driver_id);

-- ============================================================================
-- MESSAGES & COMMUNICATIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_messages_recipient
ON tenant_messages(tenant_id, recipient_type, recipient_id);

CREATE INDEX IF NOT EXISTS idx_tenant_messages_created
ON tenant_messages(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_driver_messages_driver
ON driver_messages(tenant_id, driver_id);

-- ============================================================================
-- AUDIT & LOGS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_user
ON tenant_audit_log(tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_created
ON tenant_audit_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_audit_log_action
ON tenant_audit_log(tenant_id, action);

-- ============================================================================
-- COOPERATIVE/SECTION 22 TABLES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_section22_bus_routes_active
ON section22_bus_routes(tenant_id, is_active);

CREATE INDEX IF NOT EXISTS idx_section22_bus_bookings_date
ON section22_bus_bookings(tenant_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_section22_bus_bookings_route
ON section22_bus_bookings(tenant_id, route_id);

-- ============================================================================
-- SETTINGS & CONFIGURATION (rarely change, frequently read)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tenant_settings_key
ON tenant_settings(tenant_id, setting_key);

-- ============================================================================
-- FULL TEXT SEARCH INDEXES (for search functionality)
-- ============================================================================

-- Customer search by name
CREATE INDEX IF NOT EXISTS idx_tenant_customers_name_trgm
ON tenant_customers USING gin (full_name gin_trgm_ops);

-- Driver search by name
CREATE INDEX IF NOT EXISTS idx_tenant_drivers_name_trgm
ON tenant_drivers USING gin (full_name gin_trgm_ops);

-- Note: The trigram indexes above require the pg_trgm extension
-- If not already enabled, run: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- ANALYZE TABLES (update statistics for query planner)
-- ============================================================================

ANALYZE tenant_users;
ANALYZE tenant_customers;
ANALYZE tenant_drivers;
ANALYZE tenant_vehicles;
ANALYZE tenant_trips;
ANALYZE tenant_invoices;
ANALYZE tenant_schedules;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- To verify indexes were created, run:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' AND indexname LIKE 'idx_tenant%'
-- ORDER BY tablename, indexname;

COMMENT ON INDEX idx_tenant_trips_today_dashboard IS 'Optimized for dashboard "today''s trips" queries';
COMMENT ON INDEX idx_tenant_invoices_overdue IS 'Optimized for finding overdue invoices';
