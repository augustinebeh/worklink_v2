/**
 * GeBIZ RSS Scraping Orchestrator
 * Main service that coordinates RSS parsing, data validation, and lifecycle management
 * Features: Comprehensive logging, error handling, notification system
 */

const GeBIZRSSParser = require('./gebizRssParser');
const DataLifecycleManager = require('./dataLifecycleManager');
const { db } = require('../../db/database');
const nodemailer = require('nodemailer');

class GeBIZRSSOrchestrator {
  constructor() {
    this.parser = new GeBIZRSSParser();
    this.lifecycleManager = new DataLifecycleManager();
    this.isRunning = false;
    this.lastRun = null;
    this.runHistory = [];

    // Email configuration for admin notifications
    this.emailConfig = {
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      adminEmails: (process.env.ADMIN_EMAILS || 'admin@worklink.sg').split(',')
    };

    this.transporter = null;
    this.initializeEmailTransporter();
  }

  /**
   * Initialize email transporter for notifications
   */
  async initializeEmailTransporter() {
    if (!this.emailConfig.enabled || !this.emailConfig.auth.user) {
      console.log('📧 Email notifications disabled (missing configuration)');
      return;
    }

    try {
      this.transporter = nodemailer.createTransporter({
        host: this.emailConfig.host,
        port: this.emailConfig.port,
        secure: this.emailConfig.secure,
        auth: this.emailConfig.auth
      });

      // Verify connection
      await this.transporter.verify();
      console.log('📧 Email transporter initialized successfully');
    } catch (error) {
      console.error('📧 Failed to initialize email transporter:', error.message);
      this.transporter = null;
    }
  }

  /**
   * Main orchestration method - runs the complete RSS scraping pipeline
   * @param {Object} options Scraping options
   * @returns {Object} Comprehensive results
   */
  async runCompleteScrapingPipeline(options = {}) {
    if (this.isRunning) {
      throw new Error('RSS scraping pipeline is already running');
    }

    const runId = `RUN-${Date.now()}`;
    const startTime = Date.now();

    console.log(`🚀 Starting RSS scraping pipeline (${runId})`);

    this.isRunning = true;

    try {
      // Log the start of the run
      const runLogId = await this.logScrapingJobStart(runId);

      const pipelineResult = {
        runId,
        startTime: new Date().toISOString(),
        endTime: null,
        duration: null,
        success: false,
        stages: {
          parsing: null,
          lifecycle: null,
          notifications: null
        },
        summary: {
          totalParsed: 0,
          newTenders: 0,
          duplicates: 0,
          errors: 0,
          lifecycleCardsCreated: 0
        },
        errors: []
      };

      // Stage 1: Parse RSS Feed
      console.log('📡 Stage 1: Parsing RSS Feed...');
      try {
        const parsingResult = await this.parser.parseRSSFeed();
        pipelineResult.stages.parsing = parsingResult;

        pipelineResult.summary.totalParsed = parsingResult.feedMetadata?.totalItems || 0;
        pipelineResult.summary.newTenders = parsingResult.newTenders;
        pipelineResult.summary.duplicates = parsingResult.duplicates;
        pipelineResult.summary.errors += parsingResult.errors;

        console.log(`✅ Parsing complete: ${parsingResult.newTenders} new tenders found`);

      } catch (error) {
        pipelineResult.errors.push(`Parsing stage failed: ${error.message}`);
        pipelineResult.stages.parsing = { success: false, error: error.message };
        throw error;
      }

      // Stage 2: Create Lifecycle Cards
      if (pipelineResult.stages.parsing.validatedTenders?.length > 0) {
        console.log('📝 Stage 2: Creating Lifecycle Cards...');
        try {
          const lifecycleResult = await this.lifecycleManager.createLifecycleCards(
            pipelineResult.stages.parsing.validatedTenders
          );
          pipelineResult.stages.lifecycle = lifecycleResult;
          pipelineResult.summary.lifecycleCardsCreated = lifecycleResult.created;
          pipelineResult.summary.errors += lifecycleResult.errors;

          console.log(`✅ Lifecycle creation complete: ${lifecycleResult.created} cards created`);

        } catch (error) {
          pipelineResult.errors.push(`Lifecycle stage failed: ${error.message}`);
          pipelineResult.stages.lifecycle = { success: false, error: error.message };
          throw error;
        }
      } else {
        console.log('⏭️  No new tenders to process for lifecycle creation');
        pipelineResult.stages.lifecycle = {
          success: true,
          message: 'No new tenders to process',
          created: 0,
          skipped: 0,
          errors: 0
        };
      }

      // Stage 3: Send Notifications
      console.log('📧 Stage 3: Sending Notifications...');
      try {
        const notificationResult = await this.sendNotifications(pipelineResult);
        pipelineResult.stages.notifications = notificationResult;

      } catch (error) {
        pipelineResult.errors.push(`Notification stage failed: ${error.message}`);
        pipelineResult.stages.notifications = { success: false, error: error.message };
        // Don't throw here - notifications are not critical
      }

      // Calculate final results
      const endTime = Date.now();
      pipelineResult.endTime = new Date().toISOString();
      pipelineResult.duration = endTime - startTime;
      pipelineResult.success = pipelineResult.errors.length === 0;

      // Log the completion
      await this.logScrapingJobComplete(runLogId, pipelineResult);

      // Store in run history
      this.runHistory.unshift(pipelineResult);
      if (this.runHistory.length > 50) {
        this.runHistory = this.runHistory.slice(0, 50); // Keep last 50 runs
      }

      this.lastRun = pipelineResult;

      console.log(`🏁 Pipeline complete (${pipelineResult.duration}ms): ${pipelineResult.summary.newTenders} new tenders processed`);

      return pipelineResult;

    } catch (error) {
      console.error('❌ Pipeline failed:', error.message);

      // Send failure notification
      if (this.transporter) {
        await this.sendFailureNotification(error, runId);
      }

      throw error;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send notifications about scraping results
   * @param {Object} pipelineResult Pipeline execution results
   * @returns {Object} Notification results
   */
  async sendNotifications(pipelineResult) {
    const notificationResult = {
      emailSent: false,
      adminNotified: false,
      highPriorityAlerts: 0,
      errors: []
    };

    try {
      // Check if there are high-priority tenders to notify about
      const highPriorityTenders = pipelineResult.stages.parsing?.validatedTenders?.filter(
        tender => tender.priority === 'critical' || tender.priority === 'high'
      ) || [];

      notificationResult.highPriorityAlerts = highPriorityTenders.length;

      // Send email notification if enabled and there are results worth reporting
      if (this.transporter && (pipelineResult.summary.newTenders > 0 || pipelineResult.errors.length > 0)) {
        await this.sendSummaryEmail(pipelineResult, highPriorityTenders);
        notificationResult.emailSent = true;
      }

      // Create in-app alerts for high-priority tenders
      if (highPriorityTenders.length > 0) {
        await this.createInAppAlerts(highPriorityTenders);
        notificationResult.adminNotified = true;
      }

      notificationResult.success = true;

    } catch (error) {
      notificationResult.errors.push(error.message);
      notificationResult.success = false;
      console.error('Notification error:', error.message);
    }

    return notificationResult;
  }

  /**
   * Send summary email to administrators
   * @param {Object} pipelineResult Pipeline results
   * @param {Array} highPriorityTenders High priority tenders
   */
  async sendSummaryEmail(pipelineResult, highPriorityTenders) {
    const subject = `GeBIZ RSS Scraper Report - ${pipelineResult.summary.newTenders} New Tenders`;

    const html = this.generateEmailHTML(pipelineResult, highPriorityTenders);

    const mailOptions = {
      from: `"WorkLink GeBIZ Monitor" <${this.emailConfig.auth.user}>`,
      to: this.emailConfig.adminEmails.join(', '),
      subject: subject,
      html: html
    };

    await this.transporter.sendMail(mailOptions);
    console.log('📧 Summary email sent to administrators');
  }

  /**
   * Generate HTML email content
   * @param {Object} pipelineResult Pipeline results
   * @param {Array} highPriorityTenders High priority tenders
   * @returns {string} HTML content
   */
  generateEmailHTML(pipelineResult, highPriorityTenders) {
    const { summary, duration, endTime } = pipelineResult;

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .summary { background: #ecf0f1; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .stat { display: inline-block; margin: 10px 15px 10px 0; }
        .stat-value { font-size: 24px; font-weight: bold; color: #3498db; }
        .stat-label { font-size: 14px; color: #7f8c8d; }
        .high-priority { background: #e74c3c; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .tender-item { background: white; border-left: 4px solid #3498db; padding: 10px; margin: 10px 0; }
        .footer { font-size: 12px; color: #7f8c8d; margin-top: 30px; }
        .error { background: #e74c3c; color: white; padding: 10px; border-radius: 3px; margin: 5px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎯 GeBIZ RSS Scraper Report</h1>
        <p>Automated scraping completed at ${new Date(endTime).toLocaleString()}</p>
      </div>

      <div class="summary">
        <h2>📊 Summary Statistics</h2>
        <div class="stat">
          <div class="stat-value">${summary.totalParsed}</div>
          <div class="stat-label">Total Parsed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.newTenders}</div>
          <div class="stat-label">New Tenders</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.duplicates}</div>
          <div class="stat-label">Duplicates Skipped</div>
        </div>
        <div class="stat">
          <div class="stat-value">${summary.errors}</div>
          <div class="stat-label">Errors</div>
        </div>
        <div class="stat">
          <div class="stat-value">${(duration / 1000).toFixed(1)}s</div>
          <div class="stat-label">Processing Time</div>
        </div>
      </div>
    `;

    if (highPriorityTenders.length > 0) {
      html += `
      <div class="high-priority">
        <h2>🚨 High Priority Tenders (${highPriorityTenders.length})</h2>
        ${highPriorityTenders.map(tender => `
          <div class="tender-item">
            <h3>${tender.title}</h3>
            <p><strong>Agency:</strong> ${tender.agency} | <strong>Priority:</strong> ${tender.priority}</p>
            <p><strong>Closing Date:</strong> ${tender.closing_date || 'TBC'}</p>
            <p><strong>Category:</strong> ${tender.category}</p>
            ${tender.source_url ? `<p><a href="${tender.source_url}">View Tender Details</a></p>` : ''}
          </div>
        `).join('')}
      </div>
      `;
    }

    if (pipelineResult.errors.length > 0) {
      html += `
      <h2>❌ Errors Encountered</h2>
      ${pipelineResult.errors.map(error => `<div class="error">${error}</div>`).join('')}
      `;
    }

    html += `
      <div class="footer">
        <p>This is an automated report from the WorkLink GeBIZ RSS Monitoring System.</p>
        <p>Next scheduled run: Every 6 hours (00:00, 06:00, 12:00, 18:00 SGT)</p>
      </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Create in-app alerts for high-priority tenders
   * @param {Array} highPriorityTenders High priority tenders
   */
  async createInAppAlerts(highPriorityTenders) {
    for (const tender of highPriorityTenders) {
      try {
        const alertData = {
          alert_type: 'new_tender',
          title: `High Priority Tender: ${tender.title}`,
          description: `New ${tender.priority} priority tender from ${tender.agency}`,
          source_table: 'bpo_tender_lifecycle',
          source_id: null, // Will be populated after lifecycle card creation
          priority: tender.priority,
          status: 'pending',
          url: tender.source_url,
          metadata: JSON.stringify({
            tender_no: tender.tender_no,
            agency: tender.agency,
            category: tender.category,
            closing_date: tender.closing_date,
            estimated_value: tender.estimated_value || null
          }),
          created_at: new Date().toISOString()
        };

        // Insert alert (assuming scraping_alerts table exists from GeBIZ schema)
        const insertAlertQuery = `
          INSERT INTO scraping_alerts (
            alert_type, title, description, source_table, source_id,
            priority, status, url, metadata, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const stmt = db.prepare(insertAlertQuery);
        stmt.run(
          alertData.alert_type, alertData.title, alertData.description,
          alertData.source_table, alertData.source_id, alertData.priority,
          alertData.status, alertData.url, alertData.metadata, alertData.created_at
        );

      } catch (error) {
        console.error(`Failed to create alert for tender ${tender.tender_no}:`, error.message);
      }
    }
  }

  /**
   * Send failure notification email
   * @param {Error} error The error that occurred
   * @param {string} runId Run identifier
   */
  async sendFailureNotification(error, runId) {
    if (!this.transporter) return;

    try {
      const mailOptions = {
        from: `"WorkLink GeBIZ Monitor" <${this.emailConfig.auth.user}>`,
        to: this.emailConfig.adminEmails.join(', '),
        subject: '🚨 GeBIZ RSS Scraper Failed',
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="background: #e74c3c; color: white; padding: 20px; border-radius: 5px;">
            <h1>🚨 GeBIZ RSS Scraper Failure Alert</h1>
            <p>The automated scraping process failed at ${new Date().toLocaleString()}</p>
          </div>

          <div style="padding: 20px;">
            <h2>Error Details</h2>
            <p><strong>Run ID:</strong> ${runId}</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Stack Trace:</strong></p>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto;">${error.stack}</pre>
          </div>

          <div style="background: #f8f9fa; padding: 15px; margin-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              Please check the system logs and resolve the issue as soon as possible.
              The next scheduled run is in 6 hours.
            </p>
          </div>
        </body>
        </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('📧 Failure notification sent');

    } catch (emailError) {
      console.error('Failed to send failure notification:', emailError.message);
    }
  }

  /**
   * Log scraping job start
   * @param {string} runId Run identifier
   * @returns {number} Log entry ID
   */
  async logScrapingJobStart(runId) {
    try {
      const stmt = db.prepare(`
        INSERT INTO scraping_jobs_log (
          job_type, status, started_at, created_at
        ) VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(
        'gebiz_rss',
        'running',
        new Date().toISOString(),
        new Date().toISOString()
      );

      return result.lastInsertRowid;
    } catch (error) {
      console.error('Failed to log job start:', error.message);
      return null;
    }
  }

  /**
   * Log scraping job completion
   * @param {number} logId Log entry ID
   * @param {Object} pipelineResult Pipeline results
   */
  async logScrapingJobComplete(logId, pipelineResult) {
    if (!logId) return;

    try {
      const stmt = db.prepare(`
        UPDATE scraping_jobs_log SET
          status = ?,
          records_processed = ?,
          records_new = ?,
          records_updated = ?,
          errors = ?,
          duration_seconds = ?,
          completed_at = ?
        WHERE id = ?
      `);

      stmt.run(
        pipelineResult.success ? 'completed' : 'failed',
        pipelineResult.summary.totalParsed,
        pipelineResult.summary.newTenders,
        0, // No updates in RSS scraping
        JSON.stringify(pipelineResult.errors),
        Math.round(pipelineResult.duration / 1000),
        new Date().toISOString(),
        logId
      );

    } catch (error) {
      console.error('Failed to log job completion:', error.message);
    }
  }

  /**
   * Get orchestrator statistics and status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      totalRuns: this.runHistory.length,
      recentRuns: this.runHistory.slice(0, 5),
      parserStats: this.parser.getStats(),
      emailConfigured: !!this.transporter,
      nextScheduledRun: this.getNextScheduledRun()
    };
  }

  /**
   * Get next scheduled run time
   * @returns {string} Next run time
   */
  getNextScheduledRun() {
    const now = new Date();
    const scheduleHours = [0, 6, 12, 18]; // SGT hours
    const currentHour = now.getHours();

    // Find next scheduled hour
    const nextHour = scheduleHours.find(hour => hour > currentHour) || scheduleHours[0];

    const nextRun = new Date(now);
    if (nextHour <= currentHour) {
      // Next run is tomorrow
      nextRun.setDate(nextRun.getDate() + 1);
    }
    nextRun.setHours(nextHour, 0, 0, 0);

    return nextRun.toISOString();
  }

  /**
   * Manual trigger for scraping (for testing/admin use)
   * @param {Object} options Scraping options
   * @returns {Object} Results
   */
  async manualTrigger(options = {}) {
    console.log('🔧 Manual scraping trigger activated');
    return this.runCompleteScrapingPipeline({ ...options, manual: true });
  }
}

module.exports = GeBIZRSSOrchestrator;