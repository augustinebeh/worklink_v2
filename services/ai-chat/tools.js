/**
 * AI Chat Tools
 *
 * Real functions the AI can call to query data and take actions.
 * These provide actual backend capabilities instead of hallucinating.
 */

const { db } = require('../../db/database');

/**
 * Get worker's recent job deployments and their statuses
 * @param {string} candidateId - The candidate ID
 * @returns {object} Job status information
 */
function getWorkerJobStatus(candidateId) {
  try {
    // Get recent deployments for this worker
    const deployments = db.prepare(`
      SELECT
        d.id,
        d.status,
        d.hours_worked,
        d.created_at,
        j.title as job_title,
        j.location,
        j.job_date,
        j.pay_rate
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.candidate_id = ?
      ORDER BY d.created_at DESC
      LIMIT 5
    `).all(candidateId);

    if (deployments.length === 0) {
      return {
        found: false,
        message: 'No recent job deployments found for this worker.'
      };
    }

    // Categorize deployments
    const pending = deployments.filter(d => d.status === 'pending' || d.status === 'assigned');
    const inProgress = deployments.filter(d => d.status === 'checked_in' || d.status === 'in_progress' || d.status === 'working');
    const completed = deployments.filter(d => d.status === 'completed');
    const issues = deployments.filter(d => d.status === 'no_show' || d.status === 'cancelled' || d.status === 'disputed');

    return {
      found: true,
      total: deployments.length,
      pending: pending.map(d => ({
        job: d.job_title,
        location: d.location,
        date: d.job_date,
        status: d.status
      })),
      inProgress: inProgress.map(d => ({
        job: d.job_title,
        location: d.location,
        hoursWorked: d.hours_worked
      })),
      completed: completed.map(d => ({
        job: d.job_title,
        date: d.job_date,
        payRate: d.pay_rate,
        hoursWorked: d.hours_worked
      })),
      issues: issues.map(d => ({
        job: d.job_title,
        status: d.status,
        date: d.job_date
      })),
      summary: `${pending.length} pending, ${inProgress.length} in progress, ${completed.length} completed, ${issues.length} issues`
    };
  } catch (error) {
    console.error('Error getting worker job status:', error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Get worker's payment status and history
 * @param {string} candidateId - The candidate ID
 * @returns {object} Payment information
 */
function getWorkerPaymentStatus(candidateId) {
  try {
    // Get recent payments
    const payments = db.prepare(`
      SELECT
        id,
        amount,
        status,
        payment_date,
        payment_method,
        created_at
      FROM payments
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(candidateId);

    // Get pending earnings breakdown by job (completed jobs not yet paid)
    const pendingJobs = db.prepare(`
      SELECT
        j.title as job_title,
        j.job_date,
        j.pay_rate,
        COALESCE(d.hours_worked, 0) as hours_worked,
        (j.pay_rate * COALESCE(d.hours_worked, 0)) as earnings
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.candidate_id = ?
        AND d.status = 'completed'
        AND d.id NOT IN (SELECT deployment_id FROM payments WHERE deployment_id IS NOT NULL)
      ORDER BY j.job_date DESC
    `).all(candidateId);

    // Calculate total pending
    const pendingEarnings = pendingJobs.reduce((sum, job) => sum + (job.earnings || 0), 0);

    // Get total earnings this month
    const monthlyEarnings = db.prepare(`
      SELECT SUM(amount) as total
      FROM payments
      WHERE candidate_id = ?
        AND status = 'completed'
        AND payment_date >= date('now', 'start of month')
    `).get(candidateId);

    // Get pending payments (status = 'pending')
    const pendingPayments = payments.filter(p => p.status === 'pending');

    return {
      found: true,
      recentPayments: payments.map(p => ({
        amount: p.amount,
        status: p.status,
        date: p.payment_date,
        method: p.payment_method
      })),
      pendingPayments: pendingPayments.map(p => ({
        amount: p.amount,
        date: p.payment_date
      })),
      pendingJobs: pendingJobs.map(j => ({
        job: j.job_title,
        date: j.job_date,
        hours: j.hours_worked,
        rate: j.pay_rate,
        earnings: j.earnings
      })),
      pendingEarnings: pendingEarnings || 0,
      monthlyEarnings: monthlyEarnings?.total || 0,
      nextPaymentInfo: 'Payments are processed every Friday for completed jobs.'
    };
  } catch (error) {
    console.error('Error getting worker payment status:', error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Escalate conversation to admin attention
 * @param {string} candidateId - The candidate ID
 * @param {string} reason - Reason for escalation
 * @returns {object} Escalation result
 */
function escalateConversation(candidateId, reason) {
  try {
    const conversationManager = require('../conversation-manager');

    // Update conversation metadata
    conversationManager.updateStatus(candidateId, 'open');
    conversationManager.updatePriority(candidateId, 'high');
    conversationManager.escalate(candidateId, reason, 'ai');

    // Get candidate name for notification
    const candidate = db.prepare('SELECT name FROM candidates WHERE id = ?').get(candidateId);
    const candidateName = candidate?.name || 'Unknown';

    // Broadcast to admins
    try {
      const { broadcastToAdmins } = require('../../websocket');
      broadcastToAdmins({
        type: 'conversation_escalated',
        candidateId,
        candidateName,
        reason,
        escalatedBy: 'ai',
        timestamp: new Date().toISOString()
      });
    } catch (wsError) {
      console.warn('Could not broadcast escalation:', wsError.message);
    }

    return {
      success: true,
      message: `Conversation escalated to admin team. Reason: ${reason}`
    };
  } catch (error) {
    console.error('Error escalating conversation:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Update conversation status
 * @param {string} candidateId - The candidate ID
 * @param {string} status - New status: 'open', 'pending', 'resolved'
 * @returns {object} Update result
 */
function updateConversationStatus(candidateId, status) {
  try {
    const conversationManager = require('../conversation-manager');
    conversationManager.updateStatus(candidateId, status);

    // Get candidate name for notification
    const candidate = db.prepare('SELECT name FROM candidates WHERE id = ?').get(candidateId);
    const candidateName = candidate?.name || 'Unknown';

    // Notify admins about the status change
    try {
      const { broadcastToAdmins } = require('../../websocket');
      broadcastToAdmins({
        type: 'ai_action',
        action: 'conversation_status_updated',
        candidateId,
        candidateName,
        newStatus: status,
        changedBy: 'ai',
        timestamp: new Date().toISOString()
      });
    } catch (wsError) {
      console.warn('Could not broadcast status update:', wsError.message);
    }

    return {
      success: true,
      newStatus: status,
      message: `Conversation status updated to ${status}`
    };
  } catch (error) {
    console.error('Error updating conversation status:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get available jobs matching worker's profile
 * @param {string} candidateId - The candidate ID
 * @param {object} filters - Optional filters (location, date, category)
 * @returns {object} Matching jobs
 */
function getMatchingJobs(candidateId, filters = {}) {
  try {
    // Get candidate info for matching
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);

    let query = `
      SELECT
        id, title, location, pay_rate, job_date, start_time, end_time,
        total_slots, filled_slots, category, description
      FROM jobs
      WHERE status = 'open'
        AND job_date >= date('now')
        AND filled_slots < total_slots
    `;
    const params = [];

    if (filters.location) {
      query += ' AND location LIKE ?';
      params.push(`%${filters.location}%`);
    }
    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.minPay) {
      query += ' AND pay_rate >= ?';
      params.push(filters.minPay);
    }

    query += ' ORDER BY job_date ASC LIMIT 5';

    const jobs = db.prepare(query).all(...params);

    return {
      found: jobs.length > 0,
      count: jobs.length,
      jobs: jobs.map(j => ({
        id: j.id,
        title: j.title,
        location: j.location,
        payRate: j.pay_rate,
        date: j.job_date,
        time: `${j.start_time} - ${j.end_time}`,
        slotsLeft: j.total_slots - j.filled_slots,
        category: j.category
      }))
    };
  } catch (error) {
    console.error('Error getting matching jobs:', error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Check if worker has upcoming jobs
 * @param {string} candidateId - The candidate ID
 * @returns {object} Upcoming job info
 */
function getUpcomingJobs(candidateId) {
  try {
    const upcoming = db.prepare(`
      SELECT
        d.id as deployment_id,
        d.status,
        j.title,
        j.location,
        j.job_date,
        j.start_time,
        j.end_time,
        j.pay_rate,
        j.notes
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.candidate_id = ?
        AND j.job_date >= date('now')
        AND d.status IN ('assigned', 'confirmed', 'pending')
      ORDER BY j.job_date ASC, j.start_time ASC
      LIMIT 5
    `).all(candidateId);

    if (upcoming.length === 0) {
      return {
        found: false,
        message: 'No upcoming jobs scheduled.'
      };
    }

    return {
      found: true,
      count: upcoming.length,
      nextJob: {
        title: upcoming[0].title,
        location: upcoming[0].location,
        date: upcoming[0].job_date,
        time: `${upcoming[0].start_time} - ${upcoming[0].end_time}`,
        payRate: upcoming[0].pay_rate
      },
      allUpcoming: upcoming.map(j => ({
        title: j.title,
        location: j.location,
        date: j.job_date,
        time: `${j.start_time} - ${j.end_time}`,
        status: j.status
      }))
    };
  } catch (error) {
    console.error('Error getting upcoming jobs:', error.message);
    return { found: false, error: error.message };
  }
}

/**
 * Execute a tool based on intent and message
 * @param {string} candidateId - The candidate ID
 * @param {string} intent - Detected intent
 * @param {string} message - Original message
 * @returns {object|null} Tool result or null if no tool needed
 */
function executeToolForIntent(candidateId, intent, message) {
  const lowerMessage = message.toLowerCase();

  // Payment related - check FIRST (higher priority for money questions)
  // Triggers on: "how much", "payment", "pay", "salary", "money", "earning", "pending payment"
  const isPaymentQuery = intent === 'pay_inquiry' ||
      lowerMessage.includes('how much') ||
      lowerMessage.includes('payment') ||
      lowerMessage.includes('pay') ||
      lowerMessage.includes('salary') ||
      lowerMessage.includes('money') ||
      lowerMessage.includes('earning') ||
      lowerMessage.includes('withdraw') ||
      lowerMessage.includes('balance') ||
      (lowerMessage.includes('pending') && (lowerMessage.includes('amount') || lowerMessage.includes('much')));

  if (isPaymentQuery) {
    return {
      tool: 'getWorkerPaymentStatus',
      result: getWorkerPaymentStatus(candidateId)
    };
  }

  // Job status related (only if not a payment query)
  if (intent === 'schedule_question' ||
      lowerMessage.includes('status') ||
      lowerMessage.includes('pending') ||
      lowerMessage.includes('completed') ||
      lowerMessage.includes('finished') ||
      lowerMessage.includes('done')) {
    return {
      tool: 'getWorkerJobStatus',
      result: getWorkerJobStatus(candidateId)
    };
  }

  // Job search
  if (intent === 'job_search' ||
      lowerMessage.includes('job') ||
      lowerMessage.includes('work') ||
      lowerMessage.includes('available')) {
    return {
      tool: 'getMatchingJobs',
      result: getMatchingJobs(candidateId)
    };
  }

  // Upcoming jobs
  if (lowerMessage.includes('next') ||
      lowerMessage.includes('upcoming') ||
      lowerMessage.includes('schedule') ||
      lowerMessage.includes('when')) {
    return {
      tool: 'getUpcomingJobs',
      result: getUpcomingJobs(candidateId)
    };
  }

  // Complaint or issue - auto escalate
  if (intent === 'complaint' ||
      intent === 'urgent' ||
      lowerMessage.includes('problem') ||
      lowerMessage.includes('issue') ||
      lowerMessage.includes('wrong') ||
      lowerMessage.includes('help')) {

    // Get job status for context
    const jobStatus = getWorkerJobStatus(candidateId);

    // Check if there's actually an issue to escalate
    if (jobStatus.issues && jobStatus.issues.length > 0) {
      escalateConversation(candidateId, `Worker reported issue: "${message.substring(0, 100)}"`);
      return {
        tool: 'escalateConversation',
        result: {
          escalated: true,
          jobStatus,
          message: 'Issue flagged for admin attention.'
        }
      };
    }

    return {
      tool: 'getWorkerJobStatus',
      result: jobStatus
    };
  }

  return null;
}

/**
 * Format tool result as context for the AI prompt
 * @param {object} toolResult - Result from executeToolForIntent
 * @returns {string} Formatted context string
 */
function formatToolResultAsContext(toolResult) {
  if (!toolResult) return '';

  const { tool, result } = toolResult;

  let context = `\n\n## REAL DATA FROM SYSTEM (use this to answer accurately):\n`;

  switch (tool) {
    case 'getWorkerJobStatus':
      if (!result.found) {
        context += `Job Status: No recent deployments found.\n`;
      } else {
        context += `Job Status Summary: ${result.summary}\n`;
        if (result.pending.length > 0) {
          context += `Pending Jobs:\n`;
          result.pending.forEach(j => {
            context += `  - ${j.job} at ${j.location} (${j.date}) - Status: ${j.status}\n`;
          });
        }
        if (result.inProgress.length > 0) {
          context += `In Progress:\n`;
          result.inProgress.forEach(j => {
            context += `  - ${j.job} at ${j.location} (${j.hoursWorked || 0} hours worked)\n`;
          });
        }
        if (result.completed.length > 0) {
          context += `Recently Completed:\n`;
          result.completed.forEach(j => {
            context += `  - ${j.job} on ${j.date} ($${j.payRate}/hr)\n`;
          });
        }
        if (result.issues.length > 0) {
          context += `Issues/Flags:\n`;
          result.issues.forEach(j => {
            context += `  - ${j.job} - ${j.status} (${j.date})\n`;
          });
        }
      }
      break;

    case 'getWorkerPaymentStatus':
      context += `Payment Info:\n`;
      context += `  - TOTAL PENDING EARNINGS: $${result.pendingEarnings?.toFixed(2) || '0.00'}\n`;
      context += `  - This Month's Paid Earnings: $${result.monthlyEarnings?.toFixed(2) || '0.00'}\n`;
      context += `  - ${result.nextPaymentInfo}\n`;

      // Show pending payments being processed
      if (result.pendingPayments?.length > 0) {
        context += `\nPayments Being Processed:\n`;
        result.pendingPayments.forEach(p => {
          context += `  - $${p.amount?.toFixed(2)} (processing, expected ${p.date || 'this Friday'})\n`;
        });
      }

      // Show breakdown of pending earnings by job
      if (result.pendingJobs?.length > 0) {
        context += `\nPending Earnings Breakdown:\n`;
        result.pendingJobs.forEach(j => {
          context += `  - ${j.job} (${j.date}): ${j.hours}hrs × $${j.rate}/hr = $${j.earnings?.toFixed(2)}\n`;
        });
      }

      if (result.recentPayments?.length > 0) {
        context += `\nRecent Payment History:\n`;
        result.recentPayments.forEach(p => {
          context += `  - $${p.amount} (${p.status}) on ${p.date || 'N/A'}\n`;
        });
      }
      break;

    case 'getMatchingJobs':
      if (!result.found) {
        context += `Available Jobs: No matching jobs found at this time.\n`;
      } else {
        context += `Available Jobs (${result.count} found):\n`;
        result.jobs.forEach(j => {
          context += `  - ${j.title} at ${j.location} - $${j.payRate}/hr on ${j.date} (${j.slotsLeft} slots left)\n`;
        });
      }
      break;

    case 'getUpcomingJobs':
      if (!result.found) {
        context += `Upcoming Jobs: ${result.message}\n`;
      } else {
        context += `Upcoming Jobs (${result.count}):\n`;
        if (result.nextJob) {
          context += `  Next: ${result.nextJob.title} at ${result.nextJob.location} on ${result.nextJob.date} ${result.nextJob.time}\n`;
        }
        result.allUpcoming?.forEach(j => {
          context += `  - ${j.title} at ${j.location} - ${j.date} ${j.time} (${j.status})\n`;
        });
      }
      break;

    case 'escalateConversation':
      context += `ACTION TAKEN: This conversation has been escalated to admin team for attention.\n`;
      if (result.jobStatus) {
        context += `Job Status: ${result.jobStatus.summary || 'No data'}\n`;
      }
      break;

    default:
      context += `Data retrieved: ${JSON.stringify(result, null, 2)}\n`;
  }

  context += `\nIMPORTANT: Only state facts from the data above. Do NOT make up information or claim to have done things you haven't.`;

  return context;
}

module.exports = {
  getWorkerJobStatus,
  getWorkerPaymentStatus,
  escalateConversation,
  updateConversationStatus,
  getMatchingJobs,
  getUpcomingJobs,
  executeToolForIntent,
  formatToolResultAsContext
};
