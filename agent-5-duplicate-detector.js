#!/usr/bin/env node
/**
 * Agent 5: Duplicate & Error Detector
 * Finds duplicate code, conflicting implementations, and errors
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs'];

const results = {
  duplicateFiles: [],
  similarFunctions: [],
  multipleInstances: [],
  errors: [],
  summary: {
    totalDuplicates: 0,
    totalErrors: 0
  }
};

console.log('🔍 Agent 5: Duplicate & Error Detection');
console.log('='.repeat(80) + '\n');

/**
 * Find duplicate files by content hash
 */
function findDuplicateFiles() {
  console.log('🔍 Scanning for duplicate files...\n');
  
  const fileHashes = new Map();
  
  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (['.js', '.mjs'].includes(ext) && 
              !entry.name.includes('.BACKUP') &&
              !entry.name.includes('.BEFORE_IMPORT_UPDATE')) {
            
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const hash = crypto.createHash('md5').update(content).digest('hex');
              
              if (!fileHashes.has(hash)) {
                fileHashes.set(hash, []);
              }
              fileHashes.get(hash).push(path.relative(PROJECT_ROOT, fullPath));
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
  
  scanDir(PROJECT_ROOT);
  
  // Find duplicates
  fileHashes.forEach((files, hash) => {
    if (files.length > 1) {
      results.duplicateFiles.push({
        hash,
        files,
        count: files.length
      });
      results.summary.totalDuplicates += files.length - 1;
    }
  });
  
  if (results.duplicateFiles.length > 0) {
    console.log(`⚠️  Found ${results.duplicateFiles.length} sets of duplicate files:\n`);
    results.duplicateFiles.forEach(dup => {
      console.log(`Duplicate set (${dup.count} files):`);
      dup.files.forEach(file => {
        console.log(`   - ${file}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ No duplicate files found\n');
  }
}

/**
 * Find multiple database instantiations
 */
function findMultipleDatabaseInstances() {
  console.log('🔍 Checking for multiple database connections...\n');
  
  const dbInstances = [];
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(PROJECT_ROOT, filePath);
      
      // Look for database instantiation
      const patterns = [
        /new\s+Database\s*\(/g,
        /require\(['"]better-sqlite3['"]\)/g,
        /\.db\s*=\s*new/g
      ];
      
      patterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          dbInstances.push({
            file: relativePath,
            instances: matches.length,
            pattern: pattern.toString()
          });
        }
      });
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            scanDir(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          scanFile(fullPath);
        }
      }
    } catch (error) {
      // Skip
    }
  }
  
  scanDir(PROJECT_ROOT);
  
  if (dbInstances.length > 1) {
    console.log(`⚠️  Found database instantiation in ${dbInstances.length} files:\n`);
    dbInstances.forEach(inst => {
      console.log(`   ${inst.file}: ${inst.instances} instance(s)`);
    });
    console.log('');
    console.log('⚠️  WARNING: Multiple database connections can cause locking issues!');
    console.log('   Recommendation: Only db/index.js should instantiate the database\n');
    
    results.multipleInstances = dbInstances;
    results.errors.push({
      type: 'multiple_db_instances',
      severity: 'high',
      count: dbInstances.length,
      message: 'Multiple database instantiations found'
    });
  } else {
    console.log('✅ Only one database instantiation found\n');
  }
}

/**
 * Check for common errors and anti-patterns
 */
function checkCommonErrors() {
  console.log('🔍 Checking for common errors...\n');
  
  const errors = [];
  
  function checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(PROJECT_ROOT, filePath);
      
      // Check for common issues
      const checks = [
        {
          name: 'Hardcoded credentials',
          pattern: /(password|apikey|secret)\s*=\s*['"][^'"]+['"]/gi,
          severity: 'critical'
        },
        {
          name: 'Console.log in production code',
          pattern: /console\.log\(/g,
          severity: 'low',
          exclude: ['test', 'debug', 'script']
        },
        {
          name: 'TODO/FIXME comments',
          pattern: /\/\/\s*(TODO|FIXME)/gi,
          severity: 'info'
        },
        {
          name: 'Deprecated require syntax',
          pattern: /require\(['"]\.\/.*\.js['"]\)/g,
          severity: 'medium'
        }
      ];
      
      checks.forEach(check => {
        // Skip if file should be excluded
        if (check.exclude && check.exclude.some(exc => relativePath.includes(exc))) {
          return;
        }
        
        const matches = content.match(check.pattern);
        if (matches && matches.length > 0) {
          errors.push({
            file: relativePath,
            issue: check.name,
            count: matches.length,
            severity: check.severity
          });
        }
      });
    } catch (error) {
      // Skip files we can't read
    }
  }
  
  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
            scanDir(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          checkFile(fullPath);
        }
      }
    } catch (error) {
      // Skip
    }
  }
  
  scanDir(path.join(PROJECT_ROOT, 'routes'));
  scanDir(path.join(PROJECT_ROOT, 'services'));
  
  if (errors.length > 0) {
    console.log(`Found ${errors.length} potential issues:\n`);
    
    const bySeverity = {
      critical: errors.filter(e => e.severity === 'critical'),
      high: errors.filter(e => e.severity === 'high'),
      medium: errors.filter(e => e.severity === 'medium'),
      low: errors.filter(e => e.severity === 'low')
    };
    
    Object.entries(bySeverity).forEach(([severity, items]) => {
      if (items.length > 0) {
        console.log(`${severity.toUpperCase()}:`);
        items.slice(0, 5).forEach(item => {
          console.log(`   ${item.file}: ${item.issue} (${item.count}x)`);
        });
        if (items.length > 5) {
          console.log(`   ... and ${items.length - 5} more`);
        }
        console.log('');
      }
    });
    
    results.errors = errors;
    results.summary.totalErrors = errors.length;
  } else {
    console.log('✅ No common errors detected\n');
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('DUPLICATE & ERROR DETECTION REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 Summary:\n');
  console.log(`   Duplicate file sets: ${results.duplicateFiles.length}`);
  console.log(`   Multiple DB instances: ${results.multipleInstances.length > 1 ? 'Yes ⚠️' : 'No ✅'}`);
  console.log(`   Potential issues: ${results.summary.totalErrors}`);
  console.log('');
  
  if (results.duplicateFiles.length > 0) {
    console.log('🔴 ACTION REQUIRED: Remove duplicate files\n');
  }
  
  if (results.multipleInstances.length > 1) {
    console.log('🔴 ACTION REQUIRED: Consolidate database connections to db/index.js\n');
  }
  
  // Save report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-5-duplicate-detection.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Report saved: agent-5-duplicate-detection.json\n');
}

// Run all checks
findDuplicateFiles();
findMultipleDatabaseInstances();
checkCommonErrors();
generateReport();
