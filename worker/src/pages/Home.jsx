import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRightIcon,
  BriefcaseIcon,
  ZapIcon,
  SparklesIcon,
  ChevronLeftIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../components/ui/Toast';
import { useStreakProtection } from '../contexts/StreakProtectionContext';
import { clsx } from 'clsx';
import { calculateLevel } from '../../../shared/utils/gamification-browser';
import { LoadingSkeleton, EmptyState } from '../components/common';
import { FloatingXP, LevelUpCelebration, AchievementUnlock } from '../components/gamification/Confetti';
import {
  StreakProtectionModal,
  StreakAlertBanner,
  EnhancedDailyStreakCard
} from '../components/gamification/StreakProtection';
import { DEFAULTS, getSGDateString } from '../utils/constants';

// Extracted sub-components
import {
  LeagueCard,
  ActivityItem,
  LiveActivityFeed,
  EarningsPotentialCard,
  QuestSection,
  FlyingXP,
} from '../components/home';

// Pagination (small, kept inline)
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
  const {
    streakStatus,
    protectStreak,
    recoverStreak,
    quickCheckin,
    registerPushNotifications
  } = useStreakProtection();
  const [jobs, setJobs] = useState([]);
  const [quests, setQuests] = useState([]);
  const [allQuests, setAllQuests] = useState([]);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [claimingQuest, setClaimingQuest] = useState(null);
  const [xpAnimating, setXpAnimating] = useState(false);
  const [flyingXP, setFlyingXP] = useState(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streakAlertDismissed, setStreakAlertDismissed] = useState(false);
  const jobsPerPage = 5;

  // Gamification animation states
  const [xpGain, setXpGain] = useState({ amount: 0, trigger: 0 });
  const [levelUp, setLevelUp] = useState({ show: false, level: 1 });
  const [achievementUnlock, setAchievementUnlock] = useState({ show: false, achievement: null });

  useEffect(() => {
    fetchData();

    if (user?.id) {
      registerPushNotifications();
    }
  }, [user, registerPushNotifications]);

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
      const [jobsRes, paymentsRes, questsRes, allQuestsRes] = await Promise.all([
        fetch('/api/v1/jobs?status=open&limit=20'),
        user ? fetch(`/api/v1/payments?candidate_id=${user.id}&limit=10`) : Promise.resolve({ json: () => ({ data: [] }) }),
        user ? fetch(`/api/v1/gamification/quests/user/${user.id}`) : Promise.resolve({ json: () => ({ data: [] }) }),
        user ? fetch(`/api/v1/gamification/quests`) : Promise.resolve({ json: () => ({ data: [] }) }),
      ]);

      const jobsData = await jobsRes.json();
      const paymentsData = await paymentsRes.json();
      const questsData = await questsRes.json();
      const allQuestsData = await allQuestsRes.json();

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

      if (allQuestsData.success) {
        setAllQuests(allQuestsData.data || []);
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
        if (startPos) {
          setFlyingXP({ amount: quest.xp_reward, startPos });
        }

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

  const handleStreakCardClick = () => setShowStreakModal(true);

  const handleStreakProtect = async () => {
    if (streakStatus?.streakBroken) {
      await recoverStreak();
    } else {
      await protectStreak();
    }
  };

  const handleStreakRecover = async () => await recoverStreak();
  const handleStreakAlertDismiss = () => setStreakAlertDismissed(true);

  const userXP = user?.xp || DEFAULTS.xp;
  const userLevel = calculateLevel(userXP);
  const totalJobs = user?.total_jobs_completed || 0;

  const totalPages = Math.ceil(jobs.length / jobsPerPage);
  const paginatedJobs = jobs.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
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

        <LiveActivityFeed userLevel={userLevel} />

        {!streakAlertDismissed && (
          <StreakAlertBanner
            streakStatus={streakStatus}
            onProtectClick={() => setShowStreakModal(true)}
            onDismiss={handleStreakAlertDismiss}
          />
        )}

        <EnhancedDailyStreakCard
          user={user}
          streakStatus={streakStatus}
          onClick={handleStreakCardClick}
        />

        <EarningsPotentialCard jobs={jobs} />

        <QuestSection
          user={user}
          quests={quests}
          allQuests={allQuests}
          onClaim={handleQuestClaim}
          claimingQuest={claimingQuest}
          navigate={navigate}
        />

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

          <div className="rounded-2xl border border-white/5 bg-theme-card/50 overflow-hidden">
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

      <StreakProtectionModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        user={user}
        streakStatus={streakStatus}
        onProtect={handleStreakProtect}
        onRecover={handleStreakRecover}
      />

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
