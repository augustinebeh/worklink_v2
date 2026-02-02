/**
 * General Help Pattern Matcher
 *
 * Detects messages for general support, greetings, FAQs, and fallback patterns.
 * Serves as the catch-all for messages that don't fit specific categories.
 */

// Greeting patterns
const GREETINGS = [
  'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
  'greetings', 'hola', 'yo', 'sup', 'wassup'
];

// Singapore-specific greetings
const SINGLISH_GREETINGS = [
  'lai liao', 'eh hello', 'wah hello', 'morning ah', 'evening leh',
  'how sia', 'what up', 'yo bro', 'eh hi', 'alamak hello'
];

// General help requests
const HELP_REQUESTS = [
  'help', 'help me', 'can help', 'need help', 'assistance', 'support',
  'guide me', 'how to', 'can you help', 'help please', 'need assistance',
  'customer service', 'customer support'
];

// Information requests
const INFO_REQUESTS = [
  'information', 'info', 'details', 'explain', 'tell me about',
  'what is', 'how does', 'can you tell', 'more info', 'learn more',
  'find out', 'know more', 'understand'
];

// General questions
const GENERAL_QUESTIONS = [
  'how it works', 'how this works', 'what can you do', 'what services',
  'about worklink', 'company info', 'who are you', 'what is worklink',
  'your services', 'how to use', 'getting started', 'new user'
];

// Singapore-specific help expressions
const SINGLISH_HELP = [
  'help lah', 'can help anot', 'help me leh', 'guide guide',
  'teach me lah', 'how sia', 'dunno how', 'blur blur',
  'help small small', 'can explain or not', 'teach teach'
];

// Casual conversation starters
const CASUAL_CONVERSATION = [
  'how are you', 'what up', 'whats up', 'how you doing', 'how things',
  'everything ok', 'all good', 'doing well', 'hope you good',
  'nice day', 'good day'
];

// Thanks and positive responses
const THANKS_PATTERNS = [
  'thank you', 'thanks', 'thx', 'ty', 'appreciate', 'grateful',
  'nice', 'good', 'great', 'awesome', 'perfect', 'excellent'
];

// Goodbye patterns
const GOODBYE_PATTERNS = [
  'bye', 'goodbye', 'see you', 'talk later', 'catch you later',
  'take care', 'have a good day', 'ttyl', 'ciao', 'cheers'
];

// FAQ-style questions
const FAQ_PATTERNS = [
  'frequently asked', 'common questions', 'faq', 'policy', 'terms',
  'conditions', 'rules', 'guidelines', 'procedures', 'process'
];

/**
 * Match general help patterns
 * @param {string} message - Preprocessed message
 * @param {object} context - Context information
 * @returns {array} Array of general help matches with confidence scores
 */
function match(message, context) {
  const matches = [];
  const lowerMessage = message.toLowerCase();

  // Check greetings
  const greetingMatch = checkGreetings(lowerMessage);
  if (greetingMatch) {
    matches.push(greetingMatch);
  }

  // Check Singlish greetings
  const singlishGreetingMatch = checkSinglishGreetings(lowerMessage);
  if (singlishGreetingMatch) {
    matches.push(singlishGreetingMatch);
  }

  // Check help requests
  const helpMatch = checkHelpRequests(lowerMessage);
  if (helpMatch) {
    matches.push(helpMatch);
  }

  // Check information requests
  const infoMatch = checkInfoRequests(lowerMessage);
  if (infoMatch) {
    matches.push(infoMatch);
  }

  // Check general questions
  const questionMatch = checkGeneralQuestions(lowerMessage);
  if (questionMatch) {
    matches.push(questionMatch);
  }

  // Check Singlish help expressions
  const singlishHelpMatch = checkSinglishHelp(lowerMessage);
  if (singlishHelpMatch) {
    matches.push(singlishHelpMatch);
  }

  // Check casual conversation
  const casualMatch = checkCasualConversation(lowerMessage);
  if (casualMatch) {
    matches.push(casualMatch);
  }

  // Check thanks patterns
  const thanksMatch = checkThanksPatterns(lowerMessage);
  if (thanksMatch) {
    matches.push(thanksMatch);
  }

  // Check goodbye patterns
  const goodbyeMatch = checkGoodbyePatterns(lowerMessage);
  if (goodbyeMatch) {
    matches.push(goodbyeMatch);
  }

  // Check FAQ patterns
  const faqMatch = checkFAQPatterns(lowerMessage);
  if (faqMatch) {
    matches.push(faqMatch);
  }

  // Special handling for very short messages
  if (message.length <= 3) {
    matches.push({
      pattern: 'very_short_message',
      confidence: 0.4,
      keywords: [message],
      subtype: 'minimal_input'
    });
  }

  // Context-based adjustments
  if (context.isFirstMessage) {
    matches.forEach(match => {
      if (match.subtype === 'greeting' || match.subtype === 'local_greeting') {
        match.confidence = Math.min(1.0, match.confidence * 1.2);
        match.contextBoost = 'first_interaction';
      }
    });
  }

  return matches;
}

/**
 * Check greeting patterns
 */
function checkGreetings(message) {
  for (const greeting of GREETINGS) {
    if (message.includes(greeting) || message.startsWith(greeting)) {
      return {
        pattern: 'greeting',
        confidence: 0.8,
        keywords: [greeting],
        subtype: 'greeting'
      };
    }
  }
  return null;
}

/**
 * Check Singlish greetings
 */
function checkSinglishGreetings(message) {
  for (const greeting of SINGLISH_GREETINGS) {
    if (message.includes(greeting)) {
      return {
        pattern: 'singlish_greeting',
        confidence: 0.85,
        keywords: [greeting],
        subtype: 'local_greeting'
      };
    }
  }
  return null;
}

/**
 * Check help requests
 */
function checkHelpRequests(message) {
  const foundRequests = [];

  for (const request of HELP_REQUESTS) {
    if (message.includes(request)) {
      foundRequests.push(request);
    }
  }

  if (foundRequests.length > 0) {
    return {
      pattern: 'help_request',
      confidence: 0.75 + (foundRequests.length * 0.05),
      keywords: foundRequests,
      subtype: 'general_help'
    };
  }

  return null;
}

/**
 * Check information requests
 */
function checkInfoRequests(message) {
  const foundRequests = [];

  for (const request of INFO_REQUESTS) {
    if (message.includes(request)) {
      foundRequests.push(request);
    }
  }

  if (foundRequests.length > 0) {
    return {
      pattern: 'info_request',
      confidence: 0.7,
      keywords: foundRequests,
      subtype: 'information_seeking'
    };
  }

  return null;
}

/**
 * Check general questions
 */
function checkGeneralQuestions(message) {
  for (const question of GENERAL_QUESTIONS) {
    if (message.includes(question)) {
      return {
        pattern: 'general_question',
        confidence: 0.75,
        keywords: [question],
        subtype: 'company_info'
      };
    }
  }

  // Check for question patterns
  if (message.includes('?') && message.length > 5) {
    return {
      pattern: 'question_format',
      confidence: 0.5,
      keywords: ['?'],
      subtype: 'general_inquiry'
    };
  }

  return null;
}

/**
 * Check Singlish help expressions
 */
function checkSinglishHelp(message) {
  for (const expression of SINGLISH_HELP) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_help',
        confidence: 0.8,
        keywords: [expression],
        subtype: 'local_help_request'
      };
    }
  }
  return null;
}

/**
 * Check casual conversation
 */
function checkCasualConversation(message) {
  const foundPatterns = [];

  for (const pattern of CASUAL_CONVERSATION) {
    if (message.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  if (foundPatterns.length > 0) {
    return {
      pattern: 'casual_conversation',
      confidence: 0.6,
      keywords: foundPatterns,
      subtype: 'social_interaction'
    };
  }

  return null;
}

/**
 * Check thanks patterns
 */
function checkThanksPatterns(message) {
  const foundThanks = [];

  for (const thanks of THANKS_PATTERNS) {
    if (message.includes(thanks)) {
      foundThanks.push(thanks);
    }
  }

  if (foundThanks.length > 0) {
    return {
      pattern: 'thanks_response',
      confidence: 0.85,
      keywords: foundThanks,
      subtype: 'appreciation'
    };
  }

  return null;
}

/**
 * Check goodbye patterns
 */
function checkGoodbyePatterns(message) {
  const foundGoodbyes = [];

  for (const goodbye of GOODBYE_PATTERNS) {
    if (message.includes(goodbye)) {
      foundGoodbyes.push(goodbye);
    }
  }

  if (foundGoodbyes.length > 0) {
    return {
      pattern: 'goodbye',
      confidence: 0.8,
      keywords: foundGoodbyes,
      subtype: 'conversation_end'
    };
  }

  return null;
}

/**
 * Check FAQ patterns
 */
function checkFAQPatterns(message) {
  const foundFAQ = [];

  for (const faq of FAQ_PATTERNS) {
    if (message.includes(faq)) {
      foundFAQ.push(faq);
    }
  }

  if (foundFAQ.length > 0) {
    return {
      pattern: 'faq_request',
      confidence: 0.7,
      keywords: foundFAQ,
      subtype: 'policy_inquiry'
    };
  }

  return null;
}

/**
 * Get total number of patterns
 */
function getPatternCount() {
  return GREETINGS.length +
         SINGLISH_GREETINGS.length +
         HELP_REQUESTS.length +
         INFO_REQUESTS.length +
         GENERAL_QUESTIONS.length +
         SINGLISH_HELP.length +
         CASUAL_CONVERSATION.length +
         THANKS_PATTERNS.length +
         GOODBYE_PATTERNS.length +
         FAQ_PATTERNS.length;
}

module.exports = {
  match,
  getPatternCount
};