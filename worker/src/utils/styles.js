/**
 * Shared style utilities for Worker PWA
 * Centralized to avoid duplication across components
 */

// Card styles
export const cardStyles = {
  base: (isDark) => isDark
    ? 'bg-dark-900/50 border-white/5'
    : 'bg-white border-slate-200 shadow-sm',

  rounded: (isDark) => `p-4 rounded-2xl border transition-all ${cardStyles.base(isDark)}`,

  roundedXl: (isDark) => `p-4 rounded-xl border ${cardStyles.base(isDark)}`,

  hero: (isDark) => isDark
    ? 'bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#1a1a3e] border-white/5'
    : 'bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 border-primary-500/20',

  accent: (isDark) => isDark
    ? 'bg-gradient-to-br from-accent-900/30 to-accent-800/10 border-accent-500/20'
    : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200',
};

// Icon badge styles (circular icon containers)
export const iconBadgeStyles = {
  primary: 'bg-primary-500/20 text-primary-400',
  accent: 'bg-accent-500/20 text-accent-400',
  green: 'bg-emerald-500/20 text-emerald-400',
  blue: 'bg-blue-500/20 text-blue-400',
  purple: 'bg-purple-500/20 text-purple-400',
  amber: 'bg-amber-500/20 text-amber-400',
  red: 'bg-red-500/20 text-red-400',
  gold: 'bg-yellow-500/20 text-yellow-400',
};

// Status badge styles
export const statusBadgeStyles = {
  pending: 'bg-amber-500/20 text-amber-400',
  approved: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  paid: 'bg-emerald-500/20 text-emerald-400',
  completed: 'bg-emerald-500/20 text-emerald-400',
  active: 'bg-emerald-500/20 text-emerald-400',
  registered: 'bg-blue-500/20 text-blue-400',
  bonus_paid: 'bg-emerald-500/20 text-emerald-400',
};

// Text styles
export const textStyles = {
  heading: (isDark) => isDark ? 'text-white' : 'text-slate-900',
  subheading: (isDark) => isDark ? 'text-dark-300' : 'text-slate-600',
  muted: (isDark) => isDark ? 'text-dark-400' : 'text-slate-500',
  dimmed: (isDark) => isDark ? 'text-dark-500' : 'text-slate-400',
};

// Input styles
export const inputStyles = {
  base: (isDark) => isDark
    ? 'bg-dark-800 border-white/10 text-white placeholder-dark-500'
    : 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400',
};

// Button styles
export const buttonStyles = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]',
  secondary: (isDark) => isDark
    ? 'bg-dark-800 text-dark-300 hover:bg-dark-700'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  accent: 'bg-accent-500 text-white hover:bg-accent-600',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
};

// Progress bar styles
export const progressBarStyles = {
  track: (isDark) => isDark ? 'bg-dark-800' : 'bg-slate-200',
  fill: 'bg-gradient-to-r from-accent-400 to-accent-500',
  fillPrimary: 'bg-gradient-to-r from-primary-400 to-primary-500',
};

// Level tier styles
export const levelTierStyles = {
  bronze: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  silver: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  platinum: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  diamond: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  mythic: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

// Get level tier based on level number
export function getLevelTierStyle(level) {
  if (level >= 50) return levelTierStyles.mythic;
  if (level >= 40) return levelTierStyles.diamond;
  if (level >= 30) return levelTierStyles.platinum;
  if (level >= 20) return levelTierStyles.gold;
  if (level >= 10) return levelTierStyles.silver;
  return levelTierStyles.bronze;
}

// Rarity styles (for achievements, items, etc.)
export const rarityStyles = {
  common: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' },
  uncommon: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  rare: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  epic: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  legendary: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};
