/**
 * BPO Opportunities Routes
 * Returns tenders with related client and campaign data
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { calculatePriorityScore, generateRecommendedActions, identifyRiskFactors } = require('../helpers/metrics-calculator');

/**
 * GET /api/v1/bpo/opportunities
 * Returns tenders with related client and campaign data
 * Provides complete context for each tender opportunity
 */
router.get('/', (req, res) => {
  try {
    const { status, win_probability_min = 50, limit = 25 } = req.query;

    let whereClause = 'WHERE t.win_probability >= ?';
    let params = [win_probability_min];

    if (status && status !== 'all') {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    const query = `
      SELECT
        t.*,
        c.company_name as client_company,
        c.contact_name as client_contact,
        c.contact_email as client_email,
        c.status as client_status,
        COUNT(oc.id) as related_campaigns,
        COUNT(CASE WHEN oc.status = 'active' THEN 1 END) as active_campaigns,
        SUM(oc.messages_sent) as total_messages_sent,
        0 as total_responses,
        tm.title as matched_title,
        tm.matched_keyword,
        ta.keyword as alert_keyword
      FROM tenders t
      LEFT JOIN clients c ON t.assigned_to = c.id
      LEFT JOIN outreach_campaigns oc ON oc.job_id = t.id
      LEFT JOIN tender_matches tm ON tm.tender_id = t.id
      LEFT JOIN tender_alerts ta ON tm.alert_id = ta.id
      ${whereClause}
      GROUP BY t.id, c.id, tm.id, ta.id
      ORDER BY t.win_probability DESC, t.created_at DESC
      LIMIT ?
    `;

    params.push(parseInt(limit));
    const opportunities = db.prepare(query).all(...params);

    const enhancedOpportunities = opportunities.map(opp => ({
      ...opp,
      engagement_rate: opp.total_messages_sent > 0
        ? ((opp.total_responses / opp.total_messages_sent) * 100).toFixed(1)
        : '0.0',
      priority_score: calculatePriorityScore(opp),
      recommended_actions: generateRecommendedActions(opp),
      risk_factors: identifyRiskFactors(opp)
    }));

    res.json({
      success: true,
      data: enhancedOpportunities,
      metadata: {
        totalCount: enhancedOpportunities.length,
        filters: { status, win_probability_min },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities',
      details: 'Internal server error'
    });
  }
});

module.exports = router;
