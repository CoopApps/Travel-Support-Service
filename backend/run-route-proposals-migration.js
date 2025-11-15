/**
 * Route Proposals Migration Script
 * Runs the customer route proposals database migration
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = "postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway";

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Railway database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-customer-route-proposals.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: add-customer-route-proposals.sql');
    console.log('⏳ This may take a moment...\n');

    // Run the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Tables created:');
    console.log('   - tenant_customer_travel_privacy');
    console.log('   - tenant_customer_route_proposals');
    console.log('   - tenant_route_proposal_votes');
    console.log('   - tenant_route_proposal_comments');
    console.log('   - tenant_route_proposal_invitations\n');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name LIKE 'tenant_%route%'
      ORDER BY table_name
    `);

    if (result.rows.length > 0) {
      console.log('✅ Verification: Found', result.rows.length, 'route-related tables:');
      result.rows.forEach(row => {
        console.log('   ✓', row.table_name);
      });
    }

    console.log('\n🎉 Route Proposals feature is ready to use!');
    console.log('\n📍 Next steps:');
    console.log('   1. Start your backend: cd backend && npm run dev');
    console.log('   2. Start your frontend: cd frontend && npm run dev');
    console.log('   3. Test customer flow: Login → Dashboard → Route Proposals');
    console.log('   4. Test admin flow: Login → Sidebar → Route Proposals\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Tables already exist. Migration may have run before.');
      console.log('   If you want to start fresh, you can drop the tables first.');
    } else {
      console.error('\nFull error:', error);
    }

    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the migration
runMigration();
