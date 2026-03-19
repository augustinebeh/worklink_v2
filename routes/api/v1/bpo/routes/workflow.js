/**
 * BPO Workflow Routes
 * Execute unified workflow actions across BPO systems
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');

/**
 * POST /api/v1/bpo/workflow
 * Execute unified workflow actions across BPO systems
 * Handles tender status updates + campaign triggers + client notifications
 */
router.post('/', (req, res) => {
  try {
    const { action, tender_id, params = {} } = req.body;

    if (!action || !tender_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, tender_id'
      });
    }

    const transaction = db.transaction(() => {
      let result = {};

      switch (action) {
        case 'promote_to_bidding':
          result = promoteTenderToBidding(tender_id, params);
          break;

        case 'start_sourcing_campaign':
          result = startSourcingCampaign(tender_id, params);
          break;

        case 'assign_to_client':
          result = assignTenderToClient(tender_id, params.client_id, params);
          break;

        case 'trigger_ai_analysis':
          result = triggerAIAnalysis(tender_id, params);
          break;

        case 'create_monitoring_alert':
          result = createMonitoringAlert(tender_id, params);
          break;

        case 'bulk_update_status':
          result = bulkUpdateTenderStatus(params.tender_ids, params.new_status);
          break;

        default:
          throw new Error(`Unknown workflow action: ${action}`);
      }

      return result;
    });

    const workflowResult = transaction();

    res.json({
      success: true,
      action,
      result: workflowResult,
      executedAt: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Workflow execution failed',
      details: 'Internal server error'
    });
  }
});

// Workflow helper functions
function promoteTenderToBidding(tender_id, params) {
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tender_id);
  if (!tender) {
    throw new Error(`Tender ${tender_id} not found`);
  }

  db.prepare(`
    UPDATE tenders
    SET status = 'bidding',
        our_bid_amount = ?,
        notes = COALESCE(notes, '') || ? || char(10),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    params.bid_amount || null,
    `Promoted to bidding: ${params.reason || 'No reason specified'}`,
    tender_id
  );

  return { success: true, action: 'promoted_to_bidding', tender_id };
}

function startSourcingCampaign(tender_id, params) {
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tender_id);
  if (!tender) {
    throw new Error(`Tender ${tender_id} not found`);
  }

  const campaign_id = `ORC_${Date.now()}_${tender_id.slice(-8)}`;

  db.prepare(`
    INSERT INTO outreach_campaigns (
      id, job_id, name, type, status, priority,
      candidates_targeted, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    campaign_id,
    tender_id,
    `Sourcing Campaign for ${tender.title}`,
    'job_invitation',
    'active',
    params.priority || 'medium',
    params.target_count || 50
  );

  return { success: true, action: 'sourcing_campaign_created', campaign_id, tender_id };
}

function assignTenderToClient(tender_id, client_id, params) {
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tender_id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);

  if (!tender || !client) {
    throw new Error('Tender or client not found');
  }

  db.prepare(`
    UPDATE tenders
    SET assigned_to = ?,
        notes = COALESCE(notes, '') || ? || char(10),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    client_id,
    `Assigned to client: ${client.company_name} (${params.reason || 'Manual assignment'})`,
    tender_id
  );

  return { success: true, action: 'assigned_to_client', tender_id, client_id };
}

function triggerAIAnalysis(tender_id, params) {
  db.prepare(`
    UPDATE tenders
    SET notes = COALESCE(notes, '') || ? || char(10),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(
    `AI analysis requested: ${new Date().toISOString()}`,
    tender_id
  );

  return { success: true, action: 'ai_analysis_triggered', tender_id };
}

function createMonitoringAlert(tender_id, params) {
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tender_id);
  if (!tender) {
    throw new Error(`Tender ${tender_id} not found`);
  }

  const keywords = params.keywords || tender.title.split(' ').filter(word => word.length > 3).slice(0, 3);

  let alertIds = [];

  keywords.forEach(keyword => {
    const existing = db.prepare('SELECT id FROM tender_alerts WHERE keyword = ?').get(keyword.toLowerCase());

    if (!existing) {
      const result = db.prepare(`
        INSERT INTO tender_alerts (keyword, source, email_notify, active, created_at)
        VALUES (?, 'all', 1, 1, datetime('now'))
      `).run(keyword.toLowerCase());

      alertIds.push(result.lastInsertRowid);
    }
  });

  return { success: true, action: 'monitoring_alerts_created', alertIds, keywords };
}

function bulkUpdateTenderStatus(tender_ids, new_status) {
  if (!Array.isArray(tender_ids) || tender_ids.length === 0) {
    throw new Error('tender_ids must be a non-empty array');
  }

  const placeholders = tender_ids.map(() => '?').join(',');
  const updated = db.prepare(`
    UPDATE tenders
    SET status = ?, updated_at = datetime('now')
    WHERE id IN (${placeholders})
  `).run(new_status, ...tender_ids);

  return { success: true, action: 'bulk_status_update', updated_count: updated.changes };
}

module.exports = router;
