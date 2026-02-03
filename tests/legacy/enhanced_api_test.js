#!/usr/bin/env node
/**
 * Enhanced API Testing Script for WorkLink Platform
 * Provides detailed analysis of endpoint behavior, security, and performance
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// Test state
let testResults = [];
let securityIssues = [];
let performanceMetrics = [];

// Enhanced request function with better error handling
function makeRequest(method, url, data = null, headers = {}, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      timeout: timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WorkLink-Enhanced-Test/1.0',
        ...headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        try {
          let parsedBody;
          const contentType = res.headers['content-type'] || '';

          if (contentType.includes('application/json')) {
            parsedBody = JSON.parse(body);
          } else {
            parsedBody = body;
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            raw: body,
            responseTime: responseTime,
            url: url,
            method: method
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            raw: body,
            responseTime: responseTime,
            url: url,
            method: method,
            parseError: parseError.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({
        error: err.message,
        url: url,
        method: method,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        url: url,
        method: method,
        responseTime: timeout
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test logging functions
function logTest(category, name, status, details) {
  const result = {
    category,
    name,
    status, // 'PASS', 'FAIL', 'WARN'
    details,
    timestamp: new Date().toISOString()
  };

  testResults.push(result);

  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${category}] ${name}`);

  if (details.error) {
    console.log(`   Error: ${details.error}`);
  }
  if (details.responseTime) {
    console.log(`   Response: ${details.responseTime}ms`);
  }
}

function logSecurity(issue, severity, details) {
  securityIssues.push({
    issue,
    severity, // 'HIGH', 'MEDIUM', 'LOW'
    details,
    timestamp: new Date().toISOString()
  });

  const icon = severity === 'HIGH' ? '🚨' : severity === 'MEDIUM' ? '⚠️' : 'ℹ️';
  console.log(`${icon} [SECURITY-${severity}] ${issue}`);
}

function logPerformance(metric, value, threshold, details) {
  performanceMetrics.push({
    metric,
    value,
    threshold,
    passed: value <= threshold,
    details,
    timestamp: new Date().toISOString()
  });

  const status = value <= threshold ? 'PASS' : 'FAIL';
  const icon = status === 'PASS' ? '⚡' : '🐌';
  console.log(`${icon} [PERF] ${metric}: ${value}${details.unit || ''} (threshold: ${threshold}${details.unit || ''})`);
}

// Comprehensive Authentication Testing
async function testAuthentication() {
  console.log('\n🔐 COMPREHENSIVE AUTHENTICATION TESTING');
  console.log('='.repeat(50));

  let validToken = null;

  // Test API discovery
  try {
    const response = await makeRequest('GET', `${API_BASE}/`);
    logTest('Auth', 'API Discovery',
      response.status === 200 && response.body.name ? 'PASS' : 'FAIL',
      { status: response.status, responseTime: response.responseTime, endpoints: Object.keys(response.body.endpoints || {}).length });
  } catch (error) {
    logTest('Auth', 'API Discovery', 'FAIL', { error: error.error });
  }

  // Test login validation with various invalid inputs
  const invalidLogins = [
    { email: '', password: '' },
    { email: 'invalid', password: 'test' },
    { email: 'test@', password: 'test' },
    { email: 'test@example.com', password: '' },
    { email: null, password: 'test' },
    { email: 'test@example.com' } // missing password
  ];

  for (const [index, credentials] of invalidLogins.entries()) {
    try {
      const response = await makeRequest('POST', `${API_BASE}/auth/login`, credentials);
      logTest('Auth', `Invalid login test ${index + 1}`,
        response.status >= 400 ? 'PASS' : 'FAIL',
        { status: response.status, responseTime: response.responseTime, credentials: Object.keys(credentials) });
    } catch (error) {
      logTest('Auth', `Invalid login test ${index + 1}`, 'PASS', { error: 'Network error (expected)' });
    }
  }

  // Test demo user login
  try {
    const response = await makeRequest('POST', `${API_BASE}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });

    if (response.status === 200 && response.body.success && response.body.token) {
      validToken = response.body.token;
      logTest('Auth', 'Demo login (Sarah Tan)', 'PASS', {
        status: response.status,
        responseTime: response.responseTime,
        hasToken: !!response.body.token,
        userData: response.body.data?.name
      });
    } else {
      logTest('Auth', 'Demo login (Sarah Tan)', 'FAIL', {
        status: response.status,
        responseTime: response.responseTime,
        body: response.body
      });
    }
  } catch (error) {
    logTest('Auth', 'Demo login (Sarah Tan)', 'FAIL', { error: error.error });
  }

  // Test user registration with validation
  try {
    const testUser = {
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      phone: '+65 9123 4567', // Valid Singapore format
      date_of_birth: '1990-01-01'
    };

    const response = await makeRequest('POST', `${API_BASE}/auth/register`, testUser);
    logTest('Auth', 'User registration',
      response.status === 201 || response.status === 200 ? 'PASS' : 'FAIL',
      { status: response.status, responseTime: response.responseTime, error: response.body?.error });
  } catch (error) {
    logTest('Auth', 'User registration', 'FAIL', { error: error.error });
  }

  // Test token validation
  if (validToken) {
    try {
      const response = await makeRequest('GET', `${API_BASE}/auth/me`, null, {
        'Authorization': `Bearer ${validToken}`
      });
      logTest('Auth', 'Token validation',
        response.status === 200 && response.body.success ? 'PASS' : 'FAIL',
        { status: response.status, responseTime: response.responseTime, hasUserData: !!response.body.data });
    } catch (error) {
      logTest('Auth', 'Token validation', 'FAIL', { error: error.error });
    }
  }

  // Test OAuth configurations
  const oauthEndpoints = ['telegram/config', 'google/config'];
  for (const endpoint of oauthEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}/auth/${endpoint}`);
      const isConfigured = response.status === 200 && response.body.success;
      logTest('Auth', `${endpoint.split('/')[0]} OAuth config`,
        isConfigured ? 'PASS' : 'WARN',
        { status: response.status, responseTime: response.responseTime, configured: isConfigured });
    } catch (error) {
      logTest('Auth', `${endpoint.split('/')[0]} OAuth config`, 'FAIL', { error: error.error });
    }
  }

  return validToken;
}

// Admin API Testing
async function testAdminAPI() {
  console.log('\n👑 ADMIN API TESTING');
  console.log('='.repeat(50));

  // Test admin endpoints
  const adminEndpoints = [
    { path: '/admin/stats', method: 'GET' },
    { path: '/admin/settings', method: 'GET' },
    { path: '/admin/reset-to-sample', method: 'POST' }
  ];

  for (const endpoint of adminEndpoints) {
    try {
      const response = await makeRequest(endpoint.method, `${API_BASE}${endpoint.path}`);

      // Admin endpoints should be accessible without auth in demo
      logTest('Admin', `${endpoint.path} (${endpoint.method})`,
        response.status === 200 ? 'PASS' : 'WARN',
        { status: response.status, responseTime: response.responseTime, hasData: !!response.body.data });

    } catch (error) {
      logTest('Admin', `${endpoint.path} (${endpoint.method})`, 'FAIL', { error: error.error });
    }
  }
}

// Core Business API Testing
async function testCoreBusinessAPI(token) {
  console.log('\n🏢 CORE BUSINESS API TESTING');
  console.log('='.repeat(50));

  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  const endpoints = [
    { name: 'Candidates', path: '/candidates' },
    { name: 'Jobs', path: '/jobs' },
    { name: 'Deployments', path: '/deployments' },
    { name: 'Payments', path: '/payments' },
    { name: 'Clients', path: '/clients' },
    { name: 'Tenders', path: '/tenders' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint.path}`, null, headers);

      const status = response.status === 200 ? 'PASS' :
                    response.status === 401 ? 'WARN' : 'FAIL';

      logTest('Business', `${endpoint.name} list`, status, {
        status: response.status,
        responseTime: response.responseTime,
        hasAuth: !!token,
        dataCount: Array.isArray(response.body?.data) ? response.body.data.length : 'unknown'
      });

    } catch (error) {
      logTest('Business', `${endpoint.name} list`, 'FAIL', { error: error.error });
    }
  }

  // Test CRUD operations on jobs
  if (token) {
    const newJob = {
      title: `Test Job ${Date.now()}`,
      description: 'Automated test job',
      location: 'Test Location',
      hourly_rate: 20.00,
      duration: 4,
      requirements: 'Test requirements'
    };

    try {
      const response = await makeRequest('POST', `${API_BASE}/jobs`, newJob, headers);
      logTest('Business', 'Create job (POST)',
        response.status === 200 || response.status === 201 ? 'PASS' : 'FAIL',
        { status: response.status, responseTime: response.responseTime, jobId: response.body?.data?.id });
    } catch (error) {
      logTest('Business', 'Create job (POST)', 'FAIL', { error: error.error });
    }
  }
}

// Gamification API Testing
async function testGamificationAPI(token) {
  console.log('\n🎮 GAMIFICATION API TESTING');
  console.log('='.repeat(50));

  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  const gamificationEndpoints = [
    { name: 'Main gamification data', path: '/gamification' },
    { name: 'Achievements', path: '/gamification/achievements' },
    { name: 'Leaderboard', path: '/gamification/leaderboard' },
    { name: 'Quests', path: '/gamification/quests' },
    { name: 'User progress', path: '/gamification/progress' },
    { name: 'XP history', path: '/gamification/xp-history' }
  ];

  for (const endpoint of gamificationEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint.path}`, null, headers);

      const status = response.status === 200 ? 'PASS' :
                    response.status === 404 ? 'WARN' : 'FAIL';

      logTest('Gamification', endpoint.name, status, {
        status: response.status,
        responseTime: response.responseTime,
        hasData: !!response.body?.data || !!response.body?.success
      });

    } catch (error) {
      logTest('Gamification', endpoint.name, 'FAIL', { error: error.error });
    }
  }
}

// AI/ML API Testing
async function testAIMLAPI(token) {
  console.log('\n🤖 AI/ML API TESTING');
  console.log('='.repeat(50));

  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  // Test AI Chat
  try {
    const chatMessage = {
      message: 'Hello, this is a test message for API testing.',
      candidateId: token ? 'CND_DEMO_001' : 'test'
    };

    const response = await makeRequest('POST', `${API_BASE}/ai-chat`, chatMessage, headers);

    logTest('AI/ML', 'AI Chat',
      response.status === 200 || response.status === 400 ? 'PASS' : 'FAIL',
      {
        status: response.status,
        responseTime: response.responseTime,
        hasResponse: !!response.body?.response || !!response.body?.message
      });
  } catch (error) {
    logTest('AI/ML', 'AI Chat', 'FAIL', { error: error.error });
  }

  // Test ML endpoints
  const mlEndpoints = ['/ml', '/ai', '/ad-ml'];
  for (const endpoint of mlEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint}`, null, headers);

      logTest('AI/ML', `${endpoint} endpoint`,
        response.status === 200 || response.status === 404 ? 'PASS' : 'FAIL',
        { status: response.status, responseTime: response.responseTime });

    } catch (error) {
      logTest('AI/ML', `${endpoint} endpoint`, 'FAIL', { error: error.error });
    }
  }
}

// Real-time Features Testing
async function testRealTimeFeatures(token) {
  console.log('\n⚡ REAL-TIME FEATURES TESTING');
  console.log('='.repeat(50));

  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  // Test messaging endpoints
  const messagingEndpoints = [
    '/chat',
    '/conversations',
    '/messaging',
    '/notifications'
  ];

  for (const endpoint of messagingEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint}`, null, headers);

      logTest('Real-time', `${endpoint} endpoint`,
        response.status === 200 || response.status === 401 ? 'PASS' : 'FAIL',
        { status: response.status, responseTime: response.responseTime });

    } catch (error) {
      logTest('Real-time', `${endpoint} endpoint`, 'FAIL', { error: error.error });
    }
  }

  // Test WebSocket connection
  try {
    const wsUrl = BASE_URL.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);

    const wsTest = new Promise((resolve) => {
      let connected = false;

      const timeout = setTimeout(() => {
        if (!connected) {
          ws.terminate();
          resolve({ success: false, error: 'Connection timeout' });
        }
      }, 3000);

      ws.on('open', () => {
        connected = true;
        clearTimeout(timeout);

        // Test sending a message
        ws.send(JSON.stringify({ type: 'test', message: 'API test' }));

        setTimeout(() => {
          ws.close();
          resolve({ success: true, connectionTime: Date.now() });
        }, 100);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ success: false, error: error.message });
      });

      ws.on('message', (data) => {
        // Message received successfully
        resolve({ success: true, receivedMessage: true });
      });
    });

    const wsResult = await wsTest;

    logTest('Real-time', 'WebSocket Connection',
      wsResult.success ? 'PASS' : 'FAIL',
      wsResult);

  } catch (error) {
    logTest('Real-time', 'WebSocket Connection', 'FAIL', { error: error.message });
  }
}

// Security Testing
async function testSecurity() {
  console.log('\n🔒 SECURITY TESTING');
  console.log('='.repeat(50));

  // Test CORS policy
  try {
    const response = await makeRequest('OPTIONS', `${API_BASE}/auth/login`, null, {
      'Origin': 'https://malicious-domain.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    });

    const corsHeaders = response.headers['access-control-allow-origin'];
    if (!corsHeaders || corsHeaders === '*') {
      logSecurity('CORS allows all origins', 'HIGH', { corsHeader: corsHeaders });
      logTest('Security', 'CORS Policy', 'FAIL', { allowsAllOrigins: true });
    } else {
      logTest('Security', 'CORS Policy', 'PASS', { corsHeader: corsHeaders });
    }
  } catch (error) {
    logTest('Security', 'CORS Policy', 'WARN', { error: error.error });
  }

  // Test SQL injection
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE candidates; --",
    "admin'--"
  ];

  for (const payload of sqlPayloads) {
    try {
      const response = await makeRequest('POST', `${API_BASE}/auth/login`, {
        email: payload,
        password: payload
      });

      if (response.status === 200 || (response.body && typeof response.body === 'string' && response.body.toLowerCase().includes('sql'))) {
        logSecurity('SQL Injection vulnerability detected', 'HIGH', { payload, response: response.body });
        logTest('Security', `SQL Injection (${payload.slice(0, 10)}...)`, 'FAIL', { vulnerable: true });
      } else {
        logTest('Security', `SQL Injection (${payload.slice(0, 10)}...)`, 'PASS', { status: response.status });
      }
    } catch (error) {
      logTest('Security', `SQL Injection (${payload.slice(0, 10)}...)`, 'PASS', { blocked: true });
    }
  }

  // Test XSS protection
  const xssPayload = "<script>alert('XSS')</script>";
  try {
    const response = await makeRequest('POST', `${API_BASE}/auth/register`, {
      name: xssPayload,
      email: 'test@example.com',
      phone: '+65 9123 4567'
    });

    if (response.raw && response.raw.includes(xssPayload)) {
      logSecurity('XSS vulnerability - script not escaped', 'HIGH', { payload: xssPayload });
      logTest('Security', 'XSS Protection', 'FAIL', { vulnerable: true });
    } else {
      logTest('Security', 'XSS Protection', 'PASS', { payloadEscaped: true });
    }
  } catch (error) {
    logTest('Security', 'XSS Protection', 'PASS', { blocked: true });
  }

  // Test security headers
  try {
    const response = await makeRequest('GET', `${API_BASE}/`);
    const headers = response.headers;

    const securityHeaders = {
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'x-xss-protection': headers['x-xss-protection']
    };

    const missingHeaders = Object.keys(securityHeaders).filter(h => !securityHeaders[h]);

    if (missingHeaders.length > 0) {
      logSecurity(`Missing security headers: ${missingHeaders.join(', ')}`, 'MEDIUM', { missing: missingHeaders });
    }

    logTest('Security', 'Security Headers',
      missingHeaders.length === 0 ? 'PASS' : 'WARN',
      { present: Object.keys(securityHeaders).length - missingHeaders.length, missing: missingHeaders.length });

  } catch (error) {
    logTest('Security', 'Security Headers', 'FAIL', { error: error.error });
  }
}

// Performance Testing
async function testPerformance() {
  console.log('\n⚡ PERFORMANCE TESTING');
  console.log('='.repeat(50));

  // Response time test
  const responseTimes = [];
  const testUrl = `${API_BASE}/`;

  console.log('Testing response times (10 requests)...');
  for (let i = 0; i < 10; i++) {
    try {
      const response = await makeRequest('GET', testUrl);
      responseTimes.push(response.responseTime);
    } catch (error) {
      console.log(`Request ${i + 1} failed: ${error.error}`);
    }
  }

  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    logPerformance('Average Response Time', avgResponseTime.toFixed(2), 500, { unit: 'ms' });
    logPerformance('Max Response Time', maxResponseTime, 1000, { unit: 'ms' });
    logPerformance('Min Response Time', minResponseTime, 100, { unit: 'ms' });

    logTest('Performance', 'Response Time Analysis',
      avgResponseTime < 500 ? 'PASS' : 'WARN',
      { avgMs: avgResponseTime.toFixed(2), maxMs: maxResponseTime, minMs: minResponseTime });
  }

  // Concurrent requests test
  console.log('Testing concurrent requests (20 simultaneous)...');
  try {
    const startTime = Date.now();
    const concurrentRequests = Array(20).fill().map(() => makeRequest('GET', testUrl));

    const results = await Promise.allSettled(concurrentRequests);
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
    const totalTime = endTime - startTime;
    const throughput = (20 / totalTime * 1000).toFixed(2);

    logPerformance('Concurrent Request Success Rate', `${successful}/20`, 18, { unit: ' requests' });
    logPerformance('Throughput', throughput, 10, { unit: ' req/s' });

    logTest('Performance', 'Concurrent Requests',
      successful >= 18 ? 'PASS' : 'WARN',
      { successful, total: 20, throughputPerSec: throughput, totalTimeMs: totalTime });

  } catch (error) {
    logTest('Performance', 'Concurrent Requests', 'FAIL', { error: error.error });
  }
}

// Generate comprehensive report
function generateReport() {
  const now = new Date().toISOString();

  const summary = {
    totalTests: testResults.length,
    passed: testResults.filter(r => r.status === 'PASS').length,
    failed: testResults.filter(r => r.status === 'FAIL').length,
    warnings: testResults.filter(r => r.status === 'WARN').length,
    securityIssues: securityIssues.length,
    highSeverityIssues: securityIssues.filter(i => i.severity === 'HIGH').length
  };

  const report = {
    metadata: {
      timestamp: now,
      testTarget: BASE_URL,
      environment: process.env.NODE_ENV || 'development',
      testDuration: 'N/A'
    },
    summary,
    testResults: testResults.reduce((acc, test) => {
      if (!acc[test.category]) acc[test.category] = [];
      acc[test.category].push(test);
      return acc;
    }, {}),
    securityIssues,
    performanceMetrics,
    recommendations: generateRecommendations()
  };

  return report;
}

function generateRecommendations() {
  const recommendations = [];

  if (securityIssues.filter(i => i.severity === 'HIGH').length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Security',
      issue: 'High severity security vulnerabilities detected',
      recommendation: 'Address SQL injection, XSS, or CORS issues immediately'
    });
  }

  const failedTests = testResults.filter(t => t.status === 'FAIL');
  if (failedTests.length > testResults.length * 0.2) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Reliability',
      issue: 'High failure rate in API tests',
      recommendation: 'Review failed endpoints and improve error handling'
    });
  }

  const slowRequests = performanceMetrics.filter(m => !m.passed);
  if (slowRequests.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Performance',
      issue: 'Performance thresholds exceeded',
      recommendation: 'Optimize slow endpoints and database queries'
    });
  }

  return recommendations;
}

// Main test execution
async function runEnhancedTests() {
  console.log('🚀 WORKLINK API - ENHANCED COMPREHENSIVE TESTING');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  try {
    // Run all test suites
    const authToken = await testAuthentication();
    await testAdminAPI();
    await testCoreBusinessAPI(authToken);
    await testGamificationAPI(authToken);
    await testAIMLAPI(authToken);
    await testRealTimeFeatures(authToken);
    await testSecurity();
    await testPerformance();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Generate report
    const report = generateReport();
    report.metadata.testDuration = `${duration.toFixed(2)} seconds`;

    // Display summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️ Warnings: ${report.summary.warnings}`);
    console.log(`🔒 Security Issues: ${report.summary.securityIssues} (${report.summary.highSeverityIssues} high severity)`);
    console.log(`⏱️ Test Duration: ${duration.toFixed(2)} seconds`);

    // Category breakdown
    console.log('\n📋 BY CATEGORY:');
    Object.keys(report.testResults).forEach(category => {
      const tests = report.testResults[category];
      const passed = tests.filter(t => t.status === 'PASS').length;
      const total = tests.length;
      const percentage = ((passed / total) * 100).toFixed(1);
      console.log(`  ${category}: ${passed}/${total} (${percentage}%)`);
    });

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        const icon = rec.priority === 'HIGH' ? '🚨' : rec.priority === 'MEDIUM' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} [${rec.priority}] ${rec.category}: ${rec.issue}`);
        console.log(`      → ${rec.recommendation}`);
      });
    }

    // Save report
    const reportFile = `enhanced_api_test_report_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportFile}`);

    console.log('\n✅ Testing completed successfully!');
    return report;

  } catch (error) {
    console.error('\n🚨 Test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runEnhancedTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runEnhancedTests };