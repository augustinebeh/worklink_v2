/**
 * Job Data Integration Routes
 *
 * Handles job history, applications, and job-related data
 */

const express = require('express');
const { param, query, validationResult } = require('express-validator');
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
 * GET /:candidateId/history - Get comprehensive job history and application status
 */
router.get('/:candidateId/history',
  validateCandidateId,
  validatePagination,
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
      if (!validator.hasPermission(req.user.id, candidateId, 'jobs')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access job history'
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'job_history', {
        suffix: `${pagination.page}_${pagination.limit}`
      });
      let jobData = cacheManager.get(cacheKey);

      if (!jobData) {
        // Get fresh data from service
        jobData = await dataIntegration.jobService.getJobHistory(candidateId, pagination);

        // Transform job data
        jobData = {
          ...jobData,
          jobs: jobData.jobs?.map(job => dataTransformer.transformJobData(job)) || [],
          summary: {
            totalJobs: jobData.summary?.totalJobs || 0,
            completedJobs: jobData.summary?.completedJobs || 0,
            pendingJobs: jobData.summary?.pendingJobs || 0,
            cancelledJobs: jobData.summary?.cancelledJobs || 0,
            totalEarnings: parseFloat(jobData.summary?.totalEarnings || 0),
            totalHours: parseFloat(jobData.summary?.totalHours || 0),
            averageRating: parseFloat(jobData.summary?.averageRating || 0),
            successRate: parseFloat(jobData.summary?.successRate || 0)
          },
          pagination: {
            ...pagination,
            total: jobData.total || 0,
            totalPages: Math.ceil((jobData.total || 0) / pagination.limit)
          }
        };

        // Cache the result
        cacheManager.set(cacheKey, jobData, 10 * 60 * 1000); // 10 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'job_history');

      res.json({
        success: true,
        data: jobData,
        metadata: dataTransformer.createMetadata('job_history', {
          cached: !!cacheManager.get(cacheKey),
          pagination: jobData.pagination,
          totalJobs: jobData.summary.totalJobs,
          completedJobs: jobData.summary.completedJobs
        })
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

/**
 * GET /:candidateId/applications - Get job applications and their status
 */
router.get('/:candidateId/applications',
  validateCandidateId,
  validatePagination,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { status, startDate, endDate } = req.query;
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
      if (!validator.hasPermission(req.user.id, candidateId, 'jobs')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access job applications'
        });
      }

      // Build filters
      const filters = {
        status,
        startDate,
        endDate,
        ...pagination
      };

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'job_applications', {
        suffix: JSON.stringify(filters)
      });
      let applications = cacheManager.get(cacheKey);

      if (!applications) {
        // Get fresh data from service
        applications = await dataIntegration.jobService.getJobApplications(candidateId, filters);

        // Transform application data
        applications = {
          ...applications,
          applications: applications.applications?.map(app => ({
            id: app.id,
            jobId: app.job_id,
            jobTitle: app.job_title,
            clientName: app.client_name,
            appliedAt: app.applied_at,
            status: app.status,
            statusUpdatedAt: app.status_updated_at,
            notes: app.notes,
            rating: app.rating,
            feedback: app.feedback,
            job: dataTransformer.transformJobData(app.job_details)
          })) || [],
          summary: {
            total: applications.total || 0,
            pending: applications.summary?.pending || 0,
            accepted: applications.summary?.accepted || 0,
            rejected: applications.summary?.rejected || 0,
            withdrawn: applications.summary?.withdrawn || 0
          },
          pagination: {
            ...pagination,
            total: applications.total || 0,
            totalPages: Math.ceil((applications.total || 0) / pagination.limit)
          }
        };

        // Cache the result
        cacheManager.set(cacheKey, applications, 5 * 60 * 1000); // 5 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'job_applications');

      res.json({
        success: true,
        data: applications,
        metadata: dataTransformer.createMetadata('job_applications', {
          cached: !!cacheManager.get(cacheKey),
          filters,
          pagination: applications.pagination
        })
      });

    } catch (error) {
      console.error('Job applications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job applications'
      });
    }
  }
);

/**
 * GET /:candidateId/upcoming - Get upcoming jobs and deployments
 */
router.get('/:candidateId/upcoming',
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { days = 30 } = req.query;

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
      if (!validator.hasPermission(req.user.id, candidateId, 'jobs')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access upcoming jobs'
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'upcoming_jobs', {
        suffix: days.toString()
      });
      let upcomingJobs = cacheManager.get(cacheKey);

      if (!upcomingJobs) {
        // Get fresh data from service
        upcomingJobs = await dataIntegration.jobService.getUpcomingJobs(candidateId, days);

        // Transform upcoming jobs data
        upcomingJobs = {
          ...upcomingJobs,
          jobs: upcomingJobs.jobs?.map(job => ({
            ...dataTransformer.transformJobData(job),
            deploymentStatus: job.deployment_status,
            confirmationRequired: job.confirmation_required,
            timeUntilStart: calculateTimeUntilStart(job.job_date, job.start_time),
            preparation: {
              required: job.preparation_required || false,
              notes: job.preparation_notes,
              checklist: job.preparation_checklist ? JSON.parse(job.preparation_checklist) : []
            }
          })) || [],
          summary: {
            total: upcomingJobs.total || 0,
            confirmed: upcomingJobs.summary?.confirmed || 0,
            pending: upcomingJobs.summary?.pending || 0,
            totalEarnings: parseFloat(upcomingJobs.summary?.totalEarnings || 0),
            totalHours: parseFloat(upcomingJobs.summary?.totalHours || 0)
          }
        };

        // Cache the result (shorter TTL for upcoming jobs)
        cacheManager.set(cacheKey, upcomingJobs, 5 * 60 * 1000); // 5 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'upcoming_jobs');

      res.json({
        success: true,
        data: upcomingJobs,
        metadata: dataTransformer.createMetadata('upcoming_jobs', {
          cached: !!cacheManager.get(cacheKey),
          lookAheadDays: parseInt(days)
        })
      });

    } catch (error) {
      console.error('Upcoming jobs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve upcoming jobs'
      });
    }
  }
);

/**
 * GET /:candidateId/performance - Get job performance metrics
 */
router.get('/:candidateId/performance',
  validateCandidateId,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { period = 'all' } = req.query; // all, year, quarter, month

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
      if (!validator.hasPermission(req.user.id, candidateId, 'jobs')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access performance data'
        });
      }

      // Check cache first
      const cacheKey = cacheManager.generateKey(candidateId, 'job_performance', {
        suffix: period
      });
      let performance = cacheManager.get(cacheKey);

      if (!performance) {
        // Get fresh data from service
        performance = await dataIntegration.jobService.getJobPerformance(candidateId, period);

        // Transform performance data
        performance = {
          period,
          metrics: {
            totalJobs: performance.totalJobs || 0,
            completedJobs: performance.completedJobs || 0,
            completionRate: parseFloat((performance.completedJobs / performance.totalJobs * 100) || 0).toFixed(1),
            averageRating: parseFloat(performance.averageRating || 0).toFixed(1),
            totalEarnings: parseFloat(performance.totalEarnings || 0),
            totalHours: parseFloat(performance.totalHours || 0),
            averageHourlyRate: performance.totalHours > 0 ? parseFloat(performance.totalEarnings / performance.totalHours).toFixed(2) : 0,
            punctualityScore: parseFloat(performance.punctualityScore || 100).toFixed(1),
            noShowCount: performance.noShowCount || 0,
            cancelledJobs: performance.cancelledJobs || 0,
            clientRebookRate: parseFloat(performance.clientRebookRate || 0).toFixed(1)
          },
          trends: performance.trends || [],
          strengths: performance.strengths || [],
          improvementAreas: performance.improvementAreas || [],
          certifications: performance.certifications || [],
          achievements: performance.achievements || []
        };

        // Cache the result
        cacheManager.set(cacheKey, performance, 30 * 60 * 1000); // 30 minutes
      }

      // Log access
      validator.logDataAccess(req.user.id, candidateId, 'job_performance');

      res.json({
        success: true,
        data: performance,
        metadata: dataTransformer.createMetadata('job_performance', {
          cached: !!cacheManager.get(cacheKey),
          period
        })
      });

    } catch (error) {
      console.error('Job performance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job performance data'
      });
    }
  }
);

/**
 * Helper function to calculate time until job start
 */
function calculateTimeUntilStart(jobDate, startTime) {
  try {
    const jobDateTime = new Date(`${jobDate} ${startTime}`);
    const now = new Date();
    const diff = jobDateTime.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Started';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  } catch (error) {
    return 'Unknown';
  }
}

module.exports = router;