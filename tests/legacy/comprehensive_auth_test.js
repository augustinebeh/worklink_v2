/**
 * Comprehensive JWT Authentication System Test
 * Tests all core functionality without requiring server startup
 */

const {
  generateToken,
  generateAdminToken,
  verifyToken,
  authenticateToken,
  authenticateAdmin,
  authenticateCandidate,
  authenticateCandidateOwnership,
  authenticateAdminOrOwner,
  optionalAuth,
  legacyAuth,
  JWT_SECRET
} = require('./middleware/auth');
const { db } = require('./db');
const jwt = require('jsonwebtoken');

class ComprehensiveTestRunner {
  constructor() {
    this.passedTests = 0;
    this.totalTests = 0;
    this.failedTests = [];
    this.warnings = [];
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

  warn(message) {
    this.warnings.push(message);
    console.log(`   ⚠️  WARNING: ${message}`);
  }

  summary() {
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 COMPREHENSIVE AUTHENTICATION SYSTEM TEST SUMMARY`);
    console.log('='.repeat(80));
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests} ✅`);
    console.log(`Failed: ${this.failedTests.length} ❌`);
    console.log(`Warnings: ${this.warnings.length} ⚠️`);
    console.log(`Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);

    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }

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

function createMockReq(headers = {}, user = null, params = {}, body = {}) {
  return {
    headers,
    user,
    params,
    body
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

async function runComprehensiveTests() {
  const runner = new ComprehensiveTestRunner();

  console.log('🚀 Starting Comprehensive JWT Authentication System Tests');
  console.log('='.repeat(80));

  // 1. Environment and Configuration Tests
  await runner.test('JWT Secret Configuration', async () => {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    if (JWT_SECRET === 'worklink-dev-secret-change-in-production') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Production environment using default JWT secret');
      } else {
        runner.warn('Using default JWT secret in development');
      }
    }

    if (JWT_SECRET.length < 32) {
      throw new Error('JWT secret is too short (should be at least 32 characters)');
    }

    console.log(`      JWT Secret length: ${JWT_SECRET.length} characters`);
  });

  // 2. Database Connectivity and Schema Tests
  await runner.test('Database Connection', async () => {
    const result = db.prepare('SELECT 1 as test').get();
    if (result.test !== 1) {
      throw new Error('Database query failed');
    }
  });

  await runner.test('Database Schema Validation', async () => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    const requiredTables = ['candidates', 'jobs', 'payments', 'clients', 'deployments'];
    const existingTables = tables.map(t => t.name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
    }

    console.log(`      Found ${existingTables.length} database tables`);
  });

  await runner.test('Candidates Table Structure', async () => {
    const candidate = db.prepare('SELECT * FROM candidates LIMIT 1').get();
    const requiredFields = ['id', 'name', 'email', 'status', 'xp', 'level', 'created_at'];

    if (!candidate) {
      throw new Error('No candidates found in database');
    }

    const missingFields = requiredFields.filter(field => !(field in candidate));
    if (missingFields.length > 0) {
      throw new Error(`Candidate record missing fields: ${missingFields.join(', ')}`);
    }

    console.log(`      Candidate structure valid`);
  });

  await runner.test('Demo Account Verification', async () => {
    const demoCandidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');

    if (!demoCandidate) {
      throw new Error('Demo account sarah.tan@email.com not found');
    }

    console.log(`      Demo account: ${demoCandidate.name} (${demoCandidate.id})`);
    console.log(`      Level: ${demoCandidate.level}, XP: ${demoCandidate.xp}, Jobs: ${demoCandidate.total_jobs_completed}`);
  });

  // 3. Token Generation Tests
  await runner.test('Candidate Token Generation', async () => {
    const demoCandidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
    const token = generateToken(demoCandidate);

    if (!token || typeof token !== 'string') {
      throw new Error('Token generation failed');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== demoCandidate.id || decoded.role !== 'candidate') {
      throw new Error('Token contains incorrect data');
    }

    console.log(`      Token length: ${token.length} characters`);
  });

  await runner.test('Admin Token Generation', async () => {
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

    console.log(`      Admin token length: ${token.length} characters`);
  });

  // 4. Token Validation Tests
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
      { expiresIn: '-1h' }
    );

    const decoded = verifyToken(expiredToken);
    if (decoded !== null) {
      throw new Error('Expired token was accepted');
    }
  });

  await runner.test('Token Algorithm Security', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());

    if (header.alg !== 'HS256') {
      throw new Error('JWT should use HS256 algorithm');
    }
  });

  // 5. Authentication Middleware Tests
  await runner.test('authenticateToken - Valid Token', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (!nextCalled || !req.user || req.user.id !== 'TEST_001') {
      throw new Error('Authentication middleware failed for valid token');
    }
  });

  await runner.test('authenticateToken - Missing Token', async () => {
    const req = createMockReq();
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (nextCalled || res.statusCode !== 401) {
      throw new Error('Middleware should reject requests without token');
    }
  });

  await runner.test('authenticateToken - Invalid Token', async () => {
    const req = createMockReq({ authorization: 'Bearer invalid.token.here' });
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (nextCalled || res.statusCode !== 401) {
      throw new Error('Middleware should reject invalid tokens');
    }
  });

  // 6. Role-Based Access Control Tests
  await runner.test('authenticateAdmin - Valid Admin', async () => {
    const adminToken = generateAdminToken({
      id: 'ADMIN_001',
      email: 'admin@example.com',
      name: 'Test Admin'
    });

    const req = createMockReq({ authorization: `Bearer ${adminToken}` });
    const res = createMockRes();
    let finalNextCalled = false;

    authenticateToken(req, res, () => {
      authenticateAdmin(req, res, () => { finalNextCalled = true; });
    });

    if (!finalNextCalled || res.statusCode !== 200) {
      throw new Error('Admin should have admin access');
    }
  });

  await runner.test('authenticateAdmin - Candidate Rejection', async () => {
    const candidateToken = generateToken({
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    });

    const req = createMockReq({ authorization: `Bearer ${candidateToken}` });
    const res = createMockRes();
    let finalNextCalled = false;

    authenticateToken(req, res, () => {
      authenticateAdmin(req, res, () => { finalNextCalled = true; });
    });

    if (finalNextCalled || res.statusCode !== 403) {
      throw new Error('Candidate should not have admin access');
    }
  });

  await runner.test('authenticateCandidate - Valid Candidate', async () => {
    const candidateToken = generateToken({
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    });

    const req = createMockReq({ authorization: `Bearer ${candidateToken}` });
    const res = createMockRes();
    let finalNextCalled = false;

    authenticateToken(req, res, () => {
      authenticateCandidate(req, res, () => { finalNextCalled = true; });
    });

    if (!finalNextCalled || res.statusCode !== 200) {
      throw new Error('Candidate should have candidate access');
    }
  });

  await runner.test('authenticateCandidateOwnership - Own Data', async () => {
    const candidateToken = generateToken({
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    });

    const req = createMockReq(
      { authorization: `Bearer ${candidateToken}` },
      null,
      { id: 'TEST_001' } // Same ID in params
    );
    const res = createMockRes();
    let finalNextCalled = false;

    authenticateToken(req, res, () => {
      authenticateCandidateOwnership(req, res, () => { finalNextCalled = true; });
    });

    if (!finalNextCalled || res.statusCode !== 200) {
      throw new Error('Candidate should access their own data');
    }
  });

  await runner.test('authenticateCandidateOwnership - Other Data Rejection', async () => {
    const candidateToken = generateToken({
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    });

    const req = createMockReq(
      { authorization: `Bearer ${candidateToken}` },
      null,
      { id: 'TEST_002' } // Different ID in params
    );
    const res = createMockRes();
    let finalNextCalled = false;

    authenticateToken(req, res, () => {
      authenticateCandidateOwnership(req, res, () => { finalNextCalled = true; });
    });

    if (finalNextCalled || res.statusCode !== 403) {
      throw new Error('Candidate should not access other user data');
    }
  });

  await runner.test('authenticateAdminOrOwner - Admin Access', async () => {
    const adminToken = generateAdminToken({
      id: 'ADMIN_001',
      email: 'admin@example.com',
      name: 'Test Admin'
    });

    const req = createMockReq(
      { authorization: `Bearer ${adminToken}` },
      null,
      { id: 'TEST_001' } // Different user's data
    );
    const res = createMockRes();
    let finalNextCalled = false;

    authenticateToken(req, res, () => {
      authenticateAdminOrOwner(req, res, () => { finalNextCalled = true; });
    });

    if (!finalNextCalled || res.statusCode !== 200) {
      throw new Error('Admin should access any data');
    }
  });

  await runner.test('optionalAuth - Valid Token', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    let nextCalled = false;

    optionalAuth(req, res, () => { nextCalled = true; });

    if (!nextCalled || !req.user || req.user.id !== 'TEST_001') {
      throw new Error('Optional auth should set user for valid token');
    }
  });

  await runner.test('optionalAuth - No Token', async () => {
    const req = createMockReq();
    const res = createMockRes();
    let nextCalled = false;

    optionalAuth(req, res, () => { nextCalled = true; });

    if (!nextCalled || req.user) {
      throw new Error('Optional auth should continue without user when no token');
    }
  });

  // 7. Legacy Auth Support Tests
  await runner.test('legacyAuth - Demo Token Support', async () => {
    const demoCandidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
    const req = createMockReq({ authorization: `Bearer demo-token-${demoCandidate.id}` });
    const res = createMockRes();
    let nextCalled = false;

    legacyAuth(req, res, () => { nextCalled = true; });

    if (!nextCalled || !req.user || req.user.id !== demoCandidate.id) {
      throw new Error('Legacy auth should support demo tokens');
    }
  });

  await runner.test('legacyAuth - Admin Demo Token', async () => {
    const req = createMockReq({ authorization: 'Bearer demo-admin-token' });
    const res = createMockRes();
    let nextCalled = false;

    legacyAuth(req, res, () => { nextCalled = true; });

    if (!nextCalled || !req.user || req.user.role !== 'admin') {
      throw new Error('Legacy auth should support demo admin token');
    }
  });

  // 8. Token Expiration Tests
  await runner.test('Token Expiration Configuration', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const decoded = jwt.verify(token, JWT_SECRET);

    const now = Math.floor(Date.now() / 1000);
    const expTime = decoded.exp;
    const duration = expTime - now;

    // Should expire in approximately 24 hours (86400 seconds)
    if (duration < 86000 || duration > 87000) {
      throw new Error(`Unexpected token expiration: ${duration} seconds`);
    }

    console.log(`      Token expires in ${duration} seconds (${(duration / 3600).toFixed(1)} hours)`);
  });

  // 9. Security Tests
  await runner.test('Token Data Integrity', async () => {
    const originalData = {
      id: 'TEST_001',
      email: 'test@example.com',
      name: 'Test User'
    };

    const token = generateToken(originalData);
    const decoded = verifyToken(token);

    if (decoded.id !== originalData.id ||
        decoded.email !== originalData.email ||
        decoded.name !== originalData.name ||
        decoded.role !== 'candidate') {
      throw new Error('Token data integrity compromised');
    }
  });

  await runner.test('Token Tampering Detection', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });

    // Tamper with the token (change a character in the middle)
    const tamperedToken = token.substring(0, 50) + 'X' + token.substring(51);

    const decoded = verifyToken(tamperedToken);
    if (decoded !== null) {
      throw new Error('Tampered token was accepted');
    }
  });

  // 10. Performance Tests
  await runner.test('Token Generation Performance', async () => {
    const mockUser = { id: 'TEST_001', email: 'test@example.com', name: 'Test User' };
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      generateToken(mockUser);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (duration > 1000) { // Should generate 100 tokens in under 1 second
      runner.warn(`Token generation is slow: ${duration}ms for 100 tokens`);
    }

    console.log(`      Generated 100 tokens in ${duration}ms`);
  });

  await runner.test('Token Verification Performance', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      verifyToken(token);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (duration > 1000) { // Should verify 100 tokens in under 1 second
      runner.warn(`Token verification is slow: ${duration}ms for 100 tokens`);
    }

    console.log(`      Verified 100 tokens in ${duration}ms`);
  });

  return runner.summary();
}

async function generateTestReport() {
  console.log('\n📄 Generating Authentication System Report...');
  console.log('='.repeat(80));

  // Environment Information
  console.log('🔧 ENVIRONMENT CONFIGURATION');
  console.log('-'.repeat(40));
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`JWT Secret: ${JWT_SECRET ? 'Configured' : 'Missing'} (${JWT_SECRET ? JWT_SECRET.length + ' chars' : 'N/A'})`);
  console.log(`Admin Email: ${process.env.ADMIN_EMAIL || 'admin@talentvis.com (default)'}`);
  console.log(`Admin Password: ${process.env.ADMIN_PASSWORD ? 'Configured' : 'Not set'}`);

  // Database Information
  try {
    const candidateCount = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;
    const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
    const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;

    console.log('\n🗄️ DATABASE STATUS');
    console.log('-'.repeat(40));
    console.log(`Candidates: ${candidateCount}`);
    console.log(`Jobs: ${jobCount}`);
    console.log(`Payments: ${paymentCount}`);

    const demoCandidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
    if (demoCandidate) {
      console.log(`Demo Account: ${demoCandidate.name} (Level ${demoCandidate.level}, ${demoCandidate.total_jobs_completed} jobs)`);
    }
  } catch (error) {
    console.log(`Database Error: ${error.message}`);
  }

  console.log('\n🔐 AUTHENTICATION FEATURES');
  console.log('-'.repeat(40));
  console.log('✅ JWT Token Generation (HS256)');
  console.log('✅ Token Expiration (24 hours)');
  console.log('✅ Role-based Access Control (admin/candidate)');
  console.log('✅ Protected Route Middleware');
  console.log('✅ Ownership Validation');
  console.log('✅ Legacy Token Support');
  console.log('✅ Optional Authentication');
  console.log('✅ Token Tampering Detection');

  console.log('\n📋 RECOMMENDATIONS');
  console.log('-'.repeat(40));

  if (!process.env.ADMIN_PASSWORD) {
    console.log('⚠️  Set ADMIN_PASSWORD environment variable for admin authentication');
  }

  if (JWT_SECRET === 'worklink-dev-secret-change-in-production' && process.env.NODE_ENV === 'production') {
    console.log('🚨 CRITICAL: Change JWT_SECRET in production environment');
  }

  console.log('✅ Consider implementing refresh tokens for enhanced security');
  console.log('✅ Add rate limiting to authentication endpoints');
  console.log('✅ Implement session management for multi-device support');
  console.log('✅ Add audit logging for authentication events');
}

// Main execution
if (require.main === module) {
  (async () => {
    try {
      await generateTestReport();
      const allTestsPassed = await runComprehensiveTests();

      console.log('\n🎯 FINAL ASSESSMENT');
      console.log('='.repeat(40));
      if (allTestsPassed) {
        console.log('🎉 JWT Authentication System is FULLY FUNCTIONAL');
        console.log('✅ All core authentication features are working correctly');
        console.log('✅ Database integration is successful');
        console.log('✅ Demo account (sarah.tan@email.com) is operational');
        console.log('✅ Security measures are in place');
      } else {
        console.log('❌ Authentication System has issues that need attention');
        console.log('📋 Review the failed tests above for specific problems');
      }

      process.exit(allTestsPassed ? 0 : 1);
    } catch (error) {
      console.error('❌ Test suite error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { runComprehensiveTests };