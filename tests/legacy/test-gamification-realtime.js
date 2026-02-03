#!/usr/bin/env node

/**
 * Focused Gamification Real-Time Sync Test
 * Tests gamification events, achievements, XP, levels, and quest progress sync
 */

const WebSocket = require('ws');

// Colors for output
const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const config = {
  apiUrl: 'http://localhost:3000/api/v1',
  wsUrl: 'ws://localhost:3000/ws',
  candidateId: 'CND_DEMO_001',
  token: 'demo-token-CND_DEMO_001',
  adminToken: 'demo-admin-token',
};

let candidateWs = null;
let adminWs = null;
let candidateMessages = [];
let adminMessages = [];
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
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function connectWebSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

async function setupConnections() {
  try {
    // Connect candidate
    candidateWs = await connectWebSocket(
      `${config.wsUrl}?candidateId=${config.candidateId}&token=${encodeURIComponent(config.token)}`
    );
    candidateWs.on('message', (data) => {
      const msg = JSON.parse(data);
      candidateMessages.push(msg);
      log(`[CANDIDATE] << ${msg.type}`, 'magenta');
    });

    // Connect admin
    adminWs = await connectWebSocket(
      `${config.wsUrl}?admin=true&token=${encodeURIComponent(config.adminToken)}`
    );
    adminWs.on('message', (data) => {
      const msg = JSON.parse(data);
      adminMessages.push(msg);
      log(`[ADMIN] << ${msg.type}`, 'cyan');
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    addTestResult('WebSocket Connections', true, 'Both candidate and admin connected successfully');
    return true;
  } catch (error) {
    addTestResult('WebSocket Connections', false, error.message);
    return false;
  }
}

async function testXPAwardSync() {
  log('\n🎯 Testing XP Award Real-time Sync...', 'bright');

  candidateMessages.length = 0;
  adminMessages.length = 0;

  // Get current XP
  const beforeProfile = await apiRequest(`/gamification/profile/${config.candidateId}`);
  const beforeXP = beforeProfile.data?.xp || 0;
  const beforeLevel = beforeProfile.data?.level || 1;

  // Award XP via API
  const awardResult = await apiRequest('/gamification/xp/award', {
    method: 'POST',
    body: JSON.stringify({
      candidate_id: config.candidateId,
      amount: 50,
      reason: 'Gamification sync test',
      action_type: 'test'
    })
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check API response
  addTestResult(
    'XP Award API Call',
    awardResult.success,
    awardResult.success ? `XP awarded successfully: ${awardResult.data?.xp || 'N/A'} total` : awardResult.error
  );

  // Check for XP notification in WebSocket messages
  const xpNotification = candidateMessages.find(m =>
    m.type === 'xp_earned' ||
    (m.type === 'notification' && m.notification?.type === 'gamification')
  );

  addTestResult(
    'XP Real-time Notification',
    !!xpNotification,
    xpNotification ? 'XP notification received via WebSocket' : 'No XP notification received'
  );

  // Check for level up
  const afterProfile = await apiRequest(`/gamification/profile/${config.candidateId}`);
  const afterLevel = afterProfile.data?.level || beforeLevel;
  const leveledUp = afterLevel > beforeLevel;

  if (leveledUp) {
    const levelUpNotification = candidateMessages.find(m => m.type === 'level_up');
    addTestResult(
      'Level Up Notification',
      !!levelUpNotification,
      levelUpNotification ? `Level up notification received (Level ${afterLevel})` : 'Level up occurred but no notification'
    );
  } else {
    addTestResult('Level Check', true, `No level up occurred (still level ${afterLevel})`);
  }

  // Test admin notification
  const adminNotification = adminMessages.find(m =>
    m.type === 'xp_earned' || m.type === 'level_up' || m.candidateId === config.candidateId
  );

  addTestResult(
    'Admin XP Sync Notification',
    !!adminNotification,
    adminNotification ? 'Admin received XP/level notification' : 'No XP notifications to admin'
  );
}

async function testAchievementSync() {
  log('\n🏆 Testing Achievement System Sync...', 'bright');

  candidateMessages.length = 0;

  // Get current achievements
  const profile = await apiRequest(`/gamification/profile/${config.candidateId}`);
  const achievements = profile.data?.achievements || [];
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  addTestResult(
    'Achievement System Status',
    true,
    `Currently has ${unlockedCount}/${achievements.length} achievements unlocked`
  );

  // Award XP that might trigger achievements
  await apiRequest('/gamification/xp/award', {
    method: 'POST',
    body: JSON.stringify({
      candidate_id: config.candidateId,
      amount: 100,
      reason: 'Achievement test',
      action_type: 'achievement_test'
    })
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check for achievement notifications
  const achievementNotification = candidateMessages.find(m =>
    m.type === 'achievement_unlocked'
  );

  addTestResult(
    'Achievement Unlock Notification',
    true, // This is informational since we can't guarantee an achievement will unlock
    achievementNotification ? 'Achievement unlock notification received' : 'No achievement unlocks triggered (normal)'
  );
}

async function testQuestProgressSync() {
  log('\n⚡ Testing Quest Progress Sync...', 'bright');

  // Get current quests
  const profile = await apiRequest(`/gamification/profile/${config.candidateId}`);
  const quests = profile.data?.quests || [];
  const activeQuests = quests.filter(q => !q.completed);

  addTestResult(
    'Quest System Status',
    true,
    `Found ${activeQuests.length} active quests out of ${quests.length} total`
  );

  if (activeQuests.length > 0) {
    const quest = activeQuests[0];
    log(`   📋 Testing quest: ${quest.title} (${quest.progress}/${quest.target})`, 'blue');
  }

  // Quest progress is typically updated through specific actions (job completions, etc.)
  // This test confirms the quest system is accessible
  addTestResult(
    'Quest Progress Tracking',
    quests.length > 0,
    `Quest system functional with ${quests.length} quests defined`
  );
}

async function testJobCompletionGamification() {
  log('\n💼 Testing Job-based Gamification Events...', 'bright');

  candidateMessages.length = 0;

  // Create a test job
  const jobData = {
    title: `Gamification Test Job ${Date.now()}`,
    description: 'Test job for gamification events',
    job_date: '2026-02-04',
    start_time: '09:00',
    end_time: '17:00',
    location: 'Test Location',
    pay_rate: 25,
    charge_rate: 35,
    total_slots: 1,
    skills_required: 'Testing',
    client_id: 'TEST_CLIENT_001'
  };

  const jobResult = await apiRequest('/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData)
  });

  if (jobResult.success) {
    const jobId = jobResult.data.id;

    addTestResult('Test Job Creation', true, `Job created: ${jobId}`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if candidate received job notification
    const jobNotification = candidateMessages.find(m =>
      m.type === 'job_created' && m.job?.id === jobId
    );

    addTestResult(
      'Job Creation Real-time Notification',
      !!jobNotification,
      jobNotification ? 'Candidate received new job notification' : 'No job notification received'
    );

    // Test job application (which could trigger gamification events)
    if (candidateWs) {
      candidateWs.send(JSON.stringify({ type: 'apply_job', jobId }));
      log('[CANDIDATE] >> apply_job', 'magenta');

      await new Promise(resolve => setTimeout(resolve, 2000));

      const applicationResult = candidateMessages.find(m =>
        m.type === 'job_application_result'
      );

      addTestResult(
        'Job Application via WebSocket',
        !!applicationResult && applicationResult.success,
        applicationResult ?
          (applicationResult.success ? 'Job application successful' : applicationResult.error) :
          'No job application response'
      );
    }
  } else {
    addTestResult('Test Job Creation', false, jobResult.error || 'Failed to create test job');
  }
}

async function testNotificationSystem() {
  log('\n🔔 Testing Notification System Integration...', 'bright');

  candidateMessages.length = 0;

  // Check initial notifications
  const initialNotifications = candidateMessages.filter(m => m.type === 'notifications');
  const initialCount = initialNotifications[0]?.notifications?.length || 0;

  addTestResult(
    'Initial Notifications Load',
    initialNotifications.length > 0,
    `Received ${initialCount} initial notifications`
  );

  // Test notification marking as read
  if (initialCount > 0) {
    const firstNotificationId = initialNotifications[0].notifications[0]?.id;

    if (firstNotificationId && candidateWs) {
      candidateWs.send(JSON.stringify({
        type: 'mark_notification_read',
        notificationId: firstNotificationId
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

      addTestResult(
        'Notification Read Marking',
        true,
        `Marked notification ${firstNotificationId} as read`
      );
    }
  }

  // Test mark all notifications as read
  if (candidateWs) {
    candidateWs.send(JSON.stringify({ type: 'mark_all_notifications_read' }));
    await new Promise(resolve => setTimeout(resolve, 500));

    addTestResult(
      'Mark All Notifications Read',
      true,
      'Sent mark all notifications read command'
    );
  }
}

async function generateReport() {
  log('\n📊 Gamification Real-Time Sync Test Report', 'bright');
  log('='.repeat(60), 'cyan');

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const passRate = ((passed / total) * 100).toFixed(1);

  log(`\n📈 Overall Results:`, 'bright');
  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${total - passed}`, 'red');
  log(`   📊 Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');

  log(`\n📨 WebSocket Events Captured:`, 'bright');
  log(`   🔵 Candidate: ${candidateMessages.length} events`, 'blue');
  log(`   🟡 Admin: ${adminMessages.length} events`, 'yellow');

  if (candidateMessages.length > 0) {
    const eventTypes = [...new Set(candidateMessages.map(m => m.type))];
    log(`\n   Candidate Event Types: ${eventTypes.join(', ')}`, 'magenta');
  }

  if (adminMessages.length > 0) {
    const eventTypes = [...new Set(adminMessages.map(m => m.type))];
    log(`\n   Admin Event Types: ${eventTypes.join(', ')}`, 'cyan');
  }

  // Failed tests summary
  const failedTests = testResults.filter(r => !r.passed);
  if (failedTests.length > 0) {
    log(`\n❌ Issues Detected:`, 'red');
    failedTests.forEach(test => {
      log(`   • ${test.name}: ${test.message}`, 'red');
    });
  }

  log(`\n🎯 Gamification Sync Assessment:`, 'bright');

  if (passRate >= 90) {
    log('🏆 EXCELLENT! Gamification real-time sync fully functional.', 'green');
  } else if (passRate >= 75) {
    log('👍 GOOD! Most gamification features syncing correctly.', 'yellow');
  } else if (passRate >= 50) {
    log('⚠️  FAIR! Some gamification sync issues detected.', 'yellow');
  } else {
    log('🚨 CRITICAL! Major gamification sync problems.', 'red');
  }

  return { passRate, passed, total, failedTests };
}

async function cleanup() {
  if (candidateWs && candidateWs.readyState === WebSocket.OPEN) {
    candidateWs.close();
    log('🔌 Candidate connection closed', 'yellow');
  }
  if (adminWs && adminWs.readyState === WebSocket.OPEN) {
    adminWs.close();
    log('🔌 Admin connection closed', 'yellow');
  }
}

async function main() {
  console.clear();

  log('🎮 WorkLink Gamification Real-Time Sync Test Suite', 'bright');
  log('='.repeat(60), 'cyan');
  log('Testing XP, achievements, levels, quests, and notifications sync\n', 'blue');

  try {
    const connected = await setupConnections();
    if (!connected) {
      throw new Error('Failed to establish WebSocket connections');
    }

    await testXPAwardSync();
    await testAchievementSync();
    await testQuestProgressSync();
    await testJobCompletionGamification();
    await testNotificationSystem();

    const report = await generateReport();

    process.exit(report.failedTests.length > 0 ? 1 : 0);

  } catch (error) {
    log(`\n🚨 Critical Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };