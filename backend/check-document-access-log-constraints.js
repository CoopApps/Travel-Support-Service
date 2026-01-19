const { Client } = require('pg');
require('dotenv').config();

async function checkConstraints() {
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
    console.log('[CHECK] Checking document_access_log constraints...\n');

    const result = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'document_access_log';
    `);

    console.log('Foreign key constraints:');
    result.rows.forEach(row => {
      console.log(`\n  Constraint: ${row.constraint_name}`);
      console.log(`  Column: ${row.column_name} -> ${row.foreign_table_name}(${row.foreign_column_name})`);
      console.log(`  ON DELETE: ${row.delete_rule}`);
      console.log(`  ON UPDATE: ${row.update_rule}`);
    });

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkConstraints();
