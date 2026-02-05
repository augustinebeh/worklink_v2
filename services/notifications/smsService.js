/**
 * 📱 SMS NOTIFICATION SERVICE
 * Twilio integration for critical alerts
 * Short, actionable text messages
 */

const twilio = require('twilio');

class SmsService {
  constructor() {
    this.initialized = false;
    this.client = null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  /**
   * Initialize Twilio client
   */
  initialize() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken || !this.fromNumber) {
      console.warn('⚠️  Twilio credentials not found. SMS notifications disabled.');
      return false;
    }
    
    this.client = twilio(accountSid, authToken);
    this.initialized = true;
    console.log('✅ SMS service initialized (Twilio)');
    return true;
  }

  /**
   * Send high-value tender SMS
   */
  async sendHighValueTenderAlert(tender, phoneNumbers) {
    if (!this.initialized) return { success: false, error: 'SMS service not initialized' };
    
    const message = `🚨 HIGH-VALUE TENDER\n` +
                   `${tender.title}\n` +
                   `${tender.agency}\n` +
                   `Value: $${this.formatCurrency(tender.estimated_value)}\n` +
                   `Closes: ${this.formatDate(tender.closing_date)}\n` +
                   `Review: ${this.getAppUrl()}/admin/bpo-lifecycle/${tender.id}`;
    
    return await this.send(phoneNumbers, message);
  }

  /**
   * Send closing soon SMS
   */
  async sendClosingSoonAlert(tender, phoneNumbers, daysUntil) {
    if (!this.initialized) return { success: false, error: 'SMS service not initialized' };
    
    const urgency = daysUntil <= 1 ? '⚠️ URGENT' : '⏰';
    const message = `${urgency} TENDER CLOSING ${daysUntil}D\n` +
                   `${tender.title}\n` +
                   `${tender.agency}\n` +
                   `Action: ${this.getAppUrl()}/admin/bpo-lifecycle/${tender.id}`;
    
    return await this.send(phoneNumbers, message);
  }

  /**
   * Send renewal opportunity SMS
   */
  async sendRenewalPredictionAlert(renewal, phoneNumbers) {
    if (!this.initialized) return { success: false, error: 'SMS service not initialized' };
    
    const message = `🔮 RENEWAL OPPORTUNITY\n` +
                   `${renewal.agency}\n` +
                   `${renewal.renewal_probability}% probability\n` +
                   `Value: $${this.formatCurrency(renewal.contract_value)}\n` +
                   `View: ${this.getAppUrl()}/admin/renewal-pipeline/${renewal.id}`;
    
    return await this.send(phoneNumbers, message);
  }

  /**
   * Send generic alert SMS
   */
  async sendAlert(alert, phoneNumbers) {
    if (!this.initialized) return { success: false, error: 'SMS service not initialized' };
    
    const priorityIcon = {
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '📢'
    };
    
    const message = `${priorityIcon[alert.priority] || 'ℹ️'} ${alert.priority.toUpperCase()}\n` +
                   `${alert.alert_title}\n` +
                   `View: ${this.getAppUrl()}/admin/alerts`;
    
    return await this.send(phoneNumbers, message);
  }

  /**
   * Generic send method
   */
  async send(phoneNumbers, message) {
    if (!this.initialized) {
      return { success: false, error: 'SMS service not initialized' };
    }
    
    try {
      const numbers = Array.isArray(phoneNumbers) ? phoneNumbers : [phoneNumbers];
      const results = [];
      
      for (const number of numbers) {
        try {
          const result = await this.client.messages.create({
            body: message.substring(0, 1600), // Twilio limit
            from: this.fromNumber,
            to: this.formatPhoneNumber(number)
          });
          
          results.push({
            to: number,
            sid: result.sid,
            status: result.status,
            success: true
          });
        } catch (error) {
          results.push({
            to: number,
            success: false,
            error: error.message
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      
      return {
        success: successful > 0,
        sent: successful,
        failed: results.length - successful,
        results
      };
    } catch (error) {
      console.error('SMS send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format phone number for Twilio
   */
  formatPhoneNumber(number) {
    // Remove spaces and special characters
    let cleaned = number.replace(/[^\d+]/g, '');
    
    // Add + if missing
    if (!cleaned.startsWith('+')) {
      // Assume Singapore number if no country code
      if (cleaned.length === 8) {
        cleaned = '+65' + cleaned;
      } else {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('en-SG', { notation: 'compact' }).format(value);
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' });
  }

  getAppUrl() {
    return process.env.APP_URL || 'http://localhost:8080';
  }
}

module.exports = new SmsService();
