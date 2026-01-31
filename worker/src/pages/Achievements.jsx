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
import { DEFAULT_LOCALE, RARITY_LABELS } from '../utils/constants';

const rarityConfig = {
  common: { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/30', glow: '' },
  uncommon: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', glow: 'shadow-green-500/20' },
  rare: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  epic: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', glow: 'shadow-purple-500/30' },
  legendary: { color: 'text-gold-400', bg: 'bg-gold-500/20', border: 'border-gold-500/30', glow: 'shadow-gold-500/40' },
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
  
  return (
    <div className={clsx(
      'relative p-4 rounded-2xl border transition-all',
      unlocked
        ? `${rarity.bg} ${rarity.border} shadow-lg ${rarity.glow}`
        : isDark ? 'bg-dark-800/30 border-white/5 opacity-60 grayscale' : 'bg-slate-100/50 border-slate-200 opacity-60 grayscale'
    )}>
      {/* Rarity badge */}
      <div className="absolute top-3 right-3">
        <span className={clsx(
          'px-2 py-0.5 rounded-full text-2xs font-bold uppercase',
          rarity.bg, rarity.color
        )}>
          {rarityLabel}
        </span>
      </div>

      {/* Icon */}
      <div className={clsx(
        'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3',
        unlocked ? rarity.bg : isDark ? 'bg-dark-700' : 'bg-slate-200'
      )}>
        {unlocked ? (
          <span>{achievement.icon || categoryIcons[achievement.category] || '🏅'}</span>
        ) : (
          <LockIcon className={clsx('h-8 w-8', isDark ? 'text-dark-500' : 'text-slate-400')} />
        )}
      </div>

      {/* Title & Description */}
      <h3 className={clsx(
        'font-semibold',
        unlocked ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-dark-500' : 'text-slate-400')
      )}>
        {achievement.name}
      </h3>
      <p className={clsx('text-sm mt-1 line-clamp-2', isDark ? 'text-dark-400' : 'text-slate-500')}>{achievement.description}</p>

      {/* XP Reward */}
      <div className={clsx('flex items-center justify-between mt-3 pt-3 border-t', isDark ? 'border-white/5' : 'border-slate-200')}>
        <div className={clsx(
          'flex items-center gap-1.5',
          unlocked ? 'text-primary-400' : (isDark ? 'text-dark-500' : 'text-slate-400')
        )}>
          <ZapIcon className="h-4 w-4" />
          <span className="text-sm font-medium">+{achievement.xp_reward} XP</span>
        </div>
        
        {unlocked && (
          <div className="flex items-center gap-1 text-accent-400">
            <CheckCircleIcon className="h-4 w-4" />
            <span className="text-xs">Unlocked</span>
          </div>
        )}
      </div>

      {/* Unlocked date */}
      {unlocked && achievement.unlocked_at && (
        <p className={clsx('text-xs mt-2', isDark ? 'text-dark-500' : 'text-slate-400')}>
          Earned {new Date(achievement.unlocked_at).toLocaleDateString(DEFAULT_LOCALE, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
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
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-lg px-4 pt-safe pb-4 border-b',
        isDark ? 'bg-dark-950/95 border-white/5' : 'bg-white/95 border-slate-200'
      )}>
        <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Achievements</h1>
        <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>Collect badges and earn rewards</p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Progress summary */}
        <div className={clsx(
          'p-4 rounded-2xl border',
          isDark
            ? 'bg-gradient-to-r from-gold-900/30 to-gold-800/10 border-gold-500/20'
            : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gold-500/20">
                <TrophyIcon className="h-8 w-8 text-gold-400" />
              </div>
              <div>
                <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                  {unlockedIds.length}/{achievements.length}
                </p>
                <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>Achievements Unlocked</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary-400">+{totalXP} XP</p>
              <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>Total earned</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className={clsx('h-2 rounded-full overflow-hidden', isDark ? 'bg-dark-800' : 'bg-slate-200')}>
              <div
                className="h-full bg-gradient-to-r from-gold-400 to-gold-500 rounded-full transition-all duration-500"
                style={{ width: `${(unlockedIds.length / Math.max(achievements.length, 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
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
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === tab.id
                  ? 'bg-primary-500 text-white'
                  : isDark ? 'bg-dark-800 text-dark-400' : 'bg-slate-100 text-slate-500'
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
