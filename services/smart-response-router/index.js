/**
 * Smart Response Router - Core Architecture
 *
 * Replaces the existing ML/SLM chat system with an honest, reliable response routing system.
 *
 * Architecture:
 * 1. Intent Classification Engine - Determines message intent
 * 2. Real Data Access Layer - Fetches current user information
 * 3. Response Type Router - Routes to appropriate response system
 * 4. Fact-Based Template System - Generates responses using only verified data
 * 5. Admin Escalation System - Handles complex queries requiring human attention
 * 6. Interview Scheduling Integration - For pending candidates
 *
 * Key Principles:
 * - NO false promises or guarantees
 * - ONLY use real, current data
 * - Escalate when unsure rather than fabricate
 * - Maintain transparency with users
 * - Performance optimized for <100ms response times
 */

const IntentClassificationEngine = require('./intent-classification');
const RealDataAccessLayer = require('./real-data-access');
const FactBasedTemplateSystem = require('./fact-based-templates');
const AdminEscalationSystem = require('./admin-escalation');
const InterviewSchedulingBridge = require('../../utils/slm-scheduling-bridge');
const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('smart-response-router');

class SmartResponseRouter {
  constructor() {
    // Initialize core components
    this.intentClassifier = new IntentClassificationEngine();
    this.dataAccess = new RealDataAccessLayer();
    this.templateSystem = new FactBasedTemplateSystem();
    this.escalationSystem = new AdminEscalationSystem();
    this.schedulingBridge = new InterviewSchedulingBridge();

    // Response routing configuration
    this.routingConfig = {
      // Performance targets
      maxResponseTime: 100, // milliseconds
      escalationThreshold: 0.3, // confidence threshold for escalation

      // A/B testing configuration for gradual rollout
      rolloutPercentage: 100, // Start with 100% for full rollout
      fallbackToOldSystem: false,

      // Quality assurance flags
      preventFalsePromises: true,
      requireRealDataForCritical: true,
      logAllDecisions: true
    };

    // Initialize response type priorities
    this.responseTypePriority = [
      'pending_candidate_scheduling', // Highest priority
      'admin_escalation',
      'fact_based_real_data',
      'fact_based_template',
      'general_helpful',
      'escalate_fallback' // Lowest priority - never fabricate
    ];
  }

  /**
   * Main entry point for processing candidate messages
   * Replaces the existing generateResponse function in ai-chat/index.js
   */
  async processMessage(candidateId, message, options = {}) {
    const startTime = Date.now();

    try {
      logger.info('Processing message with Smart Response Router', {
        candidateId,
        messageLength: message.length,
        channel: options.channel
      });

      // A/B Testing check - for gradual rollout
      if (!this.shouldUseSmartRouter(candidateId)) {
        return this.fallbackToOldSystem(candidateId, message, options);
      }

      // Step 1: Get candidate context and real data
      const [candidateContext, realData] = await Promise.all([
        this.dataAccess.getCandidateContext(candidateId),
        this.dataAccess.getRealCandidateData(candidateId)
      ]);

      if (!candidateContext) {
        return this.generateErrorResponse('candidate_not_found');
      }

      // Step 2: Classify message intent
      const intentAnalysis = await this.intentClassifier.analyzeMessage(
        message,
        candidateContext,
        realData
      );

      logger.debug('Intent analysis complete', {
        candidateId,
        primaryIntent: intentAnalysis.primary,
        confidence: intentAnalysis.confidence
      });

      // Step 3: Route to appropriate response system based on candidate status and intent
      const response = await this.routeToResponseSystem(
        candidateContext,
        realData,
        intentAnalysis,
        message,
        options
      );

      // Step 4: Quality assurance check
      const qualityCheckedResponse = await this.performQualityCheck(response, intentAnalysis);

      // Step 5: Log decision for monitoring and optimization
      await this.logRoutingDecision(candidateId, message, intentAnalysis, qualityCheckedResponse);

      const responseTime = Date.now() - startTime;

      logger.info('Smart Response Router processing complete', {
        candidateId,
        responseType: qualityCheckedResponse.source,
        intent: intentAnalysis.primary,
        responseTime: `${responseTime}ms`,
        confidence: qualityCheckedResponse.confidence
      });

      return {
        ...qualityCheckedResponse,
        responseTimeMs: responseTime,
        routedBy: 'smart-response-router',
        intentAnalysis,
        usesRealData: qualityCheckedResponse.usesRealData || false
      };

    } catch (error) {
      logger.error('Smart Response Router error', {
        candidateId,
        error: error.message,
        stack: error.stack
      });

      // Critical failure - always escalate rather than risk false information
      return this.generateCriticalErrorResponse(candidateId, error);
    }
  }

  /**
   * Route message to the most appropriate response system
   */
  async routeToResponseSystem(candidateContext, realData, intentAnalysis, message, options) {
    logger.debug('Routing to response system', {
      candidateId: candidateContext.id,
      candidateStatus: candidateContext.status,
      intent: intentAnalysis.primary,
      confidence: intentAnalysis.confidence
    });

    // PRIORITY 1: Pending candidates with interview scheduling
    if (candidateContext.status === 'pending') {
      logger.info('Routing pending candidate to interview scheduling', {
        candidateId: candidateContext.id
      });

      return await this.handlePendingCandidateScheduling(
        candidateContext,
        message,
        intentAnalysis
      );
    }

    // PRIORITY 2: Low confidence or complex queries requiring escalation
    if (intentAnalysis.confidence < this.routingConfig.escalationThreshold ||
        intentAnalysis.requiresEscalation) {
      logger.info('Routing to admin escalation', {
        candidateId: candidateContext.id,
        reason: intentAnalysis.confidence < this.routingConfig.escalationThreshold ?
          'low_confidence' : 'requires_escalation'
      });

      return await this.escalationSystem.createEscalation(
        candidateContext,
        message,
        intentAnalysis
      );
    }

    // PRIORITY 3: Critical queries requiring real data
    if (intentAnalysis.requiresRealData) {
      logger.info('Routing to fact-based real data response', {
        candidateId: candidateContext.id,
        intent: intentAnalysis.primary
      });

      return await this.generateFactBasedRealDataResponse(
        candidateContext,
        realData,
        intentAnalysis,
        message
      );
    }

    // PRIORITY 4: Standard queries with template responses
    if (intentAnalysis.confidence >= 0.7) {
      logger.info('Routing to fact-based template response', {
        candidateId: candidateContext.id,
        intent: intentAnalysis.primary
      });

      return await this.templateSystem.generateResponse(
        intentAnalysis.primary,
        candidateContext,
        realData,
        message
      );
    }

    // FALLBACK: Always escalate rather than risk providing incorrect information
    logger.warn('No clear routing path found, escalating to admin', {
      candidateId: candidateContext.id,
      intent: intentAnalysis.primary,
      confidence: intentAnalysis.confidence
    });

    return await this.escalationSystem.createEscalation(
      candidateContext,
      message,
      { ...intentAnalysis, escalationReason: 'routing_uncertainty' }
    );
  }

  /**
   * Handle pending candidates with interview scheduling integration
   */
  async handlePendingCandidateScheduling(candidateContext, message, intentAnalysis) {
    try {
      logger.info('Routing pending candidate to SLM scheduling bridge', {
        candidateId: candidateContext.id,
        intent: intentAnalysis.primary
      });

      // Call SLM scheduling bridge directly - this is the primary system for pending candidates
      const schedulingResponse = await this.schedulingBridge.handlePendingCandidateMessage(
        candidateContext.id,
        message,
        {
          platform: 'smart_router',
          intentAnalysis,
          candidateContext
        }
      );

      // Verify SLM bridge health and response quality
      if (schedulingResponse && this.verifySLMResponse(schedulingResponse)) {
        logger.info('SLM bridge provided valid response', {
          candidateId: candidateContext.id,
          responseType: schedulingResponse.type,
          hasSchedulingContext: !!schedulingResponse.schedulingContext
        });

        return {
          content: schedulingResponse.content,
          source: 'slm_scheduling_bridge',
          confidence: 0.95,
          intent: schedulingResponse.type || intentAnalysis.primary,
          metadata: schedulingResponse.metadata || {},
          isPendingUser: true,
          canScheduleInterview: true,
          usesRealData: false, // SLM scheduling uses intelligent templates
          schedulingContext: schedulingResponse.schedulingContext,
          slmBridgeUsed: true
        };
      }

      // SLM bridge failed or returned invalid response - this is a critical error
      logger.error('SLM bridge failed to provide valid response', {
        candidateId: candidateContext.id,
        schedulingResponse: schedulingResponse ? JSON.stringify(schedulingResponse).substring(0, 200) : 'null'
      });

      // For pending candidates, SLM failure is critical - escalate immediately
      // Do NOT fall back to generic templates as they don't handle interview scheduling
      return await this.escalationSystem.createEscalation(
        candidateContext,
        message,
        {
          ...intentAnalysis,
          escalationReason: 'slm_bridge_failure',
          priority: 'high',
          details: 'SLM scheduling bridge failed for pending candidate - interview scheduling unavailable'
        }
      );

    } catch (error) {
      logger.error('Critical SLM bridge error for pending candidate', {
        candidateId: candidateContext.id,
        error: error.message,
        stack: error.stack
      });

      // Critical failure - escalate immediately
      return await this.escalationSystem.createEscalation(
        candidateContext,
        message,
        {
          ...intentAnalysis,
          escalationReason: 'slm_bridge_critical_error',
          priority: 'critical',
          details: `SLM bridge error: ${error.message}`
        }
      );
    }
  }

  /**
   * Generate fact-based response using real candidate data
   */
  async generateFactBasedRealDataResponse(candidateContext, realData, intentAnalysis, message) {
    try {
      // Validate that we have the required real data for this intent
      const hasRequiredData = await this.dataAccess.validateDataAvailability(
        intentAnalysis.primary,
        realData
      );

      if (!hasRequiredData) {
        logger.warn('Required real data not available, escalating', {
          candidateId: candidateContext.id,
          intent: intentAnalysis.primary
        });

        return await this.escalationSystem.createEscalation(
          candidateContext,
          message,
          { ...intentAnalysis, escalationReason: 'missing_real_data' }
        );
      }

      // Generate response using verified real data
      return await this.templateSystem.generateRealDataResponse(
        intentAnalysis.primary,
        candidateContext,
        realData,
        message
      );

    } catch (error) {
      logger.error('Real data response generation failed', {
        candidateId: candidateContext.id,
        error: error.message
      });

      // Always escalate rather than risk incorrect information
      return await this.escalationSystem.createEscalation(
        candidateContext,
        message,
        { ...intentAnalysis, escalationReason: 'real_data_error' }
      );
    }
  }

  /**
   * Quality assurance check to prevent false promises
   */
  async performQualityCheck(response, intentAnalysis) {
    if (!this.routingConfig.preventFalsePromises) {
      return response;
    }

    // Check for problematic phrases that make false promises
    const problematicPhrases = [
      'will arrive within',
      'automatic approval',
      'guaranteed payment',
      'your funds will be',
      'will be processed in',
      'should receive within',
      'automatically approved',
      'instant approval'
    ];

    const hasProblematicContent = problematicPhrases.some(phrase =>
      response.content.toLowerCase().includes(phrase)
    );

    if (hasProblematicContent) {
      logger.warn('Quality check failed - problematic content detected', {
        intent: intentAnalysis.primary,
        detectedPhrases: problematicPhrases.filter(phrase =>
          response.content.toLowerCase().includes(phrase)
        )
      });

      // Replace with safe escalation response
      return {
        content: "I want to make sure I give you accurate information about this. Let me have our admin team check the specific details and get back to you with the exact status.",
        source: 'quality_check_escalation',
        confidence: 1.0,
        intent: intentAnalysis.primary,
        escalated: true,
        qualityCheckFailed: true
      };
    }

    return response;
  }

  /**
   * A/B Testing logic for gradual rollout
   */
  shouldUseSmartRouter(candidateId) {
    if (this.routingConfig.rolloutPercentage >= 100) {
      return true;
    }

    // Use candidate ID hash for consistent routing
    const hash = this.hashString(candidateId);
    const percentage = hash % 100;

    return percentage < this.routingConfig.rolloutPercentage;
  }

  /**
   * Fallback to old system for A/B testing
   */
  async fallbackToOldSystem(candidateId, message, options) {
    logger.info('Falling back to old AI chat system', {
      candidateId,
      reason: 'ab_testing'
    });

    try {
      const oldAIChat = require('../ai-chat');
      return await oldAIChat.generateResponse(candidateId, message, options);
    } catch (error) {
      logger.error('Fallback to old system failed', {
        candidateId,
        error: error.message
      });

      // If old system fails, use smart router as backup
      this.routingConfig.rolloutPercentage = 100; // Emergency fallback
      return this.processMessage(candidateId, message, options);
    }
  }

  /**
   * Generate error response for critical failures
   */
  generateCriticalErrorResponse(candidateId, error) {
    logger.error('Critical Smart Response Router failure', {
      candidateId,
      error: error.message
    });

    return {
      content: "I'm experiencing technical difficulties right now. I've notified our admin team and they'll get back to you shortly to help with your question.",
      source: 'critical_error_fallback',
      confidence: 1.0,
      intent: 'error_handling',
      error: true,
      escalated: true,
      requiresAdminAttention: true
    };
  }

  /**
   * Generate error response for missing candidate
   */
  generateErrorResponse(errorType) {
    const errorMessages = {
      candidate_not_found: "I couldn't find your profile in our system. Please contact our support team for assistance.",
      system_error: "I'm experiencing technical difficulties. Our admin team has been notified and will assist you soon."
    };

    return {
      content: errorMessages[errorType] || errorMessages.system_error,
      source: 'error_response',
      confidence: 1.0,
      intent: 'error_handling',
      error: true,
      requiresAdminAttention: true
    };
  }

  /**
   * Log routing decision for monitoring and optimization
   */
  async logRoutingDecision(candidateId, message, intentAnalysis, response) {
    if (!this.routingConfig.logAllDecisions) {
      return;
    }

    const decision = {
      candidateId,
      messageHash: this.hashString(message),
      intent: intentAnalysis.primary,
      confidence: intentAnalysis.confidence,
      responseSource: response.source,
      escalated: response.escalated || false,
      usesRealData: response.usesRealData || false,
      timestamp: new Date().toISOString()
    };

    logger.info('Smart Router decision logged', decision);

    // Store in database for analytics (optional)
    try {
      const { db } = require('../../db');
      db.prepare(`
        INSERT INTO smart_router_decisions
        (candidate_id, message_hash, intent, confidence, response_source, escalated, uses_real_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        decision.candidateId,
        decision.messageHash,
        decision.intent,
        decision.confidence,
        decision.responseSource,
        decision.escalated ? 1 : 0,
        decision.usesRealData ? 1 : 0,
        decision.timestamp
      );
    } catch (dbError) {
      logger.warn('Failed to store routing decision in database', {
        error: dbError.message
      });
    }
  }

  /**
   * Verify SLM bridge response quality and health
   */
  verifySLMResponse(response) {
    if (!response || typeof response !== 'object') {
      logger.warn('SLM bridge returned invalid response type', { response });
      return false;
    }

    // Check for required content
    if (!response.content || typeof response.content !== 'string' || response.content.trim().length === 0) {
      logger.warn('SLM bridge returned empty or invalid content', { response });
      return false;
    }

    // Check for response type
    if (!response.type) {
      logger.warn('SLM bridge response missing type', { response });
      return false;
    }

    // Check for minimum content length (avoid empty responses)
    if (response.content.length < 10) {
      logger.warn('SLM bridge returned suspiciously short response', {
        contentLength: response.content.length,
        content: response.content
      });
      return false;
    }

    // Verify it's not an error response
    if (response.type === 'error') {
      logger.warn('SLM bridge returned error response', { response });
      return false;
    }

    logger.debug('SLM bridge response verified successfully', {
      type: response.type,
      contentLength: response.content.length,
      hasMetadata: !!response.metadata,
      hasSchedulingContext: !!response.schedulingContext
    });

    return true;
  }

  /**
   * Helper methods
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Performance monitoring
   */
  async getPerformanceMetrics() {
    try {
      const { db } = require('../../db');

      const metrics = db.prepare(`
        SELECT
          response_source,
          COUNT(*) as total_responses,
          AVG(confidence) as avg_confidence,
          SUM(CASE WHEN escalated = 1 THEN 1 ELSE 0 END) as escalation_count,
          SUM(CASE WHEN uses_real_data = 1 THEN 1 ELSE 0 END) as real_data_responses
        FROM smart_router_decisions
        WHERE created_at > datetime('now', '-7 days')
        GROUP BY response_source
      `).all();

      return {
        period: '7 days',
        metrics,
        totalResponses: metrics.reduce((sum, m) => sum + m.total_responses, 0),
        totalEscalations: metrics.reduce((sum, m) => sum + m.escalation_count, 0),
        realDataUsage: metrics.reduce((sum, m) => sum + m.real_data_responses, 0)
      };

    } catch (error) {
      logger.error('Failed to get performance metrics', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Initialize database table for decision logging
   */
  async initializeDecisionLogging() {
    try {
      const { db } = require('../../db');

      db.exec(`
        CREATE TABLE IF NOT EXISTS smart_router_decisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          candidate_id TEXT NOT NULL,
          message_hash TEXT NOT NULL,
          intent TEXT NOT NULL,
          confidence REAL NOT NULL,
          response_source TEXT NOT NULL,
          escalated INTEGER DEFAULT 0,
          uses_real_data INTEGER DEFAULT 0,
          created_at DATETIME NOT NULL
        )
      `);

      logger.info('Smart Router decision logging initialized');

    } catch (error) {
      logger.error('Failed to initialize decision logging', {
        error: error.message
      });
    }
  }
}

module.exports = SmartResponseRouter;