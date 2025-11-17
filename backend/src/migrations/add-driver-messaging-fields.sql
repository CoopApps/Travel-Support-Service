-- =============================================
-- Add SMS/Email Fields to Driver Messages
-- =============================================
-- Adds delivery method, email subject, SMS body, and status fields
-- to driver_messages table to match tenant_messages functionality

-- Add new columns to driver_messages table
ALTER TABLE driver_messages
  ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'in-app',
  ADD COLUMN IF NOT EXISTS email_subject VARCHAR(500),
  ADD COLUMN IF NOT EXISTS sms_body VARCHAR(160),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS failed_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_messages_status ON driver_messages(status);
CREATE INDEX IF NOT EXISTS idx_driver_messages_delivery_method ON driver_messages(delivery_method);
CREATE INDEX IF NOT EXISTS idx_driver_messages_scheduled ON driver_messages(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_messages_is_draft ON driver_messages(is_draft) WHERE is_draft = true;

-- Comments for documentation
COMMENT ON COLUMN driver_messages.delivery_method IS 'Delivery method: in-app, email, sms, or both (email+sms)';
COMMENT ON COLUMN driver_messages.email_subject IS 'Subject line for email delivery';
COMMENT ON COLUMN driver_messages.sms_body IS 'SMS message body (max 160 characters)';
COMMENT ON COLUMN driver_messages.status IS 'Message status: draft, scheduled, sent, delivered, failed';
COMMENT ON COLUMN driver_messages.is_draft IS 'True if message is saved as draft';
COMMENT ON COLUMN driver_messages.scheduled_at IS 'When message should be sent (for scheduled messages)';
COMMENT ON COLUMN driver_messages.sent_at IS 'When message was actually sent';
COMMENT ON COLUMN driver_messages.delivered_at IS 'When message was delivered (for SMS/Email tracking)';
COMMENT ON COLUMN driver_messages.failed_reason IS 'Error message if delivery failed';
