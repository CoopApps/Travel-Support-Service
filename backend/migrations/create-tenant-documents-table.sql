-- Create tenant_documents table for document management
-- This table stores metadata about uploaded documents for all modules

CREATE TABLE IF NOT EXISTS tenant_documents (
    document_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),

    -- File information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64),

    -- Module/entity relationship
    module VARCHAR(50) NOT NULL,  -- e.g., 'customers', 'drivers', 'vehicles'
    entity_type VARCHAR(50),       -- e.g., 'customer', 'driver', 'vehicle'
    entity_id INTEGER,             -- ID of the related entity

    -- Document metadata
    document_category VARCHAR(100),
    title VARCHAR(255),
    description TEXT,
    issue_date DATE,
    expiry_date DATE,

    -- Access control
    is_confidential BOOLEAN DEFAULT false,
    access_level VARCHAR(50) DEFAULT 'standard',

    -- Additional info
    tags TEXT[],
    notes TEXT,
    uploaded_by INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant ON tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_module ON tenant_documents(tenant_id, module);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_entity ON tenant_documents(tenant_id, module, entity_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_expiry ON tenant_documents(tenant_id, expiry_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenant_documents_category ON tenant_documents(tenant_id, document_category);

-- Add comment
COMMENT ON TABLE tenant_documents IS 'Document storage metadata for tenant files across all modules';
