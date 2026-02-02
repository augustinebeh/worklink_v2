/**
 * Email Delivery Tracker
 * Tracks email delivery status, retry attempts, and provides analytics
 */

const { db } = require('../../db');
const crypto = require('crypto');

class EmailDeliveryTracker {
  constructor() {
    this.ensureTablesExist();
  }

  /**
   * Ensure required tables exist
   */
  ensureTablesExist() {
    try {
      // Email delivery log table
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_delivery_log (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          tracking_id TEXT UNIQUE NOT NULL,
          recipient_email TEXT NOT NULL,
          subject TEXT NOT NULL,
          category TEXT DEFAULT 'general',
          priority TEXT DEFAULT 'normal',
          status TEXT DEFAULT 'pending',
          provider TEXT,
          message_id TEXT,
          attempt_count INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          last_error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          sent_at DATETIME,
          delivered_at DATETIME,
          failed_at DATETIME,
          metadata TEXT DEFAULT '{}'
        )
      `);

      // Email delivery attempts table
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_delivery_attempts (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          tracking_id TEXT NOT NULL,
          attempt_number INTEGER NOT NULL,
          status TEXT NOT NULL,
          error_message TEXT,
          response_data TEXT,
          attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tracking_id) REFERENCES email_delivery_log (tracking_id)
        )
      `);

      // Email configuration table
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_config (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          config_json TEXT NOT NULL,
          active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Email preferences table for users
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_preferences (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT,
          email TEXT NOT NULL,
          user_type TEXT DEFAULT 'admin',
          tender_alerts INTEGER DEFAULT 1,
          candidate_updates INTEGER DEFAULT 1,
          job_alerts INTEGER DEFAULT 1,
          daily_reports INTEGER DEFAULT 1,
          weekly_reports INTEGER DEFAULT 1,
          system_notifications INTEGER DEFAULT 1,
          frequency TEXT DEFAULT 'immediate',
          quiet_hours_start TEXT DEFAULT '22:00',
          quiet_hours_end TEXT DEFAULT '08:00',
          timezone TEXT DEFAULT 'Asia/Singapore',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for better performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status ON email_delivery_log (status);
        CREATE INDEX IF NOT EXISTS idx_email_delivery_log_created_at ON email_delivery_log (created_at);
        CREATE INDEX IF NOT EXISTS idx_email_delivery_log_category ON email_delivery_log (category);
        CREATE INDEX IF NOT EXISTS idx_email_delivery_attempts_tracking_id ON email_delivery_attempts (tracking_id);
        CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences (email);
      `);

      console.log('Email delivery tracking tables initialized');
    } catch (error) {
      console.error('Error creating email tracking tables:', error);
    }
  }

  /**
   * Create a new delivery record
   */
  createDeliveryRecord(emailData) {
    const trackingId = this.generateTrackingId();

    try {
      db.prepare(`
        INSERT INTO email_delivery_log (
          tracking_id, recipient_email, subject, category, priority,
          max_attempts, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        trackingId,
        emailData.to,
        emailData.subject,
        emailData.category || 'general',
        emailData.priority || 'normal',
        emailData.maxAttempts || 3,
        JSON.stringify(emailData.metadata || {})
      );

      console.log(`Created delivery record with tracking ID: ${trackingId}`);
      return trackingId;
    } catch (error) {
      console.error('Error creating delivery record:', error);
      throw error;
    }
  }

  /**
   * Log delivery attempt
   */
  logDeliveryAttempt(trackingId, attemptNumber, status, errorMessage = null, responseData = null) {
    try {
      db.prepare(`
        INSERT INTO email_delivery_attempts (
          tracking_id, attempt_number, status, error_message, response_data
        ) VALUES (?, ?, ?, ?, ?)
      `).run(trackingId, attemptNumber, status, errorMessage, responseData ? JSON.stringify(responseData) : null);

      // Update main record
      db.prepare(`
        UPDATE email_delivery_log
        SET attempt_count = ?, last_error = ?
        WHERE tracking_id = ?
      `).run(attemptNumber, errorMessage, trackingId);

    } catch (error) {
      console.error('Error logging delivery attempt:', error);
    }
  }

  /**
   * Mark email as delivered
   */
  markAsDelivered(trackingId, deliveryData) {
    try {
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE email_delivery_log
        SET status = 'delivered',
            message_id = ?,
            provider = ?,
            sent_at = ?,
            delivered_at = ?
        WHERE tracking_id = ?
      `).run(
        deliveryData.messageId,
        deliveryData.provider,
        now,
        now,
        trackingId
      );

      this.logDeliveryAttempt(trackingId, deliveryData.attempt, 'delivered', null, deliveryData);

      console.log(`Marked email as delivered: ${trackingId}`);
    } catch (error) {
      console.error('Error marking as delivered:', error);
    }
  }

  /**
   * Mark email as failed (temporary)
   */
  markAsFailed(trackingId, failureData) {
    try {
      db.prepare(`
        UPDATE email_delivery_log
        SET status = 'failed',
            last_error = ?
        WHERE tracking_id = ?
      `).run(failureData.error, trackingId);

      this.logDeliveryAttempt(trackingId, failureData.attempt, 'failed', failureData.error);

      console.log(`Marked email as failed (attempt ${failureData.attempt}): ${trackingId}`);
    } catch (error) {
      console.error('Error marking as failed:', error);
    }
  }

  /**
   * Mark email as permanently failed
   */
  markAsFailedPermanently(trackingId, failureData) {
    try {
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE email_delivery_log
        SET status = 'failed_permanent',
            failed_at = ?,
            last_error = ?
        WHERE tracking_id = ?
      `).run(now, failureData.error, trackingId);

      this.logDeliveryAttempt(trackingId, failureData.totalAttempts, 'failed_permanent', failureData.error);

      console.log(`Marked email as permanently failed: ${trackingId}`);
    } catch (error) {
      console.error('Error marking as permanently failed:', error);
    }
  }

  /**
   * Get delivery status
   */
  getDeliveryStatus(trackingId) {
    try {
      const record = db.prepare(`
        SELECT * FROM email_delivery_log WHERE tracking_id = ?
      `).get(trackingId);

      if (!record) {
        return null;
      }

      const attempts = db.prepare(`
        SELECT * FROM email_delivery_attempts
        WHERE tracking_id = ?
        ORDER BY attempt_number DESC
      `).all(trackingId);

      return {
        ...record,
        attempts,
        metadata: JSON.parse(record.metadata || '{}')
      };
    } catch (error) {
      console.error('Error getting delivery status:', error);
      return null;
    }
  }

  /**
   * Get delivery analytics
   */
  getDeliveryAnalytics(timeframe = '24h') {
    try {
      const timeCondition = this.getTimeCondition(timeframe);

      // Overall statistics
      const overall = db.prepare(`
        SELECT
          COUNT(*) as total_emails,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'failed' OR status = 'failed_permanent' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          AVG(CASE WHEN delivered_at IS NOT NULL THEN
            (julianday(delivered_at) - julianday(created_at)) * 24 * 60
          END) as avg_delivery_time_minutes
        FROM email_delivery_log
        WHERE created_at >= datetime('now', '${timeCondition}')
      `).get();

      // Success rate by category
      const byCategory = db.prepare(`
        SELECT
          category,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          ROUND(
            (SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
            2
          ) as success_rate
        FROM email_delivery_log
        WHERE created_at >= datetime('now', '${timeCondition}')
        GROUP BY category
        ORDER BY total DESC
      `).all();

      // Success rate by priority
      const byPriority = db.prepare(`
        SELECT
          priority,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          ROUND(
            (SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) * 100.0) / COUNT(*),
            2
          ) as success_rate
        FROM email_delivery_log
        WHERE created_at >= datetime('now', '${timeCondition}')
        GROUP BY priority
        ORDER BY total DESC
      `).all();

      // Hourly breakdown
      const hourlyBreakdown = db.prepare(`
        SELECT
          strftime('%H', created_at) as hour,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered
        FROM email_delivery_log
        WHERE created_at >= datetime('now', '-24 hours')
        GROUP BY strftime('%H', created_at)
        ORDER BY hour
      `).all();

      // Recent failures
      const recentFailures = db.prepare(`
        SELECT
          tracking_id, recipient_email, subject, category,
          last_error, attempt_count, created_at
        FROM email_delivery_log
        WHERE status IN ('failed', 'failed_permanent')
          AND created_at >= datetime('now', '${timeCondition}')
        ORDER BY created_at DESC
        LIMIT 10
      `).all();

      return {
        timeframe,
        overall,
        byCategory,
        byPriority,
        hourlyBreakdown,
        recentFailures
      };
    } catch (error) {
      console.error('Error getting delivery analytics:', error);
      return null;
    }
  }

  /**
   * Get emails that need retry
   */
  getEmailsForRetry() {
    try {
      const emails = db.prepare(`
        SELECT * FROM email_delivery_log
        WHERE status = 'failed'
          AND attempt_count < max_attempts
          AND created_at >= datetime('now', '-24 hours')
        ORDER BY priority DESC, created_at ASC
        LIMIT 100
      `).all();

      return emails.map(email => ({
        ...email,
        metadata: JSON.parse(email.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error getting emails for retry:', error);
      return [];
    }
  }

  /**
   * Clean old delivery records
   */
  cleanOldRecords(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffISO = cutoffDate.toISOString();

      const deletedAttempts = db.prepare(`
        DELETE FROM email_delivery_attempts
        WHERE tracking_id IN (
          SELECT tracking_id FROM email_delivery_log
          WHERE created_at < ?
        )
      `).run(cutoffISO);

      const deletedLogs = db.prepare(`
        DELETE FROM email_delivery_log
        WHERE created_at < ?
      `).run(cutoffISO);

      console.log(`Cleaned ${deletedLogs.changes} old delivery records and ${deletedAttempts.changes} attempt records`);

      return {
        deletedLogs: deletedLogs.changes,
        deletedAttempts: deletedAttempts.changes
      };
    } catch (error) {
      console.error('Error cleaning old records:', error);
      return { deletedLogs: 0, deletedAttempts: 0 };
    }
  }

  /**
   * Generate unique tracking ID
   */
  generateTrackingId() {
    return 'em_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Helper to convert timeframe to SQL condition
   */
  getTimeCondition(timeframe) {
    const timeframeMap = {
      '1h': '-1 hour',
      '24h': '-24 hours',
      '7d': '-7 days',
      '30d': '-30 days'
    };

    return timeframeMap[timeframe] || '-24 hours';
  }

  /**
   * Get email preferences for recipient
   */
  getEmailPreferences(email, userType = 'admin') {
    try {
      let preferences = db.prepare(`
        SELECT * FROM email_preferences
        WHERE email = ? AND user_type = ?
      `).get(email, userType);

      // Create default preferences if none exist
      if (!preferences) {
        preferences = this.createDefaultPreferences(email, userType);
      }

      return preferences;
    } catch (error) {
      console.error('Error getting email preferences:', error);
      return this.getDefaultPreferences(email, userType);
    }
  }

  /**
   * Create default email preferences
   */
  createDefaultPreferences(email, userType) {
    try {
      const id = 'pref_' + crypto.randomBytes(8).toString('hex');

      db.prepare(`
        INSERT INTO email_preferences (
          id, email, user_type, tender_alerts, candidate_updates,
          job_alerts, daily_reports, weekly_reports, system_notifications
        ) VALUES (?, ?, ?, 1, 1, 1, 1, 1, 1)
      `).run(id, email, userType);

      return this.getEmailPreferences(email, userType);
    } catch (error) {
      console.error('Error creating default preferences:', error);
      return this.getDefaultPreferences(email, userType);
    }
  }

  /**
   * Get default preferences object
   */
  getDefaultPreferences(email, userType) {
    return {
      email,
      user_type: userType,
      tender_alerts: 1,
      candidate_updates: 1,
      job_alerts: 1,
      daily_reports: 1,
      weekly_reports: 1,
      system_notifications: 1,
      frequency: 'immediate',
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      timezone: 'Asia/Singapore'
    };
  }

  /**
   * Update email preferences
   */
  updateEmailPreferences(email, preferences) {
    try {
      const updates = [];
      const values = [];

      Object.keys(preferences).forEach(key => {
        if (key !== 'email' && key !== 'user_type' && key !== 'id') {
          updates.push(`${key} = ?`);
          values.push(preferences[key]);
        }
      });

      if (updates.length > 0) {
        values.push(new Date().toISOString());
        values.push(email);

        db.prepare(`
          UPDATE email_preferences
          SET ${updates.join(', ')}, updated_at = ?
          WHERE email = ?
        `).run(...values);
      }

      return this.getEmailPreferences(email);
    } catch (error) {
      console.error('Error updating email preferences:', error);
      throw error;
    }
  }

  /**
   * Check if user should receive email based on preferences
   */
  shouldSendEmail(email, category, userType = 'admin') {
    try {
      const preferences = this.getEmailPreferences(email, userType);

      // Map categories to preference fields
      const categoryMap = {
        'tender-alert': 'tender_alerts',
        'candidate-update': 'candidate_updates',
        'job-alert': 'job_alerts',
        'report-daily': 'daily_reports',
        'report-weekly': 'weekly_reports',
        'system': 'system_notifications',
        'general': 'system_notifications'
      };

      const prefField = categoryMap[category] || 'system_notifications';

      if (!preferences[prefField]) {
        return false;
      }

      // Check quiet hours
      const now = new Date();
      const currentHour = now.getHours();
      const quietStart = parseInt(preferences.quiet_hours_start.split(':')[0]);
      const quietEnd = parseInt(preferences.quiet_hours_end.split(':')[0]);

      // Skip quiet hours check for high priority emails
      if (category !== 'tender-alert' && category !== 'system') {
        if (quietStart > quietEnd) { // Quiet hours span midnight
          if (currentHour >= quietStart || currentHour < quietEnd) {
            return false;
          }
        } else { // Quiet hours within same day
          if (currentHour >= quietStart && currentHour < quietEnd) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking email preferences:', error);
      return true; // Default to sending if error
    }
  }
}

module.exports = EmailDeliveryTracker;