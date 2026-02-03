/**
 * Manual JWT Authentication Test
 * Run this with a server already running on localhost:8080
 */

const axios = require('axios');
const {
  generateToken,
  generateAdminToken,
  JWT_SECRET
} = require('./middleware/auth');
const { db } = require('./db');
const jwt = require('jsonwebtoken');

const SERVER_URL = 'http://localhost:8080';
const API_BASE = `${SERVER_URL}/api/v1`;

async function makeRequest(endpoint, options = {}) {
  try {
    const config = {
      method: options.method || 'GET',
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.body,
      validateStatus: () => true
    };

    const response = await axios(config);
    return { response, data: response.data };
  } catch (error) {
    return { error: error.message };
  }
}

async function testServerConnection() {
  console.log('🔍 Testing server connection...');
  const { response, error } = await makeRequest('/health');

  if (error) {
    console.log('❌ Server not reachable:', error);
    return false;
  }

  if (response.status === 200) {
    console.log('✅ Server is running');
    console.log(`   Environment: ${response.data.environment}`);
    console.log(`   Uptime: ${response.data.uptime}s`);
    return true;
  } else {
    console.log('❌ Server responded with error:', response.status);
    return false;
  }
}

async function testDemoAccountLogin() {
  console.log('\n🎭 Testing demo account login...');

  const { response, data, error } = await makeRequest('/auth/worker/login', {
    method: 'POST',
    body: { email: 'sarah.tan@email.com' }
  });

  if (error) {
    console.log('❌ Request failed:', error);
    return null;
  }

  if (response.status === 200 && data.success) {
    console.log('✅ Demo login successful');
    console.log(`   Name: ${data.data.name}`);
    console.log(`   Level: ${data.data.level}`);
    console.log(`   XP: ${data.data.xp}`);
    console.log(`   Jobs Completed: ${data.data.total_jobs_completed}`);
    console.log(`   Token: ${data.token.substring(0, 20)}...`);
    return data.token;
  } else {
    console.log('❌ Demo login failed');
    console.log('   Status:', response.status);
    console.log('   Error:', data.error || 'Unknown error');
    return null;
  }
}

async function testProtectedRoute(token) {
  console.log('\n🔒 Testing protected route access...');

  if (!token) {
    console.log('⚠️  No token provided, skipping test');
    return;
  }

  const { response, data, error } = await makeRequest('/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (error) {
    console.log('❌ Request failed:', error);
    return;
  }

  if (response.status === 200 && data.success) {
    console.log('✅ Protected route access successful');
    console.log(`   User ID: ${data.data.id}`);
    console.log(`   Name: ${data.data.name}`);
    console.log(`   Email: ${data.data.email}`);
    console.log(`   Status: ${data.data.status}`);
  } else {
    console.log('❌ Protected route access failed');
    console.log('   Status:', response.status);
    console.log('   Error:', data.error || 'Unknown error');
  }
}

async function testInvalidToken() {
  console.log('\n🚫 Testing invalid token rejection...');

  const { response, data } = await makeRequest('/auth/me', {
    headers: { Authorization: 'Bearer invalid.token.here' }
  });

  if (response.status === 401) {
    console.log('✅ Invalid token correctly rejected');
  } else {
    console.log('❌ Invalid token was accepted');
    console.log('   Status:', response.status);
  }
}

async function testExpiredToken() {
  console.log('\n⏰ Testing expired token rejection...');

  const expiredToken = jwt.sign(
    { id: 'TEST_001', email: 'test@example.com', name: 'Test User', role: 'candidate' },
    JWT_SECRET,
    { expiresIn: '-1h' }
  );

  const { response, data } = await makeRequest('/auth/me', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });

  if (response.status === 401) {
    console.log('✅ Expired token correctly rejected');
  } else {
    console.log('❌ Expired token was accepted');
    console.log('   Status:', response.status);
  }
}

async function testJWTTokenGeneration() {
  console.log('\n🔑 Testing JWT token generation and validation...');

  try {
    const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
    if (!candidate) {
      console.log('❌ Demo candidate not found in database');
      return;
    }

    const token = generateToken(candidate);
    console.log('✅ Token generated successfully');
    console.log(`   Token length: ${token.length} characters`);

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verification successful');
    console.log(`   User ID: ${decoded.id}`);
    console.log(`   Role: ${decoded.role}`);
    console.log(`   Expires: ${new Date(decoded.exp * 1000).toISOString()}`);

    // Test the token with the API
    const { response, data } = await makeRequest('/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 200) {
      console.log('✅ Generated token works with API');
    } else {
      console.log('❌ Generated token rejected by API');
    }

  } catch (error) {
    console.log('❌ JWT test failed:', error.message);
  }
}

async function testAdminAuthentication() {
  console.log('\n👑 Testing admin authentication...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@talentvis.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.log('⚠️  ADMIN_PASSWORD not set, skipping admin test');
    return;
  }

  const { response, data, error } = await makeRequest('/auth/login', {
    method: 'POST',
    body: {
      email: adminEmail,
      password: adminPassword,
      type: 'admin'
    }
  });

  if (error) {
    console.log('❌ Request failed:', error);
    return;
  }

  if (response.status === 200 && data.success && data.data.role === 'admin') {
    console.log('✅ Admin login successful');
    console.log(`   Admin: ${data.data.name}`);
    console.log(`   Token: ${data.token.substring(0, 20)}...`);

    // Test admin token
    const { response: meResp } = await makeRequest('/auth/me', {
      headers: { Authorization: `Bearer ${data.token}` }
    });

    if (meResp.status === 200) {
      console.log('✅ Admin token validation successful');
    } else {
      console.log('❌ Admin token validation failed');
    }

  } else {
    console.log('❌ Admin login failed');
    console.log('   Status:', response.status);
    console.log('   Error:', data.error || 'Unknown error');
  }
}

async function testRoleBasedAccess() {
  console.log('\n🛡️ Testing role-based access control...');

  // Test with candidate token trying to access admin routes
  const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
  const candidateToken = generateToken(candidate);

  const { response: adminStatsResp } = await makeRequest('/admin/stats', {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });

  console.log(`   Candidate accessing admin stats: ${adminStatsResp.status}`);

  // Test candidate accessing their own data
  const { response: candidateResp } = await makeRequest('/auth/me', {
    headers: { Authorization: `Bearer ${candidateToken}` }
  });

  if (candidateResp.status === 200) {
    console.log('✅ Candidate can access their own data');
  } else {
    console.log('❌ Candidate cannot access their own data');
  }
}

async function testDatabaseIntegration() {
  console.log('\n🗄️ Testing database integration...');

  try {
    // Test database connection
    const count = db.prepare('SELECT COUNT(*) as count FROM candidates').get();
    console.log(`✅ Database accessible, ${count.count} candidates found`);

    // Test demo account in database
    const demo = db.prepare('SELECT * FROM candidates WHERE email = ?').get('sarah.tan@email.com');
    if (demo) {
      console.log('✅ Demo account exists in database');
      console.log(`   ID: ${demo.id}`);
      console.log(`   Status: ${demo.status}`);
      console.log(`   Level: ${demo.level}`);
    } else {
      console.log('❌ Demo account not found in database');
    }

    // Test required tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    const requiredTables = ['candidates', 'jobs', 'payments', 'clients'];
    const existingTables = tables.map(t => t.name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length === 0) {
      console.log('✅ All required database tables exist');
    } else {
      console.log('❌ Missing database tables:', missingTables.join(', '));
    }

  } catch (error) {
    console.log('❌ Database test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 JWT Authentication System Manual Test');
  console.log('='.repeat(50));

  // Check if server is running
  const serverRunning = await testServerConnection();

  if (!serverRunning) {
    console.log('\n⚠️  Server is not running. Please start the server first:');
    console.log('   npm start');
    console.log('\n   Then run this test again.');
    return false;
  }

  // Run database tests (these don't require the server)
  await testDatabaseIntegration();

  // Run JWT tests (these don't require the server)
  await testJWTTokenGeneration();

  // Run API tests (these require the server)
  const demoToken = await testDemoAccountLogin();
  await testProtectedRoute(demoToken);
  await testInvalidToken();
  await testExpiredToken();
  await testAdminAuthentication();
  await testRoleBasedAccess();

  console.log('\n✅ Manual authentication tests completed');
  console.log('\nIf all tests show ✅, your JWT authentication system is working correctly!');

  return true;
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };