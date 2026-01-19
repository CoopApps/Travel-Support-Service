const { Client } = require('pg');

async function verifyColumns() {
  // Test with .env config (local DB)
  const localClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
  });

  try {
    await localClient.connect();
    console.log('✅ Connected to LOCAL database');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'travel_support_dev'}\n`);

    // Check if columns exist
    const columnsResult = await localClient.query(`
      SELECT column_name, table_name
      FROM information_schema.columns
      WHERE table_name IN ('tenant_users', 'tenant_drivers', 'tenant_customers')
        AND column_name IN ('first_name', 'last_name')
      ORDER BY table_name, column_name;
    `);

    console.log('Columns found:');
    if (columnsResult.rows.length === 0) {
      console.log('   ❌ NO first_name/last_name columns found!');
    } else {
      columnsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.table_name}.${row.column_name}`);
      });
    }

    // Count records
    const userCount = await localClient.query('SELECT COUNT(*) FROM tenant_users');
    const driverCount = await localClient.query('SELECT COUNT(*) FROM tenant_drivers');
    const customerCount = await localClient.query('SELECT COUNT(*) FROM tenant_customers');

    console.log('\nRecord counts:');
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Drivers: ${driverCount.rows[0].count}`);
    console.log(`   Customers: ${customerCount.rows[0].count}`);

    await localClient.end();
  } catch (error) {
    console.error('❌ Local DB Error:', error.message);
    await localClient.end();
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test with Railway URL if set
  if (process.env.DATABASE_URL) {
    const railwayClient = new Client({ connectionString: process.env.DATABASE_URL });
    try {
      await railwayClient.connect();
      console.log('✅ Connected to RAILWAY database');
      console.log(`   URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`);

      const columnsResult = await railwayClient.query(`
        SELECT column_name, table_name
        FROM information_schema.columns
        WHERE table_name IN ('tenant_users', 'tenant_drivers', 'tenant_customers')
          AND column_name IN ('first_name', 'last_name')
        ORDER BY table_name, column_name;
      `);

      console.log('Columns found:');
      if (columnsResult.rows.length === 0) {
        console.log('   ❌ NO first_name/last_name columns found!');
      } else {
        columnsResult.rows.forEach(row => {
          console.log(`   ✅ ${row.table_name}.${row.column_name}`);
        });
      }

      await railwayClient.end();
    } catch (error) {
      console.error('❌ Railway DB Error:', error.message);
      await railwayClient.end();
    }
  } else {
    console.log('DATABASE_URL not set - skipping Railway check');
  }

  process.exit(0);
}

verifyColumns();
