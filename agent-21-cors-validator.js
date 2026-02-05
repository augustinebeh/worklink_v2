#!/usr/bin/env node
/**
 * AGENT 21: CORS and Headers Validator
 * Checks CORS configuration and response headers
 */

const http = require('http');

console.log('🔍 AGENT 21: CORS and Headers Validator');
console.log('='.repeat(80) + '\n');

async function testCORS() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/candidates',
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization'
      }
    }, (res) => {
      console.log('1️⃣ CORS PREFLIGHT TEST:\n');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
      console.log(`   Allow-Methods: ${res.headers['access-control-allow-methods'] || 'NOT SET'}`);
      console.log(`   Allow-Headers: ${res.headers['access-control-allow-headers'] || 'NOT SET'}`);
      console.log('');
      
      resolve(res.statusCode === 200 || res.statusCode === 204);
    });
    
    req.on('error', () => {
      console.log('   ❌ Cannot connect to server\n');
      resolve(false);
    });
    
    req.end();
  });
}

async function testAuthHeader() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/candidates',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }, (res) => {
      console.log('2️⃣ AUTHORIZATION HEADER TEST:\n');
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Expected: 401 (Unauthorized)`);
      
      if (res.statusCode === 401) {
        console.log(`   ✅ Auth required correctly\n`);
      } else {
        console.log(`   ⚠️  Unexpected status\n`);
      }
      
      resolve(true);
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ Error: ${e.message}\n`);
      resolve(false);
    });
    
    req.end();
  });
}

async function run() {
  await testCORS();
  await testAuthHeader();
  
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');
  console.log('✅ = Working');
  console.log('⚠️  = Needs attention\n');
}

run().catch(console.error);
