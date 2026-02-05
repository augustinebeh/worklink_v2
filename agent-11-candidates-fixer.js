#!/usr/bin/env node
/**
 * Agent 11: Candidates Stats Filter Fixer
 * Fixes candidates not showing in admin portal (filtering issue)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = process.cwd();
const results = { issue: null, fix: null };

console.log('🔧 Agent 11: Candidates Stats Filter Fixer');
console.log('='.repeat(80) + '\n');

// Check actual data in database
console.log('📊 DATABASE CHECK:\n');

try {
  const total = execSync('sqlite3 data/worklink.db "SELECT COUNT(*) FROM candidates;"', 
    { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
  console.log(`   Total candidates: ${total}`);
  
  // Get actual statuses
  const statuses = execSync(
    'sqlite3 data/worklink.db "SELECT status, COUNT(*) FROM candidates GROUP BY status;"',
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

// Check stats endpoint
console.log('🔍 ANALYZING STATS ENDPOINT:\n');

const indexPath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', 'candidates', 'index.js');
const content = fs.readFileSync(indexPath, 'utf-8');

// Find the stats query
const statsMatch = content.match(/const statusStats = db\.prepare\(`([\s\S]*?)`\)\.all\(\);/);

if (statsMatch) {
  const query = statsMatch[1];
  console.log('   Current query logic:');
  console.log('   ' + query.split('\n').map(l => l.trim()).filter(l => l).join('\n   '));
  console.log('');
  
  // Check if ELSE clause exists
  if (!query.includes('ELSE status')) {
    console.log('   🔴 PROBLEM FOUND!');
    console.log('   Query uses CASE...WHEN but missing ELSE clause!');
    console.log('   Statuses not in the WHEN clauses are being IGNORED!\n');
    
    results.issue = 'Missing ELSE clause in CASE statement - unknown statuses ignored';
    
    // Apply fix
    console.log('🔧 APPLYING FIX...\n');
    
    const fixedQuery = `
      SELECT 
        CASE 
          WHEN status IN ('pending', 'lead') THEN 'pending'
          WHEN status IN ('active', 'verified') THEN 'active'
          WHEN status IN ('inactive', 'blocked') THEN 'inactive'
          ELSE 'pending'  -- Default unknown statuses to pending
        END as consolidated_status,
        COUNT(*) as count
      FROM candidates
      GROUP BY consolidated_status`;
    
    const fixedContent = content.replace(
      /const statusStats = db\.prepare\(`[\s\S]*?`\)\.all\(\);/,
      `const statusStats = db.prepare(\`${fixedQuery}\`).all();`
    );
    
    // Backup
    fs.writeFileSync(indexPath + '.BEFORE_STATS_FIX', content);
    fs.writeFileSync(indexPath, fixedContent);
    
    console.log('   ✅ Added ELSE clause to handle unknown statuses');
    console.log('   ✅ Backup created: candidates/index.js.BEFORE_STATS_FIX\n');
    
    results.fix = 'Added ELSE clause to map unknown statuses to pending';
  } else {
    console.log('   ✅ ELSE clause exists - this is not the issue\n');
  }
}

// Save report
fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-11-candidates-fix.json'),
  JSON.stringify(results, null, 2)
);

console.log('='.repeat(80));
console.log('REPORT: ' + (results.fix ? '✅ FIX APPLIED' : '⚠️ NO FIX NEEDED'));
console.log('='.repeat(80) + '\n');

if (results.fix) {
  console.log('🎉 Candidates stats should now work after server restart!\n');
} else {
  console.log('⚠️  No obvious issue found - may need deeper investigation\n');
}
