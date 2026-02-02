import { clsx } from 'clsx';
import { getLevelTier } from '../../utils/gamification';

/**
 * ProfileAvatar - Avatar with level-based decorative borders
 *
 * Tiers (every 5 levels for quicker progression):
 * - Bronze (1-4): Simple copper border
 * - Bronze Elite (5-9): Copper border with subtle glow
 * - Silver (10-14): Gradient silver border
 * - Silver Elite (15-19): Silver with shimmer effect
 * - Gold (20-24): Animated gold shimmer border
 * - Gold Elite (25-29): Gold with intense glow
 * - Platinum (30-34): Glowing cyan animated border
 * - Platinum Elite (35-39): Platinum with pulse effect
 * - Diamond (40-44): Multi-color animated border with glow
 * - Diamond Elite (45-49): Diamond with rainbow shimmer
 * - Mythic (50): Full rainbow animated border with outer glow
 */

// Border configurations for each tier
const TIER_BORDERS = {
  bronze: {
    border: 'border-4 border-amber-600',
    ring: '',
    glow: '',
    animation: '',
    badge: 'bg-amber-700 text-amber-100',
    gradient: '',
  },
  bronzeElite: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-orange-400/40',
    glow: 'shadow-md shadow-orange-500/30',
    animation: '',
    badge: 'bg-gradient-to-r from-amber-600 to-orange-500 text-white',
    gradient: 'bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600',
  },
  silver: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-slate-400/50',
    glow: '',
    animation: '',
    badge: 'bg-slate-500 text-white',
    gradient: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-300',
  },
  silverElite: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-zinc-300/60',
    glow: 'shadow-md shadow-zinc-400/40',
    animation: 'animate-shimmer-silver',
    badge: 'bg-gradient-to-r from-slate-400 to-zinc-300 text-slate-800',
    gradient: 'bg-gradient-to-br from-zinc-200 via-slate-300 to-zinc-400',
  },
  gold: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-yellow-400/50',
    glow: 'shadow-lg shadow-yellow-500/30',
    animation: 'animate-shimmer-gold',
    badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white',
    gradient: 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600',
  },
  goldElite: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-yellow-300/60',
    glow: 'shadow-xl shadow-yellow-400/50',
    animation: 'animate-shimmer-gold-intense',
    badge: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-900',
    gradient: 'bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-500',
  },
  platinum: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-cyan-400/50',
    glow: 'shadow-lg shadow-cyan-500/40',
    animation: 'animate-pulse-slow',
    badge: 'bg-gradient-to-r from-cyan-400 to-teal-400 text-white',
    gradient: 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-teal-500',
  },
  platinumElite: {
    border: 'border-4 border-transparent',
    ring: 'ring-3 ring-teal-300/60',
    glow: 'shadow-xl shadow-teal-400/50',
    animation: 'animate-glow-pulse',
    badge: 'bg-gradient-to-r from-cyan-300 via-teal-400 to-emerald-400 text-white',
    gradient: 'bg-gradient-to-br from-cyan-200 via-teal-400 to-emerald-500',
  },
  diamond: {
    border: 'border-4 border-transparent',
    ring: 'ring-2 ring-violet-400/60',
    glow: 'shadow-xl shadow-violet-500/50',
    animation: 'animate-border-spin',
    badge: 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white',
    gradient: 'bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500',
  },
  diamondElite: {
    border: 'border-4 border-transparent',
    ring: 'ring-3 ring-purple-300/70',
    glow: 'shadow-2xl shadow-purple-500/60',
    animation: 'animate-border-spin-fast',
    badge: 'bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 text-white animate-pulse',
    gradient: 'bg-gradient-to-r from-violet-300 via-fuchsia-400 to-pink-500',
  },
  mythic: {
    border: 'border-4 border-transparent',
    ring: 'ring-4 ring-rose-400/60',
    glow: 'shadow-2xl shadow-rose-500/60',
    animation: 'animate-rainbow',
    badge: 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 text-white animate-pulse',
    gradient: 'bg-gradient-to-r from-rose-400 via-pink-500 to-rose-400',
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
      {['diamond', 'diamondElite', 'mythic', 'platinumElite'].includes(tier) && (
        <div className={clsx(
          'absolute inset-0 rounded-full blur-md -z-10',
          tier === 'diamond' && 'bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-50',
          tier === 'diamondElite' && 'bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 opacity-60 animate-pulse',
          tier === 'platinumElite' && 'bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-40',
          tier === 'mythic' && 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500 opacity-70 animate-pulse'
        )} />
      )}

      {/* Border container with gradient for bronze elite+ tiers */}
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
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className={clsx(isCurrentUser ? 'text-primary-400' : '', 'select-none')}
            style={{ display: photoUrl ? 'none' : 'flex' }}
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
    50% { filter: brightness(1.15); }
  }

  @keyframes shimmer-gold {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.2); }
  }

  @keyframes shimmer-gold-intense {
    0%, 100% { filter: brightness(1) saturate(1); }
    50% { filter: brightness(1.3) saturate(1.2); }
  }

  @keyframes glow-pulse {
    0%, 100% { filter: brightness(1) drop-shadow(0 0 4px currentColor); }
    50% { filter: brightness(1.15) drop-shadow(0 0 8px currentColor); }
  }

  @keyframes border-spin {
    0% { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }

  @keyframes border-spin-fast {
    0% { filter: hue-rotate(0deg) brightness(1.1); }
    100% { filter: hue-rotate(360deg) brightness(1.1); }
  }

  @keyframes rainbow {
    0% { filter: hue-rotate(0deg) brightness(1.1); }
    50% { filter: hue-rotate(180deg) brightness(1.3); }
    100% { filter: hue-rotate(360deg) brightness(1.1); }
  }

  .animate-shimmer-silver {
    animation: shimmer-silver 2.5s ease-in-out infinite;
  }

  .animate-shimmer-gold {
    animation: shimmer-gold 2s ease-in-out infinite;
  }

  .animate-shimmer-gold-intense {
    animation: shimmer-gold-intense 1.5s ease-in-out infinite;
  }

  .animate-glow-pulse {
    animation: glow-pulse 2s ease-in-out infinite;
  }

  .animate-border-spin {
    animation: border-spin 3s linear infinite;
  }

  .animate-border-spin-fast {
    animation: border-spin-fast 2s linear infinite;
  }

  .animate-rainbow {
    animation: rainbow 3s linear infinite;
  }

  .animate-pulse-slow {
    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
