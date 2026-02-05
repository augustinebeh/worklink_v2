import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UsersIcon,
  BriefcaseIcon,
  DollarSignIcon,
  TrendingUpIcon,
  CalendarIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StarIcon,
  ZapIcon,
  TargetIcon,
  ChevronRightIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  LightbulbIcon,
  RocketIcon,
  GraduationCapIcon,
  TrophyIcon,
  XIcon,
  SparklesIcon,
  BookOpenIcon,
  HelpCircleIcon,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Legend,
} from 'recharts';
import { api } from '../shared/services/api';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { clsx } from 'clsx';

const formatCurrency = (value, compact = false) => {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', notation: 'compact', minimumFractionDigits: 0 }).format(value || 0);
  }
  return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', minimumFractionDigits: 0 }).format(value || 0);
};

// Onboarding steps for new recruiters
const onboardingSteps = [
  { id: 'welcome', title: 'Welcome!', description: 'Start your journey as a recruitment coordinator', icon: RocketIcon, completed: true },
  { id: 'add_client', title: 'Add Your First Client', description: 'Register a company that needs manpower', icon: BriefcaseIcon, href: '/clients', tip: 'Start with an existing client relationship - it\'s easier to grow from there!' },
  { id: 'create_job', title: 'Create a Job Posting', description: 'Set up your first job with rates and slots', icon: CalendarIcon, href: '/jobs', tip: 'Aim for 25-30% gross margin. Charge $20/hr, pay $13-15/hr is a good starting point.' },
  { id: 'recruit_candidate', title: 'Recruit Candidates', description: 'Add workers to your talent pool', icon: UsersIcon, href: '/candidates', tip: 'Quality over quantity! 10 reliable workers beat 50 flaky ones.' },
  { id: 'first_deployment', title: 'Complete First Deployment', description: 'Successfully match and deploy a worker', icon: CheckCircleIcon, href: '/deployments', tip: 'Follow up after every job. Happy workers = repeat business!' },
  { id: 'track_financials', title: 'Track Your Profits', description: 'Understand your margins and growth', icon: DollarSignIcon, href: '/financials', tip: 'Review financials weekly. Catch margin leaks early!' },
];

// Quick tips carousel
const quickTips = [
  { title: '💡 Margin Math', content: 'Your gross profit = (Charge Rate - Pay Rate) × Hours. Aim for 25-30% margin minimum.', category: 'Finance' },
  { title: '🎯 Finding Clients', content: 'Check GeBIZ daily for government tenders. Set up keyword alerts for "manpower" and "event support".', category: 'Sales' },
  { title: '⭐ Keeping Workers Happy', content: 'Fast payments and consistent work = loyal workers. Pay within 7 days of job completion.', category: 'Operations' },
  { title: '📈 Scaling Up', content: 'Once you have 20 reliable workers, you can take bigger contracts (10-50 pax events).', category: 'Growth' },
  { title: '🔥 Peak Seasons', content: 'Dec-Feb and Jun-Aug are peak. Book workers early for CNY, Christmas, and school holidays.', category: 'Planning' },
];

// Guide cards for learning
const guideCards = [
  { title: 'Recruitment Basics', description: 'How to build your worker pool', icon: UsersIcon, color: 'blue', articles: 5 },
  { title: 'Pricing Strategy', description: 'Setting rates that win & profit', icon: DollarSignIcon, color: 'emerald', articles: 4 },
  { title: 'Tender Bidding', description: 'Win government contracts', icon: TargetIcon, color: 'purple', articles: 6 },
  { title: 'Worker Retention', description: 'Keep your best talent', icon: StarIcon, color: 'amber', articles: 3 },
];

function OnboardingCard({ step, index, onComplete }) {
  const [showTip, setShowTip] = useState(false);
  
  return (
    <div className={clsx(
      'relative p-4 rounded-xl border-2 transition-all',
      step.completed 
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-primary-300'
    )}>
      <div className="flex items-start gap-3">
        <div className={clsx(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          step.completed 
            ? 'bg-emerald-500 text-white' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        )}>
          {step.completed ? <CheckCircleIcon className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Step {index + 1}</span>
            {step.completed && <Badge variant="success" size="xs">Done</Badge>}
          </div>
          <h4 className="font-semibold text-slate-900 dark:text-white">{step.title}</h4>
          <p className="text-sm text-slate-500 mt-0.5">{step.description}</p>
          
          {step.tip && (
            <button 
              onClick={() => setShowTip(!showTip)}
              className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
            >
              <LightbulbIcon className="h-3 w-3" />
              {showTip ? 'Hide tip' : 'Show tip'}
            </button>
          )}
          
          {showTip && step.tip && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">{step.tip}</p>
            </div>
          )}
        </div>
        
        {!step.completed && step.href && (
          <Link 
            to={step.href}
            className="flex-shrink-0 p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600"
          >
            <PlayCircleIcon className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

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

function TipCarousel({ tips }) {
  const [currentTip, setCurrentTip] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [tips.length]);
  
  const tip = tips[currentTip];
  
  return (
    <Card className="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 border-primary-100 dark:border-primary-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Badge variant="info" size="xs">{tip.category}</Badge>
          <h4 className="font-semibold text-slate-900 dark:text-white mt-2">{tip.title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{tip.content}</p>
        </div>
        <div className="flex gap-1 ml-4">
          {tips.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentTip(i)}
              className={clsx(
                'w-2 h-2 rounded-full transition-colors',
                i === currentTip ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'
              )}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(['welcome']);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsData, finData] = await Promise.all([
        api.analytics.getDashboard(),
        api.analytics.getFinancialDashboard(),
      ]);

      if (analyticsData.success) setData(analyticsData.data);
      if (finData.success) setFinancialData(finData.data);

      // Auto-complete onboarding steps based on data
      const autoComplete = ['welcome'];
      if (analyticsData.data?.clients?.total > 0) autoComplete.push('add_client');
      if (analyticsData.data?.jobs?.total > 0) autoComplete.push('create_job');
      if (analyticsData.data?.candidates?.total > 0) autoComplete.push('recruit_candidate');
      if (analyticsData.data?.deployments?.completed > 0) autoComplete.push('first_deployment', 'track_financials');
      setCompletedSteps(autoComplete);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stepsWithStatus = onboardingSteps.map(step => ({
    ...step,
    completed: completedSteps.includes(step.id)
  }));
  
  const completionPercent = Math.round((completedSteps.length / onboardingSteps.length) * 100);
  const allComplete = completedSteps.length === onboardingSteps.length;

  const profitChartData = financialData?.monthlyTrend?.map(item => ({
    month: item.month ? monthNames[parseInt(item.month.split('-')[1]) - 1] + ' ' + item.month.split('-')[0].slice(2) : '',
    revenue: item.revenue || 0,
    costs: item.costs || 0,
    grossProfit: item.gross_profit || 0,
  })) || [];

  const currentMonth = financialData?.thisMonth;
  const lastMonth = financialData?.lastMonth;
  const profitGrowth = lastMonth?.profit && currentMonth?.profit
    ? (((currentMonth.profit - lastMonth.profit) / lastMonth.profit) * 100).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-amber-500" />
            Welcome to WorkLink
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Your recruitment business command center
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ClockIcon className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
      </div>

      {/* Onboarding Progress (show if not all complete) */}
      {showOnboarding && !allComplete && (
        <Card className="border-2 border-primary-200 dark:border-primary-800 bg-gradient-to-r from-primary-50/50 to-white dark:from-primary-900/10 dark:to-slate-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/50">
                <RocketIcon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Getting Started Guide</h3>
                <p className="text-sm text-slate-500">{completionPercent}% complete • {onboardingSteps.length - completedSteps.length} steps remaining</p>
              </div>
            </div>
            <button onClick={() => setShowOnboarding(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stepsWithStatus.map((step, i) => (
              <OnboardingCard key={step.id} step={step} index={i} />
            ))}
          </div>
        </Card>
      )}

      {/* Quick Tip Carousel */}
      <TipCarousel tips={quickTips} />

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

      {/* Profit Growth Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Growth Journey</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                <span className="text-emerald-600 font-medium">Green bars = your profit</span> • This is what you keep!
              </p>
            </div>
            <Link to="/financials" className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
              Deep dive <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : profitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profitChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }}
                    formatter={(value, name) => [formatCurrency(value), name === 'grossProfit' ? '💰 Profit' : name === 'revenue' ? 'Revenue' : 'Costs']}
                  />
                  <Legend formatter={(value) => value === 'grossProfit' ? '💰 Your Profit' : value === 'revenue' ? 'Total Revenue' : 'Worker Costs'} />
                  <Bar dataKey="costs" fill="#94a3b8" radius={[4, 4, 0, 0]} name="costs" stackId="stack" />
                  <Bar dataKey="grossProfit" fill="url(#profitGradient)" stroke="#10b981" strokeWidth={2} radius={[4, 4, 0, 0]} name="grossProfit" stackId="stack" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <TrendingUpIcon className="h-12 w-12 mb-2 opacity-50" />
                <p>Complete your first deployment to see your growth!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Learning Resources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCapIcon className="h-5 w-5 text-primary-500" />
            Learn & Grow
          </h3>
          <Link to="/training"><Button variant="secondary" size="sm">View All Guides</Button></Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {guideCards.map((guide) => {
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600',
              emerald: 'from-emerald-500 to-emerald-600',
              purple: 'from-purple-500 to-purple-600',
              amber: 'from-amber-500 to-amber-600',
            };
            return (
              <Card key={guide.title} hover className="cursor-pointer">
                <div className={clsx('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-3', colorClasses[guide.color])}>
                  <guide.icon className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white">{guide.title}</h4>
                <p className="text-sm text-slate-500 mt-1">{guide.description}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-slate-400">
                  <BookOpenIcon className="h-3 w-3" />
                  <span>{guide.articles} articles</span>
                </div>
              </Card>
            );
          })}
        </div>
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

      {/* Top Performers */}
      {financialData?.topPerformers?.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrophyIcon className="h-5 w-5 text-amber-500" />
                <CardTitle>Your Star Workers</CardTitle>
              </div>
              <p className="text-xs text-slate-500">These workers generate the most profit for you</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {financialData.topPerformers.slice(0, 5).map((candidate, idx) => (
                <Link key={candidate.id} to={`/candidates/${candidate.id}`}>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="relative w-16 h-16 mx-auto mb-2">
                      <img 
                        src={candidate.profile_photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name}`}
                        alt={candidate.name}
                        className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-700"
                      />
                      <div className={clsx(
                        'absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                      )}>
                        {idx + 1}
                      </div>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-white truncate">{candidate.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <StarIcon className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs text-slate-500">Lv.{candidate.level}</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600 mt-2">{formatCurrency(candidate.profit_generated)}</p>
                    <p className="text-xs text-slate-400">{candidate.deployments} jobs</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
