import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import {
  UsersIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  BellIcon,
  FlameIcon,
  ShieldIcon,
  EyeIcon,
  MousePointerIcon,
  MessageSquareIcon,
  CalendarIcon
} from 'lucide-react';
import { api } from '../shared/services/api';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// Metric Card Component
function MetricCard({ title, value, change, changeType, icon: Icon, color = 'emerald' }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    violet: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {change && (
          <div className={`flex items-center text-sm ${
            changeType === 'positive' ? 'text-emerald-600' :
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {changeType === 'positive' ? (
              <TrendingUpIcon className="h-4 w-4 mr-1" />
            ) : changeType === 'negative' ? (
              <TrendingDownIcon className="h-4 w-4 mr-1" />
            ) : null}
            {change}
          </div>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
      </div>
    </div>
  );
}

// Churn Risk Table Component
function ChurnRiskTable({ users }) {
  const getRiskBadge = (level) => {
    const classes = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-amber-100 text-amber-800 border-amber-200',
      low: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${classes[level]}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
      </span>
    );
  };

  const formatDuration = (hours) => {
    if (hours < 24) return `${Math.round(hours)}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
          Users at Risk of Churning
        </h3>
        <p className="text-sm text-gray-600 mt-1">Workers who may need intervention to prevent churn</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Worker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Risk Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Streak
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jobs Completed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rating
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.slice(0, 10).map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRiskBadge(user.risk_level)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(user.days_since_seen * 24)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FlameIcon className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-sm text-gray-900">{user.streak_days} days</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.total_jobs_completed}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex text-yellow-400">
                      {'★'.repeat(Math.round(user.rating || 0))}
                    </div>
                    <span className="ml-1 text-sm text-gray-600">
                      {(user.rating || 0).toFixed(1)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Main Retention Analytics Component
export default function RetentionAnalytics() {
  const [data, setData] = useState({
    overview: null,
    churnRisk: null,
    loading: true
  });

  useEffect(() => {
    fetchRetentionData();
  }, []);

  const fetchRetentionData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true }));

      // TODO: Add retention methods to analytics service - using raw client for now
      const [overview, churnRisk] = await Promise.all([
        api.client.get('/analytics/retention/overview'),
        api.client.get('/analytics/retention/churn-risk')
      ]);

      setData({
        overview: overview.success ? overview.data : null,
        churnRisk: churnRisk.success ? churnRisk.data : null,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching retention data:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  };

  if (data.loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overview = data.overview;
  const churnRisk = data.churnRisk;

  // Chart data for streak metrics
  const streakData = overview ? [
    { name: 'Active Streaks', value: overview.metrics.streaks.active, color: '#10b981' },
    { name: 'At Risk', value: overview.metrics.streaks.atRisk, color: '#f59e0b' },
    { name: 'Broken Today', value: Math.max(0, 10 - overview.metrics.streaks.active), color: '#ef4444' }
  ] : [];

  // Chart data for risk distribution
  const riskDistribution = churnRisk ? [
    { name: 'High Risk', value: churnRisk.summary.high, color: '#ef4444' },
    { name: 'Medium Risk', value: churnRisk.summary.medium, color: '#f59e0b' },
    { name: 'Low Risk', value: churnRisk.summary.low, color: '#eab308' }
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Retention Analytics</h1>
          <p className="text-gray-600">Monitor user engagement, retention rates, and churn risks</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Daily Active Users"
            value={overview?.summary.dau || 0}
            icon={UsersIcon}
            color="emerald"
          />
          <MetricCard
            title="7-Day Retention"
            value={`${overview?.summary.retentionRate7d || 0}%`}
            icon={TrendingUpIcon}
            color="violet"
          />
          <MetricCard
            title="Active Streaks"
            value={overview?.summary.activeStreaks || 0}
            icon={FlameIcon}
            color="amber"
          />
          <MetricCard
            title="Notification Open Rate"
            value={`${overview?.summary.notificationOpenRate || 0}%`}
            icon={EyeIcon}
            color="cyan"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Weekly Active Users"
            value={overview?.summary.wau || 0}
            icon={CalendarIcon}
            color="emerald"
          />
          <MetricCard
            title="30-Day Retention"
            value={`${overview?.summary.retentionRate30d || 0}%`}
            icon={ShieldIcon}
            color="violet"
          />
          <MetricCard
            title="Avg Streak Length"
            value={`${overview?.summary.avgStreakLength || 0} days`}
            icon={TrendingUpIcon}
            color="amber"
          />
          <MetricCard
            title="Notification Response Rate"
            value={`${overview?.summary.notificationResponseRate || 0}%`}
            icon={MessageSquareIcon}
            color="cyan"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Streak Status Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FlameIcon className="h-5 w-5 text-orange-500" />
              Streak Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={streakData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {streakData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Churn Risk Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-amber-500" />
              Churn Risk Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Risk Table */}
        {churnRisk && churnRisk.atRiskUsers && (
          <ChurnRiskTable users={churnRisk.atRiskUsers} />
        )}
      </div>
    </div>
  );
}