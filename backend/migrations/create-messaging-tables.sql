-- Customer Messaging System Tables
-- Created: 2025-10-26

-- Table: tenant_messages
-- Messages from admin/office to customers
CREATE TABLE IF NOT EXISTS tenant_messages (
    message_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    target_customer_id INTEGER, -- NULL means broadcast to all customers
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- normal, high, urgent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER, -- admin user ID
    expires_at TIMESTAMP, -- optional expiration date
    CONSTRAINT fk_tenant_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_tenant_messages_customer FOREIGN KEY (target_customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenant_messages_tenant ON tenant_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_customer ON tenant_messages(target_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenant_messages_created ON tenant_messages(created_at DESC);

-- Table: customer_message_reads
-- Tracks which customers have read which messages
CREATE TABLE IF NOT EXISTS customer_message_reads (
    read_id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_message_reads_message FOREIGN KEY (message_id) REFERENCES tenant_messages(message_id) ON DELETE CASCADE,
    CONSTRAINT fk_message_reads_customer FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
    CONSTRAINT unique_message_read UNIQUE (message_id, customer_id)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON customer_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_customer ON customer_message_reads(customer_id);

-- Table: customer_messages_to_office
-- Messages from customers to the office
CREATE TABLE IF NOT EXISTS customer_messages_to_office (
    message_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'unread', -- unread, read, replied
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    read_by INTEGER, -- admin user ID
    reply_message_id INTEGER, -- reference to reply in tenant_messages
    CONSTRAINT fk_customer_messages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_messages_customer FOREIGN KEY (customer_id) REFERENCES tenant_customers(customer_id) ON DELETE CASCADE,
    CONSTRAINT fk_customer_messages_reply FOREIGN KEY (reply_message_id) REFERENCES tenant_messages(message_id) ON DELETE SET NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_messages_tenant ON customer_messages_to_office(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_customer ON customer_messages_to_office(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_status ON customer_messages_to_office(status);
CREATE INDEX IF NOT EXISTS idx_customer_messages_created ON customer_messages_to_office(created_at DESC);

-- Insert some sample messages for tenant 2
INSERT INTO tenant_messages (tenant_id, target_customer_id, title, message, priority, created_by)
VALUES
    (2, NULL, 'Welcome to Our Service', 'Thank you for choosing our transportation service. We look forward to serving you!', 'normal', 20),
    (2, NULL, 'Important: Schedule Changes', 'Please note that our office will be closed on December 25th and 26th for the holidays. Plan your journeys accordingly.', 'high', 20);

COMMENT ON TABLE tenant_messages IS 'Messages from admin/office to customers';
COMMENT ON TABLE customer_message_reads IS 'Tracks which messages customers have read';
COMMENT ON TABLE customer_messages_to_office IS 'Messages from customers to the office';
