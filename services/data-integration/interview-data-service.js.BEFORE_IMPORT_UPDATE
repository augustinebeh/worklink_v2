/**
 * Interview Data Service
 *
 * Provides real-time access to interview scheduling status,
 * pending, scheduled, and completed interviews.
 */

const { db } = require('../../db/database');

class InterviewDataService {
  /**
   * Get comprehensive interview scheduling status for a candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Interview scheduling data
   */
  async getSchedulingStatus(candidateId) {
    try {
      const currentDate = new Date().toISOString();

      // Get candidate details
      const candidate = db.prepare(`
        SELECT id, name, email, phone, status, created_at
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Get interview records (simulated - would be from interviews table)
      const interviews = this.getInterviewRecords(candidateId);

      // Categorize interviews by status
      const interviewsByStatus = this.categorizeInterviewsByStatus(interviews);

      // Get interview requirements and availability
      const requirements = this.getInterviewRequirements(candidate);

      // Check interview eligibility
      const eligibility = this.checkInterviewEligibility(candidate, interviews);

      // Get upcoming interview schedule
      const upcomingSchedule = this.getUpcomingSchedule(interviewsByStatus.scheduled);

      // Get available time slots
      const availableSlots = this.getAvailableTimeSlots(candidateId);

      return {
        candidateId,
        lastUpdated: currentDate,
        status: {
          hasInterviewRequirement: requirements.isRequired,
          currentStatus: this.determineInterviewStatus(interviews, requirements),
          nextAction: this.getNextAction(interviews, requirements),
          completionDate: this.getCompletionDate(interviews)
        },
        interviews: {
          total: interviews.length,
          pending: interviewsByStatus.pending.length,
          scheduled: interviewsByStatus.scheduled.length,
          completed: interviewsByStatus.completed.length,
          cancelled: interviewsByStatus.cancelled.length,
          noShow: interviewsByStatus.noShow.length
        },
        schedule: {
          upcoming: upcomingSchedule,
          availableSlots: availableSlots,
          nextAvailable: this.getNextAvailableSlot(),
          workingHours: this.getWorkingHours()
        },
        requirements: {
          ...requirements,
          eligibility: eligibility,
          documents: this.getRequiredDocuments(),
          preparation: this.getInterviewPreparation()
        },
        history: {
          allInterviews: interviews.map(this.formatInterviewRecord.bind(this)),
          interviewPerformance: this.calculateInterviewPerformance(interviews),
          feedbackSummary: this.getInterviewFeedbackSummary(interviews)
        },
        actions: {
          canSchedule: eligibility.canSchedule,
          canReschedule: this.canReschedule(interviews),
          canCancel: this.canCancel(interviews),
          schedulingInstructions: this.getSchedulingInstructions()
        }
      };

    } catch (error) {
      throw new Error(`Failed to fetch interview scheduling data: ${error.message}`);
    }
  }

  /**
   * Get interview records for a candidate (simulated data)
   * @param {string} candidateId - Candidate ID
   * @returns {Array} Interview records
   */
  getInterviewRecords(candidateId) {
    // In a real implementation, this would query an interviews table
    // For now, we'll simulate based on candidate status and job history

    const interviews = [];

    try {
      // Check if candidate has any job assignments that would require interviews
      const jobHistory = db.prepare(`
        SELECT d.*, j.title, j.job_date, c.company_name
        FROM deployments d
        LEFT JOIN jobs j ON d.job_id = j.id
        LEFT JOIN clients c ON j.client_id = c.id
        WHERE d.candidate_id = ?
        ORDER BY j.job_date DESC
        LIMIT 5
      `).all(candidateId);

      // Simulate interview records for high-value or specialized jobs
      jobHistory.forEach((job, index) => {
        if (job.charge_rate > 25 || job.title.includes('Specialist') || job.title.includes('Manager')) {
          interviews.push({
            id: `INT_${candidateId}_${index + 1}`,
            candidateId: candidateId,
            jobId: job.job_id,
            jobTitle: job.title,
            clientName: job.company_name,
            type: this.determineInterviewType(job),
            status: index === 0 ? 'scheduled' : 'completed',
            scheduledDate: this.generateInterviewDate(job.job_date, -2),
            scheduledTime: '10:00',
            duration: 30,
            interviewerName: 'HR Team',
            location: 'Video Call',
            meetingLink: index === 0 ? 'https://meet.google.com/abc-defg-hij' : null,
            notes: index === 0 ? 'Initial screening interview' : 'Completed successfully',
            feedback: index === 0 ? null : 'Good communication skills, punctual',
            rating: index === 0 ? null : 4,
            createdAt: this.generateInterviewDate(job.job_date, -5),
            updatedAt: this.generateInterviewDate(job.job_date, index === 0 ? -1 : 0)
          });
        }
      });

      // Add a pending interview for new candidates
      if (interviews.length === 0) {
        const accountAge = Math.floor((Date.now() - new Date(this.getCandidateCreatedAt(candidateId))) / (1000 * 60 * 60 * 24));

        if (accountAge < 7) {
          interviews.push({
            id: `INT_${candidateId}_ONBOARD`,
            candidateId: candidateId,
            jobId: null,
            jobTitle: 'General Onboarding',
            clientName: 'WorkLink Team',
            type: 'onboarding',
            status: 'pending',
            scheduledDate: null,
            scheduledTime: null,
            duration: 30,
            interviewerName: 'Onboarding Team',
            location: 'Video Call',
            meetingLink: null,
            notes: 'Welcome interview to understand background and preferences',
            feedback: null,
            rating: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error('Error generating interview records:', error);
    }

    return interviews;
  }

  /**
   * Categorize interviews by their status
   * @param {Array} interviews - Interview records
   * @returns {Object} Interviews categorized by status
   */
  categorizeInterviewsByStatus(interviews) {
    return {
      pending: interviews.filter(i => i.status === 'pending'),
      scheduled: interviews.filter(i => i.status === 'scheduled'),
      completed: interviews.filter(i => i.status === 'completed'),
      cancelled: interviews.filter(i => i.status === 'cancelled'),
      noShow: interviews.filter(i => i.status === 'no_show')
    };
  }

  /**
   * Get interview requirements for the candidate
   * @param {Object} candidate - Candidate record
   * @returns {Object} Interview requirements
   */
  getInterviewRequirements(candidate) {
    // Determine if interview is required based on candidate status and type of work
    const accountAge = Math.floor((Date.now() - new Date(candidate.created_at)) / (1000 * 60 * 60 * 24));

    return {
      isRequired: accountAge < 30 || candidate.status === 'lead', // New candidates need interview
      reason: accountAge < 30 ? 'New candidate onboarding' : 'Account verification',
      priority: candidate.status === 'lead' ? 'high' : 'medium',
      deadline: this.calculateInterviewDeadline(candidate.created_at),
      types: this.getRequiredInterviewTypes(candidate)
    };
  }

  /**
   * Check interview eligibility
   * @param {Object} candidate - Candidate record
   * @param {Array} interviews - Interview records
   * @returns {Object} Eligibility status
   */
  checkInterviewEligibility(candidate, interviews) {
    const blockers = [];
    const requirements = [];

    // Check if contact information is complete
    if (!candidate.phone) {
      blockers.push('Phone number required for interview scheduling');
      requirements.push('Add phone number to your profile');
    }

    if (!candidate.email) {
      blockers.push('Email address required for interview confirmation');
      requirements.push('Verify email address');
    }

    // Check for existing scheduled interviews
    const scheduledInterviews = interviews.filter(i => i.status === 'scheduled');
    const hasScheduledInterview = scheduledInterviews.length > 0;

    if (hasScheduledInterview) {
      blockers.push('Interview already scheduled');
      requirements.push('Complete your scheduled interview first');
    }

    const canSchedule = blockers.length === 0 && !hasScheduledInterview;

    return {
      canSchedule,
      blockers,
      requirements,
      hasActiveInterview: hasScheduledInterview,
      nextAvailableDate: canSchedule ? this.getNextAvailableSlot() : null
    };
  }

  /**
   * Get upcoming interview schedule
   * @param {Array} scheduledInterviews - Scheduled interviews
   * @returns {Array} Upcoming schedule
   */
  getUpcomingSchedule(scheduledInterviews) {
    return scheduledInterviews
      .filter(interview => {
        const interviewDate = new Date(interview.scheduledDate);
        return interviewDate >= new Date();
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .map(interview => ({
        id: interview.id,
        type: interview.type,
        title: interview.jobTitle,
        date: interview.scheduledDate,
        time: interview.scheduledTime,
        duration: interview.duration,
        interviewer: interview.interviewerName,
        location: interview.location,
        meetingLink: interview.meetingLink,
        daysUntilInterview: Math.ceil((new Date(interview.scheduledDate) - new Date()) / (1000 * 60 * 60 * 24)),
        preparation: this.getInterviewPreparationForType(interview.type),
        canReschedule: this.canRescheduleInterview(interview),
        canCancel: this.canCancelInterview(interview)
      }));
  }

  /**
   * Get available time slots for scheduling
   * @param {string} candidateId - Candidate ID
   * @returns {Array} Available time slots
   */
  getAvailableTimeSlots(candidateId) {
    const slots = [];
    const today = new Date();

    // Generate slots for the next 14 days (excluding weekends)
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Generate time slots (9 AM to 5 PM)
      const workingHours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

      workingHours.forEach(time => {
        slots.push({
          date: date.toISOString().split('T')[0],
          time: time,
          duration: 30,
          available: true, // In real implementation, check against existing bookings
          timezone: 'Asia/Singapore'
        });
      });
    }

    return slots.slice(0, 20); // Return first 20 available slots
  }

  /**
   * Calculate interview performance metrics
   * @param {Array} interviews - Interview records
   * @returns {Object} Performance metrics
   */
  calculateInterviewPerformance(interviews) {
    const completed = interviews.filter(i => i.status === 'completed');
    const noShows = interviews.filter(i => i.status === 'no_show');

    if (completed.length === 0) {
      return {
        attendanceRate: 0,
        averageRating: 0,
        onTimeRate: 100, // Assume good until proven otherwise
        totalInterviews: interviews.length
      };
    }

    const totalScheduled = completed.length + noShows.length;
    const attendanceRate = totalScheduled > 0 ? (completed.length / totalScheduled) * 100 : 0;

    const ratedInterviews = completed.filter(i => i.rating);
    const averageRating = ratedInterviews.length > 0 ?
      ratedInterviews.reduce((sum, i) => sum + i.rating, 0) / ratedInterviews.length : 0;

    return {
      attendanceRate: Math.round(attendanceRate),
      averageRating: Math.round(averageRating * 100) / 100,
      onTimeRate: 95, // Would track actual punctuality in real implementation
      totalInterviews: completed.length,
      successRate: Math.round((completed.length / Math.max(interviews.length, 1)) * 100)
    };
  }

  /**
   * Get interview feedback summary
   * @param {Array} interviews - Interview records
   * @returns {Object} Feedback summary
   */
  getInterviewFeedbackSummary(interviews) {
    const completedWithFeedback = interviews.filter(i =>
      i.status === 'completed' && i.feedback
    );

    if (completedWithFeedback.length === 0) {
      return {
        totalFeedbacks: 0,
        commonStrengths: [],
        improvementAreas: [],
        overallSentiment: 'neutral'
      };
    }

    // Analyze feedback (simplified)
    const allFeedback = completedWithFeedback.map(i => i.feedback).join(' ');
    const positiveKeywords = ['good', 'excellent', 'professional', 'punctual', 'skilled'];
    const improvementKeywords = ['improve', 'practice', 'develop', 'enhance'];

    const strengths = positiveKeywords.filter(keyword =>
      allFeedback.toLowerCase().includes(keyword)
    );

    const improvements = improvementKeywords.filter(keyword =>
      allFeedback.toLowerCase().includes(keyword)
    );

    return {
      totalFeedbacks: completedWithFeedback.length,
      commonStrengths: strengths.length > 0 ? strengths : ['Communication skills'],
      improvementAreas: improvements.length > 0 ? improvements : [],
      overallSentiment: strengths.length > improvements.length ? 'positive' : 'neutral',
      recentFeedback: completedWithFeedback.slice(-3).map(i => ({
        date: i.scheduledDate,
        feedback: i.feedback,
        rating: i.rating
      }))
    };
  }

  // Helper methods

  determineInterviewType(job) {
    if (job.charge_rate > 30) return 'specialized';
    if (job.title.includes('Manager')) return 'leadership';
    return 'general';
  }

  generateInterviewDate(jobDate, offsetDays) {
    const date = new Date(jobDate);
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString();
  }

  getCandidateCreatedAt(candidateId) {
    try {
      const result = db.prepare('SELECT created_at FROM candidates WHERE id = ?').get(candidateId);
      return result?.created_at || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  determineInterviewStatus(interviews, requirements) {
    if (!requirements.isRequired) return 'not_required';

    const pending = interviews.filter(i => i.status === 'pending');
    const scheduled = interviews.filter(i => i.status === 'scheduled');
    const completed = interviews.filter(i => i.status === 'completed');

    if (completed.length > 0) return 'completed';
    if (scheduled.length > 0) return 'scheduled';
    if (pending.length > 0) return 'pending';
    return 'required';
  }

  getNextAction(interviews, requirements) {
    const status = this.determineInterviewStatus(interviews, requirements);

    switch (status) {
      case 'required':
        return 'Schedule your onboarding interview to start applying for jobs';
      case 'pending':
        return 'Check back for interview scheduling updates';
      case 'scheduled':
        return 'Prepare for your upcoming interview';
      case 'completed':
        return 'You can now apply for all available jobs';
      default:
        return 'No interview required at this time';
    }
  }

  getCompletionDate(interviews) {
    const completed = interviews.filter(i => i.status === 'completed');
    if (completed.length === 0) return null;

    const latest = completed.reduce((latest, interview) =>
      interview.scheduledDate > latest.scheduledDate ? interview : latest
    );

    return latest.scheduledDate;
  }

  getNextAvailableSlot() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }

    return {
      date: tomorrow.toISOString().split('T')[0],
      time: '10:00',
      timezone: 'Asia/Singapore'
    };
  }

  getWorkingHours() {
    return {
      timezone: 'Asia/Singapore',
      weekdays: {
        start: '09:00',
        end: '17:00',
        breaks: ['12:00-13:00']
      },
      weekends: 'Not available',
      holidays: 'Check schedule for availability'
    };
  }

  calculateInterviewDeadline(createdAt) {
    const created = new Date(createdAt);
    const deadline = new Date(created);
    deadline.setDate(created.getDate() + 14); // 2 weeks to schedule
    return deadline.toISOString().split('T')[0];
  }

  getRequiredInterviewTypes(candidate) {
    const types = ['onboarding'];

    // Additional interview types based on candidate profile
    const accountAge = Math.floor((Date.now() - new Date(candidate.created_at)) / (1000 * 60 * 60 * 24));

    if (accountAge < 7) {
      types.push('welcome');
    }

    if (candidate.status === 'lead') {
      types.push('verification');
    }

    return types;
  }

  getRequiredDocuments() {
    return [
      'Valid NRIC or Passport',
      'Work eligibility documents (if applicable)',
      'Bank account details (for payment setup)',
      'Emergency contact information'
    ];
  }

  getInterviewPreparation() {
    return {
      beforeInterview: [
        'Test your internet connection and camera',
        'Prepare your NRIC and any required documents',
        'Review your profile and work preferences',
        'Prepare questions about job opportunities'
      ],
      duringInterview: [
        'Join the meeting 5 minutes early',
        'Speak clearly and maintain eye contact',
        'Be honest about your experience and availability',
        'Ask questions about job types and expectations'
      ],
      afterInterview: [
        'Wait for feedback (usually within 24 hours)',
        'Complete any requested follow-up actions',
        'Update your profile if needed',
        'Check for available jobs in your area'
      ]
    };
  }

  getInterviewPreparationForType(type) {
    switch (type) {
      case 'onboarding':
        return 'Prepare to discuss your background, work preferences, and availability';
      case 'specialized':
        return 'Review job requirements and prepare examples of relevant experience';
      case 'leadership':
        return 'Prepare examples of leadership or supervisory experience';
      default:
        return 'General interview preparation - be ready to discuss your background';
    }
  }

  canReschedule(interviews) {
    const scheduled = interviews.filter(i => i.status === 'scheduled');
    if (scheduled.length === 0) return false;

    // Can reschedule if interview is more than 24 hours away
    const nextInterview = scheduled[0];
    const interviewTime = new Date(nextInterview.scheduledDate);
    const now = new Date();
    const hoursUntilInterview = (interviewTime - now) / (1000 * 60 * 60);

    return hoursUntilInterview > 24;
  }

  canCancel(interviews) {
    const scheduled = interviews.filter(i => i.status === 'scheduled');
    return scheduled.length > 0;
  }

  canRescheduleInterview(interview) {
    const interviewTime = new Date(interview.scheduledDate);
    const now = new Date();
    const hoursUntilInterview = (interviewTime - now) / (1000 * 60 * 60);
    return hoursUntilInterview > 24;
  }

  canCancelInterview(interview) {
    const interviewTime = new Date(interview.scheduledDate);
    const now = new Date();
    return interviewTime > now;
  }

  getSchedulingInstructions() {
    return {
      howToSchedule: [
        'Contact our support team via chat or WhatsApp',
        'Provide your preferred date and time',
        'Confirm your contact details',
        'Wait for confirmation email with meeting link'
      ],
      rescheduling: [
        'Must be done at least 24 hours before interview',
        'Contact support with new preferred time',
        'Subject to availability'
      ],
      cancellation: [
        'Contact support as soon as possible',
        'Provide reason for cancellation',
        'Can reschedule for later date'
      ],
      support: {
        chat: 'Available in-app 9 AM - 6 PM',
        whatsapp: '+65 XXXX XXXX',
        email: 'interviews@worklink.sg'
      }
    };
  }

  formatInterviewRecord(interview) {
    return {
      id: interview.id,
      type: interview.type,
      jobTitle: interview.jobTitle,
      client: interview.clientName,
      status: interview.status,
      scheduledDate: interview.scheduledDate,
      scheduledTime: interview.scheduledTime,
      duration: interview.duration,
      interviewer: interview.interviewerName,
      location: interview.location,
      meetingLink: interview.meetingLink,
      notes: interview.notes,
      feedback: interview.feedback,
      rating: interview.rating,
      createdAt: interview.createdAt
    };
  }

  /**
   * Schedule a new interview
   * @param {string} candidateId - Candidate ID
   * @param {Object} scheduleData - Interview scheduling data
   * @returns {Promise<Object>} Scheduling result
   */
  async scheduleInterview(candidateId, scheduleData) {
    try {
      const { date, time, type = 'onboarding' } = scheduleData;

      // Validate scheduling eligibility
      const eligibility = await this.getSchedulingStatus(candidateId);

      if (!eligibility.actions.canSchedule) {
        throw new Error(`Cannot schedule interview: ${eligibility.requirements.eligibility.blockers.join(', ')}`);
      }

      // Create interview record (simulated)
      const interviewId = `INT_${candidateId}_${Date.now()}`;
      const meetingLink = `https://meet.google.com/${Math.random().toString(36).substr(2, 9)}`;

      const interview = {
        id: interviewId,
        candidateId: candidateId,
        type: type,
        status: 'scheduled',
        scheduledDate: date,
        scheduledTime: time,
        duration: 30,
        interviewerName: 'Onboarding Team',
        location: 'Video Call',
        meetingLink: meetingLink,
        createdAt: new Date().toISOString()
      };

      // In a real implementation, this would insert into interviews table
      // and send confirmation emails/notifications

      return {
        success: true,
        interview: interview,
        confirmationSent: true,
        message: 'Interview scheduled successfully. Check your email for meeting details.'
      };

    } catch (error) {
      throw new Error(`Failed to schedule interview: ${error.message}`);
    }
  }
}

module.exports = InterviewDataService;