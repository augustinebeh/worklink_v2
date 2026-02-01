/**
 * Conversation Management API Routes
 *
 * Endpoints for managing conversation metadata, status, priority, and search.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Lazy load services to avoid circular dependencies
let conversationManager = null;
function getConversationManager() {
  if (!conversationManager) {
    conversationManager = require('../../../services/conversation-manager');
  }
  return conversationManager;
}

// =====================================================
// CONVERSATION METADATA
// =====================================================

/**
 * GET /api/v1/conversations
 * Get all conversations with metadata
 */
router.get('/', (req, res) => {
  try {
    const { status, priority, escalated } = req.query;
    const convManager = getConversationManager();

    let conversations;

    if (escalated === 'true') {
      conversations = convManager.getEscalatedConversations();
    } else if (status) {
      conversations = convManager.getConversationsByStatus(status);
    } else if (priority) {
      conversations = convManager.getConversationsByPriority(priority);
    } else {
      // Get all conversations with metadata
      conversations = db.prepare(`
        SELECT
          c.id as candidate_id,
          c.name,
          c.email,
          c.profile_photo,
          c.online_status,
          c.last_seen,
          cm.status,
          cm.priority,
          cm.tags,
          cm.assigned_to,
          cm.escalated,
          cm.escalation_reason,
          cm.last_admin_reply_at,
          cm.resolved_at,
          cm.updated_at,
          (SELECT content FROM messages WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT sender FROM messages WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender,
          (SELECT created_at FROM messages WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
          (SELECT COUNT(*) FROM messages WHERE candidate_id = c.id AND sender = 'candidate' AND read = 0) as unread_count
        FROM candidates c
        LEFT JOIN conversation_metadata cm ON c.id = cm.candidate_id
        WHERE EXISTS (SELECT 1 FROM messages WHERE candidate_id = c.id)
        ORDER BY
          CASE WHEN cm.priority = 'urgent' THEN 0
               WHEN cm.priority = 'high' THEN 1
               WHEN cm.priority = 'normal' THEN 2
               ELSE 3 END,
          cm.escalated DESC,
          last_message_at DESC
      `).all();
    }

    res.json({ success: true, data: conversations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/conversations/:candidateId
 * Get conversation metadata for a specific candidate
 */
router.get('/:candidateId', (req, res) => {
  try {
    const convManager = getConversationManager();
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/conversations/:candidateId/status
 * Update conversation status
 */
router.put('/:candidateId/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'pending', 'resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const convManager = getConversationManager();
    convManager.updateStatus(req.params.candidateId, status);
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/conversations/:candidateId/priority
 * Update conversation priority
 */
router.put('/:candidateId/priority', (req, res) => {
  try {
    const { priority } = req.body;
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Priority must be one of: ${validPriorities.join(', ')}`,
      });
    }

    const convManager = getConversationManager();
    convManager.updatePriority(req.params.candidateId, priority);
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/conversations/:candidateId/resolve
 * Mark conversation as resolved
 */
router.post('/:candidateId/resolve', (req, res) => {
  try {
    const convManager = getConversationManager();
    convManager.resolve(req.params.candidateId);
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata, message: 'Conversation resolved' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/conversations/:candidateId/escalate
 * Escalate conversation
 */
router.post('/:candidateId/escalate', (req, res) => {
  try {
    const { reason } = req.body;

    const convManager = getConversationManager();
    convManager.escalate(req.params.candidateId, reason || 'Manual escalation');
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata, message: 'Conversation escalated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/conversations/:candidateId/assign
 * Assign conversation to an admin
 */
router.put('/:candidateId/assign', (req, res) => {
  try {
    const { adminId } = req.body;

    const convManager = getConversationManager();
    convManager.assignTo(req.params.candidateId, adminId);
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/conversations/:candidateId/tags
 * Add tag to conversation
 */
router.post('/:candidateId/tags', (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag) {
      return res.status(400).json({ success: false, error: 'Tag is required' });
    }

    const convManager = getConversationManager();
    convManager.addTag(req.params.candidateId, tag);
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/conversations/:candidateId/tags/:tag
 * Remove tag from conversation
 */
router.delete('/:candidateId/tags/:tag', (req, res) => {
  try {
    const convManager = getConversationManager();
    convManager.removeTag(req.params.candidateId, req.params.tag);
    const metadata = convManager.getConversationMetadata(req.params.candidateId);

    res.json({ success: true, data: metadata });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// MESSAGE SEARCH
// =====================================================

/**
 * GET /api/v1/conversations/search/messages
 * Search messages across conversations
 */
router.get('/search/messages', (req, res) => {
  try {
    const { q, candidateId, limit = 50 } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Search query (q) is required' });
    }

    const convManager = getConversationManager();
    const results = convManager.searchMessages(q, candidateId);

    res.json({
      success: true,
      data: results.slice(0, parseInt(limit)),
      total: results.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// STATISTICS
// =====================================================

/**
 * GET /api/v1/conversations/stats/summary
 * Get conversation statistics
 */
router.get('/stats/summary', (req, res) => {
  try {
    const convManager = getConversationManager();
    const stats = convManager.getStatistics();

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
