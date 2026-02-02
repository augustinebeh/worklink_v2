/**
 * Intent Classification Engine for Template Responses
 *
 * Fast, lightweight intent classification that determines the user's
 * intention without making promises about responses or timing
 */

class IntentClassifier {
  constructor() {
    this.intentPatterns = this.initializeIntentPatterns();
  }

  initializeIntentPatterns() {
    return {
      // Payment-related intents
      payment_inquiry: {
        patterns: [
          'payment', 'pay', 'money', 'salary', 'wage', 'earnings',
          'cash', 'income', 'compensation', 'receive'
        ],
        subcategories: {
          timing: ['when', 'how long', 'time', 'receive', 'get paid'],
          amount: ['how much', 'amount', 'total', 'balance'],
          status: ['pending', 'processed', 'completed', 'status']
        },
        confidence: 0.9
      },

      withdrawal_request: {
        patterns: [
          'withdraw', 'withdrawal', 'cash out', 'transfer', 'bank transfer',
          'take out', 'get money', 'payout'
        ],
        subcategories: {
          process: ['how to', 'process', 'steps'],
          timing: ['when', 'how long', 'time'],
          fees: ['fee', 'charge', 'cost', 'free']
        },
        confidence: 0.95
      },

      // Job-related intents
      job_inquiry: {
        patterns: [
          'job', 'work', 'opportunity', 'position', 'role', 'employment',
          'gig', 'task', 'assignment', 'shift'
        ],
        subcategories: {
          availability: ['available', 'open', 'hiring', 'vacancies'],
          application: ['apply', 'application', 'interested'],
          status: ['status', 'applied', 'pending', 'review']
        },
        confidence: 0.85
      },

      job_status: {
        patterns: [
          'application', 'applied', 'job status', 'interview', 'selected',
          'rejected', 'approved', 'confirmed'
        ],
        subcategories: {
          pending: ['pending', 'waiting', 'review', 'processing'],
          scheduled: ['scheduled', 'confirmed', 'upcoming'],
          completed: ['completed', 'finished', 'done']
        },
        confidence: 0.9
      },

      // Account/verification intents
      verification_status: {
        patterns: [
          'verify', 'verification', 'approve', 'approval', 'pending',
          'review', 'account status', 'activate', 'confirmed'
        ],
        subcategories: {
          timing: ['when', 'how long', 'time'],
          process: ['how to', 'steps', 'process', 'complete'],
          requirements: ['need', 'required', 'document', 'information']
        },
        confidence: 0.9
      },

      account_issue: {
        patterns: [
          'problem', 'issue', 'error', 'bug', 'not working', 'broken',
          'trouble', 'difficulty', 'help'
        ],
        subcategories: {
          login: ['login', 'password', 'access', 'sign in'],
          technical: ['error', 'bug', 'crash', 'loading', 'broken'],
          profile: ['profile', 'information', 'details', 'update']
        },
        confidence: 0.8
      },

      // General support intents
      general_inquiry: {
        patterns: [
          'how', 'what', 'why', 'where', 'when', 'help', 'question',
          'information', 'explain', 'understand'
        ],
        subcategories: {
          how_to: ['how to', 'how do i', 'steps'],
          information: ['what is', 'explain', 'tell me'],
          help: ['help', 'assist', 'support']
        },
        confidence: 0.6
      },

      // Escalation triggers
      escalation_urgent: {
        patterns: [
          'urgent', 'emergency', 'asap', 'immediately', 'now',
          'important', 'critical', 'serious'
        ],
        subcategories: {
          complaint: ['complaint', 'unhappy', 'disappointed', 'angry'],
          dispute: ['wrong', 'mistake', 'error', 'dispute', 'unfair'],
          emergency: ['emergency', 'urgent', 'critical', 'serious']
        },
        confidence: 0.95
      },

      // Greeting/social
      greeting: {
        patterns: [
          'hi', 'hello', 'hey', 'good morning', 'good afternoon',
          'good evening', 'thanks', 'thank you', 'bye', 'goodbye'
        ],
        subcategories: {
          greeting: ['hi', 'hello', 'hey', 'good'],
          thanks: ['thanks', 'thank you', 'appreciate'],
          goodbye: ['bye', 'goodbye', 'see you']
        },
        confidence: 0.8
      }
    };
  }

  /**
   * Classify a message and return intent with confidence
   */
  async classifyMessage(message) {
    const messageLower = message.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    // Check each intent category
    for (const [category, config] of Object.entries(this.intentPatterns)) {
      const score = this.calculateMatchScore(messageLower, config);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          category,
          confidence: score * config.confidence,
          subcategory: this.findSubcategory(messageLower, config.subcategories)
        };
      }
    }

    // If no good match found, classify as general inquiry
    if (!bestMatch || bestMatch.confidence < 0.3) {
      bestMatch = {
        category: 'general_inquiry',
        confidence: 0.5,
        subcategory: 'help'
      };
    }

    // Add additional context
    bestMatch.escalationLevel = this.determineEscalationLevel(messageLower, bestMatch);
    bestMatch.requiresRealData = this.requiresRealData(bestMatch.category);
    bestMatch.messageTone = this.analyzeTone(messageLower);

    console.log(`🎯 [Intent] Classified "${message.substring(0, 30)}..." as ${bestMatch.category} (${bestMatch.confidence.toFixed(2)})`);

    return bestMatch;
  }

  /**
   * Calculate match score for a category
   */
  calculateMatchScore(message, config) {
    let matchCount = 0;
    let totalPatterns = config.patterns.length;

    for (const pattern of config.patterns) {
      if (message.includes(pattern)) {
        matchCount++;
      }
    }

    return matchCount / totalPatterns;
  }

  /**
   * Find the best matching subcategory
   */
  findSubcategory(message, subcategories) {
    if (!subcategories) return 'general';

    let bestSubcategory = 'general';
    let bestScore = 0;

    for (const [subcategory, patterns] of Object.entries(subcategories)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        if (message.includes(pattern)) {
          matchCount++;
        }
      }

      const score = matchCount / patterns.length;
      if (score > bestScore) {
        bestScore = score;
        bestSubcategory = subcategory;
      }
    }

    return bestSubcategory;
  }

  /**
   * Determine if this intent requires escalation
   */
  determineEscalationLevel(message, intent) {
    // High-priority escalation triggers
    const urgentKeywords = [
      'urgent', 'emergency', 'asap', 'immediately',
      'angry', 'frustrated', 'complaint', 'dispute',
      'wrong', 'unfair', 'mistake', 'error'
    ];

    const mediumKeywords = [
      'problem', 'issue', 'trouble', 'not working',
      'help', 'confused', 'unclear'
    ];

    if (urgentKeywords.some(keyword => message.includes(keyword))) {
      return 'high';
    }

    if (mediumKeywords.some(keyword => message.includes(keyword))) {
      return 'medium';
    }

    // Default escalation level based on category
    const categoryEscalation = {
      escalation_urgent: 'critical',
      account_issue: 'medium',
      verification_status: 'medium',
      payment_inquiry: 'medium',
      withdrawal_request: 'medium'
    };

    return categoryEscalation[intent.category] || 'low';
  }

  /**
   * Determine if this intent requires real-time data
   */
  requiresRealData(category) {
    const realDataCategories = [
      'payment_inquiry',
      'withdrawal_request',
      'job_inquiry',
      'job_status',
      'verification_status'
    ];

    return realDataCategories.includes(category);
  }

  /**
   * Analyze message tone
   */
  analyzeTone(message) {
    const positiveWords = ['thank', 'please', 'appreciate', 'good', 'great', 'excellent'];
    const negativeWords = ['angry', 'frustrated', 'bad', 'terrible', 'awful', 'hate'];
    const neutralWords = ['question', 'help', 'information', 'status'];

    let positiveScore = positiveWords.reduce((score, word) =>
      score + (message.includes(word) ? 1 : 0), 0);

    let negativeScore = negativeWords.reduce((score, word) =>
      score + (message.includes(word) ? 1 : 0), 0);

    if (negativeScore > positiveScore) return 'negative';
    if (positiveScore > 0) return 'positive';
    return 'neutral';
  }

  /**
   * Get detailed intent analysis for admin dashboard
   */
  getIntentAnalysis(message) {
    const intent = this.classifyMessage(message);

    return {
      ...intent,
      patterns_matched: this.getMatchedPatterns(message.toLowerCase()),
      message_length: message.length,
      word_count: message.split(' ').length,
      has_question_words: this.hasQuestionWords(message),
      has_time_references: this.hasTimeReferences(message),
      has_amount_references: this.hasAmountReferences(message)
    };
  }

  getMatchedPatterns(message) {
    const matched = [];

    for (const [category, config] of Object.entries(this.intentPatterns)) {
      for (const pattern of config.patterns) {
        if (message.includes(pattern)) {
          matched.push({ category, pattern });
        }
      }
    }

    return matched;
  }

  hasQuestionWords(message) {
    const questionWords = ['how', 'what', 'when', 'where', 'why', 'which', 'who'];
    return questionWords.some(word => message.toLowerCase().includes(word));
  }

  hasTimeReferences(message) {
    const timeWords = ['when', 'time', 'hour', 'day', 'week', 'month', 'soon', 'now', 'later'];
    return timeWords.some(word => message.toLowerCase().includes(word));
  }

  hasAmountReferences(message) {
    const amountWords = ['how much', 'amount', 'total', 'balance', 'money', '$', 'dollar'];
    return amountWords.some(word => message.toLowerCase().includes(word));
  }
}

module.exports = IntentClassifier;