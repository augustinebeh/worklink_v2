/**
 * Response Formatter
 *
 * Formats real data for user-friendly display in chat responses,
 * replacing assumptions with actual database information.
 */

class ResponseFormatter {
  constructor() {
    this.fallbackMessages = {
      payment: "I'm having trouble accessing your payment information right now. Please try again in a moment or contact support if the issue persists.",
      account: "I can't access your account details at the moment. Please refresh and try again.",
      jobs: "Your job information is temporarily unavailable. Please check back shortly.",
      withdrawal: "Withdrawal information is currently unavailable. Please contact support for assistance.",
      interview: "Interview details cannot be retrieved right now. Please try again later."
    };

    this.currencyFormatter = new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    });

    this.dateFormatter = new Intl.DateTimeFormat('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    this.timeFormatter = new Intl.DateTimeFormat('en-SG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Format payment status response
   * @param {Object} paymentData - Payment data from service
   * @returns {string} Formatted response
   */
  formatPaymentStatus(paymentData) {
    try {
      if (!paymentData || !paymentData.summary) {
        return this.fallbackMessages.payment;
      }

      const { summary, currentStatus, timeline } = paymentData;
      let response = "";

      // Current balance and pending amounts
      response += `💰 **Your Payment Status**\n\n`;

      if (summary.totalEarnings > 0) {
        response += `• **Total Earnings**: ${this.currencyFormatter.format(summary.totalEarnings)}\n`;
      }

      if (summary.availableBalance > 0) {
        response += `• **Available Balance**: ${this.currencyFormatter.format(summary.availableBalance)}\n`;
      }

      if (summary.pendingAmount > 0) {
        response += `• **Pending Approval**: ${this.currencyFormatter.format(summary.pendingAmount)}\n`;
      }

      if (summary.approvedAmount > 0) {
        response += `• **Approved (Next Payment)**: ${this.currencyFormatter.format(summary.approvedAmount)}\n`;
      }

      response += "\n";

      // Payment timeline
      if (currentStatus.nextPaymentDate) {
        response += `📅 **Next Payment**: ${this.dateFormatter.format(new Date(currentStatus.nextPaymentDate))} (Friday)\n\n`;
      }

      // Pending payments breakdown
      if (timeline.pendingPayments && timeline.pendingPayments.length > 0) {
        response += `⏳ **Pending Payments:**\n`;
        timeline.pendingPayments.slice(0, 3).forEach(payment => {
          const jobDate = this.dateFormatter.format(new Date(payment.jobDate));
          const amount = this.currencyFormatter.format(payment.amount);
          response += `• ${payment.jobTitle} (${jobDate}) - ${amount}\n`;

          if (payment.daysUntilPayment > 0) {
            response += `  Expected in ${payment.daysUntilPayment} day${payment.daysUntilPayment !== 1 ? 's' : ''}\n`;
          }
        });
        response += "\n";
      }

      // Payment schedule info
      if (timeline.paymentSchedule) {
        response += `📋 **Payment Schedule**: ${timeline.paymentSchedule.frequency} on ${timeline.paymentSchedule.paymentDay}s\n`;
        response += `• Processing time: ${timeline.paymentSchedule.processingTime}\n\n`;
      }

      // Bank details verification
      if (paymentData.bankDetails) {
        if (paymentData.bankDetails.isValid) {
          response += `🏦 **Bank Details**: ${paymentData.bankDetails.bankName} (...${paymentData.bankDetails.accountNumber.slice(-4)})\n`;
        } else {
          response += `⚠️ **Action Needed**: Please update your bank details to receive payments\n`;
        }
      }

      return response.trim();

    } catch (error) {
      console.error('Error formatting payment status:', error);
      return this.fallbackMessages.payment;
    }
  }

  /**
   * Format account verification status response
   * @param {Object} accountData - Account data from service
   * @returns {string} Formatted response
   */
  formatAccountVerification(accountData) {
    try {
      if (!accountData || !accountData.verification) {
        return this.fallbackMessages.account;
      }

      const { verification, checks, requirements } = accountData;
      let response = "";

      response += `🔐 **Account Verification Status**\n\n`;

      // Overall status
      const statusEmoji = {
        'verified': '✅',
        'mostly_verified': '🟡',
        'pending': '🟠'
      };

      response += `${statusEmoji[verification.overallStatus] || '🔄'} **Status**: ${verification.overallMessage}\n`;
      response += `📊 **Completion**: ${verification.completionPercentage}%\n\n`;

      // Verification checks
      const checkEmojis = {
        true: '✅',
        false: '❌'
      };

      response += `**Verification Checklist:**\n`;
      response += `${checkEmojis[checks.personalInfo.isValid]} Personal Information\n`;
      response += `${checkEmojis[checks.bankDetails.isValid]} Bank Details\n`;
      response += `${checkEmojis[checks.documents.isValid]} Documents\n`;
      response += `${checkEmojis[checks.skillsAndCertifications.isValid]} Skills & Certifications\n`;

      if (!checks.profilePhoto.isValid && !checks.profilePhoto.required) {
        response += `📷 Profile Photo (Optional)\n`;
      } else {
        response += `${checkEmojis[checks.profilePhoto.isValid]} Profile Photo\n`;
      }

      response += "\n";

      // Next steps
      if (requirements.nextSteps && requirements.nextSteps.length > 0) {
        response += `📝 **Next Steps:**\n`;
        requirements.nextSteps.forEach(step => {
          const priority = step.priority === 'high' ? '🔥' : step.priority === 'medium' ? '🟡' : '🔵';
          response += `${priority} ${step.action}\n`;
          if (step.description) {
            response += `   ${step.description}\n`;
          }
        });
        response += "\n";
      }

      // Account capabilities
      if (accountData.accountSettings) {
        response += `**Current Capabilities:**\n`;
        response += `${accountData.accountSettings.canApplyForJobs ? '✅' : '❌'} Apply for jobs\n`;
        response += `${accountData.accountSettings.canReceivePayments ? '✅' : '❌'} Receive payments\n\n`;
      }

      return response.trim();

    } catch (error) {
      console.error('Error formatting account verification:', error);
      return this.fallbackMessages.account;
    }
  }

  /**
   * Format job history and status response
   * @param {Object} jobData - Job data from service
   * @returns {string} Formatted response
   */
  formatJobHistory(jobData) {
    try {
      if (!jobData || !jobData.summary) {
        return this.fallbackMessages.jobs;
      }

      const { summary, currentStatus, timeline, performance } = jobData;
      let response = "";

      response += `💼 **Your Job History**\n\n`;

      // Summary stats
      response += `📊 **Summary:**\n`;
      response += `• **Total Jobs**: ${summary.totalJobs}\n`;
      response += `• **Completed**: ${summary.completedJobs}\n`;

      if (summary.totalEarnings > 0) {
        response += `• **Total Earnings**: ${this.currencyFormatter.format(summary.totalEarnings)}\n`;
      }

      if (summary.averageRating > 0) {
        response += `• **Rating**: ${summary.averageRating}/5 ⭐\n`;
      }

      response += "\n";

      // Current status
      if (currentStatus.activeJobs > 0) {
        response += `🔄 **Active Jobs**: ${currentStatus.activeJobs}\n`;
      }

      if (currentStatus.upcomingJobs > 0) {
        response += `📅 **Upcoming**: ${currentStatus.upcomingJobs}\n`;
      }

      if (currentStatus.pendingApplications > 0) {
        response += `⏳ **Applications Pending**: ${currentStatus.pendingApplications}\n`;
      }

      response += "\n";

      // Upcoming jobs
      if (timeline.upcoming && timeline.upcoming.length > 0) {
        response += `📅 **Upcoming Jobs:**\n`;
        timeline.upcoming.slice(0, 3).forEach(job => {
          const date = this.dateFormatter.format(new Date(job.date));
          const time = job.startTime;
          response += `• **${job.title}** - ${date} at ${time}\n`;
          response += `  📍 ${job.location} | 💰 ${this.currencyFormatter.format(job.estimatedEarnings)}\n`;

          if (job.daysUntilJob === 0) {
            response += `  🔥 **Today!** Arrive 15 minutes early\n`;
          } else if (job.daysUntilJob === 1) {
            response += `  📱 **Tomorrow** - Get ready!\n`;
          } else {
            response += `  📆 In ${job.daysUntilJob} days\n`;
          }
        });
        response += "\n";
      }

      // Recent completed jobs
      if (timeline.recentCompleted && timeline.recentCompleted.length > 0) {
        response += `✅ **Recently Completed:**\n`;
        timeline.recentCompleted.slice(0, 3).forEach(job => {
          const date = this.dateFormatter.format(new Date(job.date));
          response += `• **${job.title}** - ${date}\n`;
          response += `  💰 ${this.currencyFormatter.format(job.earnings)} | ⏱️ ${job.hoursWorked}h`;

          if (job.rating) {
            response += ` | ⭐ ${job.rating}/5`;
          }
          response += "\n";
        });
        response += "\n";
      }

      // Performance insights
      if (performance) {
        if (performance.strengths && performance.strengths.length > 0) {
          response += `🌟 **Strengths**: ${performance.strengths.join(', ')}\n`;
        }
      }

      // Available opportunities
      if (jobData.opportunities && jobData.opportunities.totalAvailable > 0) {
        response += `\n🎯 **${jobData.opportunities.totalAvailable} jobs available for you!** Check the Jobs tab to apply.\n`;
      }

      return response.trim();

    } catch (error) {
      console.error('Error formatting job history:', error);
      return this.fallbackMessages.jobs;
    }
  }

  /**
   * Format withdrawal eligibility response
   * @param {Object} withdrawalData - Withdrawal data from service
   * @returns {string} Formatted response
   */
  formatWithdrawalEligibility(withdrawalData) {
    try {
      if (!withdrawalData || !withdrawalData.balance) {
        return this.fallbackMessages.withdrawal;
      }

      const { balance, eligibility, limits, recommendations } = withdrawalData;
      let response = "";

      response += `💸 **Withdrawal Status**\n\n`;

      // Current balance
      response += `💰 **Available Balance**: ${this.currencyFormatter.format(balance.availableBalance)}\n`;

      if (balance.pendingBalance > 0) {
        response += `⏳ **Pending**: ${this.currencyFormatter.format(balance.pendingBalance)}\n`;
      }

      if (balance.approvedBalance > 0) {
        response += `✅ **Approved**: ${this.currencyFormatter.format(balance.approvedBalance)}\n`;
      }

      response += "\n";

      // Eligibility status
      if (eligibility.canWithdraw) {
        response += `✅ **You can withdraw now!**\n\n`;

        response += `**Withdrawal Limits:**\n`;
        response += `• Minimum: ${this.currencyFormatter.format(limits.minimumWithdrawal)}\n`;
        response += `• Maximum: ${this.currencyFormatter.format(limits.maximumWithdrawal)}\n`;

        if (limits.withdrawalFee > 0) {
          response += `• Fee: ${this.currencyFormatter.format(limits.withdrawalFee)}\n`;
        }

        response += "\n";
      } else {
        response += `❌ **Withdrawal not available**\n\n`;

        if (eligibility.reasons && eligibility.reasons.length > 0) {
          response += `**Reasons:**\n`;
          eligibility.reasons.forEach(reason => {
            response += `• ${reason}\n`;
          });
          response += "\n";
        }

        if (eligibility.requirements && eligibility.requirements.length > 0) {
          response += `**Requirements:**\n`;
          eligibility.requirements.forEach(req => {
            response += `• ${req}\n`;
          });
          response += "\n";
        }

        if (eligibility.nextEligibilityDate) {
          const nextDate = this.dateFormatter.format(new Date(eligibility.nextEligibilityDate));
          response += `📅 **Next eligible**: ${nextDate}\n\n`;
        }
      }

      // Bank details
      if (withdrawalData.bankDetails) {
        if (withdrawalData.bankDetails.isValid) {
          response += `🏦 **Bank**: ${withdrawalData.bankDetails.bankName} (...${withdrawalData.bankDetails.accountNumber.slice(-4)})\n`;
        } else {
          response += `⚠️ **Action Required**: Update bank details for withdrawals\n`;
        }
      }

      // Processing time
      if (withdrawalData.pending && withdrawalData.pending.expectedProcessingTime) {
        response += `⏱️ **Processing Time**: ${withdrawalData.pending.expectedProcessingTime.average}\n`;
      }

      // Recommendations
      if (recommendations && recommendations.length > 0) {
        response += `\n💡 **Tips:**\n`;
        recommendations.forEach(rec => {
          if (rec.priority === 'high') {
            response += `🔥 ${rec.title}\n`;
          } else {
            response += `💡 ${rec.title}\n`;
          }
        });
      }

      return response.trim();

    } catch (error) {
      console.error('Error formatting withdrawal eligibility:', error);
      return this.fallbackMessages.withdrawal;
    }
  }

  /**
   * Format interview scheduling status response
   * @param {Object} interviewData - Interview data from service
   * @returns {string} Formatted response
   */
  formatInterviewSchedule(interviewData) {
    try {
      if (!interviewData || !interviewData.status) {
        return this.fallbackMessages.interview;
      }

      const { status, interviews, schedule, requirements } = interviewData;
      let response = "";

      response += `🎤 **Interview Status**\n\n`;

      // Current status
      const statusEmojis = {
        'not_required': '✅',
        'required': '📝',
        'pending': '⏳',
        'scheduled': '📅',
        'completed': '✅'
      };

      response += `${statusEmojis[status.currentStatus] || '🔄'} **Status**: ${this.getInterviewStatusMessage(status.currentStatus)}\n`;

      if (status.nextAction) {
        response += `📝 **Next Step**: ${status.nextAction}\n`;
      }

      response += "\n";

      // Scheduled interviews
      if (schedule.upcoming && schedule.upcoming.length > 0) {
        response += `📅 **Upcoming Interviews:**\n`;
        schedule.upcoming.forEach(interview => {
          const date = this.dateFormatter.format(new Date(interview.date));
          const time = this.timeFormatter.format(new Date(`2000-01-01T${interview.time}`));

          response += `• **${interview.title}**\n`;
          response += `  📅 ${date} at ${time}\n`;
          response += `  👤 ${interview.interviewer}\n`;
          response += `  📍 ${interview.location}\n`;

          if (interview.meetingLink) {
            response += `  🔗 [Join Meeting](${interview.meetingLink})\n`;
          }

          if (interview.daysUntilInterview === 0) {
            response += `  🔥 **Today!** Join 5 minutes early\n`;
          } else if (interview.daysUntilInterview === 1) {
            response += `  📱 **Tomorrow** - Prepare your documents\n`;
          } else {
            response += `  📆 In ${interview.daysUntilInterview} days\n`;
          }

          response += "\n";
        });
      }

      // Interview requirements
      if (requirements.isRequired && interviews.scheduled === 0) {
        response += `📋 **Interview Required:**\n`;
        response += `• **Reason**: ${requirements.reason}\n`;
        response += `• **Priority**: ${requirements.priority}\n`;

        if (requirements.deadline) {
          const deadline = this.dateFormatter.format(new Date(requirements.deadline));
          response += `• **Deadline**: ${deadline}\n`;
        }

        response += "\n";
      }

      // Available slots
      if (schedule.availableSlots && schedule.availableSlots.length > 0) {
        response += `🗓️ **Available Times** (first 3):\n`;
        schedule.availableSlots.slice(0, 3).forEach(slot => {
          const date = this.dateFormatter.format(new Date(slot.date));
          const time = this.timeFormatter.format(new Date(`2000-01-01T${slot.time}`));
          response += `• ${date} at ${time}\n`;
        });
        response += "\n";
      }

      // Contact info for scheduling
      if (interviewData.actions && interviewData.actions.canSchedule) {
        response += `📞 **To Schedule**: Contact support via chat or WhatsApp\n`;
      }

      // Performance summary
      if (interviewData.history && interviewData.history.interviewPerformance) {
        const perf = interviewData.history.interviewPerformance;
        if (perf.totalInterviews > 0) {
          response += `📊 **Interview History**: ${perf.totalInterviews} completed | ${perf.attendanceRate}% attendance | ⭐ ${perf.averageRating}/5\n`;
        }
      }

      return response.trim();

    } catch (error) {
      console.error('Error formatting interview schedule:', error);
      return this.fallbackMessages.interview;
    }
  }

  /**
   * Format comprehensive user summary
   * @param {Object} userData - Complete user data from integration layer
   * @returns {string} Formatted comprehensive summary
   */
  formatComprehensiveSummary(userData) {
    try {
      if (!userData) {
        return "I'm having trouble accessing your information right now. Please try again in a moment.";
      }

      let response = "📋 **Your WorkLink Summary**\n\n";

      // Account status
      if (userData.account && userData.account.verification) {
        const completion = userData.account.verification.completionPercentage;
        response += `🔐 **Account**: ${completion}% verified\n`;
      }

      // Job status
      if (userData.jobs && userData.jobs.summary) {
        const jobs = userData.jobs.summary;
        response += `💼 **Jobs**: ${jobs.completedJobs} completed`;
        if (jobs.totalEarnings > 0) {
          response += ` | ${this.currencyFormatter.format(jobs.totalEarnings)} earned`;
        }
        response += "\n";
      }

      // Payment status
      if (userData.payments && userData.payments.summary) {
        const payments = userData.payments.summary;
        if (payments.pendingAmount > 0) {
          response += `💰 **Pending**: ${this.currencyFormatter.format(payments.pendingAmount)}\n`;
        }
        if (payments.availableBalance > 0) {
          response += `💸 **Available**: ${this.currencyFormatter.format(payments.availableBalance)}\n`;
        }
      }

      // Next actions
      response += "\n🎯 **Quick Actions:**\n";

      // Job applications
      if (userData.jobs && userData.jobs.opportunities && userData.jobs.opportunities.totalAvailable > 0) {
        response += `• Browse ${userData.jobs.opportunities.totalAvailable} available jobs\n`;
      }

      // Account completion
      if (userData.account && userData.account.verification && userData.account.verification.completionPercentage < 100) {
        response += `• Complete account verification (${100 - userData.account.verification.completionPercentage}% remaining)\n`;
      }

      // Withdrawal eligibility
      if (userData.withdrawals && userData.withdrawals.eligibility && userData.withdrawals.eligibility.canWithdraw) {
        response += `• Withdraw ${this.currencyFormatter.format(userData.withdrawals.balance.availableBalance)}\n`;
      }

      // Interview requirements
      if (userData.interviews && userData.interviews.requirements && userData.interviews.requirements.isRequired) {
        response += `• Schedule required interview\n`;
      }

      return response.trim();

    } catch (error) {
      console.error('Error formatting comprehensive summary:', error);
      return "I'm having trouble accessing your information right now. Please try again in a moment.";
    }
  }

  /**
   * Format data for specific intent responses
   * @param {string} intent - The detected intent
   * @param {Object} userData - User data
   * @param {Object} context - Additional context
   * @returns {string} Formatted response
   */
  formatIntentResponse(intent, userData, context = {}) {
    try {
      switch (intent) {
        case 'payment_inquiry':
          return this.formatPaymentStatus(userData.payments);

        case 'job_search':
          return this.formatJobOpportunities(userData.jobs);

        case 'account_verification':
          return this.formatAccountVerification(userData.account);

        case 'withdrawal_request':
          return this.formatWithdrawalEligibility(userData.withdrawals);

        case 'interview_scheduling':
          return this.formatInterviewSchedule(userData.interviews);

        case 'general_status':
          return this.formatComprehensiveSummary(userData);

        default:
          return this.formatGeneralResponse(userData, context);
      }
    } catch (error) {
      console.error('Error formatting intent response:', error);
      return "I understand you're looking for information, but I'm having trouble accessing your data right now. Please try again in a moment or contact support if the issue persists.";
    }
  }

  /**
   * Format job opportunities specifically
   * @param {Object} jobData - Job data from service
   * @returns {string} Formatted job opportunities
   */
  formatJobOpportunities(jobData) {
    try {
      if (!jobData || !jobData.opportunities) {
        return "I'm having trouble accessing job listings right now. Please check the Jobs tab or try again in a moment.";
      }

      const { opportunities, currentStatus } = jobData;
      let response = "🎯 **Available Job Opportunities**\n\n";

      if (opportunities.totalAvailable === 0) {
        response += "No jobs are currently available that match your profile. New opportunities are posted regularly, so check back soon!\n\n";

        // Suggest profile improvements
        if (jobData.summary && jobData.summary.completedJobs < 3) {
          response += "💡 **Tip**: Complete more jobs to unlock better opportunities!";
        }

        return response.trim();
      }

      response += `📊 **${opportunities.totalAvailable} jobs match your profile!**\n\n`;

      // Show top matching jobs
      if (opportunities.matchingJobs && opportunities.matchingJobs.length > 0) {
        response += "🔝 **Top Matches:**\n";
        opportunities.matchingJobs.slice(0, 3).forEach(job => {
          const date = this.dateFormatter.format(new Date(job.date));
          const time = this.timeFormatter.format(new Date(`2000-01-01T${job.startTime}`));
          const earnings = this.currencyFormatter.format(job.estimatedEarnings);

          response += `• **${job.title}**\n`;
          response += `  📅 ${date} at ${time} | 📍 ${job.location}\n`;
          response += `  💰 ${earnings} | 🎯 ${job.matchScore}% match\n`;

          if (job.isUrgent) {
            response += `  🔥 **Urgent** - Apply quickly!\n`;
          }

          if (job.isFeatured) {
            response += `  ⭐ **Featured opportunity**\n`;
          }

          response += "\n";
        });
      }

      // Application status
      if (currentStatus.pendingApplications > 0) {
        response += `⏳ **You have ${currentStatus.pendingApplications} pending applications**\n\n`;
      }

      // Call to action
      response += "📱 **Open the Jobs tab** to view all opportunities and apply!\n";

      return response.trim();

    } catch (error) {
      console.error('Error formatting job opportunities:', error);
      return this.fallbackMessages.jobs;
    }
  }

  /**
   * Format general response when intent is unclear
   * @param {Object} userData - User data
   * @param {Object} context - Additional context
   * @returns {string} Formatted general response
   */
  formatGeneralResponse(userData, context) {
    try {
      let response = "I'm here to help! Here's a quick overview:\n\n";

      // Account highlights
      if (userData.account) {
        const completion = userData.account.verification?.completionPercentage || 0;
        if (completion < 100) {
          response += `🔐 **Account**: ${completion}% verified - complete your profile to access all features\n`;
        }
      }

      // Active items that need attention
      const actionItems = [];

      if (userData.payments?.summary?.pendingAmount > 0) {
        actionItems.push(`${this.currencyFormatter.format(userData.payments.summary.pendingAmount)} pending approval`);
      }

      if (userData.jobs?.currentStatus?.upcomingJobs > 0) {
        actionItems.push(`${userData.jobs.currentStatus.upcomingJobs} upcoming job${userData.jobs.currentStatus.upcomingJobs > 1 ? 's' : ''}`);
      }

      if (userData.interviews?.requirements?.isRequired) {
        actionItems.push("interview scheduling required");
      }

      if (actionItems.length > 0) {
        response += `⚡ **Action Items**: ${actionItems.join(', ')}\n\n`;
      }

      response += "What would you like to know about? I can help with:\n";
      response += "• Payment status and history 💰\n";
      response += "• Job opportunities and applications 💼\n";
      response += "• Account verification 🔐\n";
      response += "• Withdrawal eligibility 💸\n";
      response += "• Interview scheduling 🎤\n";

      return response.trim();

    } catch (error) {
      console.error('Error formatting general response:', error);
      return "I'm here to help with your WorkLink account! Feel free to ask me about your payments, jobs, account status, or any other questions you might have.";
    }
  }

  // Helper methods

  getInterviewStatusMessage(status) {
    const statusMessages = {
      'not_required': 'No interview required',
      'required': 'Interview required to start applying for jobs',
      'pending': 'Interview request pending',
      'scheduled': 'Interview scheduled',
      'completed': 'Interview completed successfully'
    };

    return statusMessages[status] || 'Status unknown';
  }

  /**
   * Format error message with helpful context
   * @param {string} dataType - Type of data that failed
   * @param {string} userMessage - User's original message
   * @returns {string} Formatted error message
   */
  formatErrorResponse(dataType, userMessage = '') {
    let response = this.fallbackMessages[dataType] || "I'm having trouble accessing that information right now.";

    // Add helpful suggestions based on error type
    response += "\n\n🔧 **You can try:**\n";
    response += "• Refreshing the app and trying again\n";
    response += "• Checking your internet connection\n";
    response += "• Contacting support if the problem continues\n";

    return response;
  }

  /**
   * Format data with proper fallbacks
   * @param {any} data - Data to format
   * @param {string} fallback - Fallback message
   * @returns {string} Formatted data or fallback
   */
  formatWithFallback(data, fallback) {
    try {
      if (!data) return fallback;
      return this.formatData(data);
    } catch (error) {
      console.error('Formatting error:', error);
      return fallback;
    }
  }

  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format relative time (e.g., "2 days ago", "in 3 hours")
   * @param {Date|string} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    try {
      const now = new Date();
      const targetDate = new Date(date);
      const diffMs = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'today';
      } else if (diffDays === 1) {
        return 'tomorrow';
      } else if (diffDays === -1) {
        return 'yesterday';
      } else if (diffDays > 0) {
        return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else {
        return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      return 'unknown';
    }
  }
}

module.exports = ResponseFormatter;