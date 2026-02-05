#!/usr/bin/env node
/**
 * AGENTS 21-28: Comprehensive Diagnostic Suite
 * Multi-agent investigation of frontend-backend communication
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🚀 AGENTS 21-28: Comprehensive Diagnostic Suite');
console.log('='.repeat(80) + '\n');

const PROJECT_ROOT = process.cwd();

// AGENT 21: Frontend State Management Check
console.log('👤 AGENT 21: Frontend State Management\n');

const candidatesPage = path.join(PROJECT_ROOT, 'admin/src/pages/Candidates.jsx');
if (fs.existsSync(candidatesPage)) {
  const content = fs.readFileSync(candidatesPage, 'utf-8');
  
  // Check state variables
  const candidatesStateMatch = content.match(/const\s+\[candidates,\s*setCandidates\]\s*=\s*useState\(([^)]+)\)/);
  if (candidatesStateMatch) {
    console.log(`   ✅ Candidates state: ${candidatesStateMatch[1]}`);
  } else {
    console.log('   ❌ Candidates state not found');
  }
  
  // Check how candidates are set
  const setCandidatesMatches = content.match(/setCandidates\([^)]+\)/g);
  if (setCandidatesMatches) {
    console.log(`   Found ${setCandidatesMatches.length} setCandidates calls`);
  }
  
  console.log('');
}

// AGENT 22: Response Data Structure Validator
console.log('👤 AGENT 22: Response Data Structure\n');

if (fs.existsSync(candidatesPage)) {
  const content = fs.readFileSync(candidatesPage, 'utf-8');
  
  // Check how response is accessed
  if (content.includes('response.data.data')) {
    console.log('   Using: response.data.data');
  } else if (content.includes('response.data')) {
    console.log('   Using: response.data');
  } else if (content.includes('response')) {
    console.log('   Using: response');
  }
  
  // Check for array validation
  if (content.includes('Array.isArray')) {
    console.log('   ✅ Array validation present');
  } else {
    console.log('   ⚠️  No array validation');
  }
  
  console.log('');
}

// AGENT 23: Build Output Verification
console.log('👤 AGENT 23: Build Output Check\n');

const distPath = path.join(PROJECT_ROOT, 'admin/dist');
if (fs.existsSync(distPath)) {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    const stat = fs.statSync(indexPath);
    console.log(`   ✅ Build exists: ${stat.mtime.toLocaleString()}`);
    
    // Check if recent
    const ageMinutes = (Date.now() - stat.mtime.getTime()) / 1000 / 60;
    if (ageMinutes < 30) {
      console.log(`   ✅ Recent build (${Math.round(ageMinutes)} minutes ago)`);
    } else {
      console.log(`   ⚠️  Old build (${Math.round(ageMinutes)} minutes ago)`);
    }
  }
} else {
  console.log('   ❌ No build output found');
}

console.log('');

// AGENT 24: Server Availability Check
console.log('👤 AGENT 24: Server Availability\n');

function checkServer() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/health',
      method: 'GET'
    }, (res) => {
      console.log(`   ✅ Server responding: ${res.statusCode}`);
      resolve(true);
    });
    
    req.on('error', () => {
      console.log('   ❌ Server not responding');
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      console.log('   ❌ Server timeout');
      resolve(false);
    });
    
    req.end();
  });
}

// AGENT 25: API Endpoint Structure Check
console.log('\n👤 AGENT 25: API Endpoint Structure\n');

const candidatesRoutes = path.join(PROJECT_ROOT, 'routes/api/v1/candidates/routes.js');
if (fs.existsSync(candidatesRoutes)) {
  const content = fs.readFileSync(candidatesRoutes, 'utf-8');
  
  // Check for GET / route
  if (content.includes("router.get('/'") || content.includes('router.get("/')) {
    console.log('   ✅ GET /candidates endpoint exists');
  } else {
    console.log('   ❌ GET endpoint not found');
  }
  
  // Check authentication middleware
  if (content.includes('authenticateAdmin') || content.includes('auth')) {
    console.log('   ✅ Authentication middleware present');
  }
  
  console.log('');
}

// AGENT 26: Response Format Checker
console.log('👤 AGENT 26: Response Format\n');

if (fs.existsSync(candidatesRoutes)) {
  const content = fs.readFileSync(candidatesRoutes, 'utf-8');
  
  // Check response structure
  if (content.includes('res.json({ success: true, data:')) {
    console.log('   Format: { success: true, data: [...] }');
  } else if (content.includes('res.json({ data:')) {
    console.log('   Format: { data: [...] }');
  } else if (content.includes('res.json(')) {
    console.log('   Format: Direct array or object');
  }
  
  console.log('');
}

// AGENT 27: CORS Configuration Check
console.log('👤 AGENT 27: CORS Configuration\n');

const serverPath = path.join(PROJECT_ROOT, 'server.js');
if (fs.existsSync(serverPath)) {
  const content = fs.readFileSync(serverPath, 'utf-8');
  
  if (content.includes('cors(')) {
    console.log('   ✅ CORS middleware enabled');
    
    // Check origin configuration
    if (content.includes('origin:')) {
      console.log('   Origin configuration present');
    }
  } else {
    console.log('   ⚠️  No CORS middleware found');
  }
  
  console.log('');
}

// AGENT 28: Authentication Flow Check
console.log('👤 AGENT 28: Authentication Flow\n');

const authMiddleware = path.join(PROJECT_ROOT, 'middleware/auth.js');
if (fs.existsSync(authMiddleware)) {
  const content = fs.readFileSync(authMiddleware, 'utf-8');
  
  // Check for authenticateAdmin function
  if (content.includes('function authenticateAdmin') || content.includes('authenticateAdmin =')) {
    console.log('   ✅ authenticateAdmin function exists');
  }
  
  // Check if it validates admin role
  if (content.includes("role === 'admin'") || content.includes('role !== "admin"')) {
    console.log('   ✅ Admin role validation present');
  }
  
  console.log('');
}

// Run async checks
(async () => {
  await checkServer();
  
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  console.log('✅ = Working correctly');
  console.log('⚠️  = Needs attention');
  console.log('❌ = Critical issue\n');
  
  console.log('📋 DEBUGGING STEPS:\n');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Login to admin portal');
  console.log('4. Navigate to Candidates page');
  console.log('5. Look for /api/v1/candidates request');
  console.log('6. Check:');
  console.log('   - Request Headers (Authorization: Bearer ...)');
  console.log('   - Response Status (should be 200)');
  console.log('   - Response Body (should have data array)');
  console.log('7. Go to Console tab and look for errors\n');
})();
