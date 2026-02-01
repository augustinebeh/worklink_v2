/**
 * Quick Replies API Routes
 *
 * Endpoints for getting context-aware quick reply suggestions for workers.
 */

const express = require('express');
const router = express.Router();

// Lazy load service
let quickRepliesService = null;
function getQuickRepliesService() {
  if (!quickRepliesService) {
    quickRepliesService = require('../../../services/quick-replies');
  }
  return quickRepliesService;
}

/**
 * GET /api/v1/quick-replies/:candidateId
 * Get suggested quick replies for a candidate
 */
router.get('/:candidateId', async (req, res) => {
  try {
    const { limit = 4 } = req.query;
    const service = getQuickRepliesService();

    const result = await service.getSuggestedReplies(
      req.params.candidateId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        context: result.context,
        suggestions: result.suggestions,
        personalized: result.personalized,
      },
    });
  } catch (error) {
    // Return default suggestions on error
    res.json({
      success: true,
      data: {
        context: { type: 'default', confidence: 0 },
        suggestions: ['Thanks!', 'Okay, noted', 'I have a question', 'Can you help me?'],
        personalized: false,
      },
    });
  }
});

/**
 * GET /api/v1/quick-replies/:candidateId/frequent
 * Get candidate's frequently used replies
 */
router.get('/:candidateId/frequent', async (req, res) => {
  try {
    const service = getQuickRepliesService();
    const replies = await service.getCustomReplies(req.params.candidateId);

    res.json({
      success: true,
      data: replies,
    });
  } catch (error) {
    res.json({ success: true, data: [] });
  }
});

/**
 * POST /api/v1/quick-replies/:candidateId/track
 * Track when a candidate uses a suggestion
 */
router.post('/:candidateId/track', async (req, res) => {
  try {
    const { suggestion, contextType } = req.body;

    if (!suggestion) {
      return res.status(400).json({ success: false, error: 'suggestion is required' });
    }

    const service = getQuickRepliesService();
    await service.trackSuggestionUsage(
      req.params.candidateId,
      suggestion,
      contextType || 'unknown'
    );

    res.json({ success: true, message: 'Usage tracked' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/quick-replies/:candidateId/frequent
 * Add a frequent reply for candidate
 */
router.post('/:candidateId/frequent', async (req, res) => {
  try {
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ success: false, error: 'reply is required' });
    }

    const service = getQuickRepliesService();
    await service.addFrequentReply(req.params.candidateId, reply);

    res.json({ success: true, message: 'Frequent reply added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/quick-replies/detect-context
 * Detect context from a message (for testing/debugging)
 */
router.post('/detect-context', (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const service = getQuickRepliesService();
    const context = service.detectContext(message);
    const allContexts = service.analyzeMessageContexts(message);

    res.json({
      success: true,
      data: {
        primary: context,
        all: allContexts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
