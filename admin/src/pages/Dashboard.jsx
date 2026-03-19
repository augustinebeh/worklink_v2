import { useState, useEffect } from 'react';
import {
  SparklesIcon,
  ClockIcon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import DashboardStats from '../components/dashboard/DashboardStats';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import { OnboardingProgress, TipCarousel, TopPerformers } from '../components/dashboard/RecentActivity';

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
      // Failed to fetch dashboard data
    } finally {
      setLoading(false);
    }
  };

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

      {/* Onboarding Progress */}
      <OnboardingProgress
        completedSteps={completedSteps}
        showOnboarding={showOnboarding}
        setShowOnboarding={setShowOnboarding}
      />

      {/* Quick Tip Carousel */}
      <TipCarousel />

      {/* KPI Cards + Quick Actions */}
      <DashboardStats
        data={data}
        financialData={financialData}
        loading={loading}
        profitGrowth={profitGrowth}
      />

      {/* Charts + Learning Resources */}
      <DashboardCharts
        loading={loading}
        profitChartData={profitChartData}
      />

      {/* Top Performers */}
      <TopPerformers financialData={financialData} />
    </div>
  );
}
