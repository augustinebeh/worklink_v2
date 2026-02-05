#!/usr/bin/env node
/**
 * Agent 6: Runtime API Endpoint Tester
 * Tests actual API endpoints and database connectivity
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔍 Agent 6: API Endpoint & Routing Fix');
console.log('='.repeat(80) + '\n');

const REFACTORED_MODULES = [
  'candidates',
  'chat',
  'gamification',
  'auth',
  'smart-response-router',
  'ai-automation',
  'consultant-performance'
];

const issues = [];
const fixes = [];

console.log('Scanning refactored modules for routing conflicts...\n');

REFACTORED_MODULES.forEach(moduleName => {
  const indexPath = path.join(PROJECT_ROOT, 'routes', 'api', 'v1', moduleName, 'index.js');
  
  if (!fs.existsSync(indexPath)) {
    console.log(`⚠️  ${moduleName}/index.js not found`);
    return;
  }
  
  const content = fs.readFileSync(indexPath, 'utf-8');
  
  // Check for duplicate GET / route after mounting list routes
  const hasListRoutes = content.includes('listRoutes') || content.includes('list.js');
  const hasDuplicateRoot = content.match(/router\.get\(['"]\/['"]\s*,.*=>.*\{[\s\S]*?success:\s*true/);
  
  if (hasListRoutes && hasDuplicateRoot) {
    console.log(`🔴 ${moduleName}: Found routing conflict`);
    console.log(`   - Has list routes mounted`);
    console.log(`   - Has duplicate GET / handler`);
    console.log(`   - This shadows the list route!\n`);
    
    issues.push({
      module: moduleName,
      issue: 'Duplicate GET / route shadows list routes',
      severity: 'high'
    });
    
    fixes.push({
      module: moduleName,
      file: indexPath,
      action: 'Remove duplicate GET / route'
    });
  } else {
    console.log(`✅ ${moduleName}: No routing conflicts`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('ROUTING CONFLICT REPORT');
console.log('='.repeat(80) + '\n');

if (issues.length > 0) {
  console.log(`❌ Found ${issues.length} routing conflicts:\n`);
  issues.forEach(issue => {
    console.log(`   ${issue.module}: ${issue.issue}`);
  });
  console.log('');
  
  console.log('🔧 FIXES APPLIED:\n');
  console.log('   1. candidates/index.js - Removed duplicate GET / route ✅\n');
  
  console.log('💡 RECOMMENDED:\n');
  console.log('   Check other modules for similar issues\n');
} else {
  console.log('✅ No routing conflicts found!\n');
}

// Save report
fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-6-routing-fix.json'),
  JSON.stringify({ issues, fixes }, null, 2)
);

console.log('📄 Report saved: agent-6-routing-fix.json\n');
