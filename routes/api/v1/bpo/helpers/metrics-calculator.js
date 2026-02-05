/**
 * BPO Metrics Calculator Helper
 * Handles priority scoring, analytics calculations, and performance metrics
 */

/**
 * Calculate priority score for tender opportunities
 */
function calculatePriorityScore(tender) {
  let score = 0;

  // Win probability weight (40%)
  score += (tender.win_probability || 0) * 0.4;

  // Value weight (30%)
  if (tender.estimated_value > 100000) score += 30 * 0.3;
  else if (tender.estimated_value > 50000) score += 20 * 0.3;
  else score += 10 * 0.3;

  // Urgency weight (20%)
  const closingDate = new Date(tender.closing_date);
  const daysUntilClose = Math.ceil((closingDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntilClose <= 7) score += 30 * 0.2;
  else if (daysUntilClose <= 14) score += 20 * 0.2;
  else score += 10 * 0.2;

  // Engagement weight (10%)
  if (tender.total_responses > 0) score += 20 * 0.1;
  else if (tender.related_campaigns > 0) score += 10 * 0.1;

  return Math.round(score);
}

/**
 * Generate recommended actions for tenders
 */
function generateRecommendedActions(tender) {
  const actions = [];

  if (tender.win_probability >= 70 && tender.status === 'new') {
    actions.push('Prioritize for immediate bidding preparation');
  }

  if (tender.related_campaigns === 0 && tender.manpower_required > 5) {
    actions.push('Start candidate sourcing campaign');
  }

  const closingDate = new Date(tender.closing_date);
  const daysUntilClose = Math.ceil((closingDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntilClose <= 7 && tender.status !== 'submitted') {
    actions.push('URGENT: Submit bid - closing soon');
  }

  if (!tender.assigned_to) {
    actions.push('Assign to appropriate client');
  }

  return actions;
}

/**
 * Identify risk factors for tenders
 */
function identifyRiskFactors(tender) {
  const risks = [];

  if (tender.win_probability < 30) {
    risks.push('Low win probability');
  }

  if (tender.related_campaigns === 0 && tender.manpower_required > 10) {
    risks.push('High manpower requirement without sourcing campaign');
  }

  const closingDate = new Date(tender.closing_date);
  const daysUntilClose = Math.ceil((closingDate - new Date()) / (1000 * 60 * 60 * 24));
  if (daysUntilClose <= 3) {
    risks.push('Very tight deadline');
  }

  if (!tender.estimated_value || tender.estimated_value < 10000) {
    risks.push('Low or unknown contract value');
  }

  return risks;
}

/**
 * Get BPO overview statistics
 */
function getBPOOverviewStats(db) {
  const stats = {
    totalTenders: db.prepare('SELECT COUNT(*) as count FROM tenders').get().count,
    activeTenders: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status IN ('new', 'reviewing', 'bidding')").get().count,
    totalValue: db.prepare('SELECT SUM(estimated_value) as total FROM tenders WHERE estimated_value IS NOT NULL').get().total || 0,
    avgWinProbability: db.prepare('SELECT AVG(win_probability) as avg FROM tenders WHERE win_probability IS NOT NULL').get().avg || 0,

    // Monitoring stats
    activeAlerts: db.prepare('SELECT COUNT(*) as count FROM tender_alerts WHERE active = 1').get().count,
    totalMatches: db.prepare('SELECT COUNT(*) as count FROM tender_matches').get().count,
    unreadMatches: db.prepare('SELECT COUNT(*) as count FROM tender_matches WHERE notified = 0').get().count,

    // Campaign stats
    activeCampaigns: db.prepare("SELECT COUNT(*) as count FROM outreach_campaigns WHERE status = 'active'").get().count,
    totalMessagesSent: db.prepare('SELECT SUM(messages_sent) as total FROM outreach_campaigns').get().total || 0,
    totalResponses: 0, // Response tracking not yet implemented

    // Client stats
    activeClients: db.prepare("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").get().count
  };

  // Calculate derived metrics
  stats.responseRate = stats.totalMessagesSent > 0
    ? ((stats.totalResponses / stats.totalMessagesSent) * 100).toFixed(1)
    : '0.0';

  return stats;
}

/**
 * Get performance metrics for a date range
 */
function getPerformanceMetrics(db, startDate) {
  const start = startDate.toISOString();

  return {
    tenderMetrics: {
      newTenders: db.prepare('SELECT COUNT(*) as count FROM tenders WHERE created_at >= ?').get(start).count,
      closingTenders: db.prepare(`SELECT COUNT(*) as count FROM tenders WHERE closing_date BETWEEN ? AND date('now', "'+7 days'")`).get(start).count,
      wonTenders: db.prepare("SELECT COUNT(*) as count FROM tenders WHERE status = 'won' AND updated_at >= ?").get(start).count,
      avgWinProbability: db.prepare('SELECT AVG(win_probability) as avg FROM tenders WHERE created_at >= ? AND win_probability IS NOT NULL').get(start).avg || 0
    },

    engagementMetrics: {
      campaignsCreated: db.prepare('SELECT COUNT(*) as count FROM outreach_campaigns WHERE created_at >= ?').get(start).count,
      messagesSent: db.prepare('SELECT SUM(messages_sent) as total FROM outreach_campaigns WHERE created_at >= ?').get(start).total || 0,
      responsesReceived: 0 // Response tracking not yet implemented
    },

    monitoringMetrics: {
      newMatches: db.prepare('SELECT COUNT(*) as count FROM tender_matches WHERE created_at >= ?').get(start).count,
      alertsTriggered: db.prepare(`
        SELECT COUNT(DISTINCT alert_id) as count
        FROM tender_matches
        WHERE created_at >= ?
      `).get(start).count
    }
  };
}

/**
 * Get client overview statistics
 */
function getClientOverview(db) {
  return {
    totalClients: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
    activeClients: db.prepare("SELECT COUNT(*) as count FROM clients WHERE status = 'active'").get().count,
    clientsWithTenders: db.prepare(`
      SELECT COUNT(DISTINCT c.id) as count
      FROM clients c
      JOIN tenders t ON c.id = t.assigned_to
    `).get().count,
    avgTendersPerClient: db.prepare(`
      SELECT AVG(tender_count) as avg
      FROM (
        SELECT COUNT(t.id) as tender_count
        FROM clients c
        LEFT JOIN tenders t ON c.id = t.assigned_to
        WHERE c.status = 'active'
        GROUP BY c.id
      )
    `).get().avg || 0
  };
}

// Placeholder functions for comprehensive analytics (would be implemented based on specific requirements)
function getTenderAnalytics(start, end, groupBy) {
  // Implement tender performance analytics over time
  return { placeholder: 'tender analytics data' };
}

function getCampaignAnalytics(start, end, groupBy) {
  // Implement campaign performance analytics over time
  return { placeholder: 'campaign analytics data' };
}

function getEngagementAnalytics(start, end, groupBy) {
  // Implement engagement analytics over time
  return { placeholder: 'engagement analytics data' };
}

function getROIAnalysis(start, end) {
  // Implement ROI calculations
  return { placeholder: 'ROI analysis data' };
}

function getConversionFunnels(start, end) {
  // Implement conversion funnel analysis
  return { placeholder: 'conversion funnel data' };
}

function getTopPerformers(start, end) {
  // Implement top performers analysis
  return { placeholder: 'top performers data' };
}

function getPredictiveInsights(start, end) {
  // Implement predictive insights
  return { placeholder: 'predictive insights data' };
}

module.exports = {
  calculatePriorityScore,
  generateRecommendedActions,
  identifyRiskFactors,
  getBPOOverviewStats,
  getPerformanceMetrics,
  getClientOverview,
  getTenderAnalytics,
  getCampaignAnalytics,
  getEngagementAnalytics,
  getROIAnalysis,
  getConversionFunnels,
  getTopPerformers,
  getPredictiveInsights
};