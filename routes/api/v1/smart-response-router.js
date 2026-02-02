/**
 * Smart Response Router Admin API
 *
 * Provides admin endpoints for managing the Smart Response Router system:
 * - Migration management and monitoring
 * - Performance analytics and statistics
 * - A/B testing configuration
 * - Escalation management
 * - System health monitoring
 */

const express = require('express');
const { requireAuth, requireAdminRole } = require('../../../middleware/auth');
const SmartRouterMigration = require('../../../utils/smart-router-migration');
const { createLogger } = require('../../../utils/structured-logger');

const router = express.Router();
const logger = createLogger('smart-router-api');
const migration = new SmartRouterMigration();

/**
 * Get Smart Response Router system status
 */
router.get('/status', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const migrationStatus = await migration.getMigrationStatus();
    const smartRouterIntegration = require('../../../services/ai-chat/smart-router-integration');
    const migrationStats = await smartRouterIntegration.getMigrationStats();

    // Get escalation statistics
    const AdminEscalationSystem = require('../../../services/smart-response-router/admin-escalation');
    const escalationSystem = new AdminEscalationSystem();
    const escalationStats = await escalationSystem.getEscalationStats();

    res.json({
      success: true,
      data: {
        migration: migrationStatus,
        statistics: migrationStats,
        escalations: escalationStats,
        systemHealth: {
          smartRouterAvailable: true,
          integrationActive: true,
          lastUpdate: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get system status', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system status'
    });
  }
});

/**
 * Get performance metrics
 */
router.get('/metrics', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { period = '7d', system = 'all' } = req.query;

    const SmartResponseRouter = require('../../../services/smart-response-router');
    const router = new SmartResponseRouter();
    const metrics = await router.getPerformanceMetrics();

    const smartRouterIntegration = require('../../../services/ai-chat/smart-router-integration');
    const migrationStats = await smartRouterIntegration.getMigrationStats();

    res.json({
      success: true,
      data: {
        period,
        system,
        smartRouterMetrics: metrics,
        migrationMetrics: migrationStats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get metrics', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
    });
  }
});

/**
 * Update migration configuration
 */
router.put('/migration/config', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { rolloutPercentage, enableABTesting, comparisonMode, fallbackToOldSystem } = req.body;

    // Validate rollout percentage
    if (rolloutPercentage !== undefined) {
      if (typeof rolloutPercentage !== 'number' || rolloutPercentage < 0 || rolloutPercentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'Rollout percentage must be a number between 0 and 100'
        });
      }
    }

    const smartRouterIntegration = require('../../../services/ai-chat/smart-router-integration');
    smartRouterIntegration.updateMigrationConfig({
      rolloutPercentage,
      enableABTesting,
      comparisonMode,
      fallbackToOldSystem
    });

    logger.info('Migration configuration updated', {
      rolloutPercentage,
      enableABTesting,
      comparisonMode,
      fallbackToOldSystem,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Migration configuration updated successfully',
      config: {
        rolloutPercentage,
        enableABTesting,
        comparisonMode,
        fallbackToOldSystem
      }
    });

  } catch (error) {
    logger.error('Failed to update migration config', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update migration configuration'
    });
  }
});

/**
 * Advance migration to next phase
 */
router.post('/migration/advance', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { force = false } = req.body;

    const currentPhase = migration.getCurrentPhase();
    if (!currentPhase) {
      return res.status(400).json({
        success: false,
        error: 'No active migration phase found'
      });
    }

    const nextPhase = migration.getNextPhase(currentPhase.phase_name);
    if (!nextPhase) {
      return res.status(400).json({
        success: false,
        error: 'Already at the final migration phase'
      });
    }

    let canAdvance = force;

    if (!force) {
      // Check if metrics allow advancement
      const metrics = await migration.calculatePhaseMetrics(currentPhase.id);
      canAdvance = metrics.successRate >= 0.95 && metrics.errorRate <= 0.02;
    }

    if (!canAdvance) {
      return res.status(400).json({
        success: false,
        error: 'Current phase metrics do not meet advancement thresholds. Use force=true to override.'
      });
    }

    // End current phase and start next phase
    await migration.endMigrationPhase(currentPhase.id, `Manually advanced by admin ${req.user.id}`);
    const newPhaseId = await migration.startMigrationPhase(nextPhase.name, nextPhase.rolloutPercentage);

    logger.info('Migration phase advanced', {
      fromPhase: currentPhase.phase_name,
      toPhase: nextPhase.name,
      force,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      message: `Advanced from ${currentPhase.phase_name} to ${nextPhase.name} phase`,
      newPhase: {
        id: newPhaseId,
        name: nextPhase.name,
        rolloutPercentage: nextPhase.rolloutPercentage
      }
    });

  } catch (error) {
    logger.error('Failed to advance migration phase', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to advance migration phase'
    });
  }
});

/**
 * Rollback to legacy system
 */
router.post('/migration/rollback', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rollback reason is required'
      });
    }

    const success = await migration.forceRollback(`${reason} (Admin: ${req.user.id})`);

    if (success) {
      logger.warn('Migration rolled back by admin', {
        reason,
        adminId: req.user?.id
      });

      res.json({
        success: true,
        message: 'Successfully rolled back to legacy system',
        reason
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to rollback migration'
      });
    }

  } catch (error) {
    logger.error('Failed to rollback migration', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to rollback migration'
    });
  }
});

/**
 * Get escalations dashboard data
 */
router.get('/escalations', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { priority, department, status = 'open' } = req.query;

    const AdminEscalationSystem = require('../../../services/smart-response-router/admin-escalation');
    const escalationSystem = new AdminEscalationSystem();

    const [pendingEscalations, escalationStats] = await Promise.all([
      escalationSystem.getPendingEscalations(priority, department),
      escalationSystem.getEscalationStats()
    ]);

    res.json({
      success: true,
      data: {
        pending: pendingEscalations,
        statistics: escalationStats,
        filters: {
          priority,
          department,
          status
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get escalations', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve escalations'
    });
  }
});

/**
 * Resolve an escalation
 */
router.put('/escalations/:id/resolve', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { response, notes } = req.body;

    if (!response) {
      return res.status(400).json({
        success: false,
        error: 'Admin response is required'
      });
    }

    const AdminEscalationSystem = require('../../../services/smart-response-router/admin-escalation');
    const escalationSystem = new AdminEscalationSystem();

    const success = await escalationSystem.resolveEscalation(
      id,
      response,
      `${notes || ''} (Resolved by Admin: ${req.user.id})`
    );

    if (success) {
      logger.info('Escalation resolved', {
        escalationId: id,
        adminId: req.user?.id
      });

      res.json({
        success: true,
        message: 'Escalation resolved successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to resolve escalation'
      });
    }

  } catch (error) {
    logger.error('Failed to resolve escalation', {
      escalationId: req.params.id,
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to resolve escalation'
    });
  }
});

/**
 * Test Smart Response Router with a sample message
 */
router.post('/test', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { candidateId, message } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required'
      });
    }

    const SmartResponseRouter = require('../../../services/smart-response-router');
    const router = new SmartResponseRouter();

    const response = await router.processMessage(candidateId, message, { testMode: true });

    logger.info('Smart Response Router test completed', {
      candidateId,
      messageLength: message.length,
      responseSource: response.source,
      adminId: req.user?.id
    });

    res.json({
      success: true,
      data: {
        input: { candidateId, message },
        response,
        testMode: true
      }
    });

  } catch (error) {
    logger.error('Smart Response Router test failed', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Smart Response Router test failed',
      details: error.message
    });
  }
});

/**
 * Get A/B testing comparison data
 */
router.get('/ab-testing', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const { db } = require('../../../db');

    const comparisons = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total_comparisons,
        AVG(smart_router_success) as smart_router_success_rate,
        AVG(legacy_success) as legacy_success_rate,
        AVG(smart_router_confidence) as avg_smart_confidence,
        AVG(legacy_confidence) as avg_legacy_confidence,
        AVG(comparison_time) as avg_comparison_time
      FROM ab_comparison_logs
      WHERE created_at > datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_comparisons,
        AVG(smart_router_success) as overall_smart_success_rate,
        AVG(legacy_success) as overall_legacy_success_rate,
        AVG(smart_router_confidence) as overall_smart_confidence,
        AVG(legacy_confidence) as overall_legacy_confidence,
        COUNT(CASE WHEN smart_router_success > legacy_success THEN 1 END) as smart_router_wins,
        COUNT(CASE WHEN legacy_success > smart_router_success THEN 1 END) as legacy_wins
      FROM ab_comparison_logs
      WHERE created_at > datetime('now', '-${days} days')
    `).get();

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        summary,
        dailyBreakdown: comparisons,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get A/B testing data', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve A/B testing data'
    });
  }
});

/**
 * Initialize migration if not already started
 */
router.post('/migration/initialize', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const currentPhase = migration.getCurrentPhase();
    if (currentPhase) {
      return res.status(400).json({
        success: false,
        error: 'Migration is already initialized',
        currentPhase: currentPhase.phase_name
      });
    }

    const success = await migration.initializeMigration();

    if (success) {
      logger.info('Migration initialized by admin', {
        adminId: req.user?.id
      });

      res.json({
        success: true,
        message: 'Migration initialized successfully',
        initialPhase: 'initial',
        rolloutPercentage: 10
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize migration'
      });
    }

  } catch (error) {
    logger.error('Failed to initialize migration', {
      error: error.message,
      adminId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Failed to initialize migration'
    });
  }
});

module.exports = router;