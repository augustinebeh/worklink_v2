/**
 * Job Search Pattern Matcher
 *
 * Detects messages related to job searching, job applications, and work opportunities.
 * Covers Singapore's gig economy and staffing industry context.
 */

// Core job search keywords
const JOB_KEYWORDS = [
  'job', 'work', 'jobs', 'shift', 'gig', 'position', 'role', 'employment',
  'opportunity', 'opening', 'vacancy', 'placement', 'assignment',
  'temporary work', 'part time', 'full time', 'contract', 'freelance'
];

// Job search inquiries
const JOB_SEARCH_PHRASES = [
  'looking for job', 'find job', 'any jobs', 'jobs available', 'job openings',
  'work available', 'opportunities available', 'hiring', 'need work',
  'want to work', 'looking for work', 'search jobs', 'browse jobs',
  'job listings', 'available positions'
];

// Singapore-specific job expressions
const SINGLISH_JOB_SEARCH = [
  'got job or not', 'any work ah', 'can work anot', 'got lobang or not',
  'job got ah', 'work got', 'shift available', 'can start work',
  'want job lah', 'need work sia', 'got gig or not', 'any shift',
  'weekend job got', 'weekday work', 'evening shift', 'morning job'
];

// Job application patterns
const APPLICATION_PATTERNS = [
  'apply job', 'apply for', 'application', 'submit application', 'interested in',
  'want to apply', 'how to apply', 'application process', 'apply now',
  'send application', 'job application', 'application status'
];

// Specific job types (Singapore context)
const JOB_TYPES = [
  'f&b', 'food and beverage', 'restaurant', 'cafe', 'kitchen', 'service crew',
  'event staff', 'event crew', 'promoter', 'usher', 'crowd control',
  'retail', 'sales', 'cashier', 'store assistant', 'customer service',
  'admin', 'administrative', 'data entry', 'office', 'clerical',
  'warehouse', 'packing', 'logistics', 'delivery', 'driver',
  'cleaning', 'housekeeping', 'maintenance', 'security', 'guard'
];

// Location-based job searches (Singapore areas)
const LOCATION_KEYWORDS = [
  'cbd', 'orchard', 'marina bay', 'jurong', 'tampines', 'woodlands',
  'yishun', 'bishan', 'toa payoh', 'bedok', 'pasir ris', 'clementi',
  'bukit timah', 'newton', 'novena', 'dhoby ghaut', 'city hall',
  'raffles place', 'tanjong pagar', 'chinatown', 'clarke quay',
  'sentosa', 'changi', 'airport', 'downtown', 'central', 'east', 'west', 'north'
];

// Time-based job preferences
const TIME_PREFERENCES = [
  'weekend', 'weekday', 'evening', 'night shift', 'morning', 'afternoon',
  'flexible timing', 'part time', 'full time', 'adhoc', 'one off',
  'daily', 'weekly', 'monthly', 'short term', 'long term'
];

/**
 * Match job search patterns
 * @param {string} message - Preprocessed message
 * @param {object} context - Context information
 * @returns {array} Array of job search matches with confidence scores
 */
function match(message, context) {
  const matches = [];
  const lowerMessage = message.toLowerCase();

  // Check basic job keywords
  const basicMatch = checkJobKeywords(lowerMessage);
  if (basicMatch) {
    matches.push(basicMatch);
  }

  // Check job search phrases
  const searchMatch = checkJobSearchPhrases(lowerMessage);
  if (searchMatch) {
    matches.push(searchMatch);
  }

  // Check Singlish job expressions
  const singlishMatch = checkSinglishJobSearch(lowerMessage);
  if (singlishMatch) {
    matches.push(singlishMatch);
  }

  // Check application patterns
  const applicationMatch = checkApplicationPatterns(lowerMessage);
  if (applicationMatch) {
    matches.push(applicationMatch);
  }

  // Check specific job types
  const typeMatch = checkJobTypes(lowerMessage);
  if (typeMatch) {
    matches.push(typeMatch);
  }

  // Check location-based searches
  const locationMatch = checkLocationKeywords(lowerMessage);
  if (locationMatch) {
    matches.push(locationMatch);
  }

  // Check time preferences
  const timeMatch = checkTimePreferences(lowerMessage);
  if (timeMatch) {
    matches.push(timeMatch);
  }

  // Context-based adjustments
  if (context.userStatus === 'active') {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.1);
      match.contextBoost = 'active_worker';
    });
  }

  // Adjust for pending users (lower confidence for job search)
  if (context.userStatus === 'pending') {
    matches.forEach(match => {
      match.confidence = match.confidence * 0.9;
      match.contextAdjustment = 'pending_status';
    });
  }

  return matches;
}

/**
 * Check basic job keywords
 */
function checkJobKeywords(message) {
  const foundKeywords = [];

  for (const keyword of JOB_KEYWORDS) {
    if (message.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return {
      pattern: 'job_keywords',
      confidence: 0.6 + (foundKeywords.length * 0.05),
      keywords: foundKeywords,
      subtype: 'general_job_interest'
    };
  }

  return null;
}

/**
 * Check job search phrases
 */
function checkJobSearchPhrases(message) {
  for (const phrase of JOB_SEARCH_PHRASES) {
    if (message.includes(phrase)) {
      return {
        pattern: 'job_search_phrase',
        confidence: 0.85,
        keywords: [phrase],
        subtype: 'active_job_search'
      };
    }
  }

  // Check for combinations of looking/finding + work/job
  const searchWords = ['looking', 'find', 'search', 'browse', 'need', 'want'];
  const jobWords = ['job', 'work', 'employment', 'opportunity'];

  const hasSearch = searchWords.some(word => message.includes(word));
  const hasJob = jobWords.some(word => message.includes(word));

  if (hasSearch && hasJob) {
    return {
      pattern: 'search_job_combo',
      confidence: 0.8,
      keywords: [...searchWords.filter(w => message.includes(w)), ...jobWords.filter(w => message.includes(w))],
      subtype: 'job_search_intent'
    };
  }

  return null;
}

/**
 * Check Singlish job search expressions
 */
function checkSinglishJobSearch(message) {
  for (const expression of SINGLISH_JOB_SEARCH) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_job_search',
        confidence: 0.85,
        keywords: [expression],
        subtype: 'local_job_inquiry'
      };
    }
  }
  return null;
}

/**
 * Check application patterns
 */
function checkApplicationPatterns(message) {
  const foundPatterns = [];

  for (const pattern of APPLICATION_PATTERNS) {
    if (message.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  if (foundPatterns.length > 0) {
    return {
      pattern: 'job_application',
      confidence: 0.8,
      keywords: foundPatterns,
      subtype: 'application_intent'
    };
  }

  return null;
}

/**
 * Check specific job types
 */
function checkJobTypes(message) {
  const foundTypes = [];

  for (const type of JOB_TYPES) {
    if (message.includes(type)) {
      foundTypes.push(type);
    }
  }

  if (foundTypes.length > 0) {
    return {
      pattern: 'specific_job_type',
      confidence: 0.75,
      keywords: foundTypes,
      subtype: 'job_type_preference'
    };
  }

  return null;
}

/**
 * Check location keywords
 */
function checkLocationKeywords(message) {
  const foundLocations = [];

  for (const location of LOCATION_KEYWORDS) {
    if (message.includes(location)) {
      foundLocations.push(location);
    }
  }

  if (foundLocations.length > 0) {
    // Only classify as job search if there are other job indicators
    const hasJobContext = JOB_KEYWORDS.some(keyword => message.includes(keyword));

    if (hasJobContext) {
      return {
        pattern: 'location_based_job_search',
        confidence: 0.8,
        keywords: foundLocations,
        subtype: 'location_specific_search'
      };
    }

    // Lower confidence if no job context
    return {
      pattern: 'location_mention',
      confidence: 0.4,
      keywords: foundLocations,
      subtype: 'general_location'
    };
  }

  return null;
}

/**
 * Check time preferences
 */
function checkTimePreferences(message) {
  const foundPreferences = [];

  for (const preference of TIME_PREFERENCES) {
    if (message.includes(preference)) {
      foundPreferences.push(preference);
    }
  }

  if (foundPreferences.length > 0) {
    // Check if time preference is mentioned with job context
    const hasJobContext = JOB_KEYWORDS.some(keyword => message.includes(keyword));

    if (hasJobContext) {
      return {
        pattern: 'time_based_job_search',
        confidence: 0.7,
        keywords: foundPreferences,
        subtype: 'timing_preference'
      };
    }

    // Lower confidence if no job context
    return {
      pattern: 'time_preference',
      confidence: 0.3,
      keywords: foundPreferences,
      subtype: 'general_timing'
    };
  }

  return null;
}

/**
 * Get total number of patterns
 */
function getPatternCount() {
  return JOB_KEYWORDS.length +
         JOB_SEARCH_PHRASES.length +
         SINGLISH_JOB_SEARCH.length +
         APPLICATION_PATTERNS.length +
         JOB_TYPES.length +
         LOCATION_KEYWORDS.length +
         TIME_PREFERENCES.length;
}

module.exports = {
  match,
  getPatternCount
};