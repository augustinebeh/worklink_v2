/**
 * Groq-Powered Interview Scheduling Service
 * Uses Groq LLM to intelligently handle interview scheduling conversations
 * Replaces the SLM approach with better natural language understanding
 */

const GroqService = require('./internal-slm/groq-fallback');
const { db } = require('../db');

class GroqInterviewScheduler extends GroqService {
  constructor() {
    super();
    this.config.model = 'llama-3.1-70b-versatile'; // Use more capable model for scheduling
    this.config.maxTokens = 800;
    this.config.temperature = 0.3; // Lower temperature for more consistent scheduling responses

    this.systemPrompts = this.buildSchedulingSystemPrompts();
  }

  /**
   * Build specialized system prompts for interview scheduling
   */
  buildSchedulingSystemPrompts() {
    return {
      scheduling_agent: `You are WorkLink's intelligent interview scheduling assistant. You help candidates book verification interviews efficiently.

CURRENT DATE: ${new Date().toDateString()}

YOUR ROLE:
- Help candidates schedule verification interviews
- Understand time preferences (morning 9AM-1PM, afternoon 2PM-6PM)
- Process slot selections intelligently
- Provide clear booking confirmations

CONVERSATION FLOW:
1. Greet and offer time preference choice (morning/afternoon)
2. Show ONLY relevant time slots based on their preference
3. Process their slot selection (numbers, times, natural language)
4. Confirm booking with details
5. Complete the process

SLOT SELECTION RULES:
- When user says "morning": Show ONLY 9AM-1PM slots
- When user says "afternoon": Show ONLY 2PM-6PM slots
- When user selects a slot (by number, time, or description), immediately process it
- NEVER repeat the same slot options after they've made a selection

RESPONSE RULES:
- Keep responses concise and action-oriented
- Use numbered options (1, 2, 3) for slot choices
- Process selections immediately - don't ask for confirmation again
- Use Singapore English naturally
- Include relevant emojis (📅 🕐 ✅)

STRICT FILTERING:
- Morning slots: 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00
- Afternoon slots: 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30, 18:00

OUTPUT FORMAT:
Always respond with JSON containing:
{
  "action": "offer_times|process_selection|confirm_booking|error",
  "message": "Your response text",
  "time_preference": "morning|afternoon|null",
  "selected_slot": {"date": "YYYY-MM-DD", "time": "HH:MM"} or null,
  "slots_to_show": [array of available slots] or null,
  "next_step": "description of what should happen next"
}`,

      slot_parser: `You are a slot selection parser. Your job is to understand when a user is selecting a time slot.

CONTEXT: User was shown numbered time options and needs to select one.

INPUT ANALYSIS:
- Look for numbers (1, 2, 3, first, second, third)
- Look for specific times (2pm, 14:00, 2:00pm)
- Look for natural selections ("the 2pm one", "option 2", "afternoon slot")

OUTPUT: Return JSON with:
{
  "selection_detected": true/false,
  "slot_index": number (0-based) or null,
  "selected_time": "HH:MM" or null,
  "confidence": 0.0-1.0
}`
    };
  }

  /**
   * Main interview scheduling handler
   */
  async handleSchedulingConversation(candidateId, message, context = {}) {
    try {
      console.log(`🤖 Groq Interview Scheduler processing: ${candidateId}`);

      // Get candidate info
      const candidate = await this.getCandidateInfo(candidateId);
      if (!candidate) {
        return this.generateErrorResponse('Candidate not found');
      }

      // Get conversation state
      const conversationState = await this.getConversationState(candidateId);

      // Determine current stage
      const stage = conversationState.current_stage || 'initial';
      console.log(`📋 Current stage: ${stage}`);

      let response;

      switch (stage) {
        case 'initial':
        case 'welcome':
          response = await this.handleInitialContact(candidate, message, conversationState);
          break;

        case 'time_preference_requested':
          response = await this.handleTimePreferenceResponse(candidate, message, conversationState);
          break;

        case 'slots_offered':
          response = await this.handleSlotSelection(candidate, message, conversationState);
          break;

        case 'slot_selected':
          response = await this.handleBookingConfirmation(candidate, message, conversationState);
          break;

        default:
          response = await this.handleFallback(candidate, message, conversationState);
      }

      // Update conversation state
      await this.updateConversationState(candidateId, response.stateUpdate || {});

      return response;

    } catch (error) {
      console.error('Groq scheduling error:', error);
      return this.generateErrorResponse(error.message);
    }
  }

  /**
   * Handle initial contact
   */
  async handleInitialContact(candidate, message, state) {
    const firstName = candidate.name.split(' ')[0];

    return {
      content: `Hi ${firstName}! 👋 Welcome to WorkLink!

Your account is being reviewed by our team. While you wait, I can help speed up the process by scheduling a quick verification interview with our consultant.

📅 **Do you prefer morning (9AM-1PM) or afternoon (2PM-6PM) for your interview?**

This will help fast-track your approval process!`,
      quickReplies: ['Morning', 'Afternoon'],
      stateUpdate: {
        current_stage: 'time_preference_requested',
        conversation_flow: 'interview_scheduling'
      }
    };
  }

  /**
   * Handle time preference response
   */
  async handleTimePreferenceResponse(candidate, message, state) {
    const timePreference = this.detectTimePreference(message);

    if (!timePreference) {
      return {
        content: "I'd like to help you schedule an interview! Could you please choose:\n\n📅 **Morning (9AM-1PM)** or **Afternoon (2PM-6PM)**?",
        quickReplies: ['Morning', 'Afternoon'],
        stateUpdate: {}
      };
    }

    // Get available slots for the preferred time
    const availableSlots = await this.getAvailableSlotsByPreference(timePreference);

    if (availableSlots.length === 0) {
      const alternativeTime = timePreference === 'morning' ? 'afternoon' : 'morning';
      const alternativeSlots = await this.getAvailableSlotsByPreference(alternativeTime);

      return {
        content: `I don't have any ${timePreference} slots available right now.

Would you like to see ${alternativeTime} slots instead? I have ${alternativeSlots.length} options available.`,
        quickReplies: ['Yes, show afternoon', 'Contact admin team'],
        stateUpdate: {
          time_preference: alternativeTime,
          current_stage: 'time_preference_requested'
        }
      };
    }

    // Show filtered slots (max 3)
    const topSlots = availableSlots.slice(0, 3);
    const slotOptions = topSlots.map((slot, index) =>
      `${index + 1}. ${this.formatSlotDateTime(slot)}`
    ).join('\n');

    const timeLabel = timePreference === 'morning' ? 'Morning (9AM-1PM)' : 'Afternoon (2PM-6PM)';

    return {
      content: `Perfect! Here are the best ${timeLabel.toLowerCase()} slots for you:

📅 **${timeLabel} Interview Options:**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), and I'll book it immediately! ⚡`,
      stateUpdate: {
        current_stage: 'slots_offered',
        time_preference: timePreference,
        shown_slots: JSON.stringify(topSlots)
      }
    };
  }

  /**
   * Handle slot selection
   */
  async handleSlotSelection(candidate, message, state) {
    const shownSlots = state.shown_slots ? JSON.parse(state.shown_slots) : [];

    if (shownSlots.length === 0) {
      return this.handleTimePreferenceResponse(candidate, message, state);
    }

    // Parse slot selection using Groq
    const selection = await this.parseSlotSelection(message, shownSlots);

    if (!selection.selection_detected) {
      // Not a clear selection, clarify
      const slotOptions = shownSlots.map((slot, index) =>
        `${index + 1}. ${this.formatSlotDateTime(slot)}`
      ).join('\n');

      return {
        content: `I want to make sure I book the right time for you! Here are your options:

${slotOptions}

Please reply with the **number** of your preferred slot (1, 2, or 3).`,
        stateUpdate: {}
      };
    }

    // Valid selection detected
    const selectedSlot = shownSlots[selection.slot_index];
    if (!selectedSlot) {
      return {
        content: "I couldn't find that slot option. Please choose 1, 2, or 3 from the available times.",
        stateUpdate: {}
      };
    }

    const firstName = candidate.name.split(' ')[0];
    const formattedDateTime = this.formatSlotDateTime(selectedSlot);

    return {
      content: `Perfect choice, ${firstName}! 🎯

📅 **You've selected**: ${formattedDateTime}
⏰ **Duration**: 15 minutes
💻 **Meeting Type**: Video call
👥 **Interviewer**: Our consultant

Ready to confirm this interview booking? Reply "**YES**" to book it now! ✅`,
      stateUpdate: {
        current_stage: 'slot_selected',
        selected_slot: JSON.stringify(selectedSlot),
        selected_slot_index: selection.slot_index
      }
    };
  }

  /**
   * Handle booking confirmation
   */
  async handleBookingConfirmation(candidate, message, state) {
    const isConfirmation = /^(yes|confirm|book|okay|ok|yep|sure)$/i.test(message.trim());

    if (!isConfirmation) {
      return {
        content: "Ready to confirm your interview booking? Reply **YES** to proceed, or let me know if you'd like to choose a different time.",
        stateUpdate: {}
      };
    }

    // Get selected slot
    const selectedSlot = state.selected_slot ? JSON.parse(state.selected_slot) : null;
    if (!selectedSlot) {
      return this.handleInitialContact(candidate, message, {});
    }

    // Book the interview
    try {
      const bookingResult = await this.bookInterview(candidate, selectedSlot);

      if (bookingResult.success) {
        const firstName = candidate.name.split(' ')[0];
        const formattedDateTime = this.formatSlotDateTime(selectedSlot);

        // Clear conversation state
        await this.clearConversationState(candidate.id);

        return {
          content: `🎉 **Interview Confirmed!**

Hi ${firstName}, your verification interview is booked:

📅 **Date & Time**: ${formattedDateTime}
⏰ **Duration**: 15 minutes
🔗 **Meeting Link**: ${bookingResult.meetingLink}
👥 **Interviewer**: Our consultant

📱 **What's Next:**
✅ Calendar invite sent to your email
🔔 Reminder 24 hours before
📋 Have your resume ready (optional)
💻 Use the meeting link when it's time

Looking forward to meeting you! 🚀`,
          stateUpdate: {
            current_stage: 'confirmed',
            booking_completed: true
          }
        };
      } else {
        return {
          content: `Sorry, there was an issue booking that slot. Let me show you other available options.

Please choose a different time and I'll try again:`,
          stateUpdate: {
            current_stage: 'time_preference_requested'
          }
        };
      }
    } catch (error) {
      console.error('Booking error:', error);
      return this.generateErrorResponse('Booking failed');
    }
  }

  /**
   * Parse slot selection using Groq LLM
   */
  async parseSlotSelection(message, shownSlots) {
    try {
      // FAST PATH: Try fallback parsing first for simple cases
      // This avoids network calls for obvious selections like "1", "2", "3"
      const quickParse = this.fallbackSlotParsing(message, shownSlots);
      
      if (quickParse.selection_detected && quickParse.confidence >= 0.8) {
        console.log('✅ Using fast fallback parsing for slot selection');
        return quickParse;
      }

      // SLOW PATH: Use Groq for complex/ambiguous cases
      const prompt = `User message: "${message}"

Available slots were:
${shownSlots.map((slot, idx) => `${idx + 1}. ${this.formatSlotDateTime(slot)}`).join('\n')}

Parse their selection:`;

      const messages = [
        { role: 'system', content: this.systemPrompts.slot_parser },
        { role: 'user', content: prompt }
      ];

      const response = await this.callGroqAPI(messages);
      const content = response.choices?.[0]?.message?.content;

      try {
        const parsed = JSON.parse(content);
        return {
          selection_detected: parsed.selection_detected || false,
          slot_index: parsed.slot_index,
          selected_time: parsed.selected_time,
          confidence: parsed.confidence || 0.5
        };
      } catch (parseError) {
        // Fallback to simple parsing
        return quickParse;
      }
    } catch (error) {
      console.error('Groq slot parsing error:', error.message);
      // Return the quick parse we already tried
      return this.fallbackSlotParsing(message, shownSlots);
    }
  }

  /**
   * Fallback slot parsing without LLM
   */
  fallbackSlotParsing(message, shownSlots) {
    const msg = message.toLowerCase().trim();

    // Direct number match (highest confidence)
    const numberMatch = msg.match(/^(\d)$/);
    if (numberMatch) {
      const slotIndex = parseInt(numberMatch[1]) - 1;
      if (slotIndex >= 0 && slotIndex < shownSlots.length) {
        return {
          selection_detected: true,
          slot_index: slotIndex,
          confidence: 0.95
        };
      }
    }

    // Number with extra text like "1 please", "I'll take 2", "option 3"
    const numberWithTextMatch = msg.match(/(\d)/);
    if (numberWithTextMatch) {
      const slotIndex = parseInt(numberWithTextMatch[1]) - 1;
      if (slotIndex >= 0 && slotIndex < shownSlots.length) {
        return {
          selection_detected: true,
          slot_index: slotIndex,
          confidence: 0.9
        };
      }
    }

    // Time match (2pm, 14:00, etc.)
    for (let i = 0; i < shownSlots.length; i++) {
      const slot = shownSlots[i];
      const slotTime = slot.time;
      const hour = parseInt(slotTime.split(':')[0]);

      if (msg.includes(`${hour}pm`) || msg.includes(`${hour}:00`) || msg.includes(slotTime)) {
        return {
          selection_detected: true,
          slot_index: i,
          confidence: 0.85
        };
      }
    }

    // Date match
    for (let i = 0; i < shownSlots.length; i++) {
      const slot = shownSlots[i];
      const dateStr = slot.date.toLowerCase();
      
      if (msg.includes(dateStr) || msg.includes(slot.day.toLowerCase())) {
        return {
          selection_detected: true,
          slot_index: i,
          confidence: 0.8
        };
      }
    }

    return { selection_detected: false, confidence: 0.0 };
  }

  /**
   * Detect time preference from message
   */
  detectTimePreference(message) {
    const msg = message.toLowerCase();

    if (msg.includes('morning') || msg.includes('9') || msg.includes('10') || msg.includes('11') || msg.includes('am')) {
      return 'morning';
    }
    if (msg.includes('afternoon') || msg.includes('2') || msg.includes('3') || msg.includes('4') || msg.includes('pm')) {
      return 'afternoon';
    }

    return null;
  }

  /**
   * Get available slots filtered by time preference
   */
  async getAvailableSlotsByPreference(timePreference) {
    const slots = await this.getAvailableSlots(7);

    return slots.filter(slot => {
      const hour = parseInt(slot.time.split(':')[0]);

      if (timePreference === 'morning') {
        return hour >= 9 && hour <= 13; // 9AM-1PM
      } else if (timePreference === 'afternoon') {
        return hour >= 14 && hour <= 18; // 2PM-6PM
      }

      return false;
    });
  }

  /**
   * Get available slots from database
   */
  async getAvailableSlots(days = 7) {
    const slots = [];
    const today = new Date();

    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const daySlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

      for (const time of daySlots) {
        const isBooked = db.prepare(`
          SELECT COUNT(*) as count
          FROM interview_slots
          WHERE scheduled_date = ? AND scheduled_time = ? AND status IN ('scheduled', 'confirmed')
        `).get(dateStr, time).count;

        if (isBooked === 0) {
          slots.push({ date: dateStr, time });
        }
      }
    }

    return slots;
  }

  /**
   * Book interview in database
   */
  async bookInterview(candidate, slot) {
    try {
      const insertResult = db.prepare(`
        INSERT INTO interview_slots
        (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, status)
        VALUES (?, ?, ?, 15, 'verification', ?, 'scheduled')
      `).run(
        candidate.id,
        slot.date,
        slot.time,
        `https://meet.worklink.com/interview/${Date.now()}`
      );

      return {
        success: true,
        interviewId: insertResult.lastInsertRowid,
        meetingLink: `https://meet.worklink.com/interview/${Date.now()}`
      };
    } catch (error) {
      console.error('Database booking error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format slot date/time for display
   */
  formatSlotDateTime(slot) {
    const date = new Date(slot.date);
    const options = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Singapore'
    };

    const dateStr = date.toLocaleDateString('en-US', options);
    const timeStr = this.formatTime(slot.time);

    return `${dateStr} at ${timeStr}`;
  }

  /**
   * Format time for display
   */
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
   * Conversation state management
   */
  async getConversationState(candidateId) {
    try {
      const state = db.prepare(`
        SELECT * FROM candidate_conversation_state
        WHERE candidate_id = ? AND expires_at > datetime('now')
        ORDER BY created_at DESC LIMIT 1
      `).get(candidateId);

      if (state) {
        return {
          current_stage: state.current_stage,
          conversation_flow: state.conversation_flow,
          time_preference: state.time_preference,
          shown_slots: state.shown_slots,
          selected_slot: state.scheduling_context,
          selected_slot_index: state.selected_slot_index
        };
      }

      return {};
    } catch (error) {
      console.error('Error loading conversation state:', error);
      return {};
    }
  }

  async updateConversationState(candidateId, updates) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      db.prepare(`
        INSERT OR REPLACE INTO candidate_conversation_state
        (candidate_id, conversation_flow, current_stage, time_preference, shown_slots,
         selected_slot_index, scheduling_context, expires_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        candidateId,
        updates.conversation_flow || 'interview_scheduling',
        updates.current_stage || 'initial',
        updates.time_preference || null,
        updates.shown_slots || null,
        updates.selected_slot_index || null,
        updates.selected_slot || null,
        expiresAt.toISOString()
      );
    } catch (error) {
      console.error('Error updating conversation state:', error);
    }
  }

  async clearConversationState(candidateId) {
    try {
      db.prepare('DELETE FROM candidate_conversation_state WHERE candidate_id = ?').run(candidateId);
    } catch (error) {
      console.error('Error clearing conversation state:', error);
    }
  }

  /**
   * Get candidate info
   */
  async getCandidateInfo(candidateId) {
    try {
      return db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    } catch (error) {
      console.error('Database error getting candidate:', error);
      return null;
    }
  }

  /**
   * Generate error response
   */
  generateErrorResponse(message) {
    return {
      content: `I'm experiencing a temporary issue. Let me connect you with our admin team to ensure you get immediate assistance.

Sorry for the inconvenience! 😊`,
      stateUpdate: {
        current_stage: 'error',
        escalate: true
      }
    };
  }

  /**
   * Fallback handler
   */
  async handleFallback(candidate, message, state) {
    return this.handleInitialContact(candidate, message, state);
  }
}

module.exports = GroqInterviewScheduler;