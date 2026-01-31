import { useState, useEffect } from 'react';
import {
  SwordIcon,
  ZapIcon,
  CheckCircleIcon,
  ClockIcon,
  GiftIcon,
  StarIcon,
  TrophyIcon,
  FlameIcon,
  TargetIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { clsx } from 'clsx';
import { QUEST_TYPE_LABELS } from '../utils/constants';

const questTypeConfig = {
  daily: { color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
  weekly: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  special: { color: 'text-gold-400', bg: 'bg-gold-500/20', border: 'border-gold-500/30' },
  repeatable: { color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  challenge: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

function QuestCard({ quest, onClaim, isDark }) {
  const config = questTypeConfig[quest.type] || questTypeConfig.daily;
  const typeLabel = QUEST_TYPE_LABELS[quest.type] || QUEST_TYPE_LABELS.daily;
  const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
  const isCompleted = quest.status === 'completed';
  const isClaimable = quest.progress >= quest.target && quest.status !== 'claimed';

  return (
    <div className={clsx(
      'p-4 rounded-2xl border transition-all',
      isCompleted ? 'bg-accent-900/20 border-accent-500/30' :
      isClaimable ? 'bg-gold-900/20 border-gold-500/30 animate-pulse' :
      isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Type badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={clsx(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              config.bg, config.color
            )}>
              {typeLabel}
            </span>
            {isCompleted && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-400 text-xs">
                <CheckCircleIcon className="h-3 w-3" />
                Completed
              </span>
            )}
          </div>

          {/* Title & Description */}
          <h3 className={clsx(
            'font-semibold text-lg',
            isCompleted ? (isDark ? 'text-dark-400' : 'text-slate-400') + ' line-through' : (isDark ? 'text-white' : 'text-slate-900')
          )}>
            {quest.title}
          </h3>
          <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>{quest.description}</p>

          {/* Progress bar */}
          {!isCompleted && quest.target > 1 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={isDark ? 'text-dark-400' : 'text-slate-500'}>Progress</span>
                <span className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>{quest.progress}/{quest.target}</span>
              </div>
              <div className={clsx('h-2 rounded-full overflow-hidden', isDark ? 'bg-dark-700' : 'bg-slate-200')}>
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    isClaimable ? 'bg-gold-500' : 'bg-primary-500'
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reward */}
        <div className="flex flex-col items-end gap-2">
          <div className={clsx(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
            isCompleted ? (isDark ? 'bg-dark-700 text-dark-500' : 'bg-slate-200 text-slate-400') : 'bg-primary-500/20 text-primary-400'
          )}>
            <ZapIcon className="h-4 w-4" />
            <span className="font-bold">+{quest.xp_reward}</span>
          </div>

          {isClaimable && (
            <button
              onClick={() => onClaim(quest.id)}
              className="px-4 py-2 rounded-lg bg-gold-500 text-dark-900 font-semibold text-sm hover:bg-gold-400 transition-colors"
            >
              Claim!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, isDark }) {
  return (
    <div className={clsx(
      'flex flex-col items-center p-4 rounded-xl border',
      isDark ? 'bg-dark-800/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
    )}>
      <Icon className={clsx('h-6 w-6 mb-2', color)} />
      <p className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>{value}</p>
      <p className={clsx('text-xs text-center', isDark ? 'text-dark-500' : 'text-slate-500')}>{label}</p>
    </div>
  );
}

export default function Quests() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [quests, setQuests] = useState([]);
  const [stats, setStats] = useState({ completed: 0, available: 0, totalXP: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchQuests();
  }, [user]);

  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/v1/gamification/quests');
      const data = await res.json();
      if (data.success) {
        // Add mock progress for demo
        const questsWithProgress = data.data.map((q, idx) => ({
          ...q,
          progress: idx === 0 ? 1 : idx === 1 ? 0 : Math.floor(Math.random() * (q.target || 1)),
          target: q.target || 1,
          status: idx === 0 ? 'completed' : 'available',
        }));
        setQuests(questsWithProgress);
        
        const completed = questsWithProgress.filter(q => q.status === 'completed').length;
        const totalXP = questsWithProgress.filter(q => q.status === 'completed').reduce((sum, q) => sum + q.xp_reward, 0);
        setStats({ 
          completed, 
          available: questsWithProgress.length - completed,
          totalXP 
        });
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (questId) => {
    // Mark as claimed and award XP
    setQuests(prev => prev.map(q => 
      q.id === questId ? { ...q, status: 'claimed' } : q
    ));
    
    // In real app, call API to claim reward
    // await fetch(`/api/v1/gamification/quests/${questId}/claim`, { method: 'POST' });
  };

  const filteredQuests = quests.filter(q => {
    if (filter === 'completed') return q.status === 'completed' || q.status === 'claimed';
    if (filter === 'available') return q.status === 'available';
    if (filter === 'daily') return q.type === 'daily';
    if (filter === 'weekly') return q.type === 'weekly';
    if (filter === 'special') return q.type === 'special';
    return true;
  });

  return (
    <div className={clsx('min-h-screen pb-24', isDark ? 'bg-dark-950' : 'bg-slate-50')}>
      {/* Header */}
      <div className={clsx(
        'sticky top-0 z-10 backdrop-blur-lg px-4 pt-safe pb-4 border-b',
        isDark ? 'bg-dark-950/95 border-white/5' : 'bg-white/95 border-slate-200'
      )}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={clsx('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>Quests</h1>
            <p className={clsx('text-sm mt-1', isDark ? 'text-dark-400' : 'text-slate-500')}>Complete quests to earn XP rewards</p>
          </div>
          <button
            onClick={fetchQuests}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              isDark ? 'bg-dark-800 text-dark-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
            )}
          >
            <RefreshCwIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={TargetIcon} label="Available" value={stats.available} color="text-primary-400" isDark={isDark} />
          <StatCard icon={CheckCircleIcon} label="Completed" value={stats.completed} color="text-accent-400" isDark={isDark} />
          <StatCard icon={ZapIcon} label="XP Earned" value={stats.totalXP} color="text-gold-400" isDark={isDark} />
        </div>

        {/* Daily Reset Timer */}
        <div className={clsx(
          'p-4 rounded-xl border',
          isDark
            ? 'bg-gradient-to-r from-primary-900/30 to-accent-900/30 border-primary-500/20'
            : 'bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/20">
                <ClockIcon className="h-5 w-5 text-primary-400" />
              </div>
              <div>
                <p className={clsx('font-medium', isDark ? 'text-white' : 'text-slate-900')}>Daily Quests Reset</p>
                <p className={clsx('text-sm', isDark ? 'text-dark-400' : 'text-slate-500')}>New quests available tomorrow</p>
              </div>
            </div>
            <div className="text-right">
              <p className={clsx('text-xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>12:34:56</p>
              <p className={clsx('text-xs', isDark ? 'text-dark-500' : 'text-slate-400')}>remaining</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {[
            { id: 'all', label: 'All' },
            { id: 'available', label: 'Available' },
            { id: 'daily', label: 'Daily' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'special', label: 'Special' },
            { id: 'completed', label: 'Completed' },
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

        {/* Quest list */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="text-center py-12">
            <SwordIcon className={clsx('h-12 w-12 mx-auto mb-4', isDark ? 'text-dark-600' : 'text-slate-300')} />
            <p className={isDark ? 'text-dark-400' : 'text-slate-500'}>No quests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuests.map(quest => (
              <QuestCard key={quest.id} quest={quest} onClaim={handleClaim} isDark={isDark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
