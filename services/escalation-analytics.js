/**
 * Escalation Analytics and Reporting Service
 *
 * Provides comprehensive analytics, performance metrics, and insights
 * for the admin escalation and handoff system.
 */

const { db } = require('../db/database');
const { createLogger } = require('../utils/structured-logger');

const logger = createLogger('escalation-analytics');

/**
 * Generate comprehensive escalation analytics report
 * @param {object} filters - Date range and filter options
 * @returns {object} Analytics report
 */
function generateAnalyticsReport(filters = {}) {
  const {
    dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dateTo = new Date(),
    adminId,
    priority,
    includeDetailed = false
  } = filters;

  const dateFromStr = dateFrom.toISOString();
  const dateToStr = dateTo.toISOString();

  // Overall Performance Metrics
  const overallMetrics = db.prepare(`
    SELECT
      COUNT(*) as total_escalations,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_count,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
      COUNT(CASE WHEN sla_breach = 1 THEN 1 END) as sla_breaches,

      -- Response Times
      AVG(CASE
        WHEN first_response_at IS NOT NULL AND assigned_at IS NOT NULL
        THEN ROUND((julianday(first_response_at) - julianday(assigned_at)) * 24 * 60, 2)
      END) as avg_first_response_time_minutes,

      -- Resolution Times
      AVG(CASE
        WHEN resolved_at IS NOT NULL AND assigned_at IS NOT NULL
        THEN ROUND((julianday(resolved_at) - julianday(assigned_at)) * 24 * 60, 2)
      END) as avg_resolution_time_minutes,

      -- Total handling time (from creation to resolution)
      AVG(CASE
        WHEN resolved_at IS NOT NULL
        THEN ROUND((julianday(resolved_at) - julianday(created_at)) * 24 * 60, 2)
      END) as avg_total_handling_time_minutes,

      -- Satisfaction
      AVG(CAST(user_satisfaction_score as REAL)) as avg_satisfaction,
      COUNT(CASE WHEN user_satisfaction_score IS NOT NULL THEN 1 END) as feedback_count
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    ${adminId ? 'AND assigned_admin = ?' : ''}
    ${priority ? 'AND priority = ?' : ''}
  `).get(
    dateFromStr,
    dateToStr,
    ...(adminId ? [adminId] : []),
    ...(priority ? [priority] : [])
  );

  // Calculate derived metrics
  const resolutionRate = overallMetrics.total_escalations > 0
    ? (overallMetrics.resolved_count / overallMetrics.total_escalations) * 100
    : 0;

  const slaComplianceRate = overallMetrics.total_escalations > 0
    ? ((overallMetrics.total_escalations - overallMetrics.sla_breaches) / overallMetrics.total_escalations) * 100
    : 100;

  // Priority Distribution
  const priorityDistribution = db.prepare(`
    SELECT
      priority,
      COUNT(*) as count,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved,
      AVG(CASE
        WHEN resolved_at IS NOT NULL
        THEN ROUND((julianday(resolved_at) - julianday(created_at)) * 24 * 60, 2)
      END) as avg_handling_time,
      COUNT(CASE WHEN sla_breach = 1 THEN 1 END) as sla_breaches
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    ${adminId ? 'AND assigned_admin = ?' : ''}
    GROUP BY priority
    ORDER BY
      CASE priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'URGENT' THEN 2
        WHEN 'HIGH' THEN 3
        WHEN 'NORMAL' THEN 4
        WHEN 'LOW' THEN 5
      END
  `).all(
    dateFromStr,
    dateToStr,
    ...(adminId ? [adminId] : [])
  );

  // Trigger Type Analysis
  const triggerAnalysis = db.prepare(`
    SELECT
      trigger_type,
      COUNT(*) as count,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved,
      AVG(CASE
        WHEN resolved_at IS NOT NULL
        THEN ROUND((julianday(resolved_at) - julianday(created_at)) * 24 * 60, 2)
      END) as avg_handling_time,
      AVG(CAST(user_satisfaction_score as REAL)) as avg_satisfaction
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    ${adminId ? 'AND assigned_admin = ?' : ''}
    GROUP BY trigger_type
    ORDER BY count DESC
  `).all(
    dateFromStr,
    dateToStr,
    ...(adminId ? [adminId] : [])
  );

  // Admin Performance (if not filtered by specific admin)
  const adminPerformance = !adminId ? db.prepare(`
    SELECT
      aw.admin_id,
      aw.total_escalations_handled,
      aw.avg_resolution_time,
      aw.satisfaction_rating,
      aw.active_escalations,
      aw.availability_status,

      -- Current period stats
      COUNT(eq.id) as period_escalations,
      COUNT(CASE WHEN eq.status IN ('resolved', 'closed') THEN 1 END) as period_resolved,
      AVG(CASE
        WHEN eq.resolved_at IS NOT NULL AND eq.assigned_at IS NOT NULL
        THEN ROUND((julianday(eq.resolved_at) - julianday(eq.assigned_at)) * 24 * 60, 2)
      END) as period_avg_resolution,
      COUNT(CASE WHEN eq.sla_breach = 1 THEN 1 END) as period_sla_breaches

    FROM admin_workload aw
    LEFT JOIN escalation_queue eq ON aw.admin_id = eq.assigned_admin
      AND eq.created_at BETWEEN ? AND ?
    GROUP BY aw.admin_id
    ORDER BY period_escalations DESC
  `).all(dateFromStr, dateToStr) : [];

  // Daily Trend
  const dailyTrend = db.prepare(`
    SELECT
      DATE(created_at) as date,
      COUNT(*) as escalations_created,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as escalations_resolved,
      COUNT(CASE WHEN sla_breach = 1 THEN 1 END) as sla_breaches,
      AVG(CAST(user_satisfaction_score as REAL)) as avg_satisfaction
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    ${adminId ? 'AND assigned_admin = ?' : ''}
    GROUP BY DATE(created_at)
    ORDER BY date
  `).all(
    dateFromStr,
    dateToStr,
    ...(adminId ? [adminId] : [])
  );

  // Hourly Pattern Analysis
  const hourlyPattern = db.prepare(`
    SELECT
      CAST(strftime('%H', created_at) as INTEGER) as hour,
      COUNT(*) as escalations,
      AVG(CASE
        WHEN resolved_at IS NOT NULL
        THEN ROUND((julianday(resolved_at) - julianday(created_at)) * 24 * 60, 2)
      END) as avg_handling_time
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    ${adminId ? 'AND assigned_admin = ?' : ''}
    GROUP BY CAST(strftime('%H', created_at) as INTEGER)
    ORDER BY hour
  `).all(
    dateFromStr,
    dateToStr,
    ...(adminId ? [adminId] : [])
  );

  // SLA Performance by Priority
  const slaPerformance = db.prepare(`
    SELECT
      priority,
      COUNT(*) as total,
      COUNT(CASE WHEN sla_breach = 0 THEN 1 END) as within_sla,
      AVG(CASE
        WHEN first_response_at IS NOT NULL AND assigned_at IS NOT NULL
        THEN ROUND((julianday(first_response_at) - julianday(assigned_at)) * 24 * 60, 2)
      END) as avg_response_time,

      -- SLA targets (in minutes)
      CASE priority
        WHEN 'CRITICAL' THEN 5
        WHEN 'URGENT' THEN 15
        WHEN 'HIGH' THEN 60
        WHEN 'NORMAL' THEN 240
        WHEN 'LOW' THEN 1440
      END as sla_target_minutes

    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
    ${adminId ? 'AND assigned_admin = ?' : ''}
    GROUP BY priority
  `).all(
    dateFromStr,
    dateToStr,
    ...(adminId ? [adminId] : [])
  );

  // Satisfaction Analysis
  const satisfactionAnalysis = db.prepare(`
    SELECT
      user_satisfaction_score as score,
      COUNT(*) as count,
      priority,
      trigger_type
    FROM escalation_queue
    WHERE created_at BETWEEN ? AND ?
      AND user_satisfaction_score IS NOT NULL
    ${adminId ? 'AND assigned_admin = ?' : ''}
    GROUP BY user_satisfaction_score, priority, trigger_type
    ORDER BY user_satisfaction_score DESC, count DESC
  `).all(
    dateFromStr,
    dateToStr,
    ...(adminId ? [adminId] : [])
  );

  // Build comprehensive report
  const report = {
    metadata: {
      dateRange: { from: dateFrom, to: dateTo },
      adminId,
      priority,
      generatedAt: new Date().toISOString(),
      reportType: adminId ? 'admin_specific' : 'system_wide'
    },

    summary: {
      ...overallMetrics,
      resolution_rate_percent: resolutionRate,
      sla_compliance_rate_percent: slaComplianceRate,
      feedback_response_rate: overallMetrics.total_escalations > 0
        ? (overallMetrics.feedback_count / overallMetrics.total_escalations) * 100
        : 0
    },

    distributions: {
      byPriority: priorityDistribution,
      byTriggerType: triggerAnalysis
    },

    performance: {
      slaCompliance: slaPerformance.map(row => ({
        ...row,
        compliance_rate: row.total > 0 ? (row.within_sla / row.total) * 100 : 100,
        avg_response_vs_sla: row.avg_response_time && row.sla_target_minutes
          ? (row.avg_response_time / row.sla_target_minutes) * 100
          : null
      })),
      adminPerformance: adminPerformance.map(admin => ({
        ...admin,
        period_resolution_rate: admin.period_escalations > 0
          ? (admin.period_resolved / admin.period_escalations) * 100
          : 0,
        period_sla_compliance: admin.period_escalations > 0
          ? ((admin.period_escalations - admin.period_sla_breaches) / admin.period_escalations) * 100
          : 100
      }))
    },

    trends: {
      daily: dailyTrend,
      hourly: hourlyPattern
    },

    satisfaction: {
      overall: overallMetrics.avg_satisfaction,
      distribution: satisfactionAnalysis,
      scoreBreakdown: [1, 2, 3, 4, 5].map(score => ({
        score,
        count: satisfactionAnalysis.filter(s => s.score === score).reduce((sum, s) => sum + s.count, 0)
      }))
    }
  };

  // Add detailed records if requested
  if (includeDetailed) {
    report.detailedRecords = db.prepare(`
      SELECT
        eq.*,
        c.name as candidate_name,
        c.email as candidate_email
      FROM escalation_queue eq
      LEFT JOIN candidates c ON eq.candidate_id = c.id
      WHERE eq.created_at BETWEEN ? AND ?
      ${adminId ? 'AND eq.assigned_admin = ?' : ''}
      ${priority ? 'AND eq.priority = ?' : ''}
      ORDER BY eq.created_at DESC
      LIMIT 1000
    `).all(
      dateFromStr,
      dateToStr,
      ...(adminId ? [adminId] : []),
      ...(priority ? [priority] : [])
    );
  }

  return report;
}

/**
 * Generate admin leaderboard
 * @param {string} timeframe - 'day', 'week', 'month'
 * @returns {array} Admin leaderboard data
 */
function generateAdminLeaderboard(timeframe = 'week') {
  const timeframeDays = {
    day: 1,
    week: 7,
    month: 30
  };

  const days = timeframeDays[timeframe] || 7;
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const leaderboard = db.prepare(`
    SELECT
      aw.admin_id,
      aw.availability_status,

      -- Current period metrics
      COUNT(eq.id) as escalations_handled,
      COUNT(CASE WHEN eq.status IN ('resolved', 'closed') THEN 1 END) as escalations_resolved,
      AVG(CASE
        WHEN eq.resolved_at IS NOT NULL AND eq.assigned_at IS NOT NULL
        THEN ROUND((julianday(eq.resolved_at) - julianday(eq.assigned_at)) * 24 * 60, 2)
      END) as avg_resolution_time,
      AVG(CAST(eq.user_satisfaction_score as REAL)) as avg_satisfaction,
      COUNT(CASE WHEN eq.sla_breach = 1 THEN 1 END) as sla_breaches,

      -- Performance scores
      CASE
        WHEN COUNT(eq.id) = 0 THEN 0
        ELSE (
          (COUNT(CASE WHEN eq.status IN ('resolved', 'closed') THEN 1 END) * 1.0 / COUNT(eq.id)) * 40 +
          CASE
            WHEN AVG(CAST(eq.user_satisfaction_score as REAL)) IS NULL THEN 20
            ELSE (AVG(CAST(eq.user_satisfaction_score as REAL)) / 5.0) * 30
          END +
          CASE
            WHEN COUNT(eq.id) = COUNT(CASE WHEN eq.sla_breach = 1 THEN 1 END) THEN 0
            ELSE ((COUNT(eq.id) - COUNT(CASE WHEN eq.sla_breach = 1 THEN 1 END)) * 1.0 / COUNT(eq.id)) * 30
          END
        )
      END as performance_score

    FROM admin_workload aw
    LEFT JOIN escalation_queue eq ON aw.admin_id = eq.assigned_admin
      AND eq.created_at >= ?
    GROUP BY aw.admin_id
    ORDER BY performance_score DESC, escalations_handled DESC
  `).all(dateFrom.toISOString());

  return leaderboard.map((admin, index) => ({
    ...admin,
    rank: index + 1,
    resolution_rate: admin.escalations_handled > 0
      ? (admin.escalations_resolved / admin.escalations_handled) * 100
      : 0,
    sla_compliance_rate: admin.escalations_handled > 0
      ? ((admin.escalations_handled - admin.sla_breaches) / admin.escalations_handled) * 100
      : 100
  }));
}

/**
 * Get real-time escalation insights
 * @returns {object} Current insights and alerts
 */
function getRealTimeInsights() {
  // Current queue status
  const currentQueue = db.prepare(`
    SELECT
      COUNT(*) as total_active,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN sla_deadline < datetime('now') AND status NOT IN ('resolved', 'closed') THEN 1 END) as sla_breached,
      COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) as critical_count,
      AVG(ROUND((julianday('now') - julianday(created_at)) * 24 * 60, 2)) as avg_queue_time
    FROM escalation_queue
    WHERE status NOT IN ('resolved', 'closed')
  `).get();

  // Upcoming SLA breaches (next 30 minutes)
  const upcomingSlaBreaches = db.prepare(`
    SELECT
      eq.id,
      eq.candidate_id,
      eq.priority,
      eq.trigger_reason,
      eq.sla_deadline,
      c.name as candidate_name,
      ROUND((julianday(eq.sla_deadline) - julianday('now')) * 24 * 60, 0) as minutes_to_breach
    FROM escalation_queue eq
    LEFT JOIN candidates c ON eq.candidate_id = c.id
    WHERE eq.status NOT IN ('resolved', 'closed')
      AND eq.sla_deadline BETWEEN datetime('now') AND datetime('now', '+30 minutes')
    ORDER BY eq.sla_deadline
  `).all();

  // Admin workload distribution
  const adminWorkload = db.prepare(`
    SELECT
      aw.admin_id,
      aw.availability_status,
      aw.active_escalations,
      aw.max_capacity,
      (aw.max_capacity - aw.active_escalations) as available_capacity
    FROM admin_workload aw
    WHERE aw.availability_status IN ('available', 'busy')
    ORDER BY available_capacity DESC
  `).all();

  // Recent escalation trends (last 2 hours)
  const recentTrends = db.prepare(`
    SELECT
      strftime('%Y-%m-%d %H:00:00', created_at) as hour,
      COUNT(*) as escalations,
      COUNT(CASE WHEN priority IN ('CRITICAL', 'URGENT') THEN 1 END) as high_priority
    FROM escalation_queue
    WHERE created_at >= datetime('now', '-2 hours')
    GROUP BY strftime('%Y-%m-%d %H:00:00', created_at)
    ORDER BY hour
  `).all();

  // Generate insights and alerts
  const insights = [];

  if (currentQueue.sla_breached > 0) {
    insights.push({
      type: 'alert',
      severity: 'high',
      title: 'SLA Breaches Detected',
      message: `${currentQueue.sla_breached} escalations have breached their SLA`,
      action: 'Review breached escalations immediately'
    });
  }

  if (upcomingSlaBreaches.length > 0) {
    insights.push({
      type: 'warning',
      severity: 'medium',
      title: 'Upcoming SLA Breaches',
      message: `${upcomingSlaBreaches.length} escalations will breach SLA within 30 minutes`,
      action: 'Assign to available admins'
    });
  }

  if (currentQueue.pending > 5) {
    insights.push({
      type: 'warning',
      severity: 'medium',
      title: 'High Pending Queue',
      message: `${currentQueue.pending} escalations are pending assignment`,
      action: 'Consider bulk assignment or increasing capacity'
    });
  }

  const totalCapacity = adminWorkload.reduce((sum, admin) => sum + admin.available_capacity, 0);
  if (totalCapacity < currentQueue.pending) {
    insights.push({
      type: 'alert',
      severity: 'high',
      title: 'Capacity Shortage',
      message: `Available admin capacity (${totalCapacity}) is less than pending escalations (${currentQueue.pending})`,
      action: 'Scale up admin availability or adjust capacity limits'
    });
  }

  return {
    timestamp: new Date().toISOString(),
    currentQueue,
    upcomingSlaBreaches,
    adminWorkload,
    recentTrends,
    insights,
    systemHealth: {
      status: currentQueue.sla_breached === 0 && totalCapacity >= currentQueue.pending ? 'healthy' : 'needs_attention',
      queuePressure: currentQueue.pending / (totalCapacity + 1), // Add 1 to avoid division by zero
      avgWaitTime: currentQueue.avg_queue_time
    }
  };
}

/**
 * Update daily metrics aggregation
 */
function updateDailyMetrics() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Calculate metrics for today
    const todayMetrics = db.prepare(`
      SELECT
        COUNT(*) as total_escalations,
        COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END) as resolved_escalations,
        AVG(CASE
          WHEN first_response_at IS NOT NULL AND assigned_at IS NOT NULL
          THEN ROUND((julianday(first_response_at) - julianday(assigned_at)) * 24 * 60, 2)
        END) as avg_response_time,
        AVG(CASE
          WHEN resolved_at IS NOT NULL AND assigned_at IS NOT NULL
          THEN ROUND((julianday(resolved_at) - julianday(assigned_at)) * 24 * 60, 2)
        END) as avg_resolution_time,
        COUNT(CASE WHEN sla_breach = 1 THEN 1 END) as sla_breach_count,
        AVG(CAST(user_satisfaction_score as REAL)) as satisfaction_avg
      FROM escalation_queue
      WHERE DATE(created_at) = ?
    `).get(today);

    // Get trigger and priority distributions
    const triggerDistribution = db.prepare(`
      SELECT trigger_type, COUNT(*) as count
      FROM escalation_queue
      WHERE DATE(created_at) = ?
      GROUP BY trigger_type
    `).all(today);

    const priorityDistribution = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM escalation_queue
      WHERE DATE(created_at) = ?
      GROUP BY priority
    `).all(today);

    // Insert or update daily metrics
    db.prepare(`
      INSERT OR REPLACE INTO escalation_metrics (
        date, total_escalations, resolved_escalations, avg_response_time,
        avg_resolution_time, sla_breach_count, satisfaction_avg,
        escalations_by_trigger, escalations_by_priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      today,
      todayMetrics.total_escalations,
      todayMetrics.resolved_escalations,
      todayMetrics.avg_response_time,
      todayMetrics.avg_resolution_time,
      todayMetrics.sla_breach_count,
      todayMetrics.satisfaction_avg,
      JSON.stringify(Object.fromEntries(triggerDistribution.map(t => [t.trigger_type, t.count]))),
      JSON.stringify(Object.fromEntries(priorityDistribution.map(p => [p.priority, p.count])))
    );

    logger.info('Daily metrics updated', { date: today });

  } catch (error) {
    logger.error('Failed to update daily metrics', { error: error.message });
  }
}

// Schedule daily metrics update at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    updateDailyMetrics();
  }
}, 60000); // Check every minute

module.exports = {
  generateAnalyticsReport,
  generateAdminLeaderboard,
  getRealTimeInsights,
  updateDailyMetrics
};