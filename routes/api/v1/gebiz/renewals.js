/**
 * 🔮 RENEWAL TRACKING API
 * Complete API for contract renewal predictions and engagement management
 * Endpoints: List, Create, Update, Delete, Activities, Timeline, Predictions
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Railway-compatible database path configuration
const getDbPath = () => {
  // Try GeBIZ intelligence database first (local development)
  const gebizDbPath = path.join(__dirname, '../../../../database/gebiz_intelligence.db');

  // If GeBIZ database exists, use it
  if (fs.existsSync(gebizDbPath)) {
    return gebizDbPath;
  }

  // Fallback to main database for Railway deployment
  const mainDbPath = path.join(__dirname, '../../../../data/worklink.db');
  if (fs.existsSync(mainDbPath)) {
    return mainDbPath;
  }

  // Final fallback for Railway with different structure
  return process.env.DATABASE_URL || '/opt/render/project/src/data/worklink.db';
};

const DB_PATH = getDbPath();

// ============================================================================
// GET /api/v1/gebiz/renewals - List all renewal predictions
// ============================================================================
router.get('/', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='renewals'").get();
    if (!tableCheck) {
      // Return empty data with success flag for Railway deployment
      return res.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          limit: parseInt(req.query.limit) || 100,
          offset: parseInt(req.query.offset) || 0,
          message: 'Renewal tracking not available on this deployment'
        }
      });
    }
    
    const {
      status = 'all', // 'all', 'upcoming', 'engaged', 'high_priority'
      months_ahead = 12,
      min_probability = 0,
      assigned_to,
      agency,
      limit = 100,
      offset = 0
    } = req.query;
    
    let query = `
      SELECT 
        r.*,
        CAST((julianday(r.contract_end_date) - julianday('now')) / 30 AS INTEGER) as months_until_expiry,
        CAST((julianday(r.predicted_rfp_date) - julianday('now')) AS INTEGER) as days_until_rfp,
        CASE 
          WHEN date(r.predicted_rfp_date) <= date('now') THEN 'overdue'
          WHEN date(r.predicted_rfp_date) <= date('now', '+30 days') THEN 'imminent'
          WHEN date(r.predicted_rfp_date) <= date('now', '+90 days') THEN 'approaching'
          ELSE 'future'
        END as urgency
      FROM contract_renewals r
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status !== 'all') {
      if (status === 'upcoming') {
        query += ` AND r.contract_end_date >= date('now') AND r.contract_end_date <= date('now', '+' || ? || ' months')`;
        params.push(months_ahead);
      } else if (status === 'engaged') {
        query += ` AND r.engagement_status IN ('initial_contact', 'relationship_building', 'rfp_published')`;
      } else if (status === 'high_priority') {
        query += ` AND r.renewal_probability >= 70 AND r.contract_end_date <= date('now', '+12 months')`;
      }
    }
    
    if (min_probability > 0) {
      query += ` AND r.renewal_probability >= ?`;
      params.push(min_probability);
    }
    
    if (assigned_to) {
      query += ` AND r.assigned_bd_manager = ?`;
      params.push(assigned_to);
    }
    
    if (agency) {
      query += ` AND r.agency = ?`;
      params.push(agency);
    }
    
    query += ` ORDER BY r.contract_end_date ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const renewals = db.prepare(query).all(...params);
    
    // Parse JSON fields
    renewals.forEach(r => {
      if (r.reasoning) r.reasoning = JSON.parse(r.reasoning);
      if (r.action_items) r.action_items = JSON.parse(r.action_items);
    });
    
    // Get counts
    const counts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN contract_end_date <= date('now', '+6 months') THEN 1 ELSE 0 END) as next_6_months,
        SUM(CASE WHEN engagement_status = 'not_started' THEN 1 ELSE 0 END) as not_started,
        SUM(CASE WHEN renewal_probability >= 70 THEN 1 ELSE 0 END) as high_probability
      FROM contract_renewals
      WHERE contract_end_date >= date('now')
    `).get();
    
    db.close();
    
    res.json({
      success: true,
      data: renewals,
      meta: {
        total: counts.total,
        next_6_months: counts.next_6_months,
        not_started: counts.not_started,
        high_probability: counts.high_probability,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching renewals:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/gebiz/renewals/:id - Get single renewal with full details
// ============================================================================
router.get('/:id', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_renewals'").get();
    if (!tableCheck) {
      db.close();
      return res.status(404).json({
        success: false,
        error: 'Renewal not found',
        message: 'Renewal tracking not available on this deployment'
      });
    }

    const renewal = db.prepare(`
      SELECT 
        r.*,
        CAST((julianday(r.contract_end_date) - julianday('now')) / 30 AS INTEGER) as months_until_expiry,
        CAST((julianday(r.predicted_rfp_date) - julianday('now')) AS INTEGER) as days_until_rfp,
        h.description as original_description,
        h.awarded_amount as original_value,
        h.award_date,
        h.category as original_category
      FROM contract_renewals r
      LEFT JOIN gebiz_historical_tenders h ON r.original_tender_id = h.id
      WHERE r.id = ?
    `).get(req.params.id);
    
    if (!renewal) {
      db.close();
      return res.status(404).json({ success: false, error: 'Renewal not found' });
    }
    
    // Parse JSON fields
    if (renewal.reasoning) renewal.reasoning = JSON.parse(renewal.reasoning);
    if (renewal.action_items) renewal.action_items = JSON.parse(renewal.action_items);
    
    // Get engagement activities
    const activities = db.prepare(`
      SELECT * FROM renewal_engagement_activities
      WHERE renewal_id = ?
      ORDER BY activity_date DESC
    `).all(req.params.id);
    
    // Parse JSON in activities
    activities.forEach(a => {
      if (a.participants) a.participants = JSON.parse(a.participants);
      if (a.attachments) a.attachments = JSON.parse(a.attachments);
    });
    
    // Get similar historical tenders
    const similarTenders = db.prepare(`
      SELECT * FROM gebiz_historical_tenders
      WHERE agency = ? 
        AND category = ?
        AND id != ?
      ORDER BY award_date DESC
      LIMIT 5
    `).all(renewal.agency, renewal.original_category, renewal.original_tender_id);
    
    db.close();
    
    res.json({
      success: true,
      data: {
        ...renewal,
        activities,
        similar_tenders: similarTenders
      }
    });
  } catch (error) {
    console.error('Error fetching renewal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/v1/gebiz/renewals - Create new renewal prediction
// ============================================================================
router.post('/', (req, res) => {
  try {
    const db = new Database(DB_PATH);

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_renewals'").get();
    if (!tableCheck) {
      db.close();
      return res.status(503).json({
        success: false,
        error: 'Renewal tracking not available on this deployment',
        message: 'The renewal system requires the GeBIZ intelligence database which is not available on Railway deployment'
      });
    }

    const {
      original_tender_id,
      original_tender_no,
      agency,
      contract_description,
      contract_value,
      incumbent_supplier,
      contract_end_date,
      predicted_rfp_date,
      renewal_probability = 50,
      confidence_score = 50,
      reasoning,
      assigned_bd_manager
    } = req.body;
    
    // Validate required fields
    if (!agency || !contract_end_date) {
      db.close();
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: agency, contract_end_date' 
      });
    }
    
    const id = uuidv4();
    
    // Calculate engagement windows
    const endDate = new Date(contract_end_date);
    const engagementStart = new Date(endDate);
    engagementStart.setMonth(engagementStart.getMonth() - 12);
    const engagementEnd = new Date(endDate);
    engagementEnd.setMonth(engagementEnd.getMonth() - 9);
    
    // Calculate predicted RFP date if not provided (6 months before contract end)
    let rfpDate = predicted_rfp_date;
    if (!rfpDate) {
      const predictedRfp = new Date(endDate);
      predictedRfp.setMonth(predictedRfp.getMonth() - 6);
      rfpDate = predictedRfp.toISOString().split('T')[0];
    }
    
    const stmt = db.prepare(`
      INSERT INTO contract_renewals (
        id, original_tender_id, original_tender_no, agency, contract_description,
        contract_value, incumbent_supplier, contract_end_date, predicted_rfp_date,
        predicted_renewal_date, renewal_probability, confidence_score, reasoning,
        engagement_window_start, engagement_window_end, assigned_bd_manager
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      original_tender_id || null,
      original_tender_no || null,
      agency,
      contract_description || null,
      contract_value || null,
      incumbent_supplier || null,
      contract_end_date,
      rfpDate,
      contract_end_date, // predicted_renewal_date same as contract_end_date
      renewal_probability,
      confidence_score,
      reasoning ? JSON.stringify(reasoning) : null,
      engagementStart.toISOString().split('T')[0],
      engagementEnd.toISOString().split('T')[0],
      assigned_bd_manager || null
    );
    
    const renewal = db.prepare('SELECT * FROM contract_renewals WHERE id = ?').get(id);
    
    db.close();
    
    res.status(201).json({
      success: true,
      data: renewal,
      message: 'Renewal prediction created successfully'
    });
  } catch (error) {
    console.error('Error creating renewal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PATCH /api/v1/gebiz/renewals/:id - Update renewal
// ============================================================================
router.patch('/:id', (req, res) => {
  try {
    const db = new Database(DB_PATH);

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_renewals'").get();
    if (!tableCheck) {
      db.close();
      return res.status(503).json({
        success: false,
        error: 'Renewal tracking not available on this deployment',
        message: 'The renewal system requires the GeBIZ intelligence database which is not available on Railway deployment'
      });
    }

    const allowedFields = [
      'engagement_status',
      'assigned_bd_manager',
      'assigned_bid_manager',
      'notes',
      'action_items',
      'next_action_date',
      'renewal_probability',
      'confidence_score',
      'reasoning',
      'contract_description',
      'contract_value',
      'incumbent_supplier'
    ];
    
    const updates = [];
    const params = [];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        
        // Stringify JSON fields
        if (['reasoning', 'action_items'].includes(field)) {
          params.push(JSON.stringify(req.body[field]));
        } else {
          params.push(req.body[field]);
        }
      }
    }
    
    if (updates.length === 0) {
      db.close();
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    
    const query = `UPDATE contract_renewals SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(query).run(...params);
    
    if (result.changes === 0) {
      db.close();
      return res.status(404).json({ success: false, error: 'Renewal not found' });
    }
    
    const renewal = db.prepare('SELECT * FROM contract_renewals WHERE id = ?').get(req.params.id);
    
    db.close();
    
    res.json({
      success: true,
      data: renewal,
      message: 'Renewal updated successfully'
    });
  } catch (error) {
    console.error('Error updating renewal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE /api/v1/gebiz/renewals/:id - Delete renewal
// ============================================================================
router.delete('/:id', (req, res) => {
  try {
    const db = new Database(DB_PATH);

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_renewals'").get();
    if (!tableCheck) {
      db.close();
      return res.status(503).json({
        success: false,
        error: 'Renewal tracking not available on this deployment',
        message: 'The renewal system requires the GeBIZ intelligence database which is not available on Railway deployment'
      });
    }

    // Delete activities first (foreign key)
    db.prepare('DELETE FROM renewal_engagement_activities WHERE renewal_id = ?').run(req.params.id);
    
    // Delete renewal
    const result = db.prepare('DELETE FROM contract_renewals WHERE id = ?').run(req.params.id);
    
    db.close();
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Renewal not found' });
    }
    
    res.json({
      success: true,
      message: 'Renewal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting renewal:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/v1/gebiz/renewals/:id/activities - Log engagement activity
// ============================================================================
router.post('/:id/activities', (req, res) => {
  try {
    const db = new Database(DB_PATH);

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='renewal_engagement_activities'").get();
    if (!tableCheck) {
      db.close();
      return res.status(503).json({
        success: false,
        error: 'Renewal tracking not available on this deployment',
        message: 'The renewal system requires the GeBIZ intelligence database which is not available on Railway deployment'
      });
    }

    const {
      activity_type,
      activity_date,
      activity_description,
      participants,
      conducted_by,
      outcome,
      next_steps,
      attachments
    } = req.body;
    
    if (!activity_type || !activity_date) {
      db.close();
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: activity_type, activity_date' 
      });
    }
    
    const activityId = uuidv4();
    
    db.prepare(`
      INSERT INTO renewal_engagement_activities (
        id, renewal_id, activity_type, activity_date, activity_description,
        participants, conducted_by, outcome, next_steps, attachments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      activityId,
      req.params.id,
      activity_type,
      activity_date,
      activity_description || null,
      participants ? JSON.stringify(participants) : null,
      conducted_by || null,
      outcome || null,
      next_steps || null,
      attachments ? JSON.stringify(attachments) : null
    );
    
    const activity = db.prepare('SELECT * FROM renewal_engagement_activities WHERE id = ?').get(activityId);
    
    // Parse JSON
    if (activity.participants) activity.participants = JSON.parse(activity.participants);
    if (activity.attachments) activity.attachments = JSON.parse(activity.attachments);
    
    db.close();
    
    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activity logged successfully'
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/gebiz/renewals/dashboard/timeline - Timeline visualization data
// ============================================================================
router.get('/dashboard/timeline', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_renewals'").get();
    if (!tableCheck) {
      db.close();
      return res.json({
        success: true,
        data: {
          timeline: []
        },
        message: 'Renewal tracking not available on this deployment'
      });
    }

    const { months = 12 } = req.query;
    
    const timeline = db.prepare(`
      SELECT 
        r.id,
        r.agency,
        r.contract_description,
        r.incumbent_supplier,
        r.contract_end_date,
        r.predicted_rfp_date,
        r.contract_value,
        r.renewal_probability,
        r.engagement_status,
        r.assigned_bd_manager,
        CAST((julianday(r.contract_end_date) - julianday('now')) / 30 AS INTEGER) as months_until_expiry,
        CAST((julianday(r.predicted_rfp_date) - julianday('now')) AS INTEGER) as days_until_rfp
      FROM contract_renewals r
      WHERE r.contract_end_date >= date('now')
        AND r.contract_end_date <= date('now', '+' || ? || ' months')
        AND r.engagement_status NOT IN ('lost', 'won')
      ORDER BY r.contract_end_date ASC
    `).all(months);
    
    // Group by month
    const grouped = {};
    timeline.forEach(item => {
      const month = item.contract_end_date.substring(0, 7); // YYYY-MM
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(item);
    });
    
    db.close();
    
    res.json({
      success: true,
      data: {
        timeline: Object.entries(grouped).map(([month, items]) => ({
          month,
          count: items.length,
          total_value: items.reduce((sum, item) => sum + (item.contract_value || 0), 0),
          avg_probability: Math.round(items.reduce((sum, item) => sum + item.renewal_probability, 0) / items.length),
          items
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/v1/gebiz/renewals/predict - Run renewal prediction algorithm
// ============================================================================
router.post('/predict', (req, res) => {
  try {
    const db = new Database(DB_PATH);

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_renewals'").get();
    if (!tableCheck) {
      db.close();
      return res.status(503).json({
        success: false,
        error: 'Renewal tracking not available on this deployment',
        message: 'The renewal system requires the GeBIZ intelligence database which is not available on Railway deployment'
      });
    }

    // Get all historical tenders with contract end dates approaching
    const candidates = db.prepare(`
      SELECT * FROM gebiz_historical_tenders
      WHERE contract_end_date IS NOT NULL
        AND contract_end_date >= date('now', '-6 months')
        AND contract_end_date <= date('now', '+18 months')
        AND tracking_status = 'approaching_renewal'
    `).all();
    
    let created = 0;
    let skipped = 0;
    const predictions = [];
    
    for (const tender of candidates) {
      // Check if renewal prediction already exists
      const existing = db.prepare(
        'SELECT id FROM contract_renewals WHERE original_tender_no = ?'
      ).get(tender.tender_no);
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Calculate renewal probability (simple algorithm for now)
      let probability = 50;
      const reasons = [];
      
      // High-value contracts more likely to renew
      if (tender.awarded_amount > 1000000) {
        probability += 25;
        reasons.push('High contract value (>$1M)');
      } else if (tender.awarded_amount > 500000) {
        probability += 15;
        reasons.push('Medium contract value (>$500K)');
      }
      
      // Government agencies have high renewal rates
      if (['MOH', 'MOE', 'MOM', 'MSF', 'MHA'].includes(tender.agency)) {
        probability += 20;
        reasons.push('High-renewal agency');
      }
      
      // If has renewal clause
      if (tender.has_renewal_clause) {
        probability += 30;
        reasons.push('Contract has renewal clause');
      }
      
      // BPO services are sticky
      if (tender.service_type === 'manpower_bpo') {
        probability += 10;
        reasons.push('BPO services have high retention');
      }
      
      // Cap at 95%
      probability = Math.min(probability, 95);
      
      // Create renewal prediction
      const id = uuidv4();
      const endDate = new Date(tender.contract_end_date);
      const rfpDate = new Date(endDate);
      rfpDate.setMonth(rfpDate.getMonth() - 6);
      
      const engagementStart = new Date(endDate);
      engagementStart.setMonth(engagementStart.getMonth() - 12);
      
      const engagementEnd = new Date(endDate);
      engagementEnd.setMonth(engagementEnd.getMonth() - 9);
      
      db.prepare(`
        INSERT INTO contract_renewals (
          id, original_tender_id, original_tender_no, agency, contract_description,
          contract_value, incumbent_supplier, contract_end_date, predicted_rfp_date,
          predicted_renewal_date, renewal_probability, confidence_score, reasoning,
          engagement_window_start, engagement_window_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        tender.id,
        tender.tender_no,
        tender.agency,
        tender.description,
        tender.awarded_amount,
        tender.supplier_name,
        tender.contract_end_date,
        rfpDate.toISOString().split('T')[0],
        tender.contract_end_date,
        probability,
        probability, // Use same as probability for now
        JSON.stringify({ reasons }),
        engagementStart.toISOString().split('T')[0],
        engagementEnd.toISOString().split('T')[0]
      );
      
      predictions.push({
        id,
        agency: tender.agency,
        description: tender.description,
        probability,
        contract_end_date: tender.contract_end_date
      });
      
      created++;
    }
    
    db.close();
    
    res.json({
      success: true,
      data: {
        candidates_evaluated: candidates.length,
        renewals_created: created,
        skipped_existing: skipped,
        predictions: predictions.slice(0, 10) // Return first 10
      },
      message: `Created ${created} new renewal predictions`
    });
  } catch (error) {
    console.error('Error running prediction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/gebiz/renewals/dashboard/stats - Dashboard statistics
// ============================================================================
router.get('/dashboard/stats', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });

    // Check if renewal tables exist (Railway compatibility)
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contract_renewals'").get();
    if (!tableCheck) {
      db.close();
      return res.json({
        success: true,
        data: {
          summary: {
            total_renewals: 0,
            next_3_months: 0,
            next_6_months: 0,
            high_probability: 0,
            not_started: 0,
            in_progress: 0,
            total_value: 0,
            avg_probability: 0
          },
          top_agencies: []
        },
        message: 'Renewal tracking not available on this deployment'
      });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_renewals,
        SUM(CASE WHEN contract_end_date <= date('now', '+3 months') THEN 1 ELSE 0 END) as next_3_months,
        SUM(CASE WHEN contract_end_date <= date('now', '+6 months') THEN 1 ELSE 0 END) as next_6_months,
        SUM(CASE WHEN renewal_probability >= 70 THEN 1 ELSE 0 END) as high_probability,
        SUM(CASE WHEN engagement_status = 'not_started' THEN 1 ELSE 0 END) as not_started,
        SUM(CASE WHEN engagement_status IN ('initial_contact', 'relationship_building') THEN 1 ELSE 0 END) as in_progress,
        SUM(contract_value) as total_value,
        AVG(renewal_probability) as avg_probability
      FROM contract_renewals
      WHERE contract_end_date >= date('now')
        AND engagement_status NOT IN ('lost', 'won')
    `).get();
    
    const byAgency = db.prepare(`
      SELECT 
        agency,
        COUNT(*) as count,
        SUM(contract_value) as total_value,
        AVG(renewal_probability) as avg_probability
      FROM contract_renewals
      WHERE contract_end_date >= date('now')
        AND engagement_status NOT IN ('lost', 'won')
      GROUP BY agency
      ORDER BY count DESC
      LIMIT 5
    `).all();
    
    db.close();
    
    res.json({
      success: true,
      data: {
        summary: stats,
        top_agencies: byAgency
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
