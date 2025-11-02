-- Driver to Office Messages Table
-- Allows drivers to send messages to the office/admins

CREATE TABLE IF NOT EXISTS driver_to_office_messages (
    message_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    read_by INTEGER, -- admin user who read the message
    resolved_at TIMESTAMP,
    resolved_by INTEGER, -- admin user who resolved/closed the message
    admin_response TEXT,

    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES tenant_drivers(driver_id) ON DELETE CASCADE,
    FOREIGN KEY (read_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES tenant_users(user_id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_driver_to_office_messages_tenant ON driver_to_office_messages(tenant_id);
CREATE INDEX idx_driver_to_office_messages_driver ON driver_to_office_messages(driver_id);
CREATE INDEX idx_driver_to_office_messages_status ON driver_to_office_messages(status);
CREATE INDEX idx_driver_to_office_messages_created ON driver_to_office_messages(created_at DESC);

-- Comments
COMMENT ON TABLE driver_to_office_messages IS 'Messages sent by drivers to the office/admins';
COMMENT ON COLUMN driver_to_office_messages.status IS 'Message status: pending (new), read (seen by admin), resolved (closed/handled)';
COMMENT ON COLUMN driver_to_office_messages.admin_response IS 'Optional response from admin to driver';
