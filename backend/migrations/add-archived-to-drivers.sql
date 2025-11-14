-- Migration: Add archived column to tenant_drivers table
-- Date: 2025-01-14
-- Purpose: Add archived status to drivers for consistency with customer module

-- Add archived column with default false (not archived)
ALTER TABLE tenant_drivers ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tenant_drivers_archived ON tenant_drivers(tenant_id, archived) WHERE is_active = true;

-- Comment explaining the two-field system
COMMENT ON COLUMN tenant_drivers.archived IS 'Archive status: true = temporarily inactive (can be reactivated), false = active. Separate from is_active which indicates soft delete.';
