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

    // Intent recognition patterns
    this.intentPatterns = {
      schedule_interview: /\b(schedule|book|arrange|set up|interview|meet|talk|verification)\b/i,
      provide_availability: /\b(available|free|time|morning|afternoon|evening|today|tomorrow|monday|tuesday|wednesday|thursday|friday)\b/i,
      confirm_booking: /\b(yes|ok|confirm|book it|schedule it|sounds good|perfect)\b/i,
      reschedule: /\b(reschedule|change|different time|another time|cancel|postpone)\b/i,
      ask_questions: /\b(what|how|when|where|why|questions|info|details)\b/i
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

      // Analyze message intent
      const intent = this.analyzeMessageIntent(message);

      // Get candidate information
      const candidate = await this.getCandidateInfo(candidateId);

      if (!candidate) {
        return this.generateErrorResponse('candidate_not_found');
      }

      // Determine conversation flow
      const flow = this.determineConversationFlow(intent, conversationContext, candidate);

      // Generate appropriate response
      const response = await this.generateFlowResponse(flow, candidate, message, conversationContext);

      // Verify response quality before returning
      if (!this.verifyResponseQuality(response)) {
        console.error('❌ SLM Bridge generated invalid response:', response);
        return this.generateErrorResponse('system_error', {
          flow: flow.type,
          candidateId: candidate.id
        });
      }

      // Execute any scheduling actions
      if (flow.schedulingAction) {
        await this.executeSchedulingAction(flow.schedulingAction, candidate, conversationContext);
      }

      console.log(`✅ SLM Bridge generated verified response for ${candidate.id}:`, {
        type: response.type,
        flow: flow.type,
        hasSchedulingContext: !!response.schedulingContext
      });

      return response;

    } catch (error) {
      console.error('❌ SLM Bridge error:', error);
      return this.generateErrorResponse('system_error');
    }
  }

  /**
   * Analyze incoming message to determine intent
   */
  analyzeMessageIntent(message) {
    const intents = [];

    for (const [intentName, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(message)) {
        intents.push(intentName);
      }
    }

    // Primary intent is the first match, or 'general' if none
    return {
      primary: intents[0] || 'general',
      secondary: intents.slice(1),
      confidence: intents.length > 0 ? 0.8 : 0.3
    };
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
        type: 'in_queue',
        schedulingAction: 'update_queue_priority',
        template: 'queue_status_update'
      };
    }

    // New conversation flow based on intent
    switch (intent.primary) {
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
      availability_collection: () => this.collectAvailabilityPreferences(candidate, message),
      booking_confirmation: () => this.confirmInterviewBooking(candidate, context),
      existing_interview_reminder: () => this.generateExistingInterviewReminder(candidate),
      queue_status_update: () => this.generateQueueStatusUpdate(candidate)
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

📅 **Would you like to schedule a 15-minute verification call?**

I can find the perfect time slot for you based on your availability. This will help fast-track your approval process!

Just let me know:
• When are you generally available? (morning/afternoon/evening)
• Any specific days that work best for you?
• Preferred time zone?

Or simply reply "**SCHEDULE**" and I'll find the next available slot for you! 🚀`,
      metadata: {
        candidateId: candidate.id,
        flow: 'welcome_with_scheduling',
        nextExpected: ['availability_preferences', 'schedule_request']
      },
      schedulingContext: {
        stage: 'initial_offer',
        priority: 0.7 // Higher priority for responsive candidates
      }
    };
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
      const matchingSlots = await this.findSlotsMatchingPreferences(availability);

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
   * Confirm interview booking
   */
  async confirmInterviewBooking(candidate, context) {
    const firstName = candidate.name.split(' ')[0];

    try {
      // Get the selected slot from context
      const selectedSlot = context.selectedSlot || context.slots?.[0];

      if (!selectedSlot) {
        return this.generateErrorResponse('slot_not_found');
      }

      // Book the interview through scheduling engine
      const bookingResult = await this.schedulingEngine.scheduleInterview(candidate, selectedSlot);

      if (bookingResult) {
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

  async findSlotsMatchingPreferences(preferences) {
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

      // Match time preferences
      if (preferences.times && preferences.times.length > 0) {
        const timeMatches = preferences.times.some(time => {
          if (time.includes('morning') && slotHour >= 9 && slotHour <= 12) return true;
          if (time.includes('afternoon') && slotHour >= 13 && slotHour <= 17) return true;
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
   * Generate queue status update
   */
  async generateQueueStatusUpdate(candidate) {
    const firstName = candidate.name.split(' ')[0];

    // Get queue information
    const queueInfo = this.schedulingEngine.db.prepare(`
      SELECT * FROM interview_queue WHERE candidate_id = ?
    `).get(candidate.id);

    if (queueInfo) {
      const queuePosition = this.schedulingEngine.db.prepare(`
        SELECT COUNT(*) + 1 as position
        FROM interview_queue
        WHERE priority_score > ? AND queue_status = 'waiting'
      `).get(queueInfo.priority_score).position;

      return {
        type: 'queue_status_update',
        content: `Hi ${firstName}! 📋 Here's your interview queue status:

🎯 **Current Status**: In Interview Queue
📊 **Priority Level**: ${queueInfo.urgency_level.toUpperCase()}
📍 **Queue Position**: ${queuePosition}

⏱️ **What's Happening:**
• We're matching you with the best available interviewer
• Higher priority candidates are scheduled first
• You'll receive confirmation once a slot is booked

💪 **Want to boost your priority?**
• Complete your profile (if not done)
• Reply "**URGENT**" if you have timing constraints
• Ask any questions about the process

Stay tuned - we'll have you scheduled soon! 🚀`,
        metadata: {
          candidateId: candidate.id,
          queuePosition,
          priorityScore: queueInfo.priority_score,
          urgencyLevel: queueInfo.urgency_level
        }
      };
    } else {
      // Not in queue - add them and provide initial response
      return this.generateWelcomeWithScheduling(candidate);
    }
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