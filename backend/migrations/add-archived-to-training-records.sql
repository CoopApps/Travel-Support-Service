-- Migration: Add archived column to tenant_training_records table
-- Date: 2025-01-14
-- Purpose: Add archived status to training records for consistency with other modules

-- Add archived column with default false (not archived)
ALTER TABLE tenant_training_records ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tenant_training_records_archived ON tenant_training_records(tenant_id, archived);

-- Comment explaining the field
COMMENT ON COLUMN tenant_training_records.archived IS 'Archive status: true = hidden/archived, false = active. Separate from soft delete.';
