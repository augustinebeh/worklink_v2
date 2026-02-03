#!/usr/bin/env node

const http = require('http');
const WebSocket = require('ws');

/**
 * Admin WebSocket Debug Script - Fixed Version
 * Uses Node.js built-in modules instead of fetch
 */

console.log('🔍 Admin WebSocket Debug Script (Fixed)');
console.log('=====================================');

// Step 1: Get admin token via login
function getAdminToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'admin@worklink.sg',
      password: 'admin123',
      type: 'admin'
    });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('1. 🔐 Making admin login request...');

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.success) {
            console.log('✅ Admin login successful');
            console.log('   Admin ID:', response.data.id);
            console.log('   Admin email:', response.data.email);
            console.log('   Admin role:', response.data.role);
            resolve(response.token);
          } else {
            console.log('❌ Admin login failed:', response.error);
            reject(new Error(response.error));
          }
        } catch (err) {
          console.log('❌ Failed to parse login response:', err.message);
          console.log('   Raw response:', data);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Login request failed:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Step 2: Test WebSocket connection with admin token
function testAdminWebSocket(token) {
  return new Promise((resolve, reject) => {
    console.log('\n2. 🔌 Testing admin WebSocket connection...');
    console.log('   Token preview:', token.substring(0, 20) + '...');

    const wsUrl = `ws://localhost:8080/ws?admin=true&token=${encodeURIComponent(token)}`;
    console.log('   WebSocket URL:', wsUrl);

    const ws = new WebSocket(wsUrl);

    let connected = false;
    let messageCount = 0;

    ws.on('open', () => {
      console.log('✅ Admin WebSocket connected successfully!');
      connected = true;

      // Send a test message
      const testMessage = {
        type: 'test_message',
        content: 'Hello from admin debug script',
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending test message:', testMessage.content);
      ws.send(JSON.stringify(testMessage));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        messageCount++;
        console.log(`📥 Received message ${messageCount}:`, {
          type: message.type,
          content: message.content || 'N/A',
          timestamp: message.timestamp || 'N/A'
        });
      } catch (err) {
        console.log('📥 Received non-JSON message:', data.toString());
      }
    });

    ws.on('close', (code, reason) => {
      const reasonText = reason ? reason.toString() : 'No reason provided';
      console.log(`🔌 Admin WebSocket closed: code=${code}, reason=${reasonText}`);

      if (connected) {
        resolve({ connected: true, messageCount });
      } else {
        reject(new Error(`WebSocket closed before connection: ${code} - ${reasonText}`));
      }
    });

    ws.on('error', (err) => {
      console.log('❌ Admin WebSocket error:', err.message);
      reject(err);
    });

    // Close connection after 10 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('\n⏰ Test completed, closing connection...');
        ws.close();
      }
    }, 10000);
  });
}

// Main execution
async function runDebugTest() {
  try {
    // Step 1: Get admin token
    const token = await getAdminToken();

    // Step 2: Test WebSocket connection
    const result = await testAdminWebSocket(token);

    console.log('\n🎉 Debug Test Results:');
    console.log('   ✅ Admin authentication: Working');
    console.log('   ✅ Admin WebSocket connection: Working');
    console.log('   📊 Messages received:', result.messageCount);
    console.log('\n💡 Next steps:');
    console.log('   - Check server logs for admin client count increase');
    console.log('   - Admin should now be able to receive worker messages');
    console.log('   - Test bidirectional communication in admin portal');

  } catch (error) {
    console.log('\n💥 Debug Test Failed:');
    console.log('   Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Check if server is running on port 8080');
    console.log('   - Verify admin credentials in .env file');
    console.log('   - Check server logs for authentication errors');
    console.log('   - Ensure WebSocket endpoint is properly configured');
  }
}

// Run the debug test
runDebugTest();