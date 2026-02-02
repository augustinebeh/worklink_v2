/**
 * Fallback Manager
 *
 * Provides comprehensive fallback mechanisms when data is unavailable,
 * ensuring graceful degradation and helpful responses.
 */

class FallbackManager {
  constructor() {
    this.fallbackStrategies = new Map();
    this.gracefulMessages = new Map();
    this.dataSourceStatus = new Map();
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 10000   // 10 seconds
    };

    this.initializeFallbackStrategies();
    this.initializeGracefulMessages();
  }

  /**
   * Handle data unavailability with appropriate fallback
   * @param {string} dataType - Type of data that's unavailable
   * @param {Object} context - Request context
   * @param {Object} options - Fallback options
   * @returns {Promise<Object>} Fallback response
   */
  async handleDataUnavailable(dataType, context = {}, options = {}) {
    try {
      const strategy = this.fallbackStrategies.get(dataType);
      if (!strategy) {
        return this.getGenericFallback(dataType, context);
      }

      // Check if we can retry the data fetch
      if (options.allowRetry && this.shouldRetry(dataType, context)) {
        const retryResult = await this.attemptDataRetry(dataType, context);
        if (retryResult.success) {
          return retryResult;
        }
      }

      // Execute fallback strategy
      return await strategy.execute(context, options);

    } catch (error) {
      console.error(`Fallback error for ${dataType}:`, error);
      return this.getEmergencyFallback(dataType, context);
    }
  }

  /**
   * Get cached data as fallback
   * @param {string} dataType - Type of data
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object|null>} Cached data or null
   */
  async getCachedFallback(dataType, candidateId) {
    try {
      // This would integrate with the cache manager
      // For now, return null to indicate no cached data
      return null;
    } catch (error) {
      console.error('Cache fallback error:', error);
      return null;
    }
  }

  /**
   * Attempt to retry data fetch with exponential backoff
   * @param {string} dataType - Type of data
   * @param {Object} context - Request context
   * @returns {Promise<Object>} Retry result
   */
  async attemptDataRetry(dataType, context) {
    const retryAttempts = context.retryAttempts || 0;

    if (retryAttempts >= this.retryConfig.maxRetries) {
      return { success: false, reason: 'max_retries_exceeded' };
    }

    try {
      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.baseDelay * Math.pow(2, retryAttempts),
        this.retryConfig.maxDelay
      );

      await this.sleep(delay);

      // Mark retry attempt
      context.retryAttempts = retryAttempts + 1;

      // This would retry the actual data fetch
      // For now, return failure to continue with fallback
      return { success: false, reason: 'retry_failed' };

    } catch (error) {
      return { success: false, reason: 'retry_error', error: error.message };
    }
  }

  /**
   * Check if retry should be attempted
   * @param {string} dataType - Type of data
   * @param {Object} context - Request context
   * @returns {boolean} Whether to retry
   */
  shouldRetry(dataType, context) {
    const retryAttempts = context.retryAttempts || 0;
    return retryAttempts < this.retryConfig.maxRetries;
  }

  /**
   * Get data source status
   * @param {string} dataType - Type of data
   * @returns {Object} Status information
   */
  getDataSourceStatus(dataType) {
    return this.dataSourceStatus.get(dataType) || {
      status: 'unknown',
      lastChecked: null,
      consecutiveFailures: 0
    };
  }

  /**
   * Update data source status
   * @param {string} dataType - Type of data
   * @param {string} status - Status (online, offline, degraded)
   * @param {Object} metadata - Additional metadata
   */
  updateDataSourceStatus(dataType, status, metadata = {}) {
    const currentStatus = this.getDataSourceStatus(dataType);

    this.dataSourceStatus.set(dataType, {
      status,
      lastChecked: new Date().toISOString(),
      consecutiveFailures: status === 'offline' ?
        currentStatus.consecutiveFailures + 1 : 0,
      metadata
    });
  }

  /**
   * Get appropriate fallback message based on context
   * @param {string} dataType - Type of data
   * @param {Object} context - Request context
   * @param {string} messageType - Type of message (user_friendly, technical, emergency)
   * @returns {string} Fallback message
   */
  getFallbackMessage(dataType, context = {}, messageType = 'user_friendly') {
    const messages = this.gracefulMessages.get(dataType);
    if (!messages) {
      return this.getGenericMessage(dataType, messageType);
    }

    // Choose message based on context
    if (context.isUrgent && messages.urgent) {
      return messages.urgent;
    }

    if (context.retryAttempts > 0 && messages.retry) {
      return messages.retry;
    }

    return messages[messageType] || messages.user_friendly || this.getGenericMessage(dataType, messageType);
  }

  /**
   * Generate helpful alternative actions
   * @param {string} dataType - Type of data
   * @param {Object} context - Request context
   * @returns {Array} Alternative actions
   */
  getAlternativeActions(dataType, context = {}) {
    const actions = [];

    switch (dataType) {
      case 'payment':
        actions.push({
          text: 'Check payment history in app',
          action: 'navigate',
          target: '/payments'
        });
        actions.push({
          text: 'Contact support about payments',
          action: 'contact',
          target: 'support'
        });
        break;

      case 'jobs':
        actions.push({
          text: 'Browse jobs in app',
          action: 'navigate',
          target: '/jobs'
        });
        actions.push({
          text: 'Check your applications',
          action: 'navigate',
          target: '/applications'
        });
        break;

      case 'account':
        actions.push({
          text: 'Update profile manually',
          action: 'navigate',
          target: '/profile'
        });
        actions.push({
          text: 'Contact support for verification',
          action: 'contact',
          target: 'support'
        });
        break;

      case 'withdrawal':
        actions.push({
          text: 'Try again in a few minutes',
          action: 'retry',
          delay: 300000 // 5 minutes
        });
        actions.push({
          text: 'Contact support for assistance',
          action: 'contact',
          target: 'support'
        });
        break;

      case 'interview':
        actions.push({
          text: 'Check interview schedule in app',
          action: 'navigate',
          target: '/interviews'
        });
        actions.push({
          text: 'Call support to schedule',
          action: 'contact',
          target: 'phone'
        });
        break;

      default:
        actions.push({
          text: 'Refresh and try again',
          action: 'refresh'
        });
        actions.push({
          text: 'Contact support',
          action: 'contact',
          target: 'support'
        });
    }

    return actions;
  }

  /**
   * Generate estimated resolution time
   * @param {string} dataType - Type of data
   * @param {Object} context - Request context
   * @returns {Object} Resolution time estimate
   */
  getResolutionEstimate(dataType, context = {}) {
    const sourceStatus = this.getDataSourceStatus(dataType);

    // Base estimates (in minutes)
    const baseEstimates = {
      payment: 15,
      jobs: 5,
      account: 10,
      withdrawal: 30,
      interview: 60
    };

    let estimate = baseEstimates[dataType] || 10;

    // Adjust based on consecutive failures
    if (sourceStatus.consecutiveFailures > 0) {
      estimate *= Math.min(sourceStatus.consecutiveFailures, 5);
    }

    // Adjust based on context
    if (context.isUrgent) {
      estimate = Math.max(estimate / 2, 2); // Prioritize urgent issues
    }

    return {
      minutes: estimate,
      range: {
        min: Math.floor(estimate * 0.5),
        max: Math.ceil(estimate * 2)
      },
      confidence: this.getConfidenceLevel(dataType, sourceStatus)
    };
  }

  /**
   * Get confidence level for resolution estimate
   * @param {string} dataType - Type of data
   * @param {Object} sourceStatus - Data source status
   * @returns {string} Confidence level
   */
  getConfidenceLevel(dataType, sourceStatus) {
    if (sourceStatus.consecutiveFailures === 0) return 'high';
    if (sourceStatus.consecutiveFailures < 3) return 'medium';
    return 'low';
  }

  /**
   * Initialize fallback strategies for each data type
   */
  initializeFallbackStrategies() {
    // Payment data fallback
    this.fallbackStrategies.set('payment', {
      execute: async (context, options) => {
        const cached = await this.getCachedFallback('payment', context.candidateId);

        if (cached) {
          return {
            success: true,
            data: cached,
            source: 'cache',
            message: 'Showing recent payment information (may not be completely up to date)',
            alternatives: this.getAlternativeActions('payment', context)
          };
        }

        return {
          success: false,
          message: this.getFallbackMessage('payment', context),
          alternatives: this.getAlternativeActions('payment', context),
          estimate: this.getResolutionEstimate('payment', context)
        };
      }
    });

    // Job data fallback
    this.fallbackStrategies.set('jobs', {
      execute: async (context, options) => {
        // Try to provide general job search guidance even without specific data
        return {
          success: true,
          data: {
            fallback: true,
            generalGuidance: true,
            message: 'Job information is temporarily unavailable, but here are some general tips:'
          },
          message: this.getFallbackMessage('jobs', context),
          alternatives: this.getAlternativeActions('jobs', context),
          guidance: [
            'Check the Jobs tab in your app for the latest opportunities',
            'Make sure your profile is complete to see more matches',
            'Enable job notifications to get alerts for new positions'
          ]
        };
      }
    });

    // Account verification fallback
    this.fallbackStrategies.set('account', {
      execute: async (context, options) => {
        const cached = await this.getCachedFallback('account', context.candidateId);

        if (cached) {
          return {
            success: true,
            data: cached,
            source: 'cache',
            message: 'Showing recent account information (verification status may have changed)',
            alternatives: this.getAlternativeActions('account', context)
          };
        }

        return {
          success: false,
          message: this.getFallbackMessage('account', context),
          alternatives: this.getAlternativeActions('account', context),
          generalAdvice: [
            'Ensure all profile fields are completed',
            'Upload required documents if not done already',
            'Contact support if you need verification assistance'
          ]
        };
      }
    });

    // Withdrawal fallback
    this.fallbackStrategies.set('withdrawal', {
      execute: async (context, options) => {
        return {
          success: false,
          message: this.getFallbackMessage('withdrawal', context),
          alternatives: this.getAlternativeActions('withdrawal', context),
          estimate: this.getResolutionEstimate('withdrawal', context),
          urgentNote: 'For urgent withdrawal needs, please contact support directly'
        };
      }
    });

    // Interview scheduling fallback
    this.fallbackStrategies.set('interview', {
      execute: async (context, options) => {
        return {
          success: false,
          message: this.getFallbackMessage('interview', context),
          alternatives: this.getAlternativeActions('interview', context),
          contactInfo: {
            support: 'support@worklink.sg',
            whatsapp: '+65 XXXX XXXX',
            hours: 'Monday-Friday 9 AM - 6 PM'
          }
        };
      }
    });
  }

  /**
   * Initialize graceful messages for each data type
   */
  initializeGracefulMessages() {
    this.gracefulMessages.set('payment', {
      user_friendly: "I'm having trouble accessing your payment information right now. Your payment data is safe, and I'll be able to help you shortly.",
      urgent: "Your payment information is temporarily unavailable. If this is urgent, please contact our support team immediately.",
      retry: "I'm still working on getting your payment information. This sometimes happens during high traffic periods.",
      technical: "Payment service connectivity issue - data retrieval failed",
      emergency: "Payment system temporarily unavailable"
    });

    this.gracefulMessages.set('jobs', {
      user_friendly: "I can't access job information at the moment, but you can still browse opportunities in the Jobs tab of your app.",
      urgent: "Job data is temporarily unavailable. Please check the Jobs section directly or contact support if you're expecting time-sensitive updates.",
      retry: "I'm still trying to get your job information. Job listings are updated frequently, so data might be syncing.",
      technical: "Job service unavailable - unable to retrieve job data",
      emergency: "Job system temporarily offline"
    });

    this.gracefulMessages.set('account', {
      user_friendly: "I can't check your account details right now. Your account is secure, and you can still use most app features.",
      urgent: "Account verification information is temporarily unavailable. If you need immediate assistance with your account, please contact support.",
      retry: "I'm still working on accessing your account information. Account data is being refreshed.",
      technical: "Account service connectivity issue",
      emergency: "Account verification system temporarily unavailable"
    });

    this.gracefulMessages.set('withdrawal', {
      user_friendly: "Withdrawal information isn't available at the moment. Your funds are secure, and you can try checking again in a few minutes.",
      urgent: "I can't access withdrawal details right now. If you need to make an urgent withdrawal, please contact our support team directly.",
      retry: "I'm still trying to get your withdrawal information. Financial data sometimes takes a bit longer to load.",
      technical: "Withdrawal service unavailable",
      emergency: "Financial services temporarily offline"
    });

    this.gracefulMessages.set('interview', {
      user_friendly: "Interview information isn't available right now. You can still check your scheduled interviews in the app or contact support to schedule new ones.",
      urgent: "Interview scheduling data is temporarily unavailable. If you have an interview today or need urgent scheduling, please call support.",
      retry: "I'm still working on getting your interview information. Interview data is being synchronized.",
      technical: "Interview service connectivity issue",
      emergency: "Interview scheduling system temporarily offline"
    });
  }

  /**
   * Get generic fallback for unknown data types
   * @param {string} dataType - Type of data
   * @param {Object} context - Request context
   * @returns {Object} Generic fallback response
   */
  getGenericFallback(dataType, context) {
    return {
      success: false,
      message: `I'm having trouble accessing ${dataType} information right now. Please try again in a few minutes.`,
      alternatives: [
        {
          text: 'Try again',
          action: 'retry'
        },
        {
          text: 'Contact support',
          action: 'contact',
          target: 'support'
        }
      ],
      estimate: this.getResolutionEstimate(dataType, context)
    };
  }

  /**
   * Get emergency fallback when all else fails
   * @param {string} dataType - Type of data
   * @param {Object} context - Request context
   * @returns {Object} Emergency fallback response
   */
  getEmergencyFallback(dataType, context) {
    return {
      success: false,
      message: "I'm experiencing technical difficulties and can't access your information right now. Our team has been notified, and services should be restored soon.",
      alternatives: [
        {
          text: 'Contact support',
          action: 'contact',
          target: 'support',
          urgent: true
        }
      ],
      emergency: true,
      supportContact: {
        email: 'support@worklink.sg',
        urgent: 'Emergency support available 24/7'
      }
    };
  }

  /**
   * Get generic message for unknown data types
   * @param {string} dataType - Type of data
   * @param {string} messageType - Type of message
   * @returns {string} Generic message
   */
  getGenericMessage(dataType, messageType = 'user_friendly') {
    if (messageType === 'technical') {
      return `${dataType} service unavailable`;
    }

    if (messageType === 'emergency') {
      return `${dataType} system temporarily offline`;
    }

    return `I'm having trouble accessing ${dataType} information right now. Please try again in a moment.`;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check overall system health for fallback decisions
   * @returns {Object} System health status
   */
  getSystemHealth() {
    const services = Array.from(this.dataSourceStatus.keys());
    const onlineServices = services.filter(service =>
      this.getDataSourceStatus(service).status === 'online'
    );

    const healthPercentage = services.length > 0 ?
      (onlineServices.length / services.length) * 100 : 100;

    return {
      overall: healthPercentage >= 80 ? 'healthy' :
               healthPercentage >= 50 ? 'degraded' : 'unhealthy',
      percentage: healthPercentage,
      onlineServices: onlineServices.length,
      totalServices: services.length,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Generate system status report
   * @returns {Object} Comprehensive status report
   */
  generateStatusReport() {
    const services = Array.from(this.dataSourceStatus.keys());
    const serviceStatuses = {};

    services.forEach(service => {
      serviceStatuses[service] = this.getDataSourceStatus(service);
    });

    return {
      systemHealth: this.getSystemHealth(),
      services: serviceStatuses,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = FallbackManager;