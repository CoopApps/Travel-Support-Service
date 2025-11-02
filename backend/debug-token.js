const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Debug script to decode a JWT token and see what's inside
 *
 * Usage:
 * 1. Copy the token from browser localStorage
 * 2. Run: node debug-token.js YOUR_TOKEN_HERE
 */

const token = process.argv[2];

if (!token) {
  console.log('\n❌ No token provided!');
  console.log('\nUsage: node debug-token.js YOUR_TOKEN_HERE');
  console.log('\nTo get your token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Type: localStorage.getItem("auth-storage")');
  console.log('4. Copy the "token" value from the JSON');
  console.log('5. Run this script with that token\n');
  process.exit(1);
}

try {
  console.log('\n🔍 Decoding JWT token...\n');

  // Decode without verification (to see contents)
  const decoded = jwt.decode(token);
  console.log('Token contents (decoded):');
  console.log(JSON.stringify(decoded, null, 2));

  console.log('\n🔐 Verifying signature...\n');

  // Verify with secret
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ Token signature is VALID');
  console.log('\nVerified payload:');
  console.log(JSON.stringify(verified, null, 2));

  console.log('\n📋 Summary:');
  console.log('===========');
  console.log(`User ID: ${verified.userId}`);
  console.log(`Tenant ID: ${verified.tenantId}`);
  console.log(`Role: ${verified.role}`);
  console.log(`Email: ${verified.email || 'N/A'}`);

  if (verified.exp) {
    const expDate = new Date(verified.exp * 1000);
    console.log(`Expires: ${expDate.toLocaleString()}`);
  }

  console.log('\n⚠️  Important:');
  console.log(`Your token has tenantId = ${verified.tenantId}`);
  console.log('Make sure you are requesting data for this same tenant ID!');
  console.log('If you request /api/tenants/4/customers but your token has tenantId=1,');
  console.log('you will get a 403 Forbidden error.\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);

  if (error.name === 'JsonWebTokenError') {
    console.log('\nThe token is invalid or malformed.');
  } else if (error.name === 'TokenExpiredError') {
    console.log('\nThe token has expired. Log in again to get a new token.');
  } else {
    console.log('\nMake sure JWT_SECRET in .env matches the one used to create the token.');
  }
  console.log();
}
