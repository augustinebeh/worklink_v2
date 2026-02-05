/**
 * Remove Debug Statements
 * Removes lines with just "bug" that are debug statements
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'websocket/messaging/message-router.js',
  'websocket/features/chat-features.js',
  'websocket/features/status-notifications.js'
];

const stats = {
  filesProcessed: 0,
  linesRemoved: 0
};

function removeDebugStatements(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  console.log(`\n📄 Processing: ${filePath}`);
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  const originalLineCount = lines.length;
  
  // Remove lines that are just "bug" (with optional whitespace)
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    if (trimmed === 'bug') {
      console.log(`  ❌ Removing debug line: "${line}"`);
      stats.linesRemoved++;
      return false;
    }
    return true;
  });
  
  if (filteredLines.length < originalLineCount) {
    fs.writeFileSync(fullPath, filteredLines.join('\n'), 'utf8');
    stats.filesProcessed++;
    console.log(`  ✅ Removed ${originalLineCount - filteredLines.length} debug statement(s)`);
  } else {
    console.log(`  ℹ️  No debug statements found`);
  }
}

console.log('🧹 Removing Debug Statements...\n');
console.log('Files to process:', filesToFix.length);

filesToFix.forEach(file => {
  removeDebugStatements(file);
});

console.log('\n' + '='.repeat(60));
console.log('✅ DEBUG STATEMENT REMOVAL COMPLETE');
console.log('='.repeat(60));
console.log(`\nStatistics:`);
console.log(`  Files processed: ${stats.filesProcessed}`);
console.log(`  Lines removed:   ${stats.linesRemoved}`);
console.log('\n✅ Code quality improved!');
