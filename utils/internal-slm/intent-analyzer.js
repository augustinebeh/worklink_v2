/**
 * Internal Intent Analyzer
 * Rule-based intent recognition without external LLM dependencies
 */

class IntentAnalyzer {
  constructor() {
    this.intentPatterns = this.buildIntentPatterns();
    this.entityPatterns = this.buildEntityPatterns();
    this.sentimentWords = this.buildSentimentWords();
  }

  /**
   * Analyze message intent, entities, and sentiment
   */
  async analyzeIntent(message, context = {}, candidateData = {}) {
    const normalizedMessage = message.toLowerCase().trim();

    // Extract entities first
    const entities = this.extractEntities(normalizedMessage);

    // Determine intent with confidence score
    const intentResults = this.classifyIntent(normalizedMessage, context, candidateData);

    // Analyze sentiment
    const sentiment = this.analyzeSentiment(normalizedMessage);

    // Apply contextual adjustments
    const adjustedIntent = this.applyContextualAdjustments(
      intentResults,
      context,
      candidateData,
      entities
    );

    return {
      intent: adjustedIntent.intent,
      confidence: adjustedIntent.confidence,
      entities,
      sentiment,
      messageType: this.determineMessageType(adjustedIntent.intent, entities),
      urgency: this.determineUrgency(normalizedMessage, sentiment)
    };
  }

  /**
   * Build intent recognition patterns
   */
  buildIntentPatterns() {
    return {
      greeting: {
        keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings'],
        patterns: [
          /^(hi|hello|hey)\b/i,
          /good (morning|afternoon|evening)/i,
          /\b(hi there|hey there)\b/i
        ],
        weight: 0.95
      },

      interview_scheduling: {
        keywords: ['schedule', 'book', 'arrange', 'interview', 'meet', 'talk', 'verification', 'call', 'appointment'],
        patterns: [
          /\b(schedule|book|arrange)\b.*\b(interview|meeting|call|appointment)\b/,
          /\b(verification|onboarding)\b.*\b(interview|call|meeting)\b/,
          /\bwhen can (i|we)\b.*\b(meet|talk|interview)\b/,
          /\b(available|free)\b.*\b(interview|meeting|call)\b/
        ],
        weight: 0.9
      },

      availability_sharing: {
        keywords: ['available', 'free', 'time', 'morning', 'afternoon', 'evening', 'weekday', 'weekend', 'tomorrow', 'today'],
        patterns: [
          /\b(available|free)\b.*\b(morning|afternoon|evening|weekday|weekend)\b/,
          /\b(i can|i'm free|i'm available)\b/,
          /\b(tomorrow|today|next week)\b.*\b(morning|afternoon|evening)\b/,
          /\b(weekday|weekend)\b.*\b(morning|afternoon|evening)\b/
        ],
        weight: 0.85
      },

      confirm_booking: {
        keywords: ['yes', 'ok', 'okay', 'confirm', 'book it', 'schedule it', 'sounds good', 'perfect', 'great'],
        patterns: [
          /^(yes|ok|okay|sure|alright)\b/,
          /\b(book it|schedule it|confirm it)\b/,
          /\b(sounds good|sounds great|perfect|excellent)\b/,
          /^[1-9]\s*$/, // Number selection
          /\b(option|number)\s*[1-9]\b/
        ],
        weight: 0.9
      },

      reschedule: {
        keywords: ['reschedule', 'change', 'different time', 'cancel', 'postpone', 'move', 'shift'],
        patterns: [
          /\b(reschedule|change|move|shift)\b.*\b(interview|meeting|appointment|time)\b/,
          /\b(different|another|other)\b.*\btime\b/,
          /\b(cancel|postpone)\b.*\b(interview|meeting|appointment)\b/,
          /\bcan('t| not)\b.*\bmake it\b/
        ],
        weight: 0.85
      },

      payment_inquiry: {
        keywords: ['payment', 'pay', 'salary', 'earnings', 'money', 'withdraw', 'balance', 'paid'],
        patterns: [
          /\b(payment|pay|salary|earnings|money)\b/,
          /\b(withdraw|withdrawal|cash out)\b/,
          /\b(balance|how much|amount)\b/,
          /\bwhen will i (get paid|receive payment|be paid)\b/
        ],
        weight: 0.9
      },

      job_inquiry: {
        keywords: ['job', 'work', 'shift', 'opportunity', 'position', 'employment', 'gig'],
        patterns: [
          /\b(job|work|shift|gig)\b.*\b(available|opportunity|opening)\b/,
          /\b(find|get|apply for)\b.*\b(job|work|position)\b/,
          /\b(what|any)\b.*\b(jobs|work|opportunities)\b/,
          /\bwhen can i start working\b/
        ],
        weight: 0.85
      },

      account_verification: {
        keywords: ['verify', 'verification', 'approve', 'approval', 'account', 'status', 'review', 'pending'],
        patterns: [
          /\b(verify|verification|approve|approval)\b/,
          /\baccount.*\b(status|review|pending)\b/,
          /\bwhen will.*(account|profile).*(be|get).*(verified|approved)\b/,
          /\bhow long.*\b(verification|approval|review)\b/
        ],
        weight: 0.85
      },

      general_question: {
        keywords: ['what', 'how', 'when', 'where', 'why', 'who', 'help', 'question', 'info', 'information'],
        patterns: [
          /^(what|how|when|where|why|who)\b/,
          /\b(help|question|info|information|explain)\b/,
          /\bcan you (help|tell me|explain)\b/,
          /\bi (need|want|would like).*(help|info|information)\b/
        ],
        weight: 0.7
      },

      complaint_feedback: {
        keywords: ['complain', 'complaint', 'problem', 'issue', 'wrong', 'error', 'frustrated', 'angry', 'disappointed'],
        patterns: [
          /\b(complain|complaint|problem|issue|wrong|error)\b/,
          /\b(frustrated|angry|disappointed|upset|annoyed)\b/,
          /\b(not working|doesn't work|broken)\b/,
          /\bthis is (wrong|bad|terrible|awful)\b/
        ],
        weight: 0.9
      }
    };
  }

  /**
   * Build entity extraction patterns
   */
  buildEntityPatterns() {
    return {
      time: {
        patterns: [
          /\b(\d{1,2}):(\d{2})\s*(am|pm)\b/g,
          /\b(\d{1,2})\s*(am|pm)\b/g,
          /\b(morning|afternoon|evening|night)\b/g,
          /\b(early|late)\s*(morning|afternoon|evening)\b/g
        ],
        type: 'time'
      },

      day: {
        patterns: [
          /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
          /\b(today|tomorrow|yesterday)\b/g,
          /\b(next week|this week|last week)\b/g,
          /\b(weekday|weekend)\b/g
        ],
        type: 'day'
      },

      number: {
        patterns: [
          /\b([1-9])\b/g,
          /\b(one|two|three|four|five|six|seven|eight|nine)\b/g,
          /\b(first|second|third|fourth|fifth)\b/g
        ],
        type: 'number'
      },

      confirmation: {
        patterns: [
          /\b(yes|yeah|yep|yup|ok|okay|sure|alright)\b/g,
          /\b(no|nope|nah)\b/g,
          /\b(maybe|perhaps|possibly)\b/g
        ],
        type: 'confirmation'
      },

      urgency: {
        patterns: [
          /\b(urgent|emergency|asap|immediately|now|quickly)\b/g,
          /\b(as soon as possible|right away|right now)\b/g
        ],
        type: 'urgency'
      }
    };
  }

  /**
   * Build sentiment analysis words
   */
  buildSentimentWords() {
    return {
      positive: ['good', 'great', 'excellent', 'perfect', 'awesome', 'wonderful', 'fantastic', 'amazing', 'love', 'like', 'happy', 'pleased', 'satisfied', 'thank', 'thanks'],
      negative: ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'upset', 'annoyed', 'problem', 'issue', 'wrong', 'error'],
      neutral: ['ok', 'okay', 'fine', 'alright', 'sure', 'maybe', 'perhaps']
    };
  }

  /**
   * Classify intent using pattern matching and keyword analysis
   */
  classifyIntent(message, context, candidateData) {
    const scores = {};

    // Score each intent
    Object.entries(this.intentPatterns).forEach(([intent, config]) => {
      scores[intent] = this.scoreIntent(message, config, context, candidateData);
    });

    // Find highest scoring intent
    const sortedIntents = Object.entries(scores)
      .sort(([,a], [,b]) => b - a);

    const topIntent = sortedIntents[0];
    const confidence = topIntent[1];

    return {
      intent: topIntent[0],
      confidence,
      allScores: scores
    };
  }

  /**
   * Score an intent based on patterns and keywords
   */
  scoreIntent(message, config, context, candidateData) {
    let score = 0;
    const { keywords, patterns, weight } = config;

    // Keyword matching
    const keywordMatches = keywords.filter(keyword =>
      message.includes(keyword)
    ).length;
    score += (keywordMatches / keywords.length) * 0.6;

    // Pattern matching
    const patternMatches = patterns.filter(pattern =>
      pattern.test(message)
    ).length;
    score += (patternMatches / patterns.length) * 0.4;

    // Apply intent weight
    score *= weight;

    // Apply contextual boosts
    score = this.applyContextualBoosts(score, config, context, candidateData, message);

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Apply contextual boosts to intent scores
   */
  applyContextualBoosts(score, config, context, candidateData, message) {
    const { status } = candidateData;
    const { conversationFlow, lastIntent } = context;

    // Boost interview scheduling for pending candidates
    if (config === this.intentPatterns.interview_scheduling && status === 'pending') {
      score += 0.15;
    }

    // Boost availability sharing if in scheduling flow
    if (config === this.intentPatterns.availability_sharing &&
        conversationFlow === 'scheduling_started') {
      score += 0.2;
    }

    // Boost confirmation if last intent was offering slots
    if (config === this.intentPatterns.confirm_booking &&
        lastIntent === 'offer_slots') {
      score += 0.25;
    }

    // Boost payment for active candidates
    if (config === this.intentPatterns.payment_inquiry && status === 'active') {
      score += 0.1;
    }

    // Boost job inquiry for active candidates
    if (config === this.intentPatterns.job_inquiry && status === 'active') {
      score += 0.1;
    }

    return score;
  }

  /**
   * Extract entities from message
   */
  extractEntities(message) {
    const entities = [];

    Object.entries(this.entityPatterns).forEach(([category, config]) => {
      config.patterns.forEach(pattern => {
        const matches = message.matchAll(pattern);
        for (const match of matches) {
          entities.push({
            type: config.type,
            value: this.normalizeEntityValue(match[0], config.type),
            raw: match[0],
            start: match.index,
            end: match.index + match[0].length
          });
        }
      });
    });

    return this.deduplicateEntities(entities);
  }

  /**
   * Normalize entity values
   */
  normalizeEntityValue(value, type) {
    switch (type) {
      case 'number':
        const numberMap = {
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5
        };
        return numberMap[value.toLowerCase()] || parseInt(value) || value;

      case 'confirmation':
        const positiveConfirmations = ['yes', 'yeah', 'yep', 'yup', 'ok', 'okay', 'sure', 'alright'];
        return positiveConfirmations.includes(value.toLowerCase()) ? 'positive' : 'negative';

      case 'time':
        return value.toLowerCase();

      case 'day':
        return value.toLowerCase();

      default:
        return value.toLowerCase();
    }
  }

  /**
   * Remove duplicate entities
   */
  deduplicateEntities(entities) {
    const seen = new Set();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Analyze sentiment
   */
  analyzeSentiment(message) {
    const words = message.split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      if (this.sentimentWords.positive.includes(cleanWord)) {
        positiveScore++;
      } else if (this.sentimentWords.negative.includes(cleanWord)) {
        negativeScore++;
      }
    });

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Apply contextual adjustments to intent results
   */
  applyContextualAdjustments(intentResults, context, candidateData, entities) {
    let { intent, confidence } = intentResults;

    // Force interview scheduling for pending candidates with scheduling keywords
    if (candidateData.status === 'pending' &&
        (intent === 'job_inquiry' || intent === 'account_verification') &&
        confidence > 0.5) {
      intent = 'interview_scheduling';
      confidence = Math.min(confidence + 0.2, 0.95);
    }

    // Escalate complex questions
    if (intent === 'general_question' &&
        entities.some(e => e.type === 'urgency') &&
        confidence < 0.8) {
      intent = 'escalate';
      confidence = 0.9;
    }

    return { intent, confidence };
  }

  /**
   * Determine message type for response formatting
   */
  determineMessageType(intent, entities) {
    if (intent === 'greeting') return 'greeting';
    if (intent === 'interview_scheduling') return 'scheduling_request';
    if (intent === 'availability_sharing') return 'availability_response';
    if (intent === 'confirm_booking') return 'booking_confirmation';
    if (intent === 'payment_inquiry') return 'payment_question';
    if (intent === 'job_inquiry') return 'job_question';
    if (intent === 'complaint_feedback') return 'complaint';
    if (entities.some(e => e.type === 'urgency')) return 'urgent_question';
    return 'standard_question';
  }

  /**
   * Determine urgency level
   */
  determineUrgency(message, sentiment) {
    if (message.includes('urgent') || message.includes('emergency')) return 'urgent';
    if (message.includes('asap') || message.includes('immediately')) return 'high';
    if (sentiment === 'negative') return 'normal';
    return 'low';
  }
}

// Export the analyzer function
async function analyzeIntent(message, context = {}, candidateData = {}) {
  const analyzer = new IntentAnalyzer();
  return await analyzer.analyzeIntent(message, context, candidateData);
}

module.exports = { analyzeIntent, IntentAnalyzer };