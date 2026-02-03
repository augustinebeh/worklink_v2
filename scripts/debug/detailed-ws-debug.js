#!/usr/bin/env node

const http = require('http');
const WebSocket = require('ws');

/**
 * Detailed WebSocket Debug Script
 * Provides more extensive logging to diagnose connection issues
 */

console.log('🔍 Detailed WebSocket Debug Script');
console.log('==================================');

async function testWebSocketConnection() {
  try {
    console.log('\n1. 🔐 Getting admin token...');

    // Get admin token
    const token = await new Promise((resolve, reject) => {
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

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.success) {
              console.log('✅ Admin login successful');
              console.log('   Token length:', response.token.length);
              console.log('   Token start:', response.token.substring(0, 50) + '...');
              resolve(response.token);
            } else {
              reject(new Error(response.error));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    console.log('\n2. 🔌 Creating WebSocket connection...');

    const wsUrl = `ws://localhost:8080/ws?admin=true&token=${encodeURIComponent(token)}`;
    console.log('   URL:', wsUrl);
    console.log('   URL length:', wsUrl.length);

    // Parse URL to show components
    const url = new URL(wsUrl);
    console.log('   Host:', url.host);
    console.log('   Path:', url.pathname);
    console.log('   Admin param:', url.searchParams.get('admin'));
    console.log('   Token param length:', url.searchParams.get('token')?.length);

    const ws = new WebSocket(wsUrl);

    let connectionStartTime = Date.now();
    let connected = false;

    ws.on('open', () => {
      const connectionTime = Date.now() - connectionStartTime;
      console.log(`✅ WebSocket opened after ${connectionTime}ms`);
      connected = true;

      // Send ping message
      console.log('📤 Sending ping message...');
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString(),
        message: 'Admin debug ping'
      }));
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 Received message:', {
          type: message.type,
          size: data.length,
          content: message.content ? message.content.substring(0, 100) : 'N/A'
        });
      } catch (err) {
        console.log('📥 Received non-JSON message:', data.toString().substring(0, 200));
      }
    });

    ws.on('close', (code, reason) => {
      const connectionTime = Date.now() - connectionStartTime;
      const reasonStr = reason ? reason.toString() : 'No reason';
      console.log(`🔌 WebSocket closed after ${connectionTime}ms:`);
      console.log('   Code:', code);
      console.log('   Reason:', reasonStr);
      console.log('   Was connected:', connected);

      // Decode error codes
      const errorCodes = {
        1000: 'Normal closure',
        1001: 'Going away',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1004: 'Reserved',
        1005: 'No status code',
        1006: 'Abnormal closure',
        1007: 'Invalid frame payload data',
        1008: 'Policy violation',
        1009: 'Message too big',
        1010: 'Mandatory extension',
        1011: 'Internal server error',
        1015: 'TLS handshake',
        4001: 'Custom: Invalid admin token',
        4008: 'Custom: Rate limit exceeded'
      };

      console.log('   Error meaning:', errorCodes[code] || 'Unknown error code');
    });

    ws.on('error', (error) => {
      console.log('❌ WebSocket error:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      });
    });

    // Keep connection open for 8 seconds
    await new Promise(resolve => setTimeout(resolve, 8000));

    if (ws.readyState === WebSocket.OPEN) {
      console.log('\n⏰ Closing connection after test period...');
      ws.close();
    }

    // Wait for close
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n📊 Test Summary:');
    console.log('   Connection established:', connected);
    console.log('   Final WebSocket state:', ws.readyState);
    console.log('   States: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED');

  } catch (error) {
    console.log('\n💥 Test failed:', error.message);
    console.log('   Stack:', error.stack);
  }
}

// Run test
testWebSocketConnection().then(() => {
  console.log('\n✅ Debug test completed');
}).catch(err => {
  console.log('\n❌ Debug test failed:', err.message);
});