/**
 * GeBIZ RSS Scraping API Routes
 * Admin endpoints for monitoring and controlling RSS scraping
 */

const express = require('express');
const router = express.Router();
const { scrapingService } = require('../../../../services/scraping');
const auth = require('../../../../middleware/auth');
const { createLogger } = require('../../../../utils/structured-logger');
const logger = createLogger('gebiz-rss');

// Apply authentication middleware to all routes
router.use(auth.authenticateToken);

/**
 * GET /api/v1/scraping/gebiz-rss/status
 * Get comprehensive scraping service status
 */
router.get('/status', async (req, res) => {
  try {
    const status = scrapingService.getStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting scraping status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get scraping status',
      details: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/scraping/gebiz-rss/health
 * Get health check status
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await scrapingService.getHealthCheck();

    const statusCode = healthCheck.healthy ? 200 : 503;

    res.status(statusCode).json({
      success: healthCheck.healthy,
      data: healthCheck
    });

  } catch (error) {
    logger.error('Error getting health status', { error: error.message });
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Health check failed',
      details: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/scraping/gebiz-rss/manual
 * Trigger manual scraping
 */
router.post('/manual', async (req, res) => {
  try {
    const options = req.body || {};

    // Add audit information
    options.triggeredBy = req.user?.id || req.user?.email || 'admin';
    options.manual = true;

    logger.info('Manual scraping triggered', { triggeredBy: options.triggeredBy });

    const result = await scrapingService.manualScrape(options);

    res.json({
      success: true,
      message: 'Manual scraping completed',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in manual scraping', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Manual scraping failed',
      details: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/scraping/gebiz-rss/execute-now
 * Execute immediate scraping (same as scheduled)
 */
router.post('/execute-now', async (req, res) => {
  try {
    const result = await scrapingService.executeNow();

    res.json({
      success: true,
      message: 'Immediate execution completed',
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error in immediate execution', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Immediate execution failed',
      details: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/scraping/gebiz-rss/scheduler/status
 * Get detailed scheduler status
 */
router.get('/scheduler/status', async (req, res) => {
  try {
    const scheduler = scrapingService.getScheduler();
    const status = scheduler.getStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting scheduler status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
      details: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/scraping/gebiz-rss/scheduler/start
 * Start the scheduler
 */
router.post('/scheduler/start', async (req, res) => {
  try {
    const scheduler = scrapingService.getScheduler();
    const started = scheduler.start();

    if (started) {
      res.json({
        success: true,
        message: 'Scheduler started successfully',
        data: scheduler.getStatus(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to start scheduler',
        message: 'Scheduler may already be running'
      });
    }

  } catch (error) {
    logger.error('Error starting scheduler', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduler',
      details: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/scraping/gebiz-rss/scheduler/stop
 * Stop the scheduler
 */
router.post('/scheduler/stop', async (req, res) => {
  try {
    const scheduler = scrapingService.getScheduler();
    const stopped = scheduler.stop();

    if (stopped) {
      res.json({
        success: true,
        message: 'Scheduler stopped successfully',
        data: scheduler.getStatus(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to stop scheduler',
        message: 'Scheduler may not be running'
      });
    }

  } catch (error) {
    logger.error('Error stopping scheduler', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler',
      details: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/scraping/gebiz-rss/scheduler/restart
 * Restart the scheduler
 */
router.post('/scheduler/restart', async (req, res) => {
  try {
    const scheduler = scrapingService.getScheduler();
    scheduler.restart();

    // Give it a moment to restart
    setTimeout(() => {
      res.json({
        success: true,
        message: 'Scheduler restarted successfully',
        data: scheduler.getStatus(),
        timestamp: new Date().toISOString()
      });
    }, 2000);

  } catch (error) {
    logger.error('Error restarting scheduler', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to restart scheduler',
      details: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/scraping/gebiz-rss/parser/stats
 * Get parser statistics
 */
router.get('/parser/stats', async (req, res) => {
  try {
    const parser = scrapingService.getParser();
    const stats = parser.getStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting parser stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get parser statistics',
      details: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/scraping/gebiz-rss/parser/reset-stats
 * Reset parser statistics
 */
router.post('/parser/reset-stats', async (req, res) => {
  try {
    const parser = scrapingService.getParser();
    parser.resetStats();

    res.json({
      success: true,
      message: 'Parser statistics reset successfully',
      data: parser.getStats(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error resetting parser stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to reset parser statistics',
      details: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/scraping/gebiz-rss/lifecycle/stats
 * Get lifecycle manager statistics
 */
router.get('/lifecycle/stats', async (req, res) => {
  try {
    const lifecycleManager = scrapingService.getLifecycleManager();
    const stats = await lifecycleManager.getStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting lifecycle stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get lifecycle statistics',
      details: 'Internal server error'
    });
  }
});

/**
 * GET /api/v1/scraping/gebiz-rss/logs
 * Get recent scraping logs
 */
router.get('/logs', async (req, res) => {
  try {
    const { db } = require('../../../../db');
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const logs = db.prepare(`
      SELECT *
      FROM scraping_jobs_log
      WHERE job_type = 'gebiz_rss'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const totalCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM scraping_jobs_log
      WHERE job_type = 'gebiz_rss'
    `).get();

    res.json({
      success: true,
      data: {
        logs,
        totalCount: totalCount.count,
        limit,
        offset
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting scraping logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get scraping logs',
      details: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/v1/scraping/gebiz-rss/logs/cleanup
 * Cleanup old logs (keep last 100)
 */
router.delete('/logs/cleanup', async (req, res) => {
  try {
    const { db } = require('../../../../db');

    // Keep only the last 100 log entries
    const result = db.prepare(`
      DELETE FROM scraping_jobs_log
      WHERE job_type = 'gebiz_rss'
      AND id NOT IN (
        SELECT id FROM scraping_jobs_log
        WHERE job_type = 'gebiz_rss'
        ORDER BY created_at DESC
        LIMIT 100
      )
    `).run();

    res.json({
      success: true,
      message: `Cleaned up ${result.changes} old log entries`,
      data: {
        deletedCount: result.changes
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error cleaning up logs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup logs',
      details: 'Internal server error'
    });
  }
});

module.exports = router;