import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Users, Clock, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const CalendarAnalytics = ({
  dateRange = 30,
  className = ''
}) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 400));

      // Generate mock analytics data
      const mockData = {
        summary: {
          totalInterviews: 145,
          completedInterviews: 128,
          noShows: 12,
          cancelledInterviews: 5,
          averageDuration: 52,
          utilizationRate: 78.5
        },
        dailyBreakdown: [],
        interviewTypeBreakdown: [
          { type: 'Video Call', count: 89, percentage: 61.4 },
          { type: 'Phone Call', count: 31, percentage: 21.4 },
          { type: 'In Person', count: 25, percentage: 17.2 }
        ],
        timeSlotPopularity: [
          { time: '09:00', count: 18 },
          { time: '10:00', count: 25 },
          { time: '11:00', count: 22 },
          { time: '14:00', count: 28 },
          { time: '15:00', count: 24 },
          { time: '16:00', count: 19 }
        ],
        weeklyTrend: []
      };

      // Generate daily breakdown for the date range
      for (let i = dateRange - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        mockData.dailyBreakdown.push({
          date: format(date, 'yyyy-MM-dd'),
          total: Math.floor(Math.random() * 10) + 2,
          completed: Math.floor(Math.random() * 8) + 1,
          no_shows: Math.floor(Math.random() * 2),
          cancelled: Math.floor(Math.random() * 1)
        });
      }

      // Generate weekly trend
      for (let i = 7; i >= 0; i--) {
        const weekStart = startOfWeek(subDays(new Date(), i * 7));
        mockData.weeklyTrend.push({
          week: format(weekStart, 'MMM dd'),
          interviews: Math.floor(Math.random() * 30) + 15,
          completion: Math.floor(Math.random() * 20) + 80
        });
      }

      setAnalyticsData(mockData);
      console.log('Analytics data loaded (frontend-only):', mockData);
    } catch (err) {
      setError('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!analyticsData) return;

    const csvData = [
      ['Date', 'Total Interviews', 'Completed', 'No Shows', 'Cancelled'],
      ...analyticsData.dailyBreakdown.map(day => [
        day.date,
        day.total,
        day.completed,
        day.no_shows,
        day.cancelled || 0
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { summary, queue, dailyBreakdown } = analyticsData;

  const statusData = [
    { name: 'Completed', value: summary.completed, color: '#10B981' },
    { name: 'Scheduled', value: summary.scheduled, color: '#3B82F6' },
    { name: 'No Shows', value: summary.no_shows, color: '#EF4444' },
    { name: 'Cancelled', value: summary.cancelled, color: '#6B7280' }
  ];

  const performanceMetrics = [
    {
      title: 'Completion Rate',
      value: `${Math.round(summary.completionRate * 100)}%`,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'No-Show Rate',
      value: `${Math.round(summary.noShowRate * 100)}%`,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    {
      title: 'Avg Duration',
      value: `${Math.round(summary.avg_duration)}min`,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Total Interviews',
      value: summary.total_interviews,
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    }
  ];

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Interview Analytics
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last {dateRange} days
          </span>
        </div>

        <button
          onClick={exportData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-6">
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'trends', label: 'Trends' },
            { id: 'performance', label: 'Performance' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {performanceMetrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                  <div key={index} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                        <Icon className={`w-4 h-4 ${metric.color}`} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{metric.title}</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{metric.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interview Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Interview Status Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Queue Status */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Interview Queue</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Waiting</span>
                    <span className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">{queue.waiting || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Contacted</span>
                    <span className="text-lg font-semibold text-blue-900 dark:text-blue-100">{queue.contacted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Scheduled</span>
                    <span className="text-lg font-semibold text-green-900 dark:text-green-100">{queue.queue_scheduled || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">High Priority</span>
                    <span className="text-lg font-semibold text-red-900 dark:text-red-100">{queue.high_priority || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Daily Interview Trends</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'MMMM dd, yyyy')}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Total Interviews"
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Completed"
                  />
                  <Line
                    type="monotone"
                    dataKey="no_shows"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="No Shows"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div>
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Interview Performance</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value), 'MMMM dd, yyyy')}
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#10B981" name="Completed" />
                  <Bar dataKey="no_shows" stackId="a" fill="#EF4444" name="No Shows" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Insights */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h5 className="font-medium text-green-800 dark:text-green-200 mb-2">Best Performance</h5>
                <p className="text-sm text-green-600 dark:text-green-300">
                  {summary.completionRate >= 0.8 ? 'Excellent completion rate' : 'Room for improvement'}
                </p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Conversion Rate</h5>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {Math.round(summary.conversionRate * 100)}% of interviews lead to activation
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h5 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Total Impact</h5>
                <p className="text-sm text-purple-600 dark:text-purple-300">
                  {summary.totalConversions} candidates activated through interviews
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarAnalytics;