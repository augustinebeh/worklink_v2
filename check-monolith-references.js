#!/usr/bin/env node
/**
 * Deep Monolithic File Reference Checker
 * Identifies any remaining references to old monolithic files
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data', 'public/uploads', 'test-screenshots', 'test-videos'];

// Check if these old monolithic files still exist as FILES (not directories)
const POTENTIAL_MONOLITHS = [
  'websocket.js',
  'websocket-new.js',
  'websocket-handlers.js',
  'services/websocket-handlers.js',
  'database.js',
  'db/database.js',
  'routes/api/v1/candidates.js',
  'routes/api/v1/chat.js',
  'routes/api/v1/gamification.js',
  'routes/api/v1/auth.js',
  'routes/api/v1/smart-response-router.js',
  'routes/api/v1/ai-automation.js',
  'routes/api/v1/consultant-performance.js',
  'utils/smart-slm-router.js',
  'services/smart-response-router.js'
];

const results = {
  monolithicFilesStillExist: [],
  referencesToMonoliths: {},
  referencesToDirectories: {},
  summary: {
    filesFound: 0,
    directoriesInstead: 0,
    totalReferences: 0
  }
};

/**
 * Check if path is a file or directory
 */
function checkPathType(relPath) {
  const fullPath = path.join(PROJECT_ROOT, relPath);
  
  if (!fs.existsSync(fullPath)) {
    return { exists: false, type: null };
  }
  
  const stats = fs.statSync(fullPath);
  return { 
    exists: true, 
    type: stats.isDirectory() ? 'directory' : 'file',
    path: fullPath
  };
}

/**
 * Find all imports/requires of a specific path
 */
function findReferencesToPath(targetPath) {
  const refs = [];
  const baseName = path.basename(targetPath, '.js');
  
  scanDirectory(PROJECT_ROOT, (filePath, content) => {
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
      // Skip comments and backup files
      if (filePath.includes('.BEFORE_IMPORT_UPDATE') || 
          filePath.includes('.BACKUP') ||
          filePath.includes('.DELETED')) {
        return;
      }
      
      // Check for exact require/import of this path
      const patterns = [
        new RegExp(`require\\s*\\(\\s*['"\`]\\.\\/\\.\\.?\\/.*${baseName}(\\.js)?['"\`]\\s*\\)`, 'i'),
        new RegExp(`require\\s*\\(\\s*['"\`]\\.\\/${baseName}(\\.js)?['"\`]\\s*\\)`, 'i'),
        new RegExp(`require\\s*\\(\\s*['"\`]${targetPath.replace(/\//g, '\\/')}['"\`]\\s*\\)`, 'i'),
        new RegExp(`from\\s+['"\`].*${baseName}(\\.js)?['"\`]`, 'i')
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(line)) {
          refs.push({
            file: path.relative(PROJECT_ROOT, filePath),
            line: idx + 1,
            code: line.trim()
          });
          break;
        }
      }
    });
  });
  
  return refs;
}

/**
 * Scan directory recursively
 */
function scanDirectory(dirPath, callback) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          scanDirectory(fullPath, callback);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.mjs'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            callback(fullPath, content);
          } catch (error) {
            // Skip files we can't read
          }
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

/**
 * Main analysis
 */
function analyzeMonoliths() {
  console.log('🔍 Deep Monolithic File Reference Analysis');
  console.log('='.repeat(80) + '\n');
  
  console.log('Checking for monolithic files that still exist...\n');
  
  for (const monolithPath of POTENTIAL_MONOLITHS) {
    const pathInfo = checkPathType(monolithPath);
    
    if (pathInfo.exists && pathInfo.type === 'file') {
      results.monolithicFilesStillExist.push({
        path: monolithPath,
        fullPath: pathInfo.path
      });
      results.summary.filesFound++;
      
      console.log(`⚠️  MONOLITHIC FILE STILL EXISTS: ${monolithPath}`);
      
      // Find references to this monolithic file
      const refs = findReferencesToPath(monolithPath);
      results.referencesToMonoliths[monolithPath] = refs;
      results.summary.totalReferences += refs.length;
      
      if (refs.length > 0) {
        console.log(`   References found: ${refs.length}`);
        refs.slice(0, 5).forEach(ref => {
          console.log(`   - ${ref.file}:${ref.line}`);
          console.log(`     ${ref.code}`);
        });
        if (refs.length > 5) {
          console.log(`   ... and ${refs.length - 5} more`);
        }
      } else {
        console.log(`   ✅ No references found - safe to delete`);
      }
      console.log('');
      
    } else if (pathInfo.exists && pathInfo.type === 'directory') {
      results.summary.directoriesInstead++;
      console.log(`✅ ${monolithPath} - Now a directory (refactored)`);
      
      // Check if imports are pointing to the directory (which is correct)
      const refs = findReferencesToPath(monolithPath);
      if (refs.length > 0) {
        results.referencesToDirectories[monolithPath] = refs;
        console.log(`   ✅ ${refs.length} imports correctly using modular directory`);
      }
      
    } else {
      console.log(`✅ ${monolithPath} - Deleted (good)`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  console.log(`Monolithic FILES still existing: ${results.summary.filesFound}`);
  console.log(`Now directories (refactored): ${results.summary.directoriesInstead}`);
  console.log(`Total references to monoliths: ${results.summary.totalReferences}`);
  console.log('');
  
  if (results.monolithicFilesStillExist.length > 0) {
    console.log('\n⚠️  ACTION REQUIRED:\n');
    console.log('The following monolithic files still exist as FILES:');
    console.log('─'.repeat(80));
    
    results.monolithicFilesStillExist.forEach(item => {
      const refs = results.referencesToMonoliths[item.path] || [];
      console.log(`\n📄 ${item.path}`);
      console.log(`   References: ${refs.length}`);
      
      if (refs.length === 0) {
        console.log(`   ✅ Safe to delete - no references found`);
        console.log(`   Command: rm "${item.path}"`);
      } else {
        console.log(`   ⚠️  Still in use - update references first`);
        console.log(`   Files referencing this:`);
        const uniqueFiles = [...new Set(refs.map(r => r.file))];
        uniqueFiles.forEach(file => {
          console.log(`      - ${file}`);
        });
      }
    });
  } else {
    console.log('✅ EXCELLENT! No monolithic files remain as files.');
    console.log('   All have been either:');
    console.log('   - Deleted completely ✅');
    console.log('   - Refactored into modular directories ✅');
  }
  
  // Save report
  const reportPath = path.join(PROJECT_ROOT, 'monolith-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    monolithicFilesStillExist: results.monolithicFilesStillExist,
    referencesToMonoliths: results.referencesToMonoliths,
    referencesToDirectories: results.referencesToDirectories,
    summary: results.summary
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved: monolith-check-report.json\n`);
}

// Run the analysis
analyzeMonoliths();
