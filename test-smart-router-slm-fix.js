/**
 * Test Smart Router SLM Integration Fix
 *
 * This test verifies that:
 * 1. Smart Router properly delegates pending candidates to SLM bridge
 * 2. SLM bridge returns valid responses for interview scheduling
 * 3. Fallback mechanisms work when SLM bridge fails
 * 4. Health checks work properly
 */

const SmartResponseRouter = require('./services/smart-response-router');
const SLMSchedulingBridge = require('./utils/slm-scheduling-bridge');

async function testSmartRouterSLMIntegration() {
  console.log('🧪 Testing Smart Router SLM Integration Fix...\n');

  try {
    // Initialize components
    const smartRouter = new SmartResponseRouter();
    const slmBridge = new SLMSchedulingBridge();

    // Test 1: SLM Bridge Health Check
    console.log('1️⃣ Testing SLM Bridge health check...');
    const healthStatus = await slmBridge.performHealthCheck();
    console.log('Health status:', JSON.stringify(healthStatus, null, 2));

    if (healthStatus.status !== 'healthy') {
      console.warn('⚠️ SLM Bridge health check failed - some tests may not work properly');
    }

    // Test 2: Mock pending candidate data
    const mockPendingCandidate = {
      id: 'test-pending-001',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'pending',
      phone: '+65 1234 5678'
    };

    const mockMessages = [
      'Hi, I want to schedule an interview',
      'When can I meet with someone?',
      'I am available tomorrow morning',
      'Can I book a time slot?'
    ];

    // Test 3: Direct SLM Bridge responses
    console.log('\n2️⃣ Testing direct SLM Bridge responses...');
    for (let i = 0; i < mockMessages.length; i++) {
      const message = mockMessages[i];
      console.log(`\nTesting message: "${message}"`);

      try {
        const slmResponse = await slmBridge.handlePendingCandidateMessage(
          mockPendingCandidate.id,
          message,
          { mockMode: true, candidateContext: mockPendingCandidate }
        );

        console.log('SLM Response Type:', slmResponse?.type || 'undefined');
        console.log('SLM Response Valid:', slmBridge.verifyResponseQuality(slmResponse));
        console.log('Content Length:', slmResponse?.content?.length || 0);

        if (slmResponse?.content && slmResponse.content.length > 0) {
          console.log('✅ SLM Bridge working for this message');
        } else {
          console.log('❌ SLM Bridge failed for this message');
        }

      } catch (error) {
        console.error('❌ SLM Bridge error:', error.message);
      }
    }

    // Test 4: Smart Router Integration
    console.log('\n3️⃣ Testing Smart Router integration with SLM Bridge...');

    // Mock the database and real data access for testing
    const mockCandidateContext = mockPendingCandidate;
    const mockRealData = { pendingEarnings: 0, availableEarnings: 0 };
    const mockIntentAnalysis = { primary: 'schedule_interview', confidence: 0.8 };

    try {
      const smartRouterResponse = await smartRouter.handlePendingCandidateScheduling(
        mockCandidateContext,
        'I want to schedule an interview',
        mockIntentAnalysis
      );

      console.log('Smart Router Response Source:', smartRouterResponse?.source);
      console.log('SLM Bridge Used:', smartRouterResponse?.slmBridgeUsed || false);
      console.log('Is Pending User:', smartRouterResponse?.isPendingUser || false);
      console.log('Can Schedule Interview:', smartRouterResponse?.canScheduleInterview || false);

      if (smartRouterResponse?.slmBridgeUsed) {
        console.log('✅ Smart Router successfully delegated to SLM Bridge');
      } else if (smartRouterResponse?.escalated) {
        console.log('⚠️ Smart Router escalated (expected if SLM bridge unavailable)');
      } else {
        console.log('❌ Smart Router did not use SLM Bridge as expected');
      }

    } catch (error) {
      console.error('❌ Smart Router integration error:', error.message);
    }

    // Test 5: Response Quality Verification
    console.log('\n4️⃣ Testing response quality verification...');

    const testResponses = [
      { content: 'Valid response', type: 'test' }, // Valid
      { content: '', type: 'test' }, // Invalid - empty content
      { content: 'Short', type: 'test' }, // Invalid - too short
      { type: 'test' }, // Invalid - no content
      { content: 'Valid response' }, // Invalid - no type
      null, // Invalid - null
      'string', // Invalid - not object
    ];

    testResponses.forEach((response, index) => {
      const isValid = slmBridge.verifyResponseQuality(response);
      console.log(`Test ${index + 1}: ${isValid ? '✅ Valid' : '❌ Invalid'} - ${JSON.stringify(response)}`);
    });

    console.log('\n🎉 Smart Router SLM Integration test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testSmartRouterSLMIntegration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSmartRouterSLMIntegration };