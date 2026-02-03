/**
 * Individual Consultant Performance Scorecard
 * Comprehensive performance dashboard for single consultant
 */

import React, { useState, useEffect } from 'react';
import {
  User, TrendingUp, Target, Award, AlertTriangle,
  CheckCircle, Clock, BarChart3, Lightbulb,
  Star, Calendar, ArrowUp, ArrowDown
} from 'lucide-react';

const ConsultantScorecard = ({ consultantId, period = 'weekly' }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [consultantId, period]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/consultant-performance/analytics/dashboard/${consultantId}?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-blue-600 bg-blue-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (trend < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <span className="w-4 h-4 text-gray-400">→</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center text-red-600">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { kpiData, performanceData, alerts, recommendations, achievements } = dashboardData;
  const latestPerformance = performanceData?.[0];

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Consultant Performance</h2>
              <p className="text-sm text-gray-600">
                ID: {consultantId} • {period} period • Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {kpiData && (
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(kpiData.overall_kpi_score)}`}>
                Overall: {Math.round(kpiData.overall_kpi_score || 0)}
              </div>
            )}
            {kpiData?.overall_rank && (
              <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                Rank #{kpiData.overall_rank}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      {kpiData && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(kpiData.weighted_efficiency_score)}
              </div>
              <div className="text-sm text-gray-600">Efficiency</div>
              <div className="text-xs text-gray-500">Rank #{kpiData.efficiency_rank}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(kpiData.weighted_quality_score)}
              </div>
              <div className="text-sm text-gray-600">Quality</div>
              <div className="text-xs text-gray-500">Rank #{kpiData.quality_rank}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(kpiData.weighted_growth_score)}
              </div>
              <div className="text-sm text-gray-600">Growth</div>
              <div className="text-xs text-gray-500">Rank #{kpiData.growth_rank}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(kpiData.percentile_rank)}%
              </div>
              <div className="text-sm text-gray-600">Percentile</div>
              <div className="text-xs text-gray-500">
                {kpiData.score_vs_team_average > 0 ? '+' : ''}
                {Math.round(kpiData.score_vs_team_average)} vs avg
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Performance Trends */}
      {latestPerformance && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Daily Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {getTrendIcon(5)} {/* Would calculate actual trend */}
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {latestPerformance.candidates_scheduled}
              </div>
              <div className="text-sm text-gray-600">Candidates Scheduled</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                {getTrendIcon(latestPerformance.conversion_to_hire_rate - 50)} {/* Example trend */}
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(latestPerformance.conversion_to_hire_rate || 0)}%
              </div>
              <div className="text-sm text-gray-600">Conversion Rate</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Star className="w-5 h-5 text-purple-600" />
                {getTrendIcon(latestPerformance.candidate_satisfaction_score - 75)}
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(latestPerformance.candidate_satisfaction_score || 0)}/100
              </div>
              <div className="text-sm text-gray-600">Satisfaction</div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                {getTrendIcon(latestPerformance.capacity_utilization_percent - 80)}
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(latestPerformance.capacity_utilization_percent || 0)}%
              </div>
              <div className="text-sm text-gray-600">Capacity Used</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Active Alerts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Alerts ({alerts?.length || 0})
          </h3>

          {alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.slice(0, 3).map(alert => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === 'critical' ? 'bg-red-50 border-red-400' :
                    alert.severity === 'high' ? 'bg-orange-50 border-orange-400' :
                    alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{alert.title}</h4>
                      <p className="text-gray-600 text-xs mt-1">{alert.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
              {alerts.length > 3 && (
                <div className="text-center">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View {alerts.length - 3} more alerts
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
            </div>
          )}
        </div>

        {/* Coaching Recommendations */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Coaching Recommendations ({recommendations?.length || 0})
          </h3>

          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.slice(0, 3).map(rec => (
                <div key={rec.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{rec.title}</h4>
                      <p className="text-gray-600 text-xs mt-1">{rec.description}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>Priority: {rec.priority}/100</span>
                        <span>Impact: {rec.estimated_impact_score}/100</span>
                        <span className={`px-2 py-1 rounded-full ${
                          rec.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          rec.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {rec.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {recommendations.length > 3 && (
                <div className="text-center">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View {recommendations.length - 3} more recommendations
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <Target className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No active recommendations</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Achievements */}
      {achievements && achievements.length > 0 && (
        <div className="p-6 border-t">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Recent Achievements
          </h3>
          <div className="flex gap-3 overflow-x-auto">
            {achievements.slice(0, 5).map(achievement => (
              <div
                key={achievement.id}
                className="flex-shrink-0 bg-yellow-50 border border-yellow-200 rounded-lg p-3 min-w-[200px]"
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{achievement.badge_icon || '🏆'}</div>
                  <h4 className="font-medium text-gray-900 text-sm">{achievement.achievement_name}</h4>
                  <p className="text-gray-600 text-xs mt-1">{achievement.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(achievement.earned_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultantScorecard;