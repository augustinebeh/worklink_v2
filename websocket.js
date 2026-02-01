/**
 * Enhanced WebSocket Handler with Real-time Data Sync
 * Handles chat, notifications, and data updates across Admin and Worker portals
 */

const WebSocket = require('ws');
const { db } = require('./db/database');
const logger = require('./utils/logger');

// Lazy-loaded messaging service to avoid circular dependency
let messagingService = null;
function getMessaging() {
  if (!messagingService) {
    messagingService = require('./services/messaging');
  }
  return messagingService;
}

// Lazy-loaded AI chat service
let aiChatService = null;
function getAIChat() {
  if (!aiChatService) {
    aiChatService = require('./services/ai-chat');
  }
  return aiChatService;
}

// Lazy-loaded conversation manager
let conversationManager = null;
function getConversationManager() {
  if (!conversationManager) {
    try {
      conversationManager = require('./services/conversation-manager');
    } catch (e) {
      console.log('Conversation manager not loaded:', e.message);
    }
  }
  return conversationManager;
}

// Lazy-loaded smart notifications
let smartNotifications = null;
function getSmartNotifications() {
  if (!smartNotifications) {
    try {
      smartNotifications = require('./services/smart-notifications');
    } catch (e) {
      console.log('Smart notifications not loaded:', e.message);
    }
  }
  return smartNotifications;
}

// Lazy-loaded quick replies
let quickReplies = null;
function getQuickReplies() {
  if (!quickReplies) {
    try {
      quickReplies = require('./services/quick-replies');
    } catch (e) {
      console.log('Quick replies not loaded:', e.message);
    }
  }
  return quickReplies;
}

// Store connected clients
const candidateClients = new Map(); // candidateId -> WebSocket
const adminClients = new Set(); // Set of admin WebSocket connections

// Event types for real-time sync
const EventTypes = {
  // Chat
  CHAT_MESSAGE: 'chat_message',
  CHAT_TYPING: 'typing',
  CHAT_READ: 'messages_read',
  
  // Status
  STATUS_CHANGE: 'status_change',
  
  // Jobs
  JOB_CREATED: 'job_created',
  JOB_UPDATED: 'job_updated',
  JOB_DELETED: 'job_deleted',
  
  // Deployments
  DEPLOYMENT_CREATED: 'deployment_created',
  DEPLOYMENT_UPDATED: 'deployment_updated',
  DEPLOYMENT_STATUS_CHANGED: 'deployment_status_changed',
  
  // Payments
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_STATUS_CHANGED: 'payment_status_changed',
  
  // Notifications
  NOTIFICATION: 'notification',
  
  // Gamification
  XP_EARNED: 'xp_earned',
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  QUEST_COMPLETED: 'quest_completed',
  
  // Candidate updates
  CANDIDATE_UPDATED: 'candidate_updated',
};

/**
 * Validate WebSocket connection token
 * Returns { valid: boolean, role: 'admin'|'candidate', candidateId?: string }
 */
function validateConnection(token, candidateId, isAdmin) {
  if (!token) {
    return { valid: false, error: 'Missing authentication token' };
  }

  // Admin token validation
  if (isAdmin) {
    if (token === 'demo-admin-token') {
      return { valid: true, role: 'admin' };
    }
    return { valid: false, error: 'Invalid admin token' };
  }

  // Candidate token validation
  if (candidateId) {
    // Token format: demo-token-{candidateId}
    const expectedToken = `demo-token-${candidateId}`;
    if (token === expectedToken) {
      // Verify candidate exists in database
      const candidate = db.prepare('SELECT id FROM candidates WHERE id = ?').get(candidateId);
      if (candidate) {
        return { valid: true, role: 'candidate', candidateId };
      }
      return { valid: false, error: 'Candidate not found' };
    }
    return { valid: false, error: 'Invalid token for candidate' };
  }

  return { valid: false, error: 'Invalid connection parameters' };
}

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const candidateId = url.searchParams.get('candidateId');
    const isAdmin = url.searchParams.get('admin') === 'true';
    const token = url.searchParams.get('token');

    logger.info(`🔌 [WS] Connection attempt: isAdmin=${isAdmin}, candidateId=${candidateId}, hasToken=${!!token}`);

    // Validate authentication
    const authResult = validateConnection(token, candidateId, isAdmin);
    if (!authResult.valid) {
      logger.error(`🔌 [WS] Auth failed: ${authResult.error}`);
      ws.close(4001, authResult.error || 'Authentication failed');
      return;
    }

    logger.info(`🔌 [WS] Auth success: role=${authResult.role}`);

    if (isAdmin) {
      handleAdminConnection(ws);
    } else if (candidateId) {
      handleCandidateConnection(ws, candidateId);
    } else {
      ws.close(4000, 'Missing candidateId or admin parameter');
      return;
    }

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleMessage(ws, message, candidateId, isAdmin);
      } catch (error) {
        logger.error('WebSocket message error:', error.message);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error.message);
    });

    // Send initial connection success
    ws.send(JSON.stringify({ 
      type: 'connected', 
      role: isAdmin ? 'admin' : 'candidate',
      candidateId: candidateId || null,
      timestamp: new Date().toISOString(),
    }));
  });

  logger.info('WebSocket server initialized at /ws');
  return wss;
}

function handleAdminConnection(ws) {
  adminClients.add(ws);
  logger.ws(`Admin connected (total: ${adminClients.size})`);

  // Send list of online candidates
  const onlineCandidates = Array.from(candidateClients.keys());
  ws.send(JSON.stringify({ type: 'online_candidates', candidates: onlineCandidates }));

  ws.on('close', () => {
    adminClients.delete(ws);
    logger.ws(`Admin disconnected (total: ${adminClients.size})`);
  });
}

function handleCandidateConnection(ws, candidateId) {
  // Close existing connection for same candidate
  const existingWs = candidateClients.get(candidateId);
  if (existingWs && existingWs.readyState === WebSocket.OPEN) {
    logger.ws(`Closing existing connection for ${candidateId}`);
    existingWs.close(4001, 'New connection established');
  }

  candidateClients.set(candidateId, ws);
  logger.ws(`✅ Candidate ${candidateId} connected (total: ${candidateClients.size})`);
  logger.ws(`   All candidates: ${Array.from(candidateClients.keys()).join(', ')}`);

  // Update online status
  updateCandidateStatus(candidateId, 'online');

  // Send chat history
  sendChatHistory(ws, candidateId);

  // Send unread notifications count
  sendUnreadNotifications(ws, candidateId);

  // Notify admins
  broadcastToAdmins({
    type: EventTypes.STATUS_CHANGE,
    candidateId,
    status: 'online',
    timestamp: new Date().toISOString(),
  });

  ws.on('close', () => {
    candidateClients.delete(candidateId);
    updateCandidateStatus(candidateId, 'offline');
    console.log(`👤 Candidate ${candidateId} disconnected (total: ${candidateClients.size})`);

    broadcastToAdmins({
      type: EventTypes.STATUS_CHANGE,
      candidateId,
      status: 'offline',
      last_seen: new Date().toISOString(),
    });
  });
}

function handleMessage(ws, message, candidateId, isAdmin) {
  switch (message.type) {
    // Chat messages
    case 'message':
      if (isAdmin) {
        // Use unified messaging service to send to both PWA and Telegram
        handleAdminMessage(message.candidateId, message.content, message.template_id);
      } else {
        sendMessageFromCandidate(candidateId, message.content);
      }
      break;

    case 'typing':
      handleTypingIndicator(message, candidateId, isAdmin);
      break;

    case 'read':
      handleReadReceipt(message, candidateId, isAdmin);
      break;

    // Status updates
    case 'status':
      if (candidateId) {
        updateCandidateStatus(candidateId, message.status);
      }
      break;

    case 'get_status':
      if (isAdmin && message.candidateId) {
        sendCandidateStatus(ws, message.candidateId);
      }
      break;

    // Notifications
    case 'mark_notification_read':
      if (candidateId && message.notificationId) {
        markNotificationRead(candidateId, message.notificationId);
      }
      break;

    case 'mark_all_notifications_read':
      if (candidateId) {
        markAllNotificationsRead(candidateId);
      }
      break;

    // Job applications
    case 'apply_job':
      if (candidateId && message.jobId) {
        handleJobApplication(candidateId, message.jobId);
      }
      break;

    // Ping/pong for connection keep-alive
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    // AI Chat controls (admin only)
    case 'ai_suggestion_accept':
      if (isAdmin && message.suggestionId && message.candidateId) {
        handleAISuggestionAccept(message.suggestionId, message.candidateId, ws);
      }
      break;

    case 'ai_suggestion_edit':
      if (isAdmin && message.suggestionId && message.candidateId && message.content) {
        handleAISuggestionEdit(message.suggestionId, message.candidateId, message.content, ws);
      }
      break;

    case 'ai_suggestion_dismiss':
      if (isAdmin && message.suggestionId) {
        handleAISuggestionDismiss(message.suggestionId, ws);
      }
      break;

    case 'ai_mode_update':
      if (isAdmin && message.candidateId && message.mode) {
        handleAIModeUpdate(message.candidateId, message.mode, ws);
      }
      break;

    // Conversation management (admin only)
    case 'update_conversation_status':
      if (isAdmin && message.candidateId && message.status) {
        handleConversationStatusUpdate(message.candidateId, message.status, ws);
      }
      break;

    case 'update_conversation_priority':
      if (isAdmin && message.candidateId && message.priority) {
        handleConversationPriorityUpdate(message.candidateId, message.priority, ws);
      }
      break;

    case 'resolve_conversation':
      if (isAdmin && message.candidateId) {
        handleResolveConversation(message.candidateId, ws);
      }
      break;

    // Quick replies (candidate)
    case 'get_quick_replies':
      if (candidateId) {
        handleGetQuickReplies(candidateId, ws);
      }
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

// ==================== CHAT FUNCTIONS ====================

/**
 * Handle admin message via WebSocket - uses unified messaging service
 * to send to both PWA and Telegram
 */
async function handleAdminMessage(candidateId, content, templateId = null) {
  try {
    const messaging = getMessaging();
    const result = await messaging.sendToCandidate(candidateId, content, {
      channel: 'auto',
      templateId: templateId,
    });

    if (!result.success) {
      console.error('Failed to send message:', result.error);
    }
  } catch (error) {
    console.error('Error in handleAdminMessage:', error);
  }
}

function sendMessageToCandidate(candidateId, content, templateId = null, channel = 'app') {
  const id = Date.now();
  const timestamp = new Date().toISOString(); // Millisecond precision
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, template_id, channel, read, created_at)
    VALUES (?, ?, 'admin', ?, ?, ?, 0, ?)
  `).run(id, candidateId, content, templateId, channel, timestamp);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

  // Send to candidate if online (only for app channel)
  if (channel === 'app') {
    const clientWs = candidateClients.get(candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: EventTypes.CHAT_MESSAGE, message }));
    } else {
      // Queue push notification
      createNotification(candidateId, 'chat', 'New message from WorkLink', content);
    }
  }

  // Confirm to all admins
  broadcastToAdmins({ type: 'message_sent', message, candidateId, channel });
}

async function sendMessageFromCandidate(candidateId, content, channel = 'app') {
  console.log(`📨 Candidate ${candidateId} sent message: "${content.substring(0, 50)}..."`);
  const id = Date.now();
  const timestamp = new Date().toISOString(); // Millisecond precision
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, channel, read, created_at)
    VALUES (?, ?, 'candidate', ?, ?, 0, ?)
  `).run(id, candidateId, content, channel, timestamp);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

  // Update conversation metadata
  const convManager = getConversationManager();
  if (convManager) {
    try {
      convManager.recordCandidateMessage(candidateId);
      // Ensure conversation is open when candidate sends message
      const meta = convManager.getConversationMetadata(candidateId);
      if (meta.status === 'resolved') {
        convManager.updateStatus(candidateId, 'open');
      }
    } catch (e) {
      console.log('Conv manager error:', e.message);
    }
  }

  // Smart notifications - check if urgent
  const smartNotif = getSmartNotifications();
  let isUrgent = false;
  if (smartNotif) {
    try {
      const shouldNotifyNow = smartNotif.shouldNotifyImmediately(candidateId, content);
      isUrgent = shouldNotifyNow;

      if (shouldNotifyNow) {
        // Immediate notification to admins
        broadcastToAdmins({
          type: 'urgent_message',
          message,
          candidateId,
          channel,
          urgency: smartNotif.analyzeMessageUrgency(content),
        });
      } else {
        // Queue for batched notification
        smartNotif.queueNotification(candidateId, content);
      }
    } catch (e) {
      console.log('Smart notif error:', e.message);
    }
  }

  // Check for auto-escalation
  if (convManager) {
    try {
      const escalationCheck = convManager.checkForEscalation(candidateId, content, 1.0);
      if (escalationCheck.shouldEscalate) {
        convManager.escalate(candidateId, escalationCheck.reason);
        broadcastToAdmins({
          type: 'conversation_escalated',
          candidateId,
          reason: escalationCheck.reason,
        });
      }
    } catch (e) {
      console.log('Escalation check error:', e.message);
    }
  }

  // Notify all admins (regular notification)
  broadcastToAdmins({ type: 'new_message', message, candidateId, channel, isUrgent });

  // Confirm to candidate (only for app channel)
  if (channel === 'app') {
    const clientWs = candidateClients.get(candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'message_sent', message }));
    }
  }

  // Process implicit feedback from previous AI responses (non-blocking)
  try {
    const ml = require('./services/ml');
    ml.processImplicitFeedback(candidateId, content).catch(err => {
      console.error('Implicit feedback processing error:', err.message);
    });
  } catch (error) {
    // ML service not loaded, skip
  }

  // Trigger AI processing (non-blocking)
  try {
    const aiChat = getAIChat();
    console.log(`🤖 Triggering AI processing for ${candidateId}...`);
    aiChat.processIncomingMessage(candidateId, content, channel)
      .then(result => {
        if (result) {
          console.log(`🤖 AI response mode: ${result.mode}, will send in: ${result.willSendIn || 0}ms`);
        } else {
          console.log(`🤖 AI mode is off for ${candidateId}`);
        }
      })
      .catch(err => {
        console.error('AI processing error:', err.message);
      });
  } catch (error) {
    console.error('Failed to load AI chat service:', error.message);
  }
}

function sendChatHistory(ws, candidateId) {
  const messages = db.prepare(`
    SELECT * FROM messages WHERE candidate_id = ? ORDER BY created_at ASC LIMIT 100
  `).all(candidateId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM messages 
    WHERE candidate_id = ? AND sender = 'admin' AND read = 0
  `).get(candidateId).count;

  ws.send(JSON.stringify({ type: 'chat_history', messages, unreadCount }));
}

function handleTypingIndicator(message, candidateId, isAdmin) {
  if (isAdmin && message.candidateId) {
    const clientWs = candidateClients.get(message.candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: EventTypes.CHAT_TYPING, typing: message.typing }));
    }
  } else if (candidateId) {
    broadcastToAdmins({ type: EventTypes.CHAT_TYPING, candidateId, typing: message.typing });
  }
}

function handleReadReceipt(message, candidateId, isAdmin) {
  const readAt = new Date().toISOString();

  if (isAdmin && message.candidateId) {
    // Admin reading candidate messages - update with timestamp
    db.prepare(`
      UPDATE messages SET read = 1, read_at = ? WHERE candidate_id = ? AND sender = 'candidate' AND read = 0
    `).run(readAt, message.candidateId);

    const clientWs = candidateClients.get(message.candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: EventTypes.CHAT_READ, by: 'admin', readAt }));
    }

    // Update conversation metadata - record admin activity
    const convManager = getConversationManager();
    if (convManager) {
      try {
        convManager.recordAdminReply(message.candidateId);
      } catch (e) { /* ignore */ }
    }
  } else if (candidateId) {
    // Candidate reading admin messages - update with timestamp
    db.prepare(`
      UPDATE messages SET read = 1, read_at = ? WHERE candidate_id = ? AND sender = 'admin' AND read = 0
    `).run(readAt, candidateId);

    broadcastToAdmins({ type: EventTypes.CHAT_READ, candidateId, by: 'candidate', readAt });
  }
}

// ==================== STATUS FUNCTIONS ====================

function updateCandidateStatus(candidateId, status) {
  db.prepare(`
    UPDATE candidates SET online_status = ?, last_seen = datetime('now') WHERE id = ?
  `).run(status, candidateId);
}

function sendCandidateStatus(ws, candidateId) {
  const candidate = db.prepare(`
    SELECT online_status, last_seen FROM candidates WHERE id = ?
  `).get(candidateId);
  
  ws.send(JSON.stringify({
    type: 'status_response',
    candidateId,
    ...candidate,
    isOnline: candidateClients.has(candidateId),
  }));
}

// ==================== NOTIFICATION FUNCTIONS ====================

function createNotification(candidateId, type, title, message, data = null) {
  const id = Date.now();
  db.prepare(`
    INSERT INTO notifications (id, candidate_id, type, title, message, data, read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))
  `).run(id, candidateId, type, title, message, data ? JSON.stringify(data) : null);

  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

  // Send to candidate if online
  const clientWs = candidateClients.get(candidateId);
  if (clientWs?.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify({ type: EventTypes.NOTIFICATION, notification }));
  }

  return notification;
}

function sendUnreadNotifications(ws, candidateId) {
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE candidate_id = ? AND read = 0 
    ORDER BY created_at DESC 
    LIMIT 20
  `).all(candidateId);

  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE candidate_id = ? AND read = 0
  `).get(candidateId).count;

  ws.send(JSON.stringify({ type: 'notifications', notifications, unreadCount }));
}

function markNotificationRead(candidateId, notificationId) {
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ? AND candidate_id = ?
  `).run(notificationId, candidateId);
}

function markAllNotificationsRead(candidateId) {
  db.prepare(`
    UPDATE notifications SET read = 1 WHERE candidate_id = ? AND read = 0
  `).run(candidateId);
}

// ==================== JOB APPLICATION ====================

function handleJobApplication(candidateId, jobId) {
  try {
    // Check if already applied
    const existing = db.prepare(`
      SELECT id FROM deployments WHERE job_id = ? AND candidate_id = ?
    `).get(jobId, candidateId);

    if (existing) {
      const clientWs = candidateClients.get(candidateId);
      if (clientWs?.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ 
          type: 'job_application_result', 
          success: false, 
          error: 'Already applied to this job' 
        }));
      }
      return;
    }

    // Get job details
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job || job.status !== 'open') {
      const clientWs = candidateClients.get(candidateId);
      if (clientWs?.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ 
          type: 'job_application_result', 
          success: false, 
          error: 'Job not available' 
        }));
      }
      return;
    }

    // Check slots
    if (job.filled_slots >= job.total_slots) {
      const clientWs = candidateClients.get(candidateId);
      if (clientWs?.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ 
          type: 'job_application_result', 
          success: false, 
          error: 'No slots available' 
        }));
      }
      return;
    }

    // Create deployment
    const deploymentId = `DEP${Date.now()}`;
    db.prepare(`
      INSERT INTO deployments (id, job_id, candidate_id, status, charge_rate, pay_rate, created_at)
      VALUES (?, ?, ?, 'pending', ?, ?, datetime('now'))
    `).run(deploymentId, jobId, candidateId, job.charge_rate, job.pay_rate);

    // Update job filled slots
    db.prepare('UPDATE jobs SET filled_slots = filled_slots + 1 WHERE id = ?').run(jobId);

    const deployment = db.prepare('SELECT * FROM deployments WHERE id = ?').get(deploymentId);

    // Notify candidate
    const clientWs = candidateClients.get(candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ 
        type: 'job_application_result', 
        success: true, 
        deployment,
        message: 'Application submitted successfully!' 
      }));
    }

    // Notify admins
    broadcastToAdmins({ 
      type: EventTypes.DEPLOYMENT_CREATED, 
      deployment,
      candidateId,
      jobId,
    });

    // Create notification for candidate
    createNotification(
      candidateId, 
      'job', 
      'Job Application Submitted', 
      `Your application for ${job.title} has been submitted.`,
      { jobId, deploymentId }
    );

  } catch (error) {
    console.error('Job application error:', error);
    const clientWs = candidateClients.get(candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ 
        type: 'job_application_result', 
        success: false, 
        error: error.message 
      }));
    }
  }
}

// ==================== AI CHAT FUNCTIONS ====================

async function handleAISuggestionAccept(suggestionId, candidateId, ws) {
  try {
    const aiChat = getAIChat();
    const result = await aiChat.acceptSuggestion(suggestionId, candidateId);

    ws.send(JSON.stringify({
      type: 'ai_suggestion_accepted',
      suggestionId,
      candidateId,
      message: result.message,
    }));

    broadcastToAdmins({
      type: 'ai_suggestion_accepted',
      suggestionId,
      candidateId,
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'ai_error',
      error: error.message,
    }));
  }
}

async function handleAISuggestionEdit(suggestionId, candidateId, content, ws) {
  try {
    const aiChat = getAIChat();
    const result = await aiChat.editAndSendSuggestion(suggestionId, candidateId, content);

    ws.send(JSON.stringify({
      type: 'ai_suggestion_sent',
      suggestionId,
      candidateId,
      message: result.message,
      edited: true,
    }));

    broadcastToAdmins({
      type: 'ai_suggestion_sent',
      suggestionId,
      candidateId,
      edited: true,
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'ai_error',
      error: error.message,
    }));
  }
}

async function handleAISuggestionDismiss(suggestionId, ws) {
  try {
    const aiChat = getAIChat();
    await aiChat.dismissSuggestion(suggestionId);

    ws.send(JSON.stringify({
      type: 'ai_suggestion_dismissed',
      suggestionId,
    }));

    broadcastToAdmins({
      type: 'ai_suggestion_dismissed',
      suggestionId,
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'ai_error',
      error: error.message,
    }));
  }
}

async function handleAIModeUpdate(candidateId, mode, ws) {
  try {
    const aiChat = getAIChat();
    aiChat.setConversationMode(candidateId, mode);

    ws.send(JSON.stringify({
      type: 'ai_mode_updated',
      candidateId,
      mode,
    }));

    broadcastToAdmins({
      type: 'ai_mode_updated',
      candidateId,
      mode,
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'ai_error',
      error: error.message,
    }));
  }
}

// ==================== CONVERSATION MANAGEMENT FUNCTIONS ====================

function handleConversationStatusUpdate(candidateId, status, ws) {
  try {
    const convManager = getConversationManager();
    if (!convManager) {
      throw new Error('Conversation manager not available');
    }

    convManager.updateStatus(candidateId, status);
    const metadata = convManager.getConversationMetadata(candidateId);

    ws.send(JSON.stringify({
      type: 'conversation_updated',
      candidateId,
      metadata,
    }));

    broadcastToAdmins({
      type: 'conversation_updated',
      candidateId,
      metadata,
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'conversation_error',
      error: error.message,
    }));
  }
}

function handleConversationPriorityUpdate(candidateId, priority, ws) {
  try {
    const convManager = getConversationManager();
    if (!convManager) {
      throw new Error('Conversation manager not available');
    }

    convManager.updatePriority(candidateId, priority);
    const metadata = convManager.getConversationMetadata(candidateId);

    ws.send(JSON.stringify({
      type: 'conversation_updated',
      candidateId,
      metadata,
    }));

    broadcastToAdmins({
      type: 'conversation_updated',
      candidateId,
      metadata,
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'conversation_error',
      error: error.message,
    }));
  }
}

function handleResolveConversation(candidateId, ws) {
  try {
    const convManager = getConversationManager();
    if (!convManager) {
      throw new Error('Conversation manager not available');
    }

    convManager.resolve(candidateId);
    const metadata = convManager.getConversationMetadata(candidateId);

    ws.send(JSON.stringify({
      type: 'conversation_resolved',
      candidateId,
      metadata,
    }));

    broadcastToAdmins({
      type: 'conversation_resolved',
      candidateId,
      metadata,
    });
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'conversation_error',
      error: error.message,
    }));
  }
}

async function handleGetQuickReplies(candidateId, ws) {
  try {
    const qr = getQuickReplies();
    if (!qr) {
      ws.send(JSON.stringify({
        type: 'quick_replies',
        suggestions: ['Thanks!', 'Okay, noted', 'I have a question'],
      }));
      return;
    }

    const result = await qr.getSuggestedReplies(candidateId, 4);

    ws.send(JSON.stringify({
      type: 'quick_replies',
      context: result.context,
      suggestions: result.suggestions,
      personalized: result.personalized,
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: 'quick_replies',
      suggestions: ['Thanks!', 'Okay, noted', 'I have a question'],
      error: error.message,
    }));
  }
}

// ==================== BROADCAST FUNCTIONS ====================

function broadcastToAdmins(data) {
  console.log(`📤 Broadcasting to ${adminClients.size} admins:`, data.type);
  const message = JSON.stringify(data);
  let sent = 0;
  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  });
  console.log(`   ✅ Sent to ${sent} admin clients`);
}

function broadcastToCandidate(candidateId, data) {
  console.log(`📤 Broadcasting to candidate ${candidateId}:`, data.type);
  console.log(`   📋 Data:`, JSON.stringify(data).substring(0, 200));
  console.log(`   🗺️  All connected candidates:`, Array.from(candidateClients.keys()));

  const clientWs = candidateClients.get(candidateId);
  if (clientWs?.readyState === WebSocket.OPEN) {
    console.log(`   ✅ Candidate ${candidateId} is connected (readyState=${clientWs.readyState}), sending...`);
    try {
      clientWs.send(JSON.stringify(data));
      console.log(`   ✅ Message sent successfully to ${candidateId}`);
    } catch (err) {
      console.error(`   ❌ Failed to send to ${candidateId}:`, err.message);
    }
  } else {
    console.log(`   ❌ Candidate ${candidateId} not connected or socket not open`);
    console.log(`   🔍 clientWs exists:`, !!clientWs, ', readyState:', clientWs?.readyState);
  }
}

function broadcastToCandidates(candidateIds, data) {
  const message = JSON.stringify(data);
  candidateIds.forEach(id => {
    const clientWs = candidateClients.get(id);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });
}

function broadcastToAll(data) {
  const message = JSON.stringify(data);
  
  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  candidateClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ==================== HELPER FUNCTIONS FOR API ROUTES ====================

function notifyJobCreated(job) {
  broadcastToAdmins({ type: EventTypes.JOB_CREATED, job });
  
  // Notify all online candidates about new job
  const data = { type: EventTypes.JOB_CREATED, job };
  candidateClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function notifyJobUpdated(job) {
  broadcastToAll({ type: EventTypes.JOB_UPDATED, job });
}

function notifyDeploymentUpdated(deployment, candidateId) {
  broadcastToAdmins({ type: EventTypes.DEPLOYMENT_UPDATED, deployment });
  broadcastToCandidate(candidateId, { type: EventTypes.DEPLOYMENT_UPDATED, deployment });
}

function notifyPaymentCreated(payment, candidateId) {
  broadcastToAdmins({ type: EventTypes.PAYMENT_CREATED, payment });
  broadcastToCandidate(candidateId, { type: EventTypes.PAYMENT_CREATED, payment });
  
  createNotification(
    candidateId,
    'payment',
    'New Payment',
    `You have a new payment of $${payment.total_amount?.toFixed(2)}`,
    { paymentId: payment.id }
  );
}

function notifyPaymentStatusChanged(payment, candidateId) {
  broadcastToAdmins({ type: EventTypes.PAYMENT_STATUS_CHANGED, payment });
  broadcastToCandidate(candidateId, { type: EventTypes.PAYMENT_STATUS_CHANGED, payment });
  
  if (payment.status === 'paid') {
    createNotification(
      candidateId,
      'payment',
      'Payment Received',
      `Your payment of $${payment.total_amount?.toFixed(2)} has been processed.`,
      { paymentId: payment.id }
    );
  }
}

function notifyXPEarned(candidateId, xpAmount, reason) {
  const candidate = db.prepare('SELECT xp, level FROM candidates WHERE id = ?').get(candidateId);
  
  broadcastToCandidate(candidateId, { 
    type: EventTypes.XP_EARNED, 
    xp: xpAmount, 
    reason,
    totalXP: candidate?.xp || 0,
    level: candidate?.level || 1,
  });
}

function notifyLevelUp(candidateId, newLevel) {
  broadcastToCandidate(candidateId, { type: EventTypes.LEVEL_UP, level: newLevel });
  broadcastToAdmins({ type: EventTypes.LEVEL_UP, candidateId, level: newLevel });
  
  createNotification(
    candidateId,
    'gamification',
    'Level Up! 🎉',
    `Congratulations! You've reached Level ${newLevel}!`,
    { level: newLevel }
  );
}

function notifyAchievementUnlocked(candidateId, achievement) {
  broadcastToCandidate(candidateId, { type: EventTypes.ACHIEVEMENT_UNLOCKED, achievement });
  broadcastToAdmins({ type: EventTypes.ACHIEVEMENT_UNLOCKED, candidateId, achievement });
  
  createNotification(
    candidateId,
    'gamification',
    'Achievement Unlocked! 🏆',
    `You've earned: ${achievement.name}`,
    { achievementId: achievement.id }
  );
}

function notifyCandidateUpdated(candidateId, updates) {
  broadcastToCandidate(candidateId, { type: EventTypes.CANDIDATE_UPDATED, updates });
}

// Check if candidate is online
function isCandidateOnline(candidateId) {
  return candidateClients.has(candidateId);
}

// Get all online candidates
function getOnlineCandidates() {
  return Array.from(candidateClients.keys());
}

// Get connection stats
function getConnectionStats() {
  return {
    adminConnections: adminClients.size,
    candidateConnections: candidateClients.size,
    onlineCandidates: Array.from(candidateClients.keys()),
  };
}

module.exports = { 
  setupWebSocket,
  EventTypes,
  
  // Notification creators
  createNotification,
  
  // Broadcast functions for API routes
  broadcastToAdmins,
  broadcastToCandidate,
  broadcastToCandidates,
  broadcastToAll,
  
  // Specific notifiers
  notifyJobCreated,
  notifyJobUpdated,
  notifyDeploymentUpdated,
  notifyPaymentCreated,
  notifyPaymentStatusChanged,
  notifyXPEarned,
  notifyLevelUp,
  notifyAchievementUnlocked,
  notifyCandidateUpdated,
  
  // Helpers
  isCandidateOnline,
  getOnlineCandidates,
  getConnectionStats,
};
