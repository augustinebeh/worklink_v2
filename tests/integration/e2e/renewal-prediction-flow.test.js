/**
 * 🧪 E2E TEST: Renewal Prediction to RFP Flow
 * Scenario 2: Renewal predicted → BD manager engages → Activities logged → RFP published
 *
 * Test Flow:
 * 1. Contract renewal is predicted by ML/analytics engine
 * 2. Alert sent to BD manager
 * 3. BD manager initiates engagement activities
 * 4. Activities are logged and tracked
 * 5. RFP is discovered and linked to renewal
 * 6. Tender lifecycle begins with renewal context
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

describe('E2E: Renewal Prediction to RFP Flow', () => {
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

  describe('Scenario 2: Complete Renewal Engagement Flow', () => {
    test('From renewal prediction to successful RFP publication', async () => {
      // ==========================================
      // STEP 1: Create renewal opportunity
      // ==========================================
      const renewalData = {
        agency: 'Land Transport Authority',
        contract_reference: 'LTA/2022/MAINT/003',
        original_tender_id: 'original-tender-123',
        contract_start_date: '2022-01-01',
        contract_end_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 months
        contract_value: 2400000,
        service_description: 'Bus Stop Maintenance and Cleaning Services',
        incumbent_supplier: 'CleanTech Solutions Pte Ltd',
        renewal_probability: 78, // High probability
        engagement_status: 'not_started',
        priority: 'high'
      };

      const renewalId = uuidv4();
      testDB.prepare(`
        INSERT INTO contract_renewals (
          id, agency, contract_reference, original_tender_id,
          contract_start_date, contract_end_date, contract_value,
          service_description, incumbent_supplier, renewal_probability,
          engagement_status, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        renewalId,
        renewalData.agency,
        renewalData.contract_reference,
        renewalData.original_tender_id,
        renewalData.contract_start_date,
        renewalData.contract_end_date,
        renewalData.contract_value,
        renewalData.service_description,
        renewalData.incumbent_supplier,
        renewalData.renewal_probability,
        renewalData.engagement_status,
        renewalData.priority
      );

      // ==========================================
      // STEP 2: Alert engine triggers renewal alert
      // ==========================================
      await alertEngine.evaluateAllRules();

      // Verify renewal prediction alert was created
      const renewalAlert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE renewal_id = ? AND trigger_type = 'renewal'
      `).get(renewalId);

      expect(renewalAlert).toBeTruthy();
      expect(renewalAlert.alert_title).toContain('Renewal Opportunity');
      expect(renewalAlert.alert_message).toContain('78%');

      // ==========================================
      // STEP 3: BD Manager acknowledges alert
      // ==========================================
      testDB.prepare(`
        UPDATE alert_history
        SET acknowledged = 1,
            acknowledged_at = CURRENT_TIMESTAMP,
            acknowledged_by = ?,
            action_taken = 'reviewing_renewal'
        WHERE id = ?
      `).run(global.TEST_CONFIG.TEST_USER_ID, renewalAlert.id);

      // ==========================================
      // STEP 4: BD Manager starts engagement
      // ==========================================

      // Update renewal status to indicate engagement started
      testDB.prepare(`
        UPDATE contract_renewals
        SET engagement_status = 'engaging',
            bd_manager = ?,
            last_engagement_date = CURRENT_TIMESTAMP,
            next_action_date = date('now', '+7 days'),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(global.TEST_CONFIG.TEST_USER_ID, renewalId);

      // ==========================================
      // STEP 5: Log engagement activities
      // ==========================================

      const activities = [
        {
          id: uuidv4(),
          type: 'email',
          description: 'Initial outreach email to procurement manager',
          contact_person: 'Ms. Sarah Lim, Senior Procurement Manager',
          outcome: 'positive_response',
          notes: 'Scheduled meeting for next week to discuss renewal terms'
        },
        {
          id: uuidv4(),
          type: 'meeting',
          description: 'Face-to-face meeting with LTA procurement team',
          contact_person: 'Ms. Sarah Lim, Mr. David Tan',
          outcome: 'requirements_discussed',
          notes: 'Confirmed renewal interest, discussed enhanced service requirements'
        },
        {
          id: uuidv4(),
          type: 'proposal',
          description: 'Submitted enhanced service proposal',
          contact_person: 'LTA Procurement Committee',
          outcome: 'under_review',
          notes: 'Proposed 15% cost reduction with improved service levels'
        }
      ];

      // Update renewal with activities
      testDB.prepare(`
        UPDATE contract_renewals
        SET activities = ?,
            stage = 'active_engagement'
        WHERE id = ?
      `).run(JSON.stringify(activities), renewalId);

      // ==========================================
      // STEP 6: RFP is published
      // ==========================================

      // Simulate RFP discovery (could be from RSS or manual entry)
      const rfpTenderData = {
        source_type: 'manual_entry',
        tender_no: 'LTA/2024/MAINT/003-R',
        title: 'Bus Stop Maintenance and Enhanced Services (Renewal)',
        agency: 'Land Transport Authority',
        description: 'Renewal contract for bus stop maintenance with enhanced cleaning and digital display maintenance',
        category: 'Maintenance Services',
        estimated_value: 2600000, // 8% increase
        closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        stage: 'new_opportunity',
        priority: 'high',
        is_renewal: true,
        renewal_id: renewalId, // Link to renewal record
        incumbent_supplier: 'CleanTech Solutions Pte Ltd',
        assigned_to: global.TEST_CONFIG.TEST_USER_ID
      };

      const rfpResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', '/api/v1/bpo/lifecycle', rfpTenderData
      );

      expect(rfpResponse.status).toBe(201);
      expect(rfpResponse.body.data.is_renewal).toBe(1);
      expect(rfpResponse.body.data.renewal_id).toBe(renewalId);

      const rfpTenderId = rfpResponse.body.data.id;

      // ==========================================
      // STEP 7: Link renewal to tender
      // ==========================================

      // Verify the tender includes renewal details
      const tenderWithRenewal = await global.TestAPI.makeAuthRequest(
        app, 'GET', `/api/v1/bpo/lifecycle/${rfpTenderId}`
      );

      expect(tenderWithRenewal.status).toBe(200);
      expect(tenderWithRenewal.body.data.renewal_details).toBeTruthy();
      expect(tenderWithRenewal.body.data.renewal_details.id).toBe(renewalId);

      // ==========================================
      // STEP 8: Fast-track to bidding
      // ==========================================

      // Update qualification based on renewal engagement
      const qualificationUpdate = {
        qualification_score: 92, // Higher score due to existing relationship
        qualification_details: {
          client_relationship: 95,
          service_history: 90,
          technical_capability: 90,
          pricing_advantage: 85,
          renewal_insight: 95 // Advantage from engagement activities
        }
      };

      await global.TestAPI.makeAuthRequest(
        app, 'PATCH', `/api/v1/bpo/lifecycle/${rfpTenderId}`, qualificationUpdate
      );

      // Move through stages quickly
      await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${rfpTenderId}/move`, {
          new_stage: 'review',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        }
      );

      // Go decision based on strong renewal position
      await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${rfpTenderId}/decision`, {
          decision: 'go',
          decision_reasoning: 'Strong renewal position from successful engagement. Excellent qualification score and client relationship.',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        }
      );

      await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${rfpTenderId}/move`, {
          new_stage: 'bidding',
          user_id: global.TEST_CONFIG.TEST_USER_ID
        }
      );

      // ==========================================
      // STEP 9: Update renewal status
      // ==========================================

      testDB.prepare(`
        UPDATE contract_renewals
        SET stage = 'tender_published',
            engagement_status = 'rfp_responded'
        WHERE id = ?
      `).run(renewalId);

      // ==========================================
      // STEP 10: Final validation
      // ==========================================

      const finalRenewal = testDB.prepare(`
        SELECT * FROM contract_renewals WHERE id = ?
      `).get(renewalId);

      const finalTender = testDB.prepare(`
        SELECT * FROM bpo_tender_lifecycle WHERE id = ?
      `).get(rfpTenderId);

      expect(finalRenewal.engagement_status).toBe('rfp_responded');
      expect(finalRenewal.bd_manager).toBe(global.TEST_CONFIG.TEST_USER_ID);
      expect(JSON.parse(finalRenewal.activities)).toHaveLength(3);

      expect(finalTender.stage).toBe('bidding');
      expect(finalTender.is_renewal).toBe(1);
      expect(finalTender.qualification_score).toBe(92);

      console.log('✅ Renewal Prediction Flow completed successfully');
      console.log(`   Renewal: ${finalRenewal.agency} - ${finalRenewal.contract_reference}`);
      console.log(`   RFP: ${finalTender.title}`);
      console.log(`   Probability: ${finalRenewal.renewal_probability}%`);
      console.log(`   Qualification: ${finalTender.qualification_score}`);
      console.log(`   Activities: ${JSON.parse(finalRenewal.activities).length} logged`);
    }, 30000);

    test('Low probability renewal - monitoring only', async () => {
      // Test low probability renewal that doesn't trigger immediate engagement
      const lowProbRenewal = {
        agency: 'Ministry of Education',
        contract_reference: 'MOE/2022/CLEAN/008',
        contract_end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        contract_value: 800000,
        renewal_probability: 35, // Low probability
        engagement_status: 'not_started'
      };

      const lowRenewalId = uuidv4();
      testDB.prepare(`
        INSERT INTO contract_renewals (
          id, agency, contract_reference, contract_end_date,
          contract_value, renewal_probability, engagement_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        lowRenewalId,
        lowProbRenewal.agency,
        lowProbRenewal.contract_reference,
        lowProbRenewal.contract_end_date,
        lowProbRenewal.contract_value,
        lowProbRenewal.renewal_probability,
        lowProbRenewal.engagement_status
      );

      // Check that low probability renewals don't trigger immediate alerts
      await alertEngine.evaluateAllRules();

      const lowProbAlert = testDB.prepare(`
        SELECT * FROM alert_history WHERE renewal_id = ?
      `).get(lowRenewalId);

      expect(lowProbAlert).toBeFalsy(); // Should not trigger alert due to min_probability threshold
    });
  });

  describe('Scenario 2a: Activity Tracking', () => {
    test('Comprehensive activity logging and timeline', async () => {
      // Create renewal for activity testing
      const renewalId = uuidv4();
      testDB.prepare(`
        INSERT INTO contract_renewals (
          id, agency, contract_reference, renewal_probability,
          engagement_status, bd_manager
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        renewalId,
        'Test Agency',
        'TEST/2023/001',
        70,
        'engaging',
        global.TEST_CONFIG.TEST_USER_ID
      );

      // Track multiple activity types
      const activityTypes = [
        'email', 'phone_call', 'meeting', 'proposal',
        'presentation', 'site_visit', 'negotiation'
      ];

      const activities = activityTypes.map(type => ({
        id: uuidv4(),
        type: type,
        description: `${type} activity for renewal engagement`,
        timestamp: new Date().toISOString(),
        outcome: 'positive_response'
      }));

      testDB.prepare(`
        UPDATE contract_renewals
        SET activities = ?
        WHERE id = ?
      `).run(JSON.stringify(activities), renewalId);

      const updatedRenewal = testDB.prepare(`
        SELECT * FROM contract_renewals WHERE id = ?
      `).get(renewalId);

      const parsedActivities = JSON.parse(updatedRenewal.activities);
      expect(parsedActivities).toHaveLength(7);
      expect(parsedActivities.every(a => a.outcome === 'positive_response')).toBe(true);
    });
  });
});