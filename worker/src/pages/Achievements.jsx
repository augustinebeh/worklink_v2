import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  StarIcon,
  ZapIcon,
  FlameIcon,
  AwardIcon,
  GiftIcon,
  LockIcon,
  CheckCircleIcon,
  SparklesIcon,
  UserCheckIcon,
  BadgeCheckIcon,
  CrownIcon,
  BookOpenIcon,
  TargetIcon,
  UsersIcon,
  SwordIcon,
  HandIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { FilterTabs, EmptyState, LoadingSkeleton, SectionHeader } from '../components/common';

// Map icon strings to components
const ICON_MAP = {
  trophy: TrophyIcon,
  star: StarIcon,
  flame: FlameIcon,
  award: AwardIcon,
  gift: GiftIcon,
  sparkles: SparklesIcon,
  'user-check': UserCheckIcon,
  'badge-check': BadgeCheckIcon,
  crown: CrownIcon,
  'book-open': BookOpenIcon,
  target: TargetIcon,
  users: UsersIcon,
  'users-plus': UsersIcon,
  sword: SwordIcon,
  wave: HandIcon,
};

const achievementCategories = {
  special: { icon: SparklesIcon, label: 'Getting Started', color: 'cyan' },
  milestones: { icon: TrophyIcon, label: 'Milestones', color: 'amber' },
  performance: { icon: StarIcon, label: 'Performance', color: 'violet' },
  streaks: { icon: FlameIcon, label: 'Streaks', color: 'red' },
  social: { icon: GiftIcon, label: 'Social', color: 'emerald' },
};

const colorClasses = {
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', glow: 'shadow-red-500/20' },
  cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
};

const rarityColors = {
  common: 'text-white/60',
  rare: 'text-blue-400',
  epic: 'text-violet-400',
  legendary: 'text-amber-400',
};

function AchievementCard({ achievement, unlocked, claimed, onClaim, claiming }) {
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

// Featured achievement card for newcomers
function FeaturedAchievementCard({ achievement, unlocked, claimed, onClaim, claiming }) {
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

export default function Achievements() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (user) {
      initAchievements();
    }
  }, [user]);

  // Initialize: check for auto-unlock first, then fetch
  const initAchievements = async () => {
    try {
      // First check and unlock any auto-achievements (first login, profile, verified)
      await fetch(`/api/v1/gamification/achievements/check/${user.id}`, { method: 'POST' });
      // Then fetch achievements (after unlocks are saved)
      await fetchAchievements();
    } catch (error) {
      console.error('Failed to initialize achievements:', error);
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const [allRes, userRes] = await Promise.all([
        fetch('/api/v1/gamification/achievements'),
        fetch(`/api/v1/gamification/achievements/user/${user.id}`),
      ]);
      const allData = await allRes.json();
      const userData = await userRes.json();

      if (allData.success) setAchievements(allData.data || []);
      if (userData.success) {
        // Create a map of achievement_id -> {unlocked: true, claimed: bool}
        const achievementMap = {};
        (userData.data || []).forEach(a => {
          achievementMap[a.achievement_id] = {
            unlocked: true,
            claimed: a.claimed === 1,
            unlocked_at: a.unlocked_at,
          };
        });
        setUserAchievements(achievementMap);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (achievementId) => {
    setClaiming(achievementId);
    try {
      const res = await fetch(`/api/v1/gamification/achievements/${achievementId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Achievement Claimed!', `+${data.data.xp_awarded} XP earned`);
        // Update local state
        setUserAchievements(prev => ({
          ...prev,
          [achievementId]: { ...prev[achievementId], claimed: true },
        }));
        refreshUser();
      } else {
        toast.error('Failed', data.error || 'Could not claim achievement');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    } finally {
      setClaiming(null);
    }
  };

  const unlockedCount = Object.keys(userAchievements).length;
  const totalCount = achievements.length;
  const claimableCount = Object.values(userAchievements).filter(a => a.unlocked && !a.claimed).length;
  const claimedCount = Object.values(userAchievements).filter(a => a.claimed).length;
  const totalXPAvailable = achievements
    .filter(a => userAchievements[a.id]?.unlocked && !userAchievements[a.id]?.claimed)
    .reduce((sum, a) => sum + (a.xp_reward || 0), 0);
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  // Get featured achievements (special category - for newcomers)
  const featuredAchievements = achievements.filter(a => a.category === 'special');
  const otherAchievements = achievements.filter(a => a.category !== 'special');

  const filteredAchievements = otherAchievements.filter(a => {
    const status = userAchievements[a.id];
    if (filter === 'claimable') return status?.unlocked && !status?.claimed;
    if (filter === 'unlocked') return status?.unlocked;
    if (filter === 'locked') return !status?.unlocked;
    return true;
  });

  // Sort: claimable first, then unlocked, then locked
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const aStatus = userAchievements[a.id];
    const bStatus = userAchievements[b.id];
    const aScore = aStatus?.unlocked ? (aStatus?.claimed ? 1 : 2) : 0;
    const bScore = bStatus?.unlocked ? (bStatus?.claimed ? 1 : 2) : 0;
    return bScore - aScore;
  });

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'claimable', label: `Claimable (${claimableCount})` },
    { id: 'unlocked', label: `Unlocked (${unlockedCount})` },
    { id: 'locked', label: `Locked (${totalCount - unlockedCount})` },
  ];

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <TrophyIcon className="h-7 w-7 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Achievements</h1>
                <p className="text-white/50">Collect badges & earn XP</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/50">Collection Progress</span>
                <span className="text-amber-400 font-bold">{unlockedCount} / {totalCount}</span>
              </div>
              <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {claimableCount > 0 ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{claimableCount}</p>
                  <p className="text-xs text-white/40">To Claim</p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white/5 text-center">
                  <p className="text-2xl font-bold text-white">{claimedCount}</p>
                  <p className="text-xs text-white/40">Claimed</p>
                </div>
              )}
              <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-center">
                <p className="text-2xl font-bold text-violet-400">{totalXPAvailable}</p>
                <p className="text-xs text-white/40">XP Available</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 text-center">
                <p className="text-2xl font-bold text-white">{totalCount - unlockedCount}</p>
                <p className="text-xs text-white/40">Locked</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting Started Section - Featured for newcomers */}
      {featuredAchievements.length > 0 && (
        <div className="px-4 mt-6">
          <SectionHeader title="Getting Started" icon={SparklesIcon} iconColor="text-cyan-400" />
          <div className="space-y-3">
            {featuredAchievements.map(achievement => (
              <FeaturedAchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={userAchievements[achievement.id]?.unlocked}
                claimed={userAchievements[achievement.id]?.claimed}
                onClaim={handleClaim}
                claiming={claiming === achievement.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Achievements */}
      <div className="px-4 mt-6">
        <SectionHeader title="All Achievements" icon={TrophyIcon} iconColor="text-amber-400" />

        <FilterTabs tabs={tabs} activeFilter={filter} onFilterChange={setFilter} />
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <LoadingSkeleton count={4} height="h-24" />
        ) : sortedAchievements.length === 0 ? (
          <EmptyState
            icon={TrophyIcon}
            title={filter === 'claimable' ? 'No achievements to claim' : 'No achievements found'}
            description={filter === 'claimable' ? 'Unlock achievements to claim XP' : 'Keep working to unlock achievements'}
          />
        ) : (
          <div className="space-y-3">
            {sortedAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={userAchievements[achievement.id]?.unlocked}
                claimed={userAchievements[achievement.id]?.claimed}
                onClaim={handleClaim}
                claiming={claiming === achievement.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
