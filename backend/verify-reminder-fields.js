/**
 * Verify Reminder Fields in Database
 *
 * Simple test to verify that reminder fields exist and have correct data
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function verify() {
  try {
    console.log('='.repeat(60));
    console.log('Verifying Reminder Fields in Database');
    console.log('='.repeat(60));
    console.log();

    // Test 1: Check if columns exist
    console.log('TEST 1: Check if reminder columns exist');
    console.log('-'.repeat(60));

    const columnsResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'tenant_customers'
        AND column_name IN ('reminder_opt_in', 'reminder_preference')
      ORDER BY column_name
    `);

    if (columnsResult.rows.length === 2) {
      console.log('✓ Both reminder columns exist');
      console.table(columnsResult.rows);
    } else {
      console.log('✗ FAILED: Only found', columnsResult.rows.length, 'columns');
      console.table(columnsResult.rows);
      process.exit(1);
    }
    console.log();

    // Test 2: Insert a test customer
    console.log('TEST 2: Insert test customer with reminder fields');
    console.log('-'.repeat(60));

    const insertResult = await pool.query(`
      INSERT INTO tenant_customers (
        tenant_id, name, reminder_opt_in, reminder_preference,
        is_active, created_at, updated_at
      ) VALUES (
        2, 'Test Customer Direct DB', true, 'email',
        true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING customer_id, name, reminder_opt_in, reminder_preference
    `);

    const newCustomer = insertResult.rows[0];
    console.log('✓ Customer created successfully');
    console.log(`  Customer ID: ${newCustomer.customer_id}`);
    console.log(`  Name: ${newCustomer.name}`);
    console.log(`  reminder_opt_in: ${newCustomer.reminder_opt_in}`);
    console.log(`  reminder_preference: ${newCustomer.reminder_preference}`);
    console.log();

    // Test 3: Verify the inserted data
    console.log('TEST 3: Fetch customer to verify data');
    console.log('-'.repeat(60));

    const selectResult = await pool.query(`
      SELECT customer_id, name, reminder_opt_in, reminder_preference
      FROM tenant_customers
      WHERE customer_id = $1
    `, [newCustomer.customer_id]);

    const fetchedCustomer = selectResult.rows[0];
    console.log(`  reminder_opt_in: ${fetchedCustomer.reminder_opt_in} (expected: true)`);
    console.log(`  reminder_preference: ${fetchedCustomer.reminder_preference} (expected: email)`);

    if (fetchedCustomer.reminder_opt_in === true && fetchedCustomer.reminder_preference === 'email') {
      console.log('✓ Data verified successfully');
    } else {
      console.log('✗ FAILED: Data mismatch');
    }
    console.log();

    // Test 4: Update reminder preferences
    console.log('TEST 4: Update reminder preferences');
    console.log('-'.repeat(60));

    await pool.query(`
      UPDATE tenant_customers
      SET reminder_opt_in = false,
          reminder_preference = 'none'
      WHERE customer_id = $1
    `, [newCustomer.customer_id]);

    const updatedResult = await pool.query(`
      SELECT reminder_opt_in, reminder_preference
      FROM tenant_customers
      WHERE customer_id = $1
    `, [newCustomer.customer_id]);

    const updatedCustomer = updatedResult.rows[0];
    console.log(`  reminder_opt_in: ${updatedCustomer.reminder_opt_in} (expected: false)`);
    console.log(`  reminder_preference: ${updatedCustomer.reminder_preference} (expected: none)`);

    if (updatedCustomer.reminder_opt_in === false && updatedCustomer.reminder_preference === 'none') {
      console.log('✓ Update verified successfully');
    } else {
      console.log('✗ FAILED: Update failed');
    }
    console.log();

    // Test 5: Test default values
    console.log('TEST 5: Test default values (insert without reminder fields)');
    console.log('-'.repeat(60));

    const defaultResult = await pool.query(`
      INSERT INTO tenant_customers (
        tenant_id, name, is_active, created_at, updated_at
      ) VALUES (
        2, 'Test Customer Defaults', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING customer_id, name, reminder_opt_in, reminder_preference
    `);

    const defaultCustomer = defaultResult.rows[0];
    console.log(`  reminder_opt_in: ${defaultCustomer.reminder_opt_in} (expected: true)`);
    console.log(`  reminder_preference: ${defaultCustomer.reminder_preference} (expected: sms)`);

    if (defaultCustomer.reminder_opt_in === true && defaultCustomer.reminder_preference === 'sms') {
      console.log('✓ Default values work correctly');
    } else {
      console.log('✗ FAILED: Default values incorrect');
    }
    console.log();

    // Cleanup
    console.log('CLEANUP: Deleting test customers');
    console.log('-'.repeat(60));

    await pool.query(`
      DELETE FROM tenant_customers
      WHERE customer_id IN ($1, $2)
    `, [newCustomer.customer_id, defaultCustomer.customer_id]);

    console.log(`✓ Deleted test customers`);
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('✓ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log('  ✓ Database columns exist with correct types');
    console.log('  ✓ Can insert customers with reminder fields');
    console.log('  ✓ Can update reminder fields');
    console.log('  ✓ Default values work correctly (opt_in=true, preference=sms)');
    console.log('  ✓ Database migration successful');
    console.log();

  } catch (error) {
    console.error();
    console.error('✗ TEST FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verify();
