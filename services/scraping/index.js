/**
 * GeBIZ RSS Scraping Service - Main Integration
 * Entry point for the complete RSS scraping system
 * Exports all components and provides unified interface
 */

const GeBIZRSSParser = require('./gebizRssParser');
const DataLifecycleManager = require('./dataLifecycleManager');
const GeBIZRSSOrchestrator = require('./gebizRssOrchestrator');
const GeBIZRSSScheduler = require('./gebizRssScheduler');

class GeBIZScrapingService {
  constructor() {
    this.parser = new GeBIZRSSParser();
    this.lifecycleManager = new DataLifecycleManager();
    this.orchestrator = new GeBIZRSSOrchestrator();
    this.scheduler = new GeBIZRSSScheduler();

    this.isInitialized = false;
    this.initializationError = null;
  }

  /**
   * Initialize the complete scraping service
   * @param {Object} options Initialization options
   * @returns {Promise<boolean>} Success status
   */
  async initialize(options = {}) {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('🚀 Initializing GeBIZ RSS Scraping Service...');

      // Start scheduler if auto-start is enabled (default: true)
      if (options.autoStartScheduler !== false) {
        const schedulerStarted = this.scheduler.start();
        if (!schedulerStarted) {
          throw new Error('Failed to start scheduler');
        }
      }

      this.isInitialized = true;
      console.log('✅ GeBIZ RSS Scraping Service initialized successfully');

      // Log the service status
      const status = this.getStatus();
      console.log(`📊 Service Status: Scheduler ${status.scheduler.isRunning ? 'Running' : 'Stopped'}`);
      console.log(`⏰ Next Execution: ${status.scheduler.nextExecution}`);

      return true;

    } catch (error) {
      this.initializationError = error;
      console.error('❌ Failed to initialize GeBIZ RSS Scraping Service:', error.message);
      return false;
    }
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown() {
    try {
      console.log('🛑 Shutting down GeBIZ RSS Scraping Service...');

      // Stop scheduler
      if (this.scheduler) {
        this.scheduler.stop();
      }

      // Wait for any running operations to complete
      if (this.orchestrator.isRunning) {
        console.log('⏳ Waiting for running operations to complete...');
        // Give it up to 30 seconds to complete
        let waitTime = 0;
        while (this.orchestrator.isRunning && waitTime < 30000) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          waitTime += 1000;
        }
      }

      this.isInitialized = false;
      console.log('✅ GeBIZ RSS Scraping Service shutdown complete');

    } catch (error) {
      console.error('❌ Error during service shutdown:', error.message);
    }
  }

  /**
   * Get comprehensive service status
   * @returns {Object} Complete status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      initializationError: this.initializationError?.message || null,
      parser: this.parser.getStats(),
      lifecycle: {
        // Add lifecycle manager stats if available
        lastOperation: null
      },
      orchestrator: this.orchestrator.getStatus(),
      scheduler: this.scheduler.getStatus(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }

  /**
   * Get service health check
   * @returns {Object} Health status
   */
  async getHealthCheck() {
    const status = this.getStatus();

    const isHealthy =
      this.isInitialized &&
      !this.initializationError &&
      status.parser.isHealthy &&
      status.scheduler.isHealthy;

    return {
      healthy: isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        initialized: this.isInitialized,
        parser: status.parser.isHealthy,
        scheduler: status.scheduler.isHealthy,
        orchestrator: !this.orchestrator.isRunning || status.orchestrator.lastRun?.success
      },
      details: status
    };
  }

  /**
   * Manual trigger for scraping (for admin/testing)
   * @param {Object} options Scraping options
   * @returns {Object} Scraping results
   */
  async manualScrape(options = {}) {
    console.log('🔧 Manual scraping triggered');
    return this.orchestrator.manualTrigger(options);
  }

  /**
   * Execute immediate scraping (bypass scheduler)
   * @returns {Object} Execution results
   */
  async executeNow() {
    return this.scheduler.executeNow();
  }

  // Expose individual components for advanced usage
  getParser() {
    return this.parser;
  }

  getLifecycleManager() {
    return this.lifecycleManager;
  }

  getOrchestrator() {
    return this.orchestrator;
  }

  getScheduler() {
    return this.scheduler;
  }
}

// Create singleton instance
const scrapingService = new GeBIZScrapingService();

// Export both the service instance and individual components
module.exports = {
  // Main service
  scrapingService,

  // Individual components for direct access
  GeBIZRSSParser,
  DataLifecycleManager,
  GeBIZRSSOrchestrator,
  GeBIZRSSScheduler,

  // Convenience methods
  async initialize(options) {
    return scrapingService.initialize(options);
  },

  async getStatus() {
    return scrapingService.getStatus();
  },

  async getHealthCheck() {
    return scrapingService.getHealthCheck();
  },

  async manualScrape(options) {
    return scrapingService.manualScrape(options);
  },

  async shutdown() {
    return scrapingService.shutdown();
  }
};