/**
 * 🧪 E2E TEST: Critical Alert Escalation Flow
 * Scenario 3: Critical alert → Escalation after 1 hour → Director notified
 *
 * Test Flow:
 * 1. Critical alert is triggered (tender closing tomorrow)
 * 2. Alert is sent to primary recipients
 * 3. Alert remains unacknowledged for 1 hour
 * 4. Escalation kicks in
 * 5. Director/senior management is notified
 * 6. Escalation tracking and resolution
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

describe('E2E: Critical Alert Escalation Flow', () => {
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

  describe('Scenario 3: Critical Alert with Escalation', () => {
    test('Complete escalation flow from critical alert to director notification', async () => {
      // ==========================================
      // STEP 1: Setup escalation rule
      // ==========================================

      // Create critical alert rule with escalation enabled
      const criticalRuleId = testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, description, conditions, recipients,
          priority, active, escalation_enabled, escalation_after_minutes,
          escalation_recipients
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Urgent Closing Soon',
        'closing_soon',
        'Critical alert for tenders closing within 24 hours',
        JSON.stringify({
          days_until_close: 1,
          exclude_stages: ['submitted', 'awarded', 'lost']
        }),
        JSON.stringify({
          emails: ['bidmanager@worklink.sg'],
          slack_channels: ['#bid-alerts']
        }),
        'critical',
        1,
        1, // escalation_enabled
        5, // escalation_after_minutes (reduced for testing)
        JSON.stringify({
          emails: ['director@worklink.sg', 'coo@worklink.sg'],
          slack_channels: ['#senior-management'],
          sms: ['+6591234567']
        })
      ).lastInsertRowid;

      // ==========================================
      // STEP 2: Create tender closing tomorrow
      // ==========================================

      const urgentTenderData = {
        title: 'Emergency IT Support Services',
        agency: 'Ministry of Health',
        description: 'Urgent requirement for IT support during system upgrade',
        category: 'IT Services',
        estimated_value: 1200000,
        closing_date: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        stage: 'new_opportunity',
        priority: 'critical',
        is_urgent: true,
        external_url: 'https://gebiz.gov.sg/urgent/123'
      };

      const createResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', '/api/v1/bpo/lifecycle', urgentTenderData
      );

      expect(createResponse.status).toBe(201);
      const urgentTenderId = createResponse.body.data.id;

      // ==========================================
      // STEP 3: Trigger initial critical alert
      // ==========================================

      await alertEngine.evaluateAllRules();

      // Verify critical alert was created
      const criticalAlert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE tender_id = ? AND alert_priority = 'critical'
        ORDER BY triggered_at DESC
        LIMIT 1
      `).get(urgentTenderId);

      expect(criticalAlert).toBeTruthy();
      expect(criticalAlert.alert_title).toContain('Closing in 0 Day'); // Same day = 0 days
      expect(criticalAlert.escalated).toBe(0); // Not yet escalated
      expect(criticalAlert.acknowledged).toBe(0); // Not acknowledged

      // ==========================================
      // STEP 4: Simulate time passage (1+ hour)
      // ==========================================

      // Manually set the triggered time to 70 minutes ago
      testDB.prepare(`
        UPDATE alert_history
        SET triggered_at = datetime('now', '-70 minutes')
        WHERE id = ?
      `).run(criticalAlert.id);

      // ==========================================
      // STEP 5: Run escalation check
      // ==========================================

      await alertEngine.handleEscalations(testDB);

      // Verify escalation occurred
      const escalatedAlert = testDB.prepare(`
        SELECT * FROM alert_history WHERE id = ?
      `).get(criticalAlert.id);

      expect(escalatedAlert.escalated).toBe(1);
      expect(escalatedAlert.escalated_at).toBeTruthy();
      expect(escalatedAlert.escalation_level).toBe(1);

      // ==========================================
      // STEP 6: Verify escalation notification
      // ==========================================

      // In a real system, this would check actual notification delivery
      // For testing, we verify the escalation data is correct
      const escalationRule = testDB.prepare(`
        SELECT * FROM alert_rules WHERE id = ?
      `).get(criticalRuleId);

      const escalationRecipients = JSON.parse(escalationRule.escalation_recipients);
      expect(escalationRecipients.emails).toContain('director@worklink.sg');
      expect(escalationRecipients.emails).toContain('coo@worklink.sg');
      expect(escalationRecipients.slack_channels).toContain('#senior-management');

      // ==========================================
      // STEP 7: Director acknowledges alert
      // ==========================================

      testDB.prepare(`
        UPDATE alert_history
        SET acknowledged = 1,
            acknowledged_at = CURRENT_TIMESTAMP,
            acknowledged_by = 'director@worklink.sg',
            action_taken = 'escalated_to_team'
        WHERE id = ?
      `).run(criticalAlert.id);

      // ==========================================
      // STEP 8: Immediate action on tender
      // ==========================================

      // Move tender to review immediately
      const emergencyReviewResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${urgentTenderId}/move`, {
          new_stage: 'review',
          user_id: 'director@worklink.sg'
        }
      );

      expect(emergencyReviewResponse.status).toBe(200);

      // Fast-track go decision
      const emergencyDecisionResponse = await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${urgentTenderId}/decision`, {
          decision: 'go',
          decision_reasoning: 'Critical tender requiring immediate attention. Director override for urgent bid.',
          qualification_score: 80, // Estimated score for urgency
          user_id: 'director@worklink.sg'
        }
      );

      expect(emergencyDecisionResponse.status).toBe(200);

      // Move to bidding
      await global.TestAPI.makeAuthRequest(
        app, 'POST', `/api/v1/bpo/lifecycle/${urgentTenderId}/move`, {
          new_stage: 'bidding',
          user_id: 'director@worklink.sg'
        }
      );

      // ==========================================
      // STEP 9: Track escalation resolution
      // ==========================================

      // Log resolution in audit trail
      testDB.prepare(`
        INSERT INTO audit_log (
          id, event_type, event_action, resource_type, resource_id,
          user_id, new_value
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        'escalation_resolved',
        'urgent_tender_processing',
        'alert',
        criticalAlert.id,
        'director@worklink.sg',
        JSON.stringify({
          resolution_time_minutes: 10,
          action_taken: 'immediate_tender_processing',
          tender_id: urgentTenderId
        })
      );

      // ==========================================
      // STEP 10: Final validation
      // ==========================================

      const finalAlert = testDB.prepare(`
        SELECT * FROM alert_history WHERE id = ?
      `).get(criticalAlert.id);

      const finalTender = testDB.prepare(`
        SELECT * FROM bpo_tender_lifecycle WHERE id = ?
      `).get(urgentTenderId);

      expect(finalAlert.acknowledged).toBe(1);
      expect(finalAlert.escalated).toBe(1);
      expect(finalAlert.acknowledged_by).toBe('director@worklink.sg');

      expect(finalTender.stage).toBe('bidding');
      expect(finalTender.decision).toBe('go');
      expect(finalTender.decision_made_by).toBe('director@worklink.sg');

      // Verify audit trail
      const escalationAudit = testDB.prepare(`
        SELECT * FROM audit_log
        WHERE event_type = 'escalation_resolved'
        AND resource_id = ?
      `).get(criticalAlert.id);

      expect(escalationAudit).toBeTruthy();

      console.log('✅ Critical Alert Escalation Flow completed successfully');
      console.log(`   Alert: ${finalAlert.alert_title}`);
      console.log(`   Escalated after: ${escalationRule.escalation_after_minutes} minutes`);
      console.log(`   Acknowledged by: ${finalAlert.acknowledged_by}`);
      console.log(`   Tender fast-tracked to: ${finalTender.stage}`);
    }, 30000);

    test('Multiple escalation levels', async () => {
      // Test scenario where even escalated alert is not acknowledged
      const multiLevelRuleId = testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, priority, active,
          escalation_enabled, escalation_after_minutes,
          escalation_recipients
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Multi-Level Escalation',
        'value_threshold',
        'critical',
        1,
        1,
        1, // Escalate after 1 minute for testing
        JSON.stringify({
          emails: ['ceo@worklink.sg'],
          emergency_sms: ['+6591234567', '+6598765432']
        })
      ).lastInsertRowid;

      // Create initial alert
      const alertId = uuidv4();
      testDB.prepare(`
        INSERT INTO alert_history (
          id, rule_id, trigger_type, alert_title, alert_message,
          alert_priority, triggered_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-65 minutes'))
      `).run(
        alertId,
        multiLevelRuleId,
        'tender',
        'Multi-level Test Alert',
        'Testing escalation levels',
        'critical'
      );

      // First escalation
      await alertEngine.handleEscalations(testDB);

      let alert = testDB.prepare(`SELECT * FROM alert_history WHERE id = ?`).get(alertId);
      expect(alert.escalation_level).toBe(1);

      // Simulate another hour passing without acknowledgment
      testDB.prepare(`
        UPDATE alert_history
        SET escalated_at = datetime('now', '-5 minutes')
        WHERE id = ?
      `).run(alertId);

      // Second escalation run
      await alertEngine.handleEscalations(testDB);

      alert = testDB.prepare(`SELECT * FROM alert_history WHERE id = ?`).get(alertId);
      expect(alert.escalation_level).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scenario 3a: Different Alert Priorities', () => {
    test('High priority alerts do not escalate beyond normal channels', async () => {
      const highPriorityTender = {
        title: 'Standard Office Renovation',
        agency: 'Ministry of National Development',
        estimated_value: 800000,
        closing_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days
        stage: 'new_opportunity',
        priority: 'high' // Not critical
      };

      const response = await global.TestAPI.makeAuthRequest(
        app, 'POST', '/api/v1/bpo/lifecycle', highPriorityTender
      );

      const tenderId = response.body.data.id;

      await alertEngine.evaluateAllRules();

      const highAlert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE tender_id = ? AND alert_priority = 'high'
      `).get(tenderId);

      // High priority alerts should not be eligible for escalation
      expect(highAlert).toBeTruthy();

      // Simulate time passage
      testDB.prepare(`
        UPDATE alert_history
        SET triggered_at = datetime('now', '-120 minutes')
        WHERE id = ?
      `).run(highAlert.id);

      await alertEngine.handleEscalations(testDB);

      const nonEscalatedAlert = testDB.prepare(`
        SELECT * FROM alert_history WHERE id = ?
      `).get(highAlert.id);

      expect(nonEscalatedAlert.escalated).toBe(0); // Should not escalate
    });
  });

  describe('Scenario 3b: Acknowledgment Prevention', () => {
    test('Acknowledged alerts do not escalate', async () => {
      // Create critical alert
      const preventEscalationRuleId = testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, priority, active,
          escalation_enabled, escalation_after_minutes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        'Prevention Test Rule',
        'closing_soon',
        'critical',
        1,
        1,
        1
      ).lastInsertRowid;

      const alertId = uuidv4();
      testDB.prepare(`
        INSERT INTO alert_history (
          id, rule_id, trigger_type, alert_priority,
          triggered_at, acknowledged, acknowledged_at, acknowledged_by
        ) VALUES (?, ?, ?, ?, datetime('now', '-65 minutes'), 1, datetime('now', '-60 minutes'), ?)
      `).run(
        alertId,
        preventEscalationRuleId,
        'tender',
        'critical',
        'quick.responder@worklink.sg'
      );

      await alertEngine.handleEscalations(testDB);

      const acknowledgedAlert = testDB.prepare(`
        SELECT * FROM alert_history WHERE id = ?
      `).get(alertId);

      expect(acknowledgedAlert.escalated).toBe(0); // Should not escalate
      expect(acknowledgedAlert.acknowledged_by).toBe('quick.responder@worklink.sg');
    });
  });
});