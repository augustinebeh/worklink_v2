import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  BriefcaseIcon,
  ZapIcon,
  FlameIcon,
  BellIcon,
  GiftIcon,
  CalendarIcon,
  ArrowDownLeftIcon,
  TrendingUpIcon,
  SparklesIcon,
  EyeIcon,
  EyeOffIcon,
  HistoryIcon,
  StarIcon,
  ClockIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles } from '../utils/gamification';
import { FloatingXP, LevelUpCelebration, AchievementUnlock } from '../components/gamification/Confetti';

// Format money helper
const formatMoney = (amount) => Number(amount || 0).toFixed(2);

// Quick Action Button (Crypto.com style circular)
function QuickActionCircle({ icon: Icon, label, onClick, color = 'primary', isDark }) {
  const colors = {
    primary: 'bg-primary-500/20 text-primary-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={clsx(
        'w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95',
        colors[color]
      )}>
        <Icon className="h-6 w-6" />
      </div>
      <span className={clsx('text-xs font-medium', isDark ? 'text-dark-300' : 'text-slate-600')}>{label}</span>
    </button>
  );
}

// Portfolio Card (Job as asset)
function JobAssetCard({ job, isDark }) {
  const slotsLeft = job.total_slots - job.filled_slots;
  const startTime = job.start_time || '09:00';
  const endTime = job.end_time || '17:00';
  const start = startTime.split(':').map(Number);
  let end = endTime.split(':').map(Number);
  if (end[0] < start[0]) end[0] += 24;
  const hours = ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1]) - (job.break_minutes || 0)) / 60;
  const totalPay = hours * job.pay_rate;
  const jobDate = new Date(job.job_date);
  const isToday = jobDate.toDateString() === new Date().toDateString();
  const isTomorrow = jobDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

  return (
    <Link
      to={`/jobs/${job.id}`}
      className={clsx(
        'flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.99]',
        isDark
          ? 'bg-dark-900/80 border-white/5 hover:border-primary-500/30'
          : 'bg-white border-slate-200 hover:border-primary-500/30 shadow-sm'
      )}
    >
      {/* Job Icon */}
      <div className={clsx(
        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
        job.featured ? 'bg-gradient-to-br from-primary-500 to-violet-500' : isDark ? 'bg-dark-800' : 'bg-slate-100'
      )}>
        <BriefcaseIcon className={clsx('h-6 w-6', job.featured ? 'text-white' : isDark ? 'text-white' : 'text-slate-600')} />
      </div>

      {/* Job Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={clsx('font-semibold truncate', isDark ? 'text-white' : 'text-slate-900')}>{job.title}</h4>
          {job.featured === 1 && (
            <ZapIcon className="h-4 w-4 text-primary-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>
            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : jobDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
          </span>
          <span className={isDark ? 'text-dark-600' : 'text-slate-300'}>•</span>
          <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>{startTime}</span>
          {slotsLeft <= 3 && (
            <>
              <span className={isDark ? 'text-dark-600' : 'text-slate-300'}>•</span>
              <span className="text-xs text-red-400 font-medium">{slotsLeft} left</span>
            </>
          )}
        </div>
      </div>

      {/* Pay */}
      <div className="text-right flex-shrink-0">
        <p className={clsx('font-bold', isDark ? 'text-white' : 'text-slate-900')}>${formatMoney(totalPay)}</p>
        <p className="text-xs text-emerald-500">+{hours.toFixed(1)}h</p>
      </div>
    </Link>
  );
}

// Transaction/Activity Item
function ActivityItem({ title, subtitle, amount, time, positive = true, isDark }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className={clsx(
        'w-10 h-10 rounded-full flex items-center justify-center',
        positive ? 'bg-emerald-500/20' : isDark ? 'bg-dark-800' : 'bg-slate-100'
      )}>
        {positive ? (
          <ArrowDownLeftIcon className="h-5 w-5 text-emerald-400" />
        ) : (
          <ClockIcon className={clsx('h-5 w-5', isDark ? 'text-dark-400' : 'text-slate-400')} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium truncate', isDark ? 'text-white' : 'text-slate-900')}>{title}</p>
        <p className={clsx('text-sm', isDark ? 'text-dark-500' : 'text-slate-500')}>{subtitle}</p>
      </div>
      <div className="text-right">
        <p className={clsx('font-semibold', positive ? 'text-emerald-400' : isDark ? 'text-white' : 'text-slate-900')}>
          {positive ? '+' : ''}${formatMoney(amount)}
        </p>
        <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-500')}>{time}</p>
      </div>
    </div>
  );
}

// Main Home Component
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ws = useWebSocket();
  const { isDark } = useTheme();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balanceHidden, setBalanceHidden] = useState(false);

  // Gamification animation states
  const [xpGain, setXpGain] = useState({ amount: 0, trigger: 0 });
  const [levelUp, setLevelUp] = useState({ show: false, level: 1 });
  const [achievementUnlock, setAchievementUnlock] = useState({ show: false, achievement: null });

  useEffect(() => {
    fetchData();
  }, [user]);

  // Listen for real-time updates
  useEffect(() => {
    if (!ws) return;

    const unsubJob = ws.subscribe('job_created', (data) => {
      if (data.job) {
        setJobs(prev => [data.job, ...prev].slice(0, 5));
        toast.info('New Job Available!', data.job.title);
      }
    });

    const unsubXP = ws.subscribe('xp_earned', (data) => {
      if (data.amount) {
        setXpGain({ amount: data.amount, trigger: Date.now() });
      }
    });

    const unsubLevelUp = ws.subscribe('level_up', (data) => {
      if (data.newLevel) {
        setLevelUp({ show: true, level: data.newLevel });
      }
    });

    return () => {
      unsubJob?.();
      unsubXP?.();
      unsubLevelUp?.();
    };
  }, [ws, toast]);

  const fetchData = async () => {
    try {
      const [jobsRes, paymentsRes] = await Promise.all([
        fetch('/api/v1/jobs?status=open&limit=5'),
        user ? fetch(`/api/v1/payments?candidate_id=${user.id}&limit=3`) : Promise.resolve({ json: () => ({ data: [] }) }),
      ]);

      const jobsData = await jobsRes.json();
      const paymentsData = await paymentsRes.json();

      if (jobsData.success) {
        const sorted = [...jobsData.data].sort((a, b) => (b.featured || 0) - (a.featured || 0));
        setJobs(sorted.slice(0, 5));
      }

      if (paymentsData.success) {
        setRecentPayments(paymentsData.data?.slice(0, 3) || []);
      }
    } catch (error) {
      toast.error('Failed to load', 'Pull down to refresh');
    } finally {
      setLoading(false);
    }
  };

  // Safe user data with defaults
  const userName = user?.name?.split(' ')[0] || 'Friend';
  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const userStreak = user?.streak_days || 0;
  const totalEarnings = user?.total_earnings || 0;
  const pendingPayment = user?.pending_payment || 0;
  const weeklyChange = 12.5; // Mock weekly change percentage

  // Level progress
  const currentThreshold = xpThresholds[userLevel - 1] || 0;
  const nextThreshold = xpThresholds[userLevel] || xpThresholds[xpThresholds.length - 1];
  const xpInLevel = userXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = userLevel >= 10 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className="px-4 pt-safe pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white font-bold">
              {userName.charAt(0)}
            </div>
            <div>
              <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>Welcome back</p>
              <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{userName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Level Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/30">
              <StarIcon className="h-4 w-4 text-primary-400" />
              <span className="text-sm font-bold text-primary-400">Lv.{userLevel}</span>
            </div>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className={clsx(
                'relative p-2.5 rounded-full transition-colors',
                isDark ? 'bg-dark-800/80 text-dark-400 hover:text-white' : 'bg-white text-slate-500 hover:text-slate-900 shadow-sm'
              )}
            >
              <BellIcon className="h-5 w-5" />
              {ws?.unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Balance Card - Crypto.com style */}
      <div className="px-4 py-6">
        <div className={clsx(
          'relative overflow-hidden rounded-3xl p-6 border',
          isDark
            ? 'bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#1a1a3e] border-white/5'
            : 'bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 border-primary-500/20'
        )}>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            {/* Total Balance Label */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white/70 text-sm">Total Balance</span>
                <button onClick={() => setBalanceHidden(!balanceHidden)} className="text-white/50">
                  {balanceHidden ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20">
                <TrendingUpIcon className="h-3 w-3 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">+{weeklyChange}%</span>
              </div>
            </div>

            {/* Balance Amount */}
            <div className="mb-6">
              <p className="text-4xl font-bold text-white tracking-tight">
                {balanceHidden ? '••••••' : `$${formatMoney(totalEarnings)}`}
              </p>
              <p className="text-white/60 text-sm mt-1">
                SGD • <span className="text-amber-400">${formatMoney(pendingPayment)} pending</span>
              </p>
            </div>

            {/* XP Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-white/70">{levelTitles[userLevel]}</span>
                <span className="text-primary-300">{xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-400 to-violet-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between">
              <QuickActionCircle
                icon={BriefcaseIcon}
                label="Find Jobs"
                onClick={() => navigate('/jobs')}
                color="primary"
                isDark={true}
              />
              <QuickActionCircle
                icon={CalendarIcon}
                label="Availability"
                onClick={() => navigate('/calendar')}
                color="blue"
                isDark={true}
              />
              <QuickActionCircle
                icon={GiftIcon}
                label="Refer"
                onClick={() => navigate('/referrals')}
                color="green"
                isDark={true}
              />
              <QuickActionCircle
                icon={HistoryIcon}
                label="History"
                onClick={() => navigate('/wallet')}
                color="purple"
                isDark={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Streak Banner */}
      {userStreak > 0 && (
        <div className="px-4 mb-4">
          <div className={clsx(
            'flex items-center gap-3 p-3 rounded-2xl border',
            isDark
              ? 'bg-gradient-to-r from-orange-900/30 to-amber-900/20 border-orange-500/20'
              : 'bg-gradient-to-r from-orange-100 to-amber-50 border-orange-200'
          )}>
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <FlameIcon className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{userStreak} Day Streak!</p>
              <p className="text-xs text-orange-500">Keep it going for bonus XP</p>
            </div>
            <ChevronRightIcon className={clsx('h-5 w-5', isDark ? 'text-dark-500' : 'text-slate-400')} />
          </div>
        </div>
      )}

      {/* Available Jobs Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Available Jobs</h2>
          <Link to="/jobs" className="flex items-center gap-1 text-sm text-primary-500">
            View all
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={clsx('h-20 rounded-2xl animate-pulse', isDark ? 'bg-dark-800/50' : 'bg-slate-200')} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className={clsx(
            'text-center py-12 rounded-2xl border',
            isDark ? 'bg-dark-900/50 border-white/5' : 'bg-white border-slate-200'
          )}>
            <SparklesIcon className={clsx('h-12 w-12 mx-auto mb-3', isDark ? 'text-dark-600' : 'text-slate-300')} />
            <h3 className={clsx('font-semibold mb-1', isDark ? 'text-white' : 'text-slate-900')}>No jobs available</h3>
            <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>Check back soon for new opportunities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobAssetCard key={job.id} job={job} isDark={isDark} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentPayments.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Recent Activity</h2>
            <Link to="/wallet" className="flex items-center gap-1 text-sm text-primary-500">
              See all
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className={clsx(
            'rounded-2xl border divide-y overflow-hidden',
            isDark ? 'bg-dark-900/50 border-white/5 divide-white/5' : 'bg-white border-slate-200 divide-slate-100'
          )}>
            {recentPayments.map((payment) => (
              <div key={payment.id} className="px-4">
                <ActivityItem
                  title={payment.job_title || 'Job Payment'}
                  subtitle={payment.status === 'paid' ? 'Completed' : 'Processing'}
                  amount={payment.total_amount}
                  time={new Date(payment.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                  positive={payment.status === 'paid'}
                  isDark={isDark}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promo Banner */}
      <div className="px-4 mb-6">
        <Link
          to="/referrals"
          className={clsx(
            'block relative overflow-hidden rounded-2xl border p-4',
            isDark
              ? 'bg-gradient-to-r from-emerald-900/50 to-teal-900/30 border-emerald-500/20'
              : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
          )}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <GiftIcon className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className={clsx('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>Refer & Earn $30</p>
              <p className="text-sm text-emerald-500">Invite friends, both get rewarded</p>
            </div>
            <ChevronRightIcon className={clsx('h-5 w-5', isDark ? 'text-dark-500' : 'text-slate-400')} />
          </div>
        </Link>
      </div>

      {/* Gamification Animations */}
      <FloatingXP amount={xpGain.amount} trigger={xpGain.trigger} />
      <LevelUpCelebration
        show={levelUp.show}
        level={levelUp.level}
        onClose={() => setLevelUp({ show: false, level: 1 })}
      />
      <AchievementUnlock
        show={achievementUnlock.show}
        achievement={achievementUnlock.achievement}
        onClose={() => setAchievementUnlock({ show: false, achievement: null })}
      />
    </div>
  );
}
