/**
 * Verification Question Pattern Matcher
 *
 * Detects messages related to account verification, approval status, and requirements.
 * Especially important for pending candidates.
 */

// Account status inquiries
const STATUS_KEYWORDS = [
  'status', 'approve', 'approved', 'approval', 'verify', 'verified', 'verification',
  'pending', 'review', 'reviewed', 'accept', 'accepted', 'activate', 'activated',
  'enable', 'enabled', 'confirm', 'confirmed', 'validation', 'validated'
];

// Account verification questions
const VERIFICATION_QUESTIONS = [
  'account approved', 'account status', 'verification status', 'approval status',
  'when will i be approved', 'when approve', 'how long approval', 'still pending',
  'account pending', 'waiting for approval', 'under review', 'being reviewed',
  'account not approved', 'not verified yet', 'verification pending',
  'still waiting', 'how long wait', 'when can start', 'ready to work'
];

// Singapore-specific verification expressions
const SINGLISH_VERIFICATION = [
  'account approve already anot', 'when can start work', 'approve liao or not',
  'how long must wait ah', 'still checking ah', 'can work already',
  'verification done or not', 'account ok already', 'pass verification anot',
  'admin check liao or not', 'status how ah', 'can start apply jobs'
];

// Requirements and documentation questions
const REQUIREMENTS_PATTERNS = [
  'what documents need', 'what requirements', 'documents required',
  'verification requirements', 'what to submit', 'need to provide',
  'missing documents', 'additional documents', 'complete verification',
  'documents uploaded', 'submitted documents', 'documents pending'
];

// Profile completion related
const PROFILE_PATTERNS = [
  'complete profile', 'profile complete', 'finish profile', 'profile done',
  'update profile', 'profile status', 'missing information', 'incomplete profile',
  'profile requirements', 'fill profile', 'profile details'
];

// Background check and employment verification
const BACKGROUND_PATTERNS = [
  'background check', 'employment verification', 'reference check',
  'work history', 'previous employer', 'employment record',
  'criminal check', 'police clearance', 'security clearance'
];

/**
 * Match verification question patterns
 * @param {string} message - Preprocessed message
 * @param {object} context - Context information
 * @returns {array} Array of verification matches with confidence scores
 */
function match(message, context) {
  const matches = [];
  const lowerMessage = message.toLowerCase();

  // Check basic status keywords
  const statusMatch = checkStatusKeywords(lowerMessage);
  if (statusMatch) {
    matches.push(statusMatch);
  }

  // Check specific verification questions
  const verificationMatch = checkVerificationQuestions(lowerMessage);
  if (verificationMatch) {
    matches.push(verificationMatch);
  }

  // Check Singlish verification expressions
  const singlishMatch = checkSinglishVerification(lowerMessage);
  if (singlishMatch) {
    matches.push(singlishMatch);
  }

  // Check requirements patterns
  const requirementsMatch = checkRequirementsPatterns(lowerMessage);
  if (requirementsMatch) {
    matches.push(requirementsMatch);
  }

  // Check profile patterns
  const profileMatch = checkProfilePatterns(lowerMessage);
  if (profileMatch) {
    matches.push(profileMatch);
  }

  // Check background check patterns
  const backgroundMatch = checkBackgroundPatterns(lowerMessage);
  if (backgroundMatch) {
    matches.push(backgroundMatch);
  }

  // Context-based confidence adjustments
  if (context.userStatus === 'pending') {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.2);
      match.contextBoost = 'pending_user';
    });
  }

  // Time-based boosts (if user has been pending for a while)
  if (context.daysSincePending > 3) {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.1);
      match.timeBoost = 'extended_pending';
    });
  }

  return matches;
}

/**
 * Check basic status keywords
 */
function checkStatusKeywords(message) {
  const foundKeywords = [];

  for (const keyword of STATUS_KEYWORDS) {
    if (message.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return {
      pattern: 'status_keywords',
      confidence: 0.6 + (foundKeywords.length * 0.05),
      keywords: foundKeywords,
      subtype: 'general_status'
    };
  }

  return null;
}

/**
 * Check specific verification questions
 */
function checkVerificationQuestions(message) {
  for (const question of VERIFICATION_QUESTIONS) {
    if (message.includes(question)) {
      return {
        pattern: 'verification_question',
        confidence: 0.85,
        keywords: [question],
        subtype: 'account_status'
      };
    }
  }

  // Check for account + status combinations
  const accountWords = ['account', 'profile', 'application'];
  const statusWords = ['status', 'approved', 'pending', 'ready'];

  const hasAccount = accountWords.some(word => message.includes(word));
  const hasStatus = statusWords.some(word => message.includes(word));

  if (hasAccount && hasStatus) {
    return {
      pattern: 'account_status_combo',
      confidence: 0.8,
      keywords: [...accountWords.filter(w => message.includes(w)), ...statusWords.filter(w => message.includes(w))],
      subtype: 'status_inquiry'
    };
  }

  return null;
}

/**
 * Check Singlish verification expressions
 */
function checkSinglishVerification(message) {
  for (const expression of SINGLISH_VERIFICATION) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_verification',
        confidence: 0.85,
        keywords: [expression],
        subtype: 'local_status_inquiry'
      };
    }
  }
  return null;
}

/**
 * Check requirements patterns
 */
function checkRequirementsPatterns(message) {
  const foundPatterns = [];

  for (const pattern of REQUIREMENTS_PATTERNS) {
    if (message.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  if (foundPatterns.length > 0) {
    return {
      pattern: 'requirements_inquiry',
      confidence: 0.8,
      keywords: foundPatterns,
      subtype: 'document_requirements'
    };
  }

  // Check for document + need/want combinations
  const docWords = ['document', 'documents', 'papers', 'forms'];
  const needWords = ['need', 'required', 'must', 'have to', 'submit'];

  const hasDoc = docWords.some(word => message.includes(word));
  const hasNeed = needWords.some(word => message.includes(word));

  if (hasDoc && hasNeed) {
    return {
      pattern: 'document_need_combo',
      confidence: 0.75,
      keywords: [...docWords.filter(w => message.includes(w)), ...needWords.filter(w => message.includes(w))],
      subtype: 'documentation'
    };
  }

  return null;
}

/**
 * Check profile patterns
 */
function checkProfilePatterns(message) {
  const foundPatterns = [];

  for (const pattern of PROFILE_PATTERNS) {
    if (message.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  if (foundPatterns.length > 0) {
    return {
      pattern: 'profile_inquiry',
      confidence: 0.75,
      keywords: foundPatterns,
      subtype: 'profile_completion'
    };
  }

  return null;
}

/**
 * Check background check patterns
 */
function checkBackgroundPatterns(message) {
  const foundPatterns = [];

  for (const pattern of BACKGROUND_PATTERNS) {
    if (message.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  if (foundPatterns.length > 0) {
    return {
      pattern: 'background_check',
      confidence: 0.8,
      keywords: foundPatterns,
      subtype: 'background_verification'
    };
  }

  return null;
}

/**
 * Get total number of patterns
 */
function getPatternCount() {
  return STATUS_KEYWORDS.length +
         VERIFICATION_QUESTIONS.length +
         SINGLISH_VERIFICATION.length +
         REQUIREMENTS_PATTERNS.length +
         PROFILE_PATTERNS.length +
         BACKGROUND_PATTERNS.length;
}

module.exports = {
  match,
  getPatternCount
};