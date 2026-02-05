#!/usr/bin/env node
/**
 * Agent 12: Jobs "All Status" Filter Fixer
 * Fixes jobs not showing when "All Status" is selected
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();
const results = { issue: null, fix: null };

console.log('🔧 Agent 12: Jobs "All Status" Filter Fixer');
console.log('='.repeat(80) + '\n');

// Check database
console.log('📊 DATABASE CHECK:\n');

try {
  const total = execSync('sqlite3 data/worklink.db "SELECT COUNT(*) FROM jobs;"',
    { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
  console.log(`   Total jobs: ${total}`);
  
  const statuses = execSync(
    'sqlite3 data/worklink.db "SELECT status, COUNT(*) FROM jobs GROUP BY status;"',
    { cwd: PROJECT_ROOT, encoding: 'utf-8' }
  ).trim();
  
  console.log(`   Status breakdown:`);
  statuses.split('\n').forEach(line => {
    console.log(`      ${line}`);
  });
  console.log('');
  
} catch (error) {
  console.log(`   Error: ${error.message}\n`);
}

// Analyze jobs.js filtering logic
console.log('🔍 ANALYZING JOBS FILTER LOGIC:\n');

const jobsPath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'jobs.js');
const content = fs.readFileSync(jobsPath, 'utf-8');

// Find the status filter logic
const filterMatch = content.match(/if \(status && status !== 'all'\) \{[\s\S]*?\}/);

if (filterMatch) {
  console.log('   Found filter logic:');
  console.log('   ' + filterMatch[0].split('\n').map(l => '   ' + l).join('\n'));
  console.log('');
  
  // Check if condition is correct
  if (content.includes("status !== 'all'")) {
    console.log('   ✅ Has "all" status exclusion\n');
    
    // But check if the query has WHERE 1=1
    const queryMatch = content.match(/let query = `[\s\S]*?WHERE 1=1/);
    
    if (!queryMatch) {
      console.log('   🔴 PROBLEM FOUND!');
      console.log('   Query missing "WHERE 1=1" base condition!');
      console.log('   This breaks when no filters are applied.\n');
      
      results.issue = 'Query missing WHERE 1=1 base condition';
    }
    
  } else {
    console.log('   🔴 PROBLEM FOUND!');
    console.log('   Missing check for status !== "all"');
    console.log('   When status="all", it applies filter anyway!\n');
    
    results.issue = 'Status filter applied even when "all" is selected';
    
    // Apply fix
    console.log('🔧 APPLYING FIX...\n');
    
    // Find and fix the status filter
    let fixedContent = content;
    
    // Pattern 1: if (status) { ... }
    if (content.match(/if \(status\) \{\s*query \+= ' AND j\.status = \?';/)) {
      fixedContent = fixedContent.replace(
        /if \(status\) \{\s*query \+= ' AND j\.status = \?';\s*params\.push\(status\);\s*\}/,
        `if (status && status !== 'all') {\n      query += ' AND j.status = ?';\n      params.push(status);\n    }`
      );
      
      console.log('   ✅ Fixed: Added status !== "all" check');
      results.fix = 'Added status !== "all" condition to filter';
    }
    
    // Pattern 2: Different format
    if (content.match(/if \(status\) \{[\s\S]*?params\.push\(status\)/)) {
      fixedContent = fixedContent.replace(
        /if \(status\) \{([\s\S]*?params\.push\(status\)[\s\S]*?)\}/,
        `if (status && status !== 'all') {$1}`
      );
      
      console.log('   ✅ Fixed: Added status !== "all" check');
      results.fix = 'Added status !== "all" condition to filter';
    }
    
    // Save backup and write fix
    if (fixedContent !== content) {
      fs.writeFileSync(jobsPath + '.BEFORE_FILTER_FIX', content);
      fs.writeFileSync(jobsPath, fixedContent);
      
      console.log('   ✅ Backup created: jobs.js.BEFORE_FILTER_FIX\n');
    }
  }
  
} else {
  console.log('   ⚠️  Could not find status filter logic\n');
  console.log('   Showing first 100 lines of GET / route:\n');
  
  // Show the route handler
  const lines = content.split('\n');
  const getRouteIdx = lines.findIndex(l => l.includes("router.get('/',"));
  if (getRouteIdx !== -1) {
    lines.slice(getRouteIdx, getRouteIdx + 30).forEach((line, i) => {
      console.log(`   ${getRouteIdx + i + 1}: ${line}`);
    });
  }
  console.log('');
}

// Double-check: Look for the exact issue
console.log('🔎 DETAILED ANALYSIS:\n');

// Check the exact filter condition
const statusFilterLines = content.split('\n').filter(l => 
  l.includes('status') && (l.includes('query +=') || l.includes('if (status'))
);

console.log('   Status filter lines:');
statusFilterLines.forEach(line => {
  console.log('      ' + line.trim());
});
console.log('');

// Check if it's checking for 'all'
const checksForAll = content.includes("status !== 'all'") || content.includes('status != "all"');
console.log(`   Checks for "all": ${checksForAll ? '✅' : '❌ MISSING'}\n`);

if (!checksForAll) {
  console.log('🔴 CONFIRMED ISSUE: Missing "all" status check!\n');
  console.log('   When frontend sends status="all", backend still filters\n');
  console.log('   Result: No jobs shown because there\'s no status called "all" in DB\n');
  
  if (!results.fix) {
    // Manual fix needed
    console.log('🔧 MANUAL FIX REQUIRED:\n');
    console.log('   Change this line:');
    console.log('      if (status) {');
    console.log('   To:');
    console.log('      if (status && status !== \'all\') {');
    console.log('');
    
    results.issue = 'Status filter missing check for "all" - needs manual fix';
  }
}

// Save report
fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-12-jobs-filter-fix.json'),
  JSON.stringify(results, null, 2)
);

console.log('='.repeat(80));
console.log('REPORT: ' + (results.fix ? '✅ FIX APPLIED' : (results.issue ? '⚠️ MANUAL FIX NEEDED' : '✅ NO ISSUE')));
console.log('='.repeat(80) + '\n');

if (results.fix) {
  console.log('🎉 Jobs "All Status" should now work after server restart!\n');
} else if (results.issue) {
  console.log('⚠️  Issue identified but needs manual review\n');
}
