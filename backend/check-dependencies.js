/**
 * Check what database objects depend on subscription_tier column
 */
const { Client } = require('pg');
require('dotenv').config();

async function checkDependencies() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check for constraints
    console.log('🔍 Checking for constraints on subscription_tier...\n');
    const constraints = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND kcu.column_name = 'subscription_tier';
    `);

    if (constraints.rows.length > 0) {
      console.log('Found constraints:');
      constraints.rows.forEach(c => {
        console.log(`   - ${c.constraint_name} (${c.constraint_type}) on ${c.table_name}`);
      });
      console.log('');
    } else {
      console.log('No constraints found.\n');
    }

    // Check for views that reference subscription_tier
    console.log('🔍 Checking for views referencing subscription_tier...\n');
    const views = await client.query(`
      SELECT
        table_name,
        view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND view_definition LIKE '%subscription_tier%';
    `);

    if (views.rows.length > 0) {
      console.log('Found views:');
      views.rows.forEach(v => {
        console.log(`   - ${v.table_name}`);
        console.log(`     Definition snippet: ${v.view_definition.substring(0, 100)}...`);
      });
      console.log('');
    } else {
      console.log('No views found.\n');
    }

    // Check for indexes
    console.log('🔍 Checking for indexes on subscription_tier...\n');
    const indexes = await client.query(`
      SELECT
        i.relname as index_name,
        t.relname as table_name
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = 'tenants'
        AND a.attname = 'subscription_tier';
    `);

    if (indexes.rows.length > 0) {
      console.log('Found indexes:');
      indexes.rows.forEach(i => {
        console.log(`   - ${i.index_name} on ${i.table_name}`);
      });
      console.log('');
    } else {
      console.log('No indexes found.\n');
    }

    // Check for triggers
    console.log('🔍 Checking for triggers that might reference subscription_tier...\n');
    const triggers = await client.query(`
      SELECT
        trigger_name,
        event_object_table as table_name,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
        AND event_object_table = 'tenants';
    `);

    if (triggers.rows.length > 0) {
      console.log('Found triggers on tenants table:');
      triggers.rows.forEach(t => {
        console.log(`   - ${t.trigger_name} on ${t.table_name}`);
        console.log(`     Action: ${t.action_statement.substring(0, 100)}...`);
      });
      console.log('');
    } else {
      console.log('No triggers found.\n');
    }

    // Check for default values or check constraints
    console.log('🔍 Checking column constraints on subscription_tier...\n');
    const colConstraints = await client.query(`
      SELECT
        conname as constraint_name,
        pg_get_constraintdef(c.oid) as constraint_definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'tenants'::regclass
        AND pg_get_constraintdef(c.oid) LIKE '%subscription_tier%';
    `);

    if (colConstraints.rows.length > 0) {
      console.log('Found column constraints:');
      colConstraints.rows.forEach(c => {
        console.log(`   - ${c.constraint_name}: ${c.constraint_definition}`);
      });
      console.log('');
    } else {
      console.log('No column constraints found.\n');
    }

    console.log('✅ Dependency check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDependencies();
