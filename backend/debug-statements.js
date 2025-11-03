const fs = require('fs');

const schema = fs.readFileSync('complete-schema-export.sql', 'utf8');

const statements = schema
  .split(';')
  .map(s => {
    // Remove comment lines from the beginning
    const lines = s.split('\n');
    const nonCommentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith('--');
    });
    return nonCommentLines.join('\n').trim();
  })
  .filter(s => s.length > 0);

console.log('Total statements:', statements.length);
console.log('\nFirst 5 statements:');
statements.slice(0, 5).forEach((s, i) => {
  const preview = s.substring(0, 100).replace(/\n/g, ' ');
  console.log(`${i + 1}. ${preview}...`);
});

// Count CREATE TABLE statements
const createTableStmts = statements.filter(s => s.includes('CREATE TABLE'));
console.log(`\nCREATE TABLE statements: ${createTableStmts.length}`);

// Check first CREATE TABLE
const firstTable = createTableStmts[0];
if (firstTable) {
  console.log('\nFirst CREATE TABLE statement:');
  console.log(firstTable.substring(0, 300));
}
