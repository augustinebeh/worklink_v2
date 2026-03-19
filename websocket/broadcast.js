/**
 * WebSocket Broadcast Utilities
 * Functions for broadcasting messages to connected clients
 */

const WebSocket = require('ws');
const { createLogger } = require('../utils/structured-logger');
const { candidateClients, adminClients, EventTypes } = require('./clients');

const logger = createLogger('websocket:broadcast');

/**
 * Broadcast message to all connected admin clients
 */
function broadcastToAdmins(data) {
  logger.info(`📤 [BROADCAST] Broadcasting to ${adminClients.size} admin clients`, {
    eventType: data.type,
    candidateId: data.candidateId,
    totalAdminClients: adminClients.size
  });

  const message = JSON.stringify(data);
  let sent = 0;
  let failed = 0;

  adminClients.forEach((client, index) => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        sent++;
        logger.debug(`   ✅ Admin client ${index + 1}: Message sent successfully`);
      } else {
        failed++;
        logger.warn(`   ❌ Admin client ${index + 1}: Connection not open (readyState: ${client.readyState})`);
      }
    } catch (error) {
      failed++;
      logger.error(`   ❌ Admin client ${index + 1}: Failed to send message`, error);
    }
  });

  logger.info(`📤 [BROADCAST] Broadcast complete: ${sent} sent, ${failed} failed`, {
    eventType: data.type,
    sent,
    failed,
    totalClients: adminClients.size
  });
}

/**
 * Broadcast message to a specific candidate
 */
function broadcastToCandidate(candidateId, data) {
  logger.debug('Broadcasting to candidate', { candidateId, eventType: data.type });

  const clientWs = candidateClients.get(candidateId);
  if (clientWs?.readyState === WebSocket.OPEN) {
    try {
      clientWs.send(JSON.stringify(data));
      logger.debug('Message sent to candidate', { candidateId });
    } catch (err) {
      logger.error('Failed to send to candidate', { candidateId, error: err.message });
    }
  } else {
    logger.debug('Candidate not connected', { candidateId, wsExists: !!clientWs, readyState: clientWs?.readyState });
  }
}

/**
 * Broadcast message to multiple candidates
 */
function broadcastToCandidates(candidateIds, data) {
  const message = JSON.stringify(data);
  candidateIds.forEach(id => {
    const clientWs = candidateClients.get(id);
    if (clientWs?.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });
}

/**
 * Broadcast message to all connected clients (admins and candidates)
 */
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

module.exports = {
  broadcastToAdmins,
  broadcastToCandidate,
  broadcastToCandidates,
  broadcastToAll
};
