#!/usr/bin/env node

/**
 * Push Notification System Test
 * Tests VAPID configuration, subscription, and notification delivery
 */

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const config = {
  apiUrl: 'http://localhost:3000/api/v1',
  candidateId: 'CND_DEMO_001',
};

let testResults = [];

function addTestResult(name, passed, message, details = {}) {
  testResults.push({ name, passed, message, details, timestamp: Date.now() });
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}: ${message}`, color);
}

async function apiRequest(endpoint, options = {}) {
  const { default: fetch } = await import('node-fetch');
  try {
    const response = await fetch(`${config.apiUrl}${endpoint}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    const data = await response.json();
    return { ...data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testVAPIDConfiguration() {
  log('\n🔑 Testing VAPID Configuration...', 'bright');

  const response = await apiRequest('/notifications/vapid-public-key');

  addTestResult(
    'VAPID Public Key Endpoint',
    response.status === 200 || (response.success === true),
    response.success ?
      `VAPID public key available (${response.publicKey ? 'valid key' : 'no key'})` :
      response.error || 'Endpoint failed',
    { response }
  );

  if (response.success && response.publicKey) {
    addTestResult(
      'VAPID Key Format',
      typeof response.publicKey === 'string' && response.publicKey.length > 0,
      `Key length: ${response.publicKey?.length || 0} characters`
    );
  } else {
    addTestResult(
      'VAPID Configuration',
      false,
      'VAPID not configured on server - push notifications unavailable'
    );
  }

  return response.success && response.publicKey;
}

async function testPushSubscription(hasVapid) {
  log('\n📱 Testing Push Subscription System...', 'bright');

  if (!hasVapid) {
    addTestResult(
      'Push Subscription Test',
      false,
      'Skipped - VAPID not configured'
    );
    return;
  }

  // Test subscription endpoint with mock data
  const mockSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    keys: {
      p256dh: 'BLc2kfpAWYv3KKRMzVVJc1xH8iUXIe-3nJZZ8Oa8jU4FjRb_Z3Qx7Y9K8NqL-6J1FzFz8TGjF2Gx4H5R7Y9',
      auth: 'test-auth-key-for-push-notifications'
    }
  };

  const subscribeResponse = await apiRequest('/notifications/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      candidate_id: config.candidateId,
      subscription: mockSubscription
    })
  });

  addTestResult(
    'Push Subscription Registration',
    subscribeResponse.success,
    subscribeResponse.success ?
      'Mock subscription registered successfully' :
      subscribeResponse.error || 'Subscription failed',
    { response: subscribeResponse }
  );

  return subscribeResponse.success;
}

async function testEnhancedSubscription(hasVapid) {
  log('\n🔔 Testing Enhanced Push Subscription...', 'bright');

  if (!hasVapid) {
    addTestResult(
      'Enhanced Subscription Test',
      false,
      'Skipped - VAPID not configured'
    );
    return;
  }

  const enhancedSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/enhanced-test',
    keys: {
      p256dh: 'enhanced-test-key',
      auth: 'enhanced-auth-key'
    }
  };

  const enhancedResponse = await apiRequest('/notifications/subscribe-enhanced', {
    method: 'POST',
    body: JSON.stringify({
      candidateId: config.candidateId,
      subscription: enhancedSubscription
    })
  });

  addTestResult(
    'Enhanced Subscription Registration',
    enhancedResponse.success,
    enhancedResponse.success ?
      'Enhanced subscription with retention tracking registered' :
      enhancedResponse.error || 'Enhanced subscription failed',
    { response: enhancedResponse }
  );
}

async function testNotificationSending(canSend) {
  log('\n📤 Testing Notification Delivery...', 'bright');

  if (!canSend) {
    addTestResult(
      'Notification Sending Test',
      false,
      'Skipped - subscription not available'
    );
    return;
  }

  const sendResponse = await apiRequest('/notifications/send', {
    method: 'POST',
    body: JSON.stringify({
      candidate_id: config.candidateId,
      title: 'Test Notification',
      body: 'This is a test push notification from WorkLink',
      data: { type: 'test', timestamp: Date.now() }
    })
  });

  addTestResult(
    'Individual Push Notification',
    sendResponse.success,
    sendResponse.success ?
      'Test notification sent successfully' :
      sendResponse.error || 'Notification sending failed',
    { response: sendResponse }
  );
}

async function testBulkNotifications() {
  log('\n📣 Testing Bulk Notification System...', 'bright');

  const bulkResponse = await apiRequest('/notifications/send-bulk', {
    method: 'POST',
    body: JSON.stringify({
      candidate_ids: [config.candidateId],
      title: 'Bulk Test Notification',
      body: 'This is a bulk notification test',
      data: { type: 'bulk_test' }
    })
  });

  addTestResult(
    'Bulk Notification System',
    bulkResponse.success,
    bulkResponse.success ?
      `Bulk notifications processed (${bulkResponse.data?.sent || 0} sent, ${bulkResponse.data?.failed || 0} failed)` :
      bulkResponse.error || 'Bulk notification failed',
    { response: bulkResponse }
  );
}

async function testRetentionNotifications() {
  log('\n🔄 Testing Retention Notification System...', 'bright');

  // Check notification status
  const statusResponse = await apiRequest(`/notifications/status/${config.candidateId}`);

  addTestResult(
    'Retention Status Endpoint',
    statusResponse.success,
    statusResponse.success ?
      `Status retrieved (streak: ${statusResponse.data?.streak_days || 0} days)` :
      statusResponse.error || 'Status check failed',
    { status: statusResponse.data }
  );

  // Test notification action endpoint
  const actionResponse = await apiRequest('/notifications/action', {
    method: 'POST',
    body: JSON.stringify({
      candidateId: config.candidateId,
      notificationType: 'test',
      action: 'click'
    })
  });

  addTestResult(
    'Notification Action Tracking',
    actionResponse.success,
    actionResponse.success ?
      'Action tracking working' :
      actionResponse.error || 'Action tracking failed',
    { response: actionResponse }
  );
}

async function testUnsubscribe() {
  log('\n🚫 Testing Push Unsubscription...', 'bright');

  const unsubscribeResponse = await apiRequest('/notifications/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({
      candidate_id: config.candidateId
    })
  });

  addTestResult(
    'Push Unsubscription',
    unsubscribeResponse.success,
    unsubscribeResponse.success ?
      'Unsubscribed successfully' :
      unsubscribeResponse.error || 'Unsubscription failed',
    { response: unsubscribeResponse }
  );
}

async function generateReport() {
  log('\n📊 Push Notification System Test Report', 'bright');
  log('='.repeat(60), 'cyan');

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  log(`\n📈 Overall Results:`, 'bright');
  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${total - passed}`, 'red');
  log(`   📊 Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');

  const failedTests = testResults.filter(r => !r.passed);
  if (failedTests.length > 0) {
    log(`\n❌ Failed Tests:`, 'red');
    failedTests.forEach(test => {
      log(`   • ${test.name}: ${test.message}`, 'red');
    });
  }

  log(`\n📱 Push Notification Assessment:`, 'bright');

  if (passRate >= 90) {
    log('🎉 EXCELLENT! Push notification system fully functional.', 'green');
  } else if (passRate >= 75) {
    log('👍 GOOD! Most push notification features working.', 'yellow');
  } else if (passRate >= 50) {
    log('⚠️  FAIR! Some push notification issues detected.', 'yellow');
  } else {
    log('🚨 CRITICAL! Push notification system needs attention.', 'red');
  }

  return { passRate, passed, total, failedTests };
}

async function main() {
  console.clear();

  log('📱 WorkLink Push Notification System Test Suite', 'bright');
  log('='.repeat(60), 'cyan');
  log('Testing VAPID, subscriptions, delivery, and retention features\n', 'blue');

  try {
    const hasVapid = await testVAPIDConfiguration();
    const canSubscribe = await testPushSubscription(hasVapid);
    await testEnhancedSubscription(hasVapid);
    await testNotificationSending(canSubscribe);
    await testBulkNotifications();
    await testRetentionNotifications();
    await testUnsubscribe();

    const report = await generateReport();

    process.exit(report.failedTests.length > 0 ? 1 : 0);

  } catch (error) {
    log(`\n🚨 Critical Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };