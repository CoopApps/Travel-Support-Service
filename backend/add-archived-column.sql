-- Add archived column to tenant_customers and tenant_drivers tables
-- This column is required by the list queries but missing in production

-- Add archived column to tenant_customers with DEFAULT false
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add archived column to tenant_drivers with DEFAULT false
ALTER TABLE tenant_drivers
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Verify the columns were added
SELECT 'tenant_customers archived column added' as status;
SELECT 'tenant_drivers archived column added' as status;
