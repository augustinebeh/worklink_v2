import { useState, useEffect } from 'react';
import { clsx } from 'clsx';

export default function StreakCounter({ streak, lastActiveDate }) {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    // Check if streak is still active (last active was today or yesterday)
    const last = new Date(lastActiveDate);
    const today = new Date();
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    setIsActive(diffDays <= 1);
  }, [lastActiveDate]);

  const getStreakEmoji = () => {
    if (streak >= 30) return '💎';
    if (streak >= 14) return '⚡';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return '🌱';
  };

  const getStreakMessage = () => {
    if (streak >= 30) return 'Unstoppable!';
    if (streak >= 14) return 'On Fire!';
    if (streak >= 7) return 'Week Warrior!';
    if (streak >= 3) return 'Building momentum!';
    if (streak >= 1) return 'Keep it up!';
    return 'Start your streak!';
  };

  return (
    <div className={clsx(
      'glass-card-solid p-4 relative overflow-hidden',
      streak >= 7 && 'border-gold-500/30'
    )}>
      {/* Background flame effect for high streaks */}
      {streak >= 7 && (
        <div className="absolute inset-0 bg-gradient-to-br from-gold-900/20 to-transparent" />
      )}

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Streak icon */}
          <div className={clsx(
            'h-14 w-14 rounded-2xl flex items-center justify-center text-3xl',
            streak >= 7 ? 'bg-gold-900/50' : 'bg-dark-800',
            streak >= 7 && 'animate-pulse-glow glow-gold'
          )}>
            {getStreakEmoji()}
          </div>

          {/* Streak info */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className={clsx(
                'text-3xl font-display font-bold',
                streak >= 7 ? 'text-gradient-gold' : 'text-white'
              )}>
                {streak}
              </span>
              <span className="text-dark-400 text-sm">day streak</span>
            </div>
            <p className={clsx(
              'text-sm mt-0.5',
              streak >= 7 ? 'text-gold-400' : 'text-dark-400'
            )}>
              {getStreakMessage()}
            </p>
          </div>
        </div>

        {/* Streak status indicator */}
        <div className={clsx(
          'flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
          isActive ? 'bg-accent-900/30' : 'bg-red-900/30'
        )}>
          <span className={clsx(
            'text-xs font-medium uppercase',
            isActive ? 'text-accent-400' : 'text-red-400'
          )}>
            {isActive ? 'Active' : 'At Risk!'}
          </span>
          {!isActive && (
            <span className="text-2xs text-red-400">
              Complete a job today
            </span>
          )}
        </div>
      </div>

      {/* Streak milestones */}
      <div className="relative mt-4 pt-4 border-t border-white/5">
        <div className="flex justify-between">
          {[3, 7, 14, 30].map((milestone) => (
            <div 
              key={milestone}
              className={clsx(
                'flex flex-col items-center',
                streak >= milestone ? 'text-gold-400' : 'text-dark-500'
              )}
            >
              <span className="text-lg">
                {streak >= milestone ? '🌟' : '○'}
              </span>
              <span className="text-2xs mt-1">{milestone}d</span>
            </div>
          ))}
        </div>
        {/* Progress line */}
        <div className="absolute top-[calc(1rem+12px)] left-6 right-6 h-0.5 bg-dark-700">
          <div 
            className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min((streak / 30) * 100, 100)}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}
