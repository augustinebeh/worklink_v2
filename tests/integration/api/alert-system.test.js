/**
 * 🧪 API INTEGRATION TEST: Alert System
 * Tests alert rules, triggers, notifications, and escalations
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Import services
const alertEngine = require('../../../services/alerts/engine');

describe('API Integration: Alert System', () => {
  let testDB;

  beforeAll(() => {
    testDB = global.TestDB.createTestDB();
  });

  afterAll(() => {
    if (testDB) testDB.close();
    alertEngine.stop();
  });

  beforeEach(() => {
    global.TestDB.cleanTestDB();
    global.TestDB.seedTestData();
    alertEngine.stop(); // Ensure clean state
  });

  describe('Alert Rule Evaluation', () => {
    test('High value threshold alert triggers correctly', async () => {
      // Create high-value tender
      const highValueTender = {
        id: uuidv4(),
        title: 'Major Infrastructure Project',
        agency: 'Building and Construction Authority',
        estimated_value: 15000000, // $15M - above threshold
        stage: 'new_opportunity'
      };

      testDB.prepare(`
        INSERT INTO bpo_tender_lifecycle (
          id, title, agency, estimated_value, stage
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        highValueTender.id,
        highValueTender.title,
        highValueTender.agency,
        highValueTender.estimated_value,
        highValueTender.stage
      );

      // Run alert evaluation
      await alertEngine.evaluateAllRules();

      // Check that high-value alert was triggered
      const alert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE tender_id = ? AND alert_title LIKE '%High-Value%'
      `).get(highValueTender.id);

      expect(alert).toBeTruthy();
      expect(alert.alert_priority).toBe('high');
      expect(alert.alert_title).toContain('High-Value Tender');
      expect(alert.alert_message).toContain('$15M');

      // Verify alert data
      const alertData = JSON.parse(alert.alert_data);
      expect(alertData.tender_id).toBe(highValueTender.id);
      expect(alertData.value).toBe(15000000);
      expect(alertData.title).toBe(highValueTender.title);
    });

    test('Closing soon alert triggers with correct urgency', async () => {
      // Create tender closing in 1 day
      const urgentTender = {
        id: uuidv4(),
        title: 'Urgent Maintenance Contract',
        agency: 'Ministry of Education',
        closing_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        stage: 'review' // Not in excluded stages
      };

      testDB.prepare(`
        INSERT INTO bpo_tender_lifecycle (
          id, title, agency, closing_date, stage
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        urgentTender.id,
        urgentTender.title,
        urgentTender.agency,
        urgentTender.closing_date,
        urgentTender.stage
      );

      await alertEngine.evaluateAllRules();

      const alert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE tender_id = ? AND alert_title LIKE '%Closing%'
      `).get(urgentTender.id);

      expect(alert).toBeTruthy();
      expect(alert.alert_priority).toBe('critical'); // 1 day = critical priority
      expect(alert.alert_title).toContain('Closing in 1 Day');
    });

    test('Renewal prediction alert triggers for high probability renewals', async () => {
      // Create high-probability renewal
      const renewalId = uuidv4();
      testDB.prepare(`
        INSERT INTO contract_renewals (
          id, agency, contract_reference, contract_end_date,
          contract_value, renewal_probability, engagement_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        renewalId,
        'Urban Redevelopment Authority',
        'URA/2022/CLEAN/007',
        new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 months
        3200000,
        82, // High probability
        'not_started'
      );

      await alertEngine.evaluateAllRules();

      const renewalAlert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE renewal_id = ? AND trigger_type = 'renewal'
      `).get(renewalId);

      expect(renewalAlert).toBeTruthy();
      expect(renewalAlert.alert_title).toContain('Renewal Opportunity');
      expect(renewalAlert.alert_message).toContain('82%');

      const alertData = JSON.parse(renewalAlert.alert_data);
      expect(alertData.probability).toBe(82);
      expect(alertData.value).toBe(3200000);
    });

    test('Agency match alert triggers for specified agencies', async () => {
      // Update alert rule to watch for specific agency
      testDB.prepare(`
        UPDATE alert_rules
        SET conditions = ?
        WHERE rule_name = 'High Value Tenders'
      `).run(JSON.stringify({
        min_value: 500000,
        categories: [],
        agencies: ['Singapore Police Force']
      }));

      // Create tender from watched agency
      const watchedAgencyTender = {
        id: uuidv4(),
        title: 'Police Equipment Procurement',
        agency: 'Singapore Police Force',
        estimated_value: 800000,
        stage: 'new_opportunity'
      };

      testDB.prepare(`
        INSERT INTO bpo_tender_lifecycle (
          id, title, agency, estimated_value, stage
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        watchedAgencyTender.id,
        watchedAgencyTender.title,
        watchedAgencyTender.agency,
        watchedAgencyTender.estimated_value,
        watchedAgencyTender.stage
      );

      await alertEngine.evaluateAllRules();

      const agencyAlert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE tender_id = ? AND alert_message LIKE '%Police Equipment%'
      `).get(watchedAgencyTender.id);

      expect(agencyAlert).toBeTruthy();
    });

    test('Keyword match alert triggers correctly', async () => {
      // Add keyword match rule
      testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, description, conditions, recipients, priority, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'Security Keywords',
        'keyword_match',
        'Alert for security-related tenders',
        JSON.stringify({
          keywords: ['cybersecurity', 'surveillance', 'access control'],
          match_type: 'any'
        }),
        JSON.stringify({ emails: ['security@worklink.sg'] }),
        'medium',
        1
      );

      // Create tender with matching keywords
      const keywordTender = {
        id: uuidv4(),
        title: 'Cybersecurity Enhancement Project',
        agency: 'Cyber Security Agency',
        description: 'Advanced cybersecurity measures and surveillance system upgrade',
        stage: 'new_opportunity'
      };

      testDB.prepare(`
        INSERT INTO bpo_tender_lifecycle (
          id, title, agency, description, stage
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        keywordTender.id,
        keywordTender.title,
        keywordTender.agency,
        keywordTender.description,
        keywordTender.stage
      );

      await alertEngine.evaluateAllRules();

      const keywordAlert = testDB.prepare(`
        SELECT * FROM alert_history
        WHERE tender_id = ? AND alert_title LIKE '%Keyword Match%'
      `).get(keywordTender.id);

      expect(keywordAlert).toBeTruthy();
      expect(keywordAlert.alert_message).toContain('cybersecurity');
    });
  });

  describe('Alert Deduplication', () => {
    test('Prevents duplicate alerts for same tender within 1 hour', async () => {
      const tenderId = uuidv4();
      const ruleId = testDB.prepare(`
        SELECT id FROM alert_rules WHERE rule_name = 'High Value Tenders'
      `).get().id;

      // Create first alert
      testDB.prepare(`
        INSERT INTO alert_history (
          id, rule_id, trigger_type, tender_id, alert_title,
          alert_message, alert_priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        ruleId,
        'tender',
        tenderId,
        'High-Value Tender Test',
        'Test message',
        'high'
      );

      // Try to create another alert for same tender/rule
      const isDuplicate = alertEngine.isDuplicate(testDB, ruleId, tenderId, null);
      expect(isDuplicate).toBe(true);

      // Create alert from 2 hours ago - should not be duplicate
      testDB.prepare(`
        UPDATE alert_history
        SET triggered_at = datetime('now', '-2 hours')
        WHERE tender_id = ?
      `).run(tenderId);

      const isOldDuplicate = alertEngine.isDuplicate(testDB, ruleId, tenderId, null);
      expect(isOldDuplicate).toBe(false);
    });

    test('Allows alerts for different rules on same tender', async () => {
      const tenderId = uuidv4();

      // Create alerts with different rules
      const rule1Id = testDB.prepare(`SELECT id FROM alert_rules LIMIT 1`).get().id;
      const rule2Id = testDB.prepare(`
        INSERT INTO alert_rules (rule_name, rule_type, priority, active)
        VALUES (?, ?, ?, ?) RETURNING id
      `).get('Test Rule 2', 'value_threshold', 'medium', 1).id;

      const isDuplicateRule1 = alertEngine.isDuplicate(testDB, rule1Id, tenderId, null);
      const isDuplicateRule2 = alertEngine.isDuplicate(testDB, rule2Id, tenderId, null);

      expect(isDuplicateRule1).toBe(false);
      expect(isDuplicateRule2).toBe(false);
    });
  });

  describe('Alert Escalation', () => {
    test('Escalates unacknowledged critical alerts after timeout', async () => {
      // Create critical alert rule with escalation
      const criticalRuleId = testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, priority, active, escalation_enabled,
          escalation_after_minutes, escalation_recipients
        ) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
      `).get(
        'Critical Test Rule',
        'closing_soon',
        'critical',
        1,
        1, // escalation enabled
        5, // escalate after 5 minutes
        JSON.stringify({
          emails: ['director@worklink.sg'],
          slack_channels: ['#emergency']
        })
      ).id;

      // Create critical alert from 10 minutes ago (beyond escalation threshold)
      const alertId = uuidv4();
      testDB.prepare(`
        INSERT INTO alert_history (
          id, rule_id, trigger_type, alert_title, alert_message,
          alert_priority, triggered_at, acknowledged
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-10 minutes'), ?)
      `).run(
        alertId,
        criticalRuleId,
        'tender',
        'Critical Test Alert',
        'Test escalation',
        'critical',
        0 // not acknowledged
      );

      // Run escalation check
      await alertEngine.handleEscalations(testDB);

      // Verify escalation occurred
      const escalatedAlert = testDB.prepare(`
        SELECT * FROM alert_history WHERE id = ?
      `).get(alertId);

      expect(escalatedAlert.escalated).toBe(1);
      expect(escalatedAlert.escalated_at).toBeTruthy();
      expect(escalatedAlert.escalation_level).toBe(1);
    });

    test('Does not escalate acknowledged alerts', async () => {
      const criticalRuleId = testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, priority, active, escalation_enabled,
          escalation_after_minutes
        ) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
      `).get(
        'Acknowledged Test Rule',
        'closing_soon',
        'critical',
        1,
        1,
        1 // very short escalation time
      ).id;

      const alertId = uuidv4();
      testDB.prepare(`
        INSERT INTO alert_history (
          id, rule_id, trigger_type, alert_priority,
          triggered_at, acknowledged, acknowledged_at, acknowledged_by
        ) VALUES (?, ?, ?, ?, datetime('now', '-10 minutes'), ?, datetime('now', '-5 minutes'), ?)
      `).run(
        alertId,
        criticalRuleId,
        'tender',
        'critical',
        1, // acknowledged
        'user@worklink.sg'
      );

      await alertEngine.handleEscalations(testDB);

      const alert = testDB.prepare(`SELECT * FROM alert_history WHERE id = ?`).get(alertId);
      expect(alert.escalated).toBe(0); // Should not escalate
    });

    test('Only escalates critical and high priority alerts', async () => {
      const mediumRuleId = testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, priority, active, escalation_enabled,
          escalation_after_minutes
        ) VALUES (?, ?, ?, ?, ?, ?) RETURNING id
      `).get(
        'Medium Priority Rule',
        'value_threshold',
        'medium',
        1,
        1,
        1
      ).id;

      const alertId = uuidv4();
      testDB.prepare(`
        INSERT INTO alert_history (
          id, rule_id, trigger_type, alert_priority,
          triggered_at, acknowledged
        ) VALUES (?, ?, ?, ?, datetime('now', '-10 minutes'), ?)
      `).run(
        alertId,
        mediumRuleId,
        'tender',
        'medium',
        0
      );

      await alertEngine.handleEscalations(testDB);

      const alert = testDB.prepare(`SELECT * FROM alert_history WHERE id = ?`).get(alertId);
      expect(alert.escalated).toBe(0); // Medium priority should not escalate
    });
  });

  describe('Daily Digest Processing', () => {
    test('Processes daily digest at correct time', async () => {
      // Create test user preferences
      testDB.prepare(`
        INSERT INTO user_alert_preferences (
          user_id, email_address, digest_enabled, digest_frequency
        ) VALUES (?, ?, ?, ?)
      `).run(
        'digest-test-user',
        'digest@worklink.sg',
        1,
        'daily'
      );

      // Create low-priority unacknowledged alerts
      const lowPriorityAlerts = [
        { title: 'Digest Alert 1', priority: 'low' },
        { title: 'Digest Alert 2', priority: 'medium' },
        { title: 'Digest Alert 3', priority: 'low' }
      ];

      for (const alert of lowPriorityAlerts) {
        testDB.prepare(`
          INSERT INTO alert_history (
            id, rule_id, trigger_type, alert_title, alert_priority,
            triggered_at, acknowledged
          ) VALUES (?, ?, ?, ?, ?, datetime('now', '-12 hours'), ?)
        `).run(
          uuidv4(),
          1,
          'tender',
          alert.title,
          alert.priority,
          0
        );
      }

      // Mock current time to be 9 AM for digest processing
      const originalHours = Date.prototype.getHours;
      Date.prototype.getHours = jest.fn(() => 9);

      await alertEngine.processDailyDigest(testDB);

      // Verify digest was marked as sent
      const digestSentCount = testDB.prepare(`
        SELECT COUNT(*) as count FROM alert_history
        WHERE digest_sent = 1
      `).get().count;

      expect(digestSentCount).toBe(3);

      // Restore original method
      Date.prototype.getHours = originalHours;
    });

    test('Skips digest processing outside scheduled time', async () => {
      // Mock time to be outside digest hours
      const originalHours = Date.prototype.getHours;
      Date.prototype.getHours = jest.fn(() => 15); // 3 PM

      await alertEngine.processDailyDigest(testDB);

      // Should not process any digests
      const digestSentCount = testDB.prepare(`
        SELECT COUNT(*) as count FROM alert_history WHERE digest_sent = 1
      `).get().count;

      expect(digestSentCount).toBe(0);

      Date.prototype.getHours = originalHours;
    });
  });

  describe('Alert Engine Status and Control', () => {
    test('Alert engine starts and stops correctly', () => {
      expect(alertEngine.getStatus().isRunning).toBe(false);

      alertEngine.start();
      expect(alertEngine.getStatus().isRunning).toBe(true);
      expect(alertEngine.getStatus().runsCount).toBeGreaterThanOrEqual(0);

      alertEngine.stop();
      expect(alertEngine.getStatus().isRunning).toBe(false);
    });

    test('Alert engine tracks run statistics', async () => {
      alertEngine.start();

      // Wait for initial run
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = alertEngine.getStatus();
      expect(status.runsCount).toBeGreaterThan(0);
      expect(status.lastRun).toBeTruthy();

      alertEngine.stop();
    });

    test('Alert engine handles errors gracefully', async () => {
      // Create invalid alert rule to trigger error
      testDB.prepare(`
        INSERT INTO alert_rules (
          rule_name, rule_type, conditions, priority, active
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        'Invalid Rule',
        'invalid_type',
        'invalid json',
        'medium',
        1
      );

      // Should not throw error despite invalid rule
      await expect(alertEngine.evaluateAllRules()).resolves.not.toThrow();
    });
  });

  describe('Alert Performance', () => {
    test('Handles large number of tenders efficiently', async () => {
      // Create many tenders
      for (let i = 1; i <= 100; i++) {
        testDB.prepare(`
          INSERT INTO bpo_tender_lifecycle (
            id, title, agency, estimated_value, stage
          ) VALUES (?, ?, ?, ?, ?)
        `).run(
          uuidv4(),
          `Performance Test Tender ${i}`,
          'Test Agency',
          Math.random() * 5000000,
          'new_opportunity'
        );
      }

      const startTime = Date.now();
      await alertEngine.evaluateAllRules();
      const endTime = Date.now();

      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('Alert rule evaluation is idempotent', async () => {
      // Create tender that triggers alert
      const tenderId = uuidv4();
      testDB.prepare(`
        INSERT INTO bpo_tender_lifecycle (
          id, title, agency, estimated_value, stage
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        tenderId,
        'Idempotent Test',
        'Test Agency',
        2000000,
        'new_opportunity'
      );

      // Run evaluation multiple times
      await alertEngine.evaluateAllRules();
      await alertEngine.evaluateAllRules();
      await alertEngine.evaluateAllRules();

      // Should only create one alert due to deduplication
      const alertCount = testDB.prepare(`
        SELECT COUNT(*) as count FROM alert_history
        WHERE tender_id = ?
      `).get(tenderId).count;

      expect(alertCount).toBe(1);
    });
  });
});