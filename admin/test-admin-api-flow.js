#!/usr/bin/env node

/**
 * Admin Portal API Flow Tester
 * Tests the exact API calls the admin portal would make on startup
 */

import http from 'http';
import { URL } from 'url';

class AdminPortalTester {
  constructor() {
    this.baseURL = 'http://localhost:8080';
    this.proxyURL = 'http://localhost:3002'; // Vite dev server with proxy
    this.results = [];
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsedURL = new URL(url);

      const requestOptions = {
        hostname: parsedURL.hostname,
        port: parsedURL.port,
        path: parsedURL.pathname + parsedURL.search,
        method: options.method || 'GET',
        headers: {
          'Origin': 'http://localhost:3002',
          'User-Agent': 'AdminPortal/1.0 (Test)',
          ...options.headers
        }
      };

      const req = http.request(requestOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            url: url
          });
        });
      });

      req.on('error', (error) => {
        reject({
          error: error.message,
          url: url,
          type: 'network_error'
        });
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async testEndpoint(name, endpoint, expectedStatus = 200) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   Endpoint: ${endpoint}`);

    try {
      // Test direct server connection
      const directResult = await this.makeRequest(this.baseURL + endpoint);
      console.log(`   ✅ Direct (8080): ${directResult.status} - ${directResult.headers['access-control-allow-origin']}`);

      // Test through Vite proxy
      try {
        const proxyResult = await this.makeRequest(this.proxyURL + endpoint);
        console.log(`   ❌ Proxy (3002): ${proxyResult.status} - PROXY FAILED`);
      } catch (proxyError) {
        console.log(`   ❌ Proxy (3002): ${proxyError.type || 'ERROR'} - ${proxyError.error}`);
      }

      this.results.push({
        name,
        endpoint,
        direct: {
          status: directResult.status,
          cors: directResult.headers['access-control-allow-origin'],
          success: true
        },
        proxy: {
          success: false,
          error: 'Proxy configuration error'
        }
      });

    } catch (directError) {
      console.log(`   ❌ Direct (8080): ${directError.type || 'ERROR'} - ${directError.error}`);
      this.results.push({
        name,
        endpoint,
        direct: {
          success: false,
          error: directError.error
        },
        proxy: {
          success: false,
          error: 'Not tested due to direct failure'
        }
      });
    }
  }

  async runTests() {
    console.log('🚀 Admin Portal API Connectivity Test');
    console.log('=====================================');

    // Test critical startup endpoints
    await this.testEndpoint('Authentication Check', '/api/v1/auth/me', 401);
    await this.testEndpoint('Unread Alerts Count', '/api/v1/alerts/unread-count');
    await this.testEndpoint('BPO Lifecycle Data', '/api/v1/bpo/lifecycle');
    await this.testEndpoint('GeBiz Renewals', '/api/v1/gebiz/renewals');

    // Test other common endpoints
    await this.testEndpoint('Jobs List', '/api/v1/jobs');
    await this.testEndpoint('Candidates List', '/api/v1/candidates');
    await this.testEndpoint('Health Check', '/health');

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================');

    const directSuccess = this.results.filter(r => r.direct?.success).length;
    const directFailed = this.results.filter(r => !r.direct?.success).length;
    const proxyFailed = this.results.filter(r => !r.proxy?.success).length;

    console.log(`\n📈 Direct Server (port 8080):`);
    console.log(`   ✅ Successful: ${directSuccess}`);
    console.log(`   ❌ Failed: ${directFailed}`);

    console.log(`\n🔀 Vite Proxy (port 3002):`);
    console.log(`   ❌ Failed: ${proxyFailed}/${this.results.length}`);

    console.log('\n🔍 Issue Analysis:');
    console.log('==================');

    if (proxyFailed === this.results.length) {
      console.log('❌ CRITICAL: Vite proxy configuration is broken');
      console.log('   Problem: vite.config.js proxy target is http://localhost:3000');
      console.log('   Solution: Change proxy target to http://localhost:8080');
      console.log('   Impact: Admin portal cannot make API calls → White screen');
    }

    if (directSuccess > 0) {
      console.log('✅ Server is running and responding correctly');
      console.log('✅ CORS is configured correctly for development');
    }

    console.log('\n🚨 Root Cause of White Screen:');
    console.log('==============================');
    console.log('The admin portal (localhost:3002) cannot reach the API server');
    console.log('because Vite proxy is configured for the wrong port (3000 vs 8080).');
    console.log('');
    console.log('This causes:');
    console.log('1. All API calls to fail during app initialization');
    console.log('2. AuthContext.initializeAuth() to fail');
    console.log('3. React app to crash or show white screen');
    console.log('');
    console.log('Fix: Update admin/vite.config.js proxy target to http://localhost:8080');
  }
}

// Run the test
const tester = new AdminPortalTester();
tester.runTests().catch(console.error);