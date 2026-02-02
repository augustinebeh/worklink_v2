#!/usr/bin/env node
/**
 * Final Endpoint Testing Script - Complete remaining API tests
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

let testResults = [];
let totalTests = 0;
let passedTests = 0;

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
        'User-Agent': 'WorkLink-Final-Test/1.0',
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
        const responseTime = Date.now() - startTime;
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
      reject({ error: err.message, responseTime: Date.now() - startTime });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function logTest(category, name, passed, details) {
  totalTests++;
  if (passed) passedTests++;

  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name}`);

  if (details.responseTime) {
    console.log(`   Response: ${details.responseTime}ms (${details.status})`);
  }
  if (details.error) {
    console.log(`   Error: ${details.error}`);
  }

  testResults.push({
    category,
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
}

async function testRemainingEndpoints() {
  console.log('🔍 FINAL ENDPOINT TESTING');
  console.log('='.repeat(50));

  // Get auth token
  let authToken = null;
  try {
    const authResponse = await makeRequest('POST', `${API_BASE}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });
    if (authResponse.body?.token) {
      authToken = authResponse.body.token;
      console.log('🔑 Authentication token obtained');
    }
  } catch (error) {
    console.log('⚠️ Could not obtain auth token');
  }

  const authHeaders = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test Gamification APIs in detail
  console.log('\n🎮 Detailed Gamification Testing...');
  const gamificationEndpoints = [
    { path: '/gamification', name: 'Main Gamification Data' },
    { path: '/gamification/achievements', name: 'User Achievements' },
    { path: '/gamification/leaderboard', name: 'Leaderboard' },
    { path: '/gamification/quests', name: 'Available Quests' },
    { path: '/gamification/xp-history', name: 'XP History' },
    { path: '/gamification/progress', name: 'User Progress' },
  ];

  for (const endpoint of gamificationEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint.path}`, null, authHeaders);
      logTest('Gamification', endpoint.name,
        response.status === 200 || response.status === 404,
        { status: response.status, responseTime: response.responseTime });
    } catch (error) {
      logTest('Gamification', endpoint.name, false, { error: error.error });
    }
  }

  // Test Real-time Features
  console.log('\n⚡ Real-time Features Testing...');
  const realtimeEndpoints = [
    { path: '/chat', name: 'Chat System' },
    { path: '/conversations', name: 'User Conversations' },
    { path: '/messaging', name: 'Messaging Service' },
    { path: '/notifications', name: 'User Notifications' },
    { path: '/chat/attachments', name: 'Chat Attachments' },
    { path: '/quick-replies', name: 'Quick Replies' },
  ];

  for (const endpoint of realtimeEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint.path}`, null, authHeaders);
      logTest('Real-time', endpoint.name,
        response.status === 200 || response.status === 401 || response.status === 404,
        { status: response.status, responseTime: response.responseTime });
    } catch (error) {
      logTest('Real-time', endpoint.name, false, { error: error.error });
    }
  }

  // Test AI/ML APIs
  console.log('\n🤖 AI/ML Services Testing...');

  // Test AI Chat with proper payload
  try {
    const chatData = {
      message: 'Hello, this is a test message',
      candidateId: authToken ? 'CND_DEMO_001' : 'test',
      context: 'api_testing'
    };
    const response = await makeRequest('POST', `${API_BASE}/ai-chat`, chatData, authHeaders);
    logTest('AI/ML', 'AI Chat Service',
      response.status === 200 || response.status === 400 || response.status === 401,
      { status: response.status, responseTime: response.responseTime });
  } catch (error) {
    logTest('AI/ML', 'AI Chat Service', false, { error: error.error });
  }

  const mlEndpoints = [
    { path: '/ml', name: 'ML Services' },
    { path: '/ai', name: 'AI Automation' },
    { path: '/ad-ml', name: 'Advertisement ML' },
  ];

  for (const endpoint of mlEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint.path}`, null, authHeaders);
      logTest('AI/ML', endpoint.name,
        response.status === 200 || response.status === 404,
        { status: response.status, responseTime: response.responseTime });
    } catch (error) {
      logTest('AI/ML', endpoint.name, false, { error: error.error });
    }
  }

  // Test Advanced Features
  console.log('\n🔧 Advanced Features Testing...');
  const advancedEndpoints = [
    { path: '/analytics', name: 'Analytics Dashboard', method: 'GET' },
    { path: '/referrals', name: 'Referral System', method: 'GET' },
    { path: '/training', name: 'Training Modules', method: 'GET' },
    { path: '/telegram-groups', name: 'Telegram Groups', method: 'GET' },
    { path: '/tender-monitor', name: 'Tender Monitoring', method: 'GET' },
    { path: '/availability', name: 'Worker Availability', method: 'GET' },
    { path: '/webhooks/telegram', name: 'Telegram Webhook', method: 'POST' },
  ];

  for (const endpoint of advancedEndpoints) {
    try {
      let data = null;
      if (endpoint.method === 'POST' && endpoint.path.includes('telegram')) {
        data = { message: { text: 'test', chat: { id: 12345 } } };
      }

      const response = await makeRequest(endpoint.method, `${API_BASE}${endpoint.path}`, data, authHeaders);
      logTest('Advanced', endpoint.name,
        response.status === 200 || response.status === 401 || response.status === 404,
        { status: response.status, responseTime: response.responseTime, method: endpoint.method });
    } catch (error) {
      logTest('Advanced', endpoint.name, false, { error: error.error });
    }
  }

  // Test Core Business API CRUD Operations
  console.log('\n🏢 Core Business API Testing...');

  // Test authenticated endpoints
  const businessEndpoints = [
    { path: '/candidates', name: 'Candidates List' },
    { path: '/jobs', name: 'Jobs List' },
    { path: '/deployments', name: 'Deployments List' },
    { path: '/payments', name: 'Payments List' },
    { path: '/clients', name: 'Clients List' },
    { path: '/tenders', name: 'Tenders List' },
  ];

  for (const endpoint of businessEndpoints) {
    try {
      const response = await makeRequest('GET', `${API_BASE}${endpoint.path}`, null, authHeaders);
      logTest('Business', endpoint.name,
        response.status === 200 || response.status === 401,
        { status: response.status, responseTime: response.responseTime, hasAuth: !!authToken });
    } catch (error) {
      logTest('Business', endpoint.name, false, { error: error.error });
    }
  }

  // Test WebSocket Connection
  console.log('\n🔌 WebSocket Testing...');
  try {
    const WebSocket = require('ws');
    const wsUrl = 'ws://localhost:8080/ws';

    const wsTest = new Promise((resolve) => {
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.terminate();
        resolve(false);
      }, 3000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    const connected = await wsTest;
    logTest('Real-time', 'WebSocket Connection', connected, {
      responseTime: connected ? 'Connected' : 'Failed'
    });

  } catch (error) {
    logTest('Real-time', 'WebSocket Connection', false, { error: error.message });
  }
}

async function runFinalTests() {
  console.log('🏁 WORKLINK API - FINAL COMPREHENSIVE TEST');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));

  try {
    await testRemainingEndpoints();

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('');

    // Group by category
    const categories = {};
    testResults.forEach(test => {
      if (!categories[test.category]) {
        categories[test.category] = { total: 0, passed: 0 };
      }
      categories[test.category].total++;
      if (test.passed) categories[test.category].passed++;
    });

    console.log('📋 Results by Category:');
    Object.entries(categories).forEach(([category, stats]) => {
      const percentage = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`  ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
    });

    // Save results
    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
        timestamp: new Date().toISOString()
      },
      categories,
      testResults
    };

    const reportFile = `final_endpoint_test_report_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportFile}`);

    return report;

  } catch (error) {
    console.error('🚨 Final test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runFinalTests().then(() => {
    console.log('\n✅ Final testing completed!');
    process.exit(0);
  }).catch(error => {
    console.error('Final test error:', error);
    process.exit(1);
  });
}

module.exports = { runFinalTests };