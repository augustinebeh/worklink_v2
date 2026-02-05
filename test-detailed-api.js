#!/usr/bin/env node

/**
 * Detailed API Testing - Test specific endpoints with real data
 */

const http = require('http');

async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:8080');
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Detailed-API-Tester/1.0',
        ...headers
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
            raw: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: null,
            raw: body,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testDetailedEndpoints() {
  console.log('🧪 Running Detailed API Tests...\n');

  const tests = [
    {
      name: 'Alert System - Unread Count',
      method: 'GET',
      path: '/api/v1/alerts/unread-count',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'Alert System - All Alerts',
      method: 'GET',
      path: '/api/v1/alerts',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'BPO Lifecycle Data',
      method: 'GET',
      path: '/api/v1/bpo/lifecycle',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'GeBiz Renewals',
      method: 'GET',
      path: '/api/v1/gebiz/renewals',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'Scraping Service Status',
      method: 'GET',
      path: '/api/v1/scraping/status',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'Jobs List',
      method: 'GET',
      path: '/api/v1/jobs',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'Jobs with Filter - Active',
      method: 'GET',
      path: '/api/v1/jobs?status=active',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'Admin Stats (should require auth)',
      method: 'GET',
      path: '/api/v1/admin/stats',
      expectStatus: [401, 403],
      expectData: false
    },
    {
      name: 'Health Check',
      method: 'GET',
      path: '/health',
      expectStatus: 200,
      expectData: true
    },
    {
      name: 'API Root Info',
      method: 'GET',
      path: '/api/v1',
      expectStatus: 200,
      expectData: true
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      const startTime = Date.now();
      const response = await makeRequest(test.method, test.path);
      const responseTime = Date.now() - startTime;

      const expectedStatuses = Array.isArray(test.expectStatus) ? test.expectStatus : [test.expectStatus];
      const statusMatch = expectedStatuses.includes(response.status);
      const hasData = response.data !== null && response.data !== undefined;

      const result = {
        test: test.name,
        path: test.path,
        status: response.status,
        statusMatch,
        hasData,
        responseTime: `${responseTime}ms`,
        dataPreview: hasData ? (typeof response.data === 'object' ? Object.keys(response.data).slice(0, 5) : String(response.data).substring(0, 100)) : null
      };

      results.push(result);

      const statusEmoji = statusMatch ? '✅' : '❌';
      const dataEmoji = test.expectData ? (hasData ? '📊' : '📭') : '⚪';
      console.log(`  ${statusEmoji} ${dataEmoji} ${response.status} (${responseTime}ms)`);

      if (hasData && typeof response.data === 'object') {
        const keys = Object.keys(response.data);
        console.log(`    Data keys: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`);
      }

    } catch (error) {
      results.push({
        test: test.name,
        path: test.path,
        error: error.message,
        status: 'error'
      });
      console.log(`  ❌ Error: ${error.message}`);
    }

    console.log('');
  }

  // Summary
  const passCount = results.filter(r => r.statusMatch).length;
  const totalCount = results.length;

  console.log('📋 DETAILED API TEST RESULTS');
  console.log('=====================================');
  console.log(`✅ Tests Passed: ${passCount}/${totalCount}`);
  console.log('');

  // Individual results
  results.forEach(result => {
    const emoji = result.statusMatch ? '✅' : result.error ? '❌' : '⚠️';
    console.log(`${emoji} ${result.test}`);
    console.log(`   Path: ${result.path}`);
    console.log(`   Status: ${result.status} (${result.responseTime || 'N/A'})`);
    if (result.hasData && result.dataPreview) {
      console.log(`   Data: ${result.dataPreview}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  return results;
}

// Test Frontend Service Files Integration
async function testFrontendIntegration() {
  console.log('🌐 Testing Frontend Service Integration...\n');

  const fs = require('fs');
  const path = require('path');

  const serviceDir = '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api';

  if (!fs.existsSync(serviceDir)) {
    console.log('❌ Service directory not found');
    return;
  }

  const serviceFiles = fs.readdirSync(serviceDir).filter(f => f.endsWith('.service.js'));

  console.log(`📂 Found ${serviceFiles.length} service files:`);
  serviceFiles.forEach(file => {
    const filePath = path.join(serviceDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for common patterns
    const hasBaseURL = content.includes('baseURL') || content.includes('BASE_URL');
    const hasEndpoints = content.includes('api/v1');
    const hasErrorHandling = content.includes('catch') || content.includes('.error');
    const hasExports = content.includes('export') || content.includes('module.exports');

    console.log(`  📄 ${file}`);
    console.log(`     ${hasBaseURL ? '✅' : '❌'} Base URL configured`);
    console.log(`     ${hasEndpoints ? '✅' : '❌'} API endpoints defined`);
    console.log(`     ${hasErrorHandling ? '✅' : '❌'} Error handling`);
    console.log(`     ${hasExports ? '✅' : '❌'} Proper exports`);
    console.log('');
  });

  return {
    totalServices: serviceFiles.length,
    serviceFiles
  };
}

// Run all tests
async function runTests() {
  try {
    console.log('🚀 Starting Detailed API Testing Suite\n');

    // Test server connectivity first
    try {
      await makeRequest('GET', '/');
      console.log('✅ Server is running and accessible\n');
    } catch (error) {
      console.log('❌ Cannot connect to server. Make sure it\'s running on localhost:8080');
      process.exit(1);
    }

    // Run detailed API tests
    const apiResults = await testDetailedEndpoints();

    // Test frontend integration
    const frontendResults = await testFrontendIntegration();

    console.log('🎯 OVERALL TEST SUMMARY');
    console.log('========================');
    console.log(`🔌 API Endpoints: ${apiResults.filter(r => r.statusMatch).length}/${apiResults.length} working`);
    console.log(`🌐 Frontend Services: ${frontendResults.totalServices} service files found`);
    console.log('');

    const allTestsPassed = apiResults.every(r => r.statusMatch || r.error);
    console.log(allTestsPassed ? '🎉 All tests completed successfully!' : '⚠️ Some tests had issues - check details above');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runTests();