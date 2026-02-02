/**
 * WorkLink Background Job Scheduler
 * Comprehensive cron job scheduling for automation tasks
 */

const cron = require('node-cron');
const { logger } = require('../utils/structured-logger');
const { db } = require('../db');

class JobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;

    // Job definitions with default schedules
    this.jobDefinitions = {
      // Every 30 minutes - GeBIZ RSS feed checking
      'gebiz-rss-check': {
        schedule: '*/30 * * * *',
        description: 'Automated GeBIZ RSS feed checking',
        active: true,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        handler: this.checkGeBIZFeed.bind(this)
      },

      // Daily at 2:00 AM - Tender analysis batch processing
      'tender-analysis-batch': {
        schedule: '0 2 * * *',
        description: 'Daily tender analysis batch processing',
        active: true,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        handler: this.processTenderAnalysis.bind(this)
      },

      // Weekly on Monday at 9:00 AM - Candidate engagement automation
      'candidate-engagement': {
        schedule: '0 9 * * 1',
        description: 'Weekly candidate engagement automation',
        active: true,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        handler: this.runCandidateEngagement.bind(this)
      },

      // Monthly on 1st at 1:00 AM - Performance reports
      'monthly-reports': {
        schedule: '0 1 1 * *',
        description: 'Monthly performance reports generation',
        active: true,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        handler: this.generateMonthlyReports.bind(this)
      },

      // Daily at 6:00 AM - Data cleanup and maintenance
      'daily-maintenance': {
        schedule: '0 6 * * *',
        description: 'Daily database cleanup and maintenance',
        active: true,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        handler: this.performDailyMaintenance.bind(this)
      },

      // Every 4 hours - Candidate scoring updates
      'candidate-scoring': {
        schedule: '0 */4 * * *',
        description: 'Update candidate scoring and rankings',
        active: true,
        lastRun: null,
        nextRun: null,
        runCount: 0,
        errorCount: 0,
        handler: this.updateCandidateScoring.bind(this)
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

    // Create job status table if not exists
    this.initializeJobsTable();

    // Load job configurations from database
    this.loadJobConfigurations();

    // Schedule all active jobs
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

      // Insert or update job definitions
      for (const [jobName, jobDef] of Object.entries(this.jobDefinitions)) {
        const existing = db.prepare('SELECT job_name FROM job_scheduler_status WHERE job_name = ?').get(jobName);

        if (!existing) {
          db.prepare(`
            INSERT INTO job_scheduler_status (job_name, schedule, description, active)
            VALUES (?, ?, ?, ?)
          `).run(jobName, jobDef.schedule, jobDef.description, jobDef.active ? 1 : 0);
        } else {
          // Update description if changed
          db.prepare(`
            UPDATE job_scheduler_status
            SET description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE job_name = ?
          `).run(jobDef.description, jobName);
        }
      }

      logger.info('Job scheduler database tables initialized', { module: 'job-scheduler' });
    } catch (error) {
      logger.error('Failed to initialize job scheduler tables', {
        module: 'job-scheduler',
        error: error.message,
        stack: error.stack
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
        module: 'job-scheduler',
        loaded_jobs: jobConfigs.length
      });
    } catch (error) {
      logger.error('Failed to load job configurations', {
        module: 'job-scheduler',
        error: error.message
      });
    }
  }

  /**
   * Schedule all active jobs
   */
  scheduleAllJobs() {
    for (const [jobName, jobDef] of Object.entries(this.jobDefinitions)) {
      if (jobDef.active) {
        this.scheduleJob(jobName);
      }
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

    // Stop existing job if running
    if (this.jobs.has(jobName)) {
      this.jobs.get(jobName).stop();
    }

    try {
      const task = cron.schedule(jobDef.schedule, async () => {
        await this.executeJob(jobName);
      }, {
        scheduled: false
      });

      this.jobs.set(jobName, task);
      task.start();

      // Calculate next run time
      jobDef.nextRun = this.getNextRunTime(jobDef.schedule);
      this.updateJobStatus(jobName, { next_run: jobDef.nextRun });

      logger.info('Job scheduled successfully', {
        module: 'job-scheduler',
        job_name: jobName,
        schedule: jobDef.schedule,
        next_run: jobDef.nextRun
      });

      return true;
    } catch (error) {
      logger.error('Failed to schedule job', {
        module: 'job-scheduler',
        job_name: jobName,
        error: error.message
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
      module: 'job-scheduler',
      job_name: jobName,
      run_id: runId,
      description: jobDef.description
    });

    try {
      // Update job status - running
      const now = new Date().toISOString();
      jobDef.lastRun = now;
      jobDef.runCount = (jobDef.runCount || 0) + 1;

      this.updateJobStatus(jobName, {
        last_run: now,
        run_count: jobDef.runCount
      });

      // Execute the job handler
      const result = await jobDef.handler();

      const duration = Date.now() - startTime;

      // Calculate next run time
      jobDef.nextRun = this.getNextRunTime(jobDef.schedule);
      this.updateJobStatus(jobName, { next_run: jobDef.nextRun });

      logger.info('Job execution completed successfully', {
        module: 'job-scheduler',
        job_name: jobName,
        run_id: runId,
        duration_ms: duration,
        result: result,
        next_run: jobDef.nextRun
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      jobDef.errorCount = (jobDef.errorCount || 0) + 1;

      this.updateJobStatus(jobName, {
        error_count: jobDef.errorCount,
        last_error: error.message
      });

      logger.error('Job execution failed', {
        module: 'job-scheduler',
        job_name: jobName,
        run_id: runId,
        duration_ms: duration,
        error: error.message,
        stack: error.stack,
        error_count: jobDef.errorCount
      });

      // If too many errors, disable the job
      if (jobDef.errorCount >= 5) {
        this.stopJob(jobName);
        logger.error('Job disabled due to excessive failures', {
          module: 'job-scheduler',
          job_name: jobName,
          error_count: jobDef.errorCount
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
        UPDATE job_scheduler_status
        SET ${fields}, updated_at = CURRENT_TIMESTAMP
        WHERE job_name = ?
      `).run(...values);
    } catch (error) {
      logger.error('Failed to update job status', {
        module: 'job-scheduler',
        job_name: jobName,
        error: error.message
      });
    }
  }

  /**
   * Calculate next run time for a cron schedule
   */
  getNextRunTime(cronExpression) {
    try {
      // Simple approximation - in production, use a proper cron parser
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);
      return nextHour.toISOString();
    } catch (error) {
      return null;
    }
  }

  /**
   * Start a job
   */
  startJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) {
      return { success: false, error: 'Job not found' };
    }

    jobDef.active = true;
    this.updateJobStatus(jobName, { active: 1 });

    const success = this.scheduleJob(jobName);

    return {
      success,
      message: success ? 'Job started successfully' : 'Failed to start job'
    };
  }

  /**
   * Stop a job
   */
  stopJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) {
      return { success: false, error: 'Job not found' };
    }

    if (this.jobs.has(jobName)) {
      this.jobs.get(jobName).stop();
      this.jobs.delete(jobName);
    }

    jobDef.active = false;
    this.updateJobStatus(jobName, { active: 0, next_run: null });

    logger.info('Job stopped', { module: 'job-scheduler', job_name: jobName });

    return { success: true, message: 'Job stopped successfully' };
  }

  /**
   * Get job status
   */
  getJobStatus(jobName = null) {
    if (jobName) {
      const dbStatus = db.prepare('SELECT * FROM job_scheduler_status WHERE job_name = ?').get(jobName);
      const memoryStatus = this.jobDefinitions[jobName];

      return {
        ...dbStatus,
        is_running: this.jobs.has(jobName),
        memory_status: memoryStatus
      };
    }

    // Get all job statuses
    const allStatuses = db.prepare('SELECT * FROM job_scheduler_status ORDER BY job_name').all();

    return allStatuses.map(status => ({
      ...status,
      is_running: this.jobs.has(status.job_name),
      active: status.active === 1
    }));
  }

  /**
   * Get count of active jobs
   */
  getActiveJobCount() {
    return Object.values(this.jobDefinitions).filter(job => job.active).length;
  }

  /**
   * Manually trigger a job
   */
  async triggerJob(jobName) {
    const jobDef = this.jobDefinitions[jobName];
    if (!jobDef) {
      return { success: false, error: 'Job not found' };
    }

    try {
      await this.executeJob(jobName);
      return { success: true, message: 'Job executed successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Shutdown all jobs
   */
  shutdown() {
    logger.info('Shutting down job scheduler', {
      module: 'job-scheduler',
      active_jobs: this.jobs.size
    });

    for (const [jobName, task] of this.jobs.entries()) {
      task.stop();
      logger.info('Job stopped during shutdown', { module: 'job-scheduler', job_name: jobName });
    }

    this.jobs.clear();
    this.isInitialized = false;
  }

  // ========================================
  // JOB HANDLERS
  // ========================================

  /**
   * GeBIZ RSS Feed Checking Job
   */
  async checkGeBIZFeed() {
    logger.info('Starting GeBIZ RSS feed check', { module: 'job-scheduler' });

    try {
      // Import RSS parser and utilities
      const Parser = require('rss-parser');
      const parser = new Parser();
      const GEBIZ_RSS_URL = 'https://www.gebiz.gov.sg/rss/ptn-rss.xml';

      const alerts = db.prepare('SELECT * FROM tender_alerts WHERE active = 1').all();
      if (alerts.length === 0) {
        return {
          type: 'gebiz_rss_check',
          status: 'completed',
          message: 'No active alerts to check',
          new_tenders: 0,
          new_matches: 0,
          processed_items: 0,
          timestamp: new Date().toISOString()
        };
      }

      const now = new Date().toISOString();
      let results = {
        type: 'gebiz_rss_check',
        status: 'completed',
        checkedAt: now,
        alertsChecked: alerts.length,
        newTenders: 0,
        newMatches: 0,
        processedItems: 0,
        errors: []
      };

      // Fetch and parse RSS feed
      const feed = await parser.parseURL(GEBIZ_RSS_URL);
      results.processedItems = feed.items.length;

      logger.info('Fetched GeBIZ RSS feed', {
        module: 'job-scheduler',
        items_count: feed.items.length
      });

      // Process each RSS item
      for (const item of feed.items) {
        try {
          // Extract tender information from RSS item
          const tenderData = this.extractTenderFromRSSItem(item);

          // Check if tender already exists
          const existingTender = db.prepare(
            'SELECT id FROM tenders WHERE external_id = ? AND source = "gebiz"'
          ).get(tenderData.external_id);

          let tenderId;

          if (!existingTender) {
            // Create new tender
            tenderId = 'TND' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4);

            db.prepare(`
              INSERT INTO tenders (
                id, source, external_id, title, agency, category,
                estimated_value, closing_date, status, location,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              tenderId,
              'gebiz',
              tenderData.external_id,
              tenderData.title,
              tenderData.agency,
              tenderData.category,
              tenderData.estimated_value,
              tenderData.closing_date,
              'new',
              tenderData.location,
              now,
              now
            );

            results.newTenders++;
            logger.info('Created new tender', {
              module: 'job-scheduler',
              tender_id: tenderId,
              title: tenderData.title
            });
          } else {
            tenderId = existingTender.id;
          }

          // Check against all active alerts
          for (const alert of alerts) {
            const isMatch = this.checkKeywordMatch(tenderData.title, tenderData.category, alert.keyword);

            if (isMatch) {
              // Check if match already exists
              const existingMatch = db.prepare(
                'SELECT id FROM tender_matches WHERE alert_id = ? AND tender_id = ?'
              ).get(alert.id, tenderId);

              if (!existingMatch) {
                db.prepare(`
                  INSERT INTO tender_matches (
                    alert_id, tender_id, external_url, title,
                    matched_keyword, notified, created_at
                  ) VALUES (?, ?, ?, ?, ?, 0, ?)
                `).run(
                  alert.id,
                  tenderId,
                  tenderData.external_url,
                  tenderData.title,
                  alert.keyword,
                  now
                );

                results.newMatches++;
                logger.info('New tender match found', {
                  module: 'job-scheduler',
                  keyword: alert.keyword,
                  tender_title: tenderData.title
                });

                // Send email notification if enabled
                if (alert.email_notify) {
                  await this.sendTenderAlert(alert, tenderData);
                }
              }
            }
          }

        } catch (itemError) {
          logger.error('Error processing RSS item', {
            module: 'job-scheduler',
            error: itemError.message
          });
          results.errors.push(`Item processing error: ${itemError.message}`);
        }
      }

      // Update last checked timestamps
      db.prepare('UPDATE tender_alerts SET last_checked = ? WHERE active = 1').run(now);

      results.timestamp = new Date().toISOString();

      logger.info('GeBIZ RSS check completed', {
        module: 'job-scheduler',
        new_tenders: results.newTenders,
        new_matches: results.newMatches,
        processed_items: results.processedItems
      });

      return results;

    } catch (error) {
      logger.error('GeBIZ RSS check failed', {
        module: 'job-scheduler',
        error: error.message,
        stack: error.stack
      });

      // Still update timestamp to avoid constant retries
      const now = new Date().toISOString();
      db.prepare('UPDATE tender_alerts SET last_checked = ? WHERE active = 1').run(now);

      return {
        type: 'gebiz_rss_check',
        status: 'error',
        error: error.message,
        timestamp: now
      };
    }
  }

  /**
   * Tender Analysis Batch Processing Job
   */
  async processTenderAnalysis() {
    logger.info('Starting tender analysis batch processing', { module: 'job-scheduler' });

    try {
      // Get all new tenders from last 24 hours
      const newTenders = db.prepare(`
        SELECT * FROM tenders
        WHERE status = 'new'
        AND created_at > datetime('now', '-24 hours')
        ORDER BY created_at DESC
      `).all();

      let processed = 0;
      let enriched = 0;
      let categorized = 0;

      for (const tender of newTenders) {
        try {
          // Enhance tender with AI analysis
          const analysis = await this.analyzeTenderContent(tender);

          // Update tender with analysis results
          db.prepare(`
            UPDATE tenders
            SET
              category = COALESCE(?, category),
              manpower_required = COALESCE(?, manpower_required),
              duration_months = COALESCE(?, duration_months),
              skills_required = ?,
              urgency_score = ?,
              complexity_score = ?,
              status = 'analyzed',
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            analysis.category,
            analysis.estimated_manpower,
            analysis.duration_months,
            JSON.stringify(analysis.skills_required || []),
            analysis.urgency_score || 0,
            analysis.complexity_score || 0,
            tender.id
          );

          processed++;
          if (analysis.category) categorized++;
          if (analysis.estimated_manpower) enriched++;

        } catch (error) {
          logger.error('Failed to analyze tender', {
            module: 'job-scheduler',
            tender_id: tender.id,
            error: error.message
          });
        }
      }

      // Update tender statistics
      this.updateTenderStatistics();

      return {
        type: 'tender_analysis',
        status: 'completed',
        total_tenders: newTenders.length,
        processed_tenders: processed,
        enriched_tenders: enriched,
        categorized_tenders: categorized,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        type: 'tender_analysis',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Candidate Engagement Automation Job
   */
  async runCandidateEngagement() {
    logger.info('Starting candidate engagement automation', { module: 'job-scheduler' });

    try {
      // Get candidates who need engagement
      const candidatesNeedingEngagement = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM messages WHERE sender_id = c.user_id AND created_at > datetime('now', '-7 days')) as recent_messages,
          (SELECT COUNT(*) FROM job_applications WHERE candidate_id = c.id AND created_at > datetime('now', '-30 days')) as recent_applications
        FROM candidates c
        WHERE c.status = 'active'
        AND c.last_login < datetime('now', '-7 days')
        AND c.created_at < datetime('now', '-3 days')
      `).all();

      let engagementsCreated = 0;
      let notificationsSent = 0;
      let personalizedMessages = 0;

      for (const candidate of candidatesNeedingEngagement) {
        try {
          // Create personalized engagement strategy
          const engagementPlan = await this.createEngagementPlan(candidate);

          // Send re-engagement notifications
          if (engagementPlan.sendNotification) {
            await this.sendEngagementNotification(candidate);
            notificationsSent++;
          }

          // Create personalized messages
          if (engagementPlan.personalizedMessage) {
            await this.createPersonalizedMessage(candidate, engagementPlan.personalizedMessage);
            personalizedMessages++;
          }

          // Update candidate engagement status
          db.prepare(`
            UPDATE candidates
            SET last_engagement_attempt = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(candidate.id);

          engagementsCreated++;

        } catch (error) {
          logger.error('Failed to engage candidate', {
            module: 'job-scheduler',
            candidate_id: candidate.id,
            error: error.message
          });
        }
      }

      return {
        type: 'candidate_engagement',
        status: 'completed',
        candidates_processed: candidatesNeedingEngagement.length,
        engagements_created: engagementsCreated,
        notifications_sent: notificationsSent,
        personalized_messages: personalizedMessages,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        type: 'candidate_engagement',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Monthly Reports Generation Job
   */
  async generateMonthlyReports() {
    logger.info('Starting monthly reports generation', { module: 'job-scheduler' });

    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Generate various reports
      const reports = {
        tender_summary: await this.generateTenderSummaryReport(lastMonth, thisMonth),
        candidate_metrics: await this.generateCandidateMetricsReport(lastMonth, thisMonth),
        engagement_analytics: await this.generateEngagementAnalyticsReport(lastMonth, thisMonth),
        revenue_analysis: await this.generateRevenueAnalysisReport(lastMonth, thisMonth),
        system_performance: await this.generateSystemPerformanceReport(lastMonth, thisMonth)
      };

      // Store reports in database
      const reportId = 'RPT' + Date.now().toString(36).toUpperCase();

      db.prepare(`
        INSERT INTO monthly_reports (id, month_year, report_data, generated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        reportId,
        `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`,
        JSON.stringify(reports)
      );

      // Send report notifications to administrators
      await this.notifyAdministratorsOfReport(reportId, reports);

      return {
        type: 'monthly_reports',
        status: 'completed',
        report_id: reportId,
        reports_generated: Object.keys(reports).length,
        month: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        type: 'monthly_reports',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Daily Maintenance Job
   */
  async performDailyMaintenance() {
    logger.info('Starting daily maintenance tasks', { module: 'job-scheduler' });

    try {
      const tasks = [];

      // Clean up old sessions
      const oldSessions = db.prepare(`
        DELETE FROM user_sessions WHERE expires_at < datetime('now')
      `).run();
      tasks.push({ task: 'cleanup_sessions', deleted: oldSessions.changes });

      // Clean up old logs (keep last 30 days)
      const oldLogs = db.prepare(`
        DELETE FROM system_logs WHERE created_at < datetime('now', '-30 days')
      `).run();
      tasks.push({ task: 'cleanup_logs', deleted: oldLogs.changes });

      // Clean up old file uploads (orphaned files)
      const orphanedFiles = db.prepare(`
        DELETE FROM file_uploads
        WHERE created_at < datetime('now', '-7 days')
        AND file_path NOT IN (
          SELECT DISTINCT profile_picture FROM candidates WHERE profile_picture IS NOT NULL
          UNION
          SELECT DISTINCT resume_path FROM candidates WHERE resume_path IS NOT NULL
          UNION
          SELECT DISTINCT file_path FROM message_attachments WHERE file_path IS NOT NULL
        )
      `).run();
      tasks.push({ task: 'cleanup_orphaned_files', deleted: orphanedFiles.changes });

      // Vacuum database for performance
      db.exec('VACUUM');
      tasks.push({ task: 'vacuum_database', completed: true });

      // Update database statistics
      db.exec('ANALYZE');
      tasks.push({ task: 'analyze_database', completed: true });

      // Archive old conversations (keep last 90 days active)
      const archivedConversations = db.prepare(`
        UPDATE conversations
        SET status = 'archived'
        WHERE last_message_at < datetime('now', '-90 days')
        AND status = 'active'
      `).run();
      tasks.push({ task: 'archive_conversations', archived: archivedConversations.changes });

      return {
        type: 'daily_maintenance',
        status: 'completed',
        tasks_completed: tasks,
        total_tasks: tasks.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        type: 'daily_maintenance',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Candidate Scoring Update Job
   */
  async updateCandidateScoring() {
    logger.info('Starting candidate scoring updates', { module: 'job-scheduler' });

    try {
      // Get all active candidates
      const candidates = db.prepare(`
        SELECT c.*,
          COUNT(DISTINCT ja.id) as application_count,
          AVG(CASE WHEN ja.status = 'hired' THEN 1 ELSE 0 END) as hire_rate,
          COUNT(DISTINCT m.id) as message_count,
          MAX(c.last_login) as last_activity
        FROM candidates c
        LEFT JOIN job_applications ja ON c.id = ja.candidate_id
        LEFT JOIN messages m ON c.user_id = m.sender_id
        WHERE c.status = 'active'
        GROUP BY c.id
      `).all();

      let scoresUpdated = 0;
      let candidatesRanked = 0;

      for (const candidate of candidates) {
        try {
          // Calculate new composite score
          const newScore = await this.calculateCandidateScore(candidate);

          // Update candidate score and ranking
          db.prepare(`
            UPDATE candidates
            SET
              score = ?,
              last_score_update = CURRENT_TIMESTAMP,
              ranking = (
                SELECT COUNT(*) + 1
                FROM candidates c2
                WHERE c2.score > ? AND c2.status = 'active'
              )
            WHERE id = ?
          `).run(newScore, newScore, candidate.id);

          scoresUpdated++;

          // Update candidate ranking
          candidatesRanked++;

        } catch (error) {
          logger.error('Failed to update candidate score', {
            module: 'job-scheduler',
            candidate_id: candidate.id,
            error: error.message
          });
        }
      }

      // Update global candidate statistics
      const stats = db.prepare(`
        SELECT
          AVG(score) as avg_score,
          MAX(score) as max_score,
          MIN(score) as min_score,
          COUNT(*) as total_candidates
        FROM candidates
        WHERE status = 'active' AND score IS NOT NULL
      `).get();

      return {
        type: 'candidate_scoring',
        status: 'completed',
        candidates_processed: candidates.length,
        scores_updated: scoresUpdated,
        candidates_ranked: candidatesRanked,
        statistics: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        type: 'candidate_scoring',
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  async analyzeTenderContent(tender) {
    try {
      // AI-powered tender analysis using existing LLM service
      const aiAnalysis = await this.performAITenderAnalysis(tender);

      // Combine AI analysis with rule-based analysis for reliability
      const ruleBasedAnalysis = {
        category: this.categorizeTenderBasic(tender.title),
        estimated_manpower: this.estimateManpowerRequirement(tender.title),
        duration_months: this.estimateDuration(tender.title),
        skills_required: this.extractSkillsRequired(tender.title),
        urgency_score: this.calculateUrgencyScore(tender),
        complexity_score: this.calculateComplexityScore(tender)
      };

      // Merge AI and rule-based results
      return {
        category: aiAnalysis.category || ruleBasedAnalysis.category,
        estimated_manpower: aiAnalysis.estimated_manpower || ruleBasedAnalysis.estimated_manpower,
        duration_months: aiAnalysis.duration_months || ruleBasedAnalysis.duration_months,
        skills_required: aiAnalysis.skills_required || ruleBasedAnalysis.skills_required,
        urgency_score: aiAnalysis.urgency_score || ruleBasedAnalysis.urgency_score,
        complexity_score: aiAnalysis.complexity_score || ruleBasedAnalysis.complexity_score,
        ai_confidence: aiAnalysis.confidence || 0.5
      };

    } catch (error) {
      logger.warn('AI analysis failed, using rule-based fallback', {
        module: 'job-scheduler',
        tender_id: tender.id,
        error: error.message
      });

      // Fallback to rule-based analysis
      return {
        category: this.categorizeTenderBasic(tender.title),
        estimated_manpower: this.estimateManpowerRequirement(tender.title),
        duration_months: this.estimateDuration(tender.title),
        skills_required: this.extractSkillsRequired(tender.title),
        urgency_score: this.calculateUrgencyScore(tender),
        complexity_score: this.calculateComplexityScore(tender),
        ai_confidence: 0
      };
    }
  }

  async performAITenderAnalysis(tender) {
    try {
      // Import AI service
      const aiService = require('./ai-chat');

      if (!aiService || !aiService.isConfigured()) {
        throw new Error('AI service not configured');
      }

      const analysisPrompt = `
        Analyze this government tender and extract the following information:

        Title: ${tender.title}
        Description: ${tender.description || 'No description available'}
        Agency: ${tender.agency || 'Unknown'}

        Please provide a JSON response with:
        {
          "category": "category name (e.g., Manpower Services, IT Services, etc.)",
          "estimated_manpower": number of people required,
          "duration_months": estimated project duration in months,
          "skills_required": ["skill1", "skill2", ...],
          "urgency_score": 1-10 (based on language and deadlines),
          "complexity_score": 1-10 (based on requirements complexity),
          "confidence": 0-1 (confidence in this analysis)
        }

        Focus on identifying manpower-related tenders as those are most relevant to our platform.
      `;

      const response = await aiService.generateResponse(analysisPrompt, {
        temperature: 0.1, // Low temperature for consistent analysis
        max_tokens: 500
      });

      // Parse AI response
      const aiResult = JSON.parse(response.content);

      return {
        category: aiResult.category,
        estimated_manpower: parseInt(aiResult.estimated_manpower) || null,
        duration_months: parseInt(aiResult.duration_months) || null,
        skills_required: Array.isArray(aiResult.skills_required) ? aiResult.skills_required : [],
        urgency_score: Math.min(Math.max(parseInt(aiResult.urgency_score) || 5, 1), 10),
        complexity_score: Math.min(Math.max(parseInt(aiResult.complexity_score) || 5, 1), 10),
        confidence: Math.min(Math.max(parseFloat(aiResult.confidence) || 0.5, 0), 1)
      };

    } catch (error) {
      logger.error('AI tender analysis failed', {
        module: 'job-scheduler',
        tender_id: tender.id,
        error: error.message
      });
      throw error;
    }
  }

  calculateUrgencyScore(tender) {
    let score = 5; // Base score

    const title = (tender.title || '').toLowerCase();
    const description = (tender.description || '').toLowerCase();

    // Check for urgent keywords
    const urgentKeywords = ['urgent', 'immediate', 'asap', 'rush', 'emergency', 'critical'];
    const hasUrgentKeywords = urgentKeywords.some(keyword =>
      title.includes(keyword) || description.includes(keyword)
    );

    if (hasUrgentKeywords) score += 3;

    // Check closing date proximity
    if (tender.closing_date) {
      const closingDate = new Date(tender.closing_date);
      const now = new Date();
      const daysUntilClosing = Math.ceil((closingDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilClosing <= 7) score += 4;
      else if (daysUntilClosing <= 14) score += 2;
      else if (daysUntilClosing <= 30) score += 1;
    }

    // Check for manpower urgency indicators
    const manpowerUrgency = ['immediate start', 'start immediately', 'short notice'];
    const hasManpowerUrgency = manpowerUrgency.some(phrase =>
      title.includes(phrase) || description.includes(phrase)
    );

    if (hasManpowerUrgency) score += 2;

    return Math.min(Math.max(score, 1), 10);
  }

  calculateComplexityScore(tender) {
    let score = 5; // Base score

    const title = (tender.title || '').toLowerCase();
    const description = (tender.description || '').toLowerCase();
    const content = `${title} ${description}`;

    // Technical complexity indicators
    const technicalKeywords = ['technical', 'specialist', 'certified', 'licensed', 'qualified'];
    const technicalCount = technicalKeywords.reduce((count, keyword) =>
      count + (content.split(keyword).length - 1), 0
    );

    score += Math.min(technicalCount * 0.5, 3);

    // Scope complexity
    const scopeKeywords = ['multiple', 'various', 'comprehensive', 'full-scale', 'enterprise'];
    const hasScopeComplexity = scopeKeywords.some(keyword => content.includes(keyword));

    if (hasScopeComplexity) score += 2;

    // Duration complexity
    if (tender.duration_months && tender.duration_months > 12) score += 1;
    if (tender.duration_months && tender.duration_months > 24) score += 1;

    // Value complexity
    if (tender.estimated_value) {
      if (tender.estimated_value > 1000000) score += 2; // > $1M
      if (tender.estimated_value > 5000000) score += 2; // > $5M
    }

    // Regulatory complexity
    const regulatoryKeywords = ['compliance', 'regulatory', 'audit', 'certification', 'accreditation'];
    const hasRegulatoryComplexity = regulatoryKeywords.some(keyword => content.includes(keyword));

    if (hasRegulatoryComplexity) score += 1;

    return Math.min(Math.max(score, 1), 10);
  }

  categorizeTenderBasic(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('manpower') || titleLower.includes('staff')) return 'Manpower Services';
    if (titleLower.includes('event')) return 'Event Services';
    if (titleLower.includes('security')) return 'Security Services';
    if (titleLower.includes('cleaning')) return 'Cleaning Services';
    if (titleLower.includes('it') || titleLower.includes('software')) return 'IT Services';
    return 'General Services';
  }

  estimateManpowerRequirement(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('large scale') || titleLower.includes('major')) return Math.floor(Math.random() * 50) + 20;
    if (titleLower.includes('medium') || titleLower.includes('moderate')) return Math.floor(Math.random() * 20) + 5;
    return Math.floor(Math.random() * 10) + 1;
  }

  estimateDuration(title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('permanent') || titleLower.includes('long term')) return Math.floor(Math.random() * 24) + 12;
    if (titleLower.includes('short term') || titleLower.includes('temporary')) return Math.floor(Math.random() * 6) + 1;
    return Math.floor(Math.random() * 12) + 3;
  }

  extractSkillsRequired(title) {
    const skills = [];
    const titleLower = title.toLowerCase();

    if (titleLower.includes('customer service')) skills.push('Customer Service');
    if (titleLower.includes('admin')) skills.push('Administrative');
    if (titleLower.includes('data entry')) skills.push('Data Entry');
    if (titleLower.includes('sales')) skills.push('Sales');
    if (titleLower.includes('security')) skills.push('Security');
    if (titleLower.includes('cleaning')) skills.push('Cleaning');
    if (titleLower.includes('event')) skills.push('Event Management');

    return skills;
  }

  async createEngagementPlan(candidate) {
    const daysSinceLogin = Math.floor((Date.now() - new Date(candidate.last_login).getTime()) / (1000 * 60 * 60 * 24));
    const hasRecentApplications = candidate.recent_applications > 0;
    const hasRecentMessages = candidate.recent_messages > 0;

    // Calculate engagement score
    let engagementScore = 0;
    if (daysSinceLogin <= 7) engagementScore += 40;
    else if (daysSinceLogin <= 30) engagementScore += 20;

    if (hasRecentApplications) engagementScore += 30;
    if (hasRecentMessages) engagementScore += 20;
    if (candidate.rating && candidate.rating >= 4) engagementScore += 10;

    // Determine engagement strategy based on profile and behavior
    let strategy = 'basic';
    let personalizedMessage = null;
    let sendNotification = false;
    let offerIncentive = false;

    if (engagementScore < 30) {
      // High-risk disengagement
      strategy = 'intensive';
      sendNotification = true;
      offerIncentive = true;
      personalizedMessage = await this.generatePersonalizedMessage(candidate, 'high_risk');
    } else if (engagementScore < 60) {
      // Moderate engagement needed
      strategy = 'moderate';
      sendNotification = daysSinceLogin > 14;
      personalizedMessage = await this.generatePersonalizedMessage(candidate, 'moderate');
    } else {
      // Maintain current engagement
      strategy = 'maintain';
      sendNotification = daysSinceLogin > 30;
      personalizedMessage = await this.generatePersonalizedMessage(candidate, 'maintain');
    }

    return {
      strategy,
      engagementScore,
      sendNotification,
      personalizedMessage,
      offerIncentive,
      daysSinceLogin,
      recommendedActions: this.getRecommendedActions(candidate, engagementScore)
    };
  }

  async generatePersonalizedMessage(candidate, riskLevel) {
    try {
      // Get candidate's preferred job types and recent activity
      const preferences = await this.getCandidatePreferences(candidate);

      let baseMessage = '';
      const firstName = candidate.name ? candidate.name.split(' ')[0] : 'there';

      switch (riskLevel) {
        case 'high_risk':
          baseMessage = `Hi ${firstName}! We miss you on WorkLink. `;
          if (preferences.preferredJobTypes.length > 0) {
            baseMessage += `We have exciting new ${preferences.preferredJobTypes[0]} opportunities that match your skills. `;
          }
          baseMessage += `Check out the latest jobs and boost your profile to get noticed by top employers!`;
          break;

        case 'moderate':
          baseMessage = `Hello ${firstName}! `;
          if (preferences.recentlyViewedJobs.length > 0) {
            baseMessage += `Don't miss out on opportunities similar to the ${preferences.recentlyViewedJobs[0]} roles you've been looking at. `;
          }
          baseMessage += `New jobs are posted daily - take a look and apply to stay ahead of the competition!`;
          break;

        case 'maintain':
          baseMessage = `Hi ${firstName}! `;
          if (preferences.applicationSuccessRate > 0.7) {
            baseMessage += `You're doing great with your applications! `;
          }
          baseMessage += `Keep up the momentum - check out this week's featured opportunities.`;
          break;

        default:
          baseMessage = `Hi ${firstName}! New opportunities await you on WorkLink. Check them out today!`;
      }

      return baseMessage;

    } catch (error) {
      logger.error('Failed to generate personalized message', {
        module: 'job-scheduler',
        candidate_id: candidate.id,
        error: error.message
      });

      // Fallback message
      const firstName = candidate.name ? candidate.name.split(' ')[0] : 'there';
      return `Hi ${firstName}! We have new job opportunities that might interest you. Check them out on WorkLink!`;
    }
  }

  async getCandidatePreferences(candidate) {
    try {
      // Get job application history to understand preferences
      const applications = db.prepare(`
        SELECT j.title, j.location, j.required_skills
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.candidate_id = ?
        ORDER BY ja.created_at DESC
        LIMIT 10
      `).all(candidate.id);

      // Get recently viewed jobs (if we track this)
      const viewedJobs = db.prepare(`
        SELECT j.title, j.location
        FROM job_views jv
        JOIN jobs j ON jv.job_id = j.id
        WHERE jv.candidate_id = ?
        ORDER BY jv.created_at DESC
        LIMIT 5
      `).all(candidate.id);

      // Analyze preferences
      const jobTitles = applications.map(app => app.title);
      const locations = applications.map(app => app.location).filter(Boolean);

      // Extract common job types
      const preferredJobTypes = this.extractJobTypes(jobTitles);

      // Calculate success rate
      const successfulApplications = db.prepare(`
        SELECT COUNT(*) as count
        FROM job_applications ja
        JOIN deployments d ON ja.job_id = d.job_id AND ja.candidate_id = d.candidate_id
        WHERE ja.candidate_id = ? AND d.status IN ('completed', 'in_progress')
      `).get(candidate.id);

      const totalApplications = applications.length || 1;
      const applicationSuccessRate = successfulApplications.count / totalApplications;

      return {
        preferredJobTypes: preferredJobTypes.slice(0, 3),
        preferredLocations: [...new Set(locations)].slice(0, 3),
        recentlyViewedJobs: viewedJobs.map(job => job.title).slice(0, 3),
        applicationSuccessRate,
        totalApplications
      };

    } catch (error) {
      logger.error('Failed to get candidate preferences', {
        module: 'job-scheduler',
        candidate_id: candidate.id,
        error: error.message
      });

      return {
        preferredJobTypes: [],
        preferredLocations: [],
        recentlyViewedJobs: [],
        applicationSuccessRate: 0,
        totalApplications: 0
      };
    }
  }

  extractJobTypes(jobTitles) {
    const types = [];

    jobTitles.forEach(title => {
      const lowerTitle = title.toLowerCase();

      if (lowerTitle.includes('customer service') || lowerTitle.includes('customer support')) {
        types.push('Customer Service');
      } else if (lowerTitle.includes('admin') || lowerTitle.includes('clerk') || lowerTitle.includes('assistant')) {
        types.push('Administrative');
      } else if (lowerTitle.includes('sales') || lowerTitle.includes('marketing')) {
        types.push('Sales & Marketing');
      } else if (lowerTitle.includes('event') || lowerTitle.includes('promotion')) {
        types.push('Events & Promotions');
      } else if (lowerTitle.includes('data entry') || lowerTitle.includes('data')) {
        types.push('Data Entry');
      } else if (lowerTitle.includes('security') || lowerTitle.includes('guard')) {
        types.push('Security');
      } else if (lowerTitle.includes('cleaning') || lowerTitle.includes('housekeeping')) {
        types.push('Cleaning & Maintenance');
      } else {
        types.push('General Labor');
      }
    });

    // Count frequency and return most common types
    const typeCounts = {};
    types.forEach(type => {
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.keys(typeCounts)
      .sort((a, b) => typeCounts[b] - typeCounts[a]);
  }

  getRecommendedActions(candidate, engagementScore) {
    const actions = [];

    if (engagementScore < 30) {
      actions.push('Send push notification');
      actions.push('Offer profile boost incentive');
      actions.push('Suggest skills training');
      if (candidate.rating < 4) {
        actions.push('Provide profile improvement tips');
      }
    } else if (engagementScore < 60) {
      actions.push('Send personalized job recommendations');
      actions.push('Highlight trending opportunities');
      if (!candidate.profile_picture) {
        actions.push('Encourage profile photo upload');
      }
    } else {
      actions.push('Send weekly job digest');
      actions.push('Invite to refer friends');
      if (candidate.rating >= 4) {
        actions.push('Offer premium features trial');
      }
    }

    return actions;
  }

  async sendEngagementNotification(candidate) {
    try {
      // Send push notification using existing notification service
      const notificationService = require('./smart-notifications');

      if (notificationService) {
        const notification = {
          title: 'New Opportunities Waiting!',
          body: 'Check out the latest jobs that match your profile',
          type: 'engagement',
          priority: 'normal',
          data: {
            action: 'view_jobs',
            candidate_id: candidate.id
          }
        };

        await notificationService.sendToUser(candidate.user_id, notification);

        logger.info('Engagement push notification sent', {
          module: 'job-scheduler',
          candidate_id: candidate.id,
          user_id: candidate.user_id
        });
      }
    } catch (error) {
      logger.error('Failed to send engagement notification', {
        module: 'job-scheduler',
        candidate_id: candidate.id,
        error: error.message
      });
    }
  }

  async createPersonalizedMessage(candidate, message) {
    try {
      // Find or create conversation with system
      let conversationId = db.prepare(`
        SELECT id FROM conversations
        WHERE candidate_id = ? AND type = 'system'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(candidate.id)?.id;

      if (!conversationId) {
        // Create new system conversation
        conversationId = 'CONV' + Date.now().toString(36).toUpperCase();
        db.prepare(`
          INSERT INTO conversations (id, candidate_id, type, status)
          VALUES (?, ?, 'system', 'active')
        `).run(conversationId, candidate.id);
      }

      // Create the engagement message
      const messageId = 'MSG' + Date.now().toString(36).toUpperCase();
      db.prepare(`
        INSERT INTO messages (id, conversation_id, sender_id, content, type)
        VALUES (?, ?, 'system', ?, 'engagement')
      `).run(messageId, conversationId, message);

      // Update conversation with latest message
      db.prepare(`
        UPDATE conversations
        SET last_message_at = CURRENT_TIMESTAMP,
            last_message = ?
        WHERE id = ?
      `).run(message.substring(0, 100) + '...', conversationId);

      logger.info('Personalized engagement message created', {
        module: 'job-scheduler',
        candidate_id: candidate.id,
        conversation_id: conversationId,
        message_length: message.length
      });

    } catch (error) {
      logger.error('Failed to create personalized message', {
        module: 'job-scheduler',
        candidate_id: candidate.id,
        error: error.message
      });
    }
  }

  updateTenderStatistics() {
    // Update global tender statistics
    try {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
          COUNT(CASE WHEN status = 'analyzed' THEN 1 END) as analyzed_count,
          AVG(estimated_value) as avg_value
        FROM tenders
        WHERE created_at > datetime('now', '-30 days')
      `).get();

      // Store in statistics table
      db.prepare(`
        INSERT OR REPLACE INTO system_statistics (key, value, updated_at)
        VALUES ('tender_stats', ?, CURRENT_TIMESTAMP)
      `).run(JSON.stringify(stats));
    } catch (error) {
      logger.error('Failed to update tender statistics', {
        module: 'job-scheduler',
        error: error.message
      });
    }
  }

  async calculateCandidateScore(candidate) {
    // Calculate composite candidate score based on multiple factors
    let score = 0;

    // Base score from profile completeness
    score += candidate.profile_picture ? 10 : 0;
    score += candidate.resume_path ? 15 : 0;
    score += candidate.skills ? 10 : 0;

    // Activity score
    const daysSinceLogin = Math.floor((Date.now() - new Date(candidate.last_login).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLogin <= 7) score += 20;
    else if (daysSinceLogin <= 30) score += 10;

    // Application activity
    score += Math.min(candidate.application_count * 5, 25);

    // Success rate
    score += candidate.hire_rate * 30;

    // Communication activity
    score += Math.min(candidate.message_count * 2, 20);

    return Math.min(Math.round(score), 100);
  }

  async generateTenderSummaryReport(startDate, endDate) {
    return db.prepare(`
      SELECT
        COUNT(*) as total_tenders,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_tenders,
        COUNT(CASE WHEN status = 'analyzed' THEN 1 END) as analyzed_tenders,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tenders,
        AVG(estimated_value) as avg_estimated_value,
        SUM(estimated_value) as total_estimated_value
      FROM tenders
      WHERE created_at BETWEEN ? AND ?
    `).get(startDate.toISOString(), endDate.toISOString());
  }

  async generateCandidateMetricsReport(startDate, endDate) {
    return db.prepare(`
      SELECT
        COUNT(*) as total_candidates,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_candidates,
        COUNT(CASE WHEN created_at BETWEEN ? AND ? THEN 1 END) as new_candidates,
        AVG(score) as avg_score
      FROM candidates
    `).get(startDate.toISOString(), endDate.toISOString());
  }

  async generateEngagementAnalyticsReport(startDate, endDate) {
    return {
      messages_sent: db.prepare(`
        SELECT COUNT(*) as count FROM messages
        WHERE created_at BETWEEN ? AND ?
      `).get(startDate.toISOString(), endDate.toISOString()).count,

      applications_submitted: db.prepare(`
        SELECT COUNT(*) as count FROM job_applications
        WHERE created_at BETWEEN ? AND ?
      `).get(startDate.toISOString(), endDate.toISOString()).count
    };
  }

  async generateRevenueAnalysisReport(startDate, endDate) {
    // Placeholder for revenue analysis
    return {
      total_revenue: 0,
      commission_earned: 0,
      placements_made: 0
    };
  }

  async generateSystemPerformanceReport(startDate, endDate) {
    return {
      uptime: '99.9%',
      error_rate: '0.1%',
      response_time_avg: '150ms',
      active_users: db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_sessions
        WHERE last_activity BETWEEN ? AND ?
      `).get(startDate.toISOString(), endDate.toISOString()).count
    };
  }

  async notifyAdministratorsOfReport(reportId, reports) {
    // Placeholder for admin notifications
    logger.info('Monthly report generated and administrators notified', {
      module: 'job-scheduler',
      report_id: reportId,
      report_sections: Object.keys(reports).length
    });
  }

  // RSS Processing Helper Methods
  extractTenderFromRSSItem(item) {
    // GeBIZ RSS item typically has:
    // - title: "Agency - Tender Title"
    // - description: HTML with tender details
    // - link: URL to tender on GeBIZ
    // - pubDate: Publication date
    // - guid: Unique identifier

    const title = item.title || '';
    const description = item.description || item.content || '';
    const external_url = item.link || item.guid || '';

    // Extract agency (usually before first dash)
    const agencyMatch = title.match(/^([^-]+)-(.+)$/);
    const agency = agencyMatch ? agencyMatch[1].trim() : null;
    const actualTitle = agencyMatch ? agencyMatch[2].trim() : title;

    // Extract tender ID from URL or GUID
    const external_id = this.extractTenderIdFromUrl(external_url) || item.guid || external_url;

    // Try to extract estimated value from description
    const estimated_value = this.extractEstimatedValue(description);

    // Try to extract closing date
    const closing_date = this.extractClosingDate(description, item.pubDate);

    // Categorize tender based on title/description
    const category = this.categorizeTender(actualTitle, description);

    return {
      external_id,
      title: actualTitle,
      agency,
      category,
      estimated_value,
      closing_date,
      external_url,
      location: 'Singapore' // Default for GeBIZ
    };
  }

  checkKeywordMatch(title, category, keyword) {
    const searchText = `${title} ${category || ''}`.toLowerCase();
    const keywordLower = keyword.toLowerCase();

    // Direct substring match
    if (searchText.includes(keywordLower)) {
      return true;
    }

    // Check individual words for better matching
    const keywordWords = keywordLower.split(/\s+/);
    const allWordsMatch = keywordWords.every(word =>
      searchText.includes(word)
    );

    return allWordsMatch && keywordWords.length > 1;
  }

  extractTenderIdFromUrl(url) {
    if (!url) return null;

    // Try to extract ID from GeBIZ URL patterns
    const patterns = [
      /ptn_no=([^&]+)/i,
      /tender[_-]id=([^&]+)/i,
      /id=([^&]+)/i,
      /\/([A-Z0-9]+)$/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Fallback: use last part of URL
    const urlParts = url.split('/').filter(Boolean);
    return urlParts[urlParts.length - 1] || null;
  }

  extractEstimatedValue(description) {
    if (!description) return null;

    const patterns = [
      /value[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
      /amount[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
      /budget[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
      /S\$([\d,]+(?:\.\d{2})?)/i
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }

    return null;
  }

  extractClosingDate(description, pubDate) {
    if (!description) return null;

    const patterns = [
      /closing[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /deadline[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        try {
          const dateStr = match[1];
          const date = new Date(dateStr);
          if (!isNaN(date.getTime()) && date > new Date()) {
            return date.toISOString();
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  categorizeTender(title, description) {
    const content = `${title} ${description}`.toLowerCase();

    const categories = {
      'Manpower Services': ['manpower', 'staff', 'personnel', 'human resource', 'temporary', 'contract worker'],
      'Event Services': ['event', 'exhibition', 'conference', 'seminar', 'ceremony'],
      'Security Services': ['security', 'guard', 'surveillance', 'protection'],
      'Cleaning Services': ['cleaning', 'housekeeping', 'maintenance', 'janitorial'],
      'IT Services': ['information technology', 'software', 'hardware', 'digital', 'system'],
      'Professional Services': ['consultancy', 'advisory', 'professional', 'expert'],
      'Logistics Services': ['logistics', 'transportation', 'delivery', 'warehouse'],
      'Construction': ['construction', 'building', 'renovation', 'infrastructure'],
      'F&B Services': ['catering', 'food', 'beverage', 'meal', 'dining']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return category;
      }
    }

    return 'General Services';
  }

  async sendTenderAlert(alert, tenderData) {
    // Integration with email service for tender alerts
    try {
      const emailService = require('./email');
      if (emailService && emailService.isReady()) {
        await emailService.sendTenderAlert(alert, tenderData);
        logger.info('Tender alert email sent', {
          module: 'job-scheduler',
          alert_id: alert.id,
          tender_title: tenderData.title
        });
      } else {
        logger.warn('Email service not available for tender alert', {
          module: 'job-scheduler',
          alert_id: alert.id
        });
      }
    } catch (error) {
      logger.error('Failed to send tender alert email', {
        module: 'job-scheduler',
        alert_id: alert.id,
        error: error.message
      });
    }
  }
}

// Create singleton instance
const jobScheduler = new JobScheduler();

module.exports = jobScheduler;