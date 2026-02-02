/**
 * Real Data Access Layer
 *
 * Provides access to real, current candidate data for generating accurate responses.
 * Replaces unreliable seed data and ML knowledge base with live database queries.
 *
 * Key Features:
 * - Fast, cached access to candidate information
 * - Real-time payment and earnings data
 * - Current job status and applications
 * - Performance optimized for <50ms data retrieval
 * - Data validation and integrity checks
 */

const { db } = require('../../db');
const { createLogger } = require('../../utils/structured-logger');

const logger = createLogger('real-data-access');

class RealDataAccessLayer {
  constructor() {
    // Cache configuration
    this.cache = new Map();
    this.cacheConfig = {
      candidateContextTTL: 300000, // 5 minutes
      realDataTTL: 60000,          // 1 minute
      maxCacheSize: 1000
    };

    // Data validation rules
    this.validationRules = {
      payment_inquiry: ['pendingEarnings', 'paidEarnings', 'paymentHistory'],
      balance_check: ['availableEarnings', 'totalEarnings', 'pendingEarnings'],
      withdrawal_request: ['availableEarnings', 'withdrawalHistory'],
      job_inquiry: ['upcomingJobs', 'activeApplications', 'candidateSkills'],
      job_status: ['applicationHistory', 'deploymentStatus'],
      schedule_inquiry: ['upcomingShifts', 'scheduledJobs']
    };
  }

  /**
   * Get candidate context information
   * Includes basic profile, status, and metadata
   */
  async getCandidateContext(candidateId) {
    const cacheKey = `candidate_context_${candidateId}`;

    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey, this.cacheConfig.candidateContextTTL);
      if (cached) {
        logger.debug('Candidate context retrieved from cache', { candidateId });
        return cached;
      }

      // Fetch from database
      const context = await this.fetchCandidateContext(candidateId);

      if (context) {
        // Cache the result
        this.setCache(cacheKey, context);
        logger.debug('Candidate context fetched and cached', { candidateId });
      }

      return context;

    } catch (error) {
      logger.error('Failed to get candidate context', {
        candidateId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get real candidate data for response generation
   * Includes payments, jobs, applications, etc.
   */
  async getRealCandidateData(candidateId) {
    const cacheKey = `real_data_${candidateId}`;

    try {
      // Check cache first (shorter TTL for real-time data)
      const cached = this.getFromCache(cacheKey, this.cacheConfig.realDataTTL);
      if (cached) {
        logger.debug('Real candidate data retrieved from cache', { candidateId });
        return cached;
      }

      // Fetch from database
      const realData = await this.fetchRealCandidateData(candidateId);

      if (realData) {
        // Cache the result
        this.setCache(cacheKey, realData);
        logger.debug('Real candidate data fetched and cached', { candidateId });
      }

      return realData;

    } catch (error) {
      logger.error('Failed to get real candidate data', {
        candidateId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Fetch candidate context from database
   */
  async fetchCandidateContext(candidateId) {
    try {
      const candidate = db.prepare(`
        SELECT
          id,
          name,
          email,
          phone,
          status,
          created_at,
          last_seen,
          online_status,
          level,
          xp,
          profile_completion_percentage,
          preferred_contact,
          telegram_chat_id
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      if (!candidate) {
        logger.warn('Candidate not found', { candidateId });
        return null;
      }

      // Get additional context
      const [conversationMeta, recentActivity] = await Promise.all([
        this.getConversationMetadata(candidateId),
        this.getRecentActivity(candidateId)
      ]);

      return {
        ...candidate,
        conversationMeta,
        recentActivity,
        isOnline: candidate.online_status === 'online',
        fetchedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Database error fetching candidate context', {
        candidateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Fetch real candidate data from database
   */
  async fetchRealCandidateData(candidateId) {
    try {
      // Fetch all data in parallel for performance
      const [
        paymentData,
        jobData,
        applicationData,
        scheduleData,
        activityData
      ] = await Promise.all([
        this.getPaymentData(candidateId),
        this.getJobData(candidateId),
        this.getApplicationData(candidateId),
        this.getScheduleData(candidateId),
        this.getActivityData(candidateId)
      ]);

      return {
        ...paymentData,
        ...jobData,
        ...applicationData,
        ...scheduleData,
        ...activityData,
        fetchedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Database error fetching real candidate data', {
        candidateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get payment and earnings data
   */
  async getPaymentData(candidateId) {
    try {
      // Current balance and earnings
      const earnings = db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_earnings,
          SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_earnings,
          SUM(CASE WHEN status = 'available' THEN total_amount ELSE 0 END) as available_earnings,
          COUNT(*) as total_payments
        FROM payments
        WHERE candidate_id = ?
      `).get(candidateId);

      // Recent payment history
      const recentPayments = db.prepare(`
        SELECT id, amount, total_amount, status, payment_date, created_at
        FROM payments
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(candidateId);

      // Withdrawal history
      const withdrawalHistory = db.prepare(`
        SELECT id, amount, status, created_at, processed_at
        FROM withdrawals
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(candidateId);

      return {
        pendingEarnings: earnings?.pending_earnings || 0,
        paidEarnings: earnings?.paid_earnings || 0,
        availableEarnings: earnings?.available_earnings || 0,
        totalEarnings: (earnings?.pending_earnings || 0) + (earnings?.paid_earnings || 0),
        totalPayments: earnings?.total_payments || 0,
        paymentHistory: recentPayments,
        withdrawalHistory,
        hasEarnings: (earnings?.paid_earnings || 0) + (earnings?.pending_earnings || 0) > 0
      };

    } catch (error) {
      logger.error('Error fetching payment data', {
        candidateId,
        error: error.message
      });
      return {
        pendingEarnings: 0,
        paidEarnings: 0,
        availableEarnings: 0,
        totalEarnings: 0,
        totalPayments: 0,
        paymentHistory: [],
        withdrawalHistory: [],
        hasEarnings: false
      };
    }
  }

  /**
   * Get job-related data
   */
  async getJobData(candidateId) {
    try {
      // Upcoming jobs/deployments
      const upcomingJobs = db.prepare(`
        SELECT j.id, j.title, j.location, j.job_date, j.pay_rate,
               d.id as deployment_id, d.status as deployment_status
        FROM jobs j
        JOIN deployments d ON j.id = d.job_id
        WHERE d.candidate_id = ?
          AND j.job_date >= date('now')
          AND j.status = 'open'
          AND d.status IN ('confirmed', 'pending')
        ORDER BY j.job_date ASC
        LIMIT 10
      `).all(candidateId);

      // Available jobs (not applied to)
      const availableJobs = db.prepare(`
        SELECT j.id, j.title, j.location, j.job_date, j.pay_rate,
               j.total_slots, j.filled_slots
        FROM jobs j
        LEFT JOIN deployments d ON j.id = d.job_id AND d.candidate_id = ?
        WHERE j.status = 'open'
          AND j.job_date >= date('now')
          AND d.id IS NULL
          AND j.filled_slots < j.total_slots
        ORDER BY j.job_date ASC
        LIMIT 5
      `).all(candidateId);

      // Recent job history
      const jobHistory = db.prepare(`
        SELECT j.id, j.title, j.location, j.job_date,
               d.status as deployment_status, d.created_at
        FROM jobs j
        JOIN deployments d ON j.id = d.job_id
        WHERE d.candidate_id = ?
        ORDER BY d.created_at DESC
        LIMIT 10
      `).all(candidateId);

      return {
        upcomingJobs,
        availableJobs,
        jobHistory,
        hasUpcomingWork: upcomingJobs.length > 0,
        availableOpportunities: availableJobs.length,
        totalJobsCompleted: jobHistory.filter(j => j.deployment_status === 'completed').length
      };

    } catch (error) {
      logger.error('Error fetching job data', {
        candidateId,
        error: error.message
      });
      return {
        upcomingJobs: [],
        availableJobs: [],
        jobHistory: [],
        hasUpcomingWork: false,
        availableOpportunities: 0,
        totalJobsCompleted: 0
      };
    }
  }

  /**
   * Get application data
   */
  async getApplicationData(candidateId) {
    try {
      // Active applications
      const activeApplications = db.prepare(`
        SELECT d.id, d.job_id, d.status, d.created_at,
               j.title, j.location, j.job_date
        FROM deployments d
        JOIN jobs j ON d.job_id = j.id
        WHERE d.candidate_id = ?
          AND d.status IN ('pending', 'confirmed')
        ORDER BY d.created_at DESC
      `).all(candidateId);

      // Application statistics
      const appStats = db.prepare(`
        SELECT
          COUNT(*) as total_applications,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
          SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_applications,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_applications,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_applications
        FROM deployments
        WHERE candidate_id = ?
      `).get(candidateId);

      return {
        activeApplications,
        applicationStats: appStats || {},
        hasActiveApplications: activeApplications.length > 0,
        pendingApplications: appStats?.pending_applications || 0,
        confirmedApplications: appStats?.confirmed_applications || 0
      };

    } catch (error) {
      logger.error('Error fetching application data', {
        candidateId,
        error: error.message
      });
      return {
        activeApplications: [],
        applicationStats: {},
        hasActiveApplications: false,
        pendingApplications: 0,
        confirmedApplications: 0
      };
    }
  }

  /**
   * Get schedule data
   */
  async getScheduleData(candidateId) {
    try {
      // Upcoming shifts/schedules
      const upcomingShifts = db.prepare(`
        SELECT j.id, j.title, j.job_date, j.start_time, j.end_time,
               j.location, d.status
        FROM jobs j
        JOIN deployments d ON j.id = d.job_id
        WHERE d.candidate_id = ?
          AND j.job_date >= date('now')
          AND d.status = 'confirmed'
        ORDER BY j.job_date ASC, j.start_time ASC
        LIMIT 7
      `).all(candidateId);

      // Today's schedule
      const todaySchedule = upcomingShifts.filter(shift =>
        shift.job_date === new Date().toISOString().split('T')[0]
      );

      return {
        upcomingShifts,
        todaySchedule,
        hasScheduledWork: upcomingShifts.length > 0,
        workingToday: todaySchedule.length > 0,
        nextShift: upcomingShifts[0] || null
      };

    } catch (error) {
      logger.error('Error fetching schedule data', {
        candidateId,
        error: error.message
      });
      return {
        upcomingShifts: [],
        todaySchedule: [],
        hasScheduledWork: false,
        workingToday: false,
        nextShift: null
      };
    }
  }

  /**
   * Get activity data
   */
  async getActivityData(candidateId) {
    try {
      // Recent activity log
      const recentActivity = db.prepare(`
        SELECT activity_type, description, created_at
        FROM candidate_activity_log
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(candidateId);

      // Gamification data
      const gamificationData = db.prepare(`
        SELECT level, xp, streak_days, achievements_count
        FROM candidate_gamification
        WHERE candidate_id = ?
      `).get(candidateId);

      return {
        recentActivity,
        gamificationData: gamificationData || {},
        hasRecentActivity: recentActivity.length > 0
      };

    } catch (error) {
      logger.error('Error fetching activity data', {
        candidateId,
        error: error.message
      });
      return {
        recentActivity: [],
        gamificationData: {},
        hasRecentActivity: false
      };
    }
  }

  /**
   * Get conversation metadata
   */
  async getConversationMetadata(candidateId) {
    try {
      const metadata = db.prepare(`
        SELECT status, priority, assigned_admin, last_admin_reply_at, created_at
        FROM conversation_metadata
        WHERE candidate_id = ?
      `).get(candidateId);

      // Message statistics
      const messageStats = db.prepare(`
        SELECT
          COUNT(*) as total_messages,
          COUNT(CASE WHEN sender = 'candidate' THEN 1 END) as candidate_messages,
          COUNT(CASE WHEN sender = 'admin' THEN 1 END) as admin_messages,
          MAX(created_at) as last_message_at
        FROM messages
        WHERE candidate_id = ?
      `).get(candidateId);

      return {
        metadata: metadata || {},
        messageStats: messageStats || {}
      };

    } catch (error) {
      logger.error('Error fetching conversation metadata', {
        candidateId,
        error: error.message
      });
      return {
        metadata: {},
        messageStats: {}
      };
    }
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(candidateId) {
    try {
      return db.prepare(`
        SELECT activity_type, description, created_at
        FROM candidate_activity_log
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(candidateId);

    } catch (error) {
      logger.error('Error fetching recent activity', {
        candidateId,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Validate that required data is available for an intent
   */
  async validateDataAvailability(intent, realData) {
    const requiredFields = this.validationRules[intent];

    if (!requiredFields) {
      return true; // No specific requirements
    }

    if (!realData) {
      logger.warn('No real data available for validation', { intent });
      return false;
    }

    const missingFields = requiredFields.filter(field => {
      const value = realData[field];
      return value === undefined || value === null ||
             (Array.isArray(value) && value.length === 0);
    });

    if (missingFields.length > 0) {
      logger.warn('Required data fields missing', {
        intent,
        missingFields,
        availableFields: Object.keys(realData)
      });
      return false;
    }

    return true;
  }

  /**
   * Cache management methods
   */
  getFromCache(key, ttl) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const { data, timestamp } = cached;
    const age = Date.now() - timestamp;

    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }

    return data;
  }

  setCache(key, data) {
    // Prevent cache from growing too large
    if (this.cache.size >= this.cacheConfig.maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(this.cacheConfig.maxCacheSize * 0.1))
        .forEach(([oldKey]) => this.cache.delete(oldKey));
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for a specific candidate
   */
  clearCandidateCache(candidateId) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (key.includes(candidateId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    logger.debug('Cache cleared for candidate', {
      candidateId,
      clearedKeys: keysToDelete.length
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.cache.size,
      maxSize: this.cacheConfig.maxCacheSize,
      cacheHitRatio: this.cacheHitRatio || 0 // Would need tracking to implement
    };
  }

  /**
   * Test database connectivity
   */
  async testConnection() {
    try {
      const result = db.prepare('SELECT 1 as test').get();
      return result.test === 1;
    } catch (error) {
      logger.error('Database connection test failed', {
        error: error.message
      });
      return false;
    }
  }
}

module.exports = RealDataAccessLayer;