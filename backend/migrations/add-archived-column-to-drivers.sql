-- Add archived column to tenant_drivers table
-- This column is used to soft-delete drivers instead of removing them

ALTER TABLE tenant_drivers
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN tenant_drivers.archived IS 'Soft delete flag - archived drivers are hidden from normal views';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tenant_drivers_archived ON tenant_drivers(tenant_id, archived);
