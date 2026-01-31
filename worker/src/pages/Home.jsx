import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  BriefcaseIcon,
  ZapIcon,
  FlameIcon,
  BellIcon,
  GiftIcon,
  CalendarIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  QrCodeIcon,
  ScanLineIcon,
  TrendingUpIcon,
  SparklesIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeOffIcon,
  HistoryIcon,
  StarIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles } from '../utils/gamification';
import { FloatingXP, LevelUpCelebration, AchievementUnlock } from '../components/gamification/Confetti';

// Format money helper
const formatMoney = (amount) => Number(amount || 0).toFixed(2);

// Quick Action Button (Crypto.com style circular)
function QuickActionCircle({ icon: Icon, label, onClick, color = 'primary' }) {
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
      <span className="text-xs text-dark-300 font-medium">{label}</span>
    </button>
  );
}

// Portfolio Card (Job as asset)
function JobAssetCard({ job }) {
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
      className="flex items-center gap-4 p-4 rounded-2xl bg-dark-900/80 border border-white/5 hover:border-primary-500/30 transition-all active:scale-[0.99]"
    >
      {/* Job Icon */}
      <div className={clsx(
        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
        job.featured ? 'bg-gradient-to-br from-primary-500 to-violet-500' : 'bg-dark-800'
      )}>
        <BriefcaseIcon className="h-6 w-6 text-white" />
      </div>

      {/* Job Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-white truncate">{job.title}</h4>
          {job.featured === 1 && (
            <ZapIcon className="h-4 w-4 text-primary-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-dark-400">
            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : jobDate.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
          </span>
          <span className="text-dark-600">•</span>
          <span className="text-sm text-dark-400">{startTime}</span>
          {slotsLeft <= 3 && (
            <>
              <span className="text-dark-600">•</span>
              <span className="text-xs text-red-400 font-medium">{slotsLeft} left</span>
            </>
          )}
        </div>
      </div>

      {/* Pay */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-white">${formatMoney(totalPay)}</p>
        <p className="text-xs text-emerald-400">+{hours.toFixed(1)}h</p>
      </div>
    </Link>
  );
}

// Transaction/Activity Item
function ActivityItem({ type, title, subtitle, amount, time, positive = true }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className={clsx(
        'w-10 h-10 rounded-full flex items-center justify-center',
        positive ? 'bg-emerald-500/20' : 'bg-dark-800'
      )}>
        {positive ? (
          <ArrowDownLeftIcon className="h-5 w-5 text-emerald-400" />
        ) : (
          <ArrowUpRightIcon className="h-5 w-5 text-dark-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{title}</p>
        <p className="text-sm text-dark-500">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className={clsx('font-semibold', positive ? 'text-emerald-400' : 'text-white')}>
          {positive ? '+' : '-'}${formatMoney(amount)}
        </p>
        <p className="text-xs text-dark-500">{time}</p>
      </div>
    </div>
  );
}

// Main Home Component
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ws = useWebSocket();
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
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-safe pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center text-white font-bold">
              {userName.charAt(0)}
            </div>
            <div>
              <p className="text-sm text-dark-400">Welcome back</p>
              <p className="font-semibold text-white">{userName}</p>
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
              className="relative p-2.5 rounded-full bg-dark-800/80 text-dark-400 hover:text-white transition-colors"
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
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#1a1a3e] p-6 border border-white/5">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            {/* Total Balance Label */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-dark-400 text-sm">Total Balance</span>
                <button onClick={() => setBalanceHidden(!balanceHidden)} className="text-dark-500">
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
              <p className="text-dark-400 text-sm mt-1">
                SGD • <span className="text-amber-400">${formatMoney(pendingPayment)} pending</span>
              </p>
            </div>

            {/* XP Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-dark-400">{levelTitles[userLevel]}</span>
                <span className="text-primary-400">{xpInLevel.toLocaleString()} / {xpNeeded.toLocaleString()} XP</span>
              </div>
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all duration-500"
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
              />
              <QuickActionCircle
                icon={CalendarIcon}
                label="Availability"
                onClick={() => navigate('/calendar')}
                color="blue"
              />
              <QuickActionCircle
                icon={GiftIcon}
                label="Refer"
                onClick={() => navigate('/referrals')}
                color="green"
              />
              <QuickActionCircle
                icon={HistoryIcon}
                label="History"
                onClick={() => navigate('/wallet')}
                color="purple"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Streak Banner */}
      {userStreak > 0 && (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-orange-900/30 to-amber-900/20 border border-orange-500/20">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <FlameIcon className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{userStreak} Day Streak!</p>
              <p className="text-xs text-orange-400/80">Keep it going for bonus XP</p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-dark-500" />
          </div>
        </div>
      )}

      {/* Available Jobs Section */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Available Jobs</h2>
          <Link to="/jobs" className="flex items-center gap-1 text-sm text-primary-400">
            View all
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-dark-800/50 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-dark-900/50 border border-white/5">
            <SparklesIcon className="h-12 w-12 text-dark-600 mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-1">No jobs available</h3>
            <p className="text-dark-400 text-sm">Check back soon for new opportunities</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobAssetCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentPayments.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <Link to="/wallet" className="flex items-center gap-1 text-sm text-primary-400">
              See all
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-2xl bg-dark-900/50 border border-white/5 divide-y divide-white/5">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="px-4">
                <ActivityItem
                  title={payment.job_title || 'Job Payment'}
                  subtitle={payment.status === 'paid' ? 'Completed' : 'Processing'}
                  amount={payment.total_amount}
                  time={new Date(payment.created_at).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}
                  positive={payment.status === 'paid'}
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
          className="block relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900/50 to-teal-900/30 border border-emerald-500/20 p-4"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <GiftIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">Refer & Earn $30</p>
              <p className="text-sm text-emerald-400/80">Invite friends, both get rewarded</p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-dark-500" />
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
