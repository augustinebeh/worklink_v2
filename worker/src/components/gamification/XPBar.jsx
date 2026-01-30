import { clsx } from 'clsx';

const levelTitles = {
  1: 'Rookie',
  2: 'Starter',
  3: 'Active',
  4: 'Reliable',
  5: 'Pro',
  6: 'Expert',
  7: 'Elite',
  8: 'Master',
  9: 'Legend',
  10: 'Champion',
};

const xpThresholds = [0, 500, 1200, 2500, 5000, 8000, 12000, 18000, 25000, 35000];

export default function XPBar({ currentXP, level, showDetails = true, size = 'md' }) {
  const currentThreshold = xpThresholds[level - 1] || 0;
  const nextThreshold = xpThresholds[level] || xpThresholds[xpThresholds.length - 1];
  const xpInLevel = currentXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = level >= 10 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

  const sizes = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className="w-full">
      {showDetails && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={clsx(
              'level-badge',
              level >= 8 ? 'level-badge-elite' :
              level >= 5 ? 'level-badge-pro' :
              'level-badge-rookie'
            )}>
              Lv.{level}
            </span>
            <span className="text-sm text-dark-300">{levelTitles[level]}</span>
          </div>
          <div className="text-sm">
            <span className="font-semibold text-accent-400">{xpInLevel.toLocaleString()}</span>
            <span className="text-dark-400"> / {xpNeeded.toLocaleString()} XP</span>
          </div>
        </div>
      )}
      
      <div className={clsx('xp-bar', sizes[size])}>
        <div 
          className="xp-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {level < 10 && showDetails && (
        <p className="text-xs text-dark-500 mt-1.5 text-right">
          {(xpNeeded - xpInLevel).toLocaleString()} XP to {levelTitles[level + 1]}
        </p>
      )}
    </div>
  );
}

export { levelTitles, xpThresholds };
