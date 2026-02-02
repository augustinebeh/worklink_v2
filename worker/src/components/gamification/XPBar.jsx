import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { ZapIcon } from 'lucide-react';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles } from '../../../../shared/utils/gamification-esm';

/**
 * Shared XP Bar Component
 * Used on: Home, Profile, Quests pages
 *
 * @param {number} currentXP - User's total XP
 * @param {number} level - User's current level
 * @param {boolean} showDetails - Show header with level badge and progress text (default: true)
 * @param {boolean} showFooter - Show "X XP to next level" text (default: true)
 * @param {string} size - Bar height: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} animating - Whether the bar is currently animating (glow effect)
 * @param {boolean} compact - Compact mode (just the bar, no text)
 */
const XPBar = forwardRef(function XPBar({
  currentXP = 0,
  level = 1,
  showDetails = true,
  showFooter = true,
  size = 'md',
  animating = false,
  compact = false,
}, ref) {
  const maxLevel = xpThresholds.length;
  const currentThreshold = xpThresholds[level - 1] || 0;
  const nextThreshold = xpThresholds[level] || xpThresholds[maxLevel - 1];
  const xpInLevel = Math.max(0, currentXP - currentThreshold);
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const progress = level >= maxLevel ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);
  const xpToNext = xpNeeded - xpInLevel;
  const nextTitle = levelTitles[level + 1] || 'Max Level';

  if (compact) {
    return (
      <div className="xp-bar-shared xp-bar-compact">
        <div ref={ref} className={clsx('xp-bar-track', size, animating && 'animating')}>
          <div
            className={clsx('xp-bar-fill-shared', animating && 'animating')}
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="xp-bar-shared">
      {showDetails && (
        <div className="xp-bar-header">
          <span className="xp-bar-title">Level Progress</span>
          <span className={clsx(
            'xp-bar-progress-text transition-all duration-300',
            animating && 'scale-110'
          )}>
            <span className={clsx(
              'xp-bar-progress-current transition-all duration-500',
              animating && 'text-emerald-300'
            )}>
              {xpInLevel.toLocaleString()}
            </span>
            <span className="xp-bar-progress-total"> / {xpNeeded.toLocaleString()} XP</span>
          </span>
        </div>
      )}

      {/* The ref is on the track bar itself for precise flying XP targeting */}
      <div ref={ref} className={clsx('xp-bar-track', size, animating && 'animating')}>
        <div
          className={clsx('xp-bar-fill-shared', animating && 'animating')}
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {showFooter && level < maxLevel && (
        <p className="xp-bar-footer">
          {xpToNext.toLocaleString()} XP to {nextTitle}
        </p>
      )}
    </div>
  );
});

export default XPBar;

// Alternative: XP Bar with level badge (for Profile page style)
export function XPBarWithBadge({
  currentXP = 0,
  level = 1,
  size = 'md',
  animating = false,
}) {
  const maxLevel = xpThresholds.length;
  const currentThreshold = xpThresholds[level - 1] || 0;
  const nextThreshold = xpThresholds[level] || xpThresholds[maxLevel - 1];
  const xpInLevel = Math.max(0, currentXP - currentThreshold);
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const progress = level >= maxLevel ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);
  const xpToNext = xpNeeded - xpInLevel;
  const nextTitle = levelTitles[level + 1] || 'Max Level';
  const currentTitle = levelTitles[level] || 'Newcomer';

  return (
    <div className="xp-bar-shared">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30">
          <ZapIcon className="h-4 w-4 text-violet-400" />
          <span className="text-violet-400 font-bold">Level {level}</span>
        </div>
        <span className="text-emerald-400 text-sm font-medium">{currentTitle}</span>
      </div>

      <div className="xp-bar-header">
        <span className="xp-bar-title">Level Progress</span>
        <span className="xp-bar-progress-text">
          <span className="xp-bar-progress-current">{xpInLevel.toLocaleString()}</span>
          <span className="xp-bar-progress-total"> / {xpNeeded.toLocaleString()} XP</span>
        </span>
      </div>

      <div className={clsx('xp-bar-track', size, animating && 'animating')}>
        <div
          className={clsx('xp-bar-fill-shared', animating && 'animating')}
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>

      {level < maxLevel && (
        <p className="xp-bar-footer">
          {xpToNext.toLocaleString()} XP to {nextTitle}
        </p>
      )}
    </div>
  );
}

// Re-export utilities for convenience
export { LEVEL_TITLES, XP_THRESHOLDS } from '../../../../shared/utils/gamification-esm';
