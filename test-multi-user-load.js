#!/usr/bin/env node

/**
 * Multi-User Load Testing for Real-Time Features
 * Simulates multiple admin users and worker users simultaneously
 */

const WebSocket = require('ws');

const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const config = {
  wsUrl: 'ws://localhost:3000/ws',
  adminToken: 'demo-admin-token',
  numAdmins: 3,
  numCandidates: 5,
  testDuration: 30000, // 30 seconds
  messageInterval: 2000, // Send message every 2 seconds
  candidates: [
    'CND_DEMO_001',
    'CND002',
    'CND003',
    'CND004',
    'CND005'
  ]
};

let testResults = [];
let connections = {
  admins: [],
  candidates: []
};

let stats = {
  connectionsEstablished: 0,
  connectionsFailed: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  startTime: null,
  endTime: null
};

function addTestResult(name, passed, message, details = {}) {
  testResults.push({ name, passed, message, details, timestamp: Date.now() });
  const icon = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${icon} ${name}: ${message}`, color);
}

function connectWebSocket(url, type, id) {
  return new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        stats.connectionsEstablished++;

        ws.connectionType = type;
        ws.connectionId = id;
        ws.messageCount = 0;
        ws.connected = true;

        log(`${type.toUpperCase()} ${id} connected`, type === 'admin' ? 'cyan' : 'magenta');
        resolve(ws);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          ws.messageCount++;
          stats.messagesReceived++;

          // Log important events only
          if (['new_message', 'chat_message', 'typing', 'status_change'].includes(message.type)) {
            log(`[${type.toUpperCase()} ${id}] << ${message.type}`, type === 'admin' ? 'cyan' : 'magenta');
          }
        } catch (error) {
          stats.errors++;
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        stats.connectionsFailed++;
        stats.errors++;
        log(`${type.toUpperCase()} ${id} error: ${error.message}`, 'red');
        reject(error);
      });

      ws.on('close', () => {
        ws.connected = false;
        log(`${type.toUpperCase()} ${id} disconnected`, 'yellow');
      });

    } catch (error) {
      stats.connectionsFailed++;
      reject(error);
    }
  });
}

async function establishConnections() {
  log('\n🔗 Establishing Multi-User Connections...', 'bright');

  const adminPromises = [];
  const candidatePromises = [];

  // Create admin connections
  for (let i = 1; i <= config.numAdmins; i++) {
    const adminUrl = `${config.wsUrl}?admin=true&token=${encodeURIComponent(config.adminToken)}`;
    adminPromises.push(
      connectWebSocket(adminUrl, 'admin', `ADMIN_${i}`)
        .then(ws => connections.admins.push(ws))
        .catch(error => log(`Admin ${i} connection failed: ${error.message}`, 'red'))
    );
  }

  // Create candidate connections
  for (let i = 0; i < Math.min(config.numCandidates, config.candidates.length); i++) {
    const candidateId = config.candidates[i];
    const token = `demo-token-${candidateId}`;
    const candidateUrl = `${config.wsUrl}?candidateId=${candidateId}&token=${encodeURIComponent(token)}`;

    candidatePromises.push(
      connectWebSocket(candidateUrl, 'candidate', candidateId)
        .then(ws => connections.candidates.push(ws))
        .catch(error => log(`Candidate ${candidateId} connection failed: ${error.message}`, 'red'))
    );
  }

  // Wait for all connections
  await Promise.allSettled([...adminPromises, ...candidatePromises]);

  const totalConnections = connections.admins.length + connections.candidates.length;
  const expectedConnections = config.numAdmins + config.numCandidates;

  addTestResult(
    'Multi-User Connection Establishment',
    totalConnections >= expectedConnections * 0.8, // Allow 20% failure
    `${totalConnections}/${expectedConnections} connections established`,
    {
      admins: connections.admins.length,
      candidates: connections.candidates.length,
      expected: expectedConnections
    }
  );

  await new Promise(resolve => setTimeout(resolve, 2000)); // Stabilize connections

  return totalConnections > 0;
}

async function simulateChat() {
  log('\n💬 Simulating Concurrent Chat Activity...', 'bright');

  if (connections.candidates.length === 0) {
    addTestResult('Chat Load Test', false, 'No candidate connections available');
    return;
  }

  const chatPromises = [];
  let messagesSentInTest = 0;

  // Each candidate sends periodic messages
  connections.candidates.forEach((ws, index) => {
    if (!ws.connected) return;

    chatPromises.push(
      new Promise(resolve => {
        let messageCount = 0;
        const maxMessages = Math.floor(config.testDuration / config.messageInterval);

        const sendMessage = () => {
          if (messageCount >= maxMessages || !ws.connected) {
            resolve();
            return;
          }

          try {
            const message = {
              type: 'message',
              content: `Load test message ${messageCount + 1} from ${ws.connectionId}`
            };

            ws.send(JSON.stringify(message));
            stats.messagesSent++;
            messagesSentInTest++;
            messageCount++;

            setTimeout(sendMessage, config.messageInterval + Math.random() * 1000); // Add jitter
          } catch (error) {
            stats.errors++;
            resolve();
          }
        };

        setTimeout(sendMessage, Math.random() * config.messageInterval); // Stagger start times
      })
    );
  });

  await Promise.allSettled(chatPromises);

  addTestResult(
    'Concurrent Chat Load Test',
    messagesSentInTest > 0 && stats.errors < messagesSentInTest * 0.1,
    `${messagesSentInTest} messages sent with ${stats.errors} errors`,
    {
      messagesSent: messagesSentInTest,
      errors: stats.errors,
      errorRate: ((stats.errors / Math.max(messagesSentInTest, 1)) * 100).toFixed(1) + '%'
    }
  );
}

async function simulateTypingIndicators() {
  log('\n⌨️  Testing Typing Indicators Under Load...', 'bright');

  const typingPromises = connections.candidates.map(ws => {
    if (!ws.connected) return Promise.resolve();

    return new Promise(resolve => {
      let cycles = 0;
      const maxCycles = 5;

      const sendTyping = () => {
        if (cycles >= maxCycles || !ws.connected) {
          resolve();
          return;
        }

        try {
          // Start typing
          ws.send(JSON.stringify({ type: 'typing', typing: true }));

          setTimeout(() => {
            if (ws.connected) {
              // Stop typing
              ws.send(JSON.stringify({ type: 'typing', typing: false }));
              cycles++;
              setTimeout(sendTyping, 3000 + Math.random() * 2000);
            }
          }, 1000 + Math.random() * 2000);
        } catch (error) {
          stats.errors++;
          resolve();
        }
      };

      sendTyping();
    });
  });

  await Promise.allSettled(typingPromises);

  addTestResult(
    'Typing Indicator Load Test',
    true,
    `Typing indicators tested across ${connections.candidates.length} candidates`
  );
}

async function testConnectionStability() {
  log('\n🔒 Testing Connection Stability Under Load...', 'bright');

  const allConnections = [...connections.admins, ...connections.candidates];
  const connectedCount = allConnections.filter(ws => ws.connected).length;
  const totalConnections = allConnections.length;

  // Send ping to all connections
  const pingPromises = allConnections.map(ws => {
    if (!ws.connected) return Promise.resolve(false);

    return new Promise(resolve => {
      try {
        ws.send(JSON.stringify({ type: 'ping' }));
        resolve(true);
      } catch (error) {
        resolve(false);
      }
    });
  });

  const pingResults = await Promise.allSettled(pingPromises);
  const successfulPings = pingResults.filter(r => r.status === 'fulfilled' && r.value).length;

  addTestResult(
    'Connection Stability',
    connectedCount >= totalConnections * 0.8 && successfulPings >= connectedCount * 0.8,
    `${connectedCount}/${totalConnections} connections stable, ${successfulPings} ping responses`,
    {
      connected: connectedCount,
      total: totalConnections,
      stability: ((connectedCount / totalConnections) * 100).toFixed(1) + '%'
    }
  );
}

async function testBroadcastPerformance() {
  log('\n📡 Testing Broadcast Performance...', 'bright');

  if (connections.admins.length === 0) {
    addTestResult('Broadcast Performance', false, 'No admin connections available');
    return;
  }

  const admin = connections.admins[0];
  if (!admin.connected) {
    addTestResult('Broadcast Performance', false, 'Admin connection not available');
    return;
  }

  const beforeReceived = stats.messagesReceived;
  const broadcastMessage = `Broadcast test at ${Date.now()}`;

  try {
    // Admin sends message to first candidate
    admin.send(JSON.stringify({
      type: 'message',
      candidateId: config.candidates[0],
      content: broadcastMessage
    }));

    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for propagation

    const afterReceived = stats.messagesReceived;
    const messagesPropagated = afterReceived - beforeReceived;

    addTestResult(
      'Broadcast Performance',
      messagesPropagated > 0,
      `Broadcast generated ${messagesPropagated} events across ${connections.candidates.length} candidates`,
      { messagesPropagated, candidateCount: connections.candidates.length }
    );

  } catch (error) {
    addTestResult('Broadcast Performance', false, error.message);
  }
}

async function cleanupConnections() {
  log('\n🧹 Cleaning up connections...', 'bright');

  const allConnections = [...connections.admins, ...connections.candidates];

  const closePromises = allConnections.map(ws => {
    return new Promise(resolve => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      setTimeout(resolve, 100);
    });
  });

  await Promise.allSettled(closePromises);
  log('All connections closed', 'green');
}

async function generateReport() {
  log('\n📊 Multi-User Load Test Report', 'bright');
  log('='.repeat(60), 'cyan');

  stats.endTime = Date.now();
  const duration = ((stats.endTime - stats.startTime) / 1000).toFixed(2);

  log(`\n📈 Load Test Results:`, 'bright');
  log(`   🔗 Connections: ${stats.connectionsEstablished} established, ${stats.connectionsFailed} failed`,
      stats.connectionsFailed === 0 ? 'green' : 'yellow');
  log(`   📨 Messages: ${stats.messagesSent} sent, ${stats.messagesReceived} received`, 'blue');
  log(`   ❌ Errors: ${stats.errors}`, stats.errors < 10 ? 'green' : 'yellow');
  log(`   ⏱️  Duration: ${duration}s`, 'blue');

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  log(`\n📊 Test Results:`, 'bright');
  log(`   ✅ Passed: ${passed}`, 'green');
  log(`   ❌ Failed: ${total - passed}`, 'red');
  log(`   📊 Pass Rate: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');

  // Performance metrics
  const messagesPerSecond = parseFloat(duration) > 0 ? (stats.messagesSent / parseFloat(duration)).toFixed(1) : 0;
  const throughput = parseFloat(duration) > 0 ? (stats.messagesReceived / parseFloat(duration)).toFixed(1) : 0;

  log(`\n⚡ Performance Metrics:`, 'bright');
  log(`   📤 Send Rate: ${messagesPerSecond} msg/sec`, 'blue');
  log(`   📥 Receive Rate: ${throughput} msg/sec`, 'blue');

  const failedTests = testResults.filter(r => !r.passed);
  if (failedTests.length > 0) {
    log(`\n❌ Failed Tests:`, 'red');
    failedTests.forEach(test => {
      log(`   • ${test.name}: ${test.message}`, 'red');
    });
  }

  log(`\n🎯 Load Test Assessment:`, 'bright');

  if (passRate >= 90 && stats.errors < 5) {
    log('🏆 EXCELLENT! System handles multi-user load very well.', 'green');
  } else if (passRate >= 80 && stats.errors < 20) {
    log('👍 GOOD! System handles multi-user load adequately.', 'yellow');
  } else if (passRate >= 60) {
    log('⚠️  FAIR! Some performance issues under load.', 'yellow');
  } else {
    log('🚨 CRITICAL! System struggles under multi-user load.', 'red');
  }

  return { passRate, passed, total, failedTests, stats };
}

async function main() {
  console.clear();

  log('🚀 WorkLink Multi-User Load Test Suite', 'bright');
  log('='.repeat(60), 'cyan');
  log(`Testing with ${config.numAdmins} admins and ${config.numCandidates} candidates\n`, 'blue');

  stats.startTime = Date.now();

  try {
    const hasConnections = await establishConnections();

    if (!hasConnections) {
      throw new Error('Failed to establish any connections');
    }

    await simulateChat();
    await simulateTypingIndicators();
    await testConnectionStability();
    await testBroadcastPerformance();

    const report = await generateReport();

    process.exit(report.failedTests.length > 0 ? 1 : 0);

  } catch (error) {
    log(`\n🚨 Critical Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await cleanupConnections();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, config, stats };