/**
 * Text Embeddings & Similarity Service
 *
 * Simple TF-IDF based text similarity for knowledge base matching.
 * No external API needed - runs entirely locally.
 * Can be upgraded to sentence-transformers later for better accuracy.
 */

// Stop words to ignore in similarity matching
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she',
  'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
  'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an',
  'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
  'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
  'don', 'should', 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren',
  'couldn', 'didn', 'doesn', 'hadn', 'hasn', 'haven', 'isn', 'ma', 'mightn',
  'mustn', 'needn', 'shan', 'shouldn', 'wasn', 'weren', 'won', 'wouldn',
  'hi', 'hello', 'hey', 'thanks', 'thank', 'please', 'ok', 'okay', 'yes', 'no',
  'yeah', 'yep', 'nope', 'sure', 'got', 'get', 'want', 'need', 'would', 'could'
]);

// Singapore English variations mapping
const WORD_VARIATIONS = {
  'pay': ['salary', 'wage', 'wages', 'money', 'paid', 'payment', 'paycheck'],
  'job': ['work', 'gig', 'shift', 'assignment', 'jobs', 'opportunity'],
  'schedule': ['timing', 'time', 'calendar', 'availability', 'date', 'when'],
  'cancel': ['cancellation', 'cannot', 'cant', "can't", 'unable'],
  'available': ['availability', 'free', 'open', 'avail'],
  'apply': ['application', 'signup', 'sign-up', 'register', 'join'],
  'referral': ['refer', 'friend', 'invite', 'recommendation'],
  'xp': ['experience', 'points', 'level', 'rank', 'tier'],
};

/**
 * Normalize text for comparison
 * - Lowercase
 * - Remove punctuation
 * - Remove extra whitespace
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim();
}

/**
 * Tokenize text into words
 * - Splits on whitespace
 * - Removes stop words
 * - Returns array of tokens
 */
function tokenize(text) {
  const normalized = normalizeText(text);
  const words = normalized.split(' ');
  return words.filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

/**
 * Expand tokens with variations
 * e.g., "pay" -> ["pay", "salary", "wage", ...]
 */
function expandTokens(tokens) {
  const expanded = new Set(tokens);
  tokens.forEach(token => {
    // Check if this token has known variations
    Object.entries(WORD_VARIATIONS).forEach(([key, variations]) => {
      if (token === key || variations.includes(token)) {
        expanded.add(key);
        variations.forEach(v => expanded.add(v));
      }
    });
  });
  return Array.from(expanded);
}

/**
 * Calculate term frequency for a document
 */
function termFrequency(tokens) {
  const tf = {};
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  // Normalize by document length
  const len = tokens.length || 1;
  Object.keys(tf).forEach(term => {
    tf[term] = tf[term] / len;
  });
  return tf;
}

/**
 * Calculate cosine similarity between two TF vectors
 */
function cosineSimilarity(tf1, tf2) {
  const terms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  terms.forEach(term => {
    const v1 = tf1[term] || 0;
    const v2 = tf2[term] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  });

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Calculate Jaccard similarity (set overlap)
 */
function jaccardSimilarity(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Check if query matches any keywords in a list
 */
function keywordMatch(queryTokens, keywords) {
  if (!keywords) return 0;

  let keywordList;
  try {
    keywordList = typeof keywords === 'string' ? JSON.parse(keywords) : keywords;
  } catch (e) {
    return 0;
  }

  if (!Array.isArray(keywordList)) return 0;

  const querySet = new Set(queryTokens);
  const expandedQuery = new Set(expandTokens(queryTokens));

  let matches = 0;
  keywordList.forEach(keyword => {
    const kwTokens = tokenize(keyword);
    kwTokens.forEach(kwToken => {
      if (querySet.has(kwToken) || expandedQuery.has(kwToken)) {
        matches++;
      }
    });
  });

  return Math.min(1, matches / Math.max(1, keywordList.length));
}

/**
 * Calculate combined similarity score between query and a knowledge base entry
 * Uses multiple signals:
 * - TF cosine similarity (semantic)
 * - Jaccard similarity (lexical overlap)
 * - Keyword matching (explicit triggers)
 */
function calculateSimilarity(query, kbEntry) {
  const queryTokens = tokenize(query);
  const expandedQueryTokens = expandTokens(queryTokens);

  // Parse stored tokens or generate from question
  let entryTokens;
  if (kbEntry.question_tokens) {
    try {
      entryTokens = JSON.parse(kbEntry.question_tokens);
    } catch (e) {
      entryTokens = tokenize(kbEntry.question);
    }
  } else {
    entryTokens = tokenize(kbEntry.question);
  }

  const expandedEntryTokens = expandTokens(entryTokens);

  // Calculate different similarity metrics
  const tfQuery = termFrequency(expandedQueryTokens);
  const tfEntry = termFrequency(expandedEntryTokens);

  const cosSim = cosineSimilarity(tfQuery, tfEntry);
  const jacSim = jaccardSimilarity(expandedQueryTokens, expandedEntryTokens);
  const kwMatch = keywordMatch(queryTokens, kbEntry.keywords);

  // Weighted combination
  // - Cosine similarity: 40% (semantic matching)
  // - Jaccard similarity: 30% (word overlap)
  // - Keyword match: 30% (explicit triggers)
  const combinedScore = (cosSim * 0.4) + (jacSim * 0.3) + (kwMatch * 0.3);

  // Boost by historical confidence if available
  const confidenceBoost = kbEntry.confidence ? kbEntry.confidence * 0.1 : 0;

  return Math.min(1, combinedScore + confidenceBoost);
}

/**
 * Find similar entries in knowledge base
 * @param {string} query - User's question
 * @param {Array} knowledgeBase - Array of KB entries
 * @param {number} topK - Number of results to return
 * @param {number} minScore - Minimum similarity score
 * @returns {Array} Top matching entries with scores
 */
function findSimilar(query, knowledgeBase, topK = 5, minScore = 0.3) {
  if (!query || !knowledgeBase || knowledgeBase.length === 0) {
    return [];
  }

  const results = knowledgeBase
    .map(entry => ({
      ...entry,
      similarity: calculateSimilarity(query, entry)
    }))
    .filter(entry => entry.similarity >= minScore)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return results;
}

/**
 * Generate tokens for storage (used when adding new KB entries)
 */
function generateTokensForStorage(text) {
  const tokens = tokenize(text);
  return JSON.stringify(tokens);
}

/**
 * Generate normalized version for exact matching
 */
function generateNormalized(text) {
  return normalizeText(text);
}

/**
 * Check if two questions are essentially the same
 */
function areSimilarQuestions(q1, q2, threshold = 0.85) {
  return calculateSimilarity(q1, { question: q2 }) >= threshold;
}

module.exports = {
  normalizeText,
  tokenize,
  expandTokens,
  termFrequency,
  cosineSimilarity,
  jaccardSimilarity,
  keywordMatch,
  calculateSimilarity,
  findSimilar,
  generateTokensForStorage,
  generateNormalized,
  areSimilarQuestions,
  STOP_WORDS,
  WORD_VARIATIONS,
};
