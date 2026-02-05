#!/usr/bin/env node

/**
 * Simple Server Test - Just check if server starts without full testing
 */

const { spawn } = require('child_process');
const http = require('http');

async function testServerStart() {
  console.log('🚀 Starting server in test mode...');

  const server = spawn('node', ['server.js'], {
    env: { ...process.env, NODE_ENV: 'development', PORT: '8080' },
    stdio: 'pipe'
  });

  let hasError = false;

  server.stdout.on('data', (data) => {
    console.log('📝 STDOUT:', data.toString().trim());
  });

  server.stderr.on('data', (data) => {
    const error = data.toString().trim();
    console.log('⚠️ STDERR:', error);

    // Check if this is a critical error
    if (error.includes('TypeError') || error.includes('Cannot find module') || error.includes('Error:')) {
      hasError = true;
    }
  });

  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error.message);
    hasError = true;
  });

  // Give server 10 seconds to start
  await new Promise(resolve => setTimeout(resolve, 10000));

  if (!hasError) {
    console.log('✅ Server appears to be running, testing connection...');

    // Test basic connection
    try {
      const response = await makeRequest('GET', 'http://localhost:8080/');
      console.log(`✅ Server responding with status: ${response.status}`);
    } catch (error) {
      console.log(`⚠️ Connection test failed: ${error.message}`);
    }
  } else {
    console.log('❌ Server had errors during startup');
  }

  server.kill('SIGTERM');
}

function makeRequest(method, url) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      resolve({ status: res.statusCode });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

testServerStart().catch(console.error);