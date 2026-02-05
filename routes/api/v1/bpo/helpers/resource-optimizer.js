/**
 * BPO Resource Optimizer Helper
 * Handles resource allocation, optimization, and planning for BPO operations
 */

/**
 * Get tenders with comprehensive statistics
 */
function getTendersWithStats(db, limit) {
  const query = `
    SELECT
      t.*,
      c.company_name as client_company,
      COUNT(tm.id) as monitoring_matches,
      COUNT(oc.id) as related_campaigns
    FROM tenders t
    LEFT JOIN clients c ON t.assigned_to = c.id
    LEFT JOIN tender_matches tm ON tm.tender_id = t.id
    LEFT JOIN outreach_campaigns oc ON oc.job_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
    LIMIT ?
  `;

  return db.prepare(query).all(limit);
}

/**
 * Get active alerts with match statistics
 */
function getActiveAlerts(db) {
  return db.prepare(`
    SELECT
      ta.*,
      COUNT(tm.id) as total_matches,
      COUNT(CASE WHEN tm.notified = 0 THEN 1 END) as unread_matches,
      MAX(tm.created_at) as last_match
    FROM tender_alerts ta
    LEFT JOIN tender_matches tm ON tm.alert_id = ta.id
    WHERE ta.active = 1
    GROUP BY ta.id
    ORDER BY ta.created_at DESC
  `).all();
}

/**
 * Get recent matches for monitoring
 */
function getRecentMatches(db, days) {
  const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();

  return db.prepare(`
    SELECT
      tm.*,
      ta.keyword,
      t.title as tender_title,
      t.agency,
      t.estimated_value
    FROM tender_matches tm
    JOIN tender_alerts ta ON tm.alert_id = ta.id
    LEFT JOIN tenders t ON tm.tender_id = t.id
    WHERE tm.created_at >= ?
    ORDER BY tm.created_at DESC
    LIMIT 20
  `).all(cutoffDate);
}

/**
 * Get active campaigns with related information
 */
function getActiveCampaigns(db, limit) {
  return db.prepare(`
    SELECT
      oc.*,
      t.title as tender_title,
      t.agency,
      c.company_name as client_company
    FROM outreach_campaigns oc
    LEFT JOIN tenders t ON oc.job_id = t.id
    LEFT JOIN clients c ON t.assigned_to = c.id
    WHERE oc.status = 'active'
    ORDER BY oc.created_at DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Get top opportunities ranked by priority
 */
function getTopOpportunities(db, limit) {
  return db.prepare(`
    SELECT
      t.*,
      c.company_name as client_company,
      CASE
        WHEN t.closing_date <= date('now', '+7 days') THEN 'urgent'
        WHEN t.closing_date <= date('now', '+14 days') THEN 'soon'
        ELSE 'normal'
      END as urgency,
      (
        CAST(t.win_probability AS FLOAT) * 0.4 +
        CASE WHEN t.estimated_value > 100000 THEN 30 ELSE 10 END * 0.3 +
        CASE WHEN t.closing_date <= date('now', '+7 days') THEN 30 ELSE 10 END * 0.3
      ) as priority_score
    FROM tenders t
    LEFT JOIN clients c ON t.assigned_to = c.id
    WHERE t.status IN ('new', 'reviewing')
      AND t.win_probability >= 50
    ORDER BY priority_score DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Get recent AI activity and analysis
 */
function getRecentAIActivity(db, limit) {
  // This would track AI analysis, scraping, and automation activities
  // For now, return recent tender updates that involved AI
  return db.prepare(`
    SELECT
      t.id,
      t.title,
      t.agency,
      t.win_probability,
      t.recommended_action,
      t.updated_at,
      'analysis' as activity_type
    FROM tenders t
    WHERE t.win_probability IS NOT NULL
      AND t.recommended_action IS NOT NULL
    ORDER BY t.updated_at DESC
    LIMIT ?
  `).all(limit);
}

/**
 * Optimize resource allocation based on tender requirements
 */
function optimizeResourceAllocation(tenders, availableResources) {
  const allocations = [];

  // Sort tenders by priority score (highest first)
  const sortedTenders = tenders.sort((a, b) =>
    (b.priority_score || 0) - (a.priority_score || 0)
  );

  let remainingResources = { ...availableResources };

  for (const tender of sortedTenders) {
    const allocation = {
      tender_id: tender.id,
      recommended_resources: {},
      priority: 'normal',
      constraints: []
    };

    // Calculate required resources based on tender characteristics
    const requiredManpower = tender.manpower_required || estimateManpower(tender);
    const requiredSkills = extractRequiredSkills(tender);

    // Check resource availability
    if (remainingResources.manpower >= requiredManpower) {
      allocation.recommended_resources.manpower = requiredManpower;
      remainingResources.manpower -= requiredManpower;
    } else {
      allocation.constraints.push('Insufficient manpower');
    }

    // Assign priority based on tender characteristics
    if (tender.urgency === 'urgent' || tender.win_probability > 80) {
      allocation.priority = 'high';
    } else if (tender.win_probability > 60) {
      allocation.priority = 'medium';
    }

    allocations.push(allocation);
  }

  return {
    allocations,
    utilizationRate: calculateUtilizationRate(availableResources, remainingResources)
  };
}

/**
 * Estimate manpower requirements for a tender
 */
function estimateManpower(tender) {
  let estimate = 5; // Base requirement

  if (tender.estimated_value > 500000) estimate += 10;
  else if (tender.estimated_value > 100000) estimate += 5;

  if (tender.complexity === 'high') estimate += 5;
  else if (tender.complexity === 'medium') estimate += 2;

  return Math.min(estimate, 50); // Cap at 50
}

/**
 * Extract required skills from tender description
 */
function extractRequiredSkills(tender) {
  const skills = [];
  const description = (tender.description || '').toLowerCase();

  // Common skill keywords
  const skillMap = {
    'project management': /project\s+management|pm\s+/gi,
    'technical writing': /technical\s+writing|documentation/gi,
    'data analysis': /data\s+analysis|analytics|reporting/gi,
    'software development': /software\s+development|programming|coding/gi,
    'quality assurance': /quality\s+assurance|qa|testing/gi
  };

  Object.entries(skillMap).forEach(([skill, regex]) => {
    if (regex.test(description)) {
      skills.push(skill);
    }
  });

  return skills;
}

/**
 * Calculate resource utilization rate
 */
function calculateUtilizationRate(total, remaining) {
  const utilizationPercentage = {};

  Object.entries(total).forEach(([resource, totalAmount]) => {
    const used = totalAmount - (remaining[resource] || 0);
    utilizationPercentage[resource] = Math.round((used / totalAmount) * 100);
  });

  return utilizationPercentage;
}

/**
 * Recommend optimal tender assignment strategy
 */
function recommendAssignmentStrategy(tender, availableClients) {
  const recommendations = [];

  for (const client of availableClients) {
    const score = calculateClientMatchScore(tender, client);

    recommendations.push({
      client_id: client.id,
      client_name: client.company_name,
      match_score: score,
      reasons: generateMatchReasons(tender, client, score)
    });
  }

  return recommendations.sort((a, b) => b.match_score - a.match_score);
}

/**
 * Calculate client match score for tender
 */
function calculateClientMatchScore(tender, client) {
  let score = 50;

  // Industry alignment
  if (client.industry && tender.industry === client.industry) {
    score += 20;
  }

  // Experience with similar projects
  if (client.completed_projects > 10) score += 15;
  else if (client.completed_projects > 5) score += 10;

  // Performance history
  if (client.success_rate > 80) score += 15;
  else if (client.success_rate > 60) score += 10;

  // Availability
  if (client.current_workload < client.capacity * 0.8) score += 10;

  // Geographic proximity
  if (tender.location && client.location === tender.location) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Generate match reasons for client assignment
 */
function generateMatchReasons(tender, client, score) {
  const reasons = [];

  if (score >= 80) {
    reasons.push('Excellent industry expertise and track record');
  }

  if (client.industry === tender.industry) {
    reasons.push('Industry specialization match');
  }

  if (client.success_rate > 80) {
    reasons.push('High historical success rate');
  }

  if (client.current_workload < client.capacity * 0.8) {
    reasons.push('Available capacity for new projects');
  }

  return reasons;
}

module.exports = {
  getTendersWithStats,
  getActiveAlerts,
  getRecentMatches,
  getActiveCampaigns,
  getTopOpportunities,
  getRecentAIActivity,
  optimizeResourceAllocation,
  estimateManpower,
  extractRequiredSkills,
  calculateUtilizationRate,
  recommendAssignmentStrategy,
  calculateClientMatchScore,
  generateMatchReasons
};