const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'travel_support_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function createDocumentsTables() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting documents tables creation...\n');

    // Create tenant_documents table
    console.log('📄 Creating tenant_documents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_documents (
        document_id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,

        -- File metadata
        original_filename VARCHAR(255) NOT NULL,
        stored_filename VARCHAR(255) NOT NULL UNIQUE,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_hash VARCHAR(64),

        -- Entity linkage
        module VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,

        -- Document classification
        document_category VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        description TEXT,

        -- Expiry tracking
        issue_date DATE,
        expiry_date DATE,
        reminder_sent BOOLEAN DEFAULT false,
        reminder_sent_at TIMESTAMP,

        -- Status and access
        is_active BOOLEAN DEFAULT true,
        is_confidential BOOLEAN DEFAULT false,
        access_level VARCHAR(50) DEFAULT 'standard',

        -- Audit trail
        uploaded_by INTEGER NOT NULL,
        uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_by INTEGER,
        updated_at TIMESTAMP,
        deleted_by INTEGER,
        deleted_at TIMESTAMP,

        -- Additional metadata
        tags TEXT[],
        notes TEXT,
        version INTEGER DEFAULT 1,

        -- Foreign keys
        CONSTRAINT fk_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT fk_uploaded_by FOREIGN KEY (uploaded_by)
          REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_updated_by FOREIGN KEY (updated_by)
          REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT fk_deleted_by FOREIGN KEY (deleted_by)
          REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('✅ tenant_documents table created\n');

    // Create indexes for performance
    console.log('🔍 Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_tenant
        ON tenant_documents(tenant_id);
    `);
    console.log('  ✓ Index on tenant_id');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_module
        ON tenant_documents(tenant_id, module);
    `);
    console.log('  ✓ Index on tenant_id + module');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_entity
        ON tenant_documents(tenant_id, module, entity_type, entity_id);
    `);
    console.log('  ✓ Index on entity linkage');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_category
        ON tenant_documents(tenant_id, document_category);
    `);
    console.log('  ✓ Index on document_category');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_expiry
        ON tenant_documents(tenant_id, expiry_date)
        WHERE expiry_date IS NOT NULL AND is_active = true;
    `);
    console.log('  ✓ Index on expiry_date (partial)');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_active
        ON tenant_documents(tenant_id, is_active);
    `);
    console.log('  ✓ Index on is_active');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_uploaded
        ON tenant_documents(tenant_id, uploaded_at DESC);
    `);
    console.log('  ✓ Index on uploaded_at');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_search
        ON tenant_documents USING gin(tags);
    `);
    console.log('  ✓ GIN index on tags for search\n');

    // Create document_access_log table for audit trail
    console.log('📋 Creating document_access_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_access_log (
        log_id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        action VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_document FOREIGN KEY (document_id)
          REFERENCES tenant_documents(document_id) ON DELETE CASCADE,
        CONSTRAINT fk_tenant FOREIGN KEY (tenant_id)
          REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT fk_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log('✅ document_access_log table created\n');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_access_log_document
        ON document_access_log(document_id, accessed_at DESC);
    `);
    console.log('  ✓ Index on document access log\n');

    // Create document_versions table for version tracking
    console.log('🔄 Creating document_versions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_versions (
        version_id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        version_number INTEGER NOT NULL,

        -- Previous file details
        previous_filename VARCHAR(255),
        previous_file_path TEXT,
        previous_file_size INTEGER,
        previous_file_hash VARCHAR(64),

        -- Version metadata
        change_description TEXT,
        replaced_by INTEGER,
        replaced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_document_version FOREIGN KEY (document_id)
          REFERENCES tenant_documents(document_id) ON DELETE CASCADE,
        CONSTRAINT fk_tenant_version FOREIGN KEY (tenant_id)
          REFERENCES tenants(tenant_id) ON DELETE CASCADE,
        CONSTRAINT fk_replaced_by FOREIGN KEY (replaced_by)
          REFERENCES users(id) ON DELETE SET NULL,

        UNIQUE(document_id, version_number)
      );
    `);
    console.log('✅ document_versions table created\n');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_versions_document
        ON document_versions(document_id, version_number DESC);
    `);
    console.log('  ✓ Index on document versions\n');

    // Create storage configuration table
    console.log('⚙️ Creating document_storage_config table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_storage_config (
        config_id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL UNIQUE,

        -- Storage settings
        storage_type VARCHAR(50) DEFAULT 'local',
        storage_path TEXT,
        max_file_size BIGINT DEFAULT 10485760,
        allowed_file_types TEXT[],
        require_encryption BOOLEAN DEFAULT false,

        -- Quotas
        storage_quota_bytes BIGINT,
        storage_used_bytes BIGINT DEFAULT 0,

        -- Retention policies
        retention_days INTEGER,
        auto_delete_expired BOOLEAN DEFAULT false,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP,

        CONSTRAINT fk_tenant_storage FOREIGN KEY (tenant_id)
          REFERENCES tenants(tenant_id) ON DELETE CASCADE
      );
    `);
    console.log('✅ document_storage_config table created\n');

    // Insert default storage config for existing tenants
    console.log('📝 Setting default storage config for existing tenants...');
    await client.query(`
      INSERT INTO document_storage_config (tenant_id, storage_type, storage_path, max_file_size, allowed_file_types)
      SELECT
        tenant_id,
        'local',
        '/storage/tenants/' || tenant_id,
        10485760,
        ARRAY['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx']
      FROM tenants
      ON CONFLICT (tenant_id) DO NOTHING;
    `);
    console.log('✅ Default configs created\n');

    // Create function to update storage usage
    console.log('⚡ Creating storage usage update function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_storage_usage()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE document_storage_config
          SET storage_used_bytes = storage_used_bytes + NEW.file_size
          WHERE tenant_id = NEW.tenant_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE document_storage_config
          SET storage_used_bytes = storage_used_bytes - OLD.file_size
          WHERE tenant_id = OLD.tenant_id;
        ELSIF TG_OP = 'UPDATE' AND NEW.file_size != OLD.file_size THEN
          UPDATE document_storage_config
          SET storage_used_bytes = storage_used_bytes + (NEW.file_size - OLD.file_size)
          WHERE tenant_id = NEW.tenant_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Storage usage function created\n');

    // Create trigger for automatic storage tracking
    console.log('🎯 Creating storage usage trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS trg_update_storage_usage ON tenant_documents;
      CREATE TRIGGER trg_update_storage_usage
      AFTER INSERT OR UPDATE OR DELETE ON tenant_documents
      FOR EACH ROW
      EXECUTE FUNCTION update_storage_usage();
    `);
    console.log('✅ Storage usage trigger created\n');

    // Create view for document statistics
    console.log('📊 Creating document statistics view...');
    await client.query(`
      CREATE OR REPLACE VIEW v_document_stats AS
      SELECT
        tenant_id,
        module,
        document_category,
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE is_active = true) as active_documents,
        COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE) as expired_documents,
        COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') as expiring_soon,
        SUM(file_size) as total_storage_bytes,
        MAX(uploaded_at) as last_upload_date
      FROM tenant_documents
      WHERE is_active = true
      GROUP BY tenant_id, module, document_category;
    `);
    console.log('✅ Document statistics view created\n');

    // Create view for expiring documents
    console.log('⏰ Creating expiring documents view...');
    await client.query(`
      CREATE OR REPLACE VIEW v_expiring_documents AS
      SELECT
        d.*,
        CONCAT(u.first_name, ' ', u.last_name) as uploaded_by_name,
        CASE
          WHEN expiry_date < CURRENT_DATE THEN 'expired'
          WHEN expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'critical'
          WHEN expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
          ELSE 'valid'
        END as expiry_status,
        expiry_date - CURRENT_DATE as days_until_expiry
      FROM tenant_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.is_active = true
        AND d.expiry_date IS NOT NULL
        AND d.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
      ORDER BY d.expiry_date ASC;
    `);
    console.log('✅ Expiring documents view created\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Documents system database setup completed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📋 Summary:');
    console.log('  ✓ tenant_documents table (main storage)');
    console.log('  ✓ document_access_log table (audit trail)');
    console.log('  ✓ document_versions table (version history)');
    console.log('  ✓ document_storage_config table (tenant settings)');
    console.log('  ✓ 8 performance indexes');
    console.log('  ✓ Automatic storage usage tracking');
    console.log('  ✓ Document statistics view');
    console.log('  ✓ Expiring documents view');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating documents tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
createDocumentsTables()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
