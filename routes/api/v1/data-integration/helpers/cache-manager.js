/**
 * Cache Management Helper
 *
 * Handles caching operations for the data integration module,
 * including cache invalidation, TTL management, and cache strategies.
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes

    // Different TTL for different data types
    this.ttlConfig = {
      user_data: 5 * 60 * 1000,      // 5 minutes
      payment_data: 2 * 60 * 1000,   // 2 minutes (sensitive)
      job_data: 10 * 60 * 1000,      // 10 minutes
      verification: 15 * 60 * 1000,   // 15 minutes
      withdrawal: 60 * 1000,          // 1 minute (real-time)
      interview: 30 * 60 * 1000       // 30 minutes
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Generate cache key
   * @param {string} candidateId - Candidate ID
   * @param {string} dataType - Data type
   * @param {Object} options - Additional options
   * @returns {string} - Cache key
   */
  generateKey(candidateId, dataType, options = {}) {
    const base = `${candidateId}:${dataType}`;
    if (options.id) {
      return `${base}:${options.id}`;
    }
    if (options.suffix) {
      return `${base}:${options.suffix}`;
    }
    return base;
  }

  /**
   * Get data from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached data or null
   */
  get(key) {
    // Check if key exists and hasn't expired
    if (!this.cache.has(key)) {
      return null;
    }

    const expiry = this.ttlMap.get(key);
    if (expiry && Date.now() > expiry) {
      // Remove expired entry
      this.cache.delete(key);
      this.ttlMap.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl = null) {
    this.cache.set(key, data);

    // Set expiry time
    const finalTTL = ttl || this.getConfiguredTTL(key) || this.defaultTTL;
    this.ttlMap.set(key, Date.now() + finalTTL);
  }

  /**
   * Get configured TTL for a key
   * @param {string} key - Cache key
   * @returns {number} - TTL in milliseconds
   */
  getConfiguredTTL(key) {
    for (const [dataType, ttl] of Object.entries(this.ttlConfig)) {
      if (key.includes(dataType)) {
        return ttl;
      }
    }
    return this.defaultTTL;
  }

  /**
   * Delete specific cache entry
   * @param {string} key - Cache key
   * @returns {boolean} - True if deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.ttlMap.delete(key);
    return deleted;
  }

  /**
   * Invalidate cache for candidate
   * @param {string} candidateId - Candidate ID
   * @param {string} dataType - Optional specific data type
   * @returns {number} - Number of entries deleted
   */
  invalidateCandidate(candidateId, dataType = null) {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      const shouldDelete = dataType
        ? key.startsWith(`${candidateId}:${dataType}`)
        : key.startsWith(`${candidateId}:`);

      if (shouldDelete) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Invalidate all cache entries of a specific data type
   * @param {string} dataType - Data type to invalidate
   * @returns {number} - Number of entries deleted
   */
  invalidateDataType(dataType) {
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(`:${dataType}`)) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let expiredEntries = 0;

    for (const [key, expiry] of this.ttlMap.entries()) {
      if (expiry && now > expiry) {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries,
      activeEntries: this.cache.size - expiredEntries,
      memoryUsage: this.estimateMemoryUsage(),
      uptime: Date.now() - this.startTime || Date.now()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   * @returns {number} - Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const [key, value] of this.cache.entries()) {
      totalSize += key.length * 2; // Approximate string size
      totalSize += JSON.stringify(value).length * 2; // Approximate object size
    }

    return totalSize;
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  startCleanupInterval() {
    this.startTime = Date.now();

    // Clean up every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired entries
   * @returns {number} - Number of entries cleaned up
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.ttlMap.entries()) {
      if (expiry && now > expiry) {
        this.cache.delete(key);
        this.ttlMap.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Check if cache contains key (even if expired)
   * @param {string} key - Cache key
   * @returns {boolean} - True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }

  /**
   * Get cache entry with expiry information
   * @param {string} key - Cache key
   * @returns {Object|null} - Cache entry with metadata
   */
  getWithMeta(key) {
    const data = this.get(key);
    if (!data) return null;

    const expiry = this.ttlMap.get(key);

    return {
      data,
      cached: true,
      expiresAt: new Date(expiry),
      ttl: expiry ? expiry - Date.now() : null,
      age: Date.now() - (expiry ? expiry - this.getConfiguredTTL(key) : Date.now())
    };
  }

  /**
   * Refresh cache entry (reset TTL)
   * @param {string} key - Cache key
   * @returns {boolean} - True if refreshed
   */
  refresh(key) {
    if (!this.cache.has(key)) return false;

    const data = this.cache.get(key);
    const ttl = this.getConfiguredTTL(key);
    this.ttlMap.set(key, Date.now() + ttl);

    return true;
  }

  /**
   * Get all cache keys for a candidate
   * @param {string} candidateId - Candidate ID
   * @returns {string[]} - Array of cache keys
   */
  getKeysForCandidate(candidateId) {
    const keys = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${candidateId}:`)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Warm cache with data
   * @param {string} candidateId - Candidate ID
   * @param {Object} dataMap - Map of dataType to data
   */
  warmCache(candidateId, dataMap) {
    for (const [dataType, data] of Object.entries(dataMap)) {
      const key = this.generateKey(candidateId, dataType);
      this.set(key, data);
    }
  }
}

module.exports = CacheManager;