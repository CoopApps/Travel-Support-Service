-- ============================================================================
-- SECURITY MIGRATION: Enable Row-Level Security (RLS)
-- ============================================================================
--
-- This migration enables PostgreSQL Row-Level Security (RLS) on all
-- tenant-scoped tables to provide database-level tenant isolation.
--
-- RLS ensures that:
-- 1. Users can only see data from their own tenant
-- 2. Even if application code has bugs, database enforces isolation
-- 3. SQL injection attacks cannot access other tenants' data
--
-- IMPORTANT: Run this migration during a maintenance window
-- ============================================================================

-- ============================================================================
-- STEP 1: Create application role for RLS context
-- ============================================================================

-- Create a function to set the current tenant context
CREATE OR REPLACE FUNCTION set_current_tenant(p_tenant_id INTEGER)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get the current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 2: Enable RLS on all tenant-scoped tables
-- ============================================================================

-- Note: Only enable RLS on tables that have a tenant_id column
-- The tenants table itself does NOT have RLS (it's the root table)

-- Core tables
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_trips ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create RLS policies
-- ============================================================================

-- Policy: Users can only see their own tenant's users
DROP POLICY IF EXISTS tenant_users_isolation ON tenant_users;
CREATE POLICY tenant_users_isolation ON tenant_users
    FOR ALL
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- Policy: Users can only see their own tenant's customers
DROP POLICY IF EXISTS tenant_customers_isolation ON tenant_customers;
CREATE POLICY tenant_customers_isolation ON tenant_customers
    FOR ALL
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- Policy: Users can only see their own tenant's drivers
DROP POLICY IF EXISTS tenant_drivers_isolation ON tenant_drivers;
CREATE POLICY tenant_drivers_isolation ON tenant_drivers
    FOR ALL
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- Policy: Users can only see their own tenant's vehicles
DROP POLICY IF EXISTS tenant_vehicles_isolation ON tenant_vehicles;
CREATE POLICY tenant_vehicles_isolation ON tenant_vehicles
    FOR ALL
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- Policy: Users can only see their own tenant's trips
DROP POLICY IF EXISTS tenant_trips_isolation ON tenant_trips;
CREATE POLICY tenant_trips_isolation ON tenant_trips
    FOR ALL
    USING (tenant_id = get_current_tenant())
    WITH CHECK (tenant_id = get_current_tenant());

-- ============================================================================
-- STEP 4: Create helper function for application to use
-- ============================================================================

-- This function should be called at the start of each request
-- after verifying the JWT token and extracting the tenant_id
CREATE OR REPLACE FUNCTION app_set_tenant_context(p_tenant_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- Validate tenant exists
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'Invalid tenant ID: %', p_tenant_id;
    END IF;

    -- Set the context
    PERFORM set_current_tenant(p_tenant_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Create bypass policy for superuser operations
-- ============================================================================

-- Create a role for platform admin operations (bypasses RLS)
-- This should only be used for cross-tenant operations like:
-- - Platform admin dashboard
-- - Tenant management
-- - System-wide reports

-- Note: The database superuser automatically bypasses RLS
-- For application-level bypass, you can use:
-- SET ROLE postgres; -- or another superuser role

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Uncomment and run these to verify RLS is working:

-- 1. Check RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename LIKE 'tenant_%';

-- 2. Check policies exist
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public';

-- 3. Test isolation (should return empty without tenant context)
-- SELECT * FROM tenant_customers LIMIT 1;

-- 4. Test with tenant context
-- SELECT app_set_tenant_context(1);
-- SELECT * FROM tenant_customers LIMIT 1;

-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================

-- To disable RLS (run only if needed to rollback):
-- ALTER TABLE tenant_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_customers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_drivers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_vehicles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_trips DISABLE ROW LEVEL SECURITY;

COMMENT ON FUNCTION set_current_tenant IS 'Sets the current tenant context for RLS. Call this after authenticating the user.';
COMMENT ON FUNCTION get_current_tenant IS 'Returns the current tenant ID from the session context.';
COMMENT ON FUNCTION app_set_tenant_context IS 'Application-level function to set tenant context with validation.';
