import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  DollarSignIcon,
  StarIcon,
  ZapIcon,
  TrophyIcon,
  FlameIcon,
  BellIcon,
  GiftIcon,
  UsersIcon,
  SparklesIcon,
  CalendarIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  Wallet2Icon,
  TargetIcon,
  TrendingUpIcon,
  HeartIcon,
  Share2Icon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles } from '../utils/gamification';
import { FloatingXP, LevelUpCelebration, AchievementUnlock } from '../components/gamification/Confetti';

// Motivational messages based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '☀️', motivation: 'Start your day with a great opportunity!' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌤️', motivation: 'Perfect time to grab a quick gig!' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌙', motivation: 'Evening shifts pay more!' };
  return { text: 'Hey there', emoji: '✨', motivation: 'Night owl opportunities await!' };
};

// Story-like card component for horizontal scroll
function StoryCard({ type, data, onClick }) {
  const configs = {
    hot_job: {
      gradient: 'from-orange-500 to-red-500',
      icon: FlameIcon,
      label: 'HOT',
    },
    high_pay: {
      gradient: 'from-green-500 to-emerald-600',
      icon: DollarSignIcon,
      label: '$$$',
    },
    bonus_xp: {
      gradient: 'from-purple-500 to-violet-600',
      icon: ZapIcon,
      label: '+XP',
    },
    urgent: {
      gradient: 'from-red-500 to-pink-600',
      icon: ClockIcon,
      label: 'URGENT',
    },
    new: {
      gradient: 'from-blue-500 to-cyan-500',
      icon: SparklesIcon,
      label: 'NEW',
    },
  };

  const config = configs[type] || configs.new;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-shrink-0 w-20 flex flex-col items-center gap-2 group'
      )}
    >
      <div className={clsx(
        'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center ring-2 ring-offset-2 ring-offset-dark-950 transition-transform group-active:scale-95',
        config.gradient,
        'ring-white/20'
      )}>
        <Icon className="h-7 w-7 text-white" />
      </div>
      <span className="text-2xs font-medium text-dark-400">{config.label}</span>
    </button>
  );
}

// Daily Check-in Component
function DailyCheckIn({ streak, onCheckIn, checkedIn }) {
  const rewards = [10, 15, 20, 25, 30, 40, 50]; // XP rewards for each day

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-red-900/40 border border-orange-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-500/20">
            <GiftIcon className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Daily Check-in</h3>
            <p className="text-xs text-orange-400/80">Day {(streak % 7) + 1} of 7</p>
          </div>
        </div>

        {!checkedIn ? (
          <button
            onClick={onCheckIn}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold text-sm animate-pulse hover:animate-none transition-all active:scale-95"
          >
            Claim +{rewards[streak % 7]} XP
          </button>
        ) : (
          <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-500/20 text-green-400">
            <CheckCircleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Claimed!</span>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {rewards.map((xp, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              idx < (streak % 7) ? 'bg-orange-500 text-white' :
              idx === (streak % 7) ? 'bg-orange-500/50 text-orange-300 ring-2 ring-orange-400 ring-offset-1 ring-offset-dark-950' :
              'bg-dark-700 text-dark-500'
            )}>
              {idx === 6 ? '🎁' : `+${xp}`}
            </div>
            <span className="text-2xs text-dark-500">D{idx + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Earnings Spotlight Component
function EarningsSpotlight({ earnings, pendingPayment, weeklyEarnings }) {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900/50 to-green-900/30 border border-emerald-500/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-emerald-400/80">Total Earnings</p>
          <p className="text-4xl font-bold text-white mt-1">
            ${earnings.toLocaleString()}
          </p>
        </div>
        <Link
          to="/wallet"
          className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
        >
          <Wallet2Icon className="h-6 w-6" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-dark-800/50">
          <p className="text-xs text-dark-400">This Week</p>
          <p className="text-lg font-semibold text-white">${weeklyEarnings}</p>
        </div>
        <div className="p-3 rounded-xl bg-dark-800/50">
          <p className="text-xs text-dark-400">Pending</p>
          <p className="text-lg font-semibold text-amber-400">${pendingPayment}</p>
        </div>
      </div>
    </div>
  );
}

// Social Proof Component
function SocialProof({ stats }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/30 border border-white/5">
      <div className="flex -space-x-2">
        {['🧑‍💼', '👩‍💼', '👨‍💼'].map((emoji, i) => (
          <div key={i} className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-sm border-2 border-dark-900">
            {emoji}
          </div>
        ))}
      </div>
      <div className="flex-1">
        <p className="text-sm text-white">
          <span className="font-semibold text-accent-400">{stats.workersToday}</span> workers earned{' '}
          <span className="font-semibold text-emerald-400">${stats.earningsToday}</span> today
        </p>
      </div>
    </div>
  );
}

// Urgent Job Card with countdown
function UrgentJobCard({ job }) {
  const slotsLeft = job.total_slots - job.filled_slots;
  const isAlmostFull = slotsLeft <= 3;

  const startTime = job.start_time || '09:00';
  const endTime = job.end_time || '17:00';
  const start = startTime.split(':').map(Number);
  let end = endTime.split(':').map(Number);
  if (end[0] < start[0]) end[0] += 24;
  const hours = ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1]) - (job.break_minutes || 0)) / 60;
  const totalPay = hours * job.pay_rate;

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="block p-4 rounded-2xl bg-gradient-to-br from-dark-800 to-dark-900 border border-white/5 hover:border-primary-500/30 transition-all active:scale-[0.98]"
    >
      {/* Header badges */}
      <div className="flex items-center gap-2 mb-3">
        {job.featured === 1 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary-500/20 text-primary-400 text-2xs font-semibold">
            <ZapIcon className="h-3 w-3" /> FEATURED
          </span>
        )}
        {isAlmostFull && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-2xs font-semibold animate-pulse">
            <FlameIcon className="h-3 w-3" /> {slotsLeft} LEFT
          </span>
        )}
        {job.xp_bonus > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 text-2xs font-semibold">
            +{job.xp_bonus} XP
          </span>
        )}
      </div>

      {/* Job info */}
      <h4 className="font-semibold text-white text-lg">{job.title}</h4>
      <p className="text-dark-400 mt-1">{job.company_name || job.location}</p>

      {/* Details row */}
      <div className="flex items-center gap-4 mt-3 text-sm">
        <div className="flex items-center gap-1 text-dark-300">
          <CalendarIcon className="h-4 w-4 text-dark-500" />
          <span>{new Date(job.job_date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
        <div className="flex items-center gap-1 text-dark-300">
          <ClockIcon className="h-4 w-4 text-dark-500" />
          <span>{startTime} - {endTime}</span>
        </div>
      </div>

      {/* Pay & CTA */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
        <div>
          <p className="text-2xl font-bold text-emerald-400">${totalPay.toFixed(0)}</p>
          <p className="text-xs text-dark-500">${job.pay_rate}/hr • {hours.toFixed(1)}h</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-medium">
          Apply Now
          <ArrowRightIcon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

// Quick Action Button
function QuickAction({ icon: Icon, label, sublabel, onClick, variant = 'default' }) {
  const variants = {
    default: 'bg-dark-800/50 border-white/5 text-white',
    primary: 'bg-primary-500/20 border-primary-500/30 text-primary-400',
    success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    warning: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
  };

  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98]',
        variants[variant]
      )}
    >
      <div className="p-2 rounded-xl bg-white/10">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-left">
        <p className="font-medium">{label}</p>
        {sublabel && <p className="text-xs opacity-70">{sublabel}</p>}
      </div>
    </button>
  );
}

// Level Progress with Next Reward
function LevelProgress({ level, xp }) {
  const safeLevel = level || 1;
  const safeXP = xp || 0;
  const currentThreshold = xpThresholds[safeLevel - 1] || 0;
  const nextThreshold = xpThresholds[safeLevel] || xpThresholds[xpThresholds.length - 1];
  const xpInLevel = safeXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = safeLevel >= 10 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);
  const xpToNext = xpNeeded - xpInLevel;

  const nextRewards = {
    2: 'Unlock Training Courses',
    3: 'Early Access to Jobs',
    4: 'Priority Matching',
    5: 'Pro Badge + Bonus Rate',
    6: 'VIP Support',
    7: 'Exclusive Events',
    8: 'Elite Status',
    9: 'Master Benefits',
    10: 'Legend Rewards',
  };

  return (
    <div className="p-4 rounded-2xl bg-gradient-to-r from-primary-900/30 to-violet-900/30 border border-primary-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
            safeLevel >= 8 ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-dark-900' :
            safeLevel >= 5 ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white' :
            'bg-dark-700 text-dark-300'
          )}>
            {safeLevel}
          </div>
          <div>
            <p className="font-semibold text-white">{levelTitles[safeLevel]}</p>
            <p className="text-xs text-primary-400">{xpToNext.toLocaleString()} XP to Level {safeLevel + 1}</p>
          </div>
        </div>
        <Link to="/achievements" className="text-sm text-primary-400 flex items-center gap-1">
          Rewards <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-dark-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Next unlock preview */}
      {safeLevel < 10 && nextRewards[safeLevel + 1] && (
        <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-dark-800/50">
          <SparklesIcon className="h-4 w-4 text-amber-400" />
          <p className="text-xs text-dark-300">
            <span className="text-amber-400">Next unlock:</span> {nextRewards[safeLevel + 1]}
          </p>
        </div>
      )}
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
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [socialStats, setSocialStats] = useState({ workersToday: 47, earningsToday: 8450 });

  // Gamification animation states
  const [xpGain, setXpGain] = useState({ amount: 0, trigger: 0 });
  const [levelUp, setLevelUp] = useState({ show: false, level: 1 });
  const [achievementUnlock, setAchievementUnlock] = useState({ show: false, achievement: null });

  const greeting = getGreeting();

  useEffect(() => {
    fetchData();
    // Check if already checked in today
    const lastCheckIn = localStorage.getItem('lastCheckIn');
    if (lastCheckIn === new Date().toDateString()) {
      setCheckedIn(true);
    }
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

    const unsubAchievement = ws.subscribe('achievement_unlocked', (data) => {
      if (data.achievement) {
        setAchievementUnlock({ show: true, achievement: data.achievement });
      }
    });

    return () => {
      unsubJob?.();
      unsubXP?.();
      unsubLevelUp?.();
      unsubAchievement?.();
    };
  }, [ws, toast]);

  const fetchData = async () => {
    try {
      const jobsRes = await fetch('/api/v1/jobs?status=open&limit=5');
      const jobsData = await jobsRes.json();

      if (jobsData.success) {
        const sorted = [...jobsData.data].sort((a, b) => (b.featured || 0) - (a.featured || 0));
        setJobs(sorted.slice(0, 5));
      }
    } catch (error) {
      toast.error('Failed to load', 'Pull down to refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    // Simulate check-in (in production, call API)
    setCheckedIn(true);
    localStorage.setItem('lastCheckIn', new Date().toDateString());
    setXpGain({ amount: 20, trigger: Date.now() });
    toast.success('Check-in Complete!', '+20 XP earned');
  };

  // Safe user data with defaults
  const userName = user?.name?.split(' ')[0] || 'Friend';
  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const userStreak = user?.streak_days || 0;
  const userEarnings = user?.total_earnings || 0;
  const pendingPayment = user?.pending_payment || 0;
  const weeklyEarnings = user?.weekly_earnings || 0;

  return (
    <div className="min-h-screen bg-dark-950 pb-28">
      {/* Header - Clean & Focused */}
      <div className="sticky top-0 z-10 bg-dark-950 backdrop-blur-xl px-4 pt-safe pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{greeting.emoji}</span>
              <h1 className="text-lg font-semibold text-white">{greeting.text}, {userName}!</h1>
            </div>
            <p className="text-sm text-dark-400 mt-0.5">{greeting.motivation}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Streak */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-900/30 border border-orange-500/20">
              <FlameIcon className="h-4 w-4 text-orange-400" />
              <span className="font-bold text-orange-400">{userStreak}</span>
            </div>

            {/* Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2.5 rounded-xl bg-dark-800 text-dark-400 hover:text-white transition-colors"
            >
              <BellIcon className="h-5 w-5" />
              {ws?.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {ws.unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 py-5 space-y-5">
        {/* Stories / Quick Filters */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <StoryCard type="hot_job" onClick={() => navigate('/jobs?filter=hot')} />
          <StoryCard type="high_pay" onClick={() => navigate('/jobs?filter=high_pay')} />
          <StoryCard type="bonus_xp" onClick={() => navigate('/jobs?filter=bonus')} />
          <StoryCard type="urgent" onClick={() => navigate('/jobs?filter=urgent')} />
          <StoryCard type="new" onClick={() => navigate('/jobs?filter=new')} />
        </div>

        {/* Daily Check-in */}
        <DailyCheckIn
          streak={userStreak}
          onCheckIn={handleCheckIn}
          checkedIn={checkedIn}
        />

        {/* Earnings Spotlight */}
        <EarningsSpotlight
          earnings={userEarnings}
          pendingPayment={pendingPayment}
          weeklyEarnings={weeklyEarnings}
        />

        {/* Social Proof */}
        <SocialProof stats={socialStats} />

        {/* Level Progress */}
        <LevelProgress level={userLevel} xp={userXP} />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <QuickAction
            icon={CalendarIcon}
            label="Set Availability"
            sublabel="Let us match you"
            onClick={() => navigate('/calendar')}
            variant="primary"
          />
          <QuickAction
            icon={Share2Icon}
            label="Refer & Earn"
            sublabel="$30 per friend"
            onClick={() => navigate('/referrals')}
            variant="success"
          />
        </div>

        {/* Hot Jobs Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlameIcon className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Hot Jobs</h2>
            </div>
            <Link to="/jobs" className="flex items-center gap-1 text-sm text-primary-400">
              View all
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 rounded-2xl bg-dark-800/50 animate-pulse" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-dark-800/30 border border-white/5">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="font-semibold text-white mb-2">No jobs right now</h3>
              <p className="text-dark-400 text-sm mb-4">New opportunities drop daily!</p>
              <button
                onClick={() => navigate('/calendar')}
                className="px-4 py-2 rounded-xl bg-primary-500 text-white font-medium"
              >
                Set Availability to Get Notified
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <UrgentJobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>

        {/* Motivation Footer */}
        <div className="text-center py-6">
          <p className="text-dark-500 text-sm">
            "Every job brings you closer to your goals" 💪
          </p>
        </div>
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
