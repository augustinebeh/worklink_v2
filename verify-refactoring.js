#!/usr/bin/env node
/**
 * Refactoring Verification & Cleanup Planner
 * Verifies that monolithic files are no longer in use before cleanup
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data', 'public/uploads'];

// Known monolithic files that were refactored
const MONOLITHIC_FILES = {
  // Database
  'db/database.js': {
    replacedBy: 'db/database/ (15 modular files)',
    size: '1,962 lines',
    status: 'wrapper_kept' // Kept as compatibility wrapper
  },
  
  // Routes
  'routes/api/v1/candidates.js': {
    replacedBy: 'routes/api/v1/candidates/ (index.js + routes/ + helpers/)',
    size: '516 lines',
    status: 'to_verify'
  },
  'routes/api/v1/chat.js': {
    replacedBy: 'routes/api/v1/chat/ (index.js + routes/ + helpers/)',
    size: '473 lines',
    status: 'to_verify'
  },
  'routes/api/v1/gamification.js': {
    replacedBy: 'routes/api/v1/gamification/ (index.js + routes/ + helpers/)',
    size: '1,649 lines',
    status: 'to_verify'
  },
  'routes/api/v1/auth.js': {
    replacedBy: 'routes/api/v1/auth/ (index.js + routes/)',
    size: '686 lines',
    status: 'to_verify'
  },
  'routes/api/v1/smart-response-router.js': {
    replacedBy: 'routes/api/v1/smart-response-router/ (index.js + routes/ + helpers/)',
    size: '527 lines',
    status: 'to_verify'
  },
  'routes/api/v1/ai-automation.js': {
    replacedBy: 'routes/api/v1/ai-automation/ (index.js + 12 modules)',
    size: '2,421 lines',
    status: 'to_verify'
  },
  
  // WebSocket
  'websocket.js': {
    replacedBy: 'websocket/ (modular structure)',
    size: 'unknown',
    status: 'to_verify'
  },
  'websocket-new.js': {
    replacedBy: 'websocket/index.js',
    size: 'unknown',
    status: 'wrapper_kept' // Kept as compatibility wrapper
  },
  'services/websocket-handlers.js': {
    replacedBy: 'websocket/ modules',
    size: 'unknown',
    status: 'to_verify'
  },
  
  // Services
  'utils/smart-slm-router.js': {
    replacedBy: 'utils/smart-slm-router/ (modular)',
    size: 'unknown',
    status: 'to_verify'
  }
};

const results = {
  monolithicFiles: {},
  references: {},
  endpoints: {
    old: new Set(),
    new: new Set(),
    verified: []
  },
  safeToDelete: [],
  needsInvestigation: [],
  wrappers: []
};

/**
 * Check if monolithic file exists
 */
function checkFileExists(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  return fs.existsSync(fullPath);
}

/**
 * Find all references to a file
 */
function findReferences(targetFile) {
  const refs = [];
  const patterns = [
    // require statements
    new RegExp(`require\\s*\\(\\s*['"\`].*${path.basename(targetFile, '.js')}.*['"\`]\\s*\\)`, 'g'),
    // import statements  
    new RegExp(`from\\s+['"\`].*${path.basename(targetFile, '.js')}.*['"\`]`, 'g'),
    // Dynamic imports
    new RegExp(`import\\s*\\(\\s*['"\`].*${path.basename(targetFile, '.js')}.*['"\`]\\s*\\)`, 'g')
  ];
  
  scanForPatterns(PROJECT_ROOT, patterns, (file, matches) => {
    refs.push({
      file: path.relative(PROJECT_ROOT, file),
      matches: matches.length,
      lines: matches
    });
  });
  
  return refs;
}

/**
 * Scan directory for pattern matches
 */
function scanForPatterns(dirPath, patterns, callback) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          scanForPatterns(fullPath, patterns, callback);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.mjs', '.ts', '.tsx'].includes(ext)) {
          scanFile(fullPath, patterns, callback);
        }
      }
    }
  } catch (error) {
    // Skip files we can't read
  }
}

/**
 * Scan individual file for patterns
 */
function scanFile(filePath, patterns, callback) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const matches = [];
    
    lines.forEach((line, idx) => {
      patterns.forEach(pattern => {
        if (pattern.test(line)) {
          matches.push({
            line: idx + 1,
            content: line.trim()
          });
        }
      });
    });
    
    if (matches.length > 0) {
      callback(filePath, matches);
    }
  } catch (error) {
    // Skip files we can't read
  }
}

/**
 * Extract endpoints from a route file
 */
function extractEndpoints(filePath) {
  const endpoints = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Match router.METHOD('/path', ...) patterns
    const routePattern = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    
    lines.forEach((line, idx) => {
      let match;
      routePattern.lastIndex = 0;
      while ((match = routePattern.exec(line)) !== null) {
        endpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          line: idx + 1,
          source: path.relative(PROJECT_ROOT, filePath)
        });
      }
    });
  } catch (error) {
    // Skip files we can't read
  }
  
  return endpoints;
}

/**
 * Analyze monolithic files
 */
function analyzeMonolithicFiles() {
  console.log('📋 Analyzing monolithic files...\n');
  
  for (const [filePath, info] of Object.entries(MONOLITHIC_FILES)) {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    const exists = fs.existsSync(fullPath);
    
    results.monolithicFiles[filePath] = {
      ...info,
      exists,
      fullPath
    };
    
    if (exists) {
      console.log(`  🔍 Found: ${filePath} (${info.size})`);
      
      // Find references to this file
      const refs = findReferences(filePath);
      results.references[filePath] = refs;
      
      console.log(`     References found: ${refs.length}`);
      
      // Extract endpoints if it's a route file
      if (filePath.startsWith('routes/api/v1/') && filePath.endsWith('.js')) {
        const endpoints = extractEndpoints(fullPath);
        results.endpoints.old.add(filePath);
        console.log(`     Endpoints found: ${endpoints.length}`);
        
        endpoints.forEach(ep => {
          console.log(`       ${ep.method} ${ep.path}`);
        });
      }
      
      // Categorize the file
      if (info.status === 'wrapper_kept') {
        results.wrappers.push(filePath);
      } else if (refs.length === 0) {
        results.safeToDelete.push(filePath);
      } else {
        results.needsInvestigation.push({
          file: filePath,
          references: refs
        });
      }
    } else {
      console.log(`  ✅ Already removed: ${filePath}`);
    }
  }
}

/**
 * Verify new modular structure
 */
function verifyModularStructure() {
  console.log('\n\n📦 Verifying new modular structure...\n');
  
  const modularDirs = [
    'routes/api/v1/candidates',
    'routes/api/v1/chat',
    'routes/api/v1/gamification',
    'routes/api/v1/auth',
    'routes/api/v1/smart-response-router',
    'routes/api/v1/ai-automation',
    'websocket',
    'db/database',
    'services/ai-chat',
    'services/data-integration',
    'services/intent-classifier'
  ];
  
  modularDirs.forEach(dir => {
    const fullPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${dir}/`);
      
      // Check for index.js
      const indexPath = path.join(fullPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        console.log(`     - index.js found`);
        
        // Extract endpoints from new structure
        const endpoints = extractEndpoints(indexPath);
        if (endpoints.length > 0) {
          results.endpoints.new.add(dir);
          console.log(`     - ${endpoints.length} endpoints`);
        }
      }
    } else {
      console.log(`  ⚠️  Missing: ${dir}/`);
    }
  });
}

/**
 * Check server.js for route mounting
 */
function checkServerRouting() {
  console.log('\n\n🔌 Checking server.js route mounting...\n');
  
  const serverPath = path.join(PROJECT_ROOT, 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log('  ⚠️  server.js not found!');
    return;
  }
  
  const content = fs.readFileSync(serverPath, 'utf-8');
  const lines = content.split('\n');
  
  console.log('  Route mounting in server.js:');
  
  lines.forEach((line, idx) => {
    if (line.includes('app.use') && line.includes('/api')) {
      console.log(`    Line ${idx + 1}: ${line.trim()}`);
    }
  });
}

/**
 * Generate cleanup recommendations
 */
function generateReport() {
  console.log('\n\n' + '='.repeat(80));
  console.log('CLEANUP RECOMMENDATIONS');
  console.log('='.repeat(80) + '\n');
  
  // Safe to delete
  if (results.safeToDelete.length > 0) {
    console.log('✅ SAFE TO DELETE (No references found):');
    console.log('─'.repeat(80));
    results.safeToDelete.forEach(file => {
      const info = results.monolithicFiles[file];
      console.log(`\n📄 ${file}`);
      console.log(`   Original: ${info.size}`);
      console.log(`   Replaced by: ${info.replacedBy}`);
      console.log(`   Action: Can be safely deleted`);
    });
    console.log('');
  }
  
  // Wrappers
  if (results.wrappers.length > 0) {
    console.log('\n🔄 COMPATIBILITY WRAPPERS (Keep for now):');
    console.log('─'.repeat(80));
    results.wrappers.forEach(file => {
      const info = results.monolithicFiles[file];
      console.log(`\n📄 ${file}`);
      console.log(`   Purpose: Backward compatibility wrapper`);
      console.log(`   Delegates to: ${info.replacedBy}`);
      console.log(`   Action: Keep until all external references are updated`);
    });
    console.log('');
  }
  
  // Needs investigation
  if (results.needsInvestigation.length > 0) {
    console.log('\n⚠️  NEEDS INVESTIGATION (Still has references):');
    console.log('─'.repeat(80));
    results.needsInvestigation.forEach(({ file, references }) => {
      const info = results.monolithicFiles[file];
      console.log(`\n📄 ${file}`);
      console.log(`   Original: ${info.size}`);
      console.log(`   Replaced by: ${info.replacedBy}`);
      console.log(`   References found: ${references.length}`);
      console.log(`   Action: Update references before deleting\n`);
      
      references.forEach(ref => {
        console.log(`   📍 ${ref.file}`);
        ref.lines.forEach(line => {
          console.log(`      Line ${line.line}: ${line.content}`);
        });
      });
    });
    console.log('');
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  console.log(`Total monolithic files analyzed: ${Object.keys(MONOLITHIC_FILES).length}`);
  console.log(`Files still exist: ${Object.values(results.monolithicFiles).filter(f => f.exists).length}`);
  console.log(`Safe to delete: ${results.safeToDelete.length}`);
  console.log(`Wrappers to keep: ${results.wrappers.length}`);
  console.log(`Need investigation: ${results.needsInvestigation.length}`);
  
  // Generate cleanup script
  if (results.safeToDelete.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('CLEANUP SCRIPT');
    console.log('='.repeat(80) + '\n');
    
    const cleanupScript = results.safeToDelete.map(file => {
      return `# Delete ${file}\nrm "${file}"`;
    }).join('\n');
    
    const scriptPath = path.join(PROJECT_ROOT, 'cleanup-monolithic-files.sh');
    fs.writeFileSync(scriptPath, `#!/bin/bash
# Cleanup script for verified monolithic files
# Generated: ${new Date().toISOString()}

echo "🧹 Cleaning up old monolithic files..."
echo ""

${cleanupScript}

echo ""
echo "✅ Cleanup complete!"
`);
    
    console.log(`Generated cleanup script: cleanup-monolithic-files.sh`);
    console.log(`Review and run with: bash cleanup-monolithic-files.sh`);
  }
  
  // Save detailed report
  const reportPath = path.join(PROJECT_ROOT, 'refactoring-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    monolithicFiles: results.monolithicFiles,
    references: results.references,
    safeToDelete: results.safeToDelete,
    wrappers: results.wrappers,
    needsInvestigation: results.needsInvestigation
  }, null, 2));
  
  console.log(`\nDetailed report saved: refactoring-verification-report.json`);
}

// Run analysis
console.log('🔍 REFACTORING VERIFICATION & CLEANUP PLANNER');
console.log('='.repeat(80) + '\n');

analyzeMonolithicFiles();
verifyModularStructure();
checkServerRouting();
generateReport();
