/**
 * Conversation Flow Manager
 * Manages conversation state and integrates with interview scheduling system
 */

const axios = require('axios');
const { format, addDays, addHours, setHours, setMinutes } = require('date-fns');

class ConversationFlowManager {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
    this.flows = this.defineConversationFlows();
  }

  /**
   * Define conversation flows
   */
  defineConversationFlows() {
    return {
      interview_scheduling: {
        stages: [
          'initial_engagement',
          'scheduling_started',
          'collecting_availability',
          'offering_slots',
          'confirming_booking',
          'scheduled'
        ],
        transitions: {
          'initial_engagement': ['scheduling_started'],
          'scheduling_started': ['collecting_availability'],
          'collecting_availability': ['offering_slots'],
          'offering_slots': ['confirming_booking'],
          'confirming_booking': ['scheduled']
        }
      }
    };
  }

  /**
   * Check interview queue status for candidate
   */
  async checkInterviewQueue(candidateId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/interview-scheduling/candidate/${candidateId}/status`
      );

      const { schedulingStage, interview, queuePosition } = response.data;

      return {
        inQueue: ['in_queue', 'contacted'].includes(schedulingStage),
        scheduled: ['interview_scheduled', 'interview_confirmed'].includes(schedulingStage),
        completed: schedulingStage === 'interview_completed',
        interview: interview,
        queuePosition: queuePosition,
        stage: schedulingStage
      };

    } catch (error) {
      console.error('Error checking interview queue:', error);
      return {
        inQueue: false,
        scheduled: false,
        completed: false,
        interview: null,
        queuePosition: null,
        stage: 'not_in_flow'
      };
    }
  }

  /**
   * Find matching slots based on availability preferences
   */
  async findMatchingSlots(preferences, days = 7) {
    try {
      // Get available slots from the API
      const response = await axios.get(
        `${this.baseURL}/interview-scheduling/slots/available`,
        { params: { days } }
      );

      const allSlots = response.data.slots || [];

      // Filter slots based on preferences
      const matchingSlots = this.filterSlotsByPreferences(allSlots, preferences);

      // Format slots for display
      return matchingSlots.map(slot => ({
        ...slot,
        displayTime: this.formatSlotTime(slot)
      }));

    } catch (error) {
      console.error('Error finding matching slots:', error);
      return [];
    }
  }

  /**
   * Filter slots by user preferences
   */
  filterSlotsByPreferences(slots, preferences) {
    if (!preferences || Object.keys(preferences).length === 0) {
      return slots.slice(0, 5); // Return first 5 if no preferences
    }

    const { days, times, timeOfDay } = preferences;

    return slots.filter(slot => {
      const slotDate = new Date(slot.datetime);
      const slotDay = slotDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const slotHour = slotDate.getHours();

      // Filter by days if specified
      if (days && days.length > 0) {
        const matchesDay = days.some(day => {
          if (day === 'weekday' && [1,2,3,4,5].includes(slotDate.getDay())) return true;
          if (day === 'weekend' && [0,6].includes(slotDate.getDay())) return true;
          if (slotDay.includes(day.toLowerCase())) return true;
          return false;
        });
        if (!matchesDay) return false;
      }

      // Filter by time of day if specified
      if (timeOfDay) {
        if (timeOfDay === 'morning' && slotHour >= 9 && slotHour < 12) return true;
        if (timeOfDay === 'afternoon' && slotHour >= 12 && slotHour < 17) return true;
        if (timeOfDay === 'evening' && slotHour >= 17 && slotHour < 20) return true;
        if (!['morning', 'afternoon', 'evening'].includes(timeOfDay)) return true;
      }

      return true;
    }).slice(0, 5); // Limit to 5 options
  }

  /**
   * Book interview slot
   */
  async bookInterview(candidateId, slot) {
    try {
      const response = await axios.post(
        `${this.baseURL}/interview-scheduling/candidate/${candidateId}/schedule`,
        {
          date: slot.date,
          time: slot.time,
          notes: 'Scheduled via Internal SLM'
        }
      );

      if (response.data.success) {
        const interview = response.data.interview;
        return {
          success: true,
          interview: {
            ...interview,
            displayTime: this.formatInterviewTime(interview)
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Booking failed'
        };
      }

    } catch (error) {
      console.error('Error booking interview:', error);

      if (error.response?.status === 409) {
        return {
          success: false,
          message: 'That time slot is no longer available. Let me find you another option!'
        };
      }

      return {
        success: false,
        message: 'Unable to book interview at this time. Let me connect you with our admin team.'
      };
    }
  }

  /**
   * Generate alternative slots when preferred times not available
   */
  async generateAlternativeSlots(candidateId) {
    try {
      // Get next available slots
      const response = await axios.get(
        `${this.baseURL}/interview-scheduling/slots/available`,
        { params: { days: 3 } }
      );

      const slots = response.data.slots || [];

      // Return first 3 alternative slots
      return slots.slice(0, 3).map((slot, index) => ({
        id: index + 1,
        ...slot,
        displayTime: this.formatSlotTime(slot)
      }));

    } catch (error) {
      console.error('Error generating alternative slots:', error);

      // Return fallback slots
      return [
        {
          id: 1,
          datetime: this.generateFallbackSlot(1),
          displayTime: 'Tomorrow 10:00 AM'
        },
        {
          id: 2,
          datetime: this.generateFallbackSlot(1, 14),
          displayTime: 'Tomorrow 2:00 PM'
        },
        {
          id: 3,
          datetime: this.generateFallbackSlot(2, 11),
          displayTime: 'Day After Tomorrow 11:00 AM'
        }
      ];
    }
  }

  /**
   * Generate fallback slot datetime
   */
  generateFallbackSlot(daysFromNow, hour = 10) {
    const date = addDays(new Date(), daysFromNow);
    const slot = setMinutes(setHours(date, hour), 0);
    return slot.toISOString();
  }

  /**
   * Format slot time for display
   */
  formatSlotTime(slot) {
    const date = new Date(slot.datetime);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);

    // Determine relative day
    let relativeDay;
    if (this.isSameDay(date, today)) {
      relativeDay = 'Today';
    } else if (this.isSameDay(date, tomorrow)) {
      relativeDay = 'Tomorrow';
    } else if (this.isSameDay(date, dayAfter)) {
      relativeDay = 'Day After Tomorrow';
    } else {
      relativeDay = format(date, 'EEEE, MMM d');
    }

    const time = format(date, 'h:mm a');
    return `${relativeDay} ${time}`;
  }

  /**
   * Format interview time for confirmation
   */
  formatInterviewTime(interview) {
    const date = new Date(interview.scheduled_datetime);

    return {
      full: format(date, 'EEEE, MMMM d, yyyy \'at\' h:mm a'),
      date: format(date, 'EEEE, MMMM d'),
      time: format(date, 'h:mm a'),
      relative: this.formatSlotTime({ datetime: interview.scheduled_datetime })
    };
  }

  /**
   * Check if two dates are the same day
   */
  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Manage conversation flow transitions
   */
  updateConversationFlow(currentFlow, nextAction) {
    const flow = this.flows[currentFlow];
    if (!flow) return null;

    // Determine next stage based on current stage and action
    return this.determineNextStage(flow, nextAction);
  }

  /**
   * Determine next conversation stage
   */
  determineNextStage(flow, action) {
    // Logic to determine next stage based on action
    const stageMap = {
      'schedule_interview': 'scheduling_started',
      'collect_availability': 'collecting_availability',
      'offer_slots': 'offering_slots',
      'select_slot': 'confirming_booking',
      'confirm_booking': 'scheduled'
    };

    return stageMap[action] || flow.stages[0];
  }

  /**
   * Parse time preferences from natural language
   */
  parseTimePreferences(message) {
    const timePatterns = {
      morning: /\b(morning|am|9|10|11)\b/i,
      afternoon: /\b(afternoon|pm|12|1|2|3|4|5)\b/i,
      evening: /\b(evening|night|6|7|8)\b/i,
      weekday: /\b(weekday|monday|tuesday|wednesday|thursday|friday|mon|tue|wed|thu|fri)\b/i,
      weekend: /\b(weekend|saturday|sunday|sat|sun)\b/i,
      today: /\btoday\b/i,
      tomorrow: /\btomorrow\b/i
    };

    const preferences = {};

    Object.entries(timePatterns).forEach(([key, pattern]) => {
      if (pattern.test(message)) {
        if (['morning', 'afternoon', 'evening'].includes(key)) {
          preferences.timeOfDay = key;
        } else if (['weekday', 'weekend'].includes(key)) {
          preferences.days = preferences.days || [];
          preferences.days.push(key);
        } else if (['today', 'tomorrow'].includes(key)) {
          preferences.urgency = key === 'today' ? 'urgent' : 'high';
        }
      }
    });

    return preferences;
  }

  /**
   * Get conversation context for a candidate
   */
  async getConversationContext(candidateId) {
    try {
      // This would typically fetch from a conversation context store
      // For now, return minimal context
      return {
        conversationFlow: null,
        lastIntent: null,
        availableSlots: [],
        recentMessages: []
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {};
    }
  }

  /**
   * Update conversation context
   */
  async updateConversationContext(candidateId, updates) {
    try {
      // This would typically update a conversation context store
      // For now, just log the update
      console.log('Updating conversation context:', { candidateId, updates });
      return true;
    } catch (error) {
      console.error('Error updating conversation context:', error);
      return false;
    }
  }

  /**
   * Generate Google Calendar link for interview
   */
  generateCalendarLink(interview) {
    const startTime = new Date(interview.scheduled_datetime);
    const endTime = addHours(startTime, 0.5); // 30-minute interview

    const title = encodeURIComponent('WorkLink Verification Interview');
    const details = encodeURIComponent(
      `Your verification interview with WorkLink.\n\nMeeting Link: ${interview.meeting_link}\n\nWhat to expect:\n• Identity verification\n• Profile completion\n• Q&A session`
    );

    const start = startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = endTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
  }
}

class ManageConversationFlow extends ConversationFlowManager {
  // Alias for backward compatibility
}

module.exports = { ConversationFlowManager, ManageConversationFlow };