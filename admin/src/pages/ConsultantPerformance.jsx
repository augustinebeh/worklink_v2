/**
 * Comprehensive Consultant Analytics Dashboard
 * Advanced performance analytics, team comparison, and management interface
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, Target, BarChart3, Award,
  AlertTriangle, Lightbulb, Activity, Clock,
  Settings, RefreshCw
} from 'lucide-react';

// Import dashboard components
import ConsultantScorecard from '../components/consultant/ConsultantScorecard';
import TeamLeaderboard from '../components/consultant/TeamLeaderboard';
import RealTimeMonitoring from '../components/consultant/RealTimeMonitoring';
import AlertsManagement from '../components/consultant/AlertsManagement';

const ConsultantPerformance = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/consultant-performance/analytics/real-time-metrics');
      const data = await response.json();

      if (data.success) {
        setDashboardMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDailyAnalytics = async () => {
    try {
      const response = await fetch('/api/v1/consultant-performance/analytics/calculate-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().split('T')[0] })
      });

      if (response.ok) {
        await fetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Failed to run daily analytics:', error);
    }
  };

  const runKPICalculation = async () => {
    try {
      const response = await fetch('/api/v1/consultant-performance/analytics/calculate-kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: 'weekly' })
      });

      if (response.ok) {
        await fetchDashboardMetrics();
      }
    } catch (error) {
      console.error('Failed to run KPI calculation:', error);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'individual', name: 'Individual Performance', icon: Users },
    { id: 'team', name: 'Team Leaderboard', icon: Award },
    { id: 'alerts', name: 'Alerts', icon: AlertTriangle },
    { id: 'monitoring', name: 'Real-Time', icon: Activity }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            Consultant Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive performance analytics, team comparison, and management system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runDailyAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Calculate Daily Metrics
          </button>
          <button
            onClick={runKPICalculation}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Update KPIs
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {!loading && dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Consultants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.summary?.active_consultants || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(dashboardMetrics.summary?.avg_performance || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.summary?.conversionRate || 0}%
                </p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardMetrics.alerts?.total || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
                {tab.id === 'alerts' && dashboardMetrics?.alerts?.total > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">
                    {dashboardMetrics.alerts.total}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Pain Point Solutions */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Automated Solutions & Pain Point Resolution
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Activity className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">SLM Interview Scheduling</h3>
                      <p className="text-sm text-gray-600">Automated scheduling for pending candidates</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Performance Analytics Engine</h3>
                      <p className="text-sm text-gray-600">AI-powered performance tracking and coaching</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Award className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Team Leaderboard & Recognition</h3>
                      <p className="text-sm text-gray-600">Gamified performance comparison and achievements</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    ACTIVE
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Real-Time Alert System</h3>
                      <p className="text-sm text-gray-600">Proactive performance monitoring and intervention</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Analytics Overview */}
            <RealTimeMonitoring refreshInterval={60000} />
          </div>
        )}

        {activeTab === 'individual' && (
          <div className="space-y-6">
            {/* Consultant Selector */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Individual Performance Analysis</h3>
                <select
                  value={selectedConsultant || ''}
                  onChange={(e) => setSelectedConsultant(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a consultant...</option>
                  <option value="consultant_001">Consultant 001</option>
                  <option value="consultant_002">Consultant 002</option>
                  <option value="consultant_003">Consultant 003</option>
                  {/* Add more consultants dynamically */}
                </select>
              </div>

              {selectedConsultant ? (
                <ConsultantScorecard
                  consultantId={selectedConsultant}
                  period="weekly"
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Select a consultant to view their performance dashboard</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <TeamLeaderboard period="weekly" metric="overall" />
        )}

        {activeTab === 'alerts' && (
          <AlertsManagement />
        )}

        {activeTab === 'monitoring' && (
          <RealTimeMonitoring refreshInterval={10000} />
        )}
      </div>
    </div>
  );
};

export default ConsultantPerformance;