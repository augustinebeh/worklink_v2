/**
 * FOMO Urgency Calculation Module
 */

const { createLogger } = require('../../utils/structured-logger');
const { db } = require('../../db');

const logger = createLogger('fomo-engine');

function calculateUrgencyScores(createUrgencyEventFn) {
  try {
    const jobs = db.prepare(`
      SELECT j.*,
             COUNT(d.id) as application_count,
             (j.filled_slots * 1.0 / j.total_slots) as fill_ratio,
             CASE
               WHEN datetime(j.application_deadline) <= datetime('now', '+2 hours') THEN 1
               WHEN datetime(j.application_deadline) <= datetime('now', '+6 hours') THEN 0.7
               WHEN datetime(j.application_deadline) <= datetime('now', '+24 hours') THEN 0.4
               ELSE 0.1
             END as time_urgency
      FROM jobs j
      LEFT JOIN deployments d ON j.id = d.job_id
      WHERE j.status = 'open'
        AND j.filled_slots < j.total_slots
      GROUP BY j.id
      HAVING fill_ratio >= 0.3 OR time_urgency > 0.4
      ORDER BY (fill_ratio + time_urgency) DESC
    `).all();

    jobs.forEach(job => {
      const urgencyScore = calculateJobUrgency(job);
      if (urgencyScore > 0.6) {
        createUrgencyEventFn(job, urgencyScore);
      }
    });

    logger.info(`Calculated urgency for ${jobs.length} jobs`);
  } catch (error) {
    logger.error('Failed to calculate urgency scores:', error);
  }
}

function calculateJobUrgency(job) {
  let urgencyScore = 0;

  const slotScarcity = job.fill_ratio || 0;
  urgencyScore += slotScarcity * 0.4;

  urgencyScore += (job.time_urgency || 0) * 0.3;

  const recentApplications = getRecentApplicationCount(job.id, 60);
  const applicationVelocity = Math.min(recentApplications / 10, 1.0);
  urgencyScore += applicationVelocity * 0.2;

  const avgPayRate = getAveragePayRate(job.location_area);
  const payPremium = Math.max(0, (job.pay_rate - avgPayRate) / avgPayRate);
  urgencyScore += Math.min(payPremium, 0.2) * 0.1;

  return Math.min(urgencyScore, 1.0);
}

function getRecentApplicationCount(jobId, minutesAgo) {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM deployments
      WHERE job_id = ? AND created_at > datetime('now', '-' || ? || ' minutes')
    `).get(jobId, minutesAgo);
    return result.count || 0;
  } catch (error) {
    logger.error('Failed to get recent application count:', error);
    return 0;
  }
}

function getAveragePayRate(locationArea) {
  try {
    const result = db.prepare(`
      SELECT AVG(pay_rate) as avg_rate FROM jobs
      WHERE location_area = ? AND created_at > datetime('now', '-30 days') AND pay_rate > 0
    `).get(locationArea);
    return result.avg_rate || 20;
  } catch (error) {
    logger.error('Failed to get average pay rate:', error);
    return 20;
  }
}

function createUrgencyEvent(job, urgencyScore) {
  const eventId = `urg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 2);

  try {
    db.prepare(`
      INSERT INTO fomo_events (id, event_type, event_data, urgency_score, expires_at)
      VALUES (?, 'job_urgency', ?, ?, ?)
    `).run(
      eventId,
      JSON.stringify({
        jobId: job.id, jobTitle: job.title, fillRatio: job.fill_ratio,
        timeUrgency: job.time_urgency, remainingSlots: job.total_slots - job.filled_slots,
        payRate: job.pay_rate, locationArea: job.location_area
      }),
      urgencyScore,
      expiresAt.toISOString()
    );

    logger.debug('Created urgency event', { eventId, jobId: job.id, urgencyScore: urgencyScore.toFixed(2) });
  } catch (error) {
    logger.error('Failed to create urgency event:', error);
  }
}

module.exports = { calculateUrgencyScores, createUrgencyEvent };
