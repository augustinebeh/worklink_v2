import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  SparklesIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { FilterTabs, SectionHeader } from '../components/common';
import AchievementGrid from '../components/gamification/AchievementGrid';
import FeaturedAchievementCard from '../components/gamification/AchievementDetailModal';

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

  const initAchievements = async () => {
    try {
      await fetch(`/api/v1/gamification/achievements/check/${user.id}`, { method: 'POST' });
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

  const featuredAchievements = achievements.filter(a => a.category === 'special');
  const otherAchievements = achievements.filter(a => a.category !== 'special');

  const filteredAchievements = otherAchievements.filter(a => {
    const status = userAchievements[a.id];
    if (filter === 'claimable') return status?.unlocked && !status?.claimed;
    if (filter === 'unlocked') return status?.unlocked;
    if (filter === 'locked') return !status?.unlocked;
    return true;
  });

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

      {/* Getting Started Section */}
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
        <AchievementGrid
          achievements={sortedAchievements}
          userAchievements={userAchievements}
          loading={loading}
          filter={filter}
          onClaim={handleClaim}
          claiming={claiming}
        />
      </div>
    </div>
  );
}
