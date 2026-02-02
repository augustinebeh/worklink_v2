/**
 * Data Integration Layer
 *
 * Provides real-time access to actual user data for chat responses,
 * eliminating the need for assumptions and false promises.
 */

const PaymentDataService = require('./payment-data-service');
const AccountDataService = require('./account-data-service');
const JobDataService = require('./job-data-service');
const WithdrawalDataService = require('./withdrawal-data-service');
const InterviewDataService = require('./interview-data-service');
const CacheManager = require('./cache-manager');
const DataValidator = require('./data-validator');
const AuditLogger = require('./audit-logger');

class DataIntegrationLayer {
  constructor() {
    this.paymentService = new PaymentDataService();
    this.accountService = new AccountDataService();
    this.jobService = new JobDataService();
    this.withdrawalService = new WithdrawalDataService();
    this.interviewService = new InterviewDataService();
    this.cache = new CacheManager();
    this.validator = new DataValidator();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Get comprehensive user data for chat responses
   * @param {string} candidateId - Candidate ID
   * @param {string} requestType - Type of data request for audit
   * @returns {Promise<Object>} Comprehensive user data
   */
  async getUserData(candidateId, requestType = 'chat_request') {
    try {
      // Validate candidate ID
      if (!this.validator.validateCandidateId(candidateId)) {
        throw new Error('Invalid candidate ID');
      }

      // Check cache first
      const cacheKey = `user_data:${candidateId}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        // Log cache hit
        await this.auditLogger.logDataAccess(candidateId, requestType, 'cache_hit');
        return cached;
      }

      // Fetch fresh data from all services
      const [
        paymentData,
        accountData,
        jobData,
        withdrawalData,
        interviewData
      ] = await Promise.all([
        this.paymentService.getPaymentStatus(candidateId),
        this.accountService.getVerificationStatus(candidateId),
        this.jobService.getJobHistory(candidateId),
        this.withdrawalService.getEligibilityStatus(candidateId),
        this.interviewService.getSchedulingStatus(candidateId)
      ]);

      const userData = {
        candidateId,
        timestamp: new Date().toISOString(),
        payments: paymentData,
        account: accountData,
        jobs: jobData,
        withdrawals: withdrawalData,
        interviews: interviewData
      };

      // Cache the data
      await this.cache.set(cacheKey, userData, 300); // 5 minutes

      // Log data access
      await this.auditLogger.logDataAccess(candidateId, requestType, 'database_fetch');

      return userData;

    } catch (error) {
      await this.auditLogger.logError(candidateId, requestType, error.message);
      throw error;
    }
  }

  /**
   * Get specific data type for a user
   * @param {string} candidateId - Candidate ID
   * @param {string} dataType - Type of data (payment, account, jobs, etc.)
   * @returns {Promise<Object>} Specific data
   */
  async getSpecificData(candidateId, dataType) {
    const validTypes = ['payment', 'account', 'jobs', 'withdrawal', 'interview'];

    if (!validTypes.includes(dataType)) {
      throw new Error(`Invalid data type. Must be one of: ${validTypes.join(', ')}`);
    }

    try {
      const cacheKey = `${dataType}_data:${candidateId}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let data;
      switch (dataType) {
        case 'payment':
          data = await this.paymentService.getPaymentStatus(candidateId);
          break;
        case 'account':
          data = await this.accountService.getVerificationStatus(candidateId);
          break;
        case 'jobs':
          data = await this.jobService.getJobHistory(candidateId);
          break;
        case 'withdrawal':
          data = await this.withdrawalService.getEligibilityStatus(candidateId);
          break;
        case 'interview':
          data = await this.interviewService.getSchedulingStatus(candidateId);
          break;
      }

      await this.cache.set(cacheKey, data, 300); // 5 minutes
      await this.auditLogger.logDataAccess(candidateId, `specific_${dataType}`, 'database_fetch');

      return data;

    } catch (error) {
      await this.auditLogger.logError(candidateId, `specific_${dataType}`, error.message);
      throw error;
    }
  }

  /**
   * Invalidate cached data for a user
   * @param {string} candidateId - Candidate ID
   * @param {string} [dataType] - Specific data type to invalidate (optional)
   */
  async invalidateCache(candidateId, dataType = null) {
    if (dataType) {
      await this.cache.delete(`${dataType}_data:${candidateId}`);
    } else {
      // Invalidate all cached data for this user
      const keys = ['user_data', 'payment_data', 'account_data', 'jobs_data', 'withdrawal_data', 'interview_data'];
      for (const key of keys) {
        await this.cache.delete(`${key}:${candidateId}`);
      }
    }
  }

  /**
   * Get data access statistics for monitoring
   * @returns {Promise<Object>} Access statistics
   */
  async getAccessStatistics() {
    return await this.auditLogger.getAccessStatistics();
  }

  /**
   * Check if user has permission to access specific data
   * @param {string} userId - User making the request
   * @param {string} candidateId - Target candidate
   * @param {string} dataType - Type of data being requested
   * @returns {boolean} Permission granted
   */
  hasPermission(userId, candidateId, dataType) {
    // Admin users have access to all data
    if (this.validator.isAdmin(userId)) {
      return true;
    }

    // Users can access their own data
    if (userId === candidateId) {
      return true;
    }

    // Support staff can access limited data
    if (this.validator.isSupportStaff(userId)) {
      const allowedTypes = ['account', 'payment', 'jobs'];
      return allowedTypes.includes(dataType);
    }

    return false;
  }
}

module.exports = DataIntegrationLayer;