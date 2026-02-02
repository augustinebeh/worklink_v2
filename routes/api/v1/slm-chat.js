/**
 * SLM Chat API Routes
 *
 * Endpoints for SLM (Scheduling Language Model) chat settings and actions.
 * Mirrors the AI chat system but specifically for interview scheduling SLM.
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

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
// SLM STATUS AND MONITORING
// =====================================================

/**
 * GET /api/v1/slm-chat/status
 * Get SLM system status and statistics
 */
router.get('/status', (req, res) => {
  try {
    const stats = {
      // Count pending candidates
      pendingCandidates: db.prepare(`
        SELECT COUNT(*) as count FROM candidates WHERE status = 'pending'
      `).get().count,

      // Count scheduled interviews (if interview_slots table exists)
      scheduledInterviews: 0,

      // Count candidates in interview queue (if interview_queue table exists)
      inQueue: 0,
    };

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

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;