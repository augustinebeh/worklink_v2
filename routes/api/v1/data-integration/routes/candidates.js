/**
 * Candidate Data Integration Routes
 *
 * Handles comprehensive candidate data access and management
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
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

const validateDataType = [
  param('dataType')
    .isIn(['payment', 'account', 'jobs', 'withdrawal', 'interview'])
    .withMessage('Invalid data type'),
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
 * GET /comprehensive - Get comprehensive user data for chat responses
 */
router.get('/:candidateId/comprehensive',
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const requestType = req.query.type || 'chat_request';

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
      if (!validator.hasPermission(req.user.id, candidateId, 'comprehensive')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this data'
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'comprehensive');
      let userData = cacheManager.get(cacheKey);

      if (!userData) {
        // Get fresh data from service
        userData = await dataIntegration.getUserData(candidateId, requestType);

        // Transform and sanitize data
        userData = dataTransformer.sanitizeUserData(userData);

        // Cache the result
        cacheManager.set(cacheKey, userData);
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'comprehensive');

      res.json({
        success: true,
        data: userData,
        permissions: {
          canAccess: true,
          dataTypes: ['payment', 'account', 'jobs', 'withdrawal', 'interview']
        },
        metadata: dataTransformer.createMetadata('comprehensive', {
          cached: !!cacheManager.get(cacheKey),
          requestType
        })
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

/**
 * GET /:dataType - Get specific data type for a user
 */
router.get('/:candidateId/:dataType',
  validateCandidateId,
  validateDataType,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId, dataType } = req.params;

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
      if (!validator.hasPermission(req.user.id, candidateId, dataType)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this data type'
        });
      }

      // Check rate limits for sensitive data
      const rateLimit = validator.validateRateLimit(req.user.id, dataType);
      if (!rateLimit.valid) {
        return res.status(429).json({
          success: false,
          error: rateLimit.error,
          code: rateLimit.code,
          retryAfter: 3600 // 1 hour
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, dataType);
      let data = cacheManager.get(cacheKey);

      if (!data) {
        // Get fresh data from service
        data = await dataIntegration.getSpecificData(candidateId, dataType);

        // Transform data based on type
        data = transformDataByType(data, dataType);

        // Cache the result
        cacheManager.set(cacheKey, data);
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, dataType);

      res.json({
        success: true,
        dataType,
        data,
        metadata: dataTransformer.createMetadata(dataType, {
          cached: !!cacheManager.get(cacheKey),
          lastUpdated: new Date().toISOString(),
          source: 'database'
        })
      });

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
 * GET /verification - Get account verification status with detailed breakdown
 */
router.get('/:candidateId/account/verification',
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
      if (!validator.hasPermission(req.user.id, candidateId, 'account')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access account verification data'
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'verification');
      let verificationData = cacheManager.get(cacheKey);

      if (!verificationData) {
        // Get fresh data from service
        verificationData = await dataIntegration.accountService.getVerificationStatus(candidateId);

        // Transform verification data
        verificationData = dataTransformer.transformVerificationData(verificationData);

        // Cache the result
        cacheManager.set(cacheKey, verificationData);
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'account_verification');

      res.json({
        success: true,
        data: verificationData,
        metadata: dataTransformer.createMetadata('account_verification', {
          cached: !!cacheManager.get(cacheKey),
          completionPercentage: verificationData.overall.completionPercentage
        })
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

/**
 * DELETE /cache - Invalidate cached data for a user
 */
router.delete('/:candidateId/cache',
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { dataType } = req.query;

      // Only allow cache invalidation for own data or by admin
      if (req.user.id !== candidateId && !validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Can only invalidate cache for your own data'
        });
      }

      // Invalidate cache
      const deletedCount = cacheManager.invalidateCandidate(candidateId, dataType);

      // Log the action
      validator.logDataAccess(req.user.id, candidateId, dataType || 'all', 'cache_invalidate');

      res.json({
        success: true,
        message: `Cache invalidated for ${dataType ? dataType : 'all'} data`,
        candidateId,
        entriesRemoved: deletedCount
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

/**
 * Transform data based on data type
 */
function transformDataByType(data, dataType) {
  switch (dataType) {
    case 'payment':
      return dataTransformer.transformPaymentData(data);
    case 'jobs':
      return Array.isArray(data)
        ? data.map(job => dataTransformer.transformJobData(job))
        : dataTransformer.transformJobData(data);
    case 'withdrawal':
      return dataTransformer.transformWithdrawalData(data);
    case 'interview':
      return Array.isArray(data)
        ? data.map(interview => dataTransformer.transformInterviewData(interview))
        : dataTransformer.transformInterviewData(data);
    case 'account':
      return dataTransformer.transformVerificationData(data);
    default:
      return dataTransformer.sanitizeUserData(data);
  }
}

module.exports = router;