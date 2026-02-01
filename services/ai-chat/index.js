/**
 * AI Chat Service
 *
 * Handles intelligent auto-replies for candidate messages.
 * Integrates with ML knowledge base for cost-effective responses.
 *
 * Modes:
 * - off: No AI assistance
 * - suggest: AI generates suggestion, admin reviews before sending
 * - auto: AI automatically responds (with delay for natural feel)
 */

const { db } = require('../../db/database');
const { askClaude } = require('../../utils/claude');
const ml = require('../ml');
const prompts = require('./prompts');

/**
 * Get AI settings
 */
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM ai_settings').all();
  const settings = {};
  rows.forEach(row => {
    if (row.value === 'true') settings[row.key] = true;
    else if (row.value === 'false') settings[row.key] = false;
    else if (!isNaN(parseFloat(row.value))) settings[row.key] = parseFloat(row.value);
    else settings[row.key] = row.value;
  });
  return settings;
}

/**
 * Get conversation AI mode for a candidate
 * Returns: 'off' | 'suggest' | 'auto'
 */
function getConversationMode(candidateId) {
  const settings = getSettings();

  if (!settings.ai_enabled) {
    return 'off';
  }

  // Check per-conversation override
  const conversationSettings = db.prepare(`
    SELECT mode FROM conversation_ai_settings WHERE candidate_id = ?
  `).get(candidateId);

  if (conversationSettings && conversationSettings.mode !== 'inherit') {
    return conversationSettings.mode;
  }

  // Fall back to global default
  return settings.default_mode || 'off';
}

/**
 * Set conversation AI mode for a candidate
 */
function setConversationMode(candidateId, mode) {
  db.prepare(`
    INSERT INTO conversation_ai_settings (candidate_id, mode, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(candidate_id) DO UPDATE SET mode = ?, updated_at = datetime('now')
  `).run(candidateId, mode, mode);
}

/**
 * Get candidate profile
 */
function getCandidate(candidateId) {
  return db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
}

/**
 * Get recent conversation history
 */
function getConversationHistory(candidateId, limit = 10) {
  return db.prepare(`
    SELECT content, sender, created_at
    FROM messages
    WHERE candidate_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(candidateId, limit).reverse();
}

/**
 * Get available jobs for context
 */
function getAvailableJobs(limit = 5) {
  return db.prepare(`
    SELECT id, title, location, pay_rate, job_date, total_slots, filled_slots
    FROM jobs
    WHERE status = 'open' AND job_date >= date('now')
    ORDER BY job_date ASC
    LIMIT ?
  `).all(limit);
}

/**
 * Detect intent from message
 */
async function detectIntent(message) {
  try {
    const prompt = prompts.INTENT_DETECTION_PROMPT.replace('{{MESSAGE}}', message);

    const response = await askClaude(prompt, '', { maxTokens: 100 });

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { intent: 'unknown', confidence: 0.5, keywords: [] };
  } catch (error) {
    console.error('Intent detection failed:', error.message);
    return { intent: 'unknown', confidence: 0.5, keywords: [] };
  }
}

/**
 * Generate AI response for a candidate message
 *
 * @param {string} candidateId - Candidate ID
 * @param {string} message - The candidate's message
 * @param {object} options - Additional options
 * @returns {object} Response object with content, source, confidence, etc.
 */
async function generateResponse(candidateId, message, options = {}) {
  const startTime = Date.now();
  const settings = getSettings();

  // 1. Try knowledge base first (FREE!)
  if (settings.kb_enabled !== false) {
    const kbAnswer = await ml.findAnswer(message);

    if (kbAnswer) {
      ml.recordKBHit();

      const responseTime = Date.now() - startTime;

      // Log the response
      const logId = ml.logResponse(candidateId, message, kbAnswer.answer, {
        mode: options.mode || 'suggest',
        source: kbAnswer.source,
        kbEntryId: kbAnswer.sourceId,
        confidence: kbAnswer.confidence,
        intent: kbAnswer.intent || kbAnswer.category,
        responseTimeMs: responseTime,
      });

      return {
        content: kbAnswer.answer,
        source: kbAnswer.source,
        sourceId: kbAnswer.sourceId,
        confidence: kbAnswer.confidence,
        intent: kbAnswer.intent || kbAnswer.category,
        responseTimeMs: responseTime,
        logId,
        fromKB: true,
      };
    }
  }

  // 2. Fall back to Claude LLM
  ml.recordLLMCall();

  try {
    // Get context
    const candidate = getCandidate(candidateId);
    const history = getConversationHistory(candidateId, settings.max_context_messages || 10);
    const jobs = settings.include_job_suggestions ? getAvailableJobs(5) : [];

    // Build prompts
    const candidateContext = prompts.buildCandidateContext(candidate);
    const jobsContext = prompts.buildJobsContext(jobs);
    const conversationContext = prompts.buildConversationContext(history);

    const systemPrompt = prompts.buildSystemPrompt(
      candidateContext + conversationContext,
      jobsContext
    );

    // Detect intent for logging
    const intentResult = await detectIntent(message);

    // Generate response
    const response = await askClaude(message, systemPrompt, { maxTokens: 150 });

    const responseTime = Date.now() - startTime;

    // Log the response
    const logId = ml.logResponse(candidateId, message, response, {
      mode: options.mode || 'suggest',
      source: 'llm',
      confidence: 0.9, // LLM responses are high confidence
      intent: intentResult.intent,
      responseTimeMs: responseTime,
    });

    // Learn from this interaction (will be confirmed when admin approves)
    if (settings.learn_from_llm !== false) {
      await ml.learn(message, response, {
        intent: intentResult.intent,
        source: 'llm',
        confidence: 0.5, // Start with medium confidence, will increase if approved
      });
    }

    return {
      content: response,
      source: 'llm',
      confidence: 0.9,
      intent: intentResult.intent,
      responseTimeMs: responseTime,
      logId,
      fromKB: false,
    };
  } catch (error) {
    console.error('AI response generation failed:', error.message);

    // Return a fallback message
    return {
      content: "I'm having trouble responding right now. A team member will get back to you shortly! 🙏",
      source: 'fallback',
      confidence: 0,
      error: error.message,
      fromKB: false,
    };
  }
}

/**
 * Process an incoming message and take action based on AI mode
 *
 * This is the main entry point called when a candidate sends a message.
 *
 * @param {string} candidateId - Candidate ID
 * @param {string} content - Message content
 * @param {string} channel - 'app' | 'telegram'
 */
async function processIncomingMessage(candidateId, content, channel = 'app') {
  const mode = getConversationMode(candidateId);

  if (mode === 'off') {
    return null;
  }

  const settings = getSettings();

  // Generate AI response
  const response = await generateResponse(candidateId, content, { mode });

  if (mode === 'auto') {
    // Auto mode: Send response after delay
    const delay = settings.response_delay_ms || 1500;

    setTimeout(async () => {
      // Pass original question for implicit feedback tracking
      await sendAIResponse(candidateId, response, channel, content);
    }, delay);

    return {
      mode: 'auto',
      response,
      willSendIn: delay,
    };
  } else if (mode === 'suggest') {
    // Suggest mode: Broadcast suggestion to admins
    const { broadcastToAdmins } = require('../../websocket');

    broadcastToAdmins({
      type: 'ai_suggestion',
      candidateId,
      suggestion: {
        id: response.logId,
        content: response.content,
        intent: response.intent,
        confidence: response.confidence,
        source: response.source,
        fromKB: response.fromKB,
        generatedAt: new Date().toISOString(),
      },
    });

    return {
      mode: 'suggest',
      response,
      broadcasted: true,
    };
  }

  return null;
}

/**
 * Send an AI-generated response to a candidate
 */
async function sendAIResponse(candidateId, response, channel = 'app', originalQuestion = null) {
  console.log(`📤 [AI] Sending response to ${candidateId} via ${channel}: "${response.content.substring(0, 50)}..."`);
  const messaging = require('../messaging');

  // Send via unified messaging service
  // Include source (kb, faq, llm) for UI display
  const result = await messaging.sendToCandidate(candidateId, response.content, {
    channel: channel === 'telegram' ? 'telegram' : 'auto',
    aiGenerated: true,
    aiSource: response.source || 'llm', // 'kb', 'faq', 'llm', 'knowledge_base'
  });
  console.log(`📤 [AI] Send result:`, result.success ? 'SUCCESS' : `FAILED: ${result.error}`);

  // Update the log to mark as sent
  if (response.logId) {
    db.prepare(`
      UPDATE ai_response_logs SET status = 'sent' WHERE id = ?
    `).run(response.logId);

    // Store pending feedback for implicit learning (Auto mode)
    // This will track the next few messages to see if worker was satisfied
    if (originalQuestion) {
      ml.storePendingFeedback(candidateId, response.logId, originalQuestion);
    }
  }

  // Broadcast to admins that AI sent a message
  const { broadcastToAdmins } = require('../../websocket');

  broadcastToAdmins({
    type: 'ai_message_sent',
    candidateId,
    message: result.message,
    aiLogId: response.logId,
    source: response.source,
  });

  return result;
}

/**
 * Accept an AI suggestion (admin action)
 */
async function acceptSuggestion(logId, candidateId) {
  // Get the suggestion
  const log = db.prepare('SELECT * FROM ai_response_logs WHERE id = ?').get(logId);
  if (!log) {
    throw new Error('Suggestion not found');
  }

  // Send the response
  const result = await sendAIResponse(candidateId, {
    content: log.ai_response,
    logId,
    source: log.source,
  });

  // Record feedback
  await ml.recordFeedback(logId, 'approved');

  return result;
}

/**
 * Edit and send an AI suggestion (admin action)
 */
async function editAndSendSuggestion(logId, candidateId, editedContent) {
  // Get the original suggestion
  const log = db.prepare('SELECT * FROM ai_response_logs WHERE id = ?').get(logId);
  if (!log) {
    throw new Error('Suggestion not found');
  }

  // Send the edited response
  const messaging = require('../messaging');
  const result = await messaging.sendToCandidate(candidateId, editedContent, {
    channel: 'auto',
    aiGenerated: true,
  });

  // Update log with edited content
  db.prepare(`
    UPDATE ai_response_logs
    SET status = 'sent', edited_response = ?, admin_action = 'edited'
    WHERE id = ?
  `).run(editedContent, logId);

  // Record feedback (learns from the edit)
  await ml.recordFeedback(logId, 'edited', editedContent);

  return result;
}

/**
 * Dismiss an AI suggestion (admin action)
 */
async function dismissSuggestion(logId) {
  await ml.recordFeedback(logId, 'dismissed');
}

/**
 * Get pending suggestions for admin review
 */
function getPendingSuggestions(candidateId = null) {
  let query = `
    SELECT * FROM ai_response_logs
    WHERE status = 'generated' AND mode = 'suggest'
  `;
  const params = [];

  if (candidateId) {
    query += ' AND candidate_id = ?';
    params.push(candidateId);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';

  return db.prepare(query).all(...params);
}

/**
 * Update AI setting
 */
function updateSetting(key, value) {
  db.prepare(`
    UPDATE ai_settings SET value = ?, updated_at = datetime('now')
    WHERE key = ?
  `).run(String(value), key);
}

module.exports = {
  // Settings
  getSettings,
  updateSetting,
  getConversationMode,
  setConversationMode,

  // Core functions
  generateResponse,
  processIncomingMessage,
  sendAIResponse,

  // Admin actions
  acceptSuggestion,
  editAndSendSuggestion,
  dismissSuggestion,
  getPendingSuggestions,

  // Helpers
  detectIntent,
  getCandidate,
  getConversationHistory,
  getAvailableJobs,
};
