/**
 * Background Jobs API
 * Control and monitor scheduled jobs
 */

const express = require('express');
const router = express.Router();
// const jobScheduler = require('../../../services/job-scheduler'); // Disabled to prevent hanging
const { logger } = require('../../../utils/structured-logger');

// Mock jobScheduler to prevent hanging while keeping API functional
const jobScheduler = {
  getJobStatus: () => ({ status: 'disabled', message: 'Job scheduler disabled to prevent hanging' }),
  isInitialized: false,
  getActiveJobCount: () => 0,
  startJob: () => ({ success: false, message: 'Job scheduler disabled' }),
  stopJob: () => ({ success: false, message: 'Job scheduler disabled' }),
  triggerJob: () => ({ success: false, message: 'Job scheduler disabled' }),
  shutdown: () => {},
  initialize: () => {}
};

// Get all jobs status
router.get('/', (req, res) => {
  try {
    const jobs = jobScheduler.getJobStatus();

    res.json({
      success: true,
      data: {
        jobs,
        total_jobs: jobs.length,
        active_jobs: jobs.filter(job => job.active === 1).length,
        running_jobs: jobs.filter(job => job.is_running).length,
        scheduler_initialized: jobScheduler.isInitialized
      }
    });
  } catch (error) {
    logger.error('Failed to get jobs status', {
      module: 'jobs-api',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific job status
router.get('/:jobName', (req, res) => {
  try {
    const { jobName } = req.params;
    const job = jobScheduler.getJobStatus(jobName);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    logger.error('Failed to get job status', {
      module: 'jobs-api',
      job_name: req.params.jobName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start a job
router.post('/:jobName/start', (req, res) => {
  try {
    const { jobName } = req.params;
    const result = jobScheduler.startJob(jobName);

    if (result.success) {
      logger.info('Job started via API', {
        module: 'jobs-api',
        job_name: jobName,
        user: req.user?.email || 'system'
      });

      res.json({
        success: true,
        message: result.message,
        data: jobScheduler.getJobStatus(jobName)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Failed to start job', {
      module: 'jobs-api',
      job_name: req.params.jobName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Stop a job
router.post('/:jobName/stop', (req, res) => {
  try {
    const { jobName } = req.params;
    const result = jobScheduler.stopJob(jobName);

    if (result.success) {
      logger.info('Job stopped via API', {
        module: 'jobs-api',
        job_name: jobName,
        user: req.user?.email || 'system'
      });

      res.json({
        success: true,
        message: result.message,
        data: jobScheduler.getJobStatus(jobName)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Failed to stop job', {
      module: 'jobs-api',
      job_name: req.params.jobName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manually trigger a job
router.post('/:jobName/trigger', async (req, res) => {
  try {
    const { jobName } = req.params;

    logger.info('Job triggered manually via API', {
      module: 'jobs-api',
      job_name: jobName,
      user: req.user?.email || 'system'
    });

    // Run job asynchronously
    const result = await jobScheduler.triggerJob(jobName);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: jobScheduler.getJobStatus(jobName)
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.message
      });
    }
  } catch (error) {
    logger.error('Failed to trigger job', {
      module: 'jobs-api',
      job_name: req.params.jobName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update job configuration
router.patch('/:jobName', (req, res) => {
  try {
    const { jobName } = req.params;
    const { schedule, active, description } = req.body;

    // Validate inputs
    if (schedule && !isValidCronExpression(schedule)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cron expression'
      });
    }

    // Update job configuration in database
    const updates = [];
    const values = [];

    if (schedule !== undefined) {
      updates.push('schedule = ?');
      values.push(schedule);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active ? 1 : 0);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    values.push(jobName);

    const { db } = require('../../../db');
    const result = db.prepare(`
      UPDATE job_scheduler_status
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE job_name = ?
    `).run(...values);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // If schedule was changed, restart the job
    if (schedule && active !== false) {
      jobScheduler.stopJob(jobName);
      jobScheduler.startJob(jobName);
    }

    // If active status was changed
    if (active !== undefined) {
      if (active) {
        jobScheduler.startJob(jobName);
      } else {
        jobScheduler.stopJob(jobName);
      }
    }

    logger.info('Job configuration updated via API', {
      module: 'jobs-api',
      job_name: jobName,
      updates: updates,
      user: req.user?.email || 'system'
    });

    res.json({
      success: true,
      message: 'Job configuration updated successfully',
      data: jobScheduler.getJobStatus(jobName)
    });

  } catch (error) {
    logger.error('Failed to update job configuration', {
      module: 'jobs-api',
      job_name: req.params.jobName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get job execution history/logs
router.get('/:jobName/history', (req, res) => {
  try {
    const { jobName } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { db } = require('../../../db');

    // Get job execution history from logs
    const history = db.prepare(`
      SELECT *
      FROM job_execution_logs
      WHERE job_name = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(jobName, parseInt(limit), parseInt(offset));

    const totalCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM job_execution_logs
      WHERE job_name = ?
    `).get(jobName)?.count || 0;

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: totalCount > (parseInt(offset) + parseInt(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get job history', {
      module: 'jobs-api',
      job_name: req.params.jobName,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get job scheduler system statistics
router.get('/system/stats', (req, res) => {
  try {
    const { db } = require('../../../db');

    // Get system statistics
    const stats = {
      scheduler_uptime: process.uptime(),
      jobs_total: db.prepare('SELECT COUNT(*) as count FROM job_scheduler_status').get().count,
      jobs_active: db.prepare('SELECT COUNT(*) as count FROM job_scheduler_status WHERE active = 1').get().count,
      jobs_running: jobScheduler.getActiveJobCount(),

      // Job execution stats (last 24 hours)
      executions_today: db.prepare(`
        SELECT COUNT(*) as count
        FROM job_execution_logs
        WHERE created_at > datetime('now', '-24 hours')
      `).get()?.count || 0,

      errors_today: db.prepare(`
        SELECT COUNT(*) as count
        FROM job_execution_logs
        WHERE created_at > datetime('now', '-24 hours')
        AND status = 'error'
      `).get()?.count || 0,

      // Most recent executions
      recent_executions: db.prepare(`
        SELECT job_name, status, duration_ms, created_at
        FROM job_execution_logs
        ORDER BY created_at DESC
        LIMIT 10
      `).all(),

      // Job performance stats
      avg_execution_times: db.prepare(`
        SELECT
          job_name,
          COUNT(*) as executions,
          AVG(duration_ms) as avg_duration_ms,
          MAX(duration_ms) as max_duration_ms,
          MIN(duration_ms) as min_duration_ms
        FROM job_execution_logs
        WHERE created_at > datetime('now', '-7 days')
        AND duration_ms IS NOT NULL
        GROUP BY job_name
        ORDER BY avg_duration_ms DESC
      `).all()
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get system stats', {
      module: 'jobs-api',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Restart all jobs (emergency function)
router.post('/system/restart', (req, res) => {
  try {
    logger.info('Job scheduler restart requested via API', {
      module: 'jobs-api',
      user: req.user?.email || 'system'
    });

    // Shutdown current scheduler
    jobScheduler.shutdown();

    // Reinitialize
    setTimeout(() => {
      jobScheduler.initialize();
    }, 1000);

    res.json({
      success: true,
      message: 'Job scheduler restart initiated',
      data: {
        restart_time: new Date().toISOString(),
        estimated_completion: new Date(Date.now() + 2000).toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to restart job scheduler', {
      module: 'jobs-api',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check for job scheduler
router.get('/system/health', (req, res) => {
  try {
    const health = {
      status: jobScheduler.isInitialized ? 'healthy' : 'unhealthy',
      initialized: jobScheduler.isInitialized,
      active_jobs_count: jobScheduler.getActiveJobCount(),
      memory_usage: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
        external: process.memoryUsage().external / 1024 / 1024
      },
      uptime: process.uptime(),
      last_check: new Date().toISOString()
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });

  } catch (error) {
    logger.error('Failed to get health status', {
      module: 'jobs-api',
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Utility function to validate cron expressions
function isValidCronExpression(cronExpression) {
  try {
    // Basic validation for cron expression format
    const parts = cronExpression.trim().split(/\s+/);

    // Should have 5 or 6 parts (minute, hour, day, month, weekday[, year])
    if (parts.length < 5 || parts.length > 6) {
      return false;
    }

    // Each part should only contain valid cron characters
    const validChars = /^[0-9\*\-\,\/\?]+$/;
    return parts.every(part => validChars.test(part));

  } catch (error) {
    return false;
  }
}

module.exports = router;