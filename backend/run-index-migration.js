/**
 * Run a migration file
 * Usage: node run-index-migration.js [migration-file]
 * Default: add-performance-indexes.sql
 * Example: node run-index-migration.js add-dual-service-architecture.sql
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const migrationFile = process.argv[2] || 'add-performance-indexes.sql';

  // Check multiple possible locations for migrations
  const possiblePaths = [
    path.join(__dirname, 'migrations', migrationFile),
    path.join(__dirname, 'src', 'migrations', migrationFile),
    path.join(__dirname, 'database', 'migrations', migrationFile),
    path.join(__dirname, migrationFile),
  ];

  let migrationPath = possiblePaths.find(p => fs.existsSync(p));

  if (!migrationPath) {
    console.log('❌ Migration file not found:', migrationFile);
    console.log('\nAvailable migrations:');

    // List all migration directories
    const migrationDirs = [
      path.join(__dirname, 'migrations'),
      path.join(__dirname, 'src', 'migrations'),
      path.join(__dirname, 'database', 'migrations'),
    ];

    for (const dir of migrationDirs) {
      if (fs.existsSync(dir)) {
        console.log(`\n${dir}:`);
        fs.readdirSync(dir)
          .filter(f => f.endsWith('.sql'))
          .sort()
          .forEach(m => console.log(`  - ${m}`));
      }
    }
    process.exit(1);
  }

  console.log(`Found: ${migrationPath}`);

  console.log(`🚀 Running migration: ${migrationFile}\n`);

  const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  };

  console.log(`Connecting to: ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}\n`);

  const pool = new Pool(poolConfig);

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Check if this is a simple index migration or complex migration with functions
    const hasComplexStatements = sql.includes('CREATE OR REPLACE FUNCTION') ||
                                  sql.includes('$$') ||
                                  sql.includes('LANGUAGE plpgsql');

    if (hasComplexStatements) {
      // Run complex migrations as a single statement (handles functions, triggers, etc.)
      console.log('Running as single transaction (complex migration with functions)...\n');

      try {
        await pool.query(sql);
        console.log('✅ Migration executed successfully!');
      } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.position) {
          const lines = sql.substring(0, parseInt(error.position)).split('\n');
          console.error(`   Error near line ${lines.length}`);
        }
        process.exit(1);
      }
    } else {
      // Split simple migrations by semicolons
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Found ${statements.length} SQL statements to execute\n`);

      let success = 0;
      let skipped = 0;
      let failed = 0;

      for (const statement of statements) {
        // Skip comments-only statements
        if (statement.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) {
          continue;
        }

        try {
          await pool.query(statement);

          // Extract object name for logging
          const match = statement.match(/CREATE\s+(?:TABLE|INDEX).*?IF NOT EXISTS\s+(\w+)/i) ||
                       statement.match(/ANALYZE\s+(\w+)/i) ||
                       statement.match(/COMMENT ON\s+\w+\s+(\w+)/i);

          if (match) {
            console.log(`  ✅ ${match[1]}`);
          } else {
            success++;
          }
          success++;
        } catch (error) {
          // Check if it's a "relation does not exist" error (table doesn't exist)
          if (error.code === '42P01') {
            const tableName = error.message.match(/relation "(.+?)"/)?.[1] || 'unknown';
            console.log(`  ⏭️  Skipped (table "${tableName}" doesn't exist)`);
            skipped++;
          }
          // Column does not exist
          else if (error.code === '42703') {
            console.log(`  ⏭️  Skipped (column doesn't exist)`);
            skipped++;
          }
          // Already exists (table, index, etc.)
          else if (error.code === '42P07' || error.code === '42710') {
            console.log(`  ⏭️  Already exists`);
            skipped++;
          }
          // Extension not available (pg_trgm)
          else if (error.code === '42704' || error.message.includes('trgm')) {
            console.log(`  ⏭️  Skipped (pg_trgm extension not available)`);
            skipped++;
          }
          else {
            console.log(`  ❌ Failed: ${error.message.substring(0, 80)}`);
            failed++;
          }
        }
      }

      console.log('\n📊 Migration Summary:');
      console.log(`   ✅ Success: ${success}`);
      console.log(`   ⏭️  Skipped: ${skipped}`);
      console.log(`   ❌ Failed: ${failed}`);
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
