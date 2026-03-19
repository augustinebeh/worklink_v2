import { useState, useEffect } from 'react';
import {
  TrophyIcon,
  CrownIcon,
  ZapIcon,
  UsersIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { calculateLevel } from '../../../shared/utils/gamification-browser';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import { SectionHeader } from '../components/common';
import LeaderboardTable, { RankBadge } from '../components/gamification/LeaderboardTable';
import ComingSoonOverlay from '../components/gamification/LeaderboardFilters';

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
        <LeaderboardTable
          players={players}
          currentUserId={user?.id}
          loading={loading}
        />
      </div>
    </div>
  );
}
