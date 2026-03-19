/**
 * Chat API - Main Router
 * Modular implementation replacing the original 473-line monolithic file
 *
 * Features:
 * - Real-time messaging with WebSocket integration
 * - AI-powered quick reply suggestions
 * - Conversation management and analytics
 * - Typing indicators and read receipts
 * - Multi-channel message delivery
 * - Message history and search
 *
 * @module chat
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../db');
const { authenticateAny, authenticateAdmin } = require('../../../../middleware/auth');
const { createLogger } = require('../../../../utils/structured-logger');

const logger = createLogger('api:chat');

// Import route modules
const messagesRoutes = require('./routes/messages');
const conversationsRoutes = require('./routes/conversations');
const chatAttachmentsRoutes = require('../chat-attachments');

// Mount route modules
router.use('/messages', messagesRoutes);        // Message CRUD operations
router.use('/conversations', conversationsRoutes);  // Conversation management
router.use('/attachments', chatAttachmentsRoutes);  // File attachments

/**
 * GET /templates
 * Get message templates for quick replies
 * (Mounted at /chat/templates for frontend compatibility)
 */
router.get('/templates', authenticateAny, (req, res) => {
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='message_templates'").get();

    if (!tableExists) {
      return res.json({
        success: true,
        data: [
          { id: 'welcome', name: 'Welcome', content: 'Welcome to WorkLink! How can we help you today?' },
          { id: 'job_update', name: 'Job Update', content: 'We have new job opportunities that match your profile.' },
          { id: 'payment_confirm', name: 'Payment Confirmation', content: 'Your payment has been processed successfully.' },
          { id: 'schedule_reminder', name: 'Schedule Reminder', content: 'This is a reminder about your upcoming assignment.' }
        ],
        source: 'defaults'
      });
    }

    const templates = db.prepare('SELECT * FROM message_templates ORDER BY name').all();
    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Error fetching templates', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to retrieve templates' });
  }
});

// Path-based message routes (frontend expects /chat/{candidateId}/messages)
router.get('/:candidateId/messages', authenticateAny, (req, res, next) => {
  req.query.candidateId = req.params.candidateId;
  req.url = '/';
  messagesRoutes(req, res, next);
});

// Admin message routes (frontend expects /chat/admin/{candidateId}/messages)
router.get('/admin/:candidateId/messages', authenticateAdmin, (req, res, next) => {
  req.query.candidateId = req.params.candidateId;
  req.query.markAsRead = 'true';
  req.url = '/';
  messagesRoutes(req, res, next);
});

router.post('/admin/:candidateId/messages', authenticateAdmin, (req, res, next) => {
  req.body.candidateId = req.params.candidateId;
  req.url = '/';
  messagesRoutes(req, res, next);
});

// Legacy admin routes (for backward compatibility)
router.use('/admin/conversations', conversationsRoutes);  // Admin conversations endpoint
router.use('/admin/candidates', conversationsRoutes);     // Admin candidates endpoint

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    module: 'chat',
    version: '2.0.0',
    architecture: 'modular'
  });
});

/**
 * GET /stats
 * Get chat system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { db } = require('../../../../db');
    const { getOnlineCandidates } = require('./helpers/websocket-integration');

    // Get basic message stats
    const messageStats = db.prepare(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN sender = 'admin' THEN 1 END) as admin_messages,
        COUNT(CASE WHEN sender = 'candidate' THEN 1 END) as candidate_messages,
        COUNT(CASE WHEN read = 0 AND sender = 'candidate' THEN 1 END) as unread_messages,
        COUNT(CASE WHEN created_at >= DATE('now', '-24 hours') THEN 1 END) as messages_24h,
        COUNT(CASE WHEN created_at >= DATE('now', '-7 days') THEN 1 END) as messages_7d
      FROM messages
      WHERE 1=1
    `).get();

    // Get conversation stats
    const conversationStats = db.prepare(`
      SELECT
        COUNT(DISTINCT candidate_id) as total_conversations,
        COUNT(DISTINCT CASE WHEN created_at >= DATE('now', '-24 hours') THEN candidate_id END) as active_24h,
        COUNT(DISTINCT CASE WHEN created_at >= DATE('now', '-7 days') THEN candidate_id END) as active_7d
      FROM messages
      WHERE 1=1
    `).get();

    // Get top conversation candidates
    const topConversations = db.prepare(`
      SELECT
        c.id,
        c.name,
        COUNT(m.id) as message_count,
        MAX(m.created_at) as last_message_time
      FROM candidates c
      JOIN messages m ON c.id = m.candidate_id
      GROUP BY c.id, c.name
      ORDER BY message_count DESC
      LIMIT 10
    `).all();

    // Get message trends (daily for last 7 days)
    const messageTrends = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as message_count,
        COUNT(DISTINCT candidate_id) as unique_conversations
      FROM messages
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    // Get online count properly
    let onlineCount = 0;
    try {
      const onlineCandidates = await getOnlineCandidates();
      onlineCount = onlineCandidates.length;
    } catch (error) {
      // Online count is non-critical, default to 0
    }

    res.json({
      success: true,
      data: {
        messages: messageStats,
        conversations: conversationStats,
        top_conversations: topConversations,
        trends: messageTrends,
        online_candidates: onlineCount
      },
      generated_at: new Date().toISOString(),
      module: 'chat'
    });

  } catch (error) {
    logger.error('Error fetching chat stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat statistics',
      details: 'Internal server error'
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
    message: 'Chat API - Modular Implementation',
    version: '2.0.0',
    architecture: 'modular',
    status: 'operational',
    endpoints: {
      // Message operations
      'GET /messages': 'Get messages for a conversation',
      'POST /messages': 'Send a new message',
      'POST /messages/quick-replies': 'Generate AI quick reply suggestions',
      'POST /messages/typing': 'Send typing indicator',
      'PUT /messages/:id/read': 'Mark message as read',
      'DELETE /messages/:id': 'Delete message (admin only)',

      // Conversation operations
      'GET /conversations': 'List all conversations with stats',
      'GET /conversations/:candidateId': 'Get specific conversation details',
      'PUT /conversations/:candidateId/status': 'Update conversation status',

      // Utility endpoints
      'GET /health': 'Health check',
      'GET /stats': 'Chat system statistics'
    },
    features: [
      'Real-time messaging with WebSocket integration',
      'AI-powered quick reply suggestions (Groq API)',
      'Typing indicators and read receipts',
      'Conversation management and status tracking',
      'Multi-channel message delivery',
      'Message search and filtering',
      'Conversation analytics and health scoring',
      'Admin tools for message moderation',
      'Online presence tracking'
    ],
    integrations: {
      websocket: 'Real-time message broadcasting',
      groq_api: 'AI quick reply generation',
      messaging_service: 'Multi-channel delivery',
      database: 'Message persistence and history'
    },
    refactoring: {
      original_file: 'chat.js (473 lines)',
      new_structure: 'Modular architecture with 5 files',
      improvements: [
        'Separated message and conversation logic',
        'Extracted AI reply generation',
        'Improved WebSocket integration',
        'Added conversation analytics',
        'Enhanced error handling',
        'Better code organization'
      ]
    }
  });
});

// Legacy compatibility endpoints (for backward compatibility)
// These delegate to the new modular structure

/**
 * GET /send (legacy)
 * Legacy endpoint - redirects to POST /messages
 */
router.all('/send', (req, res) => {
  res.status(301).json({
    success: false,
    error: 'This endpoint has moved',
    new_endpoint: 'POST /api/v1/chat/messages',
    message: 'Please use the new modular endpoint structure'
  });
});

module.exports = router;