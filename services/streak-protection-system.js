/**
 * Streak Protection System with FOMO Integration
 *
 * Advanced streak risk detection and protection mechanisms that leverage
 * FOMO psychology to maintain candidate engagement and prevent churn.
 *
 * Features:
 * - Predictive streak risk analysis
 * - FOMO-enhanced protection offers
 * - Peer milestone competitive notifications
 * - Streak recovery incentives
 * - Social proof of streak achievements
 *
 * Risk analysis logic: ./streak-protection/risk-analyzer.js
 * Milestone processing: ./streak-protection/milestone-processor.js
 */

const { db } = require('../db');
const { createLogger } = require('../utils/structured-logger');
const { formatXP, calculateLevel, getLevelTier } = require('../shared/utils/gamification');
const intervalRegistry = require('../utils/interval-registry');

const {
  calculateRiskFactors,
  calculateOverallRiskScore,
  predictStreakBreakTime,
  calculateStreakValue
} = require('./streak-protection/risk-analyzer');

const {
  processMilestoneAchievements,
  sendCompetitiveMilestoneAlerts
} = require('./streak-protection/milestone-processor');

const logger = createLogger('streak-protection');

class StreakProtectionSystem {
  constructor() {
    this.riskProfiles = new Map();
    this.protectionTokens = new Map();
    this.milestoneTrackers = new Map();

    // Evict in-memory caches to prevent unbounded growth
    const cacheEvictionTimer = setInterval(() => {
      if (this.riskProfiles.size > 1000) this.riskProfiles.clear();
      if (this.protectionTokens.size > 1000) this.protectionTokens.clear();
      if (this.milestoneTrackers.size > 1000) this.milestoneTrackers.clear();
    }, 600000); // Every 10 minutes
    intervalRegistry.register('streak-cache-eviction', cacheEvictionTimer, 'Streak protection cache eviction (10m)');

    this.initializeSystem();
    this.setupPeriodicChecks();
  }

  initializeSystem() {
    try {
      this.ensureTablesExist();
      this.loadActiveProtections();
      this.loadStreakMilestones();

      logger.info('Streak Protection System initialized');
    } catch (error) {
      logger.error('Failed to initialize Streak Protection System:', error);
    }
  }

  ensureTablesExist() {
    try {
      // Streak protection tokens/offers
      db.exec(`
        CREATE TABLE IF NOT EXISTS streak_protection_tokens (
          id TEXT PRIMARY KEY,
          candidate_id TEXT,
          token_type TEXT NOT NULL,
          streak_days INTEGER,
          risk_score REAL,
          offered_at DATETIME,
          expires_at DATETIME,
          used_at DATETIME,
          status TEXT DEFAULT 'active',
          fomo_trigger_data TEXT,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      // Streak risk analysis
      db.exec(`
        CREATE TABLE IF NOT EXISTS streak_risk_analysis (
          id TEXT PRIMARY KEY,
          candidate_id TEXT,
          analysis_date DATETIME,
          current_streak INTEGER,
          risk_score REAL,
          risk_factors TEXT,
          predicted_break_hours REAL,
          protection_recommended BOOLEAN,
          fomo_interventions TEXT,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      // Milestone achievements tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS streak_milestones (
          id TEXT PRIMARY KEY,
          candidate_id TEXT,
          milestone_type TEXT,
          milestone_value INTEGER,
          achieved_at DATETIME,
          celebrated BOOLEAN DEFAULT FALSE,
          social_proof_sent BOOLEAN DEFAULT FALSE,
          competitive_alert_sent BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      // Streak recovery tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS streak_recovery (
          id TEXT PRIMARY KEY,
          candidate_id TEXT,
          lost_streak INTEGER,
          recovery_started_at DATETIME,
          current_recovery_days INTEGER DEFAULT 0,
          motivation_type TEXT,
          fomo_messages_sent INTEGER DEFAULT 0,
          recovery_completed BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
      `);

      logger.info('Streak protection tables ensured');
    } catch (error) {
      logger.error('Failed to ensure streak protection tables:', error);
      throw error;
    }
  }

  loadActiveProtections() {
    try {
      const activeTokens = db.prepare(`
        SELECT * FROM streak_protection_tokens
        WHERE status = 'active'
          AND expires_at > datetime('now')
      `).all();

      this.activeProtections = new Map();
      activeTokens.forEach(token => {
        this.activeProtections.set(token.candidate_id, token);
      });

      logger.info(`Loaded ${activeTokens.length} active streak protection tokens`);
    } catch (error) {
      logger.error('Failed to load active protections:', error);
    }
  }

  loadStreakMilestones() {
    try {
      // Define milestone thresholds
      this.milestoneThresholds = [
        { type: 'daily', values: [3, 7, 14, 21, 30, 50, 75, 100, 200, 365] },
        { type: 'weekly', values: [1, 2, 4, 8, 12, 24, 48, 52] },
        { type: 'monthly', values: [1, 3, 6, 12, 24] }
      ];

      logger.info('Streak milestone thresholds loaded');
    } catch (error) {
      logger.error('Failed to load streak milestones:', error);
    }
  }

  setupPeriodicChecks() {
    // Check for streak risks every 15 minutes
    const riskAnalysisTimer = setInterval(() => {
      this.analyzeStreakRisks();
    }, 15 * 60 * 1000);
    intervalRegistry.register('streak-risk-analysis', riskAnalysisTimer, 'Streak risk analysis (15m)');

    // Process milestone achievements every hour
    const milestoneTimer = setInterval(() => {
      processMilestoneAchievements(this.milestoneThresholds);
    }, 60 * 60 * 1000);
    intervalRegistry.register('streak-milestone-processing', milestoneTimer, 'Streak milestone processing (1h)');

    // Clean up expired protections every 6 hours
    const cleanupTimer = setInterval(() => {
      this.cleanupExpiredProtections();
    }, 6 * 60 * 60 * 1000);
    intervalRegistry.register('streak-protection-cleanup', cleanupTimer, 'Streak expired protection cleanup (6h)');

    // Send competitive milestone alerts every 30 minutes
    const competitiveTimer = setInterval(() => {
      sendCompetitiveMilestoneAlerts();
    }, 30 * 60 * 1000);
    intervalRegistry.register('streak-competitive-alerts', competitiveTimer, 'Streak competitive milestone alerts (30m)');

    logger.info('Streak protection periodic checks scheduled');
  }

  // ==================== STREAK RISK ANALYSIS ====================

  async analyzeStreakRisks() {
    try {
      const candidatesAtRisk = db.prepare(`
        SELECT
          c.id, c.name, c.streak_days, c.streak_last_date, c.level, c.location_area,
          (julianday('now') - julianday(c.streak_last_date)) * 24 as hours_since_checkin,
          CASE
            WHEN c.level >= 100 THEN 'mythic'
            WHEN c.level >= 75 THEN 'diamond'
            WHEN c.level >= 50 THEN 'platinum'
            WHEN c.level >= 25 THEN 'gold'
            WHEN c.level >= 10 THEN 'silver'
            ELSE 'bronze'
          END as tier
        FROM candidates c
        WHERE c.status = 'active'
          AND c.streak_days >= 3
          AND hours_since_checkin > 12
          AND hours_since_checkin < 30
      `).all();

      for (const candidate of candidatesAtRisk) {
        await this.analyzeIndividualRisk(candidate);
      }

      logger.info(`Analyzed streak risks for ${candidatesAtRisk.length} candidates`);
    } catch (error) {
      logger.error('Failed to analyze streak risks:', error);
    }
  }

  async analyzeIndividualRisk(candidate) {
    try {
      const riskFactors = await calculateRiskFactors(candidate);
      const riskScore = calculateOverallRiskScore(riskFactors);
      const predictedBreakHours = predictStreakBreakTime(candidate, riskFactors);

      // Store risk analysis
      const analysisId = `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.prepare(`
        INSERT INTO streak_risk_analysis
        (id, candidate_id, analysis_date, current_streak, risk_score, risk_factors,
         predicted_break_hours, protection_recommended, fomo_interventions)
        VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)
      `).run(
        analysisId,
        candidate.id,
        candidate.streak_days,
        riskScore,
        JSON.stringify(riskFactors),
        predictedBreakHours,
        riskScore > 0.6,
        JSON.stringify(this.generateFOMOInterventions(candidate, riskFactors))
      );

      // Create protection offer if high risk
      if (riskScore > 0.6 && !this.activeProtections.has(candidate.id)) {
        await this.offerStreakProtection(candidate, riskScore, riskFactors);
      }

      // Send FOMO interventions based on risk level
      await this.sendFOMOInterventions(candidate, riskScore, riskFactors);

      logger.debug('Risk analysis completed', {
        candidateId: candidate.id,
        riskScore: riskScore.toFixed(2),
        predictedBreakHours: predictedBreakHours.toFixed(1)
      });
    } catch (error) {
      logger.error('Failed to analyze individual risk:', error);
    }
  }

  // ==================== PROTECTION OFFERS ====================

  async offerStreakProtection(candidate, riskScore, riskFactors) {
    try {
      const protectionType = this.selectProtectionType(candidate, riskScore);
      const tokenId = `prot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6); // 6 hours to accept

      // Create protection token
      db.prepare(`
        INSERT INTO streak_protection_tokens
        (id, candidate_id, token_type, streak_days, risk_score, offered_at, expires_at, fomo_trigger_data)
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?, ?)
      `).run(
        tokenId,
        candidate.id,
        protectionType.type,
        candidate.streak_days,
        riskScore,
        expiresAt.toISOString(),
        JSON.stringify({
          urgencyMessage: this.generateUrgencyMessage(candidate, riskScore),
          socialProof: this.generateSocialProof(candidate),
          scarcityFactor: this.calculateScarcityFactor(candidate)
        })
      );

      // Send FOMO-enhanced protection offer
      await this.sendProtectionOffer(candidate, protectionType, tokenId, riskScore);

      this.activeProtections.set(candidate.id, {
        id: tokenId,
        type: protectionType.type,
        offered_at: new Date().toISOString()
      });

      logger.debug('Offered streak protection', {
        candidateId: candidate.id,
        protectionType: protectionType.type,
        riskScore: riskScore.toFixed(2)
      });
    } catch (error) {
      logger.error('Failed to offer streak protection:', error);
    }
  }

  selectProtectionType(candidate, riskScore) {
    const protectionTypes = [
      {
        type: 'freeze_24h',
        name: '24-Hour Streak Freeze',
        cost: 0,
        description: 'Pause your streak timer for 24 hours',
        condition: (c, r) => r > 0.6 && c.streak_days >= 7
      },
      {
        type: 'grace_period',
        name: 'Grace Period Extension',
        cost: 0,
        description: 'Get 6 extra hours to check in',
        condition: (c, r) => r > 0.5 && c.streak_days >= 3
      },
      {
        type: 'auto_checkin',
        name: 'Emergency Auto Check-in',
        cost: 0,
        description: 'Automatic check-in if you forget',
        condition: (c, r) => r > 0.8 && c.streak_days >= 14
      }
    ];

    return protectionTypes.find(pt => pt.condition(candidate, riskScore)) || protectionTypes[1];
  }

  generateUrgencyMessage(candidate, riskScore) {
    const hoursLeft = Math.max(0, 24 - candidate.hours_since_checkin);

    if (riskScore > 0.8) {
      return `URGENT: Only ${hoursLeft.toFixed(1)} hours left to save your ${candidate.streak_days}-day streak!`;
    } else if (riskScore > 0.6) {
      return `Don't lose ${candidate.streak_days} days of progress! ${hoursLeft.toFixed(1)} hours remaining.`;
    } else {
      return `Protect your ${candidate.streak_days}-day streak! Check in within ${hoursLeft.toFixed(1)} hours.`;
    }
  }

  generateSocialProof(candidate) {
    return [
      `${Math.floor(Math.random() * 8) + 3} workers used streak protection this week`,
      `Don't be the only one to lose their streak today`,
      `Your peers at ${candidate.tier} level are protecting their progress`
    ][Math.floor(Math.random() * 3)];
  }

  calculateScarcityFactor(candidate) {
    const dailyProtections = Math.floor(Math.random() * 5) + 1;
    return `Only ${dailyProtections} protection offers available today`;
  }

  async sendProtectionOffer(candidate, protectionType, tokenId, riskScore) {
    try {
      const { notifyStreakRisk } = require('../websocket');

      notifyStreakRisk(candidate.id, {
        streakDays: candidate.streak_days,
        hoursRemaining: Math.max(0, 24 - candidate.hours_since_checkin),
        riskScore: riskScore,
        protectionOffer: {
          id: tokenId,
          type: protectionType.type,
          name: protectionType.name,
          description: protectionType.description
        },
        urgencyLevel: riskScore > 0.8 ? 'critical' : riskScore > 0.6 ? 'high' : 'medium'
      });

      logger.debug('Sent protection offer notification', {
        candidateId: candidate.id,
        tokenId
      });
    } catch (error) {
      logger.error('Failed to send protection offer notification:', error);
    }
  }

  // ==================== FOMO INTERVENTIONS ====================

  generateFOMOInterventions(candidate, riskFactors) {
    const interventions = [];

    // Time-based interventions
    if (riskFactors.timeRisk > 0.7) {
      interventions.push({
        type: 'urgency_alert',
        message: `\u23F0 Only ${Math.max(0, 24 - candidate.hours_since_checkin).toFixed(1)} hours left!`,
        priority: 'high'
      });
    }

    // Social proof interventions
    if (riskFactors.socialRisk > 0.3) {
      interventions.push({
        type: 'peer_comparison',
        message: `Your peers are maintaining their streaks - don't fall behind!`,
        priority: 'medium'
      });
    }

    // Loss aversion interventions
    if (candidate.streak_days >= 7) {
      const streakValue = calculateStreakValue(candidate.streak_days);
      interventions.push({
        type: 'loss_aversion',
        message: `You've invested ${candidate.streak_days} days building this streak. Don't lose it now!`,
        priority: 'high',
        value: streakValue
      });
    }

    return interventions;
  }

  async sendFOMOInterventions(candidate, riskScore, riskFactors) {
    try {
      if (riskScore < 0.4) return; // No intervention needed for low risk

      const interventions = this.generateFOMOInterventions(candidate, riskFactors);

      // Send the most appropriate intervention
      const highPriorityIntervention = interventions.find(i => i.priority === 'high');
      const intervention = highPriorityIntervention || interventions[0];

      if (intervention) {
        const { broadcastToCandidate, EventTypes } = require('../websocket');

        broadcastToCandidate(candidate.id, {
          type: EventTypes.FOMO_STREAK_RISK,
          intervention: intervention,
          riskLevel: riskScore > 0.8 ? 'critical' : riskScore > 0.6 ? 'high' : 'medium',
          streakDays: candidate.streak_days,
          hoursRemaining: Math.max(0, 24 - candidate.hours_since_checkin),
          timestamp: new Date().toISOString()
        });

        logger.debug('Sent FOMO intervention', {
          candidateId: candidate.id,
          interventionType: intervention.type,
          riskScore: riskScore.toFixed(2)
        });
      }
    } catch (error) {
      logger.error('Failed to send FOMO interventions:', error);
    }
  }

  // ==================== CLEANUP AND UTILITIES ====================

  cleanupExpiredProtections() {
    try {
      const result = db.prepare(`
        UPDATE streak_protection_tokens
        SET status = 'expired'
        WHERE expires_at <= datetime('now')
          AND status = 'active'
      `).run();

      // Remove from active protections map
      this.activeProtections.forEach((protection, candidateId) => {
        if (new Date(protection.offered_at) < new Date(Date.now() - 6 * 60 * 60 * 1000)) {
          this.activeProtections.delete(candidateId);
        }
      });

      logger.debug(`Expired ${result.changes} protection tokens`);
    } catch (error) {
      logger.error('Failed to cleanup expired protections:', error);
    }
  }

  // ==================== PUBLIC API ====================

  async getStreakProtectionData(candidateId) {
    try {
      const candidate = db.prepare(`
        SELECT *,
               (julianday('now') - julianday(streak_last_date)) * 24 as hours_since_checkin
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      if (!candidate) return null;

      const riskFactors = await calculateRiskFactors(candidate);
      const riskScore = calculateOverallRiskScore(riskFactors);

      const activeProtection = db.prepare(`
        SELECT * FROM streak_protection_tokens
        WHERE candidate_id = ? AND status = 'active' AND expires_at > datetime('now')
      `).get(candidateId);

      return {
        candidateId,
        streakDays: candidate.streak_days,
        hoursRemaining: Math.max(0, 24 - candidate.hours_since_checkin),
        riskScore: riskScore,
        riskLevel: riskScore > 0.8 ? 'critical' : riskScore > 0.6 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
        riskFactors: riskFactors,
        activeProtection: activeProtection,
        streakValue: calculateStreakValue(candidate.streak_days)
      };
    } catch (error) {
      logger.error('Failed to get streak protection data:', error);
      return null;
    }
  }

  async getStreakStatistics() {
    try {
      const stats = {
        totalCandidatesWithStreaks: db.prepare(`
          SELECT COUNT(*) as count FROM candidates WHERE streak_days > 0 AND status = 'active'
        `).get().count,

        averageStreak: db.prepare(`
          SELECT AVG(streak_days) as avg FROM candidates WHERE streak_days > 0 AND status = 'active'
        `).get().avg || 0,

        longestActiveStreak: db.prepare(`
          SELECT MAX(streak_days) as max FROM candidates WHERE streak_days > 0 AND status = 'active'
        `).get().max || 0,

        streaksAtRisk: db.prepare(`
          SELECT COUNT(*) as count FROM candidates
          WHERE streak_days >= 3 AND status = 'active'
            AND (julianday('now') - julianday(streak_last_date)) * 24 > 18
        `).get().count,

        protectionsOffered: db.prepare(`
          SELECT COUNT(*) as count FROM streak_protection_tokens
          WHERE offered_at > datetime('now', '-24 hours')
        `).get().count,

        protectionsUsed: db.prepare(`
          SELECT COUNT(*) as count FROM streak_protection_tokens
          WHERE used_at > datetime('now', '-24 hours')
        `).get().count
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get streak statistics:', error);
      return null;
    }
  }
}

module.exports = new StreakProtectionSystem();
