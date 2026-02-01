import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  BriefcaseIcon,
  ZapIcon,
  SparklesIcon,
  ChevronLeftIcon,
  TrophyIcon,
  CheckIcon,
  ClockIcon,
  StarIcon,
  RefreshCwIcon,
  FlameIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles, calculateLevel } from '../utils/gamification';
import { FloatingXP, LevelUpCelebration, AchievementUnlock } from '../components/gamification/Confetti';
import {
  formatMoney,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
  DEFAULT_LOCALE,
  TIMEZONE,
  calculateJobHours,
  DEFAULTS,
  isToday,
  isTomorrow,
  getSGDateString,
} from '../utils/constants';

// Quest type config
const questTypeConfig = {
  daily: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', icon: ClockIcon },
  weekly: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/30', icon: StarIcon },
  special: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: SparklesIcon },
  repeatable: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: RefreshCwIcon },
  challenge: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: FlameIcon },
};

// Animated Quest Card for Homepage
function HomeQuestCard({ quest, onComplete, isCompleting, onAnimationComplete }) {
  const [isExiting, setIsExiting] = useState(false);
  const config = questTypeConfig[quest.type] || questTypeConfig.daily;
  const Icon = config.icon;
  
  const isClaimable = quest.status === 'claimable';
  const isCheckinQuest = quest.requirement?.type === 'checkin' || 
                         quest.title?.toLowerCase().includes('check') ||
                         quest.title?.toLowerCase().includes('login') ||
                         quest.title?.toLowerCase().includes('daily');
  const canCheckin = isCheckinQuest && quest.status !== 'claimed' && !isClaimable && quest.progress < quest.target;

  const handleClick = async () => {
    if (isCompleting) return;
    
    // Start exit animation
    setIsExiting(true);
    
    // Trigger the action
    await onComplete(quest, isClaimable ? 'claim' : 'checkin');
    
    // Wait for animation then notify parent
    setTimeout(() => {
      onAnimationComplete(quest.id);
    }, 400);
  };

  const canInteract = isClaimable || canCheckin;
  if (!canInteract && quest.status === 'claimed') return null;

  return (
    <div
      onClick={canInteract ? handleClick : undefined}
      className={clsx(
        'relative p-4 rounded-2xl transition-all duration-400 ease-out',
        isExiting && 'opacity-0 scale-95 -translate-y-2',
        canInteract ? 'cursor-pointer active:scale-[0.98]' : '',
        isClaimable
          ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40'
          : canCheckin
            ? 'bg-gradient-to-r from-cyan-500/10 to-violet-500/10 border border-cyan-500/30'
            : 'bg-[#0a1628]/80 border border-white/[0.05]'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className={clsx(
          'w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0',
          isClaimable ? 'bg-emerald-500/30' : canCheckin ? 'bg-cyan-500/30' : config.bg
        )}>
          {isCompleting ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Icon className={clsx('h-6 w-6', isClaimable ? 'text-emerald-400' : canCheckin ? 'text-cyan-400' : config.color)} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {isClaimable && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
                READY!
              </span>
            )}
            {canCheckin && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/30 text-cyan-400 text-xs font-bold">
                TAP
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white text-sm">{quest.title}</h3>
          
          {/* Mini progress */}
          {!isClaimable && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
                  style={{ width: `${Math.min((quest.progress / quest.target) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-white/40">{quest.progress}/{quest.target}</span>
            </div>
          )}
        </div>

        {/* XP Reward */}
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-500/20">
          <ZapIcon className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-bold text-violet-400">+{quest.xp_reward}</span>
        </div>
      </div>
    </div>
  );
}

// League Header Card - Main pool-style banner
function LeagueCard({ user, userLevel, userXP, thisMonthEarnings, totalJobs, poolEndsIn, xpAnimating }) {
  const levelTitle = levelTitles[userLevel] || 'Newcomer';
  
  // XP progress calculations
  const maxLevel = xpThresholds.length;
  const currentThreshold = xpThresholds[userLevel - 1] || 0;
  const nextThreshold = xpThresholds[userLevel] || xpThresholds[maxLevel - 1];
  const xpInLevel = Math.max(0, userXP - currentThreshold);
  const xpNeeded = Math.max(1, nextThreshold - currentThreshold);
  const progress = userLevel >= maxLevel ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);
  
  return (
    <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden">
      {/* Background with gradient and glow effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] -translate-x-1/2 -translate-y-1/2" />
      
      {/* Border glow effect */}
      <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />
      
      {/* Content */}
      <div className="relative p-5">
        {/* Top row - User info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <p className="text-white/60 text-sm">Welcome back</p>
            <p className="text-white font-semibold text-lg">{user?.name || 'Worker'}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">Online</span>
          </div>
        </div>

        {/* League Title Banner */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-10 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {levelTitle} League
              <span className="text-2xl">🏆</span>
            </h1>
            <p className="text-white/50 text-sm">Level {userLevel} • {userXP.toLocaleString()} XP</p>
          </div>
        </div>

        {/* XP Progress Bar - with animation support */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/50">Level Progress</span>
            <span className="text-white">
              <span className={clsx('font-bold transition-all duration-500', xpAnimating ? 'text-emerald-300 scale-110' : 'text-emerald-400')}>
                {xpInLevel.toLocaleString()}
              </span>
              <span className="text-white/30"> / {xpNeeded.toLocaleString()} XP</span>
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 transition-all',
                xpAnimating ? 'duration-1000' : 'duration-500'
              )}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
          <p className="text-xs text-white/40 mt-1.5 text-right">
            {(xpNeeded - xpInLevel).toLocaleString()} XP to {levelTitles[userLevel + 1] || 'Max Level'}
          </p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-3 gap-3">
          <StatPod label="This Month" value={`$${formatMoney(thisMonthEarnings)}`} emoji="💰" color="emerald" />
          <StatPod label="Jobs Done" value={totalJobs.toString()} emoji="📋" color="violet" />
          <StatPod label="Next Payout" value={poolEndsIn} emoji="⏰" color="cyan" />
        </div>
      </div>
    </div>
  );
}

// Stat Pod Component - Glass morphism style
function StatPod({ label, value, emoji, color = 'emerald' }) {
  const colorClasses = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
  };

  return (
    <div className={clsx('relative rounded-2xl p-4 border backdrop-blur-sm bg-gradient-to-br', colorClasses[color])}>
      <p className="text-white/50 text-xs mb-1 flex items-center gap-1.5">{label} <span>{emoji}</span></p>
      <p className="text-white font-bold text-lg">{value}</p>
    </div>
  );
}

// Activity Item for the feed
function ActivityItem({ job }) {
  const slotsLeft = job.total_slots - job.filled_slots;
  const startTime = job.start_time || DEFAULT_START_TIME;
  const hours = calculateJobHours(startTime, job.end_time || DEFAULT_END_TIME, job.break_minutes);
  const totalPay = hours * job.pay_rate;
  const jobDate = new Date(job.job_date);
  const isJobToday = isToday(job.job_date);
  const isJobTomorrow = isTomorrow(job.job_date);

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors rounded-xl group"
    >
      <div className="relative">
        <div className={clsx(
          'w-12 h-12 rounded-2xl flex items-center justify-center',
          job.featured ? 'bg-gradient-to-br from-emerald-500 to-cyan-500' : 'bg-gradient-to-br from-slate-700 to-slate-800'
        )}>
          <BriefcaseIcon className="h-5 w-5 text-white" />
        </div>
        {job.featured && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
            <ZapIcon className="h-2.5 w-2.5 text-amber-900" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs font-mono">{job.client_name?.substring(0, 12) || 'Client'}...</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40 text-xs">
            {isJobToday ? 'Today' : isJobTomorrow ? 'Tomorrow' : jobDate.toLocaleDateString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', timeZone: TIMEZONE })}
          </span>
        </div>
        <h4 className="text-white font-medium truncate mt-0.5">{job.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            slotsLeft <= 3 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
          )}>
            {slotsLeft <= 3 ? `${slotsLeft} left` : 'Open'}
          </span>
        </div>
      </div>

      <div className="text-right">
        <p className="text-emerald-400 font-bold text-lg">${formatMoney(totalPay)}</p>
        <p className="text-white/40 text-xs">{hours.toFixed(1)}h</p>
      </div>
    </Link>
  );
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4 text-white/60" />
      </button>
      <span className="text-white/40 text-sm">Prev</span>
      {[...Array(totalPages)].map((_, i) => (
        <button
          key={i}
          onClick={() => onPageChange(i + 1)}
          className={clsx(
            'w-7 h-7 rounded-lg text-sm font-medium transition-all',
            currentPage === i + 1 ? 'bg-white text-slate-900' : 'text-white/40 hover:text-white hover:bg-white/5'
          )}
        >
          {i + 1}
        </button>
      ))}
      <span className="text-white/40 text-sm">Next</span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1 rounded-lg hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRightIcon className="h-4 w-4 text-white/60" />
      </button>
    </div>
  );
}

// Main Home Component
export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const ws = useWebSocket();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [quests, setQuests] = useState([]);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [completingQuest, setCompletingQuest] = useState(null);
  const [xpAnimating, setXpAnimating] = useState(false);
  const jobsPerPage = 5;

  // Gamification animation states
  const [xpGain, setXpGain] = useState({ amount: 0, trigger: 0 });
  const [levelUp, setLevelUp] = useState({ show: false, level: 1 });
  const [achievementUnlock, setAchievementUnlock] = useState({ show: false, achievement: null });

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!ws) return;
    const unsubJob = ws.subscribe('job_created', (data) => {
      if (data.job) {
        setJobs(prev => [data.job, ...prev]);
        toast.info('New Job Available!', data.job.title);
      }
    });
    const unsubXP = ws.subscribe('xp_earned', (data) => {
      if (data.amount) setXpGain({ amount: data.amount, trigger: Date.now() });
    });
    const unsubLevelUp = ws.subscribe('level_up', (data) => {
      if (data.newLevel) setLevelUp({ show: true, level: data.newLevel });
    });
    return () => { unsubJob?.(); unsubXP?.(); unsubLevelUp?.(); };
  }, [ws, toast]);

  const fetchData = async () => {
    try {
      const [jobsRes, paymentsRes, questsRes] = await Promise.all([
        fetch('/api/v1/jobs?status=open&limit=20'),
        user ? fetch(`/api/v1/payments?candidate_id=${user.id}&limit=10`) : Promise.resolve({ json: () => ({ data: [] }) }),
        user ? fetch(`/api/v1/gamification/quests/user/${user.id}`) : Promise.resolve({ json: () => ({ data: [] }) }),
      ]);

      const jobsData = await jobsRes.json();
      const paymentsData = await paymentsRes.json();
      const questsData = await questsRes.json();

      if (jobsData.success) {
        const sorted = [...jobsData.data].sort((a, b) => (b.featured || 0) - (a.featured || 0));
        setJobs(sorted);
      }

      if (paymentsData.success) {
        const nowSG = getSGDateString();
        const currentMonth = nowSG.substring(0, 7);
        const monthlyTotal = (paymentsData.data || [])
          .filter(p => {
            const paymentMonth = getSGDateString(p.created_at).substring(0, 7);
            return p.status === 'paid' && paymentMonth === currentMonth;
          })
          .reduce((sum, p) => sum + p.total_amount, 0);
        setThisMonthEarnings(monthlyTotal);
      }

      if (questsData.success) {
        // Filter to show only actionable quests (claimable or can check-in)
        const actionable = (questsData.data || []).filter(q => {
          if (q.status === 'claimed') return false;
          if (q.status === 'claimable') return true;
          // Check if it's a checkin quest that can be completed
          const isCheckin = q.requirement?.type === 'checkin' || 
                           q.title?.toLowerCase().includes('check') ||
                           q.title?.toLowerCase().includes('login') ||
                           q.title?.toLowerCase().includes('daily');
          return isCheckin && q.progress < q.target;
        });
        
        const sorted = actionable.sort((a, b) => {
          const order = { claimable: 0, in_progress: 1, available: 2 };
          return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });
        setQuests(sorted.slice(0, 3)); // Show max 3 quests
      }
    } catch (error) {
      toast.error('Failed to load', 'Pull down to refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestComplete = async (quest, action) => {
    setCompletingQuest(quest.id);
    
    try {
      let res;
      if (action === 'claim') {
        res = await fetch(`/api/v1/gamification/quests/${quest.id}/claim`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: user.id }),
        });
      } else {
        // Check-in action
        res = await fetch(`/api/v1/gamification/quests/${quest.id}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: user.id, increment: 1 }),
        });
      }
      
      const data = await res.json();
      if (data.success) {
        // Trigger XP bar animation
        setXpAnimating(true);
        setTimeout(() => setXpAnimating(false), 1500);
        
        // Show floating XP
        setXpGain({ amount: quest.xp_reward, trigger: Date.now() });
        
        toast.success(
          action === 'claim' ? 'Quest Complete!' : 'Checked In!', 
          `+${quest.xp_reward} XP earned`
        );
        
        // Refresh user data for updated XP
        refreshUser();
      } else {
        toast.error('Failed', data.error || 'Please try again');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    } finally {
      setCompletingQuest(null);
    }
  };

  const handleQuestAnimationComplete = (questId) => {
    setQuests(prev => prev.filter(q => q.id !== questId));
  };

  const userXP = user?.xp || DEFAULTS.xp;
  const userLevel = calculateLevel(userXP);
  const totalJobs = user?.total_jobs_completed || 0;

  const getNextPayout = () => {
    const now = new Date();
    const daysUntilSunday = 7 - now.getDay();
    const hours = 23 - now.getHours();
    return `${daysUntilSunday}d : ${hours}h`;
  };

  const totalPages = Math.ceil(jobs.length / jobsPerPage);
  const paginatedJobs = jobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      <div>
        {/* League Hero Card */}
        <LeagueCard
          user={user}
          userLevel={userLevel}
          userXP={userXP}
          thisMonthEarnings={thisMonthEarnings}
          totalJobs={totalJobs}
          poolEndsIn={getNextPayout()}
          xpAnimating={xpAnimating}
        />

        {/* Daily Quests Section */}
        {quests.length > 0 && (
          <div className="px-4 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold flex items-center gap-2">
                Daily Quests <span className="text-lg">🎯</span>
              </h2>
              <Link to="/quests" className="text-emerald-400 text-sm font-medium">
                View All →
              </Link>
            </div>
            <div className="space-y-3 transition-all duration-300">
              {quests.map(quest => (
                <HomeQuestCard
                  key={quest.id}
                  quest={quest}
                  onComplete={handleQuestComplete}
                  isCompleting={completingQuest === quest.id}
                  onAnimationComplete={handleQuestAnimationComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Job Activity Feed */}
        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold text-lg">Job Activity</h2>
              <span className="text-2xl">📋</span>
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0a1628]/50 overflow-hidden">
            {loading ? (
              <div className="p-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse mb-3" />
                ))}
              </div>
            ) : paginatedJobs.length === 0 ? (
              <div className="text-center py-16">
                <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-white/20" />
                <h3 className="text-white font-semibold mb-1">No jobs available</h3>
                <p className="text-white/40 text-sm">Check back soon for new opportunities</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {paginatedJobs.map((job) => (
                  <ActivityItem key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gamification Animations */}
      <FloatingXP amount={xpGain.amount} trigger={xpGain.trigger} />
      <LevelUpCelebration show={levelUp.show} level={levelUp.level} onClose={() => setLevelUp({ show: false, level: 1 })} />
      <AchievementUnlock show={achievementUnlock.show} achievement={achievementUnlock.achievement} onClose={() => setAchievementUnlock({ show: false, achievement: null })} />
    </div>
  );
}
