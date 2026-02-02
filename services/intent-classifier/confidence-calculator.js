/**
 * Confidence Calculator
 *
 * Calculates and adjusts confidence scores for intent classification.
 * Considers multiple factors including pattern strength, context, and historical accuracy.
 */

const contextAnalyzer = require('./context-analyzer');

/**
 * Adjust confidence based on context
 * @param {number} baseConfidence - Base confidence from pattern matching
 * @param {string} intent - Detected intent
 * @param {object} contextInfo - Context analysis result
 * @returns {number} Adjusted confidence score (0-1)
 */
function adjustForContext(baseConfidence, intent, contextInfo) {
  if (baseConfidence <= 0 || baseConfidence > 1) {
    return Math.max(0, Math.min(1, baseConfidence));
  }

  // Get context-based adjustment
  const contextAdjustment = contextAnalyzer.getConfidenceAdjustment(intent, contextInfo);

  // Apply urgency boost for high-urgency situations
  let urgencyBoost = 1.0;
  if (intent === 'urgent_escalation' && contextInfo.urgencyFactors.score > 0.5) {
    urgencyBoost = 1.1;
  }

  // Apply time-based adjustments
  let timeAdjustment = getTimeBasedAdjustment(intent, contextInfo.timeOfDay);

  // Apply user status adjustments
  let statusAdjustment = getUserStatusAdjustment(intent, contextInfo.userStatus, contextInfo.daysSincePending);

  // Apply conversation context adjustments
  let conversationAdjustment = getConversationAdjustment(intent, contextInfo);

  // Combine all adjustments
  let finalConfidence = baseConfidence *
                       contextAdjustment *
                       urgencyBoost *
                       timeAdjustment *
                       statusAdjustment *
                       conversationAdjustment;

  // Apply confidence floor and ceiling
  finalConfidence = applyConfidenceBounds(finalConfidence, intent);

  return Math.max(0, Math.min(1, finalConfidence));
}

/**
 * Get time-based confidence adjustments
 */
function getTimeBasedAdjustment(intent, timeOfDay) {
  const timeAdjustments = {
    'payment_inquiry': {
      'business_hours': 1.1,
      'evening': 1.05,
      'late_night': 0.9,
      'weekend': 0.95
    },
    'technical_issue': {
      'business_hours': 1.15,
      'evening': 1.05,
      'late_night': 1.1, // Tech issues can happen anytime
      'weekend': 1.0
    },
    'verification_question': {
      'business_hours': 1.1,
      'evening': 1.0,
      'late_night': 0.9,
      'weekend': 0.9
    },
    'urgent_escalation': {
      'late_night': 1.2, // High urgency if contacting late at night
      'early_morning': 1.15,
      'weekend': 1.1,
      'business_hours': 1.0
    },
    'job_search': {
      'business_hours': 1.0,
      'evening': 1.05,
      'late_night': 0.95,
      'weekend': 1.1 // People often search for jobs on weekends
    },
    'interview_scheduling': {
      'business_hours': 1.1,
      'evening': 1.0,
      'late_night': 0.9,
      'weekend': 0.95
    },
    'general_help': {
      'business_hours': 1.0,
      'evening': 1.0,
      'late_night': 1.0,
      'weekend': 1.0
    }
  };

  // Map detailed time periods to broader categories
  const businessHours = ['morning', 'afternoon', 'lunch_time'];
  const eveningHours = ['evening', 'night'];
  const lateHours = ['late_night', 'early_morning'];

  let timeCategory = 'business_hours';
  if (lateHours.includes(timeOfDay)) {
    timeCategory = 'late_night';
  } else if (eveningHours.includes(timeOfDay)) {
    timeCategory = 'evening';
  } else if (timeOfDay === 'weekend') {
    timeCategory = 'weekend';
  }

  const intentAdjustments = timeAdjustments[intent];
  if (intentAdjustments && intentAdjustments[timeCategory]) {
    return intentAdjustments[timeCategory];
  }

  return 1.0; // Default: no adjustment
}

/**
 * Get user status-based confidence adjustments
 */
function getUserStatusAdjustment(intent, userStatus, daysSincePending) {
  const statusAdjustments = {
    'pending': {
      'verification_question': 1.25,
      'interview_scheduling': 1.2,
      'job_search': 0.85, // Pending users can't accept jobs yet
      'payment_inquiry': 0.7, // Less likely to have payment issues
      'technical_issue': 1.0,
      'urgent_escalation': 1.05,
      'general_help': 1.1
    },
    'active': {
      'verification_question': 0.8, // Already verified
      'interview_scheduling': 0.7, // Already verified
      'job_search': 1.1,
      'payment_inquiry': 1.15,
      'technical_issue': 1.05,
      'urgent_escalation': 1.0,
      'general_help': 1.0
    },
    'suspended': {
      'verification_question': 1.3, // Likely asking about suspension
      'interview_scheduling': 1.2,
      'job_search': 0.6, // Can't work while suspended
      'payment_inquiry': 1.1,
      'technical_issue': 1.0,
      'urgent_escalation': 1.2,
      'general_help': 1.1
    },
    'unknown': {
      // Default adjustments for unknown status
      'verification_question': 1.0,
      'interview_scheduling': 1.0,
      'job_search': 1.0,
      'payment_inquiry': 1.0,
      'technical_issue': 1.0,
      'urgent_escalation': 1.0,
      'general_help': 1.0
    }
  };

  let adjustment = statusAdjustments[userStatus] ? statusAdjustments[userStatus][intent] : 1.0;

  // Additional adjustment for pending users based on time waiting
  if (userStatus === 'pending' && daysSincePending > 0) {
    if (intent === 'verification_question' || intent === 'urgent_escalation') {
      // Increase confidence based on days pending
      const timeBoost = Math.min(0.2, daysSincePending * 0.05);
      adjustment += timeBoost;
    }
  }

  return adjustment || 1.0;
}

/**
 * Get conversation context-based adjustments
 */
function getConversationAdjustment(intent, contextInfo) {
  let adjustment = 1.0;

  // First message adjustments
  if (contextInfo.isFirstMessage) {
    const firstMessageBoosts = {
      'general_help': 1.15,
      'verification_question': 1.1,
      'interview_scheduling': 1.1,
      'job_search': 1.05,
      'payment_inquiry': 0.9, // Less likely in first message
      'technical_issue': 0.95,
      'urgent_escalation': 0.9
    };

    if (firstMessageBoosts[intent]) {
      adjustment *= firstMessageBoosts[intent];
    }
  }

  // Channel-based adjustments
  if (contextInfo.channelUsed === 'telegram') {
    // People using Telegram might have more urgent needs
    const telegramBoosts = {
      'urgent_escalation': 1.1,
      'technical_issue': 1.05, // Maybe app not working
      'payment_inquiry': 1.05,
      'general_help': 1.0
    };

    if (telegramBoosts[intent]) {
      adjustment *= telegramBoosts[intent];
    }
  }

  // Conversation length adjustments
  if (contextInfo.conversationLength === 'long') {
    // In long conversations, urgent escalations become more likely
    const longConversationAdjustments = {
      'urgent_escalation': 1.15,
      'technical_issue': 1.1,
      'general_help': 0.95
    };

    if (longConversationAdjustments[intent]) {
      adjustment *= longConversationAdjustments[intent];
    }
  }

  return adjustment;
}

/**
 * Apply confidence bounds based on intent type
 */
function applyConfidenceBounds(confidence, intent) {
  // Define minimum and maximum confidence levels for each intent
  const confidenceBounds = {
    'urgent_escalation': { min: 0.15, max: 0.98 }, // High ceiling for safety
    'payment_inquiry': { min: 0.1, max: 0.95 },
    'verification_question': { min: 0.1, max: 0.95 },
    'technical_issue': { min: 0.1, max: 0.95 },
    'interview_scheduling': { min: 0.1, max: 0.9 },
    'job_search': { min: 0.05, max: 0.9 },
    'general_help': { min: 0.1, max: 0.85 } // Lower ceiling as it's fallback
  };

  const bounds = confidenceBounds[intent];
  if (bounds) {
    return Math.max(bounds.min, Math.min(bounds.max, confidence));
  }

  return Math.max(0.1, Math.min(0.95, confidence)); // Default bounds
}

/**
 * Calculate confidence penalty for ambiguous patterns
 * @param {array} competingIntents - Array of competing intent matches
 * @param {string} selectedIntent - The selected intent
 * @returns {number} Penalty factor (0.8-1.0)
 */
function calculateAmbiguityPenalty(competingIntents, selectedIntent) {
  if (!competingIntents || competingIntents.length <= 1) {
    return 1.0; // No penalty if no competition
  }

  // Sort by confidence to find competing intents
  const sortedIntents = competingIntents.sort((a, b) => b.confidence - a.confidence);
  const topIntent = sortedIntents[0];
  const secondIntent = sortedIntents[1];

  // If the top two intents are very close, apply penalty
  if (topIntent && secondIntent && selectedIntent === topIntent.intent) {
    const confidenceDiff = topIntent.confidence - secondIntent.confidence;

    if (confidenceDiff < 0.1) {
      return 0.9; // High ambiguity
    } else if (confidenceDiff < 0.2) {
      return 0.95; // Moderate ambiguity
    }
  }

  return 1.0; // No penalty
}

/**
 * Get confidence explanation for debugging
 * @param {number} baseConfidence - Original confidence
 * @param {number} finalConfidence - Final adjusted confidence
 * @param {object} contextInfo - Context information
 * @returns {object} Explanation of confidence adjustments
 */
function explainConfidence(baseConfidence, finalConfidence, contextInfo) {
  const explanation = {
    base: baseConfidence,
    final: finalConfidence,
    adjustment: finalConfidence / baseConfidence,
    factors: []
  };

  // Identify significant factors
  if (contextInfo.userStatus === 'pending') {
    explanation.factors.push('pending_user_status');
  }

  if (contextInfo.urgencyFactors.score > 0.3) {
    explanation.factors.push('urgency_indicators');
  }

  if (['late_night', 'early_morning'].includes(contextInfo.timeOfDay)) {
    explanation.factors.push('off_hours_timing');
  }

  if (contextInfo.isFirstMessage) {
    explanation.factors.push('first_message');
  }

  if (contextInfo.recentTechIssues > 0) {
    explanation.factors.push('technical_history');
  }

  return explanation;
}

module.exports = {
  adjustForContext,
  calculateAmbiguityPenalty,
  explainConfidence
};