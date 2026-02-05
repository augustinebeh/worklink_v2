/**
 * 📋 BPO TENDER LIFECYCLE API
 * Complete tender pipeline management from discovery to award
 * 7 Stages: Renewal Watch → New → Review → Bidding → Approval → Submitted → Decided
 */

const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '../../../../database/gebiz_intelligence.db');

// ============================================================================
// GET /api/v1/bpo/lifecycle - List all tenders in pipeline
// ============================================================================
router.get('/', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    const {
      stage,
      priority,
      agency,
      assigned_to,
      is_urgent,
      is_renewal,
      limit = 100,
      offset = 0
    } = req.query;
    
    let query = 'SELECT * FROM bpo_tender_lifecycle WHERE 1=1';
    const params = [];
    
    if (stage) {
      query += ' AND stage = ?';
      params.push(stage);
    }
    
    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }
    
    if (agency) {
      query += ' AND agency = ?';
      params.push(agency);
    }
    
    if (assigned_to) {
      query += ' AND assigned_to = ?';
      params.push(assigned_to);
    }
    
    if (is_urgent) {
      query += ' AND is_urgent = ?';
      params.push(is_urgent === 'true' ? 1 : 0);
    }
    
    if (is_renewal) {
      query += ' AND is_renewal = ?';
      params.push(is_renewal === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY stage_updated_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const tenders = db.prepare(query).all(...params);
    
    // Parse JSON fields
    tenders.forEach(t => {
      if (t.qualification_details) t.qualification_details = JSON.parse(t.qualification_details);
      if (t.assigned_team) t.assigned_team = JSON.parse(t.assigned_team);
      if (t.documents) t.documents = JSON.parse(t.documents);
      if (t.tags) t.tags = JSON.parse(t.tags);
    });
    
    db.close();
    
    res.json({
      success: true,
      data: tenders,
      meta: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching tenders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/bpo/lifecycle/:id - Get single tender
// ============================================================================
router.get('/:id', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    const tender = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(req.params.id);
    
    if (!tender) {
      db.close();
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }
    
    // Parse JSON fields
    if (tender.qualification_details) tender.qualification_details = JSON.parse(tender.qualification_details);
    if (tender.assigned_team) tender.assigned_team = JSON.parse(tender.assigned_team);
    if (tender.documents) tender.documents = JSON.parse(tender.documents);
    if (tender.tags) tender.tags = JSON.parse(tender.tags);
    
    // If this is a renewal, get renewal details
    if (tender.is_renewal && tender.renewal_id) {
      const renewal = db.prepare('SELECT * FROM contract_renewals WHERE id = ?').get(tender.renewal_id);
      tender.renewal_details = renewal;
    }
    
    db.close();
    
    res.json({
      success: true,
      data: tender
    });
  } catch (error) {
    console.error('Error fetching tender:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/v1/bpo/lifecycle - Create new tender card
// ============================================================================
router.post('/', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    
    const {
      source_type,
      source_id,
      tender_no,
      title,
      agency,
      description,
      category,
      published_date,
      closing_date,
      contract_start_date,
      contract_end_date,
      estimated_value,
      stage = 'new_opportunity',
      priority = 'medium',
      is_urgent = false,
      is_renewal = false,
      renewal_id,
      incumbent_supplier,
      external_url,
      assigned_to
    } = req.body;
    
    if (!title || !agency) {
      db.close();
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, agency' 
      });
    }
    
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO bpo_tender_lifecycle (
        id, source_type, source_id, tender_no, title, agency, description, category,
        published_date, closing_date, contract_start_date, contract_end_date,
        estimated_value, stage, priority, is_urgent, is_renewal, renewal_id,
        incumbent_supplier, external_url, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      source_type || 'manual_entry',
      source_id || null,
      tender_no || null,
      title,
      agency,
      description || null,
      category || null,
      published_date || null,
      closing_date || null,
      contract_start_date || null,
      contract_end_date || null,
      estimated_value || null,
      stage,
      priority,
      is_urgent ? 1 : 0,
      is_renewal ? 1 : 0,
      renewal_id || null,
      incumbent_supplier || null,
      external_url || null,
      assigned_to || null
    );
    
    const tender = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(id);
    
    db.close();
    
    res.status(201).json({
      success: true,
      data: tender,
      message: 'Tender created successfully'
    });
  } catch (error) {
    console.error('Error creating tender:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// PATCH /api/v1/bpo/lifecycle/:id - Update tender
// ============================================================================
router.patch('/:id', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    
    const updates = [];
    const params = [];
    
    const allowedFields = [
      'title', 'agency', 'description', 'category', 'closing_date',
      'estimated_value', 'our_bid_amount', 'estimated_cost', 'estimated_margin',
      'stage', 'priority', 'is_urgent', 'is_featured', 'assigned_to',
      'assigned_team', 'qualification_score', 'qualification_details',
      'decision', 'decision_reasoning', 'notes', 'tags', 'documents'
    ];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        
        // Stringify JSON fields
        if (['assigned_team', 'qualification_details', 'tags', 'documents'].includes(field)) {
          params.push(JSON.stringify(req.body[field]));
        } else if (['is_urgent', 'is_featured'].includes(field)) {
          params.push(req.body[field] ? 1 : 0);
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
    
    const result = db.prepare(`UPDATE bpo_tender_lifecycle SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    
    if (result.changes === 0) {
      db.close();
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }
    
    const tender = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(req.params.id);
    
    db.close();
    
    res.json({
      success: true,
      data: tender,
      message: 'Tender updated successfully'
    });
  } catch (error) {
    console.error('Error updating tender:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/v1/bpo/lifecycle/renewal/:renewalId/move - Move renewal to opportunity
// ============================================================================
router.post('/renewal/:renewalId/move', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const renewalId = req.params.renewalId;

    // Get renewal details
    const renewal = db.prepare('SELECT * FROM contract_renewals WHERE id = ?').get(renewalId);

    if (!renewal) {
      db.close();
      return res.status(404).json({ success: false, error: 'Renewal not found' });
    }

    // Create tender from renewal
    const tenderId = uuidv4();

    db.prepare(`
      INSERT INTO bpo_tender_lifecycle (
        id, source_type, source_id, title, agency, description, category,
        estimated_value, stage, priority, is_renewal, renewal_id,
        incumbent_supplier, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenderId,
      'renewal_watch',
      renewalId,
      renewal.title || `${renewal.agency} - ${renewal.service_category}`,
      renewal.agency,
      `Renewal opportunity from contract expiring ${renewal.contract_end_date}`,
      renewal.service_category,
      renewal.estimated_value,
      'new_opportunity',
      'medium',
      1, // is_renewal = true
      renewalId,
      renewal.current_supplier,
      renewal.assigned_bd_manager
    );

    // Update renewal engagement status
    db.prepare(`
      UPDATE contract_renewals
      SET engagement_status = 'active',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(renewalId);

    const tender = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(tenderId);

    db.close();

    res.json({
      success: true,
      data: tender,
      message: 'Renewal moved to pipeline successfully'
    });
  } catch (error) {
    console.error('Error moving renewal to pipeline:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/v1/bpo/lifecycle/:id/move - Move tender to different stage
// ============================================================================
router.post('/:id/move', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    
    const { new_stage, user_id } = req.body;
    
    if (!new_stage) {
      db.close();
      return res.status(400).json({ success: false, error: 'new_stage required' });
    }
    
    const validStages = [
      'renewal_watch',
      'new_opportunity',
      'review',
      'bidding',
      'internal_approval',
      'submitted',
      'awarded',
      'lost'
    ];
    
    if (!validStages.includes(new_stage)) {
      db.close();
      return res.status(400).json({ success: false, error: 'Invalid stage' });
    }
    
    const result = db.prepare(`
      UPDATE bpo_tender_lifecycle 
      SET stage = ?,
          stage_updated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(new_stage, req.params.id);
    
    if (result.changes === 0) {
      db.close();
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }
    
    const tender = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(req.params.id);
    
    // Log audit trail
    db.prepare(`
      INSERT INTO audit_log (id, event_type, event_action, resource_type, resource_id, user_id, new_value)
      VALUES (?, 'stage_changed', 'update', 'tender', ?, ?, ?)
    `).run(uuidv4(), req.params.id, user_id || 'unknown', JSON.stringify({ new_stage }));
    
    db.close();
    
    res.json({
      success: true,
      data: tender,
      message: `Tender moved to ${new_stage}`
    });
  } catch (error) {
    console.error('Error moving tender:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// POST /api/v1/bpo/lifecycle/:id/decision - Record Go/No-Go decision
// ============================================================================
router.post('/:id/decision', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    
    const {
      decision, // 'go', 'no-go', 'maybe'
      decision_reasoning,
      qualification_score,
      qualification_details,
      user_id
    } = req.body;
    
    if (!decision) {
      db.close();
      return res.status(400).json({ success: false, error: 'decision required' });
    }
    
    const result = db.prepare(`
      UPDATE bpo_tender_lifecycle 
      SET decision = ?,
          decision_reasoning = ?,
          decision_made_at = CURRENT_TIMESTAMP,
          decision_made_by = ?,
          qualification_score = ?,
          qualification_details = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      decision,
      decision_reasoning || null,
      user_id || 'unknown',
      qualification_score || null,
      qualification_details ? JSON.stringify(qualification_details) : null,
      req.params.id
    );
    
    if (result.changes === 0) {
      db.close();
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }
    
    // If decision is 'no-go', move to lost
    if (decision === 'no-go') {
      db.prepare(`
        UPDATE bpo_tender_lifecycle 
        SET stage = 'lost',
            outcome = 'lost',
            outcome_date = date('now'),
            loss_reason = ?
        WHERE id = ?
      `).run(decision_reasoning || 'No-go decision', req.params.id);
    }
    
    const tender = db.prepare('SELECT * FROM bpo_tender_lifecycle WHERE id = ?').get(req.params.id);
    
    db.close();
    
    res.json({
      success: true,
      data: tender,
      message: 'Decision recorded successfully'
    });
  } catch (error) {
    console.error('Error recording decision:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/bpo/lifecycle/stats - Pipeline statistics
// ============================================================================
router.get('/dashboard/stats', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    // Overall stats
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_tenders,
        SUM(CASE WHEN stage = 'renewal_watch' THEN 1 ELSE 0 END) as renewal_watch,
        SUM(CASE WHEN stage = 'new_opportunity' THEN 1 ELSE 0 END) as new_opportunity,
        SUM(CASE WHEN stage = 'review' THEN 1 ELSE 0 END) as review,
        SUM(CASE WHEN stage = 'bidding' THEN 1 ELSE 0 END) as bidding,
        SUM(CASE WHEN stage = 'internal_approval' THEN 1 ELSE 0 END) as internal_approval,
        SUM(CASE WHEN stage = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END) as won,
        SUM(CASE WHEN outcome = 'lost' THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN is_urgent = 1 THEN 1 ELSE 0 END) as urgent,
        SUM(CASE WHEN is_renewal = 1 THEN 1 ELSE 0 END) as renewals,
        SUM(estimated_value) as total_pipeline_value,
        SUM(CASE WHEN outcome = 'won' THEN actual_contract_value ELSE 0 END) as total_won_value
      FROM bpo_tender_lifecycle
    `).get();
    
    // Win rate calculation
    const winLossCount = stats.won + stats.lost;
    const winRate = winLossCount > 0 ? Math.round((stats.won / winLossCount) * 100) : 0;
    
    // Closing soon
    const closingSoon = db.prepare(`
      SELECT COUNT(*) as count
      FROM bpo_tender_lifecycle
      WHERE closing_date IS NOT NULL
        AND closing_date >= date('now')
        AND closing_date <= date('now', '+7 days')
        AND stage NOT IN ('submitted', 'awarded', 'lost')
    `).get();
    
    db.close();
    
    res.json({
      success: true,
      data: {
        ...stats,
        win_rate: winRate,
        closing_soon: closingSoon.count
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// GET /api/v1/bpo/lifecycle/deadlines - Get tenders closing soon
// ============================================================================
router.get('/dashboard/deadlines', (req, res) => {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    
    const { days = 7 } = req.query;
    
    const deadlines = db.prepare(`
      SELECT 
        *,
        CAST((julianday(closing_date) - julianday('now')) AS INTEGER) as days_until_close
      FROM bpo_tender_lifecycle
      WHERE closing_date IS NOT NULL
        AND closing_date >= date('now')
        AND closing_date <= date('now', '+' || ? || ' days')
        AND stage NOT IN ('submitted', 'awarded', 'lost')
      ORDER BY closing_date ASC
    `).all(days);
    
    db.close();
    
    res.json({
      success: true,
      data: deadlines
    });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DELETE /api/v1/bpo/lifecycle/:id - Delete tender
// ============================================================================
router.delete('/:id', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    
    const result = db.prepare('DELETE FROM bpo_tender_lifecycle WHERE id = ?').run(req.params.id);
    
    db.close();
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }
    
    res.json({
      success: true,
      message: 'Tender deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tender:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
