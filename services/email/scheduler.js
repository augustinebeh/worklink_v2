/**
 * Email Scheduler Service
 * Handles email queue processing, retries, and scheduled email tasks
 */

const cron = require('node-cron');
const EmailDeliveryTracker = require('./delivery-tracker');
const emailService = require('./index');
const { db } = require('../../db');

class EmailScheduler {
  constructor() {
    this.deliveryTracker = new EmailDeliveryTracker();
    this.isRunning = false;
    this.jobs = new Map();
  }

  /**
   * Start all email scheduling tasks
   */
  start() {
    if (this.isRunning) {
      console.log('Email scheduler is already running');
      return;
    }

    console.log('Starting email scheduler...');

    // Process failed emails every 5 minutes
    this.jobs.set('retry-failed', cron.schedule('*/5 * * * *', async () => {
      await this.processFailedEmails();
    }));

    // Clean old delivery records daily at 2 AM
    this.jobs.set('cleanup', cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldRecords();
    }));

    // Send daily reports at 8 AM
    this.jobs.set('daily-reports', cron.schedule('0 8 * * *', async () => {
      await this.sendDailyReports();
    }));

    // Send weekly reports on Monday at 9 AM
    this.jobs.set('weekly-reports', cron.schedule('0 9 * * 1', async () => {
      await this.sendWeeklyReports();
    }));

    // Health check every hour
    this.jobs.set('health-check', cron.schedule('0 * * * *', async () => {
      await this.performHealthCheck();
    }));

    this.isRunning = true;
    console.log('Email scheduler started with', this.jobs.size, 'scheduled tasks');
  }

  /**
   * Stop all email scheduling tasks
   */
  stop() {
    if (!this.isRunning) {
      console.log('Email scheduler is not running');
      return;
    }

    console.log('Stopping email scheduler...');

    for (const [name, job] of this.jobs) {
      job.destroy();
      console.log(`Stopped ${name} job`);
    }

    this.jobs.clear();
    this.isRunning = false;
    console.log('Email scheduler stopped');
  }

  /**
   * Process failed emails and retry them
   */
  async processFailedEmails() {
    try {
      console.log('Processing failed emails for retry...');

      const failedEmails = this.deliveryTracker.getEmailsForRetry();

      if (failedEmails.length === 0) {
        console.log('No failed emails to retry');
        return;
      }

      console.log(`Found ${failedEmails.length} failed emails to retry`);

      let retriedCount = 0;
      let permanentFailures = 0;

      for (const emailRecord of failedEmails) {
        try {
          // Check if we should retry based on failure reason and time since last attempt
          const shouldRetry = this.shouldRetryEmail(emailRecord);

          if (!shouldRetry) {
            continue;
          }

          // Reconstruct email data
          const emailData = {
            to: emailRecord.recipient_email,
            subject: emailRecord.subject,
            category: emailRecord.category,
            priority: emailRecord.priority,
            trackingId: emailRecord.tracking_id // Reuse existing tracking ID
          };

          // Add original metadata if available
          if (emailRecord.metadata) {
            try {
              emailData.templateData = JSON.parse(emailRecord.metadata);
            } catch (e) {
              console.warn('Failed to parse email metadata:', e);
            }
          }

          // Retry the email
          await emailService.sendEmail(emailData);
          retriedCount++;

          console.log(`Successfully retried email: ${emailRecord.tracking_id}`);

        } catch (error) {
          console.error(`Failed to retry email ${emailRecord.tracking_id}:`, error);

          // Check if this is a permanent failure
          if (emailRecord.attempt_count >= emailRecord.max_attempts) {
            this.deliveryTracker.markAsFailedPermanently(emailRecord.tracking_id, {
              error: error.message,
              totalAttempts: emailRecord.max_attempts
            });
            permanentFailures++;
          }
        }
      }

      console.log(`Email retry completed: ${retriedCount} retried, ${permanentFailures} permanent failures`);

    } catch (error) {
      console.error('Error processing failed emails:', error);
    }
  }

  /**
   * Check if an email should be retried
   */
  shouldRetryEmail(emailRecord) {
    // Don't retry if already at max attempts
    if (emailRecord.attempt_count >= emailRecord.max_attempts) {
      return false;
    }

    // Don't retry permanent failures
    if (emailRecord.status === 'failed_permanent') {
      return false;
    }

    // Calculate time since last attempt
    const lastAttemptTime = new Date(emailRecord.created_at);
    const timeSinceLastAttempt = Date.now() - lastAttemptTime.getTime();

    // Wait at least 5 minutes between retries
    const minRetryDelay = 5 * 60 * 1000; // 5 minutes
    if (timeSinceLastAttempt < minRetryDelay) {
      return false;
    }

    // Don't retry emails older than 24 hours
    const maxRetryAge = 24 * 60 * 60 * 1000; // 24 hours
    if (timeSinceLastAttempt > maxRetryAge) {
      return false;
    }

    return true;
  }

  /**
   * Clean up old delivery records
   */
  async cleanupOldRecords() {
    try {
      console.log('Cleaning up old email delivery records...');

      const result = this.deliveryTracker.cleanOldRecords(30); // Keep 30 days

      console.log(`Cleanup completed: ${result.deletedLogs} logs, ${result.deletedAttempts} attempts deleted`);
    } catch (error) {
      console.error('Error cleaning up old records:', error);
    }
  }

  /**
   * Send daily reports
   */
  async sendDailyReports() {
    try {
      console.log('Sending daily reports...');

      // Get report data
      const reportData = await this.generateDailyReport();

      // Get recipients who want daily reports
      const recipients = await this.getReportRecipients('daily_reports');

      if (recipients.length === 0) {
        console.log('No recipients configured for daily reports');
        return;
      }

      await emailService.sendReport('daily', reportData, recipients);

      console.log(`Daily reports sent to ${recipients.length} recipients`);
    } catch (error) {
      console.error('Error sending daily reports:', error);
    }
  }

  /**
   * Send weekly reports
   */
  async sendWeeklyReports() {
    try {
      console.log('Sending weekly reports...');

      // Get report data
      const reportData = await this.generateWeeklyReport();

      // Get recipients who want weekly reports
      const recipients = await this.getReportRecipients('weekly_reports');

      if (recipients.length === 0) {
        console.log('No recipients configured for weekly reports');
        return;
      }

      await emailService.sendReport('weekly', reportData, recipients);

      console.log(`Weekly reports sent to ${recipients.length} recipients`);
    } catch (error) {
      console.error('Error sending weekly reports:', error);
    }
  }

  /**
   * Generate daily report data
   */
  async generateDailyReport() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get candidate statistics
      const candidateStats = db.prepare(`
        SELECT COUNT(*) as new_candidates
        FROM candidates
        WHERE DATE(created_at) = ?
      `).get(today);

      // Get job statistics
      const jobStats = db.prepare(`
        SELECT
          COUNT(*) as jobs_posted,
          SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as jobs_filled
        FROM jobs
        WHERE DATE(created_at) = ?
      `).get(today);

      // Get deployment statistics
      const deploymentStats = db.prepare(`
        SELECT
          COUNT(*) as total_deployments,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_deployments,
          SUM(total_amount) as total_revenue
        FROM deployments
        WHERE DATE(start_date) = ?
      `).get(today);

      // Get email delivery statistics
      const emailStats = this.deliveryTracker.getDeliveryAnalytics('24h');

      return {
        date: today,
        candidates: {
          new: candidateStats.new_candidates || 0
        },
        jobs: {
          posted: jobStats.jobs_posted || 0,
          filled: jobStats.jobs_filled || 0
        },
        deployments: {
          total: deploymentStats.total_deployments || 0,
          completed: deploymentStats.completed_deployments || 0
        },
        revenue: deploymentStats.total_revenue || 0,
        email: {
          sent: emailStats?.overall?.total_emails || 0,
          delivered: emailStats?.overall?.delivered || 0,
          failed: emailStats?.overall?.failed || 0
        },
        highlights: {
          item1: `${jobStats.jobs_filled || 0} jobs successfully filled today`,
          item2: `${candidateStats.new_candidates || 0} new candidates registered`,
          item3: `${emailStats?.overall?.delivered || 0} email notifications delivered`
        }
      };
    } catch (error) {
      console.error('Error generating daily report:', error);
      return null;
    }
  }

  /**
   * Generate weekly report data
   */
  async generateWeeklyReport() {
    try {
      const now = new Date();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekOf = weekStart.toISOString().split('T')[0];

      // Get weekly statistics
      const candidateStats = db.prepare(`
        SELECT COUNT(*) as new_candidates
        FROM candidates
        WHERE created_at >= datetime(?)
      `).get(weekStart.toISOString());

      const jobStats = db.prepare(`
        SELECT
          COUNT(*) as jobs_posted,
          SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) as jobs_filled,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as jobs_completed
        FROM jobs
        WHERE created_at >= datetime(?)
      `).get(weekStart.toISOString());

      const deploymentStats = db.prepare(`
        SELECT
          COUNT(*) as total_deployments,
          SUM(total_amount) as total_revenue
        FROM deployments
        WHERE start_date >= datetime(?)
      `).get(weekStart.toISOString());

      const emailStats = this.deliveryTracker.getDeliveryAnalytics('7d');

      return {
        weekOf,
        candidates: {
          total: candidateStats.new_candidates || 0
        },
        jobs: {
          posted: jobStats.jobs_posted || 0,
          filled: jobStats.jobs_filled || 0,
          completed: jobStats.jobs_completed || 0
        },
        deployments: {
          total: deploymentStats.total_deployments || 0
        },
        revenue: deploymentStats.total_revenue || 0,
        email: {
          sent: emailStats?.overall?.total_emails || 0,
          delivered: emailStats?.overall?.delivered || 0,
          successRate: emailStats?.overall?.total_emails > 0 ?
            Math.round((emailStats.overall.delivered / emailStats.overall.total_emails) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error generating weekly report:', error);
      return null;
    }
  }

  /**
   * Get recipients for reports based on their preferences
   */
  async getReportRecipients(reportType) {
    try {
      const recipients = db.prepare(`
        SELECT email, user_type
        FROM email_preferences
        WHERE ${reportType} = 1
      `).all();

      return recipients.map(r => ({
        email: r.email,
        name: r.user_type === 'admin' ? 'Admin User' : 'User'
      }));
    } catch (error) {
      console.error('Error getting report recipients:', error);
      return [];
    }
  }

  /**
   * Perform email service health check
   */
  async performHealthCheck() {
    try {
      if (!emailService.isInitialized) {
        console.warn('Email service is not initialized');
        return;
      }

      // Check delivery statistics for anomalies
      const stats = this.deliveryTracker.getDeliveryAnalytics('1h');

      if (stats && stats.overall) {
        const failureRate = stats.overall.total_emails > 0 ?
          (stats.overall.failed / stats.overall.total_emails) * 100 : 0;

        if (failureRate > 50) {
          console.warn(`High email failure rate detected: ${failureRate.toFixed(2)}%`);
          // Could send alert email to admin here
        }

        if (stats.overall.pending > 100) {
          console.warn(`High number of pending emails: ${stats.overall.pending}`);
        }
      }

      console.log('Email service health check completed');
    } catch (error) {
      console.error('Error during email service health check:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  /**
   * Add custom scheduled email job
   */
  addCustomJob(name, cronExpression, callback) {
    if (this.jobs.has(name)) {
      throw new Error(`Job '${name}' already exists`);
    }

    const job = cron.schedule(cronExpression, callback, { scheduled: false });
    this.jobs.set(name, job);

    if (this.isRunning) {
      job.start();
    }

    console.log(`Added custom email job: ${name} (${cronExpression})`);
    return job;
  }

  /**
   * Remove custom job
   */
  removeCustomJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      job.destroy();
      this.jobs.delete(name);
      console.log(`Removed custom email job: ${name}`);
      return true;
    }
    return false;
  }
}

// Create singleton instance
const emailScheduler = new EmailScheduler();

module.exports = emailScheduler;