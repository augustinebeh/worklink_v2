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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

const achievementCategories = {
  milestones: { icon: TrophyIcon, label: 'Milestones', color: 'amber' },
  performance: { icon: StarIcon, label: 'Performance', color: 'violet' },
  streaks: { icon: FlameIcon, label: 'Streaks', color: 'red' },
  social: { icon: GiftIcon, label: 'Social', color: 'cyan' },
  special: { icon: AwardIcon, label: 'Special', color: 'emerald' },
};

function AchievementCard({ achievement, unlocked }) {
  const category = achievementCategories[achievement.category] || achievementCategories.milestones;
  const Icon = category.icon;
  
  const colorClasses = {
    amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-400' },
    violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/30', text: 'text-violet-400' },
    red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
    cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-400' },
    emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  };
  
  const colors = colorClasses[category.color];

  return (
    <div className={clsx(
      'p-4 rounded-2xl border transition-all',
      unlocked ? `bg-[#0a1628]/80 ${colors.border}` : 'bg-white/[0.02] border-white/[0.03] opacity-50'
    )}>
      <div className="flex items-start gap-4">
        <div className={clsx(
          'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
          unlocked ? colors.bg : 'bg-white/5'
        )}>
          {unlocked ? <Icon className={clsx('h-7 w-7', colors.text)} /> : <LockIcon className="h-6 w-6 text-white/20" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={clsx('font-semibold', unlocked ? 'text-white' : 'text-white/40')}>{achievement.name}</h3>
            {unlocked && <CheckCircleIcon className="h-4 w-4 text-emerald-400" />}
          </div>
          <p className={clsx('text-sm', unlocked ? 'text-white/50' : 'text-white/30')}>{achievement.description}</p>
        </div>

        <div className={clsx(
          'flex items-center gap-1 px-2 py-1 rounded-lg',
          unlocked ? 'bg-violet-500/20' : 'bg-white/5'
        )}>
          <ZapIcon className={clsx('h-3.5 w-3.5', unlocked ? 'text-violet-400' : 'text-white/30')} />
          <span className={clsx('text-sm font-bold', unlocked ? 'text-violet-400' : 'text-white/30')}>
            +{achievement.xp_reward || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Achievements() {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user) fetchAchievements();
  }, [user]);

  const fetchAchievements = async () => {
    try {
      const [allRes, userRes] = await Promise.all([
        fetch('/api/v1/gamification/achievements'),
        fetch(`/api/v1/gamification/achievements/user/${user.id}`),
      ]);
      const allData = await allRes.json();
      const userData = await userRes.json();
      if (allData.success) setAchievements(allData.data || []);
      if (userData.success) setUserAchievements(userData.data?.map(a => a.achievement_id) || []);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = userAchievements.length;
  const totalCount = achievements.length;
  const progress = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const filteredAchievements = achievements.filter(a => {
    const unlocked = userAchievements.includes(a.id);
    if (filter === 'unlocked') return unlocked;
    if (filter === 'locked') return !unlocked;
    return true;
  });

  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    const aUnlocked = userAchievements.includes(a.id);
    const bUnlocked = userAchievements.includes(b.id);
    if (aUnlocked !== bUnlocked) return bUnlocked ? 1 : -1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />
          
          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <TrophyIcon className="h-8 w-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Achievements</h1>
                <p className="text-white/50">Collect badges & earn XP</p>
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-white/50">Progress</span>
              <span className="text-amber-400 font-bold">{unlockedCount} / {totalCount}</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All' },
            { id: 'unlocked', label: `Unlocked (${unlockedCount})` },
            { id: 'locked', label: `Locked (${totalCount - unlockedCount})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                filter === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-[#0a1628] border border-white/[0.05] text-white/50 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Achievements List */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-[#0a1628] animate-pulse" />
            ))}
          </div>
        ) : sortedAchievements.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-[#0a1628]/50 border border-white/[0.05]">
            <TrophyIcon className="h-16 w-16 mx-auto mb-4 text-white/10" />
            <h3 className="text-white font-semibold mb-2">No achievements found</h3>
            <p className="text-white/40 text-sm">Keep working to unlock achievements</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={userAchievements.includes(achievement.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
