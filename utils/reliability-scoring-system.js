/**
 * RELIABILITY SCORING SYSTEM
 * Prevents last-minute cancellations - Core Pain Point #3 Solution
 *
 * Predicts candidate reliability, manages backup systems,
 * and ensures 95%+ show-up rates for all deployments.
 */

const { db } = require('../db');

class ReliabilityScoringSystem {
  constructor() {
    this.reliabilityFactors = {
      pastPerformance: 0.40,     // Historical show-up rate
      responseTime: 0.15,        // How quickly they respond
      confirmationPattern: 0.15, // Pattern of confirmations
      circumstances: 0.10,       // Personal situation stability
      engagementLevel: 0.10,     // General engagement with platform
      timePatterns: 0.10         // Consistency in availability
    };

    this.reliabilityTiers = {
      platinum: { min: 95, color: '🥇', premium: 1.5 },  // 95%+ show-up rate
      gold: { min: 90, color: '🥈', premium: 1.2 },      // 90-94% show-up rate
      silver: { min: 80, color: '🥉', premium: 1.0 },    // 80-89% show-up rate
      bronze: { min: 70, color: '⚠️', premium: 0.8 },     // 70-79% show-up rate
      risk: { min: 0, color: '🚨', premium: 0.6 }        // Below 70% show-up rate
    };

    this.confirmationSequence = [
      { hours: 72, message: "Initial confirmation required" },
      { hours: 24, message: "Final confirmation with details" },
      { hours: 2, message: "Pre-arrival check-in" },
      { hours: 0.5, message: "Arrival confirmation" }
    ];
  }

  /**
   * Calculate comprehensive reliability score for candidate
   */
  async calculateReliabilityScore(candidateId) {
    const factors = await this.gatherReliabilityFactors(candidateId);
    const weightedScore = this.calculateWeightedScore(factors);
    const tier = this.getReliabilityTier(weightedScore);

    const result = {
      candidateId,
      reliabilityScore: Math.round(weightedScore),
      tier: tier.name,
      tierDetails: tier.details,
      factors,
      predictedShowUpRate: this.predictShowUpRate(weightedScore),
      recommendedActions: this.getRecommendedActions(weightedScore, factors),
      calculatedAt: new Date().toISOString()
    };

    // Store the score
    await this.storeReliabilityScore(result);

    return result;
  }

  /**
   * Gather all reliability factors for a candidate
   */
  async gatherReliabilityFactors(candidateId) {
    return {
      pastPerformance: await this.calculatePastPerformance(candidateId),
      responseTime: await this.calculateResponseTime(candidateId),
      confirmationPattern: await this.calculateConfirmationPattern(candidateId),
      circumstances: await this.evaluateCircumstances(candidateId),
      engagementLevel: await this.calculateEngagementLevel(candidateId),
      timePatterns: await this.analyzeTimePatterns(candidateId)
    };
  }

  /**
   * Calculate past performance score
   */
  async calculatePastPerformance(candidateId) {
    const deploymentHistory = db.prepare(`
      SELECT
        COUNT(*) as total_deployments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'cancelled_last_minute' THEN 1 ELSE 0 END) as last_minute_cancels,
        AVG(client_rating) as avg_rating
      FROM deployments
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).get(candidateId);

    if (!deploymentHistory.total_deployments) {
      return { score: 70, reason: "New candidate - neutral score" };
    }

    const showUpRate = (deploymentHistory.completed / deploymentHistory.total_deployments) * 100;
    const noShowRate = (deploymentHistory.no_shows / deploymentHistory.total_deployments) * 100;
    const cancelRate = (deploymentHistory.last_minute_cancels / deploymentHistory.total_deployments) * 100;

    // Base score from show-up rate
    let score = showUpRate;

    // Penalties for problematic behavior
    score -= (noShowRate * 2); // Double penalty for no-shows
    score -= cancelRate;        // Penalty for last-minute cancels

    // Bonus for high ratings
    if (deploymentHistory.avg_rating >= 4.5) score += 5;
    else if (deploymentHistory.avg_rating >= 4.0) score += 3;

    return {
      score: Math.max(0, Math.min(100, score)),
      showUpRate,
      noShowRate,
      cancelRate,
      avgRating: deploymentHistory.avg_rating,
      totalDeployments: deploymentHistory.total_deployments,
      reason: `Based on ${deploymentHistory.total_deployments} deployments`
    };
  }

  /**
   * Calculate response time score
   */
  async calculateResponseTime(candidateId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const responses = db.prepare(`
      SELECT
        AVG(response_time_hours) as avg_response_time,
        COUNT(*) as total_messages
      FROM message_responses
      WHERE candidate_id = ? AND created_at >= ?
    `).get(candidateId, thirtyDaysAgo);

    if (!responses.total_messages) {
      return { score: 50, reason: "No recent message history" };
    }

    const avgHours = responses.avg_response_time || 24;

    // Score based on response speed
    let score;
    if (avgHours <= 1) score = 100;      // Within 1 hour
    else if (avgHours <= 4) score = 90;  // Within 4 hours
    else if (avgHours <= 8) score = 80;  // Within 8 hours
    else if (avgHours <= 24) score = 70; // Within 1 day
    else if (avgHours <= 48) score = 50; // Within 2 days
    else score = 20;                     // Slower than 2 days

    return {
      score,
      avgResponseTime: avgHours,
      totalMessages: responses.total_messages,
      reason: `Average ${avgHours.toFixed(1)} hours response time`
    };
  }

  /**
   * Calculate confirmation pattern reliability
   */
  async calculateConfirmationPattern(candidateId) {
    const confirmations = db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN confirmed = 1 THEN 1 ELSE 0 END) as confirmations,
        AVG(response_time_hours) as avg_confirmation_time
      FROM deployment_confirmations
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).get(candidateId);

    if (!confirmations.total_requests) {
      return { score: 70, reason: "No confirmation history" };
    }

    const confirmationRate = (confirmations.confirmations / confirmations.total_requests) * 100;
    const avgConfirmTime = confirmations.avg_confirmation_time || 12;

    let score = confirmationRate;

    // Bonus for fast confirmations
    if (avgConfirmTime <= 2) score += 10;      // Within 2 hours
    else if (avgConfirmTime <= 6) score += 5;  // Within 6 hours

    return {
      score: Math.min(100, score),
      confirmationRate,
      avgConfirmationTime: avgConfirmTime,
      totalRequests: confirmations.total_requests,
      reason: `${confirmationRate.toFixed(1)}% confirmation rate`
    };
  }

  /**
   * Evaluate personal circumstances stability
   */
  async evaluateCircumstances(candidateId) {
    const candidate = db.prepare(`
      SELECT
        transportation_method,
        has_backup_childcare,
        financial_stability,
        housing_stability,
        health_issues,
        updated_at
      FROM candidate_circumstances
      WHERE candidate_id = ?
    `).get(candidateId);

    if (!candidate) {
      return { score: 60, reason: "No circumstances data" };
    }

    let score = 50; // Base score

    // Transportation reliability
    if (candidate.transportation_method === 'own_vehicle') score += 20;
    else if (candidate.transportation_method === 'public_mrt') score += 15;
    else if (candidate.transportation_method === 'public_bus') score += 10;

    // Childcare backup
    if (candidate.has_backup_childcare) score += 15;

    // Financial stability
    if (candidate.financial_stability === 'stable') score += 10;
    else if (candidate.financial_stability === 'moderate') score += 5;

    // Housing stability
    if (candidate.housing_stability === 'stable') score += 10;
    else if (candidate.housing_stability === 'moderate') score += 5;

    // Health considerations
    if (!candidate.health_issues) score += 10;

    return {
      score: Math.min(100, score),
      factors: candidate,
      reason: "Based on personal circumstances assessment"
    };
  }

  /**
   * Calculate engagement level score
   */
  async calculateEngagementLevel(candidateId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const engagement = db.prepare(`
      SELECT COUNT(*) as activities
      FROM candidate_engagement
      WHERE candidate_id = ? AND created_at >= ?
    `).get(candidateId, thirtyDaysAgo);

    const profileUpdates = db.prepare(`
      SELECT COUNT(*) as updates
      FROM profile_updates
      WHERE candidate_id = ? AND created_at >= ?
    `).get(candidateId, thirtyDaysAgo);

    const totalActivities = engagement.activities + profileUpdates.updates;

    let score;
    if (totalActivities >= 10) score = 100;
    else if (totalActivities >= 5) score = 80;
    else if (totalActivities >= 2) score = 60;
    else if (totalActivities >= 1) score = 40;
    else score = 20;

    return {
      score,
      activities: engagement.activities,
      profileUpdates: profileUpdates.updates,
      totalActivities,
      reason: `${totalActivities} activities in 30 days`
    };
  }

  /**
   * Analyze time patterns for consistency
   */
  async analyzeTimePatterns(candidateId) {
    // Use the existing availability table structure
    const availabilityPattern = db.prepare(`
      SELECT
        strftime('%w', date) as day_of_week,
        COUNT(*) as available_count,
        AVG(CASE WHEN status = 'available' THEN 1.0 ELSE 0.0 END) as availability_rate
      FROM candidate_availability
      WHERE candidate_id = ?
      GROUP BY strftime('%w', date)
    `).all(candidateId);

    if (!availabilityPattern.length) {
      return { score: 60, reason: "No availability pattern data" };
    }

    // Calculate consistency across days
    const rates = availabilityPattern.map(p => p.availability_rate || 0);
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((acc, rate) => acc + Math.pow(rate - avgRate, 2), 0) / rates.length;
    const consistency = Math.max(0, 100 - (variance * 100));

    return {
      score: consistency * 100, // Convert to 0-100 scale
      averageAvailabilityRate: avgRate,
      consistency: consistency,
      patternData: availabilityPattern,
      reason: `${(consistency * 100).toFixed(1)}% pattern consistency`
    };
  }

  /**
   * Calculate weighted reliability score
   */
  calculateWeightedScore(factors) {
    let totalScore = 0;

    Object.keys(this.reliabilityFactors).forEach(factor => {
      const weight = this.reliabilityFactors[factor];
      const score = factors[factor]?.score || 0;
      totalScore += score * weight;
    });

    return totalScore;
  }

  /**
   * Get reliability tier
   */
  getReliabilityTier(score) {
    for (const [tierName, tierConfig] of Object.entries(this.reliabilityTiers)) {
      if (score >= tierConfig.min) {
        return {
          name: tierName,
          details: tierConfig,
          score: Math.round(score)
        };
      }
    }
    return { name: 'risk', details: this.reliabilityTiers.risk, score: Math.round(score) };
  }

  /**
   * Predict show-up rate
   */
  predictShowUpRate(reliabilityScore) {
    // Convert reliability score to predicted show-up percentage
    return Math.min(99, Math.max(60, reliabilityScore));
  }

  /**
   * Get recommended actions based on score
   */
  getRecommendedActions(score, factors) {
    const actions = [];

    if (score >= 95) {
      actions.push("Premium candidate - offer best opportunities first");
      actions.push("Minimal confirmation needed");
    } else if (score >= 90) {
      actions.push("Reliable candidate - standard booking procedures");
    } else if (score >= 80) {
      actions.push("Good candidate - standard confirmation sequence");
      actions.push("Monitor for improvement opportunities");
    } else if (score >= 70) {
      actions.push("Moderate risk - enhanced confirmation required");
      actions.push("Book backup candidates for important events");
    } else {
      actions.push("High risk - require full confirmation sequence");
      actions.push("Always book backup candidates");
      actions.push("Consider reliability improvement program");
    }

    // Factor-specific recommendations
    if (factors.pastPerformance?.noShowRate > 10) {
      actions.push("Address no-show pattern through counseling");
    }
    if (factors.responseTime?.avgResponseTime > 12) {
      actions.push("Improve communication responsiveness");
    }

    return actions;
  }

  /**
   * Automated backup system based on reliability
   */
  async createBackupSystem(deploymentId, primaryCandidates) {
    const deployment = db.prepare(`
      SELECT * FROM deployments WHERE id = ?
    `).get(deploymentId);

    const candidateScores = [];
    for (const candidateId of primaryCandidates) {
      const score = await this.calculateReliabilityScore(candidateId);
      candidateScores.push(score);
    }

    // Calculate overall risk level
    const avgReliability = candidateScores.reduce((sum, c) => sum + c.reliabilityScore, 0) / candidateScores.length;
    const lowestReliability = Math.min(...candidateScores.map(c => c.reliabilityScore));

    // Determine backup requirements
    let backupMultiplier = 1.0; // 100% = same number of backups as primaries

    if (avgReliability >= 95) backupMultiplier = 0.2; // 20% backup
    else if (avgReliability >= 90) backupMultiplier = 0.3; // 30% backup
    else if (avgReliability >= 80) backupMultiplier = 0.5; // 50% backup
    else if (avgReliability >= 70) backupMultiplier = 0.8; // 80% backup
    else backupMultiplier = 1.2; // 120% backup

    // Critical event adjustment
    if (deployment.importance === 'critical') backupMultiplier *= 1.5;

    const backupsNeeded = Math.ceil(primaryCandidates.length * backupMultiplier);

    // Find backup candidates
    const backupCandidates = await this.findBackupCandidates(deployment, backupsNeeded, primaryCandidates);

    // Create backup system entry
    const backupSystemId = 'BACKUP_' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO deployment_backup_systems (
        id, deployment_id, primary_candidates, backup_candidates,
        avg_reliability, lowest_reliability, backup_multiplier,
        backups_needed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      backupSystemId,
      deploymentId,
      JSON.stringify(primaryCandidates),
      JSON.stringify(backupCandidates.map(c => c.id)),
      avgReliability,
      lowestReliability,
      backupMultiplier,
      backupsNeeded,
      new Date().toISOString()
    );

    return {
      backupSystemId,
      deploymentId,
      primaryCandidates: candidateScores,
      backupCandidates,
      avgReliability: Math.round(avgReliability),
      lowestReliability: Math.round(lowestReliability),
      backupsNeeded,
      backupMultiplier,
      riskLevel: this.assessRiskLevel(avgReliability, lowestReliability),
      confirmationPlan: this.createConfirmationPlan(candidateScores)
    };
  }

  /**
   * Find suitable backup candidates
   */
  async findBackupCandidates(deployment, count, excludePrimaries) {
    const backups = db.prepare(`
      SELECT c.*, rs.reliability_score, rs.tier
      FROM candidates c
      JOIN reliability_scores rs ON c.id = rs.candidate_id
      WHERE c.id NOT IN (${excludePrimaries.map(() => '?').join(',')})
        AND c.status = 'active'
        AND rs.reliability_score >= 70
      ORDER BY rs.reliability_score DESC
      LIMIT ?
    `).all(...excludePrimaries, count);

    return backups;
  }

  /**
   * Assess overall risk level
   */
  assessRiskLevel(avgReliability, lowestReliability) {
    if (lowestReliability < 70) return 'HIGH_RISK';
    if (avgReliability < 80) return 'MODERATE_RISK';
    if (avgReliability < 90) return 'LOW_RISK';
    return 'MINIMAL_RISK';
  }

  /**
   * Create confirmation plan based on reliability
   */
  createConfirmationPlan(candidateScores) {
    return candidateScores.map(candidate => ({
      candidateId: candidate.candidateId,
      tier: candidate.tier,
      confirmationSchedule: this.getConfirmationSchedule(candidate.reliabilityScore),
      specialInstructions: this.getSpecialInstructions(candidate)
    }));
  }

  /**
   * Get confirmation schedule based on reliability
   */
  getConfirmationSchedule(reliabilityScore) {
    if (reliabilityScore >= 95) {
      return [
        { hours: 24, required: true },
        { hours: 2, required: false }
      ];
    } else if (reliabilityScore >= 85) {
      return this.confirmationSequence.slice(1); // Skip 72hr, start from 24hr
    } else {
      return this.confirmationSequence; // Full sequence
    }
  }

  /**
   * Get special instructions for candidate
   */
  getSpecialInstructions(candidate) {
    const instructions = [];

    if (candidate.reliabilityScore < 70) {
      instructions.push("Require written confirmation");
      instructions.push("Call 1 hour before event");
    }
    if (candidate.reliabilityScore < 80) {
      instructions.push("Confirm arrival location and time");
    }
    if (candidate.tier === 'platinum') {
      instructions.push("VIP candidate - minimal confirmations needed");
    }

    return instructions;
  }

  /**
   * Store reliability score in database
   */
  async storeReliabilityScore(scoreData) {
    db.prepare(`
      INSERT OR REPLACE INTO reliability_scores (
        candidate_id, reliability_score, tier, predicted_show_up_rate,
        past_performance_score, response_time_score, confirmation_pattern_score,
        circumstances_score, engagement_score, time_patterns_score,
        calculated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      scoreData.candidateId,
      scoreData.reliabilityScore,
      scoreData.tier,
      scoreData.predictedShowUpRate,
      scoreData.factors.pastPerformance.score,
      scoreData.factors.responseTime.score,
      scoreData.factors.confirmationPattern.score,
      scoreData.factors.circumstances.score,
      scoreData.factors.engagementLevel.score,
      scoreData.factors.timePatterns.score,
      scoreData.calculatedAt
    );
  }

  /**
   * Get reliability analytics dashboard
   */
  async getReliabilityAnalytics() {
    const tierDistribution = db.prepare(`
      SELECT
        tier,
        COUNT(*) as count,
        AVG(reliability_score) as avg_score,
        AVG(predicted_show_up_rate) as avg_show_up_rate
      FROM reliability_scores
      WHERE calculated_at >= datetime('now', '-30 days')
      GROUP BY tier
    `).all();

    const recentDeployments = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows
      FROM deployments
      WHERE created_at >= datetime('now', '-30 days')
    `).get();

    const actualShowUpRate = recentDeployments.total > 0 ?
      (recentDeployments.completed / recentDeployments.total) * 100 : 0;

    return {
      tierDistribution,
      overallMetrics: {
        totalCandidatesScored: tierDistribution.reduce((sum, t) => sum + t.count, 0),
        averageReliabilityScore: Math.round(tierDistribution.reduce((sum, t) => sum + (t.avg_score * t.count), 0) / tierDistribution.reduce((sum, t) => sum + t.count, 0)),
        predictedShowUpRate: Math.round(tierDistribution.reduce((sum, t) => sum + (t.avg_show_up_rate * t.count), 0) / tierDistribution.reduce((sum, t) => sum + t.count, 0)),
        actualShowUpRate: Math.round(actualShowUpRate),
        predictionAccuracy: Math.round(100 - Math.abs(actualShowUpRate - tierDistribution.reduce((sum, t) => sum + (t.avg_show_up_rate * t.count), 0) / tierDistribution.reduce((sum, t) => sum + t.count, 0)))
      },
      deploymentMetrics: recentDeployments
    };
  }
}

module.exports = { ReliabilityScoringSystem };