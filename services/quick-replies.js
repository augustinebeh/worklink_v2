/**
 * Quick Replies Service
 * Generates context-aware quick reply suggestions for workers
 */

const { db } = require('../db');

// Context keywords for detection
const CONTEXT_KEYWORDS = {
  job_offer: ['job', 'position', 'opportunity', 'offer', 'interested', 'hiring', 'role', 'work', 'assignment'],
  schedule: ['available', 'when', 'date', 'time', 'schedule', 'tomorrow', 'today', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'week', 'month'],
  payment: ['pay', 'payment', 'salary', 'rate', 'invoice', 'money', 'paid', 'compensation', 'wage', 'earning'],
  confirmation: ['confirm', 'accept', 'agree', 'proceed', 'approve', 'verified', 'finalize', 'ready', 'good to go']
};

// Suggested replies by context type
const SUGGESTED_REPLIES = {
  job_offer: [
    "I'm interested!",
    "What are the details?",
    "When is the job?",
    "What's the pay rate?",
    "I'm not available",
    "Tell me more about this opportunity"
  ],
  schedule: [
    "I'm available",
    "Let me check my calendar",
    "I'm busy that day",
    "Can we reschedule?",
    "What time works best?",
    "I can make that work"
  ],
  payment: [
    "When will I be paid?",
    "I have a question about payment",
    "Thanks, received it!",
    "Can I get a breakdown?",
    "What payment method do you use?",
    "Is there an invoice?"
  ],
  confirmation: [
    "Yes, confirmed!",
    "I need to cancel",
    "Can I get more info?",
    "All good on my end",
    "Let me double-check first",
    "Confirmed, see you then!"
  ],
  question: [
    "Yes",
    "No",
    "I'm not sure",
    "Can you explain more?",
    "Let me think about it",
    "I'll get back to you"
  ],
  default: [
    "Thanks!",
    "Okay, noted",
    "I have a question",
    "Can you help me?",
    "Got it!",
    "Sounds good"
  ]
};

/**
 * Detect the context type from a message
 * @param {string} message - The message to analyze
 * @returns {Object} - Context type and confidence score
 */
function detectContext(message) {
  if (!message || typeof message !== 'string') {
    return { type: 'default', confidence: 0 };
  }

  const lowerMessage = message.toLowerCase();
  const scores = {};

  // Check for question context first (ends with ?)
  if (message.trim().endsWith('?')) {
    scores.question = 0.5; // Base score for being a question
  }

  // Calculate scores for each context type based on keyword matches
  for (const [contextType, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
    let matchCount = 0;
    let totalWeight = 0;

    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        matchCount++;
        // Give more weight to exact word matches
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerMessage)) {
          totalWeight += 2;
        } else {
          totalWeight += 1;
        }
      }
    }

    if (matchCount > 0) {
      // Normalize score based on number of keywords and message length
      const keywordDensity = matchCount / keywords.length;
      const confidence = Math.min((totalWeight * 0.15) + (keywordDensity * 0.5), 1);
      scores[contextType] = (scores[contextType] || 0) + confidence;
    }
  }

  // Find the context with highest score
  let maxScore = 0;
  let detectedContext = 'default';

  for (const [contextType, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedContext = contextType;
    }
  }

  // If question context has a decent score but another context is higher,
  // boost question-specific responses if it's clearly a question
  if (scores.question && detectedContext !== 'question' && maxScore < 0.4) {
    detectedContext = 'question';
    maxScore = scores.question;
  }

  return {
    type: detectedContext,
    confidence: Math.round(maxScore * 100) / 100
  };
}

/**
 * Get the last admin message for a candidate
 * @param {string} candidateId - The candidate ID
 * @returns {Object|null} - The last admin message or null
 */
function getLastAdminMessage(candidateId) {
  try {
    // Get the last message sent to this candidate (from admin)
    const message = db.prepare(`
      SELECT * FROM messages
      WHERE candidate_id = ? AND sender = 'admin'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(candidateId);

    return message || null;
  } catch (error) {
    console.error('Error fetching last admin message:', error.message);
    return null;
  }
}

/**
 * Get candidate's frequently used replies
 * @param {string} candidateId - The candidate ID
 * @returns {Array} - Array of frequent replies with usage count
 */
function getCustomReplies(candidateId) {
  try {
    // Check if frequent_replies table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='frequent_replies'
    `).get();

    if (tableExists) {
      // Use frequent_replies table
      const rows = db.prepare(`
        SELECT reply_text, usage_count, last_used
        FROM frequent_replies
        WHERE candidate_id = ?
        ORDER BY usage_count DESC, last_used DESC
        LIMIT 10
      `).all(candidateId);

      return rows.map(row => ({
        text: row.reply_text,
        count: row.usage_count,
        lastUsed: row.last_used
      }));
    } else {
      // Fallback: analyze message history for patterns
      const rows = db.prepare(`
        SELECT content, COUNT(*) as frequency
        FROM messages
        WHERE candidate_id = ? AND sender = 'candidate'
          AND LENGTH(content) < 100
        GROUP BY content
        HAVING frequency > 1
        ORDER BY frequency DESC
        LIMIT 10
      `).all(candidateId);

      return rows.map(row => ({
        text: row.content,
        count: row.frequency,
        lastUsed: null
      }));
    }
  } catch (error) {
    console.error('Error fetching custom replies:', error.message);
    return [];
  }
}

/**
 * Add or update a frequent reply for a candidate
 * @param {string} candidateId - The candidate ID
 * @param {string} reply - The reply text
 * @returns {boolean} - Success status
 */
function addFrequentReply(candidateId, reply) {
  if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
    return false;
  }

  const normalizedReply = reply.trim();

  // Skip very long messages (not suitable for quick replies)
  if (normalizedReply.length > 100) {
    return false;
  }

  try {
    // Ensure the frequent_replies table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS frequent_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id TEXT NOT NULL,
        reply_text TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1,
        last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(candidate_id, reply_text)
      )
    `);

    // Try to update existing, or insert new
    const existing = db.prepare(`
      SELECT id FROM frequent_replies
      WHERE candidate_id = ? AND reply_text = ?
    `).get(candidateId, normalizedReply);

    if (existing) {
      db.prepare(`
        UPDATE frequent_replies
        SET usage_count = usage_count + 1, last_used = datetime('now')
        WHERE id = ?
      `).run(existing.id);
    } else {
      db.prepare(`
        INSERT INTO frequent_replies (candidate_id, reply_text, usage_count, last_used)
        VALUES (?, ?, 1, datetime('now'))
      `).run(candidateId, normalizedReply);
    }

    return true;
  } catch (error) {
    console.error('Error adding frequent reply:', error.message);
    return false;
  }
}

/**
 * Get suggested replies based on context
 * @param {string} candidateId - The candidate ID
 * @param {number} limit - Maximum number of suggestions to return
 * @returns {Object} - Suggested replies with context info
 */
function getSuggestedReplies(candidateId, limit = 3) {
  try {
    // Get the last admin message
    const lastMessage = getLastAdminMessage(candidateId);

    if (!lastMessage) {
      return {
        context: { type: 'default', confidence: 0 },
        suggestions: SUGGESTED_REPLIES.default.slice(0, limit),
        personalized: false
      };
    }

    // Detect context from the message
    const context = detectContext(lastMessage.content);

    // Get base suggestions for the detected context
    const baseSuggestions = [...(SUGGESTED_REPLIES[context.type] || SUGGESTED_REPLIES.default)];

    // Get candidate's frequently used replies
    const frequentReplies = getCustomReplies(candidateId);

    // Personalize suggestions
    let personalizedSuggestions = [];
    let isPersonalized = false;

    if (frequentReplies.length > 0) {
      isPersonalized = true;

      // Find frequent replies that match the current context
      const contextKeywords = CONTEXT_KEYWORDS[context.type] || [];

      for (const frequent of frequentReplies) {
        // Check if the frequent reply is relevant to current context
        const replyLower = frequent.text.toLowerCase();
        const isRelevant = contextKeywords.some(keyword => replyLower.includes(keyword)) ||
                          context.type === 'default' ||
                          frequent.count >= 3; // Highly used replies always included

        if (isRelevant && !baseSuggestions.includes(frequent.text)) {
          personalizedSuggestions.push(frequent.text);
        }
      }
    }

    // Combine personalized and base suggestions
    const combinedSuggestions = [...personalizedSuggestions, ...baseSuggestions];

    // Remove duplicates and limit
    const uniqueSuggestions = [...new Set(combinedSuggestions)].slice(0, limit);

    return {
      context: context,
      suggestions: uniqueSuggestions,
      personalized: isPersonalized,
      lastMessagePreview: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
    };
  } catch (error) {
    console.error('Error getting suggested replies:', error.message);
    return {
      context: { type: 'default', confidence: 0 },
      suggestions: SUGGESTED_REPLIES.default.slice(0, limit),
      personalized: false,
      error: 'Failed to generate personalized suggestions'
    };
  }
}

/**
 * Track suggestion usage for learning
 * @param {string} candidateId - The candidate ID
 * @param {string} suggestion - The suggestion that was used
 * @param {string} contextType - The context type when suggestion was used
 * @returns {boolean} - Success status
 */
function trackSuggestionUsage(candidateId, suggestion, contextType) {
  try {
    // Ensure tracking table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS suggestion_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id TEXT NOT NULL,
        suggestion_text TEXT NOT NULL,
        context_type TEXT NOT NULL,
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index if not exists
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_suggestion_candidate_context
      ON suggestion_usage(candidate_id, context_type)
    `);

    // Record the usage
    db.prepare(`
      INSERT INTO suggestion_usage (candidate_id, suggestion_text, context_type)
      VALUES (?, ?, ?)
    `).run(candidateId, suggestion, contextType);

    // Also add to frequent replies
    addFrequentReply(candidateId, suggestion);

    return true;
  } catch (error) {
    console.error('Error tracking suggestion usage:', error.message);
    return false;
  }
}

/**
 * Get all available quick replies for a context (without personalization)
 * @param {string} contextType - The context type
 * @returns {Array} - Array of suggested replies
 */
function getRepliesForContext(contextType) {
  return SUGGESTED_REPLIES[contextType] || SUGGESTED_REPLIES.default;
}

/**
 * Analyze a message and return matching contexts with scores
 * @param {string} message - The message to analyze
 * @returns {Array} - Array of contexts with scores, sorted by confidence
 */
function analyzeMessageContexts(message) {
  if (!message || typeof message !== 'string') {
    return [{ type: 'default', confidence: 0 }];
  }

  const lowerMessage = message.toLowerCase();
  const contexts = [];

  // Check question context
  if (message.trim().endsWith('?')) {
    contexts.push({ type: 'question', confidence: 0.5 });
  }

  // Check each context type
  for (const [contextType, keywords] of Object.entries(CONTEXT_KEYWORDS)) {
    let matchCount = 0;
    const matchedKeywords = [];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerMessage)) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }

    if (matchCount > 0) {
      const confidence = Math.min(matchCount * 0.2, 1);
      contexts.push({
        type: contextType,
        confidence: Math.round(confidence * 100) / 100,
        matchedKeywords
      });
    }
  }

  // Sort by confidence descending
  contexts.sort((a, b) => b.confidence - a.confidence);

  // Always include default as fallback
  if (contexts.length === 0) {
    contexts.push({ type: 'default', confidence: 0 });
  }

  return contexts;
}

module.exports = {
  detectContext,
  getSuggestedReplies,
  getCustomReplies,
  addFrequentReply,
  trackSuggestionUsage,
  getRepliesForContext,
  analyzeMessageContexts,
  CONTEXT_KEYWORDS,
  SUGGESTED_REPLIES
};
