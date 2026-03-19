import React from 'react';
import {
  StarIcon,
  TrophyIcon,
  ChevronRightIcon,
  BriefcaseIcon,
} from 'lucide-react';
import Card from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { clsx } from 'clsx';
import { XP_THRESHOLDS as xpThresholds, LEVEL_TITLES as levelTitles } from '../../../../shared/utils/gamification-browser';

const getAvatarUrl = (candidate) => {
  if (candidate.profile_photo) return candidate.profile_photo;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(candidate.name)}`;
};

export default function CandidateCard({ candidate, onClick }) {
  const xpProgress = candidate.level < 10
    ? ((candidate.xp - xpThresholds[candidate.level - 1]) / (xpThresholds[candidate.level] - xpThresholds[candidate.level - 1])) * 100
    : 100;

  return (
    <Card hover onClick={onClick} className="relative overflow-hidden cursor-pointer group">
      {/* Level indicator stripe */}
      <div
        className={clsx(
          'absolute top-0 left-0 right-0 h-1.5 transition-all',
          candidate.level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
          candidate.level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-600' :
          'bg-gradient-to-r from-slate-300 to-slate-400'
        )}
      />

      <div className="flex items-start gap-4 pt-2">
        {/* Avatar with profile photo */}
        <div className="relative flex-shrink-0">
          <img
            src={getAvatarUrl(candidate)}
            alt={candidate.name}
            className="h-14 w-14 rounded-xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm"
          />
          {/* Level badge */}
          <div className={clsx(
            'absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm',
            candidate.level >= 8 ? 'bg-amber-500 text-white' :
            candidate.level >= 5 ? 'bg-primary-500 text-white' :
            'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          )}>
            {candidate.level}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{candidate.name}</h3>
            <StatusBadge status={candidate.status} />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className={clsx(
              'text-xs font-medium',
              candidate.level >= 8 ? 'text-amber-600' :
              candidate.level >= 5 ? 'text-primary-600' :
              'text-slate-500'
            )}>
              {levelTitles[candidate.level]}
            </span>
            {candidate.rating > 0 && (
              <div className="flex items-center gap-0.5 text-amber-500">
                <StarIcon className="h-3 w-3 fill-current" />
                <span className="text-xs font-medium">{Number(candidate.rating).toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* XP Bar */}
          <div className="mt-2">
            <div className="flex items-center justify-between text-2xs text-slate-400 mb-0.5">
              <span>{candidate.xp?.toLocaleString() || 0} XP</span>
              {candidate.level < 10 && <span>{xpThresholds[candidate.level]?.toLocaleString()} XP</span>}
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  candidate.level >= 8 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                  candidate.level >= 5 ? 'bg-gradient-to-r from-primary-400 to-primary-500' :
                  'bg-slate-400'
                )}
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              />
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <BriefcaseIcon className="h-3 w-3" />
              <span>{candidate.total_jobs_completed || 0} jobs</span>
            </div>
            {Array.isArray(candidate.certifications) && candidate.certifications.length > 0 && (
              <div className="flex items-center gap-1">
                <TrophyIcon className="h-3 w-3" />
                <span>{candidate.certifications.length} certs</span>
              </div>
            )}
          </div>
        </div>

        <ChevronRightIcon className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
      </div>
    </Card>
  );
}
