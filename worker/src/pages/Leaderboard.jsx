import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  CrownIcon,
  FlameIcon,
  ZapIcon,
  ClockIcon,
  SparklesIcon,
  StarIcon,
  UsersIcon,
  RocketIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';
import { calculateLevel } from '../../../shared/utils/gamification-browser';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import { SectionHeader } from '../components/common';

// Coming Soon Overlay
function ComingSoonOverlay() {
  // Lock body scroll when overlay is shown
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-theme-primary/80 backdrop-blur-md"
      style={{ position: 'fixed', height: '100dvh', width: '100vw' }}
    >
      {/* Centered Frame - does not scroll */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto overscroll-contain rounded-3xl bg-theme-card border border-white/10 p-6 shadow-2xl">
        <div className="text-center">
          {/* Animated icon */}
          <div className="relative mb-8 mx-auto w-32 h-32">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: '2s' }} />
              <TrophyIcon className="h-16 w-16 text-violet-400" />
            </div>
            {/* Floating badges */}
            <div className="absolute top-0 left-1/4 -translate-x-1/2 animate-bounce" style={{ animationDelay: '0.2s' }}>
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <CrownIcon className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div className="absolute top-1/4 right-0 animate-bounce" style={{ animationDelay: '0.5s' }}>
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <StarIcon className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 animate-bounce" style={{ animationDelay: '0.8s' }}>
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <ZapIcon className="h-4 w-4 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Leaderboard Coming Soon
          </h1>

          <p className="text-white/60 text-base sm:text-lg mb-6">
            We're building something exciting! Compete with other workers and climb to the top.
          </p>

          {/* Feature preview */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <TrophyIcon className="h-6 w-6 text-violet-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold">Weekly Rankings</h3>
                <p className="text-white/40 text-sm">Compete for the top spot every week</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold">Exclusive Rewards</h3>
                <p className="text-white/40 text-sm">Top performers earn special bonuses</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-amber-400" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold">Community Stats</h3>
                <p className="text-white/40 text-sm">See how you stack up against others</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-500/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <RocketIcon className="h-5 w-5 text-violet-400" />
              <span className="text-white font-semibold">Get Ready!</span>
            </div>
            <p className="text-white/50 text-sm">
              Complete quests and earn XP now to get a head start when the leaderboard launches!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 1) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30"><CrownIcon className="h-5 w-5 text-white" /></div>;
  if (rank === 2) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center"><span className="text-white font-bold">2</span></div>;
  if (rank === 3) return <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center"><span className="text-white font-bold">3</span></div>;
  return <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"><span className="text-white/50 font-medium">{rank}</span></div>;
}

function LeaderboardItem({ player, rank, isCurrentUser }) {
  const level = calculateLevel(player.xp || 0);

  return (
    <div className={clsx(
      'flex items-center gap-4 p-4 rounded-2xl transition-all',
      isCurrentUser
        ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-2 border-emerald-500/30'
        : rank <= 3
          ? 'bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20'
          : 'bg-theme-card/50 border border-white/[0.05]'
    )}>
      <RankBadge rank={rank} />

      <ProfileAvatar
        name={player.name}
        photoUrl={player.profile_photo}
        level={level}
        size="md"
        showLevel={false}
        selectedBorderId={player.selected_border_id}
      />

      <div className="flex-1 min-w-0">
        <h3 className={clsx('font-semibold truncate', isCurrentUser ? 'text-emerald-400' : 'text-white')}>
          {player.name}
          {player.profile_flair && <span className="ml-1">{player.profile_flair}</span>}
          {isCurrentUser && <span className="text-xs ml-1 text-emerald-400/70">(You)</span>}
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
          {rank <= 3 && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <StarIcon className="h-3 w-3" /> Top {rank}
            </span>
          )}
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <ZapIcon className="h-4 w-4 text-violet-400" />
          <span className="text-xl font-bold text-white">{(player.xp || 0).toLocaleString()}</span>
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
  const [userRank, setUserRank] = useState(null);

  // Coming soon flag - set to true to show the overlay
  const isComingSoon = true;

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/gamification/leaderboard?limit=50`);
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

  return (
    <div className="min-h-screen bg-theme-primary pb-24">
      {/* Coming Soon Overlay */}
      {isComingSoon && <ComingSoonOverlay />}

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

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <CrownIcon className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                <p className="text-xs text-white/40">Top Prize</p>
                <p className="text-lg font-bold text-amber-400">$50</p>
              </div>
              <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-center">
                <UsersIcon className="h-5 w-5 text-violet-400 mx-auto mb-1" />
                <p className="text-xs text-white/40">Players</p>
                <p className="text-lg font-bold text-white">{players.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <ZapIcon className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs text-white/40">Your Rank</p>
                <p className="text-lg font-bold text-emerald-400">{userRank ? `#${userRank}` : '-'}</p>
              </div>
            </div>

            {/* Your position card */}
            {userRank && currentUserData && (
              <div className="mt-4 flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <RankBadge rank={userRank} />
                  <div>
                    <p className="text-white/50 text-sm">Your Position</p>
                    <p className="text-emerald-400 font-bold text-xl">#{userRank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-sm">Your XP</p>
                  <p className="text-white font-bold text-xl">{(currentUserData?.xp || user?.xp || 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && players.length >= 3 && (
        <div className="px-4 mt-6">
          <SectionHeader title="Top Players" icon={CrownIcon} iconColor="text-amber-400" />
          <div className="flex items-end justify-center gap-3 mt-1">
            {/* 2nd place */}
            <div className="flex-1 text-center">
              <ProfileAvatar
                name={players[1]?.name}
                photoUrl={players[1]?.profile_photo}
                level={calculateLevel(players[1]?.xp || 0)}
                size="lg"
                className="mx-auto mb-2"
                selectedBorderId={players[1]?.selected_border_id}
              />
              <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-400/20 to-slate-600/10 border border-slate-400/30">
                <p className="text-white font-semibold text-sm truncate">
                  {players[1]?.name}
                  {players[1]?.profile_flair && <span className="ml-1">{players[1].profile_flair}</span>}
                </p>
                <p className="text-slate-400 text-xs">{(players[1]?.xp || 0).toLocaleString()} XP</p>
                <div className="mt-2 text-2xl font-bold text-slate-300">2nd</div>
              </div>
            </div>

            {/* 1st place */}
            <div className="flex-1 text-center">
              <div className="relative">
                <CrownIcon className="h-8 w-8 text-amber-400 mx-auto mb-1 animate-bounce" style={{ animationDuration: '2s' }} />
                <ProfileAvatar
                  name={players[0]?.name}
                  photoUrl={players[0]?.profile_photo}
                  level={calculateLevel(players[0]?.xp || 0)}
                  size="xl"
                  className="mx-auto mb-2"
                  selectedBorderId={players[0]?.selected_border_id}
                />
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-400/20 to-yellow-600/10 border border-amber-400/30">
                <p className="text-white font-bold truncate">
                  {players[0]?.name}
                  {players[0]?.profile_flair && <span className="ml-1">{players[0].profile_flair}</span>}
                </p>
                <p className="text-amber-400 text-sm">{(players[0]?.xp || 0).toLocaleString()} XP</p>
                <div className="mt-2 text-3xl font-bold text-amber-400">1st</div>
              </div>
            </div>

            {/* 3rd place */}
            <div className="flex-1 text-center">
              <ProfileAvatar
                name={players[2]?.name}
                photoUrl={players[2]?.profile_photo}
                level={calculateLevel(players[2]?.xp || 0)}
                size="lg"
                className="mx-auto mb-2"
                selectedBorderId={players[2]?.selected_border_id}
              />
              <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-600/20 to-amber-800/10 border border-amber-600/30">
                <p className="text-white font-semibold text-sm truncate">
                  {players[2]?.name}
                  {players[2]?.profile_flair && <span className="ml-1">{players[2].profile_flair}</span>}
                </p>
                <p className="text-amber-600 text-xs">{(players[2]?.xp || 0).toLocaleString()} XP</p>
                <div className="mt-2 text-2xl font-bold text-amber-600">3rd</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full rankings */}
      <div className="px-4 mt-6">
        <SectionHeader title="Full Rankings" icon={TrophyIcon} iconColor="text-violet-400" />

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12">
            <TrophyIcon className="h-16 w-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No players yet</h3>
            <p className="text-white/40 text-sm">Be the first to earn XP!</p>
          </div>
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
