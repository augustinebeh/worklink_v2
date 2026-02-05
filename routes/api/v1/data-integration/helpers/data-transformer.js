/**
 * Data Transformation Helper
 *
 * Handles data formatting, sanitization, and transformation operations
 * for the data integration module.
 */

class DataTransformer {
  constructor() {
    this.formats = {
      candidateId: /^[A-Z]{3}_[A-Z0-9_]+$/,
      paymentId: /^[A-Z]+_[A-Z0-9_]+$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[\d\s\-\(\)]+$/
    };
  }

  /**
   * Validate candidate ID format
   * @param {string} candidateId - The candidate ID to validate
   * @returns {boolean} - True if valid format
   */
  validateCandidateId(candidateId) {
    return this.formats.candidateId.test(candidateId);
  }

  /**
   * Validate payment ID format
   * @param {string} paymentId - The payment ID to validate
   * @returns {boolean} - True if valid format
   */
  validatePaymentId(paymentId) {
    return this.formats.paymentId.test(paymentId);
  }

  /**
   * Sanitize user data for response
   * @param {Object} userData - Raw user data
   * @returns {Object} - Sanitized user data
   */
  sanitizeUserData(userData) {
    if (!userData) return null;

    // Remove sensitive fields
    const sanitized = { ...userData };
    delete sanitized.password;
    delete sanitized.hashed_password;
    delete sanitized.social_security_number;
    delete sanitized.bank_account_number;
    delete sanitized.credit_card_number;

    return sanitized;
  }

  /**
   * Transform payment data for response
   * @param {Object} paymentData - Raw payment data
   * @returns {Object} - Transformed payment data
   */
  transformPaymentData(paymentData) {
    if (!paymentData) return null;

    return {
      id: paymentData.id,
      candidateId: paymentData.candidate_id,
      amount: parseFloat(paymentData.amount || 0),
      status: paymentData.status,
      method: paymentData.payment_method,
      date: paymentData.payment_date,
      reference: paymentData.reference_id,
      description: paymentData.description,
      currency: paymentData.currency || 'SGD',
      fees: parseFloat(paymentData.fees || 0),
      netAmount: parseFloat(paymentData.amount || 0) - parseFloat(paymentData.fees || 0),
      createdAt: paymentData.created_at,
      updatedAt: paymentData.updated_at
    };
  }

  /**
   * Transform job data for response
   * @param {Object} jobData - Raw job data
   * @returns {Object} - Transformed job data
   */
  transformJobData(jobData) {
    if (!jobData) return null;

    return {
      id: jobData.id,
      title: jobData.title,
      description: jobData.description,
      clientName: jobData.client_name,
      location: jobData.location,
      date: jobData.job_date,
      startTime: jobData.start_time,
      endTime: jobData.end_time,
      duration: this.calculateDuration(jobData.start_time, jobData.end_time, jobData.break_minutes),
      chargeRate: parseFloat(jobData.charge_rate || 0),
      payRate: parseFloat(jobData.pay_rate || 0),
      status: jobData.status,
      requirements: jobData.requirements ? JSON.parse(jobData.requirements) : [],
      totalSlots: parseInt(jobData.total_slots || 0),
      filledSlots: parseInt(jobData.filled_slots || 0),
      createdAt: jobData.created_at,
      updatedAt: jobData.updated_at
    };
  }

  /**
   * Transform interview data for response
   * @param {Object} interviewData - Raw interview data
   * @returns {Object} - Transformed interview data
   */
  transformInterviewData(interviewData) {
    if (!interviewData) return null;

    return {
      id: interviewData.id,
      candidateId: interviewData.candidate_id,
      type: interviewData.interview_type,
      status: interviewData.status,
      scheduledDate: interviewData.scheduled_date,
      scheduledTime: interviewData.scheduled_time,
      duration: interviewData.duration_minutes || 30,
      interviewerName: interviewData.interviewer_name,
      platform: interviewData.platform,
      meetingLink: interviewData.meeting_link,
      notes: interviewData.notes,
      rating: interviewData.rating,
      createdAt: interviewData.created_at,
      completedAt: interviewData.completed_at
    };
  }

  /**
   * Calculate job duration in hours
   * @param {string} startTime - Start time (HH:MM)
   * @param {string} endTime - End time (HH:MM)
   * @param {number} breakMinutes - Break duration in minutes
   * @returns {number} - Duration in hours
   */
  calculateDuration(startTime, endTime, breakMinutes = 0) {
    if (!startTime || !endTime) return 0;

    const [startHour, startMin] = startTime.split(':').map(Number);
    let [endHour, endMin] = endTime.split(':').map(Number);

    // Handle overnight shifts
    if (endHour < startHour) {
      endHour += 24;
    }

    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin) - (breakMinutes || 0);
    return Math.max(0, totalMinutes / 60);
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: SGD)
   * @returns {string} - Formatted amount
   */
  formatCurrency(amount, currency = 'SGD') {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  /**
   * Transform account verification data
   * @param {Object} verificationData - Raw verification data
   * @returns {Object} - Transformed verification data
   */
  transformVerificationData(verificationData) {
    if (!verificationData) return null;

    const steps = [
      'email_verified',
      'phone_verified',
      'identity_verified',
      'address_verified',
      'bank_verified'
    ];

    const completedSteps = steps.filter(step => verificationData[step]);
    const completionPercentage = Math.round((completedSteps.length / steps.length) * 100);

    return {
      candidateId: verificationData.candidate_id,
      email: {
        verified: !!verificationData.email_verified,
        verifiedAt: verificationData.email_verified_at
      },
      phone: {
        verified: !!verificationData.phone_verified,
        verifiedAt: verificationData.phone_verified_at
      },
      identity: {
        verified: !!verificationData.identity_verified,
        verifiedAt: verificationData.identity_verified_at,
        document: verificationData.identity_document_type
      },
      address: {
        verified: !!verificationData.address_verified,
        verifiedAt: verificationData.address_verified_at
      },
      banking: {
        verified: !!verificationData.bank_verified,
        verifiedAt: verificationData.bank_verified_at
      },
      overall: {
        completed: completedSteps.length,
        total: steps.length,
        completionPercentage,
        isComplete: completionPercentage === 100
      }
    };
  }

  /**
   * Transform withdrawal data for response
   * @param {Object} withdrawalData - Raw withdrawal data
   * @returns {Object} - Transformed withdrawal data
   */
  transformWithdrawalData(withdrawalData) {
    if (!withdrawalData) return null;

    return {
      candidateId: withdrawalData.candidate_id,
      availableBalance: parseFloat(withdrawalData.available_balance || 0),
      pendingAmount: parseFloat(withdrawalData.pending_amount || 0),
      totalBalance: parseFloat(withdrawalData.total_balance || 0),
      minimumWithdrawal: parseFloat(withdrawalData.minimum_withdrawal || 10),
      maximumWithdrawal: parseFloat(withdrawalData.maximum_withdrawal || 1000),
      canWithdraw: withdrawalData.can_withdraw === 1,
      restrictions: withdrawalData.restrictions ? JSON.parse(withdrawalData.restrictions) : [],
      lastWithdrawal: withdrawalData.last_withdrawal_date,
      eligibilityReason: withdrawalData.eligibility_reason,
      verificationRequired: withdrawalData.verification_required === 1
    };
  }

  /**
   * Create response metadata
   * @param {string} dataType - Type of data
   * @param {Object} options - Additional options
   * @returns {Object} - Metadata object
   */
  createMetadata(dataType, options = {}) {
    return {
      dataType,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      cached: options.cached || false,
      source: options.source || 'database',
      ...options
    };
  }

  /**
   * Validate pagination parameters
   * @param {Object} query - Query parameters
   * @returns {Object} - Validated pagination parameters
   */
  validatePagination(query = {}) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    return {
      page: Math.max(1, page),
      limit,
      offset
    };
  }
}

module.exports = DataTransformer;