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

async function updateCustomerPayments() {
  try {
    console.log('\n💰 Updating customer payment configurations...\n');

    // Get all customers for demo tenant
    const customers = await pool.query(
      'SELECT customer_id, name FROM tenant_customers WHERE tenant_id = $1',
      [TENANT_ID]
    );

    let selfPayCount = 0;
    let splitPayCount = 0;

    for (let i = 0; i < customers.rows.length; i++) {
      const customer = customers.rows[i];
      const isSplitPay = i % 3 === 0; // Every 3rd customer has split payment

      if (isSplitPay) {
        // Split payment customer
        const customerPercent = 20 + Math.floor(Math.random() * 50); // 20-70%
        const orgPercent = 100 - customerPercent;

        const paymentSplit = {
          customer_percentage: customerPercent,
          organization_percentage: orgPercent
        };

        // Provider split (could be across multiple providers)
        const providerSplit = {
          provider1: 100  // Single provider gets 100% of organization's portion
        };

        await pool.query(`
          UPDATE tenant_customers
          SET
            has_split_payment = true,
            payment_split = $1,
            provider_split = $2,
            paying_org = 'Local Health Authority',
            updated_at = NOW()
          WHERE customer_id = $3 AND tenant_id = $4
        `, [JSON.stringify(paymentSplit), JSON.stringify(providerSplit), customer.customer_id, TENANT_ID]);

        splitPayCount++;
        console.log(`✓ ${customer.name}: Split ${customerPercent}% customer / ${orgPercent}% org`);
      } else {
        // Self-pay customer
        await pool.query(`
          UPDATE tenant_customers
          SET
            has_split_payment = false,
            payment_split = NULL,
            paying_org = NULL,
            updated_at = NOW()
          WHERE customer_id = $1 AND tenant_id = $2
        `, [customer.customer_id, TENANT_ID]);

        selfPayCount++;
        console.log(`✓ ${customer.name}: Self-pay (100%)`);
      }
    }

    console.log(`\n📊 Payment Configuration Summary:`);
    console.log(`   Self-pay customers: ${selfPayCount}`);
    console.log(`   Split payment customers: ${splitPayCount}`);
    console.log(`   Total updated: ${customers.rows.length}`);

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

updateCustomerPayments();
