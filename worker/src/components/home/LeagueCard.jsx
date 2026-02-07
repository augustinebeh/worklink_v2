import { clsx } from 'clsx';
import { TrophyIcon, WalletIcon, BriefcaseIcon } from 'lucide-react';
import { LEVEL_TITLES as levelTitles } from '../../../../shared/utils/gamification-browser';
import { StatPod } from '../common';
import XPBar from '../gamification/XPBar';
import { formatMoney } from '../../utils/constants';

export default function LeagueCard({ user, userLevel, userXP, thisMonthEarnings, totalJobs, xpAnimating, xpBarRef }) {
  const levelTitle = levelTitles[userLevel] || 'Newcomer';

  return (
    <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] -translate-x-1/2 -translate-y-1/2" />

      {/* Border glow */}
      <div className={clsx(
        'absolute inset-0 rounded-3xl border transition-all duration-500',
        xpAnimating ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-white/[0.08]'
      )} />

      {/* Content */}
      <div className="relative p-5">
        {/* User info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <p className="text-white/60 text-sm">Welcome back</p>
            <p className="text-white font-semibold text-lg">
              {user?.name || 'Worker'}
              {user?.profile_flair && <span className="ml-1">{user.profile_flair}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Online</span>
          </div>
        </div>

        {/* League Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-10 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {levelTitle} League
              <TrophyIcon className="h-6 w-6 text-amber-400" />
            </h1>
            <p className="text-white/50 text-sm">Level {userLevel} • {userXP.toLocaleString()} XP</p>
          </div>
        </div>

        {/* XP Bar - ref attached to the bar track for flying XP target */}
        <div className="mb-6">
          <XPBar
            ref={xpBarRef}
            currentXP={userXP}
            level={userLevel}
            animating={xpAnimating}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatPod label="This Month" value={`$${formatMoney(thisMonthEarnings)}`} icon={WalletIcon} color="emerald" whiteValue size="md" />
          <StatPod label="Jobs Done" value={totalJobs.toString()} icon={BriefcaseIcon} color="violet" whiteValue size="md" />
        </div>
      </div>
    </div>
  );
}
