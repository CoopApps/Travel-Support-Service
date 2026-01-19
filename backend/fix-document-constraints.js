const { Client } = require('pg');
require('dotenv').config();

async function fixDocumentConstraints() {
  // Use the same connection logic as tests
  let client;
  if (process.env.DATABASE_URL) {
    client = new Client({ connectionString: process.env.DATABASE_URL });
  } else {
    client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'travel_support_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });
  }

  try {
    await client.connect();
    console.log('[CONNECTED] Connected to database...\n');

    // ========================================
    // 1. Fix document_access_log FK constraint
    // ========================================
    console.log('[FIX] Fixing document_access_log.fk_user constraint...');

    await client.query(`
      ALTER TABLE document_access_log
      DROP CONSTRAINT IF EXISTS fk_user;
    `);
    console.log('   [SUCCESS] Old constraint dropped');

    await client.query(`
      ALTER TABLE document_access_log
      ADD CONSTRAINT fk_user
      FOREIGN KEY (user_id)
      REFERENCES tenant_users(user_id)
      ON DELETE CASCADE;
    `);
    console.log('   [SUCCESS] New constraint added\n');

    console.log('[FIX] Fixing document_access_log.fk_document constraint...');

    await client.query(`
      ALTER TABLE document_access_log
      DROP CONSTRAINT IF EXISTS fk_document;
    `);
    console.log('   [SUCCESS] Old constraint dropped');

    await client.query(`
      ALTER TABLE document_access_log
      ADD CONSTRAINT fk_document
      FOREIGN KEY (document_id)
      REFERENCES tenant_documents(document_id)
      ON DELETE CASCADE;
    `);
    console.log('   [SUCCESS] New constraint added (CASCADE on delete)\n');

    // ========================================
    // 2. Allow NULL in uploaded_by, updated_by, deleted_by
    // ========================================
    console.log('[FIX] Allowing NULL in tenant_documents user reference columns...');

    await client.query(`
      ALTER TABLE tenant_documents
      ALTER COLUMN uploaded_by DROP NOT NULL;
    `);
    console.log('   [SUCCESS] uploaded_by can now be NULL');

    await client.query(`
      ALTER TABLE tenant_documents
      ALTER COLUMN updated_by DROP NOT NULL;
    `);
    console.log('   [SUCCESS] updated_by can now be NULL');

    await client.query(`
      ALTER TABLE tenant_documents
      ALTER COLUMN deleted_by DROP NOT NULL;
    `);
    console.log('   [SUCCESS] deleted_by can now be NULL\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('[COMPLETE] All document constraints fixed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Migration failed:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

fixDocumentConstraints();
