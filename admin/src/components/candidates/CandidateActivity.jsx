import {
  StarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
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

function DeploymentRow({ deployment }) {
  const statusColors = {
    completed: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    assigned: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    cancelled: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className={clsx('p-2 rounded-lg', statusColors[deployment.status] || statusColors.assigned)}>
          {deployment.status === 'completed' ? (
            <CheckCircleIcon className="h-4 w-4" />
          ) : deployment.status === 'cancelled' ? (
            <XCircleIcon className="h-4 w-4" />
          ) : (
            <ClockIcon className="h-4 w-4" />
          )}
        </div>
        <div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">{deployment.job_title}</p>
          <p className="text-xs text-slate-500">{deployment.company_name} &bull; {deployment.location}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-slate-900 dark:text-white">{new Date(deployment.job_date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</p>
        {deployment.rating && (
          <div className="flex items-center gap-1 text-amber-500 text-xs">
            <StarIcon className="h-3 w-3 fill-current" />
            <span>{deployment.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CandidateActivity({ activeTab, candidate }) {
  const deployments = candidate.deployments || [];
  const achievements = candidate.achievements || [];

  if (activeTab === 'deployments') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
        </CardHeader>
        <CardContent>
          {deployments.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {deployments.map((dep) => (
                <DeploymentRow key={dep.id} deployment={dep} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No job history yet</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'achievements') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach) => (
                <AchievementBadge key={ach.id} achievement={ach} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No achievements unlocked yet</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
