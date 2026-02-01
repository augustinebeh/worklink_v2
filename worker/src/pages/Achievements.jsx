import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  StarIcon,
  LockIcon,
  ZapIcon,
  CheckCircleIcon,
  SparklesIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import { DEFAULT_LOCALE, TIMEZONE, RARITY_LABELS } from '../utils/constants';

const rarityConfig = {
  common: { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', glow: '', glowColor: 'rgba(148,163,184,0.2)' },
  uncommon: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', glow: 'shadow-lg shadow-green-500/20', glowColor: 'rgba(34,197,94,0.3)' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', glow: 'shadow-lg shadow-blue-500/20', glowColor: 'rgba(59,130,246,0.3)' },
  epic: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', glow: 'shadow-lg shadow-purple-500/30', glowColor: 'rgba(168,85,247,0.4)' },
  legendary: { color: 'text-gold-400', bg: 'bg-gold-500/20', border: 'border-gold-500/30', glow: 'shadow-xl shadow-gold-500/40', glowColor: 'rgba(251,191,36,0.4)' },
};

const categoryIcons = {
  jobs: '💼',
  streak: '🔥',
  training: '📚',
  social: '👥',
  special: '⭐',
  milestone: '🏆',
};

function AchievementCard({ achievement, unlocked, isDark }) {
  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;
  const rarityLabel = RARITY_LABELS[achievement.rarity] || RARITY_LABELS.common;
  const isLegendary = achievement.rarity === 'legendary';
  const isEpic = achievement.rarity === 'epic';

  return (
    <div className={clsx(
      'relative p-4 rounded-2xl backdrop-blur-md transition-all duration-300 border overflow-hidden',
      unlocked
        ? isDark
          ? `bg-white/[0.03] ${rarity.border} ${rarity.glow}`
          : `bg-white ${rarity.border} shadow-[0_4px_20px_rgba(0,0,0,0.05)]`
        : isDark
          ? 'bg-dark-800/20 border-white/5 opacity-50 grayscale'
          : 'bg-slate-50 border-slate-200 opacity-50 grayscale'
    )}>
      {/* Glow effect for epic/legendary */}
      {unlocked && isDark && (isLegendary || isEpic) && (
        <div
          className="absolute inset-0 rounded-2xl opacity-30 blur-xl -z-10"
          style={{ background: rarity.glowColor }}
        />
      )}

      {/* Top border highlight */}
      {unlocked && isDark && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}

      {/* Rarity badge */}
      <div className="absolute top-3 right-3">
        <span className={clsx(
          'px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wide border',
          rarity.bg, rarity.color, rarity.border
        )}>
          {rarityLabel}
        </span>
      </div>

      {/* Icon */}
      <div className={clsx(
        'w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-3 border',
        unlocked
          ? `${rarity.bg} ${rarity.border}`
          : isDark ? 'bg-dark-700 border-dark-600' : 'bg-slate-200 border-slate-300'
      )}>
        {unlocked ? (
          <span className={isLegendary ? 'animate-pulse' : ''}>
            {achievement.icon || categoryIcons[achievement.category] || '🏅'}
          </span>
        ) : (
          <LockIcon className={clsx('h-6 w-6', isDark ? 'text-dark-500' : 'text-slate-400')} />
        )}
      </div>

      {/* Title & Description */}
      <h3 className={clsx(
        'font-semibold text-sm',
        unlocked ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-dark-500' : 'text-slate-400')
      )}>
        {achievement.name}
      </h3>
      <p className={clsx('text-xs mt-1 line-clamp-2', isDark ? 'text-dark-400' : 'text-slate-500')}>
        {achievement.description}
      </p>

      {/* XP Reward */}
      <div className={clsx(
        'flex items-center justify-between mt-3 pt-3 border-t',
        isDark ? 'border-white/5' : 'border-slate-100'
      )}>
        <div className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg',
          unlocked
            ? 'bg-amber-500/20 text-amber-400'
            : isDark ? 'bg-dark-700 text-dark-500' : 'bg-slate-100 text-slate-400'
        )}>
          <ZapIcon className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">+{achievement.xp_reward}</span>
        </div>

        {unlocked && (
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircleIcon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Unlocked date */}
      {unlocked && achievement.unlocked_at && (
        <p className={clsx('text-2xs mt-2', isDark ? 'text-dark-500' : 'text-slate-400')}>
          {new Date(achievement.unlocked_at).toLocaleDateString(DEFAULT_LOCALE, {
            day: 'numeric',
            month: 'short',
            timeZone: TIMEZONE
          })}
        </p>
      )}
    </div>
  );
}

function CategorySection({ title, emoji, achievements, unlockedIds, isDark }) {
  const unlocked = achievements.filter(a => unlockedIds.includes(a.id));
  const locked = achievements.filter(a => !unlockedIds.includes(a.id));

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{emoji}</span>
        <h2 className={clsx('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>{title}</h2>
        <span className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>({unlocked.length}/{achievements.length})</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[...unlocked, ...locked].map(achievement => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            unlocked={unlockedIds.includes(achievement.id)}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}

export default function Achievements() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [achievements, setAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAchievements();
  }, [user]);

  const fetchAchievements = async () => {
    try {
      const [allRes, userRes] = await Promise.all([
        fetch('/api/v1/gamification/achievements'),
        user ? fetch(`/api/v1/candidates/${user.id}/achievements`) : Promise.resolve({ json: () => ({ data: [] }) }),
      ]);
      
      const allData = await allRes.json();
      const userData = await userRes.json();
      
      if (allData.success) setAchievements(allData.data);
      if (userData.success) setUserAchievements(userData.data || []);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const unlockedIds = userAchievements.map(a => a.achievement_id || a.id);
  const totalXP = achievements.filter(a => unlockedIds.includes(a.id)).reduce((sum, a) => sum + a.xp_reward, 0);

  // Group by category
  const categories = {
    jobs: { title: 'Job Mastery', emoji: '💼', achievements: achievements.filter(a => a.category === 'jobs') },
    streak: { title: 'Consistency', emoji: '🔥', achievements: achievements.filter(a => a.category === 'streak') },
    training: { title: 'Learning', emoji: '📚', achievements: achievements.filter(a => a.category === 'training') },
    milestone: { title: 'Milestones', emoji: '🏆', achievements: achievements.filter(a => a.category === 'milestone') },
    special: { title: 'Special', emoji: '⭐', achievements: achievements.filter(a => !['jobs', 'streak', 'training', 'milestone'].includes(a.category)) },
  };

  const filteredCategories = filter === 'all' 
    ? categories 
    : { [filter]: categories[filter] };

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-transparent')}>
      {/* Header */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-xl px-4 pt-safe pb-4',
        isDark
          ? 'bg-gradient-to-b from-dark-950/98 to-dark-950/95 border-b border-white/5'
          : 'bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
      )}>
        <div className="flex items-center gap-2">
          <TrophyIcon className={clsx('h-6 w-6', isDark ? 'text-amber-400' : 'text-amber-500')} />
          <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Achievements</h1>
        </div>
        <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>
          Collect badges and earn rewards
        </p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Progress summary - Glassmorphism */}
        <div className={clsx(
          'relative p-5 rounded-2xl backdrop-blur-md border overflow-hidden',
          isDark
            ? 'bg-white/[0.03] border-white/[0.08]'
            : 'bg-white border-amber-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)]'
        )}>
          {/* Background glow */}
          {isDark && (
            <>
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            </>
          )}

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={clsx(
                'p-4 rounded-2xl border',
                isDark
                  ? 'bg-amber-500/20 border-amber-500/30 shadow-lg shadow-amber-500/20'
                  : 'bg-amber-100 border-amber-200'
              )}>
                <TrophyIcon className={clsx('h-8 w-8', isDark ? 'text-amber-400' : 'text-amber-600')} />
              </div>
              <div>
                <p className={clsx('text-3xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                  {unlockedIds.length}<span className={isDark ? 'text-dark-400' : 'text-slate-400'}>/{achievements.length}</span>
                </p>
                <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>Achievements Unlocked</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30">
                <ZapIcon className="h-5 w-5 text-amber-400" />
                <span className="text-xl font-bold text-violet-400">+{totalXP}</span>
              </div>
              <p className={clsx('text-xs mt-1', isDark ? 'text-dark-500' : 'text-slate-400')}>XP earned</p>
            </div>
          </div>

          {/* Progress bar - glow track */}
          <div className="mt-5">
            <div className={clsx('h-3 rounded-full overflow-hidden', isDark ? 'bg-dark-700' : 'bg-slate-200')}>
              <div
                className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
                style={{
                  width: `${(unlockedIds.length / Math.max(achievements.length, 1)) * 100}%`,
                  boxShadow: isDark ? '0 0 12px rgba(251,191,36,0.5)' : undefined
                }}
              />
            </div>
          </div>
        </div>

        {/* Filter tabs - Glass style */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {[
            { id: 'all', label: 'All' },
            { id: 'jobs', label: '💼 Jobs' },
            { id: 'streak', label: '🔥 Streak' },
            { id: 'training', label: '📚 Training' },
            { id: 'milestone', label: '🏆 Milestones' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border',
                filter === tab.id
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-900 border-transparent shadow-lg shadow-amber-500/25'
                  : isDark
                    ? 'bg-white/5 border-white/10 text-dark-400 hover:bg-white/10 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Achievements by category */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(filteredCategories).map(([key, category]) => (
              category.achievements.length > 0 && (
                <CategorySection
                  key={key}
                  title={category.title}
                  emoji={category.emoji}
                  achievements={category.achievements}
                  unlockedIds={unlockedIds}
                  isDark={isDark}
                />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
