/**
 * INTERVIEW SCHEDULER V2 - Complete Redesign
 * 
 * SIMPLE, STATE-DRIVEN interview scheduling for pending candidates
 * Fixes all the broken looping/resetting issues in the old system
 * 
 * FLOW:
 * 1. greeting → 2. ask_preference → 3. show_slots → 4. await_confirmation → 5. booked
 */

const { db } = require('../../db');

class InterviewSchedulerV2 {
  constructor() {
    // State machine stages
    this.STAGES = {
      GREETING: 'greeting',
      ASK_PREFERENCE: 'ask_preference',
      SHOW_SLOTS: 'show_slots',
      AWAIT_CONFIRMATION: 'await_confirmation',
      BOOKED: 'booked',
      ANSWERING_QUESTION: 'answering_question'
    };

    // Time preferences
    this.TIME_SLOTS = {
      morning: [
        { time: '9:00 AM', label: '9:00 AM' },
        { time: '10:00 AM', label: '10:00 AM' },
        { time: '11:00 AM', label: '11:00 AM' },
        { time: '12:00 PM', label: '12:00 PM (Noon)' }
      ],
      afternoon: [
        { time: '2:00 PM', label: '2:00 PM' },
        { time: '3:00 PM', label: '3:00 PM' },
        { time: '4:00 PM', label: '4:00 PM' },
        { time: '5:00 PM', label: '5:00 PM' }
      ]
    };

    this.ensureStateTable();
  }

  /**
   * Ensure conversation state table exists
   */
  ensureStateTable() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS interview_conversation_state (
          candidate_id INTEGER PRIMARY KEY,
          current_stage TEXT NOT NULL,
          time_preference TEXT,
          shown_slots TEXT,
          selected_slot_index INTEGER,
          selected_date TEXT,
          selected_time TEXT,
          conversation_context TEXT,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        );
      `);
    } catch (error) {
      console.error('❌ Error creating state table:', error);
    }
  }

  /**
   * MAIN ENTRY POINT - Process incoming message
   */
  async processMessage(candidateId, message, candidate) {
    console.log(`\n🎯 [SCHEDULER V2] Processing: "${message}" for ${candidateId}`);

    try {
      // Get or initialize state
      let state = this.getState(candidateId);
      
      if (!state || this.isStateExpired(state)) {
        state = this.initializeState(candidateId);
      }

      console.log(`📊 [STATE] Current stage: ${state.current_stage}`);

      // Parse user intent
      const intent = this.parseIntent(message, state);
      console.log(`🧠 [INTENT] Detected: ${intent.type}`);

      // Handle based on current stage and intent
      let response;

      // Priority 1: Handle questions FIRST
      if (intent.isQuestion) {
        response = this.handleQuestion(intent.questionType, candidate, state);
        // Don't change stage, they're just asking
      }
      // Priority 2: Handle reschedule/change requests
      else if (intent.isReschedule) {
        response = this.handleReschedule(candidate, state);
        this.updateStage(candidateId, this.STAGES.ASK_PREFERENCE);
      }
      // Priority 3: Handle slot selection
      else if (intent.isSlotSelection && state.current_stage === this.STAGES.SHOW_SLOTS) {
        response = this.handleSlotSelection(candidateId, candidate, intent.selectedIndex, state);
        // Stage updated inside handleSlotSelection
      }
      // Priority 4: Handle confirmation
      else if (intent.isConfirmation && state.current_stage === this.STAGES.AWAIT_CONFIRMATION) {
        response = await this.handleConfirmation(candidateId, candidate, state);
        // Stage updated inside handleConfirmation
      }
      // Priority 5: Handle stage-based flow
      else {
        response = await this.handleStageFlow(candidateId, candidate, message, intent, state);
      }

      console.log(`✅ [RESPONSE] Stage: ${state.current_stage}, Type: ${response.type}`);

      return {
        content: response.content,
        type: response.type,
        schedulingContext: response.schedulingContext,
        metadata: response.metadata
      };

    } catch (error) {
      console.error('❌ [SCHEDULER V2] Error:', error);
      return {
        content: "I'm having trouble right now. Let me get the team to help you schedule the interview! 🙏",
        type: 'error',
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Parse user intent from message
   */
  parseIntent(message, state) {
    const msg = message.toLowerCase().trim();
    
    const intent = {
      type: 'general',
      isQuestion: false,
      isReschedule: false,
      isConfirmation: false,
      isSlotSelection: false,
      timePreference: null,
      selectedIndex: null,
      questionType: null
    };

    // IMPROVED: Check for date-related questions FIRST (before formal question patterns)
    // This handles "this friday can?", "friday ok?", "can we do friday?", etc.
    if (/friday|weekend|saturday|sunday|next week|later|tomorrow|monday|tuesday|wednesday|thursday/i.test(msg)) {
      intent.isQuestion = true;
      intent.questionType = 'other_dates';
      intent.type = 'question';
      return intent;
    }

    // Check for questions (WHY, WHAT, HOW, WHEN, etc.)
    if (/^(what|why|how|when|where|who|can you|could you|tell me|explain|describe)\b/i.test(msg) ||
        /\?$/.test(msg) ||
        /\b(can|could|would|will|is|are|do|does)\b.*\?/i.test(msg)) {
      intent.isQuestion = true;
      
      // Identify question type
      if (/agenda|about|cover|discuss|happen|during|expect/i.test(msg)) {
        intent.questionType = 'agenda';
      } else if (/time|long|duration|minutes|hours/i.test(msg)) {
        intent.questionType = 'duration';
      } else if (/where|location|place|video|zoom|meet/i.test(msg)) {
        intent.questionType = 'location';
      } else {
        intent.questionType = 'general';
      }
      
      return intent;
    }

    // Check for reschedule/change requests
    if (/\b(reschedule|change|different|another|other time|cancel|postpone|move)\b/i.test(msg)) {
      intent.isReschedule = true;
      intent.type = 'reschedule';
      return intent;
    }

    // Check for confirmation (YES, CONFIRM, BOOK IT, etc.)
    if (state.current_stage === this.STAGES.AWAIT_CONFIRMATION) {
      if (/^(yes|yeah|yep|sure|ok|okay|confirm|book|schedule|proceed)/i.test(msg)) {
        intent.isConfirmation = true;
        intent.type = 'confirm';
        return intent;
      }
    }

    // Check for slot selection
    if (state.current_stage === this.STAGES.SHOW_SLOTS && state.shown_slots) {
      const slots = JSON.parse(state.shown_slots);
      
      // Pattern 1: Direct number (1, 2, 3)
      const numberMatch = msg.match(/^(\d)$/);
      if (numberMatch) {
        const idx = parseInt(numberMatch[1]) - 1;
        if (idx >= 0 && idx < slots.length) {
          intent.isSlotSelection = true;
          intent.selectedIndex = idx;
          intent.type = 'slot_selection';
          return intent;
        }
      }

      // Pattern 2: "option 2", "slot 1", "the third one"
      const optionMatch = msg.match(/(?:option|slot|number|choice)\s*(\d)|(?:the\s*)?(\d)(?:st|nd|rd|th)/);
      if (optionMatch) {
        const idx = parseInt(optionMatch[1] || optionMatch[2]) - 1;
        if (idx >= 0 && idx < slots.length) {
          intent.isSlotSelection = true;
          intent.selectedIndex = idx;
          intent.type = 'slot_selection';
          return intent;
        }
      }

      // Pattern 3: Time-based selection ("10am", "2pm", "3:00 PM")
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (msg.includes(slot.time.toLowerCase()) || 
            msg.includes(slot.time.replace(/\s+/g, '').toLowerCase())) {
          intent.isSlotSelection = true;
          intent.selectedIndex = i;
          intent.type = 'slot_selection';
          return intent;
        }
      }
    }

    // Check for time preference
    if (/\b(morning|am|9|10|11|early|before lunch)\b/i.test(msg)) {
      intent.timePreference = 'morning';
      intent.type = 'time_preference';
    } else if (/\b(afternoon|pm|2|3|4|5|after lunch|later)\b/i.test(msg)) {
      intent.timePreference = 'afternoon';
      intent.type = 'time_preference';
    }

    return intent;
  }

  /**
   * Handle questions - ANSWER THEM!
   */
  handleQuestion(questionType, candidate, state) {
    const firstName = candidate.name.split(' ')[0];

    const answers = {
      agenda: `Great question! The interview covers:\n\n` +
        `✓ Quick intro & verification\n` +
        `✓ Your work experience & skills\n` +
        `✓ Job preferences & availability\n` +
        `✓ Q&A about WorkLink\n\n` +
        `It's super casual - just 15 minutes! Would you like to book a slot?`,
      
      duration: `The interview takes about **15 minutes** - quick and simple! ⚡\n\n` +
        `Ready to schedule? Let me know your preferred time!`,
      
      location: `It's a **video call** 📹 - you can do it from anywhere!\n\n` +
        `We'll send you the Zoom/Google Meet link once booked. When works for you?`,
      
      other_dates: `Good question! Right now I'm showing the next available slots (Wednesday-Thursday). ` +
        `If you need **Friday, next week, or a different date**, just let me know and I'll flag it for our team to arrange manually. ` +
        `They'll reach out within a few hours! 📞\n\n` +
        `Or you can pick from the current available times if any of those work for you?`,
      
      general: `Happy to help, ${firstName}! 😊\n\n` +
        `The interview is a quick 15-min video chat to verify your profile and discuss job opportunities. ` +
        `It's informal and helps speed up your approval!\n\n` +
        `Want to schedule one now?`
    };

    return {
      content: answers[questionType] || answers.general,
      type: 'question_answer',
      schedulingContext: { stage: state.current_stage },
      metadata: { questionAnswered: questionType }
    };
  }

  /**
   * Handle reschedule requests
   */
  handleReschedule(candidate, state) {
    const firstName = candidate.name.split(' ')[0];

    if (state.current_stage === this.STAGES.BOOKED) {
      return {
        content: `No problem, ${firstName}! Let's reschedule your interview. ` +
          `Do you prefer **morning (9AM-12PM)** or **afternoon (2PM-5PM)**?`,
        type: 'reschedule',
        schedulingContext: { stage: this.STAGES.ASK_PREFERENCE }
      };
    }

    return {
      content: `Sure thing! Do you prefer **morning (9AM-12PM)** or **afternoon (2PM-5PM)**?`,
      type: 'reschedule',
      schedulingContext: { stage: this.STAGES.ASK_PREFERENCE }
    };
  }

  /**
   * Handle slot selection
   */
  handleSlotSelection(candidateId, candidate, selectedIndex, state) {
    const firstName = candidate.name.split(' ')[0];
    const slots = JSON.parse(state.shown_slots);
    const selected = slots[selectedIndex];

    if (!selected) {
      return {
        content: `Sorry, I didn't catch that. Please reply with **1**, **2**, or **3** to choose a slot.`,
        type: 'clarification',
        schedulingContext: { stage: this.STAGES.SHOW_SLOTS }
      };
    }

    // Update state with selection
    this.updateState(candidateId, {
      current_stage: this.STAGES.AWAIT_CONFIRMATION,
      selected_slot_index: selectedIndex,
      selected_date: selected.date,
      selected_time: selected.time
    });

    return {
      content: `Perfect choice, ${firstName}! 🎯\n\n` +
        `📅 **Your interview**: ${selected.date} at ${selected.time}\n` +
        `⏰ **Duration**: 15 minutes\n` +
        `💻 **Format**: Video call\n\n` +
        `Reply **YES** to confirm this booking! ✅`,
      type: 'confirmation_request',
      schedulingContext: {
        stage: this.STAGES.AWAIT_CONFIRMATION,
        selectedSlot: selected,
        showConfirmButton: true
      },
      metadata: {
        date: selected.date,
        time: selected.time,
        slotIndex: selectedIndex
      }
    };
  }

  /**
   * Handle confirmation - CREATE THE BOOKING!
   */
  async handleConfirmation(candidateId, candidate, state) {
    const firstName = candidate.name.split(' ')[0];

    try {
      // Create interview booking in database
      const selectedDate = state.selected_date;
      const selectedTime = state.selected_time;

      // Insert into interview_slots table (use existing schema)
      // Note: id is AUTOINCREMENT, candidate_id is INTEGER
      const result = db.prepare(`
        INSERT INTO interview_slots (candidate_id, scheduled_date, scheduled_time, duration_minutes, status)
        VALUES (?, ?, ?, 15, 'confirmed')
      `).run(candidateId, selectedDate, selectedTime);
      
      const interviewId = result.lastInsertRowid;

      // Update candidate status if needed
      db.prepare(`
        UPDATE candidates 
        SET status = 'interview_scheduled', updated_at = datetime('now')
        WHERE id = ?
      `).run(candidateId);

      // Update state to booked
      this.updateState(candidateId, {
        current_stage: this.STAGES.BOOKED
      });

      // Clear state after 7 days
      this.setStateExpiry(candidateId, 7);

      return {
        content: `✅ **Interview confirmed!** 🎉\n\n` +
          `Hi ${firstName}, your verification interview is booked for:\n\n` +
          `📅 **${selectedDate}** at **${selectedTime}**\n` +
          `⏰ 15 minutes\n` +
          `💻 Video call (link will be sent 1 hour before)\n\n` +
          `You'll receive a reminder 24 hours before. See you there! 🙌`,
        type: 'booking_confirmed',
        schedulingContext: {
          stage: this.STAGES.BOOKED,
          interviewId: interviewId,
          date: selectedDate,
          time: selectedTime
        },
        metadata: {
          interviewId,
          candidateId,
          status: 'confirmed'
        }
      };

    } catch (error) {
      console.error('❌ Booking error:', error);
      return {
        content: `Oops! There was an error booking your interview. Let me get the team to help! 🙏`,
        type: 'booking_error',
        metadata: { error: error.message }
      };
    }
  }

  /**
   * Handle stage-based conversation flow
   */
  async handleStageFlow(candidateId, candidate, message, intent, state) {
    const firstName = candidate.name.split(' ')[0];

    switch (state.current_stage) {
      case this.STAGES.GREETING:
        // Show greeting and ask for preference
        this.updateStage(candidateId, this.STAGES.ASK_PREFERENCE);
        return {
          content: `Hi ${firstName}! 👋 Welcome to WorkLink!\n\n` +
            `Your account is being reviewed. I can help speed things up by scheduling a quick ` +
            `**15-minute verification interview** with our consultant.\n\n` +
            `📅 **Do you prefer morning (9AM-12PM) or afternoon (2PM-5PM)?**`,
          type: 'greeting',
          schedulingContext: { stage: this.STAGES.ASK_PREFERENCE }
        };

      case this.STAGES.ASK_PREFERENCE:
        // Show slots based on preference
        if (intent.timePreference) {
          return this.showTimeSlots(candidateId, candidate, intent.timePreference);
        } else {
          return {
            content: `No worries! Just let me know: **morning** or **afternoon**? 😊`,
            type: 'clarification',
            schedulingContext: { stage: this.STAGES.ASK_PREFERENCE }
          };
        }

      case this.STAGES.SHOW_SLOTS:
        // If they're saying general things, remind them to pick
        return {
          content: `Great! Please pick a time slot by replying with **1**, **2**, or **3**. 🎯`,
          type: 'reminder',
          schedulingContext: { stage: this.STAGES.SHOW_SLOTS }
        };

      case this.STAGES.AWAIT_CONFIRMATION:
        // Waiting for YES confirmation
        return {
          content: `Just reply **YES** to confirm your interview booking! ✅`,
          type: 'reminder',
          schedulingContext: { stage: this.STAGES.AWAIT_CONFIRMATION }
        };

      case this.STAGES.BOOKED:
        // Already booked
        return {
          content: `You're all set, ${firstName}! 🎉 Your interview is confirmed. ` +
            `Check your email for details. Need to reschedule? Just say "reschedule".`,
          type: 'already_booked',
          schedulingContext: { stage: this.STAGES.BOOKED }
        };

      default:
        // Shouldn't happen, but reset if it does
        this.initializeState(candidateId);
        return this.handleStageFlow(candidateId, candidate, message, intent, this.getState(candidateId));
    }
  }

  /**
   * Show available time slots
   */
  showTimeSlots(candidateId, candidate, preference) {
    const firstName = candidate.name.split(' ')[0];
    const slots = this.getAvailableSlots(preference);

    // Save slots to state
    this.updateState(candidateId, {
      current_stage: this.STAGES.SHOW_SLOTS,
      time_preference: preference,
      shown_slots: JSON.stringify(slots)
    });

    const slotList = slots.map((slot, idx) => 
      `${idx + 1}. **${slot.date}** at **${slot.time}**`
    ).join('\n');

    return {
      content: `Perfect! Here are the best **${preference}** slots for you:\n\n` +
        `📅 **Available Times:**\n${slotList}\n\n` +
        `Reply with the number (1, 2, or 3) to book! ⚡`,
      type: 'slots_shown',
      schedulingContext: {
        stage: this.STAGES.SHOW_SLOTS,
        availableSlots: slots,
        timePreference: preference
      },
      metadata: {
        slotsCount: slots.length,
        preference
      }
    };
  }

  /**
   * Get available interview slots
   */
  getAvailableSlots(preference) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const times = preference === 'morning' ? this.TIME_SLOTS.morning : this.TIME_SLOTS.afternoon;

    const formatDate = (date) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
    };

    // Return 3 slots from next 2 days
    return [
      { date: formatDate(tomorrow), time: times[0].time, rawDate: tomorrow.toISOString().split('T')[0] },
      { date: formatDate(tomorrow), time: times[1].time, rawDate: tomorrow.toISOString().split('T')[0] },
      { date: formatDate(dayAfter), time: times[0].time, rawDate: dayAfter.toISOString().split('T')[0] }
    ];
  }

  /**
   * State management methods
   */
  getState(candidateId) {
    return db.prepare(`
      SELECT * FROM interview_conversation_state WHERE candidate_id = ?
    `).get(candidateId);
  }

  initializeState(candidateId) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    db.prepare(`
      INSERT OR REPLACE INTO interview_conversation_state
      (candidate_id, current_stage, expires_at, last_updated)
      VALUES (?, ?, ?, datetime('now'))
    `).run(candidateId, this.STAGES.GREETING, expiresAt.toISOString());

    return this.getState(candidateId);
  }

  updateStage(candidateId, newStage) {
    db.prepare(`
      UPDATE interview_conversation_state 
      SET current_stage = ?, last_updated = datetime('now')
      WHERE candidate_id = ?
    `).run(newStage, candidateId);
  }

  updateState(candidateId, updates) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), candidateId];

    db.prepare(`
      UPDATE interview_conversation_state 
      SET ${fields}, last_updated = datetime('now')
      WHERE candidate_id = ?
    `).run(...values);
  }

  isStateExpired(state) {
    if (!state.expires_at) return false;
    return new Date(state.expires_at) < new Date();
  }

  setStateExpiry(candidateId, days) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    db.prepare(`
      UPDATE interview_conversation_state 
      SET expires_at = ?
      WHERE candidate_id = ?
    `).run(expiresAt.toISOString(), candidateId);
  }

  ensureInterviewTables() {
    // Interview slots table already exists in main schema
    // This method kept for compatibility but does nothing
    // Table schema: id INTEGER PRIMARY KEY AUTOINCREMENT, candidate_id INTEGER, etc.
  }
}

module.exports = InterviewSchedulerV2;
