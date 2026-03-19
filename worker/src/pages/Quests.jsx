import { useState, useEffect } from 'react';
import { TargetIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { calculateLevel } from '../../../shared/utils/gamification-browser';
import XPBar from '../components/gamification/XPBar';
import QuestCard from '../components/gamification/QuestCard';
import QuestFilters from '../components/gamification/QuestFilters';
import { LoadingSkeleton, EmptyState } from '../components/common';

export default function Quests() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [filter, setFilter] = useState('all');
  const [pendingXP, setPendingXP] = useState(0); // Track pending XP for immediate feedback

  useEffect(() => {
    if (user) fetchQuests();
  }, [user]);

  const fetchQuests = async () => {
    try {
      const res = await fetch(`/api/v1/gamification/quests/user/${user.id}`);
      const data = await res.json();
      if (data.success) {
        const sorted = [...(data.data || [])].sort((a, b) => {
          const order = { claimable: 0, in_progress: 1, available: 2, claimed: 3 };
          return (order[a.status] ?? 4) - (order[b.status] ?? 4);
        });
        setQuests(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (quest) => {
    setClaiming(quest.id);
    try {
      // Record the check-in progress
      const res = await fetch(`/api/v1/gamification/quests/${quest.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: user.id,
          increment: 1
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Checked In!', 'Quest progress updated');
        fetchQuests();
      } else {
        toast.error('Failed', data.error || 'Could not check in');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    } finally {
      setClaiming(null);
    }
  };

  const handleClaim = async (quest) => {
    setClaiming(quest.id);
    try {
      // Add immediate visual feedback by adding pending XP
      setPendingXP(prev => prev + quest.xp_reward);

      const res = await fetch(`/api/v1/gamification/quests/${quest.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Quest Completed!', `+${quest.xp_reward} XP earned`);

        // Refresh data and clear pending XP after server sync
        await Promise.all([
          fetchQuests(),
          refreshUser()
        ]);
        setPendingXP(prev => prev - quest.xp_reward);
      } else {
        // Remove pending XP if failed
        setPendingXP(prev => prev - quest.xp_reward);
        toast.error('Failed', data.error || 'Could not claim reward');
      }
    } catch (error) {
      // Remove pending XP if error
      setPendingXP(prev => prev - quest.xp_reward);
      toast.error('Error', 'Please try again');
    } finally {
      setClaiming(null);
    }
  };

  const filteredQuests = quests.filter(q => {
    if (filter === 'active') return q.status !== 'claimed';
    if (filter === 'completed') return q.status === 'claimed';
    return true;
  });

  const claimableCount = quests.filter(q => q.status === 'claimable').length;
  const activeCount = quests.filter(q => q.status !== 'claimed').length;
  const totalXPAvailable = quests.filter(q => q.status !== 'claimed').reduce((sum, q) => sum + (q.xp_reward || 0), 0);
  const completedCount = quests.filter(q => q.status === 'claimed').length;

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Hero Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative p-6">
            {/* Title Row */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <TargetIcon className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Quests</h1>
                <p className="text-white/50">Complete quests to earn XP</p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="mb-4">
              <XPBar
                currentXP={(user?.xp || 0) + pendingXP}
                level={calculateLevel((user?.xp || 0) + pendingXP)}
                pendingXP={pendingXP}
              />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              {claimableCount > 0 ? (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{claimableCount}</p>
                  <p className="text-xs text-white/40">Ready to Claim</p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white/5 text-center">
                  <p className="text-2xl font-bold text-white">{activeCount}</p>
                  <p className="text-xs text-white/40">Active</p>
                </div>
              )}
              <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-center">
                <p className="text-2xl font-bold text-violet-400">{totalXPAvailable}</p>
                <p className="text-xs text-white/40">XP Available</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 text-center">
                <p className="text-2xl font-bold text-white">{completedCount}</p>
                <p className="text-xs text-white/40">Completed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mt-4">
        <QuestFilters
          filter={filter}
          onFilterChange={setFilter}
          quests={quests}
        />
      </div>

      {/* Quests List */}
      <div className="px-4 py-4">
        {loading ? (
          <LoadingSkeleton count={4} height="h-32" />
        ) : filteredQuests.length === 0 ? (
          <EmptyState
            icon={TargetIcon}
            title="No quests found"
            description="Check back later for new quests"
          />
        ) : (
          <div className="space-y-3">
            {filteredQuests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onClaim={handleClaim}
                onCheckin={handleCheckin}
                claiming={claiming === quest.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
