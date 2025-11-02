import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { pool } from './src/config/database';

// Load environment variables
dotenv.config();

async function runMigration() {
  console.log('🔄 Running payroll migration...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', 'create-payroll-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📖 Migration file loaded');

    // Get a client from the pool
    const client = await pool.connect();

    try {
      // Execute the migration
      await client.query(migrationSQL);
      console.log('✅ Payroll migration completed successfully!');
      console.log('Created tables:');
      console.log('  - tenant_payroll_periods');
      console.log('  - tenant_payroll_records');
      console.log('  - tenant_freelance_submissions');
      console.log('  - tenant_payroll_movements');
      console.log('Updated tables:');
      console.log('  - tenant_drivers (added payroll fields)');
    } catch (error: any) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migration
runMigration();
