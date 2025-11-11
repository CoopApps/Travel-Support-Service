-- Add reminder fields to tenant_customers table
-- Required for SMS/Email reminder system
-- Date: November 11, 2025

BEGIN;

-- Add columns for reminder preferences
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR(20) DEFAULT 'sms';

-- Add constraint to ensure valid reminder preference values
ALTER TABLE tenant_customers
DROP CONSTRAINT IF EXISTS check_reminder_preference;

ALTER TABLE tenant_customers
ADD CONSTRAINT check_reminder_preference
  CHECK (reminder_preference IN ('sms', 'email', 'both', 'none'));

-- Add index for reminder queries (only index opted-in customers for efficiency)
CREATE INDEX IF NOT EXISTS idx_tenant_customers_reminder
  ON tenant_customers(tenant_id, reminder_opt_in)
  WHERE reminder_opt_in = true;

-- Set default values for existing customers (all opted in by default with SMS)
UPDATE tenant_customers
SET
  reminder_opt_in = COALESCE(reminder_opt_in, true),
  reminder_preference = COALESCE(reminder_preference, 'sms')
WHERE reminder_opt_in IS NULL OR reminder_preference IS NULL;

COMMIT;

-- Verification query (run after migration)
SELECT
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE reminder_opt_in = true) as opted_in,
  COUNT(*) FILTER (WHERE reminder_opt_in = false) as opted_out,
  COUNT(*) FILTER (WHERE reminder_preference = 'sms') as prefer_sms,
  COUNT(*) FILTER (WHERE reminder_preference = 'email') as prefer_email,
  COUNT(*) FILTER (WHERE reminder_preference = 'both') as prefer_both,
  COUNT(*) FILTER (WHERE reminder_preference = 'none') as prefer_none
FROM tenant_customers
WHERE is_active = true;
