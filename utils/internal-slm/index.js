/**
 * Internal Smart Language Model (SLM)
 * Replaces external AI dependencies with rule-based intelligence
 * Fallback: Groq for complex cases that need LLM processing
 */

const { analyzeIntent } = require('./intent-analyzer');
const { generateResponse } = require('./response-generator');
const { ManageConversationFlow } = require('./conversation-flow-manager');
const { validateResponse } = require('./response-validator');
const GroqService = require('./groq-fallback');

class InternalSLM {
  constructor() {
    this.conversationManager = new ManageConversationFlow();
    this.groqService = new GroqService();
    this.responseCache = new Map();
    this.config = {
      useGroqFallback: true,
      maxCacheSize: 1000,
      cacheTimeout: 5 * 60 * 1000, // 5 minutes
      confidenceThreshold: 0.7,
      maxContextMessages: 5
    };
  }

  /**
   * Main entry point for SLM processing
   * @param {string} candidateId - Candidate ID
   * @param {string} message - User message
   * @param {Object} context - Conversation context
   * @param {Object} candidateData - Candidate information
   * @returns {Object} SLM response
   */
  async processMessage(candidateId, message, context = {}, candidateData = {}) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(message, context);
      const cachedResponse = this.getFromCache(cacheKey);
      if (cachedResponse) {
        return { ...cachedResponse, source: 'cache' };
      }

      // Step 1: Analyze intent
      const intentAnalysis = await analyzeIntent(message, context, candidateData);

      // Step 2: Determine if we can handle internally
      if (intentAnalysis.confidence >= this.config.confidenceThreshold) {
        const internalResponse = await this.handleInternally(
          intentAnalysis,
          candidateId,
          message,
          context,
          candidateData
        );

        if (internalResponse && validateResponse(internalResponse)) {
          this.cacheResponse(cacheKey, internalResponse);
          return { ...internalResponse, source: 'internal' };
        }
      }

      // Step 3: Fallback to Groq for complex cases
      if (this.config.useGroqFallback) {
        const groqResponse = await this.groqService.generateResponse(
          message,
          context,
          candidateData,
          intentAnalysis
        );

        if (groqResponse && validateResponse(groqResponse)) {
          this.cacheResponse(cacheKey, groqResponse);
          return { ...groqResponse, source: 'groq' };
        }
      }

      // Step 4: Final fallback to template
      const fallbackResponse = this.generateFallbackResponse(intentAnalysis, candidateData);
      return { ...fallbackResponse, source: 'fallback' };

    } catch (error) {
      console.error('Internal SLM Error:', error);
      return this.generateErrorResponse(candidateData);
    }
  }

  /**
   * Handle message internally using rule-based logic
   */
  async handleInternally(intentAnalysis, candidateId, message, context, candidateData) {
    const { intent, entities, confidence, sentiment } = intentAnalysis;

    // Route to appropriate handler based on intent
    switch (intent) {
      case 'greeting':
        return this.handleGreeting(candidateData, sentiment);

      case 'interview_scheduling':
        return await this.handleInterviewScheduling(candidateId, message, context, candidateData);

      case 'availability_sharing':
        return await this.handleAvailabilitySharing(candidateId, entities, candidateData);

      case 'confirm_booking':
        return await this.handleBookingConfirmation(candidateId, entities, context, candidateData);

      case 'payment_inquiry':
        return this.handlePaymentInquiry(candidateData, entities);

      case 'job_inquiry':
        return this.handleJobInquiry(candidateData, entities);

      case 'account_verification':
        return this.handleAccountVerification(candidateData);

      case 'reschedule':
        return await this.handleReschedule(candidateId, entities, context, candidateData);

      case 'general_question':
        return this.handleGeneralQuestion(entities, candidateData);

      default:
        return null; // Will trigger Groq fallback
    }
  }

  /**
   * Handle greeting messages
   */
  handleGreeting(candidateData, sentiment) {
    const { name, status } = candidateData;
    const firstName = name ? name.split(' ')[0] : '';

    if (status === 'pending') {
      return {
        content: `Hi ${firstName}! 👋 Welcome to WorkLink!\n\nYour account is currently under review. While you wait, I can help speed up the process by scheduling a quick verification interview.\n\n📅 Would you like to schedule a verification call?`,
        intent: 'interview_scheduling',
        confidence: 0.95,
        nextActions: ['schedule_interview'],
        messageType: 'greeting_with_offer'
      };
    } else if (status === 'active') {
      return {
        content: `Hi ${firstName}! 👋 Great to see you!\n\nI'm here to help with jobs, payments, or any questions you have. What can I assist you with today?`,
        intent: 'greeting',
        confidence: 0.95,
        nextActions: ['job_support', 'payment_support', 'general_help'],
        messageType: 'active_greeting'
      };
    } else {
      return {
        content: `Hi ${firstName}! 👋 Welcome back!\n\nHow can I help you today?`,
        intent: 'greeting',
        confidence: 0.9,
        nextActions: ['general_help'],
        messageType: 'standard_greeting'
      };
    }
  }

  /**
   * Handle interview scheduling for pending candidates
   */
  async handleInterviewScheduling(candidateId, message, context, candidateData) {
    const { name, status } = candidateData;

    if (status !== 'pending') {
      return {
        content: `Hi! Your account is already verified. I can help with jobs, payments, or other questions instead.`,
        intent: 'redirect',
        confidence: 0.9,
        nextActions: ['job_support'],
        messageType: 'redirect'
      };
    }

    // Check if already in queue or scheduled
    const queueStatus = await this.conversationManager.checkInterviewQueue(candidateId);

    if (queueStatus.inQueue) {
      return this.handleExistingQueue(queueStatus, candidateData);
    }

    if (queueStatus.scheduled) {
      return this.handleExistingSchedule(queueStatus, candidateData);
    }

    // Offer interview scheduling
    const firstName = name ? name.split(' ')[0] : '';
    return {
      content: `Perfect, ${firstName}! I'd be happy to help schedule your verification interview.\n\n📋 This will be a quick 30-minute call to:\n• Verify your identity\n• Complete your profile\n• Answer any questions\n\n📅 When are you generally available? (e.g., "weekday mornings" or "tomorrow afternoon")`,
      intent: 'collect_availability',
      confidence: 0.95,
      nextActions: ['collect_availability'],
      messageType: 'interview_offer',
      conversationFlow: 'scheduling_started'
    };
  }

  /**
   * Handle availability sharing
   */
  async handleAvailabilitySharing(candidateId, entities, candidateData) {
    const timeEntities = entities.filter(e => e.type === 'time' || e.type === 'day');
    const preferences = this.parseAvailabilityPreferences(timeEntities);

    // Get available slots based on preferences
    const availableSlots = await this.conversationManager.findMatchingSlots(preferences, 7);

    if (availableSlots.length === 0) {
      return {
        content: `I couldn't find any available slots matching your preferences. Let me offer some alternative times:\n\n📅 Next available slots:\n1. Tomorrow 10:00 AM\n2. Tomorrow 2:00 PM\n3. Day after tomorrow 11:00 AM\n\nReply with a number, or let me know other times that work for you!`,
        intent: 'offer_alternatives',
        confidence: 0.9,
        nextActions: ['select_slot'],
        messageType: 'alternative_slots',
        availableSlots: [
          { id: 1, datetime: 'tomorrow 10:00 AM' },
          { id: 2, datetime: 'tomorrow 2:00 PM' },
          { id: 3, datetime: 'day after tomorrow 11:00 AM' }
        ]
      };
    }

    const slotOptions = availableSlots.slice(0, 3).map((slot, index) =>
      `${index + 1}. ${slot.displayTime}`
    ).join('\n');

    return {
      content: `Great! Based on your availability, here are the best options:\n\n📅 Available Interview Slots:\n${slotOptions}\n\nSimply reply with the number of your preferred time, or let me know if you need different options!`,
      intent: 'offer_slots',
      confidence: 0.95,
      nextActions: ['select_slot'],
      messageType: 'slot_options',
      availableSlots: availableSlots.slice(0, 3)
    };
  }

  /**
   * Handle booking confirmation
   */
  async handleBookingConfirmation(candidateId, entities, context, candidateData) {
    const numberEntities = entities.filter(e => e.type === 'number');
    const confirmationEntities = entities.filter(e => e.type === 'confirmation');

    let selectedSlot = null;

    // Check for slot number selection
    if (numberEntities.length > 0 && context.availableSlots) {
      const slotNumber = parseInt(numberEntities[0].value) - 1;
      if (slotNumber >= 0 && slotNumber < context.availableSlots.length) {
        selectedSlot = context.availableSlots[slotNumber];
      }
    }

    // Check for general confirmation
    if (confirmationEntities.length > 0 && context.suggestedSlot) {
      selectedSlot = context.suggestedSlot;
    }

    if (!selectedSlot) {
      return {
        content: `I'm not sure which time slot you'd like. Could you please:\n\n• Reply with a number (1, 2, or 3) from the options above\n• Or tell me your preferred time more specifically\n\nI'm here to help! 😊`,
        intent: 'clarify_selection',
        confidence: 0.9,
        nextActions: ['clarify_slot'],
        messageType: 'clarification'
      };
    }

    // Book the interview
    try {
      const bookingResult = await this.conversationManager.bookInterview(candidateId, selectedSlot);

      if (bookingResult.success) {
        const { interview } = bookingResult;
        return {
          content: `🎉 Excellent! Your verification interview is confirmed:\n\n📅 ${interview.displayTime.full}\n⏰ 30 minutes\n🔗 Meeting link: ${interview.meetingLink}\n\nYou'll receive a reminder 24 hours before. Looking forward to speaking with you!\n\nAny questions about the interview?`,
          intent: 'booking_confirmed',
          confidence: 0.98,
          nextActions: ['interview_questions'],
          messageType: 'confirmation',
          interview: interview
        };
      } else {
        return {
          content: `I'm sorry, that time slot is no longer available. Let me find you another option:\n\n${bookingResult.message}\n\nWould you like to see updated available times?`,
          intent: 'booking_failed',
          confidence: 0.9,
          nextActions: ['show_alternatives'],
          messageType: 'booking_error'
        };
      }
    } catch (error) {
      console.error('Booking error:', error);
      return {
        content: `I encountered an issue while booking your interview. Let me connect you with our admin team to complete the scheduling manually.\n\nDon't worry - we'll get this sorted out quickly! 😊`,
        intent: 'escalate',
        confidence: 0.95,
        nextActions: ['escalate_to_admin'],
        messageType: 'booking_error',
        escalate: true
      };
    }
  }

  /**
   * Handle payment inquiries
   */
  handlePaymentInquiry(candidateData, entities) {
    const { status } = candidateData;

    if (status === 'pending') {
      return {
        content: `Your account is still under review, so there's no payment activity yet. Once you're verified and start working, I can help track your earnings!\n\n📅 Would you like to schedule your verification interview to speed up the process?`,
        intent: 'no_payment_pending',
        confidence: 0.95,
        nextActions: ['schedule_interview'],
        messageType: 'payment_redirect'
      };
    }

    return {
      content: `I'd be happy to help with payment questions! For the most accurate and up-to-date information about your earnings, let me connect you with our admin team who can provide exact details.\n\nThey'll be able to help with:\n• Current balance\n• Payment history\n• Withdrawal requests\n• Payment schedules`,
        intent: 'escalate_payment',
        confidence: 0.9,
        nextActions: ['escalate_to_admin'],
        messageType: 'payment_escalation',
        escalate: true
      };
    }
  }

  /**
   * Handle job inquiries
   */
  handleJobInquiry(candidateData, entities) {
    const { status, name } = candidateData;
    const firstName = name ? name.split(' ')[0] : '';

    if (status === 'pending') {
      return {
        content: `Hi ${firstName}! I understand you're eager to start working. Your account is currently under review, but I can help speed this up!\n\n📋 Once verified, you'll have access to:\n• Event staffing jobs\n• F&B positions\n• Retail opportunities\n• Admin support roles\n\n📅 Would you like to schedule your verification interview?`,
        intent: 'jobs_pending',
        confidence: 0.95,
        nextActions: ['schedule_interview'],
        messageType: 'jobs_redirect'
      };
    }

    return {
      content: `Great question about job opportunities! Our admin team has the most current information about:\n\n• Available positions matching your profile\n• Upcoming events\n• Schedule coordination\n• Job application status\n\nLet me connect you with them for personalized job assistance! 📋`,
      intent: 'escalate_jobs',
      confidence: 0.9,
      nextActions: ['escalate_to_admin'],
      messageType: 'jobs_escalation',
      escalate: true
    };
  }

  /**
   * Generate fallback response when all else fails
   */
  generateFallbackResponse(intentAnalysis, candidateData) {
    const { status, name } = candidateData;
    const firstName = name ? name.split(' ')[0] : '';

    return {
      content: `Hi ${firstName}! I want to make sure I give you the best help possible. Let me connect you with our admin team who can assist with your specific question.\n\nThey're online and ready to help! 😊`,
      intent: 'general_escalation',
      confidence: 0.8,
      nextActions: ['escalate_to_admin'],
      messageType: 'general_fallback',
      escalate: true
    };
  }

  /**
   * Generate error response
   */
  generateErrorResponse(candidateData) {
    return {
      content: `I'm experiencing a temporary issue. Let me connect you with our admin team to ensure you get immediate assistance.\n\nSorry for the inconvenience!`,
      intent: 'system_error',
      confidence: 0.9,
      nextActions: ['escalate_to_admin'],
      messageType: 'error',
      escalate: true
    };
  }

  /**
   * Cache management
   */
  generateCacheKey(message, context) {
    const contextKey = JSON.stringify({
      status: context.candidateStatus,
      flow: context.conversationFlow,
      intent: context.lastIntent
    });
    return `${message.toLowerCase().trim()}_${contextKey}`.substring(0, 100);
  }

  getFromCache(key) {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.response;
    }
    return null;
  }

  cacheResponse(key, response) {
    if (this.responseCache.size >= this.config.maxCacheSize) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }
    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Parse availability preferences from entities
   */
  parseAvailabilityPreferences(timeEntities) {
    const preferences = {
      days: [],
      times: [],
      timeOfDay: null,
      urgency: 'normal'
    };

    timeEntities.forEach(entity => {
      if (entity.type === 'day') {
        preferences.days.push(entity.value);
      } else if (entity.type === 'time') {
        preferences.times.push(entity.value);
      }
    });

    return preferences;
  }
}

module.exports = InternalSLM;