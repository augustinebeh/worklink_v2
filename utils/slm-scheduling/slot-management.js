/**
 * SLM Scheduling Bridge - Slot Management
 *
 * Extracted slot finding, formatting, parsing, and calendar
 * availability methods for the SLM scheduling bridge.
 */

const { createLogger } = require('../structured-logger');
const logger = createLogger('slm-scheduling-slots');

/**
 * Get available slots for a given number of days
 */
async function getAvailableSlots(schedulingEngine, days = 7) {
  const slots = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = date.toISOString().split('T')[0];
    const daySlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

    for (const time of daySlots) {
      if (await schedulingEngine.isSlotAvailable(dateStr, time)) {
        slots.push({ date: dateStr, time });
      }
    }
  }

  return slots.slice(0, 10);
}

/**
 * Get morning slots (9AM-1PM)
 */
async function getMorningSlots(schedulingEngine, days = 7) {
  const slots = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = date.toISOString().split('T')[0];
    const morningSlots = ['09:00', '10:00', '11:00', '12:00', '13:00'];

    for (const time of morningSlots) {
      if (await schedulingEngine.isSlotAvailable(dateStr, time)) {
        slots.push({ date: dateStr, time });
      }
    }
  }

  return slots.slice(0, 10);
}

/**
 * Get afternoon slots (2PM-6PM)
 */
async function getAfternoonSlots(schedulingEngine, days = 7) {
  const slots = [];
  const today = new Date();

  for (let i = 1; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dateStr = date.toISOString().split('T')[0];
    const afternoonSlots = ['14:00', '15:00', '16:00', '17:00', '18:00'];

    for (const time of afternoonSlots) {
      if (await schedulingEngine.isSlotAvailable(dateStr, time)) {
        slots.push({ date: dateStr, time });
      }
    }
  }

  return slots.slice(0, 10);
}

/**
 * Find slots matching candidate preferences
 */
async function findSlotsMatchingPreferences(schedulingEngine, preferences, timePreference = null, getAvailableSlotsFn, getMorningSlotsFn, getAfternoonSlotsFn) {
  const preferredTime = timePreference ||
    (preferences.timePreference) ||
    (preferences.times && preferences.times[0]);

  if (preferredTime === 'morning') {
    return await getMorningSlotsFn(14);
  } else if (preferredTime === 'afternoon') {
    return await getAfternoonSlotsFn(14);
  }

  const allSlots = await getAvailableSlotsFn(14);

  return allSlots.filter(slot => {
    const slotDate = new Date(slot.date);
    const slotHour = parseInt(slot.time.split(':')[0]);

    if (preferences.days && preferences.days.length > 0) {
      const dayOfWeek = slotDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const slotDayName = dayNames[dayOfWeek];

      if (!preferences.days.some(day => slotDayName.includes(day.toLowerCase()))) {
        return false;
      }
    }

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

/**
 * Parse availability from user message
 */
function parseAvailabilityFromMessage(message) {
  const msg = message.toLowerCase();

  const days = [];
  const times = [];
  let timezone = 'Asia/Singapore';

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

/**
 * Format slot date/time for display
 */
function formatSlotDateTime(slot) {
  const date = new Date(slot.date);
  const time = slot.time;

  const options = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Singapore'
  };

  const dateStr = date.toLocaleDateString('en-US', options);
  const timeStr = formatTime(time);

  return `${dateStr} at ${timeStr}`;
}

/**
 * Format time string for display
 */
function formatTime(timeStr) {
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
 * Format a Date object for interview display
 */
function formatInterviewDateTime(dateTime) {
  if (!(dateTime instanceof Date) || isNaN(dateTime)) {
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

/**
 * Parse slot selection from user message
 */
function parseSlotSelection(message, shownSlots) {
  const msg = message.toLowerCase().trim();

  // Pattern 1: Direct number selection ("1", "2", "3")
  const numberMatch = msg.match(/^\s*(\d)\s*$/);
  if (numberMatch) {
    const slotIndex = parseInt(numberMatch[1]) - 1;
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
    if (messageMatchesSlot(msg, slot)) {
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
function messageMatchesSlot(message, slot) {
  const msg = message.toLowerCase();
  const slotDate = new Date(slot.date);
  const slotTime = slot.time;

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const slotDay = dayNames[slotDate.getDay()];

  const hour = parseInt(slotTime.split(':')[0]);
  const timeVariations = [
    slotTime,
    `${hour}am`, `${hour}pm`,
    `${hour}:00am`, `${hour}:00pm`,
  ];

  const hasDay = msg.includes(slotDay.substr(0, 3)) || msg.includes(slotDay);
  const hasTime = timeVariations.some(timeVar => msg.includes(timeVar.toLowerCase()));

  return hasDay && hasTime;
}

/**
 * Parse specific slot request from user message
 */
function parseSpecificSlotRequest(message) {
  const msg = message.toLowerCase();

  const timePatterns = [
    /(?:can\s*i\s*(?:have|get|take|book)|i(?:'ll|.ll|\s*will)?\s*(?:take|want|choose|pick)|(?:give\s*me|let(?:'s|\s*me)\s*take))\s*(?:the\s*)?(\d{1,2})(?::\d{2})?\s*(am|pm)/i,
    /(?:option|slot|number|choice)\s*(\d)/i,
    /(?:the\s*)?(\d)(?:st|nd|rd|th)?\s*(?:one|option|slot)/i,
    /^\s*(\d)\s*$/i,
    /^\s*(\d{1,2})(?::\d{2})?\s*(am|pm)\s*$/i
  ];

  for (const pattern of timePatterns) {
    const match = msg.match(pattern);
    if (match) {
      if (match[2] && (match[2] === 'am' || match[2] === 'pm')) {
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
        const optionNumber = parseInt(match[1]);
        return {
          type: 'option_number',
          optionIndex: optionNumber - 1,
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
function findMatchingSlot(availableSlots, requestedSlot) {
  if (!requestedSlot) return null;

  if (requestedSlot.type === 'specific_time') {
    return availableSlots.find(slot => {
      const slotHour = parseInt(slot.time.split(':')[0]);
      return slotHour === requestedSlot.hour;
    });
  } else if (requestedSlot.type === 'option_number') {
    return availableSlots[requestedSlot.optionIndex];
  }

  return null;
}

/**
 * Get real available slots from admin calendar
 */
async function getAvailableCalendarSlots(schedulingEngine, daysAhead = 14) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + daysAhead);

  const availabilitySlots = schedulingEngine.db.prepare(`
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

  const bookedSlots = schedulingEngine.db.prepare(`
    SELECT scheduled_date, scheduled_time, duration_minutes
    FROM interview_slots
    WHERE scheduled_date >= ? AND scheduled_date <= ?
      AND status IN ('scheduled', 'confirmed')
  `).all(
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  const bookedTimes = new Set(
    bookedSlots.map(slot => `${slot.scheduled_date}T${slot.scheduled_time}`)
  );

  const realAvailableSlots = [];

  for (const slot of availabilitySlots) {
    const slotDateTime = `${slot.date}T${slot.start_time}`;

    if (bookedTimes.has(slotDateTime)) {
      continue;
    }

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

    if (realAvailableSlots.length >= 10) {
      break;
    }
  }

  return realAvailableSlots;
}

module.exports = {
  getAvailableSlots,
  getMorningSlots,
  getAfternoonSlots,
  findSlotsMatchingPreferences,
  parseAvailabilityFromMessage,
  formatSlotDateTime,
  formatTime,
  formatInterviewDateTime,
  parseSlotSelection,
  messageMatchesSlot,
  parseSpecificSlotRequest,
  findMatchingSlot,
  getAvailableCalendarSlots
};
