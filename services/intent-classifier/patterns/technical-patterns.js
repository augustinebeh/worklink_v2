/**
 * Technical Issue Pattern Matcher
 *
 * Detects messages related to app problems, login issues, and technical difficulties.
 * Focuses on common PWA and mobile app issues in Singapore context.
 */

// Core technical issue keywords
const TECHNICAL_KEYWORDS = [
  'error', 'bug', 'issue', 'problem', 'broken', 'not working', 'failed',
  'crash', 'freeze', 'stuck', 'hang', 'slow', 'loading', 'timeout'
];

// Login and authentication issues
const LOGIN_ISSUES = [
  'cannot login', 'login failed', 'login error', 'forgot password',
  'password not working', 'account locked', 'cannot access', 'locked out',
  'authentication failed', 'invalid credentials', 'login problem',
  'cannot sign in', 'sign in failed', 'access denied'
];

// Singapore-specific login expressions
const SINGLISH_LOGIN = [
  'cannot masuk', 'login cannot', 'password wrong lah', 'cannot enter app',
  'app cannot open', 'login jialat', 'masuk cannot', 'password salah',
  'cannot log masuk', 'app block me', 'login sian'
];

// App functionality issues
const APP_ISSUES = [
  'app not working', 'app broken', 'app crash', 'app freeze', 'app slow',
  'app not loading', 'white screen', 'blank screen', 'app stuck',
  'cannot open app', 'app not responding', 'app error', 'app problem'
];

// Feature-specific issues
const FEATURE_ISSUES = [
  'notification not working', 'push notification', 'alerts not coming',
  'job alerts', 'message not received', 'chat not working', 'payment not showing',
  'profile not saving', 'cannot update profile', 'upload failed',
  'camera not working', 'photo upload', 'document upload', 'file upload'
];

// Connection and network issues
const CONNECTION_ISSUES = [
  'no internet', 'network error', 'connection failed', 'offline mode',
  'sync failed', 'data not syncing', 'cannot connect', 'server error',
  'network timeout', 'connection lost', 'poor connection', 'wifi issue'
];

// Browser and device issues
const DEVICE_ISSUES = [
  'browser issue', 'chrome not working', 'safari problem', 'mobile issue',
  'phone issue', 'tablet issue', 'android issue', 'iphone issue',
  'ios problem', 'browser cache', 'cookies issue', 'javascript error'
];

// Singapore-specific technical expressions
const SINGLISH_TECH = [
  'app spoil', 'handphone problem', 'phone rosak', 'app buay sai',
  'cannot work lah', 'tech problem sia', 'phone jialat', 'app cui',
  'system down ah', 'server down', 'app hang liao', 'buay tahan'
];

/**
 * Match technical issue patterns
 * @param {string} message - Preprocessed message
 * @param {object} context - Context information
 * @returns {array} Array of technical issue matches with confidence scores
 */
function match(message, context) {
  const matches = [];
  const lowerMessage = message.toLowerCase();

  // Check basic technical keywords
  const basicMatch = checkTechnicalKeywords(lowerMessage);
  if (basicMatch) {
    matches.push(basicMatch);
  }

  // Check login issues
  const loginMatch = checkLoginIssues(lowerMessage);
  if (loginMatch) {
    matches.push(loginMatch);
  }

  // Check Singlish login expressions
  const singlishLoginMatch = checkSinglishLogin(lowerMessage);
  if (singlishLoginMatch) {
    matches.push(singlishLoginMatch);
  }

  // Check app issues
  const appMatch = checkAppIssues(lowerMessage);
  if (appMatch) {
    matches.push(appMatch);
  }

  // Check feature-specific issues
  const featureMatch = checkFeatureIssues(lowerMessage);
  if (featureMatch) {
    matches.push(featureMatch);
  }

  // Check connection issues
  const connectionMatch = checkConnectionIssues(lowerMessage);
  if (connectionMatch) {
    matches.push(connectionMatch);
  }

  // Check device issues
  const deviceMatch = checkDeviceIssues(lowerMessage);
  if (deviceMatch) {
    matches.push(deviceMatch);
  }

  // Check Singlish technical expressions
  const singlishTechMatch = checkSinglishTech(lowerMessage);
  if (singlishTechMatch) {
    matches.push(singlishTechMatch);
  }

  // Context-based adjustments
  if (context.timeOfDay === 'business_hours') {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.1);
      match.contextBoost = 'business_hours';
    });
  }

  // High confidence boost for repeated issues
  if (context.recentTechIssues > 0) {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.15);
      match.historyBoost = 'repeated_issues';
    });
  }

  return matches;
}

/**
 * Check basic technical keywords
 */
function checkTechnicalKeywords(message) {
  const foundKeywords = [];

  for (const keyword of TECHNICAL_KEYWORDS) {
    if (message.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return {
      pattern: 'technical_keywords',
      confidence: 0.65 + (foundKeywords.length * 0.05),
      keywords: foundKeywords,
      subtype: 'general_technical_issue'
    };
  }

  return null;
}

/**
 * Check login issues
 */
function checkLoginIssues(message) {
  for (const issue of LOGIN_ISSUES) {
    if (message.includes(issue)) {
      return {
        pattern: 'login_issue',
        confidence: 0.9,
        keywords: [issue],
        subtype: 'authentication_problem'
      };
    }
  }

  // Check for login + problem combinations
  const loginWords = ['login', 'sign in', 'access', 'enter', 'password'];
  const problemWords = ['cannot', 'failed', 'error', 'problem', 'not working'];

  const hasLogin = loginWords.some(word => message.includes(word));
  const hasProblem = problemWords.some(word => message.includes(word));

  if (hasLogin && hasProblem) {
    return {
      pattern: 'login_problem_combo',
      confidence: 0.85,
      keywords: [...loginWords.filter(w => message.includes(w)), ...problemWords.filter(w => message.includes(w))],
      subtype: 'login_difficulty'
    };
  }

  return null;
}

/**
 * Check Singlish login expressions
 */
function checkSinglishLogin(message) {
  for (const expression of SINGLISH_LOGIN) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_login_issue',
        confidence: 0.85,
        keywords: [expression],
        subtype: 'local_login_problem'
      };
    }
  }
  return null;
}

/**
 * Check app issues
 */
function checkAppIssues(message) {
  const foundIssues = [];

  for (const issue of APP_ISSUES) {
    if (message.includes(issue)) {
      foundIssues.push(issue);
    }
  }

  if (foundIssues.length > 0) {
    return {
      pattern: 'app_issue',
      confidence: 0.85,
      keywords: foundIssues,
      subtype: 'application_problem'
    };
  }

  return null;
}

/**
 * Check feature-specific issues
 */
function checkFeatureIssues(message) {
  const foundFeatures = [];

  for (const feature of FEATURE_ISSUES) {
    if (message.includes(feature)) {
      foundFeatures.push(feature);
    }
  }

  if (foundFeatures.length > 0) {
    return {
      pattern: 'feature_issue',
      confidence: 0.8,
      keywords: foundFeatures,
      subtype: 'feature_malfunction'
    };
  }

  return null;
}

/**
 * Check connection issues
 */
function checkConnectionIssues(message) {
  const foundIssues = [];

  for (const issue of CONNECTION_ISSUES) {
    if (message.includes(issue)) {
      foundIssues.push(issue);
    }
  }

  if (foundIssues.length > 0) {
    return {
      pattern: 'connection_issue',
      confidence: 0.8,
      keywords: foundIssues,
      subtype: 'connectivity_problem'
    };
  }

  return null;
}

/**
 * Check device issues
 */
function checkDeviceIssues(message) {
  const foundIssues = [];

  for (const issue of DEVICE_ISSUES) {
    if (message.includes(issue)) {
      foundIssues.push(issue);
    }
  }

  if (foundIssues.length > 0) {
    return {
      pattern: 'device_issue',
      confidence: 0.75,
      keywords: foundIssues,
      subtype: 'device_compatibility'
    };
  }

  return null;
}

/**
 * Check Singlish technical expressions
 */
function checkSinglishTech(message) {
  for (const expression of SINGLISH_TECH) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_tech_issue',
        confidence: 0.8,
        keywords: [expression],
        subtype: 'local_tech_problem'
      };
    }
  }
  return null;
}

/**
 * Get total number of patterns
 */
function getPatternCount() {
  return TECHNICAL_KEYWORDS.length +
         LOGIN_ISSUES.length +
         SINGLISH_LOGIN.length +
         APP_ISSUES.length +
         FEATURE_ISSUES.length +
         CONNECTION_ISSUES.length +
         DEVICE_ISSUES.length +
         SINGLISH_TECH.length;
}

module.exports = {
  match,
  getPatternCount
};