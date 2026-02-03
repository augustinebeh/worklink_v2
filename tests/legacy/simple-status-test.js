/**
 * Simple Worker Status Test
 *
 * Basic test of worker status classification without complex SLM routing
 */

const { db } = require('./db');
const WorkerStatusClassifier = require('./utils/worker-status-classifier');
const SmartSLMRouter = require('./utils/smart-slm-router');

async function simpleStatusTest() {
  console.log('🔍 Simple Worker Status Test\n');

  try {
    const statusClassifier = new WorkerStatusClassifier();
    const smartRouter = new SmartSLMRouter();

    // Test 1: Get status statistics
    console.log('📊 Status Statistics:');
    const stats = await statusClassifier.getStatusStatistics();
    console.log(`   Total Workers: ${stats.total}`);
    console.log(`   Pending: ${stats.summary.pending}`);
    console.log(`   Active: ${stats.summary.active}`);
    console.log(`   Inactive: ${stats.summary.inactive}`);

    // Test 2: Test status classification for one candidate
    const testCandidate = db.prepare('SELECT id, name FROM candidates LIMIT 1').get();

    if (testCandidate) {
      console.log(`\n🧪 Testing candidate: ${testCandidate.name}`);

      const classification = await statusClassifier.classifyWorkerStatus(testCandidate.id);
      console.log('   Classification result:', {
        current: classification.currentStatus,
        suggested: classification.suggestedStatus,
        requiresInterview: classification.requiresInterview,
        slmMode: classification.slmMode
      });

      // Test 3: Status change
      console.log('\n🔄 Testing status change to active...');
      const changeResult = await statusClassifier.changeWorkerStatus(
        testCandidate.id,
        'active',
        'test_system',
        'Test transition to active'
      );

      console.log('   Change result:', {
        success: changeResult.success,
        changed: changeResult.changed,
        from: changeResult.from,
        to: changeResult.to
      });

      // Test 4: Verify the change
      console.log('\n✅ Verifying status change...');
      const newClassification = await statusClassifier.classifyWorkerStatus(testCandidate.id);
      console.log('   New classification:', {
        current: newClassification.currentStatus,
        suggested: newClassification.suggestedStatus,
        slmMode: newClassification.slmMode
      });

      // Test 5: Simple SLM routing test
      console.log('\n🤖 Testing SLM routing...');
      try {
        const slmResponse = await smartRouter.routeSLMResponse(
          testCandidate.id,
          'Hello, I need help'
        );

        console.log('   SLM Response:', {
          type: slmResponse.type,
          workerStatus: slmResponse.workerStatus,
          flow: slmResponse.flow,
          hasContent: !!slmResponse.content,
          contentLength: slmResponse.content?.length || 0
        });
      } catch (slmError) {
        console.log('   SLM routing error:', slmError.message);
      }

      // Test 6: Health check
      console.log('\n🏥 System health check...');
      const health = await smartRouter.performHealthCheck();
      console.log('   System status:', health.status);
      console.log('   Component checks:', health.checks);

    } else {
      console.log('❌ No candidates found in database');
    }

    console.log('\n✅ Simple status test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  simpleStatusTest()
    .then(() => {
      console.log('\n🎉 Test completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test crashed:', error);
      process.exit(1);
    });
}

module.exports = { simpleStatusTest };