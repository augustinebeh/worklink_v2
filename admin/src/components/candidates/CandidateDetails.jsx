import {
  BadgeCheckIcon,
  UserIcon,
  TrophyIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import PerformanceScores from '../candidate/PerformanceScores';
import { clsx } from 'clsx';

function AchievementBadge({ achievement }) {
  const rarityColors = {
    common: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
    rare: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
    epic: 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700',
    legendary: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
  };

  return (
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-lg border-2',
      rarityColors[achievement.rarity || 'common']
    )}>
      <span className="text-2xl">{achievement.icon || '\uD83C\uDFC6'}</span>
      <div>
        <p className="font-medium text-slate-900 dark:text-white text-sm">{achievement.name}</p>
        <p className="text-xs text-slate-500">{achievement.description}</p>
      </div>
    </div>
  );
}

export default function CandidateDetails({ candidate }) {
  const certifications = candidate.certifications || [];
  const achievements = candidate.achievements || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BadgeCheckIcon className="h-5 w-5 text-primary-500" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {certifications.map((cert, idx) => (
                <Badge key={idx} variant="success" className="px-3 py-1">
                  {cert}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No certifications yet</p>
          )}
        </CardContent>
      </Card>

      {/* Source & Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary-500" />
            Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Source</span>
            <Badge variant="neutral" className="capitalize">{candidate.source || 'Direct'}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Referral Code</span>
            <span className="font-mono text-sm">{candidate.referral_code || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Member Since</span>
            <span>{new Date(candidate.created_at).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Last Active</span>
            <span>{candidate.last_seen ? new Date(candidate.last_seen).toLocaleDateString() : 'Never'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Performance Scores */}
      <PerformanceScores candidateId={candidate.id} />

      {/* Recent Achievements */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="h-5 w-5 text-amber-500" />
            Achievements ({achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {achievements.slice(0, 6).map((ach) => (
                <AchievementBadge key={ach.id} achievement={ach} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No achievements unlocked yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
