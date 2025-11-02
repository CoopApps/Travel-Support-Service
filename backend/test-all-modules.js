const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TENANT_ID = 2;

let TOKEN = '';
let TEST_CUSTOMER_ID = null;
let CREATED_CUSTOMER_ID = null;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  log('\n===== AUTHENTICATION MODULE =====', 'cyan');
  log('\nTest: Login with valid credentials', 'yellow');

  try {
    const response = await axios.post(`${BASE_URL}/api/tenants/${TENANT_ID}/login`, {
      username: 'admin',
      password: 'admin123'
    });

    TOKEN = response.data.token;
    log('✅ PASS - Login successful', 'green');
    log(`   User: ${response.data.user.username} (${response.data.user.role})`, 'gray');
    log(`   Token: ${TOKEN.substring(0, 50)}...`, 'gray');
    return true;
  } catch (error) {
    log('❌ FAIL - Login failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function testCustomers() {
  log('\n===== CUSTOMER MODULE =====', 'cyan');

  const headers = { Authorization: `Bearer ${TOKEN}` };

  // Test 1: List customers
  log('\nTest 1: GET /api/tenants/:id/customers - List all customers', 'yellow');
  try {
    const response = await axios.get(`${BASE_URL}/api/tenants/${TENANT_ID}/customers`, { headers });

    // Check if response has a data wrapper
    const customers = response.data.data || response.data;
    const total = response.data.total || customers.length;

    log(`✅ PASS - Retrieved ${total} customers`, 'green');
    if (customers.length > 0) {
      TEST_CUSTOMER_ID = customers[0].customer_id;
      log(`   Sample: ${customers[0].name}`, 'gray');
    } else {
      log(`   No customers found - this is normal for a new tenant`, 'gray');
    }
  } catch (error) {
    log(`❌ FAIL - ${error.response?.data?.error?.message || error.message}`, 'red');
  }

  // Test 2: Get specific customer
  if (TEST_CUSTOMER_ID) {
    log(`\nTest 2: GET /api/tenants/:id/customers/${TEST_CUSTOMER_ID} - Get specific customer`, 'yellow');
    try {
      const response = await axios.get(`${BASE_URL}/api/tenants/${TENANT_ID}/customers/${TEST_CUSTOMER_ID}`, { headers });
      const customer = response.data;

      log('✅ PASS - Retrieved customer details', 'green');
      log(`   Name: ${customer.name}`, 'gray');
      log(`   Email: ${customer.email || 'N/A'}`, 'gray');
    } catch (error) {
      log(`❌ FAIL - ${error.response?.data?.error?.message || error.message}`, 'red');
    }
  }

  // Test 3: Create customer
  log('\nTest 3: POST /api/tenants/:id/customers - Create new customer', 'yellow');
  try {
    const response = await axios.post(`${BASE_URL}/api/tenants/${TENANT_ID}/customers`, {
      name: 'Test Customer',
      email: 'test.customer@example.com',
      phone: '+44 123 456 7890',
      address: '123 Test Street',
      city: 'Sheffield',
      postcode: 'S1 1AA'
    }, { headers });

    CREATED_CUSTOMER_ID = response.data.customer_id;
    log('✅ PASS - Customer created successfully', 'green');
    log(`   ID: ${CREATED_CUSTOMER_ID}`, 'gray');
  } catch (error) {
    log(`❌ FAIL - ${error.response?.data?.error?.message || error.message}`, 'red');
  }

  // Test 4: Update customer
  if (CREATED_CUSTOMER_ID) {
    log(`\nTest 4: PUT /api/tenants/:id/customers/${CREATED_CUSTOMER_ID} - Update customer`, 'yellow');
    try {
      const response = await axios.put(`${BASE_URL}/api/tenants/${TENANT_ID}/customers/${CREATED_CUSTOMER_ID}`, {
        phone: '+44 999 888 7777'
      }, { headers });

      log('✅ PASS - Customer updated successfully', 'green');
      log(`   New phone: ${response.data.phone}`, 'gray');
    } catch (error) {
      log(`❌ FAIL - ${error.response?.data?.error?.message || error.message}`, 'red');
    }
  }

  // Test 5: Delete customer
  if (CREATED_CUSTOMER_ID) {
    log(`\nTest 5: DELETE /api/tenants/:id/customers/${CREATED_CUSTOMER_ID} - Delete customer`, 'yellow');
    try {
      await axios.delete(`${BASE_URL}/api/tenants/${TENANT_ID}/customers/${CREATED_CUSTOMER_ID}`, { headers });
      log('✅ PASS - Customer deleted successfully', 'green');
    } catch (error) {
      log(`❌ FAIL - ${error.response?.data?.error?.message || error.message}`, 'red');
    }
  }

  // Test 6: Validation
  log('\nTest 6: Create customer with missing required fields (should fail)', 'yellow');
  try {
    await axios.post(`${BASE_URL}/api/tenants/${TENANT_ID}/customers`, {
      email: 'incomplete@example.com'
      // Missing first_name and last_name
    }, { headers });
    log('❌ FAIL - Should have rejected invalid data', 'red');
  } catch (error) {
    if (error.response?.status === 400) {
      log('✅ PASS - Correctly validated required fields', 'green');
    } else {
      log(`⚠️  WARNING - Unexpected error: ${error.message}`, 'yellow');
    }
  }

  // Test 7: Non-existent customer
  log('\nTest 7: Get non-existent customer (should return 404)', 'yellow');
  try {
    await axios.get(`${BASE_URL}/api/tenants/${TENANT_ID}/customers/999999`, { headers });
    log('❌ FAIL - Should have returned 404', 'red');
  } catch (error) {
    if (error.response?.status === 404) {
      log('✅ PASS - Correctly returned 404', 'green');
    } else {
      log(`⚠️  WARNING - Unexpected error: ${error.message}`, 'yellow');
    }
  }
}

async function runTests() {
  log('\n========================================', 'cyan');
  log('  TRAVEL SUPPORT APP - MODULE TESTING', 'cyan');
  log('========================================\n', 'cyan');

  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n❌ Cannot continue without authentication', 'red');
    return;
  }

  await testCustomers();

  log('\n========================================', 'cyan');
  log('  TESTING COMPLETE', 'cyan');
  log('========================================\n', 'cyan');
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
