/**
 * Enhanced WebSocket Handler with Real-time Data Sync
 * Handles chat, notifications, and data updates across Admin and Worker portals
 */

const WebSocket = require('ws');
const { db } = require('./db/database');

// Lazy-loaded messaging service to avoid circular dependency
let messagingService = null;
function getMessaging() {
  if (!messagingService) {
    messagingService = require('./services/messaging');
  }
  return messagingService;
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

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const candidateId = url.searchParams.get('candidateId');
    const isAdmin = url.searchParams.get('admin') === 'true';

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
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial connection success
    ws.send(JSON.stringify({ 
      type: 'connected', 
      role: isAdmin ? 'admin' : 'candidate',
      candidateId: candidateId || null,
      timestamp: new Date().toISOString(),
    }));
  });

  console.log('🔌 WebSocket server initialized at /ws');
  return wss;
}

function handleAdminConnection(ws) {
  adminClients.add(ws);
  console.log(`👤 Admin connected (total: ${adminClients.size})`);

  // Send list of online candidates
  const onlineCandidates = Array.from(candidateClients.keys());
  ws.send(JSON.stringify({ type: 'online_candidates', candidates: onlineCandidates }));

  ws.on('close', () => {
    adminClients.delete(ws);
    console.log(`👤 Admin disconnected (total: ${adminClients.size})`);
  });
}

function handleCandidateConnection(ws, candidateId) {
  // Close existing connection for same candidate
  const existingWs = candidateClients.get(candidateId);
  if (existingWs && existingWs.readyState === WebSocket.OPEN) {
    existingWs.close(4001, 'New connection established');
  }

  candidateClients.set(candidateId, ws);
  console.log(`👤 Candidate ${candidateId} connected (total: ${candidateClients.size})`);

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
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, template_id, channel, read, created_at)
    VALUES (?, ?, 'admin', ?, ?, ?, 0, datetime('now'))
  `).run(id, candidateId, content, templateId, channel);

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

function sendMessageFromCandidate(candidateId, content, channel = 'app') {
  const id = Date.now();
  db.prepare(`
    INSERT INTO messages (id, candidate_id, sender, content, channel, read, created_at)
    VALUES (?, ?, 'candidate', ?, ?, 0, datetime('now'))
  `).run(id, candidateId, content, channel);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(id);

  // Notify all admins
  broadcastToAdmins({ type: 'new_message', message, candidateId, channel });

  // Confirm to candidate (only for app channel)
  if (channel === 'app') {
    const clientWs = candidateClients.get(candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'message_sent', message }));
    }
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
  if (isAdmin && message.candidateId) {
    db.prepare(`
      UPDATE messages SET read = 1 WHERE candidate_id = ? AND sender = 'candidate' AND read = 0
    `).run(message.candidateId);
    
    const clientWs = candidateClients.get(message.candidateId);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: EventTypes.CHAT_READ, by: 'admin' }));
    }
  } else if (candidateId) {
    db.prepare(`
      UPDATE messages SET read = 1 WHERE candidate_id = ? AND sender = 'admin' AND read = 0
    `).run(candidateId);
    broadcastToAdmins({ type: EventTypes.CHAT_READ, candidateId, by: 'candidate' });
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

// ==================== BROADCAST FUNCTIONS ====================

function broadcastToAdmins(data) {
  const message = JSON.stringify(data);
  adminClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastToCandidate(candidateId, data) {
  const clientWs = candidateClients.get(candidateId);
  if (clientWs?.readyState === WebSocket.OPEN) {
    clientWs.send(JSON.stringify(data));
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
