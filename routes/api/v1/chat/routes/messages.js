/**
 * Chat Messages Routes
 * Handles message CRUD operations and real-time messaging
 * @module chat/routes/messages
 */

const express = require('express');
const { db } = require('../../../../../db');
const { authenticateAdmin, authenticateCandidateOwnership, authenticateAny } = require('../../../../../middleware/auth');
const { broadcastToCandidate, broadcastToAdmins, broadcastTypingIndicator, broadcastReadReceipt } = require('../helpers/websocket-integration');
const { generateAIQuickReplies, getDefaultReplies } = require('../helpers/ai-replies');
const messaging = require('../../../../../services/messaging');
const logger = require('../../../../../utils/logger');

const router = express.Router();

/**
 * GET /
 * Get messages for a conversation
 */
router.get('/', authenticateAny, (req, res) => {
  try {
    const { candidateId, limit = 50, offset = 0, since } = req.query;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required'
      });
    }

    // Build query with optional since parameter for real-time updates
    let query = `
      SELECT m.*, c.name as candidate_name
      FROM messages m
      LEFT JOIN candidates c ON m.candidate_id = c.id
      WHERE m.candidate_id = ?
    `;
    const params = [candidateId];

    if (since) {
      query += ' AND m.created_at > ?';
      params.push(since);
    }

    query += ' ORDER BY m.created_at ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const messages = db.prepare(query).all(...params);

    // Mark messages as read if requested by admin
    if (req.user && req.user.role === 'admin' && req.query.markAsRead === 'true') {
      try {
        db.prepare(`
          UPDATE messages
          SET read = 1, read_at = ?
          WHERE candidate_id = ? AND sender = 'candidate' AND read = 0
        `).run(new Date().toISOString(), candidateId);

        // Broadcast read receipt
        if (messages.length > 0) {
          const lastCandidateMessage = messages.reverse().find(m => m.sender === 'candidate');
          if (lastCandidateMessage) {
            broadcastReadReceipt(candidateId, lastCandidateMessage.id, 'admin');
          }
        }
      } catch (readError) {
        logger.warn('Failed to mark messages as read', { error: readError.message });
      }
    }

    res.json({
      success: true,
      data: messages,
      candidateId,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: messages.length === parseInt(limit)
      },
      message: `Retrieved ${messages.length} messages`
    });

  } catch (error) {
    logger.error('Error fetching messages', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve messages',
      details: error.message
    });
  }
});

/**
 * POST /
 * Send a new message
 */
router.post('/', authenticateAny, async (req, res) => {
  try {
    const { candidateId, content, channel = 'app' } = req.body;
    const sender = req.user?.role === 'admin' ? 'admin' : 'candidate';

    if (!candidateId || !content) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and content are required'
      });
    }

    if (!content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content cannot be empty'
      });
    }

    // Validate candidateId exists
    const candidate = db.prepare('SELECT id, name FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Insert message into database
    const messageData = {
      candidate_id: candidateId,
      content: content.trim(),
      sender,
      channel,
      created_at: new Date().toISOString(),
      read: sender === 'admin' ? 1 : 0, // Admin messages are auto-marked as read
      sender_id: req.user?.id || null
    };

    const insertStmt = db.prepare(`
      INSERT INTO messages (candidate_id, content, sender, channel, created_at, read, sender_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      messageData.candidate_id,
      messageData.content,
      messageData.sender,
      messageData.channel,
      messageData.created_at,
      messageData.read,
      messageData.sender_id
    );

    if (!result.lastInsertRowid) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save message'
      });
    }

    // Get the created message with additional data
    const savedMessage = db.prepare(`
      SELECT m.*, c.name as candidate_name
      FROM messages m
      LEFT JOIN candidates c ON m.candidate_id = c.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    // Broadcast to appropriate recipients via WebSocket
    try {
      if (sender === 'admin') {
        broadcastToCandidate(candidateId, savedMessage);
      } else {
        broadcastToAdmins(savedMessage);
      }
    } catch (wsError) {
      logger.warn('Failed to broadcast message via WebSocket', { error: wsError.message });
    }

    // Send via messaging service for multi-channel delivery
    try {
      if (sender === 'admin') {
        await messaging.sendMessage(candidateId, content, { channel, priority: 'normal' });
      }
    } catch (msgError) {
      logger.warn('Failed to send message via messaging service', { error: msgError.message });
    }

    res.status(201).json({
      success: true,
      data: savedMessage,
      messageId: result.lastInsertRowid,
      message: 'Message sent successfully'
    });

  } catch (error) {
    logger.error('Error sending message', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message
    });
  }
});

/**
 * POST /quick-replies
 * Generate quick reply suggestions
 */
router.post('/quick-replies', authenticateAny, async (req, res) => {
  try {
    const { candidateId, lastMessage, includeContext = true } = req.body;

    if (!candidateId || !lastMessage) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and lastMessage are required'
      });
    }

    let conversationContext = [];

    // Get conversation context if requested
    if (includeContext) {
      try {
        conversationContext = db.prepare(`
          SELECT content, sender, created_at
          FROM messages
          WHERE candidate_id = ?
          ORDER BY created_at DESC
          LIMIT 10
        `).all(candidateId);
      } catch (contextError) {
        logger.warn('Failed to fetch conversation context', { error: contextError.message });
      }
    }

    // Generate AI quick replies
    const quickReplies = await generateAIQuickReplies(lastMessage, conversationContext);

    // Fallback to default replies if AI generation fails
    const finalReplies = quickReplies || getDefaultReplies(lastMessage);

    res.json({
      success: true,
      data: {
        quickReplies: finalReplies,
        candidateId,
        lastMessage: lastMessage.substring(0, 100),
        generated_by: quickReplies ? 'ai' : 'default'
      },
      message: `Generated ${finalReplies.length} quick reply suggestions`
    });

  } catch (error) {
    logger.error('Error generating quick replies', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to generate quick replies',
      details: error.message
    });
  }
});

/**
 * POST /typing
 * Send typing indicator
 */
router.post('/typing', authenticateAny, (req, res) => {
  try {
    const { candidateId, isTyping = true } = req.body;
    const sender = req.user?.role === 'admin' ? 'admin' : 'candidate';

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required'
      });
    }

    // Broadcast typing indicator
    broadcastTypingIndicator(candidateId, sender, isTyping);

    res.json({
      success: true,
      message: 'Typing indicator sent',
      candidateId,
      sender,
      isTyping
    });

  } catch (error) {
    logger.error('Error sending typing indicator', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send typing indicator',
      details: error.message
    });
  }
});

/**
 * PUT /:id/read
 * Mark message as read
 */
router.put('/:id/read', authenticateAny, (req, res) => {
  try {
    const { id } = req.params;
    const reader = req.user?.role === 'admin' ? 'admin' : 'candidate';

    // Get message details
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Update read status
    const result = db.prepare(`
      UPDATE messages
      SET read = 1, read_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to update read status'
      });
    }

    // Broadcast read receipt
    broadcastReadReceipt(message.candidate_id, id, reader);

    res.json({
      success: true,
      message: 'Message marked as read',
      messageId: id,
      reader
    });

  } catch (error) {
    logger.error('Error marking message as read', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read',
      details: error.message
    });
  }
});

/**
 * DELETE /:id
 * Delete a message (admin only)
 */
router.delete('/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Get message details before deletion
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Soft delete - mark as deleted instead of removing
    const result = db.prepare(`
      UPDATE messages
      SET deleted = 1, deleted_at = ?, deleted_by = ?
      WHERE id = ?
    `).run(new Date().toISOString(), req.user?.id || 'admin', id);

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete message'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully',
      messageId: id
    });

  } catch (error) {
    logger.error('Error deleting message', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete message',
      details: error.message
    });
  }
});

module.exports = router;