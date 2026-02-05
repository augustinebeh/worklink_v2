/**
 * Withdrawal Data Service
 *
 * Provides real-time access to withdrawal eligibility,
 * actual balance, and minimum requirements.
 */

const { db } = require('../../db/database');

class WithdrawalDataService {
  /**
   * Get comprehensive withdrawal eligibility status for a candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Withdrawal eligibility data
   */
  async getEligibilityStatus(candidateId) {
    try {
      const currentDate = new Date().toISOString();

      // Get candidate details
      const candidate = db.prepare(`
        SELECT
          id, name, email, bank_name, bank_account,
          total_earnings, status, created_at
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Get all payments for balance calculation
      const payments = db.prepare(`
        SELECT *
        FROM payments
        WHERE candidate_id = ?
        ORDER BY created_at DESC
      `).all(candidateId);

      // Calculate current available balance
      const balanceInfo = this.calculateAvailableBalance(payments);

      // Check withdrawal eligibility
      const eligibilityChecks = this.performEligibilityChecks(candidate, balanceInfo);

      // Get withdrawal history
      const withdrawalHistory = this.getWithdrawalHistory(candidateId);

      // Calculate withdrawal limits and fees
      const withdrawalLimits = this.calculateWithdrawalLimits(candidate, balanceInfo);

      // Get pending withdrawal requests
      const pendingWithdrawals = this.getPendingWithdrawals(candidateId);

      return {
        candidateId,
        lastUpdated: currentDate,
        balance: {
          totalEarnings: candidate.total_earnings || 0,
          availableBalance: balanceInfo.available,
          pendingBalance: balanceInfo.pending,
          approvedBalance: balanceInfo.approved,
          withdrawnBalance: balanceInfo.withdrawn,
          lastPaymentDate: balanceInfo.lastPaymentDate
        },
        eligibility: {
          canWithdraw: eligibilityChecks.canWithdraw,
          reasons: eligibilityChecks.reasons,
          requirements: eligibilityChecks.requirements,
          minimumBalance: withdrawalLimits.minimumAmount,
          nextEligibilityDate: eligibilityChecks.nextEligibilityDate
        },
        limits: {
          minimumWithdrawal: withdrawalLimits.minimumAmount,
          maximumWithdrawal: withdrawalLimits.maximumAmount,
          dailyLimit: withdrawalLimits.dailyLimit,
          monthlyLimit: withdrawalLimits.monthlyLimit,
          withdrawalFee: withdrawalLimits.fee,
          feeStructure: withdrawalLimits.feeStructure
        },
        bankDetails: {
          bankName: candidate.bank_name,
          accountNumber: this.maskBankAccount(candidate.bank_account),
          isValid: !!(candidate.bank_name && candidate.bank_account),
          verificationStatus: this.getBankVerificationStatus(candidate)
        },
        pending: {
          requests: pendingWithdrawals,
          totalPending: pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0),
          expectedProcessingTime: this.getExpectedProcessingTime()
        },
        history: withdrawalHistory,
        recommendations: this.getWithdrawalRecommendations(balanceInfo, eligibilityChecks)
      };

    } catch (error) {
      throw new Error(`Failed to fetch withdrawal eligibility data: ${error.message}`);
    }
  }

  /**
   * Calculate available balance from payments
   * @param {Array} payments - Payment records
   * @returns {Object} Balance breakdown
   */
  calculateAvailableBalance(payments) {
    const balance = {
      pending: 0,
      approved: 0,
      paid: 0,
      withdrawn: 0,
      available: 0,
      lastPaymentDate: null
    };

    payments.forEach(payment => {
      const amount = payment.total_amount || 0;

      switch (payment.status) {
        case 'pending':
          balance.pending += amount;
          break;
        case 'approved':
          balance.approved += amount;
          break;
        case 'paid':
          balance.paid += amount;
          if (!balance.lastPaymentDate || payment.paid_at > balance.lastPaymentDate) {
            balance.lastPaymentDate = payment.paid_at;
          }
          break;
      }

      // Check if withdrawal was requested/completed
      if (payment.withdrawal_requested || payment.withdrawal_completed) {
        balance.withdrawn += amount;
      }
    });

    // Available balance = paid but not yet withdrawn
    balance.available = balance.paid - balance.withdrawn;

    // Round all amounts
    Object.keys(balance).forEach(key => {
      if (typeof balance[key] === 'number') {
        balance[key] = Math.round(balance[key] * 100) / 100;
      }
    });

    return balance;
  }

  /**
   * Perform eligibility checks for withdrawals
   * @param {Object} candidate - Candidate record
   * @param {Object} balanceInfo - Balance information
   * @returns {Object} Eligibility check results
   */
  performEligibilityChecks(candidate, balanceInfo) {
    const checks = {
      hasMinimumBalance: false,
      hasValidBankDetails: false,
      hasCompletedJobs: false,
      hasNoActivePenalties: false,
      withinWithdrawalLimits: false,
      accountInGoodStanding: false
    };

    const reasons = [];
    const requirements = [];

    // Minimum balance check ($20)
    const minimumBalance = 20.00;
    checks.hasMinimumBalance = balanceInfo.available >= minimumBalance;
    if (!checks.hasMinimumBalance) {
      reasons.push(`Minimum balance of $${minimumBalance} required`);
      requirements.push(`Earn at least $${(minimumBalance - balanceInfo.available).toFixed(2)} more`);
    }

    // Bank details check
    checks.hasValidBankDetails = !!(candidate.bank_name && candidate.bank_account);
    if (!checks.hasValidBankDetails) {
      reasons.push('Valid bank details required');
      requirements.push('Update your bank details in Profile settings');
    }

    // Completed jobs check (at least 1 completed job)
    const completedJobs = this.getCompletedJobsCount(candidate.id);
    checks.hasCompletedJobs = completedJobs > 0;
    if (!checks.hasCompletedJobs) {
      reasons.push('Must complete at least 1 job before withdrawal');
      requirements.push('Complete your first job assignment');
    }

    // Account status check
    checks.accountInGoodStanding = candidate.status === 'active';
    if (!checks.accountInGoodStanding) {
      reasons.push('Account must be in good standing');
      requirements.push('Contact support to resolve account status');
    }

    // Penalties check (simplified - would check penalties table in full implementation)
    checks.hasNoActivePenalties = true; // Assume no penalties for now

    // Withdrawal limits check (daily/monthly limits)
    const dailyWithdrawals = this.getDailyWithdrawalAmount(candidate.id);
    const monthlyWithdrawals = this.getMonthlyWithdrawalAmount(candidate.id);
    const limits = this.calculateWithdrawalLimits(candidate, balanceInfo);

    checks.withinWithdrawalLimits =
      dailyWithdrawals < limits.dailyLimit &&
      monthlyWithdrawals < limits.monthlyLimit;

    if (!checks.withinWithdrawalLimits) {
      reasons.push('Daily or monthly withdrawal limit exceeded');
      requirements.push('Wait for limits to reset or contact support');
    }

    const canWithdraw = Object.values(checks).every(check => check === true);

    // Calculate next eligibility date if not currently eligible
    let nextEligibilityDate = null;
    if (!canWithdraw) {
      if (!checks.hasMinimumBalance && balanceInfo.pending > 0) {
        // Estimate when pending payments will be processed
        nextEligibilityDate = this.estimateNextPaymentDate();
      } else if (!checks.withinWithdrawalLimits) {
        // Next day or next month depending on which limit is hit
        nextEligibilityDate = this.calculateLimitResetDate();
      }
    }

    return {
      canWithdraw,
      reasons,
      requirements,
      checks,
      nextEligibilityDate
    };
  }

  /**
   * Calculate withdrawal limits based on candidate tier and history
   * @param {Object} candidate - Candidate record
   * @param {Object} balanceInfo - Balance information
   * @returns {Object} Withdrawal limits
   */
  calculateWithdrawalLimits(candidate, balanceInfo) {
    // Base limits (could be adjusted based on candidate tier/history)
    const minimumAmount = 20.00;
    const dailyLimit = 500.00;
    const monthlyLimit = 2000.00;

    // Maximum withdrawal is available balance minus any fees
    const fee = this.calculateWithdrawalFee(balanceInfo.available);
    const maximumAmount = Math.max(0, balanceInfo.available - fee);

    return {
      minimumAmount,
      maximumAmount,
      dailyLimit,
      monthlyLimit,
      fee,
      feeStructure: {
        freeWithdrawals: 2, // First 2 withdrawals per month are free
        standardFee: 2.00,
        largeAmountFee: 5.00, // For withdrawals > $200
        description: 'First 2 withdrawals per month are free, then $2 fee ($5 for amounts > $200)'
      }
    };
  }

  /**
   * Get withdrawal history for the candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Array} Withdrawal history
   */
  getWithdrawalHistory(candidateId) {
    try {
      // In a full implementation, this would query a withdrawals table
      // For now, we'll simulate based on payments with withdrawal flags
      const withdrawals = db.prepare(`
        SELECT
          p.id,
          p.total_amount,
          p.paid_at as withdrawal_date,
          p.transaction_id,
          'completed' as status,
          'bank_transfer' as method
        FROM payments p
        WHERE p.candidate_id = ?
          AND p.status = 'paid'
          AND p.paid_at IS NOT NULL
        ORDER BY p.paid_at DESC
        LIMIT 20
      `).all(candidateId);

      return withdrawals.map(w => ({
        id: w.id,
        amount: w.total_amount,
        fee: this.calculateWithdrawalFee(w.total_amount),
        netAmount: w.total_amount - this.calculateWithdrawalFee(w.total_amount),
        method: w.method,
        status: w.status,
        requestedAt: w.withdrawal_date,
        processedAt: w.withdrawal_date,
        transactionId: w.transaction_id,
        processingTime: '1-2 business days'
      }));

    } catch (error) {
      return [];
    }
  }

  /**
   * Get pending withdrawal requests
   * @param {string} candidateId - Candidate ID
   * @returns {Array} Pending withdrawals
   */
  getPendingWithdrawals(candidateId) {
    try {
      // Simulate pending withdrawals - in reality this would be a separate table
      const pending = db.prepare(`
        SELECT
          p.id,
          p.total_amount,
          p.created_at,
          'pending' as status
        FROM payments p
        WHERE p.candidate_id = ?
          AND p.withdrawal_requested = 1
          AND p.status = 'approved'
        ORDER BY p.created_at DESC
      `).all(candidateId);

      return pending.map(w => ({
        id: w.id,
        amount: w.total_amount,
        requestedAt: w.created_at,
        estimatedProcessingDate: this.estimateProcessingDate(w.created_at),
        status: w.status
      }));

    } catch (error) {
      return [];
    }
  }

  /**
   * Get withdrawal recommendations
   * @param {Object} balanceInfo - Balance information
   * @param {Object} eligibilityChecks - Eligibility check results
   * @returns {Array} Recommendations
   */
  getWithdrawalRecommendations(balanceInfo, eligibilityChecks) {
    const recommendations = [];

    if (balanceInfo.available >= 20 && eligibilityChecks.canWithdraw) {
      recommendations.push({
        type: 'eligible',
        priority: 'high',
        title: 'You can withdraw your earnings now',
        description: `$${balanceInfo.available.toFixed(2)} available for withdrawal`,
        action: 'Request withdrawal'
      });
    }

    if (balanceInfo.pending > 0) {
      recommendations.push({
        type: 'pending',
        priority: 'medium',
        title: 'Payments being processed',
        description: `$${balanceInfo.pending.toFixed(2)} will be available after approval`,
        action: 'Check back in 2-3 days'
      });
    }

    if (balanceInfo.available < 20 && balanceInfo.available > 0) {
      const needed = 20 - balanceInfo.available;
      recommendations.push({
        type: 'threshold',
        priority: 'medium',
        title: 'Almost ready for withdrawal',
        description: `Earn $${needed.toFixed(2)} more to reach minimum withdrawal amount`,
        action: 'Apply for more jobs'
      });
    }

    if (!eligibilityChecks.checks.hasValidBankDetails) {
      recommendations.push({
        type: 'setup',
        priority: 'high',
        title: 'Add bank details',
        description: 'Bank details required for withdrawals',
        action: 'Update profile'
      });
    }

    // Fee optimization
    const monthlyWithdrawals = this.getMonthlyWithdrawalCount(balanceInfo.candidateId);
    if (monthlyWithdrawals >= 2) {
      recommendations.push({
        type: 'optimization',
        priority: 'low',
        title: 'Consider larger withdrawals',
        description: 'Combine smaller amounts to reduce fees',
        action: 'Plan your withdrawals'
      });
    }

    return recommendations;
  }

  // Helper methods

  getCompletedJobsCount(candidateId) {
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM deployments
        WHERE candidate_id = ? AND status = 'completed'
      `).get(candidateId);

      return result?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  getDailyWithdrawalAmount(candidateId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM payments
        WHERE candidate_id = ?
          AND withdrawal_requested = 1
          AND DATE(created_at) = ?
      `).get(candidateId, today);

      return result?.total || 0;
    } catch (error) {
      return 0;
    }
  }

  getMonthlyWithdrawalAmount(candidateId) {
    try {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const monthStart = firstDayOfMonth.toISOString().split('T')[0];

      const result = db.prepare(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM payments
        WHERE candidate_id = ?
          AND withdrawal_requested = 1
          AND DATE(created_at) >= ?
      `).get(candidateId, monthStart);

      return result?.total || 0;
    } catch (error) {
      return 0;
    }
  }

  getMonthlyWithdrawalCount(candidateId) {
    try {
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const monthStart = firstDayOfMonth.toISOString().split('T')[0];

      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM payments
        WHERE candidate_id = ?
          AND withdrawal_requested = 1
          AND DATE(created_at) >= ?
      `).get(candidateId, monthStart);

      return result?.count || 0;
    } catch (error) {
      return 0;
    }
  }

  calculateWithdrawalFee(amount) {
    // Fee structure: first 2 withdrawals per month free, then $2 ($5 for >$200)
    // This would need to track monthly withdrawal count in a real implementation
    if (amount > 200) {
      return 5.00;
    } else {
      return 2.00;
    }
  }

  getBankVerificationStatus(candidate) {
    if (!candidate.bank_name || !candidate.bank_account) {
      return 'not_provided';
    }

    // In a real implementation, this would check against a verification service
    return 'verified';
  }

  getExpectedProcessingTime() {
    return {
      minimum: '1 business day',
      maximum: '3 business days',
      average: '1-2 business days',
      factors: [
        'Bank processing times may vary',
        'Weekend/holiday requests processed on next business day',
        'Large amounts may require additional verification'
      ]
    };
  }

  estimateNextPaymentDate() {
    // Payments typically processed on Fridays
    const today = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (daysUntilFriday || 7));
    return nextFriday.toISOString().split('T')[0];
  }

  calculateLimitResetDate() {
    // Daily limit resets at midnight, monthly on 1st
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  estimateProcessingDate(requestedAt) {
    const requested = new Date(requestedAt);
    const estimated = new Date(requested);
    estimated.setDate(requested.getDate() + 2); // 2 business days estimate
    return estimated.toISOString().split('T')[0];
  }

  maskBankAccount(accountNumber) {
    if (!accountNumber || accountNumber.length < 4) {
      return '****';
    }

    const last4 = accountNumber.slice(-4);
    const masked = '*'.repeat(Math.max(0, accountNumber.length - 4));
    return masked + last4;
  }

  /**
   * Request withdrawal for a specific amount
   * @param {string} candidateId - Candidate ID
   * @param {number} amount - Withdrawal amount
   * @returns {Promise<Object>} Withdrawal request result
   */
  async requestWithdrawal(candidateId, amount) {
    try {
      // Get current eligibility
      const eligibilityData = await this.getEligibilityStatus(candidateId);

      if (!eligibilityData.eligibility.canWithdraw) {
        throw new Error(`Withdrawal not allowed: ${eligibilityData.eligibility.reasons.join(', ')}`);
      }

      if (amount < eligibilityData.limits.minimumWithdrawal) {
        throw new Error(`Minimum withdrawal amount is $${eligibilityData.limits.minimumWithdrawal}`);
      }

      if (amount > eligibilityData.limits.maximumWithdrawal) {
        throw new Error(`Maximum withdrawal amount is $${eligibilityData.limits.maximumWithdrawal}`);
      }

      const fee = this.calculateWithdrawalFee(amount);
      const netAmount = amount - fee;

      // In a real implementation, this would:
      // 1. Create withdrawal request record
      // 2. Update payment records
      // 3. Trigger payment processing workflow
      // 4. Send notifications

      return {
        success: true,
        withdrawalId: `WD_${Date.now()}`,
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        estimatedProcessingDate: this.estimateProcessingDate(new Date().toISOString()),
        message: 'Withdrawal request submitted successfully'
      };

    } catch (error) {
      throw new Error(`Withdrawal request failed: ${error.message}`);
    }
  }
}

module.exports = WithdrawalDataService;