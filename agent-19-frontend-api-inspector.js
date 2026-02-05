#!/usr/bin/env node
/**
 * AGENT 19: Frontend API Client Inspector
 * Analyzes how frontend makes API calls to candidates endpoint
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔍 AGENT 19: Frontend API Client Inspector');
console.log('='.repeat(80) + '\n');

// Check API client configuration
console.log('1️⃣ CHECKING API CLIENT CONFIGURATION:\n');

const apiClientPath = path.join(PROJECT_ROOT, 'admin/src/shared/services/api/ApiClient.js');
if (fs.existsSync(apiClientPath)) {
  const content = fs.readFileSync(apiClientPath, 'utf-8');
  
  // Check base URL
  const baseUrlMatch = content.match(/baseURL[:\s=]+['"`]([^'"`]+)['"`]/);
  if (baseUrlMatch) {
    console.log(`   ✅ Base URL: ${baseUrlMatch[1]}`);
  } else {
    console.log(`   ⚠️  No base URL found`);
  }
  
  // Check if Authorization header is added
  if (content.includes('Authorization')) {
    console.log(`   ✅ Authorization header handling found`);
    
    // Extract the logic
    const authLines = content.split('\n').filter(line => 
      line.includes('Authorization') || line.includes('admin_token')
    );
    console.log(`   📋 Auth logic:`);
    authLines.forEach(line => {
      console.log(`      ${line.trim()}`);
    });
  } else {
    console.log(`   ❌ No Authorization header handling!`);
  }
  
  console.log('');
} else {
  console.log(`   ❌ ApiClient.js not found!\n`);
}

// Check candidates API endpoints
console.log('2️⃣ CHECKING CANDIDATES API ENDPOINTS:\n');

const candidatesApiPath = path.join(PROJECT_ROOT, 'admin/src/shared/services/api/candidates.js');
if (fs.existsSync(candidatesApiPath)) {
  const content = fs.readFileSync(candidatesApiPath, 'utf-8');
  
  console.log(`   📄 Found: candidates.js\n`);
  
  // Find getAll method
  const getAllMatch = content.match(/getAll[:\s]*(?:async\s*)?\([^)]*\)[^{]*{([^}]+)}/s);
  if (getAllMatch) {
    console.log(`   ✅ getAll method found:`);
    console.log(getAllMatch[0].split('\n').slice(0, 10).map(l => `      ${l}`).join('\n'));
    console.log('');
  } else {
    console.log(`   ❌ getAll method not found!\n`);
  }
} else {
  console.log(`   ❌ candidates.js not found!\n`);
}

// Check Candidates page component
console.log('3️⃣ CHECKING CANDIDATES PAGE COMPONENT:\n');

const candidatesPagePath = path.join(PROJECT_ROOT, 'admin/src/pages/Candidates.jsx');
if (fs.existsSync(candidatesPagePath)) {
  const content = fs.readFileSync(candidatesPagePath, 'utf-8');
  
  // Find where API is called
  const apiCallMatch = content.match(/api\.candidates\.getAll\([^)]*\)/g);
  if (apiCallMatch) {
    console.log(`   ✅ API calls found:`);
    apiCallMatch.forEach(call => {
      console.log(`      ${call}`);
    });
    console.log('');
  }
  
  // Check for error handling
  if (content.includes('catch')) {
    console.log(`   ✅ Error handling present`);
    const catchBlocks = content.match(/catch\s*\([^)]*\)\s*{[^}]+}/gs);
    if (catchBlocks) {
      console.log(`   📋 Error handlers:`);
      catchBlocks.slice(0, 3).forEach(block => {
        console.log(`      ${block.split('\n')[0]}`);
      });
    }
    console.log('');
  }
  
  // Check state management
  const stateVars = content.match(/const\s+\[([^,]+),\s*set[^\]]+\]\s*=\s*useState/g);
  if (stateVars) {
    console.log(`   📊 State variables:`);
    stateVars.forEach(v => {
      console.log(`      ${v}`);
    });
    console.log('');
  }
} else {
  console.log(`   ❌ Candidates.jsx not found!\n`);
}

console.log('='.repeat(80));
console.log('DIAGNOSIS');
console.log('='.repeat(80) + '\n');

console.log('🔧 POSSIBLE ISSUES:\n');
console.log('1. Check if API base URL is correct');
console.log('2. Check if Authorization header is being sent');
console.log('3. Check if token is stored in localStorage');
console.log('4. Check if API response is being parsed correctly');
console.log('5. Check browser console for errors\n');

console.log('📋 NEXT STEPS:\n');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Network tab');
console.log('3. Refresh admin portal');
console.log('4. Look for /api/v1/candidates request');
console.log('5. Check request headers and response\n');

const report = {
  apiClientExists: fs.existsSync(apiClientPath),
  candidatesApiExists: fs.existsSync(candidatesApiPath),
  candidatesPageExists: fs.existsSync(candidatesPagePath)
};

fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-19-frontend-api-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Report saved: agent-19-frontend-api-report.json\n');
