#!/usr/bin/env node
/**
 * 🤖 AGENT 5: Auto-Fixer
 * Automatically fixes common issues found by other agents
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  fixes: [],
  errors: [],
  backups: []
};

console.log('🤖 AGENT 5: Auto-Fixer');
console.log('='.repeat(80) + '\n');

/**
 * Create backup of file
 */
function createBackup(filePath) {
  try {
    const backupPath = `${filePath}.AGENT_BACKUP`;
    fs.copyFileSync(filePath, backupPath);
    results.backups.push(backupPath);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to create backup: ${error.message}`);
    return false;
  }
}

/**
 * Fix npm start script
 */
function fixNpmStartScript() {
  console.log('🔧 Checking npm start script...\n');
  
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  const expectedStart = 'npm run build:all && npm run start:server';
  const expectedStartServer = 'PORT=8080 NODE_ENV=production node server.js';
  
  let needsFix = false;
  let changes = [];
  
  // Check start script
  if (pkg.scripts.start !== expectedStart) {
    console.log('⚠️  npm start needs fixing');
    console.log(`   Current: "${pkg.scripts.start}"`);
    console.log(`   Expected: "${expectedStart}"`);
    needsFix = true;
    changes.push(`start: "${expectedStart}"`);
  }
  
  // Check start:server script
  if (pkg.scripts['start:server'] !== expectedStartServer) {
    console.log('⚠️  npm start:server needs fixing');
    console.log(`   Current: "${pkg.scripts['start:server']}"`);
    console.log(`   Expected: "${expectedStartServer}"`);
    needsFix = true;
    changes.push(`start:server: "${expectedStartServer}"`);
  }
  
  if (needsFix) {
    console.log('\n🔧 Applying fixes...\n');
    
    if (createBackup(pkgPath)) {
      pkg.scripts.start = expectedStart;
      pkg.scripts['start:server'] = expectedStartServer;
      
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      
      console.log('✅ Fixed npm scripts in package.json');
      changes.forEach(change => console.log(`   - ${change}`));
      console.log('');
      
      results.fixes.push({
        file: 'package.json',
        type: 'npm_scripts',
        changes: changes
      });
    }
  } else {
    console.log('✅ npm scripts are correct\n');
  }
}

/**
 * Fix old database imports
 */
function fixDatabaseImports() {
  console.log('🔧 Checking for old database imports...\n');
  
  const filesToCheck = [
    'db/migrate.js',
    'db/seed-ad-data.js',
    'db/seed-slm-data.js'
  ];
  
  let fixedCount = 0;
  
  filesToCheck.forEach(file => {
    const filePath = path.join(PROJECT_ROOT, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  ${file} not found`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if it uses old import
    if (content.includes("require('./database')") && !content.includes("require('./index')")) {
      console.log(`   🔧 Fixing ${file}...`);
      
      if (createBackup(filePath)) {
        const fixed = content.replace(/require\(['"]\.\/database['"]\)/g, "require('./index')");
        fs.writeFileSync(filePath, fixed);
        
        console.log(`   ✅ Fixed database import in ${file}`);
        fixedCount++;
        
        results.fixes.push({
          file: file,
          type: 'database_import',
          changes: ["require('./database') → require('./index')"]
        });
      }
    } else {
      console.log(`   ✅ ${file} - import is correct`);
    }
  });
  
  if (fixedCount > 0) {
    console.log(`\n✅ Fixed ${fixedCount} database import(s)\n`);
  } else {
    console.log('\n✅ All database imports are correct\n');
  }
}

/**
 * Ensure server.js uses PORT from environment
 */
function fixServerPort() {
  console.log('🔧 Checking server.js port configuration...\n');
  
  const serverPath = path.join(PROJECT_ROOT, 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ server.js not found!\n');
    results.errors.push('server.js missing');
    return;
  }
  
  let content = fs.readFileSync(serverPath, 'utf-8');
  const lines = content.split('\n');
  
  // Find port line
  let portLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('const PORT') || lines[i].includes('const port')) {
      portLineIndex = i;
      break;
    }
  }
  
  if (portLineIndex >= 0) {
    const currentLine = lines[portLineIndex];
    console.log(`   Current: ${currentLine.trim()}`);
    
    // Check if it's properly configured
    const isCorrect = currentLine.includes('process.env.PORT') && currentLine.includes('8080');
    
    if (!isCorrect) {
      console.log('   ⚠️  Port configuration needs fixing');
      console.log('\n🔧 Applying fix...\n');
      
      if (createBackup(serverPath)) {
        lines[portLineIndex] = 'const PORT = process.env.PORT || 8080;';
        content = lines.join('\n');
        fs.writeFileSync(serverPath, content);
        
        console.log('✅ Fixed server.js port configuration');
        console.log('   New: const PORT = process.env.PORT || 8080;\n');
        
        results.fixes.push({
          file: 'server.js',
          type: 'port_config',
          changes: ['Set PORT = process.env.PORT || 8080']
        });
      }
    } else {
      console.log('   ✅ Port configuration is correct\n');
    }
  } else {
    console.log('   ⚠️  Could not find PORT declaration\n');
  }
}

/**
 * Generate report
 */
function generateReport() {
  console.log('='.repeat(80));
  console.log('📋 AGENT 5 RESULTS');
  console.log('='.repeat(80) + '\n');
  
  console.log(`Fixes applied: ${results.fixes.length}`);
  console.log(`Backups created: ${results.backups.length}`);
  console.log(`Errors: ${results.errors.length}`);
  console.log('');
  
  if (results.fixes.length > 0) {
    console.log('✅ FIXES APPLIED:\n');
    results.fixes.forEach(fix => {
      console.log(`📝 ${fix.file} (${fix.type})`);
      fix.changes.forEach(change => {
        console.log(`   - ${change}`);
      });
      console.log('');
    });
  }
  
  if (results.backups.length > 0) {
    console.log('💾 BACKUPS CREATED:\n');
    results.backups.forEach(backup => {
      console.log(`   - ${path.basename(backup)}`);
    });
    console.log('');
    console.log('To restore: mv <file>.AGENT_BACKUP <file>\n');
  }
  
  if (results.errors.length > 0) {
    console.log('❌ ERRORS:\n');
    results.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    console.log('');
  }
  
  // Save report
  const reportPath = path.join(PROJECT_ROOT, 'agent-5-auto-fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: agent-5-auto-fix-report.json\n`);
}

// Run all fixes
try {
  fixNpmStartScript();
  fixDatabaseImports();
  fixServerPort();
  generateReport();
} catch (error) {
  console.error('❌ Agent 5 encountered an error:', error.message);
  process.exit(1);
}
