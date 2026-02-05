#!/usr/bin/env node
/**
 * Quick test of new scraping endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testEndpoints() {
  console.log('🧪 Quick BPO Intelligence Endpoint Test');
  console.log('=======================================\n');

  const tests = [
    {
      name: 'API Info',
      method: 'GET',
      path: '/',
      expected: 'API info with scraping endpoint listed'
    },
    {
      name: 'Scraper Status',
      method: 'GET',
      path: '/scraping/status',
      expected: 'Current scraper status'
    },
    {
      name: 'Alert Unread Count',
      method: 'GET',
      path: '/alerts/unread-count',
      expected: 'Unread alert count'
    },
    {
      name: 'Renewal Timeline',
      method: 'GET',
      path: '/gebiz/renewals/dashboard/timeline?months=12',
      expected: 'Renewal timeline data'
    },
    {
      name: 'BPO Lifecycle Stats',
      method: 'GET',
      path: '/bpo/lifecycle/dashboard/stats',
      expected: 'Pipeline statistics'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🧪 ${test.name}...`);

      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.path}`,
        timeout: 3000
      });

      if (response.status === 200) {
        console.log(`   ✅ ${response.status} OK`);

        if (test.path === '/' && response.data.endpoints?.scraping) {
          console.log(`   📊 Scraping endpoint registered: ${response.data.endpoints.scraping.path}`);
        }

        if (response.data.success !== undefined) {
          console.log(`   📈 Success: ${response.data.success}`);
        }

        passed++;
      } else {
        console.log(`   ⚠️  ${response.status} ${response.statusText}`);
        failed++;
      }
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ ${error.response.status} ${error.response.statusText}`);
        if (error.response.data?.error) {
          console.log(`   💬 ${error.response.data.error}`);
        }
      } else {
        console.log(`   ❌ ${error.message}`);
      }
      failed++;
    }

    console.log('');
  }

  console.log('📊 QUICK TEST RESULTS');
  console.log('=====================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total: ${tests.length}`);

  if (failed === 0) {
    console.log('\n🎉 All endpoints are responding correctly!');
  } else {
    console.log(`\n⚠️  ${failed} endpoint(s) need attention`);
  }
}

// Check server first
async function main() {
  try {
    await axios.get(`${BASE_URL}/`);
    console.log('✅ Server is running\n');
    await testEndpoints();
  } catch (error) {
    console.log('❌ Server is not running. Start with: npm start');
  }
}

main().catch(console.error);