-- Universal Messaging Enhancement Migration
-- Created: 2025-11-17
-- Adds email/SMS delivery, drafts, and scheduled messaging support to tenant_messages

-- Add new columns for universal messaging
ALTER TABLE tenant_messages
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'in-app',
ADD COLUMN IF NOT EXISTS email_subject VARCHAR(500),
ADD COLUMN IF NOT EXISTS sms_body VARCHAR(160),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS failed_reason TEXT;

-- Add check constraint for delivery_method (drop first if exists to avoid errors)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_delivery_method'
    ) THEN
        ALTER TABLE tenant_messages
        ADD CONSTRAINT check_delivery_method
        CHECK (delivery_method IN ('in-app', 'email', 'sms', 'both'));
    END IF;
END $$;

-- Add check constraint for status (drop first if exists to avoid errors)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_message_status'
    ) THEN
        ALTER TABLE tenant_messages
        ADD CONSTRAINT check_message_status
        CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'delivered', 'failed'));
    END IF;
END $$;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_tenant_messages_status ON tenant_messages(status);

-- Create index for draft queries
CREATE INDEX IF NOT EXISTS idx_tenant_messages_is_draft ON tenant_messages(is_draft);

-- Create index for scheduled messages
CREATE INDEX IF NOT EXISTS idx_tenant_messages_scheduled ON tenant_messages(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Update existing messages to have default values
UPDATE tenant_messages
SET
    delivery_method = 'in-app',
    status = 'sent',
    is_draft = false,
    sent_at = created_at
WHERE delivery_method IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN tenant_messages.delivery_method IS 'Delivery channel: in-app, email, sms, or both (email+sms)';
COMMENT ON COLUMN tenant_messages.email_subject IS 'Subject line for email delivery';
COMMENT ON COLUMN tenant_messages.sms_body IS 'SMS-specific message body (max 160 chars)';
COMMENT ON COLUMN tenant_messages.status IS 'Message lifecycle status: draft, scheduled, sending, sent, delivered, failed';
COMMENT ON COLUMN tenant_messages.is_draft IS 'Whether this message is a draft';
COMMENT ON COLUMN tenant_messages.scheduled_at IS 'When to send the message (for scheduled messages)';
COMMENT ON COLUMN tenant_messages.sent_at IS 'When the message was actually sent';
COMMENT ON COLUMN tenant_messages.delivered_at IS 'When the message was delivered to all recipients';
COMMENT ON COLUMN tenant_messages.failed_reason IS 'Reason for delivery failure';
