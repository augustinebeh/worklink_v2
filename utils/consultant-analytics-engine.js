/**
 * CONSULTANT ANALYTICS ENGINE
 * Comprehensive performance analytics and KPI calculation system
 */

const { db } = require('../db');

class ConsultantAnalyticsEngine {
  constructor() {
    this.kpiWeights = {
      efficiency: {
        schedulingSpeed: 0.25,
        conversionRate: 0.30,
        capacityUtilization: 0.20,
        noShowRate: 0.25 // Negative weight
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
      performanceDrop: 15, // Points below average
      qualityIssue: 70, // Below this score
      capacityWarning: 90, // Above this utilization
      achievementUnlock: 85 // Above this score
    };
  }

  // =====================================================
  // DAILY PERFORMANCE CALCULATION
  // =====================================================

  async calculateDailyPerformance(consultantId, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      // Gather raw metrics for the day
      const rawMetrics = await this.gatherDailyMetrics(consultantId, targetDate);

      // Calculate individual KPI scores
      const efficiencyScore = this.calculateEfficiencyScore(rawMetrics);
      const qualityScore = this.calculateQualityScore(rawMetrics);
      const growthScore = this.calculateGrowthScore(rawMetrics);

      // Calculate overall performance score
      const overallScore = (efficiencyScore * 0.4 + qualityScore * 0.4 + growthScore * 0.2);

      // Store daily performance
      const dailyPerformance = {
        consultant_id: consultantId,
        date: targetDate,

        // Raw metrics
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

        // Calculated scores
        efficiency_score: efficiencyScore,
        quality_score: qualityScore,
        growth_score: growthScore,
        overall_performance_score: overallScore,

        workload_factor: rawMetrics.workloadFactor,
        market_conditions_factor: rawMetrics.marketFactor
      };

      // Insert or update daily performance
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

      // Check for alerts
      await this.generatePerformanceAlerts(consultantId, dailyPerformance);

      // Generate coaching recommendations
      await this.generateCoachingRecommendations(consultantId, dailyPerformance);

      return dailyPerformance;

    } catch (error) {
      console.error(`Error calculating daily performance for consultant ${consultantId}:`, error);
      throw error;
    }
  }

  async gatherDailyMetrics(consultantId, date) {
    // This would integrate with existing data sources
    // For now, we'll use mock data based on consultant_performance API patterns

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

    // Calculate derived metrics
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

      satisfactionScore: (satisfactionMetrics.avg_rating || 0) * 20, // Convert 5-star to 100-point
      completionRate: completionRate,
      conversionRate: conversionRate,
      reliabilityScore: Math.max(0, 100 - (noShowRate * 2)), // Inverse of no-show rate
      feedbackQuality: 75, // Default score, would be calculated from actual feedback analysis

      pipelineVelocity: conversionMetrics.conversions || 0,
      skillDevelopment: 70, // Default, would be tracked via training completion
      coachingImplementation: 65, // Default, would be tracked via goal completion
      processImprovements: 0, // Suggestions made
      retentionContribution: 80, // Default, calculated from candidate retention rates

      totalInteractions: (schedulingMetrics.scheduled || 0) + (conversionMetrics.total_candidates || 0),
      hoursWorked: 8, // Default, would come from time tracking
      productivityScore: Math.min(100, (conversionMetrics.conversions || 0) * 10),

      workloadFactor: 1.0,
      marketFactor: 1.0
    };
  }

  calculateEfficiencyScore(metrics) {
    // Normalize and weight efficiency metrics
    const schedulingSpeedScore = Math.max(0, 100 - (metrics.schedulingSpeed / 60)); // Convert hours to score
    const conversionRateScore = Math.min(100, metrics.conversionRate * 2); // Scale up conversion rate
    const capacityScore = Math.min(100, metrics.capacityUtilization);
    const noShowPenalty = metrics.noShowRate * 2; // Penalty for no-shows

    const weightedScore = (
      schedulingSpeedScore * this.kpiWeights.efficiency.schedulingSpeed +
      conversionRateScore * this.kpiWeights.efficiency.conversionRate +
      capacityScore * this.kpiWeights.efficiency.capacityUtilization
    ) - (noShowPenalty * this.kpiWeights.efficiency.noShowRate);

    return Math.max(0, Math.min(100, weightedScore));
  }

  calculateQualityScore(metrics) {
    const satisfactionScore = metrics.satisfactionScore;
    const reliabilityScore = metrics.reliabilityScore;
    const completionScore = metrics.completionRate;
    const feedbackScore = metrics.feedbackQuality;

    const weightedScore = (
      satisfactionScore * this.kpiWeights.quality.satisfactionScore +
      reliabilityScore * this.kpiWeights.quality.reliabilityScore +
      completionScore * this.kpiWeights.quality.completionRate +
      feedbackScore * this.kpiWeights.quality.feedbackQuality
    );

    return Math.max(0, Math.min(100, weightedScore));
  }

  calculateGrowthScore(metrics) {
    const pipelineScore = Math.min(100, metrics.pipelineVelocity * 10);
    const skillScore = metrics.skillDevelopment;
    const processScore = Math.min(100, metrics.processImprovements * 20);
    const mentoringScore = 70; // Default, would be tracked separately
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

    // Get all consultants with performance data in this period
    const consultants = db.prepare(`
      SELECT DISTINCT consultant_id
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
    `).all(periodStart, periodEnd).map(row => row.consultant_id);

    const kpiResults = [];

    for (const consultantId of consultants) {
      const kpiScore = await this.calculateIndividualKPIScore(consultantId, period, periodStart, periodEnd);
      kpiResults.push(kpiScore);
    }

    // Calculate rankings
    await this.calculateRankings(kpiResults, period, periodStart);

    return kpiResults;
  }

  async calculateIndividualKPIScore(consultantId, period, periodStart, periodEnd) {
    // Aggregate performance data for the period
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
      return null; // No data for this consultant in this period
    }

    // Calculate individual KPI scores
    const kpiScores = {
      scheduling_efficiency_score: this.normalizeScore(100 - (aggregatedData.avg_scheduling_speed / 6)), // 6 hours = 0 points
      conversion_rate_score: this.normalizeScore(aggregatedData.avg_conversion_rate * 2),
      reliability_score: this.normalizeScore(aggregatedData.avg_reliability),
      satisfaction_score: this.normalizeScore(aggregatedData.avg_satisfaction),
      innovation_score: this.normalizeScore(aggregatedData.avg_innovation),
      mentoring_score: this.normalizeScore(aggregatedData.avg_mentoring)
    };

    // Calculate weighted composite scores
    const weightedEfficiencyScore = aggregatedData.avg_efficiency;
    const weightedQualityScore = aggregatedData.avg_quality;
    const weightedGrowthScore = aggregatedData.avg_growth;
    const overallKPIScore = aggregatedData.avg_overall;

    // Prepare detailed KPI data
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

      weighted_efficiency_score: weightedEfficiencyScore,
      weighted_quality_score: weightedQualityScore,
      weighted_growth_score: weightedGrowthScore,
      overall_kpi_score: overallKPIScore
    };

    // Store KPI scores
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

  async calculateRankings(kpiResults, period, periodStart) {
    // Sort by different criteria and assign rankings
    const efficiencyRanked = [...kpiResults].sort((a, b) => b.weighted_efficiency_score - a.weighted_efficiency_score);
    const qualityRanked = [...kpiResults].sort((a, b) => b.weighted_quality_score - a.weighted_quality_score);
    const growthRanked = [...kpiResults].sort((a, b) => b.weighted_growth_score - a.weighted_growth_score);
    const overallRanked = [...kpiResults].sort((a, b) => b.overall_kpi_score - a.overall_kpi_score);

    const teamAverage = overallRanked.reduce((sum, kpi) => sum + kpi.overall_kpi_score, 0) / overallRanked.length;

    // Update rankings in database
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

  async generatePerformanceAlerts(consultantId, performanceData) {
    const alerts = [];

    // Performance drop alert
    const previousPerformance = db.prepare(`
      SELECT AVG(overall_performance_score) as avg_score
      FROM consultant_performance_daily
      WHERE consultant_id = ? AND date > DATE(?, '-7 days') AND date < ?
    `).get(consultantId, performanceData.date, performanceData.date);

    if (previousPerformance && previousPerformance.avg_score) {
      const performanceDrop = previousPerformance.avg_score - performanceData.overall_performance_score;
      if (performanceDrop > this.alertThresholds.performanceDrop) {
        alerts.push({
          type: 'performance_drop',
          severity: performanceDrop > 25 ? 'high' : 'medium',
          title: 'Performance Drop Detected',
          description: `Performance has dropped by ${Math.round(performanceDrop)} points compared to recent average`,
          triggerMetric: 'overall_performance_score',
          triggerValue: performanceData.overall_performance_score,
          thresholdValue: previousPerformance.avg_score - this.alertThresholds.performanceDrop
        });
      }
    }

    // Quality issue alert
    if (performanceData.quality_score < this.alertThresholds.qualityIssue) {
      alerts.push({
        type: 'quality_issue',
        severity: performanceData.quality_score < 50 ? 'high' : 'medium',
        title: 'Quality Score Below Threshold',
        description: `Quality score of ${Math.round(performanceData.quality_score)} is below acceptable threshold`,
        triggerMetric: 'quality_score',
        triggerValue: performanceData.quality_score,
        thresholdValue: this.alertThresholds.qualityIssue
      });
    }

    // Capacity warning
    if (performanceData.capacity_utilization_percent > this.alertThresholds.capacityWarning) {
      alerts.push({
        type: 'capacity_warning',
        severity: performanceData.capacity_utilization_percent > 95 ? 'critical' : 'medium',
        title: 'High Capacity Utilization',
        description: `Capacity utilization of ${Math.round(performanceData.capacity_utilization_percent)}% may lead to burnout`,
        triggerMetric: 'capacity_utilization_percent',
        triggerValue: performanceData.capacity_utilization_percent,
        thresholdValue: this.alertThresholds.capacityWarning
      });
    }

    // Achievement unlock alert
    if (performanceData.overall_performance_score > this.alertThresholds.achievementUnlock) {
      alerts.push({
        type: 'achievement',
        severity: 'low',
        title: 'High Performance Achievement',
        description: `Excellent performance score of ${Math.round(performanceData.overall_performance_score)}!`,
        triggerMetric: 'overall_performance_score',
        triggerValue: performanceData.overall_performance_score,
        thresholdValue: this.alertThresholds.achievementUnlock
      });
    }

    // Store alerts
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
        this.calculateAlertPriority(alert)
      );
    }

    return alerts;
  }

  calculateAlertPriority(alert) {
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

  async generateCoachingRecommendations(consultantId, performanceData) {
    const recommendations = [];

    // Efficiency improvement recommendations
    if (performanceData.efficiency_score < 70) {
      const efficiencyRec = this.createEfficiencyRecommendation(consultantId, performanceData);
      if (efficiencyRec) recommendations.push(efficiencyRec);
    }

    // Quality improvement recommendations
    if (performanceData.quality_score < 75) {
      const qualityRec = this.createQualityRecommendation(consultantId, performanceData);
      if (qualityRec) recommendations.push(qualityRec);
    }

    // Growth opportunity recommendations
    if (performanceData.growth_score < 65) {
      const growthRec = this.createGrowthRecommendation(consultantId, performanceData);
      if (growthRec) recommendations.push(growthRec);
    }

    // Store recommendations
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

  createEfficiencyRecommendation(consultantId, performanceData) {
    if (performanceData.scheduling_speed_minutes > 120) { // More than 2 hours to schedule
      return {
        type: 'efficiency_boost',
        category: 'scheduling',
        title: 'Improve Scheduling Speed',
        description: 'Current scheduling time is above optimal range',
        guidance: `Focus on streamlining your scheduling process. Current average of ${Math.round(performanceData.scheduling_speed_minutes)} minutes can be reduced through better preparation and process optimization.`,
        targetKPI: 'scheduling_speed',
        currentPerformance: performanceData.scheduling_speed_minutes,
        targetPerformance: 60, // Target 1 hour
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

  createQualityRecommendation(consultantId, performanceData) {
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

  createGrowthRecommendation(consultantId, performanceData) {
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
  // TEAM ANALYTICS AND COMPARISON
  // =====================================================

  async calculateTeamAnalytics(period = 'weekly', date = null) {
    const { periodStart, periodEnd } = this.calculatePeriodDates(period, date);
    const calculationDate = date || new Date().toISOString().split('T')[0];

    // Get team performance statistics
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

    // Calculate performance distribution
    const distribution = this.calculatePerformanceDistribution(periodStart, periodEnd);

    // Get KPI averages for the team
    const kpiAverages = {
      efficiency: teamStats.avg_efficiency,
      quality: teamStats.avg_quality,
      growth: teamStats.avg_growth,
      overall: teamStats.avg_overall
    };

    // Get KPI ranges
    const kpiRanges = {
      overall: { min: teamStats.min_score, max: teamStats.max_score }
    };

    // Find top performers
    const topPerformers = this.getTopPerformers(periodStart, periodEnd);

    // Calculate trends (compare with previous period)
    const trends = await this.calculateTeamTrends(period, periodStart, periodEnd);

    // Generate team insights
    const insights = this.generateTeamInsights(teamStats, distribution, trends);

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

    // Store team analytics
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

  calculatePerformanceDistribution(periodStart, periodEnd) {
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

  getTopPerformers(periodStart, periodEnd) {
    const topEfficiency = db.prepare(`
      SELECT consultant_id
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
      GROUP BY consultant_id
      ORDER BY AVG(efficiency_score) DESC
      LIMIT 1
    `).get(periodStart, periodEnd);

    const topQuality = db.prepare(`
      SELECT consultant_id
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
      GROUP BY consultant_id
      ORDER BY AVG(quality_score) DESC
      LIMIT 1
    `).get(periodStart, periodEnd);

    const topGrowth = db.prepare(`
      SELECT consultant_id
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
      GROUP BY consultant_id
      ORDER BY AVG(growth_score) DESC
      LIMIT 1
    `).get(periodStart, periodEnd);

    const topOverall = db.prepare(`
      SELECT consultant_id
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
      GROUP BY consultant_id
      ORDER BY AVG(overall_performance_score) DESC
      LIMIT 1
    `).get(periodStart, periodEnd);

    return {
      efficiency: topEfficiency?.consultant_id || null,
      quality: topQuality?.consultant_id || null,
      growth: topGrowth?.consultant_id || null,
      overall: topOverall?.consultant_id || null
    };
  }

  async calculateTeamTrends(period, currentStart, currentEnd) {
    // Calculate previous period dates
    const { periodStart: prevStart, periodEnd: prevEnd } =
      this.calculatePreviousPeriodDates(period, currentStart);

    // Get current period averages
    const current = db.prepare(`
      SELECT
        AVG(efficiency_score) as efficiency,
        AVG(quality_score) as quality,
        AVG(growth_score) as growth,
        AVG(overall_performance_score) as overall
      FROM consultant_performance_daily
      WHERE date BETWEEN ? AND ?
    `).get(currentStart, currentEnd);

    // Get previous period averages
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

  generateTeamInsights(teamStats, distribution, trends) {
    const insights = {
      opportunities: [],
      bestPractices: [],
      risks: []
    };

    // Opportunities
    if (teamStats.avg_efficiency < 75) {
      insights.opportunities.push('Team efficiency is below target - consider process optimization workshops');
    }
    if (teamStats.avg_quality < 80) {
      insights.opportunities.push('Quality scores have room for improvement - implement peer mentoring program');
    }
    if (distribution['Needs Improvement'] > 2) {
      insights.opportunities.push('Multiple consultants need support - create targeted coaching plans');
    }

    // Best practices
    if (trends.overall > 5) {
      insights.bestPractices.push('Team performance is trending upward - document and share successful strategies');
    }
    if (distribution.Excellent > 3) {
      insights.bestPractices.push('Multiple high performers - establish knowledge sharing sessions');
    }

    // Risks
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
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
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
        prevEnd.setDate(0); // Last day of previous month
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

    // Get all consultants or specified ones
    const consultants = consultantIds || db.prepare(`
      SELECT DISTINCT candidate_id as consultant_id
      FROM deployments
      WHERE DATE(created_at) = ?
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

    return {
      kpiResults: results,
      teamAnalytics,
      calculatedAt: new Date().toISOString()
    };
  }

  async getConsultantDashboard(consultantId, period = 'weekly') {
    const { periodStart, periodEnd } = this.calculatePeriodDates(period);

    // Get performance data
    const performanceData = db.prepare(`
      SELECT * FROM consultant_performance_daily
      WHERE consultant_id = ? AND date BETWEEN ? AND ?
      ORDER BY date DESC
    `).all(consultantId, periodStart, periodEnd);

    // Get KPI scores
    const kpiData = db.prepare(`
      SELECT * FROM consultant_kpi_scores
      WHERE consultant_id = ? AND calculation_period = ?
      ORDER BY period_start DESC
      LIMIT 1
    `).get(consultantId, period);

    // Get active alerts
    const alerts = db.prepare(`
      SELECT * FROM consultant_alerts
      WHERE consultant_id = ? AND status = 'active'
      ORDER BY priority_score DESC, created_at DESC
    `).all(consultantId);

    // Get coaching recommendations
    const recommendations = db.prepare(`
      SELECT * FROM coaching_recommendations
      WHERE consultant_id = ? AND status IN ('pending', 'in_progress')
      ORDER BY priority DESC, created_at DESC
    `).all(consultantId);

    // Get achievements
    const achievements = db.prepare(`
      SELECT * FROM consultant_achievements
      WHERE consultant_id = ?
      ORDER BY earned_at DESC
      LIMIT 10
    `).all(consultantId);

    return {
      consultantId,
      period: { type: period, start: periodStart, end: periodEnd },
      performanceData,
      kpiData,
      alerts,
      recommendations,
      achievements,
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
      SELECT
        consultant_id,
        weighted_efficiency_score,
        weighted_quality_score,
        weighted_growth_score,
        overall_kpi_score,
        efficiency_rank,
        quality_rank,
        growth_rank,
        overall_rank,
        percentile_rank
      FROM consultant_kpi_scores
      WHERE calculation_period = ? AND period_start = ?
      ORDER BY ${orderBy} DESC
    `).all(period, periodStart);

    // Get team analytics for context
    const teamAnalytics = db.prepare(`
      SELECT * FROM consultant_team_analytics
      WHERE period_type = ? AND period_start = ?
      ORDER BY calculation_date DESC
      LIMIT 1
    `).get(period, periodStart);

    return {
      period: { type: period, start: periodStart, end: periodEnd },
      metric,
      leaderboard,
      teamAnalytics: teamAnalytics ? JSON.parse(teamAnalytics.kpi_averages) : null,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = { ConsultantAnalyticsEngine };