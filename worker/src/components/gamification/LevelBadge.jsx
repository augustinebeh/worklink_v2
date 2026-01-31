import { clsx } from 'clsx';

export default function LevelBadge({ level, size = 'md', showGlow = true }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-xl',
  };

  const isElite = level >= 8;
  const isPro = level >= 5;

  const tierName = isElite ? 'Elite' : isPro ? 'Pro' : 'Rookie';

  return (
    <div
      role="img"
      aria-label={`Level ${level} ${tierName} badge`}
      className={clsx(
        'relative flex items-center justify-center rounded-full font-display font-bold',
        sizes[size],
        isElite ? 'gradient-gold text-dark-900' :
        isPro ? 'gradient-primary text-white' :
        'bg-dark-700 text-dark-300',
        showGlow && isElite && 'glow-gold animate-pulse-glow',
        showGlow && isPro && !isElite && 'glow-primary',
      )}
    >
      <span aria-hidden="true">{level}</span>

      {/* Level ring decoration */}
      <div
        className={clsx(
          'absolute inset-0 rounded-full border-2',
          isElite ? 'border-gold-300/50' :
          isPro ? 'border-primary-300/30' :
          'border-dark-600'
        )}
        aria-hidden="true"
      />

      {/* Outer glow ring for elite */}
      {isElite && (
        <div className="absolute -inset-1 rounded-full border border-gold-400/20 animate-pulse" aria-hidden="true" />
      )}
    </div>
  );
}
