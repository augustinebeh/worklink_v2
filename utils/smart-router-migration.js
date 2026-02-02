/**
 * Smart Response Router Migration Utility
 *
 * Provides tools for managing the migration from the legacy AI chat system
 * to the Smart Response Router with A/B testing and performance monitoring.
 */

const { db } = require('../db');
const { createLogger } = require('./structured-logger');

const logger = createLogger('smart-router-migration');

class SmartRouterMigration {
  constructor() {
    this.migrationConfig = {
      phases: [
        { name: 'initial', rolloutPercentage: 10, duration: '2 days' },
        { name: 'pilot', rolloutPercentage: 25, duration: '3 days' },
        { name: 'expanded', rolloutPercentage: 50, duration: '5 days' },
        { name: 'majority', rolloutPercentage: 75, duration: '3 days' },
        { name: 'complete', rolloutPercentage: 100, duration: 'ongoing' }
      ],
      currentPhase: 'initial',
      canAutoAdvance: true,
      autoAdvanceThresholds: {
        minSuccessRate: 0.95,
        maxErrorRate: 0.02,
        minConfidenceImprovement: 0.05
      }
    };
  }

  /**
   * Initialize migration tracking
   */
  async initializeMigration() {
    try {
      // Create migration tracking table
      db.exec(`
        CREATE TABLE IF NOT EXISTS migration_phases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phase_name TEXT NOT NULL,
          rollout_percentage INTEGER NOT NULL,
          started_at DATETIME NOT NULL,
          ended_at DATETIME,
          auto_advanced INTEGER DEFAULT 0,
          success_rate REAL,
          error_rate REAL,
          confidence_improvement REAL,
          notes TEXT
        )
      `);

      // Create migration metrics table
      db.exec(`
        CREATE TABLE IF NOT EXISTS migration_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date DATE NOT NULL,
          smart_router_requests INTEGER DEFAULT 0,
          legacy_requests INTEGER DEFAULT 0,
          smart_router_successes INTEGER DEFAULT 0,
          legacy_successes INTEGER DEFAULT 0,
          smart_router_avg_confidence REAL DEFAULT 0,
          legacy_avg_confidence REAL DEFAULT 0,
          smart_router_avg_response_time INTEGER DEFAULT 0,
          legacy_avg_response_time INTEGER DEFAULT 0,
          escalation_rate REAL DEFAULT 0,
          user_satisfaction_score REAL DEFAULT 0
        )
      `);

      // Record initial phase
      await this.startMigrationPhase('initial', 10);

      logger.info('Smart Router migration initialized');

      return true;

    } catch (error) {
      logger.error('Failed to initialize migration', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Start a new migration phase
   */
  async startMigrationPhase(phaseName, rolloutPercentage) {
    try {
      // End current phase if exists
      const currentPhase = this.getCurrentPhase();
      if (currentPhase && !currentPhase.ended_at) {
        await this.endMigrationPhase(currentPhase.id);
      }

      // Start new phase
      const result = db.prepare(`
        INSERT INTO migration_phases (phase_name, rollout_percentage, started_at)
        VALUES (?, ?, ?)
      `).run(phaseName, rolloutPercentage, new Date().toISOString());

      // Update Smart Router Integration configuration
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      smartRouterIntegration.updateMigrationConfig({
        rolloutPercentage
      });

      logger.info('Migration phase started', {
        phaseName,
        rolloutPercentage,
        phaseId: result.lastInsertRowid
      });

      return result.lastInsertRowid;

    } catch (error) {
      logger.error('Failed to start migration phase', {
        phaseName,
        error: error.message
      });
      return null;
    }
  }

  /**
   * End current migration phase
   */
  async endMigrationPhase(phaseId, notes = null) {
    try {
      const metrics = await this.calculatePhaseMetrics(phaseId);

      db.prepare(`
        UPDATE migration_phases
        SET ended_at = ?,
            success_rate = ?,
            error_rate = ?,
            confidence_improvement = ?,
            notes = ?
        WHERE id = ?
      `).run(
        new Date().toISOString(),
        metrics.successRate,
        metrics.errorRate,
        metrics.confidenceImprovement,
        notes,
        phaseId
      );

      logger.info('Migration phase ended', {
        phaseId,
        metrics
      });

      return true;

    } catch (error) {
      logger.error('Failed to end migration phase', {
        phaseId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Check if we should advance to the next phase automatically
   */
  async checkAutoAdvancement() {
    if (!this.migrationConfig.canAutoAdvance) {
      return false;
    }

    try {
      const currentPhase = this.getCurrentPhase();
      if (!currentPhase) {
        return false;
      }

      const metrics = await this.calculatePhaseMetrics(currentPhase.id);
      const thresholds = this.migrationConfig.autoAdvanceThresholds;

      const shouldAdvance =
        metrics.successRate >= thresholds.minSuccessRate &&
        metrics.errorRate <= thresholds.maxErrorRate &&
        metrics.confidenceImprovement >= thresholds.minConfidenceImprovement;

      if (shouldAdvance) {
        const nextPhase = this.getNextPhase(currentPhase.phase_name);
        if (nextPhase) {
          logger.info('Auto-advancing migration phase', {
            currentPhase: currentPhase.phase_name,
            nextPhase: nextPhase.name,
            metrics
          });

          await this.endMigrationPhase(currentPhase.id, 'Auto-advanced based on performance metrics');
          await this.startMigrationPhase(nextPhase.name, nextPhase.rolloutPercentage);

          // Mark as auto-advanced
          db.prepare(`
            UPDATE migration_phases SET auto_advanced = 1 WHERE id = ?
          `).run(currentPhase.id);

          return true;
        }
      }

      return false;

    } catch (error) {
      logger.error('Failed to check auto advancement', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Calculate metrics for a migration phase
   */
  async calculatePhaseMetrics(phaseId) {
    try {
      const phase = db.prepare('SELECT * FROM migration_phases WHERE id = ?').get(phaseId);
      const startDate = phase.started_at;

      // Get performance data since phase started
      const performanceData = db.prepare(`
        SELECT
          system,
          COUNT(*) as total_requests,
          SUM(success) as successful_requests,
          AVG(confidence) as avg_confidence,
          AVG(response_time) as avg_response_time
        FROM performance_tracking
        WHERE created_at >= ?
        GROUP BY system
      `).all(startDate);

      const smartRouterData = performanceData.find(p => p.system === 'smart_router') || {};
      const legacyData = performanceData.find(p => p.system === 'legacy') || {};

      // Calculate success rates
      const smartSuccessRate = smartRouterData.total_requests > 0 ?
        smartRouterData.successful_requests / smartRouterData.total_requests : 0;
      const legacySuccessRate = legacyData.total_requests > 0 ?
        legacyData.successful_requests / legacyData.total_requests : 0;

      const successRate = Math.max(smartSuccessRate, legacySuccessRate);
      const errorRate = 1 - successRate;

      // Calculate confidence improvement
      const confidenceImprovement = (smartRouterData.avg_confidence || 0) -
                                   (legacyData.avg_confidence || 0);

      // Get escalation rate
      const escalationRate = await this.getEscalationRate(startDate);

      return {
        successRate,
        errorRate,
        confidenceImprovement,
        escalationRate,
        smartRouterRequests: smartRouterData.total_requests || 0,
        legacyRequests: legacyData.total_requests || 0,
        smartRouterAvgResponseTime: smartRouterData.avg_response_time || 0,
        legacyAvgResponseTime: legacyData.avg_response_time || 0
      };

    } catch (error) {
      logger.error('Failed to calculate phase metrics', {
        phaseId,
        error: error.message
      });
      return {
        successRate: 0,
        errorRate: 1,
        confidenceImprovement: 0,
        escalationRate: 0
      };
    }
  }

  /**
   * Get escalation rate since a given date
   */
  async getEscalationRate(sinceDate) {
    try {
      // Get total messages vs escalations since date
      const totalMessages = db.prepare(`
        SELECT COUNT(*) as count FROM messages
        WHERE created_at >= ? AND sender = 'candidate'
      `).get(sinceDate).count;

      const totalEscalations = db.prepare(`
        SELECT COUNT(*) as count FROM escalations
        WHERE created_at >= ?
      `).get(sinceDate).count;

      return totalMessages > 0 ? totalEscalations / totalMessages : 0;

    } catch (error) {
      logger.error('Failed to get escalation rate', {
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Get current migration phase
   */
  getCurrentPhase() {
    try {
      return db.prepare(`
        SELECT * FROM migration_phases
        WHERE ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1
      `).get();

    } catch (error) {
      logger.error('Failed to get current phase', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get next phase in the migration sequence
   */
  getNextPhase(currentPhaseName) {
    const currentIndex = this.migrationConfig.phases.findIndex(p => p.name === currentPhaseName);
    if (currentIndex >= 0 && currentIndex < this.migrationConfig.phases.length - 1) {
      return this.migrationConfig.phases[currentIndex + 1];
    }
    return null;
  }

  /**
   * Generate migration status report
   */
  async getMigrationStatus() {
    try {
      const currentPhase = this.getCurrentPhase();
      const allPhases = db.prepare(`
        SELECT * FROM migration_phases ORDER BY started_at DESC
      `).all();

      const recentMetrics = await this.getRecentMetrics();
      const smartRouterStats = require('../services/ai-chat/smart-router-integration')
        .getMigrationStats ? await require('../services/ai-chat/smart-router-integration')
        .getMigrationStats() : null;

      return {
        currentPhase: currentPhase ? {
          ...currentPhase,
          metrics: currentPhase.id ? await this.calculatePhaseMetrics(currentPhase.id) : null
        } : null,

        migrationHistory: allPhases,

        recentMetrics,

        smartRouterStats,

        canAutoAdvance: this.migrationConfig.canAutoAdvance,

        nextPhase: currentPhase ? this.getNextPhase(currentPhase.phase_name) : null,

        recommendations: await this.generateRecommendations()
      };

    } catch (error) {
      logger.error('Failed to get migration status', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get recent performance metrics
   */
  async getRecentMetrics() {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      return {
        performance: db.prepare(`
          SELECT
            system,
            COUNT(*) as total_requests,
            SUM(success) as successful_requests,
            AVG(confidence) as avg_confidence,
            AVG(response_time) as avg_response_time
          FROM performance_tracking
          WHERE created_at >= ?
          GROUP BY system
        `).all(last7Days),

        escalations: db.prepare(`
          SELECT
            priority,
            COUNT(*) as total,
            SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
          FROM escalations
          WHERE created_at >= ?
          GROUP BY priority
        `).all(last7Days),

        userSatisfaction: await this.calculateUserSatisfaction(last7Days)
      };

    } catch (error) {
      logger.error('Failed to get recent metrics', {
        error: error.message
      });
      return {};
    }
  }

  /**
   * Calculate user satisfaction (placeholder - would need feedback data)
   */
  async calculateUserSatisfaction(sinceDate) {
    // TODO: Implement based on actual user feedback data
    // For now, use proxy metrics
    try {
      const responseTime = db.prepare(`
        SELECT AVG(response_time) as avg_time
        FROM performance_tracking
        WHERE created_at >= ? AND system = 'smart_router'
      `).get(sinceDate).avg_time;

      const escalationRate = await this.getEscalationRate(sinceDate);

      // Simple scoring based on response time and escalation rate
      const timeScore = Math.max(0, 1 - (responseTime / 5000)); // 5 seconds = 0 score
      const escalationScore = Math.max(0, 1 - (escalationRate * 10)); // 10% escalation = 0 score

      return (timeScore + escalationScore) / 2;

    } catch (error) {
      return 0.5; // Neutral score
    }
  }

  /**
   * Generate recommendations based on current metrics
   */
  async generateRecommendations() {
    try {
      const currentPhase = this.getCurrentPhase();
      if (!currentPhase) {
        return ['Initialize migration tracking to begin the rollout process'];
      }

      const metrics = await this.calculatePhaseMetrics(currentPhase.id);
      const recommendations = [];

      // Performance-based recommendations
      if (metrics.successRate < 0.9) {
        recommendations.push('Success rate is below 90% - consider investigating Smart Router failures');
      }

      if (metrics.errorRate > 0.05) {
        recommendations.push('Error rate is above 5% - review error logs and consider rolling back');
      }

      if (metrics.confidenceImprovement < 0) {
        recommendations.push('Smart Router confidence is lower than legacy system - review intent classification');
      }

      if (metrics.escalationRate > 0.15) {
        recommendations.push('High escalation rate detected - review template responses and real data availability');
      }

      // Phase-specific recommendations
      const nextPhase = this.getNextPhase(currentPhase.phase_name);
      if (nextPhase && this.migrationConfig.canAutoAdvance) {
        if (metrics.successRate >= this.migrationConfig.autoAdvanceThresholds.minSuccessRate) {
          recommendations.push(`Performance meets thresholds - ready to advance to ${nextPhase.name} phase`);
        } else {
          recommendations.push('Performance below advancement thresholds - continue monitoring current phase');
        }
      }

      if (recommendations.length === 0) {
        recommendations.push('Migration is proceeding smoothly - continue monitoring');
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate recommendations', {
        error: error.message
      });
      return ['Unable to generate recommendations due to data access issues'];
    }
  }

  /**
   * Force rollback to legacy system
   */
  async forceRollback(reason) {
    try {
      logger.warn('Forcing rollback to legacy system', { reason });

      // Update Smart Router Integration to use 0% rollout
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      smartRouterIntegration.updateMigrationConfig({
        rolloutPercentage: 0,
        fallbackToOldSystem: true
      });

      // End current phase with rollback note
      const currentPhase = this.getCurrentPhase();
      if (currentPhase) {
        await this.endMigrationPhase(currentPhase.id, `Forced rollback: ${reason}`);
      }

      // Start rollback phase
      await this.startMigrationPhase('rollback', 0);

      logger.info('Rollback completed');
      return true;

    } catch (error) {
      logger.error('Failed to rollback', {
        reason,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Schedule periodic migration checks
   */
  startMigrationMonitoring() {
    // Check every hour for auto-advancement opportunities
    setInterval(async () => {
      try {
        await this.checkAutoAdvancement();
      } catch (error) {
        logger.error('Migration monitoring error', {
          error: error.message
        });
      }
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Migration monitoring started');
  }
}

module.exports = SmartRouterMigration;