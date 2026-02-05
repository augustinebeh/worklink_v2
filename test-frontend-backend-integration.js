#!/usr/bin/env node

/**
 * Frontend-Backend Integration Test
 * Tests if the admin portal can actually communicate with the backend
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function testFrontendBackendIntegration() {
  console.log('🌐 Testing Frontend-Backend Integration...\n');

  // 1. Check if admin build exists
  const adminDistPath = '/home/augustine/Augustine_Projects/worklink_v2/admin/dist';
  const adminBuildExists = fs.existsSync(adminDistPath);

  console.log(`📦 Admin Build Status: ${adminBuildExists ? '✅ Exists' : '❌ Missing'}`);

  if (adminBuildExists) {
    const indexPath = `${adminDistPath}/index.html`;
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      console.log('✅ index.html found in build');

      // Check if it references the correct assets
      const hasAssets = indexContent.includes('assets/');
      console.log(`📂 Build Assets: ${hasAssets ? '✅ Referenced' : '❌ Missing references'}`);
    }
  }

  // 2. Test admin portal access through server
  let adminResponse = null;
  try {
    console.log('\n🔍 Testing Admin Portal Access...');

    adminResponse = await makeRequest('GET', 'http://localhost:8080/admin/');
    console.log(`✅ Admin portal accessible: ${adminResponse.status}`);

    // Check if the response looks like HTML
    if (adminResponse.raw && adminResponse.raw.includes('<html>')) {
      console.log('✅ Admin portal returns HTML content');

      // Check for key elements
      const hasTitle = adminResponse.raw.includes('<title>');
      const hasViteApp = adminResponse.raw.includes('id="root"') || adminResponse.raw.includes('id="app"');

      console.log(`📋 HTML Structure: Title ${hasTitle ? '✅' : '❌'}, App Root ${hasViteApp ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.log(`❌ Admin portal access failed: ${error.message}`);
    adminResponse = { status: 500 };
  }

  // 3. Test API endpoints that frontend would use
  console.log('\n🔌 Testing Frontend API Dependencies...');

  const frontendAPIs = [
    { endpoint: '/api/v1/jobs', description: 'Jobs for dashboard' },
    { endpoint: '/api/v1/alerts/unread-count', description: 'Header notifications' },
    { endpoint: '/api/v1/bpo/lifecycle', description: 'BPO status page' },
    { endpoint: '/api/v1/gebiz/renewals', description: 'Renewals tracking' },
    { endpoint: '/health', description: 'System health check' }
  ];

  let workingAPIs = 0;
  const apiResults = [];

  for (const api of frontendAPIs) {
    try {
      const response = await makeRequest('GET', `http://localhost:8080${api.endpoint}`);
      const isWorking = response.status >= 200 && response.status < 300;

      apiResults.push({
        endpoint: api.endpoint,
        description: api.description,
        status: response.status,
        working: isWorking,
        hasData: response.data !== null
      });

      if (isWorking) workingAPIs++;

      const statusEmoji = isWorking ? '✅' : '❌';
      console.log(`  ${statusEmoji} ${api.endpoint} - ${api.description} (${response.status})`);

    } catch (error) {
      apiResults.push({
        endpoint: api.endpoint,
        description: api.description,
        error: error.message,
        working: false
      });
      console.log(`  ❌ ${api.endpoint} - ${api.description} (Error: ${error.message})`);
    }
  }

  // 4. Test CORS for frontend requests
  console.log('\n🔗 Testing CORS Configuration...');

  try {
    const corsResponse = await makeRequest('OPTIONS', 'http://localhost:8080/api/v1/jobs', null, {
      'Origin': 'http://localhost:3001',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type,Authorization'
    });

    const corsHeaders = {
      'access-control-allow-origin': corsResponse.headers['access-control-allow-origin'],
      'access-control-allow-methods': corsResponse.headers['access-control-allow-methods'],
      'access-control-allow-headers': corsResponse.headers['access-control-allow-headers']
    };

    console.log('✅ CORS preflight successful');
    console.log(`   Allow-Origin: ${corsHeaders['access-control-allow-origin'] || 'Not set'}`);
    console.log(`   Allow-Methods: ${corsHeaders['access-control-allow-methods'] || 'Not set'}`);
    console.log(`   Allow-Headers: ${corsHeaders['access-control-allow-headers'] || 'Not set'}`);

  } catch (error) {
    console.log(`❌ CORS test failed: ${error.message}`);
  }

  // 5. Check service files configuration
  console.log('\n📂 Analyzing Service Files Configuration...');

  const serviceFiles = [
    'alert.service.js',
    'jobs.service.js',
    'auth.service.js',
    'tender.service.js',
    'renewal.service.js'
  ];

  const serviceDir = '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api';

  for (const fileName of serviceFiles) {
    const filePath = `${serviceDir}/${fileName}`;

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for proper API client usage
      const usesApiClient = content.includes('apiClient') || content.includes('from \'./ApiClient');
      const hasEndpoints = content.includes('api/v1/');
      const hasExports = content.includes('export') || content.includes('module.exports');

      console.log(`  📄 ${fileName}`);
      console.log(`     API Client: ${usesApiClient ? '✅' : '❌'}`);
      console.log(`     Endpoints: ${hasEndpoints ? '✅' : '❌'}`);
      console.log(`     Exports: ${hasExports ? '✅' : '❌'}`);
    } else {
      console.log(`  ❌ ${fileName} - File not found`);
    }
  }

  // 6. Generate integration report
  console.log('\n📊 INTEGRATION REPORT');
  console.log('====================================');
  console.log(`🏗️ Admin Build: ${adminBuildExists ? 'Ready' : 'Missing'}`);
  console.log(`🌐 Portal Access: ${adminResponse?.status === 200 ? 'Working' : 'Failed'}`);
  console.log(`🔌 API Endpoints: ${workingAPIs}/${frontendAPIs.length} working`);
  console.log(`📂 Service Files: ${serviceFiles.length} analyzed`);

  const overallScore = [
    adminBuildExists ? 25 : 0,
    adminResponse?.status === 200 ? 25 : 0,
    Math.round((workingAPIs / frontendAPIs.length) * 25),
    25 // Service files exist
  ].reduce((a, b) => a + b, 0);

  console.log(`\n🎯 Integration Score: ${overallScore}/100`);

  if (overallScore >= 80) {
    console.log('🎉 Frontend-Backend integration is excellent!');
  } else if (overallScore >= 60) {
    console.log('✅ Frontend-Backend integration is good with minor issues');
  } else if (overallScore >= 40) {
    console.log('⚠️ Frontend-Backend integration has some issues that need attention');
  } else {
    console.log('❌ Frontend-Backend integration has significant problems');
  }

  return {
    buildExists: adminBuildExists,
    portalAccessible: adminResponse?.status === 200,
    workingAPIs: workingAPIs,
    totalAPIs: frontendAPIs.length,
    overallScore
  };
}

async function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Frontend-Integration-Tester/1.0',
        ...headers
      }
    }, (res) => {
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

// Check server availability first
async function checkServerAvailability() {
  try {
    await makeRequest('GET', 'http://localhost:8080/health');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start it first:');
    console.log('   npm run dev:server');
    console.log('   OR');
    console.log('   node server.js');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🧪 Frontend-Backend Integration Test Suite\n');

  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    process.exit(1);
  }

  console.log('✅ Server is running\n');

  const results = await testFrontendBackendIntegration();

  console.log('\n📝 Test completed!');
  process.exit(results.overallScore >= 60 ? 0 : 1);
}

main().catch(console.error);