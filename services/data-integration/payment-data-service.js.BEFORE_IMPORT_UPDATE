/**
 * Payment Data Service
 *
 * Provides real-time access to payment status, pending amounts,
 * processing dates, and timeline data.
 */

const { db } = require('../../db/database');

class PaymentDataService {
  /**
   * Get comprehensive payment status for a candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Payment status data
   */
  async getPaymentStatus(candidateId) {
    try {
      const currentDate = new Date().toISOString();

      // Get all payments for the candidate
      const payments = db.prepare(`
        SELECT
          p.*,
          d.job_id,
          d.hours_worked,
          j.title as job_title,
          j.job_date,
          j.location,
          c.name as candidate_name,
          c.bank_name,
          c.bank_account
        FROM payments p
        LEFT JOIN deployments d ON p.deployment_id = d.id
        LEFT JOIN jobs j ON d.job_id = j.id
        LEFT JOIN candidates c ON p.candidate_id = c.id
        WHERE p.candidate_id = ?
        ORDER BY p.created_at DESC
      `).all(candidateId);

      // Calculate payment statistics
      const stats = this.calculatePaymentStats(payments);

      // Get pending payments with detailed timeline
      const pendingPayments = payments.filter(p => p.status === 'pending');
      const approvedPayments = payments.filter(p => p.status === 'approved');
      const paidPayments = payments.filter(p => p.status === 'paid');

      // Calculate next payment date (typically Fridays)
      const nextPaymentDate = this.calculateNextPaymentDate();

      // Get processing timeline for each payment
      const paymentTimelines = pendingPayments.map(payment => ({
        id: payment.id,
        jobTitle: payment.job_title,
        jobDate: payment.job_date,
        amount: payment.total_amount,
        submittedDate: payment.created_at,
        estimatedApprovalDate: this.estimateApprovalDate(payment.created_at),
        estimatedPaymentDate: this.estimatePaymentDate(payment.created_at),
        daysUntilPayment: this.calculateDaysUntilPayment(payment.created_at)
      }));

      // Recent payment history (last 3 months)
      const recentPayments = paidPayments
        .filter(p => new Date(p.paid_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .slice(0, 10)
        .map(payment => ({
          id: payment.id,
          jobTitle: payment.job_title,
          jobDate: payment.job_date,
          amount: payment.total_amount,
          paidDate: payment.paid_at,
          transactionId: payment.transaction_id
        }));

      return {
        candidateId,
        lastUpdated: currentDate,
        summary: {
          totalEarnings: stats.totalPaid,
          pendingAmount: stats.totalPending,
          approvedAmount: stats.totalApproved,
          totalPayments: payments.length,
          averagePayment: stats.averagePayment
        },
        currentStatus: {
          hasPendingPayments: pendingPayments.length > 0,
          pendingCount: pendingPayments.length,
          approvedCount: approvedPayments.length,
          nextPaymentDate: nextPaymentDate,
          estimatedPaymentAmount: stats.totalApproved + stats.totalPending
        },
        timeline: {
          pendingPayments: paymentTimelines,
          processingDays: this.getAverageProcessingDays(),
          paymentSchedule: this.getPaymentScheduleInfo()
        },
        bankDetails: {
          bankName: payments[0]?.bank_name || null,
          bankAccount: payments[0]?.bank_account ? this.maskBankAccount(payments[0].bank_account) : null,
          isValid: !!(payments[0]?.bank_name && payments[0]?.bank_account)
        },
        recentHistory: recentPayments
      };

    } catch (error) {
      throw new Error(`Failed to fetch payment data: ${error.message}`);
    }
  }

  /**
   * Calculate payment statistics
   * @param {Array} payments - Payment records
   * @returns {Object} Payment statistics
   */
  calculatePaymentStats(payments) {
    const totalPaid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const totalApproved = payments
      .filter(p => p.status === 'approved')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const averagePayment = payments.length > 0 ?
      payments.reduce((sum, p) => sum + (p.total_amount || 0), 0) / payments.length : 0;

    return {
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalPending: Math.round(totalPending * 100) / 100,
      totalApproved: Math.round(totalApproved * 100) / 100,
      averagePayment: Math.round(averagePayment * 100) / 100
    };
  }

  /**
   * Calculate next payment date (typically Friday)
   * @returns {string} Next payment date
   */
  calculateNextPaymentDate() {
    const now = new Date();
    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + (daysUntilFriday || 7));
    return nextFriday.toISOString().split('T')[0];
  }

  /**
   * Estimate approval date for a payment
   * @param {string} submittedDate - Payment submission date
   * @returns {string} Estimated approval date
   */
  estimateApprovalDate(submittedDate) {
    const submitted = new Date(submittedDate);
    // Typically approved within 2-3 business days
    const approval = new Date(submitted);
    approval.setDate(submitted.getDate() + 3);
    return approval.toISOString().split('T')[0];
  }

  /**
   * Estimate payment date for a payment
   * @param {string} submittedDate - Payment submission date
   * @returns {string} Estimated payment date
   */
  estimatePaymentDate(submittedDate) {
    const submitted = new Date(submittedDate);
    // Find next Friday after approval (typically 5-7 days total)
    const payment = new Date(submitted);
    payment.setDate(submitted.getDate() + 7);

    // Adjust to Friday
    const dayOfWeek = payment.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    payment.setDate(payment.getDate() + daysUntilFriday);

    return payment.toISOString().split('T')[0];
  }

  /**
   * Calculate days until payment
   * @param {string} submittedDate - Payment submission date
   * @returns {number} Days until payment
   */
  calculateDaysUntilPayment(submittedDate) {
    const estimatedPayment = new Date(this.estimatePaymentDate(submittedDate));
    const now = new Date();
    const timeDiff = estimatedPayment.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Get average processing days from historical data
   * @returns {number} Average processing days
   */
  getAverageProcessingDays() {
    try {
      const result = db.prepare(`
        SELECT AVG(JULIANDAY(paid_at) - JULIANDAY(created_at)) as avg_days
        FROM payments
        WHERE status = 'paid' AND paid_at IS NOT NULL
      `).get();

      return Math.round(result?.avg_days || 7);
    } catch (error) {
      return 7; // Default to 7 days
    }
  }

  /**
   * Get payment schedule information
   * @returns {Object} Payment schedule details
   */
  getPaymentScheduleInfo() {
    return {
      frequency: 'Weekly',
      paymentDay: 'Friday',
      processingTime: '2-3 business days for approval',
      cutoffDay: 'Sunday',
      description: 'Jobs completed by Sunday are included in Friday\'s payment batch'
    };
  }

  /**
   * Mask bank account number for privacy
   * @param {string} accountNumber - Full account number
   * @returns {string} Masked account number
   */
  maskBankAccount(accountNumber) {
    if (!accountNumber || accountNumber.length < 4) {
      return '****';
    }

    const last4 = accountNumber.slice(-4);
    const masked = '*'.repeat(Math.max(0, accountNumber.length - 4));
    return masked + last4;
  }

  /**
   * Get payment details for specific payment ID
   * @param {string} paymentId - Payment ID
   * @returns {Object} Detailed payment information
   */
  async getPaymentDetails(paymentId) {
    try {
      const payment = db.prepare(`
        SELECT
          p.*,
          d.job_id,
          d.hours_worked,
          d.rating,
          d.feedback,
          j.title as job_title,
          j.job_date,
          j.location,
          j.start_time,
          j.end_time,
          c.name as candidate_name
        FROM payments p
        LEFT JOIN deployments d ON p.deployment_id = d.id
        LEFT JOIN jobs j ON d.job_id = j.id
        LEFT JOIN candidates c ON p.candidate_id = c.id
        WHERE p.id = ?
      `).get(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        id: payment.id,
        candidateId: payment.candidate_id,
        candidateName: payment.candidate_name,
        jobDetails: {
          title: payment.job_title,
          date: payment.job_date,
          location: payment.location,
          startTime: payment.start_time,
          endTime: payment.end_time,
          hoursWorked: payment.hours_worked
        },
        amounts: {
          baseAmount: payment.base_amount,
          incentiveAmount: payment.incentive_amount || 0,
          totalAmount: payment.total_amount
        },
        status: payment.status,
        timeline: {
          submitted: payment.created_at,
          approved: payment.status === 'approved' || payment.status === 'paid' ?
            this.estimateApprovalDate(payment.created_at) : null,
          paid: payment.paid_at,
          transactionId: payment.transaction_id
        },
        performance: {
          rating: payment.rating,
          feedback: payment.feedback
        }
      };

    } catch (error) {
      throw new Error(`Failed to fetch payment details: ${error.message}`);
    }
  }
}

module.exports = PaymentDataService;