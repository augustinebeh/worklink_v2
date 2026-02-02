/**
 * Email Service
 * Comprehensive email notification system with multiple providers and retry logic
 */

const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const { db } = require('../../db');
const { getEmailConfig } = require('../../config/email');
const EmailTemplates = require('./templates');
const EmailDeliveryTracker = require('./delivery-tracker');

class EmailService {
  constructor() {
    this.config = null;
    this.transporter = null;
    this.templates = new EmailTemplates();
    this.deliveryTracker = new EmailDeliveryTracker();
    this.isInitialized = false;
  }

  /**
   * Initialize email service with current configuration
   */
  async initialize() {
    try {
      this.config = getEmailConfig();
      await this.setupProvider();
      this.isInitialized = true;
      console.log(`Email service initialized with provider: ${this.config.provider}`);
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      throw error;
    }
  }

  /**
   * Setup email provider based on configuration
   */
  async setupProvider() {
    switch (this.config.provider) {
      case 'smtp':
        this.transporter = nodemailer.createTransporter(this.config.smtp);
        break;

      case 'sendgrid':
        sgMail.setApiKey(this.config.sendgrid.apiKey);
        break;

      case 'mailgun':
        // Mailgun implementation would go here
        throw new Error('Mailgun provider not implemented yet');

      case 'ses':
        // AWS SES implementation would go here
        throw new Error('AWS SES provider not implemented yet');

      default:
        throw new Error(`Unsupported email provider: ${this.config.provider}`);
    }

    // Test the connection for SMTP
    if (this.config.provider === 'smtp' && this.transporter) {
      await this.transporter.verify();
    }
  }

  /**
   * Send email with retry logic and delivery tracking
   */
  async sendEmail(emailData) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      to,
      subject,
      text,
      html,
      template,
      templateData,
      priority = 'normal',
      category = 'general'
    } = emailData;

    // Validate input
    this.validateEmailData(emailData);

    // Check rate limits
    await this.checkRateLimit();

    // Create delivery tracking record
    const trackingId = this.deliveryTracker.createDeliveryRecord({
      to,
      subject,
      category,
      priority
    });

    let finalHtml = html;
    let finalText = text;

    // Process template if specified
    if (template) {
      const templateResult = await this.templates.render(template, templateData);
      finalHtml = templateResult.html;
      finalText = templateResult.text;
    }

    // Prepare email message
    const message = {
      from: {
        name: this.config.from.name,
        address: this.config.from.email
      },
      to,
      subject,
      text: finalText,
      html: finalHtml,
      headers: {
        'X-WorkLink-Tracking-ID': trackingId,
        'X-WorkLink-Category': category,
        'X-WorkLink-Priority': priority
      }
    };

    // Send with retry logic
    return await this.sendWithRetry(message, trackingId);
  }

  /**
   * Send email with retry mechanism
   */
  async sendWithRetry(message, trackingId) {
    const maxAttempts = this.config.retry.attempts;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Sending email attempt ${attempt}/${maxAttempts} for tracking ID: ${trackingId}`);

        const result = await this.sendEmailViaProvider(message);

        // Update delivery tracking
        this.deliveryTracker.markAsDelivered(trackingId, {
          messageId: result.messageId,
          attempt,
          provider: this.config.provider
        });

        console.log(`Email sent successfully on attempt ${attempt}. Message ID: ${result.messageId}`);

        return {
          success: true,
          messageId: result.messageId,
          trackingId,
          attempt
        };

      } catch (error) {
        lastError = error;
        console.error(`Email send attempt ${attempt} failed:`, error.message);

        // Update delivery tracking
        this.deliveryTracker.markAsFailed(trackingId, {
          error: error.message,
          attempt
        });

        // Don't retry on permanent failures
        if (this.isPermanentFailure(error)) {
          break;
        }

        // Wait before retrying (with exponential backoff)
        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    // Mark as permanently failed
    this.deliveryTracker.markAsFailedPermanently(trackingId, {
      error: lastError.message,
      totalAttempts: maxAttempts
    });

    throw new Error(`Email failed to send after ${maxAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Send email via the configured provider
   */
  async sendEmailViaProvider(message) {
    switch (this.config.provider) {
      case 'smtp':
        return await this.transporter.sendMail(message);

      case 'sendgrid':
        const sgMessage = {
          to: message.to,
          from: message.from,
          subject: message.subject,
          text: message.text,
          html: message.html
        };
        const [response] = await sgMail.send(sgMessage);
        return {
          messageId: response.headers['x-message-id'] || `sg_${Date.now()}`
        };

      default:
        throw new Error(`Provider ${this.config.provider} not implemented`);
    }
  }

  /**
   * Send tender alert email
   */
  async sendTenderAlert(alert, tenderData) {
    const recipients = await this.getTenderAlertRecipients(alert);

    const emailPromises = recipients.map(recipient =>
      this.sendEmail({
        to: recipient.email,
        template: 'tender-alert',
        templateData: {
          recipientName: recipient.name,
          alert,
          tender: tenderData,
          alertUrl: `${process.env.FRONTEND_URL}/admin/tender-monitor/alerts/${alert.id}`,
          tenderUrl: tenderData.external_url
        },
        category: 'tender-alert',
        priority: this.getTenderPriority(tenderData)
      })
    );

    return await Promise.allSettled(emailPromises);
  }

  /**
   * Send candidate update notification
   */
  async sendCandidateUpdate(candidate, updateType, data = {}) {
    const adminUsers = await this.getAdminUsers();

    const emailPromises = adminUsers.map(admin =>
      this.sendEmail({
        to: admin.email,
        template: 'candidate-update',
        templateData: {
          adminName: admin.name,
          candidate,
          updateType,
          data,
          candidateUrl: `${process.env.FRONTEND_URL}/admin/candidates/${candidate.id}`
        },
        category: 'candidate-update',
        priority: 'normal'
      })
    );

    return await Promise.allSettled(emailPromises);
  }

  /**
   * Send automated report
   */
  async sendReport(reportType, reportData, recipients) {
    const emailPromises = recipients.map(recipient =>
      this.sendEmail({
        to: recipient.email,
        template: `report-${reportType}`,
        templateData: {
          recipientName: recipient.name,
          reportData,
          generatedAt: new Date().toISOString(),
          reportUrl: reportData.downloadUrl
        },
        category: 'report',
        priority: 'low'
      })
    );

    return await Promise.allSettled(emailPromises);
  }

  /**
   * Send test email
   */
  async sendTestEmail(options) {
    return await this.sendEmail({
      to: options.to,
      subject: options.subject || 'WorkLink Email Service Test',
      text: options.text || 'This is a test email from WorkLink email service.',
      html: options.html || '<p>This is a test email from WorkLink email service.</p>',
      category: 'test',
      priority: 'normal'
    });
  }

  /**
   * Validate email data
   */
  validateEmailData(emailData) {
    if (!emailData.to) {
      throw new Error('Recipient email is required');
    }

    if (!emailData.subject && !emailData.template) {
      throw new Error('Subject or template is required');
    }

    if (!emailData.text && !emailData.html && !emailData.template) {
      throw new Error('Email content (text, html, or template) is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to];

    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }
  }

  /**
   * Check rate limits
   */
  async checkRateLimit() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const hourlyCount = db.prepare(`
      SELECT COUNT(*) as count FROM email_delivery_log
      WHERE created_at >= datetime(?)
    `).get(hourAgo.toISOString()).count;

    const dailyCount = db.prepare(`
      SELECT COUNT(*) as count FROM email_delivery_log
      WHERE created_at >= datetime(?)
    `).get(dayAgo.toISOString()).count;

    if (hourlyCount >= this.config.rateLimit.maxPerHour) {
      throw new Error('Hourly email rate limit exceeded');
    }

    if (dailyCount >= this.config.rateLimit.maxPerDay) {
      throw new Error('Daily email rate limit exceeded');
    }
  }

  /**
   * Check if error is permanent (shouldn't retry)
   */
  isPermanentFailure(error) {
    const permanentErrors = [
      'Invalid email address',
      'Recipient rejected',
      'Domain not found',
      'Authentication failed',
      'Invalid API key'
    ];

    return permanentErrors.some(msg => error.message.includes(msg));
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    const baseDelay = this.config.retry.delay;

    if (this.config.retry.backoff === 'exponential') {
      return baseDelay * Math.pow(2, attempt - 1);
    } else {
      return baseDelay * attempt;
    }
  }

  /**
   * Get tender alert recipients
   */
  async getTenderAlertRecipients(alert) {
    // For now, return admin users
    // In the future, this could be configurable per alert
    return await this.getAdminUsers();
  }

  /**
   * Get admin users for notifications
   */
  async getAdminUsers() {
    // This would query your admin users table
    // For now, return a default admin
    return [
      {
        email: process.env.ADMIN_EMAIL || 'admin@worklink.sg',
        name: 'WorkLink Admin'
      }
    ];
  }

  /**
   * Determine tender priority based on tender data
   */
  getTenderPriority(tenderData) {
    // High priority for high-value tenders or urgent deadlines
    if (tenderData.estimated_value > 100000) return 'high';

    const closingDate = new Date(tenderData.closing_date);
    const daysUntilClosing = (closingDate - new Date()) / (1000 * 60 * 60 * 24);

    if (daysUntilClosing <= 3) return 'high';
    if (daysUntilClosing <= 7) return 'medium';

    return 'normal';
  }

  /**
   * Sleep helper function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;