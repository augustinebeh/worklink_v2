import { clsx } from 'clsx';
import { getLevelTier } from '../../utils/gamification';

/**
 * ProfileAvatar - Avatar with level-based decorative borders
 *
 * Tiers:
 * - Bronze (1-9): Simple copper border
 * - Silver (10-19): Gradient silver border
 * - Gold (20-29): Animated gold shimmer border
 * - Platinum (30-39): Glowing cyan animated border
 * - Diamond (40-49): Multi-color animated border with glow
 * - Mythic (50): Rainbow animated border with outer glow
 */

// Border configurations for each tier
const TIER_BORDERS = {
  bronze: {
    border: 'border-4 border-amber-600',
    ring: '',
    glow: '',
    animation: '',
    badge: 'bg-amber-700 text-amber-100',
  },
  silver: {
    border: 'border-4 border-transparent bg-gradient-to-br from-slate-300 via-slate-400 to-slate-300 bg-clip-border',
    ring: 'ring-2 ring-slate-400/50',
    glow: '',
    animation: '',
    badge: 'bg-slate-500 text-white',
  },
  gold: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-yellow-400/50',
    glow: 'shadow-lg shadow-yellow-500/30',
    animation: 'animate-shimmer-gold',
    badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
  },
  platinum: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-cyan-400/50',
    glow: 'shadow-lg shadow-cyan-500/40',
    animation: 'animate-pulse-slow',
    badge: 'bg-gradient-to-r from-cyan-400 to-teal-400 text-white',
  },
  diamond: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-violet-400/60',
    glow: 'shadow-xl shadow-violet-500/50',
    animation: 'animate-border-spin',
    badge: 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white',
  },
  mythic: {
    border: 'border-4 border-transparent',
    ring: 'ring-4 ring-rose-400/60',
    glow: 'shadow-2xl shadow-rose-500/60',
    animation: 'animate-rainbow',
    badge: 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white animate-pulse',
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

  return (
    <div className={clsx('relative inline-block', className)}>
      {/* Outer glow effect for higher tiers */}
      {(tier === 'diamond' || tier === 'mythic') && (
        <div className={clsx(
          'absolute inset-0 rounded-full blur-md -z-10',
          tier === 'diamond' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-50' : '',
          tier === 'mythic' ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 opacity-60 animate-pulse' : ''
        )} />
      )}

      {/* Border container with gradient for gold+ tiers */}
      <div className={clsx(
        'relative rounded-full p-[3px]',
        config.animation,
        tier === 'gold' && 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600',
        tier === 'platinum' && 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-500',
        tier === 'diamond' && 'bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500',
        tier === 'mythic' && 'bg-gradient-to-r from-rose-400 via-pink-500 to-rose-400',
        config.glow
      )}>
        {/* Inner avatar container */}
        <div className={clsx(
          'rounded-full flex items-center justify-center font-bold overflow-hidden',
          sizeConfig.container,
          sizeConfig.text,
          tier === 'bronze' || tier === 'silver' ? config.border : 'bg-dark-900',
          config.ring,
          isCurrentUser ? 'text-white' : 'text-dark-300'
        )}>
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className={clsx(
              isCurrentUser ? 'text-primary-400' : '',
              'select-none'
            )}>
              {initial}
            </span>
          )}
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
  @keyframes shimmer-gold {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.2); }
  }

  @keyframes border-spin {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }

  @keyframes rainbow {
    0% { filter: hue-rotate(0deg) brightness(1.1); }
    50% { filter: hue-rotate(180deg) brightness(1.2); }
    100% { filter: hue-rotate(360deg) brightness(1.1); }
  }

  .animate-shimmer-gold {
    animation: shimmer-gold 2s ease-in-out infinite;
  }

  .animate-border-spin {
    animation: border-spin 3s linear infinite;
  }

  .animate-rainbow {
    animation: rainbow 4s linear infinite;
  }

  .animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
