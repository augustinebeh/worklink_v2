#!/usr/bin/env node
/**
 * AGENT 32: Live Stats API Tester
 * Makes HTTP request to /api/v1/jobs/stats
 */

console.log('🔍 AGENT 32: Live Stats API Tester');
console.log('='.repeat(80) + '\n');

console.log('1️⃣ TESTING STATS ENDPOINT:\n');
console.log('   URL: http://localhost:8080/api/v1/jobs/stats\n');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:8080/api/v1/jobs/stats');
    
    console.log(`2️⃣ RESPONSE STATUS: ${response.status}\n`);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('3️⃣ FULL RESPONSE:\n');
      console.log(JSON.stringify(data, null, 2).split('\n').map(l => `   ${l}`).join('\n'));
      
      console.log('\n4️⃣ STATS DATA ANALYSIS:\n');
      
      if (data.success) {
        console.log('   ✅ Success: true');
      }
      
      if (data.data) {
        console.log('   ✅ Has data object');
        console.log('\n   Stats in data:');
        Object.entries(data.data).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }
      
      if (data.meta) {
        console.log('\n   ℹ️  Meta information:');
        console.log(`      Total: ${data.meta.total}`);
      }
      
      console.log('\n5️⃣ CHECKING EXPECTED PROPERTIES:\n');
      
      const expected = ['total', 'open', 'filled', 'completed', 'closed', 'draft'];
      expected.forEach(prop => {
        const inData = data.data && data.data[prop] !== undefined;
        const inStats = data.stats && data.stats[prop] !== undefined;
        
        if (inData || inStats) {
          const value = inData ? data.data[prop] : data.stats[prop];
          console.log(`   ✅ ${prop}: ${value} (in ${inData ? 'data' : 'stats'})`);
        } else {
          console.log(`   ❌ ${prop}: NOT FOUND`);
        }
      });
      
    } else {
      console.log(`   ❌ Request failed with status ${response.status}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
    }
    
  } catch (error) {
    console.log('   ❌ Request error:', error.message);
    console.log('\n   ℹ️  Make sure:');
    console.log('      1. Server is running on port 8080');
    console.log('      2. Database is accessible');
    console.log('      3. No network restrictions\n');
  }
}

testAPI().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('LIVE API TEST COMPLETE');
  console.log('='.repeat(80) + '\n');
});
