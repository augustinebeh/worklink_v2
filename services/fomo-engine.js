/**
 * FOMO (Fear of Missing Out) Engine - Advanced Candidate Engagement System
 * Core engine — domain logic is in ./fomo/
 */

const { db } = require('../db');
const { createLogger } = require('../utils/structured-logger');

// Import sub-modules
const { calculateUrgencyScores, createUrgencyEvent } = require('./fomo/urgency-calculator');
const { updateSocialProofData, createSocialProofEvent, calculateSocialProofFactor, processSocialProofBatch } = require('./fomo/social-proof-generator');
const { processScarcityTriggers, calculateScarcityLevel } = require('./fomo/scarcity-processor');
const { checkStreakProtectionOpportunities } = require('./fomo/streak-protector');
const { generateFOMOMessage, getFOMOAction, processImmediateFOMO, isHighImpactActivity } = require('./fomo/fomo-messenger');

const logger = createLogger('fomo-engine');

class FOMAEngine {
  constructor() {
    this.activityBuffer = new Map();
    this.urgencyCache = new Map();
    this.socialProofCache = new Map();
    this.scarcityTriggers = new Set();

    this.initializeEngine();
    this.setupPeriodicTasks();
  }

  initializeEngine() {
    try {
      this.ensureTablesExist();
      this.loadActiveTriggers();
      this.startActivityMonitoring();
      logger.info('FOMO Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize FOMO Engine:', error);
    }
  }

  ensureTablesExist() {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_events (
          id TEXT PRIMARY KEY, candidate_id TEXT, event_type TEXT NOT NULL,
          event_data TEXT, urgency_score REAL DEFAULT 0,
          social_proof_factor REAL DEFAULT 0, scarcity_level REAL DEFAULT 0,
          trigger_sent BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_social_proof (
          id TEXT PRIMARY KEY, activity_type TEXT NOT NULL, job_id TEXT,
          location_area TEXT, tier_level TEXT, participant_count INTEGER DEFAULT 1,
          anonymized_data TEXT, time_window_start DATETIME, time_window_end DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.exec(`CREATE INDEX IF NOT EXISTS idx_fomo_social_time ON fomo_social_proof (time_window_start, time_window_end)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_fomo_social_area ON fomo_social_proof (location_area)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_fomo_social_job ON fomo_social_proof (job_id)`);

      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_urgency_config (
          id TEXT PRIMARY KEY, trigger_name TEXT NOT NULL UNIQUE,
          trigger_type TEXT NOT NULL, threshold_value REAL,
          urgency_multiplier REAL DEFAULT 1.0, message_template TEXT,
          active BOOLEAN DEFAULT TRUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS fomo_streak_protection (
          id TEXT PRIMARY KEY, candidate_id TEXT, streak_days INTEGER,
          risk_level TEXT, protection_offered BOOLEAN DEFAULT FALSE,
          protection_accepted BOOLEAN DEFAULT FALSE, protection_type TEXT,
          offer_expires_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      this.initializeDefaultTriggers();
      logger.info('FOMO Engine tables ensured');
    } catch (error) {
      logger.error('Failed to ensure FOMO tables:', error);
      throw error;
    }
  }

  initializeDefaultTriggers() {
    const defaultTriggers = [
      { id: 'job_slot_scarcity_high', trigger_name: 'High Job Slot Scarcity', trigger_type: 'job_slots', threshold_value: 0.8, urgency_multiplier: 2.0, message_template: 'Only {remaining_slots} spots left for {job_title}! Apply now before it fills up.', active: true },
      { id: 'peer_application_surge', trigger_name: 'Peer Application Surge', trigger_type: 'peer_activity', threshold_value: 5.0, urgency_multiplier: 1.5, message_template: '{peer_count} people in your area applied to jobs in the last hour. Don\'t miss out!', active: true },
      { id: 'time_window_closing', trigger_name: 'Application Window Closing', trigger_type: 'time_deadline', threshold_value: 2.0, urgency_multiplier: 1.8, message_template: 'Hurry! Applications for {job_title} close in {time_remaining}.', active: true },
      { id: 'tier_competition', trigger_name: 'Same-Tier Competition', trigger_type: 'tier_activity', threshold_value: 3.0, urgency_multiplier: 1.4, message_template: '{count} other {tier_name} workers are viewing this job. Apply first!', active: true }
    ];

    const insertTrigger = db.prepare(`
      INSERT OR IGNORE INTO fomo_urgency_config
      (id, trigger_name, trigger_type, threshold_value, urgency_multiplier, message_template, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    defaultTriggers.forEach(trigger => {
      insertTrigger.run(trigger.id, trigger.trigger_name, trigger.trigger_type, trigger.threshold_value, trigger.urgency_multiplier, trigger.message_template, trigger.active ? 1 : 0);
    });

    logger.info('Default FOMO triggers initialized');
  }

  loadActiveTriggers() {
    try {
      const triggers = db.prepare('SELECT * FROM fomo_urgency_config WHERE active = TRUE').all();
      this.activeTriggers = new Map();
      triggers.forEach(trigger => { this.activeTriggers.set(trigger.trigger_type, trigger); });
      logger.info(`Loaded ${triggers.length} active FOMO triggers`);
    } catch (error) {
      logger.error('Failed to load active triggers:', error);
    }
  }

  startActivityMonitoring() {
    setInterval(() => { this.processActivityBuffer(); }, 30000);
    setInterval(() => { this.cleanupExpiredEvents(); }, 300000);
    logger.info('FOMO activity monitoring started');
  }

  setupPeriodicTasks() {
    const boundCreateSocialProofEvent = (proofType, data) =>
      createSocialProofEvent(proofType, data, calculateSocialProofFactor);
    const boundCreateFOMOEvent = this.createFOMOEvent.bind(this);

    setInterval(() => { calculateUrgencyScores(createUrgencyEvent); }, 120000);
    setInterval(() => { updateSocialProofData(boundCreateSocialProofEvent); }, 60000);
    setInterval(() => { checkStreakProtectionOpportunities(boundCreateFOMOEvent, boundCreateSocialProofEvent); }, 600000);
    setInterval(() => { processScarcityTriggers(); }, 300000);
    logger.info('FOMO periodic tasks scheduled');
  }

  // ==================== ACTIVITY RECORDING ====================

  recordActivity(candidateId, activityType, metadata = {}) {
    const activityId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    if (!this.activityBuffer.has(activityType)) {
      this.activityBuffer.set(activityType, []);
    }

    this.activityBuffer.get(activityType).push({ id: activityId, candidateId, timestamp, metadata });

    if (isHighImpactActivity(activityType)) {
      processImmediateFOMO(candidateId, activityType, metadata, this.createFOMOEvent.bind(this));
    }

    logger.debug('Activity recorded', {
      candidateId, activityType, activityId, isHighImpact: isHighImpactActivity(activityType)
    });
  }

  processActivityBuffer() {
    try {
      let totalProcessed = 0;

      this.activityBuffer.forEach((activities, activityType) => {
        if (activities.length === 0) return;

        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < activities.length; i += batchSize) {
          batches.push(activities.slice(i, i + batchSize));
        }

        batches.forEach(batch => {
          processSocialProofBatch(activityType, batch);
          totalProcessed += batch.length;
        });

        this.activityBuffer.set(activityType, []);
      });

      if (totalProcessed > 0) {
        logger.info(`Processed ${totalProcessed} activities for FOMO triggers`);
      }
    } catch (error) {
      logger.error('Failed to process activity buffer:', error);
    }
  }

  // ==================== FOMO EVENT CREATION ====================

  createFOMOEvent(candidateId, eventType, eventData, options = {}) {
    const eventId = `fomo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = options.expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000);

    const urgencyScore = options.urgencyScore || this.calculateEventUrgency(eventType, eventData);
    const socialProofFactor_ = options.socialProofFactor || calculateSocialProofFactor(eventType, eventData);
    const scarcityLevel = options.scarcityLevel || calculateScarcityLevel(eventType, eventData);

    try {
      db.prepare(`
        INSERT INTO fomo_events
        (id, candidate_id, event_type, event_data, urgency_score, social_proof_factor,
         scarcity_level, trigger_sent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)
      `).run(eventId, candidateId, eventType, JSON.stringify(eventData),
        urgencyScore, socialProofFactor_, scarcityLevel, expiresAt.toISOString());

      logger.debug('Created FOMO event', {
        eventId, candidateId, eventType,
        urgencyScore: urgencyScore.toFixed(2),
        socialProofFactor: socialProofFactor_.toFixed(2),
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

  // ==================== PUBLIC API ====================

  getFOMOTriggers(candidateId, limit = 10) {
    try {
      const candidate = db.prepare(`
        SELECT *, CASE WHEN level >= 100 THEN 'mythic' WHEN level >= 75 THEN 'diamond'
          WHEN level >= 50 THEN 'platinum' WHEN level >= 25 THEN 'gold'
          WHEN level >= 10 THEN 'silver' ELSE 'bronze' END as tier_level
        FROM candidates WHERE id = ?
      `).get(candidateId);

      if (!candidate) {
        logger.warn('Candidate not found for FOMO triggers:', candidateId);
        return [];
      }

      const personalEvents = db.prepare(`
        SELECT * FROM fomo_events WHERE candidate_id = ?
          AND expires_at > datetime('now') AND trigger_sent = FALSE
        ORDER BY (urgency_score + social_proof_factor + scarcity_level) DESC LIMIT ?
      `).all(candidateId, Math.floor(limit / 2));

      const generalEvents = db.prepare(`
        SELECT * FROM fomo_events WHERE candidate_id IS NULL
          AND expires_at > datetime('now')
          AND (json_extract(event_data, '$.locationArea') = ?
            OR json_extract(event_data, '$.tierLevel') = ?
            OR event_type IN ('peer_activity', 'location_activity'))
        ORDER BY (urgency_score + social_proof_factor + scarcity_level) DESC LIMIT ?
      `).all(candidate.location_area, candidate.tier_level, Math.ceil(limit / 2));

      const allEvents = [...personalEvents, ...generalEvents]
        .sort((a, b) =>
          (b.urgency_score + b.social_proof_factor + b.scarcity_level) -
          (a.urgency_score + a.social_proof_factor + a.scarcity_level))
        .slice(0, limit);

      const eventIds = allEvents.map(e => e.id);
      if (eventIds.length > 0) this.markEventsAsSent(eventIds);

      return allEvents.map(event => this.formatFOMOEvent(event, candidate));
    } catch (error) {
      logger.error('Failed to get FOMO triggers:', error);
      return [];
    }
  }

  markEventsAsSent(eventIds) {
    try {
      const placeholders = eventIds.map(() => '?').join(',');
      db.prepare(`UPDATE fomo_events SET trigger_sent = TRUE WHERE id IN (${placeholders})`).run(...eventIds);
    } catch (error) {
      logger.error('Failed to mark events as sent:', error);
    }
  }

  formatFOMOEvent(event, candidate) {
    const eventData = JSON.parse(event.event_data || '{}');
    return {
      id: event.id, type: event.event_type,
      urgency: event.urgency_score, socialProof: event.social_proof_factor,
      scarcity: event.scarcity_level,
      message: generateFOMOMessage(event.event_type, eventData, candidate),
      action: getFOMOAction(event.event_type, eventData),
      expiresAt: event.expires_at, data: eventData
    };
  }

  cleanupExpiredEvents() {
    try {
      const result = db.prepare(`DELETE FROM fomo_events WHERE expires_at <= datetime('now')`).run();
      const socialProofResult = db.prepare(`DELETE FROM fomo_social_proof WHERE time_window_end <= datetime('now', '-24 hours')`).run();
      logger.debug('Cleaned up expired FOMO events', {
        eventsDeleted: result.changes, socialProofDeleted: socialProofResult.changes
      });
    } catch (error) {
      logger.error('Failed to cleanup expired events:', error);
    }
  }

  getFOMOStatistics() {
    try {
      return {
        totalEvents: db.prepare('SELECT COUNT(*) as count FROM fomo_events').get().count,
        activeEvents: db.prepare(`SELECT COUNT(*) as count FROM fomo_events WHERE expires_at > datetime('now')`).get().count,
        sentEvents: db.prepare(`SELECT COUNT(*) as count FROM fomo_events WHERE trigger_sent = TRUE`).get().count,
        eventsByType: db.prepare(`SELECT event_type, COUNT(*) as count FROM fomo_events GROUP BY event_type ORDER BY count DESC`).all(),
        avgUrgencyScore: db.prepare(`SELECT AVG(urgency_score) as avg_score FROM fomo_events WHERE expires_at > datetime('now')`).get().avg_score || 0,
        socialProofEntries: db.prepare('SELECT COUNT(*) as count FROM fomo_social_proof').get().count
      };
    } catch (error) {
      logger.error('Failed to get FOMO statistics:', error);
      return null;
    }
  }
}

module.exports = new FOMAEngine();
