/**
 * AvatarBorderConfig - Border configuration data for ProfileAvatar
 *
 * 6-Tier System (from GamificationStrategy.md):
 * - Bronze (1-9): Simple, matte bronze ring
 * - Silver (10-24): Metallic silver + shine effect
 * - Gold (25-49): Gold + sparkle particle effect
 * - Platinum (50-74): Glowing blue/white neon pulse
 * - Diamond (75-99): Prismatic refraction animation
 * - Mythic (100+): Dark matter/purple flame effect
 */

// Border configurations for each tier
export const TIER_BORDERS = {
  bronze: {
    border: 'border-4 border-amber-700',
    ring: '',
    glow: '',
    animation: '',
    badge: 'bg-amber-700 text-amber-100',
    gradient: '',
    intricate: false,
  },
  silver: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-slate-300/60',
    glow: 'shadow-md shadow-slate-400/40',
    animation: 'animate-shimmer-silver',
    badge: 'bg-gradient-to-r from-slate-400 to-slate-300 text-slate-800',
    gradient: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-300',
    intricate: false,
  },
  gold: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-yellow-400/60',
    glow: 'shadow-lg shadow-yellow-500/40',
    animation: 'animate-shimmer-gold',
    badge: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-900',
    gradient: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-500',
    intricate: false,
  },
  platinum: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-cyan-400/60',
    glow: 'shadow-xl shadow-cyan-500/50',
    animation: 'animate-glow-pulse',
    badge: 'bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 text-white',
    gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-400',
    intricate: false,
  },
  diamond: {
    border: 'border-4 border-transparent',
    ring: 'ring-3 ring-violet-400/70',
    glow: 'shadow-2xl shadow-violet-500/60',
    animation: 'animate-border-spin',
    badge: 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white',
    gradient: 'bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500',
    intricate: false,
  },
  mythic: {
    border: 'border-4 border-transparent',
    ring: 'ring-4 ring-rose-500/70',
    glow: 'shadow-2xl shadow-rose-600/70',
    animation: 'animate-rainbow',
    badge: 'bg-gradient-to-r from-purple-600 via-rose-500 to-purple-600 text-white animate-pulse',
    gradient: 'bg-gradient-to-r from-purple-500 via-rose-500 to-purple-600',
    intricate: false,
  },
  special: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-emerald-400/60',
    glow: 'shadow-lg shadow-emerald-500/40',
    animation: 'animate-pulse-slow',
    badge: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white',
    gradient: 'bg-gradient-to-br from-emerald-400 via-cyan-500 to-emerald-400',
    intricate: false,
  },
};

// Intricate border configurations with complex designs
export const CUSTOM_BORDERS = {
  // === BRONZE TIER ===
  BRD001: {
    gradient: 'bg-gradient-to-br from-amber-600 to-amber-700',
    glow: '',
    animation: '',
    tier: 'bronze',
    intricate: false,
  },
  BRD002: {
    gradient: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600',
    glow: 'shadow-lg shadow-orange-500/30',
    animation: 'animate-pulse-slow',
    tier: 'bronze',
    intricate: 'flame', // Fire pattern
  },

  // === SILVER TIER ===
  BRD003: {
    gradient: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-300',
    glow: '',
    animation: '',
    tier: 'silver',
    intricate: false,
  },
  BRD004: {
    gradient: 'bg-gradient-conic from-slate-200 via-slate-400 via-slate-200 via-slate-500 to-slate-200',
    glow: 'shadow-lg shadow-zinc-400/40',
    animation: 'animate-spin-slow',
    tier: 'silver',
    intricate: 'celtic', // Celtic knot pattern
  },

  // === GOLD TIER ===
  BRD005: {
    gradient: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600',
    glow: 'shadow-lg shadow-yellow-500/30',
    animation: 'animate-shimmer-gold',
    tier: 'gold',
    intricate: false,
  },
  BRD006: {
    gradient: 'bg-gradient-conic from-yellow-300 via-amber-500 via-yellow-400 via-orange-400 to-yellow-300',
    glow: 'shadow-xl shadow-yellow-400/50',
    animation: 'animate-spin-slow',
    tier: 'gold',
    intricate: 'crown', // Crown/royal pattern with gems
  },

  // === PLATINUM TIER ===
  BRD007: {
    gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-500',
    glow: 'shadow-xl shadow-cyan-500/40',
    animation: 'animate-pulse-slow',
    tier: 'platinum',
    intricate: false,
  },
  BRD008: {
    gradient: 'bg-gradient-conic from-cyan-200 via-teal-400 via-cyan-300 via-emerald-400 to-cyan-200',
    glow: 'shadow-xl shadow-teal-400/50',
    animation: 'animate-spin-slow',
    tier: 'platinum',
    intricate: 'circuit', // Tech circuit pattern
  },

  // === DIAMOND TIER ===
  BRD009: {
    gradient: 'bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-500',
    glow: 'shadow-2xl shadow-violet-500/50',
    animation: 'animate-border-spin',
    tier: 'diamond',
    intricate: false,
  },
  BRD010: {
    gradient: 'bg-gradient-conic from-violet-300 via-fuchsia-400 via-pink-400 via-purple-500 to-violet-300',
    glow: 'shadow-2xl shadow-purple-500/60',
    animation: 'animate-spin-slow',
    tier: 'diamond',
    intricate: 'prism', // Prismatic faceted pattern
  },

  // === MYTHIC TIER ===
  BRD011: {
    gradient: 'bg-gradient-conic from-rose-400 via-purple-500 via-pink-400 via-violet-500 to-rose-400',
    glow: 'shadow-2xl shadow-rose-500/60',
    animation: 'animate-rainbow',
    tier: 'mythic',
    intricate: 'cosmic', // Cosmic star pattern
  },

  // === ACHIEVEMENT BORDERS ===
  BRD012: {
    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-500',
    glow: 'shadow-lg shadow-emerald-500/30',
    animation: '',
    tier: 'bronze',
    intricate: 'leaves', // Leaf/nature pattern
  },
  BRD013: {
    gradient: 'bg-gradient-conic from-orange-400 via-red-500 via-orange-500 via-amber-500 to-orange-400',
    glow: 'shadow-lg shadow-red-500/40',
    animation: 'animate-pulse-slow',
    tier: 'silver',
    intricate: 'flame', // Fire streak pattern
  },
  BRD014: {
    gradient: 'bg-gradient-conic from-yellow-400 via-amber-500 via-yellow-300 via-orange-400 to-yellow-400',
    glow: 'shadow-xl shadow-amber-500/50',
    animation: 'animate-shimmer-gold',
    tier: 'gold',
    intricate: 'stars', // Star burst pattern
  },
  BRD015: {
    gradient: 'bg-gradient-conic from-indigo-400 via-purple-500 via-blue-400 via-violet-500 to-indigo-400',
    glow: 'shadow-xl shadow-indigo-500/50',
    animation: 'animate-glow-pulse',
    tier: 'platinum',
    intricate: 'waves', // Wave pattern
  },

  // === SPECIAL EVENT BORDERS ===
  BRD016: {
    gradient: 'bg-gradient-conic from-red-500 via-yellow-500 via-red-600 via-orange-500 to-red-500',
    glow: 'shadow-xl shadow-red-500/50',
    animation: 'animate-shimmer-gold',
    tier: 'special',
    intricate: 'dragon', // Dragon/CNY pattern
  },
  BRD017: {
    gradient: 'bg-gradient-conic from-emerald-400 via-cyan-500 via-teal-400 via-green-400 to-emerald-400',
    glow: 'shadow-lg shadow-emerald-500/40',
    animation: 'animate-pulse-slow',
    tier: 'special',
    intricate: 'pioneer', // Early adopter badge pattern
  },
};

/**
 * Get the outer glow CSS class based on tier or custom border
 */
export function getOuterGlowClass(customBorder, tier) {
  if (customBorder) {
    switch (customBorder.tier) {
      case 'bronze':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 opacity-40';
      case 'silver':
        return 'bg-gradient-to-r from-slate-300 to-slate-400 opacity-40';
      case 'gold':
        return 'bg-gradient-to-r from-yellow-400 to-amber-500 opacity-50';
      case 'platinum':
        return 'bg-gradient-to-r from-cyan-400 to-teal-400 opacity-50';
      case 'diamond':
        return 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-60 animate-pulse';
      case 'mythic':
        return 'bg-gradient-to-r from-purple-600 via-rose-500 to-purple-600 opacity-70 animate-pulse';
      case 'special':
        return 'bg-gradient-to-r from-emerald-400 via-cyan-500 to-emerald-400 opacity-50';
      default:
        return null;
    }
  }
  // Default tier-based glow (only for high tiers without custom border)
  switch (tier) {
    case 'platinum':
      return 'bg-gradient-to-r from-cyan-400 to-teal-400 opacity-50';
    case 'diamond':
      return 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-60 animate-pulse';
    case 'mythic':
      return 'bg-gradient-to-r from-purple-600 via-rose-500 to-purple-600 opacity-70 animate-pulse';
    case 'special':
      return 'bg-gradient-to-r from-emerald-400 via-cyan-500 to-emerald-400 opacity-50';
    default:
      return null;
  }
}
