import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  BriefcaseIcon,
  ZapIcon,
  SparklesIcon,
  ChevronLeftIcon,
  TrophyIcon,
  ClockIcon,
  StarIcon,
  RefreshCwIcon,
  FlameIcon,
  WalletIcon,
  GiftIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../components/ui/Toast';
import { clsx } from 'clsx';
import { LEVEL_TITLES as levelTitles, calculateLevel } from '../utils/gamification';
import { LoadingSkeleton, EmptyState, StatPod, SectionHeader } from '../components/common';
import { FloatingXP, LevelUpCelebration, AchievementUnlock } from '../components/gamification/Confetti';
import XPBar from '../components/gamification/XPBar';
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
  QUEST_TYPE_STYLES,
} from '../utils/constants';

// Quest type icons mapping
const QUEST_ICONS = {
  daily: ClockIcon,
  weekly: StarIcon,
  special: SparklesIcon,
  repeatable: RefreshCwIcon,
  challenge: FlameIcon,
};

// Flying XP Animation Component
function FlyingXP({ amount, startPos, targetRef, onComplete }) {
  const [position, setPosition] = useState(startPos);
  const [targetPos, setTargetPos] = useState(null);
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!startPos || !targetRef?.current) return;

    // Get the exact position of the XP bar dynamically
    const rect = targetRef.current.getBoundingClientRect();
    const target = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    setTargetPos(target);

    // Start animation after a tiny delay
    const timeout = setTimeout(() => {
      setPosition(target);
      setScale(0.3);
    }, 50);

    // Fade out near the end
    const fadeTimeout = setTimeout(() => {
      setOpacity(0);
    }, 600);

    // Complete callback
    const completeTimeout = setTimeout(() => {
      onComplete?.();
    }, 800);

    return () => {
      clearTimeout(timeout);
      clearTimeout(fadeTimeout);
      clearTimeout(completeTimeout);
    };
  }, [startPos, targetRef, onComplete]);

  if (!startPos) return null;

  return (
    <div
      className="fixed z-[100] pointer-events-none flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 text-white font-bold shadow-lg shadow-violet-500/50"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <ZapIcon className="h-4 w-4" />
      <span>+{amount}</span>
    </div>
  );
}

// Animated Quest Card for Homepage
function HomeQuestCard({ quest, onClaim, isClaiming }) {
  const [isExiting, setIsExiting] = useState(false);
  const xpBadgeRef = useRef(null);
  const config = QUEST_TYPE_STYLES?.[quest.type] || {};
  const Icon = QUEST_ICONS[quest.type] || QUEST_ICONS.daily;
  
  const isClaimable = quest.status === 'claimable';

  const handleClaim = (e) => {
    e.stopPropagation();
    if (isClaiming || !isClaimable) return;

    // Get position of the XP badge on this card for flying animation
    const rect = xpBadgeRef.current?.getBoundingClientRect();
    const startPos = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;

    // Start exit animation
    setIsExiting(true);

    // Trigger claim with position info
    onClaim(quest, startPos);
  };

  // Don't show non-claimable or claimed quests
  if (!isClaimable || quest.status === 'claimed') return null;

  return (
    <div
      className={clsx(
        'relative p-4 rounded-2xl transition-all duration-500 ease-out',
        isExiting && 'opacity-0 scale-95 -translate-y-4 h-0 p-0 mb-0 overflow-hidden',
        'bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-violet-500/20 border-2 border-emerald-500/40'
      )}
      style={{
        boxShadow: '0 0 30px rgba(16, 185, 129, 0.15)',
      }}
    >
      {/* Animated glow border */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 animate-pulse" />
      </div>

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
          <TrophyIcon className="h-7 w-7 text-emerald-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 text-xs font-bold animate-pulse">
              🎉 READY TO CLAIM!
            </span>
          </div>
          <h3 className="font-bold text-white">{quest.title}</h3>
          <p className="text-sm text-white/50">{quest.description}</p>
        </div>

        {/* Claim Button with XP */}
        <div className="flex flex-col items-end gap-2">
          <div 
            ref={xpBadgeRef}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-500/30 border border-violet-500/40"
          >
            <ZapIcon className="h-4 w-4 text-violet-400" />
            <span className="text-lg font-bold text-violet-300">+{quest.xp_reward}</span>
          </div>
          
          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-95 transition-all disabled:opacity-50"
          >
            {isClaiming ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Claiming...</span>
              </div>
            ) : (
              <span>Claim Reward</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// League Header Card
function LeagueCard({ user, userLevel, userXP, thisMonthEarnings, totalJobs, xpAnimating, xpBarRef }) {
  const levelTitle = levelTitles[userLevel] || 'Newcomer';

  return (
    <div className="relative mx-4 mt-4 rounded-3xl overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] -translate-x-1/2 -translate-y-1/2" />
      
      {/* Border glow */}
      <div className={clsx(
        'absolute inset-0 rounded-3xl border transition-all duration-500',
        xpAnimating ? 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-white/[0.08]'
      )} />

      {/* Content */}
      <div className="relative p-5">
        {/* User info */}
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

        {/* League Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-10 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {levelTitle} League
              <TrophyIcon className="h-6 w-6 text-amber-400" />
            </h1>
            <p className="text-white/50 text-sm">Level {userLevel} • {userXP.toLocaleString()} XP</p>
          </div>
        </div>

        {/* XP Bar - ref attached to the bar track for flying XP target */}
        <div className="mb-6">
          <XPBar
            ref={xpBarRef}
            currentXP={userXP}
            level={userLevel}
            animating={xpAnimating}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatPod label="This Month" value={`$${formatMoney(thisMonthEarnings)}`} icon={WalletIcon} color="emerald" whiteValue size="md" />
          <StatPod label="Jobs Done" value={totalJobs.toString()} icon={BriefcaseIcon} color="violet" whiteValue size="md" />
        </div>
      </div>
    </div>
  );
}

// Activity Item
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

// Pagination
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
      {[...Array(Math.min(totalPages, 5))].map((_, i) => (
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
  const xpBarRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [quests, setQuests] = useState([]);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [claimingQuest, setClaimingQuest] = useState(null);
  const [xpAnimating, setXpAnimating] = useState(false);
  const [flyingXP, setFlyingXP] = useState(null);
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
        const claimable = (questsData.data || []).filter(q => q.status === 'claimable');
        setQuests(claimable.slice(0, 3));
      }
    } catch (error) {
      toast.error('Failed to load', 'Pull down to refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestClaim = async (quest, startPos) => {
    setClaimingQuest(quest.id);
    
    try {
      const res = await fetch(`/api/v1/gamification/quests/${quest.id}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: user.id }),
      });
      
      const data = await res.json();
      if (data.success) {
        // Start flying XP animation - it will find the XP bar dynamically
        if (startPos) {
          setFlyingXP({
            amount: quest.xp_reward,
            startPos,
          });
        }

        // Remove quest after delay
        setTimeout(() => {
          setQuests(prev => prev.filter(q => q.id !== quest.id));
        }, 300);

        toast.success('Quest Complete!', `+${quest.xp_reward} XP earned`);
        refreshUser();
      } else {
        toast.error('Failed', data.error || 'Please try again');
      }
    } catch (error) {
      toast.error('Error', 'Please try again');
    } finally {
      setClaimingQuest(null);
    }
  };

  const handleFlyingXPComplete = () => {
    setXpAnimating(true);
    setXpGain({ amount: flyingXP?.amount || 0, trigger: Date.now() });
    
    setTimeout(() => {
      setXpAnimating(false);
      setFlyingXP(null);
    }, 1500);
  };

  const userXP = user?.xp || DEFAULTS.xp;
  const userLevel = calculateLevel(userXP);
  const totalJobs = user?.total_jobs_completed || 0;

  const totalPages = Math.ceil(jobs.length / jobsPerPage);
  const paginatedJobs = jobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      <div>
        <LeagueCard
          user={user}
          userLevel={userLevel}
          userXP={userXP}
          thisMonthEarnings={thisMonthEarnings}
          totalJobs={totalJobs}
          xpAnimating={xpAnimating}
          xpBarRef={xpBarRef}
        />

        {quests.length > 0 && (
          <div className="px-4 mt-6">
            <SectionHeader
              title="Rewards Ready!"
              icon={GiftIcon}
              iconColor="text-amber-400"
              actionLabel="All Quests →"
              onAction={() => navigate('/quests')}
            />
            <div className="space-y-3">
              {quests.map(quest => (
                <HomeQuestCard
                  key={quest.id}
                  quest={quest}
                  onClaim={handleQuestClaim}
                  isClaiming={claimingQuest === quest.id}
                />
              ))}
            </div>
          </div>
        )}

        <div className="px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <BriefcaseIcon className="h-5 w-5 text-emerald-400" />
              Job Activity
            </h2>
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0a1628]/50 overflow-hidden">
            {loading ? (
              <div className="p-4">
                <LoadingSkeleton count={3} height="h-16" />
              </div>
            ) : paginatedJobs.length === 0 ? (
              <EmptyState
                icon={SparklesIcon}
                title="No jobs available"
                description="Check back soon for new opportunities"
                compact
              />
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

      {/* Flying XP - dynamically targets the XP bar */}
      {flyingXP && (
        <FlyingXP
          amount={flyingXP.amount}
          startPos={flyingXP.startPos}
          targetRef={xpBarRef}
          onComplete={handleFlyingXPComplete}
        />
      )}

      <FloatingXP amount={xpGain.amount} trigger={xpGain.trigger} />
      <LevelUpCelebration show={levelUp.show} level={levelUp.level} onClose={() => setLevelUp({ show: false, level: 1 })} />
      <AchievementUnlock show={achievementUnlock.show} achievement={achievementUnlock.achievement} onClose={() => setAchievementUnlock({ show: false, achievement: null })} />
    </div>
  );
}
