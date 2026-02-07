/**
 * WorkLink Background Job Scheduler
 * Core scheduling engine — job handlers are in ./scheduler-handlers/
 */

const cron = require('node-cron');
const { logger } = require('../utils/structured-logger');
const { db } = require('../db');

// Import job handlers
const { checkGeBIZFeed } = require('./scheduler-handlers/gebiz-handler');
const { processTenderAnalysis } = require('./scheduler-handlers/tender-analysis-handler');
const { runCandidateEngagement } = require('./scheduler-handlers/engagement-handler');
const { generateMonthlyReports, performDailyMaintenance } = require('./scheduler-handlers/reports-handler');
const { updateCandidateScoring } = require('./scheduler-handlers/scoring-handler');

class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;

    // Job definitions with default schedules
    this.jobDefinitions = {
      'gebiz-rss-check': {
        schedule: '*/30 * * * *',
        description: 'Automated GeBIZ RSS feed checking',
        active: true, lastRun: null, nextRun: null, runCount: 0, errorCount: 0,
        handler: checkGeBIZFeed
      },
      'tender-analysis-batch': {
        schedule: '0 2 * * *',
        description: 'Daily tender analysis batch processing',
        active: true, lastRun: null, nextRun: null, runCount: 0, errorCount: 0,
        handler: processTenderAnalysis
      },
      'candidate-engagement': {
        schedule: '0 9 * * 1',
        description: 'Weekly candidate engagement automation',
        active: true, lastRun: null, nextRun: null, runCount: 0, errorCount: 0,
        handler: runCandidateEngagement
      },
      'monthly-reports': {
        schedule: '0 1 1 * *',
        description: 'Monthly performance reports generation',
        active: true, lastRun: null, nextRun: null, runCount: 0, errorCount: 0,
        handler: generateMonthlyReports
      },
      'daily-maintenance': {
        schedule: '0 6 * * *',
        description: 'Daily database cleanup and maintenance',
        active: true, lastRun: null, nextRun: null, runCount: 0, errorCount: 0,
        handler: performDailyMaintenance
      },
      'candidate-scoring': {
        schedule: '0 */4 * * *',
        description: 'Update candidate scoring and rankings',
        active: true, lastRun: null, nextRun: null, runCount: 0, errorCount: 0,
        handler: updateCandidateScoring
      }
    };
  }

  /**
   * Initialize the job scheduler
   */
  initialize() {
    if (this.isInitialized) {
      logger.warn('Job scheduler already initialized', { module: 'job-scheduler' });
      return;
    }

    logger.info('Initializing WorkLink Job Scheduler', {
      module: 'job-scheduler',
      total_jobs: Object.keys(this.jobDefinitions).length
    });

    this.initializeJobsTable();
    this.loadJobConfigurations();
    this.scheduleAllJobs();

    this.isInitialized = true;

    logger.info('Job scheduler initialized successfully', {
      module: 'job-scheduler',
      active_jobs: this.getActiveJobCount()
    });
  }

  /**
   * Initialize database table for job status tracking
   */
  initializeJobsTable() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS job_scheduler_status (
          job_name TEXT PRIMARY KEY,
          schedule TEXT NOT NULL,
          description TEXT,
          active INTEGER DEFAULT 1,
          last_run TEXT,
          next_run TEXT,
          run_count INTEGER DEFAULT 0,
          error_count INTEGER DEFAULT 0,
          last_error TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      for (const [jobName, jobDef] of Object.entries(this.jobDefinitions)) {
        const existing = db.prepare('SELECT job_name FROM job_scheduler_status WHERE job_name = ?').get(jobName);

        if (!existing) {
          db.prepare(`
            INSERT INTO job_scheduler_status (job_name, schedule, description, active)
            VALUES (?, ?, ?, ?)
          `).run(jobName, jobDef.schedule, jobDef.description, jobDef.active ? 1 : 0);
        } else {
          db.prepare(`
            UPDATE job_scheduler_status SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE job_name = ?
          `).run(jobDef.description, jobName);
        }
      }

      logger.info('Job scheduler database tables initialized', { module: 'job-scheduler' });
    } catch (error) {
      logger.error('Failed to initialize job scheduler tables', {
        module: 'job-scheduler', error: error.message, stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Load job configurations from database
   */
  loadJobConfigurations() {
    try {
      const jobConfigs = db.prepare('SELECT * FROM job_scheduler_status').all();

      for (const config of jobConfigs) {
        if (this.jobDefinitions[config.job_name]) {
          this.jobDefinitions[config.job_name].active = config.active === 1;
          this.jobDefinitions[config.job_name].schedule = config.schedule;
          this.jobDefinitions[config.job_name].lastRun = config.last_run;
          this.jobDefinitions[config.job_name].runCount = config.run_count || 0;
          this.jobDefinitions[config.job_name].errorCount = config.error_count || 0;
        }
      }

      logger.info('Job configurations loaded from database', {
        module: 'job-scheduler', loaded_jobs: jobConfigs.length
      });
    } catch (error) {
      logger.error('Failed to load job configurations', {
        module: 'job-scheduler', error: error.message
      });
    }
  }

  /**
   * Schedule all active jobs
   */
  scheduleAllJobs() {
    for (const [jobName, jobDef] of Object.entries(this.jobDefinitions)) {
      if (jobDef.active) this.scheduleJob(jobName);
    }
  }

  /**
   * Schedule a specific job
   */
  scheduleJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) {
      logger.error('Job definition not found', { module: 'job-scheduler', job_name: jobName });
      return false;
    }

    if (this.jobs.has(jobName)) this.jobs.get(jobName).stop();

    try {
      const task = cron.schedule(jobDef.schedule, async () => {
        await this.executeJob(jobName);
      }, { scheduled: false });

      this.jobs.set(jobName, task);
      task.start();

      jobDef.nextRun = this.getNextRunTime(jobDef.schedule);
      this.updateJobStatus(jobName, { next_run: jobDef.nextRun });

      logger.info('Job scheduled successfully', {
        module: 'job-scheduler', job_name: jobName, schedule: jobDef.schedule, next_run: jobDef.nextRun
      });

      return true;
    } catch (error) {
      logger.error('Failed to schedule job', {
        module: 'job-scheduler', job_name: jobName, error: error.message
      });
      return false;
    }
  }

  /**
   * Execute a job with error handling and logging
   */
  async executeJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) {
      logger.error('Job definition not found for execution', { module: 'job-scheduler', job_name: jobName });
      return;
    }

    const startTime = Date.now();
    const runId = `${jobName}_${Date.now()}`;

    logger.info('Job execution started', {
      module: 'job-scheduler', job_name: jobName, run_id: runId, description: jobDef.description
    });

    try {
      const now = new Date().toISOString();
      jobDef.lastRun = now;
      jobDef.runCount = (jobDef.runCount || 0) + 1;

      this.updateJobStatus(jobName, { last_run: now, run_count: jobDef.runCount });

      const result = await jobDef.handler();
      const duration = Date.now() - startTime;

      jobDef.nextRun = this.getNextRunTime(jobDef.schedule);
      this.updateJobStatus(jobName, { next_run: jobDef.nextRun });

      logger.info('Job execution completed successfully', {
        module: 'job-scheduler', job_name: jobName, run_id: runId,
        duration_ms: duration, result: result, next_run: jobDef.nextRun
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      jobDef.errorCount = (jobDef.errorCount || 0) + 1;

      this.updateJobStatus(jobName, { error_count: jobDef.errorCount, last_error: error.message });

      logger.error('Job execution failed', {
        module: 'job-scheduler', job_name: jobName, run_id: runId,
        duration_ms: duration, error: error.message, stack: error.stack, error_count: jobDef.errorCount
      });

      if (jobDef.errorCount >= 5) {
        this.stopJob(jobName);
        logger.error('Job disabled due to excessive failures', {
          module: 'job-scheduler', job_name: jobName, error_count: jobDef.errorCount
        });
      }
    }
  }

  /**
   * Update job status in database
   */
  updateJobStatus(jobName, updates) {
    try {
      const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(jobName);

      db.prepare(`
        UPDATE job_scheduler_status SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE job_name = ?
      `).run(...values);
    } catch (error) {
      logger.error('Failed to update job status', {
        module: 'job-scheduler', job_name: jobName, error: error.message
      });
    }
  }

  /**
   * Calculate next run time for a cron schedule
   */
  getNextRunTime(cronExpression) {
    try {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      return nextHour.toISOString();
    } catch (error) {
      return null;
    }
  }

  startJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) return { success: false, error: 'Job not found' };

    jobDef.active = true;
    this.updateJobStatus(jobName, { active: 1 });
    const success = this.scheduleJob(jobName);
    return { success, message: success ? 'Job started successfully' : 'Failed to start job' };
  }

  stopJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) return { success: false, error: 'Job not found' };

    if (this.jobs.has(jobName)) {
      this.jobs.get(jobName).stop();
      this.jobs.delete(jobName);
    }

    jobDef.active = false;
    this.updateJobStatus(jobName, { active: 0, next_run: null });
    logger.info('Job stopped', { module: 'job-scheduler', job_name: jobName });
    return { success: true, message: 'Job stopped successfully' };
  }

  getJobStatus(jobName = null) {
    if (jobName) {
      const dbStatus = db.prepare('SELECT * FROM job_scheduler_status WHERE job_name = ?').get(jobName);
      const memoryStatus = this.jobDefinitions[jobName];
      return { ...dbStatus, is_running: this.jobs.has(jobName), memory_status: memoryStatus };
    }

    const allStatuses = db.prepare('SELECT * FROM job_scheduler_status ORDER BY job_name').all();
    return allStatuses.map(status => ({
      ...status, is_running: this.jobs.has(status.job_name), active: status.active === 1
    }));
  }

  getActiveJobCount() {
    return Object.values(this.jobDefinitions).filter(job => job.active).length;
  }

  async triggerJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) return { success: false, error: 'Job not found' };

    try {
      await this.executeJob(jobName);
      return { success: true, message: 'Job executed successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  shutdown() {
    logger.info('Shutting down job scheduler', { module: 'job-scheduler', active_jobs: this.jobs.size });

    for (const [jobName, task] of this.jobs.entries()) {
      task.stop();
      logger.info('Job stopped during shutdown', { module: 'job-scheduler', job_name: jobName });
    }

    this.jobs.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const jobScheduler = new JobScheduler();

module.exports = jobScheduler;
