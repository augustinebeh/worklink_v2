import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles } from '../../utils/gamification';

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
    <div className="w-full" role="region" aria-label={`Experience progress: Level ${level} ${levelTitles[level]}`}>
      {showDetails && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'level-badge',
                level >= 8 ? 'level-badge-elite' :
                level >= 5 ? 'level-badge-pro' :
                'level-badge-rookie'
              )}
              aria-hidden="true"
            >
              Lv.{level}
            </span>
            <span className="text-sm text-dark-300">{levelTitles[level]}</span>
          </div>
          <div className="text-sm" aria-hidden="true">
            <span className="font-semibold text-accent-400">{xpInLevel.toLocaleString()}</span>
            <span className="text-dark-400"> / {xpNeeded.toLocaleString()} XP</span>
          </div>
        </div>
      )}

      <div
        className={clsx('xp-bar', sizes[size])}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(progress)}% progress to next level`}
      >
        <div
          className="xp-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {level < 10 && showDetails && (
        <p className="text-xs text-dark-500 mt-1.5 text-right" aria-live="polite">
          {(xpNeeded - xpInLevel).toLocaleString()} XP to {levelTitles[level + 1]}
        </p>
      )}
    </div>
  );
}

export { levelTitles, xpThresholds } from '../../utils/gamification';
