-- Create password_reset_tokens table for user password resets
-- This table stores temporary tokens for password reset requests

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Foreign keys
  CONSTRAINT fk_password_reset_user
    FOREIGN KEY (user_id) REFERENCES tenant_users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_password_reset_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Add comment
COMMENT ON TABLE password_reset_tokens IS 'Stores temporary tokens for password reset requests';
