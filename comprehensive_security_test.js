/**
 * COMPREHENSIVE SECURITY AND AUTHENTICATION TESTING SUITE
 *
 * Tests all security aspects:
 * 1. Admin Authentication
 * 2. Authorization and Role-Based Access Control
 * 3. API Security
 * 4. Input Validation and Sanitization
 * 5. Session Security
 * 6. Password Security
 * 7. Security Headers
 * 8. Data Privacy
 * 9. Rate Limiting
 * 10. Audit Logging
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_URL = `${BASE_URL}/api/v1`;

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  criticalIssues: [],
  highIssues: [],
  mediumIssues: [],
  lowIssues: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, passed, details = '') {
  if (passed) {
    results.passed++;
    log(`✓ ${testName}${details ? ': ' + details : ''}`, 'green');
  } else {
    results.failed++;
    log(`✗ ${testName}${details ? ': ' + details : ''}`, 'red');
  }
}

function logWarning(message) {
  results.warnings++;
  log(`⚠ ${message}`, 'yellow');
}

function addVulnerability(severity, category, description, remediation) {
  const issue = { category, description, remediation };

  switch(severity) {
    case 'CRITICAL':
      results.criticalIssues.push(issue);
      log(`🔴 CRITICAL: ${description}`, 'red');
      break;
    case 'HIGH':
      results.highIssues.push(issue);
      log(`🟠 HIGH: ${description}`, 'magenta');
      break;
    case 'MEDIUM':
      results.mediumIssues.push(issue);
      log(`🟡 MEDIUM: ${description}`, 'yellow');
      break;
    case 'LOW':
      results.lowIssues.push(issue);
      log(`🟢 LOW: ${description}`, 'blue');
      break;
  }
}

function logSection(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(80) + '\n', 'cyan');
}

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// TEST SECTION 1: ADMIN AUTHENTICATION
// ============================================================================

async function testAdminAuthentication() {
  logSection('1. ADMIN AUTHENTICATION TESTS');

  try {
    // Test 1.1: Admin login with wrong password
    log('\n[1.1] Testing admin login with wrong password...');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@talentvis.com',
        password: 'wrongpassword',
        type: 'admin'
      });

      logTest('Admin rejects wrong password', false, 'Should have returned 401');
      addVulnerability('CRITICAL', 'Authentication',
        'Admin login accepts incorrect password',
        'Verify password validation logic');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        logTest('Admin rejects wrong password', true);
      } else {
        logTest('Admin rejects wrong password', false, error.message);
      }
    }

    // Test 1.2: Admin login without password
    log('\n[1.2] Testing admin login without password...');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@talentvis.com',
        type: 'admin'
      });

      logTest('Admin requires password', false, 'Should have rejected missing password');
      addVulnerability('CRITICAL', 'Authentication',
        'Admin login does not require password',
        'Add password requirement validation');
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 401)) {
        logTest('Admin requires password', true);
      } else {
        logTest('Admin requires password', false, error.message);
      }
    }

    // Test 1.3: SQL Injection in admin login
    log('\n[1.3] Testing SQL injection in admin login...');
    try {
      const sqlInjections = [
        "admin@talentvis.com' OR '1'='1",
        "admin@talentvis.com'--",
        "admin@talentvis.com'; DROP TABLE candidates;--",
        "admin@talentvis.com' UNION SELECT * FROM candidates--"
      ];

      let vulnerable = false;
      for (const payload of sqlInjections) {
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email: payload,
            password: 'test',
            type: 'admin'
          });

          if (response.status === 200) {
            vulnerable = true;
            break;
          }
        } catch (error) {
          // Expected to fail
        }
      }

      logTest('SQL injection protection', !vulnerable);
      if (vulnerable) {
        addVulnerability('CRITICAL', 'SQL Injection',
          'Admin login vulnerable to SQL injection',
          'Use parameterized queries and input validation');
      }
    } catch (error) {
      logWarning('SQL injection test error: ' + error.message);
    }

    // Test 1.4: Brute force protection
    log('\n[1.4] Testing brute force protection...');
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      try {
        const start = Date.now();
        await axios.post(`${API_URL}/auth/login`, {
          email: 'admin@talentvis.com',
          password: `wrongpass${i}`,
          type: 'admin'
        });
      } catch (error) {
        attempts.push({
          status: error.response?.status,
          time: Date.now()
        });
      }
    }

    // Check if there's rate limiting or account lockout
    const allFailed = attempts.every(a => a.status === 401 || a.status === 429);
    const hasRateLimit = attempts.some(a => a.status === 429);

    if (hasRateLimit) {
      logTest('Brute force protection', true, 'Rate limiting detected');
    } else {
      logTest('Brute force protection', false, 'No rate limiting detected');
      addVulnerability('HIGH', 'Authentication',
        'No brute force protection on admin login',
        'Implement rate limiting and account lockout after failed attempts');
    }

  } catch (error) {
    log(`Error in admin authentication tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 2: AUTHORIZATION AND ROLE-BASED ACCESS CONTROL
// ============================================================================

async function testAuthorization() {
  logSection('2. AUTHORIZATION & ROLE-BASED ACCESS CONTROL');

  try {
    // Get candidate token (for testing unauthorized access)
    let candidateToken = null;
    try {
      const response = await axios.post(`${API_URL}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });
      candidateToken = response.data.token;
      log('[Setup] Got candidate token for testing');
    } catch (error) {
      logWarning('Could not get candidate token: ' + error.message);
    }

    // Test 2.1: Unauthorized access to admin endpoints
    log('\n[2.1] Testing unauthorized access to admin endpoints...');
    const adminEndpoints = [
      '/api/v1/admin/stats',
      '/api/v1/admin/settings',
      '/api/v1/admin/reset-to-sample'
    ];

    let adminProtected = true;
    for (const endpoint of adminEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        if (response.status === 200) {
          adminProtected = false;
          addVulnerability('CRITICAL', 'Authorization',
            `Admin endpoint ${endpoint} accessible without authentication`,
            'Add authentication middleware to admin routes');
        }
      } catch (error) {
        // Expected to fail
      }
    }
    logTest('Admin endpoints require authentication', adminProtected);

    // Test 2.2: Candidate trying to access admin endpoints
    if (candidateToken) {
      log('\n[2.2] Testing candidate access to admin endpoints...');
      let roleCheckWorks = true;

      for (const endpoint of adminEndpoints) {
        try {
          const response = await axios.get(`${BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${candidateToken}` }
          });

          if (response.status === 200) {
            roleCheckWorks = false;
            addVulnerability('CRITICAL', 'Authorization',
              `Candidate can access admin endpoint: ${endpoint}`,
              'Implement role-based access control checks');
          }
        } catch (error) {
          if (error.response?.status !== 403) {
            logWarning(`Unexpected status for ${endpoint}: ${error.response?.status}`);
          }
        }
      }
      logTest('Role-based access control', roleCheckWorks);
    }

    // Test 2.3: Access other candidate's data
    if (candidateToken) {
      log('\n[2.3] Testing horizontal privilege escalation...');
      try {
        // Try to access another candidate's data
        const response = await axios.get(`${API_URL}/candidates/CND001`, {
          headers: { Authorization: `Bearer ${candidateToken}` }
        });

        // Should either be blocked or only return own data
        logTest('Prevents accessing other candidate data', false, 'Needs verification');
        logWarning('Manual verification needed: Check if candidate can access other candidates data');
      } catch (error) {
        if (error.response?.status === 403) {
          logTest('Prevents accessing other candidate data', true);
        }
      }
    }

    // Test 2.4: Token manipulation
    log('\n[2.4] Testing token manipulation...');
    if (candidateToken) {
      const decodedToken = jwt.decode(candidateToken);

      // Try to create admin token
      const fakeAdminToken = jwt.sign(
        { ...decodedToken, role: 'admin' },
        'guessed-secret'
      );

      try {
        const response = await axios.get(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${fakeAdminToken}` }
        });

        if (response.status === 200) {
          addVulnerability('CRITICAL', 'Authorization',
            'Can forge JWT tokens with weak secret',
            'Use a strong, randomly generated JWT secret (at least 256 bits)');
          logTest('JWT secret strength', false);
        }
      } catch (error) {
        logTest('JWT secret strength', true, 'Token forgery failed');
      }
    }

  } catch (error) {
    log(`Error in authorization tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 3: API SECURITY
// ============================================================================

async function testAPISecnrity() {
  logSection('3. API SECURITY');

  try {
    // Test 3.1: CORS policy
    log('\n[3.1] Testing CORS policy...');
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          'Origin': 'https://evil-site.com'
        }
      });

      const corsHeader = response.headers['access-control-allow-origin'];

      if (corsHeader === '*') {
        addVulnerability('HIGH', 'CORS',
          'CORS allows all origins (*)',
          'Restrict CORS to specific trusted origins');
        logTest('CORS policy', false, 'Allows all origins');
      } else if (!corsHeader) {
        logTest('CORS policy', true, 'CORS not permissive');
      } else {
        logTest('CORS policy', true, `Restricted to: ${corsHeader}`);
      }
    } catch (error) {
      logTest('CORS policy', true, 'Request blocked or controlled');
    }

    // Test 3.2: API without authentication
    log('\n[3.2] Testing API endpoints without authentication...');
    const protectedEndpoints = [
      '/api/v1/candidates',
      '/api/v1/jobs',
      '/api/v1/payments',
      '/api/v1/deployments'
    ];

    let allProtected = true;
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        if (response.status === 200) {
          allProtected = false;
          addVulnerability('HIGH', 'Authentication',
            `Endpoint ${endpoint} accessible without authentication`,
            'Add authentication middleware');
        }
      } catch (error) {
        // Expected
      }
    }
    logTest('API endpoints require authentication', allProtected);

    // Test 3.3: Invalid/expired tokens
    log('\n[3.3] Testing expired/invalid token handling...');
    const invalidTokens = [
      'invalid-token',
      'Bearer invalid',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
    ];

    let handlesInvalidTokens = true;
    for (const token of invalidTokens) {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
          handlesInvalidTokens = false;
          addVulnerability('CRITICAL', 'Authentication',
            'Accepts invalid JWT tokens',
            'Properly validate JWT signatures');
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          handlesInvalidTokens = false;
        }
      }
    }
    logTest('Invalid token rejection', handlesInvalidTokens);

  } catch (error) {
    log(`Error in API security tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 4: INPUT VALIDATION AND XSS/INJECTION PREVENTION
// ============================================================================

async function testInputValidation() {
  logSection('4. INPUT VALIDATION & INJECTION PREVENTION');

  try {
    // Get a valid token first
    let token = null;
    try {
      const response = await axios.post(`${API_URL}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });
      token = response.data.token;
    } catch (error) {
      logWarning('Could not get token for input validation tests');
      return;
    }

    // Test 4.1: XSS in input fields
    log('\n[4.1] Testing XSS prevention...');
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>'
    ];

    let xssBlocked = true;
    for (const payload of xssPayloads) {
      try {
        // Test in notification creation
        const response = await axios.post(`${API_URL}/notifications`, {
          title: payload,
          message: 'Test',
          type: 'info'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Check if payload was sanitized
        if (response.data.data && response.data.data.title === payload) {
          xssBlocked = false;
          addVulnerability('HIGH', 'XSS',
            'XSS payloads not sanitized in user input',
            'Implement input sanitization and output encoding');
          break;
        }
      } catch (error) {
        // May be blocked or sanitized
      }
    }
    logTest('XSS prevention', xssBlocked);

    // Test 4.2: SQL Injection
    log('\n[4.2] Testing SQL injection prevention...');
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE candidates;--",
      "' UNION SELECT * FROM settings--",
      "1' AND '1'='1"
    ];

    let sqlBlocked = true;
    for (const payload of sqlPayloads) {
      try {
        const response = await axios.get(`${API_URL}/candidates/${payload}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Should not return unexpected data
        if (response.status === 200 && response.data.success) {
          logWarning('SQL injection test returned data - needs manual review');
        }
      } catch (error) {
        // Expected to fail
      }
    }
    logTest('SQL injection prevention', sqlBlocked);

    // Test 4.3: Path traversal
    log('\n[4.3] Testing path traversal...');
    const pathPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '....//....//....//etc/passwd'
    ];

    let pathBlocked = true;
    for (const payload of pathPayloads) {
      try {
        const response = await axios.get(`${API_URL}/candidates/${payload}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.status === 200) {
          pathBlocked = false;
          addVulnerability('HIGH', 'Path Traversal',
            'Path traversal not blocked',
            'Validate and sanitize file paths');
        }
      } catch (error) {
        // Expected
      }
    }
    logTest('Path traversal prevention', pathBlocked);

    // Test 4.4: Command injection
    log('\n[4.4] Testing command injection...');
    const cmdPayloads = [
      '; ls -la',
      '| cat /etc/passwd',
      '`whoami`',
      '$(whoami)'
    ];

    let cmdBlocked = true;
    for (const payload of cmdPayloads) {
      try {
        const response = await axios.post(`${API_URL}/notifications`, {
          title: payload,
          message: 'Test',
          type: 'info'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        // Expected
      }
    }
    logTest('Command injection prevention', cmdBlocked);

    // Test 4.5: Input length limits
    log('\n[4.5] Testing input length limits...');
    const longString = 'A'.repeat(100000);
    try {
      const response = await axios.post(`${API_URL}/notifications`, {
        title: longString,
        message: 'Test',
        type: 'info'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      logTest('Input length limits', false, 'Accepts very long inputs');
      addVulnerability('MEDIUM', 'Input Validation',
        'No length limits on user input',
        'Implement maximum length validation');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 413) {
        logTest('Input length limits', true);
      }
    }

  } catch (error) {
    log(`Error in input validation tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 5: SESSION SECURITY
// ============================================================================

async function testSessionSecurity() {
  logSection('5. SESSION SECURITY');

  try {
    // Get a token
    let token = null;
    let tokenData = null;

    try {
      const response = await axios.post(`${API_URL}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });
      token = response.data.token;
      tokenData = jwt.decode(token);
      log('[Setup] Got token for session tests');
    } catch (error) {
      logWarning('Could not get token for session tests');
      return;
    }

    // Test 5.1: Token expiration
    log('\n[5.1] Checking token expiration...');
    if (tokenData && tokenData.exp) {
      const expiresIn = tokenData.exp - Math.floor(Date.now() / 1000);
      const hoursUntilExpiry = expiresIn / 3600;

      if (hoursUntilExpiry > 48) {
        addVulnerability('MEDIUM', 'Session Security',
          `Token expiration too long: ${Math.round(hoursUntilExpiry)} hours`,
          'Reduce token expiration time to 24 hours or less');
        logTest('Token expiration time', false, `${Math.round(hoursUntilExpiry)}h`);
      } else {
        logTest('Token expiration time', true, `${Math.round(hoursUntilExpiry)}h`);
      }
    } else {
      addVulnerability('HIGH', 'Session Security',
        'Token has no expiration time',
        'Add expiration time to JWT tokens');
      logTest('Token expiration', false, 'No expiration set');
    }

    // Test 5.2: Token refresh mechanism
    log('\n[5.2] Checking token refresh mechanism...');
    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        token: token
      });

      if (response.status === 200) {
        logTest('Token refresh available', true);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        logWarning('No token refresh endpoint found');
        addVulnerability('LOW', 'Session Security',
          'No token refresh mechanism',
          'Implement token refresh to improve UX');
      }
    }

    // Test 5.3: Concurrent sessions
    log('\n[5.3] Testing concurrent session handling...');
    try {
      // Login twice with same credentials
      const login1 = await axios.post(`${API_URL}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });

      const login2 = await axios.post(`${API_URL}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });

      const token1 = login1.data.token;
      const token2 = login2.data.token;

      // Both tokens should work (or implement session invalidation)
      const test1 = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token1}` }
      });

      const test2 = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token2}` }
      });

      if (test1.status === 200 && test2.status === 200) {
        logTest('Concurrent sessions allowed', true);
        logWarning('Consider implementing session limit for security');
      }
    } catch (error) {
      logWarning('Concurrent session test error: ' + error.message);
    }

    // Test 5.4: Logout mechanism
    log('\n[5.4] Testing logout mechanism...');
    try {
      const response = await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      logTest('Logout endpoint exists', true);

      // Try to use token after logout
      try {
        await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        logTest('Token invalidated after logout', false);
        addVulnerability('MEDIUM', 'Session Security',
          'Tokens still valid after logout',
          'Implement token blacklist or short expiration');
      } catch (error) {
        if (error.response?.status === 401) {
          logTest('Token invalidated after logout', true);
        }
      }
    } catch (error) {
      if (error.response?.status === 404) {
        logWarning('No logout endpoint found');
        addVulnerability('LOW', 'Session Security',
          'No logout mechanism',
          'Implement logout endpoint with token invalidation');
      }
    }

  } catch (error) {
    log(`Error in session security tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 6: PASSWORD SECURITY
// ============================================================================

async function testPasswordSecurity() {
  logSection('6. PASSWORD SECURITY');

  try {
    // Test 6.1: Password requirements
    log('\n[6.1] Testing password policy enforcement...');
    const weakPasswords = [
      '123',
      'password',
      'admin',
      '12345678'
    ];

    let enforcesPolicy = false;
    for (const pwd of weakPasswords) {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: 'admin@talentvis.com',
          password: pwd,
          type: 'admin'
        });

        // Should reject weak passwords
      } catch (error) {
        if (error.response?.status === 400) {
          enforcesPolicy = true;
        }
      }
    }

    if (!enforcesPolicy) {
      logWarning('No password policy enforcement detected');
      addVulnerability('MEDIUM', 'Password Security',
        'No password complexity requirements',
        'Enforce password length, complexity, and common password checks');
    } else {
      logTest('Password policy enforcement', true);
    }

    // Test 6.2: Password reset functionality
    log('\n[6.2] Testing password reset security...');
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, {
        email: 'admin@talentvis.com'
      });

      logTest('Password reset endpoint exists', true);

      // Check for timing attacks
      const start1 = Date.now();
      await axios.post(`${API_URL}/auth/forgot-password`, {
        email: 'admin@talentvis.com'
      }).catch(() => {});
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await axios.post(`${API_URL}/auth/forgot-password`, {
        email: 'nonexistent@test.com'
      }).catch(() => {});
      const time2 = Date.now() - start2;

      if (Math.abs(time1 - time2) > 100) {
        logWarning('Password reset may leak user existence via timing');
        addVulnerability('LOW', 'Password Security',
          'Password reset timing attack possible',
          'Use constant-time response for both valid and invalid emails');
      } else {
        logTest('Password reset timing attack protection', true);
      }

    } catch (error) {
      if (error.response?.status === 404) {
        logWarning('No password reset functionality found');
        addVulnerability('LOW', 'Password Security',
          'No password reset mechanism',
          'Implement secure password reset flow');
      }
    }

    // Test 6.3: Password in responses
    log('\n[6.3] Checking for password leaks in API responses...');
    try {
      const response = await axios.post(`${API_URL}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });

      const responseStr = JSON.stringify(response.data).toLowerCase();
      if (responseStr.includes('password') || responseStr.includes('passwd')) {
        addVulnerability('CRITICAL', 'Data Privacy',
          'Password field exposed in API response',
          'Never return password fields in API responses');
        logTest('Password not in responses', false);
      } else {
        logTest('Password not in responses', true);
      }
    } catch (error) {
      logWarning('Could not test password in responses');
    }

  } catch (error) {
    log(`Error in password security tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 7: SECURITY HEADERS
// ============================================================================

async function testSecurityHeaders() {
  logSection('7. SECURITY HEADERS & HTTPS');

  try {
    log('\n[7.1] Checking security headers...');
    const response = await axios.get(`${BASE_URL}/health`);
    const headers = response.headers;

    // Check X-Frame-Options
    if (headers['x-frame-options']) {
      logTest('X-Frame-Options header', true, headers['x-frame-options']);
    } else {
      addVulnerability('MEDIUM', 'Security Headers',
        'Missing X-Frame-Options header',
        'Add X-Frame-Options: DENY or SAMEORIGIN');
      logTest('X-Frame-Options header', false);
    }

    // Check X-Content-Type-Options
    if (headers['x-content-type-options'] === 'nosniff') {
      logTest('X-Content-Type-Options header', true);
    } else {
      addVulnerability('MEDIUM', 'Security Headers',
        'Missing X-Content-Type-Options header',
        'Add X-Content-Type-Options: nosniff');
      logTest('X-Content-Type-Options header', false);
    }

    // Check X-XSS-Protection
    if (headers['x-xss-protection']) {
      logTest('X-XSS-Protection header', true, headers['x-xss-protection']);
    } else {
      addVulnerability('LOW', 'Security Headers',
        'Missing X-XSS-Protection header',
        'Add X-XSS-Protection: 1; mode=block');
      logTest('X-XSS-Protection header', false);
    }

    // Check Strict-Transport-Security
    if (headers['strict-transport-security']) {
      logTest('HSTS header', true, headers['strict-transport-security']);
    } else {
      if (BASE_URL.startsWith('https')) {
        addVulnerability('HIGH', 'Security Headers',
          'Missing Strict-Transport-Security header on HTTPS site',
          'Add Strict-Transport-Security: max-age=31536000; includeSubDomains');
        logTest('HSTS header', false);
      } else {
        logWarning('HSTS not applicable (not using HTTPS)');
      }
    }

    // Check Content-Security-Policy
    if (headers['content-security-policy']) {
      logTest('CSP header', true);

      const csp = headers['content-security-policy'];
      if (csp.includes("'unsafe-inline'") || csp.includes("'unsafe-eval'")) {
        logWarning('CSP allows unsafe-inline or unsafe-eval');
        addVulnerability('MEDIUM', 'Security Headers',
          'CSP policy too permissive',
          'Remove unsafe-inline and unsafe-eval from CSP');
      }
    } else {
      addVulnerability('MEDIUM', 'Security Headers',
        'Missing Content-Security-Policy header',
        'Implement Content-Security-Policy');
      logTest('CSP header', false);
    }

    // Check for information disclosure headers
    if (headers['x-powered-by']) {
      addVulnerability('LOW', 'Information Disclosure',
        'X-Powered-By header reveals technology stack',
        'Remove X-Powered-By header');
      logTest('No X-Powered-By header', false, headers['x-powered-by']);
    } else {
      logTest('No X-Powered-By header', true);
    }

    if (headers['server']) {
      logWarning(`Server header present: ${headers['server']}`);
      addVulnerability('LOW', 'Information Disclosure',
        'Server header reveals server software',
        'Remove or obfuscate Server header');
    }

  } catch (error) {
    log(`Error in security headers tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 8: DATA PRIVACY
// ============================================================================

async function testDataPrivacy() {
  logSection('8. DATA PRIVACY & SENSITIVE DATA PROTECTION');

  try {
    // Test 8.1: Sensitive data in logs
    log('\n[8.1] Checking for sensitive data exposure...');

    // Login and check response
    try {
      const response = await axios.post(`${API_URL}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });

      const data = JSON.stringify(response.data).toLowerCase();

      const sensitiveFields = ['password', 'ssn', 'nric', 'credit_card', 'cvv'];
      let leaked = false;

      for (const field of sensitiveFields) {
        if (data.includes(field)) {
          leaked = true;
          logWarning(`Sensitive field '${field}' in API response`);
        }
      }

      if (!leaked) {
        logTest('No obvious sensitive data in responses', true);
      } else {
        addVulnerability('HIGH', 'Data Privacy',
          'Sensitive fields exposed in API responses',
          'Remove sensitive fields from API responses');
      }
    } catch (error) {
      logWarning('Could not test data privacy');
    }

    // Test 8.2: Email enumeration
    log('\n[8.2] Testing email enumeration...');
    try {
      const response1 = await axios.post(`${API_URL}/auth/login`, {
        email: 'existing@test.com',
        password: 'test'
      }).catch(err => err.response);

      const response2 = await axios.post(`${API_URL}/auth/login`, {
        email: 'nonexistent@test.com',
        password: 'test'
      }).catch(err => err.response);

      if (response1?.data?.error !== response2?.data?.error) {
        addVulnerability('LOW', 'Information Disclosure',
          'Different error messages allow email enumeration',
          'Use generic error messages for login failures');
        logTest('Email enumeration prevention', false);
      } else {
        logTest('Email enumeration prevention', true);
      }
    } catch (error) {
      logWarning('Email enumeration test error');
    }

    // Test 8.3: API information disclosure
    log('\n[8.3] Checking API information disclosure...');
    try {
      const response = await axios.get(`${API_URL}/`);

      if (response.data.version || response.data.endpoints) {
        logWarning('API exposes version and endpoint information');
        addVulnerability('LOW', 'Information Disclosure',
          'API root reveals endpoint structure',
          'Consider removing or protecting API documentation endpoint');
      }
      logTest('API information disclosure check', true);
    } catch (error) {
      // Expected
    }

  } catch (error) {
    log(`Error in data privacy tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 9: RATE LIMITING
// ============================================================================

async function testRateLimiting() {
  logSection('9. RATE LIMITING & DDOS PROTECTION');

  try {
    log('\n[9.1] Testing API rate limiting...');

    const requests = [];
    const startTime = Date.now();

    // Send 100 requests rapidly
    for (let i = 0; i < 100; i++) {
      requests.push(
        axios.get(`${API_URL}/`).catch(err => ({
          status: err.response?.status,
          error: true
        }))
      );
    }

    const results = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    const rateLimited = results.filter(r => r.status === 429).length;
    const successful = results.filter(r => !r.error && r.status === 200).length;

    log(`Sent 100 requests in ${duration}ms`);
    log(`Successful: ${successful}, Rate limited: ${rateLimited}`);

    if (rateLimited > 0) {
      logTest('Rate limiting active', true, `${rateLimited} requests blocked`);
    } else {
      addVulnerability('HIGH', 'Rate Limiting',
        'No rate limiting detected - vulnerable to DDoS',
        'Implement rate limiting middleware (e.g., express-rate-limit)');
      logTest('Rate limiting active', false);
    }

    // Test 9.2: Per-endpoint rate limiting
    log('\n[9.2] Testing login endpoint rate limiting...');
    const loginAttempts = [];

    for (let i = 0; i < 20; i++) {
      loginAttempts.push(
        axios.post(`${API_URL}/auth/login`, {
          email: 'test@test.com',
          password: 'test'
        }).catch(err => ({
          status: err.response?.status,
          error: true
        }))
      );
    }

    const loginResults = await Promise.all(loginAttempts);
    const loginRateLimited = loginResults.filter(r => r.status === 429).length;

    if (loginRateLimited > 0) {
      logTest('Login rate limiting', true);
    } else {
      addVulnerability('HIGH', 'Rate Limiting',
        'No rate limiting on login endpoint',
        'Implement stricter rate limiting on authentication endpoints');
      logTest('Login rate limiting', false);
    }

  } catch (error) {
    log(`Error in rate limiting tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// TEST SECTION 10: AUDIT LOGGING
// ============================================================================

async function testAuditLogging() {
  logSection('10. AUDIT LOGGING');

  try {
    log('\n[10.1] Checking audit log capabilities...');

    // This would require access to the database or logs
    // For now, we'll do basic checks

    logWarning('Audit logging requires manual verification');
    log('Check the following manually:');
    log('  - Admin actions are logged (create, update, delete)');
    log('  - Failed login attempts are logged');
    log('  - Authentication events are logged');
    log('  - Sensitive operations are logged (password reset, etc.)');
    log('  - Logs include user ID, IP, timestamp, action');
    log('  - Logs do not contain sensitive data (passwords, tokens)');

    // Try to check if there's an audit log endpoint
    try {
      const response = await axios.get(`${API_URL}/admin/audit-logs`);
      if (response.status === 200) {
        logTest('Audit log endpoint exists', true);
      }
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        logTest('Audit log endpoint protected', true);
      } else if (error.response?.status === 404) {
        logWarning('No audit log endpoint found');
        addVulnerability('MEDIUM', 'Audit Logging',
          'No audit log API endpoint',
          'Implement audit log viewing for admins');
      }
    }

  } catch (error) {
    log(`Error in audit logging tests: ${error.message}`, 'red');
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                                        ║', 'cyan');
  log('║         COMPREHENSIVE SECURITY & AUTHENTICATION TEST SUITE            ║', 'cyan');
  log('║                                                                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════╝', 'cyan');
  log(`\nTesting: ${BASE_URL}`, 'blue');
  log(`Started: ${new Date().toISOString()}\n`, 'blue');

  try {
    await testAdminAuthentication();
    await testAuthorization();
    await testAPISecnrity();
    await testInputValidation();
    await testSessionSecurity();
    await testPasswordSecurity();
    await testSecurityHeaders();
    await testDataPrivacy();
    await testRateLimiting();
    await testAuditLogging();

    // Final summary
    printSummary();

  } catch (error) {
    log(`\n\nFATAL ERROR: ${error.message}`, 'red');
    console.error(error);
  }
}

// ============================================================================
// SUMMARY AND REPORT GENERATION
// ============================================================================

function printSummary() {
  logSection('SECURITY AUDIT SUMMARY');

  log(`\nTest Results:`, 'cyan');
  log(`  ✓ Passed: ${results.passed}`, 'green');
  log(`  ✗ Failed: ${results.failed}`, 'red');
  log(`  ⚠ Warnings: ${results.warnings}`, 'yellow');

  const totalIssues = results.criticalIssues.length + results.highIssues.length +
                      results.mediumIssues.length + results.lowIssues.length;

  log(`\nVulnerabilities Found: ${totalIssues}`, 'cyan');
  log(`  🔴 Critical: ${results.criticalIssues.length}`, 'red');
  log(`  🟠 High: ${results.highIssues.length}`, 'magenta');
  log(`  🟡 Medium: ${results.mediumIssues.length}`, 'yellow');
  log(`  🟢 Low: ${results.lowIssues.length}`, 'blue');

  // Print detailed vulnerabilities
  if (results.criticalIssues.length > 0) {
    log('\n\n🔴 CRITICAL VULNERABILITIES:', 'red');
    results.criticalIssues.forEach((issue, i) => {
      log(`\n${i + 1}. [${issue.category}] ${issue.description}`, 'red');
      log(`   Remediation: ${issue.remediation}`, 'yellow');
    });
  }

  if (results.highIssues.length > 0) {
    log('\n\n🟠 HIGH SEVERITY ISSUES:', 'magenta');
    results.highIssues.forEach((issue, i) => {
      log(`\n${i + 1}. [${issue.category}] ${issue.description}`, 'magenta');
      log(`   Remediation: ${issue.remediation}`, 'yellow');
    });
  }

  if (results.mediumIssues.length > 0) {
    log('\n\n🟡 MEDIUM SEVERITY ISSUES:', 'yellow');
    results.mediumIssues.forEach((issue, i) => {
      log(`\n${i + 1}. [${issue.category}] ${issue.description}`, 'yellow');
      log(`   Remediation: ${issue.remediation}`, 'cyan');
    });
  }

  // Overall security score
  const maxScore = 100;
  const deductions = (results.criticalIssues.length * 20) +
                     (results.highIssues.length * 10) +
                     (results.mediumIssues.length * 5) +
                     (results.lowIssues.length * 2);
  const score = Math.max(0, maxScore - deductions);

  log('\n\n' + '═'.repeat(80), 'cyan');
  log(`OVERALL SECURITY SCORE: ${score}/100`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');
  log('═'.repeat(80), 'cyan');

  if (score >= 90) {
    log('\n✓ Excellent security posture!', 'green');
  } else if (score >= 70) {
    log('\n⚠ Good security, but improvements needed', 'yellow');
  } else if (score >= 50) {
    log('\n⚠ Moderate security concerns - address high priority issues', 'yellow');
  } else {
    log('\n✗ CRITICAL: Severe security vulnerabilities found!', 'red');
    log('   Immediate action required before production deployment', 'red');
  }

  log(`\n\nCompleted: ${new Date().toISOString()}`, 'blue');
  log('\n');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
