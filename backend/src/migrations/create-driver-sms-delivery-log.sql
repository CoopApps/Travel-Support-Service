-- =============================================
-- Driver SMS Delivery Log Table
-- =============================================
-- Tracks all SMS delivery attempts for driver messages
-- Provides audit trail and delivery status monitoring

CREATE TABLE IF NOT EXISTS driver_sms_delivery_log (
  log_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  message_id INTEGER NOT NULL,
  driver_id INTEGER,
  recipient_phone VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  provider_response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT fk_driver_sms_log_tenant
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(tenant_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_driver_sms_log_message
    FOREIGN KEY (message_id)
    REFERENCES driver_messages(message_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_driver_sms_log_driver
    FOREIGN KEY (driver_id)
    REFERENCES tenant_drivers(driver_id)
    ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_sms_log_tenant ON driver_sms_delivery_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_sms_log_message ON driver_sms_delivery_log(message_id);
CREATE INDEX IF NOT EXISTS idx_driver_sms_log_driver ON driver_sms_delivery_log(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sms_log_status ON driver_sms_delivery_log(status);
CREATE INDEX IF NOT EXISTS idx_driver_sms_log_created ON driver_sms_delivery_log(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_driver_sms_log_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_sms_log_timestamp
  BEFORE UPDATE ON driver_sms_delivery_log
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_sms_log_timestamp();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON driver_sms_delivery_log TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE driver_sms_delivery_log_log_id_seq TO PUBLIC;

-- Comments for documentation
COMMENT ON TABLE driver_sms_delivery_log IS 'Audit log for all driver SMS message delivery attempts';
COMMENT ON COLUMN driver_sms_delivery_log.log_id IS 'Unique identifier for each SMS delivery log entry';
COMMENT ON COLUMN driver_sms_delivery_log.tenant_id IS 'Reference to the tenant';
COMMENT ON COLUMN driver_sms_delivery_log.message_id IS 'Reference to the original driver message';
COMMENT ON COLUMN driver_sms_delivery_log.driver_id IS 'Reference to the driver (null for deleted drivers)';
COMMENT ON COLUMN driver_sms_delivery_log.recipient_phone IS 'Phone number in E.164 format';
COMMENT ON COLUMN driver_sms_delivery_log.status IS 'Delivery status: pending, sent, delivered, failed, etc.';
COMMENT ON COLUMN driver_sms_delivery_log.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN driver_sms_delivery_log.provider_response IS 'Response from Twilio (SID, status, etc.)';
