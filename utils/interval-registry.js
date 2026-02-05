/**
 * Interval Registry
 * Centralized management of all setInterval timers to ensure clean shutdown
 */

class IntervalRegistry {
  constructor() {
    this.intervals = new Map();
    this.logger = null;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Register a new interval
   * @param {string} name - Unique identifier for the interval
   * @param {number} intervalId - The interval ID returned by setInterval
   * @param {string} description - Description of what this interval does
   */
  register(name, intervalId, description = '') {
    this.intervals.set(name, {
      id: intervalId,
      description,
      registeredAt: new Date()
    });
    
    if (this.logger) {
      this.logger.info('Interval registered', {
        name,
        description,
        total_intervals: this.intervals.size
      });
    }
  }

  /**
   * Unregister and clear a specific interval
   * @param {string} name - Name of the interval to clear
   */
  clear(name) {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval.id);
      this.intervals.delete(name);
      
      if (this.logger) {
        this.logger.info('Interval cleared', {
          name,
          description: interval.description
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Clear all registered intervals
   */
  clearAll() {
    const count = this.intervals.size;
    
    if (this.logger) {
      this.logger.info('Clearing all intervals', { count });
    }

    for (const [name, interval] of this.intervals.entries()) {
      clearInterval(interval.id);
      
      if (this.logger) {
        this.logger.info('Interval cleared', {
          name,
          description: interval.description
        });
      }
    }

    this.intervals.clear();
    
    if (this.logger) {
      this.logger.info('All intervals cleared', { cleared_count: count });
    }

    return count;
  }

  /**
   * Get list of all registered intervals
   */
  list() {
    return Array.from(this.intervals.entries()).map(([name, data]) => ({
      name,
      description: data.description,
      registeredAt: data.registeredAt
    }));
  }

  /**
   * Get count of registered intervals
   */
  count() {
    return this.intervals.size;
  }
}

// Export singleton instance
const intervalRegistry = new IntervalRegistry();

module.exports = intervalRegistry;
