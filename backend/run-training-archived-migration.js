/**
 * Add archived column to tenant_training_records table
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('📋 Running migration: add-training-archived-column.sql');
    const migrationPath = path.join(__dirname, 'migrations', 'add-training-archived-column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify the column exists
    console.log('🔍 Verifying archived column was added:');
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'tenant_training_records'
      AND column_name = 'archived'
    `);

    if (verifyResult.rows.length > 0) {
      const col = verifyResult.rows[0];
      console.log(`  ✅ Column added: ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default})`);
    } else {
      console.log('  ❌ Column not found - migration may have failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
