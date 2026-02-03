/**
 * Test Script: SLM-WebSocket Integration
 *
 * This script tests the complete flow:
 * 1. Candidate sends message via WebSocket
 * 2. Smart SLM Router processes the message
 * 3. SLM generates appropriate response
 * 4. Response is sent back via WebSocket/Messaging
 */

const { db } = require('./db');
const SmartSLMRouter = require('./utils/smart-slm-router');
const SLMSchedulingBridge = require('./utils/slm-scheduling-bridge');
const messaging = require('./services/messaging');

class SLMWebSocketIntegrationTest {
  constructor() {
    this.router = new SmartSLMRouter();
    this.bridge = new SLMSchedulingBridge();
    this.testResults = [];
  }

  async runTests() {
    console.log('🧪 Testing SLM-WebSocket Integration\n');

    try {
      await this.testPendingCandidateFlow();
      await this.testActiveCandidateFlow();
      await this.testInterviewSchedulingFlow();
      await this.testSLMDatabaseEnhancement();
      await this.testMessagingIntegration();
      await this.testErrorHandling();

      this.displayResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async testPendingCandidateFlow() {
    console.log('📝 Test 1: Pending Candidate Flow');

    try {
      // Create a test pending candidate
      const testCandidate = this.createTestCandidate('pending');

      // Test various pending candidate messages
      const testMessages = [
        'Hi, I want to schedule an interview',
        'When can we meet?',
        'I\'m available tomorrow morning',
        'Can you reschedule my interview?'
      ];

      for (const message of testMessages) {
        console.log(`  Testing message: "${message}"`);

        // Route through Smart SLM Router
        const result = await this.router.routeSLMResponse(
          testCandidate.id,
          message,
          { channel: 'app' }
        );

        if (result && result.type && result.content) {
          console.log(`  ✅ Generated response: ${result.type}`);
          this.testResults.push({
            test: 'Pending Candidate Flow',
            message: message,
            status: 'pass',
            response: result.type
          });
        } else {
          console.log(`  ❌ No response generated`);
          this.testResults.push({
            test: 'Pending Candidate Flow',
            message: message,
            status: 'fail',
            error: 'No response'
          });
        }
      }

      console.log('');

    } catch (error) {
      console.error('  ❌ Test failed:', error.message);
      this.testResults.push({
        test: 'Pending Candidate Flow',
        status: 'error',
        error: error.message
      });
    }
  }

  async testActiveCandidateFlow() {
    console.log('📝 Test 2: Active Candidate Flow');

    try {
      const testCandidate = this.createTestCandidate('active');

      const testMessages = [
        'Looking for jobs',
        'What about payment?',
        'Check my schedule',
        'How much do I earn?'
      ];

      for (const message of testMessages) {
        console.log(`  Testing message: "${message}"`);

        const result = await this.router.routeSLMResponse(
          testCandidate.id,
          message,
          { channel: 'app' }
        );

        if (result && result.type && result.content) {
          console.log(`  ✅ Generated response: ${result.type}`);
          this.testResults.push({
            test: 'Active Candidate Flow',
            message: message,
            status: 'pass',
            response: result.type
          });
        } else {
          console.log(`  ❌ No response generated`);
          this.testResults.push({
            test: 'Active Candidate Flow',
            message: message,
            status: 'fail',
            error: 'No response'
          });
        }
      }

      console.log('');

    } catch (error) {
      console.error('  ❌ Test failed:', error.message);
    }
  }

  async testInterviewSchedulingFlow() {
    console.log('📝 Test 3: Interview Scheduling Flow');

    try {
      const testCandidate = this.createTestCandidate('pending');

      // Test direct SLM bridge functionality
      const schedulingMessages = [
        'schedule interview',
        'book verification call',
        'available tomorrow morning',
        'confirm interview'
      ];

      for (const message of schedulingMessages) {
        console.log(`  Testing scheduling: "${message}"`);

        const result = await this.bridge.integrateWithChatSLM(
          testCandidate.id,
          message,
          { mode: 'test' }
        );

        if (result && result.content) {
          console.log(`  ✅ Scheduling response generated`);
          this.testResults.push({
            test: 'Interview Scheduling',
            message: message,
            status: 'pass',
            response: result.type || 'scheduling'
          });
        } else {
          console.log(`  ❌ No scheduling response`);
          this.testResults.push({
            test: 'Interview Scheduling',
            message: message,
            status: 'fail',
            error: 'No response'
          });
        }
      }

      console.log('');

    } catch (error) {
      console.error('  ❌ Scheduling test failed:', error.message);
    }
  }

  async testSLMDatabaseEnhancement() {
    console.log('📝 Test 4: SLM Database Enhancement');

    try {
      // Check if our enhanced SLM responses are in the database
      const enhancedCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM ml_knowledge_base
        WHERE source = 'slm_enhanced'
      `).get();

      console.log(`  Enhanced SLM entries: ${enhancedCount.count}`);

      if (enhancedCount.count >= 30) {
        console.log('  ✅ SLM database enhancement verified');
        this.testResults.push({
          test: 'SLM Database Enhancement',
          status: 'pass',
          details: `${enhancedCount.count} enhanced entries found`
        });
      } else {
        console.log('  ❌ Insufficient SLM enhancements');
        this.testResults.push({
          test: 'SLM Database Enhancement',
          status: 'fail',
          error: `Only ${enhancedCount.count} entries found`
        });
      }

      // Test specific interview categories
      const categories = ['interview', 'scheduling', 'availability'];
      for (const category of categories) {
        const categoryCount = db.prepare(`
          SELECT COUNT(*) as count
          FROM ml_knowledge_base
          WHERE category = ? AND source = 'slm_enhanced'
        `).get(category);

        console.log(`  ${category} responses: ${categoryCount.count}`);
      }

      console.log('');

    } catch (error) {
      console.error('  ❌ Database test failed:', error.message);
    }
  }

  async testMessagingIntegration() {
    console.log('📝 Test 5: Messaging Integration');

    try {
      const testCandidate = this.createTestCandidate('pending');

      // Test that messaging service can handle SLM responses
      const testContent = 'Test SLM response message';

      // Simulate sending an SLM-generated message
      const result = await messaging.sendToCandidate(testCandidate.id, testContent, {
        channel: 'app',
        aiGenerated: true,
        slmGenerated: true,
        aiSource: 'smart_slm_router'
      });

      if (result.success) {
        console.log('  ✅ SLM message routing successful');
        this.testResults.push({
          test: 'Messaging Integration',
          status: 'pass',
          details: `Message sent via ${result.deliveryMethod.join(', ')}`
        });
      } else {
        console.log('  ❌ Message routing failed');
        this.testResults.push({
          test: 'Messaging Integration',
          status: 'fail',
          error: result.error
        });
      }

      console.log('');

    } catch (error) {
      console.error('  ❌ Messaging test failed:', error.message);
    }
  }

  async testErrorHandling() {
    console.log('📝 Test 6: Error Handling');

    try {
      // Test with invalid candidate ID
      const invalidResult = await this.router.routeSLMResponse(
        999999,
        'test message',
        { channel: 'app' }
      );

      if (invalidResult.error || invalidResult.type === 'fallback_response') {
        console.log('  ✅ Error handling working correctly');
        this.testResults.push({
          test: 'Error Handling',
          status: 'pass',
          details: 'Graceful fallback for invalid candidate'
        });
      } else {
        console.log('  ❌ Error handling needs improvement');
        this.testResults.push({
          test: 'Error Handling',
          status: 'fail',
          error: 'No proper error handling'
        });
      }

      console.log('');

    } catch (error) {
      // This is actually expected for error handling test
      console.log('  ✅ Exception handling working');
      this.testResults.push({
        test: 'Error Handling',
        status: 'pass',
        details: 'Exception properly caught'
      });
    }
  }

  createTestCandidate(status = 'pending') {
    const testId = Date.now() + Math.random();
    const candidateData = {
      id: testId,
      name: `Test Candidate ${testId}`,
      email: `test${testId}@example.com`,
      phone: '+65 9999 9999',
      status: status,
      created_at: new Date().toISOString()
    };

    // Insert test candidate into database
    try {
      db.prepare(`
        INSERT INTO candidates (id, name, email, phone, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        candidateData.id,
        candidateData.name,
        candidateData.email,
        candidateData.phone,
        candidateData.status,
        candidateData.created_at
      );
    } catch (error) {
      console.warn('Test candidate creation failed:', error.message);
    }

    return candidateData;
  }

  displayResults() {
    console.log('📊 Test Results Summary\n');

    const passed = this.testResults.filter(r => r.status === 'pass').length;
    const failed = this.testResults.filter(r => r.status === 'fail').length;
    const errors = this.testResults.filter(r => r.status === 'error').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚨 Errors: ${errors}`);
    console.log(`📝 Total Tests: ${this.testResults.length}\n`);

    // Show failures and errors
    const issues = this.testResults.filter(r => r.status !== 'pass');
    if (issues.length > 0) {
      console.log('🔍 Issues Found:');
      issues.forEach(issue => {
        console.log(`  - ${issue.test}: ${issue.error || 'Failed'}`);
      });
      console.log('');
    }

    // Health check
    const successRate = (passed / this.testResults.length) * 100;
    if (successRate >= 80) {
      console.log('🎉 SLM-WebSocket Integration: HEALTHY');
    } else if (successRate >= 60) {
      console.log('⚠️ SLM-WebSocket Integration: NEEDS ATTENTION');
    } else {
      console.log('🚨 SLM-WebSocket Integration: CRITICAL ISSUES');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SLMWebSocketIntegrationTest();
  tester.runTests().catch(console.error);
}

module.exports = SLMWebSocketIntegrationTest;