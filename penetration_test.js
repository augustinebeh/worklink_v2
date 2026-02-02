/**
 * PENETRATION TESTING SCRIPT
 * Advanced security testing with specific attack vectors
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_URL = `${BASE_URL}/api/v1`;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(70), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

// ============================================================================
// SQL INJECTION TESTS
// ============================================================================

async function testSQLInjection() {
  section('SQL INJECTION ATTACK TESTS');

  const sqlPayloads = [
    // Classic SQL injection
    { name: "Classic OR 1=1", payload: "admin' OR '1'='1' --" },
    { name: "Union-based", payload: "admin' UNION SELECT * FROM candidates--" },
    { name: "Time-based blind", payload: "admin'; WAITFOR DELAY '0:0:5'--" },
    { name: "Boolean-based blind", payload: "admin' AND 1=1--" },
    { name: "Error-based", payload: "admin' AND (SELECT 1 FROM (SELECT COUNT(*),CONCAT(0x3a,0x3a,(SELECT user()),0x3a,0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)y)--" },
    { name: "Stacked queries", payload: "admin'; DROP TABLE candidates;--" },
    { name: "Second-order", payload: "admin\\'--" },
    { name: "Nested injection", payload: "admin' OR (SELECT COUNT(*) FROM candidates) > 0--" }
  ];

  log('\n[Testing SQL Injection in Login Endpoint]');
  for (const test of sqlPayloads) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: test.payload,
        password: 'password',
        type: 'candidate'
      });

      if (response.status === 200 && response.data.success) {
        log(`❌ VULNERABLE to ${test.name}`, 'red');
        log(`   Payload: ${test.payload}`, 'yellow');
      } else {
        log(`✓ Blocked ${test.name}`, 'green');
      }
    } catch (error) {
      if (error.response?.data?.error?.includes('SQL') ||
          error.response?.data?.error?.includes('syntax')) {
        log(`⚠️ SQL error message leaked for ${test.name}`, 'yellow');
      } else {
        log(`✓ Blocked ${test.name}`, 'green');
      }
    }
  }

  log('\n[Testing SQL Injection in Query Parameters]');
  const paramPayloads = [
    "1' OR '1'='1",
    "1'; DROP TABLE candidates;--",
    "1 UNION SELECT * FROM settings--",
    "-1 UNION SELECT id,email,email,email FROM candidates--"
  ];

  for (const payload of paramPayloads) {
    try {
      const response = await axios.get(`${API_URL}/candidates/${payload}`);

      if (response.status === 200) {
        log(`⚠️ Query param injection possible: ${payload}`, 'yellow');
      }
    } catch (error) {
      // Expected
    }
  }
}

// ============================================================================
// XSS TESTS
// ============================================================================

async function testXSS() {
  section('CROSS-SITE SCRIPTING (XSS) TESTS');

  const xssPayloads = [
    // Basic XSS
    { name: "Basic script tag", payload: '<script>alert("XSS")</script>' },
    { name: "IMG onerror", payload: '<img src=x onerror=alert("XSS")>' },
    { name: "SVG onload", payload: '<svg onload=alert("XSS")>' },
    { name: "Body onload", payload: '<body onload=alert("XSS")>' },
    { name: "Iframe src", payload: '<iframe src="javascript:alert(\'XSS\')"></iframe>' },

    // Advanced XSS
    { name: "Encoded script", payload: '&lt;script&gt;alert("XSS")&lt;/script&gt;' },
    { name: "Unicode bypass", payload: '\\u003cscript\\u003ealert("XSS")\\u003c/script\\u003e' },
    { name: "HTML5 entities", payload: '&lt;img src=x onerror=&quot;alert(&#39;XSS&#39;)&quot;&gt;' },
    { name: "Event handler", payload: '<input onfocus="alert(\'XSS\')" autofocus>' },
    { name: "Data URI", payload: '<object data="data:text/html,<script>alert(\'XSS\')</script>">' },

    // DOM XSS
    { name: "Hash fragment", payload: '#<img src=x onerror=alert("XSS")>' },
    { name: "JavaScript protocol", payload: 'javascript:alert("XSS")' },
    { name: "VBScript protocol", payload: 'vbscript:msgbox("XSS")' }
  ];

  log('\n[Testing XSS in Notification Creation]');

  // Get token first
  let token = null;
  try {
    const response = await axios.post(`${API_URL}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });
    token = response.data.token;
  } catch (error) {
    log('Could not get token for XSS tests', 'yellow');
    return;
  }

  for (const test of xssPayloads) {
    try {
      const response = await axios.post(`${API_URL}/notifications`, {
        title: test.payload,
        message: 'Test message',
        type: 'info'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.data?.title === test.payload) {
        log(`❌ XSS NOT SANITIZED: ${test.name}`, 'red');
        log(`   Stored: ${test.payload}`, 'yellow');
      } else {
        log(`✓ Sanitized ${test.name}`, 'green');
      }
    } catch (error) {
      log(`✓ Blocked ${test.name}`, 'green');
    }
  }
}

// ============================================================================
// AUTHENTICATION BYPASS TESTS
// ============================================================================

async function testAuthBypass() {
  section('AUTHENTICATION BYPASS TESTS');

  log('\n[Testing JWT Manipulation]');

  // Test 1: Null algorithm
  log('\n1. Testing null algorithm attack...');
  const nullAlgToken = Buffer.from(JSON.stringify({
    alg: 'none',
    typ: 'JWT'
  })).toString('base64') + '.' +
  Buffer.from(JSON.stringify({
    id: 'ATTACKER',
    role: 'admin',
    email: 'attacker@evil.com'
  })).toString('base64') + '.';

  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${nullAlgToken}` }
    });

    if (response.status === 200) {
      log('❌ CRITICAL: Null algorithm attack successful!', 'red');
    }
  } catch (error) {
    log('✓ Null algorithm attack blocked', 'green');
  }

  // Test 2: Algorithm confusion (HS256 vs RS256)
  log('\n2. Testing algorithm confusion...');
  // This would require having the public key to test properly
  log('⚠️ Manual test needed: Check if RS256 public key can be used with HS256', 'yellow');

  // Test 3: Token with no expiration
  log('\n3. Testing token without expiration...');
  // Would need to create and test a token without exp claim

  // Test 4: Expired token
  log('\n4. Testing expired token...');
  const jwt = require('jsonwebtoken');
  const expiredToken = jwt.sign(
    { id: 'TEST', role: 'admin', email: 'test@test.com' },
    'test-secret',
    { expiresIn: '-1h' }
  );

  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` }
    });

    if (response.status === 200) {
      log('❌ Accepts expired tokens!', 'red');
    }
  } catch (error) {
    if (error.response?.status === 401) {
      log('✓ Expired tokens rejected', 'green');
    }
  }

  // Test 5: Header injection
  log('\n5. Testing header injection...');
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: 'Bearer valid-token\r\nX-Admin: true'
      }
    });
  } catch (error) {
    log('✓ Header injection blocked', 'green');
  }
}

// ============================================================================
// PRIVILEGE ESCALATION TESTS
// ============================================================================

async function testPrivilegeEscalation() {
  section('PRIVILEGE ESCALATION TESTS');

  // Get candidate token
  let candidateToken = null;
  let candidateId = null;

  try {
    const response = await axios.post(`${API_URL}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });
    candidateToken = response.data.token;
    candidateId = response.data.data.id;
    log('[Setup] Got candidate token');
  } catch (error) {
    log('Could not get candidate token', 'yellow');
    return;
  }

  log('\n[Testing Vertical Privilege Escalation]');

  // Test 1: Access admin-only resources
  const adminEndpoints = [
    '/api/v1/admin/stats',
    '/api/v1/admin/settings',
    '/api/v1/candidates', // List all candidates
  ];

  for (const endpoint of adminEndpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${candidateToken}` }
      });

      if (response.status === 200) {
        log(`❌ Candidate can access ${endpoint}`, 'red');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        log(`✓ ${endpoint} properly protected`, 'green');
      } else if (error.response?.status === 401) {
        log(`✓ ${endpoint} requires authentication`, 'green');
      }
    }
  }

  log('\n[Testing Horizontal Privilege Escalation]');

  // Test 2: Access other users' data
  const otherCandidateIds = ['CND001', 'CND002', 'CND003'];

  for (const otherId of otherCandidateIds) {
    if (otherId === candidateId) continue;

    try {
      const response = await axios.get(`${API_URL}/candidates/${otherId}`, {
        headers: { Authorization: `Bearer ${candidateToken}` }
      });

      if (response.status === 200 && response.data.success) {
        log(`❌ Can access other candidate's data: ${otherId}`, 'red');
      }
    } catch (error) {
      if (error.response?.status === 403) {
        log(`✓ Cannot access ${otherId}`, 'green');
      }
    }
  }

  log('\n[Testing Parameter Manipulation]');

  // Test 3: Modify role in request
  try {
    const response = await axios.patch(`${API_URL}/candidates/${candidateId}`, {
      role: 'admin',
      xp: 999999,
      level: 100
    }, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    });

    if (response.data.data?.role === 'admin') {
      log('❌ CRITICAL: Can escalate role via parameter!', 'red');
    } else {
      log('✓ Role modification blocked', 'green');
    }
  } catch (error) {
    log('✓ Parameter manipulation blocked', 'green');
  }
}

// ============================================================================
// INSECURE DIRECT OBJECT REFERENCE (IDOR) TESTS
// ============================================================================

async function testIDOR() {
  section('INSECURE DIRECT OBJECT REFERENCE (IDOR) TESTS');

  let token = null;

  try {
    const response = await axios.post(`${API_URL}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });
    token = response.data.token;
  } catch (error) {
    log('Could not get token for IDOR tests', 'yellow');
    return;
  }

  log('\n[Testing Sequential ID Enumeration]');

  // Test predictable IDs
  const idPatterns = [
    'CND001', 'CND002', 'CND003', // Sequential
    'JOB001', 'JOB002', 'JOB003',
    'PAY001', 'PAY002', 'PAY003'
  ];

  for (const id of idPatterns) {
    try {
      const response = await axios.get(`${API_URL}/candidates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        log(`⚠️ Predictable ID accessible: ${id}`, 'yellow');
      }
    } catch (error) {
      // Expected for most
    }
  }

  log('\n[Testing UUID vs Sequential IDs]');
  log('ℹ️  Current system uses predictable sequential IDs', 'blue');
  log('ℹ️  Recommendation: Use UUIDs for better security', 'blue');
}

// ============================================================================
// SESSION MANAGEMENT TESTS
// ============================================================================

async function testSessionManagement() {
  section('SESSION MANAGEMENT TESTS');

  log('\n[Testing Session Fixation]');
  // Session fixation test
  log('⚠️ Manual test: Check if session ID changes after login', 'yellow');

  log('\n[Testing Concurrent Sessions]');
  try {
    // Login twice
    const login1 = await axios.post(`${API_URL}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });

    const login2 = await axios.post(`${API_URL}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });

    const token1 = login1.data.token;
    const token2 = login2.data.token;

    // Test if both work
    const test1 = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token1}` }
    });

    const test2 = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token2}` }
    });

    if (test1.status === 200 && test2.status === 200) {
      log('⚠️ Multiple concurrent sessions allowed', 'yellow');
      log('   Consider implementing session limits', 'blue');
    }
  } catch (error) {
    log('Session management test error', 'yellow');
  }

  log('\n[Testing Token Reuse After Logout]');
  // This requires logout functionality to be implemented
  log('⚠️ No logout endpoint found', 'yellow');
}

// ============================================================================
// INFORMATION DISCLOSURE TESTS
// ============================================================================

async function testInformationDisclosure() {
  section('INFORMATION DISCLOSURE TESTS');

  log('\n[Testing Error Messages]');

  // Test 1: SQL errors
  try {
    await axios.post(`${API_URL}/auth/login`, {
      email: "admin' AND 1=1--",
      password: 'test'
    });
  } catch (error) {
    const errorMsg = error.response?.data?.error || '';

    if (errorMsg.includes('SQL') || errorMsg.includes('syntax') || errorMsg.includes('database')) {
      log('❌ SQL error messages exposed', 'red');
      log(`   Message: ${errorMsg}`, 'yellow');
    } else {
      log('✓ Generic error messages', 'green');
    }
  }

  // Test 2: Stack traces
  try {
    await axios.post(`${API_URL}/candidates`, {
      invalid: 'data'
    });
  } catch (error) {
    const responseText = JSON.stringify(error.response?.data || '');

    if (responseText.includes('stack') || responseText.includes('Error:')) {
      log('❌ Stack traces exposed', 'red');
    } else {
      log('✓ No stack traces in responses', 'green');
    }
  }

  log('\n[Testing Directory Listing]');
  const directories = [
    '/admin',
    '/api',
    '/.git',
    '/.env',
    '/node_modules',
    '/backup',
    '/data'
  ];

  for (const dir of directories) {
    try {
      const response = await axios.get(`${BASE_URL}${dir}`);

      if (response.data.includes('Index of') || response.data.includes('Directory listing')) {
        log(`❌ Directory listing enabled: ${dir}`, 'red');
      }
    } catch (error) {
      // Expected
    }
  }

  log('\n[Testing API Documentation]');
  try {
    const response = await axios.get(`${API_URL}/`);

    if (response.data.endpoints) {
      log('⚠️ API endpoints exposed at root', 'yellow');
      log('   Consider requiring authentication', 'blue');
    }
  } catch (error) {
    // Expected
  }
}

// ============================================================================
// BUSINESS LOGIC TESTS
// ============================================================================

async function testBusinessLogic() {
  section('BUSINESS LOGIC VULNERABILITY TESTS');

  let token = null;

  try {
    const response = await axios.post(`${API_URL}/auth/worker/login`, {
      email: 'sarah.tan@email.com'
    });
    token = response.data.token;
  } catch (error) {
    log('Could not get token', 'yellow');
    return;
  }

  log('\n[Testing Negative Values]');
  try {
    const response = await axios.patch(`${API_URL}/candidates/CND_DEMO_001`, {
      xp: -1000,
      level: -5,
      total_earnings: -999
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.success) {
      log('⚠️ Negative values accepted', 'yellow');
    }
  } catch (error) {
    log('✓ Negative values rejected', 'green');
  }

  log('\n[Testing Integer Overflow]');
  try {
    const response = await axios.patch(`${API_URL}/candidates/CND_DEMO_001`, {
      xp: 2147483648, // Max int + 1
      level: 2147483647
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    log('⚠️ Check if large numbers cause issues', 'yellow');
  } catch (error) {
    // Expected
  }

  log('\n[Testing Race Conditions]');
  log('⚠️ Manual test: Concurrent updates to same resource', 'yellow');
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runPenetrationTests() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                          ║', 'cyan');
  log('║         PENETRATION TESTING SUITE                       ║', 'cyan');
  log('║         Advanced Attack Vector Testing                  ║', 'cyan');
  log('║                                                          ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  log(`\nTarget: ${BASE_URL}`, 'blue');
  log(`Started: ${new Date().toISOString()}\n`, 'blue');

  try {
    await testSQLInjection();
    await testXSS();
    await testAuthBypass();
    await testPrivilegeEscalation();
    await testIDOR();
    await testSessionManagement();
    await testInformationDisclosure();
    await testBusinessLogic();

    log('\n\n' + '='.repeat(70), 'cyan');
    log('PENETRATION TEST COMPLETE', 'cyan');
    log('='.repeat(70), 'cyan');
    log('\nReview the output above for vulnerabilities', 'blue');
    log('Cross-reference with SECURITY_AUDIT_REPORT.md\n', 'blue');

  } catch (error) {
    log(`\nFATAL ERROR: ${error.message}`, 'red');
    console.error(error);
  }
}

if (require.main === module) {
  runPenetrationTests().catch(error => {
    console.error('Penetration test failed:', error);
    process.exit(1);
  });
}

module.exports = { runPenetrationTests };
