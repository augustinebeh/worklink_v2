/**
 * Status Manager
 * Handles candidate online/offline status
 */

const { db } = require('../../db');
const { candidateClients } = require('../clients');

/**
 * Update candidate's online status in database
 */
function updateCandidateStatus(candidateId, status) {
  db.prepare(`
    UPDATE candidates SET online_status = ?, last_seen = datetime('now') WHERE id = ?
  `).run(status, candidateId);
}

/**
 * Send candidate's current status to websocket client
 */
function sendCandidateStatus(ws, candidateId) {
  const candidate = db.prepare(`
    SELECT online_status, last_seen FROM candidates WHERE id = ?
  `).get(candidateId);
  
  ws.send(JSON.stringify({
    type: 'status_response',
    candidateId,
    ...candidate,
    isOnline: candidateClients.has(candidateId)
  }));
}

module.exports = {
  updateCandidateStatus,
  sendCandidateStatus
};
