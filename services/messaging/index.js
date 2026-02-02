/**
 * Unified Messaging Service
 * Routes messages to appropriate channels: app (WebSocket), telegram, whatsapp
 * 
 * CHANNEL ROUTING LOGIC:
 * - Worker sends via PWA → Reply goes to PWA only
 * - Worker sends via Telegram → Reply goes to Telegram only
 * - Admin can override and send to specific channel or 'all'
 */

const { db } = require('../../db');
const { broadcastToCandidate, broadcastToAdmins, createNotification, EventTypes, isCandidateOnline } = require('../../websocket');
const telegram = require('./telegram');
const webpush = require('web-push');

// Channel types
const Channels = {
  APP: 'app',
  TELEGRAM: 'telegram',
  WHATSAPP: 'whatsapp',
  AUTO: 'auto',  // Auto-detect based on last message
  ALL: 'all',    // Send to all available channels
};

/**
 * Get the channel of the last message from a candidate
 * Used to determine where to send the reply
 */
function getLastCandidateMessageChannel(candidateId) {
  const lastMessage = db.prepare(`
    SELECT channel FROM messages 
    WHERE candidate_id = ? AND sender = 'candidate'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(candidateId);
  
  return lastMessage?.channel || 'app';
}

/**
 * Send a message from admin/AI to candidate
 * 
 * Channel routing:
 * - 'auto': Reply on the same channel worker last messaged from
 * - 'app': PWA only (WebSocket + Push)
 * - 'telegram': Telegram only
 * - 'all': Send to all available channels
 *
 * @param {string} candidateId - Candidate ID
 * @param {string} content - Message content
 * @param {object} options - { channel, templateId, aiGenerated, aiSource, replyToChannel }
 */
async function sendToCandidate(candidateId, content, options = {}) {
  const { 
    channel = 'auto', 
    templateId = null, 
    aiGenerated = false, 
    aiSource = null,
    replyToChannel = null  // Explicit channel from AI processing
  } = options;

  // Get candidate info
  const candidate = db.prepare(`
    SELECT id, name, telegram_chat_id, preferred_contact, online_status, push_token
    FROM candidates WHERE id = ?
  `).get(candidateId);

  if (!candidate) {
    return { success: false, error: 'Candidate not found' };
  }

  // Determine target channel
  let targetChannel = channel;
  if (channel === 'auto') {
    // Use explicit replyToChannel if provided, otherwise detect from last message
    targetChannel = replyToChannel || getLastCandidateMessageChannel(candidateId);
  }

  console.log(`📤 [Messaging] Sending to ${candidateId} via ${targetChannel} (requested: ${channel})`);

  let externalId = null;
  let deliveryMethod = [];
  let sentToTelegram = false;
  let sentToApp = false;

  // 1. Store message in database FIRST
  const messageId = Date.now();
  const timestamp = new Date().toISOString();
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, template_id, channel, read, ai_generated, ai_source, created_at)
    VALUES (?, ?, 'admin', ?, ?, ?, 0, ?, ?, ?)
  `).run(messageId, candidateId, content, templateId, targetChannel, aiGenerated ? 1 : 0, aiSource, timestamp);

  // 2. Route to appropriate channel(s)
  const shouldSendToTelegram = (targetChannel === 'telegram' || targetChannel === 'all') && 
                                candidate.telegram_chat_id && 
                                telegram.isConfigured();
  
  const shouldSendToApp = targetChannel === 'app' || targetChannel === 'all';

  // Send to Telegram if needed
  if (shouldSendToTelegram) {
    const telegramResult = await telegram.sendMessage(candidate.telegram_chat_id, content);
    if (telegramResult.success) {
      externalId = String(telegramResult.messageId);
      deliveryMethod.push('telegram');
      sentToTelegram = true;
      db.prepare(`UPDATE messages SET external_id = ? WHERE id = ?`).run(externalId, messageId);
      console.log(`✅ [Telegram] Message sent to ${candidateId}`);
    } else {
      console.error(`❌ [Telegram] Failed to send to ${candidateId}:`, telegramResult.error);
    }
  }

  // 3. Get the full message from DB
  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);

  // Send to PWA if needed
  if (shouldSendToApp) {
    // Send via WebSocket
    broadcastToCandidate(candidateId, {
      type: EventTypes.CHAT_MESSAGE,
      message,
    });
    deliveryMethod.push('websocket');
    sentToApp = true;
    console.log(`✅ [WebSocket] Message broadcast to ${candidateId}`);

    // Create in-app notification
    createNotification(candidateId, 'chat', 'New message from WorkLink', content);

    // Send push notification if offline
    const isOnline = isCandidateOnline(candidateId);
    if (!isOnline && candidate.push_token) {
      const pushSent = await sendPushNotification(candidate, 'New Message', content);
      if (pushSent) {
        deliveryMethod.push('push');
        console.log(`✅ [Push] Notification sent to ${candidateId}`);
      }
    }
  }

  // 4. Notify all admin clients
  broadcastToAdmins({
    type: 'message_sent',
    message,
    candidateId,
    deliveryMethod,
    targetChannel,
  });

  return {
    success: true,
    message,
    channel: targetChannel,
    deliveryMethod,
    sentToTelegram,
    sentToApp,
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
  return sendToCandidate(candidateId, content, { channel: 'app' });
}

/**
 * Send via Telegram only
 */
async function sendViaTelegram(candidateId, content) {
  return sendToCandidate(candidateId, content, { channel: 'telegram' });
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
      const chatId = String(data.chat.id);
      const candidate = db.prepare(`
        SELECT id FROM candidates WHERE telegram_chat_id = ?
      `).get(chatId);

      if (!candidate) {
        return { success: false, error: 'Unknown telegram user', chatId };
      }

      candidateId = candidate.id;
      content = data.text;
      externalId = String(data.message_id);
      break;

    case Channels.WHATSAPP:
      return { success: false, error: 'WhatsApp not implemented' };

    default:
      return { success: false, error: 'Unknown channel' };
  }

  if (!candidateId || !content) {
    return { success: false, error: 'Invalid message data' };
  }

  // Store message with channel info
  const messageId = Date.now();
  const timestamp = new Date().toISOString();
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

  // Trigger AI processing with the channel info
  console.log(`📨 [${channel}] Candidate ${candidateId} sent: "${content.substring(0, 50)}..."`);
  try {
    const aiChat = require('../ai-chat');
    console.log(`🤖 [${channel}] Triggering AI processing (will reply on ${channel})...`);
    
    // Pass channel to AI so it knows where to reply
    aiChat.processIncomingMessage(candidateId, content, channel)
      .then(result => {
        if (result) {
          console.log(`🤖 [${channel}] AI result: mode=${result.mode}`);
        } else {
          console.log(`🤖 [${channel}] AI mode is off for ${candidateId}`);
        }
      })
      .catch(err => {
        console.error('AI processing error:', err.message);
      });
  } catch (error) {
    console.error('Failed to load AI chat service:', error.message);
  }

  return { success: true, message, candidateId, channel };
}

/**
 * Link a Telegram chat to a candidate
 */
async function linkTelegram(telegramChatId, verificationCode) {
  const pending = db.prepare(`
    SELECT candidate_id FROM telegram_verifications
    WHERE code = ? AND used = 0 AND expires_at > datetime('now')
  `).get(verificationCode);

  if (!pending) {
    return { success: false, error: 'Invalid or expired code' };
  }

  db.prepare(`
    UPDATE candidates SET telegram_chat_id = ? WHERE id = ?
  `).run(String(telegramChatId), pending.candidate_id);

  db.prepare(`
    UPDATE telegram_verifications SET used = 1 WHERE code = ?
  `).run(verificationCode);

  return { success: true, candidateId: pending.candidate_id };
}

/**
 * Generate a verification code for Telegram linking
 */
function generateVerificationCode(candidateId) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

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
    app: true,
    telegram: !!candidate.telegram_chat_id,
    whatsapp: !!candidate.whatsapp_opted_in,
    preferred: candidate.preferred_contact || 'app',
    lastChannel: getLastCandidateMessageChannel(candidateId),
  };
}

/**
 * Check which messaging services are configured
 */
function getConfiguredChannels() {
  return {
    app: true,
    telegram: telegram.isConfigured(),
    whatsapp: false,
  };
}

module.exports = {
  Channels,
  sendToCandidate,
  sendViaApp,
  sendViaTelegram,
  handleIncomingMessage,
  linkTelegram,
  generateVerificationCode,
  broadcastToTelegramGroup,
  postJobToTelegramGroups,
  getCandidateChannels,
  getConfiguredChannels,
  getLastCandidateMessageChannel,
  telegram,
};
