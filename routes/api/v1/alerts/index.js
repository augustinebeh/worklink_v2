/**
 * 🔔 ALERT SYSTEM API
 * Complete alert management: rules, history, preferences, triggering, delivery
 * Multi-channel: Email, SMS, Slack, In-app, Push
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../db');
const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../../../../utils/structured-logger');
const { safeJsonParse } = require('../../../../db/utils/db-helpers');
const logger = createLogger('alerts');

// Helper: check if a table exists (Railway compatibility)
function tableExists(tableName) {
  return !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(tableName);
}

// ============================================================================
// ALERT RULES MANAGEMENT
// ============================================================================

// GET /api/v1/alerts/rules - List all alert rules
router.get('/rules', (req, res) => {
  try {
    if (!tableExists('alert_rules')) {
      return res.json({
        success: true,
        data: [],
        message: 'Alert system not available on this deployment'
      });
    }

    const { active_only = 'true' } = req.query;

    let query = 'SELECT * FROM alert_rules';
    if (active_only === 'true') {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY priority DESC, rule_name ASC';

    const rules = db.prepare(query).all();

    // Parse JSON fields
    rules.forEach(rule => {
      rule.conditions = safeJsonParse(rule.conditions, {});
      rule.notification_channels = safeJsonParse(rule.notification_channels, []);
      rule.recipients = safeJsonParse(rule.recipients, {});
      if (rule.escalation_recipients) {
        rule.escalation_recipients = safeJsonParse(rule.escalation_recipients, {});
      }
    });



    res.json({ success: true, data: rules });
  } catch (error) {
    logger.error('Error fetching alert rules', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/v1/alerts/rules - Create alert rule
router.post('/rules', (req, res) => {
  try {
    if (!tableExists('alert_rules')) {
      return res.status(503).json({
        success: false,
        error: 'Alert system not available on this deployment',
        message: 'The alert system requires the GeBIZ intelligence database which is not available on Railway deployment'
      });
    }

    const {
      rule_name,
      rule_type,
      conditions,
      priority = 'medium',
      notification_channels,
      recipients,
      escalation_enabled = false,
      escalation_after_minutes = 60,
      escalation_recipients,
      digest_enabled = false,
      digest_frequency = 'daily',
      digest_time = '09:00',
      active = true,
      created_by
    } = req.body;
    
    if (!rule_name || !rule_type || !conditions || !notification_channels || !recipients) {
  
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO alert_rules (
        id, rule_name, rule_type, conditions, priority,
        notification_channels, recipients, escalation_enabled,
        escalation_after_minutes, escalation_recipients,
        digest_enabled, digest_frequency, digest_time,
        active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      rule_name,
      rule_type,
      JSON.stringify(conditions),
      priority,
      JSON.stringify(notification_channels),
      JSON.stringify(recipients),
      escalation_enabled ? 1 : 0,
      escalation_after_minutes,
      escalation_recipients ? JSON.stringify(escalation_recipients) : null,
      digest_enabled ? 1 : 0,
      digest_frequency,
      digest_time,
      active ? 1 : 0,
      created_by || 'system'
    );
    
    const rule = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id);

    
    res.status(201).json({
      success: true,
      data: rule,
      message: 'Alert rule created successfully'
    });
  } catch (error) {
    logger.error('Error creating alert rule', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/v1/alerts/rules/:id - Update alert rule
router.patch('/rules/:id', (req, res) => {
  try {
    const updates = [];
    const params = [];

    const allowedFields = [
      'rule_name', 'conditions', 'priority', 'notification_channels',
      'recipients', 'escalation_enabled', 'escalation_after_minutes',
      'escalation_recipients', 'digest_enabled', 'digest_frequency',
      'digest_time', 'active'
    ];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        
        // Stringify JSON fields
        if (['conditions', 'notification_channels', 'recipients', 'escalation_recipients'].includes(field)) {
          params.push(JSON.stringify(req.body[field]));
        } else if (['escalation_enabled', 'digest_enabled', 'active'].includes(field)) {
          params.push(req.body[field] ? 1 : 0);
        } else {
          params.push(req.body[field]);
        }
      }
    }
    
    if (updates.length === 0) {
  
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    
    const result = db.prepare(`UPDATE alert_rules SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    if (result.changes === 0) {
  
      return res.status(404).json({ success: false, error: 'Alert rule not found' });
    }
    
    const rule = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(req.params.id);

    
    res.json({
      success: true,
      data: rule,
      message: 'Alert rule updated successfully'
    });
  } catch (error) {
    logger.error('Error updating alert rule', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/v1/alerts/rules/:id - Delete alert rule
router.delete('/rules/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM alert_rules WHERE id = ?').run(req.params.id);
    

    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Alert rule not found' });
    }
    
    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting alert rule', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ALERT HISTORY & NOTIFICATIONS
// ============================================================================

// GET /api/v1/alerts/history - Get alert history
router.get('/history', (req, res) => {
  try {
    if (!tableExists('alert_history')) {
  
      return res.json({
        success: true,
        data: [],
        meta: {
          unread_count: 0,
          total: 0,
          limit: parseInt(req.query.limit) || 50,
          offset: parseInt(req.query.offset) || 0
        },
        message: 'Alert system not available on this deployment'
      });
    }

    const {
      unread_only = 'false',
      priority,
      limit = 50,
      offset = 0
    } = req.query;

    let query = 'SELECT * FROM alert_history WHERE 1=1';
    const params = [];
    
    if (unread_only === 'true') {
      query += ' AND acknowledged = 0';
    }
    
    if (priority) {
      query += ' AND alert_priority = ?';
      params.push(priority);
    }
    
    query += ' ORDER BY triggered_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const alerts = db.prepare(query).all(...params);
    
    // Parse JSON fields
    alerts.forEach(alert => {
      alert.alert_data = safeJsonParse(alert.alert_data, {});
      alert.delivered_channels = safeJsonParse(alert.delivered_channels, []);
      if (alert.delivery_errors) {
        alert.delivery_errors = safeJsonParse(alert.delivery_errors, []);
      }
    });
    
    // Get unread count
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM alert_history WHERE acknowledged = 0').get();
    

    
    res.json({
      success: true,
      data: alerts,
      meta: {
        unread_count: unreadCount.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching alert history', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/v1/alerts/history/:id/acknowledge - Mark alert as read
router.post('/history/:id/acknowledge', (req, res) => {
  try {
    if (!tableExists('alert_history')) {
  
      return res.json({
        success: true,
        message: 'Alert system not available on this deployment'
      });
    }

    const { user_id, action_taken, action_notes } = req.body;
    
    const result = db.prepare(`
      UPDATE alert_history 
      SET acknowledged = 1,
          acknowledged_at = CURRENT_TIMESTAMP,
          acknowledged_by = ?,
          action_taken = ?,
          action_notes = ?,
          action_taken_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(user_id || 'unknown', action_taken || null, action_notes || null, req.params.id);
    

    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    logger.error('Error acknowledging alert', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/v1/alerts/history/mark-all-read - Mark all as read
router.post('/history/mark-all-read', (req, res) => {
  try {
    if (!tableExists('alert_history')) {
  
      return res.json({
        success: true,
        message: 'Alert system not available on this deployment'
      });
    }

    const { user_id } = req.body;
    
    const result = db.prepare(`
      UPDATE alert_history 
      SET acknowledged = 1,
          acknowledged_at = CURRENT_TIMESTAMP,
          acknowledged_by = ?
      WHERE acknowledged = 0
    `).run(user_id || 'unknown');
    

    
    res.json({
      success: true,
      message: `Marked ${result.changes} alerts as read`
    });
  } catch (error) {
    logger.error('Error marking all as read', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/v1/alerts/unread-count - Get unread count only
router.get('/unread-count', (req, res) => {
  try {
    if (!tableExists('alert_history')) {
  
      return res.json({
        success: true,
        data: {
          unread_count: 0
        },
        message: 'Alert system not available on this deployment'
      });
    }

    const result = db.prepare('SELECT COUNT(*) as count FROM alert_history WHERE acknowledged = 0').get();



    res.json({
      success: true,
      data: {
        unread_count: result.count
      }
    });
  } catch (error) {
    logger.error('Error fetching unread count', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ALERT TRIGGERING ENGINE
// ============================================================================

// POST /api/v1/alerts/trigger - Manually trigger alert evaluation
router.post('/trigger', (req, res) => {
  try {
    const { tender_id, renewal_id, trigger_type } = req.body;
    
    // Get all active alert rules
    const rules = db.prepare('SELECT * FROM alert_rules WHERE active = 1').all();
    
    const triggered = [];
    
    for (const rule of rules) {
      const conditions = safeJsonParse(rule.conditions, {});
      
      let shouldTrigger = false;
      let alertData = {};
      
      if (trigger_type === 'tender' && tender_id) {
        const tender = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(tender_id);
        
        if (!tender) continue;
        
        // Evaluate conditions based on rule type
        if (rule.rule_type === 'value_threshold') {
          if (tender.estimated_value >= (conditions.min_value || 0)) {
            shouldTrigger = true;
            alertData = {
              tender_id: tender.id,
              title: `High-value tender: ${tender.title}`,
              value: tender.estimated_value,
              agency: tender.agency
            };
          }
        } else if (rule.rule_type === 'closing_soon') {
          const daysUntil = Math.floor(
            (new Date(tender.closing_date) - new Date()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntil <= (conditions.days_until_close || 2)) {
            shouldTrigger = true;
            alertData = {
              tender_id: tender.id,
              title: `Tender closing in ${daysUntil} days: ${tender.title}`,
              days_until_close: daysUntil,
              closing_date: tender.closing_date
            };
          }
        } else if (rule.rule_type === 'agency_match') {
          if (conditions.agencies && conditions.agencies.includes(tender.agency)) {
            shouldTrigger = true;
            alertData = {
              tender_id: tender.id,
              title: `New tender from ${tender.agency}: ${tender.title}`,
              agency: tender.agency
            };
          }
        }
      } else if (trigger_type === 'renewal' && renewal_id) {
        const renewal = db.prepare('SELECT * FROM contract_renewals WHERE id = ?').get(renewal_id);
        
        if (!renewal) continue;
        
        if (rule.rule_type === 'renewal_prediction') {
          const monthsUntil = Math.floor(
            (new Date(renewal.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24 * 30)
          );
          
          if (
            monthsUntil <= (conditions.months_until_expiry || 6) &&
            renewal.renewal_probability >= (conditions.min_probability || 70)
          ) {
            shouldTrigger = true;
            alertData = {
              renewal_id: renewal.id,
              title: `Renewal opportunity: ${renewal.agency} (${renewal.renewal_probability}% probability)`,
              probability: renewal.renewal_probability,
              months_until_expiry: monthsUntil,
              agency: renewal.agency
            };
          }
        }
      }
      
      if (shouldTrigger) {
        // Deduplication: skip if same rule+tender/renewal triggered in last 5 minutes
        const recentDupe = db.prepare(`
          SELECT id FROM alert_history
          WHERE rule_id = ? AND trigger_type = ?
            AND COALESCE(tender_id, '') = COALESCE(?, '')
            AND COALESCE(renewal_id, '') = COALESCE(?, '')
            AND triggered_at >= datetime('now', '-5 minutes')
          LIMIT 1
        `).get(rule.id, trigger_type, tender_id || '', renewal_id || '');

        if (recentDupe) continue;

        const alertId = uuidv4();

        db.prepare(`
          INSERT INTO alert_history (
            id, rule_id, trigger_type, tender_id, renewal_id,
            alert_title, alert_message, alert_priority, alert_data,
            delivered_channels, delivery_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          alertId,
          rule.id,
          trigger_type,
          tender_id || null,
          renewal_id || null,
          alertData.title,
          JSON.stringify(alertData),
          rule.priority,
          JSON.stringify(alertData),
          rule.notification_channels,
          'sent' // Mark as sent for now (actual delivery happens elsewhere)
        );
        
        triggered.push({
          rule_name: rule.rule_name,
          alert_id: alertId,
          priority: rule.priority,
          title: alertData.title
        });
      }
    }
    

    
    res.json({
      success: true,
      data: {
        triggered_count: triggered.length,
        alerts: triggered
      },
      message: `Triggered ${triggered.length} alerts`
    });
  } catch (error) {
    logger.error('Error triggering alerts', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// USER PREFERENCES
// ============================================================================

// GET /api/v1/alerts/preferences - Get user preferences
router.get('/preferences', (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id required' });
    }

    let prefs = db.prepare('SELECT * FROM user_alert_preferences WHERE user_id = ?').get(user_id);

    // Create default if doesn't exist
    if (!prefs) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO user_alert_preferences (id, user_id, email_enabled, sms_enabled, slack_enabled, in_app_enabled)
        VALUES (?, ?, 1, 0, 1, 1)
      `).run(id, user_id);
      prefs = db.prepare('SELECT * FROM user_alert_preferences WHERE id = ?').get(id);
    }
    
    // Parse JSON fields
    if (prefs.digest_days) {
      prefs.digest_days = safeJsonParse(prefs.digest_days, []);
    }
    
    res.json({ success: true, data: prefs });
  } catch (error) {
    logger.error('Error fetching preferences', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/v1/alerts/preferences - Update user preferences
router.patch('/preferences', (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id required' });
    }
    
    const updates = [];
    const params = [];
    
    const allowedFields = [
      'email_enabled', 'email_address', 'sms_enabled', 'sms_number',
      'slack_enabled', 'slack_user_id', 'in_app_enabled', 'push_enabled',
      'quiet_hours_enabled', 'quiet_hours_start', 'quiet_hours_end',
      'min_priority', 'digest_enabled', 'digest_frequency', 'digest_time',
      'digest_days', 'max_alerts_per_hour', 'max_sms_per_day',
      'dnd_enabled', 'dnd_until'
    ];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        
        if (['digest_days'].includes(field)) {
          params.push(JSON.stringify(req.body[field]));
        } else if (['email_enabled', 'sms_enabled', 'slack_enabled', 'in_app_enabled', 'push_enabled', 'quiet_hours_enabled', 'digest_enabled', 'dnd_enabled'].includes(field)) {
          params.push(req.body[field] ? 1 : 0);
        } else {
          params.push(req.body[field]);
        }
      }
    }
    
    if (updates.length === 0) {
  
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(user_id);
    
    db.prepare(`UPDATE user_alert_preferences SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
    
    const prefs = db.prepare('SELECT * FROM user_alert_preferences WHERE user_id = ?').get(user_id);
    

    
    res.json({
      success: true,
      data: prefs,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    logger.error('Error updating preferences', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
