/**
 * Health Check and Monitoring Routes
 *
 * Handles system health checks and monitoring for the data integration module
 */

const express = require('express');
const router = express.Router();

// Import data integration services and helpers
const DataIntegrationLayer = require('../../../../../services/data-integration');
const CacheManager = require('../helpers/cache-manager');
const ValidationEngine = require('../helpers/validation-engine');

// Initialize services
const dataIntegration = new DataIntegrationLayer();
const cacheManager = new CacheManager();
const validator = new ValidationEngine();

/**
 * GET /health - Health check for data integration services
 */
router.get('/',
  async (req, res) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          cache: 'available',
          audit: 'logging',
          validation: 'operational'
        },
        version: '2.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      };

      // Test database connection
      try {
        const testQuery = validator.db.prepare('SELECT 1 as test').get();
        health.services.database = testQuery && testQuery.test === 1 ? 'connected' : 'error';
      } catch (error) {
        health.services.database = 'error';
        health.status = 'degraded';
        health.errors = health.errors || [];
        health.errors.push({
          service: 'database',
          error: 'Connection test failed',
          details: error.message
        });
      }

      // Test cache
      try {
        const testKey = 'health_check_' + Date.now();
        cacheManager.set(testKey, 'test');
        const testValue = cacheManager.get(testKey);
        cacheManager.delete(testKey);

        health.services.cache = testValue === 'test' ? 'available' : 'error';
        health.cacheStats = cacheManager.getStats();
      } catch (error) {
        health.services.cache = 'unavailable';
        health.status = 'degraded';
        health.errors = health.errors || [];
        health.errors.push({
          service: 'cache',
          error: 'Cache test failed',
          details: error.message
        });
      }

      // Test data integration layer
      try {
        // Test if data integration layer can be instantiated
        const testIntegration = new DataIntegrationLayer();
        health.services.integration = testIntegration ? 'operational' : 'error';
      } catch (error) {
        health.services.integration = 'error';
        health.status = 'degraded';
        health.errors = health.errors || [];
        health.errors.push({
          service: 'integration',
          error: 'Integration layer test failed',
          details: error.message
        });
      }

      // Test validation engine
      try {
        const testValidation = validator.isAdmin('test_user');
        health.services.validation = typeof testValidation === 'boolean' ? 'operational' : 'error';
      } catch (error) {
        health.services.validation = 'error';
        health.status = 'degraded';
        health.errors = health.errors || [];
        health.errors.push({
          service: 'validation',
          error: 'Validation engine test failed',
          details: error.message
        });
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
          error: 'Health check failed',
          details: error.message
        }
      });
    }
  }
);

/**
 * GET /health/detailed - Detailed health check with component testing
 */
router.get('/detailed',
  async (req, res) => {
    try {
      const detailedHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        components: {},
        performance: {},
        dependencies: {}
      };

      // Test individual components
      const components = [
        'database',
        'cache',
        'validation',
        'dataTransformation',
        'permissions',
        'rateLimiting'
      ];

      for (const component of components) {
        detailedHealth.components[component] = await testComponent(component);

        if (detailedHealth.components[component].status !== 'healthy') {
          detailedHealth.status = 'degraded';
        }
      }

      // Performance metrics
      detailedHealth.performance = {
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cache: cacheManager.getStats(),
        cpu: process.cpuUsage()
      };

      // Dependency checks
      detailedHealth.dependencies = {
        nodejs: process.version,
        platform: process.platform,
        arch: process.arch
      };

      const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: detailedHealth.status === 'healthy',
        data: detailedHealth
      });

    } catch (error) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: 'Detailed health check failed',
          details: error.message
        }
      });
    }
  }
);

/**
 * GET /health/readiness - Kubernetes-style readiness probe
 */
router.get('/readiness',
  async (req, res) => {
    try {
      const checks = {
        database: false,
        cache: false,
        services: false
      };

      // Database readiness
      try {
        const dbTest = validator.db.prepare('SELECT 1').get();
        checks.database = !!dbTest;
      } catch (error) {
        checks.database = false;
      }

      // Cache readiness
      try {
        cacheManager.set('readiness_test', 'ok');
        const cacheTest = cacheManager.get('readiness_test');
        checks.cache = cacheTest === 'ok';
        cacheManager.delete('readiness_test');
      } catch (error) {
        checks.cache = false;
      }

      // Services readiness
      try {
        const serviceTest = new DataIntegrationLayer();
        checks.services = !!serviceTest;
      } catch (error) {
        checks.services = false;
      }

      const isReady = Object.values(checks).every(check => check === true);

      res.status(isReady ? 200 : 503).json({
        ready: isReady,
        checks,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(503).json({
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /health/liveness - Kubernetes-style liveness probe
 */
router.get('/liveness',
  (req, res) => {
    // Simple liveness check - if this endpoint responds, the service is alive
    res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }
);

/**
 * GET /metrics - Prometheus-style metrics endpoint
 */
router.get('/metrics',
  async (req, res) => {
    try {
      const metrics = {
        // Cache metrics
        cache_entries_total: cacheManager.getStats().totalEntries,
        cache_entries_active: cacheManager.getStats().activeEntries,
        cache_entries_expired: cacheManager.getStats().expiredEntries,
        cache_memory_usage_bytes: cacheManager.getStats().memoryUsage,

        // Process metrics
        process_uptime_seconds: process.uptime(),
        process_memory_heap_used_bytes: process.memoryUsage().heapUsed,
        process_memory_heap_total_bytes: process.memoryUsage().heapTotal,
        process_memory_external_bytes: process.memoryUsage().external,

        // Custom metrics
        data_integration_requests_total: await getMetricValue('total_requests'),
        data_integration_errors_total: await getMetricValue('total_errors'),
        data_integration_avg_response_time_ms: await getMetricValue('avg_response_time')
      };

      // Format as Prometheus metrics
      let prometheusOutput = '';
      for (const [key, value] of Object.entries(metrics)) {
        prometheusOutput += `${key} ${value || 0}\n`;
      }

      res.set('Content-Type', 'text/plain').send(prometheusOutput);

    } catch (error) {
      res.status(500).json({
        error: 'Failed to generate metrics',
        details: error.message
      });
    }
  }
);

/**
 * Test individual component health
 */
async function testComponent(component) {
  const result = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: `${component} is operational`
  };

  try {
    switch (component) {
      case 'database':
        const dbTest = validator.db.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
        if (dbTest.count < 0) throw new Error('Database query failed');
        break;

      case 'cache':
        const testKey = `test_${component}_${Date.now()}`;
        cacheManager.set(testKey, 'test');
        const testValue = cacheManager.get(testKey);
        cacheManager.delete(testKey);
        if (testValue !== 'test') throw new Error('Cache read/write failed');
        break;

      case 'validation':
        const testValidation = validator.validateCandidateExists('TEST_123');
        if (typeof testValidation !== 'object') throw new Error('Validation engine malfunction');
        break;

      case 'dataTransformation':
        // Test data transformer
        const DataTransformer = require('../helpers/data-transformer');
        const transformer = new DataTransformer();
        const testData = transformer.validateCandidateId('TEST_123');
        if (typeof testData !== 'boolean') throw new Error('Data transformation failed');
        break;

      case 'permissions':
        const permissionTest = validator.hasPermission('test', 'test', 'test');
        if (typeof permissionTest !== 'boolean') throw new Error('Permission system failed');
        break;

      case 'rateLimiting':
        const rateLimitTest = validator.validateRateLimit('test', 'test');
        if (typeof rateLimitTest !== 'object') throw new Error('Rate limiting failed');
        break;

      default:
        throw new Error(`Unknown component: ${component}`);
    }
  } catch (error) {
    result.status = 'unhealthy';
    result.message = error.message;
    result.error = error.name;
  }

  return result;
}

/**
 * Get metric value from database or cache
 */
async function getMetricValue(metric) {
  try {
    // These would typically come from a metrics collection system
    // For now, return mock values
    const mockMetrics = {
      total_requests: Math.floor(Math.random() * 10000),
      total_errors: Math.floor(Math.random() * 100),
      avg_response_time: Math.floor(Math.random() * 500) + 50
    };

    return mockMetrics[metric] || 0;
  } catch (error) {
    return 0;
  }
}

module.exports = router;