-- Add archive fields to tenant_customers table
-- Allows archiving customers separately from soft delete
-- Date: November 11, 2025

BEGIN;

-- Add archive fields
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_by INTEGER;

-- Add index for filtering archived customers
CREATE INDEX IF NOT EXISTS idx_tenant_customers_archived
  ON tenant_customers(tenant_id, archived);

-- Set all existing customers as not archived
UPDATE tenant_customers
SET archived = FALSE
WHERE archived IS NULL;

COMMIT;

-- Verification query
SELECT
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE archived = false) as not_archived,
  COUNT(*) FILTER (WHERE archived = true) as archived,
  COUNT(*) FILTER (WHERE is_active = true AND archived = false) as active_not_archived
FROM tenant_customers;
