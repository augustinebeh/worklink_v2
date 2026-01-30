import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { clsx } from 'clsx';

// Level titles
const levelTitles = {
  1: 'Rookie',
  2: 'Starter',
  3: 'Active',
  4: 'Reliable',
  5: 'Pro',
  6: 'Expert',
  7: 'Elite',
  8: 'Master',
  9: 'Legend',
  10: 'Champion',
};

const xpThresholds = [0, 500, 1200, 2500, 5000, 8000, 12000, 18000, 25000, 35000];

function XPProgressBar({ currentXP, level }) {
  const safeLevel = level || 1;
  const safeXP = currentXP || 0;
  const currentThreshold = xpThresholds[safeLevel - 1] || 0;
  const nextThreshold = xpThresholds[safeLevel] || xpThresholds[xpThresholds.length - 1];
  const xpInLevel = safeXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = safeLevel >= 10 ? 100 : Math.min((xpInLevel / xpNeeded) * 100, 100);

  return (
    <div className="w-full">
      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-dark-500">
        <span>{xpInLevel.toLocaleString()} XP</span>
        <span>{xpNeeded.toLocaleString()} XP to Level {safeLevel + 1}</span>
      </div>
    </div>
  );
}

function LevelBadge({ level }) {
  const safeLevel = level || 1;
  const isElite = safeLevel >= 8;
  const isPro = safeLevel >= 5;

  return (
    <div 
      className={clsx(
        'flex items-center justify-center rounded-full font-bold h-12 w-12 text-sm border-2',
        isElite ? 'bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-dark-900 border-gold-300' :
        isPro ? 'bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white border-primary-400' :
        'bg-dark-700 text-dark-300 border-dark-600',
      )}
    >
      {safeLevel}
    </div>
  );
}

function QuestCard({ quest }) {
  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
  const isCompleted = quest.status === 'completed';

  return (
    <div className={clsx(
      'p-4 rounded-2xl border transition-all',
      isCompleted 
        ? 'bg-accent-900/20 border-accent-500/30' 
        : 'bg-dark-800/50 border-white/5'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className={clsx(
          'px-2 py-0.5 rounded-full text-2xs font-medium uppercase',
          quest.type === 'daily' ? 'bg-blue-500/20 text-blue-400' :
          quest.type === 'weekly' ? 'bg-purple-500/20 text-purple-400' :
          'bg-gold-500/20 text-gold-400'
        )}>
          {quest.type}
        </span>
        <div className="flex items-center gap-1 text-primary-400 text-sm">
          <ZapIcon className="h-4 w-4" />
          <span>+{quest.xp_reward}</span>
        </div>
      </div>
      <h4 className="font-medium text-white">{quest.title}</h4>
      <p className="text-sm text-dark-400 mt-1">{quest.description}</p>
      
      {!isCompleted && quest.target > 1 && (
        <div className="mt-3">
          <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-dark-500 mt-1">{quest.progress}/{quest.target}</p>
        </div>
      )}
    </div>
  );
}

function JobCard({ job }) {
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
      className={clsx(
        'block p-4 rounded-2xl border transition-all bg-dark-800/50 border-white/5 hover:border-primary-500/30',
        job.featured && 'border-primary-500/30 bg-gradient-to-br from-primary-900/20 to-dark-900'
      )}
    >
      {job.featured === 1 && (
        <div className="flex items-center gap-1 mb-2">
          <ZapIcon className="h-3 w-3 text-primary-400" />
          <span className="text-2xs font-medium text-primary-400 uppercase">Featured</span>
        </div>
      )}
      
      <h4 className="font-semibold text-white">{job.title}</h4>
      <p className="text-sm text-dark-400 mt-0.5">{job.company_name || job.location}</p>

      <div className="flex items-center gap-3 mt-3 text-sm text-dark-300">
        <div className="flex items-center gap-1">
          <MapPinIcon className="h-4 w-4 text-dark-500" />
          <span className="truncate max-w-[100px]">{job.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className="h-4 w-4 text-dark-500" />
          <span>{startTime} - {endTime}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
        <div>
          <p className="text-lg font-bold text-accent-400">${totalPay.toFixed(0)}</p>
          <p className="text-xs text-dark-500">${job.pay_rate}/hr</p>
        </div>
        
        <div className="flex items-center gap-3">
          {job.xp_bonus > 0 && (
            <div className="flex items-center gap-1 text-primary-400">
              <ZapIcon className="h-4 w-4" />
              <span className="text-sm font-medium">+{job.xp_bonus} XP</span>
            </div>
          )}
          <span className="text-sm text-dark-400">
            {job.total_slots - job.filled_slots} slots
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ws = useWebSocket();
  const [quests, setQuests] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [user]);

  // Listen for real-time job updates
  useEffect(() => {
    if (!ws) return;

    const unsubJob = ws.subscribe('job_created', (data) => {
      if (data.job) {
        setJobs(prev => [data.job, ...prev].slice(0, 5));
      }
    });

    const unsubXP = ws.subscribe('xp_earned', (data) => {
      // Could show a toast notification here
      console.log('XP earned:', data);
    });

    return () => {
      unsubJob?.();
      unsubXP?.();
    };
  }, [ws]);

  const fetchData = async () => {
    try {
      const [questsRes, jobsRes] = await Promise.all([
        fetch('/api/v1/gamification/quests'),
        fetch('/api/v1/jobs?status=open&limit=5'),
      ]);

      const questsData = await questsRes.json();
      const jobsData = await jobsRes.json();

      if (questsData.success) {
        // Add mock progress for demo
        const questsWithProgress = questsData.data.slice(0, 3).map((q, idx) => ({
          ...q,
          progress: idx === 0 ? 1 : Math.floor(Math.random() * 3),
          target: 1,
          status: idx === 0 ? 'completed' : 'available',
        }));
        setQuests(questsWithProgress);
      }

      if (jobsData.success) {
        // Sort featured first
        const sorted = [...jobsData.data].sort((a, b) => (b.featured || 0) - (a.featured || 0));
        setJobs(sorted.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safe user data with defaults
  const userName = user?.name?.split(' ')[0] || 'Guest';
  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const userStreak = user?.streak_days || 0;
  const userJobsCompleted = user?.total_jobs_completed || 0;
  const userEarnings = user?.total_earnings || 0;
  const userRating = user?.rating || 0;

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-900/95 backdrop-blur-lg px-4 pt-safe pb-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LevelBadge level={userLevel} />
            <div>
              <h1 className="font-semibold text-white">Hey, {userName}! 👋</h1>
              <p className="text-sm text-dark-400">{levelTitles[userLevel] || 'Newcomer'} • {userXP.toLocaleString()} XP</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button 
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white"
            >
              <BellIcon className="h-5 w-5" />
              {ws?.unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {ws.unreadNotifications}
                </span>
              )}
            </button>
            
            {/* Streak */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gold-900/30 border border-gold-500/20">
              <span className="text-lg">🔥</span>
              <span className="font-bold text-gold-400">{userStreak}</span>
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-4">
          <XPProgressBar currentXP={userXP} level={userLevel} />
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-4 rounded-xl bg-dark-800/50">
            <TrophyIcon className="h-5 w-5 text-gold-400 mb-1" />
            <p className="text-xl font-bold text-white">{userJobsCompleted}</p>
            <p className="text-xs text-dark-500">Jobs Done</p>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-dark-800/50">
            <DollarSignIcon className="h-5 w-5 text-accent-400 mb-1" />
            <p className="text-xl font-bold text-white">${userEarnings.toFixed(0)}</p>
            <p className="text-xs text-dark-500">Earned</p>
          </div>
          <div className="flex flex-col items-center p-4 rounded-xl bg-dark-800/50">
            <StarIcon className="h-5 w-5 text-gold-400 fill-gold-400 mb-1" />
            <p className="text-xl font-bold text-white">{userRating.toFixed(1)}</p>
            <p className="text-xs text-dark-500">Rating</p>
          </div>
        </div>

        {/* Streak Banner */}
        {userStreak > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔥</div>
                <div>
                  <p className="font-semibold text-white">{userStreak} Day Streak!</p>
                  <p className="text-sm text-dark-400">Keep it going!</p>
                </div>
              </div>
              <Link 
                to="/quests"
                className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-400 text-sm font-medium"
              >
                View Quests
              </Link>
            </div>
          </div>
        )}

        {/* Active Quests */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Active Quests</h2>
            <Link to="/quests" className="flex items-center gap-1 text-sm text-primary-400">
              See all
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : quests.length === 0 ? (
            <p className="text-dark-400 text-center py-4">No active quests</p>
          ) : (
            <div className="space-y-3">
              {quests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
          )}
        </section>

        {/* Available Jobs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Available Jobs</h2>
            <Link to="/jobs" className="flex items-center gap-1 text-sm text-primary-400">
              See all
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-dark-400 text-center py-4">No jobs available</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
