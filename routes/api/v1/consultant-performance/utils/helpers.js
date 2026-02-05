/**
 * Consultant Performance Utilities
 * Helper functions for calculations and analytics
 * 
 * @module consultant-performance/utils/helpers
 */

/**
 * Calculate trend analysis from historical data
 * @param {Array} trends - Array of trend data points with 'value' property
 * @param {string} metric - Metric name for context
 * @returns {Object} Trend analysis including direction, change, and volatility
 */
function calculateTrendAnalysis(trends, metric) {
  if (trends.length < 2) {
    return { trend: 'insufficient_data', change: 0, analysis: 'Need more data points' };
  }

  const values = trends.map(t => t.value || 0);
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const change = lastValue - firstValue;
  const percentChange = firstValue > 0 ? (change / firstValue) * 100 : 0;

  let trend = 'stable';
  if (Math.abs(percentChange) > 5) {
    trend = percentChange > 0 ? 'improving' : 'declining';
  }

  // Calculate average and volatility
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  const volatility = Math.sqrt(variance);

  return {
    trend,
    change,
    percentChange: Math.round(percentChange * 100) / 100,
    average: Math.round(average * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    analysis: generateTrendAnalysis(trend, percentChange, volatility)
  };
}

/**
 * Generate human-readable trend analysis
 * @param {string} trend - Trend direction ('improving', 'declining', 'stable')
 * @param {number} percentChange - Percent change
 * @param {number} volatility - Volatility measure
 * @returns {string} Human-readable analysis
 */
function generateTrendAnalysis(trend, percentChange, volatility) {
  if (trend === 'improving') {
    return `Performance improving by ${Math.abs(percentChange)}%. ${volatility > 10 ? 'Some volatility observed.' : 'Steady improvement.'}`;
  } else if (trend === 'declining') {
    return `Performance declining by ${Math.abs(percentChange)}%. ${volatility > 10 ? 'High volatility - needs attention.' : 'Consistent decline - intervention needed.'}`;
  } else {
    return `Performance stable with ${volatility > 10 ? 'high' : 'low'} volatility.`;
  }
}

/**
 * Calculate performance multiplier from system analytics
 * @param {Object} prequalStats - Pre-qualification statistics
 * @param {Object} retentionAnalytics - Retention analytics data
 * @param {Object} reliabilityAnalytics - Reliability analytics data
 * @returns {Object} Performance multiplier with breakdown
 */
function calculatePerformanceMultiplier(prequalStats, retentionAnalytics, reliabilityAnalytics) {
  // Base calculation: volume efficiency × quality retention × reliability improvement
  const volumeMultiplier = prequalStats.efficiency?.volume_reduction ?
    100 / (100 - prequalStats.efficiency.volume_reduction) : 1;

  const retentionMultiplier = retentionAnalytics.candidateMetrics?.averageEngagementScore ?
    retentionAnalytics.candidateMetrics.averageEngagementScore / 50 : 1;

  const reliabilityMultiplier = reliabilityAnalytics.overallMetrics?.averageReliabilityScore ?
    reliabilityAnalytics.overallMetrics.averageReliabilityScore / 70 : 1;

  const totalMultiplier = volumeMultiplier * retentionMultiplier * reliabilityMultiplier;

  return {
    total: Math.round(totalMultiplier),
    breakdown: {
      volume: Math.round(volumeMultiplier),
      retention: Math.round(retentionMultiplier * 10) / 10,
      reliability: Math.round(reliabilityMultiplier * 10) / 10
    }
  };
}

/**
 * Format metrics for display
 * @param {Object} rawMetrics - Raw metrics object
 * @returns {Object} Formatted metrics
 */
function formatMetrics(rawMetrics) {
  const formatted = {};
  
  for (const [key, value] of Object.entries(rawMetrics)) {
    if (typeof value === 'number') {
      // Round to 2 decimal places
      formatted[key] = Math.round(value * 100) / 100;
    } else {
      formatted[key] = value;
    }
  }
  
  return formatted;
}

/**
 * Calculate growth rate between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {number} Growth rate as percentage
 */
function calculateGrowthRate(current, previous) {
  if (!previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100 * 100) / 100;
}

module.exports = {
  calculateTrendAnalysis,
  generateTrendAnalysis,
  calculatePerformanceMultiplier,
  formatMetrics,
  calculateGrowthRate
};
