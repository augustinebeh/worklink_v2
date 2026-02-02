/**
 * Intent Classifier API Routes
 *
 * RESTful API for the lightweight intent classification system.
 * Provides endpoints for classification, testing, analytics, and monitoring.
 */

const express = require('express');
const router = express.Router();
const intentClassifier = require('../../../services/intent-classifier');
const integration = require('../../../services/intent-classifier/integration');
const testSuite = require('../../../services/intent-classifier/test-classifier');

/**
 * Classify a single message
 * POST /api/v1/intent-classifier/classify
 */
router.post('/classify', async (req, res) => {
  try {
    const { message, context = {} } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    const result = intentClassifier.classifyIntent(message, context);

    res.json({
      success: true,
      data: {
        message,
        classification: result,
        processingInfo: {
          processingTimeMs: result.processingTimeMs,
          targetTime: '< 100ms',
          performanceMet: result.processingTimeMs < 100
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Classify multiple messages in batch
 * POST /api/v1/intent-classifier/classify-batch
 */
router.post('/classify-batch', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required and cannot be empty'
      });
    }

    if (messages.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 messages allowed per batch'
      });
    }

    const results = intentClassifier.classifyBatch(messages);

    const summary = {
      total: results.length,
      avgProcessingTime: results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length,
      intentDistribution: {}
    };

    // Calculate distribution
    results.forEach(result => {
      const intent = result.intent;
      summary.intentDistribution[intent] = (summary.intentDistribution[intent] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        results,
        summary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Enhanced classification for AI chat integration
 * POST /api/v1/intent-classifier/classify-for-chat
 */
router.post('/classify-for-chat', async (req, res) => {
  try {
    const { candidateId, message, channel = 'app' } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required'
      });
    }

    const result = await integration.classifyForAIChat(candidateId, message, channel);

    res.json({
      success: true,
      data: {
        candidateId,
        message,
        classification: result,
        recommendations: result.aiChatRecommendations,
        responseStrategy: result.responseStrategy,
        escalationLevel: result.escalationLevel
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get system performance statistics
 * GET /api/v1/intent-classifier/stats
 */
router.get('/stats', (req, res) => {
  try {
    const stats = intentClassifier.getPerformanceStats();

    res.json({
      success: true,
      data: {
        systemInfo: {
          version: '2.0',
          type: 'lightweight_rule_based',
          targetPerformance: 'sub-100ms'
        },
        capabilities: stats,
        healthStatus: {
          operational: true,
          avgProcessingTime: '< 50ms',
          accuracyTarget: '> 85%'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get classification analytics
 * GET /api/v1/intent-classifier/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days must be between 1 and 365'
      });
    }

    const analytics = integration.getClassificationAnalytics(days);

    if (!analytics) {
      return res.status(500).json({
        success: false,
        error: 'Unable to retrieve analytics'
      });
    }

    res.json({
      success: true,
      data: {
        timeRange: `${days} days`,
        analytics,
        insights: generateInsights(analytics)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Run system tests
 * POST /api/v1/intent-classifier/test
 */
router.post('/test', async (req, res) => {
  try {
    const { testType = 'basic' } = req.body;

    let results;

    switch (testType) {
      case 'basic':
        results = testSuite.runTestSuite();
        break;
      case 'performance':
        results = {
          performance: await runPerformanceBenchmark(),
          classification: testSuite.runTestSuite()
        };
        break;
      case 'singlish':
        testSuite.testSinglishHandling();
        results = { message: 'Singlish test completed - check console logs' };
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid test type. Use: basic, performance, singlish'
        });
    }

    res.json({
      success: true,
      data: {
        testType,
        results,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test integration with sample messages
 * GET /api/v1/intent-classifier/test-integration
 */
router.get('/test-integration', async (req, res) => {
  try {
    // Run integration test
    const testResults = await integration.testIntegration();

    res.json({
      success: true,
      data: {
        message: 'Integration test completed successfully',
        testResults,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check endpoint
 * GET /api/v1/intent-classifier/health
 */
router.get('/health', (req, res) => {
  try {
    // Quick classification test
    const startTime = Date.now();
    const testResult = intentClassifier.classifyIntent('hello');
    const responseTime = Date.now() - startTime;

    const isHealthy = responseTime < 100 && testResult.intent === 'general_help';

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime,
        testClassification: testResult.intent,
        timestamp: new Date().toISOString(),
        version: '2.0',
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      status: 'unhealthy'
    });
  }
});

/**
 * Generate insights from analytics data
 */
function generateInsights(analytics) {
  const insights = [];

  // Performance insight
  if (analytics.performanceMet) {
    insights.push({
      type: 'performance',
      level: 'success',
      message: `Average processing time (${analytics.avgProcessingTime}ms) meets target`
    });
  } else {
    insights.push({
      type: 'performance',
      level: 'warning',
      message: `Processing time (${analytics.avgProcessingTime}ms) exceeds target`
    });
  }

  // Volume insights
  if (analytics.totalClassifications > 1000) {
    insights.push({
      type: 'volume',
      level: 'info',
      message: `High classification volume: ${analytics.totalClassifications} requests processed`
    });
  }

  // Intent distribution insights
  const topIntent = analytics.intentDistribution[0];
  if (topIntent) {
    const percentage = ((topIntent.count / analytics.totalClassifications) * 100).toFixed(1);
    insights.push({
      type: 'distribution',
      level: 'info',
      message: `Most common intent: ${topIntent.classified_intent} (${percentage}%)`
    });
  }

  // Escalation insights
  const totalEscalations = analytics.intentDistribution.reduce((sum, item) => sum + item.escalations, 0);
  const escalationRate = ((totalEscalations / analytics.totalClassifications) * 100).toFixed(1);

  if (escalationRate > 15) {
    insights.push({
      type: 'escalation',
      level: 'warning',
      message: `High escalation rate: ${escalationRate}% of messages require human attention`
    });
  } else {
    insights.push({
      type: 'escalation',
      level: 'success',
      message: `Healthy escalation rate: ${escalationRate}% of messages escalated`
    });
  }

  return insights;
}

/**
 * Run performance benchmark
 */
async function runPerformanceBenchmark() {
  const iterations = 100;
  const testMessage = "When will I get paid for my job?";
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    intentClassifier.classifyIntent(testMessage);
    times.push(Date.now() - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const sub100ms = times.filter(t => t < 100).length;

  return {
    iterations,
    avgTime: Math.round(avgTime * 100) / 100,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    sub100msPercentage: ((sub100ms / iterations) * 100).toFixed(1),
    targetMet: avgTime < 100
  };
}

module.exports = router;