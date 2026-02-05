/**
 * SLM Bridge Routes
 * Endpoints for SLM (Small Language Model) integration
 * 
 * @module consultant-performance/slm-bridge/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const SLMSchedulingBridge = require('../../../../../utils/slm-scheduling-bridge');

const slmBridge = new SLMSchedulingBridge();

/**
 * POST /slm/chat-integration
 * Handle message from existing chat SLM for pending candidates
 */
router.post('/chat-integration', async (req, res) => {
  try {
    const { candidateId, message, conversationContext = {} } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required'
      });
    }

    const response = await slmBridge.integrateWithChatSLM(candidateId, message, conversationContext);

    if (response) {
      res.json({
        success: true,
        data: {
          handled: true,
          response,
          shouldReplace: true
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          handled: false,
          shouldReplace: false
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /slm/direct-message
 * Direct message handling for SLM bridge (testing/admin use)
 */
router.post('/direct-message', async (req, res) => {
  try {
    const { candidateId, message, conversationContext = {} } = req.body;

    const response = await slmBridge.handlePendingCandidateMessage(
      candidateId,
      message,
      conversationContext
    );

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /slm/conversation/:candidateId
 * Get SLM conversation history for a candidate
 */
router.get('/conversation/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const conversation = db.prepare(`
      SELECT * FROM slm_conversations
      WHERE candidate_id = ?
      ORDER BY created_at ASC
    `).all(candidateId);

    res.json({
      success: true,
      data: {
        candidateId,
        conversation,
        messageCount: conversation.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /slm/analytics
 * Get SLM bridge analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const analytics = db.prepare(`
      SELECT
        COUNT(*) as total_conversations,
        COUNT(DISTINCT candidate_id) as unique_candidates,
        AVG(LENGTH(message)) as avg_message_length,
        AVG(LENGTH(response)) as avg_response_length
      FROM slm_conversations
      WHERE created_at >= ?
    `).get(since);

    const responseTypes = db.prepare(`
      SELECT
        response_type,
        COUNT(*) as count
      FROM slm_conversations
      WHERE created_at >= ?
      GROUP BY response_type
    `).all(since);

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        summary: analytics,
        responseTypes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
