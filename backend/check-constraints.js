const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway';

async function checkConstraints() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔍 Checking foreign key constraints on tenant_documents...\n');

    const result = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'tenant_documents'
        AND tc.constraint_name LIKE '%uploaded%';
    `);

    console.log('Found constraints:');
    console.log(JSON.stringify(result.rows, null, 2));

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkConstraints();
