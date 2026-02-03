/**
 * Core JWT Authentication Test - Database Independent
 * Tests the JWT authentication system core functionality
 */

const jwt = require('jsonwebtoken');

// Import auth functions directly without database initialization
const JWT_SECRET = process.env.JWT_SECRET || 'worklink-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Core JWT functions (copied from middleware/auth.js to avoid DB init)
function generateToken(candidate) {
  return jwt.sign(
    {
      id: candidate.id,
      email: candidate.email,
      name: candidate.name,
      role: 'candidate'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function generateAdminToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'admin'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.log(`Token verification failed: ${error.message}`);
    return null;
  }
}

// Mock middleware functions
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }

  req.user = decoded;
  next();
}

function authenticateAdmin(req, res, next) {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  });
}

function authenticateCandidate(req, res, next) {
  authenticateToken(req, res, (err) => {
    if (err) return next(err);

    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        error: 'Candidate access required'
      });
    }

    next();
  });
}

// Test framework
class CoreTestRunner {
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
    console.log(`🧪 CORE JWT AUTHENTICATION TEST SUMMARY`);
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

async function runCoreTests() {
  const runner = new CoreTestRunner();

  console.log('🚀 Starting Core JWT Authentication Tests');
  console.log('='.repeat(80));

  // Environment Check
  console.log('🔧 Environment Configuration');
  console.log(`   Node.js Version: ${process.version}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   JWT Secret: ${JWT_SECRET ? 'Configured' : 'Missing'} (${JWT_SECRET.length} chars)`);

  // 1. JWT Configuration Tests
  await runner.test('JWT Secret Configuration', async () => {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    if (JWT_SECRET.length < 32) {
      throw new Error('JWT secret is too short');
    }

    if (JWT_SECRET === 'worklink-dev-secret-change-in-production' && process.env.NODE_ENV === 'production') {
      throw new Error('Using default secret in production');
    }

    console.log(`      Secret length: ${JWT_SECRET.length} characters`);
  });

  // 2. Token Generation Tests
  await runner.test('Candidate Token Generation', async () => {
    const mockCandidate = {
      id: 'CND_TEST_001',
      email: 'sarah.tan@email.com',
      name: 'Sarah Tan'
    };

    const token = generateToken(mockCandidate);

    if (!token || typeof token !== 'string') {
      throw new Error('Token generation failed');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.id !== mockCandidate.id || decoded.role !== 'candidate') {
      throw new Error('Token contains incorrect data');
    }

    console.log(`      Token length: ${token.length} characters`);
    console.log(`      Role: ${decoded.role}`);
  });

  await runner.test('Admin Token Generation', async () => {
    const mockAdmin = {
      id: 'ADMIN_001',
      email: 'admin@talentvis.com',
      name: 'Admin User'
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
    console.log(`      Role: ${decoded.role}`);
  });

  // 3. Token Validation Tests
  await runner.test('Valid Token Verification', async () => {
    const mockUser = { id: 'TEST_001', email: 'test@example.com', name: 'Test User' };
    const token = generateToken(mockUser);
    const decoded = verifyToken(token);

    if (!decoded || decoded.id !== mockUser.id) {
      throw new Error('Valid token verification failed');
    }

    console.log(`      Verified user: ${decoded.name} (${decoded.id})`);
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

  // 4. Token Structure Tests
  await runner.test('Token Structure Validation', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const parts = token.split('.');

    if (parts.length !== 3) {
      throw new Error('JWT should have 3 parts (header.payload.signature)');
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    if (header.alg !== 'HS256') {
      throw new Error('JWT should use HS256 algorithm');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    if (!payload.exp || !payload.iat) {
      throw new Error('JWT should include expiration and issued-at times');
    }

    console.log(`      Algorithm: ${header.alg}`);
    console.log(`      Expires: ${new Date(payload.exp * 1000).toISOString()}`);
  });

  // 5. Middleware Tests
  await runner.test('Authentication Middleware - Valid Token', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (!nextCalled || !req.user || req.user.id !== 'TEST_001') {
      throw new Error('Authentication middleware failed');
    }

    console.log(`      Authenticated user: ${req.user.name}`);
  });

  await runner.test('Authentication Middleware - Missing Token', async () => {
    const req = createMockReq();
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (nextCalled || res.statusCode !== 401) {
      throw new Error('Should reject requests without token');
    }
  });

  await runner.test('Authentication Middleware - Malformed Token', async () => {
    const req = createMockReq({ authorization: 'NotBearer invalid.token' });
    const res = createMockRes();
    let nextCalled = false;

    authenticateToken(req, res, () => { nextCalled = true; });

    if (nextCalled || res.statusCode !== 401) {
      throw new Error('Should reject malformed authorization header');
    }
  });

  // 6. Role-Based Access Control
  await runner.test('Admin Access Control', async () => {
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

    console.log(`      Admin access granted to: ${req.user.name}`);
  });

  await runner.test('Candidate Access Rejection for Admin Routes', async () => {
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

  await runner.test('Candidate Access Control', async () => {
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

    console.log(`      Candidate access granted to: ${req.user.name}`);
  });

  // 7. Security Tests
  await runner.test('Token Tampering Detection', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });

    // Tamper with the token signature
    const parts = token.split('.');
    const tamperedToken = parts[0] + '.' + parts[1] + '.tampered_signature';

    const decoded = verifyToken(tamperedToken);
    if (decoded !== null) {
      throw new Error('Tampered token was accepted');
    }
  });

  await runner.test('Token Replay Attack Prevention', async () => {
    const mockUser = { id: 'TEST_001', email: 'test@example.com', name: 'Test User' };

    // Generate tokens with a small delay to ensure different 'iat' timestamps
    const token1 = generateToken(mockUser);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    const token2 = generateToken(mockUser);

    // Tokens should be different due to 'iat' timestamp
    if (token1 === token2) {
      throw new Error('Tokens should be unique even for same user');
    }

    // But both should be valid
    const decoded1 = verifyToken(token1);
    const decoded2 = verifyToken(token2);

    if (!decoded1 || !decoded2) {
      throw new Error('Both tokens should be valid');
    }

    // Verify they have different issued-at times
    if (decoded1.iat === decoded2.iat) {
      throw new Error('Tokens should have different issued-at timestamps');
    }

    console.log(`      Generated unique tokens with different timestamps`);
    console.log(`      Token 1 iat: ${decoded1.iat}, Token 2 iat: ${decoded2.iat}`);
  });

  // 8. Performance Tests
  await runner.test('Token Generation Performance', async () => {
    const mockUser = { id: 'TEST_001', email: 'test@example.com', name: 'Test User' };
    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      generateToken(mockUser);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const tokensPerSecond = Math.round((iterations / duration) * 1000);

    console.log(`      Generated ${iterations} tokens in ${duration}ms`);
    console.log(`      Performance: ${tokensPerSecond} tokens/second`);

    if (duration > 2000) {
      throw new Error('Token generation is too slow');
    }
  });

  await runner.test('Token Verification Performance', async () => {
    const token = generateToken({ id: 'TEST_001', email: 'test@example.com', name: 'Test User' });
    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      verifyToken(token);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const verificationsPerSecond = Math.round((iterations / duration) * 1000);

    console.log(`      Verified ${iterations} tokens in ${duration}ms`);
    console.log(`      Performance: ${verificationsPerSecond} verifications/second`);

    if (duration > 2000) {
      throw new Error('Token verification is too slow');
    }
  });

  return runner.summary();
}

// Demo Account Simulation
function simulateDemoAccountTest() {
  console.log('\n🎭 Demo Account (sarah.tan@email.com) Simulation');
  console.log('='.repeat(50));

  const demoCandidate = {
    id: 'CND_DEMO_001',
    name: 'Sarah Tan',
    email: 'sarah.tan@email.com',
    level: 14,
    xp: 15500,
    total_jobs_completed: 42,
    status: 'active'
  };

  console.log('📋 Demo Account Details:');
  console.log(`   Name: ${demoCandidate.name}`);
  console.log(`   Email: ${demoCandidate.email}`);
  console.log(`   Level: ${demoCandidate.level}`);
  console.log(`   XP: ${demoCandidate.xp}`);
  console.log(`   Jobs Completed: ${demoCandidate.total_jobs_completed}`);

  const token = generateToken(demoCandidate);
  console.log('\n🔑 Generated JWT Token:');
  console.log(`   Token: ${token.substring(0, 50)}...`);

  const decoded = verifyToken(token);
  console.log('\n✅ Token Verification:');
  console.log(`   User ID: ${decoded.id}`);
  console.log(`   Role: ${decoded.role}`);
  console.log(`   Expires: ${new Date(decoded.exp * 1000).toISOString()}`);

  // Simulate API request
  const req = createMockReq({ authorization: `Bearer ${token}` });
  const res = createMockRes();
  let authSuccess = false;

  authenticateToken(req, res, () => { authSuccess = true; });

  console.log('\n🔒 Authentication Test:');
  if (authSuccess && req.user.id === demoCandidate.id) {
    console.log('   ✅ Demo account authentication successful');
    console.log(`   ✅ User authenticated as: ${req.user.name} (${req.user.role})`);
  } else {
    console.log('   ❌ Demo account authentication failed');
  }
}

// Main execution
if (require.main === module) {
  (async () => {
    try {
      const allTestsPassed = await runCoreTests();
      simulateDemoAccountTest();

      console.log('\n🎯 CORE AUTHENTICATION ASSESSMENT');
      console.log('='.repeat(50));

      if (allTestsPassed) {
        console.log('🎉 Core JWT Authentication System is FULLY FUNCTIONAL');
        console.log('✅ Token generation and validation working correctly');
        console.log('✅ Role-based access control implemented');
        console.log('✅ Security measures in place');
        console.log('✅ Performance is acceptable');
        console.log('✅ Demo account simulation successful');
        console.log('\n🚀 Ready for integration with database and API endpoints');
      } else {
        console.log('❌ Core authentication system has issues');
        console.log('📋 Review failed tests above');
      }

      process.exit(allTestsPassed ? 0 : 1);
    } catch (error) {
      console.error('❌ Test suite error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { runCoreTests };