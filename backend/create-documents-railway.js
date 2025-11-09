const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway';

async function createDocumentsTables() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🚀 Connected to Railway database...\n');

    // Create tenant_documents table
    console.log('📄 Creating tenant_documents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_documents (
        document_id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_hash VARCHAR(64),
        module VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        document_category VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        issue_date DATE,
        expiry_date DATE,
        reminder_sent BOOLEAN DEFAULT false,
        reminder_sent_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        is_confidential BOOLEAN DEFAULT false,
        access_level VARCHAR(50) DEFAULT 'tenant',
        uploaded_by INTEGER,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_by INTEGER,
        deleted_at TIMESTAMP,
        tags TEXT[],
        notes TEXT,
        version INTEGER DEFAULT 1,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ tenant_documents table created\n');

    // Create indexes
    console.log('🔍 Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_tenant ON tenant_documents(tenant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_module ON tenant_documents(tenant_id, module)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_entity ON tenant_documents(tenant_id, module, entity_type, entity_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_category ON tenant_documents(document_category)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_expiry ON tenant_documents(expiry_date) WHERE expiry_date IS NOT NULL AND is_active = true');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_active ON tenant_documents(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_uploaded ON tenant_documents(uploaded_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_search ON tenant_documents USING GIN(tags)');
    console.log('✅ Indexes created\n');

    // Create document_access_log table
    console.log('📋 Creating document_access_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_access_log (
        log_id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER,
        action VARCHAR(50) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES tenant_documents(document_id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_document_access_log ON document_access_log(document_id, accessed_at DESC)');
    console.log('✅ document_access_log table created\n');

    // Create document_versions table
    console.log('🔄 Creating document_versions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        version_id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,
        stored_filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash VARCHAR(64),
        change_description TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES tenant_documents(document_id) ON DELETE CASCADE,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_document_versions ON document_versions(document_id, version_number DESC)');
    console.log('✅ document_versions table created\n');

    // Create document_storage_config table
    console.log('⚙️ Creating document_storage_config table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_storage_config (
        config_id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL UNIQUE,
        storage_type VARCHAR(50) DEFAULT 'local',
        storage_quota_bytes BIGINT DEFAULT 10737418240,
        storage_used_bytes BIGINT DEFAULT 0,
        max_file_size_bytes INTEGER DEFAULT 10485760,
        allowed_file_types TEXT[] DEFAULT ARRAY['pdf','jpg','jpeg','png','doc','docx','xls','xlsx'],
        retention_days INTEGER DEFAULT 2555,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ document_storage_config table created\n');

    // Set default configs for existing tenants
    console.log('📝 Setting default storage config for existing tenants...');
    await client.query(`
      INSERT INTO document_storage_config (tenant_id)
      SELECT tenant_id FROM tenants
      WHERE tenant_id NOT IN (SELECT tenant_id FROM document_storage_config)
    `);
    console.log('✅ Default configs created\n');

    // Create expiring documents view
    console.log('⏰ Creating expiring documents view...');
    await client.query(`
      CREATE OR REPLACE VIEW v_expiring_documents AS
      SELECT
        d.*,
        t.company_name,
        CASE
          WHEN d.expiry_date < CURRENT_DATE THEN 'expired'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
          WHEN d.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'upcoming'
          ELSE 'valid'
        END as expiry_status,
        (d.expiry_date - CURRENT_DATE) as days_until_expiry
      FROM tenant_documents d
      JOIN tenants t ON d.tenant_id = t.tenant_id
      WHERE d.expiry_date IS NOT NULL
        AND d.is_active = true
        AND d.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
      ORDER BY d.expiry_date ASC;
    `);
    console.log('✅ Expiring documents view created\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Documents system database setup completed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

createDocumentsTables();
