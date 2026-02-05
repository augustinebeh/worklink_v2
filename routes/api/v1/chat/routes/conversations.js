/**
 * Chat Conversations Routes
 * Handles conversation management and overview
 * @module chat/routes/conversations
 */

const express = require('express');
const { db } = require('../../../../../db');
const { authenticateAdmin } = require('../../../../../middleware/auth');
const { broadcastConversationStatus, isCandidateOnline, getOnlineCandidates } = require('../helpers/websocket-integration');
const logger = require('../../../../../utils/logger');

const router = express.Router();

/**
 * GET /
 * Get all conversations with latest message and stats
 */
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      status = 'all',
      priority = 'all',
      search,
      page = 1,
      limit = 20,
      sortBy = 'latest_message',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build base query for conversations with latest message
    let query = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.status as candidate_status,
        c.avatar_url,
        c.online_status,
        c.last_seen,

        -- Latest message info
        latest.content as latest_message,
        latest.sender as latest_sender,
        latest.created_at as latest_message_time,
        latest.read as latest_message_read,

        -- Conversation stats
        stats.total_messages,
        stats.unread_count,
        stats.admin_messages,
        stats.candidate_messages,

        -- Conversation metadata
        COALESCE(conv_meta.status, 'active') as conversation_status,
        COALESCE(conv_meta.priority, 'normal') as conversation_priority,
        COALESCE(conv_meta.assigned_to, NULL) as assigned_to,
        COALESCE(conv_meta.last_updated, c.created_at) as conversation_updated

      FROM candidates c

      -- Get latest message for each candidate
      LEFT JOIN (
        SELECT
          candidate_id,
          content,
          sender,
          created_at,
          read,
          ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY created_at DESC) as rn
        FROM messages
        WHERE deleted IS NULL OR deleted = 0
      ) latest ON c.id = latest.candidate_id AND latest.rn = 1

      -- Get conversation statistics
      LEFT JOIN (
        SELECT
          candidate_id,
          COUNT(*) as total_messages,
          COUNT(CASE WHEN read = 0 AND sender = 'candidate' THEN 1 END) as unread_count,
          COUNT(CASE WHEN sender = 'admin' THEN 1 END) as admin_messages,
          COUNT(CASE WHEN sender = 'candidate' THEN 1 END) as candidate_messages
        FROM messages
        WHERE deleted IS NULL OR deleted = 0
        GROUP BY candidate_id
      ) stats ON c.id = stats.candidate_id

      -- Get conversation metadata (create table if needed)
      LEFT JOIN (
        SELECT candidate_id, status, priority, assigned_to, last_updated
        FROM conversation_metadata
      ) conv_meta ON c.id = conv_meta.candidate_id

      WHERE 1=1
    `;

    const params = [];

    // Add filters
    if (status !== 'all') {
      query += ' AND COALESCE(conv_meta.status, \'active\') = ?';
      params.push(status);
    }

    if (priority !== 'all') {
      query += ' AND COALESCE(conv_meta.priority, \'normal\') = ?';
      params.push(priority);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.email LIKE ? OR latest.content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Only show candidates with at least one message or recent activity
    query += ' AND (stats.total_messages > 0 OR c.last_seen > datetime(\'now\', \'-30 days\'))';

    // Sorting
    const validSortFields = {
      latest_message: 'latest.created_at',
      name: 'c.name',
      unread_count: 'stats.unread_count',
      total_messages: 'stats.total_messages',
      conversation_updated: 'conversation_updated'
    };

    const sortField = validSortFields[sortBy] || 'latest.created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    // Ensure conversation metadata table exists
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS conversation_metadata (
          candidate_id INTEGER PRIMARY KEY,
          status TEXT DEFAULT 'active',
          priority TEXT DEFAULT 'normal',
          assigned_to TEXT,
          notes TEXT,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (candidate_id) REFERENCES candidates (id) ON DELETE CASCADE
        )
      `);
    } catch (tableError) {
      logger.warn('Conversation metadata table may already exist');
    }

    const conversations = db.prepare(query).all(...params);

    // Get online status for all candidates
    let onlineCandidates = [];
    try {
      onlineCandidates = await getOnlineCandidates();
    } catch (onlineError) {
      logger.warn('Failed to get online candidates', { error: onlineError.message });
    }

    // Enhance conversations with online status
    const enhancedConversations = conversations.map(conv => ({
      ...conv,
      is_online: onlineCandidates.includes(conv.id.toString()),
      has_unread: conv.unread_count > 0,
      last_activity: conv.latest_message_time || conv.last_seen,
      conversation_health: calculateConversationHealth(conv)
    }));

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM candidates c
      LEFT JOIN messages m ON c.id = m.candidate_id
      LEFT JOIN conversation_metadata conv_meta ON c.id = conv_meta.candidate_id
      WHERE 1=1
    `;
    const countParams = [];

    if (status !== 'all') {
      countQuery += ' AND COALESCE(conv_meta.status, \'active\') = ?';
      countParams.push(status);
    }

    if (priority !== 'all') {
      countQuery += ' AND COALESCE(conv_meta.priority, \'normal\') = ?';
      countParams.push(priority);
    }

    if (search) {
      countQuery += ' AND (c.name LIKE ? OR c.email LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    countQuery += ' AND (m.id IS NOT NULL OR c.last_seen > datetime(\'now\', \'-30 days\'))';

    const totalCount = db.prepare(countQuery).get(...countParams).total;

    res.json({
      success: true,
      data: enhancedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: (page * limit) < totalCount,
        hasPrev: page > 1
      },
      summary: {
        total_conversations: totalCount,
        total_unread: enhancedConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0),
        online_candidates: onlineCandidates.length,
        active_conversations: enhancedConversations.filter(c => c.conversation_status === 'active').length
      },
      filters: { status, priority, search, sortBy, order },
      message: `Retrieved ${enhancedConversations.length} conversations`
    });

  } catch (error) {
    logger.error('Error fetching conversations', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversations',
      details: error.message
    });
  }
});

/**
 * PUT /:candidateId/status
 * Update conversation status
 */
router.put('/:candidateId/status', authenticateAdmin, (req, res) => {
  try {
    const { candidateId } = req.params;
    const { status, priority, assignedTo, notes } = req.body;

    const validStatuses = ['active', 'paused', 'resolved', 'escalated', 'archived'];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid priority. Must be one of: ' + validPriorities.join(', ')
      });
    }

    // Check if candidate exists
    const candidate = db.prepare('SELECT id, name FROM candidates WHERE id = ?').get(candidateId);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Upsert conversation metadata
    const upsertStmt = db.prepare(`
      INSERT INTO conversation_metadata (candidate_id, status, priority, assigned_to, notes, last_updated)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(candidate_id) DO UPDATE SET
        status = COALESCE(?, status),
        priority = COALESCE(?, priority),
        assigned_to = COALESCE(?, assigned_to),
        notes = COALESCE(?, notes),
        last_updated = ?
    `);

    const timestamp = new Date().toISOString();
    upsertStmt.run(
      candidateId, status, priority, assignedTo, notes, timestamp,
      status, priority, assignedTo, notes, timestamp
    );

    // Get updated conversation metadata
    const updatedMeta = db.prepare(`
      SELECT * FROM conversation_metadata WHERE candidate_id = ?
    `).get(candidateId);

    // Broadcast status update
    broadcastConversationStatus(candidateId, {
      status: updatedMeta.status,
      priority: updatedMeta.priority,
      assignedTo: updatedMeta.assigned_to,
      updatedBy: req.user?.id || 'admin'
    });

    res.json({
      success: true,
      data: updatedMeta,
      candidateId,
      message: 'Conversation status updated successfully'
    });

  } catch (error) {
    logger.error('Error updating conversation status', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update conversation status',
      details: error.message
    });
  }
});

/**
 * GET /:candidateId
 * Get conversation details for a specific candidate
 */
router.get('/:candidateId', authenticateAdmin, async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Get candidate info
    const candidate = db.prepare(`
      SELECT c.*,
             COALESCE(cm.status, 'active') as conversation_status,
             COALESCE(cm.priority, 'normal') as conversation_priority,
             cm.assigned_to,
             cm.notes as conversation_notes
      FROM candidates c
      LEFT JOIN conversation_metadata cm ON c.id = cm.candidate_id
      WHERE c.id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Get conversation statistics
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN read = 0 AND sender = 'candidate' THEN 1 END) as unread_count,
        COUNT(CASE WHEN sender = 'admin' THEN 1 END) as admin_messages,
        COUNT(CASE WHEN sender = 'candidate' THEN 1 END) as candidate_messages,
        MIN(created_at) as first_message_at,
        MAX(created_at) as latest_message_at
      FROM messages
      WHERE candidate_id = ? AND (deleted IS NULL OR deleted = 0)
    `).get(candidateId);

    // Get recent messages (last 10)
    const recentMessages = db.prepare(`
      SELECT content, sender, created_at, read
      FROM messages
      WHERE candidate_id = ? AND (deleted IS NULL OR deleted = 0)
      ORDER BY created_at DESC
      LIMIT 10
    `).all(candidateId);

    // Check online status
    const isOnline = await isCandidateOnline(candidateId);

    const conversationDetails = {
      candidate,
      stats,
      recent_messages: recentMessages.reverse(), // Oldest first for conversation flow
      is_online: isOnline,
      conversation_health: calculateConversationHealth({ ...candidate, ...stats }),
      last_activity: stats.latest_message_at || candidate.last_seen
    };

    res.json({
      success: true,
      data: conversationDetails,
      candidateId,
      message: 'Conversation details retrieved successfully'
    });

  } catch (error) {
    logger.error('Error fetching conversation details', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve conversation details',
      details: error.message
    });
  }
});

/**
 * Calculate conversation health score
 * @param {Object} conversation - Conversation data
 * @returns {Object} Health score and indicators
 */
function calculateConversationHealth(conversation) {
  let score = 100;
  const indicators = [];

  // Check response time
  if (conversation.unread_count > 5) {
    score -= 20;
    indicators.push('high_unread_count');
  }

  // Check activity level
  const lastActivity = new Date(conversation.latest_message_time || conversation.last_seen || 0);
  const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceActivity > 7) {
    score -= 30;
    indicators.push('inactive_conversation');
  } else if (daysSinceActivity > 3) {
    score -= 15;
    indicators.push('low_activity');
  }

  // Check conversation balance
  const adminMessages = conversation.admin_messages || 0;
  const candidateMessages = conversation.candidate_messages || 0;
  const totalMessages = adminMessages + candidateMessages;

  if (totalMessages > 0) {
    const candidateRatio = candidateMessages / totalMessages;
    if (candidateRatio < 0.2) {
      score -= 15;
      indicators.push('low_candidate_engagement');
    } else if (candidateRatio > 0.8) {
      score -= 10;
      indicators.push('admin_response_needed');
    }
  }

  // Determine health level
  let healthLevel = 'excellent';
  if (score < 50) healthLevel = 'poor';
  else if (score < 70) healthLevel = 'fair';
  else if (score < 85) healthLevel = 'good';

  return {
    score: Math.max(0, score),
    level: healthLevel,
    indicators,
    last_activity_days: Math.round(daysSinceActivity)
  };
}

module.exports = router;