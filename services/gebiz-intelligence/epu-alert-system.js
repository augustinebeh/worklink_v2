/**
 * EPU/SER/19 Real-Time Alert System
 * Comprehensive monitoring and notification system for Service - Manpower Supply tenders
 *
 * Features:
 * - Real-time tender detection
 * - Multi-channel notifications (Email, SMS, Webhook, WebSocket)
 * - Intelligent alert prioritization
 * - Market opportunity scoring
 * - Competitive threat assessment
 * - Automated market reports
 */

const EPUSer19Monitor = require('./epu-ser-19-monitor');
const EPUSer19Scraper = require('./epu-ser-19-scraper');
const nodemailer = require('nodemailer');
const axios = require('axios');

class EPUAlertSystem {
  constructor(options = {}) {
    this.monitor = new EPUSer19Monitor();
    this.scraper = new EPUSer19Scraper();

    this.config = {
      scanInterval: options.scanInterval || 30, // minutes
      alertThresholds: {
        urgent: 80,
        high: 60,
        medium: 40,
        low: 20
      },
      notifications: {
        email: options.email || true,
        sms: options.sms || false,
        webhook: options.webhook || true,
        websocket: options.websocket || true
      },
      ...options
    };

    this.alertHistory = new Map();
    this.isRunning = false;
    this.scanInterval = null;

    // Initialize notification services
    this.initializeNotificationServices();

    // Alert recipients configuration
    this.alertRecipients = {
      urgent: ['admin@worklink.sg', 'alerts@worklink.sg'],
      high: ['admin@worklink.sg'],
      medium: ['admin@worklink.sg'],
      low: []
    };

    this.stats = {
      totalScans: 0,
      alertsSent: 0,
      opportunitiesDetected: 0,
      averageResponseTime: 0,
      lastScanTime: null,
      alertBreakdown: {
        urgent: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };
  }

  /**
   * Initialize notification services (Email, SMS, etc.)
   */
  initializeNotificationServices() {
    // Email service
    if (this.config.notifications.email) {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'localhost',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    console.log('📧 Notification services initialized');
  }

  /**
   * Start real-time monitoring
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  EPU Alert System is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🚀 Starting EPU/SER/19 real-time monitoring (${this.config.scanInterval} min intervals)`);

    // Immediate scan
    this.performScan();

    // Schedule regular scans
    this.scanInterval = setInterval(() => {
      this.performScan();
    }, this.config.scanInterval * 60 * 1000);

    // Daily market reports
    this.scheduleMarketReports();

    console.log('✅ EPU Alert System started successfully');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    console.log('🛑 EPU Alert System stopped');
  }

  /**
   * Perform EPU/SER/19 scan and generate alerts
   */
  async performScan() {
    const scanStartTime = Date.now();

    try {
      console.log('🔍 Starting EPU/SER/19 scan...');

      this.stats.totalScans++;
      this.stats.lastScanTime = new Date().toISOString();

      // Run specialized scraper
      const tenders = await this.scraper.scrapeEPUTenders();

      console.log(`📊 Found ${tenders.length} potential EPU tenders`);

      // Process each tender for alerts
      const newAlerts = [];
      for (const tender of tenders) {
        const alerts = await this.processTenderForAlerts(tender);
        newAlerts.push(...alerts);
      }

      // Send alerts
      for (const alert of newAlerts) {
        await this.sendAlert(alert);
      }

      // Update statistics
      const scanDuration = Date.now() - scanStartTime;
      this.stats.averageResponseTime = (this.stats.averageResponseTime + scanDuration) / 2;
      this.stats.opportunitiesDetected += tenders.length;

      console.log(`✅ Scan completed in ${scanDuration}ms - ${newAlerts.length} alerts generated`);

      // Broadcast scan results via WebSocket
      this.broadcastScanResults({
        scan_completed_at: new Date().toISOString(),
        tenders_found: tenders.length,
        alerts_generated: newAlerts.length,
        scan_duration_ms: scanDuration,
        next_scan_in_minutes: this.config.scanInterval
      });

    } catch (error) {
      console.error('❌ EPU scan failed:', error.message);

      // Send error alert to admins
      await this.sendAlert({
        type: 'system_error',
        priority: 'urgent',
        title: 'EPU/SER/19 Scan Failed',
        message: `EPU monitoring scan failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        action_required: 'Check system logs and restart monitoring if needed'
      });
    }
  }

  /**
   * Process tender and generate appropriate alerts
   */
  async processTenderForAlerts(tender) {
    const alerts = [];

    try {
      // Check if we've already alerted for this tender
      const tenderKey = tender.tender_no || tender.title;
      if (this.alertHistory.has(tenderKey)) {
        return alerts; // Already processed
      }

      // Mark as processed
      this.alertHistory.set(tenderKey, {
        first_seen: new Date().toISOString(),
        alerts_sent: 0
      });

      // Determine alert priority based on intelligence score
      let alertPriority = 'low';
      if (tender.intelligence_score >= this.config.alertThresholds.urgent) {
        alertPriority = 'urgent';
      } else if (tender.intelligence_score >= this.config.alertThresholds.high) {
        alertPriority = 'high';
      } else if (tender.intelligence_score >= this.config.alertThresholds.medium) {
        alertPriority = 'medium';
      }

      // Create new opportunity alert
      const opportunityAlert = {
        type: 'new_opportunity',
        priority: alertPriority,
        tender: tender,
        title: `New EPU/SER/19 Opportunity: ${tender.title}`,
        message: this.generateOpportunityMessage(tender),
        timestamp: new Date().toISOString(),
        intelligence_score: tender.intelligence_score,
        estimated_value: tender.estimated_value,
        closing_date: tender.closing_date,
        win_probability: tender.win_probability,
        recommended_actions: this.generateRecommendedActions(tender)
      };

      alerts.push(opportunityAlert);

      // Check for specific alert triggers
      await this.checkSpecialAlertTriggers(tender, alerts);

      // Update alert statistics
      this.stats.alertBreakdown[alertPriority]++;
      this.stats.alertsSent += alerts.length;

      return alerts;

    } catch (error) {
      console.error('Error processing tender for alerts:', error.message);
      return [];
    }
  }

  /**
   * Check for special alert triggers (high value, urgent closing, etc.)
   */
  async checkSpecialAlertTriggers(tender, alerts) {
    // High value opportunity
    if (tender.estimated_value && tender.estimated_value > 500000) {
      alerts.push({
        type: 'high_value_opportunity',
        priority: 'high',
        tender: tender,
        title: `High Value EPU Tender: $${tender.estimated_value.toLocaleString()}`,
        message: `Exceptional opportunity detected with estimated value of $${tender.estimated_value.toLocaleString()}. This represents significant revenue potential for manpower supply services.`,
        timestamp: new Date().toISOString(),
        action_required: 'Immediate proposal preparation recommended'
      });
    }

    // Urgent closing date
    if (tender.closing_date) {
      const closingDate = new Date(tender.closing_date);
      const today = new Date();
      const daysToClose = Math.ceil((closingDate - today) / (1000 * 60 * 60 * 24));

      if (daysToClose <= 5 && daysToClose > 0) {
        alerts.push({
          type: 'urgent_deadline',
          priority: 'urgent',
          tender: tender,
          title: `Urgent: EPU Tender Closing in ${daysToClose} Days`,
          message: `Time-sensitive opportunity! Tender "${tender.title}" closes in ${daysToClose} days. Immediate action required.`,
          timestamp: new Date().toISOString(),
          days_to_close: daysToClose,
          action_required: 'Start proposal preparation immediately'
        });
      }
    }

    // High win probability
    if (tender.win_probability && tender.win_probability > 0.7) {
      alerts.push({
        type: 'high_win_probability',
        priority: 'high',
        tender: tender,
        title: `High Win Probability: ${(tender.win_probability * 100).toFixed(0)}%`,
        message: `Excellent opportunity with ${(tender.win_probability * 100).toFixed(0)}% estimated win probability based on historical analysis and market positioning.`,
        timestamp: new Date().toISOString(),
        win_probability: tender.win_probability,
        action_required: 'Prioritize this opportunity for proposal development'
      });
    }

    // Renewal opportunity
    if (tender.renewal_probability && tender.renewal_probability > 0.6) {
      alerts.push({
        type: 'renewal_opportunity',
        priority: 'medium',
        tender: tender,
        title: `Potential Renewal Contract Detected`,
        message: `This tender shows ${(tender.renewal_probability * 100).toFixed(0)}% probability of being a renewal. Long-term revenue potential identified.`,
        timestamp: new Date().toISOString(),
        renewal_probability: tender.renewal_probability,
        action_required: 'Research incumbent supplier and develop competitive strategy'
      });
    }

    // Preferred agencies
    const preferredAgencies = ['Ministry of Health', 'Ministry of Education', 'HDB', 'NEA'];
    if (tender.agency && preferredAgencies.some(agency =>
        tender.agency.toLowerCase().includes(agency.toLowerCase()))) {
      alerts.push({
        type: 'preferred_agency',
        priority: 'high',
        tender: tender,
        title: `Opportunity with Preferred Agency: ${tender.agency}`,
        message: `Tender from high-priority agency detected. These agencies typically offer stable, long-term contracts with good payment terms.`,
        timestamp: new Date().toISOString(),
        agency: tender.agency,
        action_required: 'Leverage previous agency relationships and prepare comprehensive proposal'
      });
    }
  }

  /**
   * Generate opportunity message for alerts
   */
  generateOpportunityMessage(tender) {
    let message = `New EPU/SER/19 opportunity detected:\n\n`;
    message += `📋 Title: ${tender.title}\n`;
    message += `🏢 Agency: ${tender.agency || 'TBD'}\n`;
    message += `💰 Est. Value: $${tender.estimated_value?.toLocaleString() || 'TBD'}\n`;
    message += `👥 Service Type: ${tender.service_type || 'General Manpower'}\n`;
    message += `📅 Closing Date: ${tender.closing_date || 'TBD'}\n`;
    message += `🎯 Intelligence Score: ${tender.intelligence_score}/100\n`;
    message += `📊 Win Probability: ${tender.win_probability ? (tender.win_probability * 100).toFixed(0) + '%' : 'TBD'}\n\n`;

    if (tender.manpower_count) {
      message += `👨‍💼 Required Manpower: ${tender.manpower_count} personnel\n`;
    }

    if (tender.contract_duration_months) {
      message += `⏱️  Contract Duration: ${tender.contract_duration_months} months\n`;
    }

    return message;
  }

  /**
   * Generate recommended actions based on tender analysis
   */
  generateRecommendedActions(tender) {
    const actions = [];

    // Basic actions for all tenders
    actions.push('Review tender documents thoroughly');
    actions.push('Assess internal capacity and capabilities');

    // Value-based actions
    if (tender.estimated_value && tender.estimated_value > 200000) {
      actions.push('Prepare detailed financial projections');
      actions.push('Consider partnership opportunities for large-scale delivery');
    }

    // Service-type specific actions
    if (tender.service_type === 'data_entry') {
      actions.push('Highlight data processing capabilities and accuracy metrics');
      actions.push('Prepare quality assurance documentation');
    } else if (tender.service_type === 'event_support') {
      actions.push('Showcase event management experience');
      actions.push('Prepare contingency planning documentation');
    } else if (tender.service_type === 'administrative') {
      actions.push('Emphasize administrative efficiency and technology integration');
    }

    // Timeline-based actions
    if (tender.closing_date) {
      const closingDate = new Date(tender.closing_date);
      const today = new Date();
      const daysToClose = Math.ceil((closingDate - today) / (1000 * 60 * 60 * 24));

      if (daysToClose <= 7) {
        actions.push('URGENT: Prioritize proposal preparation immediately');
        actions.push('Allocate dedicated team for rapid response');
      } else if (daysToClose <= 14) {
        actions.push('Begin proposal preparation this week');
        actions.push('Schedule site visits and clarification meetings');
      }
    }

    // Intelligence-based actions
    if (tender.intelligence_score > 70) {
      actions.push('Conduct competitive analysis');
      actions.push('Develop differentiation strategy');
    }

    return actions;
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert) {
    try {
      const recipients = this.alertRecipients[alert.priority] || [];

      if (recipients.length === 0) {
        return; // No recipients for this priority level
      }

      // Send email notifications
      if (this.config.notifications.email && this.emailTransporter) {
        await this.sendEmailAlert(alert, recipients);
      }

      // Send webhook notifications
      if (this.config.notifications.webhook) {
        await this.sendWebhookAlert(alert);
      }

      // Broadcast via WebSocket
      if (this.config.notifications.websocket) {
        await this.broadcastWebSocketAlert(alert);
      }

      // Send SMS for urgent alerts
      if (this.config.notifications.sms && alert.priority === 'urgent') {
        await this.sendSMSAlert(alert);
      }

      console.log(`📨 Alert sent: ${alert.title} (${alert.priority})`);

      // Update alert history
      const tenderKey = alert.tender?.tender_no || alert.tender?.title || alert.title;
      if (this.alertHistory.has(tenderKey)) {
        this.alertHistory.get(tenderKey).alerts_sent++;
      }

    } catch (error) {
      console.error('Failed to send alert:', error.message);
    }
  }

  /**
   * Send email alert
   */
  async sendEmailAlert(alert, recipients) {
    try {
      const subject = `[EPU/SER/19 ${alert.priority.toUpperCase()}] ${alert.title}`;

      let htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin: 0;">EPU/SER/19 Alert</h2>
            <p style="color: #6b7280; margin: 5px 0 0 0;">Priority: <span style="font-weight: bold; color: ${this.getPriorityColor(alert.priority)};">${alert.priority.toUpperCase()}</span></p>
          </div>

          <h3 style="color: #1f2937;">${alert.title}</h3>
          <p style="color: #374151; line-height: 1.6;">${alert.message.replace(/\n/g, '<br>')}</p>
      `;

      if (alert.tender) {
        htmlContent += `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937;">Tender Details</h4>
            <p><strong>Tender No:</strong> ${alert.tender.tender_no || 'TBD'}</p>
            <p><strong>Agency:</strong> ${alert.tender.agency || 'TBD'}</p>
            <p><strong>Estimated Value:</strong> $${alert.tender.estimated_value?.toLocaleString() || 'TBD'}</p>
            <p><strong>Closing Date:</strong> ${alert.tender.closing_date || 'TBD'}</p>
            <p><strong>Intelligence Score:</strong> ${alert.tender.intelligence_score || 0}/100</p>
          </div>
        `;
      }

      if (alert.recommended_actions && alert.recommended_actions.length > 0) {
        htmlContent += `
          <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937;">Recommended Actions</h4>
            <ul style="margin: 0; padding-left: 20px;">
              ${alert.recommended_actions.map(action => `<li style="margin: 5px 0;">${action}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      htmlContent += `
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
            <p>This is an automated alert from the WorkLink EPU/SER/19 Intelligence System.</p>
            <p>Alert generated at: ${new Date(alert.timestamp).toLocaleString()}</p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: process.env.SMTP_FROM || 'alerts@worklink.sg',
        to: recipients.join(', '),
        subject: subject,
        html: htmlContent
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`📧 Email alert sent to ${recipients.length} recipients`);

    } catch (error) {
      console.error('Failed to send email alert:', error.message);
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    try {
      const webhookUrl = process.env.EPU_WEBHOOK_URL;
      if (!webhookUrl) {
        return;
      }

      await axios.post(webhookUrl, {
        type: 'epu_ser_19_alert',
        alert: alert,
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000
      });

      console.log('🔗 Webhook alert sent');

    } catch (error) {
      console.error('Failed to send webhook alert:', error.message);
    }
  }

  /**
   * Broadcast alert via WebSocket
   */
  async broadcastWebSocketAlert(alert) {
    try {
      // Try to use existing WebSocket broadcaster
      let broadcastToAdmins;
      try {
        const { broadcast } = require('../../websocket');
        broadcastToAdmins = broadcast.broadcastToAdmins;
      } catch (error) {
        return; // WebSocket not available
      }

      broadcastToAdmins({
        type: 'epu_ser_19_alert',
        data: alert
      });

      console.log('🌐 WebSocket alert broadcasted');

    } catch (error) {
      console.error('Failed to broadcast WebSocket alert:', error.message);
    }
  }

  /**
   * Broadcast scan results
   */
  broadcastScanResults(results) {
    try {
      let broadcastToAdmins;
      try {
        const { broadcast } = require('../../websocket');
        broadcastToAdmins = broadcast.broadcastToAdmins;
      } catch (error) {
        return;
      }

      broadcastToAdmins({
        type: 'epu_scan_results',
        data: results
      });

    } catch (error) {
      console.error('Failed to broadcast scan results:', error.message);
    }
  }

  /**
   * Send SMS alert (placeholder - implement with SMS service)
   */
  async sendSMSAlert(alert) {
    console.log('📱 SMS alert would be sent:', alert.title);
    // Implement SMS service integration here
  }

  /**
   * Schedule daily market reports
   */
  scheduleMarketReports() {
    // Schedule market reports for 9 AM daily
    const scheduleTime = new Date();
    scheduleTime.setHours(9, 0, 0, 0);

    if (scheduleTime < new Date()) {
      scheduleTime.setDate(scheduleTime.getDate() + 1);
    }

    const msToSchedule = scheduleTime.getTime() - Date.now();

    setTimeout(() => {
      this.sendMarketReport();

      // Schedule daily
      setInterval(() => {
        this.sendMarketReport();
      }, 24 * 60 * 60 * 1000);
    }, msToSchedule);

    console.log(`📅 Daily market reports scheduled for ${scheduleTime.toLocaleString()}`);
  }

  /**
   * Generate and send daily market report
   */
  async sendMarketReport() {
    try {
      const report = this.monitor.generateMarketReport();

      const marketAlert = {
        type: 'daily_market_report',
        priority: 'medium',
        title: 'EPU/SER/19 Daily Market Report',
        message: this.formatMarketReportMessage(report),
        timestamp: new Date().toISOString(),
        report: report
      };

      await this.sendAlert(marketAlert);

    } catch (error) {
      console.error('Failed to send market report:', error.message);
    }
  }

  /**
   * Format market report for alert message
   */
  formatMarketReportMessage(report) {
    return `
Daily EPU/SER/19 Market Intelligence Report

📊 Market Overview:
• Active Opportunities: ${report.active_opportunities}
• Total Market Value: $${report.total_estimated_value.toLocaleString()}
• High Priority Alerts: ${report.high_priority_alerts.length}

🏢 Top Agencies:
${Object.entries(report.agency_breakdown).slice(0, 3).map(([agency, data]) =>
  `• ${agency}: ${data.count} tenders ($${data.estimated_value.toLocaleString()})`).join('\n')}

🔧 Service Types:
${Object.entries(report.service_type_breakdown).slice(0, 3).map(([type, data]) =>
  `• ${type}: ${data.count} opportunities`).join('\n')}

Generated at: ${new Date(report.generated_at).toLocaleString()}
    `.trim();
  }

  /**
   * Get priority color for styling
   */
  getPriorityColor(priority) {
    const colors = {
      urgent: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d'
    };
    return colors[priority] || '#6b7280';
  }

  /**
   * Get alert system statistics
   */
  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      scanInterval: this.config.scanInterval,
      alertHistorySize: this.alertHistory.size,
      configuredChannels: Object.entries(this.config.notifications)
        .filter(([key, value]) => value)
        .map(([key]) => key)
    };
  }
}

module.exports = EPUAlertSystem;