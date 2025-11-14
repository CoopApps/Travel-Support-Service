-- Create audit_logs table for tracking all important operations
-- Required for security compliance, debugging, and accountability

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL, -- e.g. 'create', 'update', 'delete'
  resource_type VARCHAR(100) NOT NULL, -- e.g. 'customer', 'driver', 'schedule'
  resource_id INTEGER,
  old_data JSONB, -- Previous data (for updates/deletes)
  new_data JSONB, -- New data (for creates/updates)
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_audit_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Tracks all important operations for security and compliance';
