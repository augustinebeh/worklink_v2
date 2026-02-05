/**
 * Job Application Handler
 * Manages job applications and deployments
 */

const WebSocket = require('ws');
const { db } = require('../../db');
const { candidateClients, EventTypes } = require('../clients');
const { broadcastToAdmins } = require('../broadcast');
const { createNotification } = require('./notification-handler');

/**
 * Handle job application from candidate
 * @param {number} candidateId - The candidate's ID
 * @param {number} jobId - The job ID to apply for
 */
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
      jobId
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

module.exports = {
  handleJobApplication
};
