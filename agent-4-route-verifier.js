#!/usr/bin/env node
/**
 * Agent 4: Route & Refactored Module Verifier
 * Ensures all routes use refactored modules correctly
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups'];

const results = {
  routes: [],
  refactoredModules: [],
  issues: [],
  moduleUsage: {},
  summary: {
    totalRoutes: 0,
    usingRefactored: 0,
    notUsingRefactored: 0
  }
};

console.log('🔍 Agent 4: Route & Refactored Module Verification');
console.log('='.repeat(80) + '\n');

/**
 * Expected refactored modules
 */
const REFACTORED_MODULES = [
  { name: 'websocket', path: './websocket', oldPath: './websocket.js' },
  { name: 'database', path: './db', oldPaths: ['./db/database', './database'] },
  { name: 'candidates', path: './routes/api/v1/candidates', oldPath: './routes/api/v1/candidates.js' },
  { name: 'chat', path: './routes/api/v1/chat', oldPath: './routes/api/v1/chat.js' },
  { name: 'gamification', path: './routes/api/v1/gamification', oldPath: './routes/api/v1/gamification.js' },
  { name: 'auth', path: './routes/api/v1/auth', oldPath: './routes/api/v1/auth.js' }
];

/**
 * Scan for route files
 */
function findRouteFiles() {
  console.log('🔍 Scanning for route files...\n');
  
  const routeDir = path.join(PROJECT_ROOT, 'routes');
  if (!fs.existsSync(routeDir)) {
    console.log('❌ routes/ directory not found!');
    results.issues.push({ file: 'routes/', issue: 'Directory not found', severity: 'critical' });
    return [];
  }
  
  const routes = [];
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !IGNORE_DIRS.includes(entry.name)) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        routes.push(fullPath);
      }
    }
  }
  
  scanDir(routeDir);
  console.log(`Found ${routes.length} route files\n`);
  return routes;
}

/**
 * Check if route uses refactored modules
 */
function checkRouteFile(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const routeInfo = {
    file: relativePath,
    refactoredModules: [],
    oldModules: [],
    imports: []
  };
  
  // Check for each refactored module
  REFACTORED_MODULES.forEach(module => {
    // Check new (refactored) import
    const newPattern = new RegExp(`require\\(['"]${module.path.replace(/\./g, '\\.')}['"]\\)`, 'g');
    const newMatches = content.match(newPattern);
    
    if (newMatches) {
      routeInfo.refactoredModules.push({
        module: module.name,
        count: newMatches.length,
        path: module.path
      });
      
      if (!results.moduleUsage[module.name]) {
        results.moduleUsage[module.name] = { refactored: 0, old: 0 };
      }
      results.moduleUsage[module.name].refactored += newMatches.length;
    }
    
    // Check old (monolithic) import
    const oldPaths = Array.isArray(module.oldPaths) ? module.oldPaths : [module.oldPath];
    oldPaths.forEach(oldPath => {
      const oldPattern = new RegExp(`require\\(['"]${oldPath.replace(/\./g, '\\.')}['"]\\)`, 'g');
      const oldMatches = content.match(oldPattern);
      
      if (oldMatches) {
        routeInfo.oldModules.push({
          module: module.name,
          count: oldMatches.length,
          oldPath: oldPath
        });
        
        if (!results.moduleUsage[module.name]) {
          results.moduleUsage[module.name] = { refactored: 0, old: 0 };
        }
        results.moduleUsage[module.name].old += oldMatches.length;
        
        results.issues.push({
          file: relativePath,
          issue: `Using old import: ${oldPath} (should use ${module.path})`,
          severity: 'high'
        });
      }
    });
  });
  
  // Extract all require statements
  const requirePattern = /require\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = requirePattern.exec(content)) !== null) {
    routeInfo.imports.push(match[1]);
  }
  
  return routeInfo;
}

/**
 * Verify refactored directory structure
 */
function verifyRefactoredStructure() {
  console.log('📁 Verifying refactored module structure...\n');
  
  REFACTORED_MODULES.forEach(module => {
    const modulePath = path.join(PROJECT_ROOT, module.path.replace('./', ''));
    
    // For directories, check index.js
    if (module.path.includes('routes/') || module.name === 'websocket' || module.name === 'database') {
      const indexPath = path.join(modulePath, 'index.js');
      
      if (fs.existsSync(indexPath)) {
        console.log(`✅ ${module.name}: Refactored module exists at ${module.path}/index.js`);
        results.refactoredModules.push({
          name: module.name,
          path: module.path,
          exists: true
        });
      } else if (fs.existsSync(modulePath + '.js')) {
        console.log(`⚠️  ${module.name}: Found as .js file (should be directory)`);
        results.issues.push({
          file: module.path,
          issue: 'Module is file, should be directory',
          severity: 'medium'
        });
      } else {
        console.log(`❌ ${module.name}: Module not found at ${module.path}`);
        results.issues.push({
          file: module.path,
          issue: 'Refactored module not found',
          severity: 'high'
        });
      }
    }
  });
}

/**
 * Generate module usage report
 */
function generateModuleUsageReport() {
  console.log('\n📊 Module Usage Summary:\n');
  
  Object.entries(results.moduleUsage).forEach(([moduleName, usage]) => {
    const total = usage.refactored + usage.old;
    const percentage = total > 0 ? ((usage.refactored / total) * 100).toFixed(1) : 0;
    
    console.log(`${moduleName}:`);
    console.log(`   Refactored imports: ${usage.refactored}`);
    console.log(`   Old imports: ${usage.old}`);
    console.log(`   Migration: ${percentage}% complete`);
    
    if (usage.old > 0) {
      console.log(`   ⚠️  ${usage.old} files still using old imports!`);
    } else if (usage.refactored > 0) {
      console.log(`   ✅ Fully migrated!`);
    }
    console.log('');
  });
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('ROUTE & REFACTORED MODULE VERIFICATION REPORT');
  console.log('='.repeat(80) + '\n');
  
  results.summary.totalRoutes = results.routes.length;
  results.summary.usingRefactored = results.routes.filter(r => r.refactoredModules.length > 0).length;
  results.summary.notUsingRefactored = results.routes.filter(r => r.oldModules.length > 0).length;
  
  console.log('📊 Summary:\n');
  console.log(`   Total routes scanned: ${results.summary.totalRoutes}`);
  console.log(`   Using refactored modules: ${results.summary.usingRefactored}`);
  console.log(`   Using old imports: ${results.summary.notUsingRefactored}`);
  console.log(`   Issues found: ${results.issues.length}`);
  console.log('');
  
  if (results.issues.length > 0) {
    console.log('⚠️  ISSUES:\n');
    
    const byFile = {};
    results.issues.forEach(issue => {
      if (!byFile[issue.file]) {
        byFile[issue.file] = [];
      }
      byFile[issue.file].push(issue);
    });
    
    Object.entries(byFile).forEach(([file, issues]) => {
      console.log(`📄 ${file}:`);
      issues.forEach(issue => {
        console.log(`   ${issue.severity === 'high' ? '🔴' : '🟡'} ${issue.issue}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ All routes using refactored modules!\n');
  }
  
  // Save report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-4-route-verification.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Report saved: agent-4-route-verification.json\n');
}

// Run all checks
console.log('Starting route verification...\n');
verifyRefactoredStructure();
const routeFiles = findRouteFiles();
routeFiles.forEach(file => {
  const info = checkRouteFile(file);
  results.routes.push(info);
});
generateModuleUsageReport();
generateReport();
