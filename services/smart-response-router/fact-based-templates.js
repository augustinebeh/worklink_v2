/**
 * Fact-Based Template System
 *
 * Generates responses using only verified, real data or safe template responses.
 * Replaces problematic ML-generated content with honest, helpful templates.
 *
 * Key Principles:
 * 1. NO false promises or guarantees
 * 2. Use only real, verified data when available
 * 3. Be transparent about limitations
 * 4. Escalate rather than fabricate
 * 5. Maintain helpful, professional tone
 */

const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('fact-based-templates');

class FactBasedTemplateSystem {
  constructor() {
    this.initializeTemplates();
    this.initializeRealDataTemplates();
    this.initializePendingCandidateTemplates();
  }

  /**
   * Initialize standard fact-based templates
   */
  initializeTemplates() {
    this.templates = {
      // Payment related templates
      payment_inquiry: {
        noData: "I'd be happy to help you check your payment status. Let me have our admin team review your account and provide you with the most accurate and up-to-date information about your earnings and payment timeline.",
        requiresEscalation: true,
        confidence: 0.9
      },

      balance_check: {
        noData: "I can help you check your current balance. Let me connect you with our admin team who can access your account and provide you with your exact current balance and available funds.",
        requiresEscalation: true,
        confidence: 0.9
      },

      withdrawal_request: {
        noData: "I understand you'd like to make a withdrawal. Our admin team handles all withdrawal requests to ensure security and accuracy. I'll flag your request for priority review and they'll get back to you with the process and timeline.",
        requiresEscalation: true,
        confidence: 0.9
      },

      // Job related templates
      job_inquiry: {
        noData: "I'd love to help you find work opportunities! Let me have our admin team check for current job openings that match your profile and location. They'll be able to share specific details about available positions.",
        requiresEscalation: true,
        confidence: 0.8
      },

      job_status: {
        noData: "I can help you check the status of your job applications. Let me have our admin team review your applications and provide you with an update on where things stand.",
        requiresEscalation: true,
        confidence: 0.8
      },

      schedule_inquiry: {
        noData: "I can help you check your work schedule. Let me have our admin team pull up your current schedule and any upcoming assignments to give you the most accurate information.",
        requiresEscalation: true,
        confidence: 0.8
      },

      // Account related templates
      account_verification: {
        template: "I understand you're waiting for account verification. Our team reviews applications to ensure quality and safety for all users. While I can't give exact timelines (as each case is unique), I can connect you with our admin team for a status update on your specific application.",
        requiresEscalation: true,
        confidence: 0.9
      },

      profile_update: {
        template: "I can help you with updating your profile information. For any changes to your personal details, work history, or account settings, our admin team can assist you directly to ensure everything is updated correctly and securely.",
        requiresEscalation: true,
        confidence: 0.7
      },

      // Technical support templates
      technical_issue: {
        template: "I'm sorry you're experiencing a technical issue. I've flagged this for immediate technical support attention. Can you please describe the specific problem you're encountering so our team can help resolve it quickly?",
        requiresEscalation: true,
        confidence: 1.0
      },

      app_navigation: {
        template: "I'd be happy to help you navigate the app! For specific guidance on using features or finding information, our admin team can provide step-by-step assistance tailored to what you're looking for.",
        requiresEscalation: false,
        confidence: 0.7
      },

      // General communication templates
      greeting: {
        template: "Hello! Welcome to WorkLink. I'm here to help answer your questions and connect you with our team when needed. How can I assist you today?",
        requiresEscalation: false,
        confidence: 0.95
      },

      complaint_feedback: {
        template: "I understand your concern and I want to make sure it's addressed properly. I'm escalating this to our admin team immediately so they can review your situation and respond personally. Thank you for bringing this to our attention.",
        requiresEscalation: true,
        confidence: 1.0
      },

      general_question: {
        template: "I'm here to help with your question. To make sure I give you the most accurate information, let me connect you with our admin team who can provide specific details tailored to your situation.",
        requiresEscalation: true,
        confidence: 0.6
      }
    };
  }

  /**
   * Initialize templates that use real data
   */
  initializeRealDataTemplates() {
    this.realDataTemplates = {
      payment_inquiry: (candidateContext, realData) => {
        const firstName = candidateContext.name.split(' ')[0];
        const pending = realData.pendingEarnings || 0;
        const available = realData.availableEarnings || 0;
        const paid = realData.paidEarnings || 0;

        if (pending > 0 || available > 0 || paid > 0) {
          let response = `Hi ${firstName}! I can see your payment information:\n\n`;

          if (available > 0) {
            response += `💰 Available for withdrawal: $${available.toFixed(2)}\n`;
          }

          if (pending > 0) {
            response += `⏳ Pending earnings: $${pending.toFixed(2)}\n`;
          }

          if (paid > 0) {
            response += `✅ Total paid to date: $${paid.toFixed(2)}\n`;
          }

          response += `\nFor specific payment timelines or withdrawal processing, I'll have our admin team provide you with the exact details.`;

          return {
            content: response,
            source: 'fact_based_real_data',
            confidence: 0.95,
            usesRealData: true,
            requiresAdminAttention: false
          };
        }

        return {
          content: `Hi ${firstName}! I don't see any payment activity in your account yet. This could be because you haven't completed any paid work or payments are still being processed. Let me have our admin team check your account status and clarify your payment situation.`,
          source: 'fact_based_real_data',
          confidence: 0.9,
          usesRealData: true,
          requiresAdminAttention: true
        };
      },

      balance_check: (candidateContext, realData) => {
        const firstName = candidateContext.name.split(' ')[0];
        const available = realData.availableEarnings || 0;
        const pending = realData.pendingEarnings || 0;
        const total = realData.totalEarnings || 0;

        if (total > 0) {
          return {
            content: `Hi ${firstName}! Here's your current balance:\n\n💰 **Available for withdrawal:** $${available.toFixed(2)}\n⏳ **Pending earnings:** $${pending.toFixed(2)}\n📊 **Total earned:** $${total.toFixed(2)}\n\nFor withdrawal requests or questions about pending amounts, our admin team can help with the specifics!`,
            source: 'fact_based_real_data',
            confidence: 0.98,
            usesRealData: true,
            requiresAdminAttention: false
          };
        }

        return {
          content: `Hi ${firstName}! I can see your account but don't see any earnings yet. This could mean you haven't completed any paid work or are still in the onboarding process. Let me have our admin team check your account status and help you get started with earning opportunities!`,
          source: 'fact_based_real_data',
          confidence: 0.9,
          usesRealData: true,
          requiresAdminAttention: true
        };
      },

      job_inquiry: (candidateContext, realData) => {
        const firstName = candidateContext.name.split(' ')[0];
        const upcoming = realData.upcomingJobs || [];
        const available = realData.availableJobs || [];

        let response = `Hi ${firstName}! Let me check your job situation:\n\n`;

        if (upcoming.length > 0) {
          response += `📅 **Your upcoming work:**\n`;
          upcoming.slice(0, 3).forEach(job => {
            response += `• ${job.title} - ${job.location} on ${job.job_date}\n`;
          });
          response += '\n';
        }

        if (available.length > 0) {
          response += `🆕 **Available opportunities:**\n`;
          response += `I can see ${available.length} job(s) available that you can apply for.\n\n`;
        }

        if (upcoming.length === 0 && available.length === 0) {
          response += `I don't see any upcoming work or new opportunities right now.\n\n`;
        }

        response += `For the most up-to-date job listings and to discuss opportunities that match your skills, let me connect you with our admin team!`;

        return {
          content: response,
          source: 'fact_based_real_data',
          confidence: 0.85,
          usesRealData: true,
          requiresAdminAttention: upcoming.length === 0 && available.length === 0
        };
      },

      job_status: (candidateContext, realData) => {
        const firstName = candidateContext.name.split(' ')[0];
        const active = realData.activeApplications || [];
        const pending = realData.pendingApplications || 0;
        const confirmed = realData.confirmedApplications || 0;

        if (active.length > 0) {
          let response = `Hi ${firstName}! Here's your application status:\n\n`;

          if (pending > 0) {
            response += `⏳ **Pending applications:** ${pending}\n`;
          }

          if (confirmed > 0) {
            response += `✅ **Confirmed jobs:** ${confirmed}\n`;
          }

          response += `\n**Recent applications:**\n`;
          active.slice(0, 3).forEach(app => {
            response += `• ${app.title} - ${app.status}\n`;
          });

          response += `\nFor specific updates or questions about any application, our admin team can provide detailed status information.`;

          return {
            content: response,
            source: 'fact_based_real_data',
            confidence: 0.9,
            usesRealData: true,
            requiresAdminAttention: false
          };
        }

        return {
          content: `Hi ${firstName}! I don't see any active job applications in your account right now. If you're looking for opportunities to apply to, let me have our admin team show you available positions that match your profile!`,
          source: 'fact_based_real_data',
          confidence: 0.85,
          usesRealData: true,
          requiresAdminAttention: true
        };
      },

      schedule_inquiry: (candidateContext, realData) => {
        const firstName = candidateContext.name.split(' ')[0];
        const upcomingShifts = realData.upcomingShifts || [];
        const todaySchedule = realData.todaySchedule || [];
        const nextShift = realData.nextShift;

        let response = `Hi ${firstName}! Let me check your schedule:\n\n`;

        if (todaySchedule.length > 0) {
          response += `📍 **Today's schedule:**\n`;
          todaySchedule.forEach(shift => {
            response += `• ${shift.title} at ${shift.location} (${shift.start_time} - ${shift.end_time})\n`;
          });
          response += '\n';
        }

        if (nextShift && todaySchedule.length === 0) {
          response += `📅 **Next shift:** ${nextShift.title} on ${nextShift.job_date} at ${nextShift.location}\n\n`;
        }

        if (upcomingShifts.length > 1) {
          response += `📋 **Upcoming shifts:** ${upcomingShifts.length - todaySchedule.length} more scheduled\n\n`;
        }

        if (upcomingShifts.length === 0) {
          response += `I don't see any scheduled shifts for you right now.\n\n`;
        }

        response += `For detailed schedule information or to discuss availability, our admin team can help you with the specifics!`;

        return {
          content: response,
          source: 'fact_based_real_data',
          confidence: 0.9,
          usesRealData: true,
          requiresAdminAttention: upcomingShifts.length === 0
        };
      }
    };
  }

  /**
   * Initialize pending candidate specific templates
   */
  initializePendingCandidateTemplates() {
    this.pendingTemplates = {
      general: (candidateContext) => {
        const firstName = candidateContext.name.split(' ')[0];
        return {
          content: `Hi ${firstName}! Welcome to WorkLink! 👋\n\nI can see your account is currently under review by our team. While you wait for verification, I can help answer general questions about our platform or connect you with our admin team for specific account-related inquiries.\n\nIs there anything specific you'd like to know about WorkLink or our process?`,
          source: 'pending_candidate_template',
          confidence: 0.85,
          isPendingUser: true
        };
      },

      job_inquiry: (candidateContext) => {
        const firstName = candidateContext.name.split(' ')[0];
        return {
          content: `Hi ${firstName}! I understand you're eager to get started with work opportunities! 🎯\n\nYour account is currently being reviewed by our team. Once verified, you'll have access to browse and apply for jobs that match your skills and location.\n\nTo help speed up the verification process, our admin team can review your profile completeness and potentially schedule a quick verification call. Would you like me to connect you with them?`,
          source: 'pending_candidate_template',
          confidence: 0.9,
          isPendingUser: true,
          requiresAdminAttention: false
        };
      },

      payment_inquiry: (candidateContext) => {
        const firstName = candidateContext.name.split(' ')[0];
        return {
          content: `Hi ${firstName}! I can see you're asking about payments. Since your account is still pending verification, you won't see any payment activity yet.\n\nOnce your account is verified and you complete work assignments, you'll be able to track your earnings and payments through the app. Our admin team can explain the payment process in detail and help with account verification. Would you like me to connect you with them?`,
          source: 'pending_candidate_template',
          confidence: 0.95,
          isPendingUser: true,
          requiresAdminAttention: false
        };
      },

      account_verification: (candidateContext) => {
        const firstName = candidateContext.name.split(' ')[0];
        return {
          content: `Hi ${firstName}! I can see your account verification is in progress. 📋\n\nOur team reviews applications to ensure quality and safety for everyone. While verification times can vary depending on completeness of information and current volume, our admin team can:\n\n• Check your specific status\n• Identify any missing information\n• Potentially expedite your review\n\nWould you like me to have them take a look at your application?`,
          source: 'pending_candidate_template',
          confidence: 0.95,
          isPendingUser: true,
          requiresAdminAttention: true
        };
      }
    };
  }

  /**
   * Generate response for given intent
   */
  async generateResponse(intent, candidateContext, realData, originalMessage) {
    try {
      logger.debug('Generating template response', {
        candidateId: candidateContext?.id,
        intent,
        hasRealData: !!realData,
        candidateStatus: candidateContext?.status
      });

      // Handle pending candidates first
      if (candidateContext?.status === 'pending') {
        return this.generatePendingCandidateResponse(candidateContext, originalMessage, { primary: intent });
      }

      // Try real data template first if we have real data
      if (realData && this.realDataTemplates[intent]) {
        const realDataResponse = this.realDataTemplates[intent](candidateContext, realData);

        logger.info('Generated real data template response', {
          candidateId: candidateContext?.id,
          intent,
          source: realDataResponse.source
        });

        return realDataResponse;
      }

      // Fall back to standard template
      const template = this.templates[intent];

      if (!template) {
        logger.warn('No template found for intent', {
          candidateId: candidateContext?.id,
          intent
        });

        return this.generateFallbackResponse(candidateContext, originalMessage);
      }

      const firstName = candidateContext?.name?.split(' ')[0] || '';
      let content;

      if (template.template) {
        // Use static template
        content = template.template;
      } else if (template.noData) {
        // Use no-data template
        content = template.noData;
      } else {
        // Generate fallback
        return this.generateFallbackResponse(candidateContext, originalMessage);
      }

      // Personalize with first name if available
      if (firstName && !content.includes(firstName)) {
        content = `Hi ${firstName}! ${content}`;
      }

      logger.info('Generated standard template response', {
        candidateId: candidateContext?.id,
        intent,
        requiresEscalation: template.requiresEscalation
      });

      return {
        content,
        source: 'fact_based_template',
        confidence: template.confidence,
        intent,
        requiresAdminAttention: template.requiresEscalation,
        escalated: template.requiresEscalation,
        usesRealData: false
      };

    } catch (error) {
      logger.error('Template generation failed', {
        candidateId: candidateContext?.id,
        intent,
        error: error.message
      });

      return this.generateErrorResponse(candidateContext);
    }
  }

  /**
   * Generate response for pending candidates
   */
  async generatePendingCandidateResponse(candidateContext, originalMessage, intentAnalysis) {
    try {
      const intent = intentAnalysis?.primary || 'general';
      const pendingTemplate = this.pendingTemplates[intent] || this.pendingTemplates.general;

      const response = pendingTemplate(candidateContext);

      logger.info('Generated pending candidate response', {
        candidateId: candidateContext?.id,
        intent,
        template: intent
      });

      return {
        ...response,
        intent,
        isPendingUser: true
      };

    } catch (error) {
      logger.error('Pending candidate template generation failed', {
        candidateId: candidateContext?.id,
        error: error.message
      });

      return this.generateErrorResponse(candidateContext);
    }
  }

  /**
   * Generate response using real data
   */
  async generateRealDataResponse(intent, candidateContext, realData, originalMessage) {
    try {
      const realDataTemplate = this.realDataTemplates[intent];

      if (!realDataTemplate) {
        logger.warn('No real data template available for intent', {
          candidateId: candidateContext?.id,
          intent
        });

        // Fall back to standard template
        return this.generateResponse(intent, candidateContext, null, originalMessage);
      }

      const response = realDataTemplate(candidateContext, realData);

      logger.info('Generated real data response', {
        candidateId: candidateContext?.id,
        intent,
        usesRealData: response.usesRealData
      });

      return {
        ...response,
        intent
      };

    } catch (error) {
      logger.error('Real data template generation failed', {
        candidateId: candidateContext?.id,
        intent,
        error: error.message
      });

      return this.generateErrorResponse(candidateContext);
    }
  }

  /**
   * Generate fallback response when no specific template exists
   */
  generateFallbackResponse(candidateContext, originalMessage) {
    const firstName = candidateContext?.name?.split(' ')[0] || '';

    logger.info('Generating fallback response', {
      candidateId: candidateContext?.id
    });

    return {
      content: `Hi${firstName ? ' ' + firstName : ''}! I want to make sure I give you accurate information about your question. Let me connect you with our admin team who can provide you with specific details and help you with exactly what you need.`,
      source: 'fallback_template',
      confidence: 0.7,
      intent: 'general_question',
      requiresAdminAttention: true,
      escalated: true,
      usesRealData: false
    };
  }

  /**
   * Generate error response
   */
  generateErrorResponse(candidateContext) {
    const firstName = candidateContext?.name?.split(' ')[0] || '';

    logger.warn('Generating error response', {
      candidateId: candidateContext?.id
    });

    return {
      content: `Hi${firstName ? ' ' + firstName : ''}! I'm experiencing some technical difficulties right now. I've notified our admin team and they'll get back to you shortly to help with your question.`,
      source: 'error_template',
      confidence: 1.0,
      intent: 'error_handling',
      requiresAdminAttention: true,
      escalated: true,
      error: true,
      usesRealData: false
    };
  }

  /**
   * Get available templates for an intent
   */
  getAvailableTemplates(intent) {
    return {
      hasStandardTemplate: !!this.templates[intent],
      hasRealDataTemplate: !!this.realDataTemplates[intent],
      hasPendingTemplate: !!this.pendingTemplates[intent]
    };
  }

  /**
   * Get template statistics
   */
  getTemplateStats() {
    return {
      totalStandardTemplates: Object.keys(this.templates).length,
      totalRealDataTemplates: Object.keys(this.realDataTemplates).length,
      totalPendingTemplates: Object.keys(this.pendingTemplates).length,
      escalationTemplates: Object.values(this.templates)
        .filter(t => t.requiresEscalation).length
    };
  }
}

module.exports = FactBasedTemplateSystem;