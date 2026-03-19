import { clsx } from 'clsx';
import {
  ZapIcon,
  FlameIcon,
  TrendingUpIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';

const rarityConfig = {
  common: { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: 'Common' },
  rare: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Rare' },
  epic: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Epic' },
  legendary: { color: 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400', label: 'Legendary' },
};

function AchievementCard({ achievement }) {
  const rarity = rarityConfig[achievement.rarity] || rarityConfig.common;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className="text-3xl">{achievement.icon || '🏅'}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-900 dark:text-white">{achievement.name}</h4>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', rarity.color)}>
            {rarity.label}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{achievement.description}</p>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 text-primary-600">
          <ZapIcon className="h-4 w-4" />
          <span className="font-semibold">+{achievement.xp_reward}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{achievement.unlocked_count || 0} earned</p>
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, color = 'primary', trend }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    gold: 'bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        </div>
        {trend && (
          <div className={clsx(
            'flex items-center gap-1 text-sm',
            trend > 0 ? 'text-emerald-600' : 'text-red-600'
          )}>
            <TrendingUpIcon className={clsx('h-4 w-4', trend < 0 && 'rotate-180')} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function LeaderboardTable({ data }) {
  return (
    <div className="space-y-2">
      {data.map((user, idx) => (
        <div
          key={user.id}
          className={clsx(
            'flex items-center gap-4 p-3 rounded-xl',
            idx === 0 ? 'bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800' :
            idx === 1 ? 'bg-slate-100 dark:bg-slate-700/50' :
            idx === 2 ? 'bg-amber-50 dark:bg-amber-900/20' :
            'bg-slate-50 dark:bg-slate-800/50'
          )}
        >
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
            idx === 0 ? 'bg-gold-500 text-white' :
            idx === 1 ? 'bg-slate-400 text-white' :
            idx === 2 ? 'bg-amber-600 text-white' :
            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          )}>
            {idx + 1}
          </div>
          <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
            {user.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
            <p className="text-sm text-slate-500">Level {user.level}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-primary-600">{user.xp?.toLocaleString()} XP</p>
            {user.streak_days > 0 && (
              <div className="flex items-center gap-1 text-orange-500 text-sm">
                <FlameIcon className="h-3 w-3" />
                <span>{user.streak_days}d streak</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GamificationOverview({ leaderboard, achievements }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaderboardTable data={leaderboard.slice(0, 5)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Popular Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {achievements.slice(0, 4).map(a => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
