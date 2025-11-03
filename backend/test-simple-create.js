/**
 * Test simple table creation on Railway
 */

const { Client } = require('pg');

async function testCreate() {
  const client = new Client({
    connectionString: 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected\n');

    // Drop and recreate schema
    console.log('Cleaning schema...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✅ Clean\n');

    // Create a simple sequence
    console.log('Creating sequence...');
    await client.query('CREATE SEQUENCE test_seq');
    console.log('✅ Sequence created\n');

    // Create a simple table
    console.log('Creating table...');
    const createSQL = `
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER DEFAULT nextval('test_seq'::regclass) NOT NULL,
        name VARCHAR(100),
        PRIMARY KEY (id)
      );
    `;
    await client.query(createSQL);
    console.log('✅ Table created\n');

    // Verify
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log(`Tables: ${result.rows.length}`);
    result.rows.forEach(r => console.log(`  - ${r.table_name}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Detail:', error.detail);
  } finally {
    await client.end();
  }
}

testCreate();
