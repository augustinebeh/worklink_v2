import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { getLevelTier } from '../../../../shared/utils/gamification-browser';

/**
 * ProfileAvatar - Avatar with intricate decorative borders
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
const TIER_BORDERS = {
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
const CUSTOM_BORDERS = {
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

// Intricate pattern SVG components
function IntricatePattern({ type, size }) {
  const baseSize = size === 'sm' ? 44 : size === 'md' ? 52 : size === 'lg' ? 68 : size === 'xl' ? 84 : 100;

  switch (type) {
    case 'flame':
      return (
        <svg className="absolute inset-0 w-full h-full animate-pulse-slow" viewBox="0 0 100 100">
          <defs>
            <filter id="glow-flame">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <path
              key={i}
              d={`M50,50 L${50 + 40 * Math.cos(angle * Math.PI / 180)},${50 + 40 * Math.sin(angle * Math.PI / 180)}`}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-orange-400/60"
              filter="url(#glow-flame)"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </svg>
      );

    case 'celtic':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300/40" strokeDasharray="4 4" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-400/30" strokeDasharray="2 6" />
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <circle
              key={i}
              cx={50 + 38 * Math.cos(angle * Math.PI / 180)}
              cy={50 + 38 * Math.sin(angle * Math.PI / 180)}
              r="3"
              className="fill-slate-300/50"
            />
          ))}
        </svg>
      );

    case 'crown':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <g key={i}>
              <polygon
                points={`${50 + 44 * Math.cos((angle - 10) * Math.PI / 180)},${50 + 44 * Math.sin((angle - 10) * Math.PI / 180)} ${50 + 48 * Math.cos(angle * Math.PI / 180)},${50 + 48 * Math.sin(angle * Math.PI / 180)} ${50 + 44 * Math.cos((angle + 10) * Math.PI / 180)},${50 + 44 * Math.sin((angle + 10) * Math.PI / 180)}`}
                className="fill-yellow-300/70"
              />
              <circle
                cx={50 + 46 * Math.cos(angle * Math.PI / 180)}
                cy={50 + 46 * Math.sin(angle * Math.PI / 180)}
                r="2"
                className="fill-amber-200 animate-pulse"
              />
            </g>
          ))}
        </svg>
      );

    case 'circuit':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-400/30" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i}>
              <line
                x1={50 + 35 * Math.cos(angle * Math.PI / 180)}
                y1={50 + 35 * Math.sin(angle * Math.PI / 180)}
                x2={50 + 45 * Math.cos(angle * Math.PI / 180)}
                y2={50 + 45 * Math.sin(angle * Math.PI / 180)}
                stroke="currentColor"
                strokeWidth="2"
                className="text-cyan-300/60"
              />
              <rect
                x={50 + 44 * Math.cos(angle * Math.PI / 180) - 2}
                y={50 + 44 * Math.sin(angle * Math.PI / 180) - 2}
                width="4"
                height="4"
                className="fill-teal-300/80"
              />
            </g>
          ))}
        </svg>
      );

    case 'prism':
      return (
        <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 100 100" style={{ animationDuration: '20s' }}>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
            <polygon
              key={i}
              points={`50,50 ${50 + 42 * Math.cos((angle - 15) * Math.PI / 180)},${50 + 42 * Math.sin((angle - 15) * Math.PI / 180)} ${50 + 48 * Math.cos(angle * Math.PI / 180)},${50 + 48 * Math.sin(angle * Math.PI / 180)} ${50 + 42 * Math.cos((angle + 15) * Math.PI / 180)},${50 + 42 * Math.sin((angle + 15) * Math.PI / 180)}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className={i % 2 === 0 ? 'text-violet-300/50' : 'text-fuchsia-300/50'}
            />
          ))}
        </svg>
      );

    case 'cosmic':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Orbiting particles */}
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-rose-300/30 animate-spin-slow" style={{ animationDuration: '10s' }} />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-300/30 animate-spin-slow" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
          {/* Stars */}
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <g key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
              <polygon
                points={`${50 + 46 * Math.cos(angle * Math.PI / 180)},${50 + 46 * Math.sin(angle * Math.PI / 180) - 3} ${50 + 46 * Math.cos(angle * Math.PI / 180) + 1},${50 + 46 * Math.sin(angle * Math.PI / 180)} ${50 + 46 * Math.cos(angle * Math.PI / 180)},${50 + 46 * Math.sin(angle * Math.PI / 180) + 3} ${50 + 46 * Math.cos(angle * Math.PI / 180) - 1},${50 + 46 * Math.sin(angle * Math.PI / 180)}`}
                className="fill-rose-200"
              />
            </g>
          ))}
        </svg>
      );

    case 'leaves':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <ellipse
              key={i}
              cx={50 + 42 * Math.cos(angle * Math.PI / 180)}
              cy={50 + 42 * Math.sin(angle * Math.PI / 180)}
              rx="6"
              ry="3"
              transform={`rotate(${angle + 45}, ${50 + 42 * Math.cos(angle * Math.PI / 180)}, ${50 + 42 * Math.sin(angle * Math.PI / 180)})`}
              className="fill-emerald-400/50"
            />
          ))}
        </svg>
      );

    case 'stars':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
              <circle
                cx={50 + 44 * Math.cos(angle * Math.PI / 180)}
                cy={50 + 44 * Math.sin(angle * Math.PI / 180)}
                r={i % 2 === 0 ? 2 : 1.5}
                className="fill-yellow-200"
              />
            </g>
          ))}
        </svg>
      );

    case 'waves':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-indigo-300/40" strokeDasharray="8 4" />
          <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-300/30" strokeDasharray="4 8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-300/20" strokeDasharray="2 10" />
        </svg>
      );

    case 'dragon':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Dragon scales pattern */}
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle, i) => (
            <path
              key={i}
              d={`M${50 + 38 * Math.cos(angle * Math.PI / 180)},${50 + 38 * Math.sin(angle * Math.PI / 180)} Q${50 + 44 * Math.cos((angle + 18) * Math.PI / 180)},${50 + 44 * Math.sin((angle + 18) * Math.PI / 180)} ${50 + 38 * Math.cos((angle + 36) * Math.PI / 180)},${50 + 38 * Math.sin((angle + 36) * Math.PI / 180)}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={i % 2 === 0 ? 'text-red-400/60' : 'text-yellow-400/60'}
            />
          ))}
        </svg>
      );

    case 'pioneer':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400/40" strokeDasharray="1 3" />
          {/* Compass points */}
          {[0, 90, 180, 270].map((angle, i) => (
            <polygon
              key={i}
              points={`${50 + 40 * Math.cos(angle * Math.PI / 180)},${50 + 40 * Math.sin(angle * Math.PI / 180)} ${50 + 48 * Math.cos((angle - 5) * Math.PI / 180)},${50 + 48 * Math.sin((angle - 5) * Math.PI / 180)} ${50 + 48 * Math.cos((angle + 5) * Math.PI / 180)},${50 + 48 * Math.sin((angle + 5) * Math.PI / 180)}`}
              className="fill-cyan-400/60"
            />
          ))}
        </svg>
      );

    default:
      return null;
  }
}

export default function ProfileAvatar({
  name,
  photoUrl,
  level = 1,
  size = 'md',
  showLevel = true,
  isCurrentUser = false,
  className = '',
  selectedBorderId = null,
}) {
  const customBorder = selectedBorderId ? CUSTOM_BORDERS[selectedBorderId] : null;
  const tier = customBorder ? customBorder.tier : getLevelTier(level);
  const config = TIER_BORDERS[tier] || TIER_BORDERS.bronze;

  const finalConfig = customBorder ? {
    ...config,
    gradient: customBorder.gradient,
    glow: customBorder.glow,
    animation: customBorder.animation,
    intricate: customBorder.intricate,
  } : config;

  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [photoUrl]);

  const sizes = {
    sm: { container: 'w-10 h-10', text: 'text-sm', badge: 'text-[8px] px-1', badgeOffset: '-bottom-1', padding: 'p-[2px]' },
    md: { container: 'w-12 h-12', text: 'text-lg', badge: 'text-[10px] px-1.5', badgeOffset: '-bottom-1', padding: 'p-[3px]' },
    lg: { container: 'w-16 h-16', text: 'text-xl', badge: 'text-xs px-2', badgeOffset: '-bottom-1.5', padding: 'p-[3px]' },
    xl: { container: 'w-20 h-20', text: 'text-2xl', badge: 'text-xs px-2 py-0.5', badgeOffset: '-bottom-2', padding: 'p-[4px]' },
    '2xl': { container: 'w-24 h-24', text: 'text-3xl', badge: 'text-sm px-2.5 py-0.5', badgeOffset: '-bottom-2', padding: 'p-[4px]' },
  };

  const sizeConfig = sizes[size] || sizes.md;
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  // Determine outer glow color based on tier or custom border
  const getOuterGlowClass = () => {
    if (customBorder) {
      // Custom borders get glow based on their tier
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
  };

  const outerGlowClass = getOuterGlowClass();
  const hasOuterGlow = !!outerGlowClass || !!finalConfig.glow;

  return (
    <div className={clsx('relative inline-block', className)}>
      {/* Outer glow effect - separate layer behind avatar */}
      {hasOuterGlow && (
        <div
          className={clsx(
            'absolute inset-[-4px] rounded-full blur-md -z-10',
            outerGlowClass
          )}
          style={!outerGlowClass && finalConfig.glow ? {
            background: 'currentColor',
            opacity: 0.4,
          } : undefined}
        />
      )}

      {/* Border container with gradient - NO shadow/glow here */}
      <div className={clsx(
        'relative rounded-full',
        sizeConfig.padding,
        finalConfig.animation,
        finalConfig.gradient
      )}>
        {/* Intricate pattern overlay */}
        {finalConfig.intricate && (
          <IntricatePattern type={finalConfig.intricate} size={size} />
        )}

        {/* Inner avatar container */}
        <div className={clsx(
          'relative rounded-full flex items-center justify-center font-bold overflow-hidden',
          sizeConfig.container,
          sizeConfig.text,
          tier === 'bronze' && !customBorder ? finalConfig.border : 'bg-dark-900',
          finalConfig.ring,
          isCurrentUser ? 'text-white' : 'text-dark-300'
        )}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
              style={{ display: imageLoaded ? 'block' : 'none' }}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
          ) : null}
          <span
            className={clsx(isCurrentUser ? 'text-primary-400' : '', 'select-none')}
            style={{ display: imageLoaded ? 'none' : 'flex' }}
          >
            {initial}
          </span>
        </div>
      </div>

      {/* Level badge */}
      {showLevel && (
        <div className={clsx(
          'absolute left-1/2 -translate-x-1/2 rounded-full font-bold whitespace-nowrap z-10',
          sizeConfig.badge,
          sizeConfig.badgeOffset,
          finalConfig.badge
        )}>
          Lv.{level}
        </div>
      )}
    </div>
  );
}
