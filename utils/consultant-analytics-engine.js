/**
 * CONSULTANT ANALYTICS ENGINE
 * Comprehensive performance analytics and KPI calculation system
 */


const { createLogger } = require('./structured-logger');
const logger = createLogger('consultant-analytics-engine');

const { db } = require('../db');

const metricsCalc = require('./consultant-analytics/metrics-calculator');

class ConsultantAnalyticsEngine {
  constructor() {
    this.kpiWeights = {
      efficiency: {
        schedulingSpeed: 0.25,
        conversionRate: 0.30,
        capacityUtilization: 0.20,
        noShowRate: 0.25
      },
      quality: {
        satisfactionScore: 0.30,
        reliabilityScore: 0.25,
        completionRate: 0.25,
        feedbackQuality: 0.20
      },
      growth: {
        pipelineVelocity: 0.25,
        skillDevelopment: 0.20,
        processImprovement: 0.20,
        mentoring: 0.15,
        innovation: 0.20
      }
    };

    this.performanceThresholds = {
      excellent: 90,
      good: 75,
      average: 60,
      needsImprovement: 40,
      critical: 25
    };

    this.alertThresholds = {
      performanceDrop: 15,
      qualityIssue: 70,
      capacityWarning: 90,
      achievementUnlock: 85
    };
  }

  // =====================================================
  // DAILY PERFORMANCE CALCULATION
  // =====================================================

  async calculateDailyPerformance(consultantId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const rawMetrics = await this.gatherDailyMetrics(consultantId, targetDate);

      const efficiencyScore = this.calculateEfficiencyScore(rawMetrics);
      const qualityScore = this.calculateQualityScore(rawMetrics);
      const growthScore = this.calculateGrowthScore(rawMetrics);
      const overallScore = (efficiencyScore * 0.4 + qualityScore * 0.4 + growthScore * 0.2);

      const dailyPerformance = {
        consultant_id: consultantId,
        date: targetDate,
        candidates_scheduled: rawMetrics.candidatesScheduled,
        candidates_converted: rawMetrics.candidatesConverted,
        interviews_conducted: rawMetrics.interviewsConducted,
        no_show_rate: rawMetrics.noShowRate,
        scheduling_speed_minutes: rawMetrics.schedulingSpeed,
        capacity_utilization_percent: rawMetrics.capacityUtilization,
        candidate_satisfaction_score: rawMetrics.satisfactionScore,
        interview_completion_rate: rawMetrics.completionRate,
        conversion_to_hire_rate: rawMetrics.conversionRate,
        reliability_score: rawMetrics.reliabilityScore,
        feedback_quality_score: rawMetrics.feedbackQuality,
        pipeline_velocity: rawMetrics.pipelineVelocity,
        skill_development_score: rawMetrics.skillDevelopment,
        coaching_implementation_score: rawMetrics.coachingImplementation,
        process_improvement_suggestions: rawMetrics.processImprovements,
        retention_contribution_score: rawMetrics.retentionContribution,
        total_interactions: rawMetrics.totalInteractions,
        total_hours_worked: rawMetrics.hoursWorked,
        productivity_score: rawMetrics.productivityScore,
        efficiency_score: efficiencyScore,
        quality_score: qualityScore,
        growth_score: growthScore,
        overall_performance_score: overallScore,
        workload_factor: rawMetrics.workloadFactor,
        market_conditions_factor: rawMetrics.marketFactor
      };

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO consultant_performance_daily
        (consultant_id, date, candidates_scheduled, candidates_converted, interviews_conducted,
         no_show_rate, scheduling_speed_minutes, capacity_utilization_percent,
         candidate_satisfaction_score, interview_completion_rate, conversion_to_hire_rate,
         reliability_score, feedback_quality_score, pipeline_velocity, skill_development_score,
         coaching_implementation_score, process_improvement_suggestions, retention_contribution_score,
         total_interactions, total_hours_worked, productivity_score,
         efficiency_score, quality_score, growth_score, overall_performance_score,
         workload_factor, market_conditions_factor)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        dailyPerformance.consultant_id, dailyPerformance.date,
        dailyPerformance.candidates_scheduled, dailyPerformance.candidates_converted,
        dailyPerformance.interviews_conducted, dailyPerformance.no_show_rate,
        dailyPerformance.scheduling_speed_minutes, dailyPerformance.capacity_utilization_percent,
        dailyPerformance.candidate_satisfaction_score, dailyPerformance.interview_completion_rate,
        dailyPerformance.conversion_to_hire_rate, dailyPerformance.reliability_score,
        dailyPerformance.feedback_quality_score, dailyPerformance.pipeline_velocity,
        dailyPerformance.skill_development_score, dailyPerformance.coaching_implementation_score,
        dailyPerformance.process_improvement_suggestions, dailyPerformance.retention_contribution_score,
        dailyPerformance.total_interactions, dailyPerformance.total_hours_worked,
        dailyPerformance.productivity_score, dailyPerformance.efficiency_score,
        dailyPerformance.quality_score, dailyPerformance.growth_score,
        dailyPerformance.overall_performance_score, dailyPerformance.workload_factor,
        dailyPerformance.market_conditions_factor
      );

      await metricsCalc.generatePerformanceAlerts(consultantId, dailyPerformance, this.alertThresholds);
      await metricsCalc.generateCoachingRecommendations(consultantId, dailyPerformance);

      return dailyPerformance;

    } catch (error) {
      logger.error('Error calculating daily performance for consultant ${consultantId}:', { error: error });
      throw error;
    }
  }

  async gatherDailyMetrics(consultantId, date) {
    const schedulingMetrics = db.prepare(`
      SELECT
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
        AVG(CASE WHEN scheduled_date IS NOT NULL
            THEN (julianday(scheduled_date) - julianday(created_at)) * 1440 END) as avg_scheduling_time
      FROM interview_slots
      WHERE DATE(created_at) = ? AND consultant_id = ?
    `).get(date, consultantId) || {};

    const conversionMetrics = db.prepare(`
      SELECT
        COUNT(CASE WHEN conversion_stage = 'active' THEN 1 END) as conversions,
        COUNT(*) as total_candidates
      FROM lead_conversion_log
      WHERE DATE(created_at) = ? AND consultant_id = ?
    `).get(date, consultantId) || {};

    const capacityMetrics = db.prepare(`
      SELECT AVG(daily_utilization) as utilization
      FROM capacity_logs
      WHERE DATE(created_at) = ? AND consultant_id = ?
    `).get(date, consultantId) || {};

    const satisfactionMetrics = db.prepare(`
      SELECT AVG(rating) as avg_rating
      FROM deployments
      WHERE DATE(created_at) = ? AND candidate_id = ?
    `).get(date, consultantId) || {};

    const noShowRate = schedulingMetrics.scheduled > 0 ?
      (schedulingMetrics.no_shows / schedulingMetrics.scheduled) * 100 : 0;
    const conversionRate = conversionMetrics.total_candidates > 0 ?
      (conversionMetrics.conversions / conversionMetrics.total_candidates) * 100 : 0;
    const completionRate = schedulingMetrics.scheduled > 0 ?
      (schedulingMetrics.completed / schedulingMetrics.scheduled) * 100 : 0;

    return {
      candidatesScheduled: schedulingMetrics.scheduled || 0,
      candidatesConverted: conversionMetrics.conversions || 0,
      interviewsConducted: schedulingMetrics.completed || 0,
      noShowRate: noShowRate,
      schedulingSpeed: schedulingMetrics.avg_scheduling_time || 0,
      capacityUtilization: capacityMetrics.utilization || 0,
      satisfactionScore: (satisfactionMetrics.avg_rating || 0) * 20,
      completionRate: completionRate,
      conversionRate: conversionRate,
      reliabilityScore: Math.max(0, 100 - (noShowRate * 2)),
      feedbackQuality: 75,
      pipelineVelocity: conversionMetrics.conversions || 0,
      skillDevelopment: 70,
      coachingImplementation: 65,
      processImprovements: 0,
      retentionContribution: 80,
      totalInteractions: (schedulingMetrics.scheduled || 0) + (conversionMetrics.total_candidates || 0),
      hoursWorked: 8,
      productivityScore: Math.min(100, (conversionMetrics.conversions || 0) * 10),
      workloadFactor: 1.0,
      marketFactor: 1.0
    };
  }

  calculateEfficiencyScore(metrics) {
    const schedulingSpeedScore = Math.max(0, 100 - (metrics.schedulingSpeed / 60));
    const conversionRateScore = Math.min(100, metrics.conversionRate * 2);
    const capacityScore = Math.min(100, metrics.capacityUtilization);
    const noShowPenalty = metrics.noShowRate * 2;

    const weightedScore = (
      schedulingSpeedScore * this.kpiWeights.efficiency.schedulingSpeed +
      conversionRateScore * this.kpiWeights.efficiency.conversionRate +
      capacityScore * this.kpiWeights.efficiency.capacityUtilization
    ) - (noShowPenalty * this.kpiWeights.efficiency.noShowRate);

    return Math.max(0, Math.min(100, weightedScore));
  }

  calculateQualityScore(metrics) {
    const weightedScore = (
      metrics.satisfactionScore * this.kpiWeights.quality.satisfactionScore +
      metrics.reliabilityScore * this.kpiWeights.quality.reliabilityScore +
      metrics.completionRate * this.kpiWeights.quality.completionRate +
      metrics.feedbackQuality * this.kpiWeights.quality.feedbackQuality
    );
    return Math.max(0, Math.min(100, weightedScore));
  }

  calculateGrowthScore(metrics) {
    const pipelineScore = Math.min(100, metrics.pipelineVelocity * 10);
    const skillScore = metrics.skillDevelopment;
    const processScore = Math.min(100, metrics.processImprovements * 20);
    const mentoringScore = 70;
    const innovationScore = Math.min(100, metrics.processImprovements * 15);

    const weightedScore = (
      pipelineScore * this.kpiWeights.growth.pipelineVelocity +
      skillScore * this.kpiWeights.growth.skillDevelopment +
      processScore * this.kpiWeights.growth.processImprovement +
      mentoringScore * this.kpiWeights.growth.mentoring +
      innovationScore * this.kpiWeights.growth.innovation
    );
    return Math.max(0, Math.min(100, weightedScore));
  }

  // =====================================================
  // KPI SCORING AND RANKING
  // =====================================================

  async calculateKPIScores(period = 'weekly', startDate = null) {
    const { periodStart, periodEnd } = this.calculatePeriodDates(period, startDate);

    const consultants = db.prepare(`
      SELECT DISTINCT consultant_id
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
    `).all(periodStart, periodEnd).map(row => row.consultant_id);

    const kpiResults = [];

    for (const consultantId of consultants) {
      const kpiScore = await metricsCalc.calculateIndividualKPIScore(
        consultantId, period, periodStart, periodEnd, this.normalizeScore
      );
      if (kpiScore) kpiResults.push(kpiScore);
    }

    await metricsCalc.calculateRankings(kpiResults, period, periodStart);

    return kpiResults;
  }

  // =====================================================
  // TEAM ANALYTICS AND COMPARISON
  // =====================================================

  async calculateTeamAnalytics(period = 'weekly', date = null) {
    const { periodStart, periodEnd } = this.calculatePeriodDates(period, date);
    const calculationDate = date || new Date().toISOString().split('T')[0];

    const teamStats = db.prepare(`
      SELECT
        COUNT(DISTINCT consultant_id) as total_consultants,
        COUNT(DISTINCT CASE WHEN overall_performance_score > 0 THEN consultant_id END) as active_consultants,
        AVG(efficiency_score) as avg_efficiency,
        AVG(quality_score) as avg_quality,
        AVG(growth_score) as avg_growth,
        AVG(overall_performance_score) as avg_overall,
        MIN(overall_performance_score) as min_score,
        MAX(overall_performance_score) as max_score
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
    `).get(periodStart, periodEnd);

    const distribution = metricsCalc.calculatePerformanceDistribution(periodStart, periodEnd);
    const kpiAverages = {
      efficiency: teamStats.avg_efficiency,
      quality: teamStats.avg_quality,
      growth: teamStats.avg_growth,
      overall: teamStats.avg_overall
    };
    const kpiRanges = { overall: { min: teamStats.min_score, max: teamStats.max_score } };
    const topPerformers = metricsCalc.getTopPerformers(periodStart, periodEnd);
    const trends = await metricsCalc.calculateTeamTrends(period, periodStart, periodEnd, this.calculatePreviousPeriodDates.bind(this));
    const insights = metricsCalc.generateTeamInsights(teamStats, distribution, trends);

    const teamAnalytics = {
      calculation_date: calculationDate,
      period_type: period,
      period_start: periodStart,
      period_end: periodEnd,
      total_consultants: teamStats.total_consultants,
      active_consultants: teamStats.active_consultants,
      performance_distribution: JSON.stringify(distribution),
      kpi_averages: JSON.stringify(kpiAverages),
      kpi_ranges: JSON.stringify(kpiRanges),
      top_efficiency_consultant_id: topPerformers.efficiency,
      top_quality_consultant_id: topPerformers.quality,
      top_growth_consultant_id: topPerformers.growth,
      top_overall_consultant_id: topPerformers.overall,
      team_efficiency_trend: trends.efficiency,
      team_quality_trend: trends.quality,
      team_growth_trend: trends.growth,
      overall_team_trend: trends.overall,
      improvement_opportunities: JSON.stringify(insights.opportunities),
      best_practices: JSON.stringify(insights.bestPractices),
      risk_areas: JSON.stringify(insights.risks)
    };

    db.prepare(`
      INSERT OR REPLACE INTO consultant_team_analytics
      (calculation_date, period_type, period_start, period_end,
       total_consultants, active_consultants, performance_distribution,
       kpi_averages, kpi_ranges, top_efficiency_consultant_id,
       top_quality_consultant_id, top_growth_consultant_id,
       top_overall_consultant_id, team_efficiency_trend,
       team_quality_trend, team_growth_trend, overall_team_trend,
       improvement_opportunities, best_practices, risk_areas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      teamAnalytics.calculation_date, teamAnalytics.period_type,
      teamAnalytics.period_start, teamAnalytics.period_end,
      teamAnalytics.total_consultants, teamAnalytics.active_consultants,
      teamAnalytics.performance_distribution, teamAnalytics.kpi_averages,
      teamAnalytics.kpi_ranges, teamAnalytics.top_efficiency_consultant_id,
      teamAnalytics.top_quality_consultant_id, teamAnalytics.top_growth_consultant_id,
      teamAnalytics.top_overall_consultant_id, teamAnalytics.team_efficiency_trend,
      teamAnalytics.team_quality_trend, teamAnalytics.team_growth_trend,
      teamAnalytics.overall_team_trend, teamAnalytics.improvement_opportunities,
      teamAnalytics.best_practices, teamAnalytics.risk_areas
    );

    return teamAnalytics;
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  calculatePeriodDates(period, startDate = null) {
    const today = startDate ? new Date(startDate) : new Date();
    let periodStart, periodEnd;

    switch (period) {
      case 'daily':
        periodStart = periodEnd = today.toISOString().split('T')[0];
        break;
      case 'weekly':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        periodStart = weekStart.toISOString().split('T')[0];
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        periodEnd = weekEnd.toISOString().split('T')[0];
        break;
      case 'monthly':
        periodStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'quarterly':
        const quarter = Math.floor(today.getMonth() / 3);
        periodStart = new Date(today.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
        periodEnd = new Date(today.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0];
        break;
      default:
        periodStart = periodEnd = today.toISOString().split('T')[0];
    }

    return { periodStart, periodEnd };
  }

  calculatePreviousPeriodDates(period, currentStart) {
    const current = new Date(currentStart);
    let prevStart, prevEnd;

    switch (period) {
      case 'weekly':
        prevStart = new Date(current);
        prevStart.setDate(current.getDate() - 7);
        prevEnd = new Date(current);
        prevEnd.setDate(current.getDate() - 1);
        break;
      case 'monthly':
        prevStart = new Date(current.getFullYear(), current.getMonth() - 1, 1);
        prevEnd = new Date(current.getFullYear(), current.getMonth(), 0);
        break;
      case 'quarterly':
        prevStart = new Date(current.getFullYear(), current.getMonth() - 3, 1);
        prevEnd = new Date(current);
        prevEnd.setDate(0);
        break;
      default:
        prevStart = new Date(current);
        prevStart.setDate(current.getDate() - 1);
        prevEnd = prevStart;
    }

    return {
      periodStart: prevStart.toISOString().split('T')[0],
      periodEnd: prevEnd.toISOString().split('T')[0]
    };
  }

  normalizeScore(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  // =====================================================
  // PUBLIC API METHODS
  // =====================================================

  async runDailyAnalytics(consultantIds = null) {
    const today = new Date().toISOString().split('T')[0];
    const consultants = consultantIds || db.prepare(`
      SELECT DISTINCT candidate_id as consultant_id
      FROM deployments WHERE DATE(created_at) = ?
    `).all(today).map(row => row.consultant_id);

    const results = [];
    for (const consultantId of consultants) {
      try {
        const dailyPerformance = await this.calculateDailyPerformance(consultantId, today);
        results.push({ consultantId, success: true, data: dailyPerformance });
      } catch (error) {
        results.push({ consultantId, success: false, error: error.message });
      }
    }

    return {
      date: today,
      processedConsultants: consultants.length,
      successCount: results.filter(r => r.success).length,
      results
    };
  }

  async runWeeklyKPICalculation() {
    const results = await this.calculateKPIScores('weekly');
    const teamAnalytics = await this.calculateTeamAnalytics('weekly');
    return { kpiResults: results, teamAnalytics, calculatedAt: new Date().toISOString() };
  }

  async getConsultantDashboard(consultantId, period = 'weekly') {
    const { periodStart, periodEnd } = this.calculatePeriodDates(period);

    const performanceData = db.prepare(`
      SELECT * FROM consultant_performance_daily
      WHERE consultant_id = ? AND date BETWEEN ? AND ?
      ORDER BY date DESC
    `).all(consultantId, periodStart, periodEnd);

    const kpiData = db.prepare(`
      SELECT * FROM consultant_kpi_scores
      WHERE consultant_id = ? AND calculation_period = ?
      ORDER BY period_start DESC LIMIT 1
    `).get(consultantId, period);

    const alerts = db.prepare(`
      SELECT * FROM consultant_alerts
      WHERE consultant_id = ? AND status = 'active'
      ORDER BY priority_score DESC, created_at DESC
    `).all(consultantId);

    const recommendations = db.prepare(`
      SELECT * FROM coaching_recommendations
      WHERE consultant_id = ? AND status IN ('pending', 'in_progress')
      ORDER BY priority DESC, created_at DESC
    `).all(consultantId);

    const achievements = db.prepare(`
      SELECT * FROM consultant_achievements
      WHERE consultant_id = ?
      ORDER BY earned_at DESC LIMIT 10
    `).all(consultantId);

    return {
      consultantId,
      period: { type: period, start: periodStart, end: periodEnd },
      performanceData, kpiData, alerts, recommendations, achievements,
      generatedAt: new Date().toISOString()
    };
  }

  async getTeamLeaderboard(period = 'weekly', metric = 'overall') {
    const { periodStart, periodEnd } = this.calculatePeriodDates(period);

    const orderBy = metric === 'efficiency' ? 'weighted_efficiency_score' :
                   metric === 'quality' ? 'weighted_quality_score' :
                   metric === 'growth' ? 'weighted_growth_score' :
                   'overall_kpi_score';

    const leaderboard = db.prepare(`
      SELECT consultant_id, weighted_efficiency_score, weighted_quality_score,
        weighted_growth_score, overall_kpi_score, efficiency_rank,
        quality_rank, growth_rank, overall_rank, percentile_rank
      FROM consultant_kpi_scores
      WHERE calculation_period = ? AND period_start = ?
      ORDER BY ${orderBy} DESC
    `).all(period, periodStart);

    const teamAnalytics = db.prepare(`
      SELECT * FROM consultant_team_analytics
      WHERE period_type = ? AND period_start = ?
      ORDER BY calculation_date DESC LIMIT 1
    `).get(period, periodStart);

    return {
      period: { type: period, start: periodStart, end: periodEnd },
      metric, leaderboard,
      teamAnalytics: teamAnalytics ? JSON.parse(teamAnalytics.kpi_averages) : null,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = { ConsultantAnalyticsEngine };
