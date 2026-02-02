/**
 * Template Response System API Routes
 *
 * Admin interface for managing fact-based template responses
 * Replaces AI-generated responses with honest, accurate information
 */

const express = require('express');
const router = express.Router();
const FactBasedTemplateSystem = require('../../../services/template-responses');

// Initialize template system
const templateSystem = new FactBasedTemplateSystem();

/**
 * Process a message using the fact-based template system
 * POST /api/v1/template-responses/process
 */
router.post('/process', async (req, res) => {
  try {
    const { candidateId, message, channel = 'app', adminMode = 'auto' } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required'
      });
    }

    const response = await templateSystem.processMessage(candidateId, message, {
      channel,
      adminMode
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ [Template API] Process error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get escalation queue for admin dashboard
 * GET /api/v1/template-responses/escalations
 */
router.get('/escalations', async (req, res) => {
  try {
    const {
      status = 'pending',
      priority,
      category,
      adminId,
      limit = 50
    } = req.query;

    const escalations = await templateSystem.getEscalationQueue(status, parseInt(limit));

    res.json({
      success: true,
      data: escalations
    });

  } catch (error) {
    console.error('❌ [Template API] Escalation queue error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Assign escalation to admin
 * POST /api/v1/template-responses/escalations/:id/assign
 */
router.post('/escalations/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        error: 'adminId is required'
      });
    }

    const result = await templateSystem.assignEscalation(id, adminId);

    if (result) {
      res.json({
        success: true,
        message: 'Escalation assigned successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to assign escalation'
      });
    }

  } catch (error) {
    console.error('❌ [Template API] Assign escalation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Resolve escalation
 * POST /api/v1/template-responses/escalations/:id/resolve
 */
router.post('/escalations/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, resolutionNotes } = req.body;

    if (!adminId || !resolutionNotes) {
      return res.status(400).json({
        success: false,
        error: 'adminId and resolutionNotes are required'
      });
    }

    const result = await templateSystem.resolveEscalation(id, resolutionNotes);

    if (result) {
      res.json({
        success: true,
        message: 'Escalation resolved successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to resolve escalation'
      });
    }

  } catch (error) {
    console.error('❌ [Template API] Resolve escalation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get template analytics
 * GET /api/v1/template-responses/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await templateSystem.getTemplateAnalytics(parseInt(days));

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('❌ [Template API] Analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Record admin feedback on template effectiveness
 * POST /api/v1/template-responses/feedback
 */
router.post('/feedback', async (req, res) => {
  try {
    const { usageLogId, feedback, effectivenessScore } = req.body;

    if (!usageLogId || effectivenessScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'usageLogId and effectivenessScore are required'
      });
    }

    await templateSystem.recordAdminFeedback(usageLogId, feedback, effectivenessScore);

    res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('❌ [Template API] Feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test template response system
 * POST /api/v1/template-responses/test
 */
router.post('/test', async (req, res) => {
  try {
    const { message, candidateId = 'test-candidate' } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }

    // Test intent classification
    const intent = await templateSystem.intentClassifier.classifyMessage(message);

    // Test template matching (without actually sending)
    const template = await templateSystem.templateManager.findBestTemplate(intent);

    res.json({
      success: true,
      data: {
        intent,
        template: template ? {
          id: template.id,
          name: template.name,
          category: template.category_name,
          confidence: template.confidence_score
        } : null,
        wouldEscalate: templateSystem.escalationHandler.checkEscalation(message, intent, {
          status: 'active'
        }).shouldEscalate
      }
    });

  } catch (error) {
    console.error('❌ [Template API] Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get system status and configuration
 * GET /api/v1/template-responses/status
 */
router.get('/status', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        system: 'fact-based-template-responses',
        version: '1.0.0',
        status: 'active',
        features: {
          intent_classification: true,
          real_data_integration: true,
          escalation_handling: true,
          template_management: true,
          admin_analytics: true
        },
        principles: [
          'NEVER make promises about timing',
          'ALWAYS defer to admin team for specifics',
          'Use actual user data when available',
          'Provide helpful information without commitments'
        ]
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
 * A/B test endpoint for comparing template responses
 * POST /api/v1/template-responses/ab-test
 */
router.post('/ab-test', async (req, res) => {
  try {
    const { candidateId, message, templateId, variant = 'A' } = req.body;

    // Process with specific template for A/B testing
    const response = await templateSystem.processMessage(candidateId, message, {
      testMode: true,
      variant
    });

    // Log A/B test data
    // This would integrate with your A/B testing infrastructure

    res.json({
      success: true,
      data: {
        ...response,
        variant,
        testMode: true
      }
    });

  } catch (error) {
    console.error('❌ [Template API] A/B test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;