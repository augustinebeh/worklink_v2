/**
 * 📧 EMAIL NOTIFICATION SERVICE
 * SendGrid integration for alert delivery
 * Template-based emails with dynamic content
 */

const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    this.initialized = false;
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@worklink.sg';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'WorkLink BPO Intelligence';
  }

  /**
   * Initialize SendGrid with API key
   */
  initialize() {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  SendGrid API key not found. Email notifications disabled.');
      return false;
    }
    
    sgMail.setApiKey(apiKey);
    this.initialized = true;
    console.log('✅ Email service initialized (SendGrid)');
    return true;
  }

  /**
   * Send high-value tender alert
   */
  async sendHighValueTenderAlert(tender, recipients) {
    if (!this.initialized) return { success: false, error: 'Email service not initialized' };
    
    const subject = `🚨 High-Value Tender: ${tender.title} ($${this.formatCurrency(tender.estimated_value)})`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 High-Value Tender Alert</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">${tender.title}</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 40%;">Agency:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${tender.agency}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Value:</td>
              <td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 18px;">
                $${this.formatCurrency(tender.estimated_value)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Closing Date:</td>
              <td style="padding: 8px 0; color: #1f2937;">${this.formatDate(tender.closing_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Tender No:</td>
              <td style="padding: 8px 0; color: #1f2937;">${tender.tender_no || 'N/A'}</td>
            </tr>
          </table>
          
          ${tender.description ? `
            <div style="margin-top: 20px; padding: 15px; background: white; border-left: 4px solid #dc2626;">
              <p style="margin: 0; color: #4b5563;">${tender.description}</p>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.getAppUrl()}/admin/bpo-lifecycle/${tender.id}" 
               style="display: inline-block; background: #dc2626; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Review Tender →
            </a>
          </div>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">
            This alert was triggered by your BPO Intelligence System.<br>
            <a href="${this.getAppUrl()}/admin/alert-settings" style="color: #2563eb;">Manage alert preferences</a>
          </p>
        </div>
      </div>
    `;
    
    return await this.send(recipients, subject, html);
  }

  /**
   * Send closing soon alert
   */
  async sendClosingSoonAlert(tender, recipients, daysUntil) {
    if (!this.initialized) return { success: false, error: 'Email service not initialized' };
    
    const urgency = daysUntil <= 1 ? '⚠️ URGENT' : '⏰';
    const subject = `${urgency} Tender Closing in ${daysUntil} Day${daysUntil !== 1 ? 's' : ''}: ${tender.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ea580c; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⏰ Tender Closing Soon</h1>
          <p style="margin: 10px 0 0; font-size: 18px; font-weight: 600;">
            ${daysUntil} day${daysUntil !== 1 ? 's' : ''} remaining
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">${tender.title}</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 40%;">Agency:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${tender.agency}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Closes:</td>
              <td style="padding: 8px 0; color: #ea580c; font-weight: 700;">
                ${this.formatDate(tender.closing_date)} (${daysUntil} days)
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Current Stage:</td>
              <td style="padding: 8px 0; color: #1f2937;">${this.formatStage(tender.stage)}</td>
            </tr>
            ${tender.assigned_to ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Assigned To:</td>
                <td style="padding: 8px 0; color: #1f2937;">${tender.assigned_to}</td>
              </tr>
            ` : ''}
          </table>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.getAppUrl()}/admin/bpo-lifecycle/${tender.id}" 
               style="display: inline-block; background: #ea580c; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Take Action →
            </a>
          </div>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">Don't miss this deadline!</p>
        </div>
      </div>
    `;
    
    return await this.send(recipients, subject, html);
  }

  /**
   * Send renewal prediction alert
   */
  async sendRenewalPredictionAlert(renewal, recipients) {
    if (!this.initialized) return { success: false, error: 'Email service not initialized' };
    
    const subject = `🔮 Renewal Opportunity: ${renewal.agency} (${renewal.renewal_probability}% probability)`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔮 Renewal Opportunity Detected</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1f2937; margin-top: 0;">${renewal.agency}</h2>
          <p style="color: #6b7280; margin-top: 0;">${renewal.contract_description || 'Contract Renewal'}</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <div style="text-align: center;">
              <div style="font-size: 48px; font-weight: 700; color: #7c3aed; margin-bottom: 5px;">
                ${renewal.renewal_probability}%
              </div>
              <div style="color: #6b7280; font-size: 14px;">Renewal Probability</div>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 40%;">Contract Value:</td>
              <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">
                $${this.formatCurrency(renewal.contract_value)}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Contract Ends:</td>
              <td style="padding: 8px 0; color: #1f2937;">${this.formatDate(renewal.contract_end_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Expected RFP:</td>
              <td style="padding: 8px 0; color: #1f2937;">${this.formatDate(renewal.predicted_rfp_date)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Incumbent:</td>
              <td style="padding: 8px 0; color: #1f2937;">${renewal.incumbent_supplier || 'Unknown'}</td>
            </tr>
          </table>
          
          ${renewal.reasoning ? `
            <div style="margin-top: 20px; padding: 15px; background: white; border-left: 4px solid #7c3aed;">
              <h4 style="margin: 0 0 10px 0; color: #1f2937;">Why this is likely to renew:</h4>
              <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                ${renewal.reasoning.reasons ? renewal.reasoning.reasons.map(r => 
                  `<li style="margin: 5px 0;">${r}</li>`
                ).join('') : ''}
              </ul>
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.getAppUrl()}/admin/renewal-pipeline/${renewal.id}" 
               style="display: inline-block; background: #7c3aed; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              Start Engagement →
            </a>
          </div>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">
            Engagement window: ${this.formatDate(renewal.engagement_window_start)} - ${this.formatDate(renewal.engagement_window_end)}
          </p>
        </div>
      </div>
    `;
    
    return await this.send(recipients, subject, html);
  }

  /**
   * Send generic alert
   */
  async sendAlert(alert, recipients) {
    if (!this.initialized) return { success: false, error: 'Email service not initialized' };
    
    const priorityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#0ea5e9',
      low: '#6b7280'
    };
    
    const priorityIcons = {
      critical: '🚨',
      high: '⚠️',
      medium: 'ℹ️',
      low: '📢'
    };
    
    const color = priorityColors[alert.priority] || '#0ea5e9';
    const icon = priorityIcons[alert.priority] || 'ℹ️';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${icon} ${alert.alert_title}</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          <div style="padding: 15px; background: white; border-radius: 6px;">
            <p style="color: #4b5563; margin: 0; line-height: 1.6;">${alert.alert_message}</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.getAppUrl()}/admin/alerts" 
               style="display: inline-block; background: ${color}; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              View Alert →
            </a>
          </div>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
          <p style="margin: 0;">Priority: ${alert.priority.toUpperCase()}</p>
        </div>
      </div>
    `;
    
    return await this.send(recipients, alert.alert_title, html);
  }

  /**
   * Send daily digest
   */
  async sendDailyDigest(alerts, recipients) {
    if (!this.initialized) return { success: false, error: 'Email service not initialized' };
    
    const subject = `📊 Daily Digest: ${alerts.length} Alert${alerts.length !== 1 ? 's' : ''}`;
    
    const groupedAlerts = {
      critical: alerts.filter(a => a.priority === 'critical'),
      high: alerts.filter(a => a.priority === 'high'),
      medium: alerts.filter(a => a.priority === 'medium'),
      low: alerts.filter(a => a.priority === 'low')
    };
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Daily Alert Digest</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">${new Date().toLocaleDateString('en-SG', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
          ${groupedAlerts.critical.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #dc2626; margin: 0 0 10px 0;">🚨 Critical (${groupedAlerts.critical.length})</h3>
              ${groupedAlerts.critical.map(a => `
                <div style="background: white; padding: 12px; margin-bottom: 8px; border-left: 4px solid #dc2626;">
                  <strong>${a.alert_title}</strong>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${groupedAlerts.high.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #ea580c; margin: 0 0 10px 0;">⚠️ High Priority (${groupedAlerts.high.length})</h3>
              ${groupedAlerts.high.map(a => `
                <div style="background: white; padding: 12px; margin-bottom: 8px; border-left: 4px solid #ea580c;">
                  <strong>${a.alert_title}</strong>
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          ${groupedAlerts.medium.length > 0 ? `
            <div style="margin-bottom: 20px;">
              <h3 style="color: #0ea5e9; margin: 0 0 10px 0;">ℹ️ Medium Priority (${groupedAlerts.medium.length})</h3>
              ${groupedAlerts.medium.slice(0, 5).map(a => `
                <div style="background: white; padding: 12px; margin-bottom: 8px; border-left: 4px solid #0ea5e9;">
                  <strong>${a.alert_title}</strong>
                </div>
              `).join('')}
              ${groupedAlerts.medium.length > 5 ? `
                <p style="color: #6b7280; font-size: 14px;">
                  + ${groupedAlerts.medium.length - 5} more medium priority alerts
                </p>
              ` : ''}
            </div>
          ` : ''}
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${this.getAppUrl()}/admin/alerts" 
               style="display: inline-block; background: #1f2937; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: 600;">
              View All Alerts →
            </a>
          </div>
        </div>
      </div>
    `;
    
    return await this.send(recipients, subject, html);
  }

  /**
   * Generic send method
   */
  async send(recipients, subject, html) {
    if (!this.initialized) {
      return { success: false, error: 'Email service not initialized' };
    }
    
    try {
      const emails = Array.isArray(recipients) ? recipients : [recipients];
      
      const msg = {
        to: emails,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html
      };
      
      await sgMail.send(msg);
      
      return {
        success: true,
        recipients: emails.length,
        message: `Email sent to ${emails.length} recipient(s)`
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Helper methods
  formatCurrency(value) {
    return new Intl.NumberFormat('en-SG').format(value);
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-SG', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
  }

  formatStage(stage) {
    const stages = {
      renewal_watch: 'Renewal Watch',
      new_opportunity: 'New Opportunity',
      review: 'Under Review',
      bidding: 'Bidding',
      internal_approval: 'Internal Approval',
      submitted: 'Submitted',
      awarded: 'Awarded',
      lost: 'Lost'
    };
    return stages[stage] || stage;
  }

  getAppUrl() {
    return process.env.APP_URL || 'http://localhost:8080';
  }
}

module.exports = new EmailService();
