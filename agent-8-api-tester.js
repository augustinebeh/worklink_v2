#!/usr/bin/env node
/**
 * Agent 8: Runtime API Response Tester
 * Tests actual API endpoints and validates response formats
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const API_BASE = 'http://localhost:8080/api/v1';

const results = {
  endpoints: [],
  totalTested: 0,
  passed: 0,
  failed: 0,
  errors: []
};

console.log('🔍 Agent 8: Runtime API Response Tester');
console.log('='.repeat(80) + '\n');

// Critical endpoints to test
const ENDPOINTS_TO_TEST = [
  {
    path: '/candidates',
    method: 'GET',
    expectedFields: ['success', 'data'],
    dataType: 'array',
    description: 'List candidates'
  },
  {
    path: '/candidates/stats',
    method: 'GET',
    expectedFields: ['success', 'data'],
    expectedDataFields: ['pending', 'active', 'inactive'],
    description: 'Candidate statistics'
  },
  {
    path: '/jobs',
    method: 'GET',
    expectedFields: ['success', 'data'],
    dataType: 'array',
    description: 'List jobs'
  },
  {
    path: '/jobs/stats',
    method: 'GET',
    expectedFields: ['success', 'data'],
    description: 'Job statistics'
  },
  {
    path: '/gamification/leaderboard',
    method: 'GET',
    expectedFields: ['success'],
    description: 'Gamification leaderboard'
  },
  {
    path: '/chat/conversations',
    method: 'GET',
    expectedFields: ['success'],
    description: 'Chat conversations'
  }
];

/**
 * Make HTTP request
 */
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: true
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Test an endpoint
 */
async function testEndpoint(endpoint) {
  const url = `${API_BASE}${endpoint.path}`;
  const testResult = {
    endpoint: endpoint.path,
    method: endpoint.method,
    description: endpoint.description,
    passed: false,
    issues: [],
    response: null
  };
  
  console.log(`Testing: ${endpoint.method} ${endpoint.path}`);
  
  try {
    const response = await makeRequest(url, endpoint.method);
    testResult.response = {
      statusCode: response.statusCode,
      bodyType: typeof response.body
    };
    
    console.log(`   Status: ${response.statusCode}`);
    
    // Check status code
    if (response.statusCode !== 200) {
      testResult.issues.push(`Expected 200, got ${response.statusCode}`);
    }
    
    // Check parse error
    if (response.parseError) {
      testResult.issues.push('Response is not valid JSON');
    } else {
      // Check expected fields
      endpoint.expectedFields.forEach(field => {
        if (!(field in response.body)) {
          testResult.issues.push(`Missing field: ${field}`);
        }
      });
      
      // Check data type
      if (endpoint.dataType && response.body.data) {
        if (endpoint.dataType === 'array' && !Array.isArray(response.body.data)) {
          testResult.issues.push(`Expected data to be array, got ${typeof response.body.data}`);
        }
      }
      
      // Check data fields
      if (endpoint.expectedDataFields && response.body.data) {
        endpoint.expectedDataFields.forEach(field => {
          if (!(field in response.body.data)) {
            testResult.issues.push(`Missing data field: ${field}`);
          }
        });
      }
      
      // Check if returning module info instead of data
      if (response.body.message && response.body.message.includes('Module') && 
          response.body.architecture && !response.body.data) {
        testResult.issues.push('⚠️  CRITICAL: Returning module info instead of data! (Routing conflict)');
      }
      
      // Log what we got
      if (response.body.data !== undefined) {
        if (Array.isArray(response.body.data)) {
          console.log(`   Data: Array with ${response.body.data.length} items`);
        } else if (typeof response.body.data === 'object') {
          console.log(`   Data: Object with keys: ${Object.keys(response.body.data).join(', ')}`);
        }
      }
    }
    
    testResult.passed = testResult.issues.length === 0;
    
  } catch (error) {
    testResult.issues.push(`Request failed: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      testResult.issues.push('⚠️  Server not running! Start with: npm start');
    }
  }
  
  if (testResult.passed) {
    console.log('   ✅ PASSED\n');
    results.passed++;
  } else {
    console.log('   ❌ FAILED');
    testResult.issues.forEach(issue => {
      console.log(`      - ${issue}`);
    });
    console.log('');
    results.failed++;
  }
  
  return testResult;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting API endpoint tests...\n');
  console.log(`Target: ${API_BASE}\n`);
  
  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(endpoint);
    results.endpoints.push(result);
    results.totalTested++;
  }
  
  // Generate report
  console.log('='.repeat(80));
  console.log('RUNTIME API RESPONSE TEST REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log(`📊 Summary:\n`);
  console.log(`   Total endpoints tested: ${results.totalTested}`);
  console.log(`   Passed: ${results.passed} ✅`);
  console.log(`   Failed: ${results.failed} ${results.failed > 0 ? '❌' : '✅'}`);
  console.log('');
  
  if (results.failed > 0) {
    console.log('❌ FAILED ENDPOINTS:\n');
    results.endpoints.filter(e => !e.passed).forEach(endpoint => {
      console.log(`   ${endpoint.method} ${endpoint.endpoint}`);
      endpoint.issues.forEach(issue => {
        console.log(`      ${issue}`);
      });
      console.log('');
    });
  }
  
  // Check for routing conflicts
  const routingConflicts = results.endpoints.filter(e => 
    e.issues.some(issue => issue.includes('module info'))
  );
  
  if (routingConflicts.length > 0) {
    console.log('🔴 ROUTING CONFLICTS DETECTED:\n');
    routingConflicts.forEach(endpoint => {
      console.log(`   ${endpoint.endpoint} - Returns module info instead of data!`);
    });
    console.log('');
    console.log('   Action: Fix duplicate GET / routes in affected modules\n');
  }
  
  // Save report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'agent-8-api-tests.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Report saved: agent-8-api-tests.json\n');
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
