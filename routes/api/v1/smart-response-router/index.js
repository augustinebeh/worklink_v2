/**
 * Smart Response Router API - Main Router
 * Modular implementation replacing the original 527-line monolithic file
 *
 * Features:
 * - Intelligent message analysis and routing
 * - AI-powered response generation
 * - Migration management and monitoring
 * - Performance analytics and A/B testing
 * - Escalation management
 * - System health monitoring
 *
 * @module smart-response-router
 */

const express = require('express');
const router = express.Router();

// Import route modules
const adminRoutes = require('./routes/admin');
const routingRoutes = require('./routes/routing');

// Import helpers for status endpoints
const SmartRouterMigration = require('./helpers/migration');
const SmartRouterAnalytics = require('./helpers/analytics');

// Mount route modules
router.use('/admin', adminRoutes);         // Admin management and monitoring
router.use('/', routingRoutes);            // Core routing functionality

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    module: 'smart-response-router',
    version: '2.0.0',
    architecture: 'modular'
  });
});

/**
 * GET /stats
 * Get router system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const migration = new SmartRouterMigration();
    const analytics = new SmartRouterAnalytics();

    const [migrationStatus, performanceMetrics, escalationStats] = await Promise.all([
      migration.getMigrationStatus(),
      analytics.getPerformanceMetrics({ timeRange: '24h' }),
      analytics.getEscalationStats()
    ]);

    res.json({
      success: true,
      data: {
        migration: migrationStatus.data,
        performance: performanceMetrics.data?.summary || {},
        escalations: escalationStats.data?.summary || {},
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: '2.0.0'
        }
      },
      generated_at: new Date().toISOString(),
      module: 'smart-response-router'
    });

  } catch (error) {
    console.error('Error fetching smart router stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve smart router statistics',
      details: error.message
    });
  }
});

/**
 * GET /
 * Module information and available endpoints
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Response Router API - Modular Implementation',
    version: '2.0.0',
    architecture: 'modular',
    status: 'operational',
    endpoints: {
      // Core routing operations
      'POST /analyze': 'Analyze message and determine routing strategy',
      'POST /route': 'Route message to appropriate response system',
      'POST /batch-route': 'Route multiple messages in batch (admin only)',
      'GET /routing-options': 'Get available routing options',

      // Admin management
      'GET /admin/status': 'Get system status and health',
      'POST /admin/migration/start': 'Start migration to next stage',
      'POST /admin/migration/rollback': 'Rollback migration to previous stage',

      // Analytics endpoints
      'GET /admin/analytics/performance': 'Get routing performance analytics',
      'GET /admin/analytics/ab-testing': 'Get A/B testing results',
      'POST /admin/analytics/ab-testing': 'Start new A/B test',
      'GET /admin/analytics/escalations': 'Get escalation analytics',

      // Configuration
      'GET /admin/config': 'Get system configuration',
      'PUT /admin/config': 'Update system configuration',

      // Utility endpoints
      'GET /health': 'Health check',
      'GET /stats': 'System statistics',
      'GET /admin/health': 'Detailed health check'
    },
    features: [
      'Intelligent message analysis and intent detection',
      'Multi-stage routing with confidence scoring',
      'AI-powered response generation integration',
      'Template-based response matching',
      'Automatic escalation to human agents',
      'Migration management between routing stages',
      'Performance analytics and monitoring',
      'A/B testing framework for optimization',
      'Comprehensive escalation management',
      'System health monitoring and diagnostics',
      'Batch processing capabilities',
      'Configurable routing thresholds'
    ],
    capabilities: {
      message_analysis: {
        intent_detection: 'Automatic classification of message intent',
        sentiment_analysis: 'Positive/negative/neutral sentiment detection',
        complexity_scoring: 'Message complexity assessment',
        urgency_detection: 'Identification of urgent queries',
        keyword_extraction: 'Relevant keyword identification',
        confidence_calculation: 'Overall routing confidence scoring'
      },
      routing_strategies: {
        auto_routing: 'Automatic best-path determination',
        ai_response: 'AI-powered response generation',
        template_response: 'Template-based quick responses',
        escalation: 'Human agent escalation',
        fallback: 'Fallback response system'
      },
      analytics: {
        performance_metrics: 'Response time and success rate tracking',
        ab_testing: 'Split testing for routing optimization',
        escalation_analytics: 'Escalation pattern analysis',
        migration_monitoring: 'System migration progress tracking'
      }
    },
    integrations: {
      ai_services: 'Integration with AI response generation',
      escalation_system: 'Human agent escalation workflow',
      analytics_platform: 'Performance monitoring and reporting',
      migration_framework: 'Staged deployment management'
    },
    refactoring: {
      original_file: 'smart-response-router.js (527 lines)',
      new_structure: 'Modular architecture with 5 files',
      improvements: [
        'Separated admin and routing concerns',
        'Extracted analytics and migration helpers',
        'Improved message analysis algorithms',
        'Added comprehensive A/B testing framework',
        'Enhanced escalation management',
        'Better performance monitoring',
        'Modular configuration system',
        'Batch processing capabilities'
      ]
    }
  });
});

// Legacy compatibility endpoints (for backward compatibility)

/**
 * POST /config (legacy)
 * Legacy config endpoint - redirects to admin routes
 */
router.all('/config', (req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved',
    new_endpoints: {
      get_config: 'GET /api/v1/smart-response-router/admin/config',
      update_config: 'PUT /api/v1/smart-response-router/admin/config'
    },
    message: 'Please use the new modular endpoint structure'
  });
});

/**
 * GET /status (legacy)
 * Legacy status endpoint - redirects to admin routes
 */
router.get('/status', (req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved',
    new_endpoint: 'GET /api/v1/smart-response-router/admin/status',
    message: 'Please use the new admin status endpoint'
  });
});

module.exports = router;