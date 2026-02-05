#!/usr/bin/env node
/**
 * 🧪 BPO INTELLIGENCE ENDPOINT VERIFIER
 * Tests all required API endpoints for the 10-Agent BPO Intelligence System
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

const REQUIRED_ENDPOINTS = {
  // RSS Scraper APIs
  'POST /api/v1/scraping/run': {
    method: 'POST',
    path: '/scraping/run',
    description: 'Manual trigger RSS scraping',
    testData: {
      keywords: ['manpower', 'services'],
      max_results: 10
    }
  },
  'GET /api/v1/scraping/status': {
    method: 'GET',
    path: '/scraping/status',
    description: 'Get scraper status',
    testData: null
  },

  // Renewal APIs
  'GET /api/v1/gebiz/renewals?status=upcoming&months_ahead=12': {
    method: 'GET',
    path: '/gebiz/renewals?status=upcoming&months_ahead=12',
    description: 'Get upcoming renewals',
    testData: null
  },
  'GET /api/v1/gebiz/renewals/dashboard/timeline?months=12': {
    method: 'GET',
    path: '/gebiz/renewals/dashboard/timeline?months=12',
    description: 'Get renewal timeline',
    testData: null
  },
  'GET /api/v1/gebiz/renewals/:id': {
    method: 'GET',
    path: '/gebiz/renewals/test-renewal-001',
    description: 'Get single renewal',
    testData: null,
    skipIfNotFound: true
  },
  'PATCH /api/v1/gebiz/renewals/:id': {
    method: 'PATCH',
    path: '/gebiz/renewals/test-renewal-001',
    description: 'Update renewal',
    testData: {
      notes: 'Test update'
    },
    skipIfNotFound: true
  },
  'POST /api/v1/gebiz/renewals/:id/activities': {
    method: 'POST',
    path: '/gebiz/renewals/test-renewal-001/activities',
    description: 'Log renewal activity',
    testData: {
      activity_type: 'email',
      activity_date: new Date().toISOString().split('T')[0],
      activity_description: 'Test activity'
    },
    skipIfNotFound: true
  },

  // Alert APIs
  'GET /api/v1/alerts/unread-count': {
    method: 'GET',
    path: '/alerts/unread-count',
    description: 'Get unread alert count',
    testData: null
  },
  'GET /api/v1/alerts/history?unread_only=true&limit=10': {
    method: 'GET',
    path: '/alerts/history?unread_only=true&limit=10',
    description: 'Get alert history',
    testData: null
  },
  'POST /api/v1/alerts/history/:id/acknowledge': {
    method: 'POST',
    path: '/alerts/history/test-alert-001/acknowledge',
    description: 'Acknowledge alert',
    testData: {
      user_id: 'test-user',
      action_taken: 'reviewed'
    },
    skipIfNotFound: true
  },
  'GET /api/v1/alerts/preferences?user_id=current_user': {
    method: 'GET',
    path: '/alerts/preferences?user_id=test-user',
    description: 'Get alert preferences',
    testData: null
  },
  'PATCH /api/v1/alerts/preferences': {
    method: 'PATCH',
    path: '/alerts/preferences',
    description: 'Update alert preferences',
    testData: {
      user_id: 'test-user',
      email_enabled: true
    }
  },

  // Lifecycle APIs
  'POST /api/v1/bpo/lifecycle/:id/move': {
    method: 'POST',
    path: '/bpo/lifecycle/test-tender-001/move',
    description: 'Move tender to different stage',
    testData: {
      new_stage: 'review',
      user_id: 'test-user'
    },
    skipIfNotFound: true
  },
  'GET /api/v1/bpo/lifecycle/stats': {
    method: 'GET',
    path: '/bpo/lifecycle/dashboard/stats',
    description: 'Get lifecycle statistics',
    testData: null
  }
};

async function testEndpoint(name, config) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   ${config.description}`);

    const url = `${BASE_URL}${config.path}`;
    const options = {
      method: config.method,
      url: url,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (config.testData) {
      options.data = config.testData;
    }

    const response = await axios(options);

    console.log(`   ✅ ${response.status} ${response.statusText}`);

    if (response.data && response.data.success !== undefined) {
      console.log(`   📊 Success: ${response.data.success}`);

      if (response.data.data && typeof response.data.data === 'object') {
        if (Array.isArray(response.data.data)) {
          console.log(`   📦 Data: Array with ${response.data.data.length} items`);
        } else {
          console.log(`   📦 Data: Object with keys: ${Object.keys(response.data.data).slice(0, 5).join(', ')}`);
        }
      }
    }

    return {
      name,
      status: 'PASS',
      httpStatus: response.status,
      response: response.data
    };

  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 404 && config.skipIfNotFound) {
        console.log(`   ⚠️  ${status} Not Found (Expected for test data)`);
        return {
          name,
          status: 'SKIP',
          httpStatus: status,
          reason: 'Test data not found'
        };
      } else {
        console.log(`   ❌ ${status} ${error.response.statusText}`);
        if (data && data.error) {
          console.log(`   💬 Error: ${data.error}`);
        }
        return {
          name,
          status: 'FAIL',
          httpStatus: status,
          error: data?.error || error.message
        };
      }
    } else {
      console.log(`   ❌ Network/Connection Error: ${error.message}`);
      return {
        name,
        status: 'ERROR',
        error: error.message
      };
    }
  }
}

async function runTests() {
  console.log('🚀 BPO Intelligence Endpoint Verification');
  console.log('=========================================');

  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let errors = 0;

  for (const [name, config] of Object.entries(REQUIRED_ENDPOINTS)) {
    const result = await testEndpoint(name, config);
    results.push(result);

    switch (result.status) {
      case 'PASS':
        passed++;
        break;
      case 'FAIL':
        failed++;
        break;
      case 'SKIP':
        skipped++;
        break;
      case 'ERROR':
        errors++;
        break;
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 VERIFICATION SUMMARY');
  console.log('=======================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`🚫 Errors: ${errors}`);
  console.log(`📋 Total: ${results.length}`);

  if (failed > 0 || errors > 0) {
    console.log('\n🔍 FAILURES & ERRORS:');
    results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').forEach(result => {
      console.log(`   ❌ ${result.name}: ${result.error || 'Unknown error'}`);
    });
  }

  console.log('\n🎯 ENDPOINT COVERAGE:');
  const categories = {
    'RSS Scraper': results.filter(r => r.name.includes('scraping')),
    'Renewal APIs': results.filter(r => r.name.includes('renewals')),
    'Alert APIs': results.filter(r => r.name.includes('alerts')),
    'Lifecycle APIs': results.filter(r => r.name.includes('lifecycle'))
  };

  for (const [category, categoryResults] of Object.entries(categories)) {
    const categoryPassed = categoryResults.filter(r => r.status === 'PASS').length;
    const categoryTotal = categoryResults.length;
    const coverage = categoryTotal > 0 ? Math.round((categoryPassed / categoryTotal) * 100) : 0;

    console.log(`   ${category}: ${categoryPassed}/${categoryTotal} (${coverage}%)`);
  }

  const overallCoverage = Math.round((passed / results.length) * 100);
  console.log(`\n🎯 Overall Coverage: ${overallCoverage}%`);

  if (overallCoverage >= 80) {
    console.log('🎉 VERIFICATION SUCCESSFUL - BPO Intelligence endpoints are ready!');
    process.exit(0);
  } else {
    console.log('⚠️  VERIFICATION INCOMPLETE - Some endpoints need attention');
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/`);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first.');
    console.log('   Run: npm start');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTests();
  }
}

main().catch(console.error);