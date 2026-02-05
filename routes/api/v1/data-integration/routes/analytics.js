/**
 * Analytics Data Integration Routes
 *
 * Handles analytics data aggregation and statistics for admin portal
 */

const express = require('express');
const { query, validationResult } = require('express-validator');
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
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be in ISO8601 format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be in ISO8601 format'),
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
 * GET /statistics - Get data access statistics (admin only)
 */
router.get('/statistics',
  validateDateRange,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Admin access required
      if (!validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const filters = {};
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;

      // Check cache first
      const cacheKey = `analytics_statistics_${JSON.stringify(filters)}`;
      let statistics = cacheManager.get(cacheKey);

      if (!statistics) {
        // Get fresh data from service
        statistics = await dataIntegration.getAccessStatistics(filters);

        // Transform statistics data
        statistics = {
          overview: {
            totalRequests: statistics.totalRequests || 0,
            uniqueUsers: statistics.uniqueUsers || 0,
            totalDataAccessed: statistics.totalDataAccessed || 0,
            averageResponseTime: parseFloat(statistics.averageResponseTime || 0).toFixed(2),
            errorRate: parseFloat(statistics.errorRate || 0).toFixed(2)
          },
          byDataType: statistics.byDataType || {},
          byUser: statistics.byUser || [],
          byTimeOfDay: statistics.byTimeOfDay || [],
          trends: statistics.trends || [],
          performance: {
            cacheHitRate: parseFloat(statistics.cacheHitRate || 0).toFixed(1),
            averageQueryTime: parseFloat(statistics.averageQueryTime || 0).toFixed(2),
            slowQueries: statistics.slowQueries || []
          },
          security: {
            failedPermissionChecks: statistics.failedPermissionChecks || 0,
            suspiciousActivity: statistics.suspiciousActivity || [],
            rateLimitViolations: statistics.rateLimitViolations || 0
          }
        };

        // Cache the result
        cacheManager.set(cacheKey, statistics, 15 * 60 * 1000); // 15 minutes
      }

      // Log admin access
      validator.logDataAccess(req.user.id, 'system', 'analytics_statistics');

      res.json({
        success: true,
        data: statistics,
        metadata: dataTransformer.createMetadata('analytics_statistics', {
          cached: !!cacheManager.get(cacheKey),
          generatedAt: new Date().toISOString(),
          filters
        })
      });

    } catch (error) {
      console.error('Analytics statistics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics statistics'
      });
    }
  }
);

/**
 * GET /usage-patterns - Get data usage patterns and insights
 */
router.get('/usage-patterns',
  validateDateRange,
  handleValidationErrors,
  async (req, res) => {
    try {
      // Admin access required
      if (!validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { period = 'week' } = req.query; // week, month, quarter, year
      const filters = { period };

      // Check cache first
      const cacheKey = `analytics_usage_patterns_${period}`;
      let usagePatterns = cacheManager.get(cacheKey);

      if (!usagePatterns) {
        // Get fresh data from service
        usagePatterns = await dataIntegration.getUsagePatterns(filters);

        // Transform usage patterns
        usagePatterns = {
          period,
          summary: {
            totalSessions: usagePatterns.totalSessions || 0,
            averageSessionDuration: parseFloat(usagePatterns.averageSessionDuration || 0).toFixed(2),
            peakUsageHour: usagePatterns.peakUsageHour || '9:00',
            mostAccessedDataType: usagePatterns.mostAccessedDataType || 'unknown',
            userEngagementScore: parseFloat(usagePatterns.userEngagementScore || 0).toFixed(1)
          },
          patterns: {
            hourlyUsage: usagePatterns.hourlyUsage || [],
            dailyUsage: usagePatterns.dailyUsage || [],
            dataTypeDistribution: usagePatterns.dataTypeDistribution || {},
            userSegments: usagePatterns.userSegments || []
          },
          insights: {
            growthRate: parseFloat(usagePatterns.growthRate || 0).toFixed(1),
            retentionRate: parseFloat(usagePatterns.retentionRate || 0).toFixed(1),
            churnRisk: usagePatterns.churnRisk || [],
            recommendations: usagePatterns.recommendations || []
          }
        };

        // Cache the result
        cacheManager.set(cacheKey, usagePatterns, 30 * 60 * 1000); // 30 minutes
      }

      // Log admin access
      validator.logDataAccess(req.user.id, 'system', 'usage_patterns');

      res.json({
        success: true,
        data: usagePatterns,
        metadata: dataTransformer.createMetadata('usage_patterns', {
          cached: !!cacheManager.get(cacheKey),
          period
        })
      });

    } catch (error) {
      console.error('Usage patterns error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage patterns'
      });
    }
  }
);

/**
 * GET /data-quality - Get data quality metrics and issues
 */
router.get('/data-quality',
  handleValidationErrors,
  async (req, res) => {
    try {
      // Admin access required
      if (!validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Check cache first
      const cacheKey = 'analytics_data_quality';
      let dataQuality = cacheManager.get(cacheKey);

      if (!dataQuality) {
        // Get fresh data from service
        dataQuality = await dataIntegration.getDataQualityMetrics();

        // Transform data quality metrics
        dataQuality = {
          overall: {
            score: parseFloat(dataQuality.overallScore || 0).toFixed(1),
            issues: dataQuality.totalIssues || 0,
            coverage: parseFloat(dataQuality.dataCoverage || 0).toFixed(1),
            accuracy: parseFloat(dataQuality.dataAccuracy || 0).toFixed(1),
            completeness: parseFloat(dataQuality.dataCompleteness || 0).toFixed(1)
          },
          byDataType: {
            candidates: {
              totalRecords: dataQuality.candidates?.totalRecords || 0,
              completeRecords: dataQuality.candidates?.completeRecords || 0,
              issuesFound: dataQuality.candidates?.issuesFound || 0,
              qualityScore: parseFloat(dataQuality.candidates?.qualityScore || 0).toFixed(1)
            },
            payments: {
              totalRecords: dataQuality.payments?.totalRecords || 0,
              completeRecords: dataQuality.payments?.completeRecords || 0,
              issuesFound: dataQuality.payments?.issuesFound || 0,
              qualityScore: parseFloat(dataQuality.payments?.qualityScore || 0).toFixed(1)
            },
            jobs: {
              totalRecords: dataQuality.jobs?.totalRecords || 0,
              completeRecords: dataQuality.jobs?.completeRecords || 0,
              issuesFound: dataQuality.jobs?.issuesFound || 0,
              qualityScore: parseFloat(dataQuality.jobs?.qualityScore || 0).toFixed(1)
            }
          },
          issues: dataQuality.issues || [],
          recommendations: dataQuality.recommendations || []
        };

        // Cache the result
        cacheManager.set(cacheKey, dataQuality, 60 * 60 * 1000); // 1 hour
      }

      // Log admin access
      validator.logDataAccess(req.user.id, 'system', 'data_quality');

      res.json({
        success: true,
        data: dataQuality,
        metadata: dataTransformer.createMetadata('data_quality', {
          cached: !!cacheManager.get(cacheKey)
        })
      });

    } catch (error) {
      console.error('Data quality error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve data quality metrics'
      });
    }
  }
);

/**
 * GET /performance-metrics - Get system performance metrics
 */
router.get('/performance-metrics',
  handleValidationErrors,
  async (req, res) => {
    try {
      // Admin access required
      if (!validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Check cache first
      const cacheKey = 'analytics_performance_metrics';
      let performanceMetrics = cacheManager.get(cacheKey);

      if (!performanceMetrics) {
        // Get fresh data from service and cache stats
        const cacheStats = cacheManager.getStats();
        performanceMetrics = await dataIntegration.getPerformanceMetrics();

        // Transform performance metrics
        performanceMetrics = {
          cache: {
            hitRate: parseFloat(cacheStats.activeEntries / (cacheStats.activeEntries + cacheStats.expiredEntries) * 100 || 0).toFixed(1),
            totalEntries: cacheStats.totalEntries,
            activeEntries: cacheStats.activeEntries,
            expiredEntries: cacheStats.expiredEntries,
            memoryUsage: Math.round(cacheStats.memoryUsage / 1024), // KB
            uptime: Math.round(cacheStats.uptime / 1000) // seconds
          },
          database: {
            averageQueryTime: parseFloat(performanceMetrics.database?.averageQueryTime || 0).toFixed(2),
            slowQueries: performanceMetrics.database?.slowQueries || 0,
            connectionPool: performanceMetrics.database?.connectionPool || {},
            indexEfficiency: parseFloat(performanceMetrics.database?.indexEfficiency || 0).toFixed(1)
          },
          api: {
            averageResponseTime: parseFloat(performanceMetrics.api?.averageResponseTime || 0).toFixed(2),
            requestsPerSecond: parseFloat(performanceMetrics.api?.requestsPerSecond || 0).toFixed(2),
            errorRate: parseFloat(performanceMetrics.api?.errorRate || 0).toFixed(2),
            uptime: parseFloat(performanceMetrics.api?.uptime || 0).toFixed(2)
          },
          security: {
            rateLimitHits: performanceMetrics.security?.rateLimitHits || 0,
            failedAuthentications: performanceMetrics.security?.failedAuthentications || 0,
            suspiciousRequests: performanceMetrics.security?.suspiciousRequests || 0
          }
        };

        // Cache the result (shorter TTL for performance data)
        cacheManager.set(cacheKey, performanceMetrics, 2 * 60 * 1000); // 2 minutes
      }

      // Log admin access
      validator.logDataAccess(req.user.id, 'system', 'performance_metrics');

      res.json({
        success: true,
        data: performanceMetrics,
        metadata: dataTransformer.createMetadata('performance_metrics', {
          cached: !!cacheManager.get(cacheKey)
        })
      });

    } catch (error) {
      console.error('Performance metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics'
      });
    }
  }
);

/**
 * POST /trigger-cleanup - Trigger cache cleanup (admin only)
 */
router.post('/trigger-cleanup',
  async (req, res) => {
    try {
      // Admin access required
      if (!validator.isAdmin(req.user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      // Perform cleanup
      const cleanedCount = cacheManager.cleanup();

      // Log admin action
      validator.logDataAccess(req.user.id, 'system', 'cache_cleanup');

      res.json({
        success: true,
        message: 'Cache cleanup completed',
        entriesRemoved: cleanedCount,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Cache cleanup error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform cache cleanup'
      });
    }
  }
);

module.exports = router;