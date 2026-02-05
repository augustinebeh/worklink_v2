/**
 * 🔔 ALERT ENGINE
 * Background service that evaluates alert rules and triggers notifications
 * Runs every 5 minutes via cron job
 */

const cron = require('node-cron');
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const notificationRouter = require('../notifications');

const DB_PATH = path.join(__dirname, '../../database/gebiz_intelligence.db');

class AlertEngine {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.lastRun = null;
    this.runsCount = 0;
    this.alertsTriggered = 0;
  }

  /**
   * Start the alert engine with cron schedule
   */
  start() {
    if (this.isRunning) {
      console.warn('⚠️  Alert Engine already running');
      return;
    }

    console.log('🔔 Starting Alert Engine...');

    // Run every 5 minutes
    this.cronJob = cron.schedule('*/5 * * * *', async () => {
      await this.evaluateAllRules();
    });

    this.isRunning = true;
    console.log('✅ Alert Engine started (runs every 5 minutes)');

    // Run immediately on startup
    this.evaluateAllRules();
  }

  /**
   * Stop the alert engine
   */
  stop() {
    if (!this.isRunning) {
      console.warn('⚠️  Alert Engine not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('🛑 Alert Engine stopped');
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      runsCount: this.runsCount,
      alertsTriggered: this.alertsTriggered,
      uptime: this.isRunning ? Date.now() - (this.lastRun || Date.now()) : 0
    };
  }

  /**
   * Main evaluation loop - runs all active alert rules
   */
  async evaluateAllRules() {
    if (!this.isRunning && this.cronJob) {
      console.log('⏸️  Alert Engine paused, skipping evaluation');
      return;
    }

    this.lastRun = new Date();
    this.runsCount++;

    console.log(`🔍 Alert Engine: Evaluating rules (Run #${this.runsCount})`);

    try {
      const db = new Database(DB_PATH);

      // Get all active alert rules
      const rules = db.prepare('SELECT * FROM alert_rules WHERE active = 1').all();

      if (rules.length === 0) {
        console.log('ℹ️  No active alert rules to evaluate');
        db.close();
        return;
      }

      let triggered = 0;

      for (const rule of rules) {
        try {
          const count = await this.evaluateRule(db, rule);
          triggered += count;
        } catch (error) {
          console.error(`❌ Error evaluating rule ${rule.rule_name}:`, error.message);
        }
      }

      // Handle escalations
      await this.handleEscalations(db);

      // Process digest batches
      await this.processDailyDigest(db);

      db.close();

      this.alertsTriggered += triggered;
      console.log(`✅ Alert Engine: ${triggered} alerts triggered`);

    } catch (error) {
      console.error('❌ Alert Engine error:', error);
    }
  }

  /**
   * Evaluate a single alert rule
   */
  async evaluateRule(db, rule) {
    const conditions = JSON.parse(rule.conditions);
    let triggered = 0;

    switch (rule.rule_type) {
      case 'value_threshold':
        triggered = await this.evaluateValueThreshold(db, rule, conditions);
        break;

      case 'closing_soon':
        triggered = await this.evaluateClosingSoon(db, rule, conditions);
        break;

      case 'renewal_prediction':
        triggered = await this.evaluateRenewalPrediction(db, rule, conditions);
        break;

      case 'agency_match':
        triggered = await this.evaluateAgencyMatch(db, rule, conditions);
        break;

      case 'keyword_match':
        triggered = await this.evaluateKeywordMatch(db, rule, conditions);
        break;

      default:
        console.warn(`Unknown rule type: ${rule.rule_type}`);
    }

    // Update rule's last triggered time if any alerts fired
    if (triggered > 0) {
      db.prepare('UPDATE alert_rules SET last_triggered_at = CURRENT_TIMESTAMP WHERE id = ?').run(rule.id);
    }

    return triggered;
  }

  /**
   * Evaluate high-value tender alerts
   */
  async evaluateValueThreshold(db, rule, conditions) {
    const minValue = conditions.min_value || 1000000;
    const categories = conditions.categories || [];

    let query = `
      SELECT * FROM bpo_tender_lifecycle
      WHERE estimated_value >= ?
        AND stage NOT IN ('awarded', 'lost')
        AND created_at > datetime('now', '-1 hour')
    `;
    const params = [minValue];

    if (categories.length > 0) {
      query += ` AND category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    const tenders = db.prepare(query).all(...params);

    let triggered = 0;

    for (const tender of tenders) {
      // Check for deduplication (same tender + rule within 1 hour)
      if (this.isDuplicate(db, rule.id, tender.id, null)) {
        continue;
      }

      // Create alert
      const alertId = await this.createAlert(db, {
        rule_id: rule.id,
        trigger_type: 'tender',
        tender_id: tender.id,
        alert_title: `High-Value Tender: ${tender.title}`,
        alert_message: `${tender.agency} - $${this.formatCurrency(tender.estimated_value)}`,
        alert_priority: rule.priority,
        alert_data: {
          tender_id: tender.id,
          title: tender.title,
          agency: tender.agency,
          value: tender.estimated_value,
          closing_date: tender.closing_date
        }
      });

      // Send notification
      await this.sendNotification(rule, {
        id: alertId,
        alert_title: `High-Value Tender: ${tender.title}`,
        alert_message: `${tender.agency} - $${this.formatCurrency(tender.estimated_value)}`,
        priority: rule.priority
      }, tender, 'tender');

      triggered++;
    }

    return triggered;
  }

  /**
   * Evaluate closing soon alerts
   */
  async evaluateClosingSoon(db, rule, conditions) {
    const daysUntilClose = conditions.days_until_close || 2;
    const excludeStages = conditions.exclude_stages || ['submitted', 'awarded', 'lost'];

    const tenders = db.prepare(`
      SELECT *,
        CAST((julianday(closing_date) - julianday('now')) AS INTEGER) as days_remaining
      FROM bpo_tender_lifecycle
      WHERE closing_date IS NOT NULL
        AND closing_date >= date('now')
        AND closing_date <= date('now', '+' || ? || ' days')
        AND stage NOT IN (${excludeStages.map(() => '?').join(',')})
    `).all(daysUntilClose, ...excludeStages);

    let triggered = 0;

    for (const tender of tenders) {
      // Check for deduplication
      if (this.isDuplicate(db, rule.id, tender.id, null)) {
        continue;
      }

      const daysRemaining = Math.max(0, tender.days_remaining);

      const alertId = await this.createAlert(db, {
        rule_id: rule.id,
        trigger_type: 'tender',
        tender_id: tender.id,
        alert_title: `Tender Closing in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
        alert_message: `${tender.title} - ${tender.agency}`,
        alert_priority: daysRemaining <= 1 ? 'critical' : rule.priority,
        alert_data: {
          tender_id: tender.id,
          title: tender.title,
          agency: tender.agency,
          days_remaining: daysRemaining,
          closing_date: tender.closing_date
        }
      });

      // Send notification with urgency
      await this.sendNotification(rule, {
        id: alertId,
        alert_title: `Tender Closing in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''}`,
        alert_message: `${tender.title} - ${tender.agency}`,
        priority: daysRemaining <= 1 ? 'critical' : rule.priority
      }, tender, 'tender', daysRemaining);

      triggered++;
    }

    return triggered;
  }

  /**
   * Evaluate renewal prediction alerts
   */
  async evaluateRenewalPrediction(db, rule, conditions) {
    const monthsUntilExpiry = conditions.months_until_expiry || 6;
    const minProbability = conditions.min_probability || 70;

    const renewals = db.prepare(`
      SELECT *,
        CAST((julianday(contract_end_date) - julianday('now')) / 30 AS INTEGER) as months_remaining
      FROM contract_renewals
      WHERE contract_end_date >= date('now')
        AND contract_end_date <= date('now', '+' || ? || ' months')
        AND renewal_probability >= ?
        AND engagement_status = 'not_started'
        AND created_at > datetime('now', '-1 day')
    `).all(monthsUntilExpiry, minProbability);

    let triggered = 0;

    for (const renewal of renewals) {
      // Check for deduplication
      if (this.isDuplicate(db, rule.id, null, renewal.id)) {
        continue;
      }

      const alertId = await this.createAlert(db, {
        rule_id: rule.id,
        trigger_type: 'renewal',
        renewal_id: renewal.id,
        alert_title: `Renewal Opportunity: ${renewal.agency}`,
        alert_message: `${renewal.renewal_probability}% probability - $${this.formatCurrency(renewal.contract_value)}`,
        alert_priority: rule.priority,
        alert_data: {
          renewal_id: renewal.id,
          agency: renewal.agency,
          probability: renewal.renewal_probability,
          value: renewal.contract_value,
          contract_end_date: renewal.contract_end_date
        }
      });

      // Send notification
      await this.sendNotification(rule, {
        id: alertId,
        alert_title: `Renewal Opportunity: ${renewal.agency}`,
        alert_message: `${renewal.renewal_probability}% probability - $${this.formatCurrency(renewal.contract_value)}`,
        priority: rule.priority
      }, renewal, 'renewal');

      triggered++;
    }

    return triggered;
  }

  /**
   * Evaluate agency match alerts
   */
  async evaluateAgencyMatch(db, rule, conditions) {
    const agencies = conditions.agencies || [];
    const categories = conditions.categories || [];

    if (agencies.length === 0) return 0;

    let query = `
      SELECT * FROM bpo_tender_lifecycle
      WHERE agency IN (${agencies.map(() => '?').join(',')})
        AND stage NOT IN ('awarded', 'lost')
        AND created_at > datetime('now', '-1 hour')
    `;
    const params = [...agencies];

    if (categories.length > 0) {
      query += ` AND category IN (${categories.map(() => '?').join(',')})`;
      params.push(...categories);
    }

    const tenders = db.prepare(query).all(...params);

    let triggered = 0;

    for (const tender of tenders) {
      if (this.isDuplicate(db, rule.id, tender.id, null)) continue;

      const alertId = await this.createAlert(db, {
        rule_id: rule.id,
        trigger_type: 'tender',
        tender_id: tender.id,
        alert_title: `New Tender from ${tender.agency}`,
        alert_message: tender.title,
        alert_priority: rule.priority,
        alert_data: { tender_id: tender.id, agency: tender.agency, title: tender.title }
      });

      await this.sendNotification(rule, {
        id: alertId,
        alert_title: `New Tender from ${tender.agency}`,
        alert_message: tender.title,
        priority: rule.priority
      }, tender, 'tender');

      triggered++;
    }

    return triggered;
  }

  /**
   * Evaluate keyword match alerts
   */
  async evaluateKeywordMatch(db, rule, conditions) {
    const keywords = conditions.keywords || [];
    const matchType = conditions.match_type || 'any'; // 'any' or 'all'

    if (keywords.length === 0) return 0;

    const tenders = db.prepare(`
      SELECT * FROM bpo_tender_lifecycle
      WHERE stage NOT IN ('awarded', 'lost')
        AND created_at > datetime('now', '-1 hour')
    `).all();

    let triggered = 0;

    for (const tender of tenders) {
      const searchText = `${tender.title} ${tender.description || ''}`.toLowerCase();
      
      const matches = keywords.filter(kw => searchText.includes(kw.toLowerCase()));
      const shouldTrigger = matchType === 'any' ? matches.length > 0 : matches.length === keywords.length;

      if (!shouldTrigger) continue;
      if (this.isDuplicate(db, rule.id, tender.id, null)) continue;

      const alertId = await this.createAlert(db, {
        rule_id: rule.id,
        trigger_type: 'tender',
        tender_id: tender.id,
        alert_title: `Keyword Match: ${tender.title}`,
        alert_message: `Matched: ${matches.join(', ')}`,
        alert_priority: rule.priority,
        alert_data: { tender_id: tender.id, matched_keywords: matches }
      });

      await this.sendNotification(rule, {
        id: alertId,
        alert_title: `Keyword Match: ${tender.title}`,
        alert_message: `Matched: ${matches.join(', ')}`,
        priority: rule.priority
      }, tender, 'tender');

      triggered++;
    }

    return triggered;
  }

  /**
   * Check if alert is duplicate (same rule + same target within 1 hour)
   */
  isDuplicate(db, ruleId, tenderId, renewalId) {
    const existing = db.prepare(`
      SELECT id FROM alert_history
      WHERE rule_id = ?
        AND (tender_id = ? OR renewal_id = ?)
        AND triggered_at > datetime('now', '-1 hour')
      LIMIT 1
    `).get(ruleId, tenderId, renewalId);

    return !!existing;
  }

  /**
   * Create alert in database
   */
  async createAlert(db, alertData) {
    const id = uuidv4();

    db.prepare(`
      INSERT INTO alert_history (
        id, rule_id, trigger_type, tender_id, renewal_id,
        alert_title, alert_message, alert_priority, alert_data,
        delivered_channels, delivery_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      alertData.rule_id,
      alertData.trigger_type,
      alertData.tender_id || null,
      alertData.renewal_id || null,
      alertData.alert_title,
      alertData.alert_message,
      alertData.alert_priority,
      JSON.stringify(alertData.alert_data),
      '[]', // Will be updated after delivery
      'pending'
    );

    return id;
  }

  /**
   * Send notification via notification router
   */
  async sendNotification(rule, alert, data, type, daysUntil = null) {
    try {
      let result;

      if (type === 'tender') {
        if (daysUntil !== null) {
          result = await notificationRouter.routeClosingSoonAlert(data, rule, daysUntil);
        } else {
          result = await notificationRouter.routeHighValueTenderAlert(data, rule);
        }
      } else if (type === 'renewal') {
        result = await notificationRouter.routeRenewalPredictionAlert(data, rule);
      } else {
        result = await notificationRouter.routeAlert(alert, rule);
      }

      // Update alert with delivery results
      const db = new Database(DB_PATH);
      db.prepare(`
        UPDATE alert_history
        SET delivered_channels = ?,
            delivery_status = ?,
            delivery_errors = ?
        WHERE id = ?
      `).run(
        JSON.stringify(result.delivered_channels),
        result.success ? 'sent' : 'failed',
        result.failed_channels.length > 0 ? JSON.stringify(result.failed_channels) : null,
        alert.id
      );
      db.close();

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Handle escalations for unacknowledged critical alerts
   */
  async handleEscalations(db) {
    const alerts = db.prepare(`
      SELECT 
        ah.*,
        ar.escalation_enabled,
        ar.escalation_after_minutes,
        ar.escalation_recipients
      FROM alert_history ah
      JOIN alert_rules ar ON ah.rule_id = ar.id
      WHERE ah.acknowledged = 0
        AND ah.alert_priority IN ('critical', 'high')
        AND ar.escalation_enabled = 1
        AND ah.escalated = 0
        AND CAST((julianday('now') - julianday(ah.triggered_at)) * 1440 AS INTEGER) >= ar.escalation_after_minutes
    `).all();

    for (const alert of alerts) {
      try {
        console.log(`⏫ Escalating alert: ${alert.alert_title}`);

        // Send escalation notification
        const escalationRecipients = JSON.parse(alert.escalation_recipients || '{}');
        
        // Mark as escalated
        db.prepare(`
          UPDATE alert_history
          SET escalated = 1,
              escalated_at = CURRENT_TIMESTAMP,
              escalation_level = escalation_level + 1
          WHERE id = ?
        `).run(alert.id);

        // TODO: Send actual escalation notification to escalation_recipients
        // This would use the notification router with escalation-specific templates

      } catch (error) {
        console.error('Error handling escalation:', error);
      }
    }
  }

  /**
   * Process daily digest batches
   */
  async processDailyDigest(db) {
    // Check if it's time to send digest (default: 9 AM)
    const now = new Date();
    const hours = now.getHours();

    if (hours !== 9) return; // Only run at 9 AM

    // Get users with digest enabled
    const users = db.prepare(`
      SELECT * FROM user_alert_preferences
      WHERE digest_enabled = 1
        AND digest_frequency = 'daily'
    `).all();

    for (const user of users) {
      try {
        // Get unacknowledged low/medium priority alerts from last 24 hours
        const alerts = db.prepare(`
          SELECT * FROM alert_history
          WHERE acknowledged = 0
            AND alert_priority IN ('low', 'medium')
            AND triggered_at > datetime('now', '-1 day')
          ORDER BY alert_priority DESC, triggered_at DESC
        `).all();

        if (alerts.length === 0) continue;

        // Send digest
        await notificationRouter.sendDailyDigest(alerts, {
          emails: [user.email_address],
          slackChannels: user.slack_user_id ? [`@${user.slack_user_id}`] : []
        });

        // Mark alerts as included in digest
        const alertIds = alerts.map(a => a.id);
        db.prepare(`
          UPDATE alert_history
          SET digest_sent = 1,
              digest_sent_at = CURRENT_TIMESTAMP
          WHERE id IN (${alertIds.map(() => '?').join(',')})
        `).run(...alertIds);

      } catch (error) {
        console.error('Error processing digest for user:', error);
      }
    }
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('en-SG', { notation: 'compact' }).format(value);
  }
}

// Export singleton instance
module.exports = new AlertEngine();
