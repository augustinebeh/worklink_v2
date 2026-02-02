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

const { db } = require('../../db');
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
 * Get SLM settings
 */
function getSLMSettings() {
  const rows = db.prepare(`
    SELECT key, value FROM ai_settings WHERE key LIKE 'slm_%'
  `).all();
  console.log(`🤖 [SLM] getSLMSettings: Found ${rows.length} settings in database`);

  const settings = {};
  rows.forEach(row => {
    const cleanKey = row.key.replace('slm_', '');
    if (row.value === 'true') settings[cleanKey] = true;
    else if (row.value === 'false') settings[cleanKey] = false;
    else if (!isNaN(parseFloat(row.value))) settings[cleanKey] = parseFloat(row.value);
    else settings[cleanKey] = row.value;
  });

  // Default SLM settings if none exist
  if (Object.keys(settings).length === 0) {
    settings.enabled = true;
    settings.default_mode = 'auto';
    settings.interview_scheduling_enabled = true;
    settings.max_context_messages = 10;
  }

  console.log(`🤖 [SLM] getSLMSettings result:`, JSON.stringify(settings));
  return settings;
}

/**
 * Get conversation SLM mode for a candidate
 * Returns: 'off' | 'auto' | 'interview_only' | 'inherit'
 */
function getConversationSLMMode(candidateId) {
  const settings = getSLMSettings();

  console.log(`🤖 [SLM] getConversationSLMMode: slm_enabled=${settings.enabled} (type: ${typeof settings.enabled})`);

  if (!settings.enabled) {
    console.log(`🤖 [SLM] SLM is disabled globally, returning 'off'`);
    return 'off';
  }

  // Check per-conversation override
  const conversationSettings = db.prepare(`
    SELECT mode FROM conversation_slm_settings WHERE candidate_id = ?
  `).get(candidateId);

  console.log(`🤖 [SLM] Conversation override for ${candidateId}:`, conversationSettings || 'none');

  if (conversationSettings && conversationSettings.mode !== 'inherit') {
    console.log(`🤖 [SLM] Using conversation override: ${conversationSettings.mode}`);
    return conversationSettings.mode;
  }

  // Fall back to global default
  const mode = settings.default_mode || 'auto';
  console.log(`🤖 [SLM] Using global default: ${mode}`);
  return mode;
}

/**
 * Set conversation SLM mode for a candidate
 */
function setConversationSLMMode(candidateId, mode) {
  db.prepare(`
    INSERT INTO conversation_slm_settings (candidate_id, mode, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(candidate_id) DO UPDATE SET mode = ?, updated_at = datetime('now')
  `).run(candidateId, mode, mode);
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
      content: `Your account is pending verification. Our admin team will review your profile and reach out soon. To help speed things up, I can also help schedule a quick verification interview with our friendly consultant - this often fast-tracks approval! Let me know if you'd like me to check available time slots. 📅`,
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
      content: `Hi${firstName ? ' ' + firstName : ''}! Welcome to WorkLink! 👋 Your account is being reviewed by our team. While you wait, I can help speed up the process by scheduling a quick verification interview with one of our consultants. This often leads to faster approval! Would you like me to find a good time for you?`,
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
    content: `Thanks for reaching out${firstName ? ', ' + firstName : ''}! Your account is currently pending verification. To potentially speed up the process, I can help schedule a quick verification interview with our recruitment consultant. This often fast-tracks approval significantly! Would you like me to check available time slots? 🙏`,
    isPendingResponse: true,
  };
}

/**
 * Generate AI response for a candidate message
 * Now integrated with Smart Response Router for improved accuracy and reliability
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

  // SMART RESPONSE ROUTER INTEGRATION
  // Check if Smart Response Router is available and should be used
  try {
    const smartRouterIntegration = require('./smart-router-integration');

    console.log(`🎯 [SMART ROUTER] Using Smart Response Router integration for ${candidateId}`);

    const smartResponse = await smartRouterIntegration.generateResponse(candidateId, message, options);

    console.log(`🎯 [SMART ROUTER] Response generated: ${smartResponse.source}, System: ${smartResponse.systemUsed}`);

    return smartResponse;

  } catch (smartRouterError) {
    console.error('🚨 [SMART ROUTER] Integration failed, falling back to legacy system:', smartRouterError.message);
    // Continue with legacy system below
  }

  // LEGACY SYSTEM (fallback)
  console.log(`🤖 [LEGACY AI] Using legacy AI system for ${candidateId}`);

  // IMPROVED: Use enhanced chat engine with interview scheduling for pending candidates
  const candidate = getCandidate(candidateId);
  if (candidate && candidate.status === 'pending') {
    console.log(`🤖 [AI] IMPROVED - Candidate ${candidateId} is PENDING - using interview scheduling system`);

    try {
      // Use improved chat engine for pending candidates
      const ImprovedChatEngine = require('./improved-chat-engine');
      const improvedEngine = new ImprovedChatEngine();

      const enhancedResponse = await improvedEngine.handlePendingCandidateWithScheduling(
        candidateId,
        message,
        candidate
      );

      const responseTime = Date.now() - startTime;

      console.log(`🎯 [IMPROVED AI] Enhanced pending response: ${enhancedResponse.source}, Intent: ${enhancedResponse.intent}`);

      return {
        content: enhancedResponse.content,
        source: enhancedResponse.source,
        confidence: enhancedResponse.confidence,
        intent: enhancedResponse.intent,
        responseTimeMs: responseTime,
        fromKB: false,
        isPendingUser: true,
        canScheduleInterview: enhancedResponse.canScheduleInterview,
        metadata: enhancedResponse.metadata
      };

    } catch (error) {
      console.error('❌ Enhanced chat engine error:', error);
      // Fallback to basic response
      const pendingResponse = getPendingUserResponse(message, candidate.name);
      const responseTime = Date.now() - startTime;

      return {
        content: pendingResponse.content,
        source: 'pending_status_fallback',
        confidence: 0.7,
        intent: 'pending_user',
        responseTimeMs: responseTime,
        fromKB: false,
        isPendingUser: true,
      };
    }
  }

  // Check if this query needs real-time data (payment amounts, job status, etc.)
  const lowerMessage = message.toLowerCase();
  const needsRealTimeData =
    lowerMessage.includes('how much') ||
    lowerMessage.includes('my balance') ||
    lowerMessage.includes('my payment') ||
    lowerMessage.includes('my earning') ||
    (lowerMessage.includes('pending') && (lowerMessage.includes('amount') || lowerMessage.includes('much') || lowerMessage.includes('payment')));

  // 1. Try improved fact-based responses first, then knowledge base
  console.log(`🤖 [AI] Checking fact-based responses first, then knowledge base (kb_enabled=${settings.kb_enabled}, needsRealTimeData=${needsRealTimeData})`);

  try {
    // First, try improved fact-based responses for active candidates
    const ImprovedChatEngine = require('./improved-chat-engine');
    const improvedEngine = new ImprovedChatEngine();

    const improvedResponse = await improvedEngine.processMessage(candidateId, message, 'auto');

    // If improved engine handled it (not an error or escalation), use it
    if (improvedResponse && !improvedResponse.error && improvedResponse.source !== 'llm_with_real_data') {
      const responseTime = Date.now() - startTime;

      console.log(`🎯 [IMPROVED AI] Using fact-based response: ${improvedResponse.source}`);

      return {
        content: improvedResponse.content,
        source: `improved_${improvedResponse.source}`,
        confidence: improvedResponse.confidence,
        intent: improvedResponse.intent,
        responseTimeMs: responseTime,
        fromKB: false,
        usesRealData: improvedResponse.usesRealData,
        requiresAdminAttention: improvedResponse.requiresAdminAttention
      };
    }
  } catch (error) {
    console.log(`🤖 [AI] Improved engine not available, falling back to KB: ${error.message}`);
  }

  // Fallback to knowledge base (but filter out problematic responses)
  if (settings.kb_enabled !== false && !needsRealTimeData) {
    const kbAnswer = await ml.findAnswer(message);
    console.log(`🤖 [AI] KB answer:`, kbAnswer ? 'Found' : 'Not found');

    if (kbAnswer) {
      // FILTER OUT PROBLEMATIC RESPONSES
      const problematicPhrases = [
        'usually arrive within 24 hours',
        'auto-approve',
        'within 72 hours max',
        'completely free',
        'usually within a few hours',
        'our system will'
      ];

      const hasProblematicContent = problematicPhrases.some(phrase =>
        kbAnswer.answer.toLowerCase().includes(phrase)
      );

      if (hasProblematicContent) {
        console.log(`⚠️ [AI] Filtering out problematic KB response: "${kbAnswer.answer.substring(0, 50)}..."`);
        // Don't return the problematic response, let it fall through to LLM
      } else {
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
 * Process an incoming message with SLM integration
 *
 * This function first checks if SLM should handle the message, then falls back to AI if needed.
 * SLM is particularly designed for pending candidates and interview scheduling.
 *
 * @param {string} candidateId - Candidate ID
 * @param {string} content - Message content
 * @param {string} channel - 'app' | 'telegram'
 */
async function processIncomingMessage(candidateId, content, channel = 'app') {
  const settings = getSettings();
  const slmSettings = getSLMSettings();
  const aiMode = getConversationMode(candidateId);
  const slmMode = getConversationSLMMode(candidateId);

  console.log(`🤖 [PROCESSING] Message for ${candidateId}`);
  console.log(`🤖 [PROCESSING] AI mode: ${aiMode}, SLM mode: ${slmMode}`);

  // Check if SLM should handle this message first
  if (slmMode !== 'off' && slmSettings.enabled) {
    console.log(`🤖 [SLM] SLM is enabled, checking if it should handle this message...`);

    try {
      const SLMSchedulingBridge = require('../../utils/slm-scheduling-bridge');
      const slmBridge = new SLMSchedulingBridge();

      // Get candidate info to determine if SLM should handle
      const candidate = getCandidate(candidateId);

      // SLM handles messages in these cases:
      const shouldSLMHandle =
        candidate?.status === 'pending' ||  // Pending candidates always go to SLM
        slmMode === 'interview_only' ||     // Interview-only mode
        (slmMode === 'auto' && (           // Auto mode with interview-related keywords
          /\b(schedule|interview|meet|talk|verification|available|time)\b/i.test(content)
        ));

      if (shouldSLMHandle) {
        console.log(`🤖 [SLM] SLM will handle this message (reason: ${candidate?.status === 'pending' ? 'pending candidate' : slmMode})`);

        const slmResponse = await slmBridge.integrateWithChatSLM(candidateId, content, {
          channel,
          mode: slmMode,
          timestamp: new Date().toISOString()
        });

        if (slmResponse) {
          console.log(`🤖 [SLM] SLM generated response: "${slmResponse.content?.substring(0, 50)}..."`);

          if (slmMode === 'auto') {
            // Auto mode: Send SLM response immediately
            try {
              const messaging = require('../messaging');
              const result = await messaging.sendToCandidate(candidateId, slmResponse.content, {
                channel: channel,
                aiGenerated: true,
                aiSource: 'slm',
                slmGenerated: true,
              });
              console.log(`🤖 [SLM] SLM response sent successfully via ${result.channel}`);
            } catch (err) {
              console.error(`🤖 [SLM] Failed to send SLM response:`, err.message);
            }
          } else {
            // For suggest mode or manual review, broadcast to admins
            const { broadcastToAdmins } = require('../../websocket');

            broadcastToAdmins({
              type: 'slm_suggestion',
              candidateId,
              suggestion: {
                id: Date.now(), // Temporary ID
                content: slmResponse.content,
                intent: slmResponse.metadata?.flow || 'interview_scheduling',
                confidence: 0.9,
                source: 'slm',
                fromSLM: true,
                generatedAt: new Date().toISOString(),
                metadata: slmResponse.metadata,
              },
            });
          }

          return {
            mode: 'slm_' + slmMode,
            response: slmResponse,
            handledBy: 'slm',
          };
        }
      }
    } catch (error) {
      console.error(`🤖 [SLM] SLM processing failed, falling back to AI:`, error.message);
    }
  }

  // Fall back to regular AI processing
  console.log(`🤖 [AI] Processing with regular AI system...`);

  if (aiMode === 'off') {
    console.log(`🤖 [AI] AI mode is OFF, no response generated`);
    return null;
  }

  // Generate AI response
  console.log(`🤖 [AI] Generating AI response...`);
  const response = await generateResponse(candidateId, content, { mode: aiMode });
  console.log(`🤖 [AI] Response generated:`, response ? `"${response.content?.substring(0, 50)}..."` : 'NULL');

  if (aiMode === 'auto') {
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
  } else if (aiMode === 'suggest') {
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
  const startTime = Date.now();
  console.log(`📤 [AI ENHANCED] Sending response to ${candidateId} via ${channel}: "${response.content.substring(0, 50)}..."`);

  try {
    const messaging = require('../messaging');

    // Enhanced channel routing for SLM responses
    const routingOptions = {
      channel: channel,  // Use the channel the worker messaged from
      replyToChannel: channel,  // Explicit: reply on same channel
      aiGenerated: true,
      aiSource: response.source || 'llm',
    };

    // Special handling for SLM-related responses
    if (response.source && (
        response.source.includes('smart_response_router') ||
        response.source.includes('interview_scheduling') ||
        response.source.includes('slm_bridge') ||
        response.source.includes('slm') ||
        response.source.includes('fact_based_real_data')
      )) {
      routingOptions.slmGenerated = true;
      routingOptions.requiresReliability = true;
      routingOptions.isPendingCandidate = response.isPendingUser || false;
      routingOptions.usesRealData = response.usesRealData || false;

      console.log(`📤 [AI ENHANCED] SLM response detected, using enhanced routing`, {
        candidateId,
        source: response.source,
        slmGenerated: true,
        usesRealData: routingOptions.usesRealData,
        channel
      });
    }

    // Send via unified messaging service with enhanced options
    const result = await messaging.sendToCandidate(candidateId, response.content, routingOptions);

    const responseTime = Date.now() - startTime;

    console.log(`📤 [AI ENHANCED] Send result:`, {
      success: result.success,
      channel: result.channel,
      error: result.error,
      responseTime: `${responseTime}ms`,
      slmGenerated: routingOptions.slmGenerated || false
    });

    // Update the log to mark as sent with enhanced metadata
    if (response.logId) {
      // Basic update that works with existing schema
      db.prepare(`
        UPDATE ai_response_logs SET status = 'sent', channel = ? WHERE id = ?
      `).run(channel, response.logId);

      // Store pending feedback for implicit learning (Auto mode)
      if (originalQuestion) {
        try {
          ml.storePendingFeedback(candidateId, response.logId, originalQuestion);
        } catch (feedbackError) {
          console.warn('Failed to store pending feedback:', feedbackError.message);
        }
      }
    }

    // Enhanced admin notification with more context
    const { broadcastToAdmins } = require('../../websocket');

    broadcastToAdmins({
      type: 'ai_message_sent',
      candidateId,
      message: result.message,
      aiLogId: response.logId,
      source: response.source,
      channel: channel,
      slmGenerated: routingOptions.slmGenerated || false,
      usesRealData: routingOptions.usesRealData || false,
      responseTime: responseTime,
      routingSuccess: result.success,
      timestamp: new Date().toISOString()
    });

    return result;

  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error(`📤 [AI ENHANCED] Failed to send AI response:`, {
      candidateId,
      error: error.message,
      responseTime: `${responseTime}ms`,
      source: response.source
    });

    // Update log with failure status if possible
    if (response.logId) {
      try {
        db.prepare(`
          UPDATE ai_response_logs SET status = 'send_failed' WHERE id = ?
        `).run(response.logId);
      } catch (dbError) {
        console.warn('Failed to update log with error status:', dbError.message);
      }
    }

    // Notify admins of send failure
    try {
      const { broadcastToAdmins } = require('../../websocket');

      broadcastToAdmins({
        type: 'ai_message_send_failed',
        candidateId,
        aiLogId: response.logId,
        source: response.source,
        error: error.message,
        channel: channel,
        responseTime: responseTime,
        requiresManualIntervention: true,
        timestamp: new Date().toISOString()
      });
    } catch (adminNotifyError) {
      console.error('Failed to notify admins of send failure:', adminNotifyError.message);
    }

    // Re-throw error for upstream handling
    throw error;
  }
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

  // SLM Settings
  getSLMSettings,
  getConversationSLMMode,
  setConversationSLMMode,

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
