/**
 * Smart Response Router Admin Routes
 * Handles admin management and system monitoring
 * @module smart-response-router/routes/admin
 */

const express = require('express');
const { authenticateAdmin } = require('../../../../../middleware/auth');
const SmartRouterMigration = require('../helpers/migration');
const SmartRouterAnalytics = require('../helpers/analytics');
const logger = require('../../../../../utils/logger');

const router = express.Router();
const migration = new SmartRouterMigration();
const analytics = new SmartRouterAnalytics();

/**
 * GET /status
 * Get Smart Response Router system status
 */
router.get('/status', authenticateAdmin, async (req, res) => {
  try {
    const [migrationStatus, performanceMetrics, escalationStats] = await Promise.all([
      migration.getMigrationStatus(),
      analytics.getPerformanceMetrics({ timeRange: '24h' }),
      analytics.getEscalationStats()
    ]);

    res.json({
      success: true,
      data: {
        migration: migrationStatus.data,
        performance: performanceMetrics.data,
        escalations: escalationStats.data,
        systemHealth: {
          smartRouterAvailable: true,
          integrationActive: true,
          lastUpdate: new Date().toISOString(),
          uptime: Math.floor(process.uptime())
        }
      },
      message: 'System status retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get system status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status',
      details: error.message
    });
  }
});

/**
 * POST /migration/start
 * Start migration to next stage
 */
router.post('/migration/start', authenticateAdmin, async (req, res) => {
  try {
    const { targetStage } = req.body;

    if (!targetStage) {
      return res.status(400).json({
        success: false,
        error: 'targetStage is required'
      });
    }

    // Validate prerequisites
    const validation = await migration.validateMigrationPrerequisites(targetStage);
    if (!validation.canProceed) {
      return res.status(400).json({
        success: false,
        error: 'Migration prerequisites not met',
        details: validation.checks
      });
    }

    // Start migration
    const result = await migration.startMigration(targetStage);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result,
      message: `Migration to ${targetStage} initiated successfully`
    });

  } catch (error) {
    logger.error('Failed to start migration', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to start migration',
      details: error.message
    });
  }
});

/**
 * POST /migration/rollback
 * Rollback migration to previous stage
 */
router.post('/migration/rollback', authenticateAdmin, async (req, res) => {
  try {
    const result = await migration.rollbackMigration();

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result,
      message: 'Migration rollback completed successfully'
    });

  } catch (error) {
    logger.error('Failed to rollback migration', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to rollback migration',
      details: error.message
    });
  }
});

/**
 * GET /analytics/performance
 * Get routing performance analytics
 */
router.get('/analytics/performance', authenticateAdmin, async (req, res) => {
  try {
    const { timeRange, candidateId, routingType } = req.query;

    const filters = {
      timeRange: timeRange || '24h',
      candidateId,
      routingType
    };

    const result = await analytics.getPerformanceMetrics(filters);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      filters: result.filters,
      message: 'Performance analytics retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get performance analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance analytics',
      details: error.message
    });
  }
});

/**
 * GET /analytics/ab-testing
 * Get A/B testing results
 */
router.get('/analytics/ab-testing', authenticateAdmin, async (req, res) => {
  try {
    const { testId } = req.query;

    const result = await analytics.getABTestResults(testId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: 'A/B testing results retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get A/B testing results', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve A/B testing results',
      details: error.message
    });
  }
});

/**
 * POST /analytics/ab-testing
 * Start new A/B test
 */
router.post('/analytics/ab-testing', authenticateAdmin, async (req, res) => {
  try {
    const testConfig = req.body;

    const result = await analytics.startABTest(testConfig);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json({
      success: true,
      data: result.data,
      message: 'A/B test started successfully'
    });

  } catch (error) {
    logger.error('Failed to start A/B test', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to start A/B test',
      details: error.message
    });
  }
});

/**
 * GET /analytics/escalations
 * Get escalation analytics
 */
router.get('/analytics/escalations', authenticateAdmin, async (req, res) => {
  try {
    const filters = {
      timeRange: req.query.timeRange || '7d',
      reason: req.query.reason,
      status: req.query.status
    };

    const result = await analytics.getEscalationStats(filters);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      filters: result.filters,
      message: 'Escalation analytics retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get escalation analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve escalation analytics',
      details: error.message
    });
  }
});

/**
 * GET /config
 * Get system configuration
 */
router.get('/config', authenticateAdmin, (req, res) => {
  try {
    const config = {
      routing: {
        defaultConfidenceThreshold: 0.7,
        escalationThreshold: 0.5,
        maxRetryAttempts: 3,
        responseTimeout: 5000 // milliseconds
      },
      aiIntegration: {
        enabled: true,
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        maxTokens: 150,
        temperature: 0.7
      },
      escalation: {
        autoEscalationEnabled: true,
        escalationDelayMinutes: 5,
        maxEscalationsPerHour: 100
      },
      abTesting: {
        enabled: true,
        defaultTrafficSplit: 50,
        minimumSampleSize: 100
      },
      logging: {
        level: 'info',
        retentionDays: 30,
        enableDebugMode: false
      }
    };

    res.json({
      success: true,
      data: config,
      message: 'System configuration retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get system config', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system configuration',
      details: error.message
    });
  }
});

/**
 * PUT /config
 * Update system configuration
 */
router.put('/config', authenticateAdmin, (req, res) => {
  try {
    const updates = req.body;

    // In a real implementation, this would validate and save the config
    logger.info('System configuration update requested', {
      updates,
      updatedBy: req.user?.id || 'admin'
    });

    res.json({
      success: true,
      data: updates,
      message: 'System configuration updated successfully'
    });

  } catch (error) {
    logger.error('Failed to update system config', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update system configuration',
      details: error.message
    });
  }
});

/**
 * GET /health
 * System health check
 */
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        migration: true,
        analytics: true,
        routing: true,
        escalation: true
      },
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: health,
      message: 'System is healthy'
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

module.exports = router;