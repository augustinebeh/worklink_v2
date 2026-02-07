/**
 * EPU/SER/19 Intelligence API Routes
 * Specialized endpoints for Service - Manpower Supply category monitoring
 */

const express = require('express');
const router = express.Router();
const EPUSer19Monitor = require('../../../../services/gebiz-intelligence/epu-ser-19-monitor');
const EPUSer19Scraper = require('../../../../services/gebiz-intelligence/epu-ser-19-scraper');
const { authenticateToken, requireAdmin } = require('../../../../middleware/auth');

// Initialize services
const epuMonitor = new EPUSer19Monitor();
const epuScraper = new EPUSer19Scraper();

/**
 * GET /api/v1/gebiz/epu/dashboard
 * Get EPU/SER/19 dashboard overview
 */
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = epuMonitor.generateMarketReport();

    res.json({
      success: true,
      dashboard: {
        category: 'EPU/SER/19 - Service (Manpower Supply)',
        summary: {
          active_opportunities: report.active_opportunities,
          total_estimated_value: report.total_estimated_value,
          high_priority_alerts: report.high_priority_alerts.length,
          service_types: Object.keys(report.service_type_breakdown).length,
          target_agencies: Object.keys(report.agency_breakdown).length
        },
        recent_opportunities: report.high_priority_alerts.slice(0, 5),
        service_breakdown: report.service_type_breakdown,
        agency_breakdown: report.agency_breakdown,
        intelligence_insights: report.intelligence_insights,
        generated_at: report.generated_at
      }
    });
  } catch (error) {
    console.error('EPU dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate EPU/SER/19 dashboard',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/gebiz/epu/opportunities
 * Get active EPU/SER/19 opportunities with filtering
 */
router.get('/opportunities', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      priority = null,
      service_type = null,
      agency = null,
      min_score = 0
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const opportunities = epuMonitor.getActiveEPUTenders({
      limit: parseInt(limit),
      offset: offset,
      alertPriority: priority,
      serviceType: service_type,
      agency: agency,
      minIntelligenceScore: parseInt(min_score)
    });

    // Get total count for pagination
    epuMonitor.initDB();
    let whereClause = 'WHERE status = "active"';
    const params = [];

    if (min_score > 0) {
      whereClause += ' AND intelligence_score >= ?';
      params.push(parseInt(min_score));
    }
    if (priority) {
      whereClause += ' AND alert_priority = ?';
      params.push(priority);
    }
    if (service_type) {
      whereClause += ' AND service_type = ?';
      params.push(service_type);
    }
    if (agency) {
      whereClause += ' AND agency LIKE ?';
      params.push(`%${agency}%`);
    }

    const countStmt = epuMonitor.db.prepare(`
      SELECT COUNT(*) as total FROM epu_ser_19_tenders ${whereClause}
    `);
    const { total } = countStmt.get(...params);

    res.json({
      success: true,
      opportunities: opportunities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        priority,
        service_type,
        agency,
        min_score: parseInt(min_score)
      }
    });
  } catch (error) {
    console.error('EPU opportunities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EPU/SER/19 opportunities',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/gebiz/epu/opportunity/:id
 * Get detailed EPU/SER/19 opportunity information
 */
router.get('/opportunity/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    epuMonitor.initDB();

    // Get tender details
    const tenderStmt = epuMonitor.db.prepare(`
      SELECT * FROM epu_ser_19_tenders WHERE id = ?
    `);
    const tender = tenderStmt.get(id);

    if (!tender) {
      return res.status(404).json({
        success: false,
        message: 'EPU/SER/19 opportunity not found'
      });
    }

    // Get market intelligence
    const intelStmt = epuMonitor.db.prepare(`
      SELECT * FROM epu_market_intelligence
      WHERE tender_id = ?
      ORDER BY confidence_level DESC
    `);
    const intelligence = intelStmt.all(id);

    // Get competitor analysis for similar tenders
    const competitorStmt = epuMonitor.db.prepare(`
      SELECT c.competitor_name, c.win_rate, c.typical_pricing_range,
             c.threat_level, c.competitive_advantages
      FROM epu_competitors c
      WHERE c.specializations LIKE '%' || ? || '%'
      ORDER BY c.win_rate DESC
      LIMIT 5
    `);
    const competitors = competitorStmt.all(tender.service_type);

    // Get pricing intelligence for similar contracts
    const pricingStmt = epuMonitor.db.prepare(`
      SELECT * FROM epu_pricing_intelligence
      WHERE service_type = ? AND agency = ?
      ORDER BY award_date DESC
      LIMIT 10
    `);
    const pricingData = pricingStmt.all(tender.service_type, tender.agency);

    res.json({
      success: true,
      opportunity: {
        ...tender,
        source_data: tender.source_data ? JSON.parse(tender.source_data) : null
      },
      market_intelligence: intelligence,
      competitor_analysis: competitors,
      pricing_intelligence: pricingData,
      recommendations: generateRecommendations(tender, intelligence, competitors)
    });

  } catch (error) {
    console.error('EPU opportunity detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EPU/SER/19 opportunity details',
      error: error.message
    });
  }
});

/**
 * POST /api/v1/gebiz/epu/scan
 * Trigger EPU/SER/19 specialized scan
 */
router.post('/scan', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🚀 Starting EPU/SER/19 specialized scan...');

    // Run the specialized scraper
    const results = await epuScraper.scrapeEPUTenders();

    const stats = epuScraper.getStats();

    res.json({
      success: true,
      message: 'EPU/SER/19 scan completed successfully',
      results: {
        tenders_found: results.length,
        total_requests: stats.totalRequests,
        epu_tenders_identified: stats.epuTendersFound,
        avg_intelligence_score: stats.avgIntelligenceScore,
        last_scan: stats.lastScrapeTime,
        high_priority_count: results.filter(t => t.alert_priority === 'high' || t.alert_priority === 'urgent').length
      },
      tenders: results.slice(0, 10) // Return first 10 for preview
    });

  } catch (error) {
    console.error('EPU scan error:', error);
    res.status(500).json({
      success: false,
      message: 'EPU/SER/19 scan failed',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/gebiz/epu/competitors
 * Get EPU/SER/19 competitor analysis
 */
router.get('/competitors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { service_type = null, limit = 20 } = req.query;

    epuMonitor.initDB();

    let whereClause = '';
    const params = [];

    if (service_type) {
      whereClause = 'WHERE specializations LIKE ?';
      params.push(`%${service_type}%`);
    }

    const stmt = epuMonitor.db.prepare(`
      SELECT * FROM epu_competitors
      ${whereClause}
      ORDER BY win_rate DESC, total_epu_value DESC
      LIMIT ?
    `);

    params.push(parseInt(limit));
    const competitors = stmt.all(...params);

    // Parse JSON fields
    competitors.forEach(comp => {
      try {
        comp.specializations = comp.specializations ? JSON.parse(comp.specializations) : [];
        comp.typical_pricing_range = comp.typical_pricing_range ? JSON.parse(comp.typical_pricing_range) : {};
        comp.agency_preferences = comp.agency_preferences ? JSON.parse(comp.agency_preferences) : [];
        comp.competitive_advantages = comp.competitive_advantages ? JSON.parse(comp.competitive_advantages) : [];
        comp.weaknesses = comp.weaknesses ? JSON.parse(comp.weaknesses) : [];
      } catch (e) {
        console.log('Error parsing competitor JSON fields:', e.message);
      }
    });

    res.json({
      success: true,
      competitors: competitors,
      summary: {
        total_competitors: competitors.length,
        avg_win_rate: competitors.length > 0
          ? competitors.reduce((sum, c) => sum + (c.win_rate || 0), 0) / competitors.length
          : 0,
        service_type_filter: service_type
      }
    });

  } catch (error) {
    console.error('EPU competitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EPU/SER/19 competitor analysis',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/gebiz/epu/pricing-intelligence
 * Get EPU/SER/19 pricing intelligence
 */
router.get('/pricing-intelligence', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      service_type = null,
      agency = null,
      months_back = 12,
      limit = 50
    } = req.query;

    epuMonitor.initDB();

    let whereClause = 'WHERE award_date >= date("now", "-' + parseInt(months_back) + ' months")';
    const params = [];

    if (service_type) {
      whereClause += ' AND service_type = ?';
      params.push(service_type);
    }

    if (agency) {
      whereClause += ' AND agency LIKE ?';
      params.push(`%${agency}%`);
    }

    const stmt = epuMonitor.db.prepare(`
      SELECT * FROM epu_pricing_intelligence
      ${whereClause}
      ORDER BY award_date DESC
      LIMIT ?
    `);

    params.push(parseInt(limit));
    const pricingData = stmt.all(...params);

    // Calculate pricing statistics
    const stats = {
      total_contracts: pricingData.length,
      avg_hourly_rate: 0,
      median_hourly_rate: 0,
      min_hourly_rate: null,
      max_hourly_rate: null,
      avg_monthly_cost_per_person: 0,
      total_market_value: 0
    };

    if (pricingData.length > 0) {
      const hourlyRates = pricingData.map(p => p.hourly_rate_avg).filter(r => r > 0);
      const monthlyCosts = pricingData.map(p => p.monthly_cost_per_person).filter(c => c > 0);
      const totalValues = pricingData.map(p => p.total_contract_value).filter(v => v > 0);

      if (hourlyRates.length > 0) {
        stats.avg_hourly_rate = hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length;
        stats.min_hourly_rate = Math.min(...hourlyRates);
        stats.max_hourly_rate = Math.max(...hourlyRates);

        const sortedRates = hourlyRates.sort((a, b) => a - b);
        stats.median_hourly_rate = sortedRates[Math.floor(sortedRates.length / 2)];
      }

      if (monthlyCosts.length > 0) {
        stats.avg_monthly_cost_per_person = monthlyCosts.reduce((a, b) => a + b, 0) / monthlyCosts.length;
      }

      if (totalValues.length > 0) {
        stats.total_market_value = totalValues.reduce((a, b) => a + b, 0);
      }
    }

    res.json({
      success: true,
      pricing_data: pricingData,
      statistics: stats,
      filters: {
        service_type,
        agency,
        months_back: parseInt(months_back)
      }
    });

  } catch (error) {
    console.error('EPU pricing intelligence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EPU/SER/19 pricing intelligence',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/gebiz/epu/alerts
 * Get EPU/SER/19 high priority alerts
 */
router.get('/alerts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { priority = 'high', limit = 20 } = req.query;

    const opportunities = epuMonitor.getActiveEPUTenders({
      limit: parseInt(limit),
      alertPriority: priority,
      minIntelligenceScore: 50
    });

    const alerts = opportunities.map(opp => ({
      id: opp.id,
      tender_no: opp.tender_no,
      title: opp.title,
      agency: opp.agency,
      alert_priority: opp.alert_priority,
      intelligence_score: opp.intelligence_score,
      closing_date: opp.closing_date,
      estimated_value: opp.estimated_value,
      service_type: opp.service_type,
      win_probability: opp.win_probability,
      renewal_probability: opp.renewal_probability,
      created_at: opp.created_at
    }));

    res.json({
      success: true,
      alerts: alerts,
      summary: {
        total_alerts: alerts.length,
        priority_filter: priority,
        avg_intelligence_score: alerts.length > 0
          ? alerts.reduce((sum, a) => sum + a.intelligence_score, 0) / alerts.length
          : 0,
        total_estimated_value: alerts.reduce((sum, a) => sum + (a.estimated_value || 0), 0)
      }
    });

  } catch (error) {
    console.error('EPU alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch EPU/SER/19 alerts',
      error: error.message
    });
  }
});

/**
 * GET /api/v1/gebiz/epu/market-report
 * Generate comprehensive EPU/SER/19 market report
 */
router.get('/market-report', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = epuMonitor.generateMarketReport();

    res.json({
      success: true,
      report: report
    });

  } catch (error) {
    console.error('EPU market report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate EPU/SER/19 market report',
      error: error.message
    });
  }
});

/**
 * Generate recommendations based on tender and intelligence data
 */
function generateRecommendations(tender, intelligence, competitors) {
  const recommendations = [];

  // Pricing recommendations
  if (tender.estimated_value && tender.manpower_count) {
    const monthlyRate = tender.estimated_value / (tender.contract_duration_months || 12) / tender.manpower_count;
    if (monthlyRate < 2000) {
      recommendations.push({
        type: 'pricing',
        priority: 'high',
        message: 'Low pricing detected. Consider competitive pricing strategy.',
        action: 'Review historical pricing data for similar contracts'
      });
    } else if (monthlyRate > 4000) {
      recommendations.push({
        type: 'pricing',
        priority: 'medium',
        message: 'High value opportunity. Ensure premium service delivery.',
        action: 'Prepare enhanced service proposal'
      });
    }
  }

  // Competition recommendations
  if (competitors && competitors.length > 0) {
    const highThreatCompetitors = competitors.filter(c => c.threat_level === 'high');
    if (highThreatCompetitors.length > 0) {
      recommendations.push({
        type: 'competition',
        priority: 'high',
        message: `High threat competitors identified: ${highThreatCompetitors.map(c => c.competitor_name).join(', ')}`,
        action: 'Develop differentiation strategy and competitive pricing'
      });
    }
  }

  // Intelligence-based recommendations
  if (intelligence && intelligence.length > 0) {
    const highConfidenceInsights = intelligence.filter(i => i.confidence_level > 0.8);
    for (const insight of highConfidenceInsights) {
      if (insight.actionable_insight) {
        recommendations.push({
          type: 'intelligence',
          priority: insight.impact_level,
          message: insight.data_point,
          action: insight.actionable_insight
        });
      }
    }
  }

  // Timing recommendations
  if (tender.closing_date) {
    const closingDate = new Date(tender.closing_date);
    const today = new Date();
    const daysToClose = Math.ceil((closingDate - today) / (1000 * 60 * 60 * 24));

    if (daysToClose < 7) {
      recommendations.push({
        type: 'timing',
        priority: 'urgent',
        message: `Tender closes in ${daysToClose} days`,
        action: 'Prioritize proposal preparation immediately'
      });
    } else if (daysToClose < 14) {
      recommendations.push({
        type: 'timing',
        priority: 'high',
        message: `Tender closes in ${daysToClose} days`,
        action: 'Begin proposal preparation this week'
      });
    }
  }

  return recommendations;
}

module.exports = router;