/**
 * Machine Learning Service
 *
 * Manages the knowledge base that learns from interactions.
 * Goal: Build a local knowledge base that can answer common questions
 * without calling the LLM, saving costs and reducing latency.
 *
 * Path to SLM:
 * 1. Collect Q&A pairs from LLM interactions
 * 2. Learn from admin feedback (approve/edit/reject)
 * 3. Use KB for high-confidence matches
 * 4. Export training data for fine-tuning your own model
 */

const { db } = require('../../db/database');
const embeddings = require('./embeddings');

/**
 * Get ML settings
 */
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM ml_settings').all();
  const settings = {};
  rows.forEach(row => {
    // Parse booleans and numbers
    if (row.value === 'true') settings[row.key] = true;
    else if (row.value === 'false') settings[row.key] = false;
    else if (!isNaN(parseFloat(row.value))) settings[row.key] = parseFloat(row.value);
    else settings[row.key] = row.value;
  });
  return settings;
}

/**
 * Update ML setting
 */
function updateSetting(key, value) {
  db.prepare(`
    UPDATE ml_settings SET value = ?, updated_at = datetime('now')
    WHERE key = ?
  `).run(String(value), key);
}

/**
 * Find answer in knowledge base
 *
 * @param {string} question - User's question
 * @param {object} context - Optional context (category, candidateId, etc.)
 * @returns {object|null} Best matching answer or null if no good match
 */
async function findAnswer(question, context = {}) {
  const settings = getSettings();

  if (!settings.kb_enabled) {
    return null;
  }

  const minConfidence = settings.min_confidence || 0.75;

  // First, check FAQ database (manually curated, higher priority)
  const faqs = db.prepare(`
    SELECT id, category, question, answer, keywords, priority, 'faq' as source
    FROM ai_faq
    WHERE active = 1
    ORDER BY priority DESC
  `).all();

  if (faqs.length > 0) {
    const faqMatches = embeddings.findSimilar(question, faqs, 3, 0.5);
    if (faqMatches.length > 0 && faqMatches[0].similarity >= 0.6) {
      // FAQ match with high confidence
      const match = faqMatches[0];
      // Update use count
      db.prepare('UPDATE ai_faq SET use_count = use_count + 1 WHERE id = ?').run(match.id);

      return {
        answer: match.answer,
        source: 'faq',
        sourceId: match.id,
        confidence: Math.min(1, match.similarity + 0.2), // Boost FAQ confidence
        category: match.category,
        question: match.question,
      };
    }
  }

  // Then check learned knowledge base
  const kbEntries = db.prepare(`
    SELECT id, question, question_tokens, answer, intent, category, confidence, keywords, 'knowledge_base' as source
    FROM ml_knowledge_base
    WHERE confidence >= ?
    ORDER BY confidence DESC, use_count DESC
    LIMIT 100
  `).all(minConfidence * 0.5); // Get entries with at least half the min confidence

  if (kbEntries.length > 0) {
    const kbMatches = embeddings.findSimilar(question, kbEntries, 3, 0.4);

    if (kbMatches.length > 0) {
      const match = kbMatches[0];
      // Combined score: similarity * KB confidence
      const combinedConfidence = match.similarity * match.confidence;

      if (combinedConfidence >= minConfidence) {
        // Record usage
        db.prepare(`
          UPDATE ml_knowledge_base
          SET use_count = use_count + 1, last_used_at = datetime('now')
          WHERE id = ?
        `).run(match.id);

        return {
          answer: match.answer,
          source: 'knowledge_base',
          sourceId: match.id,
          confidence: combinedConfidence,
          similarity: match.similarity,
          kbConfidence: match.confidence,
          category: match.category,
          intent: match.intent,
        };
      }
    }
  }

  return null;
}

/**
 * Learn from a new Q&A interaction
 *
 * @param {string} question - The user's question
 * @param {string} answer - The response (from LLM or admin)
 * @param {object} metadata - Additional info (intent, category, source, etc.)
 */
async function learn(question, answer, metadata = {}) {
  const settings = getSettings();

  if (!settings.learn_from_llm && metadata.source === 'llm') {
    return null;
  }

  const {
    intent = null,
    category = null,
    source = 'llm',
    confidence = 0.5,
  } = metadata;

  // Normalize and tokenize for storage
  const normalizedQuestion = embeddings.generateNormalized(question);
  const questionTokens = embeddings.generateTokensForStorage(question);

  // Check if similar question already exists
  const existingEntries = db.prepare(`
    SELECT id, question, confidence, use_count
    FROM ml_knowledge_base
    WHERE question_normalized = ?
  `).all(normalizedQuestion);

  if (existingEntries.length > 0) {
    // Update existing entry
    const existing = existingEntries[0];
    const newConfidence = Math.min(1, (existing.confidence + confidence) / 2);

    db.prepare(`
      UPDATE ml_knowledge_base
      SET answer = ?,
          confidence = ?,
          intent = COALESCE(?, intent),
          category = COALESCE(?, category),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(answer, newConfidence, intent, category, existing.id);

    return existing.id;
  }

  // Insert new entry
  const result = db.prepare(`
    INSERT INTO ml_knowledge_base
    (question, question_normalized, question_tokens, answer, intent, category, confidence, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(question, normalizedQuestion, questionTokens, answer, intent, category, confidence, source);

  return result.lastInsertRowid;
}

/**
 * Record feedback on an AI response
 * Adjusts confidence based on admin action
 *
 * @param {number} logId - AI response log ID
 * @param {string} action - 'approved' | 'edited' | 'rejected' | 'dismissed'
 * @param {string} editedAnswer - If edited, the corrected answer
 */
async function recordFeedback(logId, action, editedAnswer = null) {
  const settings = getSettings();

  // Get the log entry
  const log = db.prepare('SELECT * FROM ai_response_logs WHERE id = ?').get(logId);
  if (!log) return;

  // Update the log
  db.prepare(`
    UPDATE ai_response_logs
    SET status = ?, admin_action = ?, edited_response = ?
    WHERE id = ?
  `).run(
    action === 'approved' ? 'sent' : action,
    action === 'approved' ? 'sent_as_is' : action,
    editedAnswer,
    logId
  );

  // If from knowledge base, update confidence
  if (log.kb_entry_id) {
    let confidenceChange = 0;

    switch (action) {
      case 'approved':
        confidenceChange = settings.confidence_boost_approve || 0.1;
        db.prepare(`
          UPDATE ml_knowledge_base
          SET success_count = success_count + 1,
              confidence = MIN(1, confidence + ?),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(confidenceChange, log.kb_entry_id);
        break;

      case 'edited':
        confidenceChange = settings.confidence_boost_edit || 0.05;
        // Learn the edited version
        if (editedAnswer && settings.learn_from_edits) {
          db.prepare(`
            UPDATE ml_knowledge_base
            SET edit_count = edit_count + 1,
                answer = ?,
                confidence = MIN(1, confidence + ?),
                updated_at = datetime('now')
            WHERE id = ?
          `).run(editedAnswer, confidenceChange, log.kb_entry_id);
        }
        break;

      case 'rejected':
        confidenceChange = -(settings.confidence_penalty_reject || 0.15);
        db.prepare(`
          UPDATE ml_knowledge_base
          SET reject_count = reject_count + 1,
              confidence = MAX(0, confidence + ?),
              updated_at = datetime('now')
          WHERE id = ?
        `).run(confidenceChange, log.kb_entry_id);
        break;
    }
  }

  // Also learn new entry if this was an LLM response that got approved/edited
  if (log.source === 'llm' && (action === 'approved' || action === 'edited')) {
    const answerToLearn = action === 'edited' ? editedAnswer : log.ai_response;
    if (answerToLearn) {
      await learn(log.incoming_message, answerToLearn, {
        intent: log.intent_detected,
        source: action === 'edited' ? 'admin' : 'llm',
        confidence: action === 'approved' ? 0.7 : 0.6,
      });
    }
  }

  // Add to training data
  if (action === 'approved' || action === 'edited') {
    const finalAnswer = action === 'edited' ? editedAnswer : log.ai_response;
    db.prepare(`
      INSERT INTO ml_training_data
      (input_text, output_text, intent, quality_score, was_edited, edited_output, admin_approved, source)
      VALUES (?, ?, ?, ?, ?, ?, 1, 'production')
    `).run(
      log.incoming_message,
      finalAnswer,
      log.intent_detected,
      action === 'approved' ? 0.9 : 0.8,
      action === 'edited' ? 1 : 0,
      action === 'edited' ? editedAnswer : null
    );
  }

  // Update daily metrics
  updateDailyMetrics(action);
}

/**
 * Update daily ML metrics
 */
function updateDailyMetrics(action = null) {
  const today = new Date().toISOString().split('T')[0];

  // Ensure today's row exists
  db.prepare(`
    INSERT OR IGNORE INTO ml_metrics (date)
    VALUES (?)
  `).run(today);

  if (action === 'approved') {
    db.prepare(`
      UPDATE ml_metrics SET suggestions_accepted = suggestions_accepted + 1 WHERE date = ?
    `).run(today);
  } else if (action === 'edited') {
    db.prepare(`
      UPDATE ml_metrics SET suggestions_edited = suggestions_edited + 1 WHERE date = ?
    `).run(today);
  } else if (action === 'rejected' || action === 'dismissed') {
    db.prepare(`
      UPDATE ml_metrics SET suggestions_rejected = suggestions_rejected + 1 WHERE date = ?
    `).run(today);
  }
}

/**
 * Record that we used the KB (for metrics)
 */
function recordKBHit() {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO ml_metrics (date, kb_hits)
    VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET kb_hits = kb_hits + 1
  `).run(today);
}

/**
 * Record that we called the LLM (for metrics)
 */
function recordLLMCall() {
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO ml_metrics (date, llm_calls)
    VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET llm_calls = llm_calls + 1
  `).run(today);
}

/**
 * Get knowledge base stats
 */
function getStats() {
  const kbCount = db.prepare('SELECT COUNT(*) as count FROM ml_knowledge_base').get().count;
  const faqCount = db.prepare('SELECT COUNT(*) as count FROM ai_faq WHERE active = 1').get().count;
  const trainingCount = db.prepare('SELECT COUNT(*) as count FROM ml_training_data').get().count;

  const avgConfidence = db.prepare(`
    SELECT AVG(confidence) as avg FROM ml_knowledge_base WHERE confidence > 0
  `).get().avg || 0;

  // Get recent metrics
  const recentMetrics = db.prepare(`
    SELECT
      SUM(kb_hits) as total_kb_hits,
      SUM(llm_calls) as total_llm_calls,
      SUM(suggestions_accepted) as total_accepted,
      SUM(suggestions_edited) as total_edited,
      SUM(suggestions_rejected) as total_rejected
    FROM ml_metrics
    WHERE date >= date('now', '-30 days')
  `).get();

  const totalQueries = (recentMetrics.total_kb_hits || 0) + (recentMetrics.total_llm_calls || 0);
  const kbHitRate = totalQueries > 0
    ? ((recentMetrics.total_kb_hits || 0) / totalQueries * 100).toFixed(1)
    : 0;

  // Estimate cost saved (assuming $0.005 per LLM call)
  const costPerCall = 0.005;
  const estimatedSaved = (recentMetrics.total_kb_hits || 0) * costPerCall;

  return {
    knowledgeBaseEntries: kbCount,
    faqEntries: faqCount,
    trainingDataEntries: trainingCount,
    averageConfidence: avgConfidence.toFixed(2),
    last30Days: {
      totalQueries,
      kbHits: recentMetrics.total_kb_hits || 0,
      llmCalls: recentMetrics.total_llm_calls || 0,
      kbHitRate: `${kbHitRate}%`,
      suggestionsAccepted: recentMetrics.total_accepted || 0,
      suggestionsEdited: recentMetrics.total_edited || 0,
      suggestionsRejected: recentMetrics.total_rejected || 0,
      estimatedCostSaved: `$${estimatedSaved.toFixed(2)}`,
    },
  };
}

/**
 * Get knowledge base entries with pagination
 */
function getKnowledgeBase(options = {}) {
  const { limit = 50, offset = 0, category = null, minConfidence = 0 } = options;

  let query = `
    SELECT * FROM ml_knowledge_base
    WHERE confidence >= ?
  `;
  const params = [minConfidence];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY confidence DESC, use_count DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

/**
 * Get FAQ entries
 */
function getFAQs(activeOnly = true) {
  if (activeOnly) {
    return db.prepare('SELECT * FROM ai_faq WHERE active = 1 ORDER BY category, priority DESC').all();
  }
  return db.prepare('SELECT * FROM ai_faq ORDER BY category, priority DESC').all();
}

/**
 * Add FAQ entry
 */
function addFAQ(category, question, answer, keywords = [], priority = 0) {
  const result = db.prepare(`
    INSERT INTO ai_faq (category, question, answer, keywords, priority)
    VALUES (?, ?, ?, ?, ?)
  `).run(category, question, answer, JSON.stringify(keywords), priority);

  return result.lastInsertRowid;
}

/**
 * Update FAQ entry
 */
function updateFAQ(id, updates) {
  const { category, question, answer, keywords, priority, active } = updates;

  db.prepare(`
    UPDATE ai_faq
    SET category = COALESCE(?, category),
        question = COALESCE(?, question),
        answer = COALESCE(?, answer),
        keywords = COALESCE(?, keywords),
        priority = COALESCE(?, priority),
        active = COALESCE(?, active),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    category,
    question,
    answer,
    keywords ? JSON.stringify(keywords) : null,
    priority,
    active,
    id
  );
}

/**
 * Delete FAQ entry
 */
function deleteFAQ(id) {
  db.prepare('DELETE FROM ai_faq WHERE id = ?').run(id);
}

/**
 * Delete knowledge base entry
 */
function deleteKBEntry(id) {
  db.prepare('DELETE FROM ml_knowledge_base WHERE id = ?').run(id);
}

/**
 * Log an AI response (before sending)
 */
function logResponse(candidateId, incomingMessage, aiResponse, metadata = {}) {
  const {
    mode = 'suggest',
    source = 'llm',
    kbEntryId = null,
    confidence = null,
    intent = null,
    responseTimeMs = null,
    tokensUsed = null,
  } = metadata;

  const result = db.prepare(`
    INSERT INTO ai_response_logs
    (candidate_id, incoming_message, ai_response, mode, source, kb_entry_id, confidence, intent_detected, response_time_ms, tokens_used)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    candidateId,
    incomingMessage,
    aiResponse,
    mode,
    source,
    kbEntryId,
    confidence,
    intent,
    responseTimeMs,
    tokensUsed
  );

  return result.lastInsertRowid;
}

/**
 * Get response logs with pagination
 */
function getResponseLogs(options = {}) {
  const { limit = 50, offset = 0, candidateId = null, status = null } = options;

  let query = 'SELECT * FROM ai_response_logs WHERE 1=1';
  const params = [];

  if (candidateId) {
    query += ' AND candidate_id = ?';
    params.push(candidateId);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

module.exports = {
  // Settings
  getSettings,
  updateSetting,

  // Core ML functions
  findAnswer,
  learn,
  recordFeedback,

  // Metrics
  recordKBHit,
  recordLLMCall,
  updateDailyMetrics,
  getStats,

  // Knowledge base management
  getKnowledgeBase,
  deleteKBEntry,

  // FAQ management
  getFAQs,
  addFAQ,
  updateFAQ,
  deleteFAQ,

  // Logging
  logResponse,
  getResponseLogs,
};
