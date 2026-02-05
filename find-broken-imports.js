/**
 * Broken Import Finder and Fixer
 * Systematically finds and reports all broken imports
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data'];

// Patterns to search for - these are imports that reference deleted/refactored files
const BROKEN_PATTERNS = [
  // Old monolithic websocket file
  { pattern: /require\s*\(\s*['"]\.\.?\/.*websocket\.js['"]\s*\)/g, name: 'websocket.js require' },
  { pattern: /from\s+['"]\.\.?\/.*websocket\.js['"]/g, name: 'websocket.js import' },
  
  // Old websocket-handlers service
  { pattern: /require\s*\(\s*['"]\.\.?\/.*services\/websocket-handlers['"]\s*\)/g, name: 'websocket-handlers require' },
  { pattern: /from\s+['"]\.\.?\/.*services\/websocket-handlers['"]/g, name: 'websocket-handlers import' },
  
  // Old smart-slm-router utils file
  { pattern: /require\s*\(\s*['"]\.\.?\/.*utils\/smart-slm-router\.js['"]\s*\)/g, name: 'smart-slm-router.js require' },
  { pattern: /from\s+['"]\.\.?\/.*utils\/smart-slm-router\.js['"]/g, name: 'smart-slm-router.js import' },
  
  // server.js.DELETED
  { pattern: /require\s*\(\s*['"]\.\.?\/.*server\.js\.DELETED['"]\s*\)/g, name: 'server.js.DELETED require' },
  { pattern: /from\s+['"]\.\.?\/.*server\.js\.DELETED['"]/g, name: 'server.js.DELETED import' },
];

const results = {
  filesScanned: 0,
  brokenImports: [],
  filesByPattern: {}
};

function scanDirectory(dir) {
  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      
      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!IGNORE_DIRS.includes(item) && !item.startsWith('.')) {
            scanDirectory(fullPath);
          }
        } else if ((item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.mjs')) &&
                   !item.includes('.DELETED') && !item.includes('.BEFORE_REFACTOR')) {
          scanFile(fullPath);
        }
      } catch (err) {
        // Skip files we can't read
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }
}

function scanFile(filePath) {
  results.filesScanned++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(PROJECT_ROOT, filePath);

    // Check for each broken pattern
    for (const brokenPattern of BROKEN_PATTERNS) {
      let match;
      while ((match = brokenPattern.pattern.exec(content)) !== null) {
        const line = getLineNumber(content, match.index);
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.substring(contextStart, contextEnd);

        const issue = {
          file: relativePath,
          line: line,
          pattern: brokenPattern.name,
          match: match[0],
          context: context.trim()
        };

        results.brokenImports.push(issue);

        // Group by pattern
        if (!results.filesByPattern[brokenPattern.name]) {
          results.filesByPattern[brokenPattern.name] = [];
        }
        results.filesByPattern[brokenPattern.name].push(relativePath);
      }
    }

  } catch (error) {
    // Skip files we can't read
  }
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Run the scan
console.log('🔍 Scanning for broken imports...\n');
scanDirectory(PROJECT_ROOT);

// Display results
console.log('📊 SCAN RESULTS');
console.log('='.repeat(80));
console.log(`Files scanned: ${results.filesScanned}`);
console.log(`Broken imports found: ${results.brokenImports.length}`);
console.log('');

if (results.brokenImports.length === 0) {
  console.log('✅ No broken imports found!');
  process.exit(0);
}

console.log('🚨 BROKEN IMPORTS DETECTED:');
console.log('='.repeat(80));

// Group by pattern for easier fixing
for (const [patternName, files] of Object.entries(results.filesByPattern)) {
  console.log(`\n📌 ${patternName}`);
  console.log(`   Found in ${new Set(files).size} file(s)`);
  
  // Show specific occurrences
  const occurrences = results.brokenImports.filter(i => i.pattern === patternName);
  occurrences.forEach((item, index) => {
    console.log(`\n   ${index + 1}. ${item.file}:${item.line}`);
    console.log(`      Match: ${item.match}`);
    console.log(`      Context: ...${item.context}...`);
  });
}

// Save detailed results
const reportPath = path.join(PROJECT_ROOT, 'broken-imports-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n\n✅ Detailed report saved to: broken-imports-report.json`);

// Provide fix suggestions
console.log('\n' + '='.repeat(80));
console.log('💡 FIX SUGGESTIONS:');
console.log('='.repeat(80));

if (results.filesByPattern['websocket.js require'] || results.filesByPattern['websocket.js import']) {
  console.log(`\n1. Replace websocket.js imports:`);
  console.log(`   OLD: require('./websocket.js') or require('../websocket.js')`);
  console.log(`   NEW: require('./websocket') - uses the refactored websocket/ directory`);
}

if (results.filesByPattern['websocket-handlers require'] || results.filesByPattern['websocket-handlers import']) {
  console.log(`\n2. Replace websocket-handlers imports:`);
  console.log(`   This service has been refactored into the websocket/ directory`);
  console.log(`   Check websocket/index.js for available exports`);
}

if (results.filesByPattern['smart-slm-router.js require'] || results.filesByPattern['smart-slm-router.js import']) {
  console.log(`\n3. Replace smart-slm-router.js imports:`);
  console.log(`   OLD: require('./utils/smart-slm-router.js')`);
  console.log(`   NEW: require('./utils/smart-slm-router') - uses the refactored directory`);
}

console.log('\n' + '='.repeat(80));
process.exit(1);
