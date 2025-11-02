import { query } from './src/config/database';
import * as bcrypt from 'bcryptjs';

async function createSheffieldTransport() {
  try {
    console.log('\n🔨 Creating Sheffield Transport tenant...\n');

    // Check if sheffieldtransport already exists
    const existing = await query(
      `SELECT tenant_id FROM tenants WHERE subdomain = $1`,
      ['sheffieldtransport']
    );

    if (existing.length > 0) {
      console.log('✅ Sheffield Transport tenant already exists (ID: ' + existing[0].tenant_id + ')');
      process.exit(0);
    }

    // Create tenant
    const tenant = await query(
      `INSERT INTO tenants (
        company_name, subdomain, domain, subscription_tier,
        contact_email, max_users, max_customers, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING tenant_id, company_name, subdomain`,
      [
        'Sheffield Transport Services',
        'sheffieldtransport',
        'sheffieldtransport.travelapp.co.uk',
        'enterprise',
        'admin@sheffieldtransport.co.uk',
        50,  // max users
        2000, // max customers
        true
      ]
    );

    const tenantId = tenant[0].tenant_id;
    console.log('✅ Created tenant:', tenant[0]);

    // Create admin user for this tenant
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const user = await query(
      `INSERT INTO tenant_users (
        tenant_id, username, password_hash, email, full_name, role, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING user_id, username, email, role`,
      [
        tenantId,
        'admin',
        hashedPassword,
        'admin@sheffieldtransport.co.uk',
        'Sheffield Admin',
        'admin',
        true
      ]
    );

    console.log('✅ Created admin user:', user[0]);
    console.log('\n🎉 Sheffield Transport tenant created successfully!');
    console.log('\nAccess details:');
    console.log(`  URL: http://sheffieldtransport.localhost:5174`);
    console.log(`  Username: admin`);
    console.log(`  Password: admin123`);
    console.log('\n⚠️  Remember to add to hosts file:');
    console.log(`  127.0.0.1  sheffieldtransport.localhost\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createSheffieldTransport();
