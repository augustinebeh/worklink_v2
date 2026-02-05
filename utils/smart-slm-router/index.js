/**
 * Smart SLM Router - Main Module Entry Point
 * Intelligently routes messages and responses through the SLM system
 * based on worker status (pending/active/inactive)
 *
 * @module smart-slm-router
 */

const WorkerStatusClassifier = require('../worker-status-classifier');
const SLMSchedulingBridge = require('../slm-scheduling-bridge');
const InterviewScheduler = require('../new-interview-scheduler');
const { createLogger } = require('../structured-logger');

const logger = createLogger('smart-slm-router');

class SmartSLMRouter {
  constructor() {
    this.statusClassifier = new WorkerStatusClassifier();
    this.schedulingBridge = new SLMSchedulingBridge();
    this.scheduler = InterviewScheduler; // Use singleton instance
    this.initialized = false;

    // SLM response flows for different worker types
    this.responseFlows = {
      pending: {
        priority: 'interview_scheduling',
        fallback: 'onboarding_support',
        autoScheduling: true,
        conversationStyle: 'proactive_scheduling'
      },
      active: {
        priority: 'job_support',
        fallback: 'general_assistance',
        autoScheduling: false,
        conversationStyle: 'job_focused'
      },
      inactive: {
        priority: 'reactivation',
        fallback: 'general_assistance',
        autoScheduling: false,
        conversationStyle: 'reengagement'
      },
      unknown: {
        priority: 'general_assistance',
        fallback: 'standard_support',
        autoScheduling: false,
        conversationStyle: 'neutral'
      }
    };
  }

  /**
   * Initialize the router system
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize all components
      await this.statusClassifier.initialize?.();
      await this.schedulingBridge.initialize?.();

      this.initialized = true;
      logger.info('Smart SLM Router initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Smart SLM Router', { error: error.message });
      throw error;
    }
  }

  /**
   * Main routing method - determines SLM response based on worker status
   */
  async routeSLMResponse(candidateId, message, conversationContext = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      logger.info('Starting SLM routing', {
        candidateId,
        messageLength: message.length,
        hasContext: Object.keys(conversationContext).length > 0
      });

      // Get worker status and routing information
      const routingInfo = await this.statusClassifier.getSLMRoutingInfo(candidateId);
      const workerStatus = routingInfo.workerStatus || 'unknown';

      logger.info('Worker status determined for SLM routing', {
        candidateId,
        workerStatus,
        slmMode: routingInfo.mode,
        requiresInterview: routingInfo.requiresInterview
      });

      // Get appropriate response flow
      const responseFlow = this.responseFlows[workerStatus] || this.responseFlows.unknown;

      // Route to appropriate SLM handler
      const response = await this.handleByWorkerStatus(
        candidateId,
        message,
        workerStatus,
        routingInfo,
        responseFlow,
        conversationContext
      );

      // Log successful routing
      logger.info('SLM routing completed successfully', {
        candidateId,
        workerStatus,
        responseType: response.type,
        flow: response.flow,
        autoSchedulingTriggered: response.schedulingTriggered || false
      });

      return response;

    } catch (error) {
      logger.error('SLM routing failed', {
        candidateId,
        error: error.message
      });

      // Return fallback response
      return {
        success: false,
        error: error.message,
        type: 'error_fallback',
        flow: 'error',
        message: 'I apologize, but I encountered an issue processing your message. Please try again or contact support if the problem persists.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle routing based on worker status
   */
  async handleByWorkerStatus(candidateId, message, workerStatus, routingInfo, responseFlow, conversationContext) {
    switch (workerStatus) {
      case 'pending':
        return await this.handlePendingWorker(candidateId, message, routingInfo, responseFlow, conversationContext);

      case 'active':
        return await this.handleActiveWorker(candidateId, message, routingInfo, responseFlow, conversationContext);

      case 'inactive':
        return await this.handleInactiveWorker(candidateId, message, routingInfo, responseFlow, conversationContext);

      default:
        return await this.handleUnknownWorker(candidateId, message, routingInfo, responseFlow, conversationContext);
    }
  }

  /**
   * Handle pending workers (priority: interview scheduling)
   */
  async handlePendingWorker(candidateId, message, routingInfo, responseFlow, conversationContext) {
    try {
      // Check if this is interview scheduling related
      const isSchedulingIntent = await this.detectSchedulingIntent(message, conversationContext);

      if (isSchedulingIntent || responseFlow.autoScheduling) {
        // Route to scheduling bridge for auto-scheduling
        const schedulingResponse = await this.schedulingBridge.handleSchedulingConversation(
          candidateId,
          message,
          conversationContext
        );

        if (schedulingResponse.success) {
          return {
            success: true,
            type: 'scheduling_response',
            flow: 'pending_auto_scheduling',
            message: schedulingResponse.message,
            data: schedulingResponse.data,
            schedulingTriggered: true,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Fallback to onboarding support
      return {
        success: true,
        type: 'onboarding_support',
        flow: 'pending_fallback',
        message: 'Welcome to WorkLink! Let\'s get you set up. I can help you schedule an interview or answer any questions about getting started.',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error handling pending worker', { candidateId, error: error.message });
      return this.getErrorFallbackResponse('pending');
    }
  }

  /**
   * Handle active workers (priority: job support)
   */
  async handleActiveWorker(candidateId, message, routingInfo, responseFlow, conversationContext) {
    try {
      // Route to general job support system
      return {
        success: true,
        type: 'job_support',
        flow: 'active_job_focused',
        message: 'I\'m here to help with any questions about your current jobs, payments, or work-related matters. What can I assist you with?',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error handling active worker', { candidateId, error: error.message });
      return this.getErrorFallbackResponse('active');
    }
  }

  /**
   * Handle inactive workers (priority: reactivation)
   */
  async handleInactiveWorker(candidateId, message, routingInfo, responseFlow, conversationContext) {
    try {
      return {
        success: true,
        type: 'reactivation',
        flow: 'inactive_reengagement',
        message: 'Good to see you again! I\'d love to help you get back into the swing of things. Are you looking for new job opportunities or need assistance with something else?',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error handling inactive worker', { candidateId, error: error.message });
      return this.getErrorFallbackResponse('inactive');
    }
  }

  /**
   * Handle unknown workers (priority: general assistance)
   */
  async handleUnknownWorker(candidateId, message, routingInfo, responseFlow, conversationContext) {
    try {
      return {
        success: true,
        type: 'general_assistance',
        flow: 'unknown_neutral',
        message: 'Hello! I\'m here to help. Whether you\'re new to WorkLink or need assistance with something specific, feel free to ask me anything.',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error handling unknown worker', { candidateId, error: error.message });
      return this.getErrorFallbackResponse('unknown');
    }
  }

  /**
   * Detect if message contains scheduling intent
   */
  async detectSchedulingIntent(message, conversationContext) {
    const schedulingKeywords = [
      'schedule', 'interview', 'appointment', 'meeting', 'time', 'available',
      'calendar', 'book', 'reschedule', 'cancel', 'confirm', 'availability'
    ];

    const messageText = message.toLowerCase();
    return schedulingKeywords.some(keyword => messageText.includes(keyword));
  }

  /**
   * Get error fallback response
   */
  getErrorFallbackResponse(workerStatus) {
    return {
      success: false,
      type: 'error_fallback',
      flow: `${workerStatus}_error`,
      message: 'I apologize, but I encountered an issue. Please try again or contact our support team for assistance.',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      architecture: 'modular',
      components: {
        statusClassifier: !!this.statusClassifier,
        schedulingBridge: !!this.schedulingBridge,
        scheduler: !!this.scheduler,
        responseFlows: Object.keys(this.responseFlows).length
      },
      flows: Object.keys(this.responseFlows),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Test router connectivity
   */
  async testConnectivity() {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const testResult = {
        router: true,
        statusClassifier: false,
        schedulingBridge: false,
        scheduler: false
      };

      // Test status classifier
      try {
        if (this.statusClassifier && typeof this.statusClassifier.getSLMRoutingInfo === 'function') {
          testResult.statusClassifier = true;
        }
      } catch (e) {
        logger.warn('Status classifier test failed', { error: e.message });
      }

      // Test scheduling bridge
      try {
        if (this.schedulingBridge && typeof this.schedulingBridge.handleSchedulingConversation === 'function') {
          testResult.schedulingBridge = true;
        }
      } catch (e) {
        logger.warn('Scheduling bridge test failed', { error: e.message });
      }

      // Test scheduler
      try {
        if (this.scheduler) {
          testResult.scheduler = true;
        }
      } catch (e) {
        logger.warn('Scheduler test failed', { error: e.message });
      }

      return testResult;
    } catch (error) {
      logger.error('Connectivity test failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = SmartSLMRouter;