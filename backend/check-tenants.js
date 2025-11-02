const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkTenants() {
  try {
    const result = await pool.query(
      'SELECT tenant_id, company_name, subdomain, domain FROM tenants ORDER BY tenant_id'
    );
    console.log('\n📊 All Tenants:\n');
    result.rows.forEach(t => {
      console.log(`  Tenant ID ${t.tenant_id}: ${t.company_name}`);
      console.log(`    Subdomain: ${t.subdomain}`);
      console.log(`    Domain: ${t.domain || 'N/A'}`);
      console.log('');
    });

    // Check for platform admins
    const admins = await pool.query('SELECT * FROM platform_admins ORDER BY admin_id');
    console.log('\n🔑 Platform Admins:\n');
    if (admins.rows.length === 0) {
      console.log('  ❌ No platform admins found\n');
    } else {
      admins.rows.forEach(a => {
        console.log(`  Admin ID ${a.admin_id}: ${a.username} (${a.email})`);
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTenants();
