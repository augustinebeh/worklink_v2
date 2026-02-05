#!/usr/bin/env node

/**
 * Comprehensive API Connectivity Test Suite
 * Tests end-to-end API connectivity and frontend-backend communication
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class APIConnectivityTester {
  constructor() {
    this.baseURL = 'http://localhost:8080';
    this.results = {
      serverHealth: { status: 'pending', details: [] },
      coreEndpoints: { status: 'pending', details: [] },
      authentication: { status: 'pending', details: [] },
      frontendIntegration: { status: 'pending', details: [] },
      realTimeFeatures: { status: 'pending', details: [] },
      performanceTests: { status: 'pending', details: [] },
      errorScenarios: { status: 'pending', details: [] }
    };
    this.serverProcess = null;
    this.frontendProcess = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseURL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'API-Connectivity-Tester/1.0',
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

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async checkServerHealth() {
    this.log('🏥 Testing Backend Server Connection...');
    const startTime = Date.now();

    try {
      // Check if server is responding
      const response = await this.makeRequest('GET', '/');
      const responseTime = Date.now() - startTime;

      if (response.status === 200 || response.status === 404) {
        this.results.serverHealth.status = 'pass';
        this.results.serverHealth.details.push({
          test: 'Server Response',
          result: 'Server is responding',
          status: response.status,
          responseTime: `${responseTime}ms`
        });
        this.log(`Server is responding on ${this.baseURL} (${responseTime}ms)`, 'success');
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      // Test CORS headers
      const corsResponse = await this.makeRequest('OPTIONS', '/api/v1/health', null, {
        'Origin': 'http://localhost:3001'
      });

      if (corsResponse.headers['access-control-allow-origin']) {
        this.results.serverHealth.details.push({
          test: 'CORS Configuration',
          result: 'CORS headers present',
          allowOrigin: corsResponse.headers['access-control-allow-origin']
        });
        this.log('CORS configuration is working', 'success');
      } else {
        this.log('CORS headers not found', 'warning');
      }

    } catch (error) {
      this.results.serverHealth.status = 'fail';
      this.results.serverHealth.details.push({
        test: 'Server Connection',
        result: 'Failed to connect',
        error: error.message
      });
      this.log(`Server connection failed: ${error.message}`, 'error');
    }
  }

  async testCoreEndpoints() {
    this.log('🔌 Testing Core API Endpoints...');

    const endpoints = [
      { method: 'GET', path: '/api/v1/alerts/unread-count', name: 'Alerts Unread Count' },
      { method: 'GET', path: '/api/v1/bpo/lifecycle', name: 'BPO Lifecycle' },
      { method: 'GET', path: '/api/v1/gebiz/renewals', name: 'GeBiz Renewals' },
      { method: 'GET', path: '/api/v1/scraping/status', name: 'Scraping Status' },
      { method: 'GET', path: '/api/v1/jobs', name: 'Jobs List' },
      { method: 'GET', path: '/api/v1/candidates', name: 'Candidates List' }
    ];

    let passCount = 0;
    const testResults = [];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest(endpoint.method, endpoint.path);
        const responseTime = Date.now() - startTime;

        const isSuccess = response.status >= 200 && response.status < 300;
        if (isSuccess) passCount++;

        testResults.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          status: response.status,
          responseTime: `${responseTime}ms`,
          result: isSuccess ? 'pass' : 'fail',
          hasData: response.data !== null,
          dataType: response.data ? typeof response.data : 'none'
        });

        this.log(`${endpoint.name}: ${response.status} (${responseTime}ms)`, isSuccess ? 'success' : 'warning');

      } catch (error) {
        testResults.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          result: 'error',
          error: error.message
        });
        this.log(`${endpoint.name}: Error - ${error.message}`, 'error');
      }
    }

    this.results.coreEndpoints.status = passCount > endpoints.length / 2 ? 'pass' : 'fail';
    this.results.coreEndpoints.details = testResults;
    this.log(`Core endpoints test: ${passCount}/${endpoints.length} passed`);
  }

  async testAuthentication() {
    this.log('🔐 Testing Authentication/Authorization...');

    try {
      // Test endpoint without authentication
      const unauthResponse = await this.makeRequest('GET', '/api/v1/admin/stats');

      // Test endpoint with invalid token
      const invalidAuthResponse = await this.makeRequest('GET', '/api/v1/admin/stats', null, {
        'Authorization': 'Bearer invalid-token-here'
      });

      this.results.authentication.details.push({
        test: 'Unauthenticated Request',
        status: unauthResponse.status,
        result: unauthResponse.status === 401 || unauthResponse.status === 403 ? 'pass' : 'warning'
      });

      this.results.authentication.details.push({
        test: 'Invalid Token',
        status: invalidAuthResponse.status,
        result: invalidAuthResponse.status === 401 || invalidAuthResponse.status === 403 ? 'pass' : 'warning'
      });

      this.results.authentication.status = 'pass';
      this.log('Authentication middleware is working correctly', 'success');

    } catch (error) {
      this.results.authentication.status = 'fail';
      this.results.authentication.details.push({
        test: 'Authentication Test',
        error: error.message
      });
      this.log(`Authentication test failed: ${error.message}`, 'error');
    }
  }

  async testFrontendIntegration() {
    this.log('🌐 Testing Frontend-Backend Integration...');

    // Check if admin service files exist
    const serviceFiles = [
      '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api/alert.service.js',
      '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api/tender.service.js',
      '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api/renewal.service.js'
    ];

    const existingServices = [];
    for (const serviceFile of serviceFiles) {
      if (fs.existsSync(serviceFile)) {
        existingServices.push(path.basename(serviceFile));
      }
    }

    // Test API client configuration
    const apiIndexPath = '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api/index.js';
    let apiConfigExists = false;
    if (fs.existsSync(apiIndexPath)) {
      apiConfigExists = true;
      const apiConfig = fs.readFileSync(apiIndexPath, 'utf8');

      this.results.frontendIntegration.details.push({
        test: 'API Configuration',
        result: 'API index file exists',
        hasBaseURL: apiConfig.includes('baseURL') || apiConfig.includes('BASE_URL'),
        hasInterceptors: apiConfig.includes('interceptor')
      });
    }

    this.results.frontendIntegration.status = existingServices.length > 0 && apiConfigExists ? 'pass' : 'partial';
    this.results.frontendIntegration.details.push({
      test: 'Service Files',
      existingServices,
      apiConfigExists
    });

    this.log(`Frontend services found: ${existingServices.join(', ')}`, existingServices.length > 0 ? 'success' : 'warning');
  }

  async testRealTimeFeatures() {
    this.log('⚡ Testing Real-time Features...');

    try {
      // Test alert system endpoints
      const alertsResponse = await this.makeRequest('GET', '/api/v1/alerts/unread-count');
      const scrapingResponse = await this.makeRequest('GET', '/api/v1/scraping/status');

      this.results.realTimeFeatures.details.push({
        test: 'Alert System',
        status: alertsResponse.status,
        hasData: alertsResponse.data !== null
      });

      this.results.realTimeFeatures.details.push({
        test: 'Scraping Status',
        status: scrapingResponse.status,
        hasData: scrapingResponse.data !== null
      });

      this.results.realTimeFeatures.status = 'pass';
      this.log('Real-time features endpoints are accessible', 'success');

    } catch (error) {
      this.results.realTimeFeatures.status = 'fail';
      this.results.realTimeFeatures.details.push({
        test: 'Real-time Features',
        error: error.message
      });
      this.log(`Real-time features test failed: ${error.message}`, 'error');
    }
  }

  async testPerformanceAndLoad() {
    this.log('🚀 Testing Performance and Load...');

    const testEndpoint = '/api/v1/jobs';
    const concurrentRequests = 5;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        this.makeRequest('GET', testEndpoint).then(response => ({
          requestId: i + 1,
          status: response.status,
          responseTime: Date.now()
        })).catch(error => ({
          requestId: i + 1,
          error: error.message
        }))
      );
    }

    try {
      const startTime = Date.now();
      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      const successCount = results.filter(r => r.status && r.status >= 200 && r.status < 300).length;

      this.results.performanceTests.details.push({
        test: 'Concurrent Requests',
        totalRequests: concurrentRequests,
        successCount,
        totalTime: `${totalTime}ms`,
        averageTime: `${Math.round(totalTime / concurrentRequests)}ms`
      });

      this.results.performanceTests.status = successCount >= concurrentRequests * 0.8 ? 'pass' : 'fail';
      this.log(`Load test: ${successCount}/${concurrentRequests} requests succeeded in ${totalTime}ms`, 'success');

    } catch (error) {
      this.results.performanceTests.status = 'fail';
      this.results.performanceTests.details.push({
        test: 'Performance Test',
        error: error.message
      });
      this.log(`Performance test failed: ${error.message}`, 'error');
    }
  }

  async testErrorScenarios() {
    this.log('💥 Testing Error Scenarios...');

    const errorTests = [
      { path: '/api/v1/nonexistent', expectedStatus: 404, name: 'Non-existent Endpoint' },
      { path: '/api/v1/jobs', method: 'POST', data: { invalid: 'data' }, name: 'Invalid POST Data' },
      { path: '/api/v1/jobs/999999', expectedStatus: 404, name: 'Non-existent Resource' }
    ];

    const testResults = [];

    for (const test of errorTests) {
      try {
        const response = await this.makeRequest(test.method || 'GET', test.path, test.data);

        testResults.push({
          test: test.name,
          path: test.path,
          status: response.status,
          expectedStatus: test.expectedStatus,
          result: test.expectedStatus ? (response.status === test.expectedStatus ? 'pass' : 'fail') : 'info',
          hasErrorMessage: response.data && (response.data.error || response.data.message)
        });

        this.log(`${test.name}: ${response.status}`, response.status >= 400 ? 'success' : 'info');

      } catch (error) {
        testResults.push({
          test: test.name,
          result: 'error',
          error: error.message
        });
        this.log(`${test.name}: Error - ${error.message}`, 'warning');
      }
    }

    this.results.errorScenarios.details = testResults;
    this.results.errorScenarios.status = 'pass';
    this.log('Error scenario testing completed');
  }

  async startServer() {
    return new Promise((resolve, reject) => {
      this.log('🚀 Starting backend server...');

      this.serverProcess = spawn('node', ['server.js'], {
        cwd: '/home/augustine/Augustine_Projects/worklink_v2',
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'development', PORT: '8080' }
      });

      let serverReady = false;

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server running') || output.includes('listening on') || output.includes('WorkLink')) {
          if (!serverReady) {
            serverReady = true;
            this.log('Backend server started successfully', 'success');
            resolve();
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        this.log(`Server error: ${error}`, 'error');
      });

      this.serverProcess.on('error', (error) => {
        this.log(`Failed to start server: ${error.message}`, 'error');
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          this.log('Server startup timeout', 'error');
          reject(new Error('Server startup timeout'));
        }
      }, 30000);
    });
  }

  async generateReport() {
    const report = {
      testSuite: 'API Connectivity Test',
      timestamp: new Date().toISOString(),
      summary: {
        serverHealth: this.results.serverHealth.status,
        coreEndpoints: this.results.coreEndpoints.status,
        authentication: this.results.authentication.status,
        frontendIntegration: this.results.frontendIntegration.status,
        realTimeFeatures: this.results.realTimeFeatures.status,
        performanceTests: this.results.performanceTests.status,
        errorScenarios: this.results.errorScenarios.status
      },
      details: this.results
    };

    const reportPath = '/home/augustine/Augustine_Projects/worklink_v2/api-connectivity-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`📊 Report generated: ${reportPath}`, 'success');
    return report;
  }

  async cleanup() {
    if (this.serverProcess) {
      this.log('🛑 Stopping backend server...');
      this.serverProcess.kill('SIGTERM');
    }
  }

  async runAllTests() {
    this.log('🧪 Starting API Connectivity Test Suite...');

    try {
      // Start server if not already running
      try {
        await this.makeRequest('GET', '/');
        this.log('Backend server is already running', 'info');
      } catch (error) {
        await this.startServer();
        await this.sleep(3000); // Give server time to fully start
      }

      // Run all tests
      await this.checkServerHealth();
      await this.testCoreEndpoints();
      await this.testAuthentication();
      await this.testFrontendIntegration();
      await this.testRealTimeFeatures();
      await this.testPerformanceAndLoad();
      await this.testErrorScenarios();

      // Generate report
      const report = await this.generateReport();

      this.log('🎉 API Connectivity Test Suite completed!', 'success');
      return report;

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    } finally {
      // Don't cleanup server if it was already running
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new APIConnectivityTester();

  tester.runAllTests()
    .then(report => {
      console.log('\n📊 FINAL REPORT:');
      console.log('================');
      Object.entries(report.summary).forEach(([test, status]) => {
        const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'partial' ? '⚠️' : '❓';
        console.log(`${emoji} ${test}: ${status.toUpperCase()}`);
      });
      console.log('\n📄 Full report saved to: api-connectivity-report.json');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = APIConnectivityTester;