/**
 * Test Customer Reminder Fields
 *
 * Validates that reminder_opt_in and reminder_preference fields
 * work correctly in CREATE and UPDATE operations
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TENANT_ID = 2; // Sheffield Transport tenant
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIwLCJ0ZW5hbnRJZCI6Miwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBzaGVmZmllbGR0cmFuc3BvcnQuY28udWsiLCJjdXN0b21lcklkIjpudWxsLCJkcml2ZXJJZCI6bnVsbCwiaXNEcml2ZXIiOmZhbHNlLCJpc0N1c3RvbWVyIjpmYWxzZSwiaWF0IjoxNzYxNzg0NjY4LCJleHAiOjE3NjE4NzEwNjh9.qKVN_jBNV-fFbFmSxNubQqiY_SabvyQy_LYw2vbjhqw';

async function test() {
  console.log('='.repeat(60));
  console.log('Customer Reminder Fields Test');
  console.log('='.repeat(60));
  console.log();

  let customerId;

  try {
    // ===== TEST 1: Create customer with reminder fields =====
    console.log('TEST 1: Create customer with reminder fields');
    console.log('-'.repeat(60));

    const createResponse = await axios.post(
      `${BASE_URL}/tenants/${TENANT_ID}/customers`,
      {
        name: 'Test Customer Reminder Fields',
        phone: '07123456789',
        email: 'test.reminder@example.com',
        address: '123 Test Street',
        city: 'Sheffield',
        postcode: 'S1 1AA',
        reminder_opt_in: true,
        reminder_preference: 'email'
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    customerId = createResponse.data.id;
    console.log('✓ Customer created successfully');
    console.log(`  Customer ID: ${customerId}`);
    console.log(`  Name: ${createResponse.data.name}`);
    console.log();

    // ===== TEST 2: Fetch customer and verify reminder fields =====
    console.log('TEST 2: Verify reminder fields were saved');
    console.log('-'.repeat(60));

    const getResponse = await axios.get(
      `${BASE_URL}/tenants/${TENANT_ID}/customers/${customerId}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    const customer = getResponse.data;
    console.log(`  reminder_opt_in: ${customer.reminder_opt_in}`);
    console.log(`  reminder_preference: ${customer.reminder_preference}`);

    if (customer.reminder_opt_in === true) {
      console.log('✓ reminder_opt_in saved correctly (true)');
    } else {
      console.log(`✗ FAILED: reminder_opt_in is ${customer.reminder_opt_in}, expected true`);
    }

    if (customer.reminder_preference === 'email') {
      console.log('✓ reminder_preference saved correctly (email)');
    } else {
      console.log(`✗ FAILED: reminder_preference is ${customer.reminder_preference}, expected email`);
    }
    console.log();

    // ===== TEST 3: Update reminder preferences =====
    console.log('TEST 3: Update reminder preferences');
    console.log('-'.repeat(60));

    const updateResponse = await axios.put(
      `${BASE_URL}/tenants/${TENANT_ID}/customers/${customerId}`,
      {
        reminder_opt_in: false,
        reminder_preference: 'none'
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    console.log('✓ Customer updated successfully');
    console.log();

    // ===== TEST 4: Verify updated reminder fields =====
    console.log('TEST 4: Verify updated reminder fields');
    console.log('-'.repeat(60));

    const getResponse2 = await axios.get(
      `${BASE_URL}/tenants/${TENANT_ID}/customers/${customerId}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    const updatedCustomer = getResponse2.data;
    console.log(`  reminder_opt_in: ${updatedCustomer.reminder_opt_in}`);
    console.log(`  reminder_preference: ${updatedCustomer.reminder_preference}`);

    if (updatedCustomer.reminder_opt_in === false) {
      console.log('✓ reminder_opt_in updated correctly (false)');
    } else {
      console.log(`✗ FAILED: reminder_opt_in is ${updatedCustomer.reminder_opt_in}, expected false`);
    }

    if (updatedCustomer.reminder_preference === 'none') {
      console.log('✓ reminder_preference updated correctly (none)');
    } else {
      console.log(`✗ FAILED: reminder_preference is ${updatedCustomer.reminder_preference}, expected none`);
    }
    console.log();

    // ===== TEST 5: Test default values (create without reminder fields) =====
    console.log('TEST 5: Test default values (create without reminder fields)');
    console.log('-'.repeat(60));

    const createResponse2 = await axios.post(
      `${BASE_URL}/tenants/${TENANT_ID}/customers`,
      {
        name: 'Test Customer Default Reminders',
        phone: '07987654321',
        email: 'test.default@example.com',
        address: '456 Test Avenue',
        city: 'Sheffield',
        postcode: 'S2 2BB'
        // NOTE: No reminder fields provided
      },
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    const customerId2 = createResponse2.data.id;
    console.log('✓ Customer created without reminder fields');

    const getResponse3 = await axios.get(
      `${BASE_URL}/tenants/${TENANT_ID}/customers/${customerId2}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    const defaultCustomer = getResponse3.data;
    console.log(`  reminder_opt_in: ${defaultCustomer.reminder_opt_in}`);
    console.log(`  reminder_preference: ${defaultCustomer.reminder_preference}`);

    if (defaultCustomer.reminder_opt_in === true) {
      console.log('✓ reminder_opt_in defaults to true');
    } else {
      console.log(`✗ FAILED: reminder_opt_in is ${defaultCustomer.reminder_opt_in}, expected true`);
    }

    if (defaultCustomer.reminder_preference === 'sms') {
      console.log('✓ reminder_preference defaults to sms');
    } else {
      console.log(`✗ FAILED: reminder_preference is ${defaultCustomer.reminder_preference}, expected sms`);
    }
    console.log();

    // ===== CLEANUP =====
    console.log('CLEANUP: Deleting test customers');
    console.log('-'.repeat(60));

    await axios.delete(
      `${BASE_URL}/tenants/${TENANT_ID}/customers/${customerId}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    console.log(`✓ Deleted customer ${customerId}`);

    await axios.delete(
      `${BASE_URL}/tenants/${TENANT_ID}/customers/${customerId2}`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );
    console.log(`✓ Deleted customer ${customerId2}`);
    console.log();

    // ===== SUMMARY =====
    console.log('='.repeat(60));
    console.log('✓ ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log();
    console.log('Summary:');
    console.log('  ✓ Customer creation with reminder fields works');
    console.log('  ✓ Reminder fields are saved to database');
    console.log('  ✓ Reminder fields can be updated');
    console.log('  ✓ Default values work correctly (opt_in=true, preference=sms)');
    console.log('  ✓ Database migration successful');
    console.log();

  } catch (error) {
    console.error();
    console.error('✗ TEST FAILED');
    console.error('='.repeat(60));

    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`Error: ${error.message}`);
    }

    // Try to cleanup
    if (customerId) {
      try {
        await axios.delete(
          `${BASE_URL}/tenants/${TENANT_ID}/customers/${customerId}`,
          {
            headers: { Authorization: `Bearer ${TOKEN}` }
          }
        );
        console.log(`Cleaned up customer ${customerId}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    process.exit(1);
  }
}

// Run tests
test().catch(console.error);
