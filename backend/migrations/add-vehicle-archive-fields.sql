-- Add archive fields to tenant_vehicles table
-- Allows archiving vehicles separately from soft delete
-- Date: November 11, 2025

BEGIN;

-- Add archive fields
ALTER TABLE tenant_vehicles
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by INTEGER,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Add index for filtering archived vehicles
CREATE INDEX IF NOT EXISTS idx_tenant_vehicles_archived
  ON tenant_vehicles(tenant_id, archived);

-- Set all existing vehicles as not archived
UPDATE tenant_vehicles
SET archived = FALSE
WHERE archived IS NULL;

COMMIT;

-- Verification query
SELECT
  COUNT(*) as total_vehicles,
  COUNT(*) FILTER (WHERE archived = false) as not_archived,
  COUNT(*) FILTER (WHERE archived = true) as archived,
  COUNT(*) FILTER (WHERE is_active = true AND archived = false) as active_not_archived
FROM tenant_vehicles;
