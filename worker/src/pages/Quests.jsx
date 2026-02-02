import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ZapIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  SparklesIcon,
  ChevronRightIcon,
  FlameIcon,
  TargetIcon,
  CheckIcon,
  TrophyIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { QUEST_TYPE_LABELS, QUEST_TYPE_STYLES } from '../utils/constants';
import { calculateLevel } from '../utils/gamification';
import XPBar from '../components/gamification/XPBar';
import { PageHeader, FilterTabs, EmptyState, LoadingSkeleton } from '../components/common';

// Quest type icons mapping
const QUEST_ICONS = {
  daily: ClockIcon,
  weekly: StarIcon,
  special: SparklesIcon,
  repeatable: TrophyIcon,
  challenge: FlameIcon,
};

function QuestCard({ quest, onClaim, onCheckin, claiming }) {
  const navigate = useNavigate();
  const config = QUEST_TYPE_STYLES[quest.type] || QUEST_TYPE_STYLES.daily;
  const typeLabel = QUEST_TYPE_LABELS?.[quest.type] || 'Daily';
  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
  const Icon = QUEST_ICONS[quest.type] || QUEST_ICONS.daily;

  const isClaimed = quest.status === 'claimed';
  const isClaimable = quest.status === 'claimable';
  
  // Check if this is a check-in type quest (like daily login)
  const isCheckinQuest = quest.requirement?.type === 'checkin' || 
                         quest.title?.toLowerCase().includes('check') ||
                         quest.title?.toLowerCase().includes('login') ||
                         quest.title?.toLowerCase().includes('daily');
  const canCheckin = isCheckinQuest && !isClaimed && !isClaimable && quest.progress < quest.target;

  const handleQuestClick = () => {
    if (isClaimed) return;
    
    // If claimable, don't navigate - just let them claim
    if (isClaimable) return;
    
    // If it's a check-in quest, trigger check-in
    if (canCheckin) {
      onCheckin(quest);
      return;
    }
    
    // Navigate based on requirement type
    const reqType = quest.requirement?.type || '';
    if (reqType.includes('job')) navigate('/jobs');
    else if (reqType.includes('training')) navigate('/training');
    else if (reqType.includes('referral')) navigate('/referrals');
    else if (reqType.includes('profile')) navigate('/complete-profile');
  };

  return (
    <div
      onClick={handleQuestClick}
      className={clsx(
        'relative p-4 rounded-2xl transition-all',
        isClaimed
          ? 'bg-white/[0.02] border border-white/[0.03] opacity-40'
          : isClaimable
            ? 'bg-emerald-500/10 border border-emerald-500/30 cursor-default'
            : canCheckin
              ? 'bg-cyan-500/10 border border-cyan-500/30 cursor-pointer hover:bg-cyan-500/20'
              : 'bg-[#0a1628]/80 border border-white/[0.05] hover:border-white/10 cursor-pointer'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
          isClaimed ? 'bg-white/5' : isClaimable ? 'bg-emerald-500/20' : canCheckin ? 'bg-cyan-500/20' : config.bg
        )}>
          {isClaimed ? (
            <CheckCircleIcon className="h-6 w-6 text-white/30" />
          ) : canCheckin ? (
            <CheckIcon className="h-6 w-6 text-cyan-400" />
          ) : (
            <Icon className={clsx('h-6 w-6', isClaimable ? 'text-emerald-400' : config.color)} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx(
              'px-2 py-0.5 rounded-md text-xs font-medium',
              isClaimed ? 'bg-white/5 text-white/30' : `${config.bg} ${config.color}`
            )}>
              {typeLabel}
            </span>
            {isClaimable && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-medium animate-pulse">
                Ready!
              </span>
            )}
            {canCheckin && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-medium">
                Tap to check in
              </span>
            )}
          </div>
          
          <h3 className={clsx(
            'font-semibold',
            isClaimed ? 'text-white/30 line-through' : 'text-white'
          )}>
            {quest.title}
          </h3>
          
          <p className={clsx('text-sm mt-0.5', isClaimed ? 'text-white/20' : 'text-white/40')}>
            {quest.description}
          </p>

          {/* Progress Bar */}
          {!isClaimed && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-white/40">Progress</span>
                <span className={isClaimable ? 'text-emerald-400 font-medium' : 'text-white/60'}>
                  {quest.progress}/{quest.target}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    isClaimable
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500'
                      : 'bg-gradient-to-r from-violet-500 to-cyan-500'
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reward & Action */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/20">
            <ZapIcon className="h-3.5 w-3.5 text-violet-400" />
            <span className={clsx('text-sm font-bold', isClaimed ? 'text-white/30' : 'text-violet-400')}>
              +{quest.xp_reward}
            </span>
          </div>
          
          {isClaimable && (
            <button
              onClick={(e) => { e.stopPropagation(); onClaim(quest); }}
              disabled={claiming}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {claiming ? 'Claiming...' : 'Claim'}
            </button>
          )}
          
          {canCheckin && (
            <button
              onClick={(e) => { e.stopPropagation(); onCheckin(quest); }}
              disabled={claiming}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/25 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {claiming ? '...' : 'Check In'}
            </button>
          )}
          
          {!isClaimed && !isClaimable && !canCheckin && (
            <ChevronRightIcon className="h-5 w-5 text-white/20" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Quests() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [filter, setFilter] = useState('all');

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
      const res = await fetch(`/api/v1/gamification/quests/${quest.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Quest Completed!', `+${quest.xp_reward} XP earned`);
        fetchQuests();
        refreshUser();
      } else {
        toast.error('Failed', data.error || 'Could not claim reward');
      }
    } catch (error) {
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
  const completedCount = quests.filter(q => q.status === 'claimed').length;
  const activeCount = quests.filter(q => q.status !== 'claimed').length;
  const totalXPAvailable = quests.filter(q => q.status !== 'claimed').reduce((sum, q) => sum + (q.xp_reward || 0), 0);

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
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
              <XPBar currentXP={user?.xp || 0} level={calculateLevel(user?.xp || 0)} />
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
        <FilterTabs
          tabs={[
            { id: 'all', label: 'All', count: quests.length },
            { id: 'active', label: 'Active', count: activeCount },
            { id: 'completed', label: 'Completed', count: completedCount },
          ]}
          activeFilter={filter}
          onFilterChange={setFilter}
          variant="violet"
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
