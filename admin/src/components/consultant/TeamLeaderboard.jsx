/**
 * Team Performance Leaderboard Component
 * Displays team rankings and comparative performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  Trophy, Medal, Crown, Users, TrendingUp,
  ArrowUp, ArrowDown, BarChart3, Target
} from 'lucide-react';

const TeamLeaderboard = ({ period = 'weekly', metric = 'overall' }) => {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(metric);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedPeriod, selectedMetric]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/consultant-performance/analytics/leaderboard?period=${selectedPeriod}&metric=${selectedMetric}`
      );
      const data = await response.json();

      if (data.success) {
        setLeaderboardData(data.data);
      } else {
        setError(data.error || 'Failed to load leaderboard data');
      }
    } catch (err) {
      setError('Failed to load leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-600">{rank}</span>;
    }
  };

  const getScoreColor = (score, percentile) => {
    if (percentile >= 90) return 'text-green-600';
    if (percentile >= 75) return 'text-blue-600';
    if (percentile >= 50) return 'text-yellow-600';
    if (percentile >= 25) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (percentile) => {
    if (percentile >= 90) return { text: 'Elite', color: 'bg-green-100 text-green-800' };
    if (percentile >= 75) return { text: 'High', color: 'bg-blue-100 text-blue-800' };
    if (percentile >= 50) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    if (percentile >= 25) return { text: 'Fair', color: 'bg-orange-100 text-orange-800' };
    return { text: 'Needs Focus', color: 'bg-red-100 text-red-800' };
  };

  const getMetricValue = (consultant, metric) => {
    switch (metric) {
      case 'efficiency':
        return consultant.weighted_efficiency_score;
      case 'quality':
        return consultant.weighted_quality_score;
      case 'growth':
        return consultant.weighted_growth_score;
      default:
        return consultant.overall_kpi_score;
    }
  };

  const getRankForMetric = (consultant, metric) => {
    switch (metric) {
      case 'efficiency':
        return consultant.efficiency_rank;
      case 'quality':
        return consultant.quality_rank;
      case 'growth':
        return consultant.growth_rank;
      default:
        return consultant.overall_rank;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center text-red-600">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p>{error}</p>
          <button
            onClick={fetchLeaderboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { leaderboard, teamAnalytics } = leaderboardData || {};

  return (
    <div className="bg-white rounded-lg border">
      {/* Header with Controls */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Team Leaderboard</h2>
              <p className="text-sm text-gray-600">Performance rankings and metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="overall">Overall Performance</option>
              <option value="efficiency">Efficiency</option>
              <option value="quality">Quality</option>
              <option value="growth">Growth</option>
            </select>
          </div>
        </div>

        {/* Team Statistics */}
        {teamAnalytics && (
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(teamAnalytics[selectedMetric] || teamAnalytics.overall || 0)}
              </div>
              <div className="text-sm text-gray-600">Team Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {leaderboard?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Active Consultants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {leaderboard?.filter(c => c.percentile_rank >= 75).length || 0}
              </div>
              <div className="text-sm text-gray-600">High Performers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {leaderboard?.filter(c => c.percentile_rank < 50).length || 0}
              </div>
              <div className="text-sm text-gray-600">Need Support</div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Table */}
      <div className="p-6">
        {leaderboard && leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((consultant, index) => {
              const rank = getRankForMetric(consultant, selectedMetric);
              const score = getMetricValue(consultant, selectedMetric);
              const badge = getPerformanceBadge(consultant.percentile_rank);

              return (
                <div
                  key={consultant.consultant_id}
                  className={`p-4 rounded-lg border ${
                    rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' :
                    consultant.percentile_rank >= 75 ? 'bg-blue-50 border-blue-200' :
                    consultant.percentile_rank < 50 ? 'bg-red-50 border-red-200' :
                    'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Rank and Consultant Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border">
                        {getRankIcon(rank)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Consultant {consultant.consultant_id}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                            {badge.text}
                          </span>
                          <span className="text-sm text-gray-600">
                            {Math.round(consultant.percentile_rank)}th percentile
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Score and Metrics */}
                    <div className="flex items-center gap-6">
                      {/* Primary Score */}
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(score, consultant.percentile_rank)}`}>
                          {Math.round(score || 0)}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">{selectedMetric}</div>
                      </div>

                      {/* Other Metrics */}
                      {selectedMetric === 'overall' && (
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-lg font-semibold text-blue-600">
                              {Math.round(consultant.weighted_efficiency_score || 0)}
                            </div>
                            <div className="text-xs text-gray-600">Efficiency</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-green-600">
                              {Math.round(consultant.weighted_quality_score || 0)}
                            </div>
                            <div className="text-xs text-gray-600">Quality</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-purple-600">
                              {Math.round(consultant.weighted_growth_score || 0)}
                            </div>
                            <div className="text-xs text-gray-600">Growth</div>
                          </div>
                        </div>
                      )}

                      {/* Trend Indicator */}
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-600">
                          #{rank}
                        </div>
                        <div className="text-xs text-gray-600">Rank</div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          consultant.percentile_rank >= 90 ? 'bg-green-500' :
                          consultant.percentile_rank >= 75 ? 'bg-blue-500' :
                          consultant.percentile_rank >= 50 ? 'bg-yellow-500' :
                          consultant.percentile_rank >= 25 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${consultant.percentile_rank}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-600">
                      <span>0</span>
                      <span>{Math.round(consultant.percentile_rank)}%</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No leaderboard data available</p>
            <p className="text-sm">Performance data will appear here once consultants have been evaluated.</p>
          </div>
        )}
      </div>

      {/* Performance Insights */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="p-6 border-t bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Team Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top Performer */}
            {leaderboard[0] && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Top Performer</h4>
                </div>
                <p className="text-sm text-yellow-700">
                  Consultant {leaderboard[0].consultant_id} leads with {Math.round(getMetricValue(leaderboard[0], selectedMetric))} points
                </p>
              </div>
            )}

            {/* Team Average */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-800">Team Performance</h4>
              </div>
              <p className="text-sm text-blue-700">
                Average {selectedMetric} score: {Math.round(teamAnalytics?.[selectedMetric] || teamAnalytics?.overall || 0)} points
              </p>
            </div>

            {/* Improvement Opportunity */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-purple-800">Focus Area</h4>
              </div>
              <p className="text-sm text-purple-700">
                {leaderboard.filter(c => c.percentile_rank < 50).length} consultant(s) need additional support
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderboard;