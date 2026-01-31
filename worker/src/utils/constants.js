/**
 * Shared constants for Worker PWA
 * Centralized to avoid hardcoded values across components
 */

// Date/Time constants
export const MS_PER_DAY = 24 * 60 * 60 * 1000; // 86400000

// Default job times
export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '17:00';

// Locale
export const DEFAULT_LOCALE = 'en-SG';

// Date format options
export const DATE_FORMAT_SHORT = { day: 'numeric', month: 'short' };
export const DATE_FORMAT_MEDIUM = { weekday: 'short', day: 'numeric', month: 'short' };
export const DATE_FORMAT_LONG = { weekday: 'long', day: 'numeric', month: 'long' };
export const DATE_FORMAT_FULL = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

// Payment status labels
export const PAYMENT_STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Completed',
};

// Referral status labels
export const REFERRAL_STATUS_LABELS = {
  pending: 'Pending',
  registered: 'Signed Up',
  bonus_paid: 'Bonus Paid!',
};

// Quest type labels
export const QUEST_TYPE_LABELS = {
  daily: 'Daily',
  weekly: 'Weekly',
  special: 'Special',
  repeatable: 'Repeatable',
};

// Achievement rarity labels
export const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// Default fallback values
export const DEFAULTS = {
  userName: 'Friend',
  userPhone: 'Not set',
  rating: 0,
  xp: 0,
  level: 1,
  streakDays: 0,
  jobsCompleted: 0,
};

// Format money to 2 decimal places
export const formatMoney = (amount) => Number(amount || 0).toFixed(2);

// Format large numbers (K, M)
export const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Format date with locale
export const formatDate = (date, format = DATE_FORMAT_MEDIUM) => {
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE, format);
};

// Check if date is today
export const isToday = (date) => {
  return new Date(date).toDateString() === new Date().toDateString();
};

// Check if date is tomorrow
export const isTomorrow = (date) => {
  return new Date(date).toDateString() === new Date(Date.now() + MS_PER_DAY).toDateString();
};

// Calculate job hours from start/end time
export const calculateJobHours = (startTime, endTime, breakMinutes = 0) => {
  const start = (startTime || DEFAULT_START_TIME).split(':').map(Number);
  let end = (endTime || DEFAULT_END_TIME).split(':').map(Number);
  if (end[0] < start[0]) end[0] += 24;
  return ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1]) - breakMinutes) / 60;
};

// Calculate total pay
export const calculateTotalPay = (hours, payRate) => {
  return hours * (payRate || 0);
};
