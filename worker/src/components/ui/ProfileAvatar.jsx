import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { getLevelTier } from '../../utils/gamification';

/**
 * ProfileAvatar - Avatar with level-based decorative borders
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
    description: 'Simple, matte bronze ring',
  },
  silver: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-slate-300/60',
    glow: 'shadow-md shadow-slate-400/40',
    animation: 'animate-shimmer-silver',
    badge: 'bg-gradient-to-r from-slate-400 to-slate-300 text-slate-800',
    gradient: 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-300',
    description: 'Metallic silver + shine effect',
  },
  gold: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-yellow-400/60',
    glow: 'shadow-lg shadow-yellow-500/40',
    animation: 'animate-shimmer-gold',
    badge: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-900',
    gradient: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-500',
    description: 'Gold + sparkle particle effect',
  },
  platinum: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-cyan-400/60',
    glow: 'shadow-xl shadow-cyan-500/50',
    animation: 'animate-glow-pulse',
    badge: 'bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-300 text-white',
    gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-400',
    description: 'Glowing blue/white neon pulse',
  },
  diamond: {
    border: 'border-4 border-transparent',
    ring: 'ring-3 ring-violet-400/70',
    glow: 'shadow-2xl shadow-violet-500/60',
    animation: 'animate-border-spin',
    badge: 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white',
    gradient: 'bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500',
    description: 'Prismatic refraction animation',
  },
  mythic: {
    border: 'border-4 border-transparent',
    ring: 'ring-4 ring-rose-500/70',
    glow: 'shadow-2xl shadow-rose-600/70',
    animation: 'animate-rainbow',
    badge: 'bg-gradient-to-r from-purple-600 via-rose-500 to-purple-600 text-white animate-pulse',
    gradient: 'bg-gradient-to-r from-purple-500 via-rose-500 to-purple-600',
    description: 'Dark matter/purple flame effect',
  },
};

export default function ProfileAvatar({
  name,
  photoUrl,
  level = 1,
  size = 'md',
  showLevel = true,
  isCurrentUser = false,
  className = '',
}) {
  const tier = getLevelTier(level);
  const config = TIER_BORDERS[tier] || TIER_BORDERS.bronze;
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset imageLoaded when photoUrl changes
  useEffect(() => {
    setImageLoaded(false);
  }, [photoUrl]);

  // Size configurations
  const sizes = {
    sm: { container: 'w-10 h-10', text: 'text-sm', badge: 'text-[8px] px-1', badgeOffset: '-bottom-1' },
    md: { container: 'w-12 h-12', text: 'text-lg', badge: 'text-[10px] px-1.5', badgeOffset: '-bottom-1' },
    lg: { container: 'w-16 h-16', text: 'text-xl', badge: 'text-xs px-2', badgeOffset: '-bottom-1.5' },
    xl: { container: 'w-20 h-20', text: 'text-2xl', badge: 'text-xs px-2 py-0.5', badgeOffset: '-bottom-2' },
    '2xl': { container: 'w-24 h-24', text: 'text-3xl', badge: 'text-sm px-2.5 py-0.5', badgeOffset: '-bottom-2' },
  };

  const sizeConfig = sizes[size] || sizes.md;
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  // High-tier outer glow effects
  const hasOuterGlow = ['platinum', 'diamond', 'mythic'].includes(tier);

  return (
    <div className={clsx('relative inline-block', className)}>
      {/* Outer glow effect for high tiers */}
      {hasOuterGlow && (
        <div className={clsx(
          'absolute inset-0 rounded-full blur-md -z-10',
          tier === 'platinum' && 'bg-gradient-to-r from-cyan-400 to-teal-400 opacity-50',
          tier === 'diamond' && 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 opacity-60 animate-pulse',
          tier === 'mythic' && 'bg-gradient-to-r from-purple-600 via-rose-500 to-purple-600 opacity-70 animate-pulse'
        )} />
      )}

      {/* Border container with gradient for silver+ tiers */}
      <div className={clsx(
        'relative rounded-full p-[3px]',
        config.animation,
        config.gradient,
        config.glow
      )}>
        {/* Inner avatar container */}
        <div className={clsx(
          'rounded-full flex items-center justify-center font-bold overflow-hidden',
          sizeConfig.container,
          sizeConfig.text,
          tier === 'bronze' ? config.border : 'bg-dark-900',
          config.ring,
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
          config.badge
        )}>
          Lv.{level}
        </div>
      )}
    </div>
  );
}

// CSS animations to add to your global styles or tailwind config
export const profileAvatarStyles = `
  @keyframes shimmer-silver {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.2); }
  }

  @keyframes shimmer-gold {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.3) saturate(1.1); }
  }

  @keyframes glow-pulse {
    0%, 100% {
      filter: brightness(1) drop-shadow(0 0 4px currentColor);
      transform: scale(1);
    }
    50% {
      filter: brightness(1.2) drop-shadow(0 0 12px currentColor);
      transform: scale(1.02);
    }
  }

  @keyframes border-spin {
    0% { filter: hue-rotate(0deg) brightness(1.1); }
    100% { filter: hue-rotate(360deg) brightness(1.1); }
  }

  @keyframes rainbow {
    0% { filter: hue-rotate(0deg) brightness(1.15); }
    50% { filter: hue-rotate(180deg) brightness(1.3); }
    100% { filter: hue-rotate(360deg) brightness(1.15); }
  }

  .animate-shimmer-silver {
    animation: shimmer-silver 2.5s ease-in-out infinite;
  }

  .animate-shimmer-gold {
    animation: shimmer-gold 2s ease-in-out infinite;
  }

  .animate-glow-pulse {
    animation: glow-pulse 2.5s ease-in-out infinite;
  }

  .animate-border-spin {
    animation: border-spin 4s linear infinite;
  }

  .animate-rainbow {
    animation: rainbow 3s linear infinite;
  }

  .animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
