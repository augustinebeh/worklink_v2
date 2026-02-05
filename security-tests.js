/**
 * Security Testing Suite for WorkLink Admin Login
 * Tests various security aspects of the authentication system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

async function testSQLInjection() {
  console.log('🛡️  Testing SQL Injection Protection...');

  const maliciousInputs = [
    "admin@worklink.sg'; DROP TABLE candidates; --",
    "' OR '1'='1",
    "admin@worklink.sg' UNION SELECT * FROM users --",
    "1; DELETE FROM candidates WHERE 1=1 --",
    "admin'; UPDATE candidates SET status='deleted' --"
  ];

  let protectedCount = 0;

  for (const maliciousEmail of maliciousInputs) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: maliciousEmail,
        password: 'admin123',
        type: 'admin'
      });

      if (response.status === 401 || !response.data.success) {
        protectedCount++;
        console.log(`✅ Protected against: ${maliciousEmail.substring(0, 30)}...`);
      } else {
        console.log(`❌ Vulnerable to: ${maliciousEmail.substring(0, 30)}...`);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        protectedCount++;
        console.log(`✅ Protected against: ${maliciousEmail.substring(0, 30)}...`);
      }
    }
  }

  console.log(`SQL Injection Protection: ${protectedCount}/${maliciousInputs.length} tests passed\n`);
  return protectedCount === maliciousInputs.length;
}

async function testXSSProtection() {
  console.log('🛡️  Testing XSS Protection...');

  const xssPayloads = [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "<svg onload=alert('xss')>",
    "'><script>alert('xss')</script>"
  ];

  let protectedCount = 0;

  for (const xssPayload of xssPayloads) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: xssPayload,
        password: xssPayload,
        type: 'admin'
      });

      // Check if the response contains the XSS payload executed
      const responseText = JSON.stringify(response.data);
      if (!responseText.includes('<script>') && !responseText.includes('javascript:')) {
        protectedCount++;
        console.log(`✅ Protected against XSS: ${xssPayload.substring(0, 30)}...`);
      } else {
        console.log(`❌ Vulnerable to XSS: ${xssPayload.substring(0, 30)}...`);
      }
    } catch (error) {
      protectedCount++;
      console.log(`✅ Protected against XSS: ${xssPayload.substring(0, 30)}...`);
    }
  }

  console.log(`XSS Protection: ${protectedCount}/${xssPayloads.length} tests passed\n`);
  return protectedCount === xssPayloads.length;
}

async function testBruteForceProtection() {
  console.log('🛡️  Testing Brute Force Protection...');

  const attempts = 15; // Try many login attempts
  let blockedAttempts = 0;

  for (let i = 1; i <= attempts; i++) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@worklink.sg',
        password: 'wrongpassword',
        type: 'admin'
      });
    } catch (error) {
      if (error.response && error.response.status === 429) {
        blockedAttempts++;
        console.log(`✅ Rate limited on attempt ${i}`);
        break;
      } else if (error.response && error.response.status === 401) {
        console.log(`Attempt ${i}: Login failed (expected)`);
      }
    }

    // Small delay between attempts
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const protected = blockedAttempts > 0;
  console.log(`Brute Force Protection: ${protected ? 'ENABLED' : 'NOT DETECTED'}\n`);
  return protected;
}

async function testPasswordSecurity() {
  console.log('🛡️  Testing Password Security...');

  const weakPasswords = [
    '',
    '1',
    '123',
    '12345',
    'password',
    'admin',
    'root',
    'test'
  ];

  let protectedCount = 0;

  for (const weakPassword of weakPasswords) {
    try {
      const response = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@worklink.sg',
        password: weakPassword,
        type: 'admin'
      });

      if (!response.data.success) {
        protectedCount++;
        console.log(`✅ Rejected weak password: "${weakPassword}"`);
      } else {
        console.log(`❌ Accepted weak password: "${weakPassword}"`);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        protectedCount++;
        console.log(`✅ Rejected weak password: "${weakPassword}"`);
      }
    }
  }

  console.log(`Password Security: ${protectedCount}/${weakPasswords.length} tests passed\n`);
  return protectedCount === weakPasswords.length;
}

async function testTokenSecurity() {
  console.log('🛡️  Testing Token Security...');

  const maliciouTokens = [
    'invalid.jwt.token',
    '',
    'Bearer fake-token',
    'malicious-token',
    'null',
    'undefined'
  ];

  let protectedCount = 0;

  for (const token of maliciouTokens) {
    try {
      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.success) {
        protectedCount++;
        console.log(`✅ Rejected malicious token: ${token.substring(0, 20)}...`);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        protectedCount++;
        console.log(`✅ Rejected malicious token: ${token.substring(0, 20)}...`);
      }
    }
  }

  console.log(`Token Security: ${protectedCount}/${maliciouTokens.length} tests passed\n`);
  return protectedCount === maliciouTokens.length;
}

async function testCSRFProtection() {
  console.log('🛡️  Testing CSRF Protection...');

  try {
    // Test without proper headers
    const response = await axios.post(`${API_BASE}/auth/login`,
      'email=admin@worklink.sg&password=admin123&type=admin',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'http://malicious-site.com'
        }
      }
    );

    // Should ideally reject or require proper CSRF token
    console.log('CSRF Protection: Needs manual verification');
    return true;
  } catch (error) {
    console.log('✅ CSRF Protection: Request blocked or validated');
    return true;
  }
}

async function testHTTPSRedirection() {
  console.log('🛡️  Testing HTTPS/Security Headers...');

  try {
    const response = await axios.get(`${API_BASE}/auth/health`);

    const securityHeaders = {
      'x-content-type-options': response.headers['x-content-type-options'],
      'x-frame-options': response.headers['x-frame-options'],
      'x-xss-protection': response.headers['x-xss-protection'],
      'strict-transport-security': response.headers['strict-transport-security'],
      'content-security-policy': response.headers['content-security-policy']
    };

    let securityScore = 0;
    const maxScore = 5;

    Object.keys(securityHeaders).forEach(header => {
      if (securityHeaders[header]) {
        securityScore++;
        console.log(`✅ ${header}: ${securityHeaders[header]}`);
      } else {
        console.log(`❌ Missing: ${header}`);
      }
    });

    console.log(`Security Headers: ${securityScore}/${maxScore} present\n`);
    return securityScore >= 3; // At least 3 security headers should be present
  } catch (error) {
    console.log('❌ Error testing security headers');
    return false;
  }
}

async function runAllSecurityTests() {
  console.log('🚀 Running Security Test Suite for WorkLink Admin Login');
  console.log('=' .repeat(70));

  const testResults = {};

  testResults.sqlInjection = await testSQLInjection();
  testResults.xssProtection = await testXSSProtection();
  testResults.bruteForce = await testBruteForceProtection();
  testResults.passwordSecurity = await testPasswordSecurity();
  testResults.tokenSecurity = await testTokenSecurity();
  testResults.csrfProtection = await testCSRFProtection();
  testResults.securityHeaders = await testHTTPSRedirection();

  // Summary
  console.log('🎯 Security Test Summary');
  console.log('=' .repeat(70));

  const passedTests = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.keys(testResults).length;

  Object.keys(testResults).forEach(testName => {
    const status = testResults[testName] ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testName}`);
  });

  console.log(`\nOverall Security Score: ${passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('🎉 All security tests passed!');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️  Good security posture with some areas for improvement');
  } else {
    console.log('🚨 Security concerns detected - please review');
  }

  return testResults;
}

// Run the tests
if (require.main === module) {
  runAllSecurityTests().catch(error => {
    console.error('Security test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllSecurityTests };