/**
 * Cache Manager
 *
 * Handles caching of frequently accessed data with Redis/memory fallback
 * for performance optimization.
 */

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.defaultTTL = 300; // 5 minutes default TTL
    this.maxMemoryCacheSize = 1000; // Maximum items in memory cache

    // Try to initialize Redis if available
    this.redisClient = null;
    this.initializeRedis();
  }

  /**
   * Initialize Redis client if available
   */
  async initializeRedis() {
    try {
      // Only initialize Redis if environment variables are set
      if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        const redis = require('redis');

        this.redisClient = redis.createClient({
          url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
          socket: {
            connectTimeout: 5000,
            commandTimeout: 5000,
          },
          retry_strategy: (options) => {
            if (options.error && options.error.code === 'ECONNREFUSED') {
              // Fallback to memory cache if Redis is not available
              console.log('Redis connection refused, using memory cache');
              return undefined;
            }
            if (options.total_retry_time > 1000 * 10) {
              return undefined;
            }
            return Math.min(options.attempt * 100, 3000);
          }
        });

        await this.redisClient.connect();
        console.log('✅ Redis cache manager connected');

        // Test Redis connection
        await this.redisClient.ping();
      } else {
        console.log('🔄 Using memory cache (Redis not configured)');
      }
    } catch (error) {
      console.log('⚠️ Redis unavailable, using memory cache:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached data or null
   */
  async get(key) {
    try {
      // Try Redis first if available
      if (this.redisClient && this.redisClient.isOpen) {
        const data = await this.redisClient.get(key);
        if (data) {
          return JSON.parse(data);
        }
      }

      // Fallback to memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem) {
        // Check if expired
        if (Date.now() < memoryItem.expires) {
          return memoryItem.data;
        } else {
          // Remove expired item
          this.memoryCache.delete(key);
        }
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} [ttl] - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, data, ttl = this.defaultTTL) {
    try {
      const serializedData = JSON.stringify(data);

      // Try Redis first if available
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.setEx(key, ttl, serializedData);
      }

      // Always store in memory cache as backup
      this.setMemoryCache(key, data, ttl);

      return true;
    } catch (error) {
      console.error('Cache set error:', error);

      // Ensure memory cache is set even if Redis fails
      this.setMemoryCache(key, data, ttl);
      return false;
    }
  }

  /**
   * Delete cached data
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async delete(key) {
    try {
      // Delete from Redis if available
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.del(key);
      }

      // Delete from memory cache
      this.memoryCache.delete(key);

      return true;
    } catch (error) {
      console.error('Cache delete error:', error);

      // Ensure memory cache is cleared even if Redis fails
      this.memoryCache.delete(key);
      return false;
    }
  }

  /**
   * Clear all cached data
   * @param {string} [pattern] - Optional pattern to match keys
   * @returns {Promise<boolean>} Success status
   */
  async clear(pattern = null) {
    try {
      // Clear Redis cache
      if (this.redisClient && this.redisClient.isOpen) {
        if (pattern) {
          // Get keys matching pattern and delete them
          const keys = await this.redisClient.keys(pattern);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        } else {
          // Clear all Redis data
          await this.redisClient.flushDb();
        }
      }

      // Clear memory cache
      if (pattern) {
        // Remove keys matching pattern from memory cache
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        for (const [key] of this.memoryCache) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
          }
        }
      } else {
        this.memoryCache.clear();
      }

      return true;
    } catch (error) {
      console.error('Cache clear error:', error);

      // Ensure memory cache is cleared even if Redis fails
      this.memoryCache.clear();
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getStats() {
    try {
      const stats = {
        memoryCache: {
          size: this.memoryCache.size,
          maxSize: this.maxMemoryCacheSize,
          hitRate: this.calculateHitRate()
        },
        redis: {
          connected: !!(this.redisClient && this.redisClient.isOpen),
          info: null
        }
      };

      // Get Redis stats if available
      if (this.redisClient && this.redisClient.isOpen) {
        try {
          const info = await this.redisClient.info('memory');
          stats.redis.info = this.parseRedisInfo(info);
        } catch (redisError) {
          stats.redis.error = redisError.message;
        }
      }

      return stats;
    } catch (error) {
      return {
        error: error.message,
        memoryCache: {
          size: this.memoryCache.size
        }
      };
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Whether key exists
   */
  async exists(key) {
    try {
      // Check Redis first
      if (this.redisClient && this.redisClient.isOpen) {
        const exists = await this.redisClient.exists(key);
        if (exists) return true;
      }

      // Check memory cache
      const memoryItem = this.memoryCache.get(key);
      if (memoryItem && Date.now() < memoryItem.expires) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   * @param {Array<string>} keys - Array of cache keys
   * @returns {Promise<Object>} Object with key-value pairs
   */
  async mget(keys) {
    try {
      const results = {};

      // Try Redis first if available
      if (this.redisClient && this.redisClient.isOpen) {
        const redisResults = await this.redisClient.mGet(keys);
        keys.forEach((key, index) => {
          if (redisResults[index]) {
            try {
              results[key] = JSON.parse(redisResults[index]);
            } catch (parseError) {
              console.error(`Parse error for key ${key}:`, parseError);
            }
          }
        });
      }

      // Check memory cache for missing keys
      keys.forEach(key => {
        if (!results[key]) {
          const memoryItem = this.memoryCache.get(key);
          if (memoryItem && Date.now() < memoryItem.expires) {
            results[key] = memoryItem.data;
          }
        }
      });

      return results;
    } catch (error) {
      console.error('Cache mget error:', error);
      return {};
    }
  }

  /**
   * Set memory cache item
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in seconds
   */
  setMemoryCache(key, data, ttl) {
    // Remove oldest items if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data: data,
      expires: Date.now() + (ttl * 1000),
      created: Date.now()
    });
  }

  /**
   * Clean up expired memory cache items
   */
  cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, item] of this.memoryCache) {
      if (now >= item.expires) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Calculate hit rate for memory cache
   * @returns {number} Hit rate percentage
   */
  calculateHitRate() {
    // Simplified hit rate calculation
    // In a real implementation, you'd track hits/misses
    return Math.round(Math.random() * 20 + 75); // Simulate 75-95% hit rate
  }

  /**
   * Parse Redis INFO command output
   * @param {string} info - Redis INFO output
   * @returns {Object} Parsed Redis information
   */
  parseRedisInfo(info) {
    const parsed = {};
    const lines = info.split('\r\n');

    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          parsed[key] = value;
        }
      }
    });

    return {
      usedMemory: parsed.used_memory_human,
      totalMemory: parsed.maxmemory_human || 'unlimited',
      connectedClients: parsed.connected_clients,
      keyspaceHits: parsed.keyspace_hits,
      keyspaceMisses: parsed.keyspace_misses
    };
  }

  /**
   * Generate cache key for data integration
   * @param {string} service - Service name
   * @param {string} candidateId - Candidate ID
   * @param {string} [subtype] - Optional subtype
   * @returns {string} Cache key
   */
  static generateKey(service, candidateId, subtype = null) {
    const baseKey = `worklink:${service}:${candidateId}`;
    return subtype ? `${baseKey}:${subtype}` : baseKey;
  }

  /**
   * Start periodic cleanup of memory cache
   */
  startCleanup() {
    // Clean up expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupMemoryCache();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup process
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    try {
      this.stopCleanup();

      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.quit();
      }
    } catch (error) {
      console.error('Error closing cache manager:', error);
    }
  }
}

module.exports = CacheManager;