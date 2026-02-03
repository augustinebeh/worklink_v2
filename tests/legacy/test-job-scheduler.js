/**
 * Test script for Job Scheduler functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testJobScheduler() {
  console.log('🧪 Testing Job Scheduler API...\n');

  try {
    // Test 1: Get all jobs status
    console.log('1. Testing GET /job-scheduler');
    const allJobs = await axios.get(`${BASE_URL}/job-scheduler`);
    console.log('✅ All jobs:', JSON.stringify(allJobs.data, null, 2));

    // Test 2: Get specific job status
    console.log('\n2. Testing GET /job-scheduler/gebiz-rss-check');
    const specificJob = await axios.get(`${BASE_URL}/job-scheduler/gebiz-rss-check`);
    console.log('✅ Specific job:', JSON.stringify(specificJob.data, null, 2));

    // Test 3: Manually trigger GeBIZ RSS check
    console.log('\n3. Testing POST /job-scheduler/gebiz-rss-check/trigger');
    const triggerResult = await axios.post(`${BASE_URL}/job-scheduler/gebiz-rss-check/trigger`);
    console.log('✅ Trigger result:', JSON.stringify(triggerResult.data, null, 2));

    // Test 4: Get system health
    console.log('\n4. Testing GET /job-scheduler/system/health');
    const health = await axios.get(`${BASE_URL}/job-scheduler/system/health`);
    console.log('✅ System health:', JSON.stringify(health.data, null, 2));

    // Test 5: Get system stats
    console.log('\n5. Testing GET /job-scheduler/system/stats');
    const stats = await axios.get(`${BASE_URL}/job-scheduler/system/stats`);
    console.log('✅ System stats:', JSON.stringify(stats.data, null, 2));

    // Test 6: Update job configuration
    console.log('\n6. Testing PATCH /job-scheduler/gebiz-rss-check (change description)');
    const updateResult = await axios.patch(`${BASE_URL}/job-scheduler/gebiz-rss-check`, {
      description: 'Updated description: Automated GeBIZ RSS feed checking with enhanced logging'
    });
    console.log('✅ Update result:', JSON.stringify(updateResult.data, null, 2));

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  testJobScheduler();
}

module.exports = { testJobScheduler };