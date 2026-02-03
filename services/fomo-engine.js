/**
 * FOMO (Fear of Missing Out) Engine - Advanced Candidate Engagement System
 *
 * Implements psychological triggers to increase candidate engagement and retention:
 * - Urgency: Time-sensitive opportunities and job slot scarcity
 * - Social Proof: Real-time activity showing peer engagement
 * - Scarcity: Limited availability and competitive dynamics
 * - Loss Aversion: Streak protection and opportunity costs
 *
 * Integrates with existing retention and gamification systems for maximum impact.
 */

const { db } = require('../db');
const { createLogger } = require('../utils/structured-logger');
const { formatXP, calculateLevel, getLevelTier } = require('../shared/utils/gamification');

const logger = createLogger('fomo-engine');

class FOMAEngine {
  constructor() {
    this.activityBuffer = new Map(); // Real-time activity buffering
    this.urgencyCache = new Map();   // Cache urgency calculations
    this.socialProofCache = new Map(); // Cache social proof data
    this.scarcityTriggers = new Set(); // Active scarcity triggers

    this.initializeEngine();
    this.setupPeriodicTasks();
  }

  initializeEngine() {
    try {
      // Initialize FOMO tracking tables if they don't exist
      this.ensureTablesExist();

      // Load existing scarcity triggers
      this.loadActiveTriggers();

      // Start activity monitoring
      this.startActivityMonitoring();

      logger.info('FOMO Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FOMO Engine:', error);
    }
  }

  ensureTablesExist() {
    try {
      // FOMO events tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_events (
          id TEXT PRIMARY KEY,
          candidate_id TEXT,
          event_type TEXT NOT NULL,
          event_data TEXT,
          urgency_score REAL DEFAULT 0,
          social_proof_factor REAL DEFAULT 0,
          scarcity_level REAL DEFAULT 0,
          trigger_sent BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      // Social proof activity aggregation
      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_social_proof (
          id TEXT PRIMARY KEY,
          activity_type TEXT NOT NULL,
          job_id TEXT,
          location_area TEXT,
          tier_level TEXT,
          participant_count INTEGER DEFAULT 1,
          anonymized_data TEXT,
          time_window_start DATETIME,
          time_window_end DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_fomo_social_time (time_window_start, time_window_end),
          INDEX idx_fomo_social_area (location_area),
          INDEX idx_fomo_social_job (job_id)
        )
      `);

      // Urgency triggers configuration
      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_urgency_config (
          id TEXT PRIMARY KEY,
          trigger_name TEXT NOT NULL UNIQUE,
          trigger_type TEXT NOT NULL,
          threshold_value REAL,
          urgency_multiplier REAL DEFAULT 1.0,
          message_template TEXT,
          active BOOLEAN DEFAULT TRUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Streak protection events
      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_streak_protection (
          id TEXT PRIMARY KEY,
          candidate_id TEXT,
          streak_days INTEGER,
          risk_level TEXT,
          protection_offered BOOLEAN DEFAULT FALSE,
          protection_accepted BOOLEAN DEFAULT FALSE,
          protection_type TEXT,
          offer_expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      // Initialize default urgency triggers
      this.initializeDefaultTriggers();

      logger.info('FOMO Engine tables ensured');
    } catch (error) {
      logger.error('Failed to ensure FOMO tables:', error);
      throw error;
    }
  }

  initializeDefaultTriggers() {
    const defaultTriggers = [
      {
        id: 'job_slot_scarcity_high',
        trigger_name: 'High Job Slot Scarcity',
        trigger_type: 'job_slots',
        threshold_value: 0.8, // When 80% of slots are filled
        urgency_multiplier: 2.0,
        message_template: 'Only {remaining_slots} spots left for {job_title}! Apply now before it fills up.',
        active: true
      },
      {
        id: 'peer_application_surge',
        trigger_name: 'Peer Application Surge',
        trigger_type: 'peer_activity',
        threshold_value: 5.0, // 5+ applications in recent period
        urgency_multiplier: 1.5,
        message_template: '{peer_count} people in your area applied to jobs in the last hour. Don\'t miss out!',
        active: true
      },
      {
        id: 'time_window_closing',
        trigger_name: 'Application Window Closing',
        trigger_type: 'time_deadline',
        threshold_value: 2.0, // 2 hours remaining
        urgency_multiplier: 1.8,
        message_template: 'Hurry! Applications for {job_title} close in {time_remaining}.',
        active: true
      },
      {
        id: 'tier_competition',
        trigger_name: 'Same-Tier Competition',
        trigger_type: 'tier_activity',
        threshold_value: 3.0, // 3+ same-tier applications
        urgency_multiplier: 1.4,
        message_template: '{count} other {tier_name} workers are viewing this job. Apply first!',
        active: true
      }
    ];

    const insertTrigger = db.prepare(`
      INSERT OR IGNORE INTO fomo_urgency_config
      (id, trigger_name, trigger_type, threshold_value, urgency_multiplier, message_template, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    defaultTriggers.forEach(trigger => {
      insertTrigger.run(
        trigger.id,
        trigger.trigger_name,
        trigger.trigger_type,
        trigger.threshold_value,
        trigger.urgency_multiplier,
        trigger.message_template,
        trigger.active
      );
    });

    logger.info('Default FOMO triggers initialized');
  }

  loadActiveTriggers() {
    try {
      const triggers = db.prepare(`
        SELECT * FROM fomo_urgency_config WHERE active = TRUE
      `).all();

      this.activeTriggers = new Map();
      triggers.forEach(trigger => {
        this.activeTriggers.set(trigger.trigger_type, trigger);
      });

      logger.info(`Loaded ${triggers.length} active FOMO triggers`);
    } catch (error) {
      logger.error('Failed to load active triggers:', error);
    }
  }

  startActivityMonitoring() {
    // Monitor real-time activity every 30 seconds
    setInterval(() => {
      this.processActivityBuffer();
    }, 30000);

    // Clean up expired events every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEvents();
    }, 300000);

    logger.info('FOMO activity monitoring started');
  }

  setupPeriodicTasks() {
    // Calculate urgency scores every 2 minutes
    setInterval(() => {
      this.calculateUrgencyScores();
    }, 120000);

    // Update social proof data every minute
    setInterval(() => {
      this.updateSocialProofData();
    }, 60000);

    // Check streak risks every 10 minutes
    setInterval(() => {
      this.checkStreakProtectionOpportunities();
    }, 600000);

    // Process scarcity triggers every 5 minutes
    setInterval(() => {
      this.processScarcityTriggers();
    }, 300000);

    logger.info('FOMO periodic tasks scheduled');
  }

  // ==================== REAL-TIME ACTIVITY MONITORING ====================

  recordActivity(candidateId, activityType, metadata = {}) {
    const activityId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Buffer activity for real-time processing
    if (!this.activityBuffer.has(activityType)) {
      this.activityBuffer.set(activityType, []);
    }

    this.activityBuffer.get(activityType).push({
      id: activityId,
      candidateId,
      timestamp,
      metadata
    });

    // Immediate FOMO check for high-impact activities
    if (this.isHighImpactActivity(activityType)) {
      this.processImmediateFOMO(candidateId, activityType, metadata);
    }

    logger.debug('Activity recorded', {
      candidateId,
      activityType,
      activityId,
      isHighImpact: this.isHighImpactActivity(activityType)
    });
  }

  isHighImpactActivity(activityType) {
    const highImpactTypes = [
      'job_application',
      'job_view',
      'level_up',
      'tier_promotion',
      'high_rating_received',
      'urgent_job_completed'
    ];
    return highImpactTypes.includes(activityType);
  }

  processActivityBuffer() {
    try {
      let totalProcessed = 0;

      this.activityBuffer.forEach((activities, activityType) => {
        if (activities.length === 0) return;

        // Process activities in batches
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < activities.length; i += batchSize) {
          batches.push(activities.slice(i, i + batchSize));
        }

        batches.forEach(batch => {
          this.processSocialProofBatch(activityType, batch);
          totalProcessed += batch.length;
        });

        // Clear processed activities
        this.activityBuffer.set(activityType, []);
      });

      if (totalProcessed > 0) {
        logger.info(`Processed ${totalProcessed} activities for FOMO triggers`);
      }
    } catch (error) {
      logger.error('Failed to process activity buffer:', error);
    }
  }

  processSocialProofBatch(activityType, activities) {
    if (activities.length === 0) return;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour window

    // Group activities by location area and job
    const groups = new Map();
    activities.forEach(activity => {
      const key = `${activity.metadata.locationArea || 'general'}_${activity.metadata.jobId || 'all'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(activity);
    });

    // Create social proof entries for each group
    groups.forEach((groupActivities, groupKey) => {
      const [locationArea, jobId] = groupKey.split('_');
      const tierCounts = new Map();

      // Aggregate by tier for anonymization
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
            socialProofId,
            activityType,
            jobId === 'all' ? null : jobId,
            locationArea === 'general' ? null : locationArea,
            tier,
            count,
            JSON.stringify({
              activityCount: count,
              timeRange: '1h',
              tier: tier
            }),
            windowStart.toISOString(),
            now.toISOString()
          );
        } catch (error) {
          logger.error('Failed to create social proof entry:', error);
        }
      });
    });
  }

  // ==================== URGENCY CALCULATION ====================

  calculateUrgencyScores() {
    try {
      // Get all open jobs with applications
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
        const urgencyScore = this.calculateJobUrgency(job);

        if (urgencyScore > 0.6) {
          this.createUrgencyEvent(job, urgencyScore);
        }
      });

      logger.info(`Calculated urgency for ${jobs.length} jobs`);
    } catch (error) {
      logger.error('Failed to calculate urgency scores:', error);
    }
  }

  calculateJobUrgency(job) {
    let urgencyScore = 0;

    // Slot scarcity factor (0-1)
    const slotScarcity = job.fill_ratio || 0;
    urgencyScore += slotScarcity * 0.4;

    // Time deadline factor (0-1)
    urgencyScore += (job.time_urgency || 0) * 0.3;

    // Application velocity factor
    const recentApplications = this.getRecentApplicationCount(job.id, 60); // last hour
    const applicationVelocity = Math.min(recentApplications / 10, 1.0);
    urgencyScore += applicationVelocity * 0.2;

    // Pay rate premium factor
    const avgPayRate = this.getAveragePayRate(job.location_area);
    const payPremium = Math.max(0, (job.pay_rate - avgPayRate) / avgPayRate);
    urgencyScore += Math.min(payPremium, 0.2) * 0.1;

    return Math.min(urgencyScore, 1.0);
  }

  getRecentApplicationCount(jobId, minutesAgo) {
    try {
      const result = db.prepare(`
        SELECT COUNT(*) as count
        FROM deployments
        WHERE job_id = ?
          AND created_at > datetime('now', '-' || ? || ' minutes')
      `).get(jobId, minutesAgo);

      return result.count || 0;
    } catch (error) {
      logger.error('Failed to get recent application count:', error);
      return 0;
    }
  }

  getAveragePayRate(locationArea) {
    try {
      const result = db.prepare(`
        SELECT AVG(pay_rate) as avg_rate
        FROM jobs
        WHERE location_area = ?
          AND created_at > datetime('now', '-30 days')
          AND pay_rate > 0
      `).get(locationArea);

      return result.avg_rate || 20; // Default fallback
    } catch (error) {
      logger.error('Failed to get average pay rate:', error);
      return 20;
    }
  }

  createUrgencyEvent(job, urgencyScore) {
    const eventId = `urg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // Events expire in 2 hours

    try {
      db.prepare(`
        INSERT INTO fomo_events
        (id, event_type, event_data, urgency_score, expires_at)
        VALUES (?, 'job_urgency', ?, ?, ?)
      `).run(
        eventId,
        JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          fillRatio: job.fill_ratio,
          timeUrgency: job.time_urgency,
          remainingSlots: job.total_slots - job.filled_slots,
          payRate: job.pay_rate,
          locationArea: job.location_area
        }),
        urgencyScore,
        expiresAt.toISOString()
      );

      logger.debug('Created urgency event', {
        eventId,
        jobId: job.id,
        urgencyScore: urgencyScore.toFixed(2)
      });
    } catch (error) {
      logger.error('Failed to create urgency event:', error);
    }
  }

  // ==================== SOCIAL PROOF GENERATION ====================

  updateSocialProofData() {
    try {
      // Generate peer activity messages
      this.generatePeerActivityProof();

      // Generate tier competition messages
      this.generateTierCompetitionProof();

      // Generate location-based activity proof
      this.generateLocationActivityProof();

      logger.debug('Social proof data updated');
    } catch (error) {
      logger.error('Failed to update social proof data:', error);
    }
  }

  generatePeerActivityProof() {
    const timeWindow = 60; // minutes

    const activities = db.prepare(`
      SELECT
        sp.location_area,
        sp.tier_level,
        SUM(sp.participant_count) as total_participants,
        COUNT(DISTINCT sp.job_id) as unique_jobs,
        sp.activity_type
      FROM fomo_social_proof sp
      WHERE sp.time_window_end > datetime('now', '-' || ? || ' minutes')
        AND sp.activity_type IN ('job_application', 'job_view')
        AND sp.location_area IS NOT NULL
      GROUP BY sp.location_area, sp.tier_level, sp.activity_type
      HAVING total_participants >= 3
      ORDER BY total_participants DESC
    `).all(timeWindow);

    activities.forEach(activity => {
      this.createSocialProofEvent('peer_activity', {
        locationArea: activity.location_area,
        tierLevel: activity.tier_level,
        participantCount: activity.total_participants,
        uniqueJobs: activity.unique_jobs,
        activityType: activity.activity_type,
        timeWindow: `${timeWindow}m`
      });
    });
  }

  generateTierCompetitionProof() {
    const jobs = db.prepare(`
      SELECT
        j.id as job_id,
        j.title,
        j.location_area,
        c.tier_level,
        COUNT(d.id) as applications_count
      FROM jobs j
      JOIN deployments d ON j.id = d.job_id
      JOIN (
        SELECT id,
               CASE
                 WHEN level >= 100 THEN 'mythic'
                 WHEN level >= 75 THEN 'diamond'
                 WHEN level >= 50 THEN 'platinum'
                 WHEN level >= 25 THEN 'gold'
                 WHEN level >= 10 THEN 'silver'
                 ELSE 'bronze'
               END as tier_level
        FROM candidates
      ) c ON d.candidate_id = c.id
      WHERE j.status = 'open'
        AND d.created_at > datetime('now', '-2 hours')
      GROUP BY j.id, c.tier_level
      HAVING applications_count >= 2
      ORDER BY applications_count DESC
    `).all();

    jobs.forEach(job => {
      this.createSocialProofEvent('tier_competition', {
        jobId: job.job_id,
        jobTitle: job.title,
        locationArea: job.location_area,
        tierLevel: job.tier_level,
        competitorCount: job.applications_count
      });
    });
  }

  generateLocationActivityProof() {
    const locationActivity = db.prepare(`
      SELECT
        sp.location_area,
        COUNT(DISTINCT sp.id) as activity_events,
        SUM(sp.participant_count) as total_people,
        COUNT(DISTINCT sp.job_id) as unique_jobs,
        AVG(sp.participant_count) as avg_participation
      FROM fomo_social_proof sp
      WHERE sp.time_window_end > datetime('now', '-90 minutes')
        AND sp.location_area IS NOT NULL
      GROUP BY sp.location_area
      HAVING total_people >= 5
      ORDER BY total_people DESC
    `).all();

    locationActivity.forEach(location => {
      this.createSocialProofEvent('location_activity', {
        locationArea: location.location_area,
        totalPeople: location.total_people,
        uniqueJobs: location.unique_jobs,
        activityLevel: location.avg_participation > 3 ? 'high' : 'medium'
      });
    });
  }

  createSocialProofEvent(proofType, data) {
    const eventId = `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Social proof expires in 30 minutes

    try {
      db.prepare(`
        INSERT INTO fomo_events
        (id, event_type, event_data, social_proof_factor, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        proofType,
        JSON.stringify(data),
        this.calculateSocialProofFactor(proofType, data),
        expiresAt.toISOString()
      );

      logger.debug('Created social proof event', {
        eventId,
        proofType,
        data: data
      });
    } catch (error) {
      logger.error('Failed to create social proof event:', error);
    }
  }

  calculateSocialProofFactor(proofType, data) {
    switch (proofType) {
      case 'peer_activity':
        return Math.min(data.participantCount / 10, 1.0);
      case 'tier_competition':
        return Math.min(data.competitorCount / 5, 1.0);
      case 'location_activity':
        return Math.min(data.totalPeople / 20, 1.0);
      default:
        return 0.5;
    }
  }

  // ==================== STREAK PROTECTION ====================

  checkStreakProtectionOpportunities() {
    try {
      // Find candidates with streaks at risk
      const atRiskCandidates = db.prepare(`
        SELECT
          id, name, streak_days, streak_last_date, level,
          (julianday('now') - julianday(streak_last_date)) * 24 as hours_since_checkin
        FROM candidates
        WHERE status = 'active'
          AND streak_days >= 3
          AND hours_since_checkin > 18
          AND hours_since_checkin < 30
      `).all();

      atRiskCandidates.forEach(candidate => {
        this.createStreakProtectionEvent(candidate);
      });

      // Find candidates who achieved new milestones (for competitive FOMO)
      const recentAchievers = db.prepare(`
        SELECT
          c.id, c.name, c.level, c.streak_days,
          CASE
            WHEN c.level >= 100 THEN 'mythic'
            WHEN c.level >= 75 THEN 'diamond'
            WHEN c.level >= 50 THEN 'platinum'
            WHEN c.level >= 25 THEN 'gold'
            WHEN c.level >= 10 THEN 'silver'
            ELSE 'bronze'
          END as tier_level
        FROM candidates c
        WHERE (c.streak_days % 7 = 0 AND c.streak_days >= 7) -- Weekly milestones
           OR (c.level % 5 = 0 AND c.level >= 5)             -- Level milestones
           OR datetime(c.updated_at) > datetime('now', '-6 hours')
      `).all();

      this.createPeerMilestoneEvents(recentAchievers);

      logger.info(`Processed streak protection for ${atRiskCandidates.length} candidates`);
    } catch (error) {
      logger.error('Failed to check streak protection opportunities:', error);
    }
  }

  createStreakProtectionEvent(candidate) {
    const protectionId = `prot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offerExpiresAt = new Date();
    offerExpiresAt.setHours(offerExpiresAt.getHours() + 6); // 6 hours to use protection

    const riskLevel = this.calculateStreakRisk(candidate.hours_since_checkin, candidate.streak_days);

    try {
      db.prepare(`
        INSERT INTO fomo_streak_protection
        (id, candidate_id, streak_days, risk_level, protection_offered, offer_expires_at)
        VALUES (?, ?, ?, ?, TRUE, ?)
      `).run(
        protectionId,
        candidate.id,
        candidate.streak_days,
        riskLevel,
        offerExpiresAt.toISOString()
      );

      // Create corresponding FOMO event
      this.createFOMOEvent(candidate.id, 'streak_protection', {
        streakDays: candidate.streak_days,
        riskLevel: riskLevel,
        hoursRemaining: Math.max(0, 24 - candidate.hours_since_checkin),
        protectionId: protectionId
      });

      logger.debug('Created streak protection event', {
        candidateId: candidate.id,
        streakDays: candidate.streak_days,
        riskLevel
      });
    } catch (error) {
      logger.error('Failed to create streak protection event:', error);
    }
  }

  calculateStreakRisk(hoursSinceCheckin, streakDays) {
    if (hoursSinceCheckin > 23) return 'critical';
    if (hoursSinceCheckin > 20) return 'high';
    if (hoursSinceCheckin > 18) return 'medium';
    return 'low';
  }

  createPeerMilestoneEvents(achievers) {
    if (achievers.length === 0) return;

    // Group by tier for targeted messaging
    const tierGroups = new Map();
    achievers.forEach(achiever => {
      if (!tierGroups.has(achiever.tier_level)) {
        tierGroups.set(achiever.tier_level, []);
      }
      tierGroups.get(achiever.tier_level).push(achiever);
    });

    tierGroups.forEach((tierAchievers, tier) => {
      this.createSocialProofEvent('peer_milestones', {
        tierLevel: tier,
        achieverCount: tierAchievers.length,
        milestoneTypes: this.categorizeMilestones(tierAchievers),
        competitiveMessage: true
      });
    });
  }

  categorizeMilestones(achievers) {
    const milestones = {
      streaks: 0,
      levelUps: 0,
      tierPromotions: 0
    };

    achievers.forEach(achiever => {
      if (achiever.streak_days % 7 === 0) milestones.streaks++;
      if (achiever.level % 5 === 0) milestones.levelUps++;
      // Tier promotions would need additional logic to detect recent changes
    });

    return milestones;
  }

  // ==================== SCARCITY TRIGGERS ====================

  processScarcityTriggers() {
    try {
      // Job slot scarcity
      this.processJobSlotScarcity();

      // Time-limited opportunities
      this.processTimeLimitedOpportunities();

      // High-demand skill scarcity
      this.processSkillDemandScarcity();

      logger.debug('Processed scarcity triggers');
    } catch (error) {
      logger.error('Failed to process scarcity triggers:', error);
    }
  }

  processJobSlotScarcity() {
    const scarcityJobs = db.prepare(`
      SELECT j.*,
             (j.filled_slots * 1.0 / j.total_slots) as fill_ratio,
             (j.total_slots - j.filled_slots) as remaining_slots
      FROM jobs j
      WHERE j.status = 'open'
        AND j.filled_slots < j.total_slots
        AND (j.filled_slots * 1.0 / j.total_slots) >= 0.6
      ORDER BY fill_ratio DESC
    `).all();

    scarcityJobs.forEach(job => {
      const scarcityLevel = this.calculateScarcityLevel(job.fill_ratio, job.remaining_slots);

      if (scarcityLevel > 0.5) {
        this.createScarcityEvent('job_slot_scarcity', {
          jobId: job.id,
          jobTitle: job.title,
          remainingSlots: job.remaining_slots,
          fillRatio: job.fill_ratio,
          scarcityLevel: scarcityLevel,
          urgentMessage: scarcityLevel > 0.8
        });
      }
    });
  }

  processTimeLimitedOpportunities() {
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
      const timeScarcity = this.calculateTimeScarcity(job.hours_remaining);

      if (timeScarcity > 0.4) {
        this.createScarcityEvent('time_limited', {
          jobId: job.id,
          jobTitle: job.title,
          hoursRemaining: job.hours_remaining,
          timeScarcity: timeScarcity,
          deadlineApproaching: timeScarcity > 0.7
        });
      }
    });
  }

  processSkillDemandScarcity() {
    // Analyze skills that are in high demand but low supply
    const skillDemand = db.prepare(`
      SELECT
        j.required_skills,
        COUNT(j.id) as open_jobs,
        COUNT(DISTINCT d.candidate_id) as unique_applicants,
        (COUNT(j.id) * 1.0 / COUNT(DISTINCT d.candidate_id)) as demand_ratio
      FROM jobs j
      LEFT JOIN deployments d ON j.id = d.job_id
      WHERE j.status = 'open'
        AND j.required_skills IS NOT NULL
        AND j.created_at > datetime('now', '-7 days')
      GROUP BY j.required_skills
      HAVING open_jobs >= 3 AND demand_ratio > 2.0
      ORDER BY demand_ratio DESC
    `).all();

    skillDemand.forEach(skill => {
      this.createScarcityEvent('skill_demand', {
        requiredSkills: skill.required_skills,
        openJobs: skill.open_jobs,
        demandRatio: skill.demand_ratio,
        competitiveAdvantage: true
      });
    });
  }

  calculateScarcityLevel(fillRatio, remainingSlots) {
    let scarcity = fillRatio; // Base scarcity from fill ratio

    // Boost scarcity for very few remaining slots
    if (remainingSlots <= 1) scarcity += 0.3;
    else if (remainingSlots <= 2) scarcity += 0.2;
    else if (remainingSlots <= 3) scarcity += 0.1;

    return Math.min(scarcity, 1.0);
  }

  calculateTimeScarcity(hoursRemaining) {
    if (hoursRemaining <= 1) return 1.0;
    if (hoursRemaining <= 2) return 0.8;
    if (hoursRemaining <= 4) return 0.6;
    if (hoursRemaining <= 8) return 0.4;
    return 0.2;
  }

  createScarcityEvent(scarcityType, data) {
    const eventId = `scar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date();

    // Different expiration times based on scarcity type
    switch (scarcityType) {
      case 'job_slot_scarcity':
        expiresAt.setHours(expiresAt.getHours() + 1);
        break;
      case 'time_limited':
        expiresAt.setMinutes(expiresAt.getMinutes() + 30);
        break;
      case 'skill_demand':
        expiresAt.setHours(expiresAt.getHours() + 4);
        break;
    }

    try {
      db.prepare(`
        INSERT INTO fomo_events
        (id, event_type, event_data, scarcity_level, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        eventId,
        scarcityType,
        JSON.stringify(data),
        data.scarcityLevel || data.timeScarcity || 0.7,
        expiresAt.toISOString()
      );

      logger.debug('Created scarcity event', {
        eventId,
        scarcityType,
        data: data
      });
    } catch (error) {
      logger.error('Failed to create scarcity event:', error);
    }
  }

  // ==================== FOMO EVENT CREATION ====================

  createFOMOEvent(candidateId, eventType, eventData, options = {}) {
    const eventId = `fomo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = options.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000); // Default 2 hours

    const urgencyScore = options.urgencyScore || this.calculateEventUrgency(eventType, eventData);
    const socialProofFactor = options.socialProofFactor || this.calculateSocialProofFactor(eventType, eventData);
    const scarcityLevel = options.scarcityLevel || this.calculateScarcityLevel(eventType, eventData);

    try {
      db.prepare(`
        INSERT INTO fomo_events
        (id, candidate_id, event_type, event_data, urgency_score, social_proof_factor,
         scarcity_level, trigger_sent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)
      `).run(
        eventId,
        candidateId,
        eventType,
        JSON.stringify(eventData),
        urgencyScore,
        socialProofFactor,
        scarcityLevel,
        expiresAt.toISOString()
      );

      logger.debug('Created FOMO event', {
        eventId,
        candidateId,
        eventType,
        urgencyScore: urgencyScore.toFixed(2),
        socialProofFactor: socialProofFactor.toFixed(2),
        scarcityLevel: scarcityLevel.toFixed(2)
      });

      return eventId;
    } catch (error) {
      logger.error('Failed to create FOMO event:', error);
      return null;
    }
  }

  calculateEventUrgency(eventType, eventData) {
    switch (eventType) {
      case 'streak_protection':
        return Math.min((24 - (eventData.hoursRemaining || 12)) / 24, 1.0);
      case 'job_urgency':
        return eventData.urgencyScore || 0.5;
      default:
        return 0.3;
    }
  }

  // ==================== PUBLIC API METHODS ====================

  /**
   * Get FOMO triggers for a specific candidate
   * Returns personalized FOMO events based on candidate's context
   */
  getFOMOTriggers(candidateId, limit = 10) {
    try {
      const candidate = db.prepare(`
        SELECT *,
               CASE
                 WHEN level >= 100 THEN 'mythic'
                 WHEN level >= 75 THEN 'diamond'
                 WHEN level >= 50 THEN 'platinum'
                 WHEN level >= 25 THEN 'gold'
                 WHEN level >= 10 THEN 'silver'
                 ELSE 'bronze'
               END as tier_level
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      if (!candidate) {
        logger.warn('Candidate not found for FOMO triggers:', candidateId);
        return [];
      }

      // Get personalized FOMO events
      const personalEvents = db.prepare(`
        SELECT * FROM fomo_events
        WHERE candidate_id = ?
          AND expires_at > datetime('now')
          AND trigger_sent = FALSE
        ORDER BY (urgency_score + social_proof_factor + scarcity_level) DESC
        LIMIT ?
      `).all(candidateId, Math.floor(limit / 2));

      // Get general FOMO events relevant to candidate's context
      const generalEvents = db.prepare(`
        SELECT * FROM fomo_events
        WHERE candidate_id IS NULL
          AND expires_at > datetime('now')
          AND (
            json_extract(event_data, '$.locationArea') = ? OR
            json_extract(event_data, '$.tierLevel') = ? OR
            event_type IN ('peer_activity', 'location_activity')
          )
        ORDER BY (urgency_score + social_proof_factor + scarcity_level) DESC
        LIMIT ?
      `).all(candidate.location_area, candidate.tier_level, Math.ceil(limit / 2));

      const allEvents = [...personalEvents, ...generalEvents]
        .sort((a, b) =>
          (b.urgency_score + b.social_proof_factor + b.scarcity_level) -
          (a.urgency_score + a.social_proof_factor + a.scarcity_level)
        )
        .slice(0, limit);

      // Mark events as sent
      const eventIds = allEvents.map(e => e.id);
      if (eventIds.length > 0) {
        this.markEventsAsSent(eventIds);
      }

      // Format events for client consumption
      return allEvents.map(event => this.formatFOMOEvent(event, candidate));
    } catch (error) {
      logger.error('Failed to get FOMO triggers:', error);
      return [];
    }
  }

  markEventsAsSent(eventIds) {
    try {
      const placeholders = eventIds.map(() => '?').join(',');
      db.prepare(`
        UPDATE fomo_events
        SET trigger_sent = TRUE
        WHERE id IN (${placeholders})
      `).run(...eventIds);
    } catch (error) {
      logger.error('Failed to mark events as sent:', error);
    }
  }

  formatFOMOEvent(event, candidate) {
    const eventData = JSON.parse(event.event_data || '{}');

    return {
      id: event.id,
      type: event.event_type,
      urgency: event.urgency_score,
      socialProof: event.social_proof_factor,
      scarcity: event.scarcity_level,
      message: this.generateFOMOMessage(event.event_type, eventData, candidate),
      action: this.getFOMOAction(event.event_type, eventData),
      expiresAt: event.expires_at,
      data: eventData
    };
  }

  generateFOMOMessage(eventType, eventData, candidate) {
    const templates = {
      job_urgency: [
        `🔥 Only ${eventData.remainingSlots} spots left for "${eventData.jobTitle}"! Apply now before it fills up.`,
        `⚡ ${eventData.remainingSlots} workers needed for "${eventData.jobTitle}" - don't miss out!`,
        `🎯 Almost full! "${eventData.jobTitle}" has just ${eventData.remainingSlots} spots remaining.`
      ],

      peer_activity: [
        `👥 ${eventData.participantCount} people in your area applied to jobs in the last hour!`,
        `🏃‍♂️ Your peers are staying active - ${eventData.participantCount} recent applications near you.`,
        `🌟 ${eventData.participantCount} workers just like you grabbed opportunities. Your turn?`
      ],

      tier_competition: [
        `🥇 ${eventData.competitorCount} other ${eventData.tierLevel} workers are viewing "${eventData.jobTitle}". Apply first!`,
        `⚔️ Competition alert! ${eventData.competitorCount} ${eventData.tierLevel}-tier candidates applied to "${eventData.jobTitle}".`,
        `🚀 Be faster! ${eventData.competitorCount} workers at your level are after this job too.`
      ],

      streak_protection: [
        `🔥 Don't lose your ${eventData.streakDays}-day streak! Check in within ${eventData.hoursRemaining} hours.`,
        `⚠️ Streak alert! Your ${eventData.streakDays}-day streak expires in ${eventData.hoursRemaining} hours.`,
        `💪 Protect your momentum! ${eventData.streakDays} days of consistency shouldn't go to waste.`
      ],

      time_limited: [
        `⏰ Hurry! Applications for "${eventData.jobTitle}" close in ${eventData.hoursRemaining} hours.`,
        `🚨 Last chance! "${eventData.jobTitle}" deadline in ${eventData.hoursRemaining} hours.`,
        `⏳ Time running out! ${eventData.hoursRemaining}h left to apply for "${eventData.jobTitle}".`
      ]
    };

    const messageOptions = templates[eventType] || [`New opportunity: ${eventType}`];
    return messageOptions[Math.floor(Math.random() * messageOptions.length)];
  }

  getFOMOAction(eventType, eventData) {
    const actions = {
      job_urgency: { type: 'view_job', jobId: eventData.jobId },
      peer_activity: { type: 'browse_jobs' },
      tier_competition: { type: 'view_job', jobId: eventData.jobId },
      streak_protection: { type: 'quick_checkin' },
      time_limited: { type: 'view_job', jobId: eventData.jobId },
      skill_demand: { type: 'browse_jobs', filter: 'skills' }
    };

    return actions[eventType] || { type: 'browse_jobs' };
  }

  /**
   * Process immediate FOMO triggers for high-impact activities
   */
  processImmediateFOMO(candidateId, activityType, metadata) {
    try {
      // Record activity for other candidates to see
      this.recordActivity(candidateId, activityType, metadata);

      // Generate immediate competitive pressure
      if (activityType === 'job_application' && metadata.jobId) {
        this.triggerCompetitivePressure(metadata.jobId, candidateId);
      }

      // Generate immediate social proof
      if (activityType === 'level_up') {
        this.triggerPeerCompetitionAlert(candidateId, metadata);
      }

      logger.debug('Processed immediate FOMO', {
        candidateId,
        activityType,
        metadata
      });
    } catch (error) {
      logger.error('Failed to process immediate FOMO:', error);
    }
  }

  triggerCompetitivePressure(jobId, applicantId) {
    // Notify other candidates viewing this job about the new application
    const viewingCandidates = this.getCandidatesViewingJob(jobId);

    viewingCandidates.forEach(candidateId => {
      if (candidateId !== applicantId) {
        this.createFOMOEvent(candidateId, 'competitive_pressure', {
          jobId: jobId,
          recentApplications: 1,
          message: 'Someone just applied to this job you\'re viewing!'
        });
      }
    });
  }

  triggerPeerCompetitionAlert(leveledUpCandidateId, levelData) {
    // Find peers at similar level and create competitive alerts
    const peers = db.prepare(`
      SELECT id FROM candidates
      WHERE status = 'active'
        AND id != ?
        AND level BETWEEN ? AND ?
        AND location_area = (
          SELECT location_area FROM candidates WHERE id = ?
        )
    `).all(
      leveledUpCandidateId,
      levelData.newLevel - 2,
      levelData.newLevel + 2,
      leveledUpCandidateId
    );

    peers.forEach(peer => {
      this.createFOMOEvent(peer.id, 'peer_level_up', {
        peerLevel: levelData.newLevel,
        competitiveMessage: true
      });
    });
  }

  getCandidatesViewingJob(jobId) {
    // This would integrate with real-time activity tracking
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Clean up expired FOMO events
   */
  cleanupExpiredEvents() {
    try {
      const result = db.prepare(`
        DELETE FROM fomo_events
        WHERE expires_at <= datetime('now')
      `).run();

      const socialProofResult = db.prepare(`
        DELETE FROM fomo_social_proof
        WHERE time_window_end <= datetime('now', '-24 hours')
      `).run();

      logger.debug('Cleaned up expired FOMO events', {
        eventsDeleted: result.changes,
        socialProofDeleted: socialProofResult.changes
      });
    } catch (error) {
      logger.error('Failed to cleanup expired events:', error);
    }
  }

  /**
   * Get FOMO statistics for monitoring and optimization
   */
  getFOMOStatistics() {
    try {
      const stats = {
        totalEvents: db.prepare('SELECT COUNT(*) as count FROM fomo_events').get().count,
        activeEvents: db.prepare(`
          SELECT COUNT(*) as count FROM fomo_events
          WHERE expires_at > datetime('now')
        `).get().count,
        sentEvents: db.prepare(`
          SELECT COUNT(*) as count FROM fomo_events
          WHERE trigger_sent = TRUE
        `).get().count,
        eventsByType: db.prepare(`
          SELECT event_type, COUNT(*) as count
          FROM fomo_events
          GROUP BY event_type
          ORDER BY count DESC
        `).all(),
        avgUrgencyScore: db.prepare(`
          SELECT AVG(urgency_score) as avg_score
          FROM fomo_events
          WHERE expires_at > datetime('now')
        `).get().avg_score || 0,
        socialProofEntries: db.prepare('SELECT COUNT(*) as count FROM fomo_social_proof').get().count
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get FOMO statistics:', error);
      return null;
    }
  }
}

module.exports = new FOMAEngine();