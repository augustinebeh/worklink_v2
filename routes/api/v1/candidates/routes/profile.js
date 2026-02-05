/**
 * Candidate Profile Routes
 * Handles individual candidate operations
 * @module candidates/routes/profile
 */

const express = require('express');
const { db } = require('../../../../../db');
const { authenticateAdmin, authenticateCandidateOwnership, authenticateAdminOrOwner } = require('../../../../../middleware/auth');
const { parseJSONFields, prepareCandidateForDB } = require('../helpers/avatar-utils');

const router = express.Router();

/**
 * GET /:id
 * Get candidate by ID
 */
router.get('/:id', authenticateAdminOrOwner, (req, res) => {
  try {
    const { id } = req.params;
    const { includeStats } = req.query;

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    let responseData = parseJSONFields(candidate);

    // Include additional stats if requested
    if (includeStats === 'true') {
      try {
        // Get job application stats
        const jobStats = db.prepare(`
          SELECT
            COUNT(*) as total_applications,
            COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_applications,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_applications,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_applications
          FROM deployments WHERE candidate_id = ?
        `).get(id);

        // Get payment stats
        const paymentStats = db.prepare(`
          SELECT
            COUNT(*) as total_payments,
            SUM(amount) as total_earnings,
            AVG(amount) as average_payment
          FROM payments WHERE candidate_id = ?
        `).get(id);

        // Get recent activity
        const recentJobs = db.prepare(`
          SELECT j.title, j.location, d.status, d.created_at
          FROM deployments d
          JOIN jobs j ON d.job_id = j.id
          WHERE d.candidate_id = ?
          ORDER BY d.created_at DESC
          LIMIT 5
        `).all(id);

        responseData = {
          ...responseData,
          stats: {
            jobs: jobStats || {},
            payments: paymentStats || {},
            recent_jobs: recentJobs || []
          }
        };
      } catch (statsError) {
        console.warn('Error loading candidate stats:', statsError);
        // Continue without stats if there's an error
      }
    }

    res.json({
      success: true,
      data: responseData,
      message: 'Candidate retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve candidate',
      details: error.message
    });
  }
});

/**
 * PUT /:id
 * Update candidate
 */
router.put('/:id', authenticateAdminOrOwner, (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if candidate exists
    const existingCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    if (!existingCandidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Prepare data for database (isNewCandidate = false, so won't generate new avatar)
    const preparedData = prepareCandidateForDB({
      ...updateData,
      updated_at: new Date().toISOString()
    }, false); // false = updating existing candidate, keep current avatar

    // Remove fields that shouldn't be updated
    delete preparedData.id;
    delete preparedData.avatar_url; // Remove avatar_url (use profile_photo instead)
    delete preparedData.created_at;
    
    // Don't update profile_photo unless explicitly provided in the request
    if (!updateData.profile_photo && !updateData.avatar_url) {
      delete preparedData.profile_photo;
    }

    // Build update query
    const fields = Object.keys(preparedData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => preparedData[field]);

    const updateQuery = `UPDATE candidates SET ${setClause} WHERE id = ?`;
    const stmt = db.prepare(updateQuery);
    const result = stmt.run(...values, id);

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        error: 'No changes made to candidate'
      });
    }

    // Get updated candidate
    const updatedCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);

    res.json({
      success: true,
      data: parseJSONFields(updatedCandidate),
      message: 'Candidate updated successfully'
    });

  } catch (error) {
    console.error('Error updating candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update candidate',
      details: error.message
    });
  }
});

/**
 * DELETE /:id
 * Delete candidate (Admin only)
 */
router.delete('/:id', authenticateAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Check if candidate exists
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Check if candidate has any dependencies
    const hasDeployments = db.prepare('SELECT COUNT(*) as count FROM deployments WHERE candidate_id = ?').get(id).count > 0;
    const hasPayments = db.prepare('SELECT COUNT(*) as count FROM payments WHERE candidate_id = ?').get(id).count > 0;

    if (hasDeployments || hasPayments) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete candidate with existing deployments or payments. Consider setting status to inactive instead.'
      });
    }

    // Delete candidate
    const result = db.prepare('DELETE FROM candidates WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to delete candidate'
      });
    }

    res.json({
      success: true,
      message: 'Candidate deleted successfully',
      deletedCandidateId: id
    });

  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete candidate',
      details: error.message
    });
  }
});

/**
 * GET /:id/jobs
 * Get jobs for a candidate
 */
router.get('/:id/jobs', authenticateAdminOrOwner, (req, res) => {
  try {
    const { id } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;

    // Check if candidate exists
    const candidate = db.prepare('SELECT id FROM candidates WHERE id = ?').get(id);
    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    let query = `
      SELECT
        j.*,
        d.id as deployment_id,
        d.status as application_status,
        d.created_at as applied_at,
        d.updated_at as status_updated_at
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.candidate_id = ?
    `;
    const params = [id];

    if (status && status !== 'all') {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const jobs = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: jobs,
      candidateId: id,
      message: `Retrieved ${jobs.length} jobs for candidate`
    });

  } catch (error) {
    console.error('Error fetching candidate jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve candidate jobs',
      details: error.message
    });
  }
});

/**
 * POST/PATCH /:id/status
 * Update candidate status
 * Supports both POST and PATCH methods for compatibility
 */
const statusUpdateHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'active', 'inactive', 'suspended', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Update candidate status ONLY - no other fields
    const result = db.prepare(`
      UPDATE candidates
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(status, new Date().toISOString(), id);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Log status change if reason provided
    if (reason) {
      try {
        db.prepare(`
          INSERT INTO candidate_notes (candidate_id, note, created_by, created_at)
          VALUES (?, ?, ?, ?)
        `).run(id, `Status changed to ${status}: ${reason}`, req.user?.id || 'system', new Date().toISOString());
      } catch (noteError) {
        console.warn('Failed to log status change:', noteError);
        // Continue without logging
      }
    }

    res.json({
      success: true,
      message: `Candidate status updated to ${status}`,
      candidateId: id,
      newStatus: status
    });

  } catch (error) {
    console.error('Error updating candidate status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update candidate status',
      details: error.message
    });
  }
};

// Support both POST and PATCH for status updates
router.post('/:id/status', authenticateAdmin, statusUpdateHandler);
router.patch('/:id/status', authenticateAdmin, statusUpdateHandler);

module.exports = router;