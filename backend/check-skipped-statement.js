/**
 * Check which statement was skipped during import
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function checkSkippedStatement() {
  const client = new Client({
    connectionString: 'postgresql://postgres:cDSLDmLIfgMCWeqBWNnvAhcMXWQmwgvi@hopper.proxy.rlwy.net:55001/railway',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database\n');

    const schemaFile = path.join(__dirname, 'complete-schema-export.sql');
    const schema = fs.readFileSync(schemaFile, 'utf8');

    // Parse statements the same way as the import script
    const statements = schema
      .split(';')
      .map(s => {
        const lines = s.split('\n');
        const nonCommentLines = lines.filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 0 && !trimmed.startsWith('--');
        });
        return nonCommentLines.join('\n').trim();
      })
      .filter(s => s.length > 0);

    console.log(`Total statements to process: ${statements.length}\n`);

    let successCount = 0;
    let skippedStatements = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';

      try {
        await client.query(stmt);
        successCount++;
      } catch (error) {
        skippedStatements.push({
          index: i,
          statement: stmt.substring(0, 200),
          error: error.message
        });
      }
    }

    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Skipped: ${skippedStatements.length}\n`);

    if (skippedStatements.length > 0) {
      console.log('Skipped statements:\n');
      skippedStatements.forEach((s, idx) => {
        console.log(`${idx + 1}. Statement #${s.index}:`);
        console.log(`   Preview: ${s.statement}...`);
        console.log(`   Error: ${s.error}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSkippedStatement();
