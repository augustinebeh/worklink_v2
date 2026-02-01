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
  SparklesIcon,
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
      return;
    } else if (reqType === 'profile_complete') {
      navigate('/complete-profile');
    } else if (reqType === 'rating' || reqType === 'five_star' || reqType === 'review' || reqType === 'five_star_rating') {
      return;
    } else if (reqType === 'hours_worked') {
      navigate('/wallet');
    }
  };

  return (
    <div
      onClick={handleQuestClick}
      className={clsx(
        'relative p-4 rounded-2xl backdrop-blur-md transition-all duration-300',
        isClaimed
          ? (isDark ? 'bg-dark-800/20 border border-white/5 opacity-50' : 'bg-slate-100/50 border border-slate-200 opacity-50')
          : isClaimable
            ? 'quest-card-glow quest-card-claimable cursor-default'
            : isDark
              ? 'quest-card-glow cursor-pointer'
              : 'bg-white border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] cursor-pointer'
      )}
    >
      {/* Glow effect for claimable */}
      {isClaimable && isDark && (
        <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 blur-xl -z-10" />
      )}

      <div className="flex items-start justify-between gap-4">
        {/* Left: Icon + Content */}
        <div className="flex items-start gap-3 flex-1">
          {/* Quest Icon */}
          <div className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border',
            isClaimed
              ? (isDark ? 'bg-dark-700 border-dark-600' : 'bg-slate-100 border-slate-200')
              : isClaimable
                ? 'bg-emerald-500/20 border-emerald-500/30'
                : `${config.bg} ${config.border}`
          )}>
            {isClaimed ? (
              <CheckCircleIcon className={clsx('h-6 w-6', isDark ? 'text-dark-500' : 'text-slate-400')} />
            ) : isClaimable ? (
              <GiftIcon className="h-6 w-6 text-emerald-400" />
            ) : (
              <TargetIcon className={clsx('h-6 w-6', config.color)} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={clsx(
                'px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wide',
                config.bg, config.color
              )}>
                {typeLabel}
              </span>
              {isClaimable && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-2xs font-semibold">
                  <SparklesIcon className="h-3 w-3" />
                  Ready!
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className={clsx(
              'font-semibold',
              isClaimed
                ? (isDark ? 'text-dark-500' : 'text-slate-400') + ' line-through'
                : (isDark ? 'text-white' : 'text-slate-900')
            )}>
              {quest.title}
            </h3>
            <p className={clsx('text-sm mt-0.5 line-clamp-2', isDark ? 'text-dark-400' : 'text-slate-500')}>
              {quest.description}
            </p>

            {/* Progress bar */}
            {!isClaimed && quest.target > 1 && (
              <div className="mt-3">
                <div className={clsx(
                  'h-2 rounded-full overflow-hidden',
                  isDark ? 'bg-dark-700' : 'bg-slate-200'
                )}>
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      isClaimable
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : 'bg-gradient-to-r from-violet-500 via-primary-500 to-cyan-400'
                    )}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className={clsx('text-xs mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>
                  {quest.progress} / {quest.target}
                </p>
              </div>
            )}

            {/* Tap hint */}
            {!isClaimed && !isClaimable && quest.requirement?.type && (
              <p className={clsx('text-xs mt-2 font-medium', isDark ? 'text-primary-400' : 'text-primary-600')}>
                Tap to start →
              </p>
            )}
          </div>
        </div>

        {/* Right: XP Reward + Action */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* XP Display */}
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl border',
            isClaimed
              ? (isDark ? 'bg-dark-700 border-dark-600 text-dark-500' : 'bg-slate-100 border-slate-200 text-slate-400')
              : isClaimable
                ? 'bg-emerald-500/20 border-emerald-500/30'
                : 'bg-gradient-to-r from-violet-500/20 to-primary-500/20 border-violet-500/30'
          )}>
            <ZapIcon className={clsx(
              'h-5 w-5',
              isClaimed ? '' : 'text-amber-400'
            )} />
            <span className={clsx(
              'text-lg font-bold',
              isClaimed
                ? ''
                : isClaimable
                  ? 'text-emerald-400'
                  : 'text-violet-400'
            )}>
              +{quest.xp_reward}
            </span>
          </div>

          {/* Claim Button */}
          {isClaimable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClaim(quest.id, quest.xp_reward);
              }}
              disabled={claiming === quest.id}
              className="btn-neon-claim flex items-center gap-2"
            >
              {claiming === quest.id ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                <>
                  <GiftIcon className="h-4 w-4" />
                  <span>Claim!</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, isDark }) {
  const colorMap = {
    'text-primary-400': { bg: 'bg-primary-500/20', border: 'border-primary-500/30', glow: 'shadow-primary-500/20' },
    'text-accent-400': { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
    'text-gold-400': { bg: 'bg-amber-500/20', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
  };
  const styles = colorMap[color] || colorMap['text-primary-400'];

  return (
    <div className={clsx(
      'glass-stat-pod flex flex-col items-center text-center',
      isDark && `shadow-lg ${styles.glow}`
    )}>
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center mb-2 border',
        styles.bg, styles.border
      )}>
        <Icon className={clsx('h-5 w-5', color)} />
      </div>
      <p className={clsx(
        'text-2xl font-bold',
        isDark ? 'text-white' : 'text-slate-900'
      )}>
        {value}
      </p>
      <p className={clsx('text-xs', isDark ? 'text-dark-400' : 'text-slate-500')}>{label}</p>
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
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-transparent')}>
      {/* Header with gradient background */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-xl px-4 pt-safe pb-4',
        isDark
          ? 'bg-gradient-to-b from-dark-950/98 to-dark-950/95 border-b border-white/5'
          : 'bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
      )}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <SwordIcon className={clsx('h-6 w-6', isDark ? 'text-violet-400' : 'text-violet-500')} />
              <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Quests</h1>
            </div>
            <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>
              Complete quests to earn XP rewards
            </p>
          </div>
          <button
            onClick={fetchQuests}
            disabled={loading}
            className={clsx(
              'p-2.5 rounded-xl transition-all border',
              isDark
                ? 'bg-white/5 border-white/10 text-dark-400 hover:bg-white/10 hover:text-white'
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
            )}
          >
            <RefreshCwIcon className={clsx('h-5 w-5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Stats - Glass Pods */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={TargetIcon} label="Available" value={stats.available} color="text-primary-400" isDark={isDark} />
          <StatCard icon={CheckCircleIcon} label="Claimed" value={stats.completed} color="text-accent-400" isDark={isDark} />
          <StatCard icon={ZapIcon} label="XP Earned" value={stats.totalXP} color="text-gold-400" isDark={isDark} />
        </div>

        {/* Daily Reset Timer - Glassmorphism */}
        <div className={clsx(
          'relative p-4 rounded-2xl backdrop-blur-md border overflow-hidden',
          isDark
            ? 'bg-white/[0.03] border-white/[0.08]'
            : 'bg-white border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
        )}>
          {/* Background glow */}
          {isDark && (
            <>
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </>
          )}

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={clsx(
                'p-3 rounded-xl border',
                isDark
                  ? 'bg-violet-500/20 border-violet-500/30'
                  : 'bg-violet-100 border-violet-200'
              )}>
                <ClockIcon className={clsx('h-5 w-5', isDark ? 'text-violet-400' : 'text-violet-600')} />
              </div>
              <div>
                <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Daily Reset</p>
                <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>New quests at midnight</p>
              </div>
            </div>
            <div className="text-right">
              <p className={clsx(
                'text-2xl font-bold font-mono tracking-wider',
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              )}>
                {resetTimer.hours}:{resetTimer.minutes}:{resetTimer.seconds}
              </p>
              <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>remaining</p>
            </div>
          </div>
        </div>

        {/* Filter tabs - Glass style */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border',
                filter === tab.id
                  ? 'bg-gradient-to-r from-violet-500 to-primary-500 text-white border-transparent shadow-lg shadow-violet-500/25'
                  : isDark
                    ? 'bg-white/5 border-white/10 text-dark-400 hover:bg-white/10 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
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
