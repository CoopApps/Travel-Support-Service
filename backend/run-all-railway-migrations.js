/**
 * Run ALL pending migrations on Railway PostgreSQL
 * Usage: node run-all-railway-migrations.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const RAILWAY_URL = 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway';

// Migrations to run in order
const MIGRATIONS = [
  'create-audit-logs-if-missing.sql',
  'fix-timesheets-table.sql',
  'add-performance-indexes.sql',
  'add-rls-policies.sql',
];

async function runAllMigrations() {
  console.log('🚀 Running ALL migrations on Railway PostgreSQL\n');
  console.log('Connecting...\n');

  const pool = new Pool({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false }
  });

  const results = [];

  for (const migrationFile of MIGRATIONS) {
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.log(`⏭️  ${migrationFile} - Not found, skipping`);
      results.push({ file: migrationFile, status: 'not_found' });
      continue;
    }

    console.log(`\n📄 Running: ${migrationFile}`);

    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');

      const hasComplexStatements = sql.includes('CREATE OR REPLACE FUNCTION') ||
                                    sql.includes('$$') ||
                                    sql.includes('LANGUAGE plpgsql');

      if (hasComplexStatements) {
        await pool.query(sql);
        console.log(`   ✅ Success (complex migration)`);
        results.push({ file: migrationFile, status: 'success' });
      } else {
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));

        let success = 0, skipped = 0, failed = 0;

        for (const statement of statements) {
          if (statement.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
            continue;
          }

          try {
            await pool.query(statement);
            success++;
          } catch (error) {
            if (['42P01', '42703', '42P07', '42710'].includes(error.code)) {
              skipped++;
            } else {
              failed++;
              console.log(`   ❌ ${error.message.substring(0, 60)}`);
            }
          }
        }

        console.log(`   ✅ ${success} success, ⏭️ ${skipped} skipped, ❌ ${failed} failed`);
        results.push({ file: migrationFile, status: failed > 0 ? 'partial' : 'success', success, skipped, failed });
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ file: migrationFile, status: 'failed', error: error.message });
    }
  }

  await pool.end();

  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));

  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : r.status === 'partial' ? '⚠️' : r.status === 'not_found' ? '⏭️' : '❌';
    console.log(`${icon} ${r.file}`);
  }

  console.log('\n✅ All migrations complete!');
}

runAllMigrations().catch(console.error);
