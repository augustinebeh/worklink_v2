import { useState, useEffect } from 'react';
import { TrophyIcon, CrownIcon, FlameIcon, ZapIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { calculateLevel } from '../utils/gamification';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import { FilterTabs, EmptyState, LoadingSkeleton } from '../components/common';

function RankBadge({ rank }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center"><CrownIcon className="h-4 w-4 text-white" /></div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center"><span className="text-white font-bold text-sm">2</span></div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center"><span className="text-white font-bold text-sm">3</span></div>;
  return <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><span className="text-white/50 font-medium text-sm">{rank}</span></div>;
}

function LeaderboardItem({ player, rank, isCurrentUser }) {
  const level = calculateLevel(player.xp || 0);

  return (
    <div className={clsx(
      'flex items-center gap-4 p-4 rounded-2xl transition-all',
      isCurrentUser
        ? 'bg-emerald-500/10 border-2 border-emerald-500/30'
        : rank <= 3
          ? 'bg-[#0a1628]/80 border border-amber-500/20'
          : 'bg-[#0a1628]/50 border border-white/[0.05]'
    )}>
      <RankBadge rank={rank} />

      <ProfileAvatar
        name={player.name}
        photoUrl={player.profile_photo}
        level={level}
        size="md"
        showLevel={false}
      />

      <div className="flex-1 min-w-0">
        <h3 className={clsx('font-semibold truncate', isCurrentUser ? 'text-emerald-400' : 'text-white')}>
          {player.name}
          {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
        </h3>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-400 text-xs font-medium">
            Lv.{level}
          </span>
          {player.streak_days > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <FlameIcon className="h-3 w-3" /> {player.streak_days}
            </span>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <ZapIcon className="h-4 w-4 text-violet-400" />
          <span className="text-lg font-bold text-white">{(player.xp || 0).toLocaleString()}</span>
        </div>
        <span className="text-xs text-white/40">XP</span>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/gamification/leaderboard?period=${period}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setPlayers(data.data || []);
        if (user) {
          const rank = data.data.findIndex(p => p.id === user.id) + 1;
          setUserRank(rank > 0 ? rank : null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentUserData = user ? players.find(p => p.id === user.id) : null;

  const tabs = [
    { id: 'all', label: 'All Time' },
    { id: 'monthly', label: 'This Month' },
    { id: 'weekly', label: 'This Week' },
  ];

  return (
    <div className="min-h-screen bg-[#020817] pb-24">
      {/* Header Card */}
      <div className="px-4 pt-4">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#0d1f3c] to-[#0f2847]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/15 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
          <div className="absolute inset-0 rounded-3xl border border-white/[0.08]" />

          <div className="relative p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <TrophyIcon className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
                <p className="text-white/50">Compete with other workers</p>
              </div>
            </div>

            {userRank && (
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <RankBadge rank={userRank} />
                  <div>
                    <p className="text-white/50 text-sm">Your Rank</p>
                    <p className="text-emerald-400 font-bold text-lg">#{userRank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-sm">Your XP</p>
                  <p className="text-white font-bold text-lg">{(currentUserData?.xp || user?.xp || 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <FilterTabs tabs={tabs} activeFilter={period} onFilterChange={setPeriod} variant="violet" />
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <LoadingSkeleton count={5} height="h-20" />
        ) : players.length === 0 ? (
          <EmptyState
            icon={TrophyIcon}
            title="No players yet"
            description="Be the first to earn XP!"
          />
        ) : (
          <div className="space-y-3">
            {players.map((player, index) => (
              <LeaderboardItem
                key={player.id}
                player={player}
                rank={index + 1}
                isCurrentUser={user?.id === player.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
