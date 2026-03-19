/**
 * Follow-up Sequences Routes - Automated follow-up workflows
 * Manage and execute automated follow-up sequences for candidates
 * 
 * @module ai-automation/follow-up/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');
const { authenticateAdmin } = require('../../../../../middleware/auth');
const logger = createLogger('follow-up');

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
router.post('/sequences', authenticateAdmin, (req, res) => {
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
    logger.error('Error creating follow-up sequence', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /sequences
 * Get all follow-up sequences
 */
router.get('/sequences', authenticateAdmin, (req, res) => {
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
    logger.error('Error getting follow-up sequences', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /sequences/:sequenceId
 * Get specific follow-up sequence details
 */
router.get('/sequences/:sequenceId', authenticateAdmin, (req, res) => {
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
    logger.error('Error getting sequence details', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /trigger
 * Trigger a follow-up sequence for a candidate
 */
router.post('/trigger', authenticateAdmin, (req, res) => {
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
    logger.error('Error triggering follow-up sequence', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /process
 * Process pending follow-up actions
 */
router.post('/process', authenticateAdmin, async (req, res) => {
  try {
    const result = await processFollowUpActions();

    res.json({
      success: true,
      message: `Processed ${result.processed} follow-up actions`,
      data: result
    });
  } catch (error) {
    logger.error('Error processing follow-up actions', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /candidate/:candidateId
 * Get follow-up instances for a candidate
 */
router.get('/candidate/:candidateId', authenticateAdmin, (req, res) => {
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
    logger.error('Error getting candidate follow-ups', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /instances/:instanceId/cancel
 * Cancel a follow-up instance
 */
router.post('/instances/:instanceId/cancel', authenticateAdmin, (req, res) => {
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
    logger.error('Error cancelling follow-up instance', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /stats
 * Get follow-up system statistics
 */
router.get('/stats', authenticateAdmin, (req, res) => {
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
    logger.error('Error getting follow-up stats', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /initialize-defaults
 * Initialize default follow-up sequences
 */
router.post('/initialize-defaults', authenticateAdmin, (req, res) => {
  try {
    const result = initializeDefaultSequences();

    res.json({
      success: true,
      message: 'Default sequences initialized',
      data: result
    });
  } catch (error) {
    logger.error('Error initializing default sequences', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /auto-trigger
 * Auto-trigger sequences based on recent activity
 */
router.post('/auto-trigger', authenticateAdmin, (req, res) => {
  try {
    const { lookbackHours = 24 } = req.body;

    const result = autoTriggerSequences({ lookbackHours: parseInt(lookbackHours) });

    res.json({
      success: true,
      message: `Auto-triggered ${result.triggered} sequences`,
      data: result
    });
  } catch (error) {
    logger.error('Error auto-triggering sequences', { error: error.message });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /config
 * Get follow-up system configuration
 */
router.get('/config', authenticateAdmin, (req, res) => {
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
