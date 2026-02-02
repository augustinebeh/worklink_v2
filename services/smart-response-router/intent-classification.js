/**
 * Intent Classification Engine
 *
 * Lightweight, fast intent classification that determines:
 * 1. What the user is asking about
 * 2. Whether we need real-time data
 * 3. Whether it requires admin escalation
 * 4. Confidence level in the classification
 *
 * Optimized for performance (<10ms classification time)
 * Uses pattern matching and keyword analysis instead of expensive ML models
 */

const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('intent-classification');

class IntentClassificationEngine {
  constructor() {
    this.initializeIntentPatterns();
    this.initializeEscalationTriggers();
    this.initializeRealDataRequirements();
  }

  /**
   * Initialize intent classification patterns
   */
  initializeIntentPatterns() {
    this.intentPatterns = {
      // Payment and earnings related
      payment_inquiry: {
        keywords: ['payment', 'pay', 'paid', 'money', 'salary', 'wage', 'earning', 'payout'],
        phrases: ['when will i get paid', 'payment status', 'my earnings', 'pending payment'],
        requiresRealData: true,
        priority: 'high',
        confidence: 0.9
      },

      balance_check: {
        keywords: ['balance', 'amount', 'how much', 'total earned', 'available'],
        phrases: ['check balance', 'my balance', 'available funds', 'total earnings'],
        requiresRealData: true,
        priority: 'high',
        confidence: 0.95
      },

      withdrawal_request: {
        keywords: ['withdraw', 'withdrawal', 'cash out', 'transfer', 'bank'],
        phrases: ['withdraw money', 'cash out', 'transfer funds', 'bank transfer'],
        requiresRealData: true,
        priority: 'high',
        confidence: 0.9
      },

      // Job and work related
      job_inquiry: {
        keywords: ['job', 'jobs', 'work', 'gig', 'opportunity', 'available', 'hiring'],
        phrases: ['any jobs', 'work available', 'find work', 'job opportunities'],
        requiresRealData: true,
        priority: 'medium',
        confidence: 0.85
      },

      job_status: {
        keywords: ['application', 'applied', 'job status', 'interview', 'selected'],
        phrases: ['application status', 'job application', 'interview result'],
        requiresRealData: true,
        priority: 'medium',
        confidence: 0.8
      },

      schedule_inquiry: {
        keywords: ['schedule', 'timing', 'when', 'time', 'shift', 'hours'],
        phrases: ['work schedule', 'shift times', 'when do i work'],
        requiresRealData: true,
        priority: 'medium',
        confidence: 0.8
      },

      // Account and verification
      account_verification: {
        keywords: ['verify', 'verification', 'approve', 'approval', 'pending', 'review', 'status'],
        phrases: ['account verification', 'verify account', 'pending approval', 'account status'],
        requiresRealData: false,
        priority: 'high',
        confidence: 0.9
      },

      profile_update: {
        keywords: ['update', 'change', 'profile', 'information', 'details', 'edit'],
        phrases: ['update profile', 'change information', 'edit details'],
        requiresRealData: false,
        priority: 'medium',
        confidence: 0.75
      },

      // Technical and support
      technical_issue: {
        keywords: ['bug', 'error', 'problem', 'issue', 'not working', 'broken', 'fix'],
        phrases: ['app not working', 'technical problem', 'bug report', 'error message'],
        requiresRealData: false,
        priority: 'high',
        confidence: 0.85,
        escalationRequired: true
      },

      app_navigation: {
        keywords: ['how to', 'where is', 'find', 'navigate', 'use app', 'help'],
        phrases: ['how to use', 'where do i find', 'help with app'],
        requiresRealData: false,
        priority: 'low',
        confidence: 0.7
      },

      // Communication and general
      greeting: {
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        phrases: ['hello', 'hi there', 'good morning', 'hey'],
        requiresRealData: false,
        priority: 'low',
        confidence: 0.95
      },

      complaint_feedback: {
        keywords: ['complaint', 'dissatisfied', 'unhappy', 'problem', 'issue', 'feedback', 'unfair'],
        phrases: ['not happy', 'complaint about', 'problem with', 'unfair treatment'],
        requiresRealData: false,
        priority: 'high',
        confidence: 0.9,
        escalationRequired: true
      },

      general_question: {
        keywords: ['what', 'how', 'why', 'when', 'where', 'question'],
        phrases: ['i have a question', 'can you tell me', 'what is', 'how does'],
        requiresRealData: false,
        priority: 'medium',
        confidence: 0.6
      },

      // Scheduling and interview (for pending candidates)
      interview_scheduling: {
        keywords: ['interview', 'schedule', 'meet', 'talk', 'call', 'appointment'],
        phrases: ['schedule interview', 'book appointment', 'arrange meeting'],
        requiresRealData: false,
        priority: 'high',
        confidence: 0.9,
        pendingCandidateOnly: true
      },

      availability_sharing: {
        keywords: ['available', 'free', 'time', 'morning', 'afternoon', 'evening', 'today', 'tomorrow'],
        phrases: ['i am available', 'free time', 'good time', 'available for'],
        requiresRealData: false,
        priority: 'high',
        confidence: 0.8,
        pendingCandidateOnly: true
      }
    };
  }

  /**
   * Initialize escalation triggers
   */
  initializeEscalationTriggers() {
    this.escalationTriggers = {
      urgency: ['urgent', 'emergency', 'asap', 'immediately', 'right now', 'quickly'],
      emotion: ['angry', 'frustrated', 'upset', 'disappointed', 'mad', 'furious'],
      complaints: ['complaint', 'complain', 'unfair', 'wrong', 'cheated', 'scammed'],
      cancellation: ['cancel', 'quit', 'leave', 'delete account', 'unsubscribe'],
      complex: ['complicated', 'complex', 'detailed explanation', 'long story'],
      legal: ['legal', 'lawyer', 'court', 'sue', 'rights', 'illegal']
    };
  }

  /**
   * Initialize patterns that require real-time data
   */
  initializeRealDataRequirements() {
    this.realDataRequiredIntents = [
      'payment_inquiry',
      'balance_check',
      'withdrawal_request',
      'job_inquiry',
      'job_status',
      'schedule_inquiry'
    ];
  }

  /**
   * Main intent analysis function
   */
  async analyzeMessage(message, candidateContext, realData) {
    const startTime = Date.now();

    try {
      logger.debug('Starting intent analysis', {
        candidateId: candidateContext?.id,
        messageLength: message.length
      });

      // Clean and prepare message for analysis
      const cleanMessage = this.cleanMessage(message);

      // Perform multiple analysis approaches
      const [
        patternMatch,
        keywordAnalysis,
        contextualAnalysis,
        escalationCheck
      ] = await Promise.all([
        this.performPatternMatching(cleanMessage),
        this.performKeywordAnalysis(cleanMessage),
        this.performContextualAnalysis(cleanMessage, candidateContext),
        this.checkEscalationTriggers(cleanMessage)
      ]);

      // Combine results to determine primary intent
      const combinedAnalysis = this.combineAnalysisResults(
        patternMatch,
        keywordAnalysis,
        contextualAnalysis,
        escalationCheck,
        candidateContext
      );

      const analysisTime = Date.now() - startTime;

      logger.debug('Intent analysis complete', {
        candidateId: candidateContext?.id,
        primaryIntent: combinedAnalysis.primary,
        confidence: combinedAnalysis.confidence,
        analysisTime: `${analysisTime}ms`
      });

      return {
        ...combinedAnalysis,
        analysisTimeMs: analysisTime,
        originalMessage: message,
        cleanMessage
      };

    } catch (error) {
      logger.error('Intent analysis failed', {
        candidateId: candidateContext?.id,
        error: error.message
      });

      // Return safe fallback
      return {
        primary: 'general_question',
        secondary: [],
        confidence: 0.3,
        requiresRealData: false,
        requiresEscalation: true,
        escalationReason: 'analysis_error',
        error: true
      };
    }
  }

  /**
   * Clean message for analysis
   */
  cleanMessage(message) {
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ')     // Normalize spaces
      .trim();
  }

  /**
   * Perform pattern matching against known intent patterns
   */
  async performPatternMatching(cleanMessage) {
    const matches = [];

    for (const [intentName, config] of Object.entries(this.intentPatterns)) {
      let score = 0;

      // Check exact phrase matches (highest weight)
      const phraseMatches = config.phrases.filter(phrase =>
        cleanMessage.includes(phrase.toLowerCase())
      );
      score += phraseMatches.length * 0.5;

      // Check keyword matches
      const keywordMatches = config.keywords.filter(keyword =>
        cleanMessage.includes(keyword.toLowerCase())
      );
      score += keywordMatches.length * 0.3;

      // Calculate confidence based on score and pattern
      const confidence = Math.min(score, 1.0) * (config.confidence || 0.8);

      if (score > 0) {
        matches.push({
          intent: intentName,
          score,
          confidence,
          matchedPhrases: phraseMatches,
          matchedKeywords: keywordMatches,
          config
        });
      }
    }

    // Sort by confidence score
    matches.sort((a, b) => b.confidence - a.confidence);

    return {
      topMatch: matches[0] || null,
      allMatches: matches,
      totalMatches: matches.length
    };
  }

  /**
   * Perform keyword frequency analysis
   */
  async performKeywordAnalysis(cleanMessage) {
    const words = cleanMessage.split(' ').filter(word => word.length > 2);
    const wordFrequency = {};

    // Count word frequencies
    words.forEach(word => {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    });

    // Analyze against intent keywords
    const intentScores = {};

    for (const [intentName, config] of Object.entries(this.intentPatterns)) {
      let score = 0;

      config.keywords.forEach(keyword => {
        if (wordFrequency[keyword.toLowerCase()]) {
          score += wordFrequency[keyword.toLowerCase()] * 0.2;
        }
      });

      if (score > 0) {
        intentScores[intentName] = score;
      }
    }

    return {
      wordFrequency,
      intentScores,
      dominantWords: Object.keys(wordFrequency)
        .sort((a, b) => wordFrequency[b] - wordFrequency[a])
        .slice(0, 5)
    };
  }

  /**
   * Perform contextual analysis based on candidate status and history
   */
  async performContextualAnalysis(cleanMessage, candidateContext) {
    const contextualFactors = {};

    // Candidate status context
    if (candidateContext) {
      contextualFactors.candidateStatus = candidateContext.status;

      // Pending candidates are more likely asking about verification
      if (candidateContext.status === 'pending') {
        contextualFactors.pendingCandidateBoost = {
          account_verification: 0.2,
          interview_scheduling: 0.3,
          availability_sharing: 0.2
        };
      }

      // Active candidates more likely asking about work
      if (candidateContext.status === 'active') {
        contextualFactors.activeCandidateBoost = {
          job_inquiry: 0.2,
          payment_inquiry: 0.2,
          schedule_inquiry: 0.15
        };
      }

      // Time-based context
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 17) {
        contextualFactors.workingHoursBoost = {
          job_inquiry: 0.1,
          interview_scheduling: 0.15
        };
      }
    }

    return contextualFactors;
  }

  /**
   * Check for escalation triggers
   */
  async checkEscalationTriggers(cleanMessage) {
    const escalationSignals = {
      urgency: 0,
      emotion: 0,
      complaints: 0,
      cancellation: 0,
      complex: 0,
      legal: 0
    };

    let totalEscalationScore = 0;
    const triggeredReasons = [];

    for (const [category, triggers] of Object.entries(this.escalationTriggers)) {
      const matchedTriggers = triggers.filter(trigger =>
        cleanMessage.includes(trigger.toLowerCase())
      );

      if (matchedTriggers.length > 0) {
        escalationSignals[category] = matchedTriggers.length;
        totalEscalationScore += matchedTriggers.length;
        triggeredReasons.push({
          category,
          triggers: matchedTriggers
        });
      }
    }

    const requiresEscalation = totalEscalationScore > 0;
    const escalationUrgency = totalEscalationScore >= 2 ? 'high' : 'medium';

    return {
      requiresEscalation,
      escalationScore: totalEscalationScore,
      escalationUrgency,
      signals: escalationSignals,
      triggeredReasons
    };
  }

  /**
   * Combine all analysis results into final intent classification
   */
  combineAnalysisResults(patternMatch, keywordAnalysis, contextualAnalysis, escalationCheck, candidateContext) {
    let primaryIntent = 'general_question';
    let confidence = 0.3;
    let secondaryIntents = [];

    // Start with pattern matching results
    if (patternMatch.topMatch) {
      primaryIntent = patternMatch.topMatch.intent;
      confidence = patternMatch.topMatch.confidence;

      // Add secondary intents
      secondaryIntents = patternMatch.allMatches
        .slice(1, 4) // Top 3 alternatives
        .map(match => ({
          intent: match.intent,
          confidence: match.confidence
        }));
    }

    // Apply contextual boosts
    if (candidateContext) {
      const boosts = contextualAnalysis.pendingCandidateBoost ||
                     contextualAnalysis.activeCandidateBoost ||
                     contextualAnalysis.workingHoursBoost ||
                     {};

      if (boosts[primaryIntent]) {
        confidence = Math.min(1.0, confidence + boosts[primaryIntent]);
      }
    }

    // Check for forced escalation
    let requiresEscalation = escalationCheck.requiresEscalation;
    let escalationReason = null;

    if (escalationCheck.requiresEscalation) {
      escalationReason = escalationCheck.triggeredReasons
        .map(r => r.category)
        .join(', ');
      requiresEscalation = true;
    }

    // Check if intent pattern requires escalation
    const intentConfig = this.intentPatterns[primaryIntent];
    if (intentConfig?.escalationRequired) {
      requiresEscalation = true;
      escalationReason = escalationReason ?
        `${escalationReason}, intent_pattern` :
        'intent_pattern';
    }

    // Check if requires real data
    const requiresRealData = this.realDataRequiredIntents.includes(primaryIntent) ||
                            intentConfig?.requiresRealData;

    return {
      primary: primaryIntent,
      secondary: secondaryIntents,
      confidence,
      requiresRealData,
      requiresEscalation,
      escalationReason,
      escalationUrgency: escalationCheck.escalationUrgency,
      metadata: {
        patternMatches: patternMatch.totalMatches,
        escalationScore: escalationCheck.escalationScore,
        contextApplied: Object.keys(contextualAnalysis).length > 0
      }
    };
  }

  /**
   * Get intent configuration
   */
  getIntentConfig(intentName) {
    return this.intentPatterns[intentName] || null;
  }

  /**
   * Performance monitoring
   */
  getClassificationStats() {
    return {
      totalIntents: Object.keys(this.intentPatterns).length,
      realDataIntents: this.realDataRequiredIntents.length,
      escalationIntents: Object.keys(this.intentPatterns)
        .filter(intent => this.intentPatterns[intent].escalationRequired)
        .length,
      escalationTriggerCategories: Object.keys(this.escalationTriggers).length
    };
  }
}

module.exports = IntentClassificationEngine;