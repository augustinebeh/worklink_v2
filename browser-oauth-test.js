/**
 * Browser OAuth Test Script
 *
 * INSTRUCTIONS:
 * 1. Open http://localhost:8080/login in your browser
 * 2. Open Browser Dev Tools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to run
 *
 * This will test the OAuth flow and identify issues
 */

console.log('🔍 WORKER PWA OAUTH DIAGNOSTIC TEST');
console.log('====================================');

async function testOAuthFlow() {

  // Test 1: Check current page and Google config
  console.log('\n1. ENVIRONMENT CHECK:');
  console.log('Current URL:', window.location.href);
  console.log('User Agent:', navigator.userAgent);

  // Test 2: Check API endpoints
  console.log('\n2. API ENDPOINTS:');
  try {
    const configRes = await fetch('/api/v1/auth/google/config');
    const configData = await configRes.json();
    console.log('✅ Google config:', configData);

    if (!configData.success) {
      console.error('❌ Google config failed:', configData.error);
      return;
    }

    window.testClientId = configData.clientId;

  } catch (error) {
    console.error('❌ Config fetch failed:', error);
    return;
  }

  // Test 3: Check Google GSI library
  console.log('\n3. GOOGLE GSI LIBRARY:');
  if (typeof google !== 'undefined') {
    console.log('✅ Google GSI library loaded');
    console.log('Google object:', Object.keys(google));
  } else {
    console.error('❌ Google GSI library NOT loaded');
    console.log('Checking if script tag exists...');
    const gsiScript = document.querySelector('script[src*="accounts.google.com"]');
    console.log('GSI script tag:', gsiScript ? '✅ Found' : '❌ Missing');

    if (!gsiScript) {
      console.log('Adding GSI script...');
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        console.log('✅ GSI script loaded dynamically');
        setTimeout(() => testGoogleInit(), 1000);
      };

      script.onerror = () => {
        console.error('❌ Failed to load GSI script - possible CSP or network issue');
      };

      return;
    }
  }

  testGoogleInit();
}

function testGoogleInit() {
  console.log('\n4. GOOGLE INITIALIZATION:');

  if (typeof google === 'undefined') {
    console.error('❌ Google library still not available');
    return;
  }

  try {
    // Test Google initialization
    google.accounts.id.initialize({
      client_id: window.testClientId,
      callback: (response) => {
        console.log('✅ Google callback triggered!');
        console.log('Credential received:', response.credential ? 'Yes' : 'No');
        testLoginEndpoint(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    console.log('✅ Google initialization successful');

    // Create test button
    const testDiv = document.createElement('div');
    testDiv.id = 'oauth-test-button';
    testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 9999; background: red; padding: 10px; border-radius: 5px;';
    document.body.appendChild(testDiv);

    google.accounts.id.renderButton(testDiv, {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
    });

    console.log('✅ Test Google button created (top-right corner)');

  } catch (error) {
    console.error('❌ Google initialization failed:', error);

    // Common error analysis
    if (error.message.includes('Invalid client_id')) {
      console.error('🔧 SOLUTION: Client ID not authorized for this domain');
      console.log('Add http://localhost:8080 to Google Cloud Console authorized origins');
    }
  }
}

async function testLoginEndpoint(credential) {
  console.log('\n5. BACKEND LOGIN TEST:');

  if (!credential) {
    console.error('❌ No credential provided');
    return;
  }

  try {
    const response = await fetch('/api/v1/auth/google/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credential: credential,
        referralCode: ''
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ LOGIN SUCCESSFUL!', data);
      alert('✅ OAuth test successful! Login working.');
    } else {
      console.error('❌ Login failed:', data.error);

      // Error analysis
      if (data.error === 'Invalid Google authentication') {
        console.log('🔧 SOLUTION: Token verification failed');
        console.log('- Check network connectivity');
        console.log('- Verify Google API access');
        console.log('- Check if in development mode');
      }
    }

  } catch (error) {
    console.error('❌ Login request failed:', error);
  }
}

// Test for CSP issues
function testCSPIssues() {
  console.log('\n6. CSP (CONTENT SECURITY POLICY) TEST:');

  // Check if external resources can load
  const testImg = new Image();
  testImg.onload = () => console.log('✅ External images allowed');
  testImg.onerror = () => console.log('❌ External images blocked (CSP issue)');
  testImg.src = 'https://www.google.com/favicon.ico';

  // Check script loading
  try {
    eval('console.log("✅ eval() allowed")');
  } catch {
    console.log('❌ eval() blocked by CSP');
  }
}

// Common issues checker
function checkCommonIssues() {
  console.log('\n7. COMMON ISSUES CHECK:');

  // Check localStorage
  try {
    localStorage.setItem('test', 'value');
    localStorage.removeItem('test');
    console.log('✅ localStorage working');
  } catch {
    console.log('❌ localStorage blocked');
  }

  // Check if already logged in
  const existingUser = localStorage.getItem('worker_user');
  if (existingUser) {
    console.log('ℹ️  User already logged in:', JSON.parse(existingUser).name);
    console.log('Clear localStorage to test fresh login');
  }

  // Check network
  console.log('ℹ️  Network status:', navigator.onLine ? 'Online' : 'Offline');

  // Browser compatibility
  console.log('ℹ️  Browser:', navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other');
}

// Instructions
console.log('\n📋 DIAGNOSTIC INSTRUCTIONS:');
console.log('1. Run: testOAuthFlow()');
console.log('2. Run: testCSPIssues()');
console.log('3. Run: checkCommonIssues()');
console.log('4. Try clicking the Google login button');
console.log('5. Report any errors or unexpected behavior');

console.log('\n🚀 Starting automatic diagnosis...');
testOAuthFlow();
testCSPIssues();
checkCommonIssues();

// Make functions available globally
window.testOAuthFlow = testOAuthFlow;
window.testCSPIssues = testCSPIssues;
window.checkCommonIssues = checkCommonIssues;