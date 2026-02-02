/**
 * Data Access Layer for Template Response System
 *
 * Provides real-time access to candidate data for fact-based responses
 * Replaces unreliable seed data with actual database information
 */

class DataAccess {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get complete candidate profile
   */
  async getCandidateProfile(candidateId) {
    try {
      const candidate = this.db.prepare(`
        SELECT
          id, name, email, phone, date_of_birth, nric_last4,
          status, source, xp, lifetime_xp, current_points,
          current_tier, level, weekly_streak, max_streak,
          profile_completion, skills, availability,
          location, emergency_contact_name, emergency_contact_phone,
          bank_account_number, bank_name, telegram_chat_id,
          preferred_contact, online_status, push_token,
          created_at, updated_at
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      return candidate;
    } catch (error) {
      console.error('❌ [Data Access] Error getting candidate profile:', error);
      return null;
    }
  }

  /**
   * Get real-time payment and earnings data
   */
  async getPaymentData(candidateId) {
    try {
      // Get payment summary
      const paymentSummary = this.db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_earnings,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
          SUM(CASE WHEN status = 'available' THEN amount ELSE 0 END) as available_for_withdrawal,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments_count,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as completed_payments_count
        FROM payments
        WHERE candidate_id = ?
      `).get(candidateId);

      // Get recent payments
      const recentPayments = this.db.prepare(`
        SELECT amount, status, job_title, payment_date, created_at
        FROM payments
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(candidateId);

      // Get withdrawal history
      const withdrawalHistory = this.db.prepare(`
        SELECT amount, status, requested_at, processed_at, method
        FROM withdrawal_requests
        WHERE candidate_id = ?
        ORDER BY requested_at DESC
        LIMIT 5
      `).all(candidateId);

      return {
        pending_earnings: paymentSummary?.pending_earnings || 0,
        total_paid: paymentSummary?.total_paid || 0,
        available_for_withdrawal: paymentSummary?.available_for_withdrawal || 0,
        pending_payments_count: paymentSummary?.pending_payments_count || 0,
        completed_payments_count: paymentSummary?.completed_payments_count || 0,
        recent_payments: recentPayments || [],
        withdrawal_history: withdrawalHistory || []
      };
    } catch (error) {
      console.error('❌ [Data Access] Error getting payment data:', error);
      return {
        pending_earnings: 0,
        total_paid: 0,
        available_for_withdrawal: 0,
        pending_payments_count: 0,
        completed_payments_count: 0,
        recent_payments: [],
        withdrawal_history: []
      };
    }
  }

  /**
   * Get job-related data
   */
  async getJobData(candidateId) {
    try {
      // Get upcoming jobs
      const upcomingJobs = this.db.prepare(`
        SELECT j.id, j.title, j.location, j.job_date, j.pay_rate,
               ja.status as application_status, ja.applied_at
        FROM jobs j
        JOIN job_applications ja ON j.id = ja.job_id
        WHERE ja.candidate_id = ? AND j.job_date >= date('now')
        ORDER BY j.job_date ASC
        LIMIT 10
      `).all(candidateId);

      // Get completed jobs
      const completedJobs = this.db.prepare(`
        SELECT j.id, j.title, j.location, j.job_date, j.pay_rate,
               ja.status as application_status, ja.completed_at
        FROM jobs j
        JOIN job_applications ja ON j.id = ja.job_id
        WHERE ja.candidate_id = ? AND ja.status = 'completed'
        ORDER BY j.job_date DESC
        LIMIT 5
      `).all(candidateId);

      // Get pending applications
      const pendingApplications = this.db.prepare(`
        SELECT j.id, j.title, j.location, j.job_date, j.pay_rate,
               ja.status as application_status, ja.applied_at
        FROM jobs j
        JOIN job_applications ja ON j.id = ja.job_id
        WHERE ja.candidate_id = ? AND ja.status IN ('applied', 'reviewed')
        ORDER BY ja.applied_at DESC
        LIMIT 5
      `).all(candidateId);

      // Get job statistics
      const jobStats = this.db.prepare(`
        SELECT
          COUNT(CASE WHEN ja.status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN ja.status IN ('applied', 'reviewed') THEN 1 END) as pending_count,
          AVG(CASE WHEN ja.status = 'completed' THEN j.pay_rate END) as avg_pay_rate,
          COUNT(*) as total_applications
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.candidate_id = ?
      `).get(candidateId);

      return {
        upcoming_jobs: upcomingJobs || [],
        completed_jobs: completedJobs || [],
        pending_applications: pendingApplications || [],
        stats: jobStats || {
          completed_count: 0,
          pending_count: 0,
          avg_pay_rate: 0,
          total_applications: 0
        }
      };
    } catch (error) {
      console.error('❌ [Data Access] Error getting job data:', error);
      return {
        upcoming_jobs: [],
        completed_jobs: [],
        pending_applications: [],
        stats: {
          completed_count: 0,
          pending_count: 0,
          avg_pay_rate: 0,
          total_applications: 0
        }
      };
    }
  }

  /**
   * Get account verification data
   */
  async getVerificationData(candidateId) {
    try {
      const candidate = this.db.prepare(`
        SELECT status, created_at, profile_completion,
               nric_last4, bank_account_number
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      // Get verification documents
      const documents = this.db.prepare(`
        SELECT document_type, status, uploaded_at, verified_at, notes
        FROM verification_documents
        WHERE candidate_id = ?
        ORDER BY uploaded_at DESC
      `).all(candidateId);

      // Get interview history
      const interviews = this.db.prepare(`
        SELECT scheduled_at, status, interviewer, notes
        FROM verification_interviews
        WHERE candidate_id = ?
        ORDER BY scheduled_at DESC
        LIMIT 3
      `).all(candidateId);

      return {
        account_status: candidate?.status || 'unknown',
        profile_completion: candidate?.profile_completion || 0,
        created_at: candidate?.created_at,
        has_nric: !!candidate?.nric_last4,
        has_bank_details: !!candidate?.bank_account_number,
        documents: documents || [],
        interviews: interviews || []
      };
    } catch (error) {
      console.error('❌ [Data Access] Error getting verification data:', error);
      return {
        account_status: 'unknown',
        profile_completion: 0,
        documents: [],
        interviews: []
      };
    }
  }

  /**
   * Get real-time data based on intent
   */
  async getRealTimeData(candidateId, intent) {
    const dataNeeds = this.determineDataNeeds(intent);
    const realData = {};

    try {
      if (dataNeeds.includes('payment')) {
        realData.payment = await this.getPaymentData(candidateId);
      }

      if (dataNeeds.includes('jobs')) {
        realData.jobs = await this.getJobData(candidateId);
      }

      if (dataNeeds.includes('verification')) {
        realData.verification = await this.getVerificationData(candidateId);
      }

      if (dataNeeds.includes('profile')) {
        realData.profile = await this.getCandidateProfile(candidateId);
      }

      // Get recent activity for context
      realData.recent_activity = await this.getRecentActivity(candidateId);

      return realData;
    } catch (error) {
      console.error('❌ [Data Access] Error getting real-time data:', error);
      return {};
    }
  }

  /**
   * Determine what data is needed based on intent
   */
  determineDataNeeds(intent) {
    const dataMapping = {
      payment_inquiry: ['payment', 'jobs'],
      payment_timing: ['payment'],
      withdrawal_request: ['payment'],
      job_inquiry: ['jobs'],
      job_status: ['jobs'],
      verification_status: ['verification', 'profile'],
      account_status: ['verification', 'profile'],
      profile_help: ['profile'],
      general_support: ['profile']
    };

    return dataMapping[intent.category] || ['profile'];
  }

  /**
   * Get recent candidate activity
   */
  async getRecentActivity(candidateId) {
    try {
      return this.db.prepare(`
        SELECT activity_type, description, created_at
        FROM candidate_activity_log
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(candidateId);
    } catch (error) {
      console.error('❌ [Data Access] Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get available jobs for job recommendations
   */
  async getAvailableJobs(candidateId, limit = 5) {
    try {
      const candidate = this.db.prepare(`
        SELECT location, skills FROM candidates WHERE id = ?
      `).get(candidateId);

      return this.db.prepare(`
        SELECT id, title, location, pay_rate, job_date, description,
               total_slots, filled_slots,
               (total_slots - filled_slots) as available_slots
        FROM jobs
        WHERE status = 'open'
        AND job_date >= date('now')
        AND (total_slots - filled_slots) > 0
        ${candidate?.location ? "AND (location = ? OR location LIKE '%Remote%')" : ''}
        ORDER BY job_date ASC
        LIMIT ?
      `).all(candidate?.location ? [candidate.location, limit] : [limit]);
    } catch (error) {
      console.error('❌ [Data Access] Error getting available jobs:', error);
      return [];
    }
  }

  /**
   * Log data access for analytics
   */
  async logDataAccess(candidateId, dataType, source) {
    try {
      this.db.prepare(`
        INSERT INTO data_access_logs (candidate_id, data_type, access_source, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(candidateId, dataType, source);
    } catch (error) {
      // Fail silently for logging
      console.error('❌ [Data Access] Failed to log access:', error);
    }
  }
}

module.exports = DataAccess;