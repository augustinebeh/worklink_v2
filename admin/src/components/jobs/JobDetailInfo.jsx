import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../ui/Card';
import { clsx } from 'clsx';

function StatCard({ icon: Icon, label, value, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
      <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export function StatsGrid({ job, startTime, endTime, formatDate }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={CalendarIcon} label="Date" value={formatDate(job.job_date)} color="info" />
      <StatCard icon={ClockIcon} label="Time" value={`${startTime} - ${endTime}`} color="primary" />
      <StatCard icon={UsersIcon} label="Workers" value={`${job.filled_slots}/${job.total_slots}`} color="warning" />
      <StatCard icon={MapPinIcon} label="Location" value={job.location} color="success" />
    </div>
  );
}

export function JobDescription({ job, formatCurrency }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-600 dark:text-slate-400">{job.description || 'No description provided.'}</p>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-sm text-slate-500">Charge Rate</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(job.charge_rate)}/hr</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Pay Rate</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(job.pay_rate)}/hr</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Break Time</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{job.break_minutes || 0} min</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">XP Bonus</p>
            <p className="text-lg font-semibold text-primary-600">{job.xp_bonus || 0} XP</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FinancialSummary({ totalRevenue, totalCost, grossProfit, formatCurrency }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Revenue</span>
            <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Worker Pay</span>
            <span className="font-semibold text-slate-900 dark:text-white">-{formatCurrency(totalCost)}</span>
          </div>
          <div className="border-t pt-4 flex justify-between">
            <span className="font-medium text-slate-700 dark:text-slate-300">Gross Profit</span>
            <span className={clsx(
              'font-bold',
              grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
            )}>
              {formatCurrency(grossProfit)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Margin</span>
            <span className="text-slate-600">
              {totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClientInfo({ job }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Client</CardTitle>
      </CardHeader>
      <CardContent>
        <Link
          to={`/clients/${job.client_id}`}
          className="block p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <p className="font-semibold text-slate-900 dark:text-white">{job.company_name}</p>
          <p className="text-sm text-slate-500 mt-1">{job.industry}</p>
        </Link>
      </CardContent>
    </Card>
  );
}
