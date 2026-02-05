#!/usr/bin/env node
/**
 * Agent 18: Live API Endpoint Tester
 * Tests actual API responses to diagnose frontend issues
 */

const http = require('http');

console.log('🔍 Agent 18: Live API Endpoint Tester');
console.log('='.repeat(80) + '\n');

// Test function
function testEndpoint(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  const BASE_URL = 'localhost';
  const PORT = 8080;
  
  console.log(`📡 Testing server at: http://${BASE_URL}:${PORT}\n`);
  
  // Test 1: Jobs endpoint (no auth required)
  console.log('1️⃣ TESTING JOBS ENDPOINT (NO AUTH):\n');
  
  try {
    const jobsResult = await testEndpoint({
      hostname: BASE_URL,
      port: PORT,
      path: '/api/v1/jobs',
      method: 'GET'
    });
    
    console.log(`   Status: ${jobsResult.status}`);
    console.log(`   Success: ${jobsResult.data.success}`);
    console.log(`   Jobs count: ${jobsResult.data.data ? jobsResult.data.data.length : 0}`);
    
    if (jobsResult.data.data && jobsResult.data.data.length > 0) {
      console.log(`   ✅ Jobs endpoint working!`);
      console.log(`   Sample job: ${jobsResult.data.data[0].title || 'N/A'}`);
    } else {
      console.log(`   ⚠️  No jobs returned`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Test 2: Jobs stats endpoint
  console.log('2️⃣ TESTING JOBS STATS ENDPOINT:\n');
  
  try {
    const statsResult = await testEndpoint({
      hostname: BASE_URL,
      port: PORT,
      path: '/api/v1/jobs/stats',
      method: 'GET'
    });
    
    console.log(`   Status: ${statsResult.status}`);
    console.log(`   Response: ${JSON.stringify(statsResult.data, null, 2)}`);
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Test 3: Admin login
  console.log('3️⃣ TESTING ADMIN LOGIN:\n');
  
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentvis.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  let adminToken = null;
  
  try {
    const loginResult = await testEndpoint({
      hostname: BASE_URL,
      port: PORT,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: adminEmail,
      password: adminPassword,
      type: 'admin'
    });
    
    console.log(`   Status: ${loginResult.status}`);
    console.log(`   Success: ${loginResult.data.success}`);
    
    if (loginResult.data.token) {
      adminToken = loginResult.data.token;
      console.log(`   ✅ Login successful!`);
      console.log(`   Token: ${adminToken.substring(0, 30)}...`);
    } else {
      console.log(`   ❌ No token received`);
      console.log(`   Response: ${JSON.stringify(loginResult.data)}`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Test 4: Candidates endpoint without auth
  console.log('4️⃣ TESTING CANDIDATES ENDPOINT (NO AUTH):\n');
  
  try {
    const candidatesNoAuth = await testEndpoint({
      hostname: BASE_URL,
      port: PORT,
      path: '/api/v1/candidates',
      method: 'GET'
    });
    
    console.log(`   Status: ${candidatesNoAuth.status}`);
    console.log(`   Success: ${candidatesNoAuth.data.success}`);
    
    if (candidatesNoAuth.status === 401) {
      console.log(`   ✅ Correctly requires authentication`);
    } else if (candidatesNoAuth.data.success && candidatesNoAuth.data.data) {
      console.log(`   ⚠️  Endpoint doesn't require auth (security issue!)`);
      console.log(`   Returned ${candidatesNoAuth.data.data.length} candidates`);
    }
    console.log('');
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
  
  // Test 5: Candidates endpoint WITH auth
  if (adminToken) {
    console.log('5️⃣ TESTING CANDIDATES ENDPOINT (WITH AUTH):\n');
    
    try {
      const candidatesWithAuth = await testEndpoint({
        hostname: BASE_URL,
        port: PORT,
        path: '/api/v1/candidates',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log(`   Status: ${candidatesWithAuth.status}`);
      console.log(`   Success: ${candidatesWithAuth.data.success}`);
      
      if (candidatesWithAuth.data.success && candidatesWithAuth.data.data) {
        console.log(`   ✅ Candidates returned: ${candidatesWithAuth.data.data.length}`);
        
        if (candidatesWithAuth.data.data.length > 0) {
          console.log(`\n   Sample candidates:`);
          candidatesWithAuth.data.data.slice(0, 3).forEach((c, i) => {
            console.log(`      ${i + 1}. ${c.name} - ${c.email} - Status: ${c.status}`);
          });
        } else {
          console.log(`   ⚠️  No candidates in response!`);
        }
      } else {
        console.log(`   ❌ Request failed`);
        console.log(`   Error: ${candidatesWithAuth.data.error || 'Unknown'}`);
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test 6: Candidates stats with auth
    console.log('6️⃣ TESTING CANDIDATES STATS ENDPOINT (WITH AUTH):\n');
    
    try {
      const statsResult = await testEndpoint({
        hostname: BASE_URL,
        port: PORT,
        path: '/api/v1/candidates/stats',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log(`   Status: ${statsResult.status}`);
      console.log(`   Response: ${JSON.stringify(statsResult.data, null, 2)}`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
    
    // Test 7: Verify token endpoint
    console.log('7️⃣ TESTING TOKEN VERIFICATION ENDPOINT:\n');
    
    try {
      const verifyResult = await testEndpoint({
        hostname: BASE_URL,
        port: PORT,
        path: '/api/v1/auth/verify',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log(`   Status: ${verifyResult.status}`);
      console.log(`   Success: ${verifyResult.data.success}`);
      
      if (verifyResult.data.success && verifyResult.data.user) {
        console.log(`   ✅ Token is valid!`);
        console.log(`   User: ${verifyResult.data.user.email || verifyResult.data.user.name}`);
      } else {
        console.log(`   ❌ Token verification failed`);
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  } else {
    console.log('5️⃣ SKIPPED: Candidates with auth (no token)\n');
    console.log('6️⃣ SKIPPED: Candidates stats (no token)\n');
    console.log('7️⃣ SKIPPED: Token verification (no token)\n');
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  console.log('📋 TEST RESULTS:\n');
  console.log('✅ = Working correctly');
  console.log('⚠️  = Unexpected behavior');
  console.log('❌ = Failed\n');
  
  console.log('🔧 NEXT STEPS:\n');
  console.log('1. If all backend tests pass:');
  console.log('   → Problem is in frontend');
  console.log('   → Rebuild admin: npm run build:admin\n');
  
  console.log('2. If candidates endpoint returns 401 with auth:');
  console.log('   → Token might be invalid');
  console.log('   → Check JWT_SECRET in .env\n');
  
  console.log('3. If candidates endpoint returns empty array:');
  console.log('   → Backend connecting to wrong database');
  console.log('   → Check db/connection.js\n');
  
  console.log('4. If login fails:');
  console.log('   → Check ADMIN_EMAIL and ADMIN_PASSWORD in .env\n');
}

// Run tests
runTests().catch(console.error);
