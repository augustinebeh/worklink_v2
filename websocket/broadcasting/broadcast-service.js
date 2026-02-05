/**
 * Broadcasting Service
 * Handles WebSocket message broadcasting to admins, candidates, and groups
 * 
 * @module websocket/broadcasting/broadcast-service
 */

const WebSocket = require('ws');
const { createLogger } = require('../../utils/structured-logger');
const clientStore = require('../utils/client-store');

const logger = createLogger('websocket:broadcast');

/**
 * Broadcast message to all connected admin clients
 * @param {Object} data - Data to broadcast
 * @param {string} data.type - Event type
 * @returns {Object} Broadcast statistics {sent, failed}
 */
function broadcastToAdmins(data) {
  const adminClients = clientStore.getAdminClients();
  
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
      logger.error(`   ❌ Admin client ${index + 1}: Failed to send message`, { error: error.message });
    }
  });

  logger.info(`📤 [BROADCAST] Broadcast complete: ${sent} sent, ${failed} failed`, {
    eventType: data.type,
    sent,
    failed,
    totalClients: adminClients.size
  });

  return { sent, failed };
}

/**
 * Broadcast message to a specific candidate
 * @param {string} candidateId - Candidate ID
 * @param {Object} data - Data to broadcast
 * @returns {boolean} True if sent successfully
 */
function broadcastToCandidate(candidateId, data) {
  logger.info(`📤 Broadcasting to candidate ${candidateId}`, {
    eventType: data.type,
    dataPreview: JSON.stringify(data).substring(0, 200)
  });

  const clientWs = clientStore.getCandidateClient(candidateId);
  
  if (clientWs?.readyState === WebSocket.OPEN) {
    try {
      clientWs.send(JSON.stringify(data));
      logger.info(`✅ Message sent successfully to ${candidateId}`);
      return true;
    } catch (error) {
      logger.error(`❌ Failed to send to ${candidateId}`, { error: error.message });
      return false;
    }
  } else {
    logger.warn(`❌ Candidate ${candidateId} not connected or socket not open`, {
      clientExists: !!clientWs,
      readyState: clientWs?.readyState
    });
    return false;
  }
}

/**
 * Broadcast message to multiple specific candidates
 * @param {string[]} candidateIds - Array of candidate IDs
 * @param {Object} data - Data to broadcast
 * @returns {Object} Statistics {sent, failed}
 */
function broadcastToCandidates(candidateIds, data) {
  logger.info(`📤 Broadcasting to ${candidateIds.length} candidates`, {
    eventType: data.type,
    candidateIds: candidateIds.slice(0, 10) // Log first 10 IDs
  });

  const message = JSON.stringify(data);
  let sent = 0;
  let failed = 0;

  candidateIds.forEach(id => {
    const clientWs = clientStore.getCandidateClient(id);
    if (clientWs?.readyState === WebSocket.OPEN) {
      try {
        clientWs.send(message);
        sent++;
      } catch (error) {
        failed++;
        logger.error(`Failed to send to candidate ${id}`, { error: error.message });
      }
    } else {
      failed++;
    }
  });

  logger.info(`📤 Broadcast to candidates complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Broadcast message to all connected clients (admins and candidates)
 * @param {Object} data - Data to broadcast
 * @returns {Object} Statistics {adminsSent, adminsFailed, candidatesSent, candidatesFailed}
 */
function broadcastToAll(data) {
  logger.info(`📤 Broadcasting to ALL clients`, { eventType: data.type });

  const message = JSON.stringify(data);
  let adminsSent = 0;
  let adminsFailed = 0;
  let candidatesSent = 0;
  let candidatesFailed = 0;

  // Broadcast to admins
  const adminClients = clientStore.getAdminClients();
  adminClients.forEach((client) => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        adminsSent++;
      } else {
        adminsFailed++;
      }
    } catch (error) {
      adminsFailed++;
      logger.error('Failed to send to admin', { error: error.message });
    }
  });

  // Broadcast to candidates
  const candidateIds = clientStore.getConnectedCandidateIds();
  candidateIds.forEach((id) => {
    const client = clientStore.getCandidateClient(id);
    try {
      if (client?.readyState === WebSocket.OPEN) {
        client.send(message);
        candidatesSent++;
      } else {
        candidatesFailed++;
      }
    } catch (error) {
      candidatesFailed++;
      logger.error(`Failed to send to candidate ${id}`, { error: error.message });
    }
  });

  logger.info(`📤 Broadcast to all complete`, {
    adminsSent,
    adminsFailed,
    candidatesSent,
    candidatesFailed,
    totalSent: adminsSent + candidatesSent,
    totalFailed: adminsFailed + candidatesFailed
  });

  return { adminsSent, adminsFailed, candidatesSent, candidatesFailed };
}

/**
 * Check if a candidate is currently online
 * @param {string} candidateId - Candidate ID
 * @returns {boolean} True if online
 */
function isCandidateOnline(candidateId) {
  return clientStore.isCandidateConnected(candidateId);
}

/**
 * Get all currently online candidate IDs
 * @returns {string[]} Array of candidate IDs
 */
function getOnlineCandidates() {
  return clientStore.getConnectedCandidateIds();
}

/**
 * Get connection statistics
 * @returns {Object} Connection stats
 */
function getConnectionStats() {
  const stats = clientStore.getStats();
  return {
    adminConnections: stats.admins,
    candidateConnections: stats.candidates,
    totalConnections: stats.total,
    onlineCandidates: stats.candidateIds
  };
}

module.exports = {
  broadcastToAdmins,
  broadcastToCandidate,
  broadcastToCandidates,
  broadcastToAll,
  isCandidateOnline,
  getOnlineCandidates,
  getConnectionStats
};
