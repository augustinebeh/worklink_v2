/**
 * BPO Routes Index
 * Mounts all BPO-related routes
 *
 * Replaces the monolithic bpo.js (880 lines) with modular structure:
 * - routes/unified-data.js - Dashboard unified data
 * - routes/opportunities.js - Tender opportunities
 * - routes/workflow.js - Workflow actions
 * - routes/analytics.js - Comprehensive analytics
 * - routes/health.js - Health checks
 * - routes/clients.js - Client management
 * - lifecycle.js - 7-stage tender pipeline
 * - helpers/ - Shared helper functions
 */

const express = require('express');
const router = express.Router();

// Import BPO route modules
const lifecycleRoutes = require('./lifecycle');
const unifiedDataRoutes = require('./routes/unified-data');
const opportunitiesRoutes = require('./routes/opportunities');
const workflowRoutes = require('./routes/workflow');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const clientRoutes = require('./routes/clients');

// Mount BPO routes
router.use('/lifecycle', lifecycleRoutes);
router.use('/unified-data', unifiedDataRoutes);
router.use('/opportunities', opportunitiesRoutes);
router.use('/workflow', workflowRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/health', healthRoutes);
router.use('/clients', clientRoutes);

module.exports = router;
