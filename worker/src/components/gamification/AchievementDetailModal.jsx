import {
  ZapIcon,
  LockIcon,
  CheckCircleIcon,
  SparklesIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ICON_MAP } from './achievement-constants';

// Featured achievement card for newcomers (Getting Started section)
export default function FeaturedAchievementCard({ achievement, unlocked, claimed, onClaim, claiming }) {
  const isClaimable = unlocked && !claimed;
  const IconComponent = ICON_MAP[achievement.icon] || SparklesIcon;

  return (
    <div className={clsx(
      'relative p-5 rounded-2xl border transition-all',
      isClaimable
        ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
        : unlocked
          ? 'bg-gradient-to-br from-cyan-500/10 to-violet-500/10 border-cyan-500/30'
          : 'bg-white/[0.02] border-white/[0.05]'
    )}>
      {isClaimable && (
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
          <span className="text-xs font-medium text-emerald-400 animate-pulse">Ready to claim!</span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className={clsx(
          'w-16 h-16 rounded-2xl flex items-center justify-center',
          isClaimable
            ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/30'
            : unlocked
              ? 'bg-cyan-500/20'
              : 'bg-white/5'
        )}>
          {unlocked ? (
            <IconComponent className={clsx('h-8 w-8', isClaimable ? 'text-emerald-400' : 'text-cyan-400')} />
          ) : (
            <LockIcon className="h-7 w-7 text-white/20" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={clsx('font-bold text-lg', unlocked ? 'text-white' : 'text-white/50')}>
              {achievement.name}
            </h3>
            {claimed && <CheckCircleIcon className="h-5 w-5 text-emerald-400" />}
          </div>
          <p className={clsx('text-sm mt-0.5', unlocked ? 'text-white/60' : 'text-white/30')}>
            {achievement.description}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-500/20">
            <ZapIcon className="h-4 w-4 text-violet-400" />
            <span className="text-base font-bold text-violet-400">+{achievement.xp_reward}</span>
          </div>

          {isClaimable && (
            <button
              onClick={() => onClaim(achievement.id)}
              disabled={claiming}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {claiming ? 'Claiming...' : 'Claim XP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
