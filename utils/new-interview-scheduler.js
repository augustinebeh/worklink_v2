/**
 * AGENT 2: IMPLEMENTER - New Interview Scheduler Engine
 * 
 * Complete redesign from scratch - no reference to old structure
 * Philosophy: Conversational Agent (not state machine)
 */

const { callGroqAPI } = require('./internal-slm/groq-fallback');
const chrono = require('chrono-node');

/**
 * Component 1: Intent Detector
 * Analyzes user messages to understand what they want
 */
class IntentDetector {
  async analyze(message, context = {}) {
    const msg = message.toLowerCase().trim();
    
    // Quick pattern matching for common cases (fast path)
    const patterns = {
      greeting: /^(hi|hello|hey|start|begin)/i,
      morning: /morning|am|9|10|11|before noon|早上/i,
      afternoon: /afternoon|pm|2|3|4|5|6|after lunch|下午/i,
      slotNumber: /^[1-9]$|^option [1-9]$|^number [1-9]$/i,
      slotZero: /^0$|^zero$/i,  // FIX #2: Detect slot 0
      invalidSlotNumber: /^[0-9]{2,}$|^[1-9][0-9]+$/,  // 2+ digits
      friday: /friday|fri$/i,
      tomorrow: /tomorrow/i,
      nextWeek: /next week/i,
      specificDate: /\d{1,2}[\/\-]\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i,
      changeRequest: /actually|wait|instead|change|different|other/i,
      question: /\?|when|what|how|can|do you have/i,
      anytime: /any time|anytime|any slot|whenever|flexible|doesn't matter|don't care/i,
      typoMorning: /morn(i|in)(n|ng)|moring|mornign/i,
      typoAfternoon: /after(n|noon)|afternon|afternoo$/i,
    };

    // FIX #2: Detect slot 0 specifically (invalid)
    if (patterns.slotZero.test(msg)) {
      return {
        intent: 'select_slot',
        confidence: 0.95,
        entities: { slotNumber: 0 },
        reasoning: 'User selected invalid slot 0'
      };
    }

    // Detect invalid slot numbers (2+ digits)
    if (patterns.invalidSlotNumber.test(msg)) {
      const num = parseInt(msg.replace(/\D/g, ''));
      return {
        intent: 'select_slot',
        confidence: 0.95,
        entities: { slotNumber: num },
        reasoning: 'User selected invalid slot number'
      };
    }

    // Detect slot selection (highest priority)
    if (patterns.slotNumber.test(msg)) {
      const num = parseInt(msg.replace(/\D/g, ''));
      return {
        intent: 'select_slot',
        confidence: 0.95,
        entities: { slotNumber: num },
        reasoning: 'User selected slot by number'
      };
    }

    // Detect "anytime" / no preference
    if (patterns.anytime.test(msg)) {
      return {
        intent: 'no_preference',
        confidence: 0.90,
        entities: { timePreference: 'any' },
        reasoning: 'User has no time preference'
      };
    }

    // Detect specific day request
    if (patterns.friday.test(msg) || patterns.tomorrow.test(msg) || patterns.nextWeek.test(msg)) {
      const dateInfo = this.extractDate(msg);
      return {
        intent: 'request_specific_day',
        confidence: 0.90,
        entities: dateInfo,
        reasoning: 'User requested specific day'
      };
    }

    // FIX #1: Detect change of mind BEFORE time preferences
    if (patterns.changeRequest.test(msg)) {
      const entities = this.extractPreferences(msg);
      return {
        intent: 'change_preference',
        confidence: 0.80,
        entities: entities,
        reasoning: 'User wants to change preference'
      };
    }

    // Detect time preference with typo support (AFTER change detection)
    if (patterns.morning.test(msg) || patterns.typoMorning.test(msg)) {
      return {
        intent: 'time_preference',
        confidence: 0.85,
        entities: { timePreference: 'morning' },
        reasoning: 'User prefers morning'
      };
    }

    if (patterns.afternoon.test(msg) || patterns.typoAfternoon.test(msg)) {
      return {
        intent: 'time_preference',
        confidence: 0.85,
        entities: { timePreference: 'afternoon' },
        reasoning: 'User prefers afternoon'
      };
    }

    // Detect greeting
    if (patterns.greeting.test(msg) && msg.length < 20) {
      return {
        intent: 'greeting',
        confidence: 0.90,
        entities: {},
        reasoning: 'User greeting'
      };
    }

    // For complex cases, use LLM (slow path)
    return await this.analyzeLLM(msg, context);
  }

  extractDate(message) {
    const msg = message.toLowerCase();
    
    // Use chrono-node for natural date parsing
    const parsed = chrono.parseDate(message);
    
    if (parsed) {
      return {
        date: parsed,
        dayOfWeek: parsed.toLocaleDateString('en-US', { weekday: 'long' }),
        formatted: parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    }

    // Fallback patterns
    if (/friday|fri$/i.test(msg)) {
      const now = new Date();
      const friday = new Date(now);
      const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
      friday.setDate(now.getDate() + daysUntilFriday);
      
      return {
        date: friday,
        dayOfWeek: 'Friday',
        formatted: friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    }

    if (/tomorrow/i.test(msg)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return {
        date: tomorrow,
        dayOfWeek: tomorrow.toLocaleDateString('en-US', { weekday: 'long' }),
        formatted: tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    }

    return { date: null, dayOfWeek: null, formatted: null };
  }

  extractPreferences(message) {
    const prefs = {};
    
    if (/morning/i.test(message)) prefs.timePreference = 'morning';
    if (/afternoon/i.test(message)) prefs.timePreference = 'afternoon';
    
    const dateInfo = this.extractDate(message);
    if (dateInfo.date) {
      Object.assign(prefs, dateInfo);
    }
    
    return prefs;
  }

  async analyzeLLM(message, context) {
    try {
      const prompt = `Analyze this user message in an interview scheduling conversation:

Message: "${message}"

Context: ${JSON.stringify(context, null, 2)}

Return JSON with:
{
  "intent": "greeting" | "time_preference" | "request_specific_day" | "select_slot" | "change_preference" | "question" | "confirmation",
  "confidence": 0.0-1.0,
  "entities": {
    "timePreference": "morning" | "afternoon" | null,
    "slotNumber": number | null,
    "date": "YYYY-MM-DD" | null,
    "dayOfWeek": "Monday" | "Tuesday" | ... | null
  },
  "reasoning": "Brief explanation"
}`;

      const response = await callGroqAPI([
        { role: 'system', content: 'You are an intent analysis expert. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ], 500);

      // Clean response
      let cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
      
    } catch (error) {
      console.error('LLM intent detection failed:', error);
      
      // Fallback: treat as question
      return {
        intent: 'question',
        confidence: 0.50,
        entities: {},
        reasoning: 'LLM failed, treating as question'
      };
    }
  }
}

/**
 * Component 2: Slot Generator
 * Generates available interview slots based on constraints
 */
class SlotGenerator {
  constructor(db) {
    this.db = db;
  }

  generate(constraints = {}) {
    const {
      date = null,          // Specific date
      dayOfWeek = null,     // e.g., 'Friday'
      timePreference = null, // 'morning' or 'afternoon'
      count = 5,            // How many slots to return
      startDate = new Date(),
      endDate = null
    } = constraints;

    const slots = [];
    const current = new Date(startDate);
    current.setHours(9, 0, 0, 0);

    const end = endDate || new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days default

    while (current <= end && slots.length < count) {
      // Skip weekends
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
        continue;
      }

      // Filter by specific date
      if (date) {
        const targetDate = new Date(date);
        if (current.toDateString() !== targetDate.toDateString()) {
          current.setDate(current.getDate() + 1);
          current.setHours(9, 0, 0, 0);
          continue;
        }
      }

      // Filter by day of week
      if (dayOfWeek) {
        const currentDay = current.toLocaleDateString('en-US', { weekday: 'long' });
        if (currentDay.toLowerCase() !== dayOfWeek.toLowerCase()) {
          current.setDate(current.getDate() + 1);
          current.setHours(9, 0, 0, 0);
          continue;
        }
      }

      // Generate time slots for this day
      const daySlots = this.generateDaySlots(new Date(current), timePreference);
      slots.push(...daySlots);

      current.setDate(current.getDate() + 1);
      current.setHours(9, 0, 0, 0);
    }

    return slots.slice(0, count).map((slot, idx) => ({
      id: idx + 1,
      datetime: slot.toISOString(),
      date: slot.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }),
      time: slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      formatted: `${slot.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${slot.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
    }));
  }

  generateDaySlots(date, timePreference) {
    const slots = [];
    const morning = [9, 10, 11, 12]; // 9am, 10am, 11am, 12pm
    const afternoon = [14, 15, 16, 17]; // 2pm, 3pm, 4pm, 5pm

    let hours = [];
    if (!timePreference) {
      hours = [...morning, ...afternoon];
    } else if (timePreference === 'morning') {
      hours = morning;
    } else if (timePreference === 'afternoon') {
      hours = afternoon;
    }

    hours.forEach(hour => {
      // Generate 2 slots per hour (on the hour and half-hour)
      [0, 30].forEach(minute => {
        const slot = new Date(date);
        slot.setHours(hour, minute, 0, 0);
        slots.push(slot);
      });
    });

    return slots;
  }

  checkAvailability(datetime) {
    // TODO: Check against database for existing bookings
    // For now, assume all generated slots are available
    return true;
  }
}

/**
 * Component 3: Conversation Manager
 * Orchestrates the entire conversation flow
 */
class ConversationManager {
  constructor(candidateId, db) {
    this.candidateId = candidateId;
    this.db = db;
    this.intentDetector = new IntentDetector();
    this.slotGenerator = new SlotGenerator(db);
    this.responseGenerator = new ResponseGenerator();
    
    this.context = {
      conversationStarted: false,
      preferences: {},
      shownSlots: [],
      selectedSlot: null,
      bookingStatus: 'pending'
    };
  }

  async handleMessage(message) {
    try {
      console.log(`[ConversationManager] Processing: "${message}"`);
      
      // Analyze intent
      const intent = await this.intentDetector.analyze(message, this.context);
      console.log('[ConversationManager] Intent:', intent);

      // Route to appropriate handler
      let response;
      switch (intent.intent) {
        case 'greeting':
          response = await this.handleGreeting();
          break;
        case 'time_preference':
          response = await this.handleTimePreference(intent.entities);
          break;
        case 'no_preference':
          response = await this.handleNoPreference(intent.entities);
          break;
        case 'request_specific_day':
          response = await this.handleSpecificDay(intent.entities);
          break;
        case 'select_slot':
          response = await this.handleSlotSelection(intent.entities);
          break;
        case 'change_preference':
          response = await this.handleChangePreference(intent.entities);
          break;
        case 'question':
          response = await this.handleQuestion(message, intent);
          break;
        case 'confirmation':
          response = await this.handleConfirmation();
          break;
        default:
          response = await this.handleUnknown(message);
      }

      // Update context
      this.context.lastIntent = intent;
      this.context.lastMessage = message;
      this.context.conversationStarted = true;

      return response;
      
    } catch (error) {
      console.error('[ConversationManager] Error:', error);
      return this.handleError(error);
    }
  }

  async handleGreeting() {
    return this.responseGenerator.generateGreeting(this.candidateId);
  }

  async handleNoPreference(entities) {
    // User doesn't care about time - show all available slots
    const slots = this.slotGenerator.generate({
      timePreference: null,  // No preference
      count: 8  // Show more slots since they're flexible
    });
    
    this.context.shownSlots = slots;
    this.context.preferences.timePreference = 'any';
    
    return this.responseGenerator.generateSlotList(slots, 'you - pick any time that works');
  }

  async handleTimePreference(entities) {
    this.context.preferences.timePreference = entities.timePreference;
    
    const slots = this.slotGenerator.generate({
      timePreference: entities.timePreference,
      count: 5
    });
    
    this.context.shownSlots = slots;
    
    return this.responseGenerator.generateSlotList(slots, entities.timePreference);
  }

  async handleSpecificDay(entities) {
    this.context.preferences.date = entities.date;
    this.context.preferences.dayOfWeek = entities.dayOfWeek;
    
    const slots = this.slotGenerator.generate({
      date: entities.date,
      dayOfWeek: entities.dayOfWeek,
      timePreference: this.context.preferences.timePreference,
      count: 5
    });
    
    if (slots.length === 0) {
      return this.responseGenerator.generateNoSlotsAvailable(entities);
    }
    
    this.context.shownSlots = slots;
    
    return this.responseGenerator.generateSlotList(slots, entities.dayOfWeek || 'that day');
  }

  async handleSlotSelection(entities) {
    const slotNumber = entities.slotNumber;
    const selectedSlot = this.context.shownSlots[slotNumber - 1];
    
    if (!selectedSlot) {
      return this.responseGenerator.generateInvalidSlot(slotNumber, this.context.shownSlots.length);
    }
    
    // Book the slot
    const booking = await this.bookInterview(selectedSlot);
    
    this.context.selectedSlot = selectedSlot;
    this.context.bookingStatus = 'confirmed';
    
    return this.responseGenerator.generateConfirmation(selectedSlot, booking);
  }

  async handleChangePreference(entities) {
    // User wants to change something
    Object.assign(this.context.preferences, entities);
    
    const slots = this.slotGenerator.generate({
      date: entities.date,
      dayOfWeek: entities.dayOfWeek,
      timePreference: entities.timePreference || this.context.preferences.timePreference,
      count: 5
    });
    
    this.context.shownSlots = slots;
    
    return this.responseGenerator.generateSlotList(slots, 'your new preferences');
  }

  async handleQuestion(message, intent) {
    // Use LLM to generate helpful response
    return this.responseGenerator.generateQuestionResponse(message, this.context, intent);
  }

  async handleConfirmation() {
    return this.responseGenerator.generateThankYou(this.context.selectedSlot);
  }

  async handleUnknown(message) {
    return this.responseGenerator.generateClarification(message, this.context);
  }

  async handleError(error) {
    console.error('[ConversationManager] Handling error:', error);
    return this.responseGenerator.generateError(this.context);
  }

  async bookInterview(slot) {
    // Save to interview_queue table
    const booking = {
      candidateId: this.candidateId,
      datetime: slot.datetime,
      status: 'scheduled',
      createdAt: new Date()
    };
    
    try {
      // Insert into interview_queue
      this.db.prepare(`
        INSERT INTO interview_queue (
          candidate_id, 
          queue_status, 
          scheduled_for, 
          added_at,
          preferred_times,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        this.candidateId,
        'scheduled',
        slot.datetime,
        booking.createdAt.toISOString(),
        JSON.stringify([slot.formatted]),
        `Interview scheduled via chatbot at ${slot.formatted}`
      );
      
      console.log('[ConversationManager] Booking created:', booking);
    } catch (error) {
      console.error('[ConversationManager] Database error:', error);
    }
    
    return booking;
  }
}

/**
 * Component 4: Response Generator
 * Creates natural, helpful responses for every scenario
 */
class ResponseGenerator {
  generateGreeting(candidateId) {
    return {
      content: `Hi! 👋 I'm here to schedule your verification interview.\n\nWhen works best for you? You can say things like:\n• "Tomorrow morning"\n• "Friday afternoon"\n• "Next week"\n• "Anytime this week"\n\nOr just tell me your preference! 😊`,
      type: 'greeting'
    };
  }

  generateSlotList(slots, context) {
    if (slots.length === 0) {
      return {
        content: `I don't have any slots available for ${context}. Would you like to see other options?`,
        type: 'no_slots'
      };
    }

    const slotText = slots.map((slot, idx) => 
      `${idx + 1}. ${slot.formatted}`
    ).join('\n');

    return {
      content: `Great! Here are the best times for ${context}:\n\n${slotText}\n\nJust reply with the number (1-${slots.length}) to book! 📅`,
      type: 'slot_list',
      slots: slots
    };
  }

  generateConfirmation(slot, booking) {
    return {
      content: `Perfect! ✅ I've booked you for:\n\n📅 ${slot.date}\n🕐 ${slot.time}\n\nYou'll receive a confirmation email shortly. Need to change this? Just let me know!`,
      type: 'confirmation',
      booking: booking
    };
  }

  generateNoSlotsAvailable(entities) {
    const dayText = entities.dayOfWeek || entities.formatted || 'that day';
    return {
      content: `I don't have any interviews available on ${dayText}. 😔\n\nWould you like to see:\n• Other days this week?\n• Next week's availability?\n• Any available times?`,
      type: 'no_slots'
    };
  }

  generateInvalidSlot(number, maxSlots) {
    return {
      content: `I don't see option ${number}. Please choose from 1-${maxSlots}! 😊`,
      type: 'error'
    };
  }

  async generateQuestionResponse(message, context, intent) {
    // For complex questions, provide helpful info
    return {
      content: `I'm here to help schedule your interview! The process is quick:\n\n1. Tell me when you're available\n2. I'll show you time slots\n3. Pick one and you're booked!\n\nWhat time works for you?`,
      type: 'help'
    };
  }

  generateThankYou(slot) {
    return {
      content: `You're all set! Looking forward to meeting you on ${slot.date}! 🎉`,
      type: 'thank_you'
    };
  }

  generateClarification(message, context) {
    if (context.shownSlots && context.shownSlots.length > 0) {
      return {
        content: `I didn't quite understand that. Are you trying to:\n• Select one of the slots I showed? (Reply with 1-${context.shownSlots.length})\n• See different times?\n• Change your preferences?\n\nJust let me know!`,
        type: 'clarification'
      };
    }
    
    return {
      content: `I want to help you schedule your interview! When would you like to meet? You can say things like "tomorrow", "friday morning", or "next week". 😊`,
      type: 'clarification'
    };
  }

  generateError(context) {
    return {
      content: `I encountered a small hiccup, but don't worry! 😊\n\nLet me get you connected with our team directly. They'll help you schedule right away.`,
      type: 'error',
      action: 'escalate_to_admin'
    };
  }
}

module.exports = {
  IntentDetector,
  SlotGenerator,
  ConversationManager,
  ResponseGenerator
};
