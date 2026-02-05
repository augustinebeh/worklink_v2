#!/usr/bin/env node
/**
 * Agent 17: Frontend API Call Inspector
 * Finds why candidates and jobs aren't showing on admin portal
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🔧 Agent 17: Frontend API Call Inspector');
console.log('='.repeat(80) + '\n');

// Search for files in a directory
function searchFiles(dir, pattern) {
  const results = [];
  
  function scan(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      
      for (const file of files) {
        const fullPath = path.join(currentDir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!['node_modules', 'dist', '.git', 'build'].includes(file)) {
            scan(fullPath);
          }
        } else if (file.match(pattern)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  }
  
  scan(dir);
  return results;
}

console.log('1️⃣ SEARCHING FOR CANDIDATES PAGE CODE:\n');

const adminSrc = path.join(PROJECT_ROOT, 'admin', 'src');
const candidatePages = searchFiles(adminSrc, /[Cc]andidate.*\.(jsx|js|tsx|ts)$/);

console.log(`   Found ${candidatePages.length} candidate-related files\n`);

let candidatesPagePath = null;
let candidatesApiPath = null;

// Find the main Candidates page
candidatePages.forEach(file => {
  const relativePath = path.relative(PROJECT_ROOT, file);
  
  if (file.includes('pages') && !file.includes('service') && !file.includes('api')) {
    console.log(`   📄 Page: ${relativePath}`);
    candidatesPagePath = file;
  } else if (file.includes('service') || file.includes('api')) {
    console.log(`   📡 API: ${relativePath}`);
    candidatesApiPath = file;
  }
});

console.log('');

// Analyze Candidates page
if (candidatesPagePath) {
  console.log('2️⃣ ANALYZING CANDIDATES PAGE API CALLS:\n');
  
  const content = fs.readFileSync(candidatesPagePath, 'utf-8');
  
  // Look for API calls
  const apiCalls = [];
  
  // Pattern 1: Direct fetch/axios calls
  const fetchMatches = content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g);
  if (fetchMatches) {
    fetchMatches.forEach(match => {
      const url = match.match(/['"`]([^'"`]+)['"`]/)[1];
      apiCalls.push({ type: 'fetch', url });
    });
  }
  
  // Pattern 2: API service calls
  const serviceMatches = content.match(/\w+Service\.\w+\([^)]*\)/g);
  if (serviceMatches) {
    serviceMatches.forEach(match => {
      apiCalls.push({ type: 'service', call: match });
    });
  }
  
  // Pattern 3: Endpoint constants
  const endpointMatches = content.match(/['"`]\/api\/v1\/[^'"`]+['"`]/g);
  if (endpointMatches) {
    endpointMatches.forEach(match => {
      const url = match.replace(/['"`]/g, '');
      if (!apiCalls.find(c => c.url === url)) {
        apiCalls.push({ type: 'endpoint', url });
      }
    });
  }
  
  console.log(`   Found ${apiCalls.length} API references:\n`);
  
  apiCalls.forEach((call, i) => {
    console.log(`   ${i + 1}. ${call.type}: ${call.url || call.call}`);
  });
  
  console.log('');
  
  // Check for query parameters
  console.log('   Checking for query parameters:\n');
  
  const queryParams = content.match(/\?[^'"`\s]+/g);
  if (queryParams) {
    const uniqueParams = [...new Set(queryParams)];
    uniqueParams.forEach(param => {
      console.log(`      ${param}`);
    });
  } else {
    console.log(`      ⚠️  No query parameters found in page code`);
  }
  
  console.log('');
}

// Analyze Candidates API service
if (candidatesApiPath) {
  console.log('3️⃣ ANALYZING CANDIDATES API SERVICE:\n');
  
  const content = fs.readFileSync(candidatesApiPath, 'utf-8');
  
  // Find all function definitions
  const functionMatches = content.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g);
  
  if (functionMatches) {
    console.log('   API Functions:\n');
    functionMatches.forEach(match => {
      const funcName = match.match(/(\w+)\s*\(/)[1];
      if (!['if', 'for', 'while', 'catch', 'function'].includes(funcName)) {
        console.log(`      - ${funcName}()`);
        
        // Find the endpoint for this function
        const funcStart = content.indexOf(match);
        const funcBody = content.substring(funcStart, funcStart + 500);
        
        const endpointMatch = funcBody.match(/['"`](\/api\/v1\/[^'"`]+)['"`]/);
        if (endpointMatch) {
          console.log(`        → ${endpointMatch[1]}`);
        }
      }
    });
  }
  
  console.log('');
}

// Now check Jobs
console.log('\n' + '='.repeat(80));
console.log('JOBS PAGE ANALYSIS');
console.log('='.repeat(80) + '\n');

const jobPages = searchFiles(adminSrc, /[Jj]ob.*\.(jsx|js|tsx|ts)$/);

console.log(`4️⃣ FOUND ${jobPages.length} JOB-RELATED FILES:\n`);

let jobsPagePath = null;
let jobsApiPath = null;

jobPages.forEach(file => {
  const relativePath = path.relative(PROJECT_ROOT, file);
  
  if (file.includes('pages') && !file.includes('service') && !file.includes('api')) {
    console.log(`   📄 Page: ${relativePath}`);
    jobsPagePath = file;
  } else if (file.includes('service') || file.includes('api')) {
    console.log(`   📡 API: ${relativePath}`);
    jobsApiPath = file;
  }
});

console.log('');

// Analyze Jobs page for "All Status" filter
if (jobsPagePath) {
  console.log('5️⃣ ANALYZING JOBS PAGE "ALL STATUS" FILTER:\n');
  
  const content = fs.readFileSync(jobsPagePath, 'utf-8');
  
  // Look for status filter logic
  const statusMatches = content.match(/status\s*[=:]\s*['"`]all['"`]/g);
  
  if (statusMatches) {
    console.log(`   ✅ Found "all" status references: ${statusMatches.length}\n`);
    statusMatches.forEach(match => {
      console.log(`      ${match}`);
    });
  } else {
    console.log(`   ⚠️  No "all" status references found\n`);
  }
  
  // Check how status is passed to API
  console.log('   Checking how status parameter is sent:\n');
  
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('status') && (line.includes('params') || line.includes('query') || line.includes('?'))) {
      console.log(`      Line ${i + 1}: ${line.trim()}`);
    }
  });
  
  console.log('');
  
  // Check for fetch/API calls with status parameter
  console.log('   API calls with status parameter:\n');
  
  const apiCallsWithStatus = content.match(/(?:fetch|axios|api)\([^)]*status[^)]*\)/g);
  if (apiCallsWithStatus) {
    apiCallsWithStatus.forEach(call => {
      console.log(`      ${call.substring(0, 100)}...`);
    });
  } else {
    console.log(`      ⚠️  No API calls with status parameter found`);
  }
  
  console.log('');
}

// Check the Jobs API service
if (jobsApiPath) {
  console.log('6️⃣ ANALYZING JOBS API SERVICE:\n');
  
  const content = fs.readFileSync(jobsApiPath, 'utf-8');
  
  // Find getJobs or fetchJobs function
  const getJobsMatch = content.match(/(getJobs|fetchJobs|listJobs)[^{]*{[\s\S]{0,500}}/);
  
  if (getJobsMatch) {
    console.log('   Found jobs fetching function:\n');
    const lines = getJobsMatch[0].split('\n').slice(0, 20);
    lines.forEach(line => {
      console.log(`   ${line}`);
    });
    console.log('');
    
    // Check how status parameter is handled
    if (getJobsMatch[0].includes('status')) {
      console.log('   ✅ Status parameter is used\n');
      
      // Check if status=all is filtered out
      if (getJobsMatch[0].includes("status !== 'all'") || getJobsMatch[0].includes('status != "all"')) {
        console.log('   ✅ Has check for status !== "all"\n');
      } else {
        console.log('   ⚠️  Missing check for status !== "all"\n');
        console.log('   🔴 POSSIBLE ISSUE: status="all" might be sent to backend!\n');
      }
    } else {
      console.log('   ⚠️  Status parameter not found in function\n');
    }
  }
}

// Generate findings report
console.log('\n' + '='.repeat(80));
console.log('FINDINGS & RECOMMENDATIONS');
console.log('='.repeat(80) + '\n');

const findings = [];

// Check if files were found
if (!candidatesPagePath) {
  findings.push({
    issue: 'Candidates page not found',
    severity: 'high',
    recommendation: 'Cannot inspect frontend code - page might be missing'
  });
}

if (!jobsPagePath) {
  findings.push({
    issue: 'Jobs page not found',
    severity: 'high',
    recommendation: 'Cannot inspect frontend code - page might be missing'
  });
}

console.log('📋 COMMON FRONTEND ISSUES TO CHECK:\n');

console.log('1. AUTHENTICATION:');
console.log('   - Is Authorization header being sent?');
console.log('   - Check: DevTools → Network → Request Headers');
console.log('   - Should have: Authorization: Bearer <token>\n');

console.log('2. API ENDPOINTS:');
console.log('   - Candidates: Should call /api/v1/candidates');
console.log('   - Jobs: Should call /api/v1/jobs');
console.log('   - Check: DevTools → Network → XHR/Fetch\n');

console.log('3. QUERY PARAMETERS:');
console.log('   - All status: Should NOT send status parameter');
console.log('   - Or send: status=all (backend filters this out)');
console.log('   - Check: Network tab → Query String Parameters\n');

console.log('4. RESPONSE HANDLING:');
console.log('   - Check if response.data exists');
console.log('   - Check if Array.isArray(response.data)');
console.log('   - Check Console for errors\n');

console.log('='.repeat(80));
console.log('MANUAL DEBUGGING STEPS');
console.log('='.repeat(80) + '\n');

console.log('🔍 TO DEBUG CANDIDATES PAGE:\n');
console.log('1. Open: http://localhost:8080/admin/candidates');
console.log('2. Open DevTools (F12) → Network tab');
console.log('3. Refresh page');
console.log('4. Look for request to: /api/v1/candidates');
console.log('5. Click on request → Check:');
console.log('   a) Request Headers - Has Authorization?');
console.log('   b) Response - What data is returned?');
console.log('   c) Console - Any JavaScript errors?\n');

console.log('🔍 TO DEBUG JOBS "ALL STATUS":\n');
console.log('1. Open: http://localhost:8080/admin/jobs');
console.log('2. Open DevTools (F12) → Network tab');
console.log('3. Click "All Status" filter');
console.log('4. Look for request to: /api/v1/jobs');
console.log('5. Check Query String Parameters:');
console.log('   a) Should NOT have: status=all');
console.log('   b) Or backend should ignore it');
console.log('   c) Check response - Does it have data?\n');

console.log('📄 WHAT TO LOOK FOR:\n');
console.log('✅ GOOD Request:');
console.log('   GET /api/v1/candidates');
console.log('   Headers: { Authorization: "Bearer eyJhbG..." }');
console.log('   Response: { success: true, data: [...] }\n');

console.log('❌ BAD Request:');
console.log('   GET /api/v1/candidates');
console.log('   Headers: { } // No Authorization');
console.log('   Response: { success: false, error: "Unauthorized" }\n');

console.log('📊 Report saved: agent-17-frontend-api-debug.txt\n');

// Save report
fs.writeFileSync(
  path.join(PROJECT_ROOT, 'agent-17-frontend-api-debug.txt'),
  `Frontend API Call Analysis
  
Candidates Page: ${candidatesPagePath ? 'Found' : 'Not Found'}
Jobs Page: ${jobsPagePath ? 'Found' : 'Not Found'}

Manual debugging required - see console output for steps.
`
);
