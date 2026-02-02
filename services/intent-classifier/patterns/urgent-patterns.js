/**
 * Urgent Escalation Pattern Matcher
 *
 * Detects messages requiring immediate admin attention.
 * These patterns trigger highest priority classification.
 */

// High-priority keywords indicating urgency
const URGENT_KEYWORDS = [
  'urgent', 'emergency', 'asap', 'immediately', 'right now', 'crisis',
  'help me now', 'need help now', 'very urgent', 'super urgent',
  'cannot wait', 'deadline', 'due today', 'overdue'
];

// Singapore-specific urgent expressions
const SINGLISH_URGENT = [
  'help lah urgent', 'very jialat', 'die die must', 'confirm plus chop urgent',
  'siao liao', 'alamak urgent', 'paiseh very urgent', 'steady lah help',
  'cannot tahan already', 'machiam very urgent'
];

// Complaint and escalation indicators
const COMPLAINT_KEYWORDS = [
  'complain', 'complaint', 'angry', 'frustrated', 'unacceptable',
  'disgusted', 'terrible service', 'poor service', 'disappointed',
  'fed up', 'enough', 'manager', 'supervisor', 'escalate',
  'speak to manager', 'talk to boss', 'report this'
];

// Financial urgency (payment issues)
const FINANCIAL_URGENT = [
  'need money now', 'payment overdue', 'still no payment', 'where my money',
  'need pay urgent', 'money not in', 'payment late', 'no salary',
  'need cash now', 'bills due', 'rent due', 'urgent payment'
];

// Job-related urgency
const JOB_URGENT = [
  'start work today', 'job today', 'immediate start', 'urgent placement',
  'need job asap', 'can start now', 'available immediately',
  'urgent gig', 'last minute job'
];

/**
 * Match urgent escalation patterns
 * @param {string} message - Preprocessed message
 * @param {object} context - Context information
 * @returns {array} Array of urgent matches with confidence scores
 */
function match(message, context) {
  const matches = [];
  const lowerMessage = message.toLowerCase();

  // Check for explicit urgent keywords
  const urgentMatch = checkUrgentKeywords(lowerMessage);
  if (urgentMatch) {
    matches.push(urgentMatch);
  }

  // Check for Singlish urgent expressions
  const singlishMatch = checkSinglishUrgent(lowerMessage);
  if (singlishMatch) {
    matches.push(singlishMatch);
  }

  // Check for complaint indicators
  const complaintMatch = checkComplaintPatterns(lowerMessage);
  if (complaintMatch) {
    matches.push(complaintMatch);
  }

  // Check for financial urgency
  const financialMatch = checkFinancialUrgency(lowerMessage);
  if (financialMatch) {
    matches.push(financialMatch);
  }

  // Check for job urgency
  const jobMatch = checkJobUrgency(lowerMessage);
  if (jobMatch) {
    matches.push(jobMatch);
  }

  // Check for multiple exclamation marks (urgency indicator)
  if (message.includes('!!!') || (message.match(/!/g) || []).length >= 3) {
    matches.push({
      pattern: 'multiple_exclamation',
      confidence: 0.6,
      keywords: ['!!!'],
      reason: 'excessive_punctuation'
    });
  }

  // Check for ALL CAPS (urgency indicator)
  const capsWords = message.match(/[A-Z]{3,}/g);
  if (capsWords && capsWords.length >= 2) {
    matches.push({
      pattern: 'all_caps',
      confidence: 0.5,
      keywords: capsWords,
      reason: 'caps_urgency'
    });
  }

  // Context-based urgency boosts
  if (context.timeOfDay === 'late_night' || context.timeOfDay === 'weekend') {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.15);
      match.timeBoost = true;
    });
  }

  return matches;
}

/**
 * Check for explicit urgent keywords
 */
function checkUrgentKeywords(message) {
  for (const keyword of URGENT_KEYWORDS) {
    if (message.includes(keyword)) {
      return {
        pattern: 'urgent_keyword',
        confidence: 0.85,
        keywords: [keyword],
        reason: 'explicit_urgency'
      };
    }
  }
  return null;
}

/**
 * Check for Singlish urgent expressions
 */
function checkSinglishUrgent(message) {
  for (const expression of SINGLISH_URGENT) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_urgent',
        confidence: 0.8,
        keywords: [expression],
        reason: 'singlish_urgency'
      };
    }
  }
  return null;
}

/**
 * Check for complaint and escalation patterns
 */
function checkComplaintPatterns(message) {
  const foundKeywords = [];

  for (const keyword of COMPLAINT_KEYWORDS) {
    if (message.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return {
      pattern: 'complaint_escalation',
      confidence: 0.75 + (foundKeywords.length * 0.05), // Higher confidence with more indicators
      keywords: foundKeywords,
      reason: 'complaint_detected'
    };
  }

  return null;
}

/**
 * Check for financial urgency patterns
 */
function checkFinancialUrgency(message) {
  for (const pattern of FINANCIAL_URGENT) {
    if (message.includes(pattern)) {
      return {
        pattern: 'financial_urgent',
        confidence: 0.8,
        keywords: [pattern],
        reason: 'financial_urgency'
      };
    }
  }

  // Check for multiple payment-related urgent words
  const paymentWords = ['payment', 'money', 'salary', 'pay', 'cash'];
  const urgencyWords = ['urgent', 'need', 'now', 'asap', 'immediately'];

  const hasPayment = paymentWords.some(word => message.includes(word));
  const hasUrgency = urgencyWords.some(word => message.includes(word));

  if (hasPayment && hasUrgency) {
    return {
      pattern: 'payment_urgency_combo',
      confidence: 0.7,
      keywords: [...paymentWords.filter(w => message.includes(w)), ...urgencyWords.filter(w => message.includes(w))],
      reason: 'payment_urgency_combination'
    };
  }

  return null;
}

/**
 * Check for job-related urgency
 */
function checkJobUrgency(message) {
  for (const pattern of JOB_URGENT) {
    if (message.includes(pattern)) {
      return {
        pattern: 'job_urgent',
        confidence: 0.7,
        keywords: [pattern],
        reason: 'job_urgency'
      };
    }
  }

  // Check for immediate availability expressions
  const jobWords = ['job', 'work', 'shift', 'gig'];
  const immediateWords = ['now', 'today', 'immediate', 'asap', 'urgent'];

  const hasJob = jobWords.some(word => message.includes(word));
  const hasImmediate = immediateWords.some(word => message.includes(word));

  if (hasJob && hasImmediate) {
    return {
      pattern: 'immediate_job_need',
      confidence: 0.65,
      keywords: [...jobWords.filter(w => message.includes(w)), ...immediateWords.filter(w => message.includes(w))],
      reason: 'immediate_job_availability'
    };
  }

  return null;
}

/**
 * Get total number of patterns for performance reporting
 */
function getPatternCount() {
  return URGENT_KEYWORDS.length +
         SINGLISH_URGENT.length +
         COMPLAINT_KEYWORDS.length +
         FINANCIAL_URGENT.length +
         JOB_URGENT.length;
}

module.exports = {
  match,
  getPatternCount
};