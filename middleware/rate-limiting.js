/**
 * Advanced Rate Limiting Middleware
 *
 * Provides sophisticated rate limiting with different strategies
 * for different types of requests and user roles.
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

class RateLimitingManager {
  constructor() {
    this.redisClient = null;
    this.initializeRedis();

    // Define rate limiting tiers based on user roles
    this.rateLimitTiers = {
      admin: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // Very high limit for admins
        skipSuccessfulRequests: true
      },
      support: {
        windowMs: 15 * 60 * 1000,
        max: 300, // High limit for support staff
        skipSuccessfulRequests: true
      },
      premium: {
        windowMs: 15 * 60 * 1000,
        max: 200, // Higher limit for premium users
        skipSuccessfulRequests: false
      },
      standard: {
        windowMs: 15 * 60 * 1000,
        max: 100, // Standard limit
        skipSuccessfulRequests: false
      },
      guest: {
        windowMs: 15 * 60 * 1000,
        max: 20, // Very limited for unauthenticated users
        skipSuccessfulRequests: false
      }
    };

    // Endpoint-specific rate limits
    this.endpointLimits = {
      sensitive: {
        windowMs: 15 * 60 * 1000,
        max: 10, // Very restrictive for sensitive data
        message: 'Too many requests for sensitive data'
      },
      authentication: {
        windowMs: 15 * 60 * 1000,
        max: 5, // Limit login attempts
        message: 'Too many authentication attempts'
      },
      upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50, // Limit file uploads
        message: 'Too many upload requests'
      },
      search: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 100, // Allow more search requests
        message: 'Too many search requests'
      }
    };
  }

  /**
   * Initialize Redis client for distributed rate limiting
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        const redis = require('redis');

        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
          socket: {
            connectTimeout: 5000,
            commandTimeout: 5000,
          }
        });

        await this.redisClient.connect();
        console.log('✅ Rate limiting Redis store connected');
      }
    } catch (error) {
      console.log('⚠️ Redis unavailable for rate limiting, using memory store');
      this.redisClient = null;
    }
  }

  /**
   * Create rate limiter with Redis store if available
   */
  createRateLimiter(options) {
    const config = {
      ...options,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: this.generateKey.bind(this),
      handler: this.handleRateLimit.bind(this),
      onLimitReached: this.onLimitReached.bind(this)
    };

    // Use Redis store if available
    if (this.redisClient && this.redisClient.isOpen) {
      config.store = new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args),
        prefix: 'rl:'
      });
    }

    return rateLimit(config);
  }

  /**
   * Generate unique key for rate limiting
   */
  generateKey(req) {
    const userId = req.user?.id || 'anonymous';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Create a more specific key for better tracking
    const endpoint = req.route?.path || req.path;
    const method = req.method;

    // For sensitive endpoints, include more granular tracking
    if (this.isSensitiveEndpoint(endpoint)) {
      return `${userId}:${ip}:${method}:${endpoint}`;
    }

    // Standard key for general requests
    return `${userId}:${ip}`;
  }

  /**
   * Handle rate limit exceeded
   */
  handleRateLimit(req, res) {
    const retryAfter = Math.round(req.rateLimit.resetTime.getTime() - Date.now()) / 1000;

    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: retryAfter,
      limit: req.rateLimit.limit,
      remaining: req.rateLimit.remaining,
      resetTime: req.rateLimit.resetTime,
      message: this.getCustomMessage(req)
    });

    // Log rate limit event for monitoring
    this.logRateLimitEvent(req);
  }

  /**
   * Called when rate limit is reached for the first time
   */
  onLimitReached(req) {
    console.warn(`Rate limit reached for ${req.user?.id || 'anonymous'} from ${req.ip}`);

    // Log security event for suspicious activity
    if (req.user) {
      this.checkSuspiciousActivity(req);
    }
  }

  /**
   * Get user tier based on role and subscription
   */
  getUserTier(user) {
    if (!user) return 'guest';

    // Check user role
    if (user.role === 'admin' || user.role === 'super_admin') return 'admin';
    if (user.role === 'support' || user.role === 'customer_service') return 'support';

    // Check subscription level
    if (user.subscription === 'premium' || user.tier === 'premium') return 'premium';

    return 'standard';
  }

  /**
   * Create tier-based rate limiter
   */
  createTierBasedLimiter(baseOptions = {}) {
    return (req, res, next) => {
      const userTier = this.getUserTier(req.user);
      const tierConfig = this.rateLimitTiers[userTier];

      const limiter = this.createRateLimiter({
        ...tierConfig,
        ...baseOptions,
        message: `Rate limit exceeded for ${userTier} tier`
      });

      limiter(req, res, next);
    };
  }

  /**
   * Create endpoint-specific rate limiter
   */
  createEndpointLimiter(endpointType) {
    const config = this.endpointLimits[endpointType];
    if (!config) {
      throw new Error(`Unknown endpoint type: ${endpointType}`);
    }

    return this.createRateLimiter({
      ...config,
      keyGenerator: (req) => {
        const baseKey = this.generateKey(req);
        return `${endpointType}:${baseKey}`;
      }
    });
  }

  /**
   * Create dynamic rate limiter based on request context
   */
  createDynamicLimiter() {
    return (req, res, next) => {
      let limiterConfig;

      // Determine rate limit based on endpoint and user
      if (this.isSensitiveEndpoint(req.path)) {
        limiterConfig = this.endpointLimits.sensitive;
      } else if (this.isAuthEndpoint(req.path)) {
        limiterConfig = this.endpointLimits.authentication;
      } else if (this.isUploadEndpoint(req.path)) {
        limiterConfig = this.endpointLimits.upload;
      } else if (this.isSearchEndpoint(req.path)) {
        limiterConfig = this.endpointLimits.search;
      } else {
        // Use tier-based limits for general endpoints
        const userTier = this.getUserTier(req.user);
        limiterConfig = this.rateLimitTiers[userTier];
      }

      const limiter = this.createRateLimiter(limiterConfig);
      limiter(req, res, next);
    };
  }

  /**
   * Create burst protection limiter
   */
  createBurstProtection() {
    return this.createRateLimiter({
      windowMs: 1 * 60 * 1000, // 1 minute window
      max: 20, // Max 20 requests per minute
      message: 'Too many requests in a short time, please slow down',
      keyGenerator: (req) => {
        // More granular key for burst protection
        return `burst:${this.generateKey(req)}:${req.path}`;
      }
    });
  }

  /**
   * Create progressive rate limiter (increases restrictions for repeated offenders)
   */
  createProgressiveLimiter() {
    return async (req, res, next) => {
      const key = this.generateKey(req);
      const violations = await this.getViolationCount(key);

      let config;
      if (violations >= 5) {
        // Heavy restrictions for repeat offenders
        config = {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 10,
          message: 'Account temporarily restricted due to excessive requests'
        };
      } else if (violations >= 2) {
        // Medium restrictions
        config = {
          windowMs: 30 * 60 * 1000, // 30 minutes
          max: 50,
          message: 'Reduced rate limit due to previous violations'
        };
      } else {
        // Normal restrictions
        const userTier = this.getUserTier(req.user);
        config = this.rateLimitTiers[userTier];
      }

      const limiter = this.createRateLimiter(config);
      limiter(req, res, next);
    };
  }

  /**
   * Whitelist middleware (bypass rate limiting for certain IPs/users)
   */
  createWhitelistMiddleware(whitelistedIPs = [], whitelistedUsers = []) {
    return (req, res, next) => {
      // Check IP whitelist
      if (whitelistedIPs.includes(req.ip)) {
        return next();
      }

      // Check user whitelist
      if (req.user && whitelistedUsers.includes(req.user.id)) {
        return next();
      }

      // Check for admin bypass header
      if (req.get('X-Admin-Bypass') === process.env.ADMIN_BYPASS_TOKEN) {
        return next();
      }

      // Continue with normal rate limiting
      next();
    };
  }

  // Helper methods

  isSensitiveEndpoint(path) {
    const sensitivePatterns = [
      '/payment', '/withdrawal', '/bank', '/salary',
      '/personal', '/private', '/admin', '/sensitive'
    ];
    return sensitivePatterns.some(pattern => path.includes(pattern));
  }

  isAuthEndpoint(path) {
    const authPatterns = ['/login', '/auth', '/signin', '/signup', '/register', '/password'];
    return authPatterns.some(pattern => path.includes(pattern));
  }

  isUploadEndpoint(path) {
    const uploadPatterns = ['/upload', '/file', '/document', '/attachment'];
    return uploadPatterns.some(pattern => path.includes(pattern));
  }

  isSearchEndpoint(path) {
    const searchPatterns = ['/search', '/find', '/query', '/filter'];
    return searchPatterns.some(pattern => path.includes(pattern));
  }

  getCustomMessage(req) {
    const endpoint = req.path;

    if (this.isSensitiveEndpoint(endpoint)) {
      return 'Too many requests for sensitive data. Please wait before trying again.';
    }

    if (this.isAuthEndpoint(endpoint)) {
      return 'Too many authentication attempts. Please wait before trying again.';
    }

    const userTier = this.getUserTier(req.user);
    return `Rate limit exceeded for ${userTier} account. Upgrade for higher limits.`;
  }

  async getViolationCount(key) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        const violations = await this.redisClient.get(`violations:${key}`);
        return parseInt(violations) || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async incrementViolationCount(key) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.incr(`violations:${key}`);
        await this.redisClient.expire(`violations:${key}`, 24 * 60 * 60); // 24 hours
      }
    } catch (error) {
      console.error('Failed to increment violation count:', error);
    }
  }

  logRateLimitEvent(req) {
    const logData = {
      timestamp: new Date().toISOString(),
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      limit: req.rateLimit.limit,
      remaining: req.rateLimit.remaining
    };

    console.warn('Rate limit exceeded:', logData);

    // In a production environment, you'd send this to your monitoring system
    // this.sendToMonitoring('rate_limit_exceeded', logData);
  }

  checkSuspiciousActivity(req) {
    // Implement suspicious activity detection
    const key = this.generateKey(req);

    // Check if this is a pattern of abuse
    this.incrementViolationCount(key);

    // Additional security checks could be added here
  }

  // Pre-configured limiters for common use cases

  getGeneralLimiter() {
    return this.createTierBasedLimiter();
  }

  getSensitiveDataLimiter() {
    return this.createEndpointLimiter('sensitive');
  }

  getAuthLimiter() {
    return this.createEndpointLimiter('authentication');
  }

  getUploadLimiter() {
    return this.createEndpointLimiter('upload');
  }

  getSearchLimiter() {
    return this.createEndpointLimiter('search');
  }

  getBurstProtectionLimiter() {
    return this.createBurstProtection();
  }

  getProgressiveLimiter() {
    return this.createProgressiveLimiter();
  }

  getDynamicLimiter() {
    return this.createDynamicLimiter();
  }
}

// Export singleton instance
const rateLimitingManager = new RateLimitingManager();

module.exports = {
  RateLimitingManager,
  rateLimitingManager,

  // Convenience exports for common limiters
  generalLimiter: () => rateLimitingManager.getGeneralLimiter(),
  sensitiveDataLimiter: () => rateLimitingManager.getSensitiveDataLimiter(),
  authLimiter: () => rateLimitingManager.getAuthLimiter(),
  uploadLimiter: () => rateLimitingManager.getUploadLimiter(),
  searchLimiter: () => rateLimitingManager.getSearchLimiter(),
  burstProtection: () => rateLimitingManager.getBurstProtectionLimiter(),
  progressiveLimiter: () => rateLimitingManager.getProgressiveLimiter(),
  dynamicLimiter: () => rateLimitingManager.getDynamicLimiter()
};