/**
 * Shared constants for Worker PWA
 * Centralized to avoid hardcoded values across components
 */

// Date/Time constants
export const MS_PER_DAY = 24 * 60 * 60 * 1000; // 86400000

// Default job times
export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '17:00';

// Singapore timezone (GMT+8)
export const TIMEZONE = 'Asia/Singapore';
export const DEFAULT_LOCALE = 'en-SG';

// Date format options (all include timezone for consistency)
export const DATE_FORMAT_SHORT = { day: 'numeric', month: 'short', timeZone: TIMEZONE };
export const DATE_FORMAT_MEDIUM = { weekday: 'short', day: 'numeric', month: 'short', timeZone: TIMEZONE };
export const DATE_FORMAT_LONG = { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIMEZONE };
export const DATE_FORMAT_FULL = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TIMEZONE };
export const TIME_FORMAT_SHORT = { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE };
export const TIME_FORMAT_FULL = { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TIMEZONE };

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
  challenge: 'Challenge',
};

// Quest type styling config (icons imported where needed)
export const QUEST_TYPE_STYLES = {
  daily: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
  weekly: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30' },
  special: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  repeatable: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
  challenge: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
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

// Get current date/time in Singapore timezone
export const getSGDate = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
};

// Get date string in Singapore timezone (YYYY-MM-DD)
export const getSGDateString = (date = new Date()) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA gives YYYY-MM-DD format
};

// Get current hour in Singapore timezone (0-23)
export const getSGHour = () => {
  return parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: TIMEZONE }));
};

// Format date with locale and Singapore timezone
export const formatDate = (date, format = DATE_FORMAT_MEDIUM) => {
  const options = { ...format, timeZone: TIMEZONE };
  return new Date(date).toLocaleDateString(DEFAULT_LOCALE, options);
};

// Format time with Singapore timezone
export const formatTime = (date, format = TIME_FORMAT_SHORT) => {
  const options = { ...format, timeZone: TIMEZONE };
  return new Date(date).toLocaleTimeString(DEFAULT_LOCALE, options);
};

// Format datetime with Singapore timezone
export const formatDateTime = (date, dateFormat = DATE_FORMAT_SHORT, timeFormat = TIME_FORMAT_SHORT) => {
  const d = new Date(date);
  const dateStr = d.toLocaleDateString(DEFAULT_LOCALE, { ...dateFormat, timeZone: TIMEZONE });
  const timeStr = d.toLocaleTimeString(DEFAULT_LOCALE, { ...timeFormat, timeZone: TIMEZONE });
  return `${dateStr}, ${timeStr}`;
};

// Check if date is today in Singapore timezone
export const isToday = (date) => {
  return getSGDateString(date) === getSGDateString();
};

// Check if date is tomorrow in Singapore timezone
export const isTomorrow = (date) => {
  const tomorrow = new Date(Date.now() + MS_PER_DAY);
  return getSGDateString(date) === getSGDateString(tomorrow);
};

// Check if date is in the past (Singapore timezone)
export const isPast = (date) => {
  return getSGDateString(date) < getSGDateString();
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
