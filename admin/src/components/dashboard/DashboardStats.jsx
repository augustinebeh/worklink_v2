import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  BriefcaseIcon,
  DollarSignIcon,
  TargetIcon,
  ChevronRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  HelpCircleIcon,
} from 'lucide-react';
import Card from '../ui/Card';
import { clsx } from 'clsx';

const formatCurrency = (value, compact = false) => {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(value || 0);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(value || 0);
};

function KPICard({ title, value, subtitle, change, trend, icon: Icon, color = 'primary', loading, linkTo, tooltip }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  const content = (
    <Card hover={!!linkTo} className="h-full relative">
      {tooltip && (
        <button
          className="absolute top-2 right-2 text-slate-300 hover:text-slate-500"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <HelpCircleIcon className="h-4 w-4" />
        </button>
      )}

      {showTooltip && tooltip && (
        <div className="absolute top-8 right-2 z-10 p-2 rounded-lg bg-slate-900 text-white text-xs max-w-48 shadow-lg">
          {tooltip}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          )}
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <ArrowUpIcon className="h-3 w-3 text-emerald-500" />
              ) : trend === 'down' ? (
                <ArrowDownIcon className="h-3 w-3 text-red-500" />
              ) : null}
              <span className={clsx('text-xs font-medium', trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500')}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );

  return linkTo ? <Link to={linkTo}>{content}</Link> : content;
}

export default function DashboardStats({ data, financialData, loading, profitGrowth }) {
  return (
    <>
      {/* Main KPIs with helpful tooltips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Gross Profit (Total)"
          value={formatCurrency(financialData?.currentEarnings?.total_gross_profit)}
          subtitle={`${financialData?.currentEarnings?.avg_margin_percent || 0}% avg margin`}
          change={profitGrowth ? `${profitGrowth}% vs last month` : undefined}
          trend={profitGrowth > 0 ? 'up' : profitGrowth < 0 ? 'down' : undefined}
          icon={DollarSignIcon}
          color="success"
          loading={loading}
          linkTo="/financials"
          tooltip="Your total profit after paying workers. Target: $3-5K/month for part-time, $10K+ full-time."
        />
        <KPICard
          title="Active Candidates"
          value={data?.candidates?.active || 0}
          subtitle={`${data?.candidates?.newThisMonth || 0} new this month`}
          icon={UsersIcon}
          color="info"
          loading={loading}
          linkTo="/candidates"
          tooltip="Workers ready to deploy. You need ~3x your average job slots for reliable fill rates."
        />
        <KPICard
          title="Open Jobs"
          value={data?.jobs?.open || 0}
          subtitle={`${data?.deployments?.upcoming || 0} deployments scheduled`}
          icon={BriefcaseIcon}
          color="warning"
          loading={loading}
          linkTo="/jobs"
          tooltip="Jobs waiting to be filled. Aim to fill 80%+ of slots for every job."
        />
        <KPICard
          title="Tender Pipeline"
          value={formatCurrency(data?.tenders?.pipelineValue, true)}
          subtitle={`${data?.tenders?.active || 0} active bids`}
          icon={TargetIcon}
          color="primary"
          loading={loading}
          linkTo="/bpo"
          tooltip="Total value of tenders you're pursuing. Win rate averages 15-25% for newcomers."
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/jobs">
          <Card hover className="bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">Jobs Needing Staff</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{data?.jobs?.open || 0}</p>
                <p className="text-xs text-amber-600/70 mt-1">Fill these to earn!</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-amber-400" />
            </div>
          </Card>
        </Link>
        <Link to="/candidates?status=onboarding">
          <Card hover className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Pending Onboarding</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{data?.candidates?.byStatus?.find(s => s.status === 'onboarding')?.count || 0}</p>
                <p className="text-xs text-blue-600/70 mt-1">Complete their setup</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-blue-400" />
            </div>
          </Card>
        </Link>
        <Link to="/bpo">
          <Card hover className="bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">Tenders Closing Soon</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">{data?.tenders?.active || 0}</p>
                <p className="text-xs text-purple-600/70 mt-1">Don't miss deadlines!</p>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-purple-400" />
            </div>
          </Card>
        </Link>
      </div>
    </>
  );
}
