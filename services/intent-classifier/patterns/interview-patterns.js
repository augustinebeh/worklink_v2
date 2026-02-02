/**
 * Interview Scheduling Pattern Matcher
 *
 * Detects messages related to interview scheduling, especially for pending candidates.
 * Integrates with the existing interview scheduling system.
 */

// Interview scheduling keywords
const INTERVIEW_KEYWORDS = [
  'interview', 'appointment', 'meeting', 'schedule', 'booking', 'session',
  'call', 'video call', 'phone call', 'zoom', 'teams', 'consultation'
];

// Scheduling requests
const SCHEDULING_REQUESTS = [
  'schedule interview', 'book appointment', 'arrange meeting', 'set up interview',
  'want to schedule', 'can schedule', 'need appointment', 'book session',
  'arrange call', 'set meeting', 'interview appointment', 'consultation booking'
];

// Singapore-specific scheduling expressions
const SINGLISH_SCHEDULING = [
  'can book interview anot', 'want to meet lah', 'when can meet ah',
  'available for interview', 'free to meet', 'can arrange or not',
  'book slot', 'chope timing', 'can meet when', 'interview slot got',
  'appointment got or not', 'when free ah'
];

// Time availability expressions
const AVAILABILITY_EXPRESSIONS = [
  'available', 'free', 'can meet', 'timing', 'schedule', 'when',
  'morning', 'afternoon', 'evening', 'weekday', 'weekend', 'today',
  'tomorrow', 'this week', 'next week', 'flexible timing'
];

// Interview types and purposes
const INTERVIEW_TYPES = [
  'verification interview', 'screening interview', 'phone screening',
  'video interview', 'in person interview', 'face to face',
  'background check interview', 'onboarding interview', 'orientation'
];

// Urgency indicators for interviews
const URGENT_SCHEDULING = [
  'asap interview', 'urgent interview', 'immediate interview', 'today',
  'as soon as possible', 'earliest slot', 'fast track', 'priority booking',
  'emergency interview', 'urgent verification'
];

/**
 * Match interview scheduling patterns
 * @param {string} message - Preprocessed message
 * @param {object} context - Context information
 * @returns {array} Array of interview matches with confidence scores
 */
function match(message, context) {
  const matches = [];
  const lowerMessage = message.toLowerCase();

  // Check basic interview keywords
  const basicMatch = checkInterviewKeywords(lowerMessage);
  if (basicMatch) {
    matches.push(basicMatch);
  }

  // Check scheduling requests
  const schedulingMatch = checkSchedulingRequests(lowerMessage);
  if (schedulingMatch) {
    matches.push(schedulingMatch);
  }

  // Check Singlish scheduling expressions
  const singlishMatch = checkSinglishScheduling(lowerMessage);
  if (singlishMatch) {
    matches.push(singlishMatch);
  }

  // Check availability expressions
  const availabilityMatch = checkAvailabilityExpressions(lowerMessage);
  if (availabilityMatch) {
    matches.push(availabilityMatch);
  }

  // Check interview types
  const typeMatch = checkInterviewTypes(lowerMessage);
  if (typeMatch) {
    matches.push(typeMatch);
  }

  // Check urgent scheduling
  const urgentMatch = checkUrgentScheduling(lowerMessage);
  if (urgentMatch) {
    matches.push(urgentMatch);
  }

  // Context-based adjustments
  if (context.userStatus === 'pending') {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.25);
      match.contextBoost = 'pending_candidate';
    });
  }

  // Time-based boosts (if user has been pending for a while)
  if (context.daysSincePending > 2) {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.15);
      match.timeBoost = 'extended_pending';
    });
  }

  return matches;
}

/**
 * Check basic interview keywords
 */
function checkInterviewKeywords(message) {
  const foundKeywords = [];

  for (const keyword of INTERVIEW_KEYWORDS) {
    if (message.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return {
      pattern: 'interview_keywords',
      confidence: 0.6 + (foundKeywords.length * 0.05),
      keywords: foundKeywords,
      subtype: 'general_interview'
    };
  }

  return null;
}

/**
 * Check scheduling requests
 */
function checkSchedulingRequests(message) {
  for (const request of SCHEDULING_REQUESTS) {
    if (message.includes(request)) {
      return {
        pattern: 'scheduling_request',
        confidence: 0.9,
        keywords: [request],
        subtype: 'schedule_request'
      };
    }
  }

  // Check for schedule + interview combinations
  const scheduleWords = ['schedule', 'book', 'arrange', 'set up', 'organize'];
  const interviewWords = ['interview', 'meeting', 'appointment', 'call', 'session'];

  const hasSchedule = scheduleWords.some(word => message.includes(word));
  const hasInterview = interviewWords.some(word => message.includes(word));

  if (hasSchedule && hasInterview) {
    return {
      pattern: 'schedule_interview_combo',
      confidence: 0.85,
      keywords: [...scheduleWords.filter(w => message.includes(w)), ...interviewWords.filter(w => message.includes(w))],
      subtype: 'interview_booking'
    };
  }

  return null;
}

/**
 * Check Singlish scheduling expressions
 */
function checkSinglishScheduling(message) {
  for (const expression of SINGLISH_SCHEDULING) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_scheduling',
        confidence: 0.85,
        keywords: [expression],
        subtype: 'local_scheduling'
    };
    }
  }
  return null;
}

/**
 * Check availability expressions
 */
function checkAvailabilityExpressions(message) {
  const foundExpressions = [];

  for (const expression of AVAILABILITY_EXPRESSIONS) {
    if (message.includes(expression)) {
      foundExpressions.push(expression);
    }
  }

  if (foundExpressions.length > 0) {
    // Check if availability is mentioned with interview context
    const hasInterviewContext = INTERVIEW_KEYWORDS.some(keyword => message.includes(keyword));

    if (hasInterviewContext) {
      return {
        pattern: 'availability_for_interview',
        confidence: 0.8,
        keywords: foundExpressions,
        subtype: 'availability_inquiry'
      };
    }

    // Lower confidence if no clear interview context
    return {
      pattern: 'availability_general',
      confidence: 0.5,
      keywords: foundExpressions,
      subtype: 'general_availability'
    };
  }

  return null;
}

/**
 * Check interview types
 */
function checkInterviewTypes(message) {
  const foundTypes = [];

  for (const type of INTERVIEW_TYPES) {
    if (message.includes(type)) {
      foundTypes.push(type);
    }
  }

  if (foundTypes.length > 0) {
    return {
      pattern: 'interview_type_specified',
      confidence: 0.85,
      keywords: foundTypes,
      subtype: 'specific_interview_type'
    };
  }

  return null;
}

/**
 * Check urgent scheduling
 */
function checkUrgentScheduling(message) {
  const foundUrgent = [];

  for (const urgent of URGENT_SCHEDULING) {
    if (message.includes(urgent)) {
      foundUrgent.push(urgent);
    }
  }

  if (foundUrgent.length > 0) {
    return {
      pattern: 'urgent_interview_scheduling',
      confidence: 0.9,
      keywords: foundUrgent,
      subtype: 'urgent_scheduling'
    };
  }

  // Check for time-sensitive combinations
  const urgentWords = ['urgent', 'asap', 'immediate', 'today', 'now'];
  const interviewWords = ['interview', 'appointment', 'meeting'];

  const hasUrgent = urgentWords.some(word => message.includes(word));
  const hasInterview = interviewWords.some(word => message.includes(word));

  if (hasUrgent && hasInterview) {
    return {
      pattern: 'urgent_interview_combo',
      confidence: 0.85,
      keywords: [...urgentWords.filter(w => message.includes(w)), ...interviewWords.filter(w => message.includes(w))],
      subtype: 'time_sensitive_scheduling'
    };
  }

  return null;
}

/**
 * Get total number of patterns
 */
function getPatternCount() {
  return INTERVIEW_KEYWORDS.length +
         SCHEDULING_REQUESTS.length +
         SINGLISH_SCHEDULING.length +
         AVAILABILITY_EXPRESSIONS.length +
         INTERVIEW_TYPES.length +
         URGENT_SCHEDULING.length;
}

module.exports = {
  match,
  getPatternCount
};