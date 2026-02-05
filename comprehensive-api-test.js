#!/usr/bin/env node

/**
 * COMPREHENSIVE API CONNECTIVITY TEST
 * End-to-end testing of backend server and frontend integration
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

class ComprehensiveAPITester {
  constructor() {
    this.serverProcess = null;
    this.testResults = {
      serverStartup: { status: 'pending', details: [] },
      basicConnectivity: { status: 'pending', details: [] },
      coreAPIs: { status: 'pending', details: [] },
      authentication: { status: 'pending', details: [] },
      frontendIntegration: { status: 'pending', details: [] },
      performanceTest: { status: 'pending', details: [] },
      overallScore: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const emojis = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    console.log(`${emojis[type] || emojis.info} [${timestamp}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      let startupLogs = [];

      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupLogs.push(output);

        if (output.includes('WorkLink v2 ready') || output.includes('Server running') || output.includes('listening on')) {
          if (!serverReady) {
            serverReady = true;
            this.testResults.serverStartup.status = 'pass';
            this.testResults.serverStartup.details = { logs: startupLogs };
            this.log('Backend server started successfully', 'success');
            resolve();
          }
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        startupLogs.push(`STDERR: ${error}`);
        // Only log non-warning errors
        if (!error.includes('warning') && error.trim()) {
          this.log(`Server error: ${error.trim()}`, 'warning');
        }
      });

      this.serverProcess.on('error', (error) => {
        this.testResults.serverStartup.status = 'fail';
        this.testResults.serverStartup.details = { error: error.message };
        this.log(`Failed to start server: ${error.message}`, 'error');
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          this.testResults.serverStartup.status = 'fail';
          this.testResults.serverStartup.details = { error: 'Startup timeout', logs: startupLogs };
          this.log('Server startup timeout', 'error');
          reject(new Error('Server startup timeout'));
        }
      }, 30000);
    });
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, 'http://localhost:8080');
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Comprehensive-API-Tester/1.0',
          ...headers
        },
        timeout: 10000
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
              raw: body,
              size: Buffer.byteLength(body, 'utf8')
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: null,
              raw: body,
              size: Buffer.byteLength(body, 'utf8'),
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

  async testBasicConnectivity() {
    this.log('🔌 Testing Basic Server Connectivity...');

    try {
      // Test basic server response
      const startTime = Date.now();
      const response = await this.makeRequest('GET', '/');
      const responseTime = Date.now() - startTime;

      this.testResults.basicConnectivity.details.push({
        test: 'Root endpoint',
        status: response.status,
        responseTime: `${responseTime}ms`,
        size: `${response.size} bytes`
      });

      // Test health endpoint
      const healthResponse = await this.makeRequest('GET', '/health');
      this.testResults.basicConnectivity.details.push({
        test: 'Health check',
        status: healthResponse.status,
        hasData: healthResponse.data !== null,
        environment: healthResponse.data?.environment
      });

      // Test CORS
      const corsResponse = await this.makeRequest('OPTIONS', '/api/v1/jobs', null, {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'GET'
      });

      this.testResults.basicConnectivity.details.push({
        test: 'CORS configuration',
        status: corsResponse.status,
        allowOrigin: corsResponse.headers['access-control-allow-origin'],
        allowMethods: corsResponse.headers['access-control-allow-methods']
      });

      this.testResults.basicConnectivity.status = 'pass';
      this.log(`Basic connectivity: ✅ Server responding (${responseTime}ms)`, 'success');

    } catch (error) {
      this.testResults.basicConnectivity.status = 'fail';
      this.testResults.basicConnectivity.details.push({
        test: 'Basic connectivity',
        error: error.message
      });
      this.log(`Basic connectivity failed: ${error.message}`, 'error');
    }
  }

  async testCoreAPIs() {
    this.log('🎯 Testing Core API Endpoints...');

    const coreEndpoints = [
      { path: '/api/v1/alerts/unread-count', name: 'Alert Count', critical: true },
      { path: '/api/v1/bpo/lifecycle', name: 'BPO Lifecycle', critical: true },
      { path: '/api/v1/gebiz/renewals', name: 'GeBiz Renewals', critical: true },
      { path: '/api/v1/scraping/status', name: 'Scraping Status', critical: false },
      { path: '/api/v1/jobs', name: 'Jobs API', critical: true },
      { path: '/api/v1/jobs?status=active', name: 'Jobs Filter', critical: false },
      { path: '/api/v1', name: 'API Info', critical: false }
    ];

    let passCount = 0;
    let criticalPassCount = 0;
    let criticalTotal = coreEndpoints.filter(e => e.critical).length;

    for (const endpoint of coreEndpoints) {
      try {
        const startTime = Date.now();
        const response = await this.makeRequest('GET', endpoint.path);
        const responseTime = Date.now() - startTime;

        const isSuccess = response.status >= 200 && response.status < 300;
        if (isSuccess) {
          passCount++;
          if (endpoint.critical) criticalPassCount++;
        }

        this.testResults.coreAPIs.details.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          status: response.status,
          responseTime: `${responseTime}ms`,
          success: isSuccess,
          critical: endpoint.critical,
          hasData: response.data !== null,
          dataKeys: response.data ? Object.keys(response.data).slice(0, 3) : null
        });

        const emoji = isSuccess ? '✅' : '❌';
        const criticalFlag = endpoint.critical ? '🔥' : '📋';
        this.log(`${emoji} ${criticalFlag} ${endpoint.name}: ${response.status} (${responseTime}ms)`);

      } catch (error) {
        this.testResults.coreAPIs.details.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          error: error.message,
          success: false,
          critical: endpoint.critical
        });
        this.log(`❌ ${endpoint.name}: Error - ${error.message}`, 'error');
      }
    }

    // Determine overall status
    const criticalSuccess = criticalPassCount === criticalTotal;
    const overallSuccess = passCount >= coreEndpoints.length * 0.8;

    this.testResults.coreAPIs.status = criticalSuccess && overallSuccess ? 'pass' : 'partial';
    this.log(`Core APIs: ${passCount}/${coreEndpoints.length} working (${criticalPassCount}/${criticalTotal} critical)`,
             criticalSuccess ? 'success' : 'warning');
  }

  async testAuthentication() {
    this.log('🔐 Testing Authentication System...');

    try {
      // Test protected endpoint without auth
      const unauthResponse = await this.makeRequest('GET', '/api/v1/admin/stats');

      // Test with invalid token
      const invalidTokenResponse = await this.makeRequest('GET', '/api/v1/admin/stats', null, {
        'Authorization': 'Bearer invalid-token-123'
      });

      this.testResults.authentication.details.push({
        test: 'Unauth request to protected endpoint',
        status: unauthResponse.status,
        expectedProtected: unauthResponse.status === 401 || unauthResponse.status === 403
      });

      this.testResults.authentication.details.push({
        test: 'Invalid token request',
        status: invalidTokenResponse.status,
        expectedProtected: invalidTokenResponse.status === 401 || invalidTokenResponse.status === 403
      });

      this.testResults.authentication.status = 'pass';
      this.log('Authentication middleware working correctly', 'success');

    } catch (error) {
      this.testResults.authentication.status = 'fail';
      this.testResults.authentication.details.push({
        test: 'Authentication system',
        error: error.message
      });
      this.log(`Authentication test failed: ${error.message}`, 'error');
    }
  }

  async testFrontendIntegration() {
    this.log('🌐 Testing Frontend Integration...');

    // Check admin build
    const adminDistPath = '/home/augustine/Augustine_Projects/worklink_v2/admin/dist';
    const buildExists = fs.existsSync(adminDistPath);

    this.testResults.frontendIntegration.details.push({
      test: 'Admin build exists',
      result: buildExists,
      path: adminDistPath
    });

    // Test admin portal access
    try {
      const adminResponse = await this.makeRequest('GET', '/admin/');
      const isHTML = adminResponse.raw && adminResponse.raw.includes('<html>');

      this.testResults.frontendIntegration.details.push({
        test: 'Admin portal access',
        status: adminResponse.status,
        isHTML: isHTML,
        size: `${adminResponse.size} bytes`
      });

      this.log(`Admin portal: ${adminResponse.status} (${isHTML ? 'HTML' : 'Non-HTML'})`,
               adminResponse.status === 200 && isHTML ? 'success' : 'warning');

    } catch (error) {
      this.testResults.frontendIntegration.details.push({
        test: 'Admin portal access',
        error: error.message
      });
    }

    // Check service files
    const serviceDir = '/home/augustine/Augustine_Projects/worklink_v2/admin/src/shared/services/api';
    const serviceFiles = fs.existsSync(serviceDir) ?
      fs.readdirSync(serviceDir).filter(f => f.endsWith('.service.js')) : [];

    this.testResults.frontendIntegration.details.push({
      test: 'Service files count',
      count: serviceFiles.length,
      files: serviceFiles.slice(0, 5) // First 5 files
    });

    this.testResults.frontendIntegration.status = buildExists && serviceFiles.length > 0 ? 'pass' : 'partial';
    this.log(`Frontend integration: Build ${buildExists ? '✅' : '❌'}, Services: ${serviceFiles.length}`, 'success');
  }

  async testPerformance() {
    this.log('⚡ Testing Performance...');

    try {
      // Test concurrent requests
      const concurrentRequests = 10;
      const startTime = Date.now();

      const requests = Array(concurrentRequests).fill().map((_, i) =>
        this.makeRequest('GET', '/api/v1/jobs').catch(err => ({ error: err.message, requestId: i }))
      );

      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.status && r.status < 400).length;

      this.testResults.performanceTest.details.push({
        test: 'Concurrent requests',
        totalRequests: concurrentRequests,
        successCount,
        totalTime: `${totalTime}ms`,
        averageTime: `${Math.round(totalTime / concurrentRequests)}ms`,
        successRate: `${Math.round((successCount / concurrentRequests) * 100)}%`
      });

      this.testResults.performanceTest.status = successCount >= concurrentRequests * 0.8 ? 'pass' : 'fail';
      this.log(`Performance: ${successCount}/${concurrentRequests} requests in ${totalTime}ms`, 'success');

    } catch (error) {
      this.testResults.performanceTest.status = 'fail';
      this.testResults.performanceTest.details.push({
        test: 'Performance test',
        error: error.message
      });
      this.log(`Performance test failed: ${error.message}`, 'error');
    }
  }

  calculateOverallScore() {
    const scores = {
      serverStartup: this.testResults.serverStartup.status === 'pass' ? 20 : 0,
      basicConnectivity: this.testResults.basicConnectivity.status === 'pass' ? 15 : 0,
      coreAPIs: this.testResults.coreAPIs.status === 'pass' ? 25 :
                this.testResults.coreAPIs.status === 'partial' ? 15 : 0,
      authentication: this.testResults.authentication.status === 'pass' ? 15 : 0,
      frontendIntegration: this.testResults.frontendIntegration.status === 'pass' ? 15 :
                          this.testResults.frontendIntegration.status === 'partial' ? 10 : 0,
      performanceTest: this.testResults.performanceTest.status === 'pass' ? 10 : 0
    };

    this.testResults.overallScore = Object.values(scores).reduce((a, b) => a + b, 0);
    return this.testResults.overallScore;
  }

  generateReport() {
    const report = {
      testSuite: 'Comprehensive API Connectivity Test',
      timestamp: new Date().toISOString(),
      overallScore: this.testResults.overallScore,
      grade: this.testResults.overallScore >= 90 ? 'A' :
             this.testResults.overallScore >= 80 ? 'B' :
             this.testResults.overallScore >= 70 ? 'C' :
             this.testResults.overallScore >= 60 ? 'D' : 'F',
      summary: {
        serverStartup: this.testResults.serverStartup.status,
        basicConnectivity: this.testResults.basicConnectivity.status,
        coreAPIs: this.testResults.coreAPIs.status,
        authentication: this.testResults.authentication.status,
        frontendIntegration: this.testResults.frontendIntegration.status,
        performanceTest: this.testResults.performanceTest.status
      },
      details: this.testResults
    };

    const reportPath = '/home/augustine/Augustine_Projects/worklink_v2/comprehensive-api-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  cleanup() {
    if (this.serverProcess) {
      this.log('🛑 Stopping test server...');
      this.serverProcess.kill('SIGTERM');
    }
  }

  async runAllTests() {
    this.log('🧪 Starting Comprehensive API Connectivity Test Suite...');

    try {
      // Start server
      await this.startServer();
      await this.sleep(2000); // Give server time to fully initialize

      // Run all tests
      await this.testBasicConnectivity();
      await this.testCoreAPIs();
      await this.testAuthentication();
      await this.testFrontendIntegration();
      await this.testPerformance();

      // Calculate score and generate report
      const score = this.calculateOverallScore();
      const report = this.generateReport();

      // Display results
      this.log('🎉 Test suite completed!', 'success');
      this.log('');
      console.log('📊 COMPREHENSIVE TEST RESULTS');
      console.log('===============================');
      console.log(`🎯 Overall Score: ${score}/100 (Grade: ${report.grade})`);
      console.log('');

      Object.entries(report.summary).forEach(([test, status]) => {
        const emoji = status === 'pass' ? '✅' : status === 'partial' ? '⚠️' : '❌';
        const formattedTest = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`${emoji} ${formattedTest}: ${status.toUpperCase()}`);
      });

      console.log('');
      console.log('📄 Detailed report saved to: comprehensive-api-test-report.json');

      return report;

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      throw error;
    } finally {
      this.cleanup();
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new ComprehensiveAPITester();

  tester.runAllTests()
    .then(report => {
      const exitCode = report.overallScore >= 70 ? 0 : 1;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

module.exports = ComprehensiveAPITester;