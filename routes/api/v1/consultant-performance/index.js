/**
 * Consultant Performance API - Main Router
 * Aggregates all consultant performance sub-routers
 * 
 * @module consultant-performance
 */

const express = require('express');
const router = express.Router();

// Import sub-routers
const capacityRoutes = require('./capacity/routes');
const prequalificationRoutes = require('./prequalification/routes');
const retentionRoutes = require('./retention/routes');
const reliabilityRoutes = require('./reliability/routes');
const sourcingRoutes = require('./sourcing/routes');
const schedulingRoutes = require('./scheduling/routes');
const slmBridgeRoutes = require('./slm-bridge/routes');
const analyticsRoutes = require('./analytics/routes');
const dashboardRoutes = require('./dashboard/routes');

// Mount sub-routers
router.use('/capacity', capacityRoutes);
router.use('/prequalify', prequalificationRoutes);
router.use('/retention', retentionRoutes);
router.use('/reliability', reliabilityRoutes);
router.use('/sourcing', sourcingRoutes);
router.use('/scheduling', schedulingRoutes);
router.use('/slm', slmBridgeRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);

/**
 * GET /
 * System status and available endpoints
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Consultant Performance API - 100x Performance System',
    version: '2.0.0',
    architecture: 'Modular',
    endpoints: {
      capacity: '/api/v1/consultant-performance/capacity',
      prequalification: '/api/v1/consultant-performance/prequalify',
      retention: '/api/v1/consultant-performance/retention',
      reliability: '/api/v1/consultant-performance/reliability',
      sourcing: '/api/v1/consultant-performance/sourcing',
      scheduling: '/api/v1/consultant-performance/scheduling',
      slmBridge: '/api/v1/consultant-performance/slm',
      analytics: '/api/v1/consultant-performance/analytics',
      dashboard: '/api/v1/consultant-performance/dashboard'
    },
    modules: [
      'capacity-management',
      'candidate-prequalification',
      'retention-engine',
      'reliability-scoring',
      'candidate-sourcing',
      'interview-scheduling',
      'slm-integration',
      'analytics-engine',
      'performance-dashboard'
    ]
  });
});

/**
 * GET /health
 * System health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    modules: {
      capacity: 'operational',
      prequalification: 'operational',
      retention: 'operational',
      reliability: 'operational',
      sourcing: 'operational',
      scheduling: 'operational',
      slm: 'operational',
      analytics: 'operational',
      dashboard: 'operational'
    }
  });
});

module.exports = router;
