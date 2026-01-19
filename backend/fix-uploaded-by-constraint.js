const { Client } = require('pg');
require('dotenv').config();

async function fixUploadedByConstraint() {
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
    console.log('🚀 Connected to database...\n');

    // Drop the existing constraint if it exists
    console.log('🔧 Dropping existing fk_uploaded_by constraint if exists...');
    await client.query(`
      ALTER TABLE tenant_documents
      DROP CONSTRAINT IF EXISTS fk_uploaded_by;
    `);
    console.log('✅ Old constraint dropped\n');

    // Add the correct constraint
    console.log('➕ Adding corrected fk_uploaded_by constraint...');
    await client.query(`
      ALTER TABLE tenant_documents
      ADD CONSTRAINT fk_uploaded_by
      FOREIGN KEY (uploaded_by)
      REFERENCES tenant_users(user_id)
      ON DELETE SET NULL;
    `);
    console.log('✅ New constraint added\n');

    // Fix the updated_by constraint as well
    console.log('🔧 Dropping existing fk_updated_by constraint if exists...');
    await client.query(`
      ALTER TABLE tenant_documents
      DROP CONSTRAINT IF EXISTS fk_updated_by;
    `);
    console.log('✅ Old updated_by constraint dropped\n');

    console.log('➕ Adding corrected fk_updated_by constraint...');
    await client.query(`
      ALTER TABLE tenant_documents
      ADD CONSTRAINT fk_updated_by
      FOREIGN KEY (updated_by)
      REFERENCES tenant_users(user_id)
      ON DELETE SET NULL;
    `);
    console.log('✅ New updated_by constraint added\n');

    // Fix the deleted_by constraint as well
    console.log('🔧 Dropping existing fk_deleted_by constraint if exists...');
    await client.query(`
      ALTER TABLE tenant_documents
      DROP CONSTRAINT IF EXISTS fk_deleted_by;
    `);
    console.log('✅ Old deleted_by constraint dropped\n');

    console.log('➕ Adding corrected fk_deleted_by constraint...');
    await client.query(`
      ALTER TABLE tenant_documents
      ADD CONSTRAINT fk_deleted_by
      FOREIGN KEY (deleted_by)
      REFERENCES tenant_users(user_id)
      ON DELETE SET NULL;
    `);
    console.log('✅ New deleted_by constraint added\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Foreign key constraints fixed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

fixUploadedByConstraint();
