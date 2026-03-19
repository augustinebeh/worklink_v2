import {
  MailIcon,
  PhoneIcon,
  CalendarIcon,
  StarIcon,
  ZapIcon,
  EditIcon,
  BriefcaseIcon,
  WalletIcon,
  FlameIcon,
  SendIcon,
} from 'lucide-react';
import Card from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import { clsx } from 'clsx';
import { LEVEL_TITLES } from '../../../../shared/utils/gamification-browser';

// Level configuration (uses shared LEVEL_TITLES)
const levelConfig = {
  1: { title: LEVEL_TITLES[1], color: 'slate', minXp: 0 },
  2: { title: LEVEL_TITLES[2], color: 'slate', minXp: 500 },
  3: { title: LEVEL_TITLES[3], color: 'slate', minXp: 1200 },
  4: { title: LEVEL_TITLES[4], color: 'blue', minXp: 2500 },
  5: { title: LEVEL_TITLES[5], color: 'blue', minXp: 5000 },
  6: { title: LEVEL_TITLES[6], color: 'purple', minXp: 8000 },
  7: { title: LEVEL_TITLES[7], color: 'purple', minXp: 12000 },
  8: { title: LEVEL_TITLES[8], color: 'amber', minXp: 18000 },
  9: { title: LEVEL_TITLES[9], color: 'amber', minXp: 25000 },
  10: { title: LEVEL_TITLES[10], color: 'amber', minXp: 35000 },
};

function StatCard({ icon: Icon, label, value, subValue, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className={clsx('p-2.5 rounded-lg', colorClasses[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
      </div>
    </div>
  );
}

export default function CandidateHeader({ candidate, xpThresholds, onEdit, onMessage }) {
  const level = candidate.level || 1;
  const levelInfo = levelConfig[level];
  const currentXp = candidate.xp || 0;
  const nextLevelXp = level < 10 ? xpThresholds[level] : xpThresholds[9];
  const prevLevelXp = xpThresholds[level - 1];
  const xpProgress = level < 10
    ? ((currentXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100
    : 100;

  return (
    <>
      {/* Profile Header Card */}
      <Card className="relative overflow-hidden">
        {/* Level color stripe */}
        <div className={clsx(
          'absolute top-0 left-0 right-0 h-2',
          level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
          level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-600' :
          'bg-gradient-to-r from-slate-300 to-slate-400'
        )} />

        <div className="pt-4">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-start gap-4">
              <Avatar
                name={candidate.name}
                src={candidate.profile_photo}
                size="xl"
                status={candidate.online_status === 'online' ? 'online' : 'offline'}
              />
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {candidate.name}
                  </h1>
                  <StatusBadge status={candidate.status} />
                </div>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <MailIcon className="h-4 w-4" />
                    <span className="text-sm">{candidate.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <PhoneIcon className="h-4 w-4" />
                    <span className="text-sm">{candidate.phone}</span>
                  </div>
                  {candidate.date_of_birth && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-sm">
                        {new Date(candidate.date_of_birth).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Level Badge */}
                <div className="mt-4">
                  <div className={clsx(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                    level >= 8 ? 'bg-amber-100 dark:bg-amber-900/30' :
                    level >= 5 ? 'bg-primary-100 dark:bg-primary-900/30' :
                    'bg-slate-100 dark:bg-slate-800'
                  )}>
                    <ZapIcon className={clsx(
                      'h-4 w-4',
                      level >= 8 ? 'text-amber-600' :
                      level >= 5 ? 'text-primary-600' :
                      'text-slate-500'
                    )} />
                    <span className={clsx(
                      'font-semibold',
                      level >= 8 ? 'text-amber-700 dark:text-amber-400' :
                      level >= 5 ? 'text-primary-700 dark:text-primary-400' :
                      'text-slate-700 dark:text-slate-300'
                    )}>
                      Level {level} {levelInfo.title}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="md:ml-auto flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={SendIcon} onClick={onMessage}>
                Message
              </Button>
              <Button size="sm" icon={EditIcon} onClick={onEdit}>
                Edit Profile
              </Button>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {currentXp.toLocaleString()} XP
              </span>
              {level < 10 && (
                <span className="text-sm text-slate-500">
                  {(nextLevelXp - currentXp).toLocaleString()} XP to Level {level + 1}
                </span>
              )}
            </div>
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-500' :
                  'bg-slate-400'
                )}
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BriefcaseIcon}
          label="Jobs Completed"
          value={candidate.total_jobs_completed || 0}
          color="primary"
        />
        <StatCard
          icon={StarIcon}
          label="Average Rating"
          value={candidate.rating ? candidate.rating.toFixed(1) : '-'}
          subValue={candidate.rating ? '\u2B50'.repeat(Math.round(candidate.rating)) : 'No ratings yet'}
          color="amber"
        />
        <StatCard
          icon={WalletIcon}
          label="Total Earnings"
          value={`$${(candidate.total_earnings || 0).toFixed(0)}`}
          subValue={`+$${(candidate.total_incentives_earned || 0).toFixed(0)} incentives`}
          color="emerald"
        />
        <StatCard
          icon={FlameIcon}
          label="Current Streak"
          value={`${candidate.streak_days || 0} days`}
          color="blue"
        />
      </div>
    </>
  );
}
