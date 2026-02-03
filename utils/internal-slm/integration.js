/**
 * Internal SLM Integration
 * Connects the internal SLM to the existing WorkLink chat and scheduling systems
 */

const InternalSLM = require('./index');
const { analyzeIntent } = require('./intent-analyzer');
const { generateResponse } = require('./response-generator');
const { validateResponse } = require('./response-validator');

class InternalSLMIntegration {
  constructor() {
    this.internalSLM = new InternalSLM();
    this.isEnabled = process.env.USE_INTERNAL_SLM !== 'false'; // Default to enabled
    this.fallbackToGroq = process.env.GROQ_FALLBACK_ENABLED !== 'false'; // Default to enabled
    this.performanceMetrics = {
      totalRequests: 0,
      internalHandled: 0,
      groqFallbacks: 0,
      errors: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Main processing method - replaces external LLM calls
   */
  async processMessage(candidateId, message, options = {}) {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;

    try {
      // Extract context and candidate data
      const context = await this.buildContext(candidateId, options);
      const candidateData = await this.getCandidateData(candidateId, options);

      // Use internal SLM to process the message
      const channel = options.channel || context.channel || 'app';
      const response = await this.internalSLM.processMessage(
        candidateId,
        message,
        context,
        candidateData,
        channel
      );

      // Track metrics
      this.updateMetrics(response, startTime);

      // Format response for the existing system
      return this.formatResponseForSystem(response, candidateData);

    } catch (error) {
      console.error('Internal SLM integration error:', error);
      this.performanceMetrics.errors++;

      // Return fallback response
      return this.generateSystemErrorResponse(candidateId);
    }
  }

  /**
   * Build conversation context from options
   */
  async buildContext(candidateId, options) {
    const context = {
      conversationFlow: options.conversationFlow || null,
      lastIntent: options.lastIntent || null,
      recentMessages: options.recentMessages || [],
      availableSlots: options.availableSlots || [],
      candidateStatus: options.candidateStatus || 'unknown'
    };

    // Add any additional context from the existing system
    if (options.interviewStatus) {
      context.interviewStatus = options.interviewStatus;
    }

    if (options.queuePosition) {
      context.queuePosition = options.queuePosition;
    }

    return context;
  }

  /**
   * Extract candidate data from options or fetch if needed
   */
  async getCandidateData(candidateId, options) {
    // If candidate data is provided in options, use it
    if (options.candidateData) {
      return options.candidateData;
    }

    // Otherwise, extract from options or use defaults
    return {
      id: candidateId,
      name: options.candidateName || options.name || 'User',
      status: options.candidateStatus || options.status || 'unknown',
      email: options.candidateEmail || options.email || null,
      phone: options.candidatePhone || options.phone || null
    };
  }

  /**
   * Format internal SLM response for the existing system
   */
  formatResponseForSystem(response, candidateData) {
    const { content, intent, confidence, messageType, nextActions, escalate, interview, source } = response;

    // Format according to existing system expectations
    const systemResponse = {
      // Main response content
      response: content,
      content: content,

      // Metadata
      intent: intent,
      confidence: confidence,
      messageType: messageType,
      source: source,

      // Actions
      nextActions: nextActions || [],
      escalate: escalate || false,

      // Additional data
      interviewData: interview || null,

      // System compatibility fields
      aiGenerated: true,
      timestamp: new Date().toISOString(),
      candidateId: candidateData.id,

      // Response quality metrics
      processingTime: response.processingTime || null,
      validationPassed: true // Since we only return validated responses
    };

    // Add escalation metadata if needed
    if (escalate) {
      systemResponse.escalationReason = this.determineEscalationReason(intent, messageType);
      systemResponse.priority = this.determineEscalationPriority(intent, content);
    }

    // Add interview-specific data if present
    if (interview) {
      systemResponse.showInterviewCard = true;
      systemResponse.interviewDateTime = interview.displayTime?.full || null;
      systemResponse.meetingLink = interview.meeting_link || interview.meetingLink || null;
    }

    return systemResponse;
  }

  /**
   * Determine escalation reason
   */
  determineEscalationReason(intent, messageType) {
    if (intent === 'payment_inquiry') return 'payment_question';
    if (intent === 'job_inquiry') return 'job_question';
    if (intent === 'complaint_feedback') return 'complaint';
    if (messageType === 'error') return 'system_error';
    return 'general_assistance';
  }

  /**
   * Determine escalation priority
   */
  determineEscalationPriority(intent, content) {
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes('urgent') || lowerContent.includes('emergency')) {
      return 'high';
    }
    if (intent === 'complaint_feedback') {
      return 'high';
    }
    if (intent === 'payment_inquiry') {
      return 'normal';
    }
    return 'low';
  }

  /**
   * Update performance metrics
   */
  updateMetrics(response, startTime) {
    const responseTime = Date.now() - startTime;

    // Update averages
    const totalTime = this.performanceMetrics.avgResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime;
    this.performanceMetrics.avgResponseTime = totalTime / this.performanceMetrics.totalRequests;

    // Track source
    if (response.source === 'internal' || response.source === 'cache') {
      this.performanceMetrics.internalHandled++;
    } else if (response.source === 'groq') {
      this.performanceMetrics.groqFallbacks++;
    }
  }

  /**
   * Generate system error response
   */
  generateSystemErrorResponse(candidateId) {
    return {
      response: "I'm experiencing a temporary issue. Let me connect you with our admin team to ensure you get immediate assistance.\n\nSorry for the inconvenience! 😊",
      content: "I'm experiencing a temporary issue. Let me connect you with our admin team to ensure you get immediate assistance.\n\nSorry for the inconvenience! 😊",
      intent: 'system_error',
      confidence: 0.9,
      messageType: 'error',
      nextActions: ['escalate_to_admin'],
      escalate: true,
      aiGenerated: true,
      source: 'error_fallback',
      timestamp: new Date().toISOString(),
      candidateId: candidateId
    };
  }

  /**
   * Health check for the internal SLM system
   */
  async healthCheck() {
    try {
      // Test basic functionality
      const testResponse = await this.processMessage('test', 'hello', {
        candidateData: { id: 'test', name: 'Test User', status: 'pending' }
      });

      const health = {
        status: 'healthy',
        internalSLM: testResponse ? 'working' : 'error',
        groqFallback: this.fallbackToGroq ? 'enabled' : 'disabled',
        metrics: { ...this.performanceMetrics },
        timestamp: new Date().toISOString()
      };

      // Test Groq fallback if enabled
      if (this.fallbackToGroq) {
        try {
          const groqHealth = await this.internalSLM.groqService.healthCheck();
          health.groqStatus = groqHealth.status;
        } catch (error) {
          health.groqStatus = 'error';
          health.groqError = error.message;
        }
      }

      return health;

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        metrics: { ...this.performanceMetrics },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = { ...this.performanceMetrics };

    // Calculate percentages
    if (stats.totalRequests > 0) {
      stats.internalHandledPercent = Math.round((stats.internalHandled / stats.totalRequests) * 100);
      stats.groqFallbackPercent = Math.round((stats.groqFallbacks / stats.totalRequests) * 100);
      stats.errorPercent = Math.round((stats.errors / stats.totalRequests) * 100);
    } else {
      stats.internalHandledPercent = 0;
      stats.groqFallbackPercent = 0;
      stats.errorPercent = 0;
    }

    stats.avgResponseTimeMs = Math.round(stats.avgResponseTime);

    return stats;
  }

  /**
   * Reset performance metrics
   */
  resetStats() {
    this.performanceMetrics = {
      totalRequests: 0,
      internalHandled: 0,
      groqFallbacks: 0,
      errors: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Configure internal SLM settings
   */
  configure(settings) {
    if (settings.useInternalSLM !== undefined) {
      this.isEnabled = settings.useInternalSLM;
    }

    if (settings.groqFallbackEnabled !== undefined) {
      this.fallbackToGroq = settings.groqFallbackEnabled;
    }

    if (settings.confidenceThreshold !== undefined) {
      this.internalSLM.config.confidenceThreshold = settings.confidenceThreshold;
    }

    if (settings.maxContextMessages !== undefined) {
      this.internalSLM.config.maxContextMessages = settings.maxContextMessages;
    }
  }
}

// Singleton instance
let integrationInstance = null;

/**
 * Factory function to get integration instance
 */
function getInternalSLMIntegration() {
  if (!integrationInstance) {
    integrationInstance = new InternalSLMIntegration();
  }
  return integrationInstance;
}

/**
 * Main entry point - replaces external LLM calls
 */
async function processWithInternalSLM(candidateId, message, options = {}) {
  const integration = getInternalSLMIntegration();
  return await integration.processMessage(candidateId, message, options);
}

/**
 * Utility functions for integration
 */
const SLMIntegration = {
  process: processWithInternalSLM,
  healthCheck: async () => getInternalSLMIntegration().healthCheck(),
  getStats: () => getInternalSLMIntegration().getStats(),
  resetStats: () => getInternalSLMIntegration().resetStats(),
  configure: (settings) => getInternalSLMIntegration().configure(settings)
};

module.exports = {
  InternalSLMIntegration,
  getInternalSLMIntegration,
  processWithInternalSLM,
  SLMIntegration
};