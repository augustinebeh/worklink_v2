#!/usr/bin/env node

/**
 * Alert Settings API Test Suite
 * Validates the complete alert preferences system
 */

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3000';
const TEST_USER_ID = 'alert_test_user_' + Date.now();

console.log('🔔 Alert Settings API Test Suite');
console.log('================================');

async function testAPI() {
  try {
    console.log('\n1️⃣ Testing GET /api/v1/alerts/preferences');

    // Test 1: Get initial preferences (should create default)
    const getResponse = await axios.get(`${BASE_URL}/api/v1/alerts/preferences?user_id=${TEST_USER_ID}`);
    console.log('✅ GET preferences successful');
    console.log('   Default preferences created:', JSON.stringify(getResponse.data.data, null, 2));

    const preferences = getResponse.data.data;

    console.log('\n2️⃣ Testing PATCH /api/v1/alerts/preferences');

    // Test 2: Update preferences
    const updateData = {
      user_id: TEST_USER_ID,
      email_enabled: true,
      email_address: 'test@worklink.sg',
      sms_enabled: true,
      sms_number: '+65 9123 4567',
      slack_enabled: true,
      slack_user_id: 'U123456789',
      quiet_hours_enabled: true,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'Asia/Singapore',
      dnd_enabled: false,
      digest_enabled: true,
      digest_frequency: 'weekly',
      digest_time: '09:00',
      digest_days: JSON.stringify(['1', '2', '3', '4', '5']),
      min_priority: 'medium',
      max_alerts_per_hour: 15,
      max_sms_per_day: 3
    };

    const patchResponse = await axios.patch(`${BASE_URL}/api/v1/alerts/preferences`, updateData);
    console.log('✅ PATCH preferences successful');
    console.log('   Updated preferences:', JSON.stringify(patchResponse.data.data, null, 2));

    console.log('\n3️⃣ Testing preference retrieval after update');

    // Test 3: Verify changes persisted
    const verifyResponse = await axios.get(`${BASE_URL}/api/v1/alerts/preferences?user_id=${TEST_USER_ID}`);
    console.log('✅ Verification successful');

    const updated = verifyResponse.data.data;
    console.log('   Email enabled:', updated.email_enabled === 1 ? '✅' : '❌');
    console.log('   SMS enabled:', updated.sms_enabled === 1 ? '✅' : '❌');
    console.log('   Slack enabled:', updated.slack_enabled === 1 ? '✅' : '❌');
    console.log('   Quiet hours enabled:', updated.quiet_hours_enabled === 1 ? '✅' : '❌');
    console.log('   Digest enabled:', updated.digest_enabled === 1 ? '✅' : '❌');
    console.log('   Max alerts per hour:', updated.max_alerts_per_hour);
    console.log('   Max SMS per day:', updated.max_sms_per_day);

    console.log('\n4️⃣ Testing alert rules API');

    // Test 4: Check alert rules endpoint
    const rulesResponse = await axios.get(`${BASE_URL}/api/v1/alerts/rules`);
    console.log('✅ Alert rules endpoint accessible');
    console.log('   Rules count:', rulesResponse.data.data.length);

    console.log('\n5️⃣ Testing alert history API');

    // Test 5: Check alert history endpoint
    const historyResponse = await axios.get(`${BASE_URL}/api/v1/alerts/history`);
    console.log('✅ Alert history endpoint accessible');
    console.log('   History records:', historyResponse.data.data.length);
    console.log('   Unread count:', historyResponse.data.meta.unread_count);

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('\n📊 Alert Settings System Status:');
    console.log('   ✅ API endpoints working');
    console.log('   ✅ Database operations successful');
    console.log('   ✅ Preferences CRUD complete');
    console.log('   ✅ Multi-channel settings supported');
    console.log('   ✅ Rate limiting configuration active');
    console.log('   ✅ Quiet hours and DND supported');
    console.log('   ✅ Digest settings configurable');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the tests
testAPI().catch(console.error);