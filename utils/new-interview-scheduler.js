/**
 * NEW Interview Scheduler - Redesigned from Scratch
 * State-machine based with intelligent fallbacks
 * Handles complex requests like "what about friday"
 */

const { db } = require('../db');

// State machine states
const STATES = {
  GREETING: 'greeting',
  TIME_PREFERENCE: 'time_preference',
  SHOWING_SLOTS: 'showing_slots',
  SLOT_SELECTION: 'slot_selection',
  CONFIRMED: 'confirmed',
  ERROR: 'error'
};

// Time periods
const TIME_PERIODS = {
  MORNING: { name: 'morning', start: 9, end: 13, label: '9AM-1PM' },
  AFTERNOON: { name: 'afternoon', start: 14, end: 18, label: '2PM-6PM' }
};

class InterviewScheduler {
  constructor() {
    this.sessions = new Map(); // Store conversation state per candidate
  }

  /**
   * Main entry point for handling messages
   */
  async handleMessage(candidateId, message) {
    try {
      // Get or create session
      let session = this.sessions.get(candidateId);
      if (!session) {
        session = this.createSession(candidateId);
        this.sessions.set(candidateId, session);
      }

      console.log(`[Scheduler] ${candidateId} in state: ${session.state}, message: "${message}"`);

      // Process based on current state
      let response;
      switch (session.state) {
        case STATES.GREETING:
        case STATES.TIME_PREFERENCE:
          response = await this.handleTimePreference(session, message);
          break;
        
        case STATES.SHOWING_SLOTS:
        case STATES.SLOT_SELECTION:
          response = await this.handleSlotSelection(session, message);
          break;
        
        case STATES.CONFIRMED:
          response = await this.handlePostConfirmation(session, message);
          break;
        
        default:
          response = await this.handleTimePreference(session, message);
      }

      // Save session state
      this.sessions.set(candidateId, session);

      return response;

    } catch (error) {
      console.error(`[Scheduler] Error:`, error);
      return {
        message: "I encountered an issue. Let me reset and help you schedule from the beginning! 😊\n\n📅 **When works best for you?**\n- Morning (9AM-1PM)\n- Afternoon (2PM-6PM)",
        complete: false
      };
    }
  }

  /**
   * Create new session for candidate
   */
  createSession(candidateId) {
    return {
      candidateId,
      state: STATES.GREETING,
      preference: null,
      shownSlots: [],
      selectedSlot: null,
      attemptCount: 0,
      lastShownDay: null,
      createdAt: new Date()
    };
  }

  /**
   * Handle time preference selection and day-specific requests
   */
  async handleTimePreference(session, message) {
    const normalized = message.toLowerCase().trim();
    
    // Check if asking about specific day
    const dayRequest = this.extractDayRequest(normalized);
    if (dayRequest) {
      return await this.showSlotsForDay(session, dayRequest.day, dayRequest.preference || session.preference);
    }

    // Detect time preference
    const preference = this.detectTimePreference(normalized);
    
    if (preference) {
      session.preference = preference;
      session.state = STATES.SHOWING_SLOTS;
      return await this.showAvailableSlots(session, preference);
    }

    // First message / greeting
    if (session.attemptCount === 0) {
      session.attemptCount++;
      return {
        message: "Hi Augustine! 👋\n\nWelcome to WorkLink! Your account is being reviewed by our team.\n\nWhile you wait, I can help speed up the process by scheduling a quick verification interview with our consultant.\n\n📅 **Do you prefer morning (9AM-1PM) or afternoon (2PM-6PM) for your interview?**\n\nThis will help fast-track your approval process!",
        complete: false
      };
    }

    // Didn't understand preference
    return {
      message: "I didn't quite catch that! 😅\n\nPlease choose:\n• **Morning** (9AM-1PM)\n• **Afternoon** (2PM-6PM)\n\nOr tell me which day you prefer (e.g., 'friday morning')",
      complete: false
    };
  }

  /**
   * Handle slot selection with smart parsing
   */
  async handleSlotSelection(session, message) {
    const normalized = message.toLowerCase().trim();

    // Check if asking about different day
    const dayRequest = this.extractDayRequest(normalized);
    if (dayRequest) {
      return await this.showSlotsForDay(session, dayRequest.day, dayRequest.preference || session.preference);
    }

    // Check if changing time preference
    const newPreference = this.detectTimePreference(normalized);
    if (newPreference && newPreference !== session.preference) {
      session.preference = newPreference;
      session.state = STATES.SHOWING_SLOTS;
      return await this.showAvailableSlots(session, newPreference);
    }

    // Try to parse slot selection
    const selection = this.parseSlotSelection(normalized, session.shownSlots);
    
    if (selection) {
      // Valid selection!
      session.selectedSlot = selection;
      session.state = STATES.CONFIRMED;
      
      // Save to database
      await this.saveInterviewSlot(session.candidateId, selection);
      
      return {
        message: this.generateConfirmationMessage(selection),
        complete: true,
        interviewScheduled: true,
        slot: selection
      };
    }

    // Didn't understand selection
    session.attemptCount++;
    
    if (session.attemptCount > 3) {
      // Too many failed attempts, offer help
      return {
        message: "I'm having trouble understanding your selection. 😅\n\nLet me connect you with our admin team who can help you schedule directly.\n\n**Or**, simply reply with the slot number (1, 2, or 3) from the options I showed you!",
        complete: false
      };
    }

    return {
      message: "Hmm, I didn't catch which slot you want. 🤔\n\nPlease reply with:\n• The number (1, 2, or 3)\n• The time (e.g., '10am' or '2pm')\n• Or ask for a different day (e.g., 'what about friday')",
      complete: false
    };
  }

  /**
   * Handle messages after booking confirmed
   */
  async handlePostConfirmation(session, message) {
    const normalized = message.toLowerCase();
    
    if (normalized.includes('reschedule') || normalized.includes('change')) {
      // Reset session for rescheduling
      session.state = STATES.TIME_PREFERENCE;
      session.selectedSlot = null;
      session.shownSlots = [];
      
      return {
        message: "No problem! Let's reschedule. 📅\n\nWould you prefer:\n• Morning (9AM-1PM)\n• Afternoon (2PM-6PM)?",
        complete: false
      };
    }

    return {
      message: "Your interview is already confirmed! ✅\n\nIf you need to reschedule, just say 'reschedule' and I'll help you pick a new time.",
      complete: true
    };
  }

  /**
   * Detect time preference from message
   */
  detectTimePreference(message) {
    const morningKeywords = ['morning', 'am', '9', '10', '11', '12', 'early'];
    const afternoonKeywords = ['afternoon', 'pm', '2', '3', '4', '5', '6', 'evening', 'later'];
    
    const hasMorning = morningKeywords.some(k => message.includes(k));
    const hasAfternoon = afternoonKeywords.some(k => message.includes(k));
    
    if (hasMorning && !hasAfternoon) return 'morning';
    if (hasAfternoon && !hasMorning) return 'afternoon';
    
    return null;
  }

  /**
   * Extract day-specific request (e.g., "what about friday")
   */
  extractDayRequest(message) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const patterns = [
      /what about (\w+)/i,
      /how about (\w+)/i,
      /on (\w+)/i,
      /(\w+) morning/i,
      /(\w+) afternoon/i,
      /next (\w+)/i,
      /this (\w+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const dayName = match[1].toLowerCase();
        if (days.includes(dayName)) {
          // Detect if they also specified preference in same message
          const preference = this.detectTimePreference(message);
          return { day: dayName, preference };
        }
      }
    }

    // Check for standalone day names
    for (const day of days) {
      if (message.includes(day)) {
        const preference = this.detectTimePreference(message);
        return { day, preference };
      }
    }

    return null;
  }

  /**
   * Parse slot selection from message
   */
  parseSlotSelection(message, shownSlots) {
    if (!shownSlots || shownSlots.length === 0) return null;

    // Check for numbers (1, 2, 3)
    const numberMatch = message.match(/\b([123])\b|first|second|third|one|two|three/);
    if (numberMatch) {
      let index = 0;
      if (numberMatch[1]) {
        index = parseInt(numberMatch[1]) - 1;
      } else if (message.includes('first') || message.includes('one')) {
        index = 0;
      } else if (message.includes('second') || message.includes('two')) {
        index = 1;
      } else if (message.includes('third') || message.includes('three')) {
        index = 2;
      }
      
      if (index >= 0 && index < shownSlots.length) {
        return shownSlots[index];
      }
    }

    // Check for time mentions (10am, 2pm, 14:00)
    const timeMatch = message.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();
      
      if (meridiem === 'pm' && hour < 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
      
      // Find slot matching this time
      for (const slot of shownSlots) {
        const slotHour = parseInt(slot.time.split(':')[0]);
        const slotMinute = parseInt(slot.time.split(':')[1]);
        if (slotHour === hour && slotMinute === minute) {
          return slot;
        }
      }
    }

    return null;
  }

  /**
   * Show available slots for a specific day
   */
  async showSlotsForDay(session, dayName, preference) {
    const targetDate = this.getNextDayDate(dayName);
    const slots = this.generateSlotsForDay(targetDate, preference || 'morning');
    
    session.shownSlots = slots.slice(0, 3); // Show top 3
    session.state = STATES.SLOT_SELECTION;
    session.lastShownDay = dayName;
    
    const dayLabel = this.formatDayLabel(targetDate, dayName);
    const periodLabel = preference ? TIME_PERIODS[preference.toUpperCase()].label : 'available';
    
    return {
      message: `Great! Here are ${periodLabel} slots for ${dayLabel}:\n\n${this.formatSlotOptions(session.shownSlots)}\n\nSimply reply with the number of your preferred slot (1, 2, or 3)! ⚡`,
      complete: false
    };
  }

  /**
   * Show available slots based on preference
   */
  async showAvailableSlots(session, preference) {
    const slots = this.generateSlots(preference);
    session.shownSlots = slots.slice(0, 3); // Show top 3
    session.state = STATES.SLOT_SELECTION;
    
    const period = TIME_PERIODS[preference.toUpperCase()];
    
    return {
      message: `Perfect! Here are the best ${preference} (${period.label}) slots for you:\n\n${this.formatSlotOptions(session.shownSlots)}\n\nSimply reply with the number of your preferred slot (1, 2, or 3), and I'll book it immediately! ⚡`,
      complete: false
    };
  }

  /**
   * Generate available time slots
   */
  generateSlots(preference, count = 10) {
    const period = TIME_PERIODS[preference.toUpperCase()];
    const slots = [];
    const now = new Date();
    
    // Start from tomorrow
    let currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
    
    // Generate slots for next 7 days
    for (let day = 0; day < 7 && slots.length < count; day++) {
      const checkDate = new Date(currentDate);
      checkDate.setDate(checkDate.getDate() + day);
      
      // Skip weekends for now (can be made configurable)
      if (checkDate.getDay() === 0 || checkDate.getDay() === 6) continue;
      
      // Generate slots for this day
      for (let hour = period.start; hour < period.end && slots.length < count; hour++) {
        for (let minute of [0, 30]) {
          if (hour === period.end - 1 && minute === 30) continue; // Don't go past end time
          
          slots.push({
            date: this.formatDate(checkDate),
            time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            dayName: this.getDayName(checkDate),
            formatted: this.formatSlot(checkDate, hour, minute)
          });
          
          if (slots.length >= count) break;
        }
      }
    }
    
    return slots;
  }

  /**
   * Generate slots for a specific day
   */
  generateSlotsForDay(date, preference) {
    const period = TIME_PERIODS[preference.toUpperCase()];
    const slots = [];
    
    for (let hour = period.start; hour < period.end; hour++) {
      for (let minute of [0, 30]) {
        if (hour === period.end - 1 && minute === 30) continue;
        
        slots.push({
          date: this.formatDate(date),
          time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          dayName: this.getDayName(date),
          formatted: this.formatSlot(date, hour, minute)
        });
      }
    }
    
    return slots;
  }

  /**
   * Get next occurrence of a day name
   */
  getNextDayDate(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    
    const today = new Date();
    const currentDay = today.getDay();
    
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7; // Next week if already passed
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntil);
    targetDate.setHours(0, 0, 0, 0);
    
    return targetDate;
  }

  /**
   * Format slot options for display
   */
  formatSlotOptions(slots) {
    return slots.map((slot, index) => 
      `${index + 1}. ${slot.formatted}`
    ).join('\n');
  }

  /**
   * Format a single slot
   */
  formatSlot(date, hour, minute) {
    const dayName = this.getDayName(date);
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    
    const time12 = this.convertTo12Hour(hour, minute);
    
    return `${dayName}, ${monthName} ${day} at ${time12}`;
  }

  /**
   * Convert 24h to 12h format
   */
  convertTo12Hour(hour, minute) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const minuteStr = String(minute).padStart(2, '0');
    return `${hour12}:${minuteStr} ${period}`;
  }

  /**
   * Get day name from date
   */
  getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Format day label for display
   */
  formatDayLabel(date, dayName) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.getTime() === today.getTime()) {
      return 'today';
    } else if (date.getTime() === tomorrow.getTime()) {
      return 'tomorrow';
    } else {
      return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
    }
  }

  /**
   * Generate confirmation message
   */
  generateConfirmationMessage(slot) {
    return `✅ **Interview Confirmed!**\n\n📅 **Date:** ${slot.formatted}\n\nYou'll receive a reminder 24 hours before your interview. Our team will review your application and you'll hear back within 48 hours.\n\nSee you then! 🎉`;
  }

  /**
   * Save interview slot to database
   */
  async saveInterviewSlot(candidateId, slot) {
    try {
      const datetime = `${slot.date} ${slot.time}`;
      
      db.prepare(`
        UPDATE candidates 
        SET interview_scheduled_at = ?, 
            status = 'interview_scheduled',
            updated_at = datetime('now')
        WHERE id = ?
      `).run(datetime, candidateId);
      
      console.log(`[Scheduler] Saved interview for ${candidateId}: ${datetime}`);
      return true;
    } catch (error) {
      console.error('[Scheduler] Error saving interview:', error);
      return false;
    }
  }

  /**
   * Clear session for candidate
   */
  clearSession(candidateId) {
    this.sessions.delete(candidateId);
  }
}

// Export singleton instance
module.exports = new InterviewScheduler();
