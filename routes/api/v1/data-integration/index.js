/**
 * Data Integration API Routes - Main Router
 *
 * Secure endpoints for real-time data access with proper authentication,
 * rate limiting, and comprehensive error handling.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Import middleware
const { authenticateUser } = require('../../../../middleware/auth');

// Import route modules
const candidatesRouter = require('./routes/candidates');
const paymentsRouter = require('./routes/payments');
const jobsRouter = require('./routes/jobs');
const analyticsRouter = require('./routes/analytics');
const healthRouter = require('./routes/health');

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { success: false, error: message },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID + IP for more granular rate limiting
    return `${req.user?.id || 'anonymous'}:${req.ip}`;
  }
});

// Different rate limits for different endpoints
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests, please try again later'
);

const dataAccessRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  30, // 30 requests per window
  'Too many data access requests, please slow down'
);

const sensitiveDataRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 requests per window
  'Too many sensitive data requests, please try again later'
);

// Apply authentication to all routes except health checks
router.use('/health', healthRouter);
router.use(authenticateUser);

// Apply rate limiting
router.use(generalRateLimit);

// Mount route modules with their specific rate limits
router.use('/candidates', dataAccessRateLimit, candidatesRouter);
router.use('/payments', sensitiveDataRateLimit, paymentsRouter);
router.use('/jobs', dataAccessRateLimit, jobsRouter);
router.use('/analytics', generalRateLimit, analyticsRouter);

// Legacy compatibility routes - redirect to new structure
router.get('/candidates/:candidateId/comprehensive', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/candidates/${req.params.candidateId}/comprehensive`);
});

router.get('/candidates/:candidateId/:dataType', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/candidates/${req.params.candidateId}/${req.params.dataType}`);
});

router.get('/candidates/:candidateId/payments/status', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/payments/${req.params.candidateId}/status`);
});

router.get('/candidates/:candidateId/payments/:paymentId', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/payments/${req.params.candidateId}/${req.params.paymentId}`);
});

router.get('/candidates/:candidateId/account/verification', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/candidates/${req.params.candidateId}/account/verification`);
});

router.get('/candidates/:candidateId/jobs/history', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/jobs/${req.params.candidateId}/history`);
});

router.delete('/candidates/:candidateId/cache', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/candidates/${req.params.candidateId}/cache`);
});

router.get('/statistics', (req, res) => {
  res.redirect(301, `/api/v1/data-integration/analytics/statistics`);
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Data Integration API Documentation',
    version: '2.0.0',
    endpoints: {
      candidates: {
        'GET /candidates/:candidateId/comprehensive': 'Get comprehensive user data',
        'GET /candidates/:candidateId/:dataType': 'Get specific data type',
        'GET /candidates/:candidateId/account/verification': 'Get verification status',
        'DELETE /candidates/:candidateId/cache': 'Invalidate user cache'
      },
      payments: {
        'GET /payments/:candidateId/status': 'Get payment status with timeline',
        'GET /payments/:candidateId/:paymentId': 'Get payment details',
        'GET /payments/:candidateId/history': 'Get payment history',
        'GET /payments/:candidateId/summary': 'Get payment summary'
      },
      jobs: {
        'GET /jobs/:candidateId/history': 'Get job history',
        'GET /jobs/:candidateId/applications': 'Get job applications',
        'GET /jobs/:candidateId/upcoming': 'Get upcoming jobs',
        'GET /jobs/:candidateId/performance': 'Get job performance metrics'
      },
      analytics: {
        'GET /analytics/statistics': 'Get data access statistics (admin only)',
        'GET /analytics/usage-patterns': 'Get usage patterns (admin only)',
        'GET /analytics/data-quality': 'Get data quality metrics (admin only)',
        'GET /analytics/performance-metrics': 'Get system performance metrics (admin only)',
        'POST /analytics/trigger-cleanup': 'Trigger cache cleanup (admin only)'
      },
      health: {
        'GET /health': 'Basic health check',
        'GET /health/detailed': 'Detailed health check',
        'GET /health/readiness': 'Kubernetes readiness probe',
        'GET /health/liveness': 'Kubernetes liveness probe',
        'GET /health/metrics': 'Prometheus metrics'
      }
    },
    authentication: {
      required: true,
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>'
    },
    rateLimiting: {
      general: '100 requests per 15 minutes',
      dataAccess: '30 requests per 5 minutes',
      sensitiveData: '10 requests per 15 minutes'
    },
    dataTypes: [
      'payment',
      'account',
      'jobs',
      'withdrawal',
      'interview'
    ]
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Data Integration API Error:', error);

  // Rate limit error
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: error.retryAfter
    });
  }

  // Authentication error
  if (error.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  // Validation error
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details
    });
  }

  // Database error
  if (error.code === 'SQLITE_ERROR' || error.code?.startsWith('SQLITE_')) {
    return res.status(500).json({
      success: false,
      error: 'Database error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // Generic server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler for unmatched routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      '/candidates',
      '/payments',
      '/jobs',
      '/analytics',
      '/health',
      '/docs'
    ]
  });
});

module.exports = router;