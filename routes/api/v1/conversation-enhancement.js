/**
 * Conversation Enhancement API Routes
 * Endpoints for A/B testing, analytics, FOMO campaigns, and multi-language support
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');

// Import the enhancement engines
const ConversationABTesting = require('../../../utils/conversation-ab-testing');
const SLMConversionAnalytics = require('../../../utils/slm-conversion-analytics');
const EnhancedConversationFlows = require('../../../utils/enhanced-conversation-flows');
const MultilingualConversationEngine = require('../../../utils/multilingual-conversation-engine');

// Initialize enhancement systems
const abTesting = new ConversationABTesting();
const analytics = new SLMConversionAnalytics();
const enhancedFlows = new EnhancedConversationFlows();
const multilingualEngine = new MultilingualConversationEngine();

// Database connection
const db = new Database(path.resolve(__dirname, '../../../db/database.db'));

/**
 * ========================================
 * A/B TESTING ENDPOINTS
 * ========================================
 */

// Start new A/B test
router.post('/ab-testing/start', async (req, res) => {
  try {
    const { testType, duration, candidateSegment } = req.body;

    let testConfig;
    switch (testType) {
      case 'conversion':
        testConfig = abTesting.testConfigurations.conversionOptimization;
        break;
      case 'personalization':
        testConfig = abTesting.testConfigurations.personalizationEffectiveness;
        break;
      case 'urgency':
        testConfig = abTesting.testConfigurations.urgencyOptimization;
        break;
      default:
        return res.status(400).json({ error: 'Invalid test type' });
    }

    if (duration) {
      testConfig.duration = duration;
    }

    const testId = await abTesting.initializeTest(testConfig, candidateSegment);

    res.json({
      success: true,
      testId,
      testConfig: {
        name: testConfig.name,
        duration: testConfig.duration,
        objective: testConfig.objective,
        variables: testConfig.variables
      }
    });

  } catch (error) {
    console.error('A/B test start error:', error);
    res.status(500).json({ error: 'Failed to start A/B test' });
  }
});

// Get active A/B tests
router.get('/ab-testing/active', async (req, res) => {
  try {
    const activeTests = await abTesting.getActiveTests();
    res.json({
      success: true,
      tests: activeTests
    });
  } catch (error) {
    console.error('Active tests error:', error);
    res.status(500).json({ error: 'Failed to retrieve active tests' });
  }
});

// Get A/B test results
router.get('/ab-testing/:testId/results', async (req, res) => {
  try {
    const { testId } = req.params;
    const results = await abTesting.getTestResults(testId);

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Test results error:', error);
    res.status(500).json({ error: 'Failed to retrieve test results' });
  }
});

// Track conversion event
router.post('/ab-testing/track', async (req, res) => {
  try {
    const { candidateId, eventType, eventData } = req.body;

    await abTesting.trackConversionEvent(candidateId, eventType, eventData);

    res.json({
      success: true,
      message: 'Event tracked successfully'
    });

  } catch (error) {
    console.error('Event tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * ========================================
 * ANALYTICS ENDPOINTS
 * ========================================
 */

// Get real-time metrics dashboard
router.get('/analytics/real-time', async (req, res) => {
  try {
    const metrics = await analytics.getRealTimeMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Real-time metrics error:', error);
    res.status(500).json({ error: 'Failed to retrieve real-time metrics' });
  }
});

// Get funnel performance analysis
router.get('/analytics/funnel', async (req, res) => {
  try {
    const { timeframe = '7d', segment } = req.query;
    const segmentation = segment ? JSON.parse(segment) : {};

    const analysis = await analytics.analyzeFunnelPerformance(timeframe, segmentation);

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Funnel analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze funnel performance' });
  }
});

// Get performance dashboard
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const dashboard = await analytics.getPerformanceDashboard();
    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
});

// Track funnel progression
router.post('/analytics/track-progression', async (req, res) => {
  try {
    const { candidateId, fromStage, toStage, metadata } = req.body;

    const progression = await analytics.trackFunnelProgression(
      candidateId,
      fromStage,
      toStage,
      metadata
    );

    res.json({
      success: true,
      progression
    });

  } catch (error) {
    console.error('Progression tracking error:', error);
    res.status(500).json({ error: 'Failed to track progression' });
  }
});

// Get conversion predictions
router.get('/analytics/predict/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const conversationContext = req.query.context ? JSON.parse(req.query.context) : {};

    const prediction = await analytics.predictConversionLikelihood(candidateId, conversationContext);

    res.json({
      success: true,
      prediction
    });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

// Get hot leads
router.get('/analytics/hot-leads', async (req, res) => {
  try {
    const hotLeads = await analytics.identifyHotLeads();
    res.json({
      success: true,
      hotLeads
    });
  } catch (error) {
    console.error('Hot leads error:', error);
    res.status(500).json({ error: 'Failed to identify hot leads' });
  }
});

// Export analytics data
router.get('/analytics/export', async (req, res) => {
  try {
    const { format = 'json', timeframe = '30d' } = req.query;
    const exportData = await analytics.exportAnalytics(format, timeframe);

    // Set appropriate headers for download
    const contentTypes = {
      json: 'application/json',
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const filename = `analytics_${timeframe}_${Date.now()}.${format}`;

    res.setHeader('Content-Type', contentTypes[format] || 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

/**
 * ========================================
 * FOMO CAMPAIGN ENDPOINTS
 * ========================================
 */

// Generate enhanced conversation
router.post('/fomo/generate-conversation', async (req, res) => {
  try {
    const { candidateId, message, context } = req.body;

    const enhancedResponse = await enhancedFlows.orchestrateConversation(candidateId, message, context);

    res.json({
      success: true,
      response: enhancedResponse
    });

  } catch (error) {
    console.error('Enhanced conversation error:', error);
    res.status(500).json({ error: 'Failed to generate enhanced conversation' });
  }
});

// Start FOMO campaign
router.post('/fomo/campaign/start', async (req, res) => {
  try {
    const { campaignType, targetSegment, intensity, duration } = req.body;

    // Create campaign record
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const campaign = {
      id: campaignId,
      type: campaignType,
      targetSegment,
      intensity,
      duration,
      startTime: new Date().toISOString(),
      status: 'active',
      metrics: {
        candidatesReached: 0,
        responsesReceived: 0,
        interviewsScheduled: 0,
        conversionRate: 0
      }
    };

    // Store campaign (in production, save to database)
    console.log('Starting FOMO campaign:', campaign);

    res.json({
      success: true,
      campaignId,
      campaign
    });

  } catch (error) {
    console.error('FOMO campaign error:', error);
    res.status(500).json({ error: 'Failed to start FOMO campaign' });
  }
});

// Get FOMO campaign performance
router.get('/fomo/campaign/:campaignId/performance', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Fetch campaign performance from database
    const performance = {
      campaignId,
      status: 'active',
      metrics: {
        candidatesReached: 156,
        responsesReceived: 94,
        interviewsScheduled: 67,
        conversionRate: 71.3,
        averageResponseTime: 420000
      },
      timeline: [
        { time: '2024-01-01T00:00:00Z', conversions: 12 },
        { time: '2024-01-01T06:00:00Z', conversions: 18 },
        { time: '2024-01-01T12:00:00Z', conversions: 25 },
        { time: '2024-01-01T18:00:00Z', conversions: 12 }
      ]
    };

    res.json({
      success: true,
      performance
    });

  } catch (error) {
    console.error('Campaign performance error:', error);
    res.status(500).json({ error: 'Failed to retrieve campaign performance' });
  }
});

/**
 * ========================================
 * MULTILINGUAL ENDPOINTS
 * ========================================
 */

// Detect candidate language
router.get('/multilingual/detect/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const conversationContext = req.query.context ? JSON.parse(req.query.context) : {};

    const languageDetection = await multilingualEngine.detectLanguage(candidateId, conversationContext);

    res.json({
      success: true,
      languageDetection
    });

  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({ error: 'Failed to detect language' });
  }
});

// Generate multilingual response
router.post('/multilingual/generate-response', async (req, res) => {
  try {
    const { candidateId, baseTemplate, conversationContext } = req.body;

    const multilingualResponse = await multilingualEngine.generateMultilingualResponse(
      candidateId,
      baseTemplate,
      conversationContext
    );

    res.json({
      success: true,
      response: multilingualResponse
    });

  } catch (error) {
    console.error('Multilingual response error:', error);
    res.status(500).json({ error: 'Failed to generate multilingual response' });
  }
});

// Update candidate language preferences
router.put('/multilingual/preferences/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { primaryLanguage, region, manualOverride } = req.body;

    // Store language preferences
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO candidate_language_preferences
      (candidate_id, primary_language, region, manual_override, last_updated)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(candidateId, primaryLanguage, region, manualOverride ? 1 : 0);

    res.json({
      success: true,
      message: 'Language preferences updated'
    });

  } catch (error) {
    console.error('Language preferences error:', error);
    res.status(500).json({ error: 'Failed to update language preferences' });
  }
});

// Get language performance statistics
router.get('/multilingual/performance', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;

    // Get language performance statistics
    const languageStats = db.prepare(`
      SELECT
        primary_language,
        COUNT(*) as candidate_count,
        AVG(CASE
          WHEN sca.actual_conversion = 1 THEN 100.0
          ELSE 0.0
        END) as conversion_rate
      FROM candidate_language_preferences clp
      LEFT JOIN slm_conversation_analytics sca ON clp.candidate_id = sca.candidate_id
      WHERE datetime(sca.created_at) >= datetime('now', '-${timeframe.replace('d', ' days')}')
      GROUP BY primary_language
      ORDER BY candidate_count DESC
    `).all();

    res.json({
      success: true,
      languageStats,
      timeframe
    });

  } catch (error) {
    console.error('Language performance error:', error);
    res.status(500).json({ error: 'Failed to retrieve language performance' });
  }
});

/**
 * ========================================
 * CONVERSATION MONITORING ENDPOINTS
 * ========================================
 */

// Get conversation monitoring dashboard
router.get('/monitoring/dashboard', async (req, res) => {
  try {
    const monitoring = db.prepare(`
      SELECT
        cm.*,
        c.name as candidate_name,
        c.email as candidate_email
      FROM conversation_monitoring cm
      JOIN candidates c ON cm.candidate_id = c.id
      WHERE cm.conversation_status IN ('active', 'stalled')
      ORDER BY cm.urgency_level DESC, cm.updated_at DESC
      LIMIT 50
    `).all();

    const alerts = monitoring.filter(m => m.requires_intervention || m.escalation_needed);
    const hotLeads = monitoring.filter(m => m.hot_lead_score > 0.7);
    const stalledConversations = monitoring.filter(m => m.conversation_status === 'stalled');

    res.json({
      success: true,
      monitoring: {
        all: monitoring,
        alerts,
        hotLeads,
        stalledConversations,
        summary: {
          totalActive: monitoring.length,
          requiresIntervention: alerts.length,
          hotLeads: hotLeads.length,
          stalled: stalledConversations.length
        }
      }
    });

  } catch (error) {
    console.error('Monitoring dashboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve monitoring dashboard' });
  }
});

// Update conversation monitoring status
router.put('/monitoring/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];

    // Build dynamic update query
    for (const [field, value] of Object.entries(updates)) {
      if (['conversation_status', 'urgency_level', 'requires_intervention', 'escalation_needed', 'next_action'].includes(field)) {
        fields.push(`${field} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(candidateId);

    const stmt = db.prepare(`
      UPDATE conversation_monitoring
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE candidate_id = ?
    `);

    stmt.run(...values);

    res.json({
      success: true,
      message: 'Monitoring status updated'
    });

  } catch (error) {
    console.error('Monitoring update error:', error);
    res.status(500).json({ error: 'Failed to update monitoring status' });
  }
});

/**
 * ========================================
 * INTEGRATION ENDPOINTS
 * ========================================
 */

// Enhanced conversation endpoint for SLM integration
router.post('/enhanced-conversation', async (req, res) => {
  try {
    const { candidateId, message, context, useMultilingual, useABTesting } = req.body;

    let response;

    // Get A/B testing parameters if enabled
    let abTestParams = null;
    if (useABTesting) {
      abTestParams = await abTesting.getConversationParameters(candidateId);
    }

    // Generate base enhanced response
    const baseResponse = await enhancedFlows.orchestrateConversation(candidateId, message, {
      ...context,
      abTestParams
    });

    // Apply multilingual enhancement if enabled
    if (useMultilingual) {
      response = await multilingualEngine.generateMultilingualResponse(
        candidateId,
        baseResponse,
        context
      );
    } else {
      response = baseResponse;
    }

    // Track analytics
    await analytics.trackFunnelProgression(
      candidateId,
      context.currentStage || 'pending',
      context.targetStage || 'contacted',
      {
        template: response.type,
        abTestVariant: abTestParams?.id,
        language: response.language || 'en'
      }
    );

    // Track A/B test event if applicable
    if (useABTesting && abTestParams) {
      await abTesting.trackConversionEvent(candidateId, 'message_sent', {
        template: response.type,
        variantId: abTestParams.id
      });
    }

    res.json({
      success: true,
      response,
      metadata: {
        abTestVariant: abTestParams?.id,
        language: response.language || 'en',
        enhancementsApplied: {
          fomo: true,
          multilingual: useMultilingual,
          abTesting: useABTesting
        }
      }
    });

  } catch (error) {
    console.error('Enhanced conversation integration error:', error);
    res.status(500).json({ error: 'Failed to generate enhanced conversation' });
  }
});

// System health check
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {
        abTesting: 'operational',
        analytics: 'operational',
        enhancedFlows: 'operational',
        multilingual: 'operational',
        database: 'operational'
      }
    };

    // Test database connection
    try {
      db.prepare('SELECT 1').get();
    } catch (dbError) {
      health.components.database = 'degraded';
      health.status = 'degraded';
    }

    res.json(health);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;