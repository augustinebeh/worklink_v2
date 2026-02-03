/**
 * SLM Chat API Routes
 *
 * Endpoints for SLM (Scheduling Language Model) chat settings and actions.
 * Mirrors the AI chat system but specifically for interview scheduling SLM.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');

// =====================================================
// SLM SETTINGS
// =====================================================

/**
 * GET /api/v1/slm-chat/settings
 * Get SLM chat settings
 */
router.get('/settings', (req, res) => {
  try {
    // Get SLM-specific settings from ai_settings table with slm_ prefix
    const rows = db.prepare(`
      SELECT key, value FROM ai_settings
      WHERE key LIKE 'slm_%'
    `).all();

    const settings = {};
    rows.forEach(row => {
      // Remove slm_ prefix for cleaner API
      const cleanKey = row.key.replace('slm_', '');
      if (row.value === 'true') settings[cleanKey] = true;
      else if (row.value === 'false') settings[cleanKey] = false;
      else if (!isNaN(parseFloat(row.value))) settings[cleanKey] = parseFloat(row.value);
      else settings[cleanKey] = row.value;
    });

    // Default SLM settings if none exist
    if (Object.keys(settings).length === 0) {
      settings.enabled = true;
      settings.default_mode = 'auto';
      settings.interview_scheduling_enabled = true;
      settings.max_context_messages = 10;
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/slm-chat/settings
 * Update SLM chat settings
 */
router.put('/settings', (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }

    // Add slm_ prefix to distinguish from AI settings
    const slmKey = `slm_${key}`;

    // Insert or update setting
    db.prepare(`
      INSERT INTO ai_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now')
    `).run(slmKey, String(value));

    res.json({ success: true, message: 'SLM setting updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// CONVERSATION SLM SETTINGS
// =====================================================

/**
 * GET /api/v1/slm-chat/conversations/:candidateId/mode
 * Get SLM mode for a specific conversation
 */
router.get('/conversations/:candidateId/mode', (req, res) => {
  try {
    // Check global SLM enabled status first
    const globalSettings = db.prepare(`
      SELECT value FROM ai_settings WHERE key = 'slm_enabled'
    `).get();

    if (globalSettings && globalSettings.value === 'false') {
      return res.json({ success: true, data: { mode: 'off' } });
    }

    // Check per-conversation override
    const conversationSettings = db.prepare(`
      SELECT mode FROM conversation_slm_settings WHERE candidate_id = ?
    `).get(req.params.candidateId);

    let mode = 'inherit';
    if (conversationSettings && conversationSettings.mode !== 'inherit') {
      mode = conversationSettings.mode;
    } else {
      // Get global default
      const defaultMode = db.prepare(`
        SELECT value FROM ai_settings WHERE key = 'slm_default_mode'
      `).get();
      mode = defaultMode?.value || 'auto';
    }

    res.json({ success: true, data: { mode } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/slm-chat/conversations/:candidateId/mode
 * Set SLM mode for a specific conversation
 */
router.put('/conversations/:candidateId/mode', (req, res) => {
  try {
    const { mode } = req.body;

    if (!['off', 'auto', 'interview_only', 'inherit'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'Mode must be: off, auto, interview_only, or inherit',
      });
    }

    // Insert or update conversation SLM settings
    db.prepare(`
      INSERT INTO conversation_slm_settings (candidate_id, mode, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(candidate_id) DO UPDATE SET
        mode = excluded.mode,
        updated_at = datetime('now')
    `).run(req.params.candidateId, mode);

    res.json({ success: true, message: 'SLM mode updated', data: { mode } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// SLM MANUAL ACTIONS
// =====================================================

/**
 * POST /api/v1/slm-chat/schedule-interview
 * Manually trigger SLM to schedule interview for a candidate
 */
router.post('/schedule-interview', async (req, res) => {
  try {
    const { candidateId, message } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required',
      });
    }

    // Load SLM scheduling bridge
    const SLMSchedulingBridge = require('../../../utils/slm-scheduling-bridge');
    const slmBridge = new SLMSchedulingBridge();

    const response = await slmBridge.handlePendingCandidateMessage(
      candidateId,
      message || 'schedule interview',
      { manualTrigger: true }
    );

    res.json({
      success: true,
      data: response,
      message: 'SLM interview scheduling initiated',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/slm-chat/generate
 * Manually generate an SLM response (for testing or on-demand)
 */
router.post('/generate', async (req, res) => {
  try {
    const { candidateId, message } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required',
      });
    }

    // Load SLM scheduling bridge
    const SLMSchedulingBridge = require('../../../utils/slm-scheduling-bridge');
    const slmBridge = new SLMSchedulingBridge();

    const response = await slmBridge.integrateWithChatSLM(candidateId, message, {
      mode: 'manual',
    });

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// SMART SLM ROUTING WITH STATUS CLASSIFICATION
// =====================================================

/**
 * POST /api/v1/slm-chat/smart-route
 * Route SLM response based on worker status classification
 */
router.post('/smart-route', async (req, res) => {
  try {
    const { candidateId, message, conversationContext } = req.body;

    if (!candidateId || !message) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and message are required',
      });
    }

    // Load Smart SLM Router
    const SmartSLMRouter = require('../../../utils/smart-slm-router');
    const router = new SmartSLMRouter();

    const response = await router.routeSLMResponse(
      candidateId,
      message,
      conversationContext || {}
    );

    res.json({
      success: true,
      data: response,
      message: 'SLM routing completed successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/slm-chat/worker-status/:candidateId
 * Get worker status classification and routing info
 */
router.get('/worker-status/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const WorkerStatusClassifier = require('../../../utils/worker-status-classifier');
    const classifier = new WorkerStatusClassifier();

    const routingInfo = await classifier.getSLMRoutingInfo(candidateId);

    res.json({
      success: true,
      data: routingInfo,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/slm-chat/worker-status/:candidateId
 * Manually override worker status (admin only)
 */
router.put('/worker-status/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { newStatus, reason, adminId } = req.body;

    if (!newStatus) {
      return res.status(400).json({
        success: false,
        error: 'newStatus is required',
      });
    }

    const WorkerStatusClassifier = require('../../../utils/worker-status-classifier');
    const classifier = new WorkerStatusClassifier();

    const result = await classifier.manualStatusOverride(
      candidateId,
      newStatus,
      adminId || 'api_admin',
      reason || 'Manual override via API'
    );

    res.json({
      success: true,
      data: result,
      message: 'Worker status updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/slm-chat/batch-classify
 * Batch classify worker statuses
 */
router.get('/batch-classify', async (req, res) => {
  try {
    const { candidateIds } = req.query;
    const ids = candidateIds ? candidateIds.split(',') : [];

    const WorkerStatusClassifier = require('../../../utils/worker-status-classifier');
    const classifier = new WorkerStatusClassifier();

    const results = await classifier.batchClassifyWorkers(ids);

    res.json({
      success: true,
      data: results,
      message: 'Batch classification completed',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// SLM STATUS AND MONITORING (ENHANCED)
// =====================================================

/**
 * GET /api/v1/slm-chat/status
 * Get SLM system status and statistics (enhanced with worker status)
 */
router.get('/status', async (req, res) => {
  try {
    const stats = {
      // Legacy counts
      pendingCandidates: db.prepare(`
        SELECT COUNT(*) as count FROM candidates WHERE status = 'pending'
      `).get().count,

      // Enhanced worker status counts
      workerStatus: {
        pending: 0,
        active: 0,
        inactive: 0,
        suspended: 0
      },

      // Interview scheduling stats
      scheduledInterviews: 0,
      inQueue: 0,
    };

    try {
      // Get worker status distribution
      const WorkerStatusClassifier = require('../../../utils/worker-status-classifier');
      const classifier = new WorkerStatusClassifier();
      const statusStats = await classifier.getStatusStatistics();
      stats.workerStatus = statusStats.summary;
      stats.totalWorkers = statusStats.total;
    } catch (e) {
      console.log('Worker status stats unavailable:', e.message);
    }

    try {
      stats.scheduledInterviews = db.prepare(`
        SELECT COUNT(*) as count FROM interview_slots
        WHERE status IN ('scheduled', 'confirmed')
      `).get().count;
    } catch (e) {
      // Table doesn't exist yet
    }

    try {
      stats.inQueue = db.prepare(`
        SELECT COUNT(*) as count FROM interview_queue
        WHERE queue_status = 'waiting'
      `).get().count;
    } catch (e) {
      // Table doesn't exist yet
    }

    // Add system health check
    try {
      const SmartSLMRouter = require('../../../utils/smart-slm-router');
      const router = new SmartSLMRouter();
      const health = await router.performHealthCheck();
      stats.systemHealth = health;
    } catch (e) {
      stats.systemHealth = { status: 'unavailable', error: e.message };
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;