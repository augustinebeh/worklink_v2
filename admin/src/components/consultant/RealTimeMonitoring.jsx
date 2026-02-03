/**
 * Real-Time Performance Monitoring Widget
 * Live updates and key metrics dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  Activity, Users, AlertTriangle, TrendingUp,
  Clock, CheckCircle, BarChart, Lightbulb,
  RefreshCw, Zap, Target, Award
} from 'lucide-react';

const RealTimeMonitoring = ({ refreshInterval = 30000 }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchRealTimeMetrics();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchRealTimeMetrics, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const fetchRealTimeMetrics = async () => {
    try {
      const response = await fetch('/api/v1/consultant-performance/analytics/real-time-metrics');
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
        setLastUpdated(new Date());
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error);
    }
  };

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getTrendColor = (value, threshold = 0) => {
    if (value > threshold) return 'text-green-600';
    if (value < -threshold) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { summary, alerts, coaching, topPerformers, performanceDistribution } = metrics || {};

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-semibold text-gray-900">Real-Time Monitoring</h2>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchRealTimeMetrics}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Consultants */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {summary?.active_consultants || 0}
              </div>
              <div className="text-sm text-gray-600">Active Consultants</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Currently working and tracked
          </div>
        </div>

        {/* Average Performance */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(summary?.avg_performance || 0)}
              </div>
              <div className="text-sm text-gray-600">Avg Performance</div>
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className={getTrendColor(summary?.avg_performance - 70, 5)}>
              {summary?.avg_performance > 75 ? '↗ Above target' :
               summary?.avg_performance > 65 ? '→ On track' : '↘ Below target'}
            </span>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-purple-500" />
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {summary?.conversionRate || 0}%
              </div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {summary?.total_converted || 0} of {summary?.total_scheduled || 0} scheduled
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">
                {alerts?.total || 0}
              </div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
          </div>
          <div className="mt-2 flex gap-2 text-xs">
            {alerts?.bySevertiy?.map(alert => (
              <span
                key={alert.severity}
                className={`px-2 py-1 rounded-full ${getAlertSeverityColor(alert.severity)}`}
              >
                {alert.count} {alert.severity}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5" />
            Performance Distribution
          </h3>

          {performanceDistribution && performanceDistribution.length > 0 ? (
            <div className="space-y-3">
              {performanceDistribution.map(tier => (
                <div key={tier.performance_tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      tier.performance_tier === 'Excellent' ? 'bg-green-500' :
                      tier.performance_tier === 'Good' ? 'bg-blue-500' :
                      tier.performance_tier === 'Average' ? 'bg-yellow-500' :
                      tier.performance_tier === 'Needs Improvement' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`}></div>
                    <span className="text-sm font-medium">{tier.performance_tier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{tier.count}</span>
                    <span className="text-sm text-gray-600">consultants</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <BarChart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No performance data available</p>
            </div>
          )}
        </div>

        {/* Top Performers Today */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Today's Top Performers
          </h3>

          {topPerformers && topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((performer, index) => (
                <div key={performer.consultant_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">Consultant {performer.consultant_id}</div>
                      <div className="text-sm text-gray-600">Performance Score</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(performer.overall_performance_score)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <Award className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No performance data for today</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Quick Actions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Coaching */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {coaching?.pendingRecommendations || 0}
                </div>
                <div className="text-sm text-blue-700">Pending Coaching</div>
              </div>
              <Lightbulb className="w-6 h-6 text-blue-500" />
            </div>
            <button className="mt-3 text-sm text-blue-700 hover:text-blue-800 font-medium">
              Review Recommendations →
            </button>
          </div>

          {/* Critical Alerts */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-red-600">
                  {alerts?.bySevertiy?.find(a => a.severity === 'critical')?.count || 0}
                </div>
                <div className="text-sm text-red-700">Critical Alerts</div>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <button className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium">
              Address Issues →
            </button>
          </div>

          {/* Schedule Review */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-green-600">
                  {summary?.total_scheduled || 0}
                </div>
                <div className="text-sm text-green-700">Scheduled Today</div>
              </div>
              <Clock className="w-6 h-6 text-green-500" />
            </div>
            <button className="mt-3 text-sm text-green-700 hover:text-green-800 font-medium">
              View Schedule →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitoring;