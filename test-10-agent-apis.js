#!/usr/bin/env node

/**
 * 🧪 10-AGENT SYSTEM API TESTS
 * Comprehensive test suite for renewal tracking, alerts, and lifecycle APIs
 */

const http = require('http');

const BASE_URL = 'http://localhost:8080/api/v1';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let testsPassed = 0;
let testsFailed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    log(`✅ ${name}`, 'green');
    testsPassed++;
  } catch (error) {
    log(`❌ ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    testsFailed++;
  }
}

async function runTests() {
  log('\n🚀 Starting 10-Agent System API Tests\n', 'blue');
  
  // Test 1: API Info
  await test('GET / - API info endpoint', async () => {
    const res = await makeRequest('GET', '/');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.endpoints.gebizRenewals) throw new Error('Missing gebizRenewals endpoint');
    if (!res.data.endpoints.alerts) throw new Error('Missing alerts endpoint');
    if (!res.data.endpoints.bpoLifecycle) throw new Error('Missing bpoLifecycle endpoint');
  });
  
  log('\n📋 RENEWAL TRACKING API TESTS\n', 'yellow');
  
  // Test 2: List renewals
  await test('GET /gebiz/renewals - List renewals', async () => {
    const res = await makeRequest('GET', '/gebiz/renewals');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!Array.isArray(res.data.data)) throw new Error('Data should be array');
  });
  
  // Test 3: Create renewal
  let renewalId;
  await test('POST /gebiz/renewals - Create renewal', async () => {
    const payload = {
      agency: 'Ministry of Health',
      contract_description: 'Test Hospital Cleaning Services',
      contract_value: 1500000,
      incumbent_supplier: 'Test CleanCo',
      contract_end_date: '2026-08-15',
      renewal_probability: 85,
      confidence_score: 80
    };
    
    const res = await makeRequest('POST', '/gebiz/renewals', payload);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!res.data.data.id) throw new Error('Missing renewal ID');
    
    renewalId = res.data.data.id;
  });
  
  // Test 4: Get single renewal
  await test('GET /gebiz/renewals/:id - Get renewal details', async () => {
    if (!renewalId) throw new Error('No renewal ID from previous test');
    
    const res = await makeRequest('GET', `/gebiz/renewals/${renewalId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (res.data.data.agency !== 'Ministry of Health') throw new Error('Wrong agency');
  });
  
  // Test 5: Update renewal
  await test('PATCH /gebiz/renewals/:id - Update renewal', async () => {
    if (!renewalId) throw new Error('No renewal ID from previous test');
    
    const res = await makeRequest('PATCH', `/gebiz/renewals/${renewalId}`, {
      engagement_status: 'initial_contact',
      notes: 'Made initial contact with procurement team'
    });
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (res.data.data.engagement_status !== 'initial_contact') throw new Error('Status not updated');
  });
  
  // Test 6: Log activity
  await test('POST /gebiz/renewals/:id/activities - Log engagement activity', async () => {
    if (!renewalId) throw new Error('No renewal ID from previous test');
    
    const res = await makeRequest('POST', `/gebiz/renewals/${renewalId}/activities`, {
      activity_type: 'meeting',
      activity_date: '2026-02-05',
      activity_description: 'Initial stakeholder meeting',
      conducted_by: 'Test BD Manager',
      outcome: 'Positive response, interested in new proposal'
    });
    
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
  });
  
  // Test 7: Timeline view
  await test('GET /gebiz/renewals/dashboard/timeline - Get timeline', async () => {
    const res = await makeRequest('GET', '/gebiz/renewals/dashboard/timeline?months=12');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!res.data.data.timeline) throw new Error('Missing timeline data');
  });
  
  // Test 8: Stats
  await test('GET /gebiz/renewals/dashboard/stats - Get statistics', async () => {
    const res = await makeRequest('GET', '/gebiz/renewals/dashboard/stats');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (typeof res.data.data.summary.total_renewals !== 'number') throw new Error('Missing stats');
  });
  
  // Test 9: Run prediction
  await test('POST /gebiz/renewals/predict - Run prediction algorithm', async () => {
    const res = await makeRequest('POST', '/gebiz/renewals/predict', {});
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
  });
  
  log('\n🔔 ALERT SYSTEM API TESTS\n', 'yellow');
  
  // Test 10: List alert rules
  await test('GET /alerts/rules - List alert rules', async () => {
    const res = await makeRequest('GET', '/alerts/rules');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!Array.isArray(res.data.data)) throw new Error('Data should be array');
  });
  
  // Test 11: Create alert rule
  let ruleId;
  await test('POST /alerts/rules - Create alert rule', async () => {
    const payload = {
      rule_name: 'Test High-Value Tender Alert',
      rule_type: 'value_threshold',
      conditions: { min_value: 500000 },
      priority: 'high',
      notification_channels: ['email', 'in_app'],
      recipients: { roles: ['bid_manager'] },
      active: true,
      created_by: 'test_script'
    };
    
    const res = await makeRequest('POST', '/alerts/rules', payload);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!res.data.data.id) throw new Error('Missing rule ID');
    
    ruleId = res.data.data.id;
  });
  
  // Test 12: Update alert rule
  await test('PATCH /alerts/rules/:id - Update alert rule', async () => {
    if (!ruleId) throw new Error('No rule ID from previous test');
    
    const res = await makeRequest('PATCH', `/alerts/rules/${ruleId}`, {
      priority: 'critical',
      notification_channels: ['email', 'sms', 'in_app']
    });
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (res.data.data.priority !== 'critical') throw new Error('Priority not updated');
  });
  
  // Test 13: Alert history
  await test('GET /alerts/history - Get alert history', async () => {
    const res = await makeRequest('GET', '/alerts/history?limit=10');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!Array.isArray(res.data.data)) throw new Error('Data should be array');
  });
  
  // Test 14: Unread count
  await test('GET /alerts/unread-count - Get unread count', async () => {
    const res = await makeRequest('GET', '/alerts/unread-count');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (typeof res.data.data.unread_count !== 'number') throw new Error('Missing unread count');
  });
  
  // Test 15: User preferences
  await test('GET /alerts/preferences - Get user preferences', async () => {
    const res = await makeRequest('GET', '/alerts/preferences?user_id=test_user');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
  });
  
  log('\n📋 BPO LIFECYCLE API TESTS\n', 'yellow');
  
  // Test 16: List tenders
  await test('GET /bpo/lifecycle - List tenders', async () => {
    const res = await makeRequest('GET', '/bpo/lifecycle');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!Array.isArray(res.data.data)) throw new Error('Data should be array');
  });
  
  // Test 17: Create tender
  let tenderId;
  await test('POST /bpo/lifecycle - Create tender', async () => {
    const payload = {
      title: 'Test Security Services Tender',
      agency: 'MOM',
      description: 'Security services for office buildings',
      estimated_value: 800000,
      closing_date: '2026-03-15',
      stage: 'new_opportunity',
      priority: 'medium'
    };
    
    const res = await makeRequest('POST', '/bpo/lifecycle', payload);
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!res.data.data.id) throw new Error('Missing tender ID');
    
    tenderId = res.data.data.id;
  });
  
  // Test 18: Get single tender
  await test('GET /bpo/lifecycle/:id - Get tender details', async () => {
    if (!tenderId) throw new Error('No tender ID from previous test');
    
    const res = await makeRequest('GET', `/bpo/lifecycle/${tenderId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (res.data.data.agency !== 'MOM') throw new Error('Wrong agency');
  });
  
  // Test 19: Move tender stage
  await test('POST /bpo/lifecycle/:id/move - Move tender to review', async () => {
    if (!tenderId) throw new Error('No tender ID from previous test');
    
    const res = await makeRequest('POST', `/bpo/lifecycle/${tenderId}/move`, {
      new_stage: 'review',
      user_id: 'test_user'
    });
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (res.data.data.stage !== 'review') throw new Error('Stage not updated');
  });
  
  // Test 20: Record decision
  await test('POST /bpo/lifecycle/:id/decision - Record Go/No-Go decision', async () => {
    if (!tenderId) throw new Error('No tender ID from previous test');
    
    const res = await makeRequest('POST', `/bpo/lifecycle/${tenderId}/decision`, {
      decision: 'go',
      decision_reasoning: 'Good fit for our capabilities',
      qualification_score: 75,
      user_id: 'test_user'
    });
    
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (res.data.data.decision !== 'go') throw new Error('Decision not recorded');
  });
  
  // Test 21: Pipeline stats
  await test('GET /bpo/lifecycle/dashboard/stats - Get pipeline stats', async () => {
    const res = await makeRequest('GET', '/bpo/lifecycle/dashboard/stats');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (typeof res.data.data.total_tenders !== 'number') throw new Error('Missing stats');
  });
  
  // Test 22: Deadlines
  await test('GET /bpo/lifecycle/dashboard/deadlines - Get closing deadlines', async () => {
    const res = await makeRequest('GET', '/bpo/lifecycle/dashboard/deadlines?days=30');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.data.success) throw new Error('Response not successful');
    if (!Array.isArray(res.data.data)) throw new Error('Data should be array');
  });
  
  // Cleanup
  log('\n🧹 CLEANUP\n', 'yellow');
  
  await test('DELETE /gebiz/renewals/:id - Delete test renewal', async () => {
    if (!renewalId) throw new Error('No renewal ID to delete');
    
    const res = await makeRequest('DELETE', `/gebiz/renewals/${renewalId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  
  await test('DELETE /alerts/rules/:id - Delete test alert rule', async () => {
    if (!ruleId) throw new Error('No rule ID to delete');
    
    const res = await makeRequest('DELETE', `/alerts/rules/${ruleId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  
  await test('DELETE /bpo/lifecycle/:id - Delete test tender', async () => {
    if (!tenderId) throw new Error('No tender ID to delete');
    
    const res = await makeRequest('DELETE', `/bpo/lifecycle/${tenderId}`);
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });
  
  // Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log('📊 TEST RESULTS', 'blue');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'blue');
  
  const total = testsPassed + testsFailed;
  const passRate = Math.round((testsPassed / total) * 100);
  
  log(`Total Tests: ${total}`, 'blue');
  log(`Passed: ${testsPassed}`, 'green');
  log(`Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`Pass Rate: ${passRate}%\n`, passRate === 100 ? 'green' : 'yellow');
  
  if (testsFailed === 0) {
    log('✨ ALL TESTS PASSED! System ready for production.\n', 'green');
    process.exit(0);
  } else {
    log('⚠️  Some tests failed. Review errors above.\n', 'yellow');
    process.exit(1);
  }
}

// Check if server is running
makeRequest('GET', '/').then(() => {
  runTests();
}).catch(() => {
  log('\n❌ Server is not running on http://localhost:8080', 'red');
  log('Please start the server first: npm start\n', 'yellow');
  process.exit(1);
});
