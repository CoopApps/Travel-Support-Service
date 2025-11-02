-- Driver Messages/Announcements Table
-- Allows admins to send messages to drivers

CREATE TABLE IF NOT EXISTS driver_messages (
    message_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_by INTEGER, -- admin user who created the message
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Optional: Target specific driver or all drivers
    target_driver_id INTEGER, -- NULL means all drivers

    -- Optional: Expiry date for temporary messages
    expires_at TIMESTAMP,

    -- Is this message active?
    is_active BOOLEAN DEFAULT TRUE,

    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (target_driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE
);

-- Track which drivers have read which messages
CREATE TABLE IF NOT EXISTS driver_message_reads (
    read_id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (message_id) REFERENCES driver_messages(message_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,

    UNIQUE(message_id, driver_id) -- Each driver can only mark a message as read once
);

-- Indexes for performance
CREATE INDEX idx_driver_messages_tenant ON driver_messages(tenant_id);
CREATE INDEX idx_driver_messages_target ON driver_messages(target_driver_id);
CREATE INDEX idx_driver_messages_active ON driver_messages(is_active);
CREATE INDEX idx_driver_messages_created ON driver_messages(created_at DESC);
CREATE INDEX idx_driver_message_reads_driver ON driver_message_reads(driver_id);
CREATE INDEX idx_driver_message_reads_message ON driver_message_reads(message_id);

-- Comments
COMMENT ON TABLE driver_messages IS 'Messages and announcements sent by admins to drivers';
COMMENT ON TABLE driver_message_reads IS 'Tracks which drivers have read which messages';
COMMENT ON COLUMN driver_messages.priority IS 'Message priority: low (info), medium (notice), high (important)';
COMMENT ON COLUMN driver_messages.target_driver_id IS 'NULL = broadcast to all drivers, otherwise specific driver';
COMMENT ON COLUMN driver_messages.expires_at IS 'NULL = permanent message, otherwise auto-hide after this date';
