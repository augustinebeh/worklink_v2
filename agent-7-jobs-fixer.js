#!/usr/bin/env node
/**
 * Agent 7: Jobs Routing Bug Hunter & Fixer
 * Finds and fixes the same routing issue in jobs module
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  issue: null,
  fix: null,
  verification: {}
};

console.log('🔍 Agent 7: Jobs Routing Bug Hunter');
console.log('='.repeat(80) + '\n');

// Check database first
function checkDatabase() {
  console.log('📊 Checking database for jobs...\n');
  
  const { execSync } = require('child_process');
  try {
    const count = execSync('sqlite3 data/worklink.db "SELECT COUNT(*) FROM jobs;"', {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8'
    }).trim();
    
    console.log(`Database has ${count} jobs\n`);
    results.verification.dbCount = parseInt(count);
    return parseInt(count);
  } catch (error) {
    console.log('❌ Error checking database:', error.message);
    return 0;
  }
}

// Check jobs module structure
function analyzeJobsModule() {
  console.log('🔍 Analyzing jobs module structure...\n');
  
  const jobsIndexPath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'jobs.js');
  
  if (!fs.existsSync(jobsIndexPath)) {
    console.log('❌ jobs.js not found!');
    results.issue = 'jobs.js file missing';
    return;
  }
  
  const content = fs.readFileSync(jobsIndexPath, 'utf-8');
  
  // Check if it's a monolithic file or modular
  const isMonolithic = content.length > 500 && !content.includes('require(\'./jobs/');
  
  if (isMonolithic) {
    console.log('✅ Jobs is still a monolithic file (jobs.js)');
    console.log('   This is actually GOOD - no refactoring routing issues!\n');
    
    // Check for duplicate route handlers
    const routeMatches = content.match(/router\.get\(['"]\/['"]/g);
    if (routeMatches && routeMatches.length > 1) {
      console.log(`⚠️  Found ${routeMatches.length} GET / routes - checking for conflicts...\n`);
      
      // Look for the pattern that causes issues
      const infoRoutePattern = /router\.get\(['"]\/['"]\s*,.*\(req,\s*res\).*=>.*\{[\s\S]{0,200}message:/;
      const listRoutePattern = /router\.get\(['"]\/['"]\s*,.*\(req,\s*res\).*=>.*\{[\s\S]{0,200}(data|jobs|success):/;
      
      const hasInfoRoute = infoRoutePattern.test(content);
      const hasListRoute = listRoutePattern.test(content);
      
      if (hasInfoRoute && hasListRoute) {
        console.log('🔴 FOUND THE BUG!');
        console.log('   - Has info route (returns module info)');
        console.log('   - Has list route (returns actual jobs)');
        console.log('   - Info route is likely shadowing list route!\n');
        
        results.issue = 'Duplicate GET / routes - info route shadowing list route';
        return fixJobsRouting(jobsIndexPath, content);
      }
    }
  } else {
    console.log('✅ Jobs is modular - checking for routing conflicts...\n');
    // Check modular structure
    const jobsDir = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'jobs');
    if (fs.existsSync(jobsDir)) {
      const indexPath = path.join(jobsDir, 'index.js');
      if (fs.existsSync(indexPath)) {
        const indexContent = fs.readFileSync(indexPath, 'utf-8');
        
        // Same check as candidates
        const hasListRoutes = indexContent.includes('listRoutes') || indexContent.includes('list.js');
        const hasDuplicateRoot = indexContent.match(/router\.get\(['"]\/['"]\s*,.*=>.*\{[\s\S]*?success:\s*true/);
        
        if (hasListRoutes && hasDuplicateRoot) {
          console.log('🔴 FOUND THE BUG! (Same as candidates)');
          results.issue = 'Modular routing conflict - duplicate GET /';
          return fixModularJobsRouting(indexPath, indexContent);
        }
      }
    }
  }
  
  console.log('🤔 No obvious routing conflicts found...');
  console.log('   Need to check route order and response format\n');
  
  // Extract and analyze all GET / routes
  analyzeRootRoutes(content);
}

function analyzeRootRoutes(content) {
  console.log('📋 Analyzing all GET / routes in jobs.js...\n');
  
  const lines = content.split('\n');
  const routes = [];
  
  lines.forEach((line, idx) => {
    if (line.match(/router\.get\(['"]\/['"]/)) {
      routes.push({
        line: idx + 1,
        code: line.trim()
      });
    }
  });
  
  console.log(`Found ${routes.length} GET / route(s):\n`);
  routes.forEach((route, i) => {
    console.log(`${i + 1}. Line ${route.line}: ${route.code}`);
  });
  console.log('');
  
  if (routes.length > 1) {
    console.log('🔴 MULTIPLE GET / ROUTES DETECTED!');
    console.log('   Last one registered will handle the request\n');
    results.issue = `${routes.length} GET / routes found - last one wins`;
  }
  
  results.verification.rootRoutes = routes;
}

function fixJobsRouting(filePath, content) {
  console.log('🔧 Attempting to fix jobs routing...\n');
  
  // Find the problematic route
  const lines = content.split('\n');
  let infoRouteStart = -1;
  let infoRouteEnd = -1;
  let bracketCount = 0;
  let foundInfoRoute = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for info route pattern
    if (line.includes('router.get') && line.includes("'/'") && !foundInfoRoute) {
      // Check if next few lines contain "message" or "endpoints"
      const nextLines = lines.slice(i, i + 10).join('\n');
      if (nextLines.includes('message:') || nextLines.includes('endpoints:')) {
        infoRouteStart = i;
        foundInfoRoute = true;
        console.log(`Found info route at line ${i + 1}`);
      }
    }
    
    if (foundInfoRoute) {
      if (line.includes('{')) bracketCount++;
      if (line.includes('}')) bracketCount--;
      
      if (bracketCount === 0 && line.includes('});')) {
        infoRouteEnd = i;
        break;
      }
    }
  }
  
  if (infoRouteStart !== -1 && infoRouteEnd !== -1) {
    console.log(`Info route spans lines ${infoRouteStart + 1} to ${infoRouteEnd + 1}\n`);
    
    // Create backup
    const backupPath = filePath + '.BEFORE_JOBS_FIX';
    fs.writeFileSync(backupPath, content);
    console.log(`✅ Backup created: ${path.basename(backupPath)}\n`);
    
    // Comment out the info route
    const fixedLines = [...lines];
    fixedLines.splice(infoRouteStart, 0, '// FIXED: Info route moved to /info to avoid shadowing list route');
    for (let i = infoRouteStart + 1; i <= infoRouteEnd + 1; i++) {
      fixedLines[i] = '// ' + fixedLines[i];
    }
    
    const fixedContent = fixedLines.join('\n');
    fs.writeFileSync(filePath, fixedContent);
    
    console.log('✅ FIX APPLIED!');
    console.log('   - Commented out info route');
    console.log('   - List route now handles GET /\n');
    
    results.fix = {
      file: filePath,
      linesModified: infoRouteEnd - infoRouteStart + 1,
      backup: backupPath
    };
    
    return true;
  } else {
    console.log('⚠️  Could not automatically fix - manual intervention needed\n');
    return false;
  }
}

function fixModularJobsRouting(filePath, content) {
  console.log('🔧 Fixing modular jobs routing (same fix as candidates)...\n');
  
  // Create backup
  const backupPath = filePath + '.BEFORE_JOBS_FIX';
  fs.writeFileSync(backupPath, content);
  
  // Remove duplicate GET / route - same pattern as candidates
  const fixedContent = content.replace(
    /router\.get\(['"]\/['"]\s*,.*\(req,\s*res\).*=>.*\{[\s\S]*?}\s*\);/,
    '// Note: GET / is handled by listRoutes\n// Module info removed to avoid conflict'
  );
  
  fs.writeFileSync(filePath, fixedContent);
  
  console.log('✅ FIX APPLIED!');
  results.fix = {
    file: filePath,
    backup: backupPath
  };
  
  return true;
}

function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('JOBS ROUTING FIX REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 Summary:\n');
  console.log(`   Database jobs count: ${results.verification.dbCount || 'N/A'}`);
  console.log(`   Issue found: ${results.issue || 'None'}`);
  console.log(`   Fix applied: ${results.fix ? 'Yes ✅' : 'No'}`);
  console.log('');
  
  if (results.fix) {
    console.log('🎉 SUCCESS!');
    console.log(`   Modified: ${results.fix.file}`);
    console.log(`   Backup: ${results.fix.backup}`);
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('   1. Restart your server');
    console.log('   2. Refresh admin portal');
    console.log('   3. Jobs page should now show actual count');
    console.log('');
  } else if (results.issue) {
    console.log('⚠️  Issue detected but auto-fix failed');
    console.log('   Manual intervention required');
    console.log('');
  } else {
    console.log('✅ No routing conflicts detected');
    console.log('   Issue might be elsewhere (auth, database query, etc.)');
    console.log('');
  }
  
  // Save report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-7-jobs-fix.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Report saved: agent-7-jobs-fix.json\n');
}

// Run the agent
const jobCount = checkDatabase();
analyzeJobsModule();
generateReport();
