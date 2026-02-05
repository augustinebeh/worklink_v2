#!/usr/bin/env node
/**
 * Google OAuth Comprehensive Diagnosis Tool
 * Run this to identify OAuth configuration issues
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:8080';

async function diagnosisReport() {
  console.log('🔍 GOOGLE OAUTH DIAGNOSIS REPORT');
  console.log('================================\n');

  // 1. Environment Variables Check
  console.log('1. ENVIRONMENT VARIABLES:');
  console.log('--------------------------');

  const envVars = {
    'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
    'FRONTEND_URL': process.env.FRONTEND_URL,
    'NODE_ENV': process.env.NODE_ENV,
    'PORT': process.env.PORT
  };

  for (const [key, value] of Object.entries(envVars)) {
    const status = value ? '✅' : '❌';
    console.log(`${status} ${key}: ${value || 'MISSING'}`);
  }

  // Critical analysis
  if (!envVars.GOOGLE_CLIENT_ID) {
    console.log('\n❌ CRITICAL: GOOGLE_CLIENT_ID is missing!');
    return;
  }

  if (envVars.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    console.log('\n❌ CRITICAL: GOOGLE_CLIENT_ID is not configured (default value)');
    return;
  }

  console.log('\n✅ Google Client ID configured');

  // Note about GOOGLE_CLIENT_SECRET
  console.log('\nℹ️  GOOGLE_CLIENT_SECRET not required for frontend OAuth flow');

  // 2. API Endpoints Test
  console.log('\n2. API ENDPOINTS TEST:');
  console.log('-----------------------');

  try {
    // Test Google config endpoint
    const configRes = await axios.get(`${BASE_URL}/api/v1/auth/google/config`, { timeout: 5000 });
    console.log('✅ Google config endpoint:', configRes.data);

    // Test auth health
    const healthRes = await axios.get(`${BASE_URL}/api/v1/auth/health`, { timeout: 5000 });
    console.log('✅ Auth health:', healthRes.data.status);

  } catch (error) {
    console.log('❌ API endpoints failed:', error.message);
    console.log('\n🔧 SOLUTION: Ensure server is running on port 8080');
    return;
  }

  // 3. Google OAuth Domain Configuration Check
  console.log('\n3. GOOGLE OAUTH CONFIGURATION:');
  console.log('-------------------------------');

  console.log(`Client ID: ${envVars.GOOGLE_CLIENT_ID}`);
  const projectId = envVars.GOOGLE_CLIENT_ID.split('-')[0];
  console.log(`Project ID: ${projectId}`);

  console.log('\n📋 Required Google Cloud Console Settings:');
  console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
  console.log(`2. Find OAuth 2.0 Client: ${projectId}-...`);
  console.log('3. Authorized JavaScript origins MUST include:');
  console.log('   • http://localhost:8080');
  console.log('   • http://127.0.0.1:8080');
  console.log('4. No redirect URIs needed for client-side flow');

  // 4. OAuth Flow Test
  console.log('\n4. OAUTH FLOW TEST:');
  console.log('-------------------');

  try {
    // Test with invalid token to check endpoint
    const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/google/login`, {
      credential: 'invalid_test_token',
      referralCode: ''
    }, { timeout: 5000 });

  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Login endpoint correctly rejects invalid tokens');
      console.log('   Response:', error.response.data);
    } else {
      console.log('❌ Unexpected login endpoint error:', error.message);
    }
  }

  // 5. Common Issues and Solutions
  console.log('\n5. COMMON OAUTH ISSUES & SOLUTIONS:');
  console.log('------------------------------------');

  console.log('\n❌ "Invalid Google authentication error" - Possible causes:');
  console.log('1. Google Cloud Console Settings:');
  console.log('   • Authorized origins missing localhost:8080');
  console.log('   • OAuth consent screen not configured');
  console.log('   • Client ID restrictions too strict');
  console.log('');
  console.log('2. Frontend Issues:');
  console.log('   • Google GSI library not loading');
  console.log('   • CSP blocking Google scripts');
  console.log('   • Incorrect client ID in config');
  console.log('');
  console.log('3. Backend Issues:');
  console.log('   • Invalid token format');
  console.log('   • Token verification failing');
  console.log('   • Network issues with Google API');

  // 6. Quick Fixes
  console.log('\n6. QUICK FIXES TO TRY:');
  console.log('----------------------');
  console.log('1. Clear browser cache and cookies');
  console.log('2. Try incognito/private browsing');
  console.log('3. Check browser console for errors');
  console.log('4. Ensure Google account is signed in');
  console.log('5. Check internet connectivity');

  // 7. Test browser access
  console.log('\n7. BROWSER ACCESS TEST:');
  console.log('------------------------');
  console.log('Open your browser and go to:');
  console.log(`• Worker App: ${BASE_URL}/`);
  console.log(`• Login Page: ${BASE_URL}/login`);
  console.log('Check browser console for JavaScript errors');

  // 8. Environment-specific checks
  console.log('\n8. ENVIRONMENT CHECKS:');
  console.log('----------------------');

  if (envVars.NODE_ENV !== 'production') {
    console.log('✅ Development mode: Simplified token verification');
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Verify Google Cloud Console settings (step 3)');
  console.log('2. Test in browser with dev tools open');
  console.log('3. Check specific error messages in console');
  console.log('4. Try with different Google account');

  console.log('\n📞 If issue persists, share:');
  console.log('• Browser console error messages');
  console.log('• Network tab failed requests');
  console.log('• This diagnosis report');
}

// Run diagnosis
diagnosisReport().catch(error => {
  console.error('Diagnosis failed:', error.message);
});