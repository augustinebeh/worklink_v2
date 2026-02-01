import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  EyeIcon,
  EyeOffIcon,
  BriefcaseIcon,
  CalendarIcon,
  GiftIcon,
  HistoryIcon,
  FlameIcon,
  ZapIcon,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { getLevelTier, LEVEL_TITLES } from '../../utils/gamification';
import ProfileAvatar from '../ui/ProfileAvatar';
import { formatMoney } from '../../utils/constants';

// Hexagon Level Badge Component
function HexagonLevelBadge({ level }) {
  const tier = getLevelTier(level);

  // Tier to hexagon class mapping
  const tierClass = {
    bronze: 'hexagon-bronze',
    bronzeElite: 'hexagon-bronze',
    silver: 'hexagon-silver',
    silverElite: 'hexagon-silver',
    gold: 'hexagon-gold',
    goldElite: 'hexagon-gold',
    platinum: 'hexagon-platinum',
    platinumElite: 'hexagon-platinum',
    diamond: 'hexagon-diamond',
    diamondElite: 'hexagon-diamond',
    mythic: 'hexagon-mythic',
  }[tier] || 'hexagon-bronze';

  const hasGlow = ['diamond', 'diamondElite', 'mythic'].includes(tier);

  return (
    <div className="absolute -bottom-1 -right-1 z-10">
      <div
        className={clsx(
          'hexagon-badge w-8 h-9 flex items-center justify-center',
          tierClass,
          hasGlow && 'animate-pulse'
        )}
      >
        <span className="text-white font-bold text-xs drop-shadow-lg">{level}</span>
      </div>
    </div>
  );
}

// Command Center XP Bar Component
function CommandCenterXPBar({ progress, xpInLevel, xpNeeded, isDark }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className={isDark ? 'text-violet-300/80' : 'text-white/80'}>XP Progress</span>
        <span className={clsx('font-semibold', isDark ? 'text-emerald-300' : 'text-white')}>
          {xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()}
        </span>
      </div>
      <div className="xp-bar-command-center">
        <div
          className="xp-bar-fill-command-center"
          style={{ width: `${Math.max(progress, 2)}%` }}
        />
      </div>
    </div>
  );
}

// Quick Action Button
function QuickActionCircle({ icon: Icon, label, onClick, isDark }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div className={clsx(
        'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
        'backdrop-blur-sm border group-active:scale-95',
        isDark
          ? 'bg-white/5 border-white/10 group-hover:bg-white/10 group-hover:border-white/20'
          : 'bg-white/20 border-white/30 group-hover:bg-white/30'
      )}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <span className="text-2xs font-medium text-white/70">{label}</span>
    </button>
  );
}

export default function CommandCenterHero({
  user,
  userLevel,
  userXP,
  userStreak,
  thisMonthEarnings,
  totalEarnings,
  pendingPayment,
  xpInLevel,
  xpNeeded,
  progress,
}) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [balanceHidden, setBalanceHidden] = useState(false);

  const userName = user?.name || 'Worker';
  const levelTitle = LEVEL_TITLES[userLevel] || 'Newcomer';

  return (
    <div className="px-4 py-4">
      {/* Main Hero Card - Glassmorphism with deep space-like background */}
      <div className={clsx(
        'relative overflow-hidden rounded-3xl p-5 border',
        isDark
          ? 'bg-gradient-to-br from-[#080810] via-[#0c0d1a] to-[#0a0f1c] border-white/[0.08]'
          : 'bg-gradient-to-br from-[#007AFF] via-[#0062FF] to-[#0055EB] border-transparent shadow-[0_15px_50px_rgba(0,122,255,0.25)]'
      )}>
        {/* Background Gradient Blobs for depth - color bleed through glass */}
        <div className={clsx(
          'absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] -translate-y-1/3 translate-x-1/4',
          isDark ? 'bg-violet-600/20' : 'bg-white/25'
        )} />
        <div className={clsx(
          'absolute bottom-0 left-0 w-72 h-72 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4',
          isDark ? 'bg-emerald-500/15' : 'bg-white/20'
        )} />
        <div className={clsx(
          'absolute top-1/3 left-1/3 w-56 h-56 rounded-full blur-[80px]',
          isDark ? 'bg-primary-500/10' : 'bg-white/15'
        )} />

        {/* Content container */}
        <div className="relative">
          {/* Top Row: Avatar + Info */}
          <div className="flex items-start gap-4 mb-5">
            {/* Avatar with Hexagon Badge */}
            <div className="relative flex-shrink-0">
              <ProfileAvatar
                name={userName}
                photoUrl={user?.photo_url}
                level={userLevel}
                size="xl"
                showLevel={false}
                isCurrentUser={true}
              />
              <HexagonLevelBadge level={userLevel} />
            </div>

            {/* Player Info */}
            <div className="flex-1 min-w-0 pt-1">
              <h2 className="text-lg font-bold text-white truncate">{userName}</h2>
              <p className={clsx(
                'text-sm font-medium',
                isDark ? 'text-violet-300' : 'text-white/80'
              )}>
                {levelTitle}
              </p>

              {/* Streak Badge with Mint Glow */}
              {userStreak > 0 && (
                <div className={clsx(
                  'inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full',
                  'bg-gradient-to-r from-emerald-500/20 to-teal-500/20',
                  'border border-emerald-400/40',
                  isDark && 'shadow-[0_0_15px_rgba(0,255,170,0.2)]'
                )}>
                  <FlameIcon className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">{userStreak} Day Streak</span>
                </div>
              )}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mb-5">
            <CommandCenterXPBar
              progress={progress}
              xpInLevel={xpInLevel}
              xpNeeded={xpNeeded}
              isDark={isDark}
            />
          </div>

          {/* Balance Display - Centered */}
          <div className="text-center mb-5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-white/60 text-sm">This Month</span>
              <button
                onClick={() => setBalanceHidden(!balanceHidden)}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                {balanceHidden ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight mb-1">
              {balanceHidden ? '••••••' : `$${formatMoney(thisMonthEarnings)}`}
            </p>
            <p className="text-sm text-white/50">
              Total: ${formatMoney(totalEarnings)} •{' '}
              <span className="text-amber-400">${formatMoney(pendingPayment)} pending</span>
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex justify-between px-2">
            <QuickActionCircle
              icon={BriefcaseIcon}
              label="Jobs"
              onClick={() => navigate('/jobs')}
              isDark={isDark}
            />
            <QuickActionCircle
              icon={CalendarIcon}
              label="Calendar"
              onClick={() => navigate('/calendar')}
              isDark={isDark}
            />
            <QuickActionCircle
              icon={GiftIcon}
              label="Refer"
              onClick={() => navigate('/referrals')}
              isDark={isDark}
            />
            <QuickActionCircle
              icon={HistoryIcon}
              label="History"
              onClick={() => navigate('/wallet')}
              isDark={isDark}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
