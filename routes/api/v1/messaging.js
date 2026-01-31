/**
 * Messaging Routes
 * Unified messaging API for multi-channel communication
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const messaging = require('../../../services/messaging');

/**
 * Get messaging configuration status
 * GET /api/v1/messaging/status
 */
router.get('/status', (req, res) => {
  try {
    const channels = messaging.getConfiguredChannels();
    res.json({
      success: true,
      data: {
        channels,
        ready: Object.values(channels).some(v => v),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Send message to candidate via specific channel
 * POST /api/v1/messaging/send
 */
router.post('/send', async (req, res) => {
  try {
    const { candidateId, content, channel, templateId } = req.body;

    if (!candidateId || !content) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and content are required',
      });
    }

    const result = await messaging.sendToCandidate(candidateId, content, {
      channel: channel || 'auto',
      templateId,
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          message: result.message,
          channel: result.channel,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get candidate's available channels
 * GET /api/v1/messaging/channels/:candidateId
 */
router.get('/channels/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const channels = messaging.getCandidateChannels(candidateId);

    if (!channels) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found',
      });
    }

    res.json({ success: true, data: channels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate Telegram verification code for candidate
 * POST /api/v1/messaging/telegram/verify
 */
router.post('/telegram/verify', (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId is required',
      });
    }

    // Check if candidate exists
    const candidate = db.prepare('SELECT id, telegram_chat_id FROM candidates WHERE id = ?').get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found',
      });
    }

    if (candidate.telegram_chat_id) {
      return res.json({
        success: true,
        data: {
          alreadyLinked: true,
          message: 'Telegram already linked',
        },
      });
    }

    const code = messaging.generateVerificationCode(candidateId);

    // Get bot info for deep link
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'WorkLinkBot';

    res.json({
      success: true,
      data: {
        code,
        expiresIn: '10 minutes',
        deepLink: `https://t.me/${botUsername}?start=${code}`,
        instructions: `Send this code to @${botUsername} on Telegram, or click the link above.`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Unlink Telegram from candidate
 * DELETE /api/v1/messaging/telegram/:candidateId
 */
router.delete('/telegram/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;

    db.prepare(`
      UPDATE candidates SET telegram_chat_id = NULL WHERE id = ?
    `).run(candidateId);

    res.json({ success: true, message: 'Telegram unlinked' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get Telegram groups for job posting
 * GET /api/v1/messaging/telegram/groups
 */
router.get('/telegram/groups', (req, res) => {
  try {
    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS telegram_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL UNIQUE,
        name TEXT,
        description TEXT,
        member_count INTEGER,
        is_active INTEGER DEFAULT 1,
        auto_post_jobs INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const groups = db.prepare(`
      SELECT * FROM telegram_groups WHERE is_active = 1 ORDER BY name
    `).all();

    res.json({ success: true, data: groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add Telegram group for job posting
 * POST /api/v1/messaging/telegram/groups
 */
router.post('/telegram/groups', (req, res) => {
  try {
    const { chatId, name, description, autoPostJobs } = req.body;

    if (!chatId || !name) {
      return res.status(400).json({
        success: false,
        error: 'chatId and name are required',
      });
    }

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS telegram_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL UNIQUE,
        name TEXT,
        description TEXT,
        member_count INTEGER,
        is_active INTEGER DEFAULT 1,
        auto_post_jobs INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.prepare(`
      INSERT INTO telegram_groups (chat_id, name, description, auto_post_jobs)
      VALUES (?, ?, ?, ?)
    `).run(chatId, name, description || null, autoPostJobs ? 1 : 0);

    const group = db.prepare('SELECT * FROM telegram_groups WHERE chat_id = ?').get(chatId);

    res.json({ success: true, data: group });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({
        success: false,
        error: 'Group already exists',
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update Telegram group
 * PATCH /api/v1/messaging/telegram/groups/:id
 */
router.patch('/telegram/groups/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, autoPostJobs } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(isActive ? 1 : 0);
    }
    if (autoPostJobs !== undefined) {
      updates.push('auto_post_jobs = ?');
      values.push(autoPostJobs ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided',
      });
    }

    values.push(id);

    db.prepare(`
      UPDATE telegram_groups SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);

    const group = db.prepare('SELECT * FROM telegram_groups WHERE id = ?').get(id);

    res.json({ success: true, data: group });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Delete Telegram group
 * DELETE /api/v1/messaging/telegram/groups/:id
 */
router.delete('/telegram/groups/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.prepare('DELETE FROM telegram_groups WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Post job to Telegram groups
 * POST /api/v1/messaging/telegram/post-job
 */
router.post('/telegram/post-job', async (req, res) => {
  try {
    const { jobId, groupIds } = req.body;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        error: 'jobId is required',
      });
    }

    // Get job details
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // Get groups to post to
    let groups;
    if (groupIds && groupIds.length > 0) {
      groups = db.prepare(`
        SELECT chat_id FROM telegram_groups WHERE id IN (${groupIds.map(() => '?').join(',')}) AND is_active = 1
      `).all(...groupIds);
    } else {
      // Post to all auto-post groups
      groups = db.prepare(`
        SELECT chat_id FROM telegram_groups WHERE is_active = 1 AND auto_post_jobs = 1
      `).all();
    }

    if (groups.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No groups to post to',
      });
    }

    const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
    const chatIds = groups.map(g => g.chat_id);

    const results = await messaging.postJobToTelegramGroups(job, chatIds, baseUrl);

    res.json({
      success: true,
      data: {
        posted: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Broadcast message to multiple candidates
 * POST /api/v1/messaging/broadcast
 */
router.post('/broadcast', async (req, res) => {
  try {
    const { candidateIds, content, channel, templateId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'candidateIds array is required',
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      });
    }

    const results = [];

    for (const candidateId of candidateIds) {
      const result = await messaging.sendToCandidate(candidateId, content, {
        channel: channel || 'auto',
        templateId,
      });

      results.push({
        candidateId,
        success: result.success,
        channel: result.channel,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        total: results.length,
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update candidate's preferred contact method
 * PATCH /api/v1/messaging/preference/:candidateId
 */
router.patch('/preference/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { preferredContact } = req.body;

    if (!['app', 'telegram', 'whatsapp'].includes(preferredContact)) {
      return res.status(400).json({
        success: false,
        error: 'preferredContact must be app, telegram, or whatsapp',
      });
    }

    db.prepare(`
      UPDATE candidates SET preferred_contact = ? WHERE id = ?
    `).run(preferredContact, candidateId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
