/**
 * Export complete schema from your LOCAL working database
 * This will dump the EXACT schema your app needs
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📤 Exporting complete schema from your local database...\n');

// Check if .env exists locally
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ No .env file found in backend folder');
  console.log('\n💡 Do you have a local PostgreSQL database with the complete schema?');
  console.log('   If yes, please provide the connection details:\n');
  console.log('   DB_HOST=localhost');
  console.log('   DB_PORT=5432');
  console.log('   DB_NAME=your_database_name');
  console.log('   DB_USER=postgres');
  console.log('   DB_PASSWORD=your_password');
  process.exit(1);
}

require('dotenv').config({ path: envPath });

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';

if (!dbName || !dbUser) {
  console.log('❌ Missing DB_NAME or DB_USER in .env file');
  process.exit(1);
}

console.log(`Exporting from: ${dbUser}@${dbHost}:${dbPort}/${dbName}\n`);

const outputFile = path.join(__dirname, 'complete-schema-export.sql');
const command = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --schema-only --no-owner --no-privileges -f "${outputFile}"`;

console.log('Running pg_dump...\n');

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure pg_dump is installed and in your PATH');
    console.error('   Or tell me: Do you have access to your local database?');
    return;
  }

  if (stderr) {
    console.error('Warnings:', stderr);
  }

  console.log('✅ Schema exported successfully!');
  console.log(`📄 File: ${outputFile}\n`);
  console.log('Now I can use this to create the exact schema on Railway!');
});
