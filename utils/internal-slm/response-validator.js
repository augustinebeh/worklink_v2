/**
 * Response Validator
 * Ensures all SLM responses meet quality and safety standards
 */

class ResponseValidator {
  constructor() {
    this.validationRules = this.buildValidationRules();
    this.bannedPhrases = this.buildBannedPhrases();
    this.requiredFields = ['content', 'intent', 'confidence', 'messageType'];
    this.maxContentLength = 500;
    this.minContentLength = 10;
  }

  /**
   * Validate SLM response
   */
  validateResponse(response) {
    try {
      // Basic structure validation
      if (!this.validateStructure(response)) {
        return false;
      }

      // Content validation
      if (!this.validateContent(response.content)) {
        return false;
      }

      // Anti-promise validation
      if (!this.validateAntiPromiseRules(response.content)) {
        return false;
      }

      // Confidence validation
      if (!this.validateConfidence(response.confidence)) {
        return false;
      }

      // Intent validation
      if (!this.validateIntent(response.intent)) {
        return false;
      }

      // Safety validation
      if (!this.validateSafety(response.content)) {
        return false;
      }

      // Length validation
      if (!this.validateLength(response.content)) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('Response validation error:', error);
      return false;
    }
  }

  /**
   * Build validation rules
   */
  buildValidationRules() {
    return {
      structure: {
        requiredFields: ['content', 'intent', 'confidence', 'messageType'],
        optionalFields: ['nextActions', 'conversationFlow', 'escalate', 'interview']
      },
      content: {
        minLength: 10,
        maxLength: 500,
        allowedCharacters: /^[a-zA-Z0-9\s\.\!\?\,\;\:\(\)\[\]\{\}\-\_\@\#\$\%\&\*\+\=\~\`\|\\\/"'\n\r\u{1F300}-\u{1F9FF}]+$/u
      },
      confidence: {
        min: 0.0,
        max: 1.0
      },
      intent: {
        validIntents: [
          'greeting', 'interview_scheduling', 'availability_sharing', 'confirm_booking',
          'payment_inquiry', 'job_inquiry', 'account_verification', 'reschedule',
          'general_question', 'complaint_feedback', 'escalate', 'clarify_selection',
          'offer_slots', 'booking_confirmed', 'system_error'
        ]
      }
    };
  }

  /**
   * Build banned phrases that violate anti-promise rules
   */
  buildBannedPhrases() {
    return [
      // Timing promises
      'usually arrive within 24 hours',
      'within 72 hours max',
      'will be processed in',
      'typically takes',
      'should receive within',
      'will be approved in',
      'usually approved within',

      // Auto-action claims
      'i\'ve checked',
      'i\'ve notified',
      'i\'ve contacted',
      'i\'ve sent',
      'i\'ve updated',
      'i\'ve processed',
      'system will auto-approve',
      'auto-approve',
      'automatically approved',

      // False guarantees
      'guaranteed',
      'definitely will',
      'promise you',
      'will definitely',
      'for sure will',
      'certainly will happen',

      // Payment promises
      'payment will arrive',
      'you will be paid',
      'money will be transferred',
      'will receive payment',

      // Job promises
      'you will get the job',
      'job is guaranteed',
      'will definitely hire',

      // System promises
      'system has confirmed',
      'database shows',
      'our records indicate',
      'status has been updated'
    ];
  }

  /**
   * Validate response structure
   */
  validateStructure(response) {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Check required fields
    for (const field of this.requiredFields) {
      if (!(field in response)) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate content quality
   */
  validateContent(content) {
    if (typeof content !== 'string') {
      return false;
    }

    // Check for empty or whitespace-only content
    if (!content.trim()) {
      return false;
    }

    // Check character set (allow emojis)
    if (!this.validationRules.content.allowedCharacters.test(content)) {
      console.warn('Content contains invalid characters');
      return false;
    }

    // Check for repetitive content
    if (this.isRepetitive(content)) {
      console.warn('Content appears repetitive');
      return false;
    }

    return true;
  }

  /**
   * Validate anti-promise rules
   */
  validateAntiPromiseRules(content) {
    const lowerContent = content.toLowerCase();

    // Check for banned phrases
    for (const phrase of this.bannedPhrases) {
      if (lowerContent.includes(phrase.toLowerCase())) {
        console.warn(`Banned phrase detected: "${phrase}"`);
        return false;
      }
    }

    // Check for timing commitments
    const timingPatterns = [
      /\d+\s*(hour|minute|day|week)s?\s*(later|from now)/i,
      /within\s*\d+\s*(hour|minute|day|week)/i,
      /in\s*\d+\s*(hour|minute|day|week)/i,
      /(will|should|usually)\s*(take|arrive|be processed)\s*\d+/i
    ];

    for (const pattern of timingPatterns) {
      if (pattern.test(content)) {
        console.warn('Timing commitment detected');
        return false;
      }
    }

    // Check for action claims
    const actionPatterns = [
      /i('ve|'ll|'m going to)\s*(check|notify|contact|send|update|process)/i,
      /system\s*(will|has)\s*(auto|automatically)/i,
      /database\s*(shows|indicates|confirms)/i
    ];

    for (const pattern of actionPatterns) {
      if (pattern.test(content)) {
        console.warn('Action claim detected');
        return false;
      }
    }

    return true;
  }

  /**
   * Validate confidence score
   */
  validateConfidence(confidence) {
    if (typeof confidence !== 'number') {
      return false;
    }

    return confidence >= this.validationRules.confidence.min &&
           confidence <= this.validationRules.confidence.max;
  }

  /**
   * Validate intent
   */
  validateIntent(intent) {
    if (typeof intent !== 'string') {
      return false;
    }

    return this.validationRules.intent.validIntents.includes(intent);
  }

  /**
   * Validate safety (no harmful content)
   */
  validateSafety(content) {
    const lowerContent = content.toLowerCase();

    // Check for inappropriate content
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|bitch|asshole|cunt)\b/i,
      /\b(kill|die|suicide|death)\b/i,
      /\b(hate|racist|sexist)\b/i
    ];

    for (const pattern of inappropriatePatterns) {
      if (pattern.test(content)) {
        console.warn('Inappropriate content detected');
        return false;
      }
    }

    // Check for spam-like content
    if (this.isSpamLike(content)) {
      console.warn('Spam-like content detected');
      return false;
    }

    return true;
  }

  /**
   * Validate content length
   */
  validateLength(content) {
    const length = content.trim().length;
    return length >= this.minContentLength && length <= this.maxContentLength;
  }

  /**
   * Check if content is repetitive
   */
  isRepetitive(content) {
    const words = content.toLowerCase().split(/\s+/);
    const wordCounts = {};

    for (const word of words) {
      if (word.length > 3) { // Only count significant words
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    // Check if any word appears too frequently
    const maxRepeats = Math.max(3, Math.floor(words.length / 5));
    return Object.values(wordCounts).some(count => count > maxRepeats);
  }

  /**
   * Check if content is spam-like
   */
  isSpamLike(content) {
    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?.,;:]/g) || []).length / content.length;
    if (punctuationRatio > 0.3) {
      return true;
    }

    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5 && content.length > 20) {
      return true;
    }

    // Check for excessive emojis
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
    if (emojiCount > 5) {
      return true;
    }

    return false;
  }

  /**
   * Suggest improvements for failed validation
   */
  suggestImprovements(response) {
    const suggestions = [];

    if (!this.validateStructure(response)) {
      suggestions.push('Add missing required fields: ' + this.requiredFields.join(', '));
    }

    if (response.content) {
      if (!this.validateLength(response.content)) {
        suggestions.push(`Adjust content length (current: ${response.content.length}, allowed: ${this.minContentLength}-${this.maxContentLength})`);
      }

      if (!this.validateAntiPromiseRules(response.content)) {
        suggestions.push('Remove timing commitments and action claims');
      }

      if (!this.validateSafety(response.content)) {
        suggestions.push('Remove inappropriate or spam-like content');
      }
    }

    if (response.confidence !== undefined && !this.validateConfidence(response.confidence)) {
      suggestions.push('Set confidence between 0.0 and 1.0');
    }

    if (response.intent && !this.validateIntent(response.intent)) {
      suggestions.push('Use valid intent: ' + this.validationRules.intent.validIntents.join(', '));
    }

    return suggestions;
  }

  /**
   * Clean response to meet validation standards
   */
  cleanResponse(response) {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const cleaned = { ...response };

    // Clean content
    if (cleaned.content) {
      cleaned.content = this.cleanContent(cleaned.content);
    }

    // Ensure required fields
    if (!cleaned.confidence || !this.validateConfidence(cleaned.confidence)) {
      cleaned.confidence = 0.8;
    }

    if (!cleaned.intent || !this.validateIntent(cleaned.intent)) {
      cleaned.intent = 'general_question';
    }

    if (!cleaned.messageType) {
      cleaned.messageType = 'standard_response';
    }

    return cleaned;
  }

  /**
   * Clean content text
   */
  cleanContent(content) {
    if (typeof content !== 'string') {
      return '';
    }

    let cleaned = content
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, this.maxContentLength); // Truncate if too long

    // Remove banned phrases
    for (const phrase of this.bannedPhrases) {
      const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      cleaned = cleaned.replace(regex, '[removed]');
    }

    // Clean up multiple punctuation
    cleaned = cleaned.replace(/([!?]){3,}/g, '$1$1');

    return cleaned;
  }
}

// Export the validator function
function validateResponse(response) {
  const validator = new ResponseValidator();
  return validator.validateResponse(response);
}

module.exports = { validateResponse, ResponseValidator };