import React, { useState, useEffect } from 'react';
import { 
  TrophyIcon, 
  MedalIcon,
  CrownIcon,
  StarIcon,
  ZapIcon,
  FlameIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MinusIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

const rankConfig = {
  1: { icon: CrownIcon, color: 'text-gold-400', bg: 'bg-gold-500/20', border: 'border-gold-500/30' },
  2: { icon: MedalIcon, color: 'text-slate-300', bg: 'bg-slate-400/20', border: 'border-slate-400/30' },
  3: { icon: MedalIcon, color: 'text-amber-600', bg: 'bg-amber-600/20', border: 'border-amber-600/30' },
};

function LeaderboardRow({ entry, rank, isCurrentUser }) {
  const config = rankConfig[rank];
  const RankIcon = config?.icon;

  const changeIcon = entry.change > 0 ? ChevronUpIcon : entry.change < 0 ? ChevronDownIcon : MinusIcon;
  const changeColor = entry.change > 0 ? 'text-accent-400' : entry.change < 0 ? 'text-red-400' : 'text-dark-500';

  return (
    <div className={clsx(
      'flex items-center gap-3 p-4 rounded-xl transition-colors',
      isCurrentUser 
        ? 'bg-primary-900/30 border border-primary-500/30' 
        : config 
          ? `${config.bg} border ${config.border}`
          : 'bg-dark-800/50 border border-white/5'
    )}>
      {/* Rank */}
      <div className={clsx(
        'w-10 h-10 rounded-xl flex items-center justify-center font-bold',
        config ? `${config.bg}` : 'bg-dark-700'
      )}>
        {RankIcon ? (
          <RankIcon className={clsx('h-6 w-6', config.color)} />
        ) : (
          <span className="text-dark-400">{rank}</span>
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex items-center gap-3 flex-1">
        <div className={clsx(
          'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
          isCurrentUser ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300'
        )}>
          {entry.name?.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={clsx('font-semibold', isCurrentUser ? 'text-primary-300' : 'text-white')}>
              {entry.name}
            </span>
            {isCurrentUser && (
              <span className="px-2 py-0.5 rounded-full bg-primary-500/30 text-primary-300 text-xs">You</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <span>Level {entry.level}</span>
            {entry.streak_days > 0 && (
              <div className="flex items-center gap-1">
                <FlameIcon className="h-3 w-3 text-orange-400" />
                <span>{entry.streak_days}d</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* XP & Change */}
      <div className="text-right">
        <div className="flex items-center gap-1 text-primary-400">
          <ZapIcon className="h-4 w-4" />
          <span className="font-bold">{entry.xp?.toLocaleString()}</span>
        </div>
        <div className={clsx('flex items-center gap-0.5 text-xs', changeColor)}>
          {React.createElement(changeIcon, { className: 'h-3 w-3' })}
          <span>{entry.change === 0 ? '-' : Math.abs(entry.change)}</span>
        </div>
      </div>
    </div>
  );
}

function TopThree({ entries, currentUserId }) {
  // Reorder for display: 2nd, 1st, 3rd
  const displayOrder = [entries[1], entries[0], entries[2]].filter(Boolean);
  
  return (
    <div className="flex items-end justify-center gap-4 px-4 py-6">
      {displayOrder.map((entry, idx) => {
        const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
        const config = rankConfig[actualRank];
        const isFirst = actualRank === 1;
        const isCurrentUser = entry?.id === currentUserId;

        if (!entry) return null;

        return (
          <div 
            key={entry.id} 
            className={clsx(
              'flex flex-col items-center',
              isFirst ? 'order-2' : idx === 0 ? 'order-1' : 'order-3'
            )}
          >
            {/* Crown for 1st place */}
            {isFirst && (
              <CrownIcon className="h-8 w-8 text-gold-400 mb-2 animate-bounce" />
            )}
            
            {/* Avatar */}
            <div className={clsx(
              'relative rounded-full flex items-center justify-center font-bold border-4',
              isFirst ? 'w-24 h-24 text-2xl' : 'w-20 h-20 text-xl',
              isCurrentUser ? 'bg-primary-500 border-primary-400' : 'bg-dark-700 border-dark-600',
              config.border
            )}>
              {entry.name?.charAt(0)}
              
              {/* Rank badge */}
              <div className={clsx(
                'absolute -bottom-2 px-3 py-1 rounded-full font-bold text-sm',
                config.bg, config.color, config.border, 'border'
              )}>
                #{actualRank}
              </div>
            </div>

            {/* Name & XP */}
            <p className={clsx(
              'font-semibold mt-4',
              isCurrentUser ? 'text-primary-300' : 'text-white'
            )}>
              {entry.name?.split(' ')[0]}
            </p>
            <div className="flex items-center gap-1 text-primary-400 mt-1">
              <ZapIcon className="h-4 w-4" />
              <span className="font-bold">{entry.xp?.toLocaleString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all'); // all, weekly, monthly

  useEffect(() => {
    fetchLeaderboard();
  }, [period, user]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/v1/gamification/leaderboard?period=${period}`);
      const data = await res.json();
      if (data.success) {
        // Add mock change data
        const withChanges = data.data.map((entry, idx) => ({
          ...entry,
          change: Math.floor(Math.random() * 5) - 2,
        }));
        setLeaderboard(withChanges);
        
        // Find user's rank
        const userIdx = withChanges.findIndex(e => e.id === user?.id);
        setUserRank(userIdx >= 0 ? userIdx + 1 : null);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-dark-950 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary-900/50 to-dark-950 px-4 pt-safe pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-dark-400 text-sm mt-1">Compete with other workers</p>
          </div>
          {userRank && (
            <div className="text-right">
              <p className="text-sm text-dark-400">Your Rank</p>
              <p className="text-2xl font-bold text-primary-400">#{userRank}</p>
            </div>
          )}
        </div>

        {/* Period filter */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'monthly', label: 'This Month' },
            { id: 'weekly', label: 'This Week' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={clsx(
                'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                period === tab.id 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-dark-800/50 text-dark-400'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {!loading && topThree.length > 0 && (
          <TopThree entries={topThree} currentUserId={user?.id} />
        )}
      </div>

      {/* Rest of leaderboard */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
          </div>
        ) : restOfLeaderboard.length === 0 ? (
          <div className="text-center py-8 text-dark-400">
            <TrophyIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No more entries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {restOfLeaderboard.map((entry, idx) => (
              <LeaderboardRow 
                key={entry.id} 
                entry={entry} 
                rank={idx + 4}
                isCurrentUser={entry.id === user?.id}
              />
            ))}
          </div>
        )}

        {/* User's position if not in top */}
        {userRank && userRank > 10 && user && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-center text-dark-400 text-sm mb-3">Your Position</p>
            <LeaderboardRow 
              entry={{
                ...user,
                change: 0,
              }}
              rank={userRank}
              isCurrentUser={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
