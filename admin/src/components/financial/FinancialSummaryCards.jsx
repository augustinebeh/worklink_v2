import {
  DollarSignIcon,
  TrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CalendarIcon,
  TargetIcon,
  GiftIcon,
  WalletIcon,
} from 'lucide-react';
import Card from '../ui/Card';
import { clsx } from 'clsx';

export const formatCurrency = (value, compact = false) => {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(value || 0);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(value || 0);
};

export function MarginIndicator({ margin, minMargin = 20 }) {
  const isHealthy = margin >= minMargin;
  return (
    <div className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
      isHealthy ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    )}>
      {isHealthy ? <CheckCircleIcon className="h-3 w-3" /> : <AlertTriangleIcon className="h-3 w-3" />}
      {margin.toFixed(1)}%
    </div>
  );
}

function FinancialKPI({ title, value, subtitle, change, trend, icon: Icon, color = 'primary', loading }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  if (loading) {
    return <Card><div className="animate-pulse"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3" /><div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2" /></div></Card>;
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {change && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? <ArrowUpIcon className="h-3 w-3 text-emerald-500" /> : trend === 'down' ? <ArrowDownIcon className="h-3 w-3 text-red-500" /> : null}
              <span className={clsx('text-xs font-medium', trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500')}>{change}</span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

export function KPIRow({ data, loading, monthChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <FinancialKPI title="Total Revenue" value={formatCurrency(data?.currentEarnings?.total_revenue)} subtitle={`${data?.currentEarnings?.total_deployments || 0} deployments`} change={monthChange?.value} trend={monthChange?.trend} icon={DollarSignIcon} color="primary" loading={loading} />
      <FinancialKPI title="Gross Profit" value={formatCurrency(data?.currentEarnings?.total_gross_profit)} subtitle={`${data?.currentEarnings?.avg_margin_percent}% margin`} icon={TrendingUpIcon} color="success" loading={loading} />
      <FinancialKPI title="Incentives Paid" value={formatCurrency(data?.currentEarnings?.total_incentives)} subtitle="Total paid out" icon={GiftIcon} color="warning" loading={loading} />
      <FinancialKPI title="Net Profit" value={formatCurrency(data?.currentEarnings?.net_profit)} subtitle="After incentives" icon={WalletIcon} color="success" loading={loading} />
    </div>
  );
}

export function QuickStats({ data }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card className="text-center p-4 bg-blue-50 dark:bg-blue-900/20">
        <p className="text-3xl font-bold text-blue-600">{data?.currentEarnings?.total_hours?.toFixed(0) || 0}</p>
        <p className="text-sm text-blue-600/70">Total Hours Billed</p>
      </Card>
      <Card className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20">
        <p className="text-3xl font-bold text-emerald-600">${(data?.rateAnalysis?.averages?.avg_charge_rate || 0).toFixed(2)}</p>
        <p className="text-sm text-emerald-600/70">Avg Charge Rate</p>
      </Card>
      <Card className="text-center p-4 bg-amber-50 dark:bg-amber-900/20">
        <p className="text-3xl font-bold text-amber-600">${(data?.rateAnalysis?.averages?.avg_pay_rate || 0).toFixed(2)}</p>
        <p className="text-sm text-amber-600/70">Avg Pay Rate</p>
      </Card>
      <Card className="text-center p-4 bg-purple-50 dark:bg-purple-900/20">
        <p className="text-3xl font-bold text-purple-600">{(data?.rateAnalysis?.averages?.avg_margin_percent || 0).toFixed(1)}%</p>
        <p className="text-sm text-purple-600/70">Avg Gross Margin</p>
      </Card>
    </div>
  );
}

export function ProjectionSummaryCards({ data }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/50"><CalendarIcon className="h-6 w-6 text-blue-600" /></div>
          <div>
            <p className="text-sm text-slate-500">Projected Revenue</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.projected?.revenue)}</p>
            <p className="text-xs text-slate-400">{data?.projected?.upcomingJobs?.length || 0} upcoming jobs</p>
          </div>
        </div>
      </Card>
      <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50"><TrendingUpIcon className="h-6 w-6 text-emerald-600" /></div>
          <div>
            <p className="text-sm text-slate-500">Projected Profit</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.projected?.profit)}</p>
            <p className="text-xs text-slate-400">Before incentives</p>
          </div>
        </div>
      </Card>
      <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900 border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/50"><TargetIcon className="h-6 w-6 text-purple-600" /></div>
          <div>
            <p className="text-sm text-slate-500">Tender Pipeline</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(data?.tenderPipeline?.pipeline_value, true)}</p>
            <p className="text-xs text-slate-400">{formatCurrency(data?.tenderPipeline?.monthly_recurring_potential)}/mo potential</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function IncentiveSummaryCards({ data }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="text-center p-2">
          <p className="text-3xl font-bold text-amber-600">{formatCurrency(data?.incentiveAnalysis?.total_incentives)}</p>
          <p className="text-sm text-amber-600/70">Total Incentives Paid</p>
        </div>
      </Card>
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="text-center p-2">
          <p className="text-3xl font-bold text-blue-600">{(data?.incentiveAnalysis?.incentive_percent_of_profit || 0).toFixed(1)}%</p>
          <p className="text-sm text-blue-600/70">% of Gross Profit</p>
        </div>
      </Card>
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <div className="text-center p-2">
          <p className="text-3xl font-bold text-purple-600">{data?.incentiveAnalysis?.deployments_with_incentive || 0}</p>
          <p className="text-sm text-purple-600/70">Deployments with Incentives</p>
        </div>
      </Card>
    </div>
  );
}
