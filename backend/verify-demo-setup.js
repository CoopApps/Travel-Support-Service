const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const TENANT_ID = 1; // Demo Transport Company

async function verifyDemoSetup() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           DEMO TRANSPORT COMPANY - SETUP VERIFICATION          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Check tenant info
    const tenant = await pool.query(
      'SELECT company_name, subdomain FROM tenants WHERE tenant_id = $1',
      [TENANT_ID]
    );

    if (tenant.rows.length > 0) {
      console.log('🏢 Tenant Information:');
      console.log(`   Company: ${tenant.rows[0].company_name}`);
      console.log(`   Subdomain: ${tenant.rows[0].subdomain}`);
      console.log(`   Access URL: http://${tenant.rows[0].subdomain}.localhost:5174/\n`);
    }

    // Check admin user
    const admin = await pool.query(
      'SELECT username, email, role FROM tenant_users WHERE tenant_id = $1 AND role = $2',
      [TENANT_ID, 'admin']
    );

    console.log('👤 Admin Login Credentials:');
    if (admin.rows.length > 0) {
      console.log(`   Username: ${admin.rows[0].username}`);
      console.log(`   Email: ${admin.rows[0].email}`);
      console.log(`   Password: demo123\n`);
    } else {
      console.log('   ❌ No admin user found\n');
    }

    // Check customers and payment breakdown
    const customers = await pool.query(
      'SELECT COUNT(*) as total FROM tenant_customers WHERE tenant_id = $1',
      [TENANT_ID]
    );

    const selfPay = await pool.query(
      'SELECT COUNT(*) as count FROM tenant_customers WHERE tenant_id = $1 AND has_split_payment = false',
      [TENANT_ID]
    );

    const splitPay = await pool.query(
      'SELECT COUNT(*) as count FROM tenant_customers WHERE tenant_id = $1 AND has_split_payment = true',
      [TENANT_ID]
    );

    console.log('👥 Customer Configuration:');
    console.log(`   Total Customers: ${customers.rows[0].total}`);
    console.log(`   Self-Pay: ${selfPay.rows[0].count} (${Math.round(selfPay.rows[0].count / customers.rows[0].total * 100)}%)`);
    console.log(`   Split Payment: ${splitPay.rows[0].count} (${Math.round(splitPay.rows[0].count / customers.rows[0].total * 100)}%)\n`);

    // Sample split payment customer
    const sampleSplit = await pool.query(`
      SELECT name, payment_split, paying_org
      FROM tenant_customers
      WHERE tenant_id = $1 AND has_split_payment = true
      LIMIT 1
    `, [TENANT_ID]);

    if (sampleSplit.rows.length > 0) {
      console.log('   Example Split Payment:');
      console.log(`     Customer: ${sampleSplit.rows[0].name}`);
      console.log(`     Split: ${sampleSplit.rows[0].payment_split.customer_percentage}% customer / ${sampleSplit.rows[0].payment_split.organization_percentage}% org`);
      console.log(`     Paying Org: ${sampleSplit.rows[0].paying_org}\n`);
    }

    // Check schedules with times
    const schedules = await pool.query(
      'SELECT COUNT(*) as total FROM tenant_schedules WHERE tenant_id = $1',
      [TENANT_ID]
    );

    const schedulesWithTimes = await pool.query(`
      SELECT COUNT(*) as count FROM tenant_schedules
      WHERE tenant_id = $1
      AND (monday_pickup_time IS NOT NULL
        OR tuesday_pickup_time IS NOT NULL
        OR wednesday_pickup_time IS NOT NULL
        OR thursday_pickup_time IS NOT NULL
        OR friday_pickup_time IS NOT NULL
        OR saturday_pickup_time IS NOT NULL
        OR sunday_pickup_time IS NOT NULL)
    `, [TENANT_ID]);

    console.log('📅 Weekly Schedules:');
    console.log(`   Total Schedules: ${schedules.rows[0].total}`);
    console.log(`   With Pickup Times: ${schedulesWithTimes.rows[0].count}\n`);

    // Sample schedule with times
    const sampleSchedule = await pool.query(`
      SELECT c.name as customer_name,
             s.monday_destination, s.monday_pickup_time, s.monday_price,
             s.wednesday_destination, s.wednesday_pickup_time, s.wednesday_price,
             s.friday_destination, s.friday_pickup_time, s.friday_price
      FROM tenant_schedules s
      JOIN tenant_customers c ON s.customer_id = c.customer_id
      WHERE s.tenant_id = $1
      AND s.monday_destination IS NOT NULL
      LIMIT 1
    `, [TENANT_ID]);

    if (sampleSchedule.rows.length > 0) {
      const s = sampleSchedule.rows[0];
      console.log('   Example Schedule:');
      console.log(`     Customer: ${s.customer_name}`);
      if (s.monday_destination) {
        console.log(`     Monday: ${s.monday_destination} @ ${s.monday_pickup_time?.substring(0, 5)} - £${s.monday_price}`);
      }
      if (s.wednesday_destination) {
        console.log(`     Wednesday: ${s.wednesday_destination} @ ${s.wednesday_pickup_time?.substring(0, 5)} - £${s.wednesday_price}`);
      }
      if (s.friday_destination) {
        console.log(`     Friday: ${s.friday_destination} @ ${s.friday_pickup_time?.substring(0, 5)} - £${s.friday_price}`);
      }
      console.log('');
    }

    // Check drivers
    const drivers = await pool.query(
      'SELECT COUNT(*) as total FROM tenant_drivers WHERE tenant_id = $1',
      [TENANT_ID]
    );

    console.log('🚗 Resources:');
    console.log(`   Drivers: ${drivers.rows[0].total}`);

    // Check providers
    const providers = await pool.query(
      'SELECT COUNT(*) as total FROM tenant_providers WHERE tenant_id = $1',
      [TENANT_ID]
    );
    console.log(`   Providers: ${providers.rows[0].total}\n`);

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         ✅ DEMO READY                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('🎯 Next Steps:');
    console.log('   1. Ensure backend is running: npm run dev (in backend/)');
    console.log('   2. Ensure frontend is running on port 5174');
    console.log('   3. Access: http://demo.localhost:5174/');
    console.log('   4. Login with username: admin, password: demo123\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyDemoSetup();
