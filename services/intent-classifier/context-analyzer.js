/**
 * Context Analyzer
 *
 * Analyzes user context and situational factors to improve intent classification.
 * Considers user status, timing, history, and other contextual signals.
 */

/**
 * Analyze context information for intent classification
 * @param {object} context - Raw context object
 * @returns {object} Structured context analysis
 */
function analyzeContext(context = {}) {
  const analysis = {
    userStatus: extractUserStatus(context),
    timeOfDay: analyzeTimeOfDay(context),
    daysSincePending: calculateDaysSincePending(context),
    hasCompletedJobs: checkJobHistory(context),
    recentTechIssues: countRecentTechIssues(context),
    isFirstMessage: checkFirstMessage(context),
    channelUsed: extractChannel(context),
    deviceType: analyzeDeviceType(context),
    conversationLength: analyzeConversationLength(context),
    lastMessageType: analyzeLastMessage(context)
  };

  // Add derived insights
  analysis.urgencyFactors = calculateUrgencyFactors(analysis);
  analysis.contextQuality = assessContextQuality(analysis);

  return analysis;
}

/**
 * Extract user status from context
 */
function extractUserStatus(context) {
  if (context.candidate) {
    return context.candidate.status || 'unknown';
  }

  if (context.userStatus) {
    return context.userStatus;
  }

  return 'unknown';
}

/**
 * Analyze time of day context
 */
function analyzeTimeOfDay(context) {
  const now = new Date();
  const hour = now.getHours();

  // Override with provided timestamp if available
  if (context.timestamp) {
    const contextTime = new Date(context.timestamp);
    const contextHour = contextTime.getHours();
    return categorizeTimeOfDay(contextHour);
  }

  return categorizeTimeOfDay(hour);
}

/**
 * Categorize time of day
 */
function categorizeTimeOfDay(hour) {
  if (hour >= 6 && hour < 9) {
    return 'early_morning';
  } else if (hour >= 9 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 14) {
    return 'lunch_time';
  } else if (hour >= 14 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 20) {
    return 'evening';
  } else if (hour >= 20 && hour < 23) {
    return 'night';
  } else {
    return 'late_night';
  }
}

/**
 * Calculate days since user became pending
 */
function calculateDaysSincePending(context) {
  if (!context.candidate || context.candidate.status !== 'pending') {
    return 0;
  }

  const createdAt = context.candidate.created_at;
  if (!createdAt) {
    return 0;
  }

  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Check if user has completed jobs
 */
function checkJobHistory(context) {
  if (context.candidate) {
    const totalJobs = context.candidate.total_jobs_completed || 0;
    return totalJobs > 0;
  }

  return false;
}

/**
 * Count recent technical issues (last 7 days)
 */
function countRecentTechIssues(context) {
  if (context.recentTechIssues) {
    return context.recentTechIssues;
  }

  // Could integrate with database to check message history
  // For now, return 0 as default
  return 0;
}

/**
 * Check if this is user's first message
 */
function checkFirstMessage(context) {
  if (context.isFirstMessage !== undefined) {
    return context.isFirstMessage;
  }

  if (context.messageCount !== undefined) {
    return context.messageCount <= 1;
  }

  return false;
}

/**
 * Extract communication channel
 */
function extractChannel(context) {
  if (context.channel) {
    return context.channel;
  }

  return 'app'; // Default to app
}

/**
 * Analyze device type from context
 */
function analyzeDeviceType(context) {
  if (context.deviceType) {
    return context.deviceType;
  }

  if (context.userAgent) {
    const ua = context.userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  return 'unknown';
}

/**
 * Analyze conversation length
 */
function analyzeConversationLength(context) {
  if (context.messageCount !== undefined) {
    if (context.messageCount <= 2) {
      return 'new';
    } else if (context.messageCount <= 10) {
      return 'ongoing';
    } else {
      return 'long';
    }
  }

  return 'unknown';
}

/**
 * Analyze last message type
 */
function analyzeLastMessage(context) {
  if (context.lastMessageType) {
    return context.lastMessageType;
  }

  return 'unknown';
}

/**
 * Calculate urgency factors
 */
function calculateUrgencyFactors(analysis) {
  const factors = [];
  let urgencyScore = 0;

  // Time-based urgency
  if (analysis.timeOfDay === 'late_night' || analysis.timeOfDay === 'early_morning') {
    factors.push('off_hours');
    urgencyScore += 0.2;
  }

  // Status-based urgency
  if (analysis.userStatus === 'pending' && analysis.daysSincePending > 3) {
    factors.push('extended_pending');
    urgencyScore += 0.3;
  }

  // Technical issue history
  if (analysis.recentTechIssues > 0) {
    factors.push('repeated_issues');
    urgencyScore += 0.2;
  }

  // Channel-based urgency (Telegram might indicate more urgent need)
  if (analysis.channelUsed === 'telegram') {
    factors.push('external_channel');
    urgencyScore += 0.1;
  }

  return {
    factors,
    score: Math.min(1.0, urgencyScore)
  };
}

/**
 * Assess quality of context information
 */
function assessContextQuality(analysis) {
  let qualityScore = 0;
  const availableFields = [];

  // Check what context we have
  if (analysis.userStatus !== 'unknown') {
    qualityScore += 0.3;
    availableFields.push('user_status');
  }

  if (analysis.timeOfDay !== 'unknown') {
    qualityScore += 0.2;
    availableFields.push('time_context');
  }

  if (analysis.hasCompletedJobs !== undefined) {
    qualityScore += 0.2;
    availableFields.push('job_history');
  }

  if (analysis.conversationLength !== 'unknown') {
    qualityScore += 0.15;
    availableFields.push('conversation_context');
  }

  if (analysis.deviceType !== 'unknown') {
    qualityScore += 0.1;
    availableFields.push('device_info');
  }

  if (analysis.channelUsed) {
    qualityScore += 0.05;
    availableFields.push('channel_info');
  }

  return {
    score: qualityScore,
    level: categorizeQualityLevel(qualityScore),
    availableFields
  };
}

/**
 * Categorize context quality level
 */
function categorizeQualityLevel(score) {
  if (score >= 0.8) {
    return 'excellent';
  } else if (score >= 0.6) {
    return 'good';
  } else if (score >= 0.4) {
    return 'moderate';
  } else if (score >= 0.2) {
    return 'limited';
  } else {
    return 'minimal';
  }
}

/**
 * Get context-based confidence adjustments
 * @param {string} intent - The detected intent
 * @param {object} analysis - Context analysis result
 * @returns {number} Confidence adjustment factor (0.8 - 1.2)
 */
function getConfidenceAdjustment(intent, analysis) {
  let adjustment = 1.0;

  // Status-based adjustments
  if (intent === 'verification_question' && analysis.userStatus === 'pending') {
    adjustment *= 1.2; // High confidence for pending users asking about verification
  }

  if (intent === 'job_search' && analysis.userStatus === 'pending') {
    adjustment *= 0.9; // Lower confidence - pending users can't accept jobs yet
  }

  if (intent === 'payment_inquiry' && !analysis.hasCompletedJobs) {
    adjustment *= 0.8; // Lower confidence - no jobs completed yet
  }

  // Time-based adjustments
  if (intent === 'urgent_escalation' && analysis.timeOfDay === 'late_night') {
    adjustment *= 1.1; // Slight boost for after-hours escalations
  }

  // Technical issues during business hours get higher confidence
  if (intent === 'technical_issue' &&
      ['morning', 'afternoon', 'lunch_time'].includes(analysis.timeOfDay)) {
    adjustment *= 1.1;
  }

  // Context quality adjustment
  if (analysis.contextQuality.level === 'excellent') {
    adjustment *= 1.05; // Slight boost for high-quality context
  } else if (analysis.contextQuality.level === 'minimal') {
    adjustment *= 0.95; // Slight penalty for poor context
  }

  // Ensure adjustment stays within reasonable bounds
  return Math.max(0.8, Math.min(1.2, adjustment));
}

module.exports = {
  analyzeContext,
  getConfidenceAdjustment,
  categorizeTimeOfDay
};