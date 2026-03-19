import {
  SearchIcon,
  DollarSignIcon,
  CheckCircleIcon,
  TrendingUpIcon,
} from 'lucide-react';
import Card from '../ui/Card';
import { clsx } from 'clsx';

function BPOKPICard({ title, value, subtitle, icon: Icon, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function BPOStatsCards({ stats, formatCurrency }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <BPOKPICard
        title="Active Tenders"
        value={(stats?.new || 0) + (stats?.reviewing || 0) + (stats?.bidding || 0)}
        subtitle="In pipeline"
        icon={SearchIcon}
        color="primary"
      />
      <BPOKPICard
        title="Total Value"
        value={formatCurrency(stats?.totalValue)}
        subtitle="Potential revenue"
        icon={DollarSignIcon}
        color="success"
      />
      <BPOKPICard
        title="Bids Submitted"
        value={stats?.submitted || 0}
        subtitle="Awaiting result"
        icon={CheckCircleIcon}
        color="info"
      />
      <BPOKPICard
        title="Won This Year"
        value={stats?.won || 0}
        subtitle={formatCurrency(stats?.wonValue)}
        icon={TrendingUpIcon}
        color="success"
      />
    </div>
  );
}
