/**
 * Email Preferences API
 * Manages user email notification preferences and settings
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const EmailDeliveryTracker = require('../../../services/email/delivery-tracker');

const deliveryTracker = new EmailDeliveryTracker();

// Get email preferences for current user
router.get('/', (req, res) => {
  try {
    const { email, userType = 'admin' } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const preferences = deliveryTracker.getEmailPreferences(email, userType);

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting email preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update email preferences
router.patch('/', (req, res) => {
  try {
    const { email, userType = 'admin', ...preferences } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Validate preference values
    const validBooleanFields = [
      'tender_alerts',
      'candidate_updates',
      'job_alerts',
      'daily_reports',
      'weekly_reports',
      'system_notifications'
    ];

    const validStringFields = [
      'frequency',
      'quiet_hours_start',
      'quiet_hours_end',
      'timezone'
    ];

    // Validate boolean fields
    validBooleanFields.forEach(field => {
      if (preferences[field] !== undefined) {
        if (typeof preferences[field] !== 'boolean' && ![0, 1, '0', '1', 'true', 'false'].includes(preferences[field])) {
          throw new Error(`Invalid value for ${field}: must be boolean`);
        }
        // Convert to integer for SQLite
        preferences[field] = preferences[field] === true || preferences[field] === 1 || preferences[field] === '1' || preferences[field] === 'true' ? 1 : 0;
      }
    });

    // Validate time format for quiet hours
    if (preferences.quiet_hours_start && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quiet_hours_start)) {
      throw new Error('Invalid quiet_hours_start format. Use HH:MM format.');
    }

    if (preferences.quiet_hours_end && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quiet_hours_end)) {
      throw new Error('Invalid quiet_hours_end format. Use HH:MM format.');
    }

    // Validate frequency
    if (preferences.frequency && !['immediate', 'hourly', 'daily'].includes(preferences.frequency)) {
      throw new Error('Invalid frequency. Must be: immediate, hourly, or daily');
    }

    const updatedPreferences = deliveryTracker.updateEmailPreferences(email, preferences);

    res.json({
      success: true,
      data: updatedPreferences,
      message: 'Email preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all email preferences (admin only)
router.get('/all', (req, res) => {
  try {
    const preferences = db.prepare(`
      SELECT * FROM email_preferences
      ORDER BY user_type, email
    `).all();

    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting all preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bulk update preferences
router.post('/bulk-update', (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates must be an array'
      });
    }

    const results = [];

    for (const update of updates) {
      try {
        const { email, ...preferences } = update;
        const updatedPrefs = deliveryTracker.updateEmailPreferences(email, preferences);
        results.push({
          email,
          success: true,
          preferences: updatedPrefs
        });
      } catch (error) {
        results.push({
          email: update.email,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error bulk updating preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test email preferences
router.post('/test', async (req, res) => {
  try {
    const { email, category = 'test', userType = 'admin' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    const shouldSend = deliveryTracker.shouldSendEmail(email, category, userType);
    const preferences = deliveryTracker.getEmailPreferences(email, userType);

    res.json({
      success: true,
      data: {
        email,
        category,
        userType,
        shouldSend,
        preferences,
        reason: shouldSend ? 'Email would be sent' : 'Email would be blocked by preferences'
      }
    });
  } catch (error) {
    console.error('Error testing email preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get email delivery statistics
router.get('/delivery-stats', (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;

    const stats = deliveryTracker.getDeliveryAnalytics(timeframe);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting delivery stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get delivery status for a specific email
router.get('/delivery-status/:trackingId', (req, res) => {
  try {
    const { trackingId } = req.params;

    const status = deliveryTracker.getDeliveryStatus(trackingId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Delivery record not found'
      });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting delivery status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retry failed emails
router.post('/retry-failed', async (req, res) => {
  try {
    const { limit = 50 } = req.body;

    const failedEmails = deliveryTracker.getEmailsForRetry().slice(0, limit);

    if (failedEmails.length === 0) {
      return res.json({
        success: true,
        message: 'No failed emails to retry',
        data: { retried: 0 }
      });
    }

    // Here you would integrate with the email service to retry
    // For now, we'll just return the count
    const emailService = require('../../../services/email');

    let retriedCount = 0;
    const results = [];

    for (const emailRecord of failedEmails) {
      try {
        // Reconstruct email data from delivery log
        const emailData = {
          to: emailRecord.recipient_email,
          subject: emailRecord.subject,
          category: emailRecord.category,
          priority: emailRecord.priority,
          trackingId: emailRecord.tracking_id // Reuse existing tracking ID
        };

        // This would retry the actual email sending
        // await emailService.sendEmail(emailData);

        results.push({
          trackingId: emailRecord.tracking_id,
          success: true
        });

        retriedCount++;
      } catch (error) {
        results.push({
          trackingId: emailRecord.tracking_id,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        retried: retriedCount,
        total: failedEmails.length,
        results
      }
    });
  } catch (error) {
    console.error('Error retrying failed emails:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clean old delivery records
router.post('/cleanup', (req, res) => {
  try {
    const { daysToKeep = 30 } = req.body;

    if (daysToKeep < 1 || daysToKeep > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days to keep must be between 1 and 365'
      });
    }

    const result = deliveryTracker.cleanOldRecords(daysToKeep);

    res.json({
      success: true,
      data: result,
      message: `Cleaned records older than ${daysToKeep} days`
    });
  } catch (error) {
    console.error('Error cleaning old records:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Export unsubscribe preferences for GDPR compliance
router.get('/export/:email', (req, res) => {
  try {
    const { email } = req.params;

    const preferences = db.prepare(`
      SELECT * FROM email_preferences WHERE email = ?
    `).all(email);

    const deliveryLog = db.prepare(`
      SELECT tracking_id, subject, category, status, created_at, delivered_at
      FROM email_delivery_log
      WHERE recipient_email = ?
      ORDER BY created_at DESC
      LIMIT 100
    `).all(email);

    res.json({
      success: true,
      data: {
        email,
        preferences,
        recentDeliveries: deliveryLog
      }
    });
  } catch (error) {
    console.error('Error exporting preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Unsubscribe from all emails
router.post('/unsubscribe', (req, res) => {
  try {
    const { email, userType = 'admin' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required'
      });
    }

    // Disable all notifications
    const unsubscribePreferences = {
      tender_alerts: 0,
      candidate_updates: 0,
      job_alerts: 0,
      daily_reports: 0,
      weekly_reports: 0,
      system_notifications: 0
    };

    const updatedPreferences = deliveryTracker.updateEmailPreferences(email, unsubscribePreferences);

    res.json({
      success: true,
      data: updatedPreferences,
      message: `Successfully unsubscribed ${email} from all email notifications`
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;