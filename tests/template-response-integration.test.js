/**
 * Comprehensive Integration Tests for Fact-Based Template Response System
 *
 * Tests the entire system from message processing to admin escalation
 */

const request = require('supertest');
const { app } = require('../server'); // Assuming server exports app
const { db } = require('../db');
const FactBasedTemplateSystem = require('../services/template-responses');
const TemplateIntegrationBridge = require('../services/template-responses/integration-bridge');

describe('Fact-Based Template Response System Integration', () => {
  let templateSystem;
  let integrationBridge;
  let testCandidateId;

  beforeAll(async () => {
    // Initialize systems
    templateSystem = new FactBasedTemplateSystem();
    integrationBridge = new TemplateIntegrationBridge();

    // Create test candidate
    testCandidateId = `test-candidate-${Date.now()}`;
    db.prepare(`
      INSERT INTO candidates (
        id, name, email, phone, status, xp, current_points
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      testCandidateId,
      'John Test',
      'john@test.com',
      '+6512345678',
      'active',
      100,
      50
    );

    // Add test payment data
    db.prepare(`
      INSERT INTO payments (
        id, candidate_id, amount, status, job_title, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(`payment-${testCandidateId}`, testCandidateId, 125.50, 'pending', 'Event Staff');
  });

  afterAll(async () => {
    // Cleanup test data
    db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);
    db.prepare('DELETE FROM payments WHERE candidate_id = ?').run(testCandidateId);
    db.prepare('DELETE FROM template_usage_logs WHERE candidate_id = ?').run(testCandidateId);
    db.prepare('DELETE FROM escalation_queue WHERE candidate_id = ?').run(testCandidateId);
  });

  describe('Intent Classification', () => {
    test('should correctly classify payment inquiries', async () => {
      const intent = await templateSystem.intentClassifier.classifyMessage(
        'When will I get paid?'
      );

      expect(intent.category).toBe('payment_inquiry');
      expect(intent.confidence).toBeGreaterThan(0.8);
      expect(intent.subcategory).toBe('timing');
      expect(intent.requiresRealData).toBe(true);
    });

    test('should detect escalation triggers', async () => {
      const intent = await templateSystem.intentClassifier.classifyMessage(
        'This is urgent! I need my payment now!'
      );

      expect(intent.escalationLevel).toBe('high');
      expect(intent.messageTone).toBe('negative');
    });

    test('should classify job inquiries', async () => {
      const intent = await templateSystem.intentClassifier.classifyMessage(
        'Are there any jobs available for me?'
      );

      expect(intent.category).toBe('job_inquiry');
      expect(intent.subcategory).toBe('availability');
      expect(intent.requiresRealData).toBe(true);
    });
  });

  describe('Real Data Integration', () => {
    test('should retrieve real payment data', async () => {
      const paymentData = await templateSystem.dataAccess.getPaymentData(testCandidateId);

      expect(paymentData).toHaveProperty('pending_earnings');
      expect(paymentData.pending_earnings).toBe(125.50);
      expect(paymentData).toHaveProperty('recent_payments');
      expect(paymentData.recent_payments).toHaveLength(1);
    });

    test('should get candidate profile', async () => {
      const candidate = await templateSystem.dataAccess.getCandidateProfile(testCandidateId);

      expect(candidate).toHaveProperty('name', 'John Test');
      expect(candidate).toHaveProperty('status', 'active');
      expect(candidate).toHaveProperty('xp', 100);
    });

    test('should retrieve real-time data based on intent', async () => {
      const intent = { category: 'payment_inquiry', subcategory: 'timing' };
      const realData = await templateSystem.dataAccess.getRealTimeData(testCandidateId, intent);

      expect(realData).toHaveProperty('payment');
      expect(realData.payment.pending_earnings).toBe(125.50);
    });
  });

  describe('Template Matching and Response Generation', () => {
    test('should find appropriate template for payment inquiry', async () => {
      const intent = {
        category: 'payment_inquiry',
        subcategory: 'timing',
        confidence: 0.9
      };

      const template = await templateSystem.templateManager.findBestTemplate(intent, 'en');

      expect(template).toBeDefined();
      expect(template.category_name).toContain('payment');
    });

    test('should generate response with real data', async () => {
      const response = await templateSystem.processMessage(
        testCandidateId,
        'When will I get my payment?',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.content).toContain('$125.50');
      expect(response.content).toContain('admin team');
      expect(response.source).toContain('template');
      expect(response.usesRealData).toBe(true);

      // Ensure no false promises
      expect(response.content).not.toMatch(/24 hours|auto-approve|usually within/);
    });

    test('should handle pending candidate with interview scheduling', async () => {
      // Create pending candidate
      const pendingCandidateId = `pending-${Date.now()}`;
      db.prepare(`
        INSERT INTO candidates (
          id, name, email, status
        ) VALUES (?, ?, ?, ?)
      `).run(pendingCandidateId, 'Jane Pending', 'jane@test.com', 'pending');

      const response = await templateSystem.processMessage(
        pendingCandidateId,
        'When will I be approved?',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.content).toContain('Jane');
      expect(response.content).toContain('verification interview');
      expect(response.isPendingUser).toBe(true);
      expect(response.requiresAdminAttention).toBe(true);

      // Cleanup
      db.prepare('DELETE FROM candidates WHERE id = ?').run(pendingCandidateId);
    });
  });

  describe('Escalation System', () => {
    test('should create escalation for urgent messages', async () => {
      const response = await templateSystem.processMessage(
        testCandidateId,
        'URGENT! I need help immediately!',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.requiresAdminAttention).toBe(true);
      expect(response.escalated).toBe(true);
      expect(response.escalationPriority).toContain('high');

      // Check escalation queue
      const escalations = await templateSystem.getEscalationQueue('pending', 10);
      const relevantEscalation = escalations.find(e => e.candidate_id === testCandidateId);

      expect(relevantEscalation).toBeDefined();
      expect(relevantEscalation.priority).toBe('high');
    });

    test('should escalate when no template matches', async () => {
      const response = await templateSystem.processMessage(
        testCandidateId,
        'Random gibberish xyz123 nonsense',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.requiresAdminAttention).toBe(true);
      expect(response.escalated).toBe(true);
    });
  });

  describe('API Endpoints', () => {
    test('POST /api/v1/template-responses/process should process messages', async () => {
      const res = await request(app)
        .post('/api/v1/template-responses/process')
        .send({
          candidateId: testCandidateId,
          message: 'How much money do I have?',
          channel: 'app'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toContain('$');
      expect(res.body.data.source).toContain('template');
    });

    test('GET /api/v1/template-responses/escalations should return escalation queue', async () => {
      const res = await request(app)
        .get('/api/v1/template-responses/escalations')
        .query({ status: 'pending', limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/v1/template-responses/status should return system status', async () => {
      const res = await request(app)
        .get('/api/v1/template-responses/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.system).toBe('fact-based-template-responses');
      expect(res.body.data.features.intent_classification).toBe(true);
    });

    test('POST /api/v1/template-responses/test should test intent classification', async () => {
      const res = await request(app)
        .post('/api/v1/template-responses/test')
        .send({
          message: 'When will I get paid?'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.intent.category).toBe('payment_inquiry');
      expect(res.body.data.template).toBeDefined();
    });
  });

  describe('Integration Bridge', () => {
    test('should replace AI chat processing seamlessly', async () => {
      const result = await integrationBridge.processIncomingMessage(
        testCandidateId,
        'What is my payment status?',
        'app'
      );

      expect(result.mode).toBe('template_auto');
      expect(result.source).toBe('fact_based_templates');
      expect(result.response.content).toContain('$125.50');
    });

    test('should handle escalation through bridge', async () => {
      const result = await integrationBridge.processIncomingMessage(
        testCandidateId,
        'EMERGENCY! Help me now!',
        'app'
      );

      expect(result.mode).toBe('escalated');
      expect(result.response.requiresAdminAttention).toBe(true);
    });

    test('should provide bridge health check', () => {
      const health = integrationBridge.healthCheck();

      expect(health.bridge_enabled).toBe(true);
      expect(health.template_system_ready).toBe(true);
      expect(health.intent_classifier_ready).toBe(true);
    });
  });

  describe('Response Quality Validation', () => {
    test('should never make false promises about timing', async () => {
      const testMessages = [
        'When will I get paid?',
        'How long does withdrawal take?',
        'When will my account be approved?',
        'How quickly can I get my money?'
      ];

      for (const message of testMessages) {
        const response = await templateSystem.processMessage(
          testCandidateId,
          message,
          { channel: 'app', adminMode: 'auto' }
        );

        // Check for problematic phrases
        const problematicPhrases = [
          '24 hours',
          'auto-approve',
          'usually within',
          'guaranteed',
          'will definitely',
          'always processed',
          'never takes more than'
        ];

        for (const phrase of problematicPhrases) {
          expect(response.content.toLowerCase()).not.toContain(phrase);
        }

        // Should defer to admin team
        expect(response.content.toLowerCase()).toMatch(/admin team|team member|check with/);
      }
    });

    test('should always provide helpful escalation', async () => {
      const response = await templateSystem.processMessage(
        testCandidateId,
        'I have a complex billing question',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.content).toMatch(/admin|team|assist|help/i);
      expect(response.requiresAdminAttention).toBe(true);
    });

    test('should use actual data when available', async () => {
      const response = await templateSystem.processMessage(
        testCandidateId,
        'How much pending earnings do I have?',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.content).toContain('$125.50');
      expect(response.usesRealData).toBe(true);
    });
  });

  describe('Admin Analytics', () => {
    test('should track template usage', async () => {
      // Process a few messages to generate usage data
      await templateSystem.processMessage(testCandidateId, 'Payment status?', { channel: 'app' });
      await templateSystem.processMessage(testCandidateId, 'Job opportunities?', { channel: 'app' });

      const analytics = await templateSystem.getTemplateAnalytics(1); // 1 day

      expect(Array.isArray(analytics)).toBe(true);
      expect(analytics.length).toBeGreaterThan(0);
      expect(analytics[0]).toHaveProperty('name');
      expect(analytics[0]).toHaveProperty('usage_count');
    });

    test('should provide escalation statistics', async () => {
      const stats = await templateSystem.escalationHandler.getEscalationStats(7);

      expect(stats).toHaveProperty('stats');
      expect(stats).toHaveProperty('summary');
      expect(Array.isArray(stats.stats)).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle high message volume', async () => {
      const messages = Array.from({ length: 20 }, (_, i) => `Test message ${i}`);
      const startTime = Date.now();

      const promises = messages.map(message =>
        templateSystem.processMessage(testCandidateId, message, { channel: 'app' })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      expect(responses).toHaveLength(20);
      expect(responses.every(r => r.content)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should gracefully handle database errors', async () => {
      // Temporarily break database connection (mock)
      const originalPrepare = db.prepare;
      db.prepare = () => {
        throw new Error('Database connection lost');
      };

      const response = await templateSystem.processMessage(
        testCandidateId,
        'Test message during DB error',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.error).toBe(true);
      expect(response.content).toContain('technical difficulties');
      expect(response.requiresAdminAttention).toBe(true);

      // Restore database connection
      db.prepare = originalPrepare;
    });
  });

  describe('Multi-language Support', () => {
    test('should handle English responses', async () => {
      const response = await templateSystem.processMessage(
        testCandidateId,
        'Payment status please?',
        { channel: 'app', adminMode: 'auto' }
      );

      expect(response.content).toMatch(/admin team|check|provide/i);
    });

    // Add Singlish tests when templates are available
    test.skip('should handle Singlish responses', async () => {
      // This would test Singlish templates when implemented
    });
  });
});

describe('Template System Performance Benchmarks', () => {
  test('intent classification should be fast', async () => {
    const templateSystem = new FactBasedTemplateSystem();
    const testMessages = [
      'When will I get paid?',
      'Are there jobs available?',
      'My account needs verification',
      'Technical issue with the app',
      'Urgent payment problem'
    ];

    const startTime = Date.now();

    for (const message of testMessages) {
      await templateSystem.intentClassifier.classifyMessage(message);
    }

    const endTime = Date.now();
    const avgTime = (endTime - startTime) / testMessages.length;

    expect(avgTime).toBeLessThan(100); // Should average under 100ms per classification
  });

  test('template matching should be efficient', async () => {
    const templateSystem = new FactBasedTemplateSystem();
    const testIntents = [
      { category: 'payment_inquiry', subcategory: 'timing', confidence: 0.9 },
      { category: 'job_inquiry', subcategory: 'availability', confidence: 0.85 },
      { category: 'verification_status', subcategory: 'timing', confidence: 0.8 }
    ];

    const startTime = Date.now();

    for (const intent of testIntents) {
      await templateSystem.templateManager.findBestTemplate(intent);
    }

    const endTime = Date.now();
    const avgTime = (endTime - startTime) / testIntents.length;

    expect(avgTime).toBeLessThan(50); // Should average under 50ms per template match
  });
});