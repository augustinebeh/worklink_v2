import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  BriefcaseIcon,
  ZapIcon,
  SparklesIcon,
  ChevronLeftIcon,
  WalletIcon,
  CalendarIcon,
  TrophyIcon,
  UsersIcon,
  CheckIcon,
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

// Availability Quick Selector
function AvailabilitySelector({ user, onUpdate }) {
  const [selected, setSelected] = useState(user?.availability_mode || 'weekdays');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const options = [
    { id: 'weekdays', label: 'Weekdays', desc: 'Mon-Fri' },
    { id: 'weekends', label: 'Weekends', desc: 'Sat-Sun' },
    { id: 'all', label: 'All Week', desc: 'Every day' },
    { id: 'custom', label: 'Custom', desc: 'Pick days' },
  ];

  const handleSelect = async (mode) => {
    if (mode === 'custom') {
      // Navigate to calendar for custom selection
      window.location.href = '/calendar';
      return;
    }
    
    if (mode === selected) return;
    
    setSaving(true);
    setSelected(mode);
    
    try {
      const res = await fetch(`/api/v1/candidates/${user.id}/availability-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Availability Updated', `Set to ${options.find(o => o.id === mode)?.label}`);
        onUpdate?.();
      }
    } catch (error) {
      toast.error('Failed', 'Could not update availability');
      setSelected(user?.availability_mode || 'weekdays');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          My Availability <span className="text-lg">📅</span>
        </h2>
        <Link to="/calendar" className="text-emerald-400 text-sm font-medium">
          View Calendar →
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleSelect(opt.id)}
            disabled={saving}
            className={clsx(
              'p-3 rounded-2xl border transition-all text-center',
              selected === opt.id
                ? 'bg-emerald-500/20 border-emerald-500/40 ring-2 ring-emerald-500/30'
                : 'bg-[#0a1628]/80 border-white/[0.05] hover:border-white/10'
            )}
          >
            <div className={clsx(
              'text-sm font-semibold',
              selected === opt.id ? 'text-emerald-400' : 'text-white'
            )}>
              {opt.label}
            </div>
            <div className="text-xs text-white/40 mt-0.5">{opt.desc}</div>
            {selected === opt.id && (
              <CheckIcon className="h-4 w-4 text-emerald-400 mx-auto mt-1" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// League Header Card - Main pool-style banner
function LeagueCard({ user, userLevel, userXP, thisMonthEarnings, totalJobs, poolEndsIn }) {
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

        {/* XP Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white/50">Level Progress</span>
            <span className="text-white">
              <span className="text-emerald-400 font-bold">{xpInLevel.toLocaleString()}</span>
              <span className="text-white/30"> / {xpNeeded.toLocaleString()} XP</span>
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 transition-all duration-500"
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

// Quick Action Button
function QuickAction({ icon: Icon, label, to, badge, color = 'slate' }) {
  const colorClasses = {
    slate: 'bg-slate-800/50 hover:bg-slate-700/50 border-white/5',
    emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20',
    violet: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20',
    amber: 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20',
  };

  return (
    <Link
      to={to}
      className={clsx('flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95', colorClasses[color])}
    >
      <div className="relative">
        <Icon className="h-6 w-6 text-white" />
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-white/70 text-xs font-medium">{label}</span>
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
        const sorted = (questsData.data || [])
          .filter(q => q.status !== 'claimed')
          .sort((a, b) => {
            const order = { claimable: 0, in_progress: 1, available: 2 };
            return (order[a.status] ?? 3) - (order[b.status] ?? 3);
          });
        setQuests(sorted.slice(0, 3));
      }
    } catch (error) {
      toast.error('Failed to load', 'Pull down to refresh');
    } finally {
      setLoading(false);
    }
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
        />

        {/* Availability Selector */}
        <AvailabilitySelector user={user} onUpdate={refreshUser} />

        {/* Quick Actions */}
        <div className="px-4 mt-6">
          <div className="grid grid-cols-4 gap-3">
            <QuickAction icon={WalletIcon} label="Wallet" to="/wallet" color="emerald" />
            <QuickAction icon={CalendarIcon} label="Calendar" to="/calendar" color="violet" />
            <QuickAction icon={TrophyIcon} label="Quests" to="/quests" badge={quests.length || null} color="amber" />
            <QuickAction icon={UsersIcon} label="Referrals" to="/referrals" color="slate" />
          </div>
        </div>

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

        {/* Floating Quest CTA */}
        <div className="fixed bottom-24 left-4">
          <Link
            to="/quests"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-500/30 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <TrophyIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Daily Quests</p>
              <p className="text-violet-200 text-xs">Earn bonus XP</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Gamification Animations */}
      <FloatingXP amount={xpGain.amount} trigger={xpGain.trigger} />
      <LevelUpCelebration show={levelUp.show} level={levelUp.level} onClose={() => setLevelUp({ show: false, level: 1 })} />
      <AchievementUnlock show={achievementUnlock.show} achievement={achievementUnlock.achievement} onClose={() => setAchievementUnlock({ show: false, achievement: null })} />
    </div>
  );
}
