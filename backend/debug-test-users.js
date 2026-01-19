const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway';

async function debugUsers() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('🔍 Checking tenant_users for tenant 527...\n');

    const result = await client.query(`
      SELECT user_id, tenant_id, username, full_name, is_active, created_at
      FROM tenant_users
      WHERE tenant_id = 527
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    console.log('Found users:');
    console.log(JSON.stringify(result.rows, null, 2));
    console.log(`\nTotal: ${result.rows.length} users`);

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

debugUsers();
