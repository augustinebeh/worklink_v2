/**
 * AI Chat API Routes
 *
 * Endpoints for AI chat settings, suggestions, and actions.
 */

const express = require('express');
const router = express.Router();
const aiChat = require('../../../services/ai-chat');

// =====================================================
// AI SETTINGS
// =====================================================

/**
 * GET /api/v1/ai-chat/settings
 * Get AI chat settings
 */
router.get('/settings', (req, res) => {
  try {
    const settings = aiChat.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/ai-chat/settings
 * Update AI chat settings
 */
router.put('/settings', (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }

    aiChat.updateSetting(key, value);
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// CONVERSATION SETTINGS
// =====================================================

/**
 * GET /api/v1/ai-chat/conversations/:candidateId/mode
 * Get AI mode for a specific conversation
 */
router.get('/conversations/:candidateId/mode', (req, res) => {
  try {
    const mode = aiChat.getConversationMode(req.params.candidateId);
    res.json({ success: true, data: { mode } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/ai-chat/conversations/:candidateId/mode
 * Set AI mode for a specific conversation
 */
router.put('/conversations/:candidateId/mode', (req, res) => {
  try {
    const { mode } = req.body;

    if (!['off', 'auto', 'suggest', 'inherit'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Mode must be: off, auto, suggest, or inherit',
      });
    }

    aiChat.setConversationMode(req.params.candidateId, mode);

    res.json({ success: true, message: 'Mode updated', data: { mode } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// SUGGESTIONS
// =====================================================

/**
 * GET /api/v1/ai-chat/suggestions
 * Get pending AI suggestions for review
 */
router.get('/suggestions', (req, res) => {
  try {
    const { candidateId } = req.query;
    const suggestions = aiChat.getPendingSuggestions(candidateId);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ai-chat/suggestions/:id/accept
 * Accept and send an AI suggestion
 */
router.post('/suggestions/:id/accept', async (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({ success: false, error: 'candidateId is required' });
    }

    const result = await aiChat.acceptSuggestion(parseInt(req.params.id), candidateId);

    res.json({
      success: true,
      message: 'Suggestion accepted and sent',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ai-chat/suggestions/:id/edit
 * Edit and send an AI suggestion
 */
router.post('/suggestions/:id/edit', async (req, res) => {
  try {
    const { candidateId, content } = req.body;

    if (!candidateId || !content) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and content are required',
      });
    }

    const result = await aiChat.editAndSendSuggestion(
      parseInt(req.params.id),
      candidateId,
      content
    );

    res.json({
      success: true,
      message: 'Suggestion edited and sent',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ai-chat/suggestions/:id/dismiss
 * Dismiss an AI suggestion
 */
router.post('/suggestions/:id/dismiss', async (req, res) => {
  try {
    await aiChat.dismissSuggestion(parseInt(req.params.id));
    res.json({ success: true, message: 'Suggestion dismissed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// MANUAL AI GENERATION
// =====================================================

/**
 * POST /api/v1/ai-chat/generate
 * Manually generate an AI response (for testing or on-demand)
 */
router.post('/generate', async (req, res) => {
  try {
    const { candidateId, message } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required',
      });
    }

    const response = await aiChat.generateResponse(candidateId, message, {
      mode: 'suggest',
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ai-chat/send
 * Send an AI-generated response directly
 */
router.post('/send', async (req, res) => {
  try {
    const { candidateId, content, channel = 'app' } = req.body;

    if (!candidateId || !content) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and content are required',
      });
    }

    const result = await aiChat.sendAIResponse(candidateId, { content }, channel);

    res.json({
      success: true,
      message: 'AI response sent',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// INTENT DETECTION
// =====================================================

/**
 * POST /api/v1/ai-chat/detect-intent
 * Detect intent from a message (for testing)
 */
router.post('/detect-intent', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const intent = await aiChat.detectIntent(message);

    res.json({ success: true, data: intent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
