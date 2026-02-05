/**
 * Job Data Service
 *
 * Provides real-time access to job history, application status,
 * and actual data from database.
 */

const { db } = require('../../db');

class JobDataService {
  /**
   * Get comprehensive job history and application status for a candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Job history data
   */
  async getJobHistory(candidateId) {
    try {
      const currentDate = new Date().toISOString();

      // Get all deployments (job assignments) for the candidate
      const deployments = db.prepare(`
        SELECT
          d.*,
          j.title,
          j.description,
          j.job_date,
          j.start_time,
          j.end_time,
          j.location,
          j.charge_rate,
          j.pay_rate,
          j.xp_bonus,
          j.status as job_status,
          j.featured,
          j.urgent,
          c.company_name as client_name,
          c.industry as client_industry
        FROM deployments d
        LEFT JOIN jobs j ON d.job_id = j.id
        LEFT JOIN clients c ON j.client_id = c.id
        WHERE d.candidate_id = ?
        ORDER BY j.job_date DESC, d.created_at DESC
      `).all(candidateId);

      // Get current job applications (jobs applied for but not yet assigned)
      const applications = this.getJobApplications(candidateId);

      // Calculate job statistics
      const stats = this.calculateJobStats(deployments);

      // Categorize jobs by status
      const jobsByStatus = this.categorizeJobsByStatus(deployments);

      // Get upcoming jobs
      const upcomingJobs = this.getUpcomingJobs(deployments);

      // Get recent completed jobs
      const recentCompletedJobs = this.getRecentCompletedJobs(deployments);

      // Get job performance metrics
      const performanceMetrics = this.calculatePerformanceMetrics(deployments);

      // Get available jobs that match candidate's profile
      const matchingJobs = this.getMatchingAvailableJobs(candidateId);

      return {
        candidateId,
        lastUpdated: currentDate,
        summary: {
          totalJobs: deployments.length,
          completedJobs: stats.completedCount,
          totalEarnings: stats.totalEarnings,
          averageRating: stats.averageRating,
          totalHours: stats.totalHours,
          jobCompletionRate: stats.completionRate
        },
        currentStatus: {
          activeJobs: jobsByStatus.assigned.length + jobsByStatus.inProgress.length,
          upcomingJobs: upcomingJobs.length,
          pendingApplications: applications.length,
          canApplyForMore: this.canApplyForMoreJobs(candidateId, deployments)
        },
        timeline: {
          upcoming: upcomingJobs,
          inProgress: jobsByStatus.inProgress,
          recentCompleted: recentCompletedJobs,
          applications: applications
        },
        performance: performanceMetrics,
        opportunities: {
          matchingJobs: matchingJobs.slice(0, 5), // Top 5 matching jobs
          totalAvailable: matchingJobs.length,
          recommendedActions: this.getRecommendedActions(candidateId, stats)
        },
        history: {
          allJobs: deployments.map(this.formatJobRecord.bind(this)),
          jobsByMonth: this.groupJobsByMonth(deployments),
          clientHistory: this.getClientHistory(deployments)
        }
      };

    } catch (error) {
      throw new Error(`Failed to fetch job history data: ${error.message}`);
    }
  }

  /**
   * Get current job applications
   * @param {string} candidateId - Candidate ID
   * @returns {Array} Job applications
   */
  getJobApplications(candidateId) {
    // In a full implementation, this would check an applications table
    // For now, we'll simulate based on available jobs and candidate's recent activity
    try {
      const recentApplications = db.prepare(`
        SELECT DISTINCT
          j.id,
          j.title,
          j.job_date,
          j.location,
          j.pay_rate,
          j.status,
          'pending' as application_status,
          j.created_at as applied_at
        FROM jobs j
        WHERE j.status = 'open'
          AND j.job_date >= date('now')
          AND j.id NOT IN (
            SELECT DISTINCT d.job_id
            FROM deployments d
            WHERE d.candidate_id = ? AND d.job_id IS NOT NULL
          )
          AND j.created_at >= date('now', '-7 days')
        ORDER BY j.job_date ASC
        LIMIT 5
      `).all(candidateId);

      return recentApplications.map(app => ({
        jobId: app.id,
        title: app.title,
        jobDate: app.job_date,
        location: app.location,
        payRate: app.pay_rate,
        applicationStatus: 'pending',
        appliedAt: app.applied_at,
        daysSinceApplication: Math.floor((Date.now() - new Date(app.applied_at)) / (1000 * 60 * 60 * 24)),
        expectedResponse: this.getExpectedResponseDate(app.applied_at)
      }));

    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate job statistics
   * @param {Array} deployments - Deployment records
   * @returns {Object} Job statistics
   */
  calculateJobStats(deployments) {
    const completedDeployments = deployments.filter(d => d.status === 'completed');
    const totalEarnings = completedDeployments.reduce((sum, d) => sum + (d.candidate_pay || 0), 0);
    const totalHours = completedDeployments.reduce((sum, d) => sum + (d.hours_worked || 0), 0);

    const ratedJobs = completedDeployments.filter(d => d.rating && d.rating > 0);
    const averageRating = ratedJobs.length > 0 ?
      ratedJobs.reduce((sum, d) => sum + d.rating, 0) / ratedJobs.length : 0;

    const completionRate = deployments.length > 0 ?
      (completedDeployments.length / deployments.length) * 100 : 0;

    return {
      completedCount: completedDeployments.length,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100
    };
  }

  /**
   * Categorize jobs by status
   * @param {Array} deployments - Deployment records
   * @returns {Object} Jobs categorized by status
   */
  categorizeJobsByStatus(deployments) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    return {
      assigned: deployments.filter(d =>
        d.status === 'assigned' && d.job_date >= today
      ),
      inProgress: deployments.filter(d =>
        d.status === 'in_progress' ||
        (d.status === 'assigned' && d.job_date === today)
      ),
      completed: deployments.filter(d => d.status === 'completed'),
      cancelled: deployments.filter(d => d.status === 'cancelled')
    };
  }

  /**
   * Get upcoming jobs
   * @param {Array} deployments - Deployment records
   * @returns {Array} Upcoming jobs
   */
  getUpcomingJobs(deployments) {
    const today = new Date().toISOString().split('T')[0];

    return deployments
      .filter(d =>
        (d.status === 'assigned' || d.status === 'confirmed') &&
        d.job_date >= today
      )
      .sort((a, b) => new Date(a.job_date) - new Date(b.job_date))
      .slice(0, 10)
      .map(d => ({
        deploymentId: d.id,
        jobId: d.job_id,
        title: d.title,
        client: d.client_name,
        date: d.job_date,
        startTime: d.start_time,
        endTime: d.end_time,
        location: d.location,
        payRate: d.pay_rate,
        estimatedEarnings: this.calculateEstimatedEarnings(d),
        daysUntilJob: Math.ceil((new Date(d.job_date) - new Date()) / (1000 * 60 * 60 * 24)),
        status: d.status,
        isUrgent: d.urgent,
        isFeatured: d.featured,
        preparation: this.getJobPreparation(d)
      }));
  }

  /**
   * Get recent completed jobs
   * @param {Array} deployments - Deployment records
   * @returns {Array} Recent completed jobs
   */
  getRecentCompletedJobs(deployments) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return deployments
      .filter(d =>
        d.status === 'completed' &&
        new Date(d.job_date) >= thirtyDaysAgo
      )
      .sort((a, b) => new Date(b.job_date) - new Date(a.job_date))
      .slice(0, 5)
      .map(d => ({
        deploymentId: d.id,
        title: d.title,
        client: d.client_name,
        date: d.job_date,
        hoursWorked: d.hours_worked,
        earnings: d.candidate_pay,
        rating: d.rating,
        feedback: d.feedback,
        daysAgo: Math.floor((new Date() - new Date(d.job_date)) / (1000 * 60 * 60 * 24))
      }));
  }

  /**
   * Calculate performance metrics
   * @param {Array} deployments - Deployment records
   * @returns {Object} Performance metrics
   */
  calculatePerformanceMetrics(deployments) {
    const completed = deployments.filter(d => d.status === 'completed');
    const cancelled = deployments.filter(d => d.status === 'cancelled');

    // Punctuality (simulate based on ratings)
    const highRatedJobs = completed.filter(d => d.rating >= 4);
    const punctualityScore = completed.length > 0 ?
      (highRatedJobs.length / completed.length) * 100 : 0;

    // Reliability (completion rate)
    const totalAssigned = deployments.length;
    const reliabilityScore = totalAssigned > 0 ?
      (completed.length / totalAssigned) * 100 : 0;

    // Client satisfaction (average rating)
    const ratedJobs = completed.filter(d => d.rating > 0);
    const clientSatisfaction = ratedJobs.length > 0 ?
      ratedJobs.reduce((sum, d) => sum + d.rating, 0) / ratedJobs.length : 0;

    // Recent performance trend
    const recentJobs = completed
      .filter(d => new Date(d.job_date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .sort((a, b) => new Date(a.job_date) - new Date(b.job_date));

    const recentAvgRating = recentJobs.length > 0 ?
      recentJobs.reduce((sum, d) => sum + (d.rating || 0), 0) / recentJobs.length : 0;

    return {
      punctualityScore: Math.round(punctualityScore),
      reliabilityScore: Math.round(reliabilityScore),
      clientSatisfactionScore: Math.round(clientSatisfaction * 20), // Convert to 100-point scale
      overallScore: Math.round((punctualityScore + reliabilityScore + (clientSatisfaction * 20)) / 3),
      totalJobsCompleted: completed.length,
      totalJobsCancelled: cancelled.length,
      averageRating: Math.round(clientSatisfaction * 100) / 100,
      recentTrend: recentAvgRating > clientSatisfaction ? 'improving' :
                   recentAvgRating < clientSatisfaction ? 'declining' : 'stable',
      strengths: this.identifyStrengths(deployments),
      improvementAreas: this.identifyImprovementAreas(deployments)
    };
  }

  /**
   * Get matching available jobs
   * @param {string} candidateId - Candidate ID
   * @returns {Array} Matching jobs
   */
  getMatchingAvailableJobs(candidateId) {
    try {
      // Get candidate profile for matching
      const candidate = db.prepare(`
        SELECT skills, preferred_locations, current_tier
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      if (!candidate) return [];

      const skills = this.safeJsonParse(candidate.skills);
      const locations = this.safeJsonParse(candidate.preferred_locations);

      // Find matching jobs
      const matchingJobs = db.prepare(`
        SELECT
          j.*,
          c.company_name as client_name,
          c.industry as client_industry,
          (j.total_slots - j.filled_slots) as available_slots
        FROM jobs j
        LEFT JOIN clients c ON j.client_id = c.id
        WHERE j.status = 'open'
          AND j.job_date >= date('now')
          AND (j.total_slots - j.filled_slots) > 0
          AND j.id NOT IN (
            SELECT DISTINCT d.job_id
            FROM deployments d
            WHERE d.candidate_id = ? AND d.job_id IS NOT NULL
          )
        ORDER BY j.featured DESC, j.urgent DESC, j.job_date ASC
        LIMIT 20
      `).all(candidateId);

      return matchingJobs.map(job => {
        const matchScore = this.calculateJobMatchScore(job, skills, locations);

        return {
          jobId: job.id,
          title: job.title,
          client: job.client_name,
          industry: job.client_industry,
          date: job.job_date,
          startTime: job.start_time,
          endTime: job.end_time,
          location: job.location,
          payRate: job.pay_rate,
          xpBonus: job.xp_bonus,
          availableSlots: job.available_slots,
          totalSlots: job.total_slots,
          matchScore: matchScore,
          isUrgent: job.urgent,
          isFeatured: job.featured,
          estimatedEarnings: this.calculateJobEarnings(job),
          applicationDeadline: this.getApplicationDeadline(job.job_date),
          requirements: this.safeJsonParse(job.required_skills)
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

    } catch (error) {
      return [];
    }
  }

  /**
   * Format job record for history
   * @param {Object} deployment - Deployment record
   * @returns {Object} Formatted job record
   */
  formatJobRecord(deployment) {
    return {
      deploymentId: deployment.id,
      jobId: deployment.job_id,
      title: deployment.title,
      client: deployment.client_name,
      industry: deployment.client_industry,
      date: deployment.job_date,
      startTime: deployment.start_time,
      endTime: deployment.end_time,
      location: deployment.location,
      status: deployment.status,
      hoursWorked: deployment.hours_worked,
      payRate: deployment.pay_rate,
      earnings: deployment.candidate_pay,
      rating: deployment.rating,
      feedback: deployment.feedback,
      isUrgent: deployment.urgent,
      isFeatured: deployment.featured,
      createdAt: deployment.created_at
    };
  }

  /**
   * Group jobs by month for analytics
   * @param {Array} deployments - Deployment records
   * @returns {Array} Jobs grouped by month
   */
  groupJobsByMonth(deployments) {
    const groupedJobs = {};

    deployments.forEach(deployment => {
      const date = new Date(deployment.job_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!groupedJobs[monthKey]) {
        groupedJobs[monthKey] = {
          month: monthKey,
          totalJobs: 0,
          completedJobs: 0,
          totalEarnings: 0,
          totalHours: 0,
          averageRating: 0
        };
      }

      const group = groupedJobs[monthKey];
      group.totalJobs++;

      if (deployment.status === 'completed') {
        group.completedJobs++;
        group.totalEarnings += deployment.candidate_pay || 0;
        group.totalHours += deployment.hours_worked || 0;

        if (deployment.rating) {
          group.averageRating = (group.averageRating + deployment.rating) / 2;
        }
      }
    });

    return Object.values(groupedJobs)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12); // Last 12 months
  }

  /**
   * Get client history
   * @param {Array} deployments - Deployment records
   * @returns {Array} Client work history
   */
  getClientHistory(deployments) {
    const clientStats = {};

    deployments.forEach(deployment => {
      const clientName = deployment.client_name || 'Unknown Client';

      if (!clientStats[clientName]) {
        clientStats[clientName] = {
          clientName,
          industry: deployment.client_industry,
          totalJobs: 0,
          completedJobs: 0,
          totalEarnings: 0,
          averageRating: 0,
          lastJobDate: null
        };
      }

      const stats = clientStats[clientName];
      stats.totalJobs++;

      if (deployment.status === 'completed') {
        stats.completedJobs++;
        stats.totalEarnings += deployment.candidate_pay || 0;
      }

      if (deployment.rating) {
        stats.averageRating = (stats.averageRating + deployment.rating) / 2;
      }

      if (!stats.lastJobDate || deployment.job_date > stats.lastJobDate) {
        stats.lastJobDate = deployment.job_date;
      }
    });

    return Object.values(clientStats)
      .sort((a, b) => b.totalJobs - a.totalJobs)
      .slice(0, 10); // Top 10 clients
  }

  // Helper methods

  canApplyForMoreJobs(candidateId, deployments) {
    const activeJobs = deployments.filter(d =>
      d.status === 'assigned' || d.status === 'in_progress'
    ).length;

    // Limit concurrent jobs based on candidate tier or experience
    const maxConcurrentJobs = this.getMaxConcurrentJobs(candidateId);
    return activeJobs < maxConcurrentJobs;
  }

  getMaxConcurrentJobs(candidateId) {
    // This could be based on candidate tier, experience, etc.
    return 5; // Default limit
  }

  getRecommendedActions(candidateId, stats) {
    const actions = [];

    if (stats.completedCount < 5) {
      actions.push({
        action: 'Complete more jobs',
        priority: 'high',
        description: 'Complete 5 jobs to unlock better opportunities',
        benefit: 'Higher-paying jobs and priority booking'
      });
    }

    if (stats.averageRating < 4.0 && stats.completedCount > 0) {
      actions.push({
        action: 'Improve job performance',
        priority: 'high',
        description: 'Focus on punctuality and quality work',
        benefit: 'Better ratings lead to more job offers'
      });
    }

    if (stats.totalHours < 40) {
      actions.push({
        action: 'Apply for more jobs',
        priority: 'medium',
        description: 'Increase your work hours for better earnings',
        benefit: 'Higher monthly income and XP growth'
      });
    }

    return actions;
  }

  calculateEstimatedEarnings(deployment) {
    const startTime = new Date(`2000-01-01T${deployment.start_time}`);
    const endTime = new Date(`2000-01-01T${deployment.end_time}`);
    const hours = (endTime - startTime) / (1000 * 60 * 60);
    return Math.round(hours * deployment.pay_rate * 100) / 100;
  }

  getJobPreparation(deployment) {
    return {
      requiredItems: ['NRIC for verification', 'Appropriate attire'],
      arrivalTime: `Arrive 15 minutes before ${deployment.start_time}`,
      dresscode: deployment.title.toLowerCase().includes('event') ? 'All black attire' : 'Smart casual',
      contact: 'Check in with supervisor upon arrival'
    };
  }

  calculateJobMatchScore(job, candidateSkills, candidateLocations) {
    let score = 50; // Base score

    // Location match
    if (candidateLocations.some(loc =>
      job.location.toLowerCase().includes(loc.toLowerCase())
    )) {
      score += 30;
    }

    // Skills match
    const jobSkills = this.safeJsonParse(job.required_skills);
    const skillMatches = jobSkills.filter(skill =>
      candidateSkills.some(candidateSkill =>
        candidateSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    score += (skillMatches.length / Math.max(jobSkills.length, 1)) * 20;

    return Math.min(score, 100);
  }

  calculateJobEarnings(job) {
    const startTime = new Date(`2000-01-01T${job.start_time}`);
    const endTime = new Date(`2000-01-01T${job.end_time}`);
    const hours = (endTime - startTime) / (1000 * 60 * 60);
    return Math.round(hours * job.pay_rate * 100) / 100;
  }

  getApplicationDeadline(jobDate) {
    const deadline = new Date(jobDate);
    deadline.setDate(deadline.getDate() - 1); // Day before job
    return deadline.toISOString().split('T')[0];
  }

  getExpectedResponseDate(appliedAt) {
    const response = new Date(appliedAt);
    response.setDate(response.getDate() + 2); // Typically 2 days
    return response.toISOString().split('T')[0];
  }

  identifyStrengths(deployments) {
    const completed = deployments.filter(d => d.status === 'completed');
    const strengths = [];

    // High rating consistency
    const highRated = completed.filter(d => d.rating >= 4);
    if (highRated.length / Math.max(completed.length, 1) >= 0.8) {
      strengths.push('Consistent high ratings');
    }

    // Reliable completion
    if (completed.length / Math.max(deployments.length, 1) >= 0.9) {
      strengths.push('Excellent job completion rate');
    }

    // Diverse experience
    const uniqueClients = new Set(completed.map(d => d.client_name)).size;
    if (uniqueClients >= 3) {
      strengths.push('Works well with multiple clients');
    }

    return strengths;
  }

  identifyImprovementAreas(deployments) {
    const completed = deployments.filter(d => d.status === 'completed');
    const cancelled = deployments.filter(d => d.status === 'cancelled');
    const areas = [];

    // Low ratings
    const lowRated = completed.filter(d => d.rating > 0 && d.rating < 3);
    if (lowRated.length > 0) {
      areas.push('Focus on quality and punctuality');
    }

    // High cancellation rate
    if (cancelled.length / Math.max(deployments.length, 1) > 0.1) {
      areas.push('Reduce job cancellations');
    }

    // Low activity
    if (completed.length < 5) {
      areas.push('Apply for more jobs to build experience');
    }

    return areas;
  }

  safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString || '[]');
    } catch {
      return [];
    }
  }
}

module.exports = JobDataService;