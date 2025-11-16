-- Add archived column to tenant_training_records table
-- This column is needed for soft-delete functionality in the training module

ALTER TABLE tenant_training_records
ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance on archived column
CREATE INDEX IF NOT EXISTS idx_tenant_training_records_archived
ON tenant_training_records(tenant_id, archived);

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tenant_training_records'
AND column_name = 'archived';
