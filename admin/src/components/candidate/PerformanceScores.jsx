/**
 * Performance Scores Component
 * Shows reliability and engagement scores for candidates
 */

import React, { useState, useEffect } from 'react';
import { Star, Heart, RefreshCw, Trophy, Loader2, AlertCircle } from 'lucide-react';

const PerformanceScores = ({ candidateId }) => {
  const [loading, setLoading] = useState(false);
  const [reliabilityData, setReliabilityData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (candidateId) {
      loadPerformanceScores();
    }
  }, [candidateId]);

  const loadPerformanceScores = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load reliability score
      const reliabilityResponse = await fetch(
        `/api/v1/consultant-performance/reliability/calculate/${candidateId}`,
        { method: 'POST' }
      );
      const reliabilityResult = await reliabilityResponse.json();

      if (reliabilityResult.success) {
        setReliabilityData(reliabilityResult.data);
      }

      // Load engagement data from retention analytics
      const retentionResponse = await fetch('/api/v1/consultant-performance/retention/analytics');
      const retentionResult = await retentionResponse.json();

      if (retentionResult.success) {
        // Find this candidate's engagement data (simplified for this component)
        setEngagementData({
          tier: 'good', // Placeholder - in real app would come from API
          score: 75,
          lastActivity: '2 days ago'
        });
      }

    } catch (error) {
      console.error('Error loading performance scores:', error);
      setError('Failed to load performance scores');
    } finally {
      setLoading(false);
    }
  };

  const getTierColorClass = (tier) => {
    const colors = {
      excellent: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      good: 'bg-green-100 text-green-800 border-green-300',
      moderate: 'bg-blue-100 text-blue-800 border-blue-300',
      poor: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
      platinum: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      gold: 'bg-orange-100 text-orange-800 border-orange-300',
      silver: 'bg-gray-100 text-gray-800 border-gray-300',
      bronze: 'bg-orange-100 text-orange-800 border-orange-300',
      risk: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[tier] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getScoreColorClass = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 80) return 'text-blue-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 60) return 'text-orange-500';
    return 'text-red-500';
  };

  const getProgressColorClass = (score) => {
    if (score >= 90) return 'stroke-green-500';
    if (score >= 80) return 'stroke-blue-500';
    if (score >= 70) return 'stroke-yellow-500';
    if (score >= 60) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const getTierIcon = (tier) => {
    if (tier === 'platinum' || tier === 'excellent') return <Trophy className="w-3 h-3" />;
    return <Star className="w-3 h-3" />;
  };

  // Simple circular progress component
  const CircularProgress = ({ percentage, size = 80 }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={getProgressColorClass(percentage)}
            strokeLinecap="round"
          />
        </svg>
        <div className={`absolute text-sm font-semibold ${getScoreColorClass(percentage)}`}>
          {percentage}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-orange-600">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h3 className="font-medium">Performance Scores</h3>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
          <button
            onClick={loadPerformanceScores}
            className="px-3 py-1 text-sm bg-orange-50 text-orange-600 rounded hover:bg-orange-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Star className="w-4 h-4" />
          <h3 className="font-medium">Performance Scores</h3>
        </div>
        <button
          onClick={loadPerformanceScores}
          disabled={loading}
          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Calculating performance scores...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Reliability Score */}
            {reliabilityData && (
              <div className="text-center">
                <CircularProgress percentage={reliabilityData.reliabilityScore} />
                <div className="mt-3">
                  <p className="font-semibold text-gray-900">Reliability</p>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getTierColorClass(reliabilityData.tier)}`}>
                    {getTierIcon(reliabilityData.tier)}
                    <span>{reliabilityData.tier.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {reliabilityData.predictedShowUpRate}% predicted show-up
                  </p>
                </div>
              </div>
            )}

            {/* Engagement Score */}
            {engagementData && (
              <div className="text-center">
                <CircularProgress percentage={engagementData.score} />
                <div className="mt-3">
                  <p className="font-semibold text-gray-900">Engagement</p>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getTierColorClass(engagementData.tier)}`}>
                    <Heart className="w-3 h-3" />
                    <span>{engagementData.tier.toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Last activity: {engagementData.lastActivity}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Insights */}
        {reliabilityData && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              AI Insights:
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              {reliabilityData.recommendedActions.slice(0, 2).map((action, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!reliabilityData && !engagementData && !loading && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No performance data available</p>
            <p className="text-xs mt-1">
              Scores will be calculated after candidate interactions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceScores;