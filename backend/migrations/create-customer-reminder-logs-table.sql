-- Create customer reminder logs table
-- Tracks SMS/Email reminders sent to customers
-- Date: November 11, 2025

BEGIN;

CREATE TABLE IF NOT EXISTS tenant_customer_reminder_logs (
  reminder_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
  trip_id INTEGER REFERENCES tenant_trips(trip_id) ON DELETE SET NULL,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('sms', 'email')),
  message TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_reminder_logs_tenant
  ON tenant_customer_reminder_logs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_customer_reminder_logs_customer
  ON tenant_customer_reminder_logs(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_reminder_logs_trip
  ON tenant_customer_reminder_logs(trip_id)
  WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_reminder_logs_sent_at
  ON tenant_customer_reminder_logs(sent_at DESC);

COMMIT;

-- Verification query
SELECT
  COUNT(*) as total_reminder_logs,
  COUNT(DISTINCT customer_id) as customers_with_reminders,
  COUNT(*) FILTER (WHERE reminder_type = 'sms') as sms_reminders,
  COUNT(*) FILTER (WHERE reminder_type = 'email') as email_reminders,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM tenant_customer_reminder_logs;
