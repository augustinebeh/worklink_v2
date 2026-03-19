import {
  Database,
  Zap,
  DollarSign,
  MessageSquare,
} from 'lucide-react';
import Card from '../ui/Card';
import { clsx } from 'clsx';

const colorClasses = {
  primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

function StatCard({ icon: Icon, label, value, subValue, color = 'primary' }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {subValue && (
          <p className="text-xs text-slate-400">{subValue}</p>
        )}
      </div>
    </Card>
  );
}

export default function MLStatsCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Database}
        label="Knowledge Base Size"
        value={stats.kbSize || 0}
        subValue="Learned Q&A pairs"
        color="primary"
      />
      <StatCard
        icon={Zap}
        label="KB Hit Rate"
        value={`${((stats.kbHitRate || 0) * 100).toFixed(1)}%`}
        subValue="Answered without LLM"
        color="emerald"
      />
      <StatCard
        icon={MessageSquare}
        label="Total Responses"
        value={stats.totalResponses || 0}
        subValue={`${stats.llmCalls || 0} LLM calls`}
        color="violet"
      />
      <StatCard
        icon={DollarSign}
        label="Estimated Savings"
        value={`$${(stats.costSaved || 0).toFixed(2)}`}
        subValue="From KB hits"
        color="amber"
      />
    </div>
  );
}
