/**
 * Time Utilities for Interview Scheduling
 * Handles time zone conversions, formatting, and date calculations
 */

/**
 * Format display time for various UI components
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:mm format
 * @returns {Object} Formatted time object with multiple representations
 */
function formatDisplayTime(date, time) {
  const dateObj = new Date(`${date}T${time}:00`);
  return {
    full: dateObj.toLocaleString('en-SG', {
      timeZone: 'Asia/Singapore',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    date: dateObj.toLocaleDateString('en-SG', {
      timeZone: 'Asia/Singapore',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }),
    time: dateObj.toLocaleTimeString('en-SG', {
      timeZone: 'Asia/Singapore',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }),
    relative: getRelativeTimeString(dateObj)
  };
}

/**
 * Get relative time string (e.g., "in 2 hours", "tomorrow")
 * @param {Date} date - Target date object
 * @returns {string} Relative time description
 */
function getRelativeTimeString(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((date - now) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 1) return `in ${diffInDays} days`;
  if (diffInDays === 1) return 'tomorrow';
  if (diffInDays === 0 && diffInHours > 0) return `in ${diffInHours} hours`;
  if (diffInDays === 0 && diffInMinutes > 0) return `in ${diffInMinutes} minutes`;
  if (diffInDays === -1) return 'yesterday';
  if (diffInDays < -1) return `${Math.abs(diffInDays)} days ago`;
  return 'now';
}

/**
 * Check if interview is within 24-hour reschedule restriction
 * @param {string} scheduledDate - Date in YYYY-MM-DD format
 * @param {string} scheduledTime - Time in HH:mm format
 * @returns {Object} Object with restriction status and hours remaining
 */
function checkRescheduleRestriction(scheduledDate, scheduledTime) {
  const now = new Date();
  const interviewDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  const hoursUntilInterview = (interviewDateTime - now) / (1000 * 60 * 60);

  return {
    canReschedule: hoursUntilInterview > 24,
    hoursUntilInterview: Math.ceil(hoursUntilInterview),
    scheduledTime: `${scheduledDate} ${scheduledTime}`
  };
}

/**
 * Generate time slots within a given time range
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @param {number} intervalMinutes - Interval between slots in minutes (default: 30)
 * @returns {Array} Array of time slots
 */
function generateTimeSlots(startTime, endTime, intervalMinutes = 30) {
  const slots = [];
  let currentTime = new Date(startTime);

  while (currentTime < endTime) {
    slots.push({
      time: currentTime.toTimeString().slice(0, 5),
      datetime: currentTime.toISOString(),
      hour: currentTime.getHours(),
      minute: currentTime.getMinutes()
    });

    currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
  }

  return slots;
}

/**
 * Determine time period (morning/afternoon) for scheduling logic
 * @param {number} hour - Hour in 24-hour format
 * @returns {string} Time period classification
 */
function getTimePeriod(hour) {
  if (hour >= 9 && hour < 13) return 'morning';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'off-hours';
}

/**
 * Calculate business hours between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of business hours between dates
 */
function calculateBusinessHours(startDate, endDate) {
  const msInHour = 1000 * 60 * 60;
  const businessStartHour = 9;
  const businessEndHour = 18;

  let totalHours = 0;
  let currentDate = new Date(startDate);

  while (currentDate < endDate) {
    // Skip weekends
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(businessStartHour, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(businessEndHour, 0, 0, 0);

      const effectiveStart = currentDate > dayStart ? currentDate : dayStart;
      const effectiveEnd = endDate < dayEnd ? endDate : dayEnd;

      if (effectiveStart < effectiveEnd) {
        totalHours += (effectiveEnd - effectiveStart) / msInHour;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }

  return Math.round(totalHours * 100) / 100;
}

/**
 * Get date range for scheduling queries
 * @param {number} days - Number of days from now
 * @returns {Object} Start and end date strings
 */
function getDateRange(days) {
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return { startDate, endDate };
}

/**
 * Convert timezone-aware datetime string to local components
 * @param {string} datetime - ISO datetime string
 * @param {string} timezone - Target timezone (default: Asia/Singapore)
 * @returns {Object} Date and time components
 */
function parseDateTime(datetime, timezone = 'Asia/Singapore') {
  const date = new Date(datetime);

  return {
    date: date.toLocaleDateString('sv-SE', { timeZone: timezone }), // YYYY-MM-DD format
    time: date.toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour12: false
    }).slice(0, 5), // HH:mm format
    hour: parseInt(date.toLocaleTimeString('en-GB', {
      timeZone: timezone,
      hour12: false
    }).split(':')[0]),
    dayOfWeek: date.getDay()
  };
}

module.exports = {
  formatDisplayTime,
  getRelativeTimeString,
  checkRescheduleRestriction,
  generateTimeSlots,
  getTimePeriod,
  calculateBusinessHours,
  getDateRange,
  parseDateTime
};