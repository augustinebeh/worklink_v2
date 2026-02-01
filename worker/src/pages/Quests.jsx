import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SwordIcon,
  ZapIcon,
  CheckCircleIcon,
  ClockIcon,
  GiftIcon,
  StarIcon,
  TrophyIcon,
  FlameIcon,
  TargetIcon,
  RefreshCwIcon,
  Loader2Icon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { QUEST_TYPE_LABELS, TIMEZONE } from '../utils/constants';

const questTypeConfig = {
  daily: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  weekly: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  special: { color: 'text-gold-400', bg: 'bg-gold-500/20', border: 'border-gold-500/30' },
  repeatable: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  challenge: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

function QuestCard({ quest, onClaim, claiming, isDark }) {
  const navigate = useNavigate();
  const config = questTypeConfig[quest.type] || questTypeConfig.daily;
  const typeLabel = QUEST_TYPE_LABELS[quest.type] || QUEST_TYPE_LABELS.daily;
  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;

  // Status logic:
  // - 'claimed': XP has been claimed, show strikethrough
  // - 'claimable': progress >= target, ready to claim
  // - 'in_progress': started but not complete
  // - 'available': not started
  const isClaimed = quest.status === 'claimed';
  const isClaimable = quest.status === 'claimable';
  const isInProgress = quest.status === 'in_progress';

  // Navigate to related page based on quest type
  const handleQuestClick = () => {
    if (isClaimed || isClaimable) return;

    const requirement = quest.requirement || {};
    const reqType = requirement.type || '';

    if (reqType === 'jobs_completed' || reqType === 'accept_job') {
      navigate('/jobs');
    } else if (reqType === 'training_completed') {
      navigate('/training');
    } else if (reqType === 'referral') {
      navigate('/referrals');
    } else if (reqType === 'streak' || reqType === 'daily_check_in' || reqType === 'check_in') {
      // Daily check-in quest - already counted by visiting quests page
      // Show feedback to user
      return;
    } else if (reqType === 'profile_complete') {
      navigate('/complete-profile');
    } else if (reqType === 'rating' || reqType === 'five_star' || reqType === 'review' || reqType === 'five_star_rating') {
      // Rating quests are completed when the user receives a 5-star rating from employers
      // Can't navigate anywhere - this is tracked automatically by the system
      return;
    } else if (reqType === 'hours_worked') {
      navigate('/wallet'); // Show work history
    }
  };

  return (
    <div
      onClick={handleQuestClick}
      className={clsx(
        'p-4 rounded-2xl border transition-all',
        isClaimed
          ? (isDark ? 'bg-dark-800/30 border-white/5 opacity-60' : 'bg-slate-100/50 border-slate-200 opacity-60')
          : isClaimable
            ? 'bg-gold-900/20 border-gold-500/30 animate-pulse cursor-default'
            : isDark
              ? 'bg-dark-800/50 border-white/5 hover:border-primary-500/30 cursor-pointer'
              : 'bg-white border-slate-200 shadow-sm hover:border-primary-300 cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              config.bg, config.color
            )}>
              {typeLabel}
            </span>
            {isClaimed && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 text-xs">
                <CheckCircleIcon className="h-3 w-3" />
                Claimed
              </span>
            )}
            {isClaimable && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 text-xs">
                <GiftIcon className="h-3 w-3" />
                Ready!
              </span>
            )}
          </div>

          {/* Title & Description - Only strikethrough if CLAIMED */}
          <h3 className={clsx(
            'font-semibold text-lg',
            isClaimed
              ? (isDark ? 'text-dark-500' : 'text-slate-400') + ' line-through'
              : (isDark ? 'text-white' : 'text-slate-900')
          )}>
            {quest.title}
          </h3>
          <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>{quest.description}</p>

          {/* Progress bar - show for in-progress quests or those with target > 1 */}
          {!isClaimed && quest.target > 1 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={isDark ? 'text-dark-400' : 'text-slate-500'}>Progress</span>
                <span className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>
                  {quest.progress}/{quest.target}
                </span>
              </div>
              <div className={clsx('h-2 rounded-full overflow-hidden', isDark ? 'bg-dark-700' : 'bg-slate-200')}>
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    isClaimable ? 'bg-gold-500' : 'bg-primary-500'
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Hint for where to go */}
          {!isClaimed && !isClaimable && quest.requirement?.type && (
            <p className={clsx('text-xs mt-2', isDark ? 'text-primary-400' : 'text-primary-600')}>
              Tap to go →
            </p>
          )}
        </div>

        {/* Reward */}
        <div className="flex flex-col items-end gap-2">
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
            isClaimed
              ? (isDark ? 'bg-dark-700 text-dark-500' : 'bg-slate-200 text-slate-400')
              : 'bg-primary-500/20 text-primary-400'
          )}>
            <ZapIcon className="h-4 w-4" />
            <span className="font-bold">+{quest.xp_reward}</span>
          </div>

          {isClaimable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClaim(quest.id, quest.xp_reward);
              }}
              disabled={claiming === quest.id}
              className="px-4 py-2 rounded-lg bg-gold-500 text-dark-900 font-semibold text-sm hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {claiming === quest.id ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim!'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, isDark }) {
  return (
    <div className={clsx(
      'flex flex-col items-center p-4 rounded-xl border',
      isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    )}>
      <Icon className={clsx('h-6 w-6 mb-2', color)} />
      <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{value}</p>
      <p className={clsx('text-xs text-center', isDark ? 'text-dark-500' : 'text-slate-500')}>{label}</p>
    </div>
  );
}

// Calculate time until midnight Singapore time
function getTimeUntilReset() {
  const now = new Date();
  // Get current time in Singapore
  const sgTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));

  // Get midnight Singapore time tomorrow
  const midnight = new Date(sgTime);
  midnight.setDate(midnight.getDate() + 1);
  midnight.setHours(0, 0, 0, 0);

  // Calculate difference
  const diff = midnight - sgTime;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export default function Quests() {
  const { user, refreshUser } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();
  const [quests, setQuests] = useState([]);
  const [stats, setStats] = useState({ completed: 0, available: 0, totalXP: 0 });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [filter, setFilter] = useState('all');
  const [resetTimer, setResetTimer] = useState(getTimeUntilReset());

  // Update reset timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setResetTimer(getTimeUntilReset());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Record daily check-in when visiting quests page
  const recordDailyCheckIn = useCallback(async () => {
    if (!user?.id) return;

    try {
      await fetch(`/api/v1/gamification/quests/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: user.id }),
      });
    } catch (error) {
      console.error('Failed to record check-in:', error);
    }
  }, [user?.id]);

  const fetchQuests = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Record daily check-in first
      await recordDailyCheckIn();

      const res = await fetch(`/api/v1/gamification/quests/user/${user.id}`);
      const data = await res.json();

      if (data.success) {
        setQuests(data.data);

        // Calculate stats from real data
        const claimed = data.data.filter(q => q.status === 'claimed').length;
        const claimable = data.data.filter(q => q.status === 'claimable').length;
        const available = data.data.filter(q => q.status === 'available' || q.status === 'in_progress').length;
        const totalXP = data.data.filter(q => q.status === 'claimed').reduce((sum, q) => sum + q.xp_reward, 0);

        setStats({
          completed: claimed,
          available: available + claimable,
          totalXP
        });
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
      toast.error('Failed to load quests');
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleClaim = async (questId, xpReward) => {
    if (!user?.id) return;

    setClaiming(questId);
    try {
      const res = await fetch(`/api/v1/gamification/quests/${questId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: user.id }),
      });

      const data = await res.json();

      if (data.success) {
        // Update local state immediately
        setQuests(prev => prev.map(q =>
          q.id === questId ? { ...q, status: 'claimed', claimed: 1 } : q
        ));

        // Update stats
        setStats(prev => ({
          ...prev,
          completed: prev.completed + 1,
          available: prev.available - 1,
          totalXP: prev.totalXP + xpReward,
        }));

        // Show success toast
        toast.success(`+${xpReward} XP Earned!`, data.data.leveled_up ? `Level Up! You're now Level ${data.data.new_level}!` : undefined);

        // Refresh user data to update XP bar across the app
        if (refreshUser) {
          await refreshUser();
        }
      } else {
        toast.error('Failed to claim', data.error);
      }
    } catch (error) {
      console.error('Failed to claim quest:', error);
      toast.error('Failed to claim reward');
    } finally {
      setClaiming(null);
    }
  };

  const filteredQuests = quests.filter(q => {
    if (filter === 'completed') return q.status === 'claimed';
    if (filter === 'available') return q.status === 'available' || q.status === 'in_progress' || q.status === 'claimable';
    if (filter === 'daily') return q.type === 'daily';
    if (filter === 'weekly') return q.type === 'weekly';
    if (filter === 'special') return q.type === 'special';
    return true;
  });

  // Sort: claimable first, then in_progress, then available, then claimed
  const sortedQuests = [...filteredQuests].sort((a, b) => {
    const statusOrder = { claimable: 0, in_progress: 1, available: 2, claimed: 3 };
    return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
  });

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-lg px-4 pt-safe pb-4 border-b',
        isDark ? 'bg-dark-950/95 border-white/5' : 'bg-white/95 border-slate-200'
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Quests</h1>
            <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>Complete quests to earn XP rewards</p>
          </div>
          <button
            onClick={fetchQuests}
            disabled={loading}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isDark ? 'bg-dark-800 text-dark-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
            )}
          >
            <RefreshCwIcon className={clsx('h-5 w-5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={TargetIcon} label="Available" value={stats.available} color="text-primary-400" isDark={isDark} />
          <StatCard icon={CheckCircleIcon} label="Claimed" value={stats.completed} color="text-accent-400" isDark={isDark} />
          <StatCard icon={ZapIcon} label="XP Earned" value={stats.totalXP} color="text-gold-400" isDark={isDark} />
        </div>

        {/* Daily Reset Timer - Dynamic */}
        <div className={clsx(
          'p-4 rounded-xl border',
          isDark
            ? 'bg-gradient-to-r from-primary-900/30 to-accent-900/30 border-primary-500/20'
            : 'bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/20">
                <ClockIcon className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>Daily Quests Reset</p>
                <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>New quests at midnight SGT</p>
              </div>
            </div>
            <div className="text-right">
              <p className={clsx('text-xl font-bold font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                {resetTimer.hours}:{resetTimer.minutes}:{resetTimer.seconds}
              </p>
              <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>remaining</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Available' },
            { id: 'daily', label: 'Daily' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'special', label: 'Special' },
            { id: 'completed', label: 'Claimed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === tab.id
                  ? 'bg-primary-500 text-white'
                  : isDark ? 'bg-dark-800 text-dark-400' : 'bg-slate-100 text-slate-500'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quest list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : sortedQuests.length === 0 ? (
          <div className="text-center py-12">
            <SwordIcon className={clsx('h-12 w-12 mx-auto mb-4', isDark ? 'text-dark-600' : 'text-slate-300')} />
            <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>
              {filter === 'completed' ? 'No quests claimed yet' : 'No quests available'}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-4 text-primary-500 text-sm font-medium"
              >
                View all quests
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedQuests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onClaim={handleClaim}
                claiming={claiming}
                isDark={isDark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
