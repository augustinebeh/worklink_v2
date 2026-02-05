/**
 * Candidates API - Main Router
 * Modular implementation replacing the original 516-line monolithic file
 *
 * Features:
 * - Complete CRUD operations for candidates
 * - Advanced search and filtering
 * - Bulk operations
 * - Profile management
 * - Job application tracking
 * - Status management
 * - Notes and comments
 *
 * @module candidates
 */

const express = require('express');
const router = express.Router();

// Import route modules
const listRoutes = require('./routes/list');
const profileRoutes = require('./routes/profile');
const createRoutes = require('./routes/create');

// Mount route modules
router.use('/', listRoutes);          // GET / (list), GET /search
router.use('/', profileRoutes);       // GET /:id, PUT /:id, DELETE /:id, GET /:id/jobs, POST /:id/status
router.use('/', createRoutes);        // POST /, POST /bulk, POST /:id/notes

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    module: 'candidates',
    version: '2.0.0',
    architecture: 'modular'
  });
});

/**
 * GET /stats
 * Get candidate statistics
 */
router.get('/stats', (req, res) => {
  try {
    const { db } = require('../../../../db');

    // Get status counts with consolidation for frontend pipeline cards
    // Map multiple statuses to the 3 main categories: pending, active, inactive
    const statusStats = db.prepare(`
      SELECT 
        CASE 
          WHEN status IN ('pending', 'lead') THEN 'pending'
          WHEN status IN ('active', 'verified') THEN 'active'
          WHEN status IN ('inactive', 'blocked') THEN 'inactive'
          ELSE status
        END as consolidated_status,
        COUNT(*) as count
      FROM candidates
      GROUP BY consolidated_status
    `).all();

    // Convert array to object format for frontend
    const stats = {
      pending: 0,
      active: 0,
      inactive: 0
    };

    statusStats.forEach(stat => {
      stats[stat.consolidated_status] = stat.count;
    });

    // Get total count
    const totalCandidates = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;

    // Recent registrations
    const recentRegistrations = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM candidates
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    // Active candidates (candidates with recent activity)
    const activeCandidatesCount = db.prepare(`
      SELECT COUNT(DISTINCT candidate_id) as count
      FROM deployments
      WHERE created_at >= DATE('now', '-30 days')
    `).get().count;

    res.json({
      success: true,
      data: stats,
      meta: {
        total: totalCandidates,
        recently_active: activeCandidatesCount,
        recent_registrations: recentRegistrations
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching candidate stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve candidate statistics',
      details: error.message
    });
  }
});

// Note: GET / is handled by listRoutes
// Module info moved to /info to avoid conflict

module.exports = router;