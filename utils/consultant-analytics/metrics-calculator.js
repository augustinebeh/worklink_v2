/**
 * Consultant Analytics - Metrics Calculator
 *
 * Extracted calculation methods for KPI scoring, rankings,
 * alert generation, coaching recommendations, and team analytics.
 */

const { createLogger } = require('../structured-logger');
const logger = createLogger('consultant-metrics');

const { db } = require('../../db');

// =====================================================
// KPI SCORING AND RANKING
// =====================================================

async function calculateIndividualKPIScore(consultantId, period, periodStart, periodEnd, normalizeScore) {
  const aggregatedData = db.prepare(`
    SELECT
      AVG(efficiency_score) as avg_efficiency,
      AVG(quality_score) as avg_quality,
      AVG(growth_score) as avg_growth,
      AVG(overall_performance_score) as avg_overall,

      AVG(scheduling_speed_minutes) as avg_scheduling_speed,
      AVG(conversion_to_hire_rate) as avg_conversion_rate,
      AVG(reliability_score) as avg_reliability,
      AVG(candidate_satisfaction_score) as avg_satisfaction,
      AVG(skill_development_score) as avg_innovation,
      AVG(coaching_implementation_score) as avg_mentoring,

      SUM(candidates_scheduled) as total_scheduled,
      SUM(candidates_converted) as total_converted,
      SUM(interviews_conducted) as total_interviews,
      SUM(process_improvement_suggestions) as total_improvements
    FROM consultant_performance_daily
    WHERE consultant_id = ? AND date BETWEEN ? AND ?
  `).get(consultantId, periodStart, periodEnd);

  if (!aggregatedData || !aggregatedData.avg_overall) {
    return null;
  }

  const kpiScores = {
    scheduling_efficiency_score: normalizeScore(100 - (aggregatedData.avg_scheduling_speed / 6)),
    conversion_rate_score: normalizeScore(aggregatedData.avg_conversion_rate * 2),
    reliability_score: normalizeScore(aggregatedData.avg_reliability),
    satisfaction_score: normalizeScore(aggregatedData.avg_satisfaction),
    innovation_score: normalizeScore(aggregatedData.avg_innovation),
    mentoring_score: normalizeScore(aggregatedData.avg_mentoring)
  };

  const efficiencyKPIs = {
    schedulingSpeed: aggregatedData.avg_scheduling_speed,
    conversionRate: aggregatedData.avg_conversion_rate,
    totalScheduled: aggregatedData.total_scheduled,
    totalConverted: aggregatedData.total_converted
  };

  const qualityKPIs = {
    reliabilityScore: aggregatedData.avg_reliability,
    satisfactionScore: aggregatedData.avg_satisfaction,
    totalInterviews: aggregatedData.total_interviews
  };

  const growthKPIs = {
    innovationScore: aggregatedData.avg_innovation,
    mentoringScore: aggregatedData.avg_mentoring,
    totalImprovements: aggregatedData.total_improvements
  };

  const kpiData = {
    consultant_id: consultantId,
    calculation_period: period,
    period_start: periodStart,
    period_end: periodEnd,

    efficiency_kpis: JSON.stringify(efficiencyKPIs),
    quality_kpis: JSON.stringify(qualityKPIs),
    growth_kpis: JSON.stringify(growthKPIs),

    scheduling_efficiency_score: kpiScores.scheduling_efficiency_score,
    conversion_rate_score: kpiScores.conversion_rate_score,
    reliability_score: kpiScores.reliability_score,
    satisfaction_score: kpiScores.satisfaction_score,
    innovation_score: kpiScores.innovation_score,
    mentoring_score: kpiScores.mentoring_score,

    weighted_efficiency_score: aggregatedData.avg_efficiency,
    weighted_quality_score: aggregatedData.avg_quality,
    weighted_growth_score: aggregatedData.avg_growth,
    overall_kpi_score: aggregatedData.avg_overall
  };

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO consultant_kpi_scores
    (consultant_id, calculation_period, period_start, period_end,
     efficiency_kpis, quality_kpis, growth_kpis,
     scheduling_efficiency_score, conversion_rate_score, reliability_score,
     satisfaction_score, innovation_score, mentoring_score,
     weighted_efficiency_score, weighted_quality_score, weighted_growth_score,
     overall_kpi_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    kpiData.consultant_id, kpiData.calculation_period, kpiData.period_start, kpiData.period_end,
    kpiData.efficiency_kpis, kpiData.quality_kpis, kpiData.growth_kpis,
    kpiData.scheduling_efficiency_score, kpiData.conversion_rate_score, kpiData.reliability_score,
    kpiData.satisfaction_score, kpiData.innovation_score, kpiData.mentoring_score,
    kpiData.weighted_efficiency_score, kpiData.weighted_quality_score, kpiData.weighted_growth_score,
    kpiData.overall_kpi_score
  );

  return kpiData;
}

async function calculateRankings(kpiResults, period, periodStart) {
  const efficiencyRanked = [...kpiResults].sort((a, b) => b.weighted_efficiency_score - a.weighted_efficiency_score);
  const qualityRanked = [...kpiResults].sort((a, b) => b.weighted_quality_score - a.weighted_quality_score);
  const growthRanked = [...kpiResults].sort((a, b) => b.weighted_growth_score - a.weighted_growth_score);
  const overallRanked = [...kpiResults].sort((a, b) => b.overall_kpi_score - a.overall_kpi_score);

  const teamAverage = overallRanked.reduce((sum, kpi) => sum + kpi.overall_kpi_score, 0) / overallRanked.length;

  for (let i = 0; i < overallRanked.length; i++) {
    const consultant = overallRanked[i];
    const efficiencyRank = efficiencyRanked.findIndex(c => c.consultant_id === consultant.consultant_id) + 1;
    const qualityRank = qualityRanked.findIndex(c => c.consultant_id === consultant.consultant_id) + 1;
    const growthRank = growthRanked.findIndex(c => c.consultant_id === consultant.consultant_id) + 1;
    const overallRank = i + 1;
    const percentileRank = ((overallRanked.length - i) / overallRanked.length) * 100;
    const scoreVsAverage = consultant.overall_kpi_score - teamAverage;

    db.prepare(`
      UPDATE consultant_kpi_scores
      SET efficiency_rank = ?, quality_rank = ?, growth_rank = ?, overall_rank = ?,
          percentile_rank = ?, team_average_score = ?, score_vs_team_average = ?
      WHERE consultant_id = ? AND calculation_period = ? AND period_start = ?
    `).run(
      efficiencyRank, qualityRank, growthRank, overallRank,
      percentileRank, teamAverage, scoreVsAverage,
      consultant.consultant_id, period, periodStart
    );
  }
}

// =====================================================
// ALERT GENERATION
// =====================================================

async function generatePerformanceAlerts(consultantId, performanceData, alertThresholds) {
  const alerts = [];

  const previousPerformance = db.prepare(`
    SELECT AVG(overall_performance_score) as avg_score
    FROM consultant_performance_daily
    WHERE consultant_id = ? AND date > DATE(?, '-7 days') AND date < ?
  `).get(consultantId, performanceData.date, performanceData.date);

  if (previousPerformance && previousPerformance.avg_score) {
    const performanceDrop = previousPerformance.avg_score - performanceData.overall_performance_score;
    if (performanceDrop > alertThresholds.performanceDrop) {
      alerts.push({
        type: 'performance_drop',
        severity: performanceDrop > 25 ? 'high' : 'medium',
        title: 'Performance Drop Detected',
        description: `Performance has dropped by ${Math.round(performanceDrop)} points compared to recent average`,
        triggerMetric: 'overall_performance_score',
        triggerValue: performanceData.overall_performance_score,
        thresholdValue: previousPerformance.avg_score - alertThresholds.performanceDrop
      });
    }
  }

  if (performanceData.quality_score < alertThresholds.qualityIssue) {
    alerts.push({
      type: 'quality_issue',
      severity: performanceData.quality_score < 50 ? 'high' : 'medium',
      title: 'Quality Score Below Threshold',
      description: `Quality score of ${Math.round(performanceData.quality_score)} is below acceptable threshold`,
      triggerMetric: 'quality_score',
      triggerValue: performanceData.quality_score,
      thresholdValue: alertThresholds.qualityIssue
    });
  }

  if (performanceData.capacity_utilization_percent > alertThresholds.capacityWarning) {
    alerts.push({
      type: 'capacity_warning',
      severity: performanceData.capacity_utilization_percent > 95 ? 'critical' : 'medium',
      title: 'High Capacity Utilization',
      description: `Capacity utilization of ${Math.round(performanceData.capacity_utilization_percent)}% may lead to burnout`,
      triggerMetric: 'capacity_utilization_percent',
      triggerValue: performanceData.capacity_utilization_percent,
      thresholdValue: alertThresholds.capacityWarning
    });
  }

  if (performanceData.overall_performance_score > alertThresholds.achievementUnlock) {
    alerts.push({
      type: 'achievement',
      severity: 'low',
      title: 'High Performance Achievement',
      description: `Excellent performance score of ${Math.round(performanceData.overall_performance_score)}!`,
      triggerMetric: 'overall_performance_score',
      triggerValue: performanceData.overall_performance_score,
      thresholdValue: alertThresholds.achievementUnlock
    });
  }

  for (const alert of alerts) {
    db.prepare(`
      INSERT INTO consultant_alerts
      (consultant_id, alert_type, severity, title, description,
       trigger_metric, trigger_value, threshold_value,
       priority_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      consultantId, alert.type, alert.severity, alert.title, alert.description,
      alert.triggerMetric, alert.triggerValue, alert.thresholdValue,
      calculateAlertPriority(alert)
    );
  }

  return alerts;
}

function calculateAlertPriority(alert) {
  const severityScores = { low: 25, medium: 50, high: 75, critical: 100 };
  const typeScores = {
    performance_drop: 80,
    quality_issue: 85,
    capacity_warning: 90,
    achievement: 20,
    opportunity: 60
  };

  return Math.round((severityScores[alert.severity] + typeScores[alert.type]) / 2);
}

// =====================================================
// COACHING RECOMMENDATIONS
// =====================================================

async function generateCoachingRecommendations(consultantId, performanceData) {
  const recommendations = [];

  if (performanceData.efficiency_score < 70) {
    const efficiencyRec = createEfficiencyRecommendation(consultantId, performanceData);
    if (efficiencyRec) recommendations.push(efficiencyRec);
  }

  if (performanceData.quality_score < 75) {
    const qualityRec = createQualityRecommendation(consultantId, performanceData);
    if (qualityRec) recommendations.push(qualityRec);
  }

  if (performanceData.growth_score < 65) {
    const growthRec = createGrowthRecommendation(consultantId, performanceData);
    if (growthRec) recommendations.push(growthRec);
  }

  for (const rec of recommendations) {
    db.prepare(`
      INSERT INTO coaching_recommendations
      (consultant_id, recommendation_type, category, title, description,
       detailed_guidance, target_kpi, current_performance, target_performance,
       estimated_impact_score, action_steps, resources_needed,
       estimated_time_to_implement_hours, difficulty_level, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      consultantId, rec.type, rec.category, rec.title, rec.description,
      rec.guidance, rec.targetKPI, rec.currentPerformance, rec.targetPerformance,
      rec.estimatedImpact, JSON.stringify(rec.actionSteps), JSON.stringify(rec.resources),
      rec.estimatedHours, rec.difficulty, rec.priority
    );
  }

  return recommendations;
}

function createEfficiencyRecommendation(consultantId, performanceData) {
  if (performanceData.scheduling_speed_minutes > 120) {
    return {
      type: 'efficiency_boost',
      category: 'scheduling',
      title: 'Improve Scheduling Speed',
      description: 'Current scheduling time is above optimal range',
      guidance: `Focus on streamlining your scheduling process. Current average of ${Math.round(performanceData.scheduling_speed_minutes)} minutes can be reduced through better preparation and process optimization.`,
      targetKPI: 'scheduling_speed',
      currentPerformance: performanceData.scheduling_speed_minutes,
      targetPerformance: 60,
      estimatedImpact: 70,
      actionSteps: [
        'Prepare standardized availability templates',
        'Use automated scheduling tools where possible',
        'Batch schedule similar candidates',
        'Pre-qualify candidate availability before contact'
      ],
      resources: ['Scheduling software training', 'Template library access'],
      estimatedHours: 4,
      difficulty: 'medium',
      priority: 75
    };
  }
  return null;
}

function createQualityRecommendation(consultantId, performanceData) {
  if (performanceData.candidate_satisfaction_score < 70) {
    return {
      type: 'quality_enhancement',
      category: 'communication',
      title: 'Improve Candidate Satisfaction',
      description: 'Candidate satisfaction scores are below target',
      guidance: `Current satisfaction score of ${Math.round(performanceData.candidate_satisfaction_score)} indicates opportunity for improvement in candidate experience.`,
      targetKPI: 'satisfaction_score',
      currentPerformance: performanceData.candidate_satisfaction_score,
      targetPerformance: 85,
      estimatedImpact: 80,
      actionSteps: [
        'Practice active listening techniques',
        'Improve interview preparation materials',
        'Follow up more consistently with candidates',
        'Gather detailed feedback on process improvements'
      ],
      resources: ['Communication skills workshop', 'Customer service training'],
      estimatedHours: 6,
      difficulty: 'medium',
      priority: 85
    };
  }
  return null;
}

function createGrowthRecommendation(consultantId, performanceData) {
  if (performanceData.process_improvement_suggestions < 2) {
    return {
      type: 'career_growth',
      category: 'leadership',
      title: 'Increase Process Innovation',
      description: 'Opportunity to contribute more process improvements',
      guidance: 'Consider ways to optimize current processes and share insights with the team.',
      targetKPI: 'process_improvements',
      currentPerformance: performanceData.process_improvement_suggestions,
      targetPerformance: 5,
      estimatedImpact: 60,
      actionSteps: [
        'Document current process pain points',
        'Research best practices in consultant management',
        'Propose specific improvement initiatives',
        'Mentor other team members on efficient processes'
      ],
      resources: ['Process improvement methodology training', 'Innovation workshop'],
      estimatedHours: 8,
      difficulty: 'hard',
      priority: 65
    };
  }
  return null;
}

// =====================================================
// TEAM ANALYTICS
// =====================================================

function calculatePerformanceDistribution(periodStart, periodEnd) {
  const ranges = [
    { min: 90, max: 100, label: 'Excellent' },
    { min: 75, max: 89, label: 'Good' },
    { min: 60, max: 74, label: 'Average' },
    { min: 40, max: 59, label: 'Needs Improvement' },
    { min: 0, max: 39, label: 'Critical' }
  ];

  const distribution = {};

  for (const range of ranges) {
    const count = db.prepare(`
      SELECT COUNT(DISTINCT consultant_id) as count
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
        AND overall_performance_score >= ?
        AND overall_performance_score <= ?
    `).get(periodStart, periodEnd, range.min, range.max);

    distribution[range.label] = count.count;
  }

  return distribution;
}

function getTopPerformers(periodStart, periodEnd) {
  const topEfficiency = db.prepare(`
    SELECT consultant_id FROM consultant_performance_daily
    WHERE date BETWEEN ? AND ?
    GROUP BY consultant_id ORDER BY AVG(efficiency_score) DESC LIMIT 1
  `).get(periodStart, periodEnd);

  const topQuality = db.prepare(`
    SELECT consultant_id FROM consultant_performance_daily
    WHERE date BETWEEN ? AND ?
    GROUP BY consultant_id ORDER BY AVG(quality_score) DESC LIMIT 1
  `).get(periodStart, periodEnd);

  const topGrowth = db.prepare(`
    SELECT consultant_id FROM consultant_performance_daily
    WHERE date BETWEEN ? AND ?
    GROUP BY consultant_id ORDER BY AVG(growth_score) DESC LIMIT 1
  `).get(periodStart, periodEnd);

  const topOverall = db.prepare(`
    SELECT consultant_id FROM consultant_performance_daily
    WHERE date BETWEEN ? AND ?
    GROUP BY consultant_id ORDER BY AVG(overall_performance_score) DESC LIMIT 1
  `).get(periodStart, periodEnd);

  return {
    efficiency: topEfficiency?.consultant_id || null,
    quality: topQuality?.consultant_id || null,
    growth: topGrowth?.consultant_id || null,
    overall: topOverall?.consultant_id || null
  };
}

async function calculateTeamTrends(period, currentStart, currentEnd, calculatePreviousPeriodDates) {
  const { periodStart: prevStart, periodEnd: prevEnd } =
    calculatePreviousPeriodDates(period, currentStart);

  const current = db.prepare(`
    SELECT
      AVG(efficiency_score) as efficiency,
      AVG(quality_score) as quality,
      AVG(growth_score) as growth,
      AVG(overall_performance_score) as overall
    FROM consultant_performance_daily
    WHERE date BETWEEN ? AND ?
  `).get(currentStart, currentEnd);

  const previous = db.prepare(`
    SELECT
      AVG(efficiency_score) as efficiency,
      AVG(quality_score) as quality,
      AVG(growth_score) as growth,
      AVG(overall_performance_score) as overall
    FROM consultant_performance_daily
    WHERE date BETWEEN ? AND ?
  `).get(prevStart, prevEnd);

  return {
    efficiency: previous.efficiency ? current.efficiency - previous.efficiency : 0,
    quality: previous.quality ? current.quality - previous.quality : 0,
    growth: previous.growth ? current.growth - previous.growth : 0,
    overall: previous.overall ? current.overall - previous.overall : 0
  };
}

function generateTeamInsights(teamStats, distribution, trends) {
  const insights = {
    opportunities: [],
    bestPractices: [],
    risks: []
  };

  if (teamStats.avg_efficiency < 75) {
    insights.opportunities.push('Team efficiency is below target - consider process optimization workshops');
  }
  if (teamStats.avg_quality < 80) {
    insights.opportunities.push('Quality scores have room for improvement - implement peer mentoring program');
  }
  if (distribution['Needs Improvement'] > 2) {
    insights.opportunities.push('Multiple consultants need support - create targeted coaching plans');
  }

  if (trends.overall > 5) {
    insights.bestPractices.push('Team performance is trending upward - document and share successful strategies');
  }
  if (distribution.Excellent > 3) {
    insights.bestPractices.push('Multiple high performers - establish knowledge sharing sessions');
  }

  if (trends.overall < -5) {
    insights.risks.push('Declining team performance requires immediate attention');
  }
  if (distribution.Critical > 1) {
    insights.risks.push('Consultants in critical performance range need intensive support');
  }
  if (teamStats.avg_quality < 60) {
    insights.risks.push('Low quality scores may impact client satisfaction');
  }

  return insights;
}

module.exports = {
  calculateIndividualKPIScore,
  calculateRankings,
  generatePerformanceAlerts,
  calculateAlertPriority,
  generateCoachingRecommendations,
  calculatePerformanceDistribution,
  getTopPerformers,
  calculateTeamTrends,
  generateTeamInsights
};
