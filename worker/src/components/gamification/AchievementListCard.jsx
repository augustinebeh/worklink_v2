import {
  ZapIcon,
  LockIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ICON_MAP, achievementCategories, colorClasses, rarityColors } from './achievement-constants';

export default function AchievementListCard({ achievement, unlocked, claimed, onClaim, claiming }) {
  const category = achievementCategories[achievement.category] || achievementCategories.milestones;
  const IconComponent = ICON_MAP[achievement.icon] || category.icon;
  const colors = colorClasses[category.color];
  const isClaimable = unlocked && !claimed;

  return (
    <div className={clsx(
      'relative p-4 rounded-2xl border transition-all',
      unlocked
        ? isClaimable
          ? `bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/40 shadow-lg ${colors.glow}`
          : `bg-[#0a1628]/80 ${colors.border}`
        : 'bg-white/[0.02] border-white/[0.03] opacity-60'
    )}>
      {/* Claimable indicator */}
      {isClaimable && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all',
          unlocked
            ? isClaimable
              ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/40'
              : colors.bg
            : 'bg-white/5'
        )}>
          {unlocked ? (
            <IconComponent className={clsx('h-7 w-7', isClaimable ? 'text-emerald-400' : colors.text)} />
          ) : (
            <LockIcon className="h-6 w-6 text-white/20" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={clsx('font-semibold', unlocked ? 'text-white' : 'text-white/40')}>
              {achievement.name}
            </h3>
            {claimed && <CheckCircleIcon className="h-4 w-4 text-emerald-400" />}
            {!unlocked && (
              <span className={clsx('text-xs font-medium px-1.5 py-0.5 rounded', rarityColors[achievement.rarity])}>
                {achievement.rarity}
              </span>
            )}
          </div>
          <p className={clsx('text-sm', unlocked ? 'text-white/50' : 'text-white/30')}>
            {achievement.description}
          </p>

          {/* Category label */}
          <div className="mt-2">
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full',
              unlocked ? `${colors.bg} ${colors.text}` : 'bg-white/5 text-white/30'
            )}>
              {category.label}
            </span>
          </div>
        </div>

        {/* Reward & Action */}
        <div className="flex flex-col items-end gap-2">
          <div className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-lg',
            unlocked ? 'bg-violet-500/20' : 'bg-white/5'
          )}>
            <ZapIcon className={clsx('h-3.5 w-3.5', unlocked ? 'text-violet-400' : 'text-white/30')} />
            <span className={clsx('text-sm font-bold', unlocked ? 'text-violet-400' : 'text-white/30')}>
              +{achievement.xp_reward || 0}
            </span>
          </div>

          {isClaimable && (
            <button
              onClick={() => onClaim(achievement.id)}
              disabled={claiming}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {claiming ? '...' : 'Claim'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
