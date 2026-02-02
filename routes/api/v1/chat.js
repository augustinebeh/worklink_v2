const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const { broadcastToCandidate, broadcastToAdmins, EventTypes } = require('../../../websocket');
const messaging = require('../../../services/messaging');
const logger = require('../../../utils/logger');

// Groq API for generating quick replies
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateAIQuickReplies(lastMessage, conversationContext = []) {
  if (!GROQ_API_KEY || !lastMessage) {
    return null;
  }

  try {
    // Build context from recent messages
    const contextMessages = conversationContext.slice(-5).map(m => 
      `${m.sender === 'candidate' ? 'Worker' : 'Support'}: ${m.content}`
    ).join('\n');

    const prompt = `You are helping a gig worker generate quick reply suggestions for a chat with their employer/support team.

Recent conversation:
${contextMessages}

Last message from support: "${lastMessage}"

Generate exactly 3-4 short, natural reply options the worker might want to send. Each reply should be:
- Brief (2-6 words max)
- Natural and conversational
- Relevant to the last message
- Different from each other (cover different intents like confirm, ask question, decline, etc.)

If the support is asking about jobs/shifts, include options like availability confirmation.
If asking about payments, include acknowledgment options.
If asking a yes/no question, include both yes and no options.
If it's a greeting, include friendly responses.

Return ONLY a JSON array of strings, nothing else. Example: ["Yes, I can", "What time?", "Not available", "Tell me more"]`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      logger.error('Groq API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    
    // Parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const replies = JSON.parse(jsonMatch[0]);
      if (Array.isArray(replies) && replies.length > 0) {
        return replies.slice(0, 4); // Max 4 replies
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to generate AI quick replies:', error);
    return null;
  }
}

// Fallback rule-based quick replies
function generateFallbackReplies(lastMessage) {
  if (!lastMessage) {
    return ['Hi there!', 'I have a question', 'Help me with jobs'];
  }

  const content = (lastMessage.content || '').toLowerCase();
  
  if (content.includes('job') || content.includes('work') || content.includes('shift')) {
    return ['Yes, I can work', "I'm available", 'What are the details?', 'Not available'];
  }
  if (content.includes('available') || content.includes('schedule') || content.includes('when')) {
    return ['Yes, I am', 'Let me check', 'This week works', 'Not this week'];
  }
  if (content.includes('confirm') || content.includes('accept')) {
    return ['Yes, confirmed', 'Need more info', 'Can we reschedule?'];
  }
  if (content.includes('?')) {
    return ['Yes', 'No', 'Maybe', 'Let me check'];
  }
  if (content.includes('pay') || content.includes('salary') || content.includes('money')) {
    return ['Thanks!', 'When will I receive?', 'Got it'];
  }
  if (content.includes('hi') || content.includes('hello') || content.includes('hey')) {
    return ['Hi! How can I help?', "I'm doing well", 'Need assistance'];
  }
  
  return ['Thanks!', 'Okay, noted', 'Got it', 'Need more info'];
}

// Generate AI-powered quick reply suggestions
router.get('/:candidateId/quick-replies', async (req, res) => {
  try {
    const { candidateId } = req.params;
    
    // Get recent messages for context
    const messages = db.prepare(`
      SELECT content, sender, created_at FROM messages 
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(candidateId).reverse();

    // Find the last admin message
    const lastAdminMessage = [...messages].reverse().find(m => m.sender === 'admin');
    
    if (!lastAdminMessage) {
      return res.json({ 
        success: true, 
        data: ['Hi there!', 'I have a question', 'Help me with jobs'],
        source: 'default'
      });
    }

    // Try AI-generated replies first
    const aiReplies = await generateAIQuickReplies(lastAdminMessage.content, messages);
    
    if (aiReplies && aiReplies.length > 0) {
      return res.json({ success: true, data: aiReplies, source: 'ai' });
    }

    // Fallback to rule-based
    const fallbackReplies = generateFallbackReplies(lastAdminMessage);
    res.json({ success: true, data: fallbackReplies, source: 'rules' });
  } catch (error) {
    logger.error('Quick replies error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get messages for a candidate
router.get('/:candidateId/messages', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { page = 1, limit = 50, before } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for pagination
    let whereClause = 'WHERE candidate_id = ?';
    let params = [candidateId];

    // Support "load more" pattern with before timestamp
    if (before) {
      whereClause += ' AND created_at < ?';
      params.push(before);
    }

    // Get total count for pagination (without before filter for accurate total)
    const totalQuery = `SELECT COUNT(*) as total FROM messages WHERE candidate_id = ?`;
    const { total } = db.prepare(totalQuery).get(candidateId);

    // Get messages with pagination (newest first)
    const messagesQuery = `
      SELECT * FROM messages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const messages = db.prepare(messagesQuery).all(...params, parseInt(limit), offset);

    // Reverse to show oldest first (chronological order)
    const sortedMessages = messages.reverse();

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE candidate_id = ? AND sender = 'admin' AND read = 0
    `).get(candidateId).count;

    res.json({
      success: true,
      data: {
        messages: sortedMessages,
        unreadCount
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: messages.length === parseInt(limit)
      }
    });
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
    const timestamp = new Date().toISOString(); // Millisecond precision
    db.prepare(`
      INSERT INTO messages (id, candidate_id, sender, content, read, created_at)
      VALUES (?, ?, 'candidate', ?, 0, ?)
    `).run(id, candidateId, content, timestamp);

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
      WHERE status IN ('pending', 'active')
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
      VALUES (?, ?, 'admin', ?, ?, 0, ?)
    `);

    const results = [];
    candidate_ids.forEach((candidateId, idx) => {
      const id = Date.now() + idx;
      const timestamp = new Date().toISOString(); // Millisecond precision
      insertStmt.run(id, candidateId, content, template_id || null, timestamp);

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
    const { page = 1, limit = 20, category, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for filters
    let whereClause = '';
    let params = [];

    const conditions = [];
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (search) {
      conditions.push('(name LIKE ? OR content LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM message_templates ${whereClause}`;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get message templates with pagination
    const templatesQuery = `
      SELECT * FROM message_templates
      ${whereClause}
      ORDER BY category, name
      LIMIT ? OFFSET ?
    `;
    const templates = db.prepare(templatesQuery).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
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
