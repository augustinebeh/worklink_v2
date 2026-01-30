import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  UsersIcon, 
  BriefcaseIcon, 
  DollarSignIcon, 
  TrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  AlertCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  ZapIcon,
  TargetIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { clsx } from 'clsx';

// Format currency
const formatCurrency = (value, compact = false) => {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(value || 0);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(value || 0);
};

// KPI Card Component
function KPICard({ title, value, subtitle, change, trend, icon: Icon, color = 'primary', loading, linkTo }) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  const content = (
    <Card hover={!!linkTo} className="h-full">
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

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }
  return content;
}

// Alert Card Component
function AlertCard({ title, count, items, color, linkTo }) {
  const colorClasses = {
    warning: 'border-l-amber-500 bg-amber-50 dark:bg-amber-900/10',
    danger: 'border-l-red-500 bg-red-50 dark:bg-red-900/10',
    info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10',
  };

  return (
    <Link to={linkTo}>
      <Card className={clsx('border-l-4', colorClasses[color])} hover>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{count}</p>
          </div>
          <ChevronRightIcon className="h-5 w-5 text-slate-400" />
        </div>
      </Card>
    </Link>
  );
}

// Month labels
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, financialRes] = await Promise.all([
        fetch('/api/v1/analytics/dashboard'),
        fetch('/api/v1/analytics/financial/dashboard'),
      ]);
      
      const analyticsData = await analyticsRes.json();
      const finData = await financialRes.json();
      
      if (analyticsData.success) setData(analyticsData.data);
      if (finData.success) setFinancialData(finData.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare profit growth chart data
  const profitChartData = financialData?.monthlyTrend?.map(item => ({
    month: item.month ? monthNames[parseInt(item.month.split('-')[1]) - 1] + ' ' + item.month.split('-')[0].slice(2) : '',
    revenue: item.revenue || 0,
    costs: item.costs || 0,
    grossProfit: item.gross_profit || 0,
    netProfit: item.net_profit || 0,
  })) || [];

  // Calculate growth metrics
  const currentMonth = financialData?.thisMonth;
  const lastMonth = financialData?.lastMonth;
  const profitGrowth = lastMonth?.profit && currentMonth?.profit
    ? (((currentMonth.profit - lastMonth.profit) / lastMonth.profit) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Welcome back! Here's your business overview.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClockIcon className="h-4 w-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Main KPIs */}
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
        />
        <KPICard
          title="Total Revenue"
          value={formatCurrency(financialData?.currentEarnings?.total_revenue)}
          subtitle={`${financialData?.currentEarnings?.total_deployments || 0} completed deployments`}
          icon={TrendingUpIcon}
          color="primary"
          loading={loading}
          linkTo="/financials"
        />
        <KPICard
          title="Active Candidates"
          value={data?.candidates?.active || 0}
          subtitle={`${data?.candidates?.newThisMonth || 0} new this month`}
          icon={UsersIcon}
          color="info"
          loading={loading}
          linkTo="/candidates"
        />
        <KPICard
          title="Tender Pipeline"
          value={formatCurrency(data?.tenders?.pipelineValue, true)}
          subtitle={`${data?.tenders?.active || 0} active tenders`}
          icon={TargetIcon}
          color="warning"
          loading={loading}
          linkTo="/bpo"
        />
      </div>

      {/* Main Chart - Gross Profit Growth */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gross Profit Growth</CardTitle>
              <p className="text-sm text-slate-500 mt-1">Monthly revenue, costs, and profit trend</p>
            </div>
            <Link to="/financials" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View Details <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : profitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profitChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px', 
                      color: '#f1f5f9',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value, name) => [formatCurrency(value), name === 'grossProfit' ? 'Gross Profit' : name === 'revenue' ? 'Revenue' : 'Costs']}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend 
                    formatter={(value) => value === 'grossProfit' ? 'Gross Profit' : value === 'revenue' ? 'Revenue' : 'Costs'}
                    wrapperStyle={{ paddingTop: '20px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#revenueGradient)" 
                    name="revenue"
                  />
                  <Bar 
                    dataKey="costs" 
                    fill="#94a3b8" 
                    radius={[4, 4, 0, 0]} 
                    name="costs"
                    barSize={30}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="grossProfit" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fill="url(#profitGradient)" 
                    name="grossProfit"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                No data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Operations Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <BriefcaseIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Open Jobs</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">{data?.jobs?.open || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <CalendarIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Upcoming Deployments</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">{data?.deployments?.upcoming || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <DollarSignIcon className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Pending Payments</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(data?.financials?.pendingPayments)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <ZapIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400">Total Incentives Paid</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(data?.financials?.totalIncentives)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Pipeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Candidate Pipeline</CardTitle>
              <Link to="/candidates" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.candidates?.byStatus?.map((status) => {
                const colors = {
                  lead: 'bg-slate-500',
                  applied: 'bg-blue-500',
                  screening: 'bg-amber-500',
                  onboarding: 'bg-purple-500',
                  active: 'bg-emerald-500',
                  inactive: 'bg-red-500',
                };
                const total = data?.candidates?.total || 1;
                const percentage = ((status.count / total) * 100).toFixed(0);
                
                return (
                  <div key={status.status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-slate-600 dark:text-slate-400">{status.status}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{status.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={clsx('h-full rounded-full transition-all', colors[status.status] || 'bg-slate-400')}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tender Pipeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>BPO Tenders</CardTitle>
              <Link to="/bpo" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                  <p className="text-2xl font-bold text-blue-600">{data?.tenders?.active || 0}</p>
                  <p className="text-xs text-blue-600/70">Active</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-center">
                  <p className="text-2xl font-bold text-amber-600">{data?.tenders?.submitted || 0}</p>
                  <p className="text-xs text-amber-600/70">Submitted</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{data?.tenders?.won || 0}</p>
                  <p className="text-xs text-emerald-600/70">Won</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-center">
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(data?.tenders?.wonValue, true)}</p>
                  <p className="text-xs text-purple-600/70">Won Value</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Pipeline Value</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(data?.tenders?.pipelineValue)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / Alerts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AlertCard
          title="Jobs Needing Staff"
          count={data?.jobs?.open || 0}
          color="warning"
          linkTo="/jobs"
        />
        <AlertCard
          title="Pending Withdrawals"
          count={0}
          color="info"
          linkTo="/payments"
        />
        <AlertCard
          title="Tenders Closing Soon"
          count={data?.tenders?.submitted || 0}
          color="danger"
          linkTo="/bpo"
        />
      </div>

      {/* Top Performers */}
      {financialData?.topPerformers?.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Top Profit Generators</CardTitle>
              <Link to="/candidates" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {financialData.topPerformers.slice(0, 5).map((candidate, idx) => (
                <div key={candidate.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                  <div className={clsx(
                    'w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold mb-2',
                    idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'
                  )}>
                    {idx + 1}
                  </div>
                  <p className="font-medium text-slate-900 dark:text-white truncate">{candidate.name}</p>
                  <p className="text-xs text-slate-500">Level {candidate.level}</p>
                  <p className="text-lg font-bold text-emerald-600 mt-2">{formatCurrency(candidate.profit_generated)}</p>
                  <p className="text-xs text-slate-400">{candidate.deployments} jobs</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
