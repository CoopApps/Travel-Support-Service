const { Client } = require('pg');
require('dotenv').config();

async function addNameColumns() {
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

    // ========================================
    // 1. Add columns to tenant_users
    // ========================================
    console.log('📋 Adding first_name and last_name to tenant_users...');
    await client.query(`
      ALTER TABLE tenant_users
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
    `);
    console.log('✅ Columns added to tenant_users\n');

    // Split existing full_name into first_name and last_name
    console.log('🔄 Migrating existing tenant_users data...');
    await client.query(`
      UPDATE tenant_users
      SET
        first_name = CASE
          WHEN full_name IS NOT NULL AND POSITION(' ' IN full_name) > 0
          THEN TRIM(SUBSTRING(full_name FROM 1 FOR POSITION(' ' IN full_name) - 1))
          ELSE full_name
        END,
        last_name = CASE
          WHEN full_name IS NOT NULL AND POSITION(' ' IN full_name) > 0
          THEN TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
          ELSE ''
        END
      WHERE first_name IS NULL OR last_name IS NULL;
    `);
    console.log('✅ Migrated tenant_users data\n');

    // ========================================
    // 2. Add columns to tenant_drivers
    // ========================================
    console.log('📋 Adding first_name and last_name to tenant_drivers...');
    await client.query(`
      ALTER TABLE tenant_drivers
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
    `);
    console.log('✅ Columns added to tenant_drivers\n');

    // Split existing name into first_name and last_name
    console.log('🔄 Migrating existing tenant_drivers data...');
    await client.query(`
      UPDATE tenant_drivers
      SET
        first_name = CASE
          WHEN name IS NOT NULL AND POSITION(' ' IN name) > 0
          THEN TRIM(SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1))
          ELSE name
        END,
        last_name = CASE
          WHEN name IS NOT NULL AND POSITION(' ' IN name) > 0
          THEN TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1))
          ELSE ''
        END
      WHERE first_name IS NULL OR last_name IS NULL;
    `);
    console.log('✅ Migrated tenant_drivers data\n');

    // ========================================
    // 3. Add columns to tenant_customers
    // ========================================
    console.log('📋 Adding first_name and last_name to tenant_customers...');
    await client.query(`
      ALTER TABLE tenant_customers
      ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
    `);
    console.log('✅ Columns added to tenant_customers\n');

    // Split existing name into first_name and last_name
    console.log('🔄 Migrating existing tenant_customers data...');
    await client.query(`
      UPDATE tenant_customers
      SET
        first_name = CASE
          WHEN name IS NOT NULL AND POSITION(' ' IN name) > 0
          THEN TRIM(SUBSTRING(name FROM 1 FOR POSITION(' ' IN name) - 1))
          ELSE name
        END,
        last_name = CASE
          WHEN name IS NOT NULL AND POSITION(' ' IN name) > 0
          THEN TRIM(SUBSTRING(name FROM POSITION(' ' IN name) + 1))
          ELSE ''
        END
      WHERE first_name IS NULL OR last_name IS NULL;
    `);
    console.log('✅ Migrated tenant_customers data\n');

    // ========================================
    // 4. Create indexes for better search performance
    // ========================================
    console.log('🔍 Creating indexes for search optimization...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_first_name ON tenant_users(first_name);
      CREATE INDEX IF NOT EXISTS idx_users_last_name ON tenant_users(last_name);
      CREATE INDEX IF NOT EXISTS idx_drivers_first_name ON tenant_drivers(first_name);
      CREATE INDEX IF NOT EXISTS idx_drivers_last_name ON tenant_drivers(last_name);
      CREATE INDEX IF NOT EXISTS idx_customers_first_name ON tenant_customers(first_name);
      CREATE INDEX IF NOT EXISTS idx_customers_last_name ON tenant_customers(last_name);
    `);
    console.log('✅ Indexes created\n');

    // ========================================
    // 5. Verify the migration
    // ========================================
    console.log('🔍 Verifying migration...');

    const userCount = await client.query(`
      SELECT COUNT(*) as count FROM tenant_users WHERE first_name IS NOT NULL
    `);
    console.log(`   - tenant_users: ${userCount.rows[0].count} records with first_name`);

    const driverCount = await client.query(`
      SELECT COUNT(*) as count FROM tenant_drivers WHERE first_name IS NOT NULL
    `);
    console.log(`   - tenant_drivers: ${driverCount.rows[0].count} records with first_name`);

    const customerCount = await client.query(`
      SELECT COUNT(*) as count FROM tenant_customers WHERE first_name IS NOT NULL
    `);
    console.log(`   - tenant_customers: ${customerCount.rows[0].count} records with first_name\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Name columns migration completed successfully!');
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

addNameColumns();
