import {
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import Card from '../ui/Card';

export default function EscalationStats({ summary }) {
  const stats = [
    {
      label: 'Total',
      value: summary.total || 0,
      icon: Users,
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Pending',
      value: summary.pending || 0,
      icon: Clock,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      label: 'In Progress',
      value: summary.inProgress || 0,
      icon: TrendingUp,
      bgColor: 'bg-purple-100 dark:bg-purple-900/50',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'SLA Breached',
      value: summary.slaBreached || 0,
      icon: AlertTriangle,
      bgColor: 'bg-red-100 dark:bg-red-900/50',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      label: 'Unassigned',
      value: summary.unassigned || 0,
      icon: UserPlus,
      bgColor: 'bg-orange-100 dark:bg-orange-900/50',
      iconColor: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} padding="md">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                <Icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
