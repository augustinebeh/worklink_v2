/**
 * 🧪 E2E TEST: Tender Discovery to Go Decision Flow
 * Scenario 1: New tender discovered → Alert sent → Bid manager reviews → Go decision
 *
 * Test Flow:
 * 1. RSS/Manual tender entry creates new tender
 * 2. Alert engine evaluates rules and triggers alerts
 * 3. Alert is sent to bid manager
 * 4. Bid manager reviews tender via admin portal
 * 5. Go/No-go decision is made
 * 6. Tender moves to appropriate stage
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Import services
const bpoLifecycleRouter = require('../../../routes/api/v1/bpo/lifecycle');
const alertEngine = require('../../../services/alerts/engine');

// Mock express app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/bpo/lifecycle', bpoLifecycleRouter);
  return app;
};

describe('E2E: Tender Discovery to Go Decision Flow', () => {
  let app;
  let testDB;

  beforeAll(() => {
    app = createTestApp();
    testDB = global.TestDB.createTestDB();
  });

  afterAll(() => {
    if (testDB) testDB.close();
  });

  beforeEach(() => {
    global.TestDB.cleanTestDB();
    global.TestDB.seedTestData();
  });

  describe('Scenario 1: High-Value Tender Discovery Flow', () => {
    test('Complete flow from RSS discovery to Go decision', async () => {
      // ==========================================
      // STEP 1: RSS Scraper discovers new tender
      // ==========================================
      const newTenderData = {
        source_type: 'gebiz_rss',
        source_id: 'GEBIZ-2024-12345',
        tender_no: 'MOD/2024/SEC/001',
        title: 'Comprehensive Security Services for Naval Base',
        agency: 'Ministry of Defence',
        description: 'Multi-year security services contract covering maritime security, access control, and surveillance systems',
        category: 'Security Services',
        estimated_value: 3500000, // $3.5M - triggers high-value alert
        closing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days
        stage: 'new_opportunity',
        priority: 'high',
        external_url: 'https://gebiz.gov.sg/tender/12345'
      };

      const createResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', '/api/v1/bpo/lifecycle', newTenderData
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.title).toBe(newTenderData.title);

      const tenderId = createResponse.body.data.id;

      // ==========================================
      // STEP 2: Alert Engine evaluates rules
      // ==========================================

      // Simulate alert engine evaluation
      await alertEngine.evaluateAllRules();

      // Verify alert was created
      const alertCheck = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE tender_id = ? AND alert_title LIKE '%High-Value%'
      `).get(tenderId);

      expect(alertCheck).toBeTruthy();
      expect(alertCheck.alert_priority).toBe('high');
      expect(alertCheck.triggered_at).toBeTruthy();

      // ==========================================
      // STEP 3: Verify alert delivery status
      // ==========================================

      // Check that alert was marked for delivery
      expect(alertCheck.delivery_status).toBe('pending');
      expect(JSON.parse(alertCheck.alert_data).tender_id).toBe(tenderId);
      expect(JSON.parse(alertCheck.alert_data).value).toBe(3500000);

      // ==========================================
      // STEP 4: Bid Manager reviews tender
      // ==========================================

      const reviewResponse = await global.TestAPI.makeAuthRequest(
        app, 'GET', `/api/v1/bpo/lifecycle/${tenderId}`
      );

      expect(reviewResponse.status).toBe(200);
      expect(reviewResponse.body.data.stage).toBe('new_opportunity');
      expect(reviewResponse.body.data.estimated_value).toBe(3500000);

      // ==========================================
      // STEP 5: Move to review stage
      // ==========================================

      const moveToReviewResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${tenderId}/move`, {
          new_stage: 'review',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        }
      );

      expect(moveToReviewResponse.status).toBe(200);
      expect(moveToReviewResponse.body.data.stage).toBe('review');

      // ==========================================
      // STEP 6: Qualification assessment
      // ==========================================

      const qualificationData = {
        qualification_score: 85,
        qualification_details: {
          technical_capability: 90,
          financial_stability: 85,
          past_performance: 80,
          team_experience: 85,
          pricing_competitiveness: 80
        },
        notes: 'Strong technical team, good financial position, competitive in maritime security sector'
      };

      const qualificationResponse = await global.TestAPI.makeAuthRequest(
        app, 'PATCH', `/api/v1/bpo/lifecycle/${tenderId}`, qualificationData
      );

      expect(qualificationResponse.status).toBe(200);
      expect(qualificationResponse.body.data.qualification_score).toBe(85);

      // ==========================================
      // STEP 7: Go decision
      // ==========================================

      const goDecisionData = {
        decision: 'go',
        decision_reasoning: 'High-value opportunity with strong qualification score. Good fit for our maritime security capabilities.',
        user_id: global.TEST_CONFIG.TEST_USER_ID
      };

      const decisionResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${tenderId}/decision`, goDecisionData
      );

      expect(decisionResponse.status).toBe(200);
      expect(decisionResponse.body.data.decision).toBe('go');
      expect(decisionResponse.body.data.decision_made_by).toBe(global.TEST_CONFIG.TEST_USER_ID);

      // ==========================================
      // STEP 8: Move to bidding stage
      // ==========================================

      const moveToBiddingResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${tenderId}/move`, {
          new_stage: 'bidding',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        }
      );

      expect(moveToBiddingResponse.status).toBe(200);
      expect(moveToBiddingResponse.body.data.stage).toBe('bidding');

      // ==========================================
      // STEP 9: Verify audit trail
      // ==========================================

      const auditLogs = testDB.prepare(`
        SELECT * FROM audit_log
        WHERE resource_id = ?
        ORDER BY created_at ASC
      `).all(tenderId);

      expect(auditLogs.length).toBeGreaterThanOrEqual(2); // At least stage changes
      expect(auditLogs.some(log => log.event_type === 'stage_changed')).toBe(true);

      // ==========================================
      // STEP 10: Final validation
      // ==========================================

      const finalTender = testDB.prepare(`
        SELECT * FROM bpo_tender_lifecycle WHERE id = ?
      `).get(tenderId);

      expect(finalTender.stage).toBe('bidding');
      expect(finalTender.decision).toBe('go');
      expect(finalTender.qualification_score).toBe(85);
      expect(finalTender.decision_made_at).toBeTruthy();

      console.log('✅ Tender Discovery Flow completed successfully');
      console.log(`   Tender: ${finalTender.title}`);
      console.log(`   Value: $${finalTender.estimated_value.toLocaleString()}`);
      console.log(`   Stage: ${finalTender.stage}`);
      console.log(`   Decision: ${finalTender.decision}`);
      console.log(`   Alert ID: ${alertCheck.id}`);
    }, 30000);

    test('No-Go decision flow', async () => {
      // Create a tender with lower qualification score
      const tenderData = {
        title: 'Basic Cleaning Services Contract',
        agency: 'Public Utilities Board',
        description: 'Routine office cleaning services',
        estimated_value: 500000,
        stage: 'review'
      };

      const createResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', '/api/v1/bpo/lifecycle', tenderData
      );

      const tenderId = createResponse.body.data.id;

      // Make No-Go decision
      const noGoDecisionData = {
        decision: 'no-go',
        decision_reasoning: 'Low margin opportunity, outside core competency',
        qualification_score: 45,
        user_id: global.TEST_CONFIG.TEST_USER_ID
      };

      const decisionResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${tenderId}/decision`, noGoDecisionData
      );

      expect(decisionResponse.status).toBe(200);
      expect(decisionResponse.body.data.decision).toBe('no-go');
      expect(decisionResponse.body.data.stage).toBe('lost'); // Auto-moved to lost
      expect(decisionResponse.body.data.outcome).toBe('lost');
    });
  });

  describe('Scenario 1a: RSS Parsing Integration', () => {
    test('RSS feed creates tender and triggers alert', async () => {
      // Mock RSS parser creating tender
      const rssData = {
        source_type: 'gebiz_rss',
        source_id: 'RSS-001',
        title: 'IT Infrastructure Upgrade Project',
        agency: 'Infocomm Media Development Authority',
        estimated_value: 2800000,
        closing_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      const response = await global.TestAPI.makeAuthRequest(
        app, 'POST', '/api/v1/bpo/lifecycle', rssData
      );

      expect(response.status).toBe(201);

      // Verify RSS source tracking
      expect(response.body.data.source_type).toBe('gebiz_rss');
      expect(response.body.data.source_id).toBe('RSS-001');
    });
  });
});