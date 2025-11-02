// Test Stage 2 authentication endpoints
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const TENANT_ID = 1; // Change this if your tenant ID is different

async function testStage2() {
  console.log('=== Stage 2: Authentication Test ===\n');

  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const health = await axios.get('http://localhost:3001/health');
    console.log('✅ Health check passed:', health.data);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('\n💡 Is the server running? Start it with: npm run dev\n');
    return;
  }

  // Test 2: Login with valid credentials
  console.log('\n2. Testing login...');
  console.log('   Using credentials from your database');
  console.log('   Email: (you need to provide one)');
  console.log('   Password: (you need to provide one)\n');

  // You need to replace these with actual credentials from your database
  const loginData = {
    email: 'admin@example.com', // ← Change this
    password: 'password123',     // ← Change this
  };

  try {
    const response = await axios.post(`${BASE_URL}/tenants/${TENANT_ID}/login`, loginData);
    console.log('✅ Login successful!');
    console.log('   User:', response.data.user);
    console.log('   Token:', response.data.token.substring(0, 20) + '...');

    // Test 3: Verify token
    console.log('\n3. Testing token verification...');
    const verifyResponse = await axios.get(`${BASE_URL}/tenants/${TENANT_ID}/verify`, {
      headers: {
        Authorization: `Bearer ${response.data.token}`,
      },
    });
    console.log('✅ Token verification passed!');
    console.log('   Valid:', verifyResponse.data.valid);

    // Test 4: Logout
    console.log('\n4. Testing logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/tenants/${TENANT_ID}/logout`, {}, {
      headers: {
        Authorization: `Bearer ${response.data.token}`,
      },
    });
    console.log('✅ Logout successful:', logoutResponse.data.message);

    console.log('\n🎉 All Stage 2 tests passed!');
  } catch (error) {
    if (error.response) {
      console.error('❌ Request failed:');
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data.error);

      if (error.response.status === 401) {
        console.log('\n💡 Suggestion: Check your email and password in test-auth.js');
        console.log('   Make sure the user exists in tenant_users table for tenant_id =', TENANT_ID);
      }
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testStage2();
