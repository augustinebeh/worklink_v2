/**
 * Comprehensive Login Functionality Test Suite
 * Tests all aspects of the admin login system
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;
const ADMIN_LOGIN_URL = `${API_BASE}/auth/login`;

// Test credentials
const VALID_ADMIN_CREDENTIALS = {
  email: 'admin@worklink.sg',
  password: 'admin123',
  type: 'admin'
};

const INVALID_CREDENTIALS = [
  { email: 'wrong@email.com', password: 'admin123', type: 'admin', description: 'Invalid email' },
  { email: 'admin@worklink.sg', password: 'wrongpass', type: 'admin', description: 'Invalid password' },
  { email: '', password: 'admin123', type: 'admin', description: 'Missing email' },
  { email: 'admin@worklink.sg', password: '', type: 'admin', description: 'Missing password' },
  { email: 'admin@worklink.sg', password: 'admin123', type: '', description: 'Missing type' }
];

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

// Helper functions
function addTestResult(test, status, details = {}) {
  const result = {
    test,
    status,
    details,
    timestamp: new Date().toISOString()
  };

  testResults.tests.push(result);
  testResults.summary.total++;

  if (status === 'PASS') {
    testResults.summary.passed++;
  } else if (status === 'FAIL') {
    testResults.summary.failed++;
  } else if (status === 'WARNING') {
    testResults.summary.warnings++;
  }

  console.log(`${status}: ${test}`);
  if (details.message) {
    console.log(`   ${details.message}`);
  }
}

async function testServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status === 200) {
      addTestResult('Server Health Check', 'PASS', {
        message: 'Server is responding correctly',
        data: response.data
      });
      return true;
    }
  } catch (error) {
    addTestResult('Server Health Check', 'FAIL', {
      message: `Server health check failed: ${error.message}`,
      error: error.message
    });
    return false;
  }
}

async function testAdminPageAccess() {
  try {
    const response = await axios.get(`${BASE_URL}/admin/`);
    if (response.status === 200 && response.data.includes('id="root"')) {
      addTestResult('Admin Page Access', 'PASS', {
        message: 'Admin page loads correctly with React root element',
        contentLength: response.data.length
      });
      return true;
    } else {
      addTestResult('Admin Page Access', 'FAIL', {
        message: 'Admin page does not contain expected React root element'
      });
      return false;
    }
  } catch (error) {
    addTestResult('Admin Page Access', 'FAIL', {
      message: `Failed to access admin page: ${error.message}`,
      error: error.message
    });
    return false;
  }
}

async function testAuthAPIHealth() {
  try {
    const response = await axios.get(`${API_BASE}/auth/health`);
    if (response.status === 200 && response.data.success) {
      addTestResult('Auth API Health', 'PASS', {
        message: 'Auth API is healthy and responding',
        data: response.data
      });
      return true;
    }
  } catch (error) {
    addTestResult('Auth API Health', 'FAIL', {
      message: `Auth API health check failed: ${error.message}`,
      error: error.message
    });
    return false;
  }
}

async function testValidLogin() {
  try {
    const response = await axios.post(ADMIN_LOGIN_URL, VALID_ADMIN_CREDENTIALS);

    if (response.status === 200 && response.data.success) {
      const { data, token } = response.data;

      // Verify response structure
      if (data && data.role === 'admin' && token) {
        addTestResult('Valid Admin Login', 'PASS', {
          message: 'Admin login successful with correct token and user data',
          userId: data.id,
          role: data.role,
          hasToken: !!token
        });

        // Return token for further testing
        return { success: true, token, user: data };
      } else {
        addTestResult('Valid Admin Login', 'FAIL', {
          message: 'Login succeeded but response structure is incorrect',
          responseData: response.data
        });
        return { success: false };
      }
    } else {
      addTestResult('Valid Admin Login', 'FAIL', {
        message: 'Login failed with valid credentials',
        status: response.status,
        responseData: response.data
      });
      return { success: false };
    }
  } catch (error) {
    addTestResult('Valid Admin Login', 'FAIL', {
      message: `Login request failed: ${error.message}`,
      error: error.message,
      status: error.response?.status
    });
    return { success: false };
  }
}

async function testInvalidLogins() {
  for (const credential of INVALID_CREDENTIALS) {
    try {
      const response = await axios.post(ADMIN_LOGIN_URL, credential);

      // If we get here, the login unexpectedly succeeded
      addTestResult(`Invalid Login Test - ${credential.description}`, 'FAIL', {
        message: 'Login should have failed but succeeded',
        credentials: credential.description,
        responseData: response.data
      });
    } catch (error) {
      if (error.response && [400, 401].includes(error.response.status)) {
        addTestResult(`Invalid Login Test - ${credential.description}`, 'PASS', {
          message: 'Login correctly rejected invalid credentials',
          status: error.response.status,
          credentials: credential.description
        });
      } else {
        addTestResult(`Invalid Login Test - ${credential.description}`, 'WARNING', {
          message: 'Unexpected error during invalid login test',
          error: error.message,
          status: error.response?.status
        });
      }
    }
  }
}

async function testTokenVerification(token) {
  if (!token) {
    addTestResult('Token Verification', 'SKIP', {
      message: 'No token available for verification'
    });
    return false;
  }

  try {
    const response = await axios.get(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 200 && response.data.success) {
      addTestResult('Token Verification', 'PASS', {
        message: 'Token verification successful',
        userData: response.data.data
      });
      return true;
    } else {
      addTestResult('Token Verification', 'FAIL', {
        message: 'Token verification failed',
        responseData: response.data
      });
      return false;
    }
  } catch (error) {
    addTestResult('Token Verification', 'FAIL', {
      message: `Token verification request failed: ${error.message}`,
      error: error.message,
      status: error.response?.status
    });
    return false;
  }
}

async function testCORSHeaders() {
  try {
    const response = await axios.options(ADMIN_LOGIN_URL);
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers']
    };

    addTestResult('CORS Headers Check', 'PASS', {
      message: 'CORS preflight request completed',
      headers: corsHeaders
    });
    return true;
  } catch (error) {
    addTestResult('CORS Headers Check', 'WARNING', {
      message: `CORS check completed with status: ${error.response?.status || 'No response'}`,
      error: error.message
    });
    return false;
  }
}

async function testRateLimiting() {
  console.log('\nTesting rate limiting (this may take a moment)...');

  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      axios.post(ADMIN_LOGIN_URL, {
        email: 'test@rate.limit',
        password: 'invalid',
        type: 'admin'
      }).catch(err => err.response)
    );
  }

  try {
    const responses = await Promise.all(promises);
    const rateLimitResponses = responses.filter(r => r && r.status === 429);

    if (rateLimitResponses.length > 0) {
      addTestResult('Rate Limiting', 'PASS', {
        message: 'Rate limiting is active',
        rateLimitHits: rateLimitResponses.length,
        totalRequests: responses.length
      });
    } else {
      addTestResult('Rate Limiting', 'WARNING', {
        message: 'Rate limiting not detected (may be configured differently)',
        totalRequests: responses.length
      });
    }
  } catch (error) {
    addTestResult('Rate Limiting', 'WARNING', {
      message: 'Rate limiting test encountered errors',
      error: error.message
    });
  }
}

async function testEnvironmentConfiguration() {
  try {
    // Test if environment variables are properly set
    const response = await axios.get(`${API_BASE}/auth/`);

    if (response.status === 200 && response.data.success) {
      addTestResult('Environment Configuration', 'PASS', {
        message: 'Auth module configuration appears correct',
        version: response.data.version,
        architecture: response.data.architecture,
        features: response.data.features?.length || 0
      });
    } else {
      addTestResult('Environment Configuration', 'WARNING', {
        message: 'Auth module responded but configuration may be incomplete'
      });
    }
  } catch (error) {
    addTestResult('Environment Configuration', 'FAIL', {
      message: 'Failed to verify environment configuration',
      error: error.message
    });
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Login Functionality Tests');
  console.log('=' .repeat(60));

  // Phase 1: Basic connectivity and health
  console.log('\n📡 Phase 1: Connectivity and Health Checks');
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log('❌ Server is not healthy, aborting tests');
    return;
  }

  await testAdminPageAccess();
  await testAuthAPIHealth();
  await testEnvironmentConfiguration();

  // Phase 2: Authentication testing
  console.log('\n🔐 Phase 2: Authentication Testing');
  const loginResult = await testValidLogin();
  await testInvalidLogins();

  // Phase 3: Token and session management
  console.log('\n🎫 Phase 3: Token and Session Management');
  if (loginResult.success) {
    await testTokenVerification(loginResult.token);
  }

  // Phase 4: Security testing
  console.log('\n🛡️  Phase 4: Security Testing');
  await testCORSHeaders();
  await testRateLimiting();

  // Generate report
  console.log('\n📊 Test Results Summary');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`✅ Passed: ${testResults.summary.passed}`);
  console.log(`❌ Failed: ${testResults.summary.failed}`);
  console.log(`⚠️  Warnings: ${testResults.summary.warnings}`);

  const passRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1);
  console.log(`📈 Pass Rate: ${passRate}%`);

  // Save detailed report
  const reportPath = path.join(__dirname, 'login-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📝 Detailed report saved to: ${reportPath}`);

  // Final assessment
  console.log('\n🎯 Final Assessment:');
  if (testResults.summary.failed === 0) {
    console.log('✅ All critical tests passed! Login functionality is working correctly.');
  } else if (testResults.summary.failed <= 2) {
    console.log('⚠️  Most tests passed with some minor issues that should be addressed.');
  } else {
    console.log('❌ Multiple test failures detected. Login functionality needs attention.');
  }

  return testResults;
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, testResults };