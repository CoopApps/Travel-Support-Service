-- Migration: Add first_name and last_name columns to tenant_drivers
-- Run this against your production database

-- Add columns if they don't exist
ALTER TABLE tenant_drivers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE tenant_drivers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Optionally populate from existing name field (splits on first space)
UPDATE tenant_drivers
SET
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE
    WHEN POSITION(' ' IN name) > 0 THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Create index for searching
CREATE INDEX IF NOT EXISTS idx_drivers_first_name ON tenant_drivers(tenant_id, first_name);
CREATE INDEX IF NOT EXISTS idx_drivers_last_name ON tenant_drivers(tenant_id, last_name);
