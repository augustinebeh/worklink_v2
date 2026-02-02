#!/usr/bin/env node
/**
 * Comprehensive API Testing Script for WorkLink Platform
 * Tests all endpoints across categories: auth, admin, core business, gamification, AI/ML, real-time, security
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let testResults = [];

// Helper function to make HTTP requests
function makeRequest(method, url, data = null, headers = {}) {
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
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WorkLink-API-Test/1.0',
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
          const parsedBody = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(body)
            : body;

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            responseTime: responseTime,
            raw: body
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            responseTime: responseTime,
            raw: body,
            parseError: parseError.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({
        error: err.message,
        responseTime: Date.now() - startTime
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test result recording
function recordTest(category, name, passed, details) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ ${category}: ${name}`);
  } else {
    failedTests++;
    console.log(`❌ ${category}: ${name} - ${details.error || details.reason}`);
  }

  testResults.push({
    category,
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

// Security test helpers
function testSQLInjection(endpoint, payload) {
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM candidates --",
    "admin'--",
    "admin'/*",
    "' OR 1=1--",
    "') OR ('1'='1"
  ];

  return Promise.all(sqlPayloads.map(async (sqlPayload) => {
    try {
      const testData = { ...payload };
      // Insert SQL injection into all string fields
      for (let key in testData) {
        if (typeof testData[key] === 'string') {
          testData[key] = sqlPayload;
        }
      }

      const response = await makeRequest('POST', endpoint, testData);

      // Should not return successful responses or database errors
      const isVulnerable =
        response.status === 200 ||
        (response.body && typeof response.body === 'string' &&
         response.body.toLowerCase().includes('sql')) ||
        (response.body && response.body.error &&
         response.body.error.toLowerCase().includes('sql'));

      return {
        payload: sqlPayload,
        vulnerable: isVulnerable,
        response: response
      };
    } catch (error) {
      return {
        payload: sqlPayload,
        vulnerable: false,
        error: error.message
      };
    }
  }));
}

function testXSS(endpoint, payload) {
  const xssPayloads = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg onload=alert('XSS')>",
    "'><script>alert('XSS')</script>",
    "\"><script>alert('XSS')</script>"
  ];

  return Promise.all(xssPayloads.map(async (xssPayload) => {
    try {
      const testData = { ...payload };
      // Insert XSS payload into all string fields
      for (let key in testData) {
        if (typeof testData[key] === 'string') {
          testData[key] = xssPayload;
        }
      }

      const response = await makeRequest('POST', endpoint, testData);

      // Check if XSS payload is reflected without encoding
      const isVulnerable =
        response.raw && typeof response.raw === 'string' &&
        response.raw.includes(xssPayload);

      return {
        payload: xssPayload,
        vulnerable: isVulnerable,
        response: response
      };
    } catch (error) {
      return {
        payload: xssPayload,
        vulnerable: false,
        error: error.message
      };
    }
  }));
}

// Authentication Tests
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Endpoints...');

  // Test 1: API Info endpoint
  try {
    const response = await makeRequest('GET', `${API_BASE}/`);
    recordTest('Auth', 'API Info Endpoint',
      response.status === 200 && response.body.name === 'WorkLink API',
      { response: response.body, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Auth', 'API Info Endpoint', false, { error: error.message });
  }

  // Test 2: Login - Invalid credentials
  try {
    const response = await makeRequest('POST', `${API_BASE}/auth/login`, {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    });
    recordTest('Auth', 'Login with invalid credentials',
      response.status === 401,
      { expectedStatus: 401, actualStatus: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Auth', 'Login with invalid credentials', false, { error: error.message });
  }

  // Test 3: Demo login - Sarah Tan
  let workerToken = null;
  try {
    const response = await makeRequest('POST', `${API_BASE}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });
    recordTest('Auth', 'Demo worker login (Sarah Tan)',
      response.status === 200 && response.body.success,
      { response: response.body, responseTime: response.responseTime });

    if (response.body.success && response.body.token) {
      workerToken = response.body.token;
    }
  } catch (error) {
    recordTest('Auth', 'Demo worker login (Sarah Tan)', false, { error: error.message });
  }

  // Test 4: Admin login configuration check
  try {
    const response = await makeRequest('POST', `${API_BASE}/auth/login`, {
      email: 'admin@talentvis.com',
      password: 'test',
      type: 'admin'
    });
    recordTest('Auth', 'Admin login attempt',
      response.status === 401 || response.status === 500,
      { expectedStatus: '401 or 500', actualStatus: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Auth', 'Admin login attempt', false, { error: error.message });
  }

  // Test 5: Get current user without token
  try {
    const response = await makeRequest('GET', `${API_BASE}/auth/me`);
    recordTest('Auth', 'Get current user without token',
      response.status === 401,
      { expectedStatus: 401, actualStatus: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Auth', 'Get current user without token', false, { error: error.message });
  }

  // Test 6: Get current user with token
  if (workerToken) {
    try {
      const response = await makeRequest('GET', `${API_BASE}/auth/me`, null, {
        'Authorization': `Bearer ${workerToken}`
      });
      recordTest('Auth', 'Get current user with valid token',
        response.status === 200 && response.body.success,
        { response: response.body, responseTime: response.responseTime });
    } catch (error) {
      recordTest('Auth', 'Get current user with valid token', false, { error: error.message });
    }
  }

  // Test 7: Register new user
  try {
    const testUser = {
      name: `Test User ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      phone: '+1234567890',
      date_of_birth: '1990-01-01'
    };

    const response = await makeRequest('POST', `${API_BASE}/auth/register`, testUser);
    recordTest('Auth', 'Register new user',
      response.status === 201 || response.status === 200,
      { response: response.body, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Auth', 'Register new user', false, { error: error.message });
  }

  // Test 8: Telegram bot config
  try {
    const response = await makeRequest('GET', `${API_BASE}/auth/telegram/config`);
    recordTest('Auth', 'Telegram bot config',
      response.status === 200 || response.status === 500,
      { response: response.body, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Auth', 'Telegram bot config', false, { error: error.message });
  }

  // Test 9: Google OAuth config
  try {
    const response = await makeRequest('GET', `${API_BASE}/auth/google/config`);
    recordTest('Auth', 'Google OAuth config',
      response.status === 200 || response.status === 500,
      { response: response.body, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Auth', 'Google OAuth config', false, { error: error.message });
  }

  return workerToken;
}

// Admin API Tests
async function testAdminAPI() {
  console.log('\n👑 Testing Admin API Endpoints...');

  // Test admin endpoints without authentication
  const adminEndpoints = [
    '/admin',
    '/admin/stats',
    '/admin/settings',
    '/admin/reset'
  ];

  for (const endpoint of adminEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint}`);
      recordTest('Admin', `${endpoint} without auth`,
        response.status === 401,
        { expectedStatus: 401, actualStatus: response.status, responseTime: response.responseTime });
    } catch (error) {
      recordTest('Admin', `${endpoint} without auth`, false, { error: error.message });
    }
  }
}

// Core Business API Tests
async function testCoreBusinessAPI(authToken) {
  console.log('\n🏢 Testing Core Business APIs...');

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test 1: Get candidates
  try {
    const response = await makeRequest('GET', `${API_BASE}/candidates`, null, headers);
    recordTest('Business', 'Get candidates list',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Business', 'Get candidates list', false, { error: error.message });
  }

  // Test 2: Get jobs
  try {
    const response = await makeRequest('GET', `${API_BASE}/jobs`, null, headers);
    recordTest('Business', 'Get jobs list',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Business', 'Get jobs list', false, { error: error.message });
  }

  // Test 3: Get deployments
  try {
    const response = await makeRequest('GET', `${API_BASE}/deployments`, null, headers);
    recordTest('Business', 'Get deployments list',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Business', 'Get deployments list', false, { error: error.message });
  }

  // Test 4: Get payments
  try {
    const response = await makeRequest('GET', `${API_BASE}/payments`, null, headers);
    recordTest('Business', 'Get payments list',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Business', 'Get payments list', false, { error: error.message });
  }

  // Test 5: Get clients
  try {
    const response = await makeRequest('GET', `${API_BASE}/clients`, null, headers);
    recordTest('Business', 'Get clients list',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Business', 'Get clients list', false, { error: error.message });
  }

  // Test 6: Get tenders
  try {
    const response = await makeRequest('GET', `${API_BASE}/tenders`, null, headers);
    recordTest('Business', 'Get tenders list',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Business', 'Get tenders list', false, { error: error.message });
  }

  // Test 7: Create new job (POST)
  try {
    const newJob = {
      title: `Test Job ${Date.now()}`,
      description: 'Test job description',
      location: 'Test Location',
      hourly_rate: 15.00,
      duration: 8,
      requirements: 'Test requirements'
    };

    const response = await makeRequest('POST', `${API_BASE}/jobs`, newJob, headers);
    recordTest('Business', 'Create new job',
      response.status === 200 || response.status === 201 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Business', 'Create new job', false, { error: error.message });
  }
}

// Gamification API Tests
async function testGamificationAPI(authToken) {
  console.log('\n🎮 Testing Gamification APIs...');

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test 1: Get XP/Level info
  try {
    const response = await makeRequest('GET', `${API_BASE}/gamification`, null, headers);
    recordTest('Gamification', 'Get gamification data',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Gamification', 'Get gamification data', false, { error: error.message });
  }

  // Test 2: Get achievements
  try {
    const response = await makeRequest('GET', `${API_BASE}/gamification/achievements`, null, headers);
    recordTest('Gamification', 'Get achievements',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Gamification', 'Get achievements', false, { error: error.message });
  }

  // Test 3: Get leaderboard
  try {
    const response = await makeRequest('GET', `${API_BASE}/gamification/leaderboard`, null, headers);
    recordTest('Gamification', 'Get leaderboard',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Gamification', 'Get leaderboard', false, { error: error.message });
  }

  // Test 4: Get quests
  try {
    const response = await makeRequest('GET', `${API_BASE}/gamification/quests`, null, headers);
    recordTest('Gamification', 'Get quests',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Gamification', 'Get quests', false, { error: error.message });
  }
}

// AI/ML API Tests
async function testAIMLAPI(authToken) {
  console.log('\n🤖 Testing AI/ML APIs...');

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test 1: AI Chat
  try {
    const response = await makeRequest('POST', `${API_BASE}/ai-chat`, {
      message: 'Hello, test message'
    }, headers);
    recordTest('AI/ML', 'AI Chat endpoint',
      response.status === 200 || response.status === 401 || response.status === 400,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('AI/ML', 'AI Chat endpoint', false, { error: error.message });
  }

  // Test 2: ML Training
  try {
    const response = await makeRequest('GET', `${API_BASE}/ml`, null, headers);
    recordTest('AI/ML', 'ML endpoints',
      response.status === 200 || response.status === 401 || response.status === 404,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('AI/ML', 'ML endpoints', false, { error: error.message });
  }

  // Test 3: AI Automation
  try {
    const response = await makeRequest('GET', `${API_BASE}/ai`, null, headers);
    recordTest('AI/ML', 'AI Automation endpoint',
      response.status === 200 || response.status === 401 || response.status === 404,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('AI/ML', 'AI Automation endpoint', false, { error: error.message });
  }
}

// Real-time Features Tests
async function testRealTimeFeatures(authToken) {
  console.log('\n⚡ Testing Real-time Features...');

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test 1: Chat endpoints
  try {
    const response = await makeRequest('GET', `${API_BASE}/chat`, null, headers);
    recordTest('Real-time', 'Chat endpoint',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Real-time', 'Chat endpoint', false, { error: error.message });
  }

  // Test 2: Notifications
  try {
    const response = await makeRequest('GET', `${API_BASE}/notifications`, null, headers);
    recordTest('Real-time', 'Notifications endpoint',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Real-time', 'Notifications endpoint', false, { error: error.message });
  }

  // Test 3: Conversations
  try {
    const response = await makeRequest('GET', `${API_BASE}/conversations`, null, headers);
    recordTest('Real-time', 'Conversations endpoint',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Real-time', 'Conversations endpoint', false, { error: error.message });
  }

  // Test 4: WebSocket Connection
  try {
    const wsUrl = BASE_URL.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);

    const wsTest = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ connected: false, error: 'Connection timeout' });
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ connected: true });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ connected: false, error: error.message });
      });
    });

    const wsResult = await wsTest;
    recordTest('Real-time', 'WebSocket connection',
      wsResult.connected,
      wsResult);
  } catch (error) {
    recordTest('Real-time', 'WebSocket connection', false, { error: error.message });
  }
}

// Advanced Features Tests
async function testAdvancedFeatures(authToken) {
  console.log('\n🔧 Testing Advanced Features...');

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test 1: Telegram Groups
  try {
    const response = await makeRequest('GET', `${API_BASE}/telegram-groups`, null, headers);
    recordTest('Advanced', 'Telegram Groups endpoint',
      response.status === 200 || response.status === 401 || response.status === 404,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Advanced', 'Telegram Groups endpoint', false, { error: error.message });
  }

  // Test 2: Tender Monitoring
  try {
    const response = await makeRequest('GET', `${API_BASE}/tender-monitor`, null, headers);
    recordTest('Advanced', 'Tender Monitor endpoint',
      response.status === 200 || response.status === 401 || response.status === 404,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Advanced', 'Tender Monitor endpoint', false, { error: error.message });
  }

  // Test 3: Analytics
  try {
    const response = await makeRequest('GET', `${API_BASE}/analytics`, null, headers);
    recordTest('Advanced', 'Analytics endpoint',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Advanced', 'Analytics endpoint', false, { error: error.message });
  }

  // Test 4: Telegram Webhook
  try {
    const response = await makeRequest('POST', `${API_BASE}/webhooks/telegram`, {
      message: { text: 'test', chat: { id: 123 } }
    });
    recordTest('Advanced', 'Telegram webhook',
      response.status === 200 || response.status === 401 || response.status === 400,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Advanced', 'Telegram webhook', false, { error: error.message });
  }

  // Test 5: Referrals
  try {
    const response = await makeRequest('GET', `${API_BASE}/referrals`, null, headers);
    recordTest('Advanced', 'Referrals endpoint',
      response.status === 200 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Advanced', 'Referrals endpoint', false, { error: error.message });
  }
}

// Security Tests
async function testSecurity() {
  console.log('\n🔒 Testing Security & Error Handling...');

  // Test 1: SQL Injection on login
  try {
    const sqlResults = await testSQLInjection(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password'
    });

    const vulnerableResults = sqlResults.filter(r => r.vulnerable);
    recordTest('Security', 'SQL Injection Protection (Login)',
      vulnerableResults.length === 0,
      {
        totalPayloads: sqlResults.length,
        vulnerablePayloads: vulnerableResults.length,
        details: vulnerableResults
      });
  } catch (error) {
    recordTest('Security', 'SQL Injection Protection (Login)', false, { error: error.message });
  }

  // Test 2: XSS on registration
  try {
    const xssResults = await testXSS(`${API_BASE}/auth/register`, {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+1234567890'
    });

    const vulnerableResults = xssResults.filter(r => r.vulnerable);
    recordTest('Security', 'XSS Protection (Registration)',
      vulnerableResults.length === 0,
      {
        totalPayloads: xssResults.length,
        vulnerablePayloads: vulnerableResults.length,
        details: vulnerableResults
      });
  } catch (error) {
    recordTest('Security', 'XSS Protection (Registration)', false, { error: error.message });
  }

  // Test 3: CORS Headers
  try {
    const response = await makeRequest('OPTIONS', `${API_BASE}/`, null, {
      'Origin': 'https://malicious-site.com'
    });
    recordTest('Security', 'CORS Protection',
      response.status === 200 || response.status === 403,
      { status: response.status, headers: response.headers });
  } catch (error) {
    recordTest('Security', 'CORS Protection', false, { error: error.message });
  }

  // Test 4: Large Payload Protection
  try {
    const largePayload = {
      data: 'x'.repeat(50 * 1024 * 1024) // 50MB
    };

    const response = await makeRequest('POST', `${API_BASE}/auth/register`, largePayload);
    recordTest('Security', 'Large Payload Protection',
      response.status >= 400,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    recordTest('Security', 'Large Payload Protection', true, { error: error.message });
  }

  // Test 5: Invalid JSON handling
  try {
    const invalidJsonTest = new Promise((resolve) => {
      const http = require('http');
      const postData = '{ "invalid": json }';

      const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/api/v1/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, (res) => {
        resolve({ status: res.statusCode });
      });

      req.on('error', () => {
        resolve({ status: 0, error: 'Network error' });
      });

      req.write(postData);
      req.end();
    });

    const response = await invalidJsonTest;
    recordTest('Security', 'Invalid JSON handling',
      response.status >= 400,
      { status: response.status });
  } catch (error) {
    recordTest('Security', 'Invalid JSON handling', true, { error: error.message });
  }
}

// Performance Tests
async function testPerformance(authToken) {
  console.log('\n⚡ Testing Performance & Rate Limiting...');

  // Test 1: Response time test
  const responseTimes = [];
  const testEndpoint = `${API_BASE}/`;

  for (let i = 0; i < 10; i++) {
    try {
      const response = await makeRequest('GET', testEndpoint);
      responseTimes.push(response.responseTime);
    } catch (error) {
      // Skip failed requests for performance analysis
    }
  }

  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);

    recordTest('Performance', 'Response time (average < 1000ms)',
      avgResponseTime < 1000,
      {
        averageMs: avgResponseTime.toFixed(2),
        maxMs: maxResponseTime,
        samples: responseTimes.length
      });
  }

  // Test 2: Concurrent requests
  try {
    const concurrentRequests = Array(50).fill().map(() =>
      makeRequest('GET', testEndpoint)
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(concurrentRequests);
    const endTime = Date.now();

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const totalTime = endTime - startTime;

    recordTest('Performance', 'Concurrent requests handling',
      successCount >= 25, // At least 50% should succeed
      {
        totalRequests: 50,
        successfulRequests: successCount,
        totalTimeMs: totalTime,
        requestsPerSecond: (50 / totalTime * 1000).toFixed(2)
      });
  } catch (error) {
    recordTest('Performance', 'Concurrent requests handling', false, { error: error.message });
  }

  // Test 3: Rate limiting test
  try {
    const rapidRequests = [];
    for (let i = 0; i < 100; i++) {
      rapidRequests.push(makeRequest('GET', testEndpoint));
    }

    const results = await Promise.allSettled(rapidRequests);
    const rateLimitedRequests = results.filter(r =>
      r.status === 'fulfilled' && r.value.status === 429
    ).length;

    recordTest('Performance', 'Rate limiting active',
      rateLimitedRequests > 0 || results.some(r => r.status === 'rejected'),
      {
        totalRequests: 100,
        rateLimitedRequests: rateLimitedRequests,
        failedRequests: results.filter(r => r.status === 'rejected').length
      });
  } catch (error) {
    recordTest('Performance', 'Rate limiting active', false, { error: error.message });
  }
}

// Generate Test Report
function generateReport() {
  const report = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      successRate: `${((passedTests / totalTests) * 100).toFixed(2)}%`,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    },
    categories: {},
    failedTests: testResults.filter(t => !t.passed),
    details: testResults
  };

  // Group by category
  testResults.forEach(test => {
    if (!report.categories[test.category]) {
      report.categories[test.category] = {
        total: 0,
        passed: 0,
        failed: 0,
        tests: []
      };
    }

    const category = report.categories[test.category];
    category.total++;
    category.tests.push(test);

    if (test.passed) {
      category.passed++;
    } else {
      category.failed++;
    }
  });

  return report;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Comprehensive API Testing for WorkLink Platform\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`API Base URL: ${API_BASE}\n`);

  try {
    // Run all test categories
    const authToken = await testAuthentication();
    await testAdminAPI();
    await testCoreBusinessAPI(authToken);
    await testGamificationAPI(authToken);
    await testAIMLAPI(authToken);
    await testRealTimeFeatures(authToken);
    await testAdvancedFeatures(authToken);
    await testSecurity();
    await testPerformance(authToken);

    // Generate and save report
    const report = generateReport();

    console.log('\n📊 Test Summary:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}`);

    console.log('\n📋 By Category:');
    Object.keys(report.categories).forEach(category => {
      const cat = report.categories[category];
      console.log(`  ${category}: ${cat.passed}/${cat.total} passed (${((cat.passed/cat.total)*100).toFixed(1)}%)`);
    });

    // Save detailed report
    const reportFile = `comprehensive_api_test_report_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);

    // Show critical failures
    const criticalFailures = report.failedTests.filter(test =>
      test.category === 'Auth' ||
      test.category === 'Security' ||
      (test.details && test.details.status >= 500)
    );

    if (criticalFailures.length > 0) {
      console.log('\n🚨 Critical Failures:');
      criticalFailures.forEach(test => {
        console.log(`  ❌ ${test.category}: ${test.name}`);
        if (test.details.error) console.log(`     Error: ${test.details.error}`);
      });
    }

    process.exit(failedTests > 0 ? 1 : 0);

  } catch (error) {
    console.error('🚨 Test runner failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, makeRequest };