/**
 * FOMO Social Proof Generation Module
 */

const { createLogger } = require('../../utils/structured-logger');
const { db } = require('../../db');

const logger = createLogger('fomo-engine');

function updateSocialProofData(createSocialProofEventFn) {
  try {
    generatePeerActivityProof(createSocialProofEventFn);
    generateTierCompetitionProof(createSocialProofEventFn);
    generateLocationActivityProof(createSocialProofEventFn);
    logger.debug('Social proof data updated');
  } catch (error) {
    logger.error('Failed to update social proof data:', error);
  }
}

function generatePeerActivityProof(createSocialProofEventFn) {
  const timeWindow = 60;
  const activities = db.prepare(`
    SELECT sp.location_area, sp.tier_level,
      SUM(sp.participant_count) as total_participants,
      COUNT(DISTINCT sp.job_id) as unique_jobs, sp.activity_type
    FROM fomo_social_proof sp
    WHERE sp.time_window_end > datetime('now', '-' || ? || ' minutes')
      AND sp.activity_type IN ('job_application', 'job_view')
      AND sp.location_area IS NOT NULL
    GROUP BY sp.location_area, sp.tier_level, sp.activity_type
    HAVING total_participants >= 3
    ORDER BY total_participants DESC
  `).all(timeWindow);

  activities.forEach(activity => {
    createSocialProofEventFn('peer_activity', {
      locationArea: activity.location_area, tierLevel: activity.tier_level,
      participantCount: activity.total_participants,
      uniqueJobs: activity.unique_jobs, activityType: activity.activity_type,
      timeWindow: `${timeWindow}m`
    });
  });
}

function generateTierCompetitionProof(createSocialProofEventFn) {
  const jobs = db.prepare(`
    SELECT j.id as job_id, j.title, j.location_area, c.tier_level,
      COUNT(d.id) as applications_count
    FROM jobs j
    JOIN deployments d ON j.id = d.job_id
    JOIN (
      SELECT id,
        CASE WHEN level >= 100 THEN 'mythic' WHEN level >= 75 THEN 'diamond'
             WHEN level >= 50 THEN 'platinum' WHEN level >= 25 THEN 'gold'
             WHEN level >= 10 THEN 'silver' ELSE 'bronze' END as tier_level
      FROM candidates
    ) c ON d.candidate_id = c.id
    WHERE j.status = 'open' AND d.created_at > datetime('now', '-2 hours')
    GROUP BY j.id, c.tier_level
    HAVING applications_count >= 2
    ORDER BY applications_count DESC
  `).all();

  jobs.forEach(job => {
    createSocialProofEventFn('tier_competition', {
      jobId: job.job_id, jobTitle: job.title, locationArea: job.location_area,
      tierLevel: job.tier_level, competitorCount: job.applications_count
    });
  });
}

function generateLocationActivityProof(createSocialProofEventFn) {
  const locationActivity = db.prepare(`
    SELECT sp.location_area, COUNT(DISTINCT sp.id) as activity_events,
      SUM(sp.participant_count) as total_people,
      COUNT(DISTINCT sp.job_id) as unique_jobs,
      AVG(sp.participant_count) as avg_participation
    FROM fomo_social_proof sp
    WHERE sp.time_window_end > datetime('now', '-90 minutes') AND sp.location_area IS NOT NULL
    GROUP BY sp.location_area
    HAVING total_people >= 5
    ORDER BY total_people DESC
  `).all();

  locationActivity.forEach(location => {
    createSocialProofEventFn('location_activity', {
      locationArea: location.location_area, totalPeople: location.total_people,
      uniqueJobs: location.unique_jobs,
      activityLevel: location.avg_participation > 3 ? 'high' : 'medium'
    });
  });
}

function calculateSocialProofFactor(proofType, data) {
  switch (proofType) {
    case 'peer_activity': return Math.min(data.participantCount / 10, 1.0);
    case 'tier_competition': return Math.min(data.competitorCount / 5, 1.0);
    case 'location_activity': return Math.min(data.totalPeople / 20, 1.0);
    default: return 0.5;
  }
}

function createSocialProofEvent(proofType, data, calculateFactorFn) {
  const eventId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 30);

  try {
    db.prepare(`
      INSERT INTO fomo_events (id, event_type, event_data, social_proof_factor, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventId, proofType, JSON.stringify(data),
      calculateFactorFn(proofType, data), expiresAt.toISOString());

    logger.debug('Created social proof event', { eventId, proofType, data });
  } catch (error) {
    logger.error('Failed to create social proof event:', error);
  }
}

function processSocialProofBatch(activityType, activities) {
  if (activities.length === 0) return;

  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);

  const groups = new Map();
  activities.forEach(activity => {
    const key = `${activity.metadata.locationArea || 'general'}_${activity.metadata.jobId || 'all'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(activity);
  });

  groups.forEach((groupActivities, groupKey) => {
    const [locationArea, jobId] = groupKey.split('_');
    const tierCounts = new Map();

    groupActivities.forEach(activity => {
      const tier = activity.metadata.tier || 'bronze';
      tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
    });

    tierCounts.forEach((count, tier) => {
      const socialProofId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        db.prepare(`
          INSERT INTO fomo_social_proof
          (id, activity_type, job_id, location_area, tier_level, participant_count,
           anonymized_data, time_window_start, time_window_end)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          socialProofId, activityType,
          jobId === 'all' ? null : jobId,
          locationArea === 'general' ? null : locationArea,
          tier, count,
          JSON.stringify({ activityCount: count, timeRange: '1h', tier }),
          windowStart.toISOString(), now.toISOString()
        );
      } catch (error) {
        logger.error('Failed to create social proof entry:', error);
      }
    });
  });
}

module.exports = {
  updateSocialProofData, createSocialProofEvent, calculateSocialProofFactor, processSocialProofBatch
};
