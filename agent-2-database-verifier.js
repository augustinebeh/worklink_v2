#!/usr/bin/env node
/**
 * Agent 2: Database Connection Verifier
 * Ensures all modules read from the same database
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'test-screenshots', 'test-videos'];

const results = {
  databaseImports: [],
  databasePaths: new Set(),
  potentialIssues: [],
  duplicateConnections: [],
  summary: {
    totalImports: 0,
    uniquePaths: 0,
    issues: 0
  }
};

console.log('🔍 Agent 2: Database Connection Verification');
console.log('='.repeat(80) + '\n');

/**
 * Scan for database imports
 */
function scanForDatabaseImports(dirPath, callback) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          scanForDatabaseImports(fullPath, callback);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.mjs'].includes(ext) && 
            !entry.name.includes('.BACKUP') &&
            !entry.name.includes('.BEFORE_IMPORT_UPDATE')) {
          callback(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

/**
 * Analyze file for database imports
 */
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    
    // Patterns for database imports
    const patterns = [
      { pattern: /require\(['"]\.\.?\/.*db['"]\)/g, type: 'db module' },
      { pattern: /require\(['"]\.\.?\/.*database['"]\)/g, type: 'database module' },
      { pattern: /from\s+['"]\.\.?\/.*db['"]/g, type: 'db import' },
      { pattern: /from\s+['"]\.\.?\/.*database['"]/g, type: 'database import' },
      { pattern: /better-sqlite3/g, type: 'direct sqlite' },
      { pattern: /new\s+Database\s*\(/g, type: 'database instantiation' }
    ];
    
    patterns.forEach(({ pattern, type }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          results.databaseImports.push({
            file: relativePath,
            import: match.trim(),
            type: type
          });
          
          results.summary.totalImports++;
          
          // Extract the path
          const pathMatch = match.match(/['"]([^'"]+)['"]/);
          if (pathMatch) {
            results.databasePaths.add(pathMatch[1]);
          }
        });
      }
    });
    
    // Check for multiple database connections in same file
    const dbInstantiations = content.match(/new\s+Database\s*\(/g);
    if (dbInstantiations && dbInstantiations.length > 1) {
      results.potentialIssues.push({
        file: relativePath,
        issue: `Multiple database instantiations (${dbInstantiations.length})`,
        severity: 'high'
      });
    }
    
    // Check for direct file path to database
    const dbPathMatch = content.match(/['"]\.\/data\/worklink\.db['"]/g);
    if (dbPathMatch) {
      results.potentialIssues.push({
        file: relativePath,
        issue: 'Direct database file path (should use db module)',
        severity: 'medium'
      });
    }
    
  } catch (error) {
    // Skip files we can't read
  }
}

/**
 * Check for database file location
 */
function checkDatabaseFile() {
  console.log('📁 Checking database file location...\n');
  
  const possibleLocations = [
    'data/worklink.db',
    'db/worklink.db',
    'worklink.db',
    'database/worklink.db'
  ];
  
  let foundLocation = null;
  
  possibleLocations.forEach(loc => {
    const fullPath = path.join(PROJECT_ROOT, loc);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ Database found: ${loc}`);
      const stats = fs.statSync(fullPath);
      console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Modified: ${stats.mtime.toISOString()}`);
      foundLocation = loc;
    }
  });
  
  if (!foundLocation) {
    console.log('⚠️  Database file not found in common locations');
    results.potentialIssues.push({
      file: 'N/A',
      issue: 'Database file not found',
      severity: 'critical'
    });
  }
  
  return foundLocation;
}

/**
 * Check database module configuration
 */
function checkDatabaseModule() {
  console.log('\n📦 Checking database module...\n');
  
  // Check db/index.js
  const dbIndexPath = path.join(PROJECT_ROOT, 'db', 'index.js');
  if (fs.existsSync(dbIndexPath)) {
    console.log('✅ db/index.js exists');
    
    const content = fs.readFileSync(dbIndexPath, 'utf-8');
    
    // Check exports
    if (content.includes('module.exports') || content.includes('export')) {
      console.log('✅ Exports database connection');
    } else {
      console.log('⚠️  No exports found');
    }
    
    // Check singleton pattern
    if (content.includes('let db') || content.includes('const db')) {
      console.log('✅ Database instance defined');
    }
    
  } else {
    console.log('❌ db/index.js not found!');
    results.potentialIssues.push({
      file: 'db/index.js',
      issue: 'Database module not found',
      severity: 'critical'
    });
  }
  
  // Check for wrapper
  const dbDatabasePath = path.join(PROJECT_ROOT, 'db', 'database.js');
  if (fs.existsSync(dbDatabasePath)) {
    console.log('ℹ️  db/database.js exists (wrapper)');
  }
}

/**
 * Analyze import patterns
 */
function analyzeImportPatterns() {
  console.log('\n🔍 Analyzing database import patterns...\n');
  
  const importsByType = {};
  
  results.databaseImports.forEach(imp => {
    if (!importsByType[imp.type]) {
      importsByType[imp.type] = [];
    }
    importsByType[imp.type].push(imp);
  });
  
  Object.entries(importsByType).forEach(([type, imports]) => {
    console.log(`${type}: ${imports.length} imports`);
  });
  
  results.summary.uniquePaths = results.databasePaths.size;
  
  console.log(`\n📊 Unique import paths: ${results.summary.uniquePaths}`);
  Array.from(results.databasePaths).forEach(p => {
    console.log(`   - ${p}`);
  });
  
  // Check for inconsistencies
  if (results.summary.uniquePaths > 3) {
    results.potentialIssues.push({
      file: 'Multiple files',
      issue: `Too many different database import paths (${results.summary.uniquePaths})`,
      severity: 'medium'
    });
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('DATABASE CONNECTION VERIFICATION REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log(`📊 Summary:\n`);
  console.log(`   Total database imports: ${results.summary.totalImports}`);
  console.log(`   Unique import paths: ${results.summary.uniquePaths}`);
  console.log(`   Potential issues: ${results.potentialIssues.length}`);
  console.log('');
  
  if (results.potentialIssues.length > 0) {
    console.log('⚠️  POTENTIAL ISSUES:\n');
    
    const critical = results.potentialIssues.filter(i => i.severity === 'critical');
    const high = results.potentialIssues.filter(i => i.severity === 'high');
    const medium = results.potentialIssues.filter(i => i.severity === 'medium');
    
    if (critical.length > 0) {
      console.log('🔴 CRITICAL:');
      critical.forEach(issue => {
        console.log(`   - ${issue.file}: ${issue.issue}`);
      });
      console.log('');
    }
    
    if (high.length > 0) {
      console.log('🟠 HIGH:');
      high.forEach(issue => {
        console.log(`   - ${issue.file}: ${issue.issue}`);
      });
      console.log('');
    }
    
    if (medium.length > 0) {
      console.log('🟡 MEDIUM:');
      medium.forEach(issue => {
        console.log(`   - ${issue.file}: ${issue.issue}`);
      });
      console.log('');
    }
  } else {
    console.log('✅ No database connection issues found!\n');
  }
  
  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  console.log('1. All modules should import from: require("../db") or require("./db")');
  console.log('2. Only db/index.js should instantiate the database');
  console.log('3. Use singleton pattern for database connection');
  console.log('4. Avoid multiple database connections');
  console.log('');
  
  // Save report
  results.summary.issues = results.potentialIssues.length;
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-2-database-verification.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Report saved: agent-2-database-verification.json\n');
}

// Run all checks
console.log('Scanning codebase for database imports...\n');
scanForDatabaseImports(PROJECT_ROOT, analyzeFile);
checkDatabaseFile();
checkDatabaseModule();
analyzeImportPatterns();
generateReport();
