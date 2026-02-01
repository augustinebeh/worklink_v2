import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { FlameIcon, ZapIcon, TrendingUpIcon, ClockIcon, DollarSignIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney } from '../../utils/constants';

// Streak multiplier based on streak days
function getStreakMultiplier(streak) {
  if (streak >= 14) return { multiplier: '2x', label: 'Maximum bonus!' };
  if (streak >= 7) return { multiplier: '1.5x', label: 'Keep going for 2x!' };
  if (streak >= 3) return { multiplier: '1.25x', label: 'Keep going for 1.5x!' };
  return { multiplier: '1x', label: 'Build your streak!' };
}

// Glass Stat Pod Component
function GlassStatPod({ icon: Icon, label, value, accentColor, isDark }) {
  const accentColors = {
    emerald: {
      icon: 'text-emerald-400',
      bg: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50',
      border: isDark ? 'border-emerald-500/20' : 'border-emerald-200',
      value: 'text-emerald-400',
    },
    amber: {
      icon: 'text-amber-400',
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      border: isDark ? 'border-amber-500/20' : 'border-amber-200',
      value: 'text-amber-400',
    },
  };

  const colors = accentColors[accentColor] || accentColors.emerald;

  return (
    <div className={clsx(
      'glass-stat-pod flex items-center gap-3',
      isDark && 'hover:bg-white/[0.08] transition-colors'
    )}>
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center',
        colors.bg,
        'border',
        colors.border
      )}>
        <Icon className={clsx('h-5 w-5', colors.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx(
          'text-xs font-medium',
          isDark ? 'text-dark-400' : 'text-slate-500'
        )}>
          {label}
        </p>
        <p className={clsx(
          'text-lg font-bold',
          colors.value
        )}>
          {value}
        </p>
      </div>
    </div>
  );
}

export default function LeagueBanner({
  userStreak,
  totalEarnings,
  pendingPayment,
  showStatPods = true,
}) {
  const { isDark } = useTheme();
  const streakInfo = getStreakMultiplier(userStreak);

  if (userStreak <= 0) return null;

  return (
    <div className="px-4 mb-4 space-y-3">
      {/* Streak Fire Banner */}
      <Link
        to="/achievements"
        className={clsx(
          'streak-fire-banner flex items-center gap-4 active:scale-[0.99] transition-transform',
          isDark && 'shadow-[0_0_20px_rgba(52,211,153,0.15)]'
        )}
      >
        {/* Fire Icon with Glow */}
        <div className="relative">
          <div className={clsx(
            'w-14 h-14 rounded-2xl flex items-center justify-center',
            'bg-gradient-to-br from-orange-500/30 to-amber-500/20',
            'border border-orange-400/30'
          )}>
            <FlameIcon className="h-7 w-7 text-orange-400" />
          </div>
          {/* Glow effect */}
          {isDark && (
            <div className="absolute inset-0 rounded-2xl bg-orange-500/20 blur-xl -z-10" />
          )}
        </div>

        {/* Streak Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx(
              'text-xl font-bold',
              isDark ? 'text-white' : 'text-slate-800'
            )}>
              {userStreak} Day Streak!
            </span>
            <span className="text-lg">🔥</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={clsx(
              'text-sm font-semibold',
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            )}>
              {streakInfo.multiplier} XP
            </span>
            <span className={isDark ? 'text-dark-500' : 'text-slate-400'}>•</span>
            <span className={clsx(
              'text-sm',
              isDark ? 'text-emerald-300/70' : 'text-emerald-600/70'
            )}>
              {streakInfo.label}
            </span>
          </div>
        </div>

        {/* Multiplier Badge */}
        <div className={clsx(
          'px-3 py-1.5 rounded-xl',
          'bg-gradient-to-r from-emerald-500/20 to-mint-500/20',
          'border border-emerald-400/30'
        )}>
          <div className="flex items-center gap-1">
            <ZapIcon className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{streakInfo.multiplier}</span>
          </div>
        </div>
      </Link>

      {/* Glass Stat Pods */}
      {showStatPods && (
        <div className="grid grid-cols-2 gap-3">
          <GlassStatPod
            icon={DollarSignIcon}
            label="Total Earned"
            value={`$${formatMoney(totalEarnings)}`}
            accentColor="emerald"
            isDark={isDark}
          />
          <GlassStatPod
            icon={ClockIcon}
            label="Pending"
            value={`$${formatMoney(pendingPayment)}`}
            accentColor="amber"
            isDark={isDark}
          />
        </div>
      )}
    </div>
  );
}
