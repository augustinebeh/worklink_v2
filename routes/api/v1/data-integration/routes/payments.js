/**
 * Payment Data Integration Routes
 *
 * Handles payment status, transaction history, and payment processing
 */

const express = require('express');
const { param, validationResult } = require('express-validator');
const router = express.Router();

// Import data integration services and helpers
const DataIntegrationLayer = require('../../../../../services/data-integration');
const DataTransformer = require('../helpers/data-transformer');
const CacheManager = require('../helpers/cache-manager');
const ValidationEngine = require('../helpers/validation-engine');

// Initialize services
const dataIntegration = new DataIntegrationLayer();
const dataTransformer = new DataTransformer();
const cacheManager = new CacheManager();
const validator = new ValidationEngine();

// Validation middleware
const validateCandidateId = [
  param('candidateId')
    .matches(/^[A-Z]{3}_[A-Z0-9_]+$/)
    .withMessage('Invalid candidate ID format'),
];

const validatePaymentId = [
  param('paymentId')
    .matches(/^[A-Z]+_[A-Z0-9_]+$/)
    .withMessage('Invalid payment ID format'),
];

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

/**
 * GET /:candidateId/status - Get detailed payment status with timeline
 */
router.get('/:candidateId/status',
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      // Validate candidate exists
      const candidateValidation = validator.validateCandidateExists(candidateId);
      if (!candidateValidation.valid) {
        return res.status(404).json({
          success: false,
          error: candidateValidation.error,
          code: candidateValidation.code
        });
      }

      // Check permissions
      if (!validator.hasPermission(req.user.id, candidateId, 'payment')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access payment data'
        });
      }

      // Check rate limits for payment data
      const rateLimit = validator.validateRateLimit(req.user.id, 'payment');
      if (!rateLimit.valid) {
        return res.status(429).json({
          success: false,
          error: rateLimit.error,
          code: rateLimit.code,
          retryAfter: 3600
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'payment_status');
      let paymentData = cacheManager.get(cacheKey);

      if (!paymentData) {
        // Get fresh data from service
        paymentData = await dataIntegration.paymentService.getPaymentStatus(candidateId);

        // Transform payment data
        paymentData = {
          ...paymentData,
          payments: paymentData.payments?.map(payment =>
            dataTransformer.transformPaymentData(payment)
          ) || [],
          summary: {
            totalPaid: parseFloat(paymentData.summary?.totalPaid || 0),
            totalPending: parseFloat(paymentData.summary?.totalPending || 0),
            totalOverdue: parseFloat(paymentData.summary?.totalOverdue || 0),
            currency: paymentData.summary?.currency || 'SGD',
            lastPayment: paymentData.summary?.lastPayment,
            nextPayment: paymentData.summary?.nextPayment
          }
        };

        // Cache the result (shorter TTL for payment data)
        cacheManager.set(cacheKey, paymentData, 2 * 60 * 1000); // 2 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'payment_status');

      res.json({
        success: true,
        data: paymentData,
        metadata: dataTransformer.createMetadata('payment_status', {
          cached: !!cacheManager.get(cacheKey),
          sensitive: true,
          retention: '7 years'
        })
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
 * GET /:candidateId/:paymentId - Get detailed payment information
 */
router.get('/:candidateId/:paymentId',
  validateCandidateId,
  validatePaymentId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId, paymentId } = req.params;

      // Validate candidate exists
      const candidateValidation = validator.validateCandidateExists(candidateId);
      if (!candidateValidation.valid) {
        return res.status(404).json({
          success: false,
          error: candidateValidation.error,
          code: candidateValidation.code
        });
      }

      // Check permissions
      if (!validator.hasPermission(req.user.id, candidateId, 'payment')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access payment details'
        });
      }

      // Validate payment ownership
      const paymentValidation = validator.validatePaymentOwnership(paymentId, candidateId);
      if (!paymentValidation.valid) {
        return res.status(404).json({
          success: false,
          error: paymentValidation.error,
          code: paymentValidation.code
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'payment_details', { id: paymentId });
      let paymentDetails = cacheManager.get(cacheKey);

      if (!paymentDetails) {
        // Get fresh data from service
        paymentDetails = await dataIntegration.paymentService.getPaymentDetails(paymentId);

        // Transform payment details
        paymentDetails = dataTransformer.transformPaymentData(paymentDetails);

        // Add additional computed fields
        paymentDetails.timeline = await getPaymentTimeline(paymentId);
        paymentDetails.relatedTransactions = await getRelatedTransactions(candidateId, paymentId);

        // Cache the result
        cacheManager.set(cacheKey, paymentDetails, 5 * 60 * 1000); // 5 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'payment_details');

      res.json({
        success: true,
        data: paymentDetails,
        metadata: dataTransformer.createMetadata('payment_details', {
          cached: !!cacheManager.get(cacheKey),
          sensitive: true
        })
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

/**
 * GET /:candidateId/history - Get payment history with pagination
 */
router.get('/:candidateId/history',
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const pagination = dataTransformer.validatePagination(req.query);

      // Validate candidate exists
      const candidateValidation = validator.validateCandidateExists(candidateId);
      if (!candidateValidation.valid) {
        return res.status(404).json({
          success: false,
          error: candidateValidation.error,
          code: candidateValidation.code
        });
      }

      // Check permissions
      if (!validator.hasPermission(req.user.id, candidateId, 'payment')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access payment history'
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'payment_history', {
        suffix: `${pagination.page}_${pagination.limit}`
      });
      let paymentHistory = cacheManager.get(cacheKey);

      if (!paymentHistory) {
        // Get fresh data from service
        paymentHistory = await dataIntegration.paymentService.getPaymentHistory(
          candidateId,
          pagination
        );

        // Transform payment history
        paymentHistory = {
          ...paymentHistory,
          payments: paymentHistory.payments?.map(payment =>
            dataTransformer.transformPaymentData(payment)
          ) || [],
          pagination: {
            ...pagination,
            total: paymentHistory.total || 0,
            totalPages: Math.ceil((paymentHistory.total || 0) / pagination.limit)
          }
        };

        // Cache the result
        cacheManager.set(cacheKey, paymentHistory, 10 * 60 * 1000); // 10 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'payment_history');

      res.json({
        success: true,
        data: paymentHistory,
        metadata: dataTransformer.createMetadata('payment_history', {
          cached: !!cacheManager.get(cacheKey),
          pagination: paymentHistory.pagination
        })
      });

    } catch (error) {
      console.error('Payment history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment history'
      });
    }
  }
);

/**
 * GET /:candidateId/summary - Get payment summary statistics
 */
router.get('/:candidateId/summary',
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;

      // Validate candidate exists
      const candidateValidation = validator.validateCandidateExists(candidateId);
      if (!candidateValidation.valid) {
        return res.status(404).json({
          success: false,
          error: candidateValidation.error,
          code: candidateValidation.code
        });
      }

      // Check permissions
      if (!validator.hasPermission(req.user.id, candidateId, 'payment')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access payment summary'
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'payment_summary');
      let paymentSummary = cacheManager.get(cacheKey);

      if (!paymentSummary) {
        // Get fresh data from service
        paymentSummary = await dataIntegration.paymentService.getPaymentSummary(candidateId);

        // Format currency amounts
        paymentSummary = {
          ...paymentSummary,
          totalEarnings: parseFloat(paymentSummary.totalEarnings || 0),
          totalPaid: parseFloat(paymentSummary.totalPaid || 0),
          pendingAmount: parseFloat(paymentSummary.pendingAmount || 0),
          availableBalance: parseFloat(paymentSummary.availableBalance || 0),
          averagePayment: parseFloat(paymentSummary.averagePayment || 0),
          currency: paymentSummary.currency || 'SGD',
          formattedAmounts: {
            totalEarnings: dataTransformer.formatCurrency(paymentSummary.totalEarnings),
            totalPaid: dataTransformer.formatCurrency(paymentSummary.totalPaid),
            pendingAmount: dataTransformer.formatCurrency(paymentSummary.pendingAmount),
            availableBalance: dataTransformer.formatCurrency(paymentSummary.availableBalance)
          }
        };

        // Cache the result
        cacheManager.set(cacheKey, paymentSummary, 15 * 60 * 1000); // 15 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'payment_summary');

      res.json({
        success: true,
        data: paymentSummary,
        metadata: dataTransformer.createMetadata('payment_summary', {
          cached: !!cacheManager.get(cacheKey)
        })
      });

    } catch (error) {
      console.error('Payment summary error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment summary'
      });
    }
  }
);

/**
 * Helper function to get payment timeline
 */
async function getPaymentTimeline(paymentId) {
  try {
    return await dataIntegration.paymentService.getPaymentTimeline(paymentId);
  } catch (error) {
    console.error('Error getting payment timeline:', error);
    return [];
  }
}

/**
 * Helper function to get related transactions
 */
async function getRelatedTransactions(candidateId, paymentId) {
  try {
    return await dataIntegration.paymentService.getRelatedTransactions(candidateId, paymentId);
  } catch (error) {
    console.error('Error getting related transactions:', error);
    return [];
  }
}

module.exports = router;