/**
 * Follow-up Sequences Routes - Automated follow-up workflows
 * Manage and execute automated follow-up sequences for candidates
 * 
 * @module ai-automation/follow-up/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');

// Import follow-up system utilities
const {
  createFollowUpSequence,
  triggerFollowUpSequence,
  processFollowUpActions,
  initializeDefaultSequences,
  autoTriggerSequences,
} = require('../../../../../utils/follow-up-automation');

/**
 * POST /sequences
 * Create a new follow-up sequence
 */
router.post('/sequences', (req, res) => {
  try {
    const sequenceData = req.body;

    if (!sequenceData.name || !sequenceData.triggerType || !sequenceData.steps) {
      return res.status(400).json({
        success: false,
        error: 'name, triggerType, and steps are required'
      });
    }

    const result = createFollowUpSequence(sequenceData);

    res.json({
      success: true,
      message: 'Follow-up sequence created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating follow-up sequence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sequences
 * Get all follow-up sequences
 */
router.get('/sequences', (req, res) => {
  try {
    const { active = 'true' } = req.query;

    let whereClause = '';
    const params = [];

    if (active !== 'all') {
      whereClause = 'WHERE active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    const sequences = db.prepare(`
      SELECT id, name, description, trigger_type, active, created_at,
             (SELECT COUNT(*) FROM follow_up_instances WHERE sequence_id = follow_up_sequences.id) as total_instances
      FROM follow_up_sequences
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params);

    res.json({
      success: true,
      data: { sequences }
    });
  } catch (error) {
    console.error('Error getting follow-up sequences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /sequences/:sequenceId
 * Get specific follow-up sequence details
 */
router.get('/sequences/:sequenceId', (req, res) => {
  try {
    const sequence = db.prepare('SELECT * FROM follow_up_sequences WHERE id = ?').get(req.params.sequenceId);

    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Sequence not found'
      });
    }

    // Parse JSON fields
    sequence.trigger_conditions = JSON.parse(sequence.trigger_conditions || '{}');
    sequence.sequence_data = JSON.parse(sequence.sequence_data || '[]');

    // Get instance statistics
    const instanceStats = db.prepare(`
      SELECT
        COUNT(*) as total_instances,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_instances,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_instances,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_instances
      FROM follow_up_instances
      WHERE sequence_id = ?
    `).get(req.params.sequenceId);

    res.json({
      success: true,
      data: {
        sequence,
        stats: instanceStats
      }
    });
  } catch (error) {
    console.error('Error getting sequence details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /trigger
 * Trigger a follow-up sequence for a candidate
 */
router.post('/trigger', (req, res) => {
  try {
    const { candidateId, sequenceId, triggerEvent, triggerData = {} } = req.body;

    if (!candidateId || !sequenceId || !triggerEvent) {
      return res.status(400).json({
        success: false,
        error: 'candidateId, sequenceId, and triggerEvent are required'
      });
    }

    const result = triggerFollowUpSequence(candidateId, sequenceId, triggerEvent, triggerData);

    res.json({
      success: true,
      message: result.status === 'already_active' ? 'Candidate already has active sequence' : 'Follow-up sequence triggered',
      data: result
    });
  } catch (error) {
    console.error('Error triggering follow-up sequence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /process
 * Process pending follow-up actions
 */
router.post('/process', async (req, res) => {
  try {
    const result = await processFollowUpActions();

    res.json({
      success: true,
      message: `Processed ${result.processed} follow-up actions`,
      data: result
    });
  } catch (error) {
    console.error('Error processing follow-up actions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /candidate/:candidateId
 * Get follow-up instances for a candidate
 */
router.get('/candidate/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { status = 'all' } = req.query;

    let whereClause = 'WHERE fi.candidate_id = ?';
    const params = [candidateId];

    if (status !== 'all') {
      whereClause += ' AND fi.status = ?';
      params.push(status);
    }

    const instances = db.prepare(`
      SELECT fi.*, fs.name as sequence_name, fs.trigger_type
      FROM follow_up_instances fi
      JOIN follow_up_sequences fs ON fi.sequence_id = fs.id
      ${whereClause}
      ORDER BY fi.created_at DESC
    `).all(...params);

    // Parse JSON fields
    instances.forEach(instance => {
      instance.trigger_data = JSON.parse(instance.trigger_data || '{}');
      instance.completed_steps = JSON.parse(instance.completed_steps || '[]');
    });

    res.json({
      success: true,
      data: { instances }
    });
  } catch (error) {
    console.error('Error getting candidate follow-ups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /instances/:instanceId/cancel
 * Cancel a follow-up instance
 */
router.post('/instances/:instanceId/cancel', (req, res) => {
  try {
    const { instanceId } = req.params;
    const { reason = 'Manual cancellation' } = req.body;

    const result = db.prepare(`
      UPDATE follow_up_instances
      SET status = 'cancelled', updated_at = datetime('now')
      WHERE id = ? AND status = 'active'
    `).run(instanceId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Active instance not found'
      });
    }

    res.json({
      success: true,
      message: 'Follow-up instance cancelled',
      data: { instanceId, reason }
    });
  } catch (error) {
    console.error('Error cancelling follow-up instance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /stats
 * Get follow-up system statistics
 */
router.get('/stats', (req, res) => {
  try {
    const { days = '30' } = req.query;

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_sequences,
        COUNT(CASE WHEN active = 1 THEN 1 END) as active_sequences,
        (SELECT COUNT(*) FROM follow_up_instances WHERE created_at >= datetime('now', '-' || ? || ' days')) as total_instances,
        (SELECT COUNT(*) FROM follow_up_instances WHERE status = 'active') as active_instances,
        (SELECT COUNT(*) FROM follow_up_instances WHERE status = 'completed' AND created_at >= datetime('now', '-' || ? || ' days')) as completed_instances
      FROM follow_up_sequences
    `).get(parseInt(days), parseInt(days));

    res.json({
      success: true,
      data: {
        ...stats,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Error getting follow-up stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /initialize-defaults
 * Initialize default follow-up sequences
 */
router.post('/initialize-defaults', (req, res) => {
  try {
    const result = initializeDefaultSequences();

    res.json({
      success: true,
      message: 'Default sequences initialized',
      data: result
    });
  } catch (error) {
    console.error('Error initializing default sequences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /auto-trigger
 * Auto-trigger sequences based on recent activity
 */
router.post('/auto-trigger', (req, res) => {
  try {
    const { lookbackHours = 24 } = req.body;

    const result = autoTriggerSequences({ lookbackHours: parseInt(lookbackHours) });

    res.json({
      success: true,
      message: `Auto-triggered ${result.triggered} sequences`,
      data: result
    });
  } catch (error) {
    console.error('Error auto-triggering sequences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /config
 * Get follow-up system configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      availableTriggers: [
        'job_application',
        'job_completion',
        'no_response',
        'inactive_candidate',
        'job_rejection',
        'positive_feedback'
      ],
      defaultDelayMinutes: 60,
      maxActiveSequencesPerCandidate: 3,
      allowedChannels: ['whatsapp', 'email', 'sms']
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
