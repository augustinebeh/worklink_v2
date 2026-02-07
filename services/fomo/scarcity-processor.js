/**
 * FOMO Scarcity Triggers Module
 */

const { createLogger } = require('../../utils/structured-logger');
const { db } = require('../../db');

const logger = createLogger('fomo-engine');

function processScarcityTriggers() {
  try {
    processJobSlotScarcity();
    processTimeLimitedOpportunities();
    processSkillDemandScarcity();
    logger.debug('Processed scarcity triggers');
  } catch (error) {
    logger.error('Failed to process scarcity triggers:', error);
  }
}

function processJobSlotScarcity() {
  const scarcityJobs = db.prepare(`
    SELECT j.*,
           (j.filled_slots * 1.0 / j.total_slots) as fill_ratio,
           (j.total_slots - j.filled_slots) as remaining_slots
    FROM jobs j
    WHERE j.status = 'open' AND j.filled_slots < j.total_slots
      AND (j.filled_slots * 1.0 / j.total_slots) >= 0.6
    ORDER BY fill_ratio DESC
  `).all();

  scarcityJobs.forEach(job => {
    const scarcityLevel = calculateScarcityLevel(job.fill_ratio, job.remaining_slots);
    if (scarcityLevel > 0.5) {
      createScarcityEvent('job_slot_scarcity', {
        jobId: job.id, jobTitle: job.title, remainingSlots: job.remaining_slots,
        fillRatio: job.fill_ratio, scarcityLevel, urgentMessage: scarcityLevel > 0.8
      });
    }
  });
}

function processTimeLimitedOpportunities() {
  const timeLimitedJobs = db.prepare(`
    SELECT j.*,
           ROUND((julianday(j.application_deadline) - julianday('now')) * 24, 1) as hours_remaining
    FROM jobs j
    WHERE j.status = 'open'
      AND datetime(j.application_deadline) > datetime('now')
      AND datetime(j.application_deadline) <= datetime('now', '+12 hours')
    ORDER BY j.application_deadline ASC
  `).all();

  timeLimitedJobs.forEach(job => {
    const timeScarcity = calculateTimeScarcity(job.hours_remaining);
    if (timeScarcity > 0.4) {
      createScarcityEvent('time_limited', {
        jobId: job.id, jobTitle: job.title, hoursRemaining: job.hours_remaining,
        timeScarcity, deadlineApproaching: timeScarcity > 0.7
      });
    }
  });
}

function processSkillDemandScarcity() {
  const skillDemand = db.prepare(`
    SELECT j.required_skills, COUNT(j.id) as open_jobs,
      COUNT(DISTINCT d.candidate_id) as unique_applicants,
      (COUNT(j.id) * 1.0 / COUNT(DISTINCT d.candidate_id)) as demand_ratio
    FROM jobs j
    LEFT JOIN deployments d ON j.id = d.job_id
    WHERE j.status = 'open' AND j.required_skills IS NOT NULL
      AND j.created_at > datetime('now', '-7 days')
    GROUP BY j.required_skills
    HAVING open_jobs >= 3 AND demand_ratio > 2.0
    ORDER BY demand_ratio DESC
  `).all();

  skillDemand.forEach(skill => {
    createScarcityEvent('skill_demand', {
      requiredSkills: skill.required_skills, openJobs: skill.open_jobs,
      demandRatio: skill.demand_ratio, competitiveAdvantage: true
    });
  });
}

function calculateScarcityLevel(fillRatio, remainingSlots) {
  let scarcity = fillRatio;
  if (remainingSlots <= 1) scarcity += 0.3;
  else if (remainingSlots <= 2) scarcity += 0.2;
  else if (remainingSlots <= 3) scarcity += 0.1;
  return Math.min(scarcity, 1.0);
}

function calculateTimeScarcity(hoursRemaining) {
  if (hoursRemaining <= 1) return 1.0;
  if (hoursRemaining <= 2) return 0.8;
  if (hoursRemaining <= 4) return 0.6;
  if (hoursRemaining <= 8) return 0.4;
  return 0.2;
}

function createScarcityEvent(scarcityType, data) {
  const eventId = `scar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date();

  switch (scarcityType) {
    case 'job_slot_scarcity': expiresAt.setHours(expiresAt.getHours() + 1); break;
    case 'time_limited': expiresAt.setMinutes(expiresAt.getMinutes() + 30); break;
    case 'skill_demand': expiresAt.setHours(expiresAt.getHours() + 4); break;
  }

  try {
    db.prepare(`
      INSERT INTO fomo_events (id, event_type, event_data, scarcity_level, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventId, scarcityType, JSON.stringify(data),
      data.scarcityLevel || data.timeScarcity || 0.7, expiresAt.toISOString());

    logger.debug('Created scarcity event', { eventId, scarcityType, data });
  } catch (error) {
    logger.error('Failed to create scarcity event:', error);
  }
}

module.exports = { processScarcityTriggers, calculateScarcityLevel };
