#!/usr/bin/env node

/**
 * Test script to verify WebSocket message flow from worker to admin
 */

const WebSocket = require('ws');

async function testWebSocketFlow() {
  console.log('🧪 Starting WebSocket Flow Test\n');

  // Test candidate ID (using existing candidate)
  const testCandidateId = 'CND_DEMO_001';

  let adminWs = null;
  let workerWs = null;

  try {
    console.log('1️⃣ Connecting Admin WebSocket...');
    adminWs = new WebSocket('ws://localhost:3000/ws?admin=true&token=demo-admin-token');

    await new Promise((resolve, reject) => {
      adminWs.onopen = () => {
        console.log('   ✅ Admin connected');
        resolve();
      };
      adminWs.onerror = reject;
      adminWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(`   📥 [ADMIN] Received: ${data.type}`, data);
      };
    });

    console.log('\n2️⃣ Connecting Worker WebSocket...');
    workerWs = new WebSocket(`ws://localhost:3000/ws?candidateId=${testCandidateId}&token=demo-token-${testCandidateId}`);

    await new Promise((resolve, reject) => {
      workerWs.onopen = () => {
        console.log('   ✅ Worker connected');
        resolve();
      };
      workerWs.onerror = reject;
      workerWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(`   📥 [WORKER] Received: ${data.type}`, data);
      };
    });

    // Wait a moment for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n3️⃣ Sending test message from worker to admin...');
    const testMessage = {
      type: 'message',
      content: '🧪 Test message from worker to admin - ' + new Date().toISOString()
    };

    workerWs.send(JSON.stringify(testMessage));
    console.log('   📤 Worker sent message:', testMessage.content);

    // Wait to see if admin receives the message
    console.log('\n4️⃣ Waiting for admin to receive message...');

    let adminReceivedMessage = false;
    const messageTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: Admin did not receive message within 5 seconds')), 5000)
    );

    const messageReceived = new Promise((resolve) => {
      const originalOnMessage = adminWs.onmessage;
      adminWs.onmessage = (event) => {
        originalOnMessage(event);
        const data = JSON.parse(event.data);
        if (data.type === 'new_message' && data.candidateId === testCandidateId) {
          console.log('   ✅ SUCCESS: Admin received new_message event!');
          console.log('   📋 Message details:', {
            candidateId: data.candidateId,
            messageId: data.message?.id,
            content: data.message?.content,
            isUrgent: data.isUrgent
          });
          adminReceivedMessage = true;
          resolve();
        }
      };
    });

    try {
      await Promise.race([messageReceived, messageTimeout]);
      console.log('\n🎉 TEST PASSED: Message flow working correctly!');
    } catch (error) {
      console.log('\n❌ TEST FAILED:', error.message);
      console.log('\n🔍 Debug info:');
      console.log('   - Worker connected:', workerWs.readyState === WebSocket.OPEN);
      console.log('   - Admin connected:', adminWs.readyState === WebSocket.OPEN);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Cleanup
    if (adminWs) adminWs.close();
    if (workerWs) workerWs.close();
    console.log('\n🧹 Test complete');
  }
}

if (require.main === module) {
  testWebSocketFlow().catch(console.error);
}