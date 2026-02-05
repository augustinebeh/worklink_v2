#!/usr/bin/env node
/**
 * AGENT 33: Status Mapping Cross-Reference
 * Identifies mismatches between DB, API, and Frontend
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AGENT 33: Status Mapping Cross-Reference');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();

console.log('1️⃣ ANALYZING BACKEND STATUS MAPPING:\n');

const jobsApiPath = path.join(PROJECT_ROOT, 'routes/api/v1/jobs.js');
if (fs.existsSync(jobsApiPath)) {
  const apiContent = fs.readFileSync(jobsApiPath, 'utf-8');
  
  // Extract the stats object initialization
  const statsInitMatch = apiContent.match(/const stats = \{[\s\S]*?\}/);
  if (statsInitMatch) {
    console.log('   Backend initializes these statuses:');
    const statuses = statsInitMatch[0].match(/(\w+):\s*0/g);
    if (statuses) {
      statuses.forEach(s => {
        const name = s.match(/(\w+):/)[1];
        console.log(`      - ${name}: 0 (default)`);
      });
    }
    console.log('');
  }
  
  // Extract the status mapping conditions
  console.log('   Backend status mapping rules:');
  const mappingRules = apiContent.match(/if\s*\(stat\.status\s*===\s*['"](\w+)['"]\)\s*stats\.(\w+)/g);
  if (mappingRules) {
    mappingRules.forEach(rule => {
      const match = rule.match(/['"](\w+)['"]\).*?stats\.(\w+)/);
      if (match) {
        console.log(`      DB "${match[1]}" → API stats.${match[2]}`);
      }
    });
  }
}

console.log('\n2️⃣ ANALYZING FRONTEND STATUS EXPECTATIONS:\n');

const jobsPagePath = path.join(PROJECT_ROOT, 'admin/src/pages/Jobs.jsx');
if (fs.existsSync(jobsPagePath)) {
  const frontendContent = fs.readFileSync(jobsPagePath, 'utf-8');
  
  // Find stats property accesses
  const statsAccess = frontendContent.match(/stats\.(\w+)/g);
  if (statsAccess) {
    const unique = [...new Set(statsAccess)].map(s => s.replace('stats.', ''));
    console.log('   Frontend expects these stats properties:');
    unique.forEach(prop => {
      console.log(`      - stats.${prop}`);
    });
  }
}

console.log('\n3️⃣ CROSS-REFERENCE ANALYSIS:\n');

console.log('   Common Job Statuses:');
console.log('      Database: open, filled, completed, closed, draft, pending');
console.log('      API (current): open, filled, completed');
console.log('      Frontend (expected): total, open, filled, completed\n');

console.log('4️⃣ POTENTIAL MISMATCH SCENARIOS:\n');

console.log('   Scenario A: Frontend requests stats.total');
console.log('               Backend returns: data.total ❌ (should be in data, not stats)');
console.log('');
console.log('   Scenario B: Job has status "closed"');
console.log('               Backend checks: if (status === "closed")');
console.log('               No matching condition → count stays 0 ❌');
console.log('');
console.log('   Scenario C: Frontend displays stats.draft');
console.log('               Backend only tracks: open, filled, completed');
console.log('               Result: undefined → shows 0 ❌');

console.log('\n5️⃣ DIAGNOSIS:\n');

console.log('   The issue is likely one of these:');
console.log('');
console.log('   ❌ MISMATCH 1: Backend only maps 3 statuses (open, filled, completed)');
console.log('      but database has more (draft, closed, pending, etc.)');
console.log('');
console.log('   ❌ MISMATCH 2: Frontend expects different property names');
console.log('      than what backend returns');
console.log('');
console.log('   ❌ MISMATCH 3: Response structure (data vs stats object)');
console.log('      Frontend reads from wrong location');

console.log('\n' + '='.repeat(80));
console.log('STATUS MAPPING ANALYSIS COMPLETE');
console.log('='.repeat(80) + '\n');

console.log('💡 RECOMMENDATION:\n');
console.log('1. Check agent-32 output to see actual API response');
console.log('2. Compare API response format with frontend expectations');
console.log('3. Ensure all database statuses are mapped in backend code');
console.log('4. Add missing status mappings if needed\n');
