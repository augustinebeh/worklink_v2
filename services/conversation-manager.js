/**
 * Conversation Manager Service
 *
 * Manages conversation metadata including status, priority, tags,
 * assignments, escalations, and message search functionality.
 *
 * Provides auto-escalation logic based on AI confidence,
 * sentiment analysis, and admin response times.
 */

const { db } = require('../db');

// Ensure conversation metadata table exists
function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'normal',
      tags TEXT DEFAULT '[]',
      assigned_to TEXT,
      escalated INTEGER DEFAULT 0,
      escalation_reason TEXT,
      escalated_at DATETIME,
      resolved_at DATETIME,
      last_admin_reply_at DATETIME,
      last_candidate_message_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE INDEX IF NOT EXISTS idx_conversation_metadata_status ON conversation_metadata(status);
    CREATE INDEX IF NOT EXISTS idx_conversation_metadata_priority ON conversation_metadata(priority);
    CREATE INDEX IF NOT EXISTS idx_conversation_metadata_escalated ON conversation_metadata(escalated);
    CREATE INDEX IF NOT EXISTS idx_conversation_metadata_assigned ON conversation_metadata(assigned_to);
  `);
}

// Initialize schema on module load
ensureSchema();

// Valid status and priority values
const VALID_STATUSES = ['open', 'pending', 'resolved'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

// Negative sentiment keywords for auto-escalation
const NEGATIVE_SENTIMENT_KEYWORDS = [
  'angry',
  'frustrated',
  'problem',
  'urgent',
  'complaint',
  'refund',
  'cancel'
];

// Time threshold for no admin reply (24 hours in milliseconds)
const NO_REPLY_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Get or create conversation metadata for a candidate
 * @param {string} candidateId - The candidate ID
 * @returns {object} Conversation metadata
 */
function getConversationMetadata(candidateId) {
  let metadata = db.prepare(`
    SELECT * FROM conversation_metadata WHERE candidate_id = ?
  `).get(candidateId);

  if (!metadata) {
    // Create new metadata entry
    db.prepare(`
      INSERT INTO conversation_metadata (candidate_id, created_at, updated_at)
      VALUES (?, datetime('now'), datetime('now'))
    `).run(candidateId);

    metadata = db.prepare(`
      SELECT * FROM conversation_metadata WHERE candidate_id = ?
    `).get(candidateId);
  }

  // Parse tags JSON
  if (metadata && metadata.tags) {
    try {
      metadata.tags = JSON.parse(metadata.tags);
    } catch (e) {
      metadata.tags = [];
    }
  }

  return metadata;
}

/**
 * Update conversation status
 * @param {string} candidateId - The candidate ID
 * @param {string} status - New status ('open', 'pending', 'resolved')
 * @returns {object} Updated metadata
 */
function updateStatus(candidateId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // Ensure metadata exists
  getConversationMetadata(candidateId);

  db.prepare(`
    UPDATE conversation_metadata
    SET status = ?, updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(status, candidateId);

  return getConversationMetadata(candidateId);
}

/**
 * Update conversation priority
 * @param {string} candidateId - The candidate ID
 * @param {string} priority - New priority ('low', 'normal', 'high', 'urgent')
 * @returns {object} Updated metadata
 */
function updatePriority(candidateId, priority) {
  if (!VALID_PRIORITIES.includes(priority)) {
    throw new Error(`Invalid priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  // Ensure metadata exists
  getConversationMetadata(candidateId);

  db.prepare(`
    UPDATE conversation_metadata
    SET priority = ?, updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(priority, candidateId);

  return getConversationMetadata(candidateId);
}

/**
 * Add a tag to a conversation
 * @param {string} candidateId - The candidate ID
 * @param {string} tag - Tag to add
 * @returns {object} Updated metadata
 */
function addTag(candidateId, tag) {
  const metadata = getConversationMetadata(candidateId);
  const tags = metadata.tags || [];

  // Normalize tag (lowercase, trimmed)
  const normalizedTag = tag.toLowerCase().trim();

  // Check if tag already exists
  if (!tags.includes(normalizedTag)) {
    tags.push(normalizedTag);

    db.prepare(`
      UPDATE conversation_metadata
      SET tags = ?, updated_at = datetime('now')
      WHERE candidate_id = ?
    `).run(JSON.stringify(tags), candidateId);
  }

  return getConversationMetadata(candidateId);
}

/**
 * Remove a tag from a conversation
 * @param {string} candidateId - The candidate ID
 * @param {string} tag - Tag to remove
 * @returns {object} Updated metadata
 */
function removeTag(candidateId, tag) {
  const metadata = getConversationMetadata(candidateId);
  const tags = metadata.tags || [];

  // Normalize tag (lowercase, trimmed)
  const normalizedTag = tag.toLowerCase().trim();

  // Filter out the tag
  const newTags = tags.filter(t => t !== normalizedTag);

  db.prepare(`
    UPDATE conversation_metadata
    SET tags = ?, updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(JSON.stringify(newTags), candidateId);

  return getConversationMetadata(candidateId);
}

/**
 * Assign conversation to an admin
 * @param {string} candidateId - The candidate ID
 * @param {string} adminId - Admin ID to assign to (null to unassign)
 * @returns {object} Updated metadata
 */
function assignTo(candidateId, adminId) {
  // Ensure metadata exists
  getConversationMetadata(candidateId);

  db.prepare(`
    UPDATE conversation_metadata
    SET assigned_to = ?, updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(adminId, candidateId);

  return getConversationMetadata(candidateId);
}

/**
 * Mark conversation as escalated
 * @param {string} candidateId - The candidate ID
 * @param {string} reason - Reason for escalation
 * @returns {object} Updated metadata
 */
function escalate(candidateId, reason) {
  // Ensure metadata exists
  getConversationMetadata(candidateId);

  db.prepare(`
    UPDATE conversation_metadata
    SET escalated = 1,
        escalation_reason = ?,
        escalated_at = datetime('now'),
        priority = 'urgent',
        status = 'open',
        updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(reason, candidateId);

  return getConversationMetadata(candidateId);
}

/**
 * Mark conversation as resolved
 * @param {string} candidateId - The candidate ID
 * @returns {object} Updated metadata
 */
function resolve(candidateId) {
  // Ensure metadata exists
  getConversationMetadata(candidateId);

  db.prepare(`
    UPDATE conversation_metadata
    SET status = 'resolved',
        resolved_at = datetime('now'),
        escalated = 0,
        updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(candidateId);

  return getConversationMetadata(candidateId);
}

/**
 * Get all conversations by status
 * @param {string} status - Status to filter by
 * @returns {array} List of conversation metadata
 */
function getConversationsByStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  const conversations = db.prepare(`
    SELECT cm.*, c.name as candidate_name, c.email as candidate_email, c.phone as candidate_phone
    FROM conversation_metadata cm
    LEFT JOIN candidates c ON cm.candidate_id = c.id
    WHERE cm.status = ?
    ORDER BY
      CASE cm.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      cm.updated_at DESC
  `).all(status);

  // Parse tags for each conversation
  return conversations.map(conv => {
    try {
      conv.tags = JSON.parse(conv.tags);
    } catch (e) {
      conv.tags = [];
    }
    return conv;
  });
}

/**
 * Get all conversations by priority
 * @param {string} priority - Priority to filter by
 * @returns {array} List of conversation metadata
 */
function getConversationsByPriority(priority) {
  if (!VALID_PRIORITIES.includes(priority)) {
    throw new Error(`Invalid priority: ${priority}. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }

  const conversations = db.prepare(`
    SELECT cm.*, c.name as candidate_name, c.email as candidate_email, c.phone as candidate_phone
    FROM conversation_metadata cm
    LEFT JOIN candidates c ON cm.candidate_id = c.id
    WHERE cm.priority = ?
    ORDER BY cm.escalated DESC, cm.updated_at DESC
  `).all(priority);

  // Parse tags for each conversation
  return conversations.map(conv => {
    try {
      conv.tags = JSON.parse(conv.tags);
    } catch (e) {
      conv.tags = [];
    }
    return conv;
  });
}

/**
 * Get all escalated conversations
 * @returns {array} List of escalated conversation metadata
 */
function getEscalatedConversations() {
  const conversations = db.prepare(`
    SELECT cm.*, c.name as candidate_name, c.email as candidate_email, c.phone as candidate_phone
    FROM conversation_metadata cm
    LEFT JOIN candidates c ON cm.candidate_id = c.id
    WHERE cm.escalated = 1
    ORDER BY
      CASE cm.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END,
      cm.escalated_at DESC
  `).all();

  // Parse tags for each conversation
  return conversations.map(conv => {
    try {
      conv.tags = JSON.parse(conv.tags);
    } catch (e) {
      conv.tags = [];
    }
    return conv;
  });
}

/**
 * Search messages across conversations or within a specific conversation
 * @param {string} query - Search query
 * @param {string} candidateId - Optional candidate ID to search within
 * @returns {array} List of matching messages with conversation context
 */
function searchMessages(query, candidateId = null) {
  const searchPattern = `%${query}%`;

  let sql = `
    SELECT
      m.id,
      m.candidate_id,
      m.content,
      m.sender,
      m.channel,
      m.created_at,
      c.name as candidate_name,
      c.email as candidate_email
    FROM messages m
    LEFT JOIN candidates c ON m.candidate_id = c.id
    WHERE m.content LIKE ?
  `;

  const params = [searchPattern];

  if (candidateId) {
    sql += ' AND m.candidate_id = ?';
    params.push(candidateId);
  }

  sql += ' ORDER BY m.created_at DESC LIMIT 100';

  const messages = db.prepare(sql).all(...params);

  // Group by candidate for context
  const grouped = {};
  messages.forEach(msg => {
    if (!grouped[msg.candidate_id]) {
      grouped[msg.candidate_id] = {
        candidateId: msg.candidate_id,
        candidateName: msg.candidate_name,
        candidateEmail: msg.candidate_email,
        messages: []
      };
    }
    grouped[msg.candidate_id].messages.push({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      channel: msg.channel,
      createdAt: msg.created_at
    });
  });

  return Object.values(grouped);
}

/**
 * Check if a conversation should be auto-escalated
 * @param {string} candidateId - The candidate ID
 * @param {string} message - The message content
 * @param {number} aiConfidence - AI confidence score (0-1)
 * @returns {object} { shouldEscalate: boolean, reason: string }
 */
function checkForEscalation(candidateId, message, aiConfidence) {
  const reasons = [];

  // 1. Check AI confidence
  if (aiConfidence < 0.6) {
    reasons.push(`Low AI confidence (${(aiConfidence * 100).toFixed(0)}%)`);
  }

  // 2. Check for negative sentiment keywords
  const lowerMessage = message.toLowerCase();
  const foundKeywords = NEGATIVE_SENTIMENT_KEYWORDS.filter(keyword =>
    lowerMessage.includes(keyword)
  );

  if (foundKeywords.length > 0) {
    reasons.push(`Negative sentiment detected: ${foundKeywords.join(', ')}`);
  }

  // 3. Check for no admin reply in 24 hours
  const metadata = getConversationMetadata(candidateId);

  if (metadata.last_admin_reply_at) {
    const lastReply = new Date(metadata.last_admin_reply_at).getTime();
    const now = Date.now();
    const timeSinceReply = now - lastReply;

    if (timeSinceReply > NO_REPLY_THRESHOLD_MS) {
      const hoursAgo = Math.floor(timeSinceReply / (60 * 60 * 1000));
      reasons.push(`No admin reply in ${hoursAgo} hours`);
    }
  } else if (metadata.last_candidate_message_at) {
    // No admin reply at all, check how long since first candidate message
    const firstMessage = new Date(metadata.last_candidate_message_at).getTime();
    const now = Date.now();
    const timeSinceMessage = now - firstMessage;

    if (timeSinceMessage > NO_REPLY_THRESHOLD_MS) {
      const hoursAgo = Math.floor(timeSinceMessage / (60 * 60 * 1000));
      reasons.push(`No admin reply in ${hoursAgo} hours (conversation unanswered)`);
    }
  }

  const shouldEscalate = reasons.length > 0;
  const reason = reasons.join('; ');

  return {
    shouldEscalate,
    reason: shouldEscalate ? reason : ''
  };
}

/**
 * Update last admin reply timestamp
 * @param {string} candidateId - The candidate ID
 */
function recordAdminReply(candidateId) {
  getConversationMetadata(candidateId);

  db.prepare(`
    UPDATE conversation_metadata
    SET last_admin_reply_at = datetime('now'), updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(candidateId);
}

/**
 * Update last candidate message timestamp
 * @param {string} candidateId - The candidate ID
 */
function recordCandidateMessage(candidateId) {
  getConversationMetadata(candidateId);

  db.prepare(`
    UPDATE conversation_metadata
    SET last_candidate_message_at = datetime('now'), updated_at = datetime('now')
    WHERE candidate_id = ?
  `).run(candidateId);
}

/**
 * Get conversation statistics
 * @returns {object} Statistics summary
 */
function getStatistics() {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
      SUM(CASE WHEN escalated = 1 THEN 1 ELSE 0 END) as escalated_count,
      SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_count,
      SUM(CASE WHEN assigned_to IS NOT NULL THEN 1 ELSE 0 END) as assigned_count
    FROM conversation_metadata
  `).get();

  return stats;
}

module.exports = {
  // Core metadata functions
  getConversationMetadata,
  updateStatus,
  updatePriority,
  addTag,
  removeTag,
  assignTo,
  escalate,
  resolve,

  // Query functions
  getConversationsByStatus,
  getConversationsByPriority,
  getEscalatedConversations,
  searchMessages,

  // Auto-escalation
  checkForEscalation,

  // Tracking helpers
  recordAdminReply,
  recordCandidateMessage,

  // Statistics
  getStatistics,

  // Constants (exported for reference)
  VALID_STATUSES,
  VALID_PRIORITIES,
  NEGATIVE_SENTIMENT_KEYWORDS
};
