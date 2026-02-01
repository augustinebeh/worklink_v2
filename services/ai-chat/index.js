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
const tools = require('./tools');

/**
 * Get AI settings
 */
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM ai_settings').all();
  console.log(`🤖 [AI] getSettings: Found ${rows.length} settings in database`);
  const settings = {};
  rows.forEach(row => {
    if (row.value === 'true') settings[row.key] = true;
    else if (row.value === 'false') settings[row.key] = false;
    else if (!isNaN(parseFloat(row.value))) settings[row.key] = parseFloat(row.value);
    else settings[row.key] = row.value;
  });
  console.log(`🤖 [AI] getSettings result:`, JSON.stringify(settings));
  return settings;
}

/**
 * Get conversation AI mode for a candidate
 * Returns: 'off' | 'suggest' | 'auto'
 */
function getConversationMode(candidateId) {
  const settings = getSettings();

  console.log(`🤖 [AI] getConversationMode: ai_enabled=${settings.ai_enabled} (type: ${typeof settings.ai_enabled})`);

  if (!settings.ai_enabled) {
    console.log(`🤖 [AI] AI is disabled globally, returning 'off'`);
    return 'off';
  }

  // Check per-conversation override
  const conversationSettings = db.prepare(`
    SELECT mode FROM conversation_ai_settings WHERE candidate_id = ?
  `).get(candidateId);

  console.log(`🤖 [AI] Conversation override for ${candidateId}:`, conversationSettings || 'none');

  if (conversationSettings && conversationSettings.mode !== 'inherit') {
    console.log(`🤖 [AI] Using conversation override: ${conversationSettings.mode}`);
    return conversationSettings.mode;
  }

  // Fall back to global default
  const mode = settings.default_mode || 'off';
  console.log(`🤖 [AI] Using global default: ${mode}`);
  return mode;
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
 * Get response for pending (unverified) users
 * These users cannot accept jobs yet, so AI should only provide limited responses
 */
function getPendingUserResponse(message, candidateName) {
  const lowerMessage = message.toLowerCase();
  const firstName = candidateName ? candidateName.split(' ')[0] : '';

  // Check if asking about jobs
  if (lowerMessage.includes('job') || lowerMessage.includes('work') || lowerMessage.includes('shift') ||
      lowerMessage.includes('apply') || lowerMessage.includes('available') || lowerMessage.includes('gig')) {
    return {
      content: `Hi${firstName ? ' ' + firstName : ''}! Your account is currently being reviewed by our team. Once verified, you'll be able to browse and accept jobs. In the meantime, you can complete your profile to speed up the verification process! 📝`,
      isPendingResponse: true,
    };
  }

  // Check if asking about account/verification status
  if (lowerMessage.includes('account') || lowerMessage.includes('verify') || lowerMessage.includes('status') ||
      lowerMessage.includes('approved') || lowerMessage.includes('review') || lowerMessage.includes('pending')) {
    return {
      content: `Your account is pending verification. Our admin team will review your profile and reach out soon. To help speed things up, make sure your profile is complete with accurate information! 🙏`,
      isPendingResponse: true,
    };
  }

  // Check if asking about payment
  if (lowerMessage.includes('pay') || lowerMessage.includes('salary') || lowerMessage.includes('money') ||
      lowerMessage.includes('earning') || lowerMessage.includes('rate')) {
    return {
      content: `Great question! Once your account is verified, you'll be able to see job details including pay rates. For now, please complete your profile and our team will verify your account soon! 💰`,
      isPendingResponse: true,
    };
  }

  // Check for greetings
  if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
    return {
      content: `Hi${firstName ? ' ' + firstName : ''}! Welcome to WorkLink! 👋 Your account is being reviewed by our team. Feel free to explore the app and complete your profile while you wait for verification!`,
      isPendingResponse: true,
    };
  }

  // Check if asking how to use app / FAQ
  if (lowerMessage.includes('how do i') || lowerMessage.includes('how to') || lowerMessage.includes('help') ||
      lowerMessage.includes('what is') || lowerMessage.includes('explain')) {
    return {
      content: `I'd love to help! Your account is pending verification, so some features aren't available yet. You can explore the app, complete your profile, and check out the training section. Our team will verify your account soon! 📱`,
      isPendingResponse: true,
    };
  }

  // Default response for pending users
  return {
    content: `Thanks for reaching out${firstName ? ', ' + firstName : ''}! Your account is currently pending verification. Please be patient while our admin team reviews your profile. In the meantime, you can browse the app and complete your profile to expedite the verification process! 🙏`,
    isPendingResponse: true,
  };
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
  console.log(`🤖 [AI] generateResponse called for ${candidateId}: "${message.substring(0, 50)}..."`);
  const startTime = Date.now();
  const settings = getSettings();

  // Check candidate status - pending users get limited responses
  const candidate = getCandidate(candidateId);
  if (candidate && candidate.status === 'pending') {
    console.log(`🤖 [AI] Candidate ${candidateId} is PENDING - returning limited response`);
    const pendingResponse = getPendingUserResponse(message, candidate.name);
    const responseTime = Date.now() - startTime;

    return {
      content: pendingResponse.content,
      source: 'pending_status',
      confidence: 1.0,
      intent: 'pending_user',
      responseTimeMs: responseTime,
      fromKB: false,
      isPendingUser: true,
    };
  }

  // Check if this query needs real-time data (payment amounts, job status, etc.)
  const lowerMessage = message.toLowerCase();
  const needsRealTimeData =
    lowerMessage.includes('how much') ||
    lowerMessage.includes('my balance') ||
    lowerMessage.includes('my payment') ||
    lowerMessage.includes('my earning') ||
    (lowerMessage.includes('pending') && (lowerMessage.includes('amount') || lowerMessage.includes('much') || lowerMessage.includes('payment')));

  // 1. Try knowledge base first (FREE!) - but skip for real-time data queries
  console.log(`🤖 [AI] Checking knowledge base (kb_enabled=${settings.kb_enabled}, needsRealTimeData=${needsRealTimeData})`);
  if (settings.kb_enabled !== false && !needsRealTimeData) {
    const kbAnswer = await ml.findAnswer(message);
    console.log(`🤖 [AI] KB answer:`, kbAnswer ? 'Found' : 'Not found');

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
  console.log(`🤖 [AI] No KB answer, calling LLM...`);
  ml.recordLLMCall();

  try {
    // Get context
    const candidate = getCandidate(candidateId);
    console.log(`🤖 [AI] Candidate found:`, candidate ? candidate.name : 'NOT FOUND');
    const history = getConversationHistory(candidateId, settings.max_context_messages || 10);
    const jobs = settings.include_job_suggestions ? getAvailableJobs(5) : [];

    // Detect intent first (needed for tool selection)
    console.log(`🤖 [AI] Detecting intent...`);
    const intentResult = await detectIntent(message);
    console.log(`🤖 [AI] Intent: ${intentResult.intent}`);

    // Execute tools based on intent to get real data
    console.log(`🤖 [AI] Checking if tools needed...`);
    const toolResult = tools.executeToolForIntent(candidateId, intentResult.intent, message);
    const toolContext = toolResult ? tools.formatToolResultAsContext(toolResult) : '';
    if (toolResult) {
      console.log(`🤖 [AI] Tool executed: ${toolResult.tool}`);
    }

    // Build prompts with tool context
    const candidateContext = prompts.buildCandidateContext(candidate);
    const jobsContext = prompts.buildJobsContext(jobs);
    const conversationContext = prompts.buildConversationContext(history);
    const responseStyle = settings.response_style || 'concise';
    const languageStyle = settings.language_style || 'singlish';

    const systemPrompt = prompts.buildSystemPrompt(
      candidateContext + conversationContext + toolContext,
      jobsContext,
      responseStyle,
      languageStyle
    );

    // Generate response - slightly more tokens for normal style
    const maxTokens = responseStyle === 'normal' ? 200 : 150;
    console.log(`🤖 [AI] Calling askClaude (style: ${responseStyle}, maxTokens: ${maxTokens})...`);
    const response = await askClaude(message, systemPrompt, { maxTokens });
    console.log(`🤖 [AI] LLM response received: "${response.substring(0, 50)}..."`)

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
  const settings = getSettings();
  const mode = getConversationMode(candidateId);

  console.log(`🤖 [AI] Processing message for ${candidateId}`);
  console.log(`🤖 [AI] Settings: ai_enabled=${settings.ai_enabled}, default_mode=${settings.default_mode}`);
  console.log(`🤖 [AI] Resolved mode for this conversation: ${mode}`);

  if (mode === 'off') {
    console.log(`🤖 [AI] Mode is OFF, skipping AI response`);
    return null;
  }

  // Generate AI response
  console.log(`🤖 [AI] Generating response...`);
  const response = await generateResponse(candidateId, content, { mode });
  console.log(`🤖 [AI] Response generated:`, response ? `"${response.content?.substring(0, 50)}..."` : 'NULL');

  if (mode === 'auto') {
    // Auto mode: Send response immediately
    console.log(`🤖 [AI] AUTO mode: Sending response immediately`);
    try {
      await sendAIResponse(candidateId, response, channel, content);
      console.log(`🤖 [AI] AI response sent successfully`);
    } catch (err) {
      console.error(`🤖 [AI] Failed to send AI response:`, err.message);
    }
    return {
      mode: 'auto',
      response,
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
 * Routes to the same channel the worker messaged from
 */
async function sendAIResponse(candidateId, response, channel = 'app', originalQuestion = null) {
  console.log(`📤 [AI] Sending response to ${candidateId} via ${channel}: "${response.content.substring(0, 50)}..."`);
  const messaging = require('../messaging');

  // Send via unified messaging service with explicit channel
  // The messaging service will route to the correct channel
  const result = await messaging.sendToCandidate(candidateId, response.content, {
    channel: channel,  // Use the channel the worker messaged from
    replyToChannel: channel,  // Explicit: reply on same channel
    aiGenerated: true,
    aiSource: response.source || 'llm',
  });
  console.log(`📤 [AI] Send result:`, result.success ? `SUCCESS via ${result.channel}` : `FAILED: ${result.error}`);

  // Update the log to mark as sent
  if (response.logId) {
    db.prepare(`
      UPDATE ai_response_logs SET status = 'sent', channel = ? WHERE id = ?
    `).run(channel, response.logId);

    // Store pending feedback for implicit learning (Auto mode)
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
    channel: channel,
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
