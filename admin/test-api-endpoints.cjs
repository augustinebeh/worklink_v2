/**
 * Quick API Integration Test
 * Tests the backend API endpoints for BPO Tender Lifecycle
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:8080';

async function testApiEndpoints() {
  console.log('🚀 Testing BPO Tender Lifecycle API Endpoints...\n');

  const tests = [
    {
      name: 'Health Check',
      url: `${API_BASE}/health`,
      method: 'GET'
    },
    {
      name: 'Get All Tenders',
      url: `${API_BASE}/api/v1/bpo/lifecycle`,
      method: 'GET'
    },
    {
      name: 'Get Pipeline Stats',
      url: `${API_BASE}/api/v1/bpo/lifecycle/dashboard/stats`,
      method: 'GET'
    },
    {
      name: 'Get Deadlines',
      url: `${API_BASE}/api/v1/bpo/lifecycle/dashboard/deadlines`,
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      const response = await fetch(test.url, { method: test.method });
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ ${test.name}: ${response.status} OK`);
        if (test.name === 'Get All Tenders') {
          console.log(`📋 Found ${data.data?.length || 0} tenders`);
        }
        if (test.name === 'Get Pipeline Stats') {
          console.log(`📊 Stats: ${JSON.stringify(data.data, null, 2)}`);
        }
      } else {
        console.log(`❌ ${test.name}: ${response.status} ${response.statusText}`);
        console.log(`📝 Error: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Network error - ${error.message}`);
    }
    console.log('');
  }
}

async function createTestTender() {
  console.log('🔄 Creating test tender for drag-and-drop testing...\n');

  const testTender = {
    title: 'Test Kanban Tender - Customer Service BPO',
    agency: 'Ministry of Digital Development',
    description: 'Test tender for kanban drag-and-drop functionality',
    category: 'Business Process Outsourcing',
    estimated_value: 250000,
    closing_date: '2026-03-15',
    stage: 'new_opportunity',
    priority: 'high',
    is_urgent: true,
    assigned_to: 'sarah_tan'
  };

  try {
    const response = await fetch(`${API_BASE}/api/v1/bpo/lifecycle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTender)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Test tender created successfully`);
      console.log(`📋 Tender ID: ${data.data.id}`);
      console.log(`🎯 Stage: ${data.data.stage}`);
      return data.data;
    } else {
      console.log(`❌ Failed to create test tender: ${response.status}`);
      console.log(`📝 Error: ${JSON.stringify(data, null, 2)}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Network error creating tender: ${error.message}`);
    return null;
  }
}

async function testTenderMove(tenderId) {
  console.log(`🔄 Testing tender stage movement (ID: ${tenderId})...\n`);

  const stages = ['review', 'bidding', 'internal_approval', 'submitted'];

  for (const stage of stages) {
    try {
      const response = await fetch(`${API_BASE}/api/v1/bpo/lifecycle/${tenderId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_stage: stage,
          user_id: 'test_user',
          notes: `Moved via API test to ${stage}`
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Moved to ${stage}: ${response.status} OK`);
        console.log(`📋 Current stage: ${data.data.stage}`);
      } else {
        console.log(`❌ Failed to move to ${stage}: ${response.status}`);
        console.log(`📝 Error: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error) {
      console.log(`❌ Network error moving to ${stage}: ${error.message}`);
    }
    console.log('');

    // Small delay between moves
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function main() {
  console.log('🧪 BPO Tender Lifecycle API Integration Test');
  console.log('=' .repeat(50) + '\n');

  // Test basic API endpoints
  await testApiEndpoints();

  // Create a test tender
  const testTender = await createTestTender();

  if (testTender) {
    // Test moving tender through stages
    await testTenderMove(testTender.id);
  }

  console.log('🏁 API integration tests completed!\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testApiEndpoints, createTestTender, testTenderMove };