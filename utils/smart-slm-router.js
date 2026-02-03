/**
 * Smart SLM Router with Worker Status Classification
 *
 * Routes SLM conversations based on worker status (pending/active) and
 * provides appropriate response flows for different candidate types.
 */

const WorkerStatusClassifier = require('./worker-status-classifier');
const SLMSchedulingBridge = require('./slm-scheduling-bridge');
const { createLogger } = require('./structured-logger');

const logger = createLogger('smart-slm-router');

class SmartSLMRouter {
  constructor() {
    this.statusClassifier = new WorkerStatusClassifier();
    this.schedulingBridge = new SLMSchedulingBridge();

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
   * Main routing method - determines SLM response based on worker status
   */
  async routeSLMResponse(candidateId, message, conversationContext = {}) {
    try {
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
      return await this.generateFallbackResponse(candidateId, message, error);
    }
  }

  /**
   * Handle SLM response based on worker status
   */
  async handleByWorkerStatus(candidateId, message, workerStatus, routingInfo, responseFlow, context) {
    switch (workerStatus) {
      case 'pending':
        return await this.handlePendingWorker(candidateId, message, routingInfo, context);

      case 'active':
        return await this.handleActiveWorker(candidateId, message, routingInfo, context);

      case 'inactive':
        return await this.handleInactiveWorker(candidateId, message, routingInfo, context);

      default:
        return await this.handleUnknownStatusWorker(candidateId, message, routingInfo, context);
    }
  }

  /**
   * Handle pending worker - focus on interview scheduling
   */
  async handlePendingWorker(candidateId, message, routingInfo, context) {
    try {
      logger.info('Handling pending worker', {
        candidateId,
        requiresInterview: routingInfo.requiresInterview,
        interviewStage: routingInfo.routingContext?.interview_stage
      });

      // For pending workers, always prioritize interview scheduling
      if (routingInfo.requiresInterview) {
        // Use existing SLM scheduling bridge for interview coordination
        const schedulingResponse = await this.schedulingBridge.handlePendingCandidateMessage(
          candidateId,
          message,
          {
            ...context,
            workerStatus: 'pending',
            autoTrigger: true,
            priority: 'high'
          }
        );

        return {
          type: 'pending_worker_response',
          flow: 'interview_scheduling',
          content: schedulingResponse.content,
          metadata: schedulingResponse.metadata,
          schedulingContext: schedulingResponse.schedulingContext,
          schedulingTriggered: true,
          workerStatus: 'pending'
        };
      } else {
        // Pending worker who already has interview scheduled/completed
        return await this.handlePendingWorkerPostInterview(candidateId, message, context);
      }

    } catch (error) {
      logger.error('Failed to handle pending worker', {
        candidateId,
        error: error.message
      });

      return await this.generatePendingWorkerFallback(candidateId, message);
    }
  }

  /**
   * Handle active worker - focus on job support and opportunities
   */
  async handleActiveWorker(candidateId, message, routingInfo, context) {
    try {
      logger.info('Handling active worker', {
        candidateId,
        hasWorkedBefore: routingInfo.routingContext?.has_worked
      });

      // Analyze message intent for active worker support
      const messageIntent = this.analyzeActiveWorkerIntent(message);

      switch (messageIntent.primary) {
        case 'job_search':
          return await this.handleJobSearchSupport(candidateId, message, context);

        case 'payment_inquiry':
          return await this.handlePaymentSupport(candidateId, message, context);

        case 'schedule_work':
          return await this.handleWorkSchedulingSupport(candidateId, message, context);

        case 'general_question':
        default:
          return await this.handleGeneralActiveWorkerSupport(candidateId, message, context);
      }

    } catch (error) {
      logger.error('Failed to handle active worker', {
        candidateId,
        error: error.message
      });

      return await this.generateActiveWorkerFallback(candidateId, message);
    }
  }

  /**
   * Handle inactive worker - focus on reactivation
   */
  async handleInactiveWorker(candidateId, message, routingInfo, context) {
    try {
      logger.info('Handling inactive worker', {
        candidateId,
        lastActive: routingInfo.routingContext?.last_seen
      });

      return {
        type: 'inactive_worker_response',
        flow: 'reactivation',
        content: await this.generateReactivationMessage(candidateId),
        workerStatus: 'inactive',
        requiresReactivation: true
      };

    } catch (error) {
      logger.error('Failed to handle inactive worker', {
        candidateId,
        error: error.message
      });

      return await this.generateInactiveWorkerFallback(candidateId, message);
    }
  }

  /**
   * Handle worker with unknown status
   */
  async handleUnknownStatusWorker(candidateId, message, routingInfo, context) {
    try {
      // Try to classify the worker first
      const classification = await this.statusClassifier.classifyWorkerStatus(candidateId);

      if (classification.currentStatus !== 'unknown') {
        // Retry with now-known status
        return await this.handleByWorkerStatus(
          candidateId,
          message,
          classification.currentStatus,
          {
            ...routingInfo,
            workerStatus: classification.currentStatus
          },
          this.responseFlows[classification.currentStatus],
          context
        );
      }

      // Still unknown - provide general support
      return {
        type: 'unknown_status_response',
        flow: 'general_support',
        content: await this.generateGeneralSupportMessage(candidateId, message),
        workerStatus: 'unknown',
        requiresClassification: true
      };

    } catch (error) {
      logger.error('Failed to handle unknown status worker', {
        candidateId,
        error: error.message
      });

      return await this.generateUnknownStatusFallback(candidateId, message);
    }
  }

  /**
   * Analyze message intent for active workers
   */
  analyzeActiveWorkerIntent(message) {
    const msg = message.toLowerCase();

    const intentPatterns = {
      job_search: /\b(job|work|opportunity|assignment|gig|shift|available|looking)\b/i,
      payment_inquiry: /\b(pay|payment|salary|money|earn|invoice|rate)\b/i,
      schedule_work: /\b(schedule|timing|when|availability|book|confirm)\b/i,
      general_question: /\b(how|what|why|where|help|question|info|details)\b/i
    };

    const intents = [];
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(msg)) {
        intents.push(intent);
      }
    }

    return {
      primary: intents[0] || 'general_question',
      secondary: intents.slice(1),
      confidence: intents.length > 0 ? 0.8 : 0.3
    };
  }

  /**
   * Generate job search support for active workers
   */
  async handleJobSearchSupport(candidateId, message, context) {
    const candidate = await this.statusClassifier.getCandidateData(candidateId);
    const firstName = candidate?.name?.split(' ')[0] || 'there';

    return {
      type: 'job_search_support',
      flow: 'active_job_search',
      content: `Hi ${firstName}! 👋 Looking for your next opportunity?

🔍 **Available Jobs Matching Your Profile:**
• Browse current openings in your area
• Filter by your skills and experience level
• See real-time availability and rates

💼 **Quick Actions:**
• Type "**JOBS**" to see all available work
• Type "**NEARBY**" for jobs in your area
• Type "**HIGH PAYING**" for premium opportunities

📊 **Your WorkLink Status:**
• Profile Level: ${candidate?.level || 1}
• Jobs Completed: ${candidate?.total_jobs_completed || 0}
• Current Tier: ${candidate?.current_tier || 'Bronze'}

Ready to find your next gig? Let me know what type of work interests you! 🚀`,
      workerStatus: 'active',
      suggestedActions: ['browse_jobs', 'check_nearby', 'view_profile']
    };
  }

  /**
   * Generate payment support for active workers
   */
  async handlePaymentSupport(candidateId, message, context) {
    const candidate = await this.statusClassifier.getCandidateData(candidateId);
    const firstName = candidate?.name?.split(' ')[0] || 'there';

    return {
      type: 'payment_support',
      flow: 'active_payment',
      content: `Hi ${firstName}! 💰 I can help with payment questions.

📋 **Payment Information:**
• Total Earnings: $${candidate?.total_earnings?.toFixed(2) || '0.00'}
• Pending Payments: Check your payment history
• Payment Schedule: Weekly payments every Friday

💳 **Quick Payment Actions:**
• Type "**EARNINGS**" to view detailed earnings
• Type "**PENDING**" to check pending payments
• Type "**HISTORY**" for payment history

⚡ **Need Help With:**
• Payment delays or issues
• Bank account updates
• Tax documents
• Rate questions

What payment topic can I help you with today?`,
      workerStatus: 'active',
      suggestedActions: ['view_earnings', 'check_pending', 'update_banking']
    };
  }

  /**
   * Generate work scheduling support for active workers
   */
  async handleWorkSchedulingSupport(candidateId, message, context) {
    const candidate = await this.statusClassifier.getCandidateData(candidateId);
    const firstName = candidate?.name?.split(' ')[0] || 'there';

    return {
      type: 'work_scheduling_support',
      flow: 'active_scheduling',
      content: `Hi ${firstName}! 📅 I can help you manage your work schedule.

🗓️ **Schedule Management:**
• View your upcoming assignments
• Update your availability
• Confirm or reschedule shifts

⚡ **Quick Schedule Actions:**
• Type "**SCHEDULE**" to see upcoming work
• Type "**AVAILABILITY**" to update when you're free
• Type "**CONFIRM**" to confirm pending assignments

📱 **Current Status:**
• Availability Mode: ${candidate?.availability_mode || 'Weekdays'}
• Profile Status: Active Worker
• Next Available: Based on your settings

What scheduling help do you need today?`,
      workerStatus: 'active',
      suggestedActions: ['view_schedule', 'update_availability', 'confirm_shifts']
    };
  }

  /**
   * Generate general support for active workers
   */
  async handleGeneralActiveWorkerSupport(candidateId, message, context) {
    const candidate = await this.statusClassifier.getCandidateData(candidateId);
    const firstName = candidate?.name?.split(' ')[0] || 'there';

    return {
      type: 'general_active_support',
      flow: 'active_general',
      content: `Hi ${firstName}! 👋 How can I help you today?

🚀 **Popular Actions:**
• 💼 **"JOBS"** - Find available work
• 💰 **"EARNINGS"** - Check your payments
• 📅 **"SCHEDULE"** - Manage your availability
• 📊 **"PROFILE"** - View your WorkLink profile

❓ **Need Help With:**
• Finding the right jobs for you
• Payment or earnings questions
• Scheduling and availability
• Profile updates or issues
• App features and tips

Just let me know what you'd like to do, and I'll guide you through it! 😊`,
      workerStatus: 'active',
      suggestedActions: ['browse_jobs', 'check_earnings', 'manage_schedule', 'view_profile']
    };
  }

  /**
   * Handle pending worker who has completed or scheduled interview
   */
  async handlePendingWorkerPostInterview(candidateId, message, context) {
    const candidate = await this.statusClassifier.getCandidateData(candidateId);
    const firstName = candidate?.name?.split(' ')[0] || 'there';

    return {
      type: 'pending_post_interview',
      flow: 'awaiting_approval',
      content: `Hi ${firstName}! 👋 Thanks for your patience.

✅ **Interview Status:** Completed - awaiting review

⏳ **What's Next:**
• Our team is reviewing your interview
• You'll receive approval notification soon
• Account activation typically takes 24-48 hours

💬 **In the Meantime:**
• Complete any remaining profile sections
• Upload additional documents if requested
• Stay tuned for job opportunities

📱 **Questions?** I'm here to help with:
• Interview follow-up questions
• Profile completion
• General WorkLink information

How can I assist you while we finalize your approval? 😊`,
      workerStatus: 'pending',
      interviewCompleted: true,
      awaitingApproval: true
    };
  }

  /**
   * Generate reactivation message for inactive workers
   */
  async generateReactivationMessage(candidateId) {
    const candidate = await this.statusClassifier.getCandidateData(candidateId);
    const firstName = candidate?.name?.split(' ')[0] || 'there';

    return `Hi ${firstName}! 👋 Great to hear from you again!

🎉 **Welcome Back to WorkLink!**
We've missed having you as part of our active worker community.

✨ **What's New:**
• More job opportunities in your area
• Improved payment system
• Enhanced app features
• Better job matching

🚀 **Quick Reactivation:**
To get you back to active status, I just need to:
• Verify your current availability
• Update your profile if needed
• Show you exciting new opportunities

💼 **Ready to Jump Back In?**
Type "**REACTIVATE**" and I'll guide you through the quick process to get you back to earning!

What brought you back to WorkLink today? I'm excited to help! 😊`;
  }

  /**
   * Generate general support message
   */
  async generateGeneralSupportMessage(candidateId, message) {
    return `Hi! 👋 I'm here to help you with WorkLink.

🤖 **I can assist you with:**
• Finding and applying for jobs
• Payment and earnings questions
• Schedule management
• Profile updates
• App navigation

💬 **Popular Commands:**
• **"JOBS"** - Browse available work
• **"HELP"** - Get detailed assistance
• **"PROFILE"** - View your information
• **"CONTACT"** - Reach our support team

What would you like help with today? Just describe what you need, and I'll guide you! 😊`;
  }

  /**
   * Fallback response generators
   */
  async generateFallbackResponse(candidateId, message, error) {
    logger.warn('Generating fallback response due to error', {
      candidateId,
      error: error.message
    });

    return {
      type: 'fallback_response',
      flow: 'error_fallback',
      content: `I'm experiencing some technical difficulties right now, but I'm here to help!

Our admin team has been notified and will assist you shortly. In the meantime:

• Try asking your question again
• Use the "HELP" command for common topics
• Contact our support team directly if urgent

Thanks for your patience! 🙏`,
      error: true,
      errorMessage: error.message
    };
  }

  async generatePendingWorkerFallback(candidateId, message) {
    return {
      type: 'pending_fallback',
      flow: 'pending_error',
      content: `Hi! I'm here to help with your WorkLink onboarding process.

While I sort out a technical issue, here are some quick actions:
• Reply "SCHEDULE" to book your verification interview
• Reply "HELP" for onboarding assistance
• Our team will contact you shortly

Looking forward to getting you started! 🚀`,
      workerStatus: 'pending',
      error: true
    };
  }

  async generateActiveWorkerFallback(candidateId, message) {
    return {
      type: 'active_fallback',
      flow: 'active_error',
      content: `Hi! Having a small technical hiccup, but I'm still here to help!

Quick options while I get back on track:
• Reply "JOBS" to see available work
• Reply "EARNINGS" for payment info
• Reply "SCHEDULE" for availability management

Our team is resolving this quickly! 💪`,
      workerStatus: 'active',
      error: true
    };
  }

  async generateInactiveWorkerFallback(candidateId, message) {
    return {
      type: 'inactive_fallback',
      flow: 'inactive_error',
      content: `Welcome back! I'm having a small technical issue but excited to help you return to active status.

While I resolve this:
• Reply "REACTIVATE" to start the quick process
• Our support team will assist you shortly
• Check back in a few minutes

Great to have you back! 🎉`,
      workerStatus: 'inactive',
      error: true
    };
  }

  async generateUnknownStatusFallback(candidateId, message) {
    return {
      type: 'unknown_fallback',
      flow: 'unknown_error',
      content: `Hi! I'm experiencing a technical issue while processing your request.

I'm here to help with:
• Job opportunities and applications
• Payment and earnings
• Schedule management
• General WorkLink support

Please try again in a moment, or contact our support team if you need immediate assistance! 😊`,
      workerStatus: 'unknown',
      error: true
    };
  }

  /**
   * Health check method
   */
  async performHealthCheck() {
    try {
      const checks = {
        statusClassifier: false,
        schedulingBridge: false,
        database: false
      };

      // Test status classifier
      try {
        await this.statusClassifier.getStatusStatistics();
        checks.statusClassifier = true;
      } catch (e) {
        logger.error('Status classifier health check failed', { error: e.message });
      }

      // Test scheduling bridge
      try {
        await this.schedulingBridge.performHealthCheck();
        checks.schedulingBridge = true;
      } catch (e) {
        logger.error('Scheduling bridge health check failed', { error: e.message });
      }

      // Test database connectivity
      try {
        const { db } = require('../db');
        db.prepare('SELECT 1').get();
        checks.database = true;
      } catch (e) {
        logger.error('Database health check failed', { error: e.message });
      }

      const allHealthy = Object.values(checks).every(check => check === true);

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
        version: '1.0.0'
      };

    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

module.exports = SmartSLMRouter;