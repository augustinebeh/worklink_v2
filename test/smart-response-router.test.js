/**
 * Comprehensive Smart Response Router Test Suite
 *
 * Tests all components of the Smart Response Router system:
 * - Intent Classification Engine
 * - Real Data Access Layer
 * - Fact-Based Template System
 * - Admin Escalation System
 * - Smart Router Integration
 * - A/B Testing Functionality
 * - Performance and Quality Metrics
 */

const assert = require('assert');
const { db } = require('../db');

// Import Smart Response Router components
const SmartResponseRouter = require('../services/smart-response-router');
const IntentClassificationEngine = require('../services/smart-response-router/intent-classification');
const RealDataAccessLayer = require('../services/smart-response-router/real-data-access');
const FactBasedTemplateSystem = require('../services/smart-response-router/fact-based-templates');
const AdminEscalationSystem = require('../services/smart-response-router/admin-escalation');
const SmartRouterIntegration = require('../services/ai-chat/smart-router-integration');

describe('Smart Response Router Test Suite', function() {
  this.timeout(10000); // 10 second timeout for complex tests

  let testCandidateId = 'test_candidate_001';
  let testMessages = [];

  before(async function() {
    // Set up test database and test data
    await setupTestData();
  });

  after(async function() {
    // Clean up test data
    await cleanupTestData();
  });

  describe('Intent Classification Engine', function() {
    let intentClassifier;

    beforeEach(function() {
      intentClassifier = new IntentClassificationEngine();
    });

    it('should classify payment inquiry correctly', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };
      const message = "When will I get paid for my last job?";

      const result = await intentClassifier.analyzeMessage(message, candidateContext);

      assert.strictEqual(result.primary, 'payment_inquiry');
      assert(result.confidence > 0.8);
      assert(result.requiresRealData);
    });

    it('should classify greeting correctly', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };
      const message = "Hello! How are you?";

      const result = await intentClassifier.analyzeMessage(message, candidateContext);

      assert.strictEqual(result.primary, 'greeting');
      assert(result.confidence > 0.9);
      assert(!result.requiresRealData);
    });

    it('should detect escalation triggers', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };
      const message = "This is urgent! I'm very angry about my payment!";

      const result = await intentClassifier.analyzeMessage(message, candidateContext);

      assert(result.requiresEscalation);
      assert(result.escalationUrgency === 'high');
    });

    it('should handle pending candidate context', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'pending' };
      const message = "I want to schedule an interview";

      const result = await intentClassifier.analyzeMessage(message, candidateContext);

      assert(result.primary === 'interview_scheduling');
      assert(result.confidence > 0.8);
    });

    it('should classify with low confidence for unclear messages', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };
      const message = "asdf qwerty random text";

      const result = await intentClassifier.analyzeMessage(message, candidateContext);

      assert(result.confidence < 0.5);
      assert.strictEqual(result.primary, 'general_question');
    });
  });

  describe('Real Data Access Layer', function() {
    let dataAccess;

    beforeEach(function() {
      dataAccess = new RealDataAccessLayer();
    });

    it('should retrieve candidate context', async function() {
      const context = await dataAccess.getCandidateContext(testCandidateId);

      assert(context);
      assert.strictEqual(context.id, testCandidateId);
      assert(context.name);
      assert(context.status);
    });

    it('should retrieve real candidate data', async function() {
      const realData = await dataAccess.getRealCandidateData(testCandidateId);

      assert(realData);
      assert(typeof realData.pendingEarnings === 'number');
      assert(typeof realData.paidEarnings === 'number');
      assert(Array.isArray(realData.upcomingJobs));
      assert(realData.fetchedAt);
    });

    it('should validate data availability for intents', async function() {
      const realData = await dataAccess.getRealCandidateData(testCandidateId);

      const hasPaymentData = await dataAccess.validateDataAvailability('payment_inquiry', realData);
      const hasJobData = await dataAccess.validateDataAvailability('job_inquiry', realData);

      assert(typeof hasPaymentData === 'boolean');
      assert(typeof hasJobData === 'boolean');
    });

    it('should handle non-existent candidate', async function() {
      const context = await dataAccess.getCandidateContext('non_existent_candidate');
      assert.strictEqual(context, null);
    });

    it('should cache data properly', async function() {
      const start1 = Date.now();
      const data1 = await dataAccess.getCandidateContext(testCandidateId);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const data2 = await dataAccess.getCandidateContext(testCandidateId);
      const time2 = Date.now() - start2;

      // Second call should be much faster (cached)
      assert(time2 < time1 / 2);
      assert.deepStrictEqual(data1.id, data2.id);
    });
  });

  describe('Fact-Based Template System', function() {
    let templateSystem;

    beforeEach(function() {
      templateSystem = new FactBasedTemplateSystem();
    });

    it('should generate template response for payment inquiry', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };
      const realData = { pendingEarnings: 100, paidEarnings: 250, totalEarnings: 350 };

      const response = await templateSystem.generateRealDataResponse(
        'payment_inquiry',
        candidateContext,
        realData,
        "When will I get paid?"
      );

      assert(response.content);
      assert(response.usesRealData);
      assert(response.confidence > 0.8);
      assert(response.content.includes('$100'));
      assert(response.content.includes('$250'));
    });

    it('should generate pending candidate response', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'pending' };
      const intentAnalysis = { primary: 'account_verification' };

      const response = await templateSystem.generatePendingCandidateResponse(
        candidateContext,
        "When will my account be verified?",
        intentAnalysis
      );

      assert(response.content);
      assert(response.isPendingUser);
      assert(response.content.includes('Test'));
    });

    it('should generate fallback response for unknown intent', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };

      const response = templateSystem.generateFallbackResponse(
        candidateContext,
        "Random question"
      );

      assert(response.content);
      assert(response.escalated);
      assert(response.requiresAdminAttention);
    });

    it('should handle error gracefully', async function() {
      const candidateContext = null; // Invalid context

      const response = templateSystem.generateErrorResponse(candidateContext);

      assert(response.content);
      assert(response.error);
      assert(response.escalated);
    });
  });

  describe('Admin Escalation System', function() {
    let escalationSystem;

    beforeEach(function() {
      escalationSystem = new AdminEscalationSystem();
    });

    it('should create escalation for technical issue', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };
      const intentAnalysis = {
        primary: 'technical_issue',
        escalationReason: 'technical_issue',
        confidence: 0.9
      };

      const response = await escalationSystem.createEscalation(
        candidateContext,
        "The app is broken and not working!",
        intentAnalysis
      );

      assert(response.escalated);
      assert(response.requiresAdminAttention);
      assert(response.escalationId);
      assert(response.content);
    });

    it('should determine correct priority for urgent issues', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };
      const intentAnalysis = {
        primary: 'complaint_feedback',
        escalationReason: 'complaint',
        escalationUrgency: 'high'
      };

      const escalationDetails = await escalationSystem.analyzeEscalationRequirements(
        candidateContext,
        "This is urgent! I'm very unhappy!",
        intentAnalysis
      );

      assert.strictEqual(escalationDetails.priority, 'urgent');
      assert.strictEqual(escalationDetails.category, 'complaint_feedback');
    });

    it('should generate different response templates', async function() {
      const candidateContext = { id: testCandidateId, name: 'Test User', status: 'active' };

      const urgentDetails = { templateType: 'urgent', priority: 'urgent' };
      const technicalDetails = { templateType: 'technical', priority: 'high' };

      const urgentResponse = await escalationSystem.generateEscalationResponse(candidateContext, urgentDetails);
      const technicalResponse = await escalationSystem.generateEscalationResponse(candidateContext, technicalDetails);

      assert(urgentResponse.content !== technicalResponse.content);
      assert(urgentResponse.estimatedResponseTime);
    });
  });

  describe('Smart Response Router Integration', function() {
    let smartRouter;

    beforeEach(function() {
      smartRouter = new SmartResponseRouter();
    });

    it('should process message end-to-end', async function() {
      const message = "How much money do I have in my account?";

      const response = await smartRouter.processMessage(testCandidateId, message);

      assert(response.content);
      assert(response.source);
      assert(response.confidence);
      assert(response.intentAnalysis);
      assert(response.responseTimeMs);
      assert.strictEqual(response.routedBy, 'smart-response-router');
    });

    it('should handle pending candidate with interview scheduling', async function() {
      // Set test candidate to pending status
      db.prepare('UPDATE candidates SET status = ? WHERE id = ?').run('pending', testCandidateId);

      const message = "When can I schedule my interview?";

      const response = await smartRouter.processMessage(testCandidateId, message);

      assert(response.content);
      assert(response.isPendingUser || response.source === 'interview_scheduling');
    });

    it('should escalate low-confidence messages', async function() {
      const message = "qwerty asdf random unclear message";

      const response = await smartRouter.processMessage(testCandidateId, message);

      assert(response.escalated || response.requiresAdminAttention);
    });

    it('should use real data for payment inquiries', async function() {
      const message = "What's my balance?";

      const response = await smartRouter.processMessage(testCandidateId, message);

      assert(response.content);
      // Should either use real data or escalate if data unavailable
      assert(response.usesRealData || response.escalated);
    });

    it('should maintain performance targets', async function() {
      const message = "Hello, how are you?";

      const start = Date.now();
      const response = await smartRouter.processMessage(testCandidateId, message);
      const responseTime = Date.now() - start;

      assert(responseTime < smartRouter.routingConfig.maxResponseTime);
      assert(response.responseTimeMs < smartRouter.routingConfig.maxResponseTime);
    });
  });

  describe('A/B Testing Integration', function() {
    let integration;

    beforeEach(function() {
      const { SmartRouterIntegration } = require('../services/ai-chat/smart-router-integration');
      integration = new SmartRouterIntegration();
    });

    it('should determine A/B testing assignment consistently', function() {
      const candidateId = 'consistent_test_candidate';

      const assignment1 = integration.shouldUseSmartRouter(candidateId);
      const assignment2 = integration.shouldUseSmartRouter(candidateId);

      assert.strictEqual(assignment1, assignment2);
    });

    it('should run A/B comparison when enabled', async function() {
      // Enable comparison mode
      integration.updateMigrationConfig({
        comparisonMode: true,
        enableABTesting: true,
        rolloutPercentage: 50
      });

      const message = "Hello there!";

      const response = await integration.generateResponse(testCandidateId, message);

      assert(response.abTesting);
      assert(response.systemUsed);
    });

    it('should select better response in A/B testing', async function() {
      const smartResult = {
        content: "Real data response",
        confidence: 0.95,
        usesRealData: true,
        source: 'fact_based_real_data'
      };

      const legacyResult = {
        content: "Your funds will arrive within 24 hours automatically", // Problematic content
        confidence: 0.8,
        usesRealData: false,
        source: 'llm'
      };

      const selected = integration.selectBestResponse(smartResult, legacyResult, testCandidateId);

      assert.strictEqual(selected.selectedReason, 'legacy_problematic_content');
      assert.strictEqual(selected.source, 'fact_based_real_data');
    });
  });

  describe('Performance and Quality Tests', function() {
    let smartRouter;

    beforeEach(function() {
      smartRouter = new SmartResponseRouter();
    });

    it('should not contain false promises in responses', async function() {
      const problematicMessages = [
        "When will I get paid?",
        "Will my payment be approved?",
        "How long does withdrawal take?",
        "When will funds arrive?"
      ];

      for (const message of problematicMessages) {
        const response = await smartRouter.processMessage(testCandidateId, message);

        const hasProblematicContent = checkForProblematicContent(response.content);
        assert(!hasProblematicContent, `Response contains problematic content: ${response.content}`);
      }
    });

    it('should maintain response time under 100ms for simple queries', async function() {
      const simpleMessages = ["Hello", "Hi there", "Good morning"];

      for (const message of simpleMessages) {
        const start = Date.now();
        const response = await smartRouter.processMessage(testCandidateId, message);
        const responseTime = Date.now() - start;

        assert(responseTime < 100, `Response time ${responseTime}ms exceeds 100ms threshold`);
      }
    });

    it('should escalate rather than fabricate for unknown queries', async function() {
      const unknownMessages = [
        "Tell me about quantum physics",
        "What's the weather like?",
        "Can you solve math equations?",
        "Random unknown topic question"
      ];

      for (const message of unknownMessages) {
        const response = await smartRouter.processMessage(testCandidateId, message);

        // Should either escalate or use a safe fallback
        assert(
          response.escalated ||
          response.requiresAdminAttention ||
          response.source.includes('fallback'),
          `Should escalate unknown query: ${message}`
        );
      }
    });

    it('should provide consistent responses for identical queries', async function() {
      const message = "What's my current balance?";

      const response1 = await smartRouter.processMessage(testCandidateId, message);
      const response2 = await smartRouter.processMessage(testCandidateId, message);

      // Responses should be similar (allowing for timestamp differences)
      assert.strictEqual(response1.source, response2.source);
      assert.strictEqual(response1.intent, response2.intent);
    });
  });

  describe('End-to-End Workflow Tests', function() {
    it('should handle complete pending candidate workflow', async function() {
      // Set candidate to pending
      db.prepare('UPDATE candidates SET status = ? WHERE id = ?').run('pending', testCandidateId);

      const conversations = [
        "Hello, I'm new here",
        "When will my account be verified?",
        "I'd like to schedule an interview",
        "I'm available tomorrow morning"
      ];

      for (const message of conversations) {
        const response = await processMessageThroughSystem(testCandidateId, message);

        assert(response.content);
        assert(response.isPendingUser || response.source === 'interview_scheduling');
        assert(!checkForProblematicContent(response.content));
      }
    });

    it('should handle complete active candidate workflow', async function() {
      // Set candidate to active
      db.prepare('UPDATE candidates SET status = ? WHERE id = ?').run('active', testCandidateId);

      const conversations = [
        "Hi there!",
        "What jobs are available?",
        "What's my current balance?",
        "I need help with the app"
      ];

      for (const message of conversations) {
        const response = await processMessageThroughSystem(testCandidateId, message);

        assert(response.content);
        assert(response.systemUsed);
        assert(!checkForProblematicContent(response.content));
      }
    });
  });

  // Helper Functions
  async function setupTestData() {
    // Create test candidate
    db.prepare(`
      INSERT OR REPLACE INTO candidates
      (id, name, email, phone, status, created_at, xp, level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testCandidateId,
      'Test User',
      'test@example.com',
      '+1234567890',
      'active',
      new Date().toISOString(),
      100,
      1
    );

    // Create test payment data
    db.prepare(`
      INSERT OR REPLACE INTO payments
      (id, candidate_id, amount, total_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'test_payment_1',
      testCandidateId,
      100,
      100,
      'pending',
      new Date().toISOString()
    );

    db.prepare(`
      INSERT OR REPLACE INTO payments
      (id, candidate_id, amount, total_amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'test_payment_2',
      testCandidateId,
      250,
      250,
      'paid',
      new Date().toISOString()
    );

    // Create test job data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    db.prepare(`
      INSERT OR REPLACE INTO jobs
      (id, title, location, job_date, pay_rate, status, total_slots, filled_slots)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'test_job_1',
      'Test Job',
      'Test Location',
      tomorrow.toISOString().split('T')[0],
      25,
      'open',
      5,
      2
    );

    // Initialize Smart Router database tables
    const smartRouter = new SmartResponseRouter();
    await smartRouter.initializeDecisionLogging();
  }

  async function cleanupTestData() {
    // Clean up test data
    db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);
    db.prepare('DELETE FROM payments WHERE candidate_id = ?').run(testCandidateId);
    db.prepare('DELETE FROM jobs WHERE id LIKE ?').run('test_job_%');
    db.prepare('DELETE FROM escalations WHERE candidate_id = ?').run(testCandidateId);
    db.prepare('DELETE FROM smart_router_decisions WHERE candidate_id = ?').run(testCandidateId);
    db.prepare('DELETE FROM ab_comparison_logs WHERE candidate_id = ?').run(testCandidateId);
  }

  function checkForProblematicContent(content) {
    const problematicPhrases = [
      'will arrive within',
      'automatic approval',
      'guaranteed payment',
      'your funds will be',
      'will be processed in',
      'should receive within',
      'automatically approved',
      'instant approval',
      'within 24 hours',
      'completely free'
    ];

    return problematicPhrases.some(phrase =>
      content.toLowerCase().includes(phrase)
    );
  }

  async function processMessageThroughSystem(candidateId, message) {
    const { generateResponse } = require('../services/ai-chat/smart-router-integration');
    return await generateResponse(candidateId, message);
  }
});

// Export for use in other test files
module.exports = {
  checkForProblematicContent: function(content) {
    const problematicPhrases = [
      'will arrive within',
      'automatic approval',
      'guaranteed payment',
      'your funds will be',
      'will be processed in',
      'should receive within',
      'automatically approved',
      'instant approval',
      'within 24 hours',
      'completely free'
    ];

    return problematicPhrases.some(phrase =>
      content.toLowerCase().includes(phrase)
    );
  }
};