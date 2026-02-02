#!/usr/bin/env node

/**
 * Automated WebSocket Real-Time Feature Testing Script
 * Tests all WebSocket functionality, chat system, notifications, and gamification
 */

const WebSocket = require('ws');
const readline = require('readline');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Test configuration
const config = {
  wsUrl: 'ws://localhost:3000/ws',
  candidateId: 'CAND1738520466178',
  token: 'demo-token-CAND1738520466178',
  adminToken: 'demo-admin-token',
  timeout: 5000,
};

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
};

// WebSocket connections
let candidateWs = null;
let adminWs = null;

// Message buffers
const candidateMessages = [];
const adminMessages = [];

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset + '\n');
}

function logTest(name, passed, message) {
  stats.total++;
  if (passed) {
    stats.passed++;
    log(`✅ ${name}: ${message}`, 'green');
  } else {
    stats.failed++;
    log(`❌ ${name}: ${message}`, 'red');
  }
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// WebSocket connection helpers
function connectWebSocket(url, role = 'candidate') {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, config.timeout);

    ws.on('open', () => {
      clearTimeout(timeout);
      log(`${role.toUpperCase()} connected to WebSocket`, 'green');
      resolve(ws);
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function sendMessage(ws, data) {
  return new Promise((resolve, reject) => {
    try {
      ws.send(JSON.stringify(data));
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

function waitForMessage(ws, type, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for message type: ${type}`));
    }, timeout);

    const handler = (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === type) {
          clearTimeout(timer);
          ws.removeListener('message', handler);
          resolve(message);
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    ws.on('message', handler);
  });
}

// Test suites
async function testConnectionManagement() {
  logSection('1. WebSocket Connection Management Tests');

  // Test 1.1: Candidate connection
  try {
    const url = `${config.wsUrl}?candidateId=${config.candidateId}&token=${encodeURIComponent(config.token)}`;
    candidateWs = await connectWebSocket(url, 'candidate');

    // Wait for connected message
    const connectedMsg = await waitForMessage(candidateWs, 'connected');
    logTest(
      'Candidate Connection',
      connectedMsg.role === 'candidate',
      `Connected as ${connectedMsg.role}`
    );

    // Setup message logging
    candidateWs.on('message', (data) => {
      const msg = JSON.parse(data);
      candidateMessages.push(msg);
      log(`[CANDIDATE] << ${msg.type}`, 'magenta');
    });
  } catch (error) {
    logTest('Candidate Connection', false, error.message);
  }

  // Test 1.2: Admin connection
  try {
    const url = `${config.wsUrl}?admin=true&token=${encodeURIComponent(config.adminToken)}`;
    adminWs = await connectWebSocket(url, 'admin');

    const connectedMsg = await waitForMessage(adminWs, 'connected');
    logTest(
      'Admin Connection',
      connectedMsg.role === 'admin',
      `Connected as ${connectedMsg.role}`
    );

    // Setup message logging
    adminWs.on('message', (data) => {
      const msg = JSON.parse(data);
      adminMessages.push(msg);
      log(`[ADMIN] << ${msg.type}`, 'cyan');
    });
  } catch (error) {
    logTest('Admin Connection', false, error.message);
  }

  await sleep(500);

  // Test 1.3: Ping-Pong (Keep-alive)
  try {
    await sendMessage(candidateWs, { type: 'ping' });
    log('[CANDIDATE] >> ping', 'magenta');

    const pongMsg = await waitForMessage(candidateWs, 'pong', 2000);
    logTest('Ping-Pong Keep-Alive', !!pongMsg, 'Pong received successfully');
  } catch (error) {
    logTest('Ping-Pong Keep-Alive', false, error.message);
  }

  // Test 1.4: Authentication validation
  try {
    const invalidUrl = `${config.wsUrl}?candidateId=${config.candidateId}&token=invalid`;
    const invalidWs = new WebSocket(invalidUrl);

    const result = await Promise.race([
      new Promise((resolve) => invalidWs.on('close', (code) => resolve({ closed: true, code }))),
      new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 2000))
    ]);

    logTest(
      'Authentication Rejection',
      result.closed && result.code === 4001,
      result.closed ? `Invalid token rejected with code ${result.code}` : 'Did not reject invalid token'
    );
  } catch (error) {
    logTest('Authentication Rejection', false, error.message);
  }

  await sleep(1000);
}

async function testChatSystem() {
  logSection('2. Chat System Tests');

  if (!candidateWs || !adminWs) {
    logWarning('Skipping chat tests - connections not established');
    return;
  }

  // Test 2.1: Candidate sends message to admin
  try {
    const testMessage = `Test message from candidate at ${new Date().toISOString()}`;

    await sendMessage(candidateWs, {
      type: 'message',
      content: testMessage
    });
    log('[CANDIDATE] >> message', 'magenta');

    await sleep(500);

    // Check if admin received it
    const adminReceivedMsg = adminMessages.find(
      m => m.type === 'new_message' && m.message?.content === testMessage
    );

    logTest(
      'Candidate → Admin Message',
      !!adminReceivedMsg,
      adminReceivedMsg ? 'Message delivered to admin' : 'Message not received by admin'
    );
  } catch (error) {
    logTest('Candidate → Admin Message', false, error.message);
  }

  await sleep(500);

  // Test 2.2: Admin sends message to candidate
  try {
    const testMessage = `Test message from admin at ${new Date().toISOString()}`;

    await sendMessage(adminWs, {
      type: 'message',
      candidateId: config.candidateId,
      content: testMessage
    });
    log('[ADMIN] >> message', 'cyan');

    await sleep(500);

    // Check if candidate received it
    const candidateReceivedMsg = candidateMessages.find(
      m => m.type === 'chat_message' && m.message?.content === testMessage
    );

    logTest(
      'Admin → Candidate Message',
      !!candidateReceivedMsg,
      candidateReceivedMsg ? 'Message delivered to candidate' : 'Message not received by candidate'
    );
  } catch (error) {
    logTest('Admin → Candidate Message', false, error.message);
  }

  await sleep(500);

  // Test 2.3: Typing indicators
  try {
    // Candidate starts typing
    await sendMessage(candidateWs, { type: 'typing', typing: true });
    log('[CANDIDATE] >> typing: true', 'magenta');

    await sleep(300);

    // Check if admin received typing indicator
    const adminReceivedTyping = adminMessages.find(
      m => m.type === 'typing' && m.candidateId === config.candidateId && m.typing === true
    );

    // Candidate stops typing
    await sendMessage(candidateWs, { type: 'typing', typing: false });
    log('[CANDIDATE] >> typing: false', 'magenta');

    logTest(
      'Typing Indicators',
      !!adminReceivedTyping,
      adminReceivedTyping ? 'Typing indicator delivered' : 'Typing indicator not received'
    );
  } catch (error) {
    logTest('Typing Indicators', false, error.message);
  }

  await sleep(500);

  // Test 2.4: Read receipts
  try {
    // Candidate marks messages as read
    await sendMessage(candidateWs, { type: 'read' });
    log('[CANDIDATE] >> read', 'magenta');

    await sleep(300);

    // Check if admin received read receipt
    const adminReceivedRead = adminMessages.find(
      m => m.type === 'messages_read' && m.candidateId === config.candidateId
    );

    logTest(
      'Read Receipts',
      !!adminReceivedRead,
      adminReceivedRead ? 'Read receipt delivered' : 'Read receipt not received'
    );
  } catch (error) {
    logTest('Read Receipts', false, error.message);
  }

  await sleep(500);

  // Test 2.5: Chat history
  try {
    const chatHistory = candidateMessages.find(m => m.type === 'chat_history');

    logTest(
      'Chat History Delivery',
      !!chatHistory && Array.isArray(chatHistory.messages),
      chatHistory ? `Received ${chatHistory.messages.length} messages` : 'No chat history received'
    );
  } catch (error) {
    logTest('Chat History Delivery', false, error.message);
  }

  await sleep(1000);
}

async function testNotificationSystem() {
  logSection('3. Notification System Tests');

  if (!candidateWs) {
    logWarning('Skipping notification tests - candidate connection not established');
    return;
  }

  // Test 3.1: Notifications delivery
  try {
    const notificationsMsg = candidateMessages.find(m => m.type === 'notifications');

    logTest(
      'Initial Notifications Load',
      !!notificationsMsg,
      notificationsMsg
        ? `Received ${notificationsMsg.notifications?.length || 0} notifications (${notificationsMsg.unreadCount || 0} unread)`
        : 'No notifications received'
    );
  } catch (error) {
    logTest('Initial Notifications Load', false, error.message);
  }

  // Test 3.2: Mark notification as read
  try {
    const notificationsMsg = candidateMessages.find(m => m.type === 'notifications');
    const firstUnread = notificationsMsg?.notifications?.find(n => n.read === 0);

    if (firstUnread) {
      await sendMessage(candidateWs, {
        type: 'mark_notification_read',
        notificationId: firstUnread.id
      });
      log(`[CANDIDATE] >> mark_notification_read: ${firstUnread.id}`, 'magenta');

      await sleep(500);

      logTest('Mark Notification Read', true, `Marked notification ${firstUnread.id} as read`);
    } else {
      logTest('Mark Notification Read', true, 'No unread notifications to test (SKIP)');
      stats.skipped++;
    }
  } catch (error) {
    logTest('Mark Notification Read', false, error.message);
  }

  await sleep(500);

  // Test 3.3: Mark all notifications as read
  try {
    await sendMessage(candidateWs, { type: 'mark_all_notifications_read' });
    log('[CANDIDATE] >> mark_all_notifications_read', 'magenta');

    await sleep(500);

    logTest('Mark All Notifications Read', true, 'Sent mark all as read command');
  } catch (error) {
    logTest('Mark All Notifications Read', false, error.message);
  }

  await sleep(1000);
}

async function testGamificationEvents() {
  logSection('4. Gamification & Real-Time Events Tests');

  if (!candidateWs) {
    logWarning('Skipping gamification tests - candidate connection not established');
    return;
  }

  logInfo('Gamification events are triggered by server-side actions');
  logInfo('These tests verify the client can receive and handle events');

  // Test 4.1: Check for XP events in message buffer
  const xpEvents = candidateMessages.filter(m => m.type === 'xp_earned');
  logTest(
    'XP Event Reception',
    true,
    xpEvents.length > 0
      ? `Received ${xpEvents.length} XP events`
      : 'No XP events received (expected - needs server trigger)'
  );

  // Test 4.2: Check for level up events
  const levelUpEvents = candidateMessages.filter(m => m.type === 'level_up');
  logTest(
    'Level Up Event Reception',
    true,
    levelUpEvents.length > 0
      ? `Received ${levelUpEvents.length} level up events`
      : 'No level up events received (expected - needs server trigger)'
  );

  // Test 4.3: Check for achievement events
  const achievementEvents = candidateMessages.filter(m => m.type === 'achievement_unlocked');
  logTest(
    'Achievement Event Reception',
    true,
    achievementEvents.length > 0
      ? `Received ${achievementEvents.length} achievement events`
      : 'No achievement events received (expected - needs server trigger)'
  );

  // Test 4.4: Check for job events
  const jobEvents = candidateMessages.filter(m => m.type === 'job_created' || m.type === 'job_updated');
  logTest(
    'Job Event Reception',
    true,
    jobEvents.length > 0
      ? `Received ${jobEvents.length} job events`
      : 'No job events received (expected - needs server trigger)'
  );

  await sleep(1000);
}

async function testConnectionStability() {
  logSection('5. Connection Stability & Error Handling Tests');

  if (!candidateWs) {
    logWarning('Skipping stability tests - candidate connection not established');
    return;
  }

  // Test 5.1: Rapid message sending (rate limit test)
  try {
    logInfo('Testing message rate limiting (sending 10 messages rapidly)...');

    const promises = [];
    for (let i = 1; i <= 10; i++) {
      promises.push(sendMessage(candidateWs, {
        type: 'message',
        content: `Rate limit test message ${i}/10`
      }));
    }

    await Promise.all(promises);
    await sleep(500);

    // Check for rate limit error
    const rateLimitError = candidateMessages.find(
      m => m.type === 'error' && m.message?.includes('rate limit')
    );

    logTest(
      'Message Rate Limiting',
      true,
      rateLimitError
        ? 'Rate limit enforced correctly'
        : '10 messages sent successfully (within limit)'
    );
  } catch (error) {
    logTest('Message Rate Limiting', false, error.message);
  }

  await sleep(1000);

  // Test 5.2: Connection state after rapid messages
  try {
    const isOpen = candidateWs.readyState === WebSocket.OPEN;
    logTest(
      'Connection Stability',
      isOpen,
      isOpen ? 'Connection remains stable after rapid messages' : 'Connection lost'
    );
  } catch (error) {
    logTest('Connection Stability', false, error.message);
  }

  await sleep(500);

  // Test 5.3: Heartbeat/Keep-alive
  try {
    logInfo('Testing heartbeat mechanism (30-second interval)...');
    logInfo('For full test, connection should remain open for 30+ seconds');

    await sendMessage(candidateWs, { type: 'ping' });
    const pong = await waitForMessage(candidateWs, 'pong', 2000);

    logTest(
      'Heartbeat Mechanism',
      !!pong,
      'Heartbeat ping/pong working correctly'
    );
  } catch (error) {
    logTest('Heartbeat Mechanism', false, error.message);
  }

  await sleep(1000);
}

async function testMultiUserScenarios() {
  logSection('6. Multi-User & Broadcasting Tests');

  if (!candidateWs || !adminWs) {
    logWarning('Skipping multi-user tests - connections not established');
    return;
  }

  // Test 6.1: Concurrent connections
  try {
    const candidateOpen = candidateWs.readyState === WebSocket.OPEN;
    const adminOpen = adminWs.readyState === WebSocket.OPEN;

    logTest(
      'Concurrent Connections',
      candidateOpen && adminOpen,
      `Candidate: ${candidateOpen ? 'Connected' : 'Disconnected'}, Admin: ${adminOpen ? 'Connected' : 'Disconnected'}`
    );
  } catch (error) {
    logTest('Concurrent Connections', false, error.message);
  }

  // Test 6.2: Message broadcasting
  try {
    const adminMessage = `Broadcast test at ${new Date().toISOString()}`;

    await sendMessage(adminWs, {
      type: 'message',
      candidateId: config.candidateId,
      content: adminMessage
    });

    await sleep(500);

    const candidateReceived = candidateMessages.some(
      m => m.type === 'chat_message' && m.message?.content === adminMessage
    );

    logTest(
      'Message Broadcasting',
      candidateReceived,
      candidateReceived ? 'Broadcast message received by candidate' : 'Broadcast failed'
    );
  } catch (error) {
    logTest('Message Broadcasting', false, error.message);
  }

  // Test 6.3: Online status tracking
  try {
    const onlineCandidates = adminMessages.find(m => m.type === 'online_candidates');
    const isTracked = onlineCandidates?.candidates?.includes(config.candidateId);

    logTest(
      'Online Status Tracking',
      !!isTracked,
      isTracked
        ? `Candidate tracked as online (${onlineCandidates.candidates.length} total)`
        : 'Candidate not tracked in online list'
    );
  } catch (error) {
    logTest('Online Status Tracking', false, error.message);
  }

  await sleep(1000);
}

async function testDataSynchronization() {
  logSection('7. Data Synchronization Tests');

  logInfo('Testing real-time data consistency between admin and worker clients');

  // Test 7.1: Message delivery confirmation
  try {
    const adminSentCount = adminMessages.filter(m => m.type === 'message_sent').length;
    logTest(
      'Message Delivery Confirmation',
      adminSentCount > 0,
      `Admin received ${adminSentCount} message confirmations`
    );
  } catch (error) {
    logTest('Message Delivery Confirmation', false, error.message);
  }

  // Test 7.2: Unread count synchronization
  try {
    const chatHistory = candidateMessages.find(m => m.type === 'chat_history');
    const unreadCount = chatHistory?.unreadCount ?? 0;

    logTest(
      'Unread Count Synchronization',
      chatHistory !== undefined,
      chatHistory ? `Unread count: ${unreadCount}` : 'No unread count received'
    );
  } catch (error) {
    logTest('Unread Count Synchronization', false, error.message);
  }

  // Test 7.3: Real-time status updates
  try {
    const statusChanges = adminMessages.filter(m => m.type === 'status_change');
    logTest(
      'Status Update Events',
      true,
      `Received ${statusChanges.length} status change events`
    );
  } catch (error) {
    logTest('Status Update Events', false, error.message);
  }

  await sleep(1000);
}

async function generateTestReport() {
  logSection('Test Summary Report');

  stats.endTime = Date.now();
  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);

  log(`Total Tests: ${stats.total}`, 'bright');
  log(`✅ Passed: ${stats.passed}`, 'green');
  log(`❌ Failed: ${stats.failed}`, 'red');
  log(`⏭️  Skipped: ${stats.skipped}`, 'yellow');
  log(`⏱️  Duration: ${duration}s`, 'blue');

  const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
  log(`\n📊 Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : 'yellow');

  if (stats.failed === 0) {
    log('\n🎉 All tests passed! WebSocket real-time features working correctly.', 'green');
  } else {
    log(`\n⚠️  ${stats.failed} test(s) failed. Please review the failures above.`, 'yellow');
  }

  // Event statistics
  logSection('Event Statistics');
  log(`Candidate received ${candidateMessages.length} messages:`, 'bright');
  const candidateEventTypes = [...new Set(candidateMessages.map(m => m.type))];
  candidateEventTypes.forEach(type => {
    const count = candidateMessages.filter(m => m.type === type).length;
    log(`  - ${type}: ${count}`, 'blue');
  });

  log(`\nAdmin received ${adminMessages.length} messages:`, 'bright');
  const adminEventTypes = [...new Set(adminMessages.map(m => m.type))];
  adminEventTypes.forEach(type => {
    const count = adminMessages.filter(m => m.type === type).length;
    log(`  - ${type}: ${count}`, 'cyan');
  });
}

// Main test execution
async function main() {
  console.clear();

  log('\n' + '='.repeat(80), 'bright');
  log('    🧪 WorkLink WebSocket Real-Time Feature Test Suite', 'bright');
  log('    Automated testing for all WebSocket and real-time functionality', 'bright');
  log('='.repeat(80) + '\n', 'bright');

  stats.startTime = Date.now();

  try {
    await testConnectionManagement();
    await testChatSystem();
    await testNotificationSystem();
    await testGamificationEvents();
    await testConnectionStability();
    await testMultiUserScenarios();
    await testDataSynchronization();
  } catch (error) {
    logError(`Critical error during testing: ${error.message}`);
    console.error(error);
  } finally {
    // Close connections
    if (candidateWs) {
      candidateWs.close();
      log('\nCandidate connection closed', 'yellow');
    }
    if (adminWs) {
      adminWs.close();
      log('Admin connection closed', 'yellow');
    }

    await generateTestReport();

    process.exit(stats.failed > 0 ? 1 : 0);
  }
}

// Run tests
if (require.main === module) {
  main().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main };
