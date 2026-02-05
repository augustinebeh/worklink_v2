#!/usr/bin/env node
/**
 * Agent 13: Frontend-Backend API Call Inspector
 * Checks what the frontend is actually requesting
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔍 Agent 13: Frontend API Call Inspector');
console.log('='.repeat(80) + '\n');

console.log('BACKEND IS CORRECT! Issue must be frontend calls.\n');
console.log('Let me check what endpoints the admin portal is calling...\n');

// Check admin source for API calls
const adminDir = path.join(PROJECT_ROOT, 'admin', 'src');

if (!fs.existsSync(adminDir)) {
  console.log('❌ Admin source not found. Checking if built...\n');
  
  const adminDist = path.join(PROJECT_ROOT, 'admin', 'dist');
  if (fs.existsSync(adminDist)) {
    console.log('✅ Admin is built but source not available\n');
    console.log('💡 SOLUTION: Check browser Network tab to see actual API calls\n');
  }
  process.exit(0);
}

// Find candidates page
console.log('📂 CHECKING CANDIDATES PAGE:\n');

function searchFiles(dir, pattern) {
  const results = [];
  
  function scan(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      
      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git'].includes(file)) {
            scan(fullPath);
          }
        } else if (file.match(pattern)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Skip
    }
  }
  
  scan(dir);
  return results;
}

// Find candidates related files
const candidateFiles = searchFiles(adminDir, /[Cc]andidate|[Ww]orker/);

console.log(`   Found ${candidateFiles.length} candidate-related files\n`);

candidateFiles.slice(0, 5).forEach(file => {
  const relativePath = path.relative(PROJECT_ROOT, file);
  console.log(`   📄 ${relativePath}`);
  
  const content = fs.readFileSync(file, 'utf-8');
  
  // Look for API calls
  const apiCalls = content.match(/\/api\/v1\/candidates[^\s'"}\])]*/g);
  
  if (apiCalls) {
    const unique = [...new Set(apiCalls)];
    unique.forEach(call => {
      console.log(`      → ${call}`);
    });
  }
});

console.log('');

// Find jobs page
console.log('📂 CHECKING JOBS PAGE:\n');

const jobFiles = searchFiles(adminDir, /[Jj]ob/);

console.log(`   Found ${jobFiles.length} job-related files\n`);

jobFiles.slice(0, 5).forEach(file => {
  const relativePath = path.relative(PROJECT_ROOT, file);
  console.log(`   📄 ${relativePath}`);
  
  const content = fs.readFileSync(file, 'utf-8');
  
  // Look for API calls
  const apiCalls = content.match(/\/api\/v1\/jobs[^\s'"}\])]*/g);
  
  if (apiCalls) {
    const unique = [...new Set(apiCalls)];
    unique.forEach(call => {
      console.log(`      → ${call}`);
    });
  }
});

console.log('\n' + '='.repeat(80));
console.log('DIAGNOSTIC INSTRUCTIONS');
console.log('='.repeat(80) + '\n');

console.log('To find the issue, check browser console:\n');
console.log('1. Open Admin Portal: http://localhost:8080/admin');
console.log('2. Open Browser DevTools (F12)');
console.log('3. Go to Network tab');
console.log('4. Navigate to Candidates page');
console.log('5. Check what API calls are made\n');

console.log('What to look for:\n');
console.log('   ✅ Call to /api/v1/candidates/stats');
console.log('   ✅ Response has data: { pending: 2, active: 1, inactive: 0 }');
console.log('   ❌ If response is different - BACKEND issue');
console.log('   ❌ If response correct but not showing - FRONTEND issue\n');

console.log('For Jobs page:\n');
console.log('   ✅ "Open" filter: /api/v1/jobs?status=open');
console.log('   ✅ "All" filter: /api/v1/jobs?status=all (or no status param)');
console.log('   ❌ Check what parameter is actually sent\n');

// Check if there's a query param issue
console.log('💡 COMMON ISSUES:\n');
console.log('   1. Frontend sending status="" instead of no param');
console.log('   2. Frontend not calling /stats endpoint');
console.log('   3. Frontend caching old response');
console.log('   4. Frontend has hardcoded 0 values');
console.log('   5. CORS blocking the request\n');

console.log('📄 Report saved: agent-13-api-inspector.txt\n');

fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-13-api-inspector.txt'),
  'Check browser Network tab for actual API calls and responses'
);
