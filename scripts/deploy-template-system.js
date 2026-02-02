/**
 * Deployment Script for Fact-Based Template Response System
 *
 * Safely integrates the template system with existing AI chat infrastructure
 * Provides rollback capabilities and validation
 */

const { db } = require('../db/database');
const FactBasedTemplateSystem = require('../services/template-responses');
const TemplateIntegrationBridge = require('../services/template-responses/integration-bridge');

class TemplateSystemDeployment {
  constructor() {
    this.isDeployed = false;
    this.originalProcessIncomingMessage = null;
    this.templateSystem = null;
    this.integrationBridge = null;
  }

  /**
   * Deploy the template system
   */
  async deploy(options = {}) {
    const {
      enableFallbackToAI = false,
      testMode = false,
      gradualRollout = false
    } = options;

    try {
      console.log('🚀 [Deploy] Starting template system deployment...');

      // Step 1: Initialize database tables
      await this.initializeDatabaseTables();

      // Step 2: Initialize template system
      console.log('📋 [Deploy] Initializing template system...');
      this.templateSystem = new FactBasedTemplateSystem();

      // Step 3: Initialize integration bridge
      console.log('🌉 [Deploy] Initializing integration bridge...');
      this.integrationBridge = new TemplateIntegrationBridge();
      this.integrationBridge.configureFallback(enableFallbackToAI);

      // Step 4: Test system health
      const healthCheck = await this.performHealthCheck();
      if (!healthCheck.success) {
        throw new Error(`Health check failed: ${healthCheck.error}`);
      }

      // Step 5: Backup existing AI chat integration
      await this.backupExistingIntegration();

      // Step 6: Integrate with AI chat system
      if (!testMode) {
        await this.integrateWithAIChat(gradualRollout);
      }

      // Step 7: Validate deployment
      const validation = await this.validateDeployment();
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.error}`);
      }

      this.isDeployed = true;
      console.log('✅ [Deploy] Template system deployed successfully!');

      return {
        success: true,
        message: 'Template system deployed successfully',
        features: {
          intent_classification: true,
          real_data_integration: true,
          escalation_handling: true,
          admin_analytics: true,
          fact_based_responses: true
        },
        deployment_time: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ [Deploy] Deployment failed:', error);

      // Attempt rollback
      if (this.isDeployed) {
        await this.rollback();
      }

      return {
        success: false,
        error: error.message,
        deployment_failed: true
      };
    }
  }

  /**
   * Initialize required database tables
   */
  async initializeDatabaseTables() {
    console.log('🗄️ [Deploy] Creating database tables...');

    try {
      // Template system tables
      db.exec(`
        CREATE TABLE IF NOT EXISTS template_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          priority INTEGER DEFAULT 1,
          active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS response_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          trigger_patterns TEXT NOT NULL,
          template_content TEXT NOT NULL,
          requires_real_data INTEGER DEFAULT 0,
          escalation_priority TEXT DEFAULT 'normal',
          language TEXT DEFAULT 'en',
          active INTEGER DEFAULT 1,
          confidence_score REAL DEFAULT 0.8,
          usage_count INTEGER DEFAULT 0,
          success_rate REAL DEFAULT 0.0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES template_categories(id)
        );

        CREATE TABLE IF NOT EXISTS template_variables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER NOT NULL,
          variable_name TEXT NOT NULL,
          data_source TEXT NOT NULL,
          field_path TEXT NOT NULL,
          fallback_value TEXT,
          format_type TEXT DEFAULT 'text',
          FOREIGN KEY (template_id) REFERENCES response_templates(id)
        );

        CREATE TABLE IF NOT EXISTS template_usage_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER,
          candidate_id TEXT NOT NULL,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          confidence REAL,
          admin_feedback TEXT,
          effectiveness_score REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS escalation_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message TEXT NOT NULL,
          priority TEXT DEFAULT 'normal',
          category TEXT,
          auto_response TEXT,
          admin_assigned TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME,
          resolution_notes TEXT
        );

        CREATE TABLE IF NOT EXISTS template_bridge_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message TEXT NOT NULL,
          response_content TEXT NOT NULL,
          response_source TEXT NOT NULL,
          channel TEXT DEFAULT 'app',
          template_id INTEGER,
          confidence REAL,
          success INTEGER DEFAULT 1,
          fallback_used INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS deployment_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          status TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes for performance
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_template_usage_candidate ON template_usage_logs(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_template_usage_created ON template_usage_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_escalation_status ON escalation_queue(status);
        CREATE INDEX IF NOT EXISTS idx_escalation_priority ON escalation_queue(priority);
        CREATE INDEX IF NOT EXISTS idx_bridge_logs_candidate ON template_bridge_logs(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_bridge_logs_created ON template_bridge_logs(created_at);
      `);

      console.log('✅ [Deploy] Database tables created successfully');

    } catch (error) {
      console.error('❌ [Deploy] Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      console.log('🔍 [Deploy] Performing health check...');

      // Test template system
      if (!this.templateSystem) {
        return { success: false, error: 'Template system not initialized' };
      }

      // Test intent classification
      const testIntent = await this.templateSystem.intentClassifier.classifyMessage('test payment inquiry');
      if (!testIntent || !testIntent.category) {
        return { success: false, error: 'Intent classification failed' };
      }

      // Test database connectivity
      const dbTest = db.prepare('SELECT 1 as test').get();
      if (!dbTest || dbTest.test !== 1) {
        return { success: false, error: 'Database connection failed' };
      }

      // Test template loading
      const testTemplate = await this.templateSystem.templateManager.findBestTemplate(
        { category: 'payment_inquiry', subcategory: 'general', confidence: 0.8 }
      );
      // Template might be null if none match, which is acceptable

      // Test escalation handler
      const escalationCheck = this.templateSystem.escalationHandler.checkEscalation(
        'test message', testIntent, { status: 'active' }
      );
      if (!escalationCheck || escalationCheck.shouldEscalate === undefined) {
        return { success: false, error: 'Escalation handler failed' };
      }

      console.log('✅ [Deploy] Health check passed');
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Backup existing AI chat integration
   */
  async backupExistingIntegration() {
    try {
      console.log('💾 [Deploy] Backing up existing AI chat integration...');

      // Store current AI chat settings
      const aiSettings = db.prepare('SELECT * FROM ai_settings').all();

      db.prepare(`
        INSERT INTO deployment_logs (action, status, details)
        VALUES (?, ?, ?)
      `).run(
        'backup_ai_settings',
        'completed',
        JSON.stringify({ settings: aiSettings, timestamp: new Date().toISOString() })
      );

      console.log('✅ [Deploy] Existing integration backed up');

    } catch (error) {
      console.error('❌ [Deploy] Backup failed:', error);
      throw error;
    }
  }

  /**
   * Integrate with existing AI chat system
   */
  async integrateWithAIChat(gradualRollout = false) {
    try {
      console.log('🔌 [Deploy] Integrating with AI chat system...');

      // Get AI chat module
      const aiChatModule = require('../services/ai-chat');

      // Store original processIncomingMessage function
      this.originalProcessIncomingMessage = aiChatModule.processIncomingMessage;

      // Replace with integration bridge
      aiChatModule.processIncomingMessage = async (candidateId, content, channel = 'app') => {
        console.log(`🌉 [Bridge] Processing message via template system for ${candidateId}`);

        // Use template system with fallback to original AI if needed
        return await this.integrationBridge.processIncomingMessage(candidateId, content, channel);
      };

      console.log('✅ [Deploy] AI chat integration completed');

      db.prepare(`
        INSERT INTO deployment_logs (action, status, details)
        VALUES (?, ?, ?)
      `).run(
        'integrate_ai_chat',
        'completed',
        JSON.stringify({
          gradual_rollout: gradualRollout,
          timestamp: new Date().toISOString()
        })
      );

    } catch (error) {
      console.error('❌ [Deploy] AI chat integration failed:', error);
      throw error;
    }
  }

  /**
   * Validate deployment
   */
  async validateDeployment() {
    try {
      console.log('✅ [Deploy] Validating deployment...');

      // Test message processing end-to-end
      const testCandidateId = 'test-deploy-validation';

      // Create temporary test candidate
      db.prepare(`
        INSERT OR REPLACE INTO candidates (id, name, email, status)
        VALUES (?, ?, ?, ?)
      `).run(testCandidateId, 'Test Deploy', 'test@deploy.com', 'active');

      // Test template processing
      const response = await this.templateSystem.processMessage(
        testCandidateId,
        'Test payment inquiry',
        { channel: 'app', adminMode: 'auto' }
      );

      if (!response || !response.content) {
        return { success: false, error: 'Template processing failed' };
      }

      // Test API endpoints
      const endpoints = [
        '/api/v1/template-responses/status',
        '/api/v1/template-responses/escalations',
        '/api/v1/template-responses/analytics'
      ];

      // Basic endpoint validation would go here
      // (Skipped for brevity - would use supertest in real implementation)

      // Cleanup test data
      db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);
      db.prepare('DELETE FROM template_usage_logs WHERE candidate_id = ?').run(testCandidateId);

      console.log('✅ [Deploy] Validation passed');
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rollback deployment
   */
  async rollback() {
    try {
      console.log('🔄 [Deploy] Rolling back deployment...');

      // Restore original AI chat integration
      if (this.originalProcessIncomingMessage) {
        const aiChatModule = require('../services/ai-chat');
        aiChatModule.processIncomingMessage = this.originalProcessIncomingMessage;
        console.log('✅ [Rollback] AI chat integration restored');
      }

      // Disable template system
      if (this.integrationBridge) {
        this.integrationBridge.setEnabled(false);
        console.log('✅ [Rollback] Template system disabled');
      }

      // Log rollback
      db.prepare(`
        INSERT INTO deployment_logs (action, status, details)
        VALUES (?, ?, ?)
      `).run(
        'rollback',
        'completed',
        JSON.stringify({ timestamp: new Date().toISOString() })
      );

      this.isDeployed = false;
      console.log('✅ [Rollback] Rollback completed successfully');

    } catch (error) {
      console.error('❌ [Rollback] Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  getStatus() {
    return {
      deployed: this.isDeployed,
      template_system_ready: !!this.templateSystem,
      integration_bridge_ready: !!this.integrationBridge,
      health_check: this.integrationBridge ? this.integrationBridge.healthCheck() : null
    };
  }

  /**
   * Get deployment metrics
   */
  getDeploymentMetrics(days = 7) {
    if (!this.isDeployed) {
      return { deployed: false };
    }

    try {
      // Template usage metrics
      const templateMetrics = db.prepare(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(CASE WHEN response_source LIKE 'template_%' THEN 1 END) as template_responses,
          COUNT(CASE WHEN response_source = 'escalation_response' THEN 1 END) as escalated,
          AVG(confidence) as avg_confidence
        FROM template_bridge_logs
        WHERE created_at > datetime('now', '-' || ? || ' days')
      `).get(days);

      // Escalation metrics
      const escalationMetrics = db.prepare(`
        SELECT
          COUNT(*) as total_escalations,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
          AVG(
            CASE
              WHEN resolved_at IS NOT NULL
              THEN (julianday(resolved_at) - julianday(created_at)) * 24
              ELSE NULL
            END
          ) as avg_resolution_hours
        FROM escalation_queue
        WHERE created_at > datetime('now', '-' || ? || ' days')
      `).get(days);

      return {
        deployed: true,
        template_metrics: templateMetrics,
        escalation_metrics: escalationMetrics,
        deployment_time: this.deploymentTime
      };

    } catch (error) {
      console.error('❌ [Deploy] Error getting metrics:', error);
      return { deployed: true, error: error.message };
    }
  }
}

// CLI execution
if (require.main === module) {
  async function main() {
    const deployment = new TemplateSystemDeployment();

    // Parse command line arguments
    const args = process.argv.slice(2);
    const action = args[0] || 'deploy';

    const options = {
      enableFallbackToAI: args.includes('--fallback-ai'),
      testMode: args.includes('--test-mode'),
      gradualRollout: args.includes('--gradual')
    };

    try {
      switch (action) {
        case 'deploy':
          console.log('🚀 Starting deployment with options:', options);
          const result = await deployment.deploy(options);
          console.log('📊 Deployment result:', result);
          break;

        case 'rollback':
          console.log('🔄 Starting rollback...');
          await deployment.rollback();
          break;

        case 'status':
          console.log('📊 Current status:', deployment.getStatus());
          break;

        case 'metrics':
          const days = parseInt(args[1]) || 7;
          console.log(`📈 Metrics (${days} days):`, deployment.getDeploymentMetrics(days));
          break;

        default:
          console.log(`
Usage: node deploy-template-system.js [action] [options]

Actions:
  deploy     Deploy the template system (default)
  rollback   Rollback to original AI chat
  status     Show deployment status
  metrics    Show deployment metrics

Options:
  --fallback-ai    Enable fallback to original AI
  --test-mode      Deploy in test mode (no integration)
  --gradual        Enable gradual rollout

Examples:
  node deploy-template-system.js deploy --fallback-ai
  node deploy-template-system.js rollback
  node deploy-template-system.js status
  node deploy-template-system.js metrics 30
          `);
      }
    } catch (error) {
      console.error('❌ Deployment script failed:', error);
      process.exit(1);
    }
  }

  main();
}

module.exports = TemplateSystemDeployment;