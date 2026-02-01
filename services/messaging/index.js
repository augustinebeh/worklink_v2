/**
 * Unified Messaging Service
 * Routes messages to appropriate channels: app (WebSocket), telegram, whatsapp
 */

const { db } = require('../../db/database');
const { broadcastToCandidate, broadcastToAdmins, createNotification, EventTypes, isCandidateOnline } = require('../../websocket');
const telegram = require('./telegram');
const webpush = require('web-push');

// Channel types
const Channels = {
  APP: 'app',
  TELEGRAM: 'telegram',
  WHATSAPP: 'whatsapp',
};

/**
 * Send a message from admin to candidate
 * Sends to BOTH PWA (WebSocket + Push) AND Telegram when linked
 *
 * @param {string} candidateId - Candidate ID
 * @param {string} content - Message content
 * @param {object} options - { channel, templateId }
 */
async function sendToCandidate(candidateId, content, options = {}) {
  const { channel = 'auto', templateId = null, aiGenerated = false, aiSource = null } = options;

  // Get candidate info
  const candidate = db.prepare(`
    SELECT id, name, telegram_chat_id, preferred_contact, online_status, push_token
    FROM candidates WHERE id = ?
  `).get(candidateId);

  if (!candidate) {
    return { success: false, error: 'Candidate not found' };
  }

  let externalId = null;
  let deliveryMethod = [];

  // 1. Store message in database FIRST to get the ID
  const messageId = Date.now();
  const timestamp = new Date().toISOString(); // Millisecond precision
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, template_id, channel, read, ai_generated, ai_source, created_at)
    VALUES (?, ?, 'admin', ?, ?, 'app', 0, ?, ?, ?)
  `).run(messageId, candidateId, content, templateId, aiGenerated ? 1 : 0, aiSource, timestamp);

  // 2. Send to Telegram if linked (do this early to get external_id)
  if (candidate.telegram_chat_id && telegram.isConfigured()) {
    const telegramResult = await telegram.sendMessage(candidate.telegram_chat_id, content);
    if (telegramResult.success) {
      externalId = String(telegramResult.messageId);
      deliveryMethod.push('telegram');
      // Update message with external ID
      db.prepare(`UPDATE messages SET external_id = ? WHERE id = ?`).run(externalId, messageId);
    } else {
      console.error('Telegram send failed:', telegramResult.error);
    }
  }

  // 3. Get the full message from DB
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

  // 4. Send via WebSocket with FULL message (for PWA real-time)
  broadcastToCandidate(candidateId, {
    type: EventTypes.CHAT_MESSAGE,
    message,
  });
  deliveryMethod.push('websocket');

  // 5. Create in-app notification
  createNotification(candidateId, 'chat', 'New message from WorkLink', content);

  // 6. Send push notification if offline
  const isOnline = isCandidateOnline(candidateId);
  if (!isOnline && candidate.push_token) {
    const pushSent = await sendPushNotification(candidate, 'New Message', content);
    if (pushSent) {
      deliveryMethod.push('push');
    }
  }

  // 7. Notify all admin clients
  broadcastToAdmins({
    type: 'message_sent',
    message,
    candidateId,
    deliveryMethod,
  });

  return {
    success: true,
    message,
    channel: 'app',
    deliveryMethod,
  };
}

/**
 * Send push notification to candidate
 */
async function sendPushNotification(candidate, title, body) {
  if (!candidate.push_token) {
    return false;
  }

  try {
    const subscription = JSON.parse(candidate.push_token);
    await webpush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: { type: 'chat' },
    }));
    return true;
  } catch (error) {
    console.error('Push notification failed:', error.message);
    // If subscription is invalid, clear it
    if (error.statusCode === 410 || error.statusCode === 404) {
      db.prepare('UPDATE candidates SET push_token = NULL WHERE id = ?').run(candidate.id);
    }
    return false;
  }
}

/**
 * Send via in-app WebSocket only (legacy support)
 */
async function sendViaApp(candidateId, content) {
  try {
    // Store message first
    const messageId = Date.now();
    const timestamp = new Date().toISOString(); // Millisecond precision
    db.prepare(`
      INSERT INTO messages (id, candidate_id, sender, content, channel, read, created_at)
      VALUES (?, ?, 'admin', ?, 'app', 0, ?)
    `).run(messageId, candidateId, content, timestamp);

    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

    broadcastToCandidate(candidateId, {
      type: EventTypes.CHAT_MESSAGE,
      message,
    });

    // Create notification for offline candidates
    createNotification(candidateId, 'chat', 'New message from WorkLink', content);

    return { success: true, message };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle incoming message from external channel
 * @param {string} channel - The channel the message came from
 * @param {object} data - Channel-specific data
 */
async function handleIncomingMessage(channel, data) {
  let candidateId = null;
  let content = null;
  let externalId = null;

  switch (channel) {
    case Channels.TELEGRAM:
      // Find candidate by telegram_chat_id
      const chatId = String(data.chat.id);
      const candidate = db.prepare(`
        SELECT id FROM candidates WHERE telegram_chat_id = ?
      `).get(chatId);

      if (!candidate) {
        // Unknown sender - could be new user trying to link
        return { success: false, error: 'Unknown telegram user', chatId };
      }

      candidateId = candidate.id;
      content = data.text;
      externalId = String(data.message_id);
      break;

    case Channels.WHATSAPP:
      // Not yet implemented
      return { success: false, error: 'WhatsApp not implemented' };

    default:
      return { success: false, error: 'Unknown channel' };
  }

  if (!candidateId || !content) {
    return { success: false, error: 'Invalid message data' };
  }

  // Store message
  const messageId = Date.now();
  const timestamp = new Date().toISOString(); // Millisecond precision
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, channel, external_id, read, created_at)
    VALUES (?, ?, 'candidate', ?, ?, ?, 0, ?)
  `).run(messageId, candidateId, content, channel, externalId, timestamp);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

  // Notify admins via WebSocket
  broadcastToAdmins({
    type: 'new_message',
    message,
    candidateId,
    channel,
  });

  // Trigger AI processing for incoming messages (non-blocking)
  console.log(`📨 [${channel}] Candidate ${candidateId} sent: "${content.substring(0, 50)}..."`);
  try {
    const aiChat = require('../ai-chat');
    console.log(`🤖 [${channel}] Triggering AI processing...`);
    aiChat.processIncomingMessage(candidateId, content, channel)
      .then(result => {
        if (result) {
          console.log(`🤖 [${channel}] AI result: mode=${result.mode}, willSendIn=${result.willSendIn || 0}ms`);
        } else {
          console.log(`🤖 [${channel}] AI mode is off for ${candidateId}`);
        }
      })
      .catch(err => {
        console.error('AI processing error for incoming message:', err.message, err.stack);
      });
  } catch (error) {
    console.error('Failed to load AI chat service:', error.message);
  }

  return { success: true, message, candidateId };
}

/**
 * Link a Telegram chat to a candidate
 * @param {string} telegramChatId - Telegram chat ID
 * @param {string} verificationCode - Code provided in app
 */
async function linkTelegram(telegramChatId, verificationCode) {
  // Find pending verification
  const pending = db.prepare(`
    SELECT candidate_id FROM telegram_verifications
    WHERE code = ? AND used = 0 AND expires_at > datetime('now')
  `).get(verificationCode);

  if (!pending) {
    return { success: false, error: 'Invalid or expired code' };
  }

  // Update candidate
  db.prepare(`
    UPDATE candidates SET telegram_chat_id = ? WHERE id = ?
  `).run(String(telegramChatId), pending.candidate_id);

  // Mark verification as used
  db.prepare(`
    UPDATE telegram_verifications SET used = 1 WHERE code = ?
  `).run(verificationCode);

  return { success: true, candidateId: pending.candidate_id };
}

/**
 * Generate a verification code for Telegram linking
 * @param {string} candidateId - Candidate ID
 */
function generateVerificationCode(candidateId) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  // Ensure table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT NOT NULL,
      code TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert verification code (expires in 10 minutes)
  db.prepare(`
    INSERT INTO telegram_verifications (candidate_id, code, expires_at)
    VALUES (?, ?, datetime('now', '+10 minutes'))
  `).run(candidateId, code);

  return code;
}

/**
 * Broadcast a message to a Telegram group
 */
async function broadcastToTelegramGroup(groupChatId, message) {
  return telegram.sendToGroup(groupChatId, message);
}

/**
 * Send job posting to Telegram groups
 */
async function postJobToTelegramGroups(job, groupIds, appBaseUrl) {
  const applyUrl = `${appBaseUrl}/jobs/${job.id}`;
  const formattedMessage = telegram.formatJobPost(job, applyUrl);

  const results = [];
  for (const groupId of groupIds) {
    const result = await telegram.sendToGroup(groupId, formattedMessage);
    results.push({ groupId, ...result });
  }

  return results;
}

/**
 * Get channel status for a candidate
 */
function getCandidateChannels(candidateId) {
  const candidate = db.prepare(`
    SELECT telegram_chat_id, whatsapp_opted_in, preferred_contact
    FROM candidates WHERE id = ?
  `).get(candidateId);

  if (!candidate) {
    return null;
  }

  return {
    app: true, // Always available
    telegram: !!candidate.telegram_chat_id,
    whatsapp: !!candidate.whatsapp_opted_in,
    preferred: candidate.preferred_contact || 'app',
  };
}

/**
 * Check which messaging services are configured
 */
function getConfiguredChannels() {
  return {
    app: true,
    telegram: telegram.isConfigured(),
    whatsapp: false, // Not yet implemented
  };
}

module.exports = {
  Channels,
  sendToCandidate,
  handleIncomingMessage,
  linkTelegram,
  generateVerificationCode,
  broadcastToTelegramGroup,
  postJobToTelegramGroups,
  getCandidateChannels,
  getConfiguredChannels,
  telegram,
};
