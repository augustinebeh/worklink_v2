/**
 * Singlish Text Processor
 *
 * Preprocesses messages to handle Singlish expressions, common abbreviations,
 * and typos frequently used in Singapore. Optimized for chat messages.
 */

// Common Singlish particle normalizations
const SINGLISH_NORMALIZATIONS = {
  // Particle normalizations (preserve meaning while standardizing)
  'lah': 'lah',
  'la': 'lah',
  'lar': 'lah',
  'leh': 'leh',
  'le': 'leh',
  'lor': 'lor',
  'lo': 'lor',
  'meh': 'meh',
  'me': 'meh', // only in question context
  'sia': 'sia',
  'siah': 'sia',
  'ah': 'ah',
  'hor': 'hor',
  'hah': 'ah'
};

// Common word normalizations
const WORD_NORMALIZATIONS = {
  // Question words
  'anot': 'or not',
  'anot': 'anot', // keep for pattern matching
  'onot': 'or not',
  'izit': 'is it',
  'liddat': 'like that',
  'lidat': 'like that',
  'lidis': 'like this',
  'lidis': 'like this',

  // Affirmative/Negative
  'can': 'can',
  'cannot': 'cannot',
  'buay sai': 'cannot',
  'boleh': 'can',
  'tak boleh': 'cannot',

  // Common expressions
  'wah': 'wow',
  'alamak': 'oh no',
  'paiseh': 'sorry',
  'shiok': 'good',
  'sian': 'bored',
  'jialat': 'terrible',
  'steady': 'good',
  'atas': 'high class',
  'chope': 'reserve',
  'lobang': 'opportunity',

  // Time expressions
  'just now': 'just now',
  'now then': 'only now',
  'later': 'later',
  'den': 'then',
  'then': 'then',

  // Money terms
  'ang pow': 'red packet',
  'kopi money': 'coffee money',
  'pocket money': 'allowance'
};

// Common abbreviations and typos
const ABBREVIATION_EXPANSIONS = {
  // Internet slang
  'u': 'you',
  'ur': 'your',
  'r': 'are',
  'n': 'and',
  'w': 'with',
  'y': 'why',
  'b4': 'before',
  'l8r': 'later',
  'tmr': 'tomorrow',
  'tdy': 'today',
  'yst': 'yesterday',

  // Singapore-specific abbreviations
  'sg': 'singapore',
  'sgd': 'singapore dollars',
  'mrt': 'train',
  'lrt': 'train',
  'hdb': 'public housing',
  'cpf': 'retirement fund',
  'gst': 'tax',

  // Work-related abbreviations
  'f&b': 'food and beverage',
  'fnb': 'food and beverage',
  'cb': 'central business',
  'cbd': 'central business district',
  'pt': 'part time',
  'ft': 'full time',
  'ot': 'overtime',
  'mc': 'medical certificate'
};

// Common typos and misspellings
const TYPO_CORRECTIONS = {
  'recieve': 'receive',
  'seperate': 'separate',
  'definately': 'definitely',
  'occured': 'occurred',
  'accomodate': 'accommodate',
  'begining': 'beginning',
  'writting': 'writing',
  'comming': 'coming',
  'runing': 'running',
  'geting': 'getting',
  'payed': 'paid',
  'recievd': 'received',
  'intrested': 'interested',
  'availabe': 'available',
  'availble': 'available'
};

// Words that should NOT be normalized (preserve original meaning)
const PRESERVE_WORDS = new Set([
  'no', 'yes', 'ok', 'okay', 'thanks', 'thank', 'please',
  'help', 'job', 'work', 'pay', 'money', 'time', 'when', 'how', 'what', 'where', 'who'
]);

/**
 * Main preprocessing function
 * @param {string} text - Raw message text
 * @returns {string} Preprocessed text optimized for pattern matching
 */
function preprocess(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let processed = text.toLowerCase().trim();

  // 1. Handle multiple spaces and cleanup
  processed = processed.replace(/\s+/g, ' ');

  // 2. Normalize punctuation (preserve ? and ! for urgency detection)
  processed = processed.replace(/[.,;:()[\]{}]/g, ' ');
  processed = processed.replace(/\s+/g, ' '); // Clean up again

  // 3. Expand abbreviations
  processed = expandAbbreviations(processed);

  // 4. Fix common typos
  processed = fixTypos(processed);

  // 5. Normalize Singlish words (preserve for pattern matching)
  processed = normalizeSinglish(processed);

  // 6. Final cleanup
  processed = processed.trim();

  return processed;
}

/**
 * Expand common abbreviations
 */
function expandAbbreviations(text) {
  let result = text;

  // Split into words for precise replacement
  const words = result.split(' ');
  const expandedWords = words.map(word => {
    // Clean the word (remove punctuation for matching)
    const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');

    // Check if it's in our abbreviation list
    if (ABBREVIATION_EXPANSIONS[cleanWord]) {
      return ABBREVIATION_EXPANSIONS[cleanWord];
    }

    // Check for common patterns
    if (cleanWord.endsWith('ing') && cleanWord.length > 4) {
      // Don't modify -ing words
      return word;
    }

    return word;
  });

  return expandedWords.join(' ');
}

/**
 * Fix common typos
 */
function fixTypos(text) {
  let result = text;

  const words = result.split(' ');
  const correctedWords = words.map(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');

    if (TYPO_CORRECTIONS[cleanWord]) {
      return TYPO_CORRECTIONS[cleanWord];
    }

    return word;
  });

  return correctedWords.join(' ');
}

/**
 * Normalize Singlish expressions while preserving pattern matching value
 */
function normalizeSinglish(text) {
  let result = text;

  // Handle Singlish particles - preserve for pattern matching
  // We keep the original particles as they are important for pattern recognition

  // Normalize common word variations
  const words = result.split(' ');
  const normalizedWords = words.map(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');

    // Don't normalize words that should be preserved
    if (PRESERVE_WORDS.has(cleanWord)) {
      return word;
    }

    // Check for word normalizations
    if (WORD_NORMALIZATIONS[cleanWord]) {
      return WORD_NORMALIZATIONS[cleanWord];
    }

    return word;
  });

  return normalizedWords.join(' ');
}

/**
 * Extract Singlish features for analysis
 * @param {string} text - Text to analyze
 * @returns {object} Analysis of Singlish features found
 */
function analyzeSinglishFeatures(text) {
  const features = {
    particles: [],
    localExpressions: [],
    abbreviations: [],
    confidence: 0
  };

  const lowerText = text.toLowerCase();

  // Check for particles
  Object.keys(SINGLISH_NORMALIZATIONS).forEach(particle => {
    if (lowerText.includes(particle)) {
      features.particles.push(particle);
    }
  });

  // Check for local expressions
  Object.keys(WORD_NORMALIZATIONS).forEach(expression => {
    if (lowerText.includes(expression)) {
      features.localExpressions.push(expression);
    }
  });

  // Check for Singapore-specific abbreviations
  Object.keys(ABBREVIATION_EXPANSIONS).forEach(abbrev => {
    if (lowerText.includes(abbrev) &&
        ['sg', 'sgd', 'mrt', 'lrt', 'hdb', 'cpf', 'cbd', 'f&b', 'fnb'].includes(abbrev)) {
      features.abbreviations.push(abbrev);
    }
  });

  // Calculate Singlish confidence
  const totalFeatures = features.particles.length +
                       features.localExpressions.length +
                       features.abbreviations.length;

  if (totalFeatures > 0) {
    features.confidence = Math.min(1.0, totalFeatures * 0.3);
  }

  return features;
}

/**
 * Check if text appears to be in Singlish
 * @param {string} text - Text to check
 * @returns {boolean} True if text contains Singlish features
 */
function isSinglish(text) {
  const features = analyzeSinglishFeatures(text);
  return features.confidence > 0.3;
}

/**
 * Get supported Singlish features for reporting
 * @returns {object} Summary of supported features
 */
function getSupportedFeatures() {
  return {
    particles: Object.keys(SINGLISH_NORMALIZATIONS).length,
    wordNormalizations: Object.keys(WORD_NORMALIZATIONS).length,
    abbreviations: Object.keys(ABBREVIATION_EXPANSIONS).length,
    typoCorrections: Object.keys(TYPO_CORRECTIONS).length,
    preservedWords: PRESERVE_WORDS.size
  };
}

module.exports = {
  preprocess,
  analyzeSinglishFeatures,
  isSinglish,
  getSupportedFeatures
};