#!/usr/bin/env node

/**
 * Simple test script to verify admin receives new_message events
 */

const WebSocket = require('ws');

async function testSimpleFlow() {
  console.log('🧪 Testing Admin WebSocket Reception\n');

  const testCandidateId = 'CND_DEMO_001';
  let adminWs = null;
  let workerWs = null;

  try {
    // Connect admin
    console.log('1️⃣ Connecting Admin...');
    adminWs = new WebSocket('ws://localhost:3000/ws?admin=true&token=demo-admin-token');

    await new Promise((resolve, reject) => {
      adminWs.onopen = resolve;
      adminWs.onerror = reject;
    });
    console.log('   ✅ Admin connected\n');

    // Set up admin message listener
    const messagesReceived = [];
    adminWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      messagesReceived.push(data);
      console.log(`📥 [ADMIN] ${data.type}`, {
        candidateId: data.candidateId,
        messageId: data.message?.id,
        isUrgent: data.isUrgent
      });
    };

    // Connect worker
    console.log('2️⃣ Connecting Worker...');
    workerWs = new WebSocket(`ws://localhost:3000/ws?candidateId=${testCandidateId}&token=demo-token-${testCandidateId}`);

    await new Promise((resolve, reject) => {
      workerWs.onopen = resolve;
      workerWs.onerror = reject;
    });
    console.log('   ✅ Worker connected\n');

    // Wait for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('3️⃣ Sending test message...');
    workerWs.send(JSON.stringify({
      type: 'message',
      content: 'Simple test message ' + Date.now()
    }));

    // Wait and check results
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n4️⃣ Results:');
    console.log(`   Total messages received: ${messagesReceived.length}`);

    const newMessages = messagesReceived.filter(m => m.type === 'new_message');
    console.log(`   new_message events: ${newMessages.length}`);

    if (newMessages.length > 0) {
      console.log('   ✅ SUCCESS: Admin received new_message event!');
      console.log('   📋 Event details:', newMessages[0]);
    } else {
      console.log('   ❌ FAILURE: No new_message events received');
      console.log('   📋 All messages received:');
      messagesReceived.forEach((msg, i) => {
        console.log(`      ${i + 1}. ${msg.type}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (adminWs) adminWs.close();
    if (workerWs) workerWs.close();
    console.log('\n🧹 Test complete');
  }
}

testSimpleFlow().catch(console.error);