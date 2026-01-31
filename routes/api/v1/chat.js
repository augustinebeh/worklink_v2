const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { broadcastToCandidate, broadcastToAdmins, EventTypes } = require('../../../websocket');
const messaging = require('../../../services/messaging');

// Get messages for a candidate
router.get('/:candidateId/messages', (req, res) => {
  try {
    const { candidateId } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE candidate_id = ?
      ORDER BY created_at ASC
    `).all(candidateId);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM messages 
      WHERE candidate_id = ? AND sender = 'admin' AND read = 0
    `).get(candidateId).count;

    res.json({ success: true, data: { messages, unreadCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send a message (from candidate)
router.post('/:candidateId/messages', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { content } = req.body;

    const id = Date.now();
    db.prepare(`
      INSERT INTO messages (id, candidate_id, sender, content, read, created_at)
      VALUES (?, ?, 'candidate', ?, 0, datetime('now'))
    `).run(id, candidateId, content);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark messages as read
router.post('/:candidateId/read', (req, res) => {
  try {
    const { candidateId } = req.params;
    db.prepare(`
      UPDATE messages SET read = 1 
      WHERE candidate_id = ? AND sender = 'admin' AND read = 0
    `).run(candidateId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get all conversations
router.get('/admin/conversations', (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT
        c.id as candidate_id,
        c.name,
        c.email,
        c.profile_photo,
        c.status,
        c.level,
        c.online_status,
        c.last_seen,
        c.telegram_chat_id,
        c.preferred_contact,
        (SELECT content FROM messages WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT sender FROM messages WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_sender,
        (SELECT channel FROM messages WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_channel,
        (SELECT COUNT(*) FROM messages WHERE candidate_id = c.id AND sender = 'candidate' AND read = 0) as unread_count
      FROM candidates c
      WHERE c.id IN (SELECT DISTINCT candidate_id FROM messages)
      ORDER BY last_message_at DESC
    `).all();

    // Add available channels for each conversation
    const conversationsWithChannels = conversations.map(conv => ({
      ...conv,
      channels: {
        app: true,
        telegram: !!conv.telegram_chat_id,
        whatsapp: false, // Not implemented yet
      },
    }));

    res.json({ success: true, data: conversationsWithChannels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get all candidates for starting new conversations
router.get('/admin/candidates', (req, res) => {
  try {
    const candidates = db.prepare(`
      SELECT
        id, name, email, phone, profile_photo, status, level, online_status, last_seen,
        telegram_chat_id, preferred_contact
      FROM candidates
      WHERE status IN ('active', 'onboarding')
      ORDER BY name ASC
    `).all();

    // Add channel availability
    const candidatesWithChannels = candidates.map(c => ({
      ...c,
      channels: {
        app: true,
        telegram: !!c.telegram_chat_id,
        whatsapp: false,
      },
    }));

    res.json({ success: true, data: candidatesWithChannels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Send message to candidate
router.post('/admin/:candidateId/messages', async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { content, template_id, channel } = req.body;

    // Always use unified messaging service with smart fallback
    // channel: 'auto' = WebSocket → Push → Telegram fallback
    // channel: 'telegram' = Direct to Telegram only
    // channel: 'app' = WebSocket only (no fallback)
    const result = await messaging.sendToCandidate(candidateId, content, {
      channel: channel || 'auto',
      templateId: template_id,
    });

    if (result.success) {
      res.json({
        success: true,
        data: result.message,
        channel: result.channel,
        deliveryMethod: result.deliveryMethod,
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

// Admin: Mark messages as read from candidate
router.post('/admin/:candidateId/read', (req, res) => {
  try {
    const { candidateId } = req.params;
    db.prepare(`
      UPDATE messages SET read = 1 
      WHERE candidate_id = ? AND sender = 'candidate' AND read = 0
    `).run(candidateId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Broadcast message to multiple candidates
router.post('/admin/broadcast', (req, res) => {
  try {
    const { candidate_ids, content, template_id } = req.body;

    const insertStmt = db.prepare(`
      INSERT INTO messages (id, candidate_id, sender, content, template_id, read, created_at)
      VALUES (?, ?, 'admin', ?, ?, 0, datetime('now'))
    `);

    const results = [];
    candidate_ids.forEach((candidateId, idx) => {
      const id = Date.now() + idx;
      insertStmt.run(id, candidateId, content, template_id || null);

      const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

      // Broadcast to each candidate via WebSocket
      broadcastToCandidate(candidateId, {
        type: EventTypes.CHAT_MESSAGE,
        message,
      });

      results.push({ candidate_id: candidateId, message_id: id });
    });

    res.json({ success: true, data: results, message: `Sent to ${results.length} candidates` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Message templates
router.get('/templates', (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM message_templates ORDER BY category, name').all();
    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/templates', (req, res) => {
  try {
    const { name, category, content, variables } = req.body;
    const id = `TPL${Date.now()}`;
    
    db.prepare(`
      INSERT INTO message_templates (id, name, category, content, variables, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(id, name, category, content, JSON.stringify(variables || []));

    const template = db.prepare('SELECT * FROM message_templates WHERE id = ?').get(id);
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/templates/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM message_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
