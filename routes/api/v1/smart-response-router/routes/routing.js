/**
 * Smart Response Router Core Routing Routes
 * Handles message analysis and routing decisions
 * @module smart-response-router/routes/routing
 */

const express = require('express');
const { authenticateAdmin, authenticateAny } = require('../../../../../middleware/auth');
const SmartRouterAnalytics = require('../helpers/analytics');
const logger = require('../../../../../utils/logger');

const router = express.Router();
const analytics = new SmartRouterAnalytics();

/**
 * POST /analyze
 * Analyze message and determine routing strategy
 */
router.post('/analyze', authenticateAny, async (req, res) => {
  try {
    const { message, candidateId, context = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required'
      });
    }

    // Perform message analysis
    const analysis = await analyzeMessage(message, context);

    // Track the analysis
    await analytics.trackRoutingDecision(
      candidateId,
      message,
      'analysis',
      {
        ...analysis,
        requestedBy: req.user?.id || 'system'
      }
    );

    res.json({
      success: true,
      data: analysis,
      candidateId,
      message: 'Message analysis completed successfully'
    });

  } catch (error) {
    logger.error('Failed to analyze message', {
      candidateId: req.body?.candidateId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to analyze message',
      details: error.message
    });
  }
});

/**
 * POST /route
 * Route message to appropriate response system
 */
router.post('/route', authenticateAny, async (req, res) => {
  try {
    const {
      message,
      candidateId,
      context = {},
      preferredRouting = 'auto',
      forceRoute = null
    } = req.body;

    if (!message || !candidateId) {
      return res.status(400).json({
        success: false,
        error: 'message and candidateId are required'
      });
    }

    // Analyze message first
    const analysis = await analyzeMessage(message, context);

    // Determine routing decision
    const routingDecision = forceRoute || await determineRouting(analysis, preferredRouting, context);

    // Execute routing
    const routingResult = await executeRouting(candidateId, message, routingDecision, analysis, context);

    // Track the routing decision
    await analytics.trackRoutingDecision(
      candidateId,
      message,
      routingDecision.type,
      {
        analysis,
        routingDecision,
        routingResult,
        preferredRouting,
        forced: !!forceRoute,
        requestedBy: req.user?.id || 'system'
      }
    );

    res.json({
      success: true,
      data: {
        analysis,
        routingDecision,
        result: routingResult
      },
      candidateId,
      message: 'Message routed successfully'
    });

  } catch (error) {
    logger.error('Failed to route message', {
      candidateId: req.body?.candidateId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Failed to route message',
      details: error.message
    });
  }
});

/**
 * POST /batch-route
 * Route multiple messages in batch
 */
router.post('/batch-route', authenticateAdmin, async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required and must not be empty'
      });
    }

    if (messages.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 messages can be processed in batch'
      });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < messages.length; i++) {
      try {
        const msg = messages[i];

        if (!msg.message || !msg.candidateId) {
          errors.push({
            index: i,
            error: 'message and candidateId are required',
            input: msg
          });
          continue;
        }

        const analysis = await analyzeMessage(msg.message, msg.context || {});
        const routingDecision = await determineRouting(analysis, 'auto', msg.context || {});
        const routingResult = await executeRouting(
          msg.candidateId,
          msg.message,
          routingDecision,
          analysis,
          msg.context || {}
        );

        results.push({
          index: i,
          candidateId: msg.candidateId,
          analysis,
          routingDecision,
          result: routingResult
        });

        // Track each routing decision
        await analytics.trackRoutingDecision(
          msg.candidateId,
          msg.message,
          routingDecision.type,
          {
            analysis,
            routingDecision,
            routingResult,
            batchProcess: true,
            batchIndex: i
          }
        );

      } catch (msgError) {
        errors.push({
          index: i,
          error: msgError.message,
          input: messages[i]
        });
      }
    }

    res.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: messages.length,
          successful: results.length,
          failed: errors.length
        }
      },
      message: `Batch routing completed. ${results.length} successful, ${errors.length} failed.`
    });

  } catch (error) {
    logger.error('Failed to process batch routing', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to process batch routing',
      details: error.message
    });
  }
});

/**
 * GET /routing-options
 * Get available routing options and their descriptions
 */
router.get('/routing-options', authenticateAdmin, (req, res) => {
  try {
    const options = {
      auto: {
        description: 'Automatically determine best routing based on analysis',
        priority: 1,
        useCase: 'General purpose routing'
      },
      ai_response: {
        description: 'Route to AI response generation system',
        priority: 2,
        useCase: 'Complex queries requiring AI processing'
      },
      template_response: {
        description: 'Route to template-based response system',
        priority: 3,
        useCase: 'Common questions with predefined answers'
      },
      escalation: {
        description: 'Escalate to human admin',
        priority: 4,
        useCase: 'Complex issues requiring human intervention'
      },
      fallback: {
        description: 'Use fallback response system',
        priority: 5,
        useCase: 'When other routing options fail'
      }
    };

    res.json({
      success: true,
      data: options,
      message: 'Routing options retrieved successfully'
    });

  } catch (error) {
    logger.error('Failed to get routing options', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve routing options',
      details: error.message
    });
  }
});

// Helper Functions

/**
 * Analyze message content and context
 * @param {string} message - Message to analyze
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeMessage(message, context = {}) {
  try {
    const analysis = {
      intent: detectIntent(message),
      sentiment: analyzeSentiment(message),
      complexity: calculateComplexity(message),
      confidence: 0.8, // Simplified confidence score
      keywords: extractKeywords(message),
      language: 'english', // Simplified language detection
      urgency: detectUrgency(message, context),
      category: categorizeMessage(message),
      requiresHuman: shouldEscalateToHuman(message, context),
      timestamp: new Date().toISOString()
    };

    // Calculate overall confidence based on various factors
    analysis.confidence = calculateOverallConfidence(analysis);

    return analysis;

  } catch (error) {
    logger.error('Message analysis failed', { error: error.message });
    throw error;
  }
}

/**
 * Detect message intent
 * @param {string} message - Message to analyze
 * @returns {Object} Intent detection result
 */
function detectIntent(message) {
  const lowerMessage = message.toLowerCase();

  const intents = {
    job_inquiry: ['job', 'work', 'position', 'opportunity', 'hiring'],
    payment_inquiry: ['pay', 'payment', 'salary', 'money', 'wage'],
    schedule_inquiry: ['schedule', 'time', 'when', 'availability'],
    help_request: ['help', 'support', 'problem', 'issue', 'error'],
    greeting: ['hello', 'hi', 'good morning', 'good afternoon'],
    complaint: ['complain', 'unhappy', 'bad', 'terrible', 'worst']
  };

  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return {
        type: intent,
        confidence: 0.8,
        keywords: keywords.filter(keyword => lowerMessage.includes(keyword))
      };
    }
  }

  return {
    type: 'general',
    confidence: 0.5,
    keywords: []
  };
}

/**
 * Analyze message sentiment
 * @param {string} message - Message to analyze
 * @returns {Object} Sentiment analysis result
 */
function analyzeSentiment(message) {
  const lowerMessage = message.toLowerCase();

  const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thank'];
  const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'hate'];

  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

  let sentiment = 'neutral';
  let score = 0;

  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    score = Math.min(positiveCount * 0.3, 1);
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    score = Math.max(-negativeCount * 0.3, -1);
  }

  return {
    sentiment,
    score,
    confidence: Math.abs(score)
  };
}

/**
 * Calculate message complexity
 * @param {string} message - Message to analyze
 * @returns {Object} Complexity analysis
 */
function calculateComplexity(message) {
  const wordCount = message.split(' ').length;
  const questionMarks = (message.match(/\?/g) || []).length;
  const exclamationMarks = (message.match(/!/g) || []).length;

  let complexity = 'low';
  let score = 0;

  if (wordCount > 50 || questionMarks > 2) {
    complexity = 'high';
    score = 0.8;
  } else if (wordCount > 20 || questionMarks > 0) {
    complexity = 'medium';
    score = 0.5;
  } else {
    score = 0.2;
  }

  return {
    level: complexity,
    score,
    wordCount,
    hasQuestions: questionMarks > 0,
    hasExclamations: exclamationMarks > 0
  };
}

/**
 * Extract keywords from message
 * @param {string} message - Message to analyze
 * @returns {Array} Keywords array
 */
function extractKeywords(message) {
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'];

  return message
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 10); // Limit to 10 keywords
}

/**
 * Detect urgency level
 * @param {string} message - Message to analyze
 * @param {Object} context - Additional context
 * @returns {Object} Urgency analysis
 */
function detectUrgency(message, context) {
  const lowerMessage = message.toLowerCase();
  const urgentWords = ['urgent', 'emergency', 'asap', 'immediately', 'help', 'problem'];

  const hasUrgentWords = urgentWords.some(word => lowerMessage.includes(word));
  const hasExclamations = (message.match(/!/g) || []).length > 1;

  let level = 'normal';
  let score = 0.3;

  if (hasUrgentWords || hasExclamations) {
    level = 'high';
    score = 0.8;
  } else if (lowerMessage.includes('when') || lowerMessage.includes('?')) {
    level = 'medium';
    score = 0.6;
  }

  return {
    level,
    score,
    indicators: {
      urgentWords: hasUrgentWords,
      exclamations: hasExclamations,
      timeReference: lowerMessage.includes('when') || lowerMessage.includes('today')
    }
  };
}

/**
 * Categorize message type
 * @param {string} message - Message to analyze
 * @returns {string} Message category
 */
function categorizeMessage(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('job') || lowerMessage.includes('work')) {
    return 'job_related';
  } else if (lowerMessage.includes('pay') || lowerMessage.includes('money')) {
    return 'payment_related';
  } else if (lowerMessage.includes('schedule') || lowerMessage.includes('time')) {
    return 'scheduling_related';
  } else if (lowerMessage.includes('help') || lowerMessage.includes('problem')) {
    return 'support_request';
  } else {
    return 'general_inquiry';
  }
}

/**
 * Determine if message should be escalated to human
 * @param {string} message - Message to analyze
 * @param {Object} context - Additional context
 * @returns {boolean} Whether to escalate
 */
function shouldEscalateToHuman(message, context) {
  const complexity = calculateComplexity(message);
  const sentiment = analyzeSentiment(message);

  return complexity.score > 0.7 ||
         sentiment.sentiment === 'negative' && sentiment.score < -0.5 ||
         context.previousEscalations > 2;
}

/**
 * Calculate overall confidence score
 * @param {Object} analysis - Analysis object
 * @returns {number} Overall confidence score
 */
function calculateOverallConfidence(analysis) {
  const weights = {
    intent: 0.3,
    sentiment: 0.2,
    complexity: 0.2,
    urgency: 0.2,
    clarity: 0.1
  };

  let totalScore = 0;
  totalScore += analysis.intent.confidence * weights.intent;
  totalScore += analysis.sentiment.confidence * weights.sentiment;
  totalScore += (1 - analysis.complexity.score) * weights.complexity; // Lower complexity = higher confidence
  totalScore += analysis.urgency.score * weights.urgency;
  totalScore += 0.8 * weights.clarity; // Simplified clarity score

  return Math.round(totalScore * 100) / 100;
}

/**
 * Determine routing decision
 * @param {Object} analysis - Message analysis
 * @param {string} preferredRouting - Preferred routing type
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Routing decision
 */
async function determineRouting(analysis, preferredRouting, context) {
  if (preferredRouting !== 'auto') {
    return {
      type: preferredRouting,
      confidence: 0.9,
      reason: 'explicitly_requested'
    };
  }

  // Auto-routing logic
  if (analysis.requiresHuman || analysis.confidence < 0.4) {
    return {
      type: 'escalation',
      confidence: 0.8,
      reason: 'low_confidence_or_complex_query'
    };
  }

  if (analysis.intent.type === 'general' || analysis.complexity.score > 0.6) {
    return {
      type: 'ai_response',
      confidence: 0.7,
      reason: 'complex_query_needs_ai'
    };
  }

  return {
    type: 'template_response',
    confidence: 0.8,
    reason: 'simple_query_template_match'
  };
}

/**
 * Execute routing decision
 * @param {string} candidateId - Candidate ID
 * @param {string} message - Original message
 * @param {Object} routingDecision - Routing decision
 * @param {Object} analysis - Message analysis
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Routing result
 */
async function executeRouting(candidateId, message, routingDecision, analysis, context) {
  // This would integrate with actual routing systems
  // For now, return mock response based on routing type

  const responses = {
    ai_response: 'AI-generated response based on analysis',
    template_response: 'Template-based response for common query',
    escalation: 'Query escalated to human admin',
    fallback: 'Fallback response - please contact support'
  };

  return {
    response: responses[routingDecision.type] || responses.fallback,
    responseType: routingDecision.type,
    confidence: routingDecision.confidence,
    processingTime: Math.floor(Math.random() * 200) + 50, // Simulated processing time
    timestamp: new Date().toISOString()
  };
}

module.exports = router;