/**
 * Quick Admin Portal Functionality Test
 * Tests critical admin functions while portal is being restored
 */

const fetch = require('node-fetch');

const baseURL = 'http://localhost:8080';

async function testEndpoint(name, endpoint, options = {}) {
  try {
    console.log(`🧪 Testing ${name}...`);
    const response = await fetch(`${baseURL}${endpoint}`, {
      timeout: 5000,
      ...options
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log(`   ✅ ${name}: ${response.status} (JSON response)`);
        if (data && typeof data === 'object') {
          const keys = Object.keys(data);
          console.log(`   📊 Data keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
        }
      } else {
        const text = await response.text();
        console.log(`   ✅ ${name}: ${response.status} (${contentType || 'unknown type'})`);
        console.log(`   📄 Content length: ${text.length} chars`);
      }

      return { success: true, status: response.status, data };
    } else {
      console.log(`   ❌ ${name}: ${response.status} ${response.statusText}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`   ❌ ${name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAdminTests() {
  console.log('🚀 WorkLink Admin Portal Functionality Test');
  console.log('============================================');
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);

  const results = {};

  // Test basic server health
  results.serverHealth = await testEndpoint('Server Health', '/api/v1/status');

  // Test admin portal serving
  results.adminPortal = await testEndpoint('Admin Portal HTML', '/admin/');
  results.adminAssets = await testEndpoint('Admin JS Bundle', '/admin/assets/index-BvQEMg-5.js');

  // Test emergency pages
  results.emergencyDashboard = await testEndpoint('Emergency Dashboard', '/admin/emergency.html');
  results.testPage = await testEndpoint('Test Page', '/admin/test.html');

  // Test critical API endpoints
  results.adminStats = await testEndpoint('Admin Stats', '/api/v1/admin/stats/dashboard');
  results.jobsList = await testEndpoint('Jobs List', '/api/v1/admin/jobs?limit=5');
  results.candidatesList = await testEndpoint('Candidates List', '/api/v1/admin/candidates?limit=5');

  // Test authentication endpoints
  results.authVerify = await testEndpoint('Auth Verify', '/api/v1/admin/auth/verify');

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');

  const passed = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;

  console.log(`✅ Passed: ${passed}/${total} tests`);

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - Admin portal is fully functional!');
  } else if (passed >= total * 0.7) {
    console.log('⚠️ MOSTLY WORKING - Some non-critical issues detected');
  } else {
    console.log('❌ MAJOR ISSUES - Admin portal needs immediate attention');
  }

  // Specific recommendations
  console.log('\n💡 RECOMMENDATIONS:');

  if (results.adminPortal.success) {
    console.log('✅ Admin portal HTML is serving correctly');
  } else {
    console.log('❌ Admin portal HTML not accessible - check server');
  }

  if (results.emergencyDashboard.success) {
    console.log('✅ Emergency dashboard is available as fallback');
  } else {
    console.log('⚠️ Emergency dashboard should be created');
  }

  if (results.adminStats.success) {
    console.log('✅ Admin API endpoints are working');
  } else {
    console.log('⚠️ Admin API may require authentication or have issues');
  }

  // Access instructions
  console.log('\n🔗 ACCESS POINTS:');
  console.log(`   Main Admin Portal: ${baseURL}/admin/`);
  console.log(`   Emergency Dashboard: ${baseURL}/admin/emergency.html`);
  console.log(`   Test Page: ${baseURL}/admin/test.html`);
  console.log(`   API Status: ${baseURL}/api/v1/status`);

  // Quick fixes
  console.log('\n🛠️ QUICK FIXES:');
  console.log('   1. If admin portal shows white page:');
  console.log('      → Use emergency dashboard');
  console.log('      → Run: cd admin && npm run build');
  console.log('   2. If emergency dashboard missing:');
  console.log('      → Run: ./fix-admin-portal.sh');
  console.log('   3. If API endpoints fail:');
  console.log('      → Check server logs');
  console.log('      → Verify database connection');

  console.log(`\n⏰ Completed at: ${new Date().toLocaleString()}`);

  return results;
}

// Run the tests
if (require.main === module) {
  runAdminTests()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = runAdminTests;