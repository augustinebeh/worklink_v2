#!/usr/bin/env node
/**
 * Automated Import Updater
 * Updates all imports from monolithic/wrapper files to new modular structure
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data', 'public/uploads', 'test-screenshots', 'test-videos'];

// Import replacement rules
const IMPORT_REPLACEMENTS = {
  // Database imports - update to use modular structure
  'db/database': {
    newPath: 'db',
    exports: ['db', 'initDatabase', 'closeDatabase', 'resetToSampleData'],
    description: 'Database wrapper → db/index.js (modular)'
  },
  '../db/database': {
    newPath: '../db',
    relativeDepth: 1,
    exports: ['db', 'initDatabase', 'closeDatabase', 'resetToSampleData'],
    description: 'Database wrapper → db/index.js (modular)'
  },
  '../../db/database': {
    newPath: '../../db',
    relativeDepth: 2,
    exports: ['db', 'initDatabase', 'closeDatabase', 'resetToSampleData'],
    description: 'Database wrapper → db/index.js (modular)'
  },
  '../../../db/database': {
    newPath: '../../../db',
    relativeDepth: 3,
    exports: ['db', 'initDatabase', 'closeDatabase', 'resetToSampleData'],
    description: 'Database wrapper → db/index.js (modular)'
  },
  '../../../../db/database': {
    newPath: '../../../../db',
    relativeDepth: 4,
    exports: ['db', 'initDatabase', 'closeDatabase', 'resetToSampleData'],
    description: 'Database wrapper → db/index.js (modular)'
  },
  '../../../../../db/database': {
    newPath: '../../../../../db',
    relativeDepth: 5,
    exports: ['db', 'initDatabase', 'closeDatabase', 'resetToSampleData'],
    description: 'Database wrapper → db/index.js (modular)'
  },
  './db/database': {
    newPath: './db',
    relativeDepth: 0,
    exports: ['db', 'initDatabase', 'closeDatabase', 'resetToSampleData'],
    description: 'Database wrapper → db/index.js (modular)'
  },
  
  // WebSocket imports - update to use modular structure
  './websocket': {
    newPath: './websocket',
    exports: ['setupWebSocket', 'broadcastToAdmins', 'broadcastToCandidate', 'EventTypes'],
    description: 'Already using modular structure',
    skip: true // Already correct
  },
  '../websocket': {
    newPath: '../websocket',
    relativeDepth: 1,
    exports: ['setupWebSocket', 'broadcastToAdmins', 'broadcastToCandidate', 'EventTypes'],
    description: 'Already using modular structure',
    skip: true // Already correct
  },
  '../../websocket': {
    newPath: '../../websocket',
    relativeDepth: 2,
    exports: ['setupWebSocket', 'broadcastToAdmins', 'broadcastToCandidate', 'EventTypes'],
    description: 'Already using modular structure',
    skip: true // Already correct
  }
};

const results = {
  filesScanned: 0,
  filesUpdated: 0,
  importsUpdated: 0,
  errors: [],
  updates: []
};

/**
 * Check if line contains an import that needs updating
 */
function needsUpdate(line) {
  for (const [oldPath, config] of Object.entries(IMPORT_REPLACEMENTS)) {
    if (config.skip) continue;
    
    // Check for require statements
    if (line.includes(`require('${oldPath}')`) || 
        line.includes(`require("${oldPath}")`)) {
      return { oldPath, config, type: 'require' };
    }
    
    // Check for import statements
    if (line.includes(`from '${oldPath}'`) || 
        line.includes(`from "${oldPath}"`)) {
      return { oldPath, config, type: 'import' };
    }
  }
  
  return null;
}

/**
 * Update a single line
 */
function updateLine(line, updateInfo) {
  const { oldPath, config } = updateInfo;
  const newPath = config.newPath;
  
  // Update require statements
  let updatedLine = line
    .replace(new RegExp(`require\\(['"]${oldPath.replace(/\//g, '\\/')}['"]\\)`, 'g'), 
             `require('${newPath}')`)
    .replace(new RegExp(`require\\(["']${oldPath.replace(/\//g, '\\/')}["']\\)`, 'g'), 
             `require("${newPath}")`);
  
  // Update import statements  
  updatedLine = updatedLine
    .replace(new RegExp(`from ['"]${oldPath.replace(/\//g, '\\/')}['"]`, 'g'), 
             `from '${newPath}'`)
    .replace(new RegExp(`from ["']${oldPath.replace(/\//g, '\\/')}["']`, 'g'), 
             `from "${newPath}"`);
  
  return updatedLine;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  results.filesScanned++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let hasChanges = false;
    const changes = [];
    
    const updatedLines = lines.map((line, idx) => {
      const updateInfo = needsUpdate(line);
      
      if (updateInfo) {
        const updatedLine = updateLine(line, updateInfo);
        
        if (updatedLine !== line) {
          hasChanges = true;
          results.importsUpdated++;
          
          changes.push({
            lineNumber: idx + 1,
            old: line.trim(),
            new: updatedLine.trim(),
            path: updateInfo.config.newPath
          });
          
          return updatedLine;
        }
      }
      
      return line;
    });
    
    if (hasChanges) {
      // Create backup
      const backupPath = filePath + '.BEFORE_IMPORT_UPDATE';
      fs.writeFileSync(backupPath, content);
      
      // Write updated content
      fs.writeFileSync(filePath, updatedLines.join('\n'));
      
      results.filesUpdated++;
      results.updates.push({
        file: path.relative(PROJECT_ROOT, filePath),
        changes,
        backup: path.relative(PROJECT_ROOT, backupPath)
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    results.errors.push({
      file: path.relative(PROJECT_ROOT, filePath),
      error: error.message
    });
    return false;
  }
}

/**
 * Scan directory recursively
 */
function scanDirectory(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.jsx', '.mjs'].includes(ext) && 
            !entry.name.includes('.BACKUP') && 
            !entry.name.includes('.DELETED') &&
            !entry.name.includes('.BEFORE_IMPORT_UPDATE')) {
          processFile(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('IMPORT UPDATE REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 Summary:\n');
  console.log(`   Files scanned: ${results.filesScanned}`);
  console.log(`   Files updated: ${results.filesUpdated}`);
  console.log(`   Imports updated: ${results.importsUpdated}`);
  console.log(`   Errors: ${results.errors.length}`);
  console.log('');
  
  if (results.filesUpdated > 0) {
    console.log('✅ FILES UPDATED:\n');
    console.log('─'.repeat(80));
    
    results.updates.forEach(update => {
      console.log(`\n📄 ${update.file}`);
      console.log(`   Backup: ${update.backup}`);
      console.log(`   Changes: ${update.changes.length}\n`);
      
      update.changes.forEach(change => {
        console.log(`   Line ${change.lineNumber}:`);
        console.log(`   - ${change.old}`);
        console.log(`   + ${change.new}`);
        console.log('');
      });
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  ERRORS:\n');
    console.log('─'.repeat(80));
    
    results.errors.forEach(error => {
      console.log(`\n📄 ${error.file}`);
      console.log(`   Error: ${error.error}`);
    });
    console.log('');
  }
  
  console.log('='.repeat(80));
  console.log('NEXT STEPS');
  console.log('='.repeat(80) + '\n');
  
  if (results.filesUpdated > 0) {
    console.log('1. Review the changes above');
    console.log('2. Test the application: npm start');
    console.log('3. If everything works, commit the changes');
    console.log('4. If issues occur, restore from backups (.BEFORE_IMPORT_UPDATE files)');
    console.log('');
    console.log('To restore all files:');
    console.log('  find . -name "*.BEFORE_IMPORT_UPDATE" -exec bash -c \'mv "$0" "${0%.BEFORE_IMPORT_UPDATE}"\' {} \\;');
    console.log('');
    console.log('To delete all backups (after confirming changes):');
    console.log('  find . -name "*.BEFORE_IMPORT_UPDATE" -delete');
  } else {
    console.log('✅ No imports need updating! Your codebase is already using the modular structure.');
  }
  
  console.log('');
  
  // Save detailed report
  const reportPath = path.join(PROJECT_ROOT, 'import-update-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      filesScanned: results.filesScanned,
      filesUpdated: results.filesUpdated,
      importsUpdated: results.importsUpdated,
      errors: results.errors.length
    },
    updates: results.updates,
    errors: results.errors
  }, null, 2));
  
  console.log(`📄 Detailed report saved: import-update-report.json\n`);
}

// Run the updater
console.log('🔄 AUTOMATED IMPORT UPDATER');
console.log('='.repeat(80));
console.log('\nUpdating imports from wrapper files to modular structure...\n');

scanDirectory(PROJECT_ROOT);
generateReport();

console.log('✅ Import update complete!\n');
