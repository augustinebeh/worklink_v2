/**
 * Database Utility Functions
 * Shared utilities for data generation and manipulation
 * 
 * @module database/utils
 */

/**
 * Generate DiceBear avatar URL
 * @param {string} name - Name to use as seed
 * @param {string} style - Avatar style (default: 'avataaars')
 * @returns {string} Avatar URL
 */
function generateAvatar(name, style = 'avataaars') {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

/**
 * Add days to a date
 * @param {Date|string} date - Base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} ISO date string
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Format date to ISO string
 * @param {Date|string} date - Date to format
 * @returns {string} ISO date string
 */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Random float
 */
function randomFloat(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

/**
 * Select random element from array
 * @param {Array} arr - Array to select from
 * @returns {*} Random element
 */
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} arr - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffle(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate unique ID with prefix
 * @param {string} prefix - ID prefix
 * @param {number} number - Number to pad
 * @param {number} padding - Number of digits to pad to
 * @returns {string} Formatted ID
 */
function generateId(prefix, number, padding = 3) {
  return `${prefix}${String(number).padStart(padding, '0')}`;
}

/**
 * Calculate XP required for a level (Career Ladder formula)
 * @param {number} level - Target level
 * @returns {number} XP required
 */
function calculateXpForLevel(level) {
  return Math.floor(500 * Math.pow(level, 1.5));
}

/**
 * Calculate level from XP
 * @param {number} xp - Current XP
 * @returns {number} Current level
 */
function calculateLevelFromXp(xp) {
  let level = 1;
  while (calculateXpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

module.exports = {
  generateAvatar,
  addDays,
  formatDate,
  randomInt,
  randomFloat,
  randomElement,
  shuffle,
  generateId,
  calculateXpForLevel,
  calculateLevelFromXp,
};
