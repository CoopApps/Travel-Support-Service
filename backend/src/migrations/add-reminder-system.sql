-- Migration: Add SMS/Email Reminder System
-- Date: 2025-01-10
-- Description: Adds reminder settings, customer opt-in, and reminder history tracking

-- ============================================================================
-- 1. Add reminder settings to tenant_settings table
-- ============================================================================

-- Check if tenant_settings table exists, if not create it
CREATE TABLE IF NOT EXISTS tenant_settings (
  setting_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, setting_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, setting_key);

-- Add reminder configuration settings (will be inserted per tenant as needed)
-- Settings keys:
-- - 'reminder_enabled' (boolean: 'true'/'false')
-- - 'reminder_type' (string: 'sms', 'email', 'both')
-- - 'reminder_timing' (integer: minutes before pickup, e.g., '60' for 1 hour)
-- - 'reminder_template_sms' (text: SMS message template with variables)
-- - 'reminder_template_email_subject' (text: Email subject template)
-- - 'reminder_template_email_body' (text: Email body template with HTML)
-- - 'twilio_account_sid' (text: Twilio account SID - encrypted recommended)
-- - 'twilio_auth_token' (text: Twilio auth token - encrypted recommended)
-- - 'twilio_phone_number' (text: Twilio sender phone number)
-- - 'sendgrid_api_key' (text: SendGrid API key - encrypted recommended)
-- - 'sendgrid_from_email' (text: SendGrid sender email)
-- - 'sendgrid_from_name' (text: SendGrid sender name)

-- ============================================================================
-- 2. Add reminder opt-in/opt-out to customers table
-- ============================================================================

-- Add reminder opt-in column (default true - customers are opted in by default)
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT true;

-- Add reminder preferences (future enhancement)
ALTER TABLE tenant_customers
ADD COLUMN IF NOT EXISTS reminder_preference VARCHAR(20) DEFAULT 'sms' CHECK (reminder_preference IN ('sms', 'email', 'both', 'none'));

-- Add index for filtering opted-in customers
CREATE INDEX IF NOT EXISTS idx_customers_reminder_opt_in ON tenant_customers(tenant_id, reminder_opt_in) WHERE reminder_opt_in = true;

-- ============================================================================
-- 3. Create reminder history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS reminder_history (
  reminder_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  trip_id INTEGER NOT NULL REFERENCES tenant_trips(trip_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('sms', 'email')),
  recipient VARCHAR(255) NOT NULL, -- Phone number or email address
  message_content TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivery_status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed, bounced
  provider_message_id VARCHAR(255), -- Twilio/SendGrid message ID
  provider_response JSONB, -- Full provider response
  error_message TEXT, -- Error details if failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for reminder history
CREATE INDEX IF NOT EXISTS idx_reminder_history_tenant ON reminder_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_trip ON reminder_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_customer ON reminder_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_sent_at ON reminder_history(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_history_status ON reminder_history(delivery_status);

-- ============================================================================
-- 4. Add comment documentation
-- ============================================================================

COMMENT ON TABLE tenant_settings IS 'Stores tenant-specific configuration settings including reminder system settings';
COMMENT ON TABLE reminder_history IS 'Tracks all sent reminders with delivery status and provider responses';
COMMENT ON COLUMN tenant_customers.reminder_opt_in IS 'Customer opt-in status for receiving reminders (default: true)';
COMMENT ON COLUMN tenant_customers.reminder_preference IS 'Customer preference for reminder type: sms, email, both, or none';
COMMENT ON COLUMN reminder_history.delivery_status IS 'Reminder delivery status: pending, sent, delivered, failed, bounced';
COMMENT ON COLUMN reminder_history.provider_message_id IS 'Unique message ID from Twilio or SendGrid for tracking';

-- ============================================================================
-- 5. Insert default reminder templates
-- ============================================================================

-- Default SMS template with variables
-- Variables: {{customer_name}}, {{pickup_time}}, {{pickup_location}}, {{destination}}, {{driver_name}}, {{driver_phone}}
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT
  t.tenant_id,
  'reminder_template_sms',
  'Hi {{customer_name}}, this is a reminder that your transport is scheduled for {{pickup_time}} from {{pickup_location}} to {{destination}}. Your driver {{driver_name}} will pick you up. Driver contact: {{driver_phone}}. Reply STOP to unsubscribe.'
FROM tenants t
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Default Email subject template
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT
  t.tenant_id,
  'reminder_template_email_subject',
  'Trip Reminder: Pickup at {{pickup_time}}'
FROM tenants t
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Default Email body template (HTML)
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT
  t.tenant_id,
  'reminder_template_email_body',
  '<html><body style="font-family: Arial, sans-serif; padding: 20px;"><h2>Trip Reminder</h2><p>Dear {{customer_name}},</p><p>This is a reminder about your upcoming trip:</p><ul><li><strong>Date:</strong> {{trip_date}}</li><li><strong>Pickup Time:</strong> {{pickup_time}}</li><li><strong>Pickup Location:</strong> {{pickup_location}}</li><li><strong>Destination:</strong> {{destination}}</li><li><strong>Driver:</strong> {{driver_name}}</li><li><strong>Driver Contact:</strong> {{driver_phone}}</li></ul><p>If you need to make any changes, please contact us as soon as possible.</p><p>Best regards,<br>Your Transport Team</p><hr><small>To stop receiving reminders, please update your preferences in your account settings.</small></body></html>'
FROM tenants t
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Default reminder timing (60 minutes = 1 hour before pickup)
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT
  t.tenant_id,
  'reminder_timing',
  '60'
FROM tenants t
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Default reminder type (SMS)
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT
  t.tenant_id,
  'reminder_type',
  'sms'
FROM tenants t
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- Reminders disabled by default (must be explicitly enabled by admin)
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
SELECT
  t.tenant_id,
  'reminder_enabled',
  'false'
FROM tenants t
ON CONFLICT (tenant_id, setting_key) DO NOTHING;

-- ============================================================================
-- 6. Create function to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON tenant_settings;
CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminder_history_updated_at ON reminder_history;
CREATE TRIGGER update_reminder_history_updated_at
  BEFORE UPDATE ON reminder_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE '✅ Reminder system migration completed successfully';
  RAISE NOTICE '   - tenant_settings table ready';
  RAISE NOTICE '   - reminder_history table created';
  RAISE NOTICE '   - Customer opt-in columns added';
  RAISE NOTICE '   - Default templates inserted';
  RAISE NOTICE '   - Indexes created';
  RAISE NOTICE '   - Triggers configured';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Reminders are DISABLED by default';
  RAISE NOTICE '   Admins must explicitly enable and configure reminder settings';
  RAISE NOTICE '   Required settings: Twilio or SendGrid API credentials';
END $$;
