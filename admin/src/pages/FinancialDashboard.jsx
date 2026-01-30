import { useState, useEffect } from 'react';
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  UsersIcon,
  CalendarIcon,
  ZapIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  TargetIcon,
  PieChartIcon,
  BarChart3Icon,
  WalletIcon,
  GiftIcon,
  CalculatorIcon,
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
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { clsx } from 'clsx';

const formatCurrency = (value, compact = false) => {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(value || 0);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 2 }).format(value || 0);
};

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

function MarginIndicator({ margin, minMargin = 20 }) {
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

export default function FinancialDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [calculator, setCalculator] = useState({ charge_rate: 20, pay_rate: 13, hours: 8, days: 1, headcount: 10, incentives: 0 });
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/analytics/financial/dashboard');
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProfit = async () => {
    try {
      const totalHours = parseFloat(calculator.hours) * parseInt(calculator.days || 1);
      const res = await fetch('/api/v1/analytics/calculate-job-profit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charge_rate: parseFloat(calculator.charge_rate),
          pay_rate: parseFloat(calculator.pay_rate),
          hours: totalHours,
          days: parseInt(calculator.days || 1),
          headcount: parseInt(calculator.headcount),
          estimated_incentives: parseFloat(calculator.incentives),
        }),
      });
      const result = await res.json();
      if (result.success) setCalcResult({ ...result.data, days: parseInt(calculator.days || 1), hoursPerDay: parseFloat(calculator.hours) });
    } catch (error) {
      console.error('Calculation error:', error);
    }
  };

  const getMonthChange = () => {
    if (!data?.thisMonth || !data?.lastMonth || data.lastMonth.revenue === 0) return null;
    const change = ((data.thisMonth.revenue - data.lastMonth.revenue) / data.lastMonth.revenue) * 100;
    return { value: `${Math.abs(change).toFixed(1)}% vs last month`, trend: change >= 0 ? 'up' : 'down' };
  };

  const monthChange = getMonthChange();
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChartIcon },
    { id: 'projections', label: 'Projections', icon: TrendingUpIcon },
    { id: 'margins', label: 'Margin Analysis', icon: BarChart3Icon },
    { id: 'incentives', label: 'Incentives', icon: GiftIcon },
    { id: 'calculator', label: 'Calculator', icon: CalculatorIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track revenue, margins, and profitability</p>
        </div>
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangleIcon className="h-3 w-3" />
          Min Gross Margin: 20%
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={clsx('flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FinancialKPI title="Total Revenue" value={formatCurrency(data?.currentEarnings?.total_revenue)} subtitle={`${data?.currentEarnings?.total_deployments || 0} deployments`} change={monthChange?.value} trend={monthChange?.trend} icon={DollarSignIcon} color="primary" loading={loading} />
            <FinancialKPI title="Gross Profit" value={formatCurrency(data?.currentEarnings?.total_gross_profit)} subtitle={`${data?.currentEarnings?.avg_margin_percent}% margin`} icon={TrendingUpIcon} color="success" loading={loading} />
            <FinancialKPI title="Incentives Paid" value={formatCurrency(data?.currentEarnings?.total_incentives)} subtitle="Total paid out" icon={GiftIcon} color="warning" loading={loading} />
            <FinancialKPI title="Net Profit" value={formatCurrency(data?.currentEarnings?.net_profit)} subtitle="After incentives" icon={WalletIcon} color="success" loading={loading} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Revenue & Profit Trend</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data?.monthlyTrend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickFormatter={(v) => v?.substring(5)} />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f1f5f9' }} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="costs" name="Candidate Pay" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="net_profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Client Breakdown */}
            <Card>
              <CardHeader><CardTitle>Revenue by Client</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data?.marginByClient?.slice(0, 5) || []} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="total_revenue" nameKey="company_name">
                        {data?.marginByClient?.slice(0, 5).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {data?.marginByClient?.slice(0, 5).map((client, idx) => (
                    <div key={client.client_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{client.company_name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(client.total_revenue, true)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
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
        </>
      )}

      {/* PROJECTIONS TAB */}
      {activeTab === 'projections' && (
        <>
          {/* Projection Summary */}
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

          {/* Upcoming Jobs Table */}
          <Card>
            <CardHeader><CardTitle>Upcoming Jobs Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Job</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Date</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Charge</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Pay</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Hours</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Slots</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Revenue</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Profit</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-500">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.projected?.upcomingJobs?.map((job) => (
                      <tr key={job.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900 dark:text-white">{job.title}</p>
                          <p className="text-xs text-slate-500">{job.client_name}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{job.job_date}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-white">${job.charge_rate}</td>
                        <td className="py-3 px-4 text-right text-slate-600">${job.pay_rate}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{job.hours.toFixed(1)}h</td>
                        <td className="py-3 px-4 text-right text-slate-600">{job.filled_slots}/{job.total_slots}</td>
                        <td className="py-3 px-4 text-right font-medium text-blue-600">{formatCurrency(job.projected_revenue)}</td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600">{formatCurrency(job.projected_profit)}</td>
                        <td className="py-3 px-4 text-center"><MarginIndicator margin={parseFloat(job.margin_percent)} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-medium">
                      <td colSpan={6} className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">Total Projected:</td>
                      <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(data?.projected?.revenue)}</td>
                      <td className="py-3 px-4 text-right text-emerald-600">{formatCurrency(data?.projected?.profit)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Projections vs Actual Chart */}
          <Card>
            <CardHeader><CardTitle>Monthly Projections vs Actual</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.financialProjections || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickFormatter={(v) => v?.substring(5)} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => value ? formatCurrency(value) : 'N/A'} />
                    <Legend />
                    <Bar dataKey="projected_profit" name="Projected Profit" fill="#94a3b8" />
                    <Bar dataKey="actual_profit" name="Actual Profit" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* MARGINS TAB */}
      {activeTab === 'margins' && (
        <>
          {/* Margin by Client */}
          <Card>
            <CardHeader><CardTitle>Margin Analysis by Client</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.marginByClient?.map((client) => (
                  <div key={client.client_id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{client.company_name}</p>
                        <p className="text-sm text-slate-500">{client.jobs} jobs • {client.deployments} deployments</p>
                      </div>
                      <MarginIndicator margin={client.avg_margin || 0} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-slate-500">Revenue</p>
                        <p className="font-medium text-slate-900 dark:text-white">{formatCurrency(client.total_revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Profit</p>
                        <p className="font-medium text-emerald-600">{formatCurrency(client.total_profit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Avg Margin</p>
                        <p className="font-medium text-slate-900 dark:text-white">{(client.avg_margin || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rate Spread Analysis */}
          <Card>
            <CardHeader><CardTitle>Charge Rate vs Pay Rate by Job</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Job</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Client</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Charge Rate</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Pay Rate</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500">Spread</th>
                      <th className="text-center py-3 px-4 font-medium text-slate-500">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rateAnalysis?.byJob?.map((job, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{job.title}</td>
                        <td className="py-3 px-4 text-slate-600">{job.company_name}</td>
                        <td className="py-3 px-4 text-right font-medium">${job.charge_rate.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">${job.pay_rate.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-emerald-600">${job.spread.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center"><MarginIndicator margin={job.margin_percent} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* INCENTIVES TAB */}
      {activeTab === 'incentives' && (
        <>
          {/* Incentive Summary */}
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

          {/* Incentive Protection Notice */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-800">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/50"><AlertTriangleIcon className="h-6 w-6 text-amber-600" /></div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Margin Protection Active</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  All incentives are capped to maintain a minimum <strong>20% gross margin</strong> on every deployment. 
                  The system will automatically reduce or block incentives if they would cause the margin to fall below this threshold.
                </p>
              </div>
            </div>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader><CardTitle>Top Profit Generators</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.topPerformers?.map((candidate, idx) => (
                  <div key={candidate.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm',
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white">{candidate.name}</p>
                      <p className="text-xs text-slate-500">Level {candidate.level} • {candidate.total_jobs_completed} jobs • ⭐ {candidate.rating?.toFixed(1)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(candidate.profit_generated)}</p>
                      <p className="text-xs text-slate-500">{candidate.total_hours?.toFixed(0)}h worked</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* CALCULATOR TAB */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Job Profitability Calculator</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Charge Rate ($/hr)" type="number" value={calculator.charge_rate} onChange={(e) => setCalculator({ ...calculator, charge_rate: e.target.value })} />
                  <Input label="Pay Rate ($/hr)" type="number" value={calculator.pay_rate} onChange={(e) => setCalculator({ ...calculator, pay_rate: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Hours/Day" type="number" value={calculator.hours} onChange={(e) => setCalculator({ ...calculator, hours: e.target.value })} />
                  <Input label="Days" type="number" value={calculator.days} onChange={(e) => setCalculator({ ...calculator, days: e.target.value })} min="1" />
                  <Input label="Headcount" type="number" value={calculator.headcount} onChange={(e) => setCalculator({ ...calculator, headcount: e.target.value })} />
                </div>
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm">
                  <span className="text-slate-500">Total Hours: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {(parseFloat(calculator.hours || 0) * parseInt(calculator.days || 1)).toFixed(1)}h
                  </span>
                  <span className="text-slate-400 ml-2">({calculator.hours}h × {calculator.days} day{calculator.days > 1 ? 's' : ''} × {calculator.headcount} people)</span>
                </div>
                <Input label="Estimated Incentives ($)" type="number" value={calculator.incentives} onChange={(e) => setCalculator({ ...calculator, incentives: e.target.value })} />
                <Button onClick={calculateProfit} className="w-full">Calculate</Button>
              </div>
            </CardContent>
          </Card>

          {calcResult && (
            <Card>
              <CardHeader><CardTitle>Results</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-sm text-blue-600">Gross Revenue</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(calcResult.grossRevenue)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <p className="text-sm text-slate-600">Candidate Costs</p>
                      <p className="text-2xl font-bold text-slate-700">{formatCurrency(calcResult.candidateCosts)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <p className="text-sm text-emerald-600">Gross Profit</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(calcResult.grossProfit)}</p>
                      <p className="text-xs text-emerald-600">{calcResult.grossMarginPercent}% margin</p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <p className="text-sm text-purple-600">Net Profit</p>
                      <p className="text-2xl font-bold text-purple-700">{formatCurrency(calcResult.netProfit)}</p>
                      <p className="text-xs text-purple-600">{calcResult.netMarginPercent}% margin</p>
                    </div>
                  </div>
                  
                  <div className={clsx('p-4 rounded-lg', calcResult.meetsMinMargin ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                    <div className="flex items-center gap-2">
                      {calcResult.meetsMinMargin ? <CheckCircleIcon className="h-5 w-5 text-emerald-600" /> : <AlertTriangleIcon className="h-5 w-5 text-red-600" />}
                      <span className={clsx('font-medium', calcResult.meetsMinMargin ? 'text-emerald-700' : 'text-red-700')}>
                        {calcResult.meetsMinMargin ? 'Meets minimum 20% margin requirement' : 'Below minimum 20% margin!'}
                      </span>
                    </div>
                    {!calcResult.meetsMinMargin && (
                      <p className="text-sm text-red-600 mt-2">
                        Suggested charge rate: <strong>${calcResult.suggestedChargeRate}/hr</strong> to achieve 20% margin
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-600 mb-2">Max Allowable Incentive (to maintain 20% margin):</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(calcResult.maxIncentive)}</p>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Per Person Breakdown:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><span className="text-slate-500">Revenue:</span> {formatCurrency(calcResult.perPersonBreakdown.revenue)}</div>
                      <div><span className="text-slate-500">Cost:</span> {formatCurrency(calcResult.perPersonBreakdown.cost)}</div>
                      <div><span className="text-slate-500">Profit:</span> {formatCurrency(calcResult.perPersonBreakdown.profit)}</div>
                    </div>
                    {calcResult.days > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500 mb-1">Per Person Per Day:</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div><span className="text-slate-500">Revenue:</span> {formatCurrency(calcResult.perPersonBreakdown.revenue / calcResult.days)}</div>
                          <div><span className="text-slate-500">Cost:</span> {formatCurrency(calcResult.perPersonBreakdown.cost / calcResult.days)}</div>
                          <div><span className="text-slate-500">Profit:</span> {formatCurrency(calcResult.perPersonBreakdown.profit / calcResult.days)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
