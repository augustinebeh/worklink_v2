import {
  TrophyIcon,
  CrownIcon,
  FlameIcon,
  ZapIcon,
  StarIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { calculateLevel } from '../../../../shared/utils/gamification-browser';
import ProfileAvatar from '../ui/ProfileAvatar';

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

export default function LeaderboardTable({ players, currentUserId, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse" />
        ))}
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-12">
        <TrophyIcon className="h-16 w-16 text-white/10 mx-auto mb-4" />
        <h3 className="text-white font-semibold mb-2">No players yet</h3>
        <p className="text-white/40 text-sm">Be the first to earn XP!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {players.map((player, index) => (
        <LeaderboardItem
          key={player.id}
          player={player}
          rank={index + 1}
          isCurrentUser={currentUserId === player.id}
        />
      ))}
    </div>
  );
}

// Export RankBadge for use in the podium section of the page
export { RankBadge };
