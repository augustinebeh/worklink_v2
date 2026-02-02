#!/usr/bin/env node

/**
 * Smart Response Router Deployment Script
 *
 * This script handles the complete deployment and migration process for the
 * Smart Response Router system, including:
 *
 * 1. Database schema updates
 * 2. Initial configuration setup
 * 3. Migration phase initialization
 * 4. Monitoring setup
 * 5. Health checks and validation
 * 6. Rollback procedures if needed
 */

const path = require('path');
const { db } = require('../db');
const { createLogger } = require('../utils/structured-logger');
const SmartRouterMigration = require('../utils/smart-router-migration');

const logger = createLogger('smart-router-deployment');

class SmartResponseRouterDeployment {
  constructor() {
    this.migration = new SmartRouterMigration();
    this.deploymentConfig = {
      initialRolloutPercentage: 10,
      validationChecks: true,
      autoMonitoring: true,
      rollbackOnFailure: true
    };
  }

  /**
   * Main deployment orchestration
   */
  async deploy() {
    try {
      logger.info('Starting Smart Response Router deployment');

      // Step 1: Validate environment and prerequisites
      await this.validatePrerequisites();

      // Step 2: Update database schema
      await this.updateDatabaseSchema();

      // Step 3: Initialize Smart Response Router components
      await this.initializeComponents();

      // Step 4: Run system validation tests
      await this.runValidationTests();

      // Step 5: Initialize migration tracking
      await this.initializeMigration();

      // Step 6: Start monitoring
      await this.setupMonitoring();

      // Step 7: Final health check
      await this.finalHealthCheck();

      logger.info('Smart Response Router deployment completed successfully');

      return {
        success: true,
        message: 'Smart Response Router deployed successfully',
        initialRollout: this.deploymentConfig.initialRolloutPercentage,
        monitoringActive: true
      };

    } catch (error) {
      logger.error('Deployment failed', {
        error: error.message,
        stack: error.stack
      });

      // Attempt rollback if configured
      if (this.deploymentConfig.rollbackOnFailure) {
        await this.rollback('Deployment failure');
      }

      throw error;
    }
  }

  /**
   * Validate prerequisites for deployment
   */
  async validatePrerequisites() {
    logger.info('Validating deployment prerequisites');

    // Check database connectivity
    const dbTest = db.prepare('SELECT 1 as test').get();
    if (dbTest.test !== 1) {
      throw new Error('Database connectivity check failed');
    }

    // Check required tables exist
    const requiredTables = ['candidates', 'messages', 'payments', 'jobs'];
    for (const table of requiredTables) {
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
      `).get(table);

      if (!tableExists) {
        throw new Error(`Required table '${table}' does not exist`);
      }
    }

    // Check AI chat service is available
    try {
      const aiChat = require('../services/ai-chat');
      if (!aiChat.generateResponse) {
        throw new Error('AI chat service not properly loaded');
      }
    } catch (error) {
      throw new Error(`AI chat service unavailable: ${error.message}`);
    }

    // Validate environment variables
    const requiredEnvVars = ['NODE_ENV'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        logger.warn(`Environment variable ${envVar} not set`);
      }
    }

    logger.info('Prerequisites validation passed');
  }

  /**
   * Update database schema for Smart Response Router
   */
  async updateDatabaseSchema() {
    logger.info('Updating database schema for Smart Response Router');

    try {
      // Smart Router decision logging
      db.exec(`
        CREATE TABLE IF NOT EXISTS smart_router_decisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message_hash TEXT NOT NULL,
          intent TEXT NOT NULL,
          confidence REAL NOT NULL,
          response_source TEXT NOT NULL,
          escalated INTEGER DEFAULT 0,
          uses_real_data INTEGER DEFAULT 0,
          created_at DATETIME NOT NULL
        )
      `);

      // A/B testing comparison logs
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

      // Performance tracking
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

      // Escalations table
      db.exec(`
        CREATE TABLE IF NOT EXISTS escalations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message_content TEXT NOT NULL,
          original_intent TEXT,
          escalation_reason TEXT,
          category TEXT NOT NULL,
          priority TEXT NOT NULL,
          department TEXT,
          assigned_admin TEXT,
          status TEXT DEFAULT 'open',
          response_target_time DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME,
          admin_response TEXT,
          resolution_notes TEXT
        )
      `);

      // Migration tracking tables
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

      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_smart_router_decisions_candidate
        ON smart_router_decisions(candidate_id, created_at)
      `);

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_escalations_status_priority
        ON escalations(status, priority, created_at)
      `);

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_performance_tracking_system
        ON performance_tracking(system, created_at)
      `);

      logger.info('Database schema updated successfully');

    } catch (error) {
      logger.error('Database schema update failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize Smart Response Router components
   */
  async initializeComponents() {
    logger.info('Initializing Smart Response Router components');

    try {
      // Initialize Smart Response Router
      const SmartResponseRouter = require('../services/smart-response-router');
      const smartRouter = new SmartResponseRouter();
      await smartRouter.initializeDecisionLogging();

      // Initialize migration tracking
      await this.migration.initializeMigration();

      // Validate all components load correctly
      const IntentClassificationEngine = require('../services/smart-response-router/intent-classification');
      const RealDataAccessLayer = require('../services/smart-response-router/real-data-access');
      const FactBasedTemplateSystem = require('../services/smart-response-router/fact-based-templates');
      const AdminEscalationSystem = require('../services/smart-response-router/admin-escalation');

      // Test component initialization
      new IntentClassificationEngine();
      new RealDataAccessLayer();
      new FactBasedTemplateSystem();
      new AdminEscalationSystem();

      // Test Smart Router Integration
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      await smartRouterIntegration.generateResponse('test_init', 'Hello', { testMode: true });

      logger.info('All Smart Response Router components initialized successfully');

    } catch (error) {
      logger.error('Component initialization failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Run validation tests to ensure system is working
   */
  async runValidationTests() {
    if (!this.deploymentConfig.validationChecks) {
      logger.info('Validation checks disabled, skipping');
      return;
    }

    logger.info('Running deployment validation tests');

    try {
      // Test basic functionality
      const SmartResponseRouter = require('../services/smart-response-router');
      const smartRouter = new SmartResponseRouter();

      // Test with a simple greeting
      const greetingResponse = await smartRouter.processMessage(
        'deployment_test_candidate',
        'Hello',
        { testMode: true }
      );

      if (!greetingResponse.content) {
        throw new Error('Smart Router failed to generate response for greeting');
      }

      // Test intent classification
      const IntentClassificationEngine = require('../services/smart-response-router/intent-classification');
      const classifier = new IntentClassificationEngine();

      const intentResult = await classifier.analyzeMessage(
        'When will I get paid?',
        { id: 'test', name: 'Test', status: 'active' }
      );

      if (intentResult.primary !== 'payment_inquiry') {
        throw new Error('Intent classification not working correctly');
      }

      // Test escalation system
      const AdminEscalationSystem = require('../services/smart-response-router/admin-escalation');
      const escalationSystem = new AdminEscalationSystem();

      const escalationResponse = await escalationSystem.createEscalation(
        { id: 'test', name: 'Test', status: 'active' },
        'This is a test escalation',
        { primary: 'general_question', escalationReason: 'test' }
      );

      if (!escalationResponse.escalated) {
        throw new Error('Escalation system not working correctly');
      }

      // Test A/B integration
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      const abTestResponse = await smartRouterIntegration.generateResponse(
        'deployment_test_candidate',
        'Hello',
        { testMode: true }
      );

      if (!abTestResponse.systemUsed) {
        throw new Error('A/B testing integration not working correctly');
      }

      logger.info('All validation tests passed');

    } catch (error) {
      logger.error('Validation tests failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize migration with initial rollout percentage
   */
  async initializeMigration() {
    logger.info('Initializing migration process');

    try {
      // Check if migration is already initialized
      const currentPhase = this.migration.getCurrentPhase();
      if (currentPhase) {
        logger.info('Migration already initialized', {
          currentPhase: currentPhase.phase_name,
          rolloutPercentage: currentPhase.rollout_percentage
        });
        return;
      }

      // Start initial migration phase
      await this.migration.startMigrationPhase('initial', this.deploymentConfig.initialRolloutPercentage);

      // Configure Smart Router Integration
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      smartRouterIntegration.updateMigrationConfig({
        rolloutPercentage: this.deploymentConfig.initialRolloutPercentage,
        enableABTesting: true,
        comparisonMode: true,
        fallbackToOldSystem: true
      });

      logger.info('Migration initialized', {
        initialPhase: 'initial',
        rolloutPercentage: this.deploymentConfig.initialRolloutPercentage
      });

    } catch (error) {
      logger.error('Migration initialization failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Setup monitoring and alerting
   */
  async setupMonitoring() {
    if (!this.deploymentConfig.autoMonitoring) {
      logger.info('Auto-monitoring disabled, skipping');
      return;
    }

    logger.info('Setting up Smart Response Router monitoring');

    try {
      // Start migration monitoring
      this.migration.startMigrationMonitoring();

      // Setup performance monitoring
      setInterval(async () => {
        try {
          const smartRouter = new (require('../services/smart-response-router'))();
          const metrics = await smartRouter.getPerformanceMetrics();

          if (metrics && metrics.totalEscalations > metrics.totalResponses * 0.2) {
            logger.warn('High escalation rate detected', {
              escalationRate: metrics.totalEscalations / metrics.totalResponses,
              threshold: 0.2
            });
          }

        } catch (error) {
          logger.error('Performance monitoring error', {
            error: error.message
          });
        }
      }, 5 * 60 * 1000); // Every 5 minutes

      logger.info('Monitoring setup completed');

    } catch (error) {
      logger.error('Monitoring setup failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Run final health check
   */
  async finalHealthCheck() {
    logger.info('Running final deployment health check');

    try {
      // Check migration status
      const migrationStatus = await this.migration.getMigrationStatus();
      if (!migrationStatus.currentPhase) {
        throw new Error('Migration not properly initialized');
      }

      // Check Smart Router Integration
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      const migrationStats = await smartRouterIntegration.getMigrationStats();

      if (!migrationStats) {
        throw new Error('Smart Router Integration not functioning');
      }

      // Test end-to-end functionality
      const testResponse = await smartRouterIntegration.generateResponse(
        'health_check_candidate',
        'Health check test message',
        { testMode: true }
      );

      if (!testResponse || !testResponse.content) {
        throw new Error('End-to-end functionality test failed');
      }

      logger.info('Final health check passed', {
        migrationPhase: migrationStatus.currentPhase.phase_name,
        rolloutPercentage: migrationStatus.currentPhase.rollout_percentage,
        systemStatus: 'healthy'
      });

    } catch (error) {
      logger.error('Final health check failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Rollback deployment
   */
  async rollback(reason) {
    logger.warn('Rolling back Smart Response Router deployment', { reason });

    try {
      // Rollback migration
      await this.migration.forceRollback(`Deployment rollback: ${reason}`);

      // Reset Smart Router Integration to legacy only
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      smartRouterIntegration.updateMigrationConfig({
        rolloutPercentage: 0,
        enableABTesting: false,
        comparisonMode: false,
        fallbackToOldSystem: true
      });

      logger.info('Rollback completed successfully');

      return {
        success: true,
        message: 'Smart Response Router deployment rolled back',
        reason
      };

    } catch (error) {
      logger.error('Rollback failed', {
        error: error.message,
        originalReason: reason
      });
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus() {
    try {
      const migrationStatus = await this.migration.getMigrationStatus();
      const smartRouterIntegration = require('../services/ai-chat/smart-router-integration');
      const migrationStats = await smartRouterIntegration.getMigrationStats();

      return {
        deployed: !!migrationStatus.currentPhase,
        migrationStatus,
        performance: migrationStats,
        lastCheck: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get deployment status', {
        error: error.message
      });
      return {
        deployed: false,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'deploy';

  const deployment = new SmartResponseRouterDeployment();

  try {
    switch (command) {
      case 'deploy':
        const result = await deployment.deploy();
        console.log('✅ Deployment successful:', result);
        break;

      case 'status':
        const status = await deployment.getDeploymentStatus();
        console.log('📊 Deployment status:', JSON.stringify(status, null, 2));
        break;

      case 'rollback':
        const reason = args[1] || 'Manual rollback';
        const rollbackResult = await deployment.rollback(reason);
        console.log('🔄 Rollback completed:', rollbackResult);
        break;

      case 'validate':
        await deployment.validatePrerequisites();
        await deployment.runValidationTests();
        console.log('✅ Validation passed');
        break;

      default:
        console.log(`
Smart Response Router Deployment Script

Usage:
  node scripts/deploy-smart-response-router.js [command]

Commands:
  deploy    - Deploy Smart Response Router with migration (default)
  status    - Check current deployment status
  rollback  - Rollback to legacy system
  validate  - Run validation tests only

Examples:
  node scripts/deploy-smart-response-router.js
  node scripts/deploy-smart-response-router.js status
  node scripts/deploy-smart-response-router.js rollback "Performance issues"
        `);
    }

  } catch (error) {
    console.error('❌ Command failed:', error.message);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = SmartResponseRouterDeployment;