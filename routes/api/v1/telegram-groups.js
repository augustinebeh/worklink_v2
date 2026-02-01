/**
 * Telegram Groups API Routes
 *
 * Endpoints for managing Telegram groups and job posting.
 */

const express = require('express');
const router = express.Router();
const telegramPosting = require('../../../services/telegram-posting');
const { db } = require('../../../db/database');

// =====================================================
// GROUPS MANAGEMENT
// =====================================================

/**
 * GET /api/v1/telegram-groups
 * Get all Telegram groups
 */
router.get('/', (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const groups = telegramPosting.getGroups(activeOnly === 'true');

    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/telegram-groups
 * Add a new Telegram group
 */
router.post('/', (req, res) => {
  try {
    const { chatId, name, type = 'job_posting' } = req.body;

    if (!chatId || !name) {
      return res.status(400).json({
        success: false,
        error: 'chatId and name are required',
      });
    }

    const id = telegramPosting.addGroup(chatId, name, type);

    res.json({
      success: true,
      data: { id },
      message: 'Group added successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/telegram-groups/:id
 * Update a Telegram group
 */
router.put('/:id', (req, res) => {
  try {
    const { name, active, type } = req.body;

    telegramPosting.updateGroup(req.params.id, { name, active, type });

    res.json({ success: true, message: 'Group updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/telegram-groups/:id
 * Delete a Telegram group
 */
router.delete('/:id', (req, res) => {
  try {
    telegramPosting.removeGroup(req.params.id);
    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// POSTING SETTINGS
// =====================================================

/**
 * GET /api/v1/telegram-groups/settings
 * Get auto-post settings
 */
router.get('/settings', (req, res) => {
  try {
    const settings = telegramPosting.getSettings();
    const isConfigured = telegramPosting.isConfigured();

    res.json({
      success: true,
      data: {
        ...settings,
        telegramConfigured: isConfigured,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/telegram-groups/settings
 * Update auto-post settings
 */
router.put('/settings', (req, res) => {
  try {
    const { enabled, post_on_job_create, default_groups } = req.body;

    telegramPosting.updateSettings({
      enabled,
      post_on_job_create,
      default_groups,
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// JOB POSTING
// =====================================================

/**
 * POST /api/v1/telegram-groups/:groupId/post/:jobId
 * Post a job to a specific group
 */
router.post('/:groupId/post/:jobId', async (req, res) => {
  try {
    const { groupId, jobId } = req.params;
    const { content } = req.body; // Optional custom content

    // Get job
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const result = await telegramPosting.postJobToGroup(job, groupId, { content });

    if (result.success) {
      res.json({
        success: true,
        data: result,
        message: `Posted to ${result.groupName}`,
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/telegram-groups/post-all/:jobId
 * Post a job to all active groups
 */
router.post('/post-all/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { useABTesting = true, scheduleOptimal = false } = req.body;

    // Get job
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const result = await telegramPosting.postJobToAllGroups(job, {
      useABTesting,
      scheduleOptimal,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/telegram-groups/preview/:jobId
 * Preview a job post (without actually posting)
 */
router.post('/preview/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { optimized = false } = req.body;

    // Get job
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    let content;
    if (optimized) {
      const adML = require('../../../services/ad-ml');
      content = await adML.generateOptimizedAd(job);
    } else {
      content = telegramPosting.formatJobPost(job);
    }

    res.json({
      success: true,
      data: { content, optimized },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// POST HISTORY
// =====================================================

/**
 * GET /api/v1/telegram-groups/history
 * Get recent post history
 */
router.get('/history', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const posts = telegramPosting.getRecentPosts(parseInt(limit));

    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/telegram-groups/history/:jobId
 * Get post history for a specific job
 */
router.get('/history/:jobId', (req, res) => {
  try {
    const posts = telegramPosting.getJobPostHistory(req.params.jobId);
    res.json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/telegram-groups/history/:postId
 * Mark a post as deleted
 */
router.delete('/history/:postId', (req, res) => {
  try {
    telegramPosting.deletePost(req.params.postId);
    res.json({ success: true, message: 'Post marked as deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// RESPONSE TRACKING
// =====================================================

/**
 * POST /api/v1/telegram-groups/track-response
 * Track a candidate response from an ad
 */
router.post('/track-response', async (req, res) => {
  try {
    const { jobId, groupId, candidateId } = req.body;

    if (!jobId || !groupId || !candidateId) {
      return res.status(400).json({
        success: false,
        error: 'jobId, groupId, and candidateId are required',
      });
    }

    const result = await telegramPosting.trackAdResponse(jobId, groupId, candidateId);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
