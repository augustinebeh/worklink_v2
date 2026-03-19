import {
  LockIcon,
  CheckCircleIcon,
  CoinsIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ICON_MAP, categoryInfo, tierColors, colorClasses } from './reward-constants';

export default function RewardCard({ reward, userTier, userPoints, onPurchase, purchasing, onCustomize }) {
  const category = categoryInfo[reward.category] || categoryInfo.feature;
  const IconComponent = ICON_MAP[reward.icon] || category.icon;
  const colors = colorClasses[category.color];
  const tierColor = tierColors[reward.tier_required] || tierColors.bronze;

  const canPurchase = reward.canPurchase;
  const isLocked = !reward.meetsRequirement;
  const isOwned = reward.purchaseCount > 0;
  const cantAfford = !reward.canAfford && reward.meetsRequirement;

  // Check if this reward has customization options
  const hasCustomization = isOwned && (reward.id === 'RWD_PROFILE_FLAIR' || reward.id === 'RWD_DARK_MODE');

  // Default background for non-special state cards
  const cardStyle = (!isOwned && !isLocked && !canPurchase) ? { backgroundColor: 'var(--bg-card)' } : {};

  return (
    <div
      className={clsx(
        'relative p-4 rounded-2xl border transition-all',
        isOwned
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : isLocked
            ? 'bg-white/[0.02] border-white/[0.03] opacity-60'
            : canPurchase
              ? `bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/40 shadow-lg ${colors.glow}`
              : `${colors.border}`
      )}
      style={cardStyle}
    >
      {/* Owned indicator */}
      {isOwned && (
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <CheckCircleIcon className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all',
          isOwned
            ? 'bg-emerald-500/30 border border-emerald-500/40'
            : isLocked
              ? 'bg-white/5'
              : canPurchase
                ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 border border-emerald-500/40'
                : colors.bg
        )}>
          {isLocked ? (
            <LockIcon className="h-6 w-6 text-white/20" />
          ) : (
            <IconComponent className={clsx('h-7 w-7', isOwned ? 'text-emerald-400' : canPurchase ? 'text-emerald-400' : colors.text)} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={clsx('font-semibold', isLocked ? 'text-white/40' : 'text-white')}>
              {reward.name}
            </h3>
            {isOwned && <span className="text-xs text-emerald-400">Owned</span>}
          </div>
          <p className={clsx('text-sm', isLocked ? 'text-white/30' : 'text-white/50')}>
            {reward.description}
          </p>

          {/* Tags row */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full',
              isLocked ? 'bg-white/5 text-white/30' : `${colors.bg} ${colors.text}`
            )}>
              {category.label}
            </span>
            <span className={clsx(
              'text-xs px-2 py-0.5 rounded-full capitalize',
              tierColor.bg, tierColor.text
            )}>
              {reward.tier_required}+
            </span>
            {reward.stock !== null && (
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-full',
                reward.stock > 0 ? 'bg-white/5 text-white/50' : 'bg-red-500/20 text-red-400'
              )}>
                {reward.stock > 0 ? `${reward.stock} left` : 'Out of stock'}
              </span>
            )}
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex flex-col items-end gap-2">
          <div className={clsx(
            'flex items-center gap-1 px-2 py-1 rounded-lg',
            cantAfford ? 'bg-red-500/20' : 'bg-emerald-500/20'
          )}>
            <CoinsIcon className={clsx('h-3.5 w-3.5', cantAfford ? 'text-red-400' : 'text-emerald-400')} />
            <span className={clsx('text-sm font-bold', cantAfford ? 'text-red-400' : 'text-emerald-400')}>
              {reward.points_cost}
            </span>
          </div>

          {!isOwned && canPurchase && (
            <button
              onClick={() => onPurchase(reward)}
              disabled={purchasing}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {purchasing ? '...' : 'Redeem'}
            </button>
          )}

          {hasCustomization && (
            <button
              onClick={() => onCustomize(reward.id)}
              className="px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 text-sm font-semibold hover:bg-violet-500/30 active:scale-95 transition-all"
            >
              Customize
            </button>
          )}

          {isLocked && (
            <span className="text-xs text-white/30">
              Reach {reward.tier_required}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
