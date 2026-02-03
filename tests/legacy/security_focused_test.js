#!/usr/bin/env node
/**
 * Security-Focused Testing for WorkLink API
 * Deep dive into security vulnerabilities and attack vectors
 */

const https = require('https');
const http = require('http');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

let securityFindings = [];
let testCount = 0;

function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WorkLink-Security-Test/1.0',
        ...headers
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const parsedBody = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(body)
            : body;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            raw: body,
            responseTime: responseTime
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            raw: body,
            responseTime: responseTime,
            parseError: parseError.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject({ error: err.message, responseTime: Date.now() - startTime });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function logSecurity(finding) {
  testCount++;
  securityFindings.push({
    id: testCount,
    ...finding,
    timestamp: new Date().toISOString()
  });

  const severityIcons = {
    CRITICAL: '🚨',
    HIGH: '🔴',
    MEDIUM: '🟡',
    LOW: '🔵',
    INFO: 'ℹ️'
  };

  const icon = severityIcons[finding.severity] || 'ℹ️';
  console.log(`${icon} [${finding.severity}] ${finding.title}`);
  console.log(`   ${finding.description}`);
  if (finding.evidence) {
    console.log(`   Evidence: ${finding.evidence}`);
  }
  if (finding.impact) {
    console.log(`   Impact: ${finding.impact}`);
  }
  console.log(`   CVSS Score: ${finding.cvssScore || 'N/A'}`);
  console.log('');
}

// Comprehensive CORS Testing
async function testCORS() {
  console.log('🔐 CORS Security Analysis');
  console.log('='.repeat(40));

  const maliciousOrigins = [
    'https://evil.com',
    'https://attacker.site',
    'https://phishing.example',
    'null',
    'file://',
    'data:text/html,<script>alert(1)</script>'
  ];

  for (const origin of maliciousOrigins) {
    try {
      const response = await makeRequest('OPTIONS', `${API_BASE}/auth/login`, null, {
        'Origin': origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      });

      const allowedOrigin = response.headers['access-control-allow-origin'];
      const allowsCredentials = response.headers['access-control-allow-credentials'];

      if (allowedOrigin === origin || allowedOrigin === '*') {
        logSecurity({
          title: `CORS Policy Allows Malicious Origin: ${origin}`,
          severity: 'HIGH',
          description: `Server accepts requests from potentially malicious origin ${origin}`,
          evidence: `Access-Control-Allow-Origin: ${allowedOrigin}`,
          impact: 'Enables cross-origin attacks, potential data theft',
          cvssScore: 7.5,
          remediation: 'Implement strict origin whitelist',
          endpoint: '/api/v1/auth/login'
        });
      }

      if (allowsCredentials === 'true' && (allowedOrigin === '*' || allowedOrigin === origin)) {
        logSecurity({
          title: 'CORS Credentials Exposed to Untrusted Origins',
          severity: 'CRITICAL',
          description: 'Server allows credentials with wildcard or malicious origins',
          evidence: `Access-Control-Allow-Credentials: ${allowsCredentials}`,
          impact: 'Session hijacking, authentication bypass',
          cvssScore: 9.1,
          remediation: 'Never use credentials:true with wildcard origins'
        });
      }
    } catch (error) {
      // Connection errors are expected for some tests
    }
  }
}

// SQL Injection Testing
async function testSQLInjection() {
  console.log('🔐 SQL Injection Analysis');
  console.log('='.repeat(40));

  const sqlPayloads = [
    // Classic SQL injection
    { payload: "' OR '1'='1", description: 'Basic OR injection' },
    { payload: "'; DROP TABLE candidates; --", description: 'Destructive injection' },
    { payload: "' UNION SELECT * FROM users --", description: 'Union-based injection' },
    { payload: "admin'--", description: 'Comment injection' },
    { payload: "admin'/*", description: 'Multi-line comment injection' },
    { payload: "' OR 1=1--", description: 'Numeric OR injection' },
    { payload: "') OR ('1'='1", description: 'Parenthesis bypass' },

    // Time-based blind injection
    { payload: "'; WAITFOR DELAY '00:00:05'; --", description: 'Time delay injection (SQL Server)' },
    { payload: "' OR pg_sleep(5) --", description: 'Time delay injection (PostgreSQL)' },
    { payload: "' OR SLEEP(5) --", description: 'Time delay injection (MySQL)' },

    // Advanced techniques
    { payload: "' AND (SELECT COUNT(*) FROM information_schema.tables)>0 --", description: 'Schema enumeration' },
    { payload: "' AND (SELECT LENGTH(database()))>0 --", description: 'Database name extraction' },
  ];

  const endpoints = [
    { url: `${API_BASE}/auth/login`, method: 'POST', params: { email: 'PAYLOAD', password: 'PAYLOAD' }},
    { url: `${API_BASE}/auth/worker/login`, method: 'POST', params: { email: 'PAYLOAD', phone: 'PAYLOAD' }},
    { url: `${API_BASE}/candidates`, method: 'GET', params: { search: 'PAYLOAD' }}
  ];

  for (const endpoint of endpoints) {
    for (const { payload, description } of sqlPayloads) {
      try {
        let testData = { ...endpoint.params };

        // Replace PAYLOAD with actual SQL injection payload
        for (let key in testData) {
          if (testData[key] === 'PAYLOAD') {
            testData[key] = payload;
          }
        }

        const startTime = Date.now();
        const response = await makeRequest(endpoint.method, endpoint.url,
          endpoint.method === 'POST' ? testData : null);
        const responseTime = Date.now() - startTime;

        // Check for SQL injection indicators
        const vulnerabilityIndicators = [
          // Database errors
          /sql|sqlite|mysql|postgresql|oracle/i,
          /syntax error|near|column|table.*doesn't exist/i,
          /ORA-\d+|MySQL.*Error/i,

          // Successful injections (dangerous!)
          /admin.*administrator/i,
          /welcome.*admin/i,
        ];

        const responseText = JSON.stringify(response.body).toLowerCase();

        for (const indicator of vulnerabilityIndicators) {
          if (indicator.test(responseText)) {
            logSecurity({
              title: `SQL Injection Vulnerability Detected`,
              severity: 'CRITICAL',
              description: `${description} - Database error or successful injection detected`,
              evidence: `Payload: ${payload}, Response: ${responseText.substring(0, 200)}...`,
              impact: 'Data breach, database manipulation, system compromise',
              cvssScore: 9.8,
              remediation: 'Use parameterized queries, input validation',
              endpoint: endpoint.url
            });
            break;
          }
        }

        // Time-based detection
        if (responseTime > 4000) {
          logSecurity({
            title: `Potential Time-based SQL Injection`,
            severity: 'HIGH',
            description: `Unusually long response time suggests time-based injection`,
            evidence: `Response time: ${responseTime}ms with payload: ${payload}`,
            impact: 'Information disclosure, database enumeration',
            cvssScore: 7.5,
            remediation: 'Implement query timeouts, parameterized queries',
            endpoint: endpoint.url
          });
        }

        // Successful authentication (dangerous!)
        if (response.status === 200 && response.body?.success && response.body?.token) {
          logSecurity({
            title: `Authentication Bypass via SQL Injection`,
            severity: 'CRITICAL',
            description: `Authentication bypassed using SQL injection payload`,
            evidence: `Payload: ${payload}, Received token: ${response.body.token}`,
            impact: 'Complete authentication bypass, account takeover',
            cvssScore: 10.0,
            remediation: 'Immediate fix required - parameterized queries',
            endpoint: endpoint.url
          });
        }

      } catch (error) {
        // Network errors are expected for destructive payloads
      }
    }
  }
}

// Cross-Site Scripting (XSS) Testing
async function testXSS() {
  console.log('🔐 XSS Vulnerability Analysis');
  console.log('='.repeat(40));

  const xssPayloads = [
    // Basic XSS
    { payload: "<script>alert('XSS')</script>", type: 'Script tag injection' },
    { payload: "<img src=x onerror=alert('XSS')>", type: 'Image onerror injection' },
    { payload: "<svg onload=alert('XSS')>", type: 'SVG onload injection' },
    { payload: "javascript:alert('XSS')", type: 'JavaScript protocol injection' },
    { payload: "'><script>alert('XSS')</script>", type: 'Quote escape injection' },
    { payload: "\"><script>alert('XSS')</script>", type: 'Double quote escape injection' },

    // Advanced XSS
    { payload: "<iframe src=javascript:alert('XSS')></iframe>", type: 'Iframe javascript injection' },
    { payload: "<object data=data:text/html,<script>alert('XSS')</script>>", type: 'Object data injection' },
    { payload: "<details open ontoggle=alert('XSS')>", type: 'HTML5 event injection' },
    { payload: "<math><mi//xlink:href=\"data:x,<script>alert('XSS')</script>\">", type: 'MathML injection' },

    // Filter bypass attempts
    { payload: "<scr<script>ipt>alert('XSS')</scr</script>ipt>", type: 'Nested tag bypass' },
    { payload: "<SCRIPT>alert('XSS')</SCRIPT>", type: 'Case variation bypass' },
    { payload: "&#60;script&#62;alert('XSS')&#60;/script&#62;", type: 'HTML entity bypass' },
    { payload: "%3Cscript%3Ealert('XSS')%3C/script%3E", type: 'URL encoding bypass' }
  ];

  const endpoints = [
    { url: `${API_BASE}/auth/register`, method: 'POST',
      params: { name: 'PAYLOAD', email: 'EMAIL_PLACEHOLDER', phone: '+65 9123 4567' }},
    { url: `${API_BASE}/auth/telegram/login`, method: 'POST',
      params: { first_name: 'PAYLOAD', last_name: 'Test', username: 'testuser' }},
  ];

  let emailCounter = Date.now();

  for (const endpoint of endpoints) {
    for (const { payload, type } of xssPayloads) {
      try {
        let testData = { ...endpoint.params };

        // Replace placeholders
        for (let key in testData) {
          if (testData[key] === 'PAYLOAD') {
            testData[key] = payload;
          }
          if (testData[key] === 'EMAIL_PLACEHOLDER') {
            testData[key] = `xss${emailCounter++}@test.com`;
          }
        }

        const response = await makeRequest(endpoint.method, endpoint.url, testData);

        // Check if XSS payload is reflected in response
        if (response.raw && response.raw.includes(payload)) {
          logSecurity({
            title: `Reflected XSS Vulnerability`,
            severity: 'HIGH',
            description: `${type} - XSS payload reflected without encoding`,
            evidence: `Payload: ${payload}`,
            impact: 'Session hijacking, credential theft, malicious redirects',
            cvssScore: 8.2,
            remediation: 'Implement output encoding, Content Security Policy',
            endpoint: endpoint.url
          });
        }

        // Check if payload is stored (check via subsequent request if possible)
        if (response.status === 200 && response.body?.success && response.body?.data) {
          const userData = JSON.stringify(response.body.data);
          if (userData.includes(payload)) {
            logSecurity({
              title: `Stored XSS Vulnerability`,
              severity: 'CRITICAL',
              description: `${type} - XSS payload stored in database without sanitization`,
              evidence: `Stored payload: ${payload}`,
              impact: 'Persistent XSS attacks, compromise of all users accessing data',
              cvssScore: 9.6,
              remediation: 'Sanitize input before storage, encode output',
              endpoint: endpoint.url
            });
          }
        }

      } catch (error) {
        // Network errors are not security issues
      }
    }
  }
}

// Input Validation Testing
async function testInputValidation() {
  console.log('🔐 Input Validation Analysis');
  console.log('='.repeat(40));

  const maliciousInputs = [
    // Extremely long strings (buffer overflow potential)
    { input: 'A'.repeat(1000000), type: 'Buffer overflow attempt' },
    { input: 'A'.repeat(10000), type: 'Long string injection' },

    // Special characters and encoding
    { input: '../../../etc/passwd', type: 'Path traversal attempt' },
    { input: '..\\..\\..\\windows\\system32\\config', type: 'Windows path traversal' },
    { input: '\x00\x01\x02\x03\x04', type: 'Null byte injection' },
    { input: '%00%01%02%03', type: 'URL encoded null bytes' },

    // JSON structure attacks
    { input: '{"__proto__": {"admin": true}}', type: 'Prototype pollution' },
    { input: '{"constructor": {"prototype": {"admin": true}}}', type: 'Constructor manipulation' },

    // Command injection attempts
    { input: '; cat /etc/passwd', type: 'Command injection (Unix)' },
    { input: '| dir C:\\', type: 'Command injection (Windows)' },
    { input: '`cat /etc/passwd`', type: 'Backtick command injection' },
    { input: '$(cat /etc/passwd)', type: 'Subshell command injection' },
  ];

  const testEndpoints = [
    { url: `${API_BASE}/auth/register`, method: 'POST' },
    { url: `${API_BASE}/auth/login`, method: 'POST' }
  ];

  for (const endpoint of testEndpoints) {
    for (const { input, type } of maliciousInputs) {
      try {
        const testData = {
          name: input,
          email: `test${Date.now()}@example.com`,
          phone: input,
          password: input
        };

        const response = await makeRequest(endpoint.method, endpoint.url, testData);

        // Check for successful processing of malicious input
        if (response.status === 200 && response.body?.success) {
          logSecurity({
            title: `Insufficient Input Validation`,
            severity: 'MEDIUM',
            description: `${type} - Malicious input accepted without proper validation`,
            evidence: `Input: ${input.substring(0, 100)}...`,
            impact: 'Potential for various injection attacks',
            cvssScore: 5.4,
            remediation: 'Implement strict input validation and sanitization',
            endpoint: endpoint.url
          });
        }

        // Check for system information disclosure
        if (response.raw && (
          response.raw.includes('/etc/passwd') ||
          response.raw.includes('root:') ||
          response.raw.includes('C:\\Windows') ||
          response.raw.includes('Directory of C:\\')
        )) {
          logSecurity({
            title: `Information Disclosure Vulnerability`,
            severity: 'CRITICAL',
            description: `${type} - System information exposed in response`,
            evidence: `Response contains system data`,
            impact: 'System information disclosure, potential RCE',
            cvssScore: 9.3,
            remediation: 'Implement strict input validation, never execute user input',
            endpoint: endpoint.url
          });
        }

      } catch (error) {
        // Connection errors from malformed input are expected
      }
    }
  }
}

// Session Management Testing
async function testSessionManagement() {
  console.log('🔐 Session Management Analysis');
  console.log('='.repeat(40));

  // Test token predictability
  const tokens = [];

  for (let i = 0; i < 5; i++) {
    try {
      const response = await makeRequest('POST', `${API_BASE}/auth/worker/login`, {
        email: 'sarah.tan@email.com'
      });

      if (response.body?.token) {
        tokens.push(response.body.token);
      }
    } catch (error) {
      // Ignore errors for this test
    }
  }

  // Check for token predictability
  if (tokens.length > 1) {
    const uniqueTokens = [...new Set(tokens)];
    if (uniqueTokens.length < tokens.length) {
      logSecurity({
        title: `Token Reuse Detected`,
        severity: 'HIGH',
        description: 'Authentication tokens are being reused across sessions',
        evidence: `Generated ${tokens.length} tokens, ${uniqueTokens.length} unique`,
        impact: 'Session fixation, token prediction attacks',
        cvssScore: 7.8,
        remediation: 'Generate cryptographically random, unique tokens',
        endpoint: '/api/v1/auth/worker/login'
      });
    }

    // Check token entropy
    const avgLength = tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length;
    if (avgLength < 20) {
      logSecurity({
        title: `Weak Token Generation`,
        severity: 'HIGH',
        description: 'Authentication tokens appear to have low entropy',
        evidence: `Average token length: ${avgLength} characters`,
        impact: 'Token brute force attacks',
        cvssScore: 7.4,
        remediation: 'Use cryptographically strong token generation',
        endpoint: '/api/v1/auth/worker/login'
      });
    }
  }
}

// HTTP Security Headers Testing
async function testSecurityHeaders() {
  console.log('🔐 HTTP Security Headers Analysis');
  console.log('='.repeat(40));

  try {
    const response = await makeRequest('GET', `${API_BASE}/`);
    const headers = response.headers;

    const requiredHeaders = {
      'x-frame-options': { severity: 'MEDIUM', description: 'Clickjacking protection' },
      'x-content-type-options': { severity: 'MEDIUM', description: 'MIME type sniffing protection' },
      'x-xss-protection': { severity: 'LOW', description: 'XSS protection (deprecated but useful)' },
      'strict-transport-security': { severity: 'HIGH', description: 'HTTPS enforcement' },
      'content-security-policy': { severity: 'HIGH', description: 'XSS and injection protection' },
      'referrer-policy': { severity: 'MEDIUM', description: 'Referrer information control' },
      'permissions-policy': { severity: 'MEDIUM', description: 'Browser feature control' }
    };

    for (const [header, config] of Object.entries(requiredHeaders)) {
      if (!headers[header] && !headers[header.toLowerCase()]) {
        logSecurity({
          title: `Missing Security Header: ${header}`,
          severity: config.severity,
          description: `${config.description} - Header not present`,
          evidence: `Missing header: ${header}`,
          impact: 'Increased attack surface for various web attacks',
          cvssScore: config.severity === 'HIGH' ? 6.1 : config.severity === 'MEDIUM' ? 4.3 : 2.1,
          remediation: `Add ${header} header to all responses`,
          endpoint: 'All endpoints'
        });
      }
    }

  } catch (error) {
    logSecurity({
      title: 'Unable to Test Security Headers',
      severity: 'INFO',
      description: 'Could not retrieve headers for analysis',
      evidence: error.error,
      impact: 'Cannot assess header-based protections',
      remediation: 'Ensure server is accessible for testing'
    });
  }
}

// Generate Security Report
function generateSecurityReport() {
  const critical = securityFindings.filter(f => f.severity === 'CRITICAL').length;
  const high = securityFindings.filter(f => f.severity === 'HIGH').length;
  const medium = securityFindings.filter(f => f.severity === 'MEDIUM').length;
  const low = securityFindings.filter(f => f.severity === 'LOW').length;

  // Calculate overall risk score
  const riskScore = critical * 10 + high * 7 + medium * 4 + low * 1;

  let riskLevel;
  if (riskScore >= 50) riskLevel = 'CRITICAL';
  else if (riskScore >= 30) riskLevel = 'HIGH';
  else if (riskScore >= 15) riskLevel = 'MEDIUM';
  else if (riskScore > 0) riskLevel = 'LOW';
  else riskLevel = 'MINIMAL';

  const report = {
    metadata: {
      timestamp: new Date().toISOString(),
      target: BASE_URL,
      testsPerformed: testCount,
      duration: 'N/A'
    },
    summary: {
      totalFindings: securityFindings.length,
      critical,
      high,
      medium,
      low,
      riskScore,
      riskLevel
    },
    findings: securityFindings,
    recommendations: [
      {
        priority: 'IMMEDIATE',
        action: 'Fix all CRITICAL and HIGH severity vulnerabilities',
        details: 'These pose immediate risk to system security'
      },
      {
        priority: 'SHORT_TERM',
        action: 'Implement security headers and input validation',
        details: 'Strengthen overall security posture'
      },
      {
        priority: 'LONG_TERM',
        action: 'Regular security assessments and penetration testing',
        details: 'Maintain security awareness and catch new vulnerabilities'
      }
    ]
  };

  return report;
}

// Main execution
async function runSecurityTests() {
  console.log('🔒 WORKLINK API SECURITY ASSESSMENT');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    await testCORS();
    await testSQLInjection();
    await testXSS();
    await testInputValidation();
    await testSessionManagement();
    await testSecurityHeaders();

    const report = generateSecurityReport();

    console.log('='.repeat(60));
    console.log('📊 SECURITY ASSESSMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Overall Risk Level: ${report.summary.riskLevel}`);
    console.log(`Risk Score: ${report.summary.riskScore}`);
    console.log(`Total Findings: ${report.summary.totalFindings}`);
    console.log(`🚨 Critical: ${report.summary.critical}`);
    console.log(`🔴 High: ${report.summary.high}`);
    console.log(`🟡 Medium: ${report.summary.medium}`);
    console.log(`🔵 Low: ${report.summary.low}`);
    console.log('');

    if (report.summary.critical > 0 || report.summary.high > 0) {
      console.log('🚨 URGENT ACTION REQUIRED:');
      securityFindings
        .filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
        .forEach(finding => {
          console.log(`   • ${finding.title}`);
          console.log(`     Impact: ${finding.impact}`);
          console.log(`     Fix: ${finding.remediation}`);
          console.log('');
        });
    }

    // Save detailed report
    const reportFile = `security_assessment_${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed security report saved: ${reportFile}`);

    return report;

  } catch (error) {
    console.error('🚨 Security test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runSecurityTests().then(() => {
    console.log('\n✅ Security assessment completed');
    process.exit(0);
  }).catch(error => {
    console.error('Security test error:', error);
    process.exit(1);
  });
}

module.exports = { runSecurityTests };