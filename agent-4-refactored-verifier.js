#!/usr/bin/env node
/**
 * 🤖 AGENT 4: Refactored Files Integrity Checker
 * Verifies all refactored modules work correctly
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  refactoredModules: [],
  brokenImports: [],
  missingFiles: [],
  circularDeps: [],
  summary: {
    totalModules: 0,
    workingModules: 0,
    issues: 0
  }
};

console.log('🤖 AGENT 4: Refactored Files Integrity Checker');
console.log('='.repeat(80) + '\n');

/**
 * List of refactored modules to verify
 */
const REFACTORED_MODULES = [
  { name: 'websocket', path: 'websocket/index.js' },
  { name: 'database', path: 'db/index.js' },
  { name: 'candidates-routes', path: 'routes/api/v1/candidates/index.js' },
  { name: 'chat-routes', path: 'routes/api/v1/chat/index.js' },
  { name: 'gamification-routes', path: 'routes/api/v1/gamification/index.js' },
  { name: 'auth-routes', path: 'routes/api/v1/auth/index.js' },
  { name: 'ai-automation-routes', path: 'routes/api/v1/ai-automation/index.js' },
  { name: 'smart-response-router', path: 'routes/api/v1/smart-response-router/index.js' },
  { name: 'consultant-performance', path: 'routes/api/v1/consultant-performance/index.js' }
];

/**
 * Check if module exists
 */
function checkModuleExists(module) {
  const fullPath = path.join(PROJECT_ROOT, module.path);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    console.log(`✅ ${module.name}: ${module.path}`);
    return true;
  } else {
    console.log(`❌ ${module.name}: NOT FOUND`);
    console.log(`   Expected: ${module.path}`);
    results.missingFiles.push(module);
    return false;
  }
}

/**
 * Verify module can be loaded
 */
function verifyModuleLoads(module) {
  const fullPath = path.join(PROJECT_ROOT, module.path);
  
  try {
    // Check syntax by reading
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // Check for exports
    const hasExports = content.includes('module.exports') || 
                       content.includes('export ') ||
                       content.includes('exports.');
    
    if (!hasExports) {
      console.log(`   ⚠️  No exports found`);
      results.brokenImports.push({
        module: module.name,
        issue: 'No exports detected',
        path: module.path
      });
    }
    
    // Check for common syntax errors
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      console.log(`   ⚠️  Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
      results.brokenImports.push({
        module: module.name,
        issue: 'Unbalanced braces',
        path: module.path
      });
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error reading: ${error.message}`);
    results.brokenImports.push({
      module: module.name,
      issue: error.message,
      path: module.path
    });
    return false;
  }
}

/**
 * Check module dependencies
 */
function checkModuleDependencies(module) {
  const fullPath = path.join(PROJECT_ROOT, module.path);
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    let hasIssues = false;
    
    lines.forEach((line, idx) => {
      // Check for old imports
      if (line.includes('require') || line.includes('import')) {
        // Check for refactored module references
        if (line.includes('db/database') && !line.includes('db/database/')) {
          console.log(`   ⚠️  Line ${idx + 1}: Old database import`);
          console.log(`      ${line.trim()}`);
          hasIssues = true;
        }
        
        if (line.includes('../../../db/database')) {
          console.log(`   ⚠️  Line ${idx + 1}: Should use '../../../db'`);
          console.log(`      ${line.trim()}`);
          hasIssues = true;
        }
      }
    });
    
    return !hasIssues;
  } catch (error) {
    return false;
  }
}

/**
 * Verify all refactored modules
 */
function verifyAllModules() {
  console.log('🔍 Verifying refactored modules...\n');
  
  REFACTORED_MODULES.forEach(module => {
    results.summary.totalModules++;
    
    const exists = checkModuleExists(module);
    
    if (exists) {
      const loads = verifyModuleLoads(module);
      const depsOk = checkModuleDependencies(module);
      
      if (loads && depsOk) {
        results.summary.workingModules++;
      }
    }
    
    console.log('');
    
    results.refactoredModules.push({
      name: module.name,
      path: module.path,
      exists: exists
    });
  });
}

/**
 * Check for circular dependencies
 */
function checkCircularDependencies() {
  console.log('🔄 Checking for circular dependencies...\n');
  
  // Check websocket <-> routes
  const wsPath = path.join(PROJECT_ROOT, 'websocket/index.js');
  if (fs.existsSync(wsPath)) {
    const wsContent = fs.readFileSync(wsPath, 'utf-8');
    
    if (wsContent.includes('require(\'./routes') || wsContent.includes('require(\'../routes')) {
      console.log('⚠️  websocket imports from routes (potential circular dep)');
      results.circularDeps.push('websocket -> routes');
    } else {
      console.log('✅ websocket does not import routes');
    }
  }
  
  // Check db <-> services
  const dbPath = path.join(PROJECT_ROOT, 'db/index.js');
  if (fs.existsSync(dbPath)) {
    const dbContent = fs.readFileSync(dbPath, 'utf-8');
    
    if (dbContent.includes('require(\'../services')) {
      console.log('⚠️  db imports from services (potential circular dep)');
      results.circularDeps.push('db -> services');
    } else {
      console.log('✅ db does not import services');
    }
  }
  
  console.log('');
}

/**
 * Generate report
 */
function generateReport() {
  console.log('='.repeat(80));
  console.log('📋 AGENT 4 FINDINGS');
  console.log('='.repeat(80) + '\n');
  
  console.log('Module Integrity:');
  console.log(`  Total refactored modules: ${results.summary.totalModules}`);
  console.log(`  Working modules: ${results.summary.workingModules}`);
  console.log(`  Missing files: ${results.missingFiles.length}`);
  console.log(`  Import issues: ${results.brokenImports.length}`);
  console.log(`  Circular dependencies: ${results.circularDeps.length}`);
  console.log('');
  
  if (results.missingFiles.length > 0) {
    console.log('❌ MISSING FILES:\n');
    results.missingFiles.forEach(file => {
      console.log(`  - ${file.name}: ${file.path}`);
    });
    console.log('');
  }
  
  if (results.brokenImports.length > 0) {
    console.log('⚠️  IMPORT ISSUES:\n');
    results.brokenImports.forEach(issue => {
      console.log(`  - ${issue.module}: ${issue.issue}`);
      console.log(`    ${issue.path}`);
    });
    console.log('');
  }
  
  if (results.circularDeps.length > 0) {
    console.log('🔄 CIRCULAR DEPENDENCIES:\n');
    results.circularDeps.forEach(dep => {
      console.log(`  - ${dep}`);
    });
    console.log('');
  }
  
  if (results.summary.workingModules === results.summary.totalModules &&
      results.missingFiles.length === 0 &&
      results.brokenImports.length === 0 &&
      results.circularDeps.length === 0) {
    console.log('✅ ALL REFACTORED MODULES WORKING CORRECTLY!\n');
  } else {
    console.log('⚠️  Issues found that need attention\n');
  }
  
  // Save report
  results.summary.issues = results.missingFiles.length + 
                          results.brokenImports.length + 
                          results.circularDeps.length;
  
  const reportPath = path.join(PROJECT_ROOT, 'agent-4-refactored-files-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: agent-4-refactored-files-report.json\n`);
}

// Run all checks
try {
  verifyAllModules();
  checkCircularDependencies();
  generateReport();
} catch (error) {
  console.error('❌ Agent 4 encountered an error:', error.message);
  process.exit(1);
}
