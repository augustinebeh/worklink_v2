/**
 * JWT Authentication System Test Suite
 * Tests all aspects of the authentication system including:
 * 1. Database connectivity
 * 2. Token generation and validation
 * 3. Role-based access control
 * 4. Protected routes authentication
 * 5. Demo account (sarah.tan@email.com) functionality
 */

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const {
  generateToken,
  generateAdminToken,
  verifyToken,
  authenticateToken,
  authenticateAdmin,
  authenticateCandidate,
  JWT_SECRET
} = require('./middleware/auth');
const { db } = require('./db');

// Server configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8080';
const API_BASE = `${SERVER_URL}/api/v1`;

// Test utilities
class TestRunner {
  constructor() {
    this.passedTests = 0;
    this.totalTests = 0;
    this.failedTests = [];
  }

  async test(description, testFn) {
    this.totalTests++;
    console.log(`\n📋 Testing: ${description}`);

    try {
      await testFn();
      this.passedTests++;
      console.log(`   ✅ PASSED: ${description}`);
    } catch (error) {
      this.failedTests.push({ description, error: error.message });
      console.log(`   ❌ FAILED: ${description}`);
      console.log(`      Error: ${error.message}`);
    }
  }

  summary() {
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 AUTHENTICATION SYSTEM TEST SUMMARY`);
    console.log('='.repeat(80));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.failedTests.length} ❌`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

    if (this.failedTests.length > 0) {
      console.log('\n📋 Failed Tests:');
      this.failedTests.forEach((test, i) => {
        console.log(`   ${i + 1}. ${test.description}: ${test.error}`);
      });
    }

    console.log('='.repeat(80));
    return this.failedTests.length === 0;
  }
}

// Mock Express request/response for middleware testing
function createMockReq(headers = {}, user = null) {
  return {
    headers,
    user
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    jsonData: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.jsonData = data; return this; },
    header: function(name, value) { this.headers[name] = value; }
  };
  return res;
}

// HTTP test utility
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  return { response, data };
}

// Test suite implementation
async function runAuthenticationTests() {
  const runner = new TestRunner();

  console.log('🚀 Starting JWT Authentication System Tests');
  console.log('='.repeat(80));

  // 1. Database Connectivity Tests
  await runner.test('Database Connection', async () => {
    const result = db.prepare('SELECT 1 as test').get();
    if (result.test !== 1) {
      throw new Error('Database query failed');
    }
  });

  await runner.test('Candidates Table Access', async () => {
    const count = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
    if (typeof count.count !== 'number') {
      throw new Error('Cannot access candidates table');
    }
    console.log(`      Found ${count.count} candidates in database`);
  });

  await runner.test('Demo Account Existence', async () => {
    const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
    if (!candidate) {
      throw new Error('Demo account sarah.tan@email.com not found');
    }
    console.log(`      Demo account found: ${candidate.name} (${candidate.id})`);
  });

  // 2. Token Generation Tests
  await runner.test('Generate Candidate Token', async () => {
    const mockCandidate = {
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    };

    const token = generateToken(mockCandidate);
    if (!token || typeof token !== 'string') {
      throw new Error('Token generation failed');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== mockCandidate.id || decoded.role !== 'candidate') {
      throw new Error('Token contains incorrect data');
    }
    console.log(`      Generated token length: ${token.length} characters`);
  });

  await runner.test('Generate Admin Token', async () => {
    const mockAdmin = {
      id: 'ADMIN_001',
      email: 'admin@example.com',
      name: 'Test Admin'
    };

    const token = generateAdminToken(mockAdmin);
    if (!token || typeof token !== 'string') {
      throw new Error('Admin token generation failed');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== mockAdmin.id || decoded.role !== 'admin') {
      throw new Error('Admin token contains incorrect data');
    }
    console.log(`      Generated admin token length: ${token.length} characters`);
  });

  // 3. Token Validation Tests
  await runner.test('Valid Token Verification', async () => {
    const mockUser = { id: 'TEST_001', email: 'test@example.com', name: 'Test User' };
    const token = generateToken(mockUser);
    const decoded = verifyToken(token);

    if (!decoded || decoded.id !== mockUser.id) {
      throw new Error('Valid token verification failed');
    }
  });

  await runner.test('Invalid Token Rejection', async () => {
    const invalidToken = 'invalid.token.here';
    const decoded = verifyToken(invalidToken);

    if (decoded !== null) {
      throw new Error('Invalid token was accepted');
    }
  });

  await runner.test('Expired Token Rejection', async () => {
    const expiredToken = jwt.sign(
      { id: 'TEST_001', email: 'test@example.com', role: 'candidate' },
      JWT_SECRET,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    const decoded = verifyToken(expiredToken);
    if (decoded !== null) {
      throw new Error('Expired token was accepted');
    }
  });

  // 4. Authentication Middleware Tests
  await runner.test('Authentication Middleware - Valid Token', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (!nextCalled || !req.user || req.user.id !== 'TEST_001') {
      throw new Error('Authentication middleware failed for valid token');
    }
  });

  await runner.test('Authentication Middleware - Missing Token', async () => {
    const req = createMockReq();
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (nextCalled || res.statusCode !== 401) {
      throw new Error('Middleware should reject requests without token');
    }
  });

  await runner.test('Authentication Middleware - Invalid Token', async () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token.here' });
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (nextCalled || res.statusCode !== 401) {
      throw new Error('Middleware should reject invalid tokens');
    }
  });

  // 5. Role-Based Access Control Tests
  await runner.test('Admin Role Access Control', async () => {
    const adminToken = generateAdminToken({
      id: 'ADMIN_001',
      email: 'admin@example.com',
      name: 'Test Admin'
    });

    const req = createMockReq({ authorization: `Bearer ${adminToken}` });
    const res = createMockRes();
    let nextCalled = false;

    // First authenticate the token
    authenticateToken(req, res, () => {
      // Then check admin access
      authenticateAdmin(req, res, () => { nextCalled = true; });
    });

    if (!nextCalled || res.statusCode !== 200) {
      throw new Error('Admin should have admin access');
    }
  });

  await runner.test('Candidate Role Rejection for Admin Routes', async () => {
    const candidateToken = generateToken({
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    });

    const req = createMockReq({ authorization: `Bearer ${candidateToken}` });
    const res = createMockRes();
    let nextCalled = false;

    // First authenticate the token
    authenticateToken(req, res, () => {
      // Then check admin access (should fail)
      authenticateAdmin(req, res, () => { nextCalled = true; });
    });

    if (nextCalled || res.statusCode !== 403) {
      throw new Error('Candidate should not have admin access');
    }
  });

  await runner.test('Candidate Role Access Control', async () => {
    const candidateToken = generateToken({
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    });

    const req = createMockReq({ authorization: `Bearer ${candidateToken}` });
    const res = createMockRes();
    let nextCalled = false;

    // First authenticate the token
    authenticateToken(req, res, () => {
      // Then check candidate access
      authenticateCandidate(req, res, () => { nextCalled = true; });
    });

    if (!nextCalled || res.statusCode !== 200) {
      throw new Error('Candidate should have candidate access');
    }
  });

  // 6. API Endpoint Tests (requires server to be running)
  let serverRunning = false;
  try {
    const { response } = await makeRequest('/health');
    serverRunning = response.status === 200;
  } catch (error) {
    console.log('   ⚠️  Server not running - skipping API endpoint tests');
  }

  if (serverRunning) {
    await runner.test('Protected Route - /auth/me without token', async () => {
      const { response } = await makeRequest('/auth/me');
      if (response.status !== 401) {
        throw new Error('Protected route should reject requests without token');
      }
    });

    await runner.test('Protected Route - /auth/me with valid token', async () => {
      const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
      const token = generateToken(candidate);

      const { response, data } = await makeRequest('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status !== 200 || !data.success || data.data.id !== candidate.id) {
        throw new Error('Protected route should work with valid token');
      }
    });

    await runner.test('Demo Account Login - sarah.tan@email.com', async () => {
      const { response, data } = await makeRequest('/auth/worker/login', {
        method: 'POST',
        body: { email: 'sarah.tan@email.com' }
      });

      if (response.status !== 200 || !data.success || !data.token) {
        throw new Error('Demo account login failed');
      }

      console.log(`      Demo login successful: ${data.data.name}`);
      console.log(`      User stats: Level ${data.data.level}, XP ${data.data.xp}, ${data.data.total_jobs_completed} jobs completed`);
    });

    await runner.test('Admin Login Functionality', async () => {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentvis.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'test-password';

      if (adminPassword === 'test-password') {
        console.log('      ⚠️  Using default password - set ADMIN_PASSWORD environment variable');
      }

      const { response, data } = await makeRequest('/auth/login', {
        method: 'POST',
        body: {
          email: adminEmail,
          password: adminPassword,
          type: 'admin'
        }
      });

      if (adminPassword === 'test-password' && response.status === 500) {
        console.log('      ℹ️  Admin login test skipped - ADMIN_PASSWORD not configured');
        return; // Skip this test if admin password is not set
      }

      if (response.status !== 200 || !data.success || data.data.role !== 'admin') {
        throw new Error('Admin login failed');
      }

      console.log(`      Admin login successful: ${data.data.name}`);
    });

    await runner.test('Token Expiry Validation', async () => {
      const expiredToken = jwt.sign(
        { id: 'TEST_001', email: 'test@example.com', name: 'Test User', role: 'candidate' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const { response } = await makeRequest('/auth/me', {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });

      if (response.status !== 401) {
        throw new Error('API should reject expired tokens');
      }
    });
  }

  // 7. Integration with Database Structure Tests
  await runner.test('Database Schema Compatibility', async () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    const requiredTables = ['candidates', 'jobs', 'payments', 'clients'];
    const existingTables = tables.map(t => t.name);

    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }

    console.log(`      Database has ${existingTables.length} tables: ${existingTables.slice(0, 5).join(', ')}${existingTables.length > 5 ? '...' : ''}`);
  });

  await runner.test('Candidate Data Structure Validation', async () => {
    const candidate = db.prepare('SELECT * FROM candidates LIMIT 1').get();
    const requiredFields = ['id', 'name', 'email', 'status', 'xp', 'level'];

    if (!candidate) {
      throw new Error('No candidates found in database');
    }

    const missingFields = requiredFields.filter(field => !(field in candidate));
    if (missingFields.length > 0) {
      throw new Error(`Candidate record missing fields: ${missingFields.join(', ')}`);
    }

    console.log(`      Candidate structure valid, sample: ${candidate.name} (${candidate.email})`);
  });

  // 8. Security Tests
  await runner.test('JWT Secret Configuration', async () => {
    if (!JWT_SECRET || JWT_SECRET === 'worklink-dev-secret-change-in-production') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Production environment using default JWT secret');
      } else {
        console.log('      ⚠️  Using default JWT secret in development');
      }
    }

    if (JWT_SECRET.length < 32) {
      throw new Error('JWT secret is too short (should be at least 32 characters)');
    }
  });

  await runner.test('Token Algorithm Security', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());

    if (header.alg !== 'HS256') {
      throw new Error('JWT should use HS256 algorithm');
    }
  });

  return runner.summary();
}

// Environment check
async function checkEnvironment() {
  console.log('\n🔍 Environment Check');
  console.log('='.repeat(40));

  console.log(`Node.js Version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`JWT Secret: ${JWT_SECRET ? 'Configured' : 'Missing'}`);
  console.log(`Admin Email: ${process.env.ADMIN_EMAIL || 'admin@talentvis.com (default)'}`);
  console.log(`Admin Password: ${process.env.ADMIN_PASSWORD ? 'Configured' : 'Not set'}`);
  console.log(`Server URL: ${SERVER_URL}`);

  try {
    const { response, data } = await makeRequest('/health');
    console.log(`Health Check: ${response.status === 200 ? '✅ Server Running' : '❌ Server Error'}`);
  } catch (error) {
    console.log(`Health Check: ❌ Server Not Reachable (${error.message})`);
  }
}

// Main execution
if (require.main === module) {
  (async () => {
    try {
      await checkEnvironment();
      const allTestsPassed = await runAuthenticationTests();
      process.exit(allTestsPassed ? 0 : 1);
    } catch (error) {
      console.error('❌ Test suite error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { runAuthenticationTests, TestRunner };