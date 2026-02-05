/**
 * GeBIZ RSS Scraper Scheduler
 * Handles cron-based scheduling of RSS scraping
 * Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00 SGT)
 */

const cron = require('node-cron');
const GeBIZRSSOrchestrator = require('./gebizRssOrchestrator');

class GeBIZRSSScheduler {
  constructor() {
    this.orchestrator = new GeBIZRSSOrchestrator();
    this.scheduledJob = null;
    this.isEnabled = true;
    this.timezone = 'Asia/Singapore';

    // Schedule: Every 6 hours at 00:00, 06:00, 12:00, 18:00 SGT
    this.cronExpression = '0 0,6,12,18 * * *';

    this.stats = {
      jobsScheduled: 0,
      jobsExecuted: 0,
      jobsCompleted: 0,
      jobsFailed: 0,
      lastExecution: null,
      nextExecution: null,
      averageExecutionTime: 0,
      totalExecutionTime: 0
    };

    console.log('📅 GeBIZ RSS Scheduler initialized');
    console.log(`⏰ Schedule: Every 6 hours (00:00, 06:00, 12:00, 18:00 ${this.timezone})`);
  }

  /**
   * Start the scheduled job
   */
  start() {
    if (this.scheduledJob) {
      console.log('⚠️  Scheduler already running');
      return false;
    }

    try {
      this.scheduledJob = cron.schedule(this.cronExpression,
        () => this.executeScheduledScraping(),
        {
          scheduled: true,
          timezone: this.timezone,
          name: 'gebiz-rss-scraper'
        }
      );

      this.isEnabled = true;
      this.updateNextExecutionTime();

      console.log('✅ GeBIZ RSS Scheduler started successfully');
      console.log(`📅 Next execution: ${this.stats.nextExecution}`);

      return true;
    } catch (error) {
      console.error('❌ Failed to start scheduler:', error.message);
      return false;
    }
  }

  /**
   * Stop the scheduled job
   */
  stop() {
    if (!this.scheduledJob) {
      console.log('⚠️  Scheduler not running');
      return false;
    }

    try {
      this.scheduledJob.stop();
      this.scheduledJob.destroy();
      this.scheduledJob = null;
      this.isEnabled = false;

      console.log('🛑 GeBIZ RSS Scheduler stopped');
      return true;
    } catch (error) {
      console.error('❌ Failed to stop scheduler:', error.message);
      return false;
    }
  }

  /**
   * Restart the scheduler
   */
  restart() {
    console.log('🔄 Restarting GeBIZ RSS Scheduler...');
    this.stop();
    setTimeout(() => this.start(), 1000);
    return true;
  }

  /**
   * Execute the scheduled scraping job
   */
  async executeScheduledScraping() {
    const executionId = `SCHED-${Date.now()}`;
    const startTime = Date.now();

    console.log(`🕐 Scheduled scraping execution started (${executionId})`);
    console.log(`📅 Execution time: ${new Date().toLocaleString('en-SG', { timeZone: this.timezone })}`);

    this.stats.jobsExecuted++;

    try {
      // Check if orchestrator is available and not already running
      if (this.orchestrator.isRunning) {
        console.log('⚠️  Previous scraping job still running, skipping this execution');
        return {
          skipped: true,
          reason: 'Previous job still running',
          executionId
        };
      }

      // Execute the scraping pipeline
      const result = await this.orchestrator.runCompleteScrapingPipeline({
        scheduled: true,
        executionId
      });

      // Update statistics
      const executionTime = Date.now() - startTime;
      this.updateExecutionStats(executionTime, true);

      console.log(`✅ Scheduled scraping completed successfully (${executionTime}ms)`);
      console.log(`📊 Results: ${result.summary.newTenders} new tenders, ${result.summary.duplicates} duplicates`);

      return {
        success: true,
        executionId,
        executionTime,
        result
      };

    } catch (error) {
      // Update statistics
      const executionTime = Date.now() - startTime;
      this.updateExecutionStats(executionTime, false);

      console.error(`❌ Scheduled scraping failed (${executionId}): ${error.message}`);

      // Log the error for monitoring
      await this.logSchedulerError(executionId, error);

      return {
        success: false,
        executionId,
        executionTime,
        error: error.message
      };

    } finally {
      // Update next execution time
      this.updateNextExecutionTime();
    }
  }

  /**
   * Update execution statistics
   * @param {number} executionTime Execution time in milliseconds
   * @param {boolean} success Whether execution was successful
   */
  updateExecutionStats(executionTime, success) {
    this.stats.lastExecution = new Date().toISOString();
    this.stats.totalExecutionTime += executionTime;

    if (success) {
      this.stats.jobsCompleted++;
    } else {
      this.stats.jobsFailed++;
    }

    // Calculate average execution time
    const totalJobs = this.stats.jobsCompleted + this.stats.jobsFailed;
    if (totalJobs > 0) {
      this.stats.averageExecutionTime = Math.round(this.stats.totalExecutionTime / totalJobs);
    }
  }

  /**
   * Update next execution time
   */
  updateNextExecutionTime() {
    if (!this.scheduledJob) {
      this.stats.nextExecution = null;
      return;
    }

    try {
      // Calculate next execution based on cron schedule
      const now = new Date();
      const scheduleHours = [0, 6, 12, 18];
      const currentHour = now.getHours();

      // Find next scheduled hour
      let nextHour = scheduleHours.find(hour => hour > currentHour);

      const nextExecution = new Date(now);
      if (nextHour === undefined) {
        // Next run is tomorrow at 00:00
        nextExecution.setDate(nextExecution.getDate() + 1);
        nextExecution.setHours(0, 0, 0, 0);
      } else {
        nextExecution.setHours(nextHour, 0, 0, 0);
      }

      this.stats.nextExecution = nextExecution.toISOString();

    } catch (error) {
      console.error('Error calculating next execution time:', error.message);
      this.stats.nextExecution = 'Error calculating';
    }
  }

  /**
   * Log scheduler error for monitoring
   * @param {string} executionId Execution identifier
   * @param {Error} error The error that occurred
   */
  async logSchedulerError(executionId, error) {
    try {
      // This would typically log to a monitoring system or database
      const errorLog = {
        timestamp: new Date().toISOString(),
        executionId,
        component: 'gebiz-rss-scheduler',
        error: error.message,
        stack: error.stack,
        stats: this.getStats()
      };

      // For now, just log to console (could be extended to write to database or external service)
      console.error('📝 Scheduler Error Log:', JSON.stringify(errorLog, null, 2));

      // Could also send to external monitoring service here
      // await this.sendToMonitoringService(errorLog);

    } catch (logError) {
      console.error('Failed to log scheduler error:', logError.message);
    }
  }

  /**
   * Get scheduler status and statistics
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      isRunning: !!this.scheduledJob,
      isEnabled: this.isEnabled,
      cronExpression: this.cronExpression,
      timezone: this.timezone,
      ...this.stats,
      orchestratorStatus: this.orchestrator.getStatus(),
      systemTime: new Date().toISOString(),
      localTime: new Date().toLocaleString('en-SG', { timeZone: this.timezone })
    };
  }

  /**
   * Get detailed statistics
   * @returns {Object} Detailed statistics
   */
  getStats() {
    const totalJobs = this.stats.jobsCompleted + this.stats.jobsFailed;
    const successRate = totalJobs > 0 ? ((this.stats.jobsCompleted / totalJobs) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      successRate: `${successRate}%`,
      totalJobs,
      isHealthy: this.stats.jobsFailed < (totalJobs * 0.1), // Less than 10% failure rate
      uptime: this.calculateUptime()
    };
  }

  /**
   * Calculate scheduler uptime
   * @returns {string} Uptime description
   */
  calculateUptime() {
    if (!this.stats.lastExecution) {
      return 'Not yet executed';
    }

    const now = Date.now();
    const lastRun = new Date(this.stats.lastExecution).getTime();
    const uptimeMs = now - lastRun;

    const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m since last execution`;
    } else {
      return `${minutes}m since last execution`;
    }
  }

  /**
   * Force immediate execution (for testing or manual triggers)
   * @returns {Object} Execution result
   */
  async executeNow() {
    console.log('🔧 Manual execution triggered');
    return this.executeScheduledScraping();
  }

  /**
   * Update schedule (if needed)
   * @param {string} newCronExpression New cron expression
   * @param {string} newTimezone New timezone
   * @returns {boolean} Success status
   */
  updateSchedule(newCronExpression, newTimezone = null) {
    try {
      const wasRunning = !!this.scheduledJob;

      // Stop current job if running
      if (wasRunning) {
        this.stop();
      }

      // Update configuration
      this.cronExpression = newCronExpression;
      if (newTimezone) {
        this.timezone = newTimezone;
      }

      // Restart if it was running
      if (wasRunning) {
        this.start();
      }

      console.log(`📅 Schedule updated: ${newCronExpression} (${this.timezone})`);
      return true;

    } catch (error) {
      console.error('❌ Failed to update schedule:', error.message);
      return false;
    }
  }

  /**
   * Validate cron expression
   * @param {string} cronExpr Cron expression to validate
   * @returns {boolean} True if valid
   */
  static validateCronExpression(cronExpr) {
    try {
      return cron.validate(cronExpr);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available timezone list
   * @returns {Array} List of supported timezones
   */
  static getSupportedTimezones() {
    return [
      'Asia/Singapore',
      'Asia/Kuala_Lumpur',
      'Asia/Bangkok',
      'Asia/Jakarta',
      'UTC',
      'America/New_York',
      'Europe/London'
    ];
  }
}

module.exports = GeBIZRSSScheduler;