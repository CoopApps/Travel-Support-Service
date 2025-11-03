/**
 * Export complete schema using Node.js pg library
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function exportSchema() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'travel_support_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('✅ Connected to local database\n');

    console.log('📋 Extracting complete schema...\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.table_name}`);
    });

    // Get complete schema DDL
    let schemaDDL = '-- Complete Database Schema Export\n';
    schemaDDL += `-- Exported from: ${process.env.DB_NAME}\n`;
    schemaDDL += `-- Date: ${new Date().toISOString()}\n\n`;

    // Get all sequences first
    console.log('\n📊 Exporting sequences...');
    const sequencesResult = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      WHERE sequence_schema = 'public'
      ORDER BY sequence_name;
    `);

    if (sequencesResult.rows.length > 0) {
      schemaDDL += '-- ============================================\n';
      schemaDDL += '-- SEQUENCES\n';
      schemaDDL += '-- ============================================\n\n';

      for (const seq of sequencesResult.rows) {
        const seqName = seq.sequence_name;
        const seqInfo = await client.query(`
          SELECT * FROM ${seqName}
        `);
        schemaDDL += `CREATE SEQUENCE IF NOT EXISTS ${seqName};\n`;
      }
      schemaDDL += '\n';
      console.log(`✅ Exported ${sequencesResult.rows.length} sequences\n`);
    }

    schemaDDL += '-- ============================================\n';
    schemaDDL += '-- TABLES (without foreign keys)\n';
    schemaDDL += '-- ============================================\n\n';

    // Store foreign keys to add later
    const allForeignKeys = [];

    // Get CREATE TABLE statements for each table
    for (const table of tablesResult.rows) {
      const tableName = table.table_name;

      console.log(`\n📄 Exporting table: ${tableName}...`);

      // Get columns
      const columnsResult = await client.query(`
        SELECT
          column_name,
          data_type,
          udt_name,
          character_maximum_length,
          column_default,
          is_nullable,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      // Get constraints
      const constraintsResult = await client.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints AS tc
        LEFT JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        LEFT JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name = $1;
      `, [tableName]);

      // Get indexes
      const indexesResult = await client.query(`
        SELECT
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = $1
        AND indexname NOT LIKE '%_pkey';
      `, [tableName]);

      // Build CREATE TABLE statement
      schemaDDL += `\n-- Table: ${tableName}\n`;
      schemaDDL += `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;

      const columnDefs = columnsResult.rows.map(col => {
        let def = `  ${col.column_name} `;

        // Data type
        if (col.data_type === 'character varying') {
          def += `VARCHAR(${col.character_maximum_length || 255})`;
        } else if (col.data_type === 'numeric') {
          def += `DECIMAL(${col.numeric_precision},${col.numeric_scale})`;
        } else if (col.data_type === 'timestamp without time zone') {
          def += 'TIMESTAMP';
        } else if (col.data_type === 'ARRAY') {
          // Handle arrays - convert _int4 to INTEGER[], _text to TEXT[], etc.
          const udtName = col.udt_name;
          if (udtName === '_int4' || udtName === '_int2' || udtName === '_int8') {
            def += 'INTEGER[]';
          } else if (udtName === '_text' || udtName === '_varchar') {
            def += 'TEXT[]';
          } else if (udtName === '_numeric') {
            def += 'DECIMAL[]';
          } else {
            def += 'TEXT[]';  // Default fallback
          }
        } else if (col.data_type === 'USER-DEFINED') {
          def += col.udt_name;
        } else {
          def += col.data_type.toUpperCase();
        }

        // Default
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }

        // Nullable
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }

        return def;
      });

      // Add primary key
      const pkConstraints = constraintsResult.rows.filter(c => c.constraint_type === 'PRIMARY KEY');
      if (pkConstraints.length > 0) {
        const pkColumns = pkConstraints.map(c => c.column_name).join(', ');
        columnDefs.push(`  PRIMARY KEY (${pkColumns})`);
      }

      // Store foreign keys to add later (don't add them inline)
      const fkConstraints = {};
      constraintsResult.rows
        .filter(c => c.constraint_type === 'FOREIGN KEY')
        .forEach(c => {
          if (!fkConstraints[c.constraint_name]) {
            fkConstraints[c.constraint_name] = c;
          }
        });

      Object.values(fkConstraints).forEach(fk => {
        let fkDef = `ALTER TABLE ${tableName} ADD FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name})`;
        if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') {
          fkDef += ` ON DELETE ${fk.delete_rule}`;
        }
        if (fk.update_rule && fk.update_rule !== 'NO ACTION') {
          fkDef += ` ON UPDATE ${fk.update_rule}`;
        }
        fkDef += ';';
        allForeignKeys.push(fkDef);
      });

      // Add unique constraints
      const uniqueConstraints = {};
      constraintsResult.rows
        .filter(c => c.constraint_type === 'UNIQUE')
        .forEach(c => {
          if (!uniqueConstraints[c.constraint_name]) {
            uniqueConstraints[c.constraint_name] = new Set();
          }
          if (c.column_name) {  // Only add if column_name exists
            uniqueConstraints[c.constraint_name].add(c.column_name);
          }
        });

      Object.entries(uniqueConstraints).forEach(([name, columns]) => {
        const columnList = Array.from(columns);
        if (columnList.length > 0) {
          columnDefs.push(`  UNIQUE (${columnList.join(', ')})`);
        }
      });

      schemaDDL += columnDefs.join(',\n');
      schemaDDL += '\n);\n';

      // Add indexes (skip unique constraint indexes - they're auto-created)
      indexesResult.rows.forEach(idx => {
        // Skip indexes that are created by UNIQUE constraints (end with _key)
        if (!idx.indexname.endsWith('_key')) {
          schemaDDL += `${idx.indexdef};\n`;
        }
      });
    }

    // Add all foreign keys after all tables are created
    if (allForeignKeys.length > 0) {
      schemaDDL += '\n-- ============================================\n';
      schemaDDL += '-- FOREIGN KEYS (added after all tables exist)\n';
      schemaDDL += '-- ============================================\n\n';

      console.log(`\n🔗 Adding ${allForeignKeys.length} foreign key constraints...`);
      allForeignKeys.forEach(fk => {
        schemaDDL += fk + '\n';
      });
    }

    // Save to file
    const outputFile = path.join(__dirname, 'complete-schema-export.sql');
    fs.writeFileSync(outputFile, schemaDDL);

    console.log('\n' + '='.repeat(60));
    console.log('✅ SCHEMA EXPORTED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📄 File: ${outputFile}`);
    console.log(`📊 Size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
    console.log(`📋 Tables: ${tablesResult.rows.length}`);
    console.log('\n✅ Now I can use this to create the exact schema on Railway!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

exportSchema();
