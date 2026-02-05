/**
 * Comprehensive Import Checker
 * Scans all JS files and identifies broken imports
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data'];
const DELETED_PATTERNS = [
  'websocket.js.DELETED',
  'server.js.DELETED',
  'smart-slm-router.js.DELETED',
  './websocket.js',
  '../websocket.js',
  '../../websocket.js',
  './services/websocket-handlers',
  '../services/websocket-handlers',
  '../../services/websocket-handlers',
  './utils/smart-slm-router.js',
  '../utils/smart-slm-router.js',
  '../../utils/smart-slm-router.js'
];

const results = {
  filesScanned: 0,
  brokenImports: [],
  suspiciousImports: [],
  summary: {}
};

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(item) && !item.startsWith('.')) {
        scanDirectory(fullPath);
      }
    } else if (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.mjs')) {
      if (!item.includes('.DELETED') && !item.includes('.BEFORE_REFACTOR')) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  results.filesScanned++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(PROJECT_ROOT, filePath);

    // Find all require and import statements
    const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    const importRegex = /(?:import|export).*?from\s*['"]([^'"]+)['"]/g;

    let match;
    const imports = [];

    // Find requires
    while ((match = requireRegex.exec(content)) !== null) {
      imports.push({ type: 'require', path: match[1], line: getLineNumber(content, match.index) });
    }

    // Find imports
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({ type: 'import', path: match[1], line: getLineNumber(content, match.index) });
    }

    // Check each import
    for (const imp of imports) {
      checkImport(relativePath, imp);
    }

  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
  }
}

function checkImport(filePath, imp) {
  const importPath = imp.path;

  // Check for deleted file patterns
  for (const pattern of DELETED_PATTERNS) {
    if (importPath.includes(pattern) || importPath === pattern.replace(/^\.\//, '')) {
      results.brokenImports.push({
        file: filePath,
        line: imp.line,
        type: imp.type,
        importPath: importPath,
        reason: 'References deleted/refactored file'
      });
      return;
    }
  }

  // Check if it's a relative import that might be broken
  if (importPath.startsWith('.')) {
    const fileDir = path.dirname(path.join(PROJECT_ROOT, filePath));
    const resolvedPath = path.join(fileDir, importPath);
    
    // Try common extensions
    const extensions = ['', '.js', '.jsx', '.mjs', '/index.js'];
    let exists = false;
    
    for (const ext of extensions) {
      const testPath = resolvedPath + ext;
      if (fs.existsSync(testPath)) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      results.suspiciousImports.push({
        file: filePath,
        line: imp.line,
        type: imp.type,
        importPath: importPath,
        reason: 'File not found (might be node_modules or false positive)'
      });
    }
  }
}

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

// Run the scan
console.log('🔍 Scanning for broken imports...\n');
scanDirectory(PROJECT_ROOT);

// Generate summary
results.summary = {
  filesScanned: results.filesScanned,
  brokenImportsCount: results.brokenImports.length,
  suspiciousImportsCount: results.suspiciousImports.length
};

// Display results
console.log('📊 SCAN RESULTS');
console.log('='.repeat(80));
console.log(`Files scanned: ${results.summary.filesScanned}`);
console.log(`Broken imports (definite): ${results.summary.brokenImportsCount}`);
console.log(`Suspicious imports (check needed): ${results.summary.suspiciousImportsCount}`);
console.log('');

if (results.brokenImports.length > 0) {
  console.log('🚨 BROKEN IMPORTS (MUST FIX):');
  console.log('='.repeat(80));
  results.brokenImports.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.file}:${item.line}`);
    console.log(`   ${item.type}: "${item.importPath}"`);
    console.log(`   Reason: ${item.reason}`);
  });
  console.log('\n');
}

if (results.suspiciousImports.length > 0 && results.suspiciousImports.length <= 20) {
  console.log('⚠️  SUSPICIOUS IMPORTS (VERIFY):');
  console.log('='.repeat(80));
  results.suspiciousImports.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.file}:${item.line}`);
    console.log(`   ${item.type}: "${item.importPath}"`);
    console.log(`   Reason: ${item.reason}`);
  });
}

// Save to file
fs.writeFileSync(
  path.join(PROJECT_ROOT, 'import-check-results.json'),
  JSON.stringify(results, null, 2)
);

console.log('\n✅ Results saved to import-check-results.json');
console.log('\n' + '='.repeat(80));

if (results.brokenImports.length > 0) {
  console.log('❌ BROKEN IMPORTS FOUND - Action required!');
  process.exit(1);
} else if (results.suspiciousImports.length > 0) {
  console.log('⚠️  Suspicious imports found - Review recommended');
  process.exit(0);
} else {
  console.log('✅ No broken imports detected!');
  process.exit(0);
}
