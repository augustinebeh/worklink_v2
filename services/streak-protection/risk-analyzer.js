/**
 * Streak Risk Analyzer
 *
 * Extracted risk analysis functions for the Streak Protection System.
 * These functions handle predictive streak risk detection including
 * check-in pattern analysis, engagement scoring, social pressure
 * evaluation, and overall risk calculation.
 */

const { db } = require('../../db');
const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('streak-risk-analyzer');

/**
 * Analyze check-in pattern for a candidate over the last 14 days.
 * Higher variance in check-in times indicates higher risk.
 */
async function analyzeCheckInPattern(candidateId) {
  try {
    const checkIns = db.prepare(`
      SELECT
        date(streak_last_date) as check_date,
        time(streak_last_date) as check_time,
        julianday('now') - julianday(streak_last_date) as days_ago
      FROM candidates
      WHERE id = ?
      ORDER BY streak_last_date DESC
      LIMIT 14
    `).all(candidateId);

    if (checkIns.length < 3) {
      return { riskScore: 0.3, pattern: 'insufficient_data' };
    }

    // Analyze check-in time variance
    const checkTimes = checkIns.map(ci => {
      const [hours, minutes] = ci.check_time.split(':').map(Number);
      return hours + minutes / 60;
    });

    const avgCheckTime = checkTimes.reduce((a, b) => a + b, 0) / checkTimes.length;
    const variance = checkTimes.reduce((acc, time) => acc + Math.pow(time - avgCheckTime, 2), 0) / checkTimes.length;

    // Higher variance = higher risk
    const patternRisk = Math.min(Math.sqrt(variance) / 6, 1.0); // Normalize by 6 hours

    return {
      riskScore: patternRisk,
      pattern: variance > 4 ? 'inconsistent' : 'consistent',
      avgCheckTime: avgCheckTime.toFixed(1),
      variance: variance.toFixed(2)
    };
  } catch (error) {
    logger.error('Failed to analyze check-in pattern:', error);
    return { riskScore: 0.3, pattern: 'error' };
  }
}

/**
 * Analyze recent engagement (applications, messages, ratings)
 * to determine engagement decline risk.
 */
async function analyzeRecentEngagement(candidateId) {
  try {
    const recentActivity = db.prepare(`
      SELECT
        COUNT(CASE WHEN d.created_at > datetime('now', '-7 days') THEN 1 END) as recent_applications,
        COUNT(CASE WHEN m.created_at > datetime('now', '-7 days') THEN 1 END) as recent_messages,
        AVG(CASE WHEN j.completed_at > datetime('now', '-14 days') THEN j.rating END) as recent_rating
      FROM candidates c
      LEFT JOIN deployments d ON c.id = d.candidate_id
      LEFT JOIN messages m ON c.id = m.candidate_id AND m.sender = 'candidate'
      LEFT JOIN (
        SELECT candidate_id, completed_at, rating FROM deployments WHERE status = 'completed'
      ) j ON c.id = j.candidate_id
      WHERE c.id = ?
    `).get(candidateId);

    // Calculate engagement decline risk
    let riskScore = 0;

    if (recentActivity.recent_applications === 0) riskScore += 0.3;
    if (recentActivity.recent_messages === 0) riskScore += 0.2;
    if (recentActivity.recent_rating && recentActivity.recent_rating < 4) riskScore += 0.2;

    return {
      riskScore: Math.min(riskScore, 1.0),
      recentApplications: recentActivity.recent_applications || 0,
      recentMessages: recentActivity.recent_messages || 0,
      recentRating: recentActivity.recent_rating || 'N/A'
    };
  } catch (error) {
    logger.error('Failed to analyze recent engagement:', error);
    return { riskScore: 0.2 };
  }
}

/**
 * Analyze social pressure by comparing a candidate's streak
 * against peers in the same area and level range.
 */
async function analyzeSocialPressure(candidate) {
  try {
    const peerComparison = db.prepare(`
      SELECT
        COUNT(*) as total_peers,
        COUNT(CASE WHEN streak_days > ? THEN 1 END) as outperforming_peers,
        AVG(streak_days) as avg_peer_streak,
        MAX(streak_days) as best_peer_streak
      FROM candidates
      WHERE status = 'active'
        AND location_area = ?
        AND level BETWEEN ? AND ?
        AND id != ?
    `).get(
      candidate.streak_days,
      candidate.location_area,
      candidate.level - 5,
      candidate.level + 5,
      candidate.id
    );

    let socialRisk = 0;
    if (peerComparison.outperforming_peers > 0) {
      socialRisk = Math.min(peerComparison.outperforming_peers / peerComparison.total_peers, 0.8);
    }

    return {
      riskScore: socialRisk,
      peerData: peerComparison
    };
  } catch (error) {
    logger.error('Failed to analyze social pressure:', error);
    return { riskScore: 0 };
  }
}

/**
 * Calculate the "value" of a streak (for loss aversion psychology).
 * Higher streaks and milestone thresholds yield higher values.
 */
function calculateStreakValue(streakDays) {
  let value = streakDays * 10; // Base value

  // Bonus for milestone streaks
  if (streakDays >= 100) value += 500;
  else if (streakDays >= 50) value += 200;
  else if (streakDays >= 30) value += 100;
  else if (streakDays >= 14) value += 50;
  else if (streakDays >= 7) value += 20;

  return value;
}

/**
 * Calculate overall risk score as a weighted combination of all risk factors.
 */
function calculateOverallRiskScore(factors) {
  const weights = {
    timeRisk: 0.4,        // Most important: time urgency
    patternRisk: 0.2,     // Historical behavior
    engagementRisk: 0.2,  // Recent activity
    socialRisk: 0.1,      // Peer pressure
    valueRisk: 0.1        // Loss aversion
  };

  let totalScore = 0;
  Object.keys(weights).forEach(factor => {
    totalScore += (factors[factor] || 0) * weights[factor];
  });

  return Math.min(totalScore, 1.0);
}

/**
 * Predict when a streak will break based on risk factors and time remaining.
 */
function predictStreakBreakTime(candidate, riskFactors) {
  const baseTimeRemaining = 24 - candidate.hours_since_checkin;

  // Adjust based on risk factors
  const adjustmentFactor = 1 - (riskFactors.patternRisk * 0.5 + riskFactors.engagementRisk * 0.3);

  return Math.max(baseTimeRemaining * adjustmentFactor, 0);
}

/**
 * Calculate all risk factors for a candidate.
 */
async function calculateRiskFactors(candidate) {
  const factors = {
    timeRisk: 0,
    patternRisk: 0,
    engagementRisk: 0,
    socialRisk: 0,
    valueRisk: 0
  };

  // Time risk (0-1): How close to the 24-hour deadline
  factors.timeRisk = Math.min(candidate.hours_since_checkin / 24, 1.0);

  // Pattern risk: Analyze historical check-in patterns
  const checkInPattern = await analyzeCheckInPattern(candidate.id);
  factors.patternRisk = checkInPattern.riskScore;

  // Engagement risk: Recent job applications, messages, etc.
  const engagementData = await analyzeRecentEngagement(candidate.id);
  factors.engagementRisk = engagementData.riskScore;

  // Social risk: How peers are performing
  const socialData = await analyzeSocialPressure(candidate);
  factors.socialRisk = socialData.riskScore;

  // Value risk: What they stand to lose
  factors.valueRisk = calculateStreakValue(candidate.streak_days) / 100;

  return factors;
}

module.exports = {
  analyzeCheckInPattern,
  analyzeRecentEngagement,
  analyzeSocialPressure,
  calculateStreakValue,
  calculateOverallRiskScore,
  predictStreakBreakTime,
  calculateRiskFactors
};
