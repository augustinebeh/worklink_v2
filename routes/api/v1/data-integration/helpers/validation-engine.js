/**
 * Validation Engine Helper
 *
 * Handles validation logic, permissions, and security checks
 * for the data integration module.
 */

const { db } = require('../../../../../db');

class ValidationEngine {
  constructor() {
    this.db = db;
    this.adminRoles = ['admin', 'super_admin'];
    this.supportRoles = ['support', 'customer_service'];
  }

  /**
   * Check if user has admin privileges
   * @param {string} userId - User ID to check
   * @returns {boolean} - True if user is admin
   */
  isAdmin(userId) {
    try {
      const user = this.db.prepare(`
        SELECT role, status FROM users WHERE id = ? AND status = 'active'
      `).get(userId);

      return user && this.adminRoles.includes(user.role);
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Check if user has support staff privileges
   * @param {string} userId - User ID to check
   * @returns {boolean} - True if user is support staff
   */
  isSupportStaff(userId) {
    try {
      const user = this.db.prepare(`
        SELECT role, status FROM users WHERE id = ? AND status = 'active'
      `).get(userId);

      return user && (
        this.adminRoles.includes(user.role) ||
        this.supportRoles.includes(user.role)
      );
    } catch (error) {
      console.error('Error checking support staff status:', error);
      return false;
    }
  }

  /**
   * Check if user has permission to access specific candidate data
   * @param {string} userId - User ID making the request
   * @param {string} candidateId - Candidate ID being accessed
   * @param {string} dataType - Type of data being accessed
   * @returns {boolean} - True if access is allowed
   */
  hasPermission(userId, candidateId, dataType) {
    try {
      // Admin can access everything
      if (this.isAdmin(userId)) {
        return true;
      }

      // Users can access their own data
      if (userId === candidateId) {
        return true;
      }

      // Support staff can access non-financial data
      if (this.isSupportStaff(userId) && !this.isFinancialData(dataType)) {
        return true;
      }

      // Check for specific permissions (e.g., team lead accessing team member data)
      return this.hasSpecificPermission(userId, candidateId, dataType);

    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Check if data type is financial/sensitive
   * @param {string} dataType - Data type to check
   * @returns {boolean} - True if financial data
   */
  isFinancialData(dataType) {
    const financialTypes = ['payment', 'withdrawal', 'banking', 'salary'];
    return financialTypes.includes(dataType);
  }

  /**
   * Check for specific permissions (team relationships, etc.)
   * @param {string} userId - User ID making the request
   * @param {string} candidateId - Candidate ID being accessed
   * @param {string} dataType - Type of data being accessed
   * @returns {boolean} - True if specific permission exists
   */
  hasSpecificPermission(userId, candidateId, dataType) {
    try {
      // Check if user is a team lead with access to team member data
      const teamRelation = this.db.prepare(`
        SELECT 1 FROM team_relationships
        WHERE leader_id = ? AND member_id = ? AND status = 'active'
      `).get(userId, candidateId);

      if (teamRelation && !this.isFinancialData(dataType)) {
        return true;
      }

      // Check for consultant relationship
      const consultantRelation = this.db.prepare(`
        SELECT 1 FROM consultant_assignments
        WHERE consultant_id = ? AND candidate_id = ? AND status = 'active'
      `).get(userId, candidateId);

      if (consultantRelation) {
        return true;
      }

      return false;

    } catch (error) {
      console.error('Error checking specific permissions:', error);
      return false;
    }
  }

  /**
   * Validate candidate ID exists and is active
   * @param {string} candidateId - Candidate ID to validate
   * @returns {Object} - Validation result
   */
  validateCandidateExists(candidateId) {
    try {
      const candidate = this.db.prepare(`
        SELECT id, status, name, email FROM candidates WHERE id = ?
      `).get(candidateId);

      if (!candidate) {
        return {
          valid: false,
          error: 'Candidate not found',
          code: 'CANDIDATE_NOT_FOUND'
        };
      }

      if (candidate.status !== 'active') {
        return {
          valid: false,
          error: 'Candidate account is not active',
          code: 'CANDIDATE_INACTIVE'
        };
      }

      return {
        valid: true,
        candidate
      };

    } catch (error) {
      console.error('Error validating candidate existence:', error);
      return {
        valid: false,
        error: 'Database error during validation',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate payment ID exists and belongs to candidate
   * @param {string} paymentId - Payment ID to validate
   * @param {string} candidateId - Candidate ID that should own the payment
   * @returns {Object} - Validation result
   */
  validatePaymentOwnership(paymentId, candidateId) {
    try {
      const payment = this.db.prepare(`
        SELECT id, candidate_id, status FROM payments
        WHERE id = ? AND candidate_id = ?
      `).get(paymentId, candidateId);

      if (!payment) {
        return {
          valid: false,
          error: 'Payment not found or access denied',
          code: 'PAYMENT_NOT_FOUND'
        };
      }

      return {
        valid: true,
        payment
      };

    } catch (error) {
      console.error('Error validating payment ownership:', error);
      return {
        valid: false,
        error: 'Database error during payment validation',
        code: 'PAYMENT_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate withdrawal eligibility
   * @param {string} candidateId - Candidate ID
   * @param {number} amount - Withdrawal amount
   * @returns {Object} - Validation result
   */
  validateWithdrawalEligibility(candidateId, amount) {
    try {
      // Check account verification status
      const verification = this.db.prepare(`
        SELECT * FROM account_verification WHERE candidate_id = ?
      `).get(candidateId);

      if (!verification || !verification.bank_verified || !verification.identity_verified) {
        return {
          valid: false,
          error: 'Account verification required for withdrawals',
          code: 'VERIFICATION_REQUIRED',
          required: ['bank_verified', 'identity_verified']
        };
      }

      // Check available balance
      const balance = this.db.prepare(`
        SELECT available_balance, minimum_withdrawal, maximum_withdrawal
        FROM candidate_balances WHERE candidate_id = ?
      `).get(candidateId);

      if (!balance) {
        return {
          valid: false,
          error: 'No balance information found',
          code: 'BALANCE_NOT_FOUND'
        };
      }

      if (amount < balance.minimum_withdrawal) {
        return {
          valid: false,
          error: `Minimum withdrawal amount is $${balance.minimum_withdrawal}`,
          code: 'AMOUNT_TOO_LOW',
          minimum: balance.minimum_withdrawal
        };
      }

      if (amount > balance.maximum_withdrawal) {
        return {
          valid: false,
          error: `Maximum withdrawal amount is $${balance.maximum_withdrawal}`,
          code: 'AMOUNT_TOO_HIGH',
          maximum: balance.maximum_withdrawal
        };
      }

      if (amount > balance.available_balance) {
        return {
          valid: false,
          error: 'Insufficient funds',
          code: 'INSUFFICIENT_FUNDS',
          available: balance.available_balance
        };
      }

      // Check for pending withdrawals
      const pendingWithdrawals = this.db.prepare(`
        SELECT SUM(amount) as pending FROM withdrawals
        WHERE candidate_id = ? AND status = 'pending'
      `).get(candidateId);

      const remainingBalance = balance.available_balance - (pendingWithdrawals.pending || 0);

      if (amount > remainingBalance) {
        return {
          valid: false,
          error: 'Amount exceeds available balance (accounting for pending withdrawals)',
          code: 'INSUFFICIENT_FUNDS_PENDING',
          available: remainingBalance,
          pending: pendingWithdrawals.pending || 0
        };
      }

      return {
        valid: true,
        balance
      };

    } catch (error) {
      console.error('Error validating withdrawal eligibility:', error);
      return {
        valid: false,
        error: 'Database error during withdrawal validation',
        code: 'WITHDRAWAL_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate interview scheduling request
   * @param {string} candidateId - Candidate ID
   * @param {Object} scheduleData - Schedule data (date, time, type)
   * @returns {Object} - Validation result
   */
  validateInterviewScheduling(candidateId, scheduleData) {
    try {
      const { date, time, type } = scheduleData;

      // Check if candidate requires an interview
      const requirement = this.db.prepare(`
        SELECT interview_required, interview_type FROM candidate_requirements
        WHERE candidate_id = ?
      `).get(candidateId);

      if (!requirement || !requirement.interview_required) {
        return {
          valid: false,
          error: 'No interview required for this candidate',
          code: 'NO_INTERVIEW_REQUIRED'
        };
      }

      // Validate date is in the future
      const scheduleDateTime = new Date(`${date} ${time}`);
      const now = new Date();

      if (scheduleDateTime <= now) {
        return {
          valid: false,
          error: 'Interview date must be in the future',
          code: 'INVALID_DATE'
        };
      }

      // Check for existing interviews
      const existingInterview = this.db.prepare(`
        SELECT id, status FROM interviews
        WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
      `).get(candidateId);

      if (existingInterview) {
        return {
          valid: false,
          error: 'Candidate already has a scheduled interview',
          code: 'INTERVIEW_ALREADY_SCHEDULED',
          existingId: existingInterview.id
        };
      }

      // Check interview slot availability (basic check)
      const conflictingInterview = this.db.prepare(`
        SELECT id FROM interviews
        WHERE scheduled_date = ? AND scheduled_time = ? AND status IN ('scheduled', 'confirmed')
      `).get(date, time);

      if (conflictingInterview) {
        return {
          valid: false,
          error: 'This time slot is already booked',
          code: 'TIME_SLOT_CONFLICT'
        };
      }

      return {
        valid: true,
        requirement
      };

    } catch (error) {
      console.error('Error validating interview scheduling:', error);
      return {
        valid: false,
        error: 'Database error during interview validation',
        code: 'INTERVIEW_VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate data access rate limits
   * @param {string} userId - User ID
   * @param {string} dataType - Data type being accessed
   * @returns {Object} - Validation result
   */
  validateRateLimit(userId, dataType) {
    // This would typically integrate with Redis or similar for production
    // For now, we'll do a basic database check

    try {
      const recentRequests = this.db.prepare(`
        SELECT COUNT(*) as count FROM data_access_logs
        WHERE user_id = ? AND data_type = ?
        AND created_at > datetime('now', '-1 hour')
      `).get(userId, dataType);

      const limit = this.getRateLimitForDataType(dataType);

      if (recentRequests.count >= limit) {
        return {
          valid: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          limit,
          current: recentRequests.count
        };
      }

      return {
        valid: true,
        remaining: limit - recentRequests.count
      };

    } catch (error) {
      console.error('Error validating rate limit:', error);
      return {
        valid: true // Allow request on validation error
      };
    }
  }

  /**
   * Get rate limit for specific data type
   * @param {string} dataType - Data type
   * @returns {number} - Requests per hour limit
   */
  getRateLimitForDataType(dataType) {
    const limits = {
      payment: 10,
      withdrawal: 5,
      comprehensive: 20,
      account: 30,
      jobs: 50,
      interview: 15
    };

    return limits[dataType] || 30;
  }

  /**
   * Log data access for audit trail
   * @param {string} userId - User ID
   * @param {string} candidateId - Candidate ID accessed
   * @param {string} dataType - Data type accessed
   * @param {string} action - Action performed
   */
  logDataAccess(userId, candidateId, dataType, action = 'read') {
    try {
      this.db.prepare(`
        INSERT INTO data_access_logs (
          user_id, candidate_id, data_type, action, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        candidateId,
        dataType,
        action,
        null, // IP would come from request
        null, // User agent would come from request
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error logging data access:', error);
      // Don't throw - logging failure shouldn't break the request
    }
  }
}

module.exports = ValidationEngine;