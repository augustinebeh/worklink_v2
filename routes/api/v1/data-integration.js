/**
 * Data Integration API Routes
 *
 * Secure endpoints for real-time data access with proper authentication,
 * rate limiting, and comprehensive error handling.
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

// Import data integration services
const DataIntegrationLayer = require('../../../services/data-integration');
const { authenticateUser } = require('../../../middleware/auth');

// Initialize data integration layer
const dataIntegration = new DataIntegrationLayer();

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

// Validation middleware
const validateCandidateId = [
  param('candidateId')
    .matches(/^[A-Z]{3}_[A-Z0-9_]+$/)
    .withMessage('Invalid candidate ID format'),
];

const validateDataType = [
  param('dataType')
    .isIn(['payment', 'account', 'jobs', 'withdrawal', 'interview'])
    .withMessage('Invalid data type'),
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// =====================================================
// COMPREHENSIVE USER DATA
// =====================================================

/**
 * GET /api/v1/data-integration/candidates/:candidateId/comprehensive
 * Get comprehensive user data for chat responses
 */
router.get('/candidates/:candidateId/comprehensive',
  authenticateUser,
  dataAccessRateLimit,
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const requestType = req.query.type || 'chat_request';

      // Check permissions
      if (!dataIntegration.hasPermission(req.user.id, candidateId, 'comprehensive')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this data'
        });
      }

      const userData = await dataIntegration.getUserData(candidateId, requestType);

      res.json({
        success: true,
        data: userData,
        permissions: {
          canAccess: true,
          dataTypes: ['payment', 'account', 'jobs', 'withdrawal', 'interview']
        }
      });

    } catch (error) {
      console.error('Comprehensive data access error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// =====================================================
// SPECIFIC DATA TYPES
// =====================================================

/**
 * GET /api/v1/data-integration/candidates/:candidateId/:dataType
 * Get specific data type for a user
 */
router.get('/candidates/:candidateId/:dataType',
  authenticateUser,
  dataAccessRateLimit,
  validateCandidateId,
  validateDataType,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId, dataType } = req.params;

      // Apply sensitive data rate limiting for payment/withdrawal data
      if (['payment', 'withdrawal'].includes(dataType)) {
        return sensitiveDataRateLimit(req, res, async () => {
          await processDataRequest(req, res, candidateId, dataType);
        });
      }

      await processDataRequest(req, res, candidateId, dataType);

    } catch (error) {
      console.error('Specific data access error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve specific data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * Process data request with permission checks
 */
async function processDataRequest(req, res, candidateId, dataType) {
  // Check permissions
  if (!dataIntegration.hasPermission(req.user.id, candidateId, dataType)) {
    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions to access this data type'
    });
  }

  const data = await dataIntegration.getSpecificData(candidateId, dataType);

  res.json({
    success: true,
    dataType,
    data,
    metadata: {
      lastUpdated: new Date().toISOString(),
      source: 'database',
      cacheStatus: 'refreshed'
    }
  });
}

// =====================================================
// PAYMENT DATA
// =====================================================

/**
 * GET /api/v1/data-integration/candidates/:candidateId/payments/status
 * Get detailed payment status with timeline
 */
router.get('/candidates/:candidateId/payments/status',
  authenticateUser,
  sensitiveDataRateLimit,
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      if (!dataIntegration.hasPermission(req.user.id, candidateId, 'payment')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access payment data'
        });
      }

      const paymentData = await dataIntegration.paymentService.getPaymentStatus(candidateId);

      res.json({
        success: true,
        data: paymentData,
        metadata: {
          dataType: 'payment_status',
          sensitive: true,
          retention: '7 years'
        }
      });

    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment status'
      });
    }
  }
);

/**
 * GET /api/v1/data-integration/candidates/:candidateId/payments/:paymentId
 * Get detailed payment information
 */
router.get('/candidates/:candidateId/payments/:paymentId',
  authenticateUser,
  sensitiveDataRateLimit,
  validateCandidateId,
  param('paymentId').matches(/^[A-Z]+_[A-Z0-9_]+$/).withMessage('Invalid payment ID format'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId, paymentId } = req.params;

      if (!dataIntegration.hasPermission(req.user.id, candidateId, 'payment')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access payment details'
        });
      }

      const paymentDetails = await dataIntegration.paymentService.getPaymentDetails(paymentId);

      // Verify payment belongs to the candidate
      if (paymentDetails.candidateId !== candidateId) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found'
        });
      }

      res.json({
        success: true,
        data: paymentDetails,
        metadata: {
          dataType: 'payment_details',
          sensitive: true
        }
      });

    } catch (error) {
      console.error('Payment details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment details'
      });
    }
  }
);

// =====================================================
// ACCOUNT VERIFICATION
// =====================================================

/**
 * GET /api/v1/data-integration/candidates/:candidateId/account/verification
 * Get account verification status with detailed breakdown
 */
router.get('/candidates/:candidateId/account/verification',
  authenticateUser,
  dataAccessRateLimit,
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      if (!dataIntegration.hasPermission(req.user.id, candidateId, 'account')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access account verification data'
        });
      }

      const verificationData = await dataIntegration.accountService.getVerificationStatus(candidateId);

      res.json({
        success: true,
        data: verificationData,
        metadata: {
          dataType: 'account_verification',
          completionPercentage: verificationData.verification.completionPercentage
        }
      });

    } catch (error) {
      console.error('Account verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve account verification status'
      });
    }
  }
);

// =====================================================
// JOB HISTORY & APPLICATIONS
// =====================================================

/**
 * GET /api/v1/data-integration/candidates/:candidateId/jobs/history
 * Get comprehensive job history and application status
 */
router.get('/candidates/:candidateId/jobs/history',
  authenticateUser,
  dataAccessRateLimit,
  validateCandidateId,
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      if (!dataIntegration.hasPermission(req.user.id, candidateId, 'jobs')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access job history'
        });
      }

      const jobData = await dataIntegration.jobService.getJobHistory(candidateId);

      res.json({
        success: true,
        data: jobData,
        metadata: {
          dataType: 'job_history',
          totalJobs: jobData.summary.totalJobs,
          completedJobs: jobData.summary.completedJobs
        }
      });

    } catch (error) {
      console.error('Job history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job history'
      });
    }
  }
);

// =====================================================
// WITHDRAWAL ELIGIBILITY
// =====================================================

/**
 * GET /api/v1/data-integration/candidates/:candidateId/withdrawals/eligibility
 * Get withdrawal eligibility status with real balance data
 */
router.get('/candidates/:candidateId/withdrawals/eligibility',
  authenticateUser,
  sensitiveDataRateLimit,
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      if (!dataIntegration.hasPermission(req.user.id, candidateId, 'withdrawal')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access withdrawal data'
        });
      }

      const withdrawalData = await dataIntegration.withdrawalService.getEligibilityStatus(candidateId);

      res.json({
        success: true,
        data: withdrawalData,
        metadata: {
          dataType: 'withdrawal_eligibility',
          sensitive: true,
          canWithdraw: withdrawalData.eligibility.canWithdraw
        }
      });

    } catch (error) {
      console.error('Withdrawal eligibility error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve withdrawal eligibility'
      });
    }
  }
);

/**
 * POST /api/v1/data-integration/candidates/:candidateId/withdrawals/request
 * Request a withdrawal
 */
router.post('/candidates/:candidateId/withdrawals/request',
  authenticateUser,
  sensitiveDataRateLimit,
  validateCandidateId,
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { amount } = req.body;

      // Only allow self-requests for withdrawals
      if (req.user.id !== candidateId && !dataIntegration.validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Can only request withdrawals for your own account'
        });
      }

      const result = await dataIntegration.withdrawalService.requestWithdrawal(candidateId, amount);

      res.json({
        success: true,
        data: result,
        message: 'Withdrawal request submitted successfully'
      });

    } catch (error) {
      console.error('Withdrawal request error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// INTERVIEW SCHEDULING
// =====================================================

/**
 * GET /api/v1/data-integration/candidates/:candidateId/interviews/schedule
 * Get interview scheduling status
 */
router.get('/candidates/:candidateId/interviews/schedule',
  authenticateUser,
  dataAccessRateLimit,
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      if (!dataIntegration.hasPermission(req.user.id, candidateId, 'interview')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access interview data'
        });
      }

      const interviewData = await dataIntegration.interviewService.getSchedulingStatus(candidateId);

      res.json({
        success: true,
        data: interviewData,
        metadata: {
          dataType: 'interview_schedule',
          hasRequirement: interviewData.requirements.isRequired
        }
      });

    } catch (error) {
      console.error('Interview schedule error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve interview schedule'
      });
    }
  }
);

/**
 * POST /api/v1/data-integration/candidates/:candidateId/interviews/schedule
 * Schedule a new interview
 */
router.post('/candidates/:candidateId/interviews/schedule',
  authenticateUser,
  generalRateLimit,
  validateCandidateId,
  body('date')
    .isISO8601()
    .withMessage('Date must be in ISO8601 format'),
  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  body('type')
    .optional()
    .isIn(['onboarding', 'specialized', 'general'])
    .withMessage('Invalid interview type'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { date, time, type } = req.body;

      // Only allow self-scheduling or admin/support
      if (req.user.id !== candidateId &&
          !dataIntegration.validator.isAdmin(req.user.id) &&
          !dataIntegration.validator.isSupportStaff(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Can only schedule interviews for your own account'
        });
      }

      const result = await dataIntegration.interviewService.scheduleInterview(candidateId, {
        date,
        time,
        type
      });

      res.json({
        success: true,
        data: result,
        message: 'Interview scheduled successfully'
      });

    } catch (error) {
      console.error('Interview scheduling error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// =====================================================
// CACHE MANAGEMENT
// =====================================================

/**
 * DELETE /api/v1/data-integration/candidates/:candidateId/cache
 * Invalidate cached data for a user
 */
router.delete('/candidates/:candidateId/cache',
  authenticateUser,
  generalRateLimit,
  validateCandidateId,
  query('dataType')
    .optional()
    .isIn(['payment', 'account', 'jobs', 'withdrawal', 'interview'])
    .withMessage('Invalid data type'),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { dataType } = req.query;

      // Only allow cache invalidation for own data or by admin
      if (req.user.id !== candidateId && !dataIntegration.validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Can only invalidate cache for your own data'
        });
      }

      await dataIntegration.invalidateCache(candidateId, dataType);

      res.json({
        success: true,
        message: `Cache invalidated for ${dataType ? dataType : 'all'} data`,
        candidateId
      });

    } catch (error) {
      console.error('Cache invalidation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache'
      });
    }
  }
);

// =====================================================
// STATISTICS & MONITORING
// =====================================================

/**
 * GET /api/v1/data-integration/statistics
 * Get data access statistics (admin only)
 */
router.get('/statistics',
  authenticateUser,
  generalRateLimit,
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO8601 format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO8601 format'),
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!dataIntegration.validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const filters = {};
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;

      const statistics = await dataIntegration.getAccessStatistics(filters);

      res.json({
        success: true,
        data: statistics,
        metadata: {
          generatedAt: new Date().toISOString(),
          filters
        }
      });

    } catch (error) {
      console.error('Statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics'
      });
    }
  }
);

// =====================================================
// HEALTH CHECK
// =====================================================

/**
 * GET /api/v1/data-integration/health
 * Health check for data integration services
 */
router.get('/health',
  generalRateLimit,
  async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          cache: 'available',
          audit: 'logging'
        },
        version: '1.0.0'
      };

      // Test database connection
      try {
        const testQuery = dataIntegration.validator.db.prepare('SELECT 1').get();
        health.services.database = testQuery ? 'connected' : 'error';
      } catch (error) {
        health.services.database = 'error';
        health.status = 'degraded';
      }

      // Test cache
      try {
        await dataIntegration.cache.get('health_check');
        health.services.cache = 'available';
      } catch (error) {
        health.services.cache = 'unavailable';
        health.status = 'degraded';
      }

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Health check failed'
        }
      });
    }
  }
);

module.exports = router;