/**
 * Availability Checker for Interview Scheduling
 * Handles slot availability validation, conflict detection, and booking logic
 */

const { db } = require('../../../../db');
const { generateTimeSlots, getTimePeriod, getDateRange } = require('./time-utils');

/**
 * Check if a specific time slot is available for booking
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:mm format
 * @param {number|null} excludeInterviewId - Interview ID to exclude from conflict check
 * @returns {boolean} True if slot is available
 */
function isSlotAvailable(date, time, excludeInterviewId = null) {
  try {
    let query = `
      SELECT COUNT(*) as count
      FROM interview_slots
      WHERE scheduled_date = ? AND scheduled_time = ?
        AND status IN ('scheduled', 'confirmed')
    `;
    const params = [date, time];

    if (excludeInterviewId) {
      query += ' AND id != ?';
      params.push(excludeInterviewId);
    }

    const result = db.prepare(query).get(...params);
    return result.count === 0;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
}

/**
 * Get available slots for a date range with optional filtering
 * @param {Object} options - Query options
 * @param {number} options.days - Number of days to look ahead (default: 7)
 * @param {string} options.timePeriod - Filter by time period (morning/afternoon)
 * @param {number} options.limit - Maximum number of slots to return (default: 20)
 * @returns {Array} Array of available time slots
 */
function getAvailableSlots(options = {}) {
  const { days = 7, timePeriod, limit = 20 } = options;

  try {
    const { endDate } = getDateRange(days);

    // Get consultant availability windows
    const availableWindows = db.prepare(`
      SELECT
        ca.date,
        ca.start_time,
        ca.end_time,
        ca.consultant_id,
        COUNT(is.id) as booked_slots
      FROM consultant_availability ca
      LEFT JOIN interview_slots is ON ca.date = is.scheduled_date
        AND is.scheduled_time >= ca.start_time
        AND is.scheduled_time < ca.end_time
        AND is.status IN ('scheduled', 'confirmed')
      WHERE ca.date >= DATE('now')
        AND ca.date <= ?
        AND ca.is_available = 1
        AND ca.slot_type = 'interview'
      GROUP BY ca.date, ca.start_time, ca.end_time, ca.consultant_id
      ORDER BY ca.date, ca.start_time
    `).all(endDate);

    const slots = [];

    for (const window of availableWindows) {
      const startTime = new Date(`${window.date}T${window.start_time}:00`);
      const endTime = new Date(`${window.date}T${window.end_time}:00`);

      // Generate 30-minute slots within the window
      const windowSlots = generateTimeSlots(startTime, endTime, 30);

      for (const slot of windowSlots) {
        // Check if this specific slot is available
        if (isSlotAvailable(window.date, slot.time)) {
          // Apply time period filtering if specified
          const slotPeriod = getTimePeriod(slot.hour);
          let includeSlot = true;

          if (timePeriod === 'morning' && slotPeriod !== 'morning') {
            includeSlot = false;
          } else if (timePeriod === 'afternoon' && slotPeriod !== 'afternoon') {
            includeSlot = false;
          }

          if (includeSlot) {
            slots.push({
              date: window.date,
              time: slot.time,
              datetime: slot.datetime,
              consultantId: window.consultant_id,
              timePeriod: slotPeriod
            });
          }
        }
      }

      // Stop if we have enough slots
      if (slots.length >= limit) break;
    }

    return slots.slice(0, limit);
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return [];
  }
}

/**
 * Check for scheduling conflicts for a given time slot
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:mm format
 * @param {number} duration - Duration in minutes (default: 30)
 * @returns {Object} Conflict analysis result
 */
function checkConflicts(date, time, duration = 30) {
  try {
    const conflicts = {
      hasConflict: false,
      conflictType: null,
      conflictingInterviews: [],
      suggestions: []
    };

    // Check for direct time conflicts
    const directConflicts = db.prepare(`
      SELECT is.*, c.name as candidate_name, c.email as candidate_email
      FROM interview_slots is
      LEFT JOIN candidates c ON is.candidate_id = c.id
      WHERE is.scheduled_date = ?
        AND is.scheduled_time = ?
        AND is.status IN ('scheduled', 'confirmed')
    `).all(date, time);

    if (directConflicts.length > 0) {
      conflicts.hasConflict = true;
      conflicts.conflictType = 'direct_overlap';
      conflicts.conflictingInterviews = directConflicts;
    }

    // Check for overlapping time ranges
    const slotEndTime = new Date(`${date}T${time}:00`);
    slotEndTime.setMinutes(slotEndTime.getMinutes() + duration);
    const endTimeString = slotEndTime.toTimeString().slice(0, 5);

    const overlapConflicts = db.prepare(`
      SELECT is.*, c.name as candidate_name, c.email as candidate_email
      FROM interview_slots is
      LEFT JOIN candidates c ON is.candidate_id = c.id
      WHERE is.scheduled_date = ?
        AND is.status IN ('scheduled', 'confirmed')
        AND (
          (is.scheduled_time < ? AND
           TIME(is.scheduled_time, '+' || COALESCE(is.duration_minutes, 30) || ' minutes') > ?)
          OR
          (is.scheduled_time >= ? AND is.scheduled_time < ?)
        )
    `).all(date, time, time, time, endTimeString);

    if (overlapConflicts.length > 0 && !conflicts.hasConflict) {
      conflicts.hasConflict = true;
      conflicts.conflictType = 'time_overlap';
      conflicts.conflictingInterviews = overlapConflicts;
    }

    // Generate suggestions if there are conflicts
    if (conflicts.hasConflict) {
      conflicts.suggestions = generateConflictSuggestions(date, time, duration);
    }

    return conflicts;
  } catch (error) {
    console.error('Error checking conflicts:', error);
    return {
      hasConflict: true,
      conflictType: 'error',
      error: error.message
    };
  }
}

/**
 * Generate alternative time suggestions when conflicts occur
 * @param {string} originalDate - Original requested date
 * @param {string} originalTime - Original requested time
 * @param {number} duration - Interview duration in minutes
 * @returns {Array} Array of alternative time slots
 */
function generateConflictSuggestions(originalDate, originalTime, duration) {
  try {
    const suggestions = [];
    const requestedHour = parseInt(originalTime.split(':')[0]);

    // Find alternative slots on the same day
    const sameDaySlots = getAvailableSlots({ days: 1 })
      .filter(slot => slot.date === originalDate)
      .slice(0, 3);

    // Find slots on adjacent days with similar time
    const adjacentDaySlots = getAvailableSlots({ days: 3 })
      .filter(slot => {
        const slotHour = parseInt(slot.time.split(':')[0]);
        return Math.abs(slotHour - requestedHour) <= 2 && slot.date !== originalDate;
      })
      .slice(0, 2);

    suggestions.push(
      ...sameDaySlots.map(slot => ({
        ...slot,
        suggestion_type: 'same_day_alternative',
        reason: 'Alternative time on the same day'
      })),
      ...adjacentDaySlots.map(slot => ({
        ...slot,
        suggestion_type: 'adjacent_day_similar_time',
        reason: 'Similar time on adjacent day'
      }))
    );

    return suggestions;
  } catch (error) {
    console.error('Error generating conflict suggestions:', error);
    return [];
  }
}

/**
 * Validate candidate availability status
 * @param {number} candidateId - Candidate ID
 * @returns {Object} Candidate availability status
 */
function checkCandidateAvailability(candidateId) {
  try {
    // Check existing scheduled interviews
    const existingInterview = db.prepare(`
      SELECT * FROM interview_slots
      WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
      ORDER BY scheduled_date DESC, scheduled_time DESC
      LIMIT 1
    `).get(candidateId);

    // Check queue status
    const queueStatus = db.prepare(`
      SELECT * FROM interview_queue
      WHERE candidate_id = ? AND queue_status IN ('waiting', 'contacted', 'scheduled')
      ORDER BY added_at DESC
      LIMIT 1
    `).get(candidateId);

    return {
      hasExistingInterview: !!existingInterview,
      existingInterview,
      inQueue: !!queueStatus,
      queueStatus: queueStatus?.queue_status,
      canSchedule: !existingInterview // Can't schedule if already has active interview
    };
  } catch (error) {
    console.error('Error checking candidate availability:', error);
    return {
      hasExistingInterview: false,
      canSchedule: true,
      error: error.message
    };
  }
}

/**
 * Validate consultant availability for a specific time
 * @param {number} consultantId - Consultant ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:mm format
 * @returns {Object} Consultant availability status
 */
function checkConsultantAvailability(consultantId, date, time) {
  try {
    const availability = db.prepare(`
      SELECT * FROM consultant_availability
      WHERE consultant_id = ?
        AND date = ?
        AND start_time <= ?
        AND end_time > ?
        AND is_available = 1
        AND slot_type = 'interview'
    `).get(consultantId, date, time, time);

    return {
      isAvailable: !!availability,
      availabilityWindow: availability,
      reason: availability ? 'Available' : 'No availability window found'
    };
  } catch (error) {
    console.error('Error checking consultant availability:', error);
    return {
      isAvailable: false,
      error: error.message
    };
  }
}

/**
 * Get booking statistics for analytics
 * @param {Object} options - Query options
 * @param {string} options.startDate - Start date for statistics
 * @param {string} options.endDate - End date for statistics
 * @returns {Object} Booking statistics
 */
function getBookingStatistics(options = {}) {
  try {
    const { startDate, endDate } = options.startDate && options.endDate
      ? options
      : getDateRange(7);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_slots,
        SUM(CASE WHEN status IN ('scheduled', 'confirmed') THEN 1 ELSE 0 END) as booked_slots,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_slots,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_slots,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show_slots
      FROM interview_slots
      WHERE scheduled_date BETWEEN ? AND ?
    `).get(startDate, endDate);

    const utilization = stats.total_slots > 0
      ? (stats.booked_slots / stats.total_slots) * 100
      : 0;

    return {
      ...stats,
      utilization_rate: Math.round(utilization * 100) / 100,
      period: { startDate, endDate }
    };
  } catch (error) {
    console.error('Error getting booking statistics:', error);
    return null;
  }
}

module.exports = {
  isSlotAvailable,
  getAvailableSlots,
  checkConflicts,
  generateConflictSuggestions,
  checkCandidateAvailability,
  checkConsultantAvailability,
  getBookingStatistics
};