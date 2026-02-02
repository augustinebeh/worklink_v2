/**
 * LLM Configuration Management API
 * WorkLink v2
 *
 * Manages LLM provider configuration, testing, and monitoring
 */

const express = require('express');
const router = express.Router();
const {
  askClaude,
  getLLMStats,
  getProviderStatus,
  testAllProviders,
  cleanupUsageLogs,
  PROVIDERS,
  API_COSTS,
} = require('../../../utils/claude');

// ============================================
// CONFIGURATION & STATUS ENDPOINTS
// ============================================

/**
 * Get LLM provider configuration and status
 */
router.get('/status', async (req, res) => {
  try {
    const providerStatus = getProviderStatus();
    const stats = getLLMStats(7); // Last 7 days

    res.json({
      success: true,
      data: {
        providers: providerStatus,
        apiCosts: API_COSTS,
        recentStats: stats,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Test all configured LLM providers
 */
router.post('/test', async (req, res) => {
  try {
    const results = await testAllProviders();

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Test a specific provider
 */
router.post('/test/:provider', async (req, res) => {
  try {
    const { provider } = req.params;

    if (!PROVIDERS[provider]) {
      return res.status(400).json({
        success: false,
        error: `Unknown provider: ${provider}`,
      });
    }

    const startTime = Date.now();
    const response = await askClaude(
      'Say "test successful"',
      'Respond with only "test successful"',
      { forceProvider: provider, useCache: false }
    );
    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        provider,
        status: 'working',
        responseTime: `${responseTime}ms`,
        response: response.substring(0, 100),
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// USAGE ANALYTICS ENDPOINTS
// ============================================

/**
 * Get detailed usage statistics
 */
router.get('/stats', (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = getLLMStats(parseInt(days));

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get cost breakdown by feature
 */
router.get('/cost-breakdown', (req, res) => {
  try {
    // This would require categorizing LLM calls by feature
    // For now, return the basic stats
    const stats = getLLMStats(30);

    res.json({
      success: true,
      data: {
        totalCost: stats.totals.cost,
        breakdown: {
          chatAssistant: stats.totals.cost * 0.4, // Estimated
          tenderAnalysis: stats.totals.cost * 0.2,
          candidateMatching: stats.totals.cost * 0.2,
          jobPostings: stats.totals.cost * 0.1,
          outreachMessages: stats.totals.cost * 0.1,
        },
        note: 'Breakdown is estimated. Implement call categorization for accurate tracking.',
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// MAINTENANCE ENDPOINTS
// ============================================

/**
 * Clean up old usage logs
 */
router.post('/cleanup', (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;
    const deletedCount = cleanupUsageLogs(daysToKeep);

    res.json({
      success: true,
      data: {
        deletedLogs: deletedCount,
        message: `Cleaned up logs older than ${daysToKeep} days`,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get environment variable status (without exposing keys)
 */
router.get('/env-check', (req, res) => {
  try {
    const envStatus = {
      ANTHROPIC_API_KEY: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        length: process.env.ANTHROPIC_API_KEY?.length || 0,
        prefix: process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...' || 'not set',
      },
      GROQ_API_KEY: {
        configured: !!process.env.GROQ_API_KEY,
        length: process.env.GROQ_API_KEY?.length || 0,
        prefix: process.env.GROQ_API_KEY?.substring(0, 10) + '...' || 'not set',
      },
      GOOGLE_API_KEY: {
        configured: !!process.env.GOOGLE_API_KEY,
        length: process.env.GOOGLE_API_KEY?.length || 0,
        prefix: process.env.GOOGLE_API_KEY?.substring(0, 10) + '...' || 'not set',
      },
    };

    res.json({
      success: true,
      data: envStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// AI TESTING & VALIDATION ENDPOINTS
// ============================================

/**
 * Test AI automation features
 */
router.post('/test-features', async (req, res) => {
  try {
    const {
      generateJobPostings,
      generateOutreachMessage,
      analyzeTender,
      matchCandidates,
    } = require('../../../utils/claude');

    const results = {};

    // Test job posting generation
    try {
      const jobPostings = await generateJobPostings({
        jobTitle: 'Test Event Assistant',
        payRate: 15,
        location: 'Marina Bay',
        requirements: 'Must be punctual and friendly',
        slots: 5,
      });
      results.jobPostings = { status: 'success', data: jobPostings };
    } catch (error) {
      results.jobPostings = { status: 'error', error: error.message };
    }

    // Test outreach message generation
    try {
      const outreach = await generateOutreachMessage(
        {
          name: 'John Tan',
          level: 2,
          total_jobs_completed: 10,
          rating: 4.5,
        },
        {
          title: 'Test Event Staff',
          location: 'Sentosa',
          job_date: '2025-02-15',
          start_time: '09:00',
          end_time: '17:00',
          pay_rate: 16,
        }
      );
      results.outreachMessage = { status: 'success', data: outreach };
    } catch (error) {
      results.outreachMessage = { status: 'error', error: error.message };
    }

    // Test tender analysis
    try {
      const analysis = await analyzeTender(
        {
          title: 'Test Administrative Support Services',
          agency: 'MOE',
          estimated_value: 250000,
          manpower_required: 8,
          duration_months: 12,
          location: 'Buona Vista',
          closing_date: '2025-03-01',
          category: 'administrative',
        },
        {
          totalCandidates: 45,
          avgRating: 4.3,
        }
      );
      results.tenderAnalysis = { status: 'success', data: analysis };
    } catch (error) {
      results.tenderAnalysis = { status: 'error', error: error.message };
    }

    // Test candidate matching
    try {
      const matches = await matchCandidates(
        {
          title: 'Test F&B Server',
          category: 'hospitality',
          location: 'Orchard Road',
          pay_rate: 14,
        },
        [
          {
            id: 'test1',
            name: 'Alice Lim',
            level: 2,
            rating: 4.2,
            total_jobs_completed: 8,
            certifications: '["Food Safety", "Customer Service"]',
          },
          {
            id: 'test2',
            name: 'Bob Chen',
            level: 1,
            rating: 3.8,
            total_jobs_completed: 3,
            certifications: '["Basic Training"]',
          },
        ]
      );
      results.candidateMatching = { status: 'success', data: matches };
    } catch (error) {
      results.candidateMatching = { status: 'error', error: error.message };
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Simple chat endpoint for testing conversational AI
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, systemPrompt = '', provider = null } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const options = {};
    if (provider) {
      options.forceProvider = provider;
    }

    const response = await askClaude(message, systemPrompt, options);

    res.json({
      success: true,
      data: {
        response: typeof response === 'string' ? response : response.response,
        provider: provider || 'auto',
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;