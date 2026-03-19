/**
 * SLM-to-SLM Communication Bridge for Interview Scheduling
 *
 * This bridge connects the existing candidate chat SLM with the interview
 * scheduling SLM to create a seamless automated flow from pending status
 * to interview booking.
 */


const { createLogger } = require('./structured-logger');
const logger = createLogger('slm-scheduling-bridge');

const InterviewSchedulingEngine = require('./interview-scheduling-engine');
const { db } = require('../db'); // Import database connection at module level

// Import extracted modules
const slotMgmt = require('./slm-scheduling/slot-management');
const convHandlers = require('./slm-scheduling/conversation-handlers');

class SLMSchedulingBridge {
  constructor() {
    this.schedulingEngine = new InterviewSchedulingEngine();

    // Consultant reference variations for natural conversation
    this.consultantReferences = [
      'our friendly consultant',
      'our consultant',
      'our team lead',
      'our senior consultant',
      'our recruitment consultant',
      'one of our consultants'
    ];

    // Intent recognition patterns - Order matters! More specific patterns first
    this.intentPatterns = {
      // Most specific - selecting a specific time slot
      select_slot: /\b((?:can\s*i\s*(?:have|get|take|book)|i(?:'ll|.ll|\s*will)?\s*(?:take|want|choose|pick|go\s*(?:for|with))|(?:give\s*me|let(?:'s|\s*me)\s*(?:go\s*(?:for|with)|take|do)))\s*(?:the\s*)?(?:(\d{1,2})(?::\d{2})?\s*(?:am|pm)|(?:option|slot|number)\s*(\d)|(\d{1,2})\s*(?:o'?clock|am|pm)))|^\s*(?:(\d{1,2})(?::\d{2})?\s*(?:am|pm)|(?:the\s*)?(?:(\d)(?:st|nd|rd|th)?\s*(?:one|option|slot)?)|option\s*(\d))\s*$/i,
      // Most specific - clear confirmation responses
      confirm_booking: /^\s*(yes|ok|okay|yep|yeah|sure|confirm|book\s*it|schedule\s*it|sounds\s*good|perfect|that\s*works|let(?:'s|\s*us)\s*do\s*it)\s*(?:the\s*)?(?:booking|interview|appointment)?\s*$|^\s*yes\s*(?:confirm|please|go\s*ahead|let(?:'s|\s*us)\s*do\s*it).*$/i,
      // Morning/afternoon preference patterns
      morning_preference: /\b(morning|am|9|10|11|12|before\s*lunch|early|mornings|9am|10am|11am|12pm|noon)\b/i,
      afternoon_preference: /\b(afternoon|pm|1|2|3|4|5|6|after\s*lunch|late|afternoons|1pm|2pm|3pm|4pm|5pm|6pm|evening)\b/i,
      // Clear reschedule request
      reschedule: /\b(reschedule|change.*(?:time|appointment|interview)|different\s*time|another\s*time|cancel|postpone|move.*(?:interview|appointment))\b/i,
      // Questions about the process
      ask_questions: /\b(what\s+(?:is|are|does)|how\s+(?:long|does|do|can)|when\s+(?:is|will)|where|why|questions?\s+about|(?:tell|inform|explain).*(?:about|process)|info(?:rmation)?\s+(?:about|on)|details\s+(?:about|of))\b/i,
      // Providing availability information
      provide_availability: /\b(i\s*(?:am|m)?\s*(?:available|free)|(?:available|free)\s+(?:on|at|in)|today|tomorrow|monday|tuesday|wednesday|thursday|friday|weekday|weekend|this\s+week|next\s+week|any\s+time)\b/i,
      // General scheduling request - least specific
      schedule_interview: /\b(schedule|book|arrange|set\s*up|interview|meet|talk|verification|sign\s*up|register|work\s*with|want\s*to\s*(?:work|join))\b/i
    };
  }

  getConsultantReference() {
    const randomIndex = Math.floor(Math.random() * this.consultantReferences.length);
    return this.consultantReferences[randomIndex];
  }

  /**
   * Main entry point for SLM-to-SLM communication
   */
  async handlePendingCandidateMessage(candidateId, message, conversationContext = {}) {
    try {
      logger.info('SLM Bridge processing pending candidate ${candidateId} message');

      const savedState = await this.getConversationState(candidateId);
      const enhancedContext = {
        ...conversationContext,
        ...savedState,
        lastMessage: message
      };

      const intent = this.analyzeMessageIntent(message, enhancedContext);
      const candidate = await this.getCandidateInfo(candidateId);

      if (!candidate) {
        return convHandlers.generateErrorResponse('candidate_not_found');
      }

      if (intent.needsEscalation) {
        return await this.handleEscalationRequest(candidate, message, intent);
      }

      const flow = this.determineConversationFlow(intent, enhancedContext, candidate);
      const response = await this.generateFlowResponse(flow, candidate, message, enhancedContext);

      if (!this.verifyResponseQuality(response)) {
        logger.error('SLM Bridge generated invalid response:', { error: response });
        return convHandlers.generateErrorResponse('system_error', {
          flow: flow.type,
          candidateId: candidate.id
        });
      }

      await this.updateConversationState(candidateId, {
        conversation_flow: flow.type,
        current_stage: response.schedulingContext?.stage || 'processed',
        time_preference: enhancedContext.timePreference,
        shown_slots: JSON.stringify(response.schedulingContext?.availableSlots || []),
        scheduling_context: JSON.stringify(response.schedulingContext || {}),
        last_message_content: message
      });

      if (flow.schedulingAction) {
        await this.executeSchedulingAction(flow.schedulingAction, candidate, enhancedContext);
      }

      logger.info('SLM Bridge generated verified response for ${candidate.id}:', { data: {
        type: response.type,
        flow: flow.type,
        hasSchedulingContext: !!response.schedulingContext,
        conversationStage: response.schedulingContext?.stage
      } });

      return response;

    } catch (error) {
      logger.error('SLM Bridge error:', { error: error });
      return convHandlers.generateErrorResponse('system_error');
    }
  }

  /**
   * Load conversation state from database
   */
  async getConversationState(candidateId) {
    try {
      const state = db.prepare(`
        SELECT * FROM candidate_conversation_state
        WHERE candidate_id = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC
        LIMIT 1
      `).get(candidateId);

      if (state) {
        return {
          conversationFlow: state.conversation_flow,
          currentStage: state.current_stage,
          timePreference: state.time_preference,
          shownSlots: state.shown_slots ? JSON.parse(state.shown_slots) : [],
          selectedSlotIndex: state.selected_slot_index,
          schedulingContext: state.scheduling_context ? JSON.parse(state.scheduling_context) : {},
          lastMessageContent: state.last_message_content
        };
      }

      return {};
    } catch (error) {
      logger.error('Error loading conversation state:', { error: error });
      return {};
    }
  }

  /**
   * Save/update conversation state in database
   */
  async updateConversationState(candidateId, stateUpdates) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      db.prepare(`
        INSERT OR REPLACE INTO candidate_conversation_state
        (candidate_id, conversation_flow, current_stage, time_preference, shown_slots,
         selected_slot_index, scheduling_context, last_message_content, expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        candidateId,
        stateUpdates.conversation_flow || '',
        stateUpdates.current_stage || 'processing',
        stateUpdates.time_preference || null,
        stateUpdates.shown_slots || null,
        stateUpdates.selected_slot_index || null,
        stateUpdates.scheduling_context || null,
        stateUpdates.last_message_content || '',
        expiresAt.toISOString()
      );
    } catch (error) {
      logger.error('Error updating conversation state:', { error: error });
    }
  }

  /**
   * Clear conversation state after booking completion
   */
  async clearConversationState(candidateId) {
    try {
      db.prepare(`
        DELETE FROM candidate_conversation_state WHERE candidate_id = ?
      `).run(candidateId);
    } catch (error) {
      logger.error('Error clearing conversation state:', { error: error });
    }
  }

  /**
   * Analyze incoming message to determine intent with conversation context
   */
  analyzeMessageIntent(message, context = {}) {
    const intents = [];
    let slotSelection = null;

    if (context.currentStage === 'slots_offered' && context.shownSlots?.length > 0) {
      slotSelection = slotMgmt.parseSlotSelection(message, context.shownSlots);
      if (slotSelection) {
        intents.push('select_slot');
      }
    }

    for (const [intentName, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(message)) {
        intents.push(intentName);
      }
    }

    const escalationPatterns = {
      reschedule_request: /\b(reschedule|change.*time|cancel|different.*time|move.*interview)\b/i,
    };

    let needsEscalation = false;
    for (const [trigger, pattern] of Object.entries(escalationPatterns)) {
      if (pattern.test(message)) {
        needsEscalation = true;
        break;
      }
    }

    return {
      primary: intents[0] || 'general',
      secondary: intents.slice(1),
      confidence: intents.length > 0 ? 0.8 : 0.3,
      needsEscalation,
      slotSelection
    };
  }

  /**
   * Determine conversation flow based on intent and context
   */
  determineConversationFlow(intent, context, candidate) {
    const inQueue = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_queue WHERE candidate_id = ?
    `).get(candidate.id);

    const hasInterview = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_slots WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
    `).get(candidate.id);

    if (hasInterview) {
      return { type: 'existing_interview', schedulingAction: null, template: 'existing_interview_reminder' };
    }

    if (inQueue) {
      return { type: 'in_progress_scheduling', schedulingAction: 'offer_real_time_slots', template: 'real_time_scheduling' };
    }

    switch (intent.primary) {
      case 'morning_preference':
        return { type: 'morning_slots', schedulingAction: 'offer_morning_slots', template: 'morning_slot_options' };
      case 'afternoon_preference':
        return { type: 'afternoon_slots', schedulingAction: 'offer_afternoon_slots', template: 'afternoon_slot_options' };
      case 'schedule_interview':
        return { type: 'schedule_interview', schedulingAction: 'add_to_queue', template: 'interview_scheduling_offer' };
      case 'provide_availability':
        return { type: 'collect_availability', schedulingAction: 'update_availability', template: 'availability_collection' };
      case 'select_slot':
        if (intent.slotSelection) {
          return { type: 'slot_selection', schedulingAction: null, template: 'process_slot_selection', selectedSlot: intent.slotSelection.selectedSlot, selectedIndex: intent.slotSelection.selectedIndex };
        } else {
          return { type: 'slot_selection_unclear', schedulingAction: null, template: 'clarify_slot_selection' };
        }
      case 'confirm_booking':
        return { type: 'confirm_interview', schedulingAction: 'confirm_booking', template: 'booking_confirmation' };
      default:
        return { type: 'initial_welcome', schedulingAction: 'add_to_queue', template: 'welcome_with_interview_offer' };
    }
  }

  /**
   * Generate response based on conversation flow - delegates to conversation handlers
   */
  async generateFlowResponse(flow, candidate, message, context) {
    // Build helpers object that handlers need
    const helpers = {
      getConsultantReference: () => this.getConsultantReference(),
      formatSlotDateTime: slotMgmt.formatSlotDateTime,
      formatInterviewDateTime: slotMgmt.formatInterviewDateTime,
      getAvailableSlots: (days) => slotMgmt.getAvailableSlots(this.schedulingEngine, days),
      getMorningSlots: (days) => slotMgmt.getMorningSlots(this.schedulingEngine, days),
      getAfternoonSlots: (days) => slotMgmt.getAfternoonSlots(this.schedulingEngine, days),
      getAvailableCalendarSlots: (days) => slotMgmt.getAvailableCalendarSlots(this.schedulingEngine, days),
      parseAvailabilityFromMessage: slotMgmt.parseAvailabilityFromMessage,
      parseSpecificSlotRequest: slotMgmt.parseSpecificSlotRequest,
      findMatchingSlot: slotMgmt.findMatchingSlot,
      findSlotsMatchingPreferences: (prefs, timePref) => slotMgmt.findSlotsMatchingPreferences(
        this.schedulingEngine, prefs, timePref,
        (d) => slotMgmt.getAvailableSlots(this.schedulingEngine, d),
        (d) => slotMgmt.getMorningSlots(this.schedulingEngine, d),
        (d) => slotMgmt.getAfternoonSlots(this.schedulingEngine, d)
      ),
      schedulingEngine: this.schedulingEngine,
      updateConversationState: (id, state) => this.updateConversationState(id, state),
      clearConversationState: (id) => this.clearConversationState(id),
      context,
      // Circular references for handlers that call other handlers
      generateWelcomeWithSchedulingFn: (c) => convHandlers.generateWelcomeWithScheduling(c, helpers),
      generateInterviewOfferFn: (c) => convHandlers.generateInterviewOffer(c, helpers),
      generateRealTimeSchedulingOfferFn: (c) => convHandlers.generateRealTimeSchedulingOffer(c, helpers),
    };

    const templates = {
      welcome_with_interview_offer: () => convHandlers.generateWelcomeWithScheduling(candidate, helpers),
      interview_scheduling_offer: () => convHandlers.generateInterviewOffer(candidate, helpers),
      morning_slot_options: () => convHandlers.generateMorningSlotOptions(candidate, helpers),
      afternoon_slot_options: () => convHandlers.generateAfternoonSlotOptions(candidate, helpers),
      availability_collection: () => convHandlers.collectAvailabilityPreferences(candidate, message, helpers),
      slot_selection_confirmation: () => convHandlers.generateSlotSelectionConfirmation(candidate, message, context, helpers),
      process_slot_selection: () => convHandlers.processSlotSelection(candidate, flow, context, helpers),
      clarify_slot_selection: () => convHandlers.clarifySlotSelection(candidate, context, helpers),
      booking_confirmation: () => convHandlers.confirmInterviewBooking(candidate, context, helpers),
      existing_interview_reminder: () => convHandlers.generateExistingInterviewReminder(candidate, helpers),
      real_time_scheduling: () => convHandlers.generateRealTimeSchedulingOffer(candidate, helpers)
    };

    const templateFunction = templates[flow.template];
    if (templateFunction) {
      return await templateFunction();
    } else {
      return convHandlers.generateGenericResponse(candidate);
    }
  }

  /**
   * Handle escalation requests
   */
  async handleEscalationRequest(candidate, message, intent) {
    return convHandlers.handleEscalationRequest(candidate, message, intent, {
      schedulingEngine: this.schedulingEngine
    });
  }

  /**
   * Execute scheduling actions
   */
  async executeSchedulingAction(action, candidate, context) {
    try {
      switch (action) {
        case 'add_to_queue':
          await this.schedulingEngine.addToInterviewQueue(candidate, 0.7);
          break;

        case 'offer_morning_slots':
          try {
            this.schedulingEngine.db.prepare(`
              INSERT OR REPLACE INTO interview_queue
              (candidate_id, priority_score, preferred_times, queue_status, notes)
              VALUES (?, 0.8, ?, 'contacted', 'Prefers morning slots (9AM-1PM)')
            `).run(candidate.id, JSON.stringify({ timePreference: 'morning' }));
          } catch (error) {
            logger.error('Error storing morning preference:', { error: error });
          }
          break;

        case 'offer_afternoon_slots':
          try {
            this.schedulingEngine.db.prepare(`
              INSERT OR REPLACE INTO interview_queue
              (candidate_id, priority_score, preferred_times, queue_status, notes)
              VALUES (?, 0.8, ?, 'contacted', 'Prefers afternoon slots (2PM-6PM)')
            `).run(candidate.id, JSON.stringify({ timePreference: 'afternoon' }));
          } catch (error) {
            logger.error('Error storing afternoon preference:', { error: error });
          }
          break;

        case 'update_queue_priority':
          this.schedulingEngine.db.prepare(`
            UPDATE interview_queue
            SET priority_score = 0.9, urgency_level = 'high'
            WHERE candidate_id = ?
          `).run(candidate.id);
          break;

        case 'confirm_booking':
          break;

        case 'update_availability':
          if (context.availabilityPreferences) {
            this.schedulingEngine.db.prepare(`
              INSERT OR REPLACE INTO interview_queue
              (candidate_id, priority_score, preferred_times, queue_status)
              VALUES (?, 0.8, ?, 'waiting')
            `).run(candidate.id, JSON.stringify(context.availabilityPreferences));
          }
          break;
      }
    } catch (error) {
      logger.error('Scheduling action error:', { error: error });
    }
  }

  /**
   * Helper: get candidate info
   */
  async getCandidateInfo(candidateId) {
    try {
      return db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    } catch (error) {
      logger.error('Database error in getCandidateInfo:', { error: error });
      return null;
    }
  }

  /**
   * Health check method for Smart Router verification
   */
  async performHealthCheck() {
    try {
      const { db } = require('../db');
      const testQuery = db.prepare('SELECT COUNT(*) as count FROM candidates LIMIT 1').get();
      const engineHealthy = await this.schedulingEngine.isHealthy();
      const testSlots = await slotMgmt.getAvailableSlots(this.schedulingEngine, 1);

      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: testQuery ? 'ok' : 'failed',
          schedulingEngine: engineHealthy ? 'ok' : 'failed',
          slotAvailability: testSlots ? 'ok' : 'failed'
        },
        availableSlots: testSlots ? testSlots.length : 0
      };

      logger.info('SLM Bridge health check:', { data: healthStatus });
      return healthStatus;

    } catch (error) {
      logger.error('SLM Bridge health check failed:', { error: error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks: {
          database: 'failed',
          schedulingEngine: 'failed',
          slotAvailability: 'failed'
        }
      };
    }
  }

  /**
   * Verify response quality before sending to Smart Router
   */
  verifyResponseQuality(response) {
    if (!response || typeof response !== 'object') return false;
    if (!response.content || typeof response.content !== 'string' || response.content.trim().length < 10) return false;
    if (!response.type) return false;
    if (response.type === 'error' && !response.metadata?.errorType) return false;
    return true;
  }

  /**
   * Integration method for existing chat system
   */
  async integrateWithChatSLM(candidateId, message, existingContext = {}) {
    const candidate = await this.getCandidateInfo(candidateId);
    if (!candidate || candidate.status !== 'pending') {
      return null;
    }
    return await this.handlePendingCandidateMessage(candidateId, message, existingContext);
  }
}

module.exports = SLMSchedulingBridge;
