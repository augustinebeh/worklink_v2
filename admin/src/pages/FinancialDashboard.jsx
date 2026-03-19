import { useState, useEffect } from 'react';
import {
  TrendingUpIcon,
  AlertTriangleIcon,
  PieChartIcon,
  BarChart3Icon,
  GiftIcon,
  CalculatorIcon,
} from 'lucide-react';
import { api } from '../shared/services/api';
import Badge from '../components/ui/Badge';
import { clsx } from 'clsx';

// Financial sub-components
import { KPIRow, QuickStats, ProjectionSummaryCards, IncentiveSummaryCards } from '../components/financial/FinancialSummaryCards';
import { RevenueProfitTrend, ClientRevenueBreakdown, ProjectionsVsActualChart } from '../components/financial/RevenueChart';
import {
  UpcomingJobsTable,
  MarginByClientTable,
  RateSpreadTable,
  IncentiveProtectionNotice,
  TopPerformersTable,
  CalculatorForm,
} from '../components/financial/PaymentTable';

export default function FinancialDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [calculator, setCalculator] = useState({ charge_rate: 20, pay_rate: 13, hours: 8, days: 1, headcount: 10, incentives: 0 });
  const [calcResult, setCalcResult] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const result = await api.analytics.getFinancialDashboard();
      if (result.success) setData(result.data);
    } catch (error) {
      // Failed to fetch financial data
    } finally {
      setLoading(false);
    }
  };

  const calculateProfit = async () => {
    try {
      const totalHours = parseFloat(calculator.hours) * parseInt(calculator.days || 1);
      const result = await api.analytics.calculateJobProfit({
        charge_rate: parseFloat(calculator.charge_rate),
        pay_rate: parseFloat(calculator.pay_rate),
        hours: totalHours,
        days: parseInt(calculator.days || 1),
        headcount: parseInt(calculator.headcount),
        estimated_incentives: parseFloat(calculator.incentives),
      });
      if (result.success) setCalcResult({ ...result.data, days: parseInt(calculator.days || 1), hoursPerDay: parseFloat(calculator.hours) });
    } catch (error) {
      // Calculation error
    }
  };

  const getMonthChange = () => {
    if (!data?.thisMonth || !data?.lastMonth || data.lastMonth.revenue === 0) return null;
    const change = ((data.thisMonth.revenue - data.lastMonth.revenue) / data.lastMonth.revenue) * 100;
    return { value: `${Math.abs(change).toFixed(1)}% vs last month`, trend: change >= 0 ? 'up' : 'down' };
  };

  const monthChange = getMonthChange();

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
          <KPIRow data={data} loading={loading} monthChange={monthChange} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RevenueProfitTrend data={data} />
            <ClientRevenueBreakdown data={data} />
          </div>
          <QuickStats data={data} />
        </>
      )}

      {/* PROJECTIONS TAB */}
      {activeTab === 'projections' && (
        <>
          <ProjectionSummaryCards data={data} />
          <UpcomingJobsTable data={data} />
          <ProjectionsVsActualChart data={data} />
        </>
      )}

      {/* MARGINS TAB */}
      {activeTab === 'margins' && (
        <>
          <MarginByClientTable data={data} />
          <RateSpreadTable data={data} />
        </>
      )}

      {/* INCENTIVES TAB */}
      {activeTab === 'incentives' && (
        <>
          <IncentiveSummaryCards data={data} />
          <IncentiveProtectionNotice />
          <TopPerformersTable data={data} />
        </>
      )}

      {/* CALCULATOR TAB */}
      {activeTab === 'calculator' && (
        <CalculatorForm
          calculator={calculator}
          setCalculator={setCalculator}
          calculateProfit={calculateProfit}
          calcResult={calcResult}
        />
      )}
    </div>
  );
}
