/**
 * Smart Router Integration Layer
 *
 * This module provides a seamless integration between the existing AI chat system
 * and the new Smart Response Router, allowing for gradual migration and A/B testing.
 *
 * Key Features:
 * - Drop-in replacement for existing generateResponse function
 * - A/B testing for gradual rollout
 * - Performance monitoring and comparison
 * - Fallback mechanisms for reliability
 * - Migration tracking and analytics
 */

const SmartResponseRouter = require('../smart-response-router');
const { createLogger } = require('../../utils/structured-logger');
const { db } = require('../../db');

const logger = createLogger('smart-router-integration');

class SmartRouterIntegration {
  constructor() {
    this.smartRouter = new SmartResponseRouter();

    // Migration configuration
    this.migrationConfig = {
      // Rollout percentage (0-100)
      rolloutPercentage: 50, // Start with 50% for testing

      // A/B testing settings
      enableABTesting: true,
      comparisonMode: true, // Generate both responses for comparison

      // Performance thresholds
      performanceThresholds: {
        maxResponseTime: 5000, // 5 seconds max
        minConfidence: 0.3,    // Minimum confidence threshold
        errorRateThreshold: 0.05 // 5% error rate threshold
      },

      // Fallback settings
      fallbackToOldSystem: true,
      fallbackOnError: true,

      // Monitoring settings
      logAllComparisons: true,
      trackPerformance: true
    };

    // Initialize A/B testing tracking
    this.initializeABTesting();
  }

  /**
   * Main integration point - replaces existing generateResponse function
   */
  async generateResponse(candidateId, message, options = {}) {
    const startTime = Date.now();

    try {
      logger.info('Smart Router Integration processing request', {
        candidateId,
        messageLength: message.length,
        mode: options.mode
      });

      // Determine which system to use
      const useSmartRouter = this.shouldUseSmartRouter(candidateId);

      if (this.migrationConfig.comparisonMode && this.migrationConfig.enableABTesting) {
        // A/B testing mode - generate both responses
        return await this.runABComparison(candidateId, message, options);
      }

      if (useSmartRouter) {
        // Use Smart Response Router
        return await this.useSmartRouter(candidateId, message, options);
      } else {
        // Use legacy AI chat system
        return await this.useLegacySystem(candidateId, message, options);
      }

    } catch (error) {
      logger.error('Smart Router Integration error', {
        candidateId,
        error: error.message
      });

      // Fallback to legacy system on error
      if (this.migrationConfig.fallbackOnError) {
        return await this.useLegacySystem(candidateId, message, options);
      }

      throw error;
    }
  }

  /**
   * Run A/B testing comparison between old and new systems
   */
  async runABComparison(candidateId, message, options) {
    const startTime = Date.now();

    try {
      logger.debug('Running A/B comparison', { candidateId });

      // Run both systems in parallel
      const [smartRouterResponse, legacyResponse] = await Promise.allSettled([
        this.useSmartRouter(candidateId, message, { ...options, abTesting: true }),
        this.useLegacySystem(candidateId, message, { ...options, abTesting: true })
      ]);

      const comparisonTime = Date.now() - startTime;

      // Process results
      const smartResult = smartRouterResponse.status === 'fulfilled' ?
        smartRouterResponse.value : null;
      const legacyResult = legacyResponse.status === 'fulfilled' ?
        legacyResponse.value : null;

      // Log comparison for analysis
      await this.logABComparison(candidateId, message, smartResult, legacyResult, comparisonTime);

      // Decide which response to use
      const selectedResponse = this.selectBestResponse(smartResult, legacyResult, candidateId);

      logger.info('A/B comparison complete', {
        candidateId,
        selectedSystem: selectedResponse.source,
        comparisonTime: `${comparisonTime}ms`
      });

      return {
        ...selectedResponse,
        abTesting: {
          smartRouterWorked: !!smartResult,
          legacyWorked: !!legacyResult,
          selectedSystem: selectedResponse.source,
          comparisonTime
        }
      };

    } catch (error) {
      logger.error('A/B comparison failed', {
        candidateId,
        error: error.message
      });

      // Fallback to legacy system
      return await this.useLegacySystem(candidateId, message, options);
    }
  }

  /**
   * Use Smart Response Router
   */
  async useSmartRouter(candidateId, message, options) {
    const startTime = Date.now();

    try {
      logger.debug('Using Smart Response Router', { candidateId });

      const response = await this.smartRouter.processMessage(candidateId, message, options);

      const responseTime = Date.now() - startTime;

      // Track performance
      if (this.migrationConfig.trackPerformance) {
        this.trackPerformance('smart_router', responseTime, true, response);
      }

      return {
        ...response,
        systemUsed: 'smart_router',
        migrationInfo: {
          version: '2.0',
          system: 'smart_router'
        }
      };

    } catch (error) {
      logger.error('Smart Router failed', {
        candidateId,
        error: error.message
      });

      // Track failure
      if (this.migrationConfig.trackPerformance) {
        this.trackPerformance('smart_router', Date.now() - startTime, false, null);
      }

      if (this.migrationConfig.fallbackToOldSystem) {
        logger.info('Falling back to legacy system', { candidateId });
        return await this.useLegacySystem(candidateId, message, options);
      }

      throw error;
    }
  }

  /**
   * Use legacy AI chat system
   */
  async useLegacySystem(candidateId, message, options) {
    const startTime = Date.now();

    try {
      logger.debug('Using legacy AI chat system', { candidateId });

      const legacyAIChat = require('./index');
      const response = await legacyAIChat.generateResponse(candidateId, message, options);

      const responseTime = Date.now() - startTime;

      // Track performance
      if (this.migrationConfig.trackPerformance) {
        this.trackPerformance('legacy', responseTime, true, response);
      }

      return {
        ...response,
        systemUsed: 'legacy',
        migrationInfo: {
          version: '1.0',
          system: 'legacy'
        }
      };

    } catch (error) {
      logger.error('Legacy system failed', {
        candidateId,
        error: error.message
      });

      // Track failure
      if (this.migrationConfig.trackPerformance) {
        this.trackPerformance('legacy', Date.now() - startTime, false, null);
      }

      throw error;
    }
  }

  /**
   * Determine whether to use Smart Router for this candidate
   */
  shouldUseSmartRouter(candidateId) {
    // Check global rollout percentage
    if (this.migrationConfig.rolloutPercentage === 0) {
      return false;
    }

    if (this.migrationConfig.rolloutPercentage >= 100) {
      return true;
    }

    // Use consistent hash-based selection for A/B testing
    const hash = this.hashString(candidateId);
    const percentage = hash % 100;

    return percentage < this.migrationConfig.rolloutPercentage;
  }

  /**
   * Select best response from A/B comparison
   */
  selectBestResponse(smartResult, legacyResult, candidateId) {
    // If one system failed, use the working one
    if (!smartResult && legacyResult) {
      logger.debug('Using legacy - smart router failed', { candidateId });
      return { ...legacyResult, selectedReason: 'smart_router_failed' };
    }

    if (!legacyResult && smartResult) {
      logger.debug('Using smart router - legacy failed', { candidateId });
      return { ...smartResult, selectedReason: 'legacy_failed' };
    }

    // If both failed, return error
    if (!smartResult && !legacyResult) {
      logger.error('Both systems failed', { candidateId });
      return this.generateFailsafeResponse(candidateId);
    }

    // Both systems worked - apply selection logic
    return this.applySelectionLogic(smartResult, legacyResult, candidateId);
  }

  /**
   * Apply logic to select between two working responses
   */
  applySelectionLogic(smartResult, legacyResult, candidateId) {
    // Priority 1: CRITICAL - Use smart router for pending candidates with SLM bridge
    if (smartResult.isPendingUser && smartResult.slmBridgeUsed) {
      logger.info('Using smart router - pending candidate with SLM bridge', {
        candidateId,
        hasSchedulingContext: !!smartResult.schedulingContext
      });
      return { ...smartResult, selectedReason: 'pending_candidate_slm_bridge' };
    }

    // Priority 2: Use smart router for ANY pending candidate (SLM is critical for them)
    if (smartResult.isPendingUser) {
      logger.info('Using smart router - pending candidate optimization', { candidateId });
      return { ...smartResult, selectedReason: 'pending_candidate_optimization' };
    }

    // Priority 3: Avoid smart router if SLM bridge failed for pending candidates
    if (smartResult.escalated && smartResult.escalationReason?.includes('slm_bridge')) {
      logger.warn('Smart router escalated due to SLM bridge failure, using legacy', { candidateId });
      return { ...legacyResult, selectedReason: 'slm_bridge_failure_fallback' };
    }

    // Priority 4: Use smart router if it has higher confidence
    if (smartResult.confidence > legacyResult.confidence + 0.1) {
      logger.debug('Using smart router - higher confidence', { candidateId });
      return { ...smartResult, selectedReason: 'higher_confidence' };
    }

    // Priority 5: Use smart router if it uses real data
    if (smartResult.usesRealData && !legacyResult.usesRealData) {
      logger.debug('Using smart router - real data', { candidateId });
      return { ...smartResult, selectedReason: 'uses_real_data' };
    }

    // Priority 6: Use smart router if legacy response has problematic content
    if (this.hasProblematicContent(legacyResult.content)) {
      logger.debug('Using smart router - legacy has problematic content', { candidateId });
      return { ...smartResult, selectedReason: 'legacy_problematic_content' };
    }

    // Default: Use the system selected by rollout percentage
    const useSmartRouter = this.shouldUseSmartRouter(candidateId);
    const selectedResponse = useSmartRouter ? smartResult : legacyResult;
    const selectedReason = useSmartRouter ? 'rollout_selection' : 'legacy_selection';

    logger.debug(`Using ${useSmartRouter ? 'smart router' : 'legacy'} - rollout selection`, { candidateId });

    return { ...selectedResponse, selectedReason };
  }

  /**
   * Check if content has problematic phrases
   */
  hasProblematicContent(content) {
    const problematicPhrases = [
      'will arrive within',
      'automatic approval',
      'guaranteed payment',
      'your funds will be',
      'will be processed in',
      'should receive within',
      'automatically approved',
      'instant approval',
      'within 24 hours',
      'completely free'
    ];

    return problematicPhrases.some(phrase =>
      content.toLowerCase().includes(phrase)
    );
  }

  /**
   * Generate failsafe response when both systems fail
   */
  generateFailsafeResponse(candidateId) {
    return {
      content: "I'm experiencing technical difficulties right now. Our admin team has been notified and will get back to you shortly to help with your question.",
      source: 'failsafe',
      confidence: 1.0,
      intent: 'error_handling',
      error: true,
      escalated: true,
      requiresAdminAttention: true,
      systemUsed: 'failsafe',
      selectedReason: 'both_systems_failed'
    };
  }

  /**
   * Log A/B comparison results for analysis
   */
  async logABComparison(candidateId, message, smartResult, legacyResult, comparisonTime) {
    if (!this.migrationConfig.logAllComparisons) {
      return;
    }

    try {
      const comparisonData = {
        candidateId,
        messageHash: this.hashString(message),
        smartRouterSuccess: !!smartResult,
        legacySuccess: !!legacyResult,
        smartRouterConfidence: smartResult?.confidence || 0,
        legacyConfidence: legacyResult?.confidence || 0,
        smartRouterSource: smartResult?.source || null,
        legacySource: legacyResult?.source || null,
        smartRouterUsesRealData: smartResult?.usesRealData || false,
        legacyUsesRealData: legacyResult?.usesRealData || false,
        comparisonTime,
        timestamp: new Date().toISOString()
      };

      // Store in database for analysis
      db.prepare(`
        INSERT OR IGNORE INTO ab_comparison_logs
        (candidate_id, message_hash, smart_router_success, legacy_success,
         smart_router_confidence, legacy_confidence, smart_router_source, legacy_source,
         smart_router_uses_real_data, legacy_uses_real_data, comparison_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        comparisonData.candidateId,
        comparisonData.messageHash,
        comparisonData.smartRouterSuccess ? 1 : 0,
        comparisonData.legacySuccess ? 1 : 0,
        comparisonData.smartRouterConfidence,
        comparisonData.legacyConfidence,
        comparisonData.smartRouterSource,
        comparisonData.legacySource,
        comparisonData.smartRouterUsesRealData ? 1 : 0,
        comparisonData.legacyUsesRealData ? 1 : 0,
        comparisonData.comparisonTime,
        comparisonData.timestamp
      );

      logger.debug('A/B comparison logged', {
        candidateId,
        smartWorked: comparisonData.smartRouterSuccess,
        legacyWorked: comparisonData.legacySuccess
      });

    } catch (error) {
      logger.error('Failed to log A/B comparison', {
        candidateId,
        error: error.message
      });
    }
  }

  /**
   * Track performance metrics
   */
  trackPerformance(system, responseTime, success, response) {
    try {
      // Store performance data
      db.prepare(`
        INSERT INTO performance_tracking
        (system, response_time, success, confidence, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        system,
        responseTime,
        success ? 1 : 0,
        response?.confidence || 0,
        response?.source || null,
        new Date().toISOString()
      );

    } catch (error) {
      logger.error('Failed to track performance', {
        system,
        error: error.message
      });
    }
  }

  /**
   * Initialize A/B testing infrastructure
   */
  async initializeABTesting() {
    try {
      // Create A/B comparison logs table
      db.exec(`
        CREATE TABLE IF NOT EXISTS ab_comparison_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message_hash TEXT NOT NULL,
          smart_router_success INTEGER DEFAULT 0,
          legacy_success INTEGER DEFAULT 0,
          smart_router_confidence REAL DEFAULT 0,
          legacy_confidence REAL DEFAULT 0,
          smart_router_source TEXT,
          legacy_source TEXT,
          smart_router_uses_real_data INTEGER DEFAULT 0,
          legacy_uses_real_data INTEGER DEFAULT 0,
          comparison_time INTEGER DEFAULT 0,
          created_at DATETIME NOT NULL,
          UNIQUE(candidate_id, message_hash)
        )
      `);

      // Create performance tracking table
      db.exec(`
        CREATE TABLE IF NOT EXISTS performance_tracking (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          system TEXT NOT NULL,
          response_time INTEGER NOT NULL,
          success INTEGER DEFAULT 0,
          confidence REAL DEFAULT 0,
          source TEXT,
          created_at DATETIME NOT NULL
        )
      `);

      // Initialize Smart Response Router decision logging
      await this.smartRouter.initializeDecisionLogging();

      logger.info('A/B testing infrastructure initialized');

    } catch (error) {
      logger.error('Failed to initialize A/B testing', {
        error: error.message
      });
    }
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats() {
    try {
      const stats = {
        config: this.migrationConfig,
        abComparisons: db.prepare(`
          SELECT COUNT(*) as total_comparisons,
                 SUM(smart_router_success) as smart_router_successes,
                 SUM(legacy_success) as legacy_successes,
                 AVG(smart_router_confidence) as avg_smart_confidence,
                 AVG(legacy_confidence) as avg_legacy_confidence,
                 AVG(comparison_time) as avg_comparison_time
          FROM ab_comparison_logs
          WHERE created_at > datetime('now', '-7 days')
        `).get(),

        performance: db.prepare(`
          SELECT system,
                 COUNT(*) as total_requests,
                 SUM(success) as successful_requests,
                 AVG(response_time) as avg_response_time,
                 AVG(confidence) as avg_confidence
          FROM performance_tracking
          WHERE created_at > datetime('now', '-7 days')
          GROUP BY system
        `).all(),

        smartRouterMetrics: await this.smartRouter.getPerformanceMetrics()
      };

      return stats;

    } catch (error) {
      logger.error('Failed to get migration stats', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Update migration configuration
   */
  updateMigrationConfig(newConfig) {
    this.migrationConfig = { ...this.migrationConfig, ...newConfig };

    logger.info('Migration configuration updated', {
      rolloutPercentage: this.migrationConfig.rolloutPercentage,
      enableABTesting: this.migrationConfig.enableABTesting,
      comparisonMode: this.migrationConfig.comparisonMode
    });
  }

  /**
   * Hash string for consistent A/B testing
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
const smartRouterIntegration = new SmartRouterIntegration();

module.exports = {
  SmartRouterIntegration,
  // Export the main function for easy integration
  generateResponse: smartRouterIntegration.generateResponse.bind(smartRouterIntegration),
  getMigrationStats: smartRouterIntegration.getMigrationStats.bind(smartRouterIntegration),
  updateMigrationConfig: smartRouterIntegration.updateMigrationConfig.bind(smartRouterIntegration)
};