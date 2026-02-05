/**
 * 🎯 NOTIFICATION ROUTER
 * Orchestrates multi-channel alert delivery
 * Routes based on priority, user preferences, and quiet hours
 */

const emailService = require('./emailService');
const smsService = require('./smsService');
const slackService = require('./slackService');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/gebiz_intelligence.db');

class NotificationRouter {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize all notification services
   */
  initialize() {
    console.log('🎯 Initializing Notification Router...');
    
    const emailInit = emailService.initialize();
    const smsInit = smsService.initialize();
    const slackInit = slackService.initialize();
    
    this.initialized = true;
    
    console.log(`✅ Notification Router ready (Email: ${emailInit}, SMS: ${smsInit}, Slack: ${slackInit})`);
    return true;
  }

  /**
   * Route high-value tender alert
   */
  async routeHighValueTenderAlert(tender, rule) {
    if (!this.initialized) {
      console.warn('Notification router not initialized');
      return { success: false, error: 'Not initialized' };
    }
    
    const results = { email: null, sms: null, slack: null };
    const recipients = await this.getRecipients(rule.recipients);
    
    // Get channels based on priority
    const channels = this.getChannelsForPriority(rule.priority, rule.notification_channels);
    
    // Route to each channel
    if (channels.includes('email') && recipients.emails.length > 0) {
      results.email = await emailService.sendHighValueTenderAlert(tender, recipients.emails);
    }
    
    if (channels.includes('sms') && recipients.phones.length > 0) {
      results.sms = await smsService.sendHighValueTenderAlert(tender, recipients.phones);
    }
    
    if (channels.includes('slack') && recipients.slackChannels.length > 0) {
      results.slack = await slackService.sendHighValueTenderAlert(tender, recipients.slackChannels);
    }
    
    return this.formatResults(results);
  }

  /**
   * Route closing soon alert
   */
  async routeClosingSoonAlert(tender, rule, daysUntil) {
    if (!this.initialized) return { success: false, error: 'Not initialized' };
    
    const results = { email: null, sms: null, slack: null };
    const recipients = await this.getRecipients(rule.recipients);
    
    // CRITICAL priority for closing in 24 hours
    const priority = daysUntil <= 1 ? 'critical' : rule.priority;
    const channels = this.getChannelsForPriority(priority, rule.notification_channels);
    
    if (channels.includes('email') && recipients.emails.length > 0) {
      results.email = await emailService.sendClosingSoonAlert(tender, recipients.emails, daysUntil);
    }
    
    if (channels.includes('sms') && recipients.phones.length > 0) {
      results.sms = await smsService.sendClosingSoonAlert(tender, recipients.phones, daysUntil);
    }
    
    if (channels.includes('slack') && recipients.slackChannels.length > 0) {
      results.slack = await slackService.sendClosingSoonAlert(tender, recipients.slackChannels, daysUntil);
    }
    
    return this.formatResults(results);
  }

  /**
   * Route renewal prediction alert
   */
  async routeRenewalPredictionAlert(renewal, rule) {
    if (!this.initialized) return { success: false, error: 'Not initialized' };
    
    const results = { email: null, sms: null, slack: null };
    const recipients = await this.getRecipients(rule.recipients);
    
    const channels = this.getChannelsForPriority(rule.priority, rule.notification_channels);
    
    if (channels.includes('email') && recipients.emails.length > 0) {
      results.email = await emailService.sendRenewalPredictionAlert(renewal, recipients.emails);
    }
    
    if (channels.includes('sms') && recipients.phones.length > 0) {
      results.sms = await smsService.sendRenewalPredictionAlert(renewal, recipients.phones);
    }
    
    if (channels.includes('slack') && recipients.slackChannels.length > 0) {
      results.slack = await slackService.sendRenewalPredictionAlert(renewal, recipients.slackChannels);
    }
    
    return this.formatResults(results);
  }

  /**
   * Route generic alert
   */
  async routeAlert(alert, rule) {
    if (!this.initialized) return { success: false, error: 'Not initialized' };
    
    const results = { email: null, sms: null, slack: null };
    const recipients = await this.getRecipients(rule.recipients);
    
    const channels = this.getChannelsForPriority(rule.priority, rule.notification_channels);
    
    if (channels.includes('email') && recipients.emails.length > 0) {
      results.email = await emailService.sendAlert(alert, recipients.emails);
    }
    
    if (channels.includes('sms') && recipients.phones.length > 0) {
      results.sms = await smsService.sendAlert(alert, recipients.phones);
    }
    
    if (channels.includes('slack') && recipients.slackChannels.length > 0) {
      results.slack = await slackService.sendAlert(alert, recipients.slackChannels);
    }
    
    return this.formatResults(results);
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(alerts, recipients) {
    if (!this.initialized) return { success: false, error: 'Not initialized' };
    
    const results = { email: null, slack: null };
    
    if (recipients.emails && recipients.emails.length > 0) {
      results.email = await emailService.sendDailyDigest(alerts, recipients.emails);
    }
    
    if (recipients.slackChannels && recipients.slackChannels.length > 0) {
      results.slack = await slackService.sendDailyDigest(alerts, recipients.slackChannels);
    }
    
    return this.formatResults(results);
  }

  /**
   * Get recipients based on rule configuration
   */
  async getRecipients(recipientConfig) {
    const recipients = {
      emails: [],
      phones: [],
      slackChannels: [],
      userIds: []
    };
    
    try {
      const db = new Database(DB_PATH, { readonly: true });
      
      // Parse recipient config
      const config = typeof recipientConfig === 'string' 
        ? JSON.parse(recipientConfig) 
        : recipientConfig;
      
      // Direct email addresses
      if (config.emails && Array.isArray(config.emails)) {
        recipients.emails.push(...config.emails);
      }
      
      // Direct phone numbers
      if (config.phones && Array.isArray(config.phones)) {
        recipients.phones.push(...config.phones);
      }
      
      // Slack channels
      if (config.slack_channels && Array.isArray(config.slack_channels)) {
        recipients.slackChannels.push(...config.slack_channels);
      }
      
      // User IDs - fetch preferences from database
      if (config.users && Array.isArray(config.users)) {
        for (const userId of config.users) {
          const prefs = db.prepare(
            'SELECT * FROM user_alert_preferences WHERE user_id = ?'
          ).get(userId);
          
          if (prefs) {
            // Check if user is in quiet hours or DND
            if (this.isInQuietHours(prefs) || prefs.dnd_enabled) {
              continue;
            }
            
            if (prefs.email_enabled && prefs.email_address) {
              recipients.emails.push(prefs.email_address);
            }
            
            if (prefs.sms_enabled && prefs.sms_number) {
              recipients.phones.push(prefs.sms_number);
            }
            
            if (prefs.slack_enabled && prefs.slack_user_id) {
              recipients.slackChannels.push(`@${prefs.slack_user_id}`);
            }
            
            recipients.userIds.push(userId);
          }
        }
      }
      
      // Role-based recipients (fetch from users table - simplified)
      if (config.roles && Array.isArray(config.roles)) {
        // In a real system, you'd query users table by role
        // For now, use fallback emails
        const roleEmails = {
          'bid_manager': process.env.BID_MANAGER_EMAIL,
          'bd_manager': process.env.BD_MANAGER_EMAIL,
          'director': process.env.DIRECTOR_EMAIL
        };
        
        for (const role of config.roles) {
          if (roleEmails[role]) {
            recipients.emails.push(roleEmails[role]);
          }
        }
      }
      
      db.close();
      
      // Deduplicate
      recipients.emails = [...new Set(recipients.emails)].filter(Boolean);
      recipients.phones = [...new Set(recipients.phones)].filter(Boolean);
      recipients.slackChannels = [...new Set(recipients.slackChannels)].filter(Boolean);
      
    } catch (error) {
      console.error('Error getting recipients:', error);
    }
    
    return recipients;
  }

  /**
   * Determine channels based on priority
   * CRITICAL: email + SMS + Slack + in-app
   * HIGH: email + Slack + in-app
   * MEDIUM: in-app + email (digest)
   * LOW: in-app only
   */
  getChannelsForPriority(priority, configuredChannels) {
    const channels = typeof configuredChannels === 'string'
      ? JSON.parse(configuredChannels)
      : configuredChannels || [];
    
    const priorityRules = {
      critical: ['email', 'sms', 'slack', 'in_app', 'push'],
      high: ['email', 'slack', 'in_app'],
      medium: ['in_app', 'email'], // Email goes to digest
      low: ['in_app']
    };
    
    const allowed = priorityRules[priority] || priorityRules.medium;
    
    // Filter configured channels by what's allowed for this priority
    return channels.filter(c => allowed.includes(c));
  }

  /**
   * Check if user is in quiet hours
   */
  isInQuietHours(prefs) {
    if (!prefs.quiet_hours_enabled) return false;
    
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    // Parse quiet hours (format: "22:00")
    const [startHour, startMin] = (prefs.quiet_hours_start || '22:00').split(':').map(Number);
    const [endHour, endMin] = (prefs.quiet_hours_end || '07:00').split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Format results from multiple channels
   */
  formatResults(results) {
    const delivered = [];
    const failed = [];
    
    for (const [channel, result] of Object.entries(results)) {
      if (result && result.success) {
        delivered.push(channel);
      } else if (result) {
        failed.push({ channel, error: result.error });
      }
    }
    
    return {
      success: delivered.length > 0,
      delivered_channels: delivered,
      failed_channels: failed,
      details: results
    };
  }

  /**
   * Test all notification channels
   */
  async testAllChannels() {
    const testData = {
      tender: {
        id: 'test-123',
        title: 'Test Tender Notification',
        agency: 'Test Agency',
        estimated_value: 1000000,
        closing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        tender_no: 'TEST-001',
        stage: 'new_opportunity'
      },
      renewal: {
        id: 'test-456',
        agency: 'Test Agency',
        contract_description: 'Test Contract',
        contract_value: 2000000,
        contract_end_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        predicted_rfp_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        renewal_probability: 85,
        incumbent_supplier: 'Test Supplier',
        reasoning: { reasons: ['High contract value', 'Long-term relationship'] }
      },
      alert: {
        alert_title: 'Test Alert Notification',
        alert_message: 'This is a test alert to verify notification delivery.',
        priority: 'high'
      }
    };
    
    const results = {
      email: {
        highValue: await emailService.sendHighValueTenderAlert(testData.tender, [process.env.TEST_EMAIL]),
        closingSoon: await emailService.sendClosingSoonAlert(testData.tender, [process.env.TEST_EMAIL], 2),
        renewal: await emailService.sendRenewalPredictionAlert(testData.renewal, [process.env.TEST_EMAIL]),
        alert: await emailService.sendAlert(testData.alert, [process.env.TEST_EMAIL])
      },
      sms: {
        highValue: await smsService.sendHighValueTenderAlert(testData.tender, [process.env.TEST_PHONE]),
        closingSoon: await smsService.sendClosingSoonAlert(testData.tender, [process.env.TEST_PHONE], 2),
        renewal: await smsService.sendRenewalPredictionAlert(testData.renewal, [process.env.TEST_PHONE]),
        alert: await smsService.sendAlert(testData.alert, [process.env.TEST_PHONE])
      },
      slack: {
        highValue: await slackService.sendHighValueTenderAlert(testData.tender, [process.env.TEST_SLACK_CHANNEL]),
        closingSoon: await slackService.sendClosingSoonAlert(testData.tender, [process.env.TEST_SLACK_CHANNEL], 2),
        renewal: await slackService.sendRenewalPredictionAlert(testData.renewal, [process.env.TEST_SLACK_CHANNEL]),
        alert: await slackService.sendAlert(testData.alert, [process.env.TEST_SLACK_CHANNEL])
      }
    };
    
    return results;
  }
}

module.exports = new NotificationRouter();
