-- Migration: Add Route Types and Service-Aware Outings
--
-- Purpose:
-- 1. Differentiate between group services (auto-assigned members) and public services (request-based)
-- 2. Make outings service-aware (transport vs bus) for companies that operate both
-- 3. Support travel support companies with Section 22 licensed minibuses
--
-- Date: 2024-11-23

-- ====================================================================================
-- PART 1: ROUTE TYPES FOR BUS SERVICES
-- ====================================================================================

-- Add route_type to differentiate group vs public services
ALTER TABLE section22_bus_routes
ADD COLUMN IF NOT EXISTS route_type VARCHAR(50) DEFAULT 'public';

-- Add group details for group-type routes
ALTER TABLE section22_bus_routes
ADD COLUMN IF NOT EXISTS group_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS group_description TEXT,
ADD COLUMN IF NOT EXISTS group_auto_assign BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN section22_bus_routes.route_type IS
  'Type of service: group (auto-assigned members) or public (request-based)';
COMMENT ON COLUMN section22_bus_routes.group_name IS
  'For group routes: name of the community group this service is for';
COMMENT ON COLUMN section22_bus_routes.group_description IS
  'For group routes: description of the group arrangement';
COMMENT ON COLUMN section22_bus_routes.group_auto_assign IS
  'For group routes: automatically assign group members to services (they can opt out)';

-- Index for efficient filtering by route type
CREATE INDEX IF NOT EXISTS idx_section22_routes_type
  ON section22_bus_routes(tenant_id, route_type);

-- ====================================================================================
-- PART 2: SERVICE-AWARE OUTINGS
-- ====================================================================================

-- Add service type to outings
ALTER TABLE tenant_social_outings
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'transport';

-- Add Section 22 requirement flag for outings
ALTER TABLE tenant_social_outings
ADD COLUMN IF NOT EXISTS requires_section_22 BOOLEAN DEFAULT false;

-- Add vehicle type requirement
ALTER TABLE tenant_social_outings
ADD COLUMN IF NOT EXISTS vehicle_type_required VARCHAR(50);

-- Add comments
COMMENT ON COLUMN tenant_social_outings.service_type IS
  'Which service this outing belongs to: transport or bus';
COMMENT ON COLUMN tenant_social_outings.requires_section_22 IS
  'Whether this outing requires a Section 22 licensed vehicle';
COMMENT ON COLUMN tenant_social_outings.vehicle_type_required IS
  'Specific vehicle type required: minibus, coach, car, etc.';

-- Index for service-aware outing queries
CREATE INDEX IF NOT EXISTS idx_outings_service_type
  ON tenant_social_outings(tenant_id, service_type);

-- ====================================================================================
-- PART 3: VEHICLE SECTION 22 ELIGIBILITY
-- ====================================================================================

-- Add Section 22 eligibility to vehicles
ALTER TABLE tenant_vehicles
ADD COLUMN IF NOT EXISTS eligible_for_section22 BOOLEAN DEFAULT false;

COMMENT ON COLUMN tenant_vehicles.eligible_for_section22 IS
  'Vehicle is licensed/suitable for Section 22 community bus operations';

-- Auto-set Section 22 eligibility for vehicles that already have Section 19 large bus eligibility
UPDATE tenant_vehicles
SET eligible_for_section22 = true
WHERE eligible_for_section19_large = true
  AND eligible_for_section22 IS NOT DISTINCT FROM false;

-- ====================================================================================
-- PART 4: GROUP MEMBERSHIP FOR ROUTES
-- ====================================================================================

-- Table to track which customers belong to which route groups
CREATE TABLE IF NOT EXISTS route_group_members (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    route_id INTEGER NOT NULL REFERENCES section22_bus_routes(route_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,

    -- Membership status
    is_active BOOLEAN DEFAULT true,
    joined_date DATE DEFAULT CURRENT_DATE,

    -- Opt-out tracking
    default_opt_in BOOLEAN DEFAULT true,  -- By default, include in services

    -- Notes
    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_route_group_member UNIQUE(route_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_route_group_members_route
  ON route_group_members(route_id, is_active);
CREATE INDEX IF NOT EXISTS idx_route_group_members_customer
  ON route_group_members(customer_id);

COMMENT ON TABLE route_group_members IS
  'Tracks which customers belong to which route groups for auto-assignment';
COMMENT ON COLUMN route_group_members.default_opt_in IS
  'If true, customer is auto-assigned to group services unless they opt out';

-- ====================================================================================
-- PART 5: SERVICE OPT-OUTS (for group members)
-- ====================================================================================

-- Table to track opt-outs for specific services
CREATE TABLE IF NOT EXISTS service_opt_outs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    timetable_id INTEGER NOT NULL REFERENCES section22_timetables(timetable_id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
    service_date DATE NOT NULL,

    -- Opt-out reason
    reason VARCHAR(50),  -- 'illness', 'holiday', 'appointment', 'other'
    reason_notes TEXT,

    -- Tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),

    CONSTRAINT unique_service_opt_out UNIQUE(timetable_id, customer_id, service_date)
);

CREATE INDEX IF NOT EXISTS idx_service_opt_outs_service
  ON service_opt_outs(timetable_id, service_date);
CREATE INDEX IF NOT EXISTS idx_service_opt_outs_customer
  ON service_opt_outs(customer_id);

COMMENT ON TABLE service_opt_outs IS
  'Tracks when group members opt out of specific services (illness, holiday, etc.)';

-- ====================================================================================
-- MIGRATION COMPLETE
-- ====================================================================================

-- Summary:
-- ✓ Added route_type to section22_bus_routes (group | public)
-- ✓ Added group details columns (group_name, group_description, group_auto_assign)
-- ✓ Added service_type to tenant_social_outings (transport | bus)
-- ✓ Added requires_section_22 flag to outings
-- ✓ Added eligible_for_section22 to vehicles
-- ✓ Created route_group_members table for group membership
-- ✓ Created service_opt_outs table for opt-out tracking
