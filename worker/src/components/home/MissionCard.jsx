import { clsx } from 'clsx';
import {
  TargetIcon,
  GiftIcon,
  CheckCircleIcon,
  ZapIcon,
  ChevronRightIcon,
  PlayIcon,
  SparklesIcon,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function MissionCard({ quest, onNavigate, onClaim }) {
  const { isDark } = useTheme();

  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
  const isClaimable = quest.status === 'claimable';
  const isClaimed = quest.status === 'claimed';
  const isInProgress = quest.status === 'in_progress';
  const isAvailable = quest.status === 'available';

  // Icon based on status
  const StatusIcon = isClaimed
    ? CheckCircleIcon
    : isClaimable
    ? GiftIcon
    : TargetIcon;

  // Status-based styling
  const statusStyles = {
    available: {
      iconBg: isDark ? 'bg-primary-500/20' : 'bg-primary-50',
      iconColor: 'text-primary-400',
      iconBorder: isDark ? 'border-primary-500/30' : 'border-primary-200',
    },
    in_progress: {
      iconBg: isDark ? 'bg-violet-500/20' : 'bg-violet-50',
      iconColor: 'text-violet-400',
      iconBorder: isDark ? 'border-violet-500/30' : 'border-violet-200',
    },
    claimable: {
      iconBg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-50',
      iconColor: 'text-emerald-400',
      iconBorder: isDark ? 'border-emerald-500/30' : 'border-emerald-200',
    },
    claimed: {
      iconBg: isDark ? 'bg-dark-700' : 'bg-slate-100',
      iconColor: isDark ? 'text-dark-500' : 'text-slate-400',
      iconBorder: isDark ? 'border-dark-600' : 'border-slate-200',
    },
  };

  const styles = statusStyles[quest.status] || statusStyles.available;

  return (
    <div
      className={clsx(
        'quest-card-glow',
        isClaimable && 'quest-card-claimable',
        isClaimed && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Glowing Icon Container */}
        <div className="relative flex-shrink-0">
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center border',
            styles.iconBg,
            styles.iconBorder
          )}>
            <StatusIcon className={clsx('h-6 w-6', styles.iconColor)} />
          </div>
          {/* Glow effect for claimable */}
          {isClaimable && isDark && (
            <div className="absolute inset-0 rounded-xl bg-emerald-500/30 blur-lg -z-10 animate-pulse" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className={clsx(
            'font-semibold text-sm',
            isClaimed
              ? (isDark ? 'text-dark-500 line-through' : 'text-slate-400 line-through')
              : (isDark ? 'text-white' : 'text-slate-900')
          )}>
            {quest.title}
          </h3>

          {/* Progress Bar (if multi-step quest) */}
          {!isClaimed && quest.target > 1 && (
            <div className="mt-2">
              <div className={clsx(
                'h-2 rounded-full overflow-hidden',
                isDark ? 'bg-dark-700' : 'bg-slate-200'
              )}>
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    isClaimable
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-violet-500 via-primary-500 to-cyan-400'
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className={clsx(
                'text-xs mt-1',
                isDark ? 'text-dark-400' : 'text-slate-500'
              )}>
                {quest.progress} / {quest.target} completed
              </p>
            </div>
          )}

          {/* Status Text */}
          {isClaimable && (
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <SparklesIcon className="h-3 w-3" />
              Ready to claim!
            </p>
          )}
        </div>

        {/* Right Side: XP Reward + Action */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Large XP Display */}
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl',
            isClaimed
              ? (isDark ? 'bg-dark-700' : 'bg-slate-100')
              : isClaimable
                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 border border-emerald-500/30'
                : 'bg-gradient-to-r from-violet-500/20 to-primary-500/20 border border-violet-500/30'
          )}>
            <ZapIcon className={clsx(
              'h-4 w-4',
              isClaimed ? (isDark ? 'text-dark-500' : 'text-slate-400') : 'text-amber-400'
            )} />
            <span className={clsx(
              'text-lg font-bold',
              isClaimed
                ? (isDark ? 'text-dark-500' : 'text-slate-400')
                : isClaimable
                  ? 'text-emerald-400'
                  : 'text-violet-400'
            )}>
              +{quest.xp_reward}
            </span>
          </div>

          {/* Action Button */}
          {!isClaimed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isClaimable && onClaim) {
                  onClaim(quest);
                } else if (onNavigate) {
                  onNavigate();
                }
              }}
              className={clsx(
                'text-xs font-semibold transition-all duration-200',
                isClaimable
                  ? 'btn-neon-claim px-4 py-1.5'
                  : isAvailable
                    ? 'btn-neon-gradient px-4 py-1.5'
                    : 'px-3 py-1 rounded-lg bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              {isClaimable ? (
                <span className="flex items-center gap-1">
                  <GiftIcon className="h-3.5 w-3.5" />
                  Claim
                </span>
              ) : isAvailable ? (
                <span className="flex items-center gap-1">
                  <PlayIcon className="h-3.5 w-3.5" />
                  Start
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  View
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for limited space
export function MissionCardCompact({ quest, onNavigate }) {
  const { isDark } = useTheme();

  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
  const isClaimable = quest.status === 'claimable';
  const isClaimed = quest.status === 'claimed';

  return (
    <button
      onClick={onNavigate}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98]',
        'backdrop-blur-sm border',
        isClaimed
          ? (isDark ? 'bg-dark-800/30 border-white/5 opacity-50' : 'bg-slate-50 border-slate-100 opacity-50')
          : isClaimable
            ? (isDark
                ? 'bg-emerald-500/10 border-emerald-500/30 animate-card-pulse'
                : 'bg-emerald-50 border-emerald-200')
            : (isDark
                ? 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
                : 'bg-white border-slate-200 hover:border-slate-300')
      )}
    >
      {/* Icon */}
      <div className={clsx(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        isClaimed
          ? (isDark ? 'bg-dark-700' : 'bg-slate-100')
          : isClaimable
            ? 'bg-emerald-500/20'
            : 'bg-primary-500/20'
      )}>
        {isClaimed ? (
          <CheckCircleIcon className={isDark ? 'h-5 w-5 text-dark-500' : 'h-5 w-5 text-slate-400'} />
        ) : isClaimable ? (
          <GiftIcon className="h-5 w-5 text-emerald-400" />
        ) : (
          <TargetIcon className="h-5 w-5 text-primary-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={clsx(
          'font-medium truncate text-sm',
          isClaimed
            ? (isDark ? 'text-dark-500 line-through' : 'text-slate-400 line-through')
            : (isDark ? 'text-white' : 'text-slate-900')
        )}>
          {quest.title}
        </p>
        {!isClaimed && quest.target > 1 && (
          <div className="flex items-center gap-2 mt-1">
            <div className={clsx(
              'flex-1 h-1.5 rounded-full overflow-hidden',
              isDark ? 'bg-dark-700' : 'bg-slate-200'
            )}>
              <div
                className={clsx(
                  'h-full rounded-full',
                  isClaimable
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-violet-500 to-primary-500'
                )}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>
              {quest.progress}/{quest.target}
            </span>
          </div>
        )}
        {isClaimable && (
          <p className="text-xs text-emerald-400 mt-0.5">Ready to claim!</p>
        )}
      </div>

      {/* XP Reward */}
      <div className={clsx(
        'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold',
        isClaimed
          ? (isDark ? 'bg-dark-700 text-dark-500' : 'bg-slate-100 text-slate-400')
          : isClaimable
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-primary-500/20 text-primary-400'
      )}>
        <ZapIcon className="h-3 w-3" />
        <span>+{quest.xp_reward}</span>
      </div>
    </button>
  );
}
