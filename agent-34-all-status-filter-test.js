#!/usr/bin/env node
/**
 * AGENT 34: All Statuses Filter Investigation
 * Tests what happens when statusFilter is 'all'
 */

console.log('🔍 AGENT 34: All Statuses Filter Investigation');
console.log('='.repeat(80) + '\n');

const http = require('http');

async function testAPI(params) {
  return new Promise((resolve) => {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1/jobs${queryString}`,
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, error: 'Parse error', raw: data });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ error: error.message });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ error: 'Timeout' });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('1️⃣ TEST: GET /api/v1/jobs (no status filter)\n');
  const test1 = await testAPI();
  if (test1.data) {
    console.log(`   Status: ${test1.status}`);
    console.log(`   Success: ${test1.data.success}`);
    console.log(`   Jobs returned: ${test1.data.data?.length || 0}`);
    if (test1.data.data?.length > 0) {
      console.log(`   First job: ${test1.data.data[0].title} (${test1.data.data[0].status})`);
    }
  } else {
    console.log(`   ❌ Error: ${test1.error}`);
  }
  
  console.log('\n2️⃣ TEST: GET /api/v1/jobs?status=all\n');
  const test2 = await testAPI({ status: 'all' });
  if (test2.data) {
    console.log(`   Status: ${test2.status}`);
    console.log(`   Success: ${test2.data.success}`);
    console.log(`   Jobs returned: ${test2.data.data?.length || 0}`);
    if (test2.data.data?.length > 0) {
      console.log(`   First job: ${test2.data.data[0].title} (${test2.data.data[0].status})`);
    }
  } else {
    console.log(`   ❌ Error: ${test2.error}`);
  }
  
  console.log('\n3️⃣ TEST: GET /api/v1/jobs?status=open\n');
  const test3 = await testAPI({ status: 'open' });
  if (test3.data) {
    console.log(`   Status: ${test3.status}`);
    console.log(`   Success: ${test3.data.success}`);
    console.log(`   Jobs returned: ${test3.data.data?.length || 0}`);
    if (test3.data.data?.length > 0) {
      console.log(`   First job: ${test3.data.data[0].title} (${test3.data.data[0].status})`);
    }
  } else {
    console.log(`   ❌ Error: ${test3.error}`);
  }
  
  console.log('\n4️⃣ COMPARISON:\n');
  const noFilter = test1.data?.data?.length || 0;
  const allFilter = test2.data?.data?.length || 0;
  const openFilter = test3.data?.data?.length || 0;
  
  console.log(`   No status param:     ${noFilter} jobs`);
  console.log(`   status=all:          ${allFilter} jobs`);
  console.log(`   status=open:         ${openFilter} jobs`);
  
  console.log('\n5️⃣ DIAGNOSIS:\n');
  
  if (allFilter === 0 && noFilter > 0) {
    console.log('   ❌ BUG FOUND: status=all returns 0 jobs');
    console.log('   ✅ No filter returns jobs correctly');
    console.log('   🔧 FIX: Backend should treat status=all same as no status');
  } else if (allFilter === 0 && noFilter === 0) {
    console.log('   ⚠️  Both return 0 - possible database or auth issue');
  } else {
    console.log('   ✅ All filters working correctly');
  }
}

runTests().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('FILTER TEST COMPLETE');
  console.log('='.repeat(80) + '\n');
});
