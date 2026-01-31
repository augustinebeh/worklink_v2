import { clsx } from 'clsx';

const rarityColors = {
  common: {
    bg: 'bg-dark-700',
    border: 'border-dark-600',
    text: 'text-dark-300',
    glow: '',
  },
  rare: {
    bg: 'bg-secondary-900/30',
    border: 'border-secondary-500/30',
    text: 'text-secondary-400',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.3)]',
  },
  epic: {
    bg: 'bg-primary-900/30',
    border: 'border-primary-500/30',
    text: 'text-primary-400',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
  },
  legendary: {
    bg: 'bg-gold-900/30',
    border: 'border-gold-500/30',
    text: 'text-gold-400',
    glow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
  },
};

export default function AchievementCard({ 
  achievement, 
  unlocked = false, 
  progress = 0,
  onClick,
  size = 'md',
}) {
  const { name, description, icon, rarity = 'common', xpReward } = achievement;
  const colors = rarityColors[rarity];

  const sizes = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const iconSizes = {
    sm: 'text-3xl',
    md: 'text-4xl',
    lg: 'text-5xl',
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`${name} achievement${unlocked ? ' - unlocked' : ` - ${progress}% complete`}. ${description}`}
      className={clsx(
        'rounded-2xl border transition-all duration-200',
        sizes[size],
        unlocked ? [
          colors.bg,
          colors.border,
          colors.glow,
        ] : [
          'bg-dark-800/30',
          'border-dark-700/50',
          'opacity-50',
        ],
        onClick && 'cursor-pointer active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500/50',
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={clsx(
          'flex-shrink-0 relative',
          iconSizes[size],
          !unlocked && 'grayscale',
        )}>
          {icon}
          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={clsx(
              'font-semibold truncate',
              unlocked ? 'text-white' : 'text-dark-400'
            )}>
              {name}
            </h4>
            <span className={clsx(
              'text-2xs font-medium px-1.5 py-0.5 rounded uppercase',
              colors.bg,
              colors.text,
            )}>
              {rarity}
            </span>
          </div>
          
          <p className="text-sm text-dark-400 mt-1 line-clamp-2">
            {description}
          </p>

          {/* Progress bar for locked achievements */}
          {!unlocked && progress > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-dark-500 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-xs text-dark-500 mt-1">{progress}% complete</p>
            </div>
          )}

          {/* XP Reward */}
          <div className={clsx(
            'mt-2 inline-flex items-center gap-1 text-sm font-medium',
            unlocked ? 'text-accent-400' : 'text-dark-500'
          )}>
            <span>+{xpReward} XP</span>
            {unlocked && <span>✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
