/**
 * SLM-to-SLM Communication Bridge for Interview Scheduling
 *
 * This bridge connects the existing candidate chat SLM with the interview
 * scheduling SLM to create a seamless automated flow from pending status
 * to interview booking.
 */

const InterviewSchedulingEngine = require('./interview-scheduling-engine');
const { db } = require('../db'); // Import database connection at module level

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

    // Enhanced SLM responses for pending candidates
    this.pendingCandidateFlows = {
      // Initial greeting for pending candidates
      welcome: {
        trigger: ['status_pending', 'first_message'],
        response: this.generateWelcomeWithScheduling,
        nextActions: ['offer_interview', 'collect_preferences']
      },

      // Interview scheduling offer
      interview_offer: {
        trigger: ['schedule', 'interview', 'meet', 'talk', 'verification'],
        response: this.generateInterviewOffer,
        nextActions: ['collect_availability', 'confirm_details']
      },

      // Availability collection
      availability_collection: {
        trigger: ['available', 'time', 'when', 'morning', 'afternoon', 'today', 'tomorrow'],
        response: this.collectAvailabilityPreferences,
        nextActions: ['schedule_interview', 'confirm_slot']
      },

      // Interview confirmation
      interview_confirmation: {
        trigger: ['yes', 'confirm', 'book', 'schedule'],
        response: this.confirmInterviewBooking,
        nextActions: ['send_confirmation', 'add_to_calendar']
      },

      // Reschedule requests
      reschedule_request: {
        trigger: ['reschedule', 'change', 'different time', 'cancel'],
        response: this.handleRescheduleRequest,
        nextActions: ['offer_alternatives', 'collect_new_preferences']
      }
    };

    // Intent recognition patterns - Order matters! More specific patterns first
    this.intentPatterns = {
      // Most specific - selecting a specific time slot (e.g., "can I have the 2pm slot", "I'll take 10am", "option 2")
      select_slot: /\b((?:can\s*i\s*(?:have|get|take|book)|i(?:'ll|.ll|\s*will)?\s*(?:take|want|choose|pick|go\s*(?:for|with))|(?:give\s*me|let(?:'s|\s*me)\s*(?:go\s*(?:for|with)|take|do)))\s*(?:the\s*)?(?:(\d{1,2})(?::\d{2})?\s*(?:am|pm)|(?:option|slot|number)\s*(\d)|(\d{1,2})\s*(?:o'?clock|am|pm)))|^\s*(?:(\d{1,2})(?::\d{2})?\s*(?:am|pm)|(?:the\s*)?(?:(\d)(?:st|nd|rd|th)?\s*(?:one|option|slot)?)|option\s*(\d))\s*$/i,
      // Most specific - clear confirmation responses (without time/slot reference)
      confirm_booking: /^\s*(yes|ok|okay|yep|yeah|sure|confirm|book\s*it|schedule\s*it|sounds\s*good|perfect|that\s*works|let(?:'s|\s*us)\s*do\s*it)\s*(?:the\s*)?(?:booking|interview|appointment)?\s*$|^\s*yes\s*(?:confirm|please|go\s*ahead|let(?:'s|\s*us)\s*do\s*it).*$/i,
      // Morning/afternoon preference patterns
      morning_preference: /\b(morning|am|9|10|11|12|before\s*lunch|early|mornings|9am|10am|11am|12pm|noon)\b/i,
      afternoon_preference: /\b(afternoon|pm|1|2|3|4|5|6|after\s*lunch|late|afternoons|1pm|2pm|3pm|4pm|5pm|6pm|evening)\b/i,
      // Clear reschedule request
      reschedule: /\b(reschedule|change.*(?:time|appointment|interview)|different\s*time|another\s*time|cancel|postpone|move.*(?:interview|appointment))\b/i,
      // Questions about the process (not scheduling)
      ask_questions: /\b(what\s+(?:is|are|does)|how\s+(?:long|does|do|can)|when\s+(?:is|will)|where|why|questions?\s+about|(?:tell|inform|explain).*(?:about|process)|info(?:rmation)?\s+(?:about|on)|details\s+(?:about|of))\b/i,
      // Providing availability information
      provide_availability: /\b(i\s*(?:am|m)?\s*(?:available|free)|(?:available|free)\s+(?:on|at|in)|today|tomorrow|monday|tuesday|wednesday|thursday|friday|weekday|weekend|this\s+week|next\s+week|any\s+time)\b/i,
      // General scheduling request - least specific, catches remaining scheduling intents
      schedule_interview: /\b(schedule|book|arrange|set\s*up|interview|meet|talk|verification|sign\s*up|register|work\s*with|want\s*to\s*(?:work|join))\b/i
    };
  }

  getConsultantReference() {
    // Return a random consultant reference for natural variation
    const randomIndex = Math.floor(Math.random() * this.consultantReferences.length);
    return this.consultantReferences[randomIndex];
  }

  /**
   * Main entry point for SLM-to-SLM communication
   * Called by existing chat SLM when candidate has pending status
   */
  async handlePendingCandidateMessage(candidateId, message, conversationContext = {}) {
    try {
      console.log(`🤖 SLM Bridge processing pending candidate ${candidateId} message`);

      // Load conversation state from database
      const savedState = await this.getConversationState(candidateId);

      // Merge saved state with passed context for enhanced context
      const enhancedContext = {
        ...conversationContext,
        ...savedState,
        lastMessage: message
      };

      // Analyze message intent with conversation context
      const intent = this.analyzeMessageIntent(message, enhancedContext);

      // Get candidate information
      const candidate = await this.getCandidateInfo(candidateId);

      if (!candidate) {
        return this.generateErrorResponse('candidate_not_found');
      }

      // Handle escalation if needed
      if (intent.needsEscalation) {
        return await this.handleEscalationRequest(candidate, message, intent);
      }

      // Determine conversation flow with enhanced context
      const flow = this.determineConversationFlow(intent, enhancedContext, candidate);

      // Generate appropriate response with enhanced context
      const response = await this.generateFlowResponse(flow, candidate, message, enhancedContext);

      // Verify response quality before returning
      if (!this.verifyResponseQuality(response)) {
        console.error('❌ SLM Bridge generated invalid response:', response);
        return this.generateErrorResponse('system_error', {
          flow: flow.type,
          candidateId: candidate.id
        });
      }

      // Update conversation state after generating response
      await this.updateConversationState(candidateId, {
        conversation_flow: flow.type,
        current_stage: response.schedulingContext?.stage || 'processed',
        time_preference: enhancedContext.timePreference,
        shown_slots: JSON.stringify(response.schedulingContext?.availableSlots || []),
        scheduling_context: JSON.stringify(response.schedulingContext || {}),
        last_message_content: message
      });

      // Execute any scheduling actions
      if (flow.schedulingAction) {
        await this.executeSchedulingAction(flow.schedulingAction, candidate, enhancedContext);
      }

      console.log(`✅ SLM Bridge generated verified response for ${candidate.id}:`, {
        type: response.type,
        flow: flow.type,
        hasSchedulingContext: !!response.schedulingContext,
        conversationStage: response.schedulingContext?.stage
      });

      return response;

    } catch (error) {
      console.error('❌ SLM Bridge error:', error);
      return this.generateErrorResponse('system_error');
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
      console.error('Error loading conversation state:', error);
      return {};
    }
  }

  /**
   * Save/update conversation state in database
   */
  async updateConversationState(candidateId, stateUpdates) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

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
      console.error('Error updating conversation state:', error);
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
      console.error('Error clearing conversation state:', error);
    }
  }

  /**
   * Analyze incoming message to determine intent with conversation context
   */
  analyzeMessageIntent(message, context = {}) {
    const intents = [];
    let slotSelection = null;

    // Check for slot selection if we're in slots_offered stage
    if (context.currentStage === 'slots_offered' && context.shownSlots?.length > 0) {
      slotSelection = this.parseSlotSelection(message, context.shownSlots);
      if (slotSelection) {
        intents.push('select_slot');
      }
    }

    // Check regular intent patterns
    for (const [intentName, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(message)) {
        intents.push(intentName);
      }
    }

    // Check for escalation triggers
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

    // Primary intent is the first match, or 'general' if none
    return {
      primary: intents[0] || 'general',
      secondary: intents.slice(1),
      confidence: intents.length > 0 ? 0.8 : 0.3,
      needsEscalation,
      slotSelection
    };
  }

  /**
   * Parse slot selection from user message
   */
  parseSlotSelection(message, shownSlots) {
    const msg = message.toLowerCase().trim();

    // Pattern 1: Direct number selection ("1", "2", "3")
    const numberMatch = msg.match(/^\s*(\d)\s*$/);
    if (numberMatch) {
      const slotIndex = parseInt(numberMatch[1]) - 1; // Convert to 0-based
      if (slotIndex >= 0 && slotIndex < shownSlots.length) {
        return {
          type: 'index_selection',
          selectedIndex: slotIndex,
          selectedSlot: shownSlots[slotIndex]
        };
      }
    }

    // Pattern 2: Option selection ("option 1", "the first one", "slot 2")
    const optionMatch = msg.match(/(?:option|slot|number|choice)\s*(\d)|(?:the\s*)?(\d)(?:st|nd|rd|th)?\s*(?:one|option|slot)/);
    if (optionMatch) {
      const slotIndex = parseInt(optionMatch[1] || optionMatch[2]) - 1;
      if (slotIndex >= 0 && slotIndex < shownSlots.length) {
        return {
          type: 'option_selection',
          selectedIndex: slotIndex,
          selectedSlot: shownSlots[slotIndex]
        };
      }
    }

    // Pattern 3: Time-based selection ("Wednesday at 9am", "10am slot")
    for (let i = 0; i < shownSlots.length; i++) {
      const slot = shownSlots[i];
      if (this.messageMatchesSlot(msg, slot)) {
        return {
          type: 'time_selection',
          selectedIndex: i,
          selectedSlot: slot
        };
      }
    }

    return null;
  }

  /**
   * Check if message matches a specific slot
   */
  messageMatchesSlot(message, slot) {
    const msg = message.toLowerCase();
    const slotDate = new Date(slot.date);
    const slotTime = slot.time;

    // Check for day name matches
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const slotDay = dayNames[slotDate.getDay()];

    // Check for time matches
    const hour = parseInt(slotTime.split(':')[0]);
    const timeVariations = [
      slotTime, // "09:00"
      `${hour}am`, `${hour}pm`, // "9am", "9pm"
      `${hour}:00am`, `${hour}:00pm`, // "9:00am", "9:00pm"
    ];

    // Return true if message contains both day and time references
    const hasDay = msg.includes(slotDay.substr(0, 3)) || msg.includes(slotDay);
    const hasTime = timeVariations.some(timeVar => msg.includes(timeVar.toLowerCase()));

    return hasDay && hasTime;
  }

  /**
   * Determine conversation flow based on intent and context
   */
  determineConversationFlow(intent, context, candidate) {
    // Check if candidate is already in interview queue
    const inQueue = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_queue WHERE candidate_id = ?
    `).get(candidate.id);

    // Check if candidate has existing scheduled interview
    const hasInterview = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_slots WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
    `).get(candidate.id);

    if (hasInterview) {
      return {
        type: 'existing_interview',
        schedulingAction: null,
        template: 'existing_interview_reminder'
      };
    }

    if (inQueue) {
      return {
        type: 'in_progress_scheduling',
        schedulingAction: 'offer_real_time_slots',
        template: 'real_time_scheduling'
      };
    }

    // New conversation flow based on intent
    switch (intent.primary) {
      case 'morning_preference':
        return {
          type: 'morning_slots',
          schedulingAction: 'offer_morning_slots',
          template: 'morning_slot_options'
        };

      case 'afternoon_preference':
        return {
          type: 'afternoon_slots',
          schedulingAction: 'offer_afternoon_slots',
          template: 'afternoon_slot_options'
        };

      case 'schedule_interview':
        return {
          type: 'schedule_interview',
          schedulingAction: 'add_to_queue',
          template: 'interview_scheduling_offer'
        };

      case 'provide_availability':
        return {
          type: 'collect_availability',
          schedulingAction: 'update_availability',
          template: 'availability_collection'
        };

      case 'select_slot':
        // Handle slot selection based on context
        if (intent.slotSelection) {
          return {
            type: 'slot_selection',
            schedulingAction: null,
            template: 'process_slot_selection',
            selectedSlot: intent.slotSelection.selectedSlot,
            selectedIndex: intent.slotSelection.selectedIndex
          };
        } else {
          return {
            type: 'slot_selection_unclear',
            schedulingAction: null,
            template: 'clarify_slot_selection'
          };
        }

      case 'confirm_booking':
        return {
          type: 'confirm_interview',
          schedulingAction: 'confirm_booking',
          template: 'booking_confirmation'
        };

      default:
        return {
          type: 'initial_welcome',
          schedulingAction: 'add_to_queue',
          template: 'welcome_with_interview_offer'
        };
    }
  }

  /**
   * Generate response based on conversation flow
   */
  async generateFlowResponse(flow, candidate, message, context) {
    const templates = {
      welcome_with_interview_offer: () => this.generateWelcomeWithScheduling(candidate),
      interview_scheduling_offer: () => this.generateInterviewOffer(candidate),
      morning_slot_options: () => this.generateMorningSlotOptions(candidate),
      afternoon_slot_options: () => this.generateAfternoonSlotOptions(candidate),
      availability_collection: () => this.collectAvailabilityPreferences(candidate, message),
      slot_selection_confirmation: () => this.generateSlotSelectionConfirmation(candidate, message, context),
      process_slot_selection: () => this.processSlotSelection(candidate, flow, context),
      clarify_slot_selection: () => this.clarifySlotSelection(candidate, context),
      booking_confirmation: () => this.confirmInterviewBooking(candidate, context),
      existing_interview_reminder: () => this.generateExistingInterviewReminder(candidate),
      real_time_scheduling: () => this.generateRealTimeSchedulingOffer(candidate)
    };

    const templateFunction = templates[flow.template];

    if (templateFunction) {
      return await templateFunction();
    } else {
      return this.generateGenericResponse(candidate);
    }
  }

  /**
   * Enhanced welcome message with interview scheduling offer
   */
  async generateWelcomeWithScheduling(candidate) {
    const firstName = candidate.name.split(' ')[0];
    const consultantRef = this.getConsultantReference();

    return {
      type: 'welcome_with_scheduling',
      content: `Hi ${firstName}! 👋 Welcome to WorkLink!

Your account is being reviewed by our team. While you wait, I can help speed up the process by scheduling a quick verification interview with ${consultantRef}.

📅 **Do you prefer morning (9AM-1PM) or afternoon (2PM-6PM) for your interview?**

This will help fast-track your approval process!`,
      metadata: {
        candidateId: candidate.id,
        flow: 'welcome_with_scheduling',
        nextExpected: ['morning_preference', 'afternoon_preference']
      },
      schedulingContext: {
        stage: 'initial_offer',
        priority: 0.7 // Higher priority for responsive candidates
      },
      quickReplies: ['Morning', 'Afternoon']
    };
  }

  /**
   * Generate morning slot options (9AM-1PM)
   */
  async generateMorningSlotOptions(candidate) {
    const firstName = candidate.name.split(' ')[0];

    // Get morning slots only (9AM-1PM)
    const morningSlots = await this.getMorningSlots(7);
    const topSlots = morningSlots.slice(0, 3);

    if (topSlots.length > 0) {
      const slotOptions = topSlots.map((slot, index) =>
        `${index + 1}. ${this.formatSlotDateTime(slot)}`
      ).join('\n');

      return {
        type: 'morning_slot_options',
        content: `Perfect! Here are the best morning slots available for you, ${firstName}:

📅 **Morning Interview Options (9AM-1PM):**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), and I'll book it immediately! ⚡

✅ **What you'll get:**
• 15-minute verification call
• Fast-track account approval
• Priority access to opportunities`,
        metadata: {
          candidateId: candidate.id,
          flow: 'morning_slots_offered',
          slots: topSlots,
          timePreference: 'morning'
        },
        schedulingContext: {
          stage: 'slots_offered',
          priority: 0.9,
          timePreference: 'morning',
          availableSlots: topSlots,
          shownSlots: topSlots
        }
      };
    } else {
      return {
        type: 'no_morning_slots',
        content: `Hi ${firstName}! I don't have any morning slots available in the next week.

Would you like to try **afternoon slots (2PM-6PM)** instead? Just reply "Afternoon" and I'll show you the available options!

Or I can connect you with our admin team for more scheduling options.`,
        metadata: {
          candidateId: candidate.id,
          flow: 'no_morning_availability'
        },
        quickReplies: ['Afternoon', 'Contact Admin']
      };
    }
  }

  /**
   * Generate afternoon slot options (2PM-6PM)
   */
  async generateAfternoonSlotOptions(candidate) {
    const firstName = candidate.name.split(' ')[0];

    // Get afternoon slots only (2PM-6PM)
    const afternoonSlots = await this.getAfternoonSlots(7);
    const topSlots = afternoonSlots.slice(0, 3);

    if (topSlots.length > 0) {
      const slotOptions = topSlots.map((slot, index) =>
        `${index + 1}. ${this.formatSlotDateTime(slot)}`
      ).join('\n');

      return {
        type: 'afternoon_slot_options',
        content: `Excellent choice! Here are the best afternoon slots for you, ${firstName}:

📅 **Afternoon Interview Options (2PM-6PM):**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), and I'll book it immediately! ⚡

✅ **What you'll get:**
• 15-minute verification call
• Fast-track account approval
• Priority access to opportunities`,
        metadata: {
          candidateId: candidate.id,
          flow: 'afternoon_slots_offered',
          slots: topSlots,
          timePreference: 'afternoon'
        },
        schedulingContext: {
          stage: 'slots_offered',
          priority: 0.9,
          timePreference: 'afternoon',
          availableSlots: topSlots,
          shownSlots: topSlots
        }
      };
    } else {
      return {
        type: 'no_afternoon_slots',
        content: `Hi ${firstName}! I don't have any afternoon slots available in the next week.

Would you like to try **morning slots (9AM-1PM)** instead? Just reply "Morning" and I'll show you the available options!

Or I can connect you with our admin team for more scheduling options.`,
        metadata: {
          candidateId: candidate.id,
          flow: 'no_afternoon_availability'
        },
        quickReplies: ['Morning', 'Contact Admin']
      };
    }
  }

  /**
   * Generate interview offer
   */
  async generateInterviewOffer(candidate) {
    const firstName = candidate.name.split(' ')[0];
    const consultantRef = this.getConsultantReference();

    // Check available slots for next 7 days
    const availableSlots = await this.getAvailableSlots(7);
    const nextSlot = availableSlots[0];

    let slotText = '';
    if (nextSlot) {
      slotText = `\n🎯 **Next available slot**: ${this.formatSlotDateTime(nextSlot)}`;
    }

    return {
      type: 'interview_offer',
      content: `Perfect, ${firstName}! I'd love to schedule your verification interview. 📅

This will be a quick 15-minute chat with ${consultantRef} to:
✅ Verify your profile and experience
✅ Understand your career goals
✅ Fast-track your account approval
✅ Show you exciting opportunities available

${slotText}

**How would you like to proceed?**
1. 📱 "**BOOK NOW**" - I'll schedule the next available slot
2. 🕐 "**MY AVAILABILITY**" - Tell me your preferred times
3. ❓ "**QUESTIONS**" - Ask anything about the process

What works best for you?`,
      metadata: {
        candidateId: candidate.id,
        flow: 'interview_offer',
        availableSlot: nextSlot
      },
      schedulingContext: {
        stage: 'offer_made',
        priority: 0.8
      }
    };
  }

  /**
   * Collect availability preferences
   */
  async collectAvailabilityPreferences(candidate, message) {
    const firstName = candidate.name.split(' ')[0];

    // Parse availability from message
    const availability = this.parseAvailabilityFromMessage(message);

    if (availability.found) {
      // Find slots matching their preferences
      const matchingSlots = await this.findSlotsMatchingPreferences(availability, context.timePreference);

      if (matchingSlots.length > 0) {
        const topSlots = matchingSlots.slice(0, 3);
        const slotOptions = topSlots.map((slot, index) =>
          `${index + 1}. ${this.formatSlotDateTime(slot)}`
        ).join('\n');

        return {
          type: 'availability_options',
          content: `Great, ${firstName}! Based on your availability, here are the best options:

📅 **Available Interview Slots:**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), or:
• "**1**" for ${this.formatSlotDateTime(topSlots[0])}
• "**DIFFERENT TIME**" if none of these work
• "**QUESTIONS**" if you need more info

I'll book it immediately once you confirm! ⚡`,
          metadata: {
            candidateId: candidate.id,
            flow: 'availability_collected',
            slots: topSlots
          },
          schedulingContext: {
            stage: 'slots_offered',
            priority: 0.9, // Very high priority - candidate is engaged
            availabilityPreferences: availability
          }
        };
      }
    }

    // Couldn't parse availability or no slots found
    return {
      type: 'availability_clarification',
      content: `Thanks ${firstName}! To find the perfect time slot, could you help me understand your schedule better?

🕐 **Please let me know:**
• **Days**: Which days work best? (weekdays/weekends)
• **Time**: Morning (9-12), Afternoon (1-5), or Evening (6-8)?
• **Timezone**: Are you in Singapore timezone?

**Example responses:**
• "Weekday mornings work best"
• "Tuesday or Wednesday afternoon"
• "Any time except Monday"

Once I know your preferences, I can find the perfect slot! 🎯`,
      metadata: {
        candidateId: candidate.id,
        flow: 'availability_clarification'
      }
    };
  }

  /**
   * Process slot selection when user picks a specific slot
   */
  async processSlotSelection(candidate, flow, context) {
    const firstName = candidate.name.split(' ')[0];

    try {
      // Get the selected slot from the flow or context
      let selectedSlot = flow.selectedSlot;

      // If not in flow, get from stored context
      if (!selectedSlot && context.shownSlots && flow.selectedIndex !== undefined) {
        selectedSlot = context.shownSlots[flow.selectedIndex];
      }

      if (!selectedSlot) {
        return this.generateErrorResponse('slot_not_found');
      }

      const formattedDateTime = this.formatSlotDateTime(selectedSlot);

      // Update conversation state with selected slot
      await this.updateConversationState(candidate.id, {
        current_stage: 'slot_selected',
        selected_slot_index: flow.selectedIndex,
        scheduling_context: JSON.stringify({
          selectedSlot,
          stage: 'slot_selected'
        })
      });

      return {
        type: 'slot_selection_confirmation',
        content: `Perfect choice, ${firstName}! 🎯

📅 **You've selected**: ${formattedDateTime}
⏰ **Duration**: 15 minutes
💻 **Meeting Type**: Video call
👥 **Interviewer**: ${this.getConsultantReference()}

✅ **Ready to confirm this interview?**

Reply "**CONFIRM**" to book this slot, or "**DIFFERENT TIME**" if you'd like to see other options.

This interview will help fast-track your account approval! 🚀`,
        metadata: {
          candidateId: candidate.id,
          selectedSlot,
          selectedIndex: flow.selectedIndex
        },
        schedulingContext: {
          stage: 'slot_selected',
          selectedSlot,
          selectedIndex: flow.selectedIndex,
          priority: 0.95
        }
      };

    } catch (error) {
      console.error('Error processing slot selection:', error);
      return this.generateErrorResponse('slot_not_found');
    }
  }

  /**
   * Clarify slot selection when user input is ambiguous
   */
  async clarifySlotSelection(candidate, context) {
    const firstName = candidate.name.split(' ')[0];

    if (context.shownSlots && context.shownSlots.length > 0) {
      const slotOptions = context.shownSlots.map((slot, index) =>
        `${index + 1}. ${this.formatSlotDateTime(slot)}`
      ).join('\n');

      return {
        type: 'slot_selection_clarification',
        content: `Hi ${firstName}! I want to make sure I book the right time for you.

📅 **Available options:**
${slotOptions}

Please reply with the **number** of your preferred slot (1, 2, or 3), like this:
• "**1**" for the first option
• "**2**" for the second option
• "**3**" for the third option

Which one works best for you? 🎯`,
        metadata: {
          candidateId: candidate.id,
          availableSlots: context.shownSlots
        },
        schedulingContext: {
          stage: 'slots_offered',
          availableSlots: context.shownSlots,
          priority: 0.9
        }
      };
    } else {
      // No stored slots, redirect to availability collection
      return this.generateWelcomeWithScheduling(candidate);
    }
  }

  /**
   * Confirm interview booking
   */
  async confirmInterviewBooking(candidate, context) {
    const firstName = candidate.name.split(' ')[0];

    try {
      // Get the selected slot from conversation state
      let selectedSlot = null;

      if (context.selectedSlot) {
        selectedSlot = context.selectedSlot;
      } else if (context.shownSlots && context.selectedSlotIndex !== undefined) {
        selectedSlot = context.shownSlots[context.selectedSlotIndex];
      } else if (context.schedulingContext?.selectedSlot) {
        selectedSlot = context.schedulingContext.selectedSlot;
      }

      if (!selectedSlot) {
        return this.generateErrorResponse('slot_not_found');
      }

      // Book the interview through scheduling engine
      // Note: scheduleInterview expects candidate_id field, not id
      const candidateForBooking = {
        ...candidate,
        candidate_id: candidate.id
      };
      const bookingResult = await this.schedulingEngine.scheduleInterview(candidateForBooking, selectedSlot);

      if (bookingResult) {
        // Direct booking successful - no queue management needed
        console.log(`📅 Direct booking confirmed for candidate ${candidate.id}`);

        // Clear conversation state after successful booking
        await this.clearConversationState(candidate.id);

        // Generate meeting link and confirmation details
        const meetingLink = `https://meet.worklink.com/interview/${bookingResult}`;
        const dateTime = this.formatSlotDateTime(selectedSlot);

        return {
          type: 'booking_confirmed',
          content: `🎉 **Interview Confirmed!**

Hi ${firstName}, your verification interview is booked:

📅 **Interview Details:**
• **Date & Time**: ${dateTime}
• **Duration**: 15 minutes
• **Meeting Link**: ${meetingLink}
• **Interviewer**: ${this.getConsultantReference()}

📱 **What's Next:**
1. ✅ **Calendar Invite** - You'll receive an email confirmation shortly
2. 🔔 **Reminder** - I'll remind you 24 hours before
3. 📋 **Preparation** - Have your resume ready (optional)
4. 💻 **Join Link** - Use the meeting link above when it's time

**Questions?** Just ask! I'm here to help.

Looking forward to meeting you! 🚀

*P.S. Your account approval will be fast-tracked after this interview.*`,
          metadata: {
            candidateId: candidate.id,
            interviewId: bookingResult,
            meetingLink,
            scheduledTime: selectedSlot
          },
          schedulingContext: {
            stage: 'confirmed',
            status: 'scheduled'
          }
        };
      } else {
        return this.generateErrorResponse('booking_failed');
      }

    } catch (error) {
      console.error('Booking confirmation error:', error);
      return this.generateErrorResponse('booking_failed');
    }
  }

  /**
   * Generate slot selection confirmation when user requests specific time
   */
  async generateSlotSelectionConfirmation(candidate, message, context) {
    const firstName = candidate.name.split(' ')[0];

    // Parse the specific slot request from the message
    const requestedSlot = this.parseSpecificSlotRequest(message);

    if (requestedSlot) {
      // Check if the requested slot is available
      const availableSlots = await this.getAvailableSlots(14);
      const matchingSlot = this.findMatchingSlot(availableSlots, requestedSlot);

      if (matchingSlot) {
        const formattedDateTime = this.formatSlotDateTime(matchingSlot);

        return {
          type: 'slot_selection_confirmation',
          content: `Perfect, ${firstName}! I can book you for ${formattedDateTime}.

📅 **Interview Details:**
• **Date & Time**: ${formattedDateTime}
• **Duration**: 15 minutes
• **Meeting Type**: Video call
• **Interviewer**: ${this.getConsultantReference()}

✅ **Ready to confirm your interview?**

Reply "**CONFIRM**" to book this slot, or "**DIFFERENT TIME**" to see other options.

This interview will help fast-track your account approval! 🚀`,
          metadata: {
            candidateId: candidate.id,
            selectedSlot: matchingSlot,
            requestedTime: requestedSlot
          },
          schedulingContext: {
            stage: 'slot_selected',
            selectedSlot: matchingSlot,
            priority: 0.95 // Very high priority for engaged candidates
          }
        };
      } else {
        // Requested slot not available - offer alternatives
        const topSlots = availableSlots.slice(0, 3);
        const slotOptions = topSlots.map((slot, index) =>
          `${index + 1}. ${this.formatSlotDateTime(slot)}`
        ).join('\n');

        return {
          type: 'slot_unavailable_alternatives',
          content: `I understand you'd like to book for ${requestedSlot.originalText}, ${firstName}!

Unfortunately, that specific time slot isn't available. However, I have these great alternatives:

📅 **Available Interview Slots:**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), or let me know your other preferences!

All slots are 15-minute verification calls that will help fast-track your approval. 🎯`,
          metadata: {
            candidateId: candidate.id,
            requestedSlot: requestedSlot,
            availableSlots: topSlots
          },
          schedulingContext: {
            stage: 'offering_alternatives',
            priority: 0.9
          }
        };
      }
    } else {
      // Couldn't parse specific slot - fall back to offering options
      return this.generateRealTimeSchedulingOffer(candidate);
    }
  }

  /**
   * Handle reschedule requests
   */
  async handleRescheduleRequest(candidate, context) {
    const firstName = candidate.name.split(' ')[0];

    // Find existing interview
    const existingInterview = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_slots
      WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
    `).get(candidate.id);

    if (existingInterview) {
      return {
        type: 'reschedule_offer',
        content: `No problem, ${firstName}! I can help you reschedule your interview.

📅 **Current Booking**: ${this.formatSlotDateTime({
          date: existingInterview.scheduled_date,
          time: existingInterview.scheduled_time
        })}

**To reschedule:**
1. 🕐 Tell me your new availability preferences
2. ⚡ Or reply "**NEXT AVAILABLE**" for the earliest slot
3. 📞 Or call/WhatsApp Augustine directly: [contact info]

What works better for you?`,
        metadata: {
          candidateId: candidate.id,
          existingInterviewId: existingInterview.id
        }
      };
    } else {
      return this.generateInterviewOffer(candidate);
    }
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
          // Store morning preference for candidate
          try {
            this.schedulingEngine.db.prepare(`
              INSERT OR REPLACE INTO interview_queue
              (candidate_id, priority_score, preferred_times, queue_status, notes)
              VALUES (?, 0.8, ?, 'contacted', 'Prefers morning slots (9AM-1PM)')
            `).run(candidate.id, JSON.stringify({ timePreference: 'morning' }));
          } catch (error) {
            console.error('Error storing morning preference:', error);
          }
          break;

        case 'offer_afternoon_slots':
          // Store afternoon preference for candidate
          try {
            this.schedulingEngine.db.prepare(`
              INSERT OR REPLACE INTO interview_queue
              (candidate_id, priority_score, preferred_times, queue_status, notes)
              VALUES (?, 0.8, ?, 'contacted', 'Prefers afternoon slots (2PM-6PM)')
            `).run(candidate.id, JSON.stringify({ timePreference: 'afternoon' }));
          } catch (error) {
            console.error('Error storing afternoon preference:', error);
          }
          break;

        case 'update_queue_priority':
          // Increase priority for engaged candidates
          this.schedulingEngine.db.prepare(`
            UPDATE interview_queue
            SET priority_score = 0.9, urgency_level = 'high'
            WHERE candidate_id = ?
          `).run(candidate.id);
          break;

        case 'confirm_booking':
          // Handled in confirmInterviewBooking
          break;

        case 'update_availability':
          // Store candidate availability preferences
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
      console.error('Scheduling action error:', error);
    }
  }

  /**
   * Helper methods
   */

  async getCandidateInfo(candidateId) {
    try {
      return db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    } catch (error) {
      console.error('Database error in getCandidateInfo:', error);
      return null;
    }
  }

  async getAvailableSlots(days = 7) {
    const slots = [];
    const today = new Date();

    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateStr = date.toISOString().split('T')[0];
      const daySlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

      for (const time of daySlots) {
        if (await this.schedulingEngine.isSlotAvailable(dateStr, time)) {
          slots.push({ date: dateStr, time });
        }
      }
    }

    return slots.slice(0, 10); // Return top 10 available slots
  }

  async getMorningSlots(days = 7) {
    const slots = [];
    const today = new Date();

    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateStr = date.toISOString().split('T')[0];
      const morningSlots = ['09:00', '10:00', '11:00', '12:00', '13:00']; // 9AM-1PM

      for (const time of morningSlots) {
        if (await this.schedulingEngine.isSlotAvailable(dateStr, time)) {
          slots.push({ date: dateStr, time });
        }
      }
    }

    return slots.slice(0, 10); // Return top 10 available morning slots
  }

  async getAfternoonSlots(days = 7) {
    const slots = [];
    const today = new Date();

    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateStr = date.toISOString().split('T')[0];
      const afternoonSlots = ['14:00', '15:00', '16:00', '17:00', '18:00']; // 2PM-6PM

      for (const time of afternoonSlots) {
        if (await this.schedulingEngine.isSlotAvailable(dateStr, time)) {
          slots.push({ date: dateStr, time });
        }
      }
    }

    return slots.slice(0, 10); // Return top 10 available afternoon slots
  }

  async findSlotsMatchingPreferences(preferences, timePreference = null) {
    // Use stored time preference if available, or extract from preferences
    const preferredTime = timePreference ||
      (preferences.timePreference) ||
      (preferences.times && preferences.times[0]);

    // If we have a specific time preference, use specialized methods
    if (preferredTime === 'morning') {
      return await this.getMorningSlots(14);
    } else if (preferredTime === 'afternoon') {
      return await this.getAfternoonSlots(14);
    }

    // Fall back to original filtering logic
    const allSlots = await this.getAvailableSlots(14);

    return allSlots.filter(slot => {
      const slotDate = new Date(slot.date);
      const slotHour = parseInt(slot.time.split(':')[0]);

      // Match day preferences
      if (preferences.days && preferences.days.length > 0) {
        const dayOfWeek = slotDate.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const slotDayName = dayNames[dayOfWeek];

        if (!preferences.days.some(day => slotDayName.includes(day.toLowerCase()))) {
          return false;
        }
      }

      // Match time preferences from text parsing
      if (preferences.times && preferences.times.length > 0) {
        const timeMatches = preferences.times.some(time => {
          if (time.includes('morning') && slotHour >= 9 && slotHour <= 13) return true;
          if (time.includes('afternoon') && slotHour >= 14 && slotHour <= 18) return true;
          if (time.includes('evening') && slotHour >= 18 && slotHour <= 20) return true;
          return false;
        });

        if (!timeMatches) return false;
      }

      return true;
    });
  }

  parseAvailabilityFromMessage(message) {
    const msg = message.toLowerCase();

    const days = [];
    const times = [];
    let timezone = 'Asia/Singapore'; // Default

    // Parse days
    const dayPatterns = {
      'monday': ['monday', 'mon'],
      'tuesday': ['tuesday', 'tue'],
      'wednesday': ['wednesday', 'wed'],
      'thursday': ['thursday', 'thu'],
      'friday': ['friday', 'fri'],
      'saturday': ['saturday', 'sat'],
      'sunday': ['sunday', 'sun'],
      'weekday': ['weekday', 'weekdays'],
      'weekend': ['weekend', 'weekends']
    };

    for (const [day, patterns] of Object.entries(dayPatterns)) {
      if (patterns.some(pattern => msg.includes(pattern))) {
        days.push(day);
      }
    }

    // Parse times
    const timePatterns = {
      'morning': ['morning', '9am', '10am', '11am', 'before noon'],
      'afternoon': ['afternoon', '1pm', '2pm', '3pm', '4pm', '5pm'],
      'evening': ['evening', '6pm', '7pm', '8pm', 'after work']
    };

    for (const [time, patterns] of Object.entries(timePatterns)) {
      if (patterns.some(pattern => msg.includes(pattern))) {
        times.push(time);
      }
    }

    return {
      found: days.length > 0 || times.length > 0,
      days,
      times,
      timezone,
      rawMessage: message
    };
  }

  formatSlotDateTime(slot) {
    const date = new Date(slot.date);
    const time = slot.time;

    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Singapore'
    };

    const dateStr = date.toLocaleDateString('en-US', options);
    const timeStr = this.formatTime(time);

    return `${dateStr} at ${timeStr}`;
  }

  formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Parse specific slot request from user message
   */
  parseSpecificSlotRequest(message) {
    const msg = message.toLowerCase();

    // Extract time patterns (2pm, 10am, 14:00, option 1, etc.)
    const timePatterns = [
      // Specific times like "2pm", "10am", "14:00"
      /(?:can\s*i\s*(?:have|get|take|book)|i(?:'ll|.ll|\s*will)?\s*(?:take|want|choose|pick)|(?:give\s*me|let(?:'s|\s*me)\s*take))\s*(?:the\s*)?(\d{1,2})(?::\d{2})?\s*(am|pm)/i,
      // Option numbers like "option 1", "the first one", "number 2"
      /(?:option|slot|number|choice)\s*(\d)/i,
      /(?:the\s*)?(\d)(?:st|nd|rd|th)?\s*(?:one|option|slot)/i,
      // Just numbers "1", "2", "3"
      /^\s*(\d)\s*$/i,
      // Standalone times "2pm", "10am"
      /^\s*(\d{1,2})(?::\d{2})?\s*(am|pm)\s*$/i
    ];

    for (const pattern of timePatterns) {
      const match = msg.match(pattern);
      if (match) {
        if (match[2] && (match[2] === 'am' || match[2] === 'pm')) {
          // Time with am/pm
          const hour = parseInt(match[1]);
          const period = match[2];
          const hour24 = period === 'pm' && hour !== 12 ? hour + 12 :
                        period === 'am' && hour === 12 ? 0 : hour;

          return {
            type: 'specific_time',
            hour: hour24,
            originalText: `${hour}${period}`,
            timeString: `${hour24.toString().padStart(2, '0')}:00`
          };
        } else if (match[1] && !match[2]) {
          // Option number (1, 2, 3)
          const optionNumber = parseInt(match[1]);
          return {
            type: 'option_number',
            optionIndex: optionNumber - 1, // Convert to 0-based index
            originalText: `option ${optionNumber}`
          };
        }
      }
    }

    return null;
  }

  /**
   * Find matching slot from available slots based on parsed request
   */
  findMatchingSlot(availableSlots, requestedSlot) {
    if (!requestedSlot) return null;

    if (requestedSlot.type === 'specific_time') {
      // Find slot that matches the requested time
      return availableSlots.find(slot => {
        const slotHour = parseInt(slot.time.split(':')[0]);
        return slotHour === requestedSlot.hour;
      });
    } else if (requestedSlot.type === 'option_number') {
      // Return the slot at the specified index (from previously shown options)
      return availableSlots[requestedSlot.optionIndex];
    }

    return null;
  }

  /**
   * Format a Date object for interview display
   * @param {Date} dateTime - Date object to format
   * @returns {string} - Formatted date/time string
   */
  formatInterviewDateTime(dateTime) {
    if (!(dateTime instanceof Date) || isNaN(dateTime)) {
      // Handle invalid dates gracefully
      return 'Date to be confirmed';
    }

    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Singapore'
    };

    return dateTime.toLocaleString('en-SG', options);
  }

  generateErrorResponse(errorType) {
    const errorMessages = {
      candidate_not_found: 'Sorry, I couldn\'t find your profile. Please contact support.',
      slot_not_found: 'I couldn\'t find that time slot. Let me show you available options.',
      booking_failed: 'Sorry, there was an issue booking your interview. Let me try again or show you other options.',
      system_error: 'I\'m experiencing technical difficulties. Please try again in a moment.'
    };

    return {
      type: 'error',
      content: errorMessages[errorType] || errorMessages.system_error,
      metadata: { errorType }
    };
  }

  generateGenericResponse(candidate) {
    const firstName = candidate.name.split(' ')[0];

    return {
      type: 'generic',
      content: `Hi ${firstName}! I'm here to help with your WorkLink verification process.

Would you like me to:
📅 **Schedule your verification interview**
❓ **Answer questions about the process**
🔄 **Check your application status**

Just let me know how I can assist you! 😊`
    };
  }

  /**
   * Generate existing interview reminder
   */
  async generateExistingInterviewReminder(candidate) {
    const firstName = candidate.name.split(' ')[0];

    // Get existing interview details
    const existingInterview = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_slots
      WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
      ORDER BY scheduled_date, scheduled_time
      LIMIT 1
    `).get(candidate.id);

    if (existingInterview) {
      return {
        type: 'existing_interview_reminder',
        content: `Hi ${firstName}! 👋 You already have an interview scheduled.

📅 **Your Interview Details:**
• **Date & Time**: ${this.formatSlotDateTime({
          date: existingInterview.scheduled_date,
          time: existingInterview.scheduled_time
        })}
• **Duration**: 15 minutes
• **Meeting Link**: ${existingInterview.meeting_link || 'Will be provided 24 hours before'}

📱 **Need to make changes?**
• Reply "**RESCHEDULE**" to change the time
• Reply "**CONFIRM**" to confirm attendance
• Reply "**QUESTIONS**" if you need more info

Looking forward to meeting you! 🚀`,
        metadata: {
          candidateId: candidate.id,
          interviewId: existingInterview.id,
          scheduledTime: {
            date: existingInterview.scheduled_date,
            time: existingInterview.scheduled_time
          }
        }
      };
    } else {
      // No existing interview - redirect to scheduling
      return this.generateInterviewOffer(candidate);
    }
  }

  /**
   * Check real calendar availability and offer scheduling
   */
  async generateRealTimeSchedulingOffer(candidate) {
    const firstName = candidate.name.split(' ')[0];

    // Check if already has scheduled interview
    const existingInterview = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_slots
      WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
    `).get(candidate.id);

    if (existingInterview) {
      const interviewDate = new Date(existingInterview.scheduled_date + 'T' + existingInterview.scheduled_time);
      const formattedDate = this.formatInterviewDateTime(interviewDate);

      return {
        type: 'existing_interview',
        content: `Hi ${firstName}! You already have a verification interview scheduled:

📅 **${formattedDate}**
⏰ **30 minutes**
🔗 **Meeting link**: ${existingInterview.meeting_link}

You'll receive a reminder 24 hours before. Need to reschedule? Just let me know!`,
        metadata: {
          candidateId: candidate.id,
          interviewId: existingInterview.id,
          scheduledDateTime: formattedDate
        }
      };
    }

    // Get real available slots from calendar
    const availableSlots = await this.getAvailableCalendarSlots();

    if (availableSlots.length > 0) {
      const topSlots = availableSlots.slice(0, 3);
      const slotsList = topSlots.map((slot, index) =>
        `${index + 1}. **${this.formatInterviewDateTime(slot.datetime)}**`
      ).join('\n');

      return {
        type: 'real_time_scheduling',
        content: `Perfect! I can schedule your verification interview right now. Here are the next available slots:

📅 **Available Times:**
${slotsList}

Simply reply with the number of your preferred time (1, 2, or 3) and I'll book it immediately!

Need different times? Just ask and I'll check our calendar for more options.`,
        metadata: {
          candidateId: candidate.id,
          availableSlots: topSlots.map((slot, index) => ({
            id: index + 1,
            datetime: slot.datetime,
            consultant_id: slot.consultant_id || 'primary'
          }))
        }
      };
    } else {
      return {
        type: 'no_availability',
        content: `Hi ${firstName}! I'd love to schedule your verification interview, but our calendar is currently full for the next few days.

Let me connect you with our admin team who can:
• Check for any last-minute openings
• Schedule you for next available slot
• Provide updates on availability

They'll reach out to you shortly!`,
        metadata: {
          candidateId: candidate.id,
          escalateReason: 'no_calendar_availability'
        }
      };
    }
  }

  /**
   * Get real available slots from admin calendar
   */
  async getAvailableCalendarSlots(daysAhead = 14) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + daysAhead);

    // Get consultant availability from calendar
    const availabilitySlots = this.schedulingEngine.db.prepare(`
      SELECT date, start_time, end_time, consultant_id, slot_type
      FROM consultant_availability
      WHERE date >= ? AND date <= ?
        AND is_available = 1
        AND slot_type = 'interview'
      ORDER BY date ASC, start_time ASC
    `).all(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    // Get already booked slots to exclude them
    const bookedSlots = this.schedulingEngine.db.prepare(`
      SELECT scheduled_date, scheduled_time, duration_minutes
      FROM interview_slots
      WHERE scheduled_date >= ? AND scheduled_date <= ?
        AND status IN ('scheduled', 'confirmed')
    `).all(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    // Convert to Set for faster lookup
    const bookedTimes = new Set(
      bookedSlots.map(slot => `${slot.scheduled_date}T${slot.scheduled_time}`)
    );

    // Filter available slots that aren't booked
    const realAvailableSlots = [];

    for (const slot of availabilitySlots) {
      const slotDateTime = `${slot.date}T${slot.start_time}`;

      // Skip if already booked
      if (bookedTimes.has(slotDateTime)) {
        continue;
      }

      // Skip if slot is in the past
      const slotTime = new Date(`${slot.date}T${slot.start_time}`);
      if (slotTime <= new Date()) {
        continue;
      }

      realAvailableSlots.push({
        datetime: slotTime,
        date: slot.date,
        time: slot.start_time,
        consultant_id: slot.consultant_id || 'primary',
        slot_type: slot.slot_type
      });

      // Limit to reasonable number of slots
      if (realAvailableSlots.length >= 10) {
        break;
      }
    }

    return realAvailableSlots;
  }

  /**
   * Health check method for Smart Router verification
   */
  async performHealthCheck() {
    try {
      // Check database connectivity
      const { db } = require('../db');

      // Test basic database query
      const testQuery = db.prepare('SELECT COUNT(*) as count FROM candidates LIMIT 1').get();

      // Check scheduling engine connectivity
      const engineHealthy = await this.schedulingEngine.isHealthy();

      // Test slot availability functionality
      const testSlots = await this.getAvailableSlots(1);

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

      console.log('🩺 SLM Bridge health check:', healthStatus);
      return healthStatus;

    } catch (error) {
      console.error('❌ SLM Bridge health check failed:', error);
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
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Must have content
    if (!response.content || typeof response.content !== 'string' || response.content.trim().length < 10) {
      return false;
    }

    // Must have type
    if (!response.type) {
      return false;
    }

    // Should not be error type unless it's a legitimate error response
    if (response.type === 'error' && !response.metadata?.errorType) {
      return false;
    }

    return true;
  }

  /**
   * Enhanced error response with better details
   */
  generateErrorResponse(errorType, details = {}) {
    const errorMessages = {
      candidate_not_found: 'Sorry, I couldn\'t find your profile. Please contact support.',
      slot_not_found: 'I couldn\'t find that time slot. Let me show you available options.',
      booking_failed: 'Sorry, there was an issue booking your interview. Let me try again or show you other options.',
      system_error: 'I\'m experiencing technical difficulties. Please try again in a moment.',
      health_check_failed: 'I\'m having connectivity issues. Our admin team has been notified and will assist you shortly.'
    };

    return {
      type: 'error',
      content: errorMessages[errorType] || errorMessages.system_error,
      metadata: {
        errorType,
        timestamp: new Date().toISOString(),
        ...details
      }
    };
  }

  /**
   * Handle escalation requests for scheduling issues
   */
  async handleEscalationRequest(candidate, message, intent) {
    const firstName = candidate.name.split(' ')[0];

    try {
      // Import escalation system
      const AdminEscalationSystem = require('../services/admin-escalation-system');
      const escalationSystem = new AdminEscalationSystem();

      // Create escalation based on the type of request
      let escalationData = {
        candidateId: candidate.id,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        urgency: 'HIGH',
        triggerType: 'CHAT_RESCHEDULE_REQUEST',
        context: {
          originalMessage: message,
          intent: intent.primary,
          conversationStage: 'scheduling_flow'
        },
        title: `Scheduling assistance requested by ${candidate.name}`,
        description: `Candidate requested scheduling assistance: "${message}"`
      };

      // Get existing interview details if any
      const existingInterview = this.schedulingEngine.db.prepare(`
        SELECT * FROM interview_slots
        WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
        ORDER BY scheduled_date DESC, scheduled_time DESC
        LIMIT 1
      `).get(candidate.id);

      if (existingInterview) {
        escalationData.context.existingInterview = {
          scheduledDate: existingInterview.scheduled_date,
          scheduledTime: existingInterview.scheduled_time,
          interviewId: existingInterview.id
        };

        // Check if it's within 24 hours (higher priority)
        const now = new Date();
        const interviewDateTime = new Date(`${existingInterview.scheduled_date}T${existingInterview.scheduled_time}`);
        const hoursUntilInterview = (interviewDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilInterview <= 24) {
          escalationData.urgency = 'CRITICAL';
          escalationData.triggerType = 'RESCHEDULE_WITHIN_24H';
          escalationData.title = `URGENT: Reschedule request within 24 hours - ${candidate.name}`;
        }
      }

      // Create the escalation
      await escalationSystem.createEscalation(escalationData);

      return {
        type: 'escalation_created',
        content: `Hi ${firstName}! I understand you need help with scheduling.

I've connected you with our admin team who can provide personalized assistance. They'll reach out to you shortly to help resolve your scheduling needs.

In the meantime, if this is urgent, you can also call/WhatsApp Augustine directly for immediate assistance.

Is there anything else I can help you with while you wait? 🤝`,
        metadata: {
          candidateId: candidate.id,
          escalated: true,
          escalationType: escalationData.triggerType
        }
      };

    } catch (error) {
      console.error('Error creating escalation:', error);

      // Fallback response if escalation fails
      return {
        type: 'escalation_fallback',
        content: `Hi ${firstName}! I understand you need help with scheduling.

I'll connect you with our admin team for personalized assistance. In the meantime, you can reach out directly for immediate help.

Is there anything else I can assist you with? 🤝`,
        metadata: {
          candidateId: candidate.id,
          escalationError: true
        }
      };
    }
  }

  /**
   * Integration method for existing chat system
   * This should be called from your existing chat SLM when candidate status is 'pending'
   */
  async integrateWithChatSLM(candidateId, message, existingContext = {}) {
    // Check if candidate has pending status
    const candidate = await this.getCandidateInfo(candidateId);

    if (!candidate || candidate.status !== 'pending') {
      return null; // Let existing SLM handle non-pending candidates
    }

    // Handle the message through our scheduling bridge
    return await this.handlePendingCandidateMessage(candidateId, message, existingContext);
  }
}

module.exports = SLMSchedulingBridge;