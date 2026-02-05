#!/usr/bin/env node

/**
 * Google OAuth Debug Tool
 * Tests the OAuth configuration and identifies issues
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '947631688824-49pj3t02og4f2pmlhljf9h490l7nso0d.apps.googleusercontent.com';

async function testOAuthFlow() {
  console.log('🔍 Testing Google OAuth Configuration...\n');

  // Test 1: Check Google config endpoint
  try {
    console.log('1. Testing Google config endpoint...');
    const configRes = await axios.get(`${BASE_URL}/api/v1/auth/google/config`);
    console.log('✅ Config endpoint response:', configRes.data);

    if (!configRes.data.success) {
      console.log('❌ Config endpoint failed:', configRes.data.error);
      return;
    }
  } catch (error) {
    console.log('❌ Config endpoint error:', error.message);
    return;
  }

  // Test 2: Check if Google OAuth is properly configured
  console.log('\n2. Checking OAuth configuration...');
  console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);

  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    console.log('❌ Google Client ID not properly configured');
    return;
  }

  // Test 3: Test OAuth domain configuration
  console.log('\n3. Testing OAuth domain configuration...');

  try {
    // This will test if the client ID is valid
    const testRes = await axios.get(`https://accounts.google.com/.well-known/openid_configuration`);
    console.log('✅ Google OpenID configuration accessible');
  } catch (error) {
    console.log('❌ Cannot access Google OpenID configuration:', error.message);
  }

  // Test 4: Check common OAuth issues
  console.log('\n4. Common OAuth issues check...');

  const localHostIssues = [
    'Redirect URI not configured for localhost:8080',
    'JavaScript origins not configured for http://localhost:8080',
    'Client ID not associated with correct project',
    'OAuth consent screen not configured',
    'API restrictions blocking localhost'
  ];

  console.log('⚠️  Common issues to check in Google Cloud Console:');
  localHostIssues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });

  // Test 5: Test login endpoint with invalid token
  console.log('\n5. Testing login endpoint...');
  try {
    const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/google/login`, {
      credential: 'test_invalid_token',
      referralCode: ''
    });
    console.log('Login response (should fail with invalid auth):', loginRes.data);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Login endpoint correctly rejects invalid tokens');
    } else {
      console.log('❌ Login endpoint error:', error.message);
    }
  }

  // Test 6: Check environment variables
  console.log('\n6. Environment variables check...');
  const requiredEnvVars = [
    'GOOGLE_CLIENT_ID',
    'NODE_ENV',
    'PORT',
    'FRONTEND_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    console.log(`${envVar}: ${value ? '✅ Set' : '❌ Missing'} ${value ? `(${value})` : ''}`);
  });

  console.log('\n📋 OAuth Configuration Checklist:');
  console.log('1. ✅ Create Google Cloud Project');
  console.log('2. ✅ Enable Google+ API or Identity API');
  console.log('3. ✅ Create OAuth 2.0 Client ID');
  console.log('4. ⚠️  Configure Authorized JavaScript origins:');
  console.log('   - http://localhost:8080');
  console.log('   - http://127.0.0.1:8080');
  console.log('5. ⚠️  Configure Authorized redirect URIs:');
  console.log('   - http://localhost:8080');
  console.log('   - http://localhost:8080/worker');
  console.log('   - http://localhost:8080/auth/callback');
  console.log('6. ⚠️  Set OAuth consent screen');
  console.log('7. ⚠️  Add test users if in development mode');

  console.log('\n🛠️  Next steps if OAuth is failing:');
  console.log('1. Go to https://console.cloud.google.com/apis/credentials');
  console.log('2. Find your OAuth 2.0 Client ID:', GOOGLE_CLIENT_ID.split('-')[0] + '-...');
  console.log('3. Edit the client and add the authorized origins above');
  console.log('4. Check the OAuth consent screen configuration');
  console.log('5. Ensure the client is not restricted to specific APIs');
}

// Run the test
testOAuthFlow().catch(console.error);