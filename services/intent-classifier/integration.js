/**
 * Intent Classifier Integration Layer
 *
 * Integrates the lightweight intent classifier with the existing AI chat system.
 * Provides backward compatibility and smooth transition from the heavy ML pipeline.
 */

const intentClassifier = require('./index');
const { db } = require('../../db');
const monitor = require('./monitoring');

/**
 * Enhanced intent detection that replaces the old LLM-based detection
 * @param {string} message - User message
 * @param {object} context - Additional context (candidateId, etc.)
 * @returns {object} Intent detection result in the expected format
 */
async function detectIntent(message, context = {}) {
  const startTime = Date.now();

  // Enhance context with database information if candidateId provided
  let enrichedContext = context;
  if (context.candidateId) {
    enrichedContext = await enrichContextFromDatabase(context.candidateId, context);
  }

  // Classify intent using the new lightweight system
  const classification = intentClassifier.classifyIntent(message, enrichedContext);

  const processingTime = Date.now() - startTime;

  // Transform to match the expected format from the old system
  return {
    intent: mapIntentToLegacyFormat(classification.intent),
    confidence: classification.confidence,
    keywords: classification.keywords || [],
    subtype: classification.subtype || null,
    priority: classification.priority,
    processingTimeMs: processingTime,
    escalationRequired: classification.priority >= 3,

    // Additional new features
    matchedPattern: classification.matchedPattern,
    contextBoost: classification.contextBoost,
    singlishDetected: classification.contextInfo?.singlishDetected || false,

    // Compatibility fields
    category: classification.intent, // Some parts of the code expect 'category'
    source: 'lightweight_classifier',
    version: '2.0'
  };
}

/**
 * Enrich context with database information
 */
async function enrichContextFromDatabase(candidateId, baseContext) {
  try {
    // Get candidate information
    const candidate = db.prepare(`
      SELECT id, name, status, total_jobs_completed, created_at, last_seen
      FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return baseContext;
    }

    // Get recent message history to determine conversation context
    const messageCount = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE candidate_id = ? AND created_at > datetime('now', '-1 day')
    `).get(candidateId)?.count || 0;

    // Check for recent technical issues
    const recentTechIssues = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE candidate_id = ?
        AND created_at > datetime('now', '-7 days')
        AND (content LIKE '%error%' OR content LIKE '%problem%' OR content LIKE '%issue%' OR content LIKE '%bug%')
    `).get(candidateId)?.count || 0;

    // Determine if this is likely the first message
    const isFirstMessage = messageCount <= 1;

    return {
      ...baseContext,
      candidate,
      messageCount,
      recentTechIssues,
      isFirstMessage,
      userStatus: candidate.status,
      hasCompletedJobs: (candidate.total_jobs_completed || 0) > 0
    };
  } catch (error) {
    console.error('Error enriching context:', error.message);
    return baseContext;
  }
}

/**
 * Map new intent categories to legacy format for backward compatibility
 */
function mapIntentToLegacyFormat(newIntent) {
  const intentMapping = {
    'payment_inquiry': 'pay_inquiry',
    'verification_question': 'general_question', // Map to existing category
    'job_search': 'job_search',
    'technical_issue': 'complaint', // Technical issues often become complaints
    'urgent_escalation': 'urgent',
    'general_help': 'general_question',
    'interview_scheduling': 'general_question' // Can be handled as general question
  };

  return intentMapping[newIntent] || 'unknown';
}

/**
 * Enhanced classification for the AI chat system
 * This replaces the old generateResponse intent detection
 */
async function classifyForAIChat(candidateId, message, channel = 'app') {
  const context = {
    candidateId,
    channel,
    timestamp: new Date().toISOString()
  };

  const result = await detectIntent(message, context);

  // Add AI chat specific enhancements
  result.aiChatRecommendations = generateAIChatRecommendations(result);
  result.responseStrategy = determineResponseStrategy(result);
  result.escalationLevel = determineEscalationLevel(result);

  // Log the classification for monitoring
  logClassification(candidateId, message, result);

  // Record in monitoring system
  monitor.recordClassification(candidateId, message, result);

  return result;
}

/**
 * Generate recommendations for the AI chat system
 */
function generateAIChatRecommendations(classificationResult) {
  const recommendations = {
    useFactBasedResponse: false,
    escalateToAdmin: false,
    requireRealTimeData: false,
    suggestedTemplates: []
  };

  switch (classificationResult.intent) {
    case 'pay_inquiry':
      recommendations.requireRealTimeData = true;
      recommendations.suggestedTemplates = ['payment_status', 'payment_method'];
      break;

    case 'urgent':
      recommendations.escalateToAdmin = true;
      recommendations.useFactBasedResponse = false;
      break;

    case 'job_search':
      recommendations.requireRealTimeData = true;
      recommendations.suggestedTemplates = ['job_suggestions', 'job_requirements'];
      break;

    case 'general_question':
      recommendations.useFactBasedResponse = true;
      if (classificationResult.subtype === 'local_status_inquiry') {
        recommendations.suggestedTemplates = ['verification_status'];
      }
      break;

    case 'complaint':
      if (classificationResult.confidence > 0.7) {
        recommendations.escalateToAdmin = true;
      } else {
        recommendations.useFactBasedResponse = true;
        recommendations.suggestedTemplates = ['technical_support'];
      }
      break;
  }

  return recommendations;
}

/**
 * Determine response strategy based on classification
 */
function determineResponseStrategy(result) {
  if (result.escalationRequired || result.confidence < 0.4) {
    return 'human_escalation';
  }

  if (result.aiChatRecommendations.requireRealTimeData) {
    return 'data_driven_response';
  }

  if (result.aiChatRecommendations.useFactBasedResponse && result.confidence > 0.7) {
    return 'template_response';
  }

  return 'ai_generated';
}

/**
 * Determine escalation level
 */
function determineEscalationLevel(result) {
  if (result.priority >= 3) {
    return 'immediate';
  }

  if (result.priority === 2) {
    return 'high';
  }

  if (result.confidence < 0.3) {
    return 'low_confidence';
  }

  return 'none';
}

/**
 * Log classification for monitoring and improvement
 */
function logClassification(candidateId, message, result) {
  try {
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS intent_classification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        candidate_id TEXT,
        message TEXT,
        classified_intent TEXT,
        confidence REAL,
        processing_time_ms INTEGER,
        matched_pattern TEXT,
        escalation_required INTEGER,
        source TEXT DEFAULT 'lightweight_classifier',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.prepare(`
      INSERT INTO intent_classification_logs
      (candidate_id, message, classified_intent, confidence, processing_time_ms, matched_pattern, escalation_required, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      candidateId,
      message.substring(0, 500), // Limit message length for storage
      result.intent,
      result.confidence,
      result.processingTimeMs,
      result.matchedPattern,
      result.escalationRequired ? 1 : 0,
      'lightweight_classifier'
    );
  } catch (error) {
    // Non-critical error - don't break the flow
    console.error('Error logging classification:', error.message);
  }
}

/**
 * Get classification analytics
 */
function getClassificationAnalytics(days = 7) {
  try {
    const analytics = db.prepare(`
      SELECT
        classified_intent,
        COUNT(*) as count,
        AVG(confidence) as avg_confidence,
        AVG(processing_time_ms) as avg_processing_time,
        SUM(escalation_required) as escalations
      FROM intent_classification_logs
      WHERE created_at > datetime('now', '-' || ? || ' days')
      GROUP BY classified_intent
      ORDER BY count DESC
    `).all(days);

    const totalClassifications = db.prepare(`
      SELECT COUNT(*) as total FROM intent_classification_logs
      WHERE created_at > datetime('now', '-' || ? || ' days')
    `).get(days)?.total || 0;

    const avgProcessingTime = db.prepare(`
      SELECT AVG(processing_time_ms) as avg FROM intent_classification_logs
      WHERE created_at > datetime('now', '-' || ? || ' days')
    `).get(days)?.avg || 0;

    return {
      totalClassifications,
      avgProcessingTime: Math.round(avgProcessingTime * 100) / 100,
      intentDistribution: analytics,
      performanceTarget: '< 100ms',
      performanceMet: avgProcessingTime < 100
    };
  } catch (error) {
    console.error('Error getting analytics:', error.message);
    return null;
  }
}

/**
 * Test the integration with sample data
 */
async function testIntegration() {
  console.log('🔌 Testing Intent Classifier Integration\n');

  const testCases = [
    { candidateId: 'test-001', message: "When will I get paid ah?" },
    { candidateId: 'test-002', message: "account approved or not" },
    { candidateId: 'test-003', message: "got job available" },
    { candidateId: 'test-004', message: "app cannot login" },
    { candidateId: 'test-005', message: "URGENT need help now!" }
  ];

  for (const testCase of testCases) {
    const result = await classifyForAIChat(testCase.candidateId, testCase.message);

    console.log(`📝 Message: "${testCase.message}"`);
    console.log(`🎯 Intent: ${result.intent} (${result.confidence.toFixed(2)} confidence)`);
    console.log(`📊 Strategy: ${result.responseStrategy}`);
    console.log(`⚡ Processing Time: ${result.processingTimeMs}ms`);
    console.log(`🔥 Escalation: ${result.escalationLevel}\n`);
  }
}

module.exports = {
  detectIntent,
  classifyForAIChat,
  getClassificationAnalytics,
  testIntegration
};