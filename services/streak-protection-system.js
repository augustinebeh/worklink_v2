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
 */

const { db } = require('../db');
const { createLogger } = require('../utils/structured-logger');
const { formatXP, calculateLevel, getLevelTier } = require('../shared/utils/gamification');

const logger = createLogger('streak-protection');

class StreakProtectionSystem {
  constructor() {
    this.riskProfiles = new Map();
    this.protectionTokens = new Map();
    this.milestoneTrackers = new Map();

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
    setInterval(() => {
      this.analyzeStreakRisks();
    }, 15 * 60 * 1000);

    // Process milestone achievements every hour
    setInterval(() => {
      this.processMilestoneAchievements();
    }, 60 * 60 * 1000);

    // Clean up expired protections every 6 hours
    setInterval(() => {
      this.cleanupExpiredProtections();
    }, 6 * 60 * 60 * 1000);

    // Send competitive milestone alerts every 30 minutes
    setInterval(() => {
      this.sendCompetitiveMilestoneAlerts();
    }, 30 * 60 * 1000);

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
      const riskFactors = await this.calculateRiskFactors(candidate);
      const riskScore = this.calculateOverallRiskScore(riskFactors);
      const predictedBreakHours = this.predictStreakBreakTime(candidate, riskFactors);

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

  async calculateRiskFactors(candidate) {
    const factors = {
      timeRisk: 0,          // How close to breaking
      patternRisk: 0,       // Historical pattern risk
      engagementRisk: 0,    // Recent engagement decline
      socialRisk: 0,        // Peer pressure/comparison
      valueRisk: 0          // Potential loss value
    };

    // Time risk (0-1): How close to the 24-hour deadline
    factors.timeRisk = Math.min(candidate.hours_since_checkin / 24, 1.0);

    // Pattern risk: Analyze historical check-in patterns
    const checkInPattern = await this.analyzeCheckInPattern(candidate.id);
    factors.patternRisk = checkInPattern.riskScore;

    // Engagement risk: Recent job applications, messages, etc.
    const engagementData = await this.analyzeRecentEngagement(candidate.id);
    factors.engagementRisk = engagementData.riskScore;

    // Social risk: How peers are performing
    const socialData = await this.analyzeSocialPressure(candidate);
    factors.socialRisk = socialData.riskScore;

    // Value risk: What they stand to lose
    factors.valueRisk = this.calculateStreakValue(candidate.streak_days) / 100;

    return factors;
  }

  async analyzeCheckInPattern(candidateId) {
    try {
      // Analyze last 14 days of check-in times
      const checkIns = db.prepare(`
        SELECT
          date(streak_last_date) as check_date,
          time(streak_last_date) as check_time,
          julianday('now') - julianday(streak_last_date) as days_ago
        FROM candidates
        WHERE id = ?
        ORDER BY streak_last_date DESC
        LIMIT 14
      `).all(candidateId);

      if (checkIns.length < 3) {
        return { riskScore: 0.3, pattern: 'insufficient_data' };
      }

      // Analyze check-in time variance
      const checkTimes = checkIns.map(ci => {
        const [hours, minutes] = ci.check_time.split(':').map(Number);
        return hours + minutes / 60;
      });

      const avgCheckTime = checkTimes.reduce((a, b) => a + b, 0) / checkTimes.length;
      const variance = checkTimes.reduce((acc, time) => acc + Math.pow(time - avgCheckTime, 2), 0) / checkTimes.length;

      // Higher variance = higher risk
      const patternRisk = Math.min(Math.sqrt(variance) / 6, 1.0); // Normalize by 6 hours

      return {
        riskScore: patternRisk,
        pattern: variance > 4 ? 'inconsistent' : 'consistent',
        avgCheckTime: avgCheckTime.toFixed(1),
        variance: variance.toFixed(2)
      };
    } catch (error) {
      logger.error('Failed to analyze check-in pattern:', error);
      return { riskScore: 0.3, pattern: 'error' };
    }
  }

  async analyzeRecentEngagement(candidateId) {
    try {
      const recentActivity = db.prepare(`
        SELECT
          COUNT(CASE WHEN d.created_at > datetime('now', '-7 days') THEN 1 END) as recent_applications,
          COUNT(CASE WHEN m.created_at > datetime('now', '-7 days') THEN 1 END) as recent_messages,
          AVG(CASE WHEN j.completed_at > datetime('now', '-14 days') THEN j.rating END) as recent_rating
        FROM candidates c
        LEFT JOIN deployments d ON c.id = d.candidate_id
        LEFT JOIN messages m ON c.id = m.candidate_id AND m.sender = 'candidate'
        LEFT JOIN (
          SELECT candidate_id, completed_at, rating FROM deployments WHERE status = 'completed'
        ) j ON c.id = j.candidate_id
        WHERE c.id = ?
      `).get(candidateId);

      // Calculate engagement decline risk
      let riskScore = 0;

      if (recentActivity.recent_applications === 0) riskScore += 0.3;
      if (recentActivity.recent_messages === 0) riskScore += 0.2;
      if (recentActivity.recent_rating && recentActivity.recent_rating < 4) riskScore += 0.2;

      return {
        riskScore: Math.min(riskScore, 1.0),
        recentApplications: recentActivity.recent_applications || 0,
        recentMessages: recentActivity.recent_messages || 0,
        recentRating: recentActivity.recent_rating || 'N/A'
      };
    } catch (error) {
      logger.error('Failed to analyze recent engagement:', error);
      return { riskScore: 0.2 };
    }
  }

  async analyzeSocialPressure(candidate) {
    try {
      // Find peers who are outperforming
      const peerComparison = db.prepare(`
        SELECT
          COUNT(*) as total_peers,
          COUNT(CASE WHEN streak_days > ? THEN 1 END) as outperforming_peers,
          AVG(streak_days) as avg_peer_streak,
          MAX(streak_days) as best_peer_streak
        FROM candidates
        WHERE status = 'active'
          AND location_area = ?
          AND level BETWEEN ? AND ?
          AND id != ?
      `).get(
        candidate.streak_days,
        candidate.location_area,
        candidate.level - 5,
        candidate.level + 5,
        candidate.id
      );

      let socialRisk = 0;
      if (peerComparison.outperforming_peers > 0) {
        socialRisk = Math.min(peerComparison.outperforming_peers / peerComparison.total_peers, 0.8);
      }

      return {
        riskScore: socialRisk,
        peerData: peerComparison
      };
    } catch (error) {
      logger.error('Failed to analyze social pressure:', error);
      return { riskScore: 0 };
    }
  }

  calculateOverallRiskScore(factors) {
    // Weighted combination of risk factors
    const weights = {
      timeRisk: 0.4,        // Most important: time urgency
      patternRisk: 0.2,     // Historical behavior
      engagementRisk: 0.2,  // Recent activity
      socialRisk: 0.1,      // Peer pressure
      valueRisk: 0.1        // Loss aversion
    };

    let totalScore = 0;
    Object.keys(weights).forEach(factor => {
      totalScore += (factors[factor] || 0) * weights[factor];
    });

    return Math.min(totalScore, 1.0);
  }

  predictStreakBreakTime(candidate, riskFactors) {
    // Predict when streak will break based on risk factors
    const baseTimeRemaining = 24 - candidate.hours_since_checkin;

    // Adjust based on risk factors
    const adjustmentFactor = 1 - (riskFactors.patternRisk * 0.5 + riskFactors.engagementRisk * 0.3);

    return Math.max(baseTimeRemaining * adjustmentFactor, 0);
  }

  calculateStreakValue(streakDays) {
    // Calculate the "value" of a streak (for loss aversion psychology)
    let value = streakDays * 10; // Base value

    // Bonus for milestone streaks
    if (streakDays >= 100) value += 500;
    else if (streakDays >= 50) value += 200;
    else if (streakDays >= 30) value += 100;
    else if (streakDays >= 14) value += 50;
    else if (streakDays >= 7) value += 20;

    return value;
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
    // Generate social proof messaging
    return [
      `${Math.floor(Math.random() * 8) + 3} workers used streak protection this week`,
      `Don't be the only one to lose their streak today`,
      `Your peers at ${candidate.tier} level are protecting their progress`
    ][Math.floor(Math.random() * 3)];
  }

  calculateScarcityFactor(candidate) {
    // Calculate scarcity messaging
    const dailyProtections = Math.floor(Math.random() * 5) + 1;
    return `Only ${dailyProtections} protection offers available today`;
  }

  async sendProtectionOffer(candidate, protectionType, tokenId, riskScore) {
    // This would integrate with the WebSocket system to send real-time offers
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

  // ==================== MILESTONE PROCESSING ====================

  async processMilestoneAchievements() {
    try {
      const recentAchievers = db.prepare(`
        SELECT
          c.id, c.name, c.streak_days, c.level, c.location_area,
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
          AND c.streak_days > 0
          AND datetime(c.updated_at) > datetime('now', '-2 hours')
      `).all();

      for (const candidate of recentAchievers) {
        await this.checkMilestoneAchievements(candidate);
      }

      logger.info(`Processed milestones for ${recentAchievers.length} candidates`);
    } catch (error) {
      logger.error('Failed to process milestone achievements:', error);
    }
  }

  async checkMilestoneAchievements(candidate) {
    try {
      // Check for milestone achievements
      const achievedMilestones = [];

      this.milestoneThresholds.forEach(category => {
        category.values.forEach(value => {
          if (this.isNewMilestone(candidate, category.type, value)) {
            achievedMilestones.push({
              type: category.type,
              value: value,
              candidate: candidate
            });
          }
        });
      });

      // Process each new milestone
      for (const milestone of achievedMilestones) {
        await this.processMilestone(milestone);
      }
    } catch (error) {
      logger.error('Failed to check milestone achievements:', error);
    }
  }

  isNewMilestone(candidate, type, value) {
    // Check if this is a new milestone achievement
    if (type === 'daily' && candidate.streak_days === value) return true;
    if (type === 'weekly' && candidate.streak_days === value * 7) return true;
    if (type === 'monthly' && candidate.streak_days === value * 30) return true;

    return false;
  }

  async processMilestone(milestone) {
    try {
      const milestoneId = `mile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Record milestone achievement
      db.prepare(`
        INSERT INTO streak_milestones
        (id, candidate_id, milestone_type, milestone_value, achieved_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).run(
        milestoneId,
        milestone.candidate.id,
        milestone.type,
        milestone.value,
        new Date().toISOString()
      );

      // Send celebration notification
      await this.sendMilestoneCelebration(milestone);

      // Create competitive alerts for peers
      await this.createCompetitiveMilestoneAlerts(milestone);

      logger.debug('Processed milestone', {
        candidateId: milestone.candidate.id,
        type: milestone.type,
        value: milestone.value
      });
    } catch (error) {
      logger.error('Failed to process milestone:', error);
    }
  }

  async sendMilestoneCelebration(milestone) {
    try {
      const { notifyAchievementUnlocked } = require('../websocket');

      const celebrationMessage = this.generateCelebrationMessage(milestone);

      notifyAchievementUnlocked(milestone.candidate.id, {
        id: `streak_milestone_${milestone.type}_${milestone.value}`,
        name: `${milestone.value}-${milestone.type} Streak Warrior`,
        description: celebrationMessage,
        type: 'streak_milestone',
        rarity: this.calculateMilestoneRarity(milestone),
        xp_reward: this.calculateMilestoneXP(milestone)
      });

      logger.debug('Sent milestone celebration', {
        candidateId: milestone.candidate.id,
        milestone: milestone
      });
    } catch (error) {
      logger.error('Failed to send milestone celebration:', error);
    }
  }

  generateCelebrationMessage(milestone) {
    const messages = {
      daily: [
        `🔥 Incredible! ${milestone.value} days of consistency!`,
        `🎉 ${milestone.value}-day streak achieved! You're unstoppable!`,
        `💪 ${milestone.value} days straight! Your dedication is inspiring!`
      ],
      weekly: [
        `🌟 ${milestone.value} weeks of perfect streaks! Amazing!`,
        `🚀 ${milestone.value} consecutive weeks! You're a legend!`,
        `👑 ${milestone.value} weeks of excellence! Keep dominating!`
      ],
      monthly: [
        `🏆 ${milestone.value} months of streaks! Absolutely legendary!`,
        `💎 ${milestone.value} months of consistency! Hall of fame material!`,
        `🦾 ${milestone.value} months strong! You're redefining dedication!`
      ]
    };

    const categoryMessages = messages[milestone.type] || [`Achievement: ${milestone.value} ${milestone.type}!`];
    return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
  }

  calculateMilestoneRarity(milestone) {
    if (milestone.type === 'monthly' && milestone.value >= 12) return 'legendary';
    if (milestone.type === 'daily' && milestone.value >= 365) return 'legendary';
    if (milestone.type === 'weekly' && milestone.value >= 52) return 'legendary';

    if (milestone.type === 'daily' && milestone.value >= 100) return 'epic';
    if (milestone.type === 'weekly' && milestone.value >= 12) return 'epic';
    if (milestone.type === 'monthly' && milestone.value >= 6) return 'epic';

    if (milestone.type === 'daily' && milestone.value >= 30) return 'rare';
    if (milestone.type === 'weekly' && milestone.value >= 4) return 'rare';
    if (milestone.type === 'monthly' && milestone.value >= 3) return 'rare';

    return 'common';
  }

  calculateMilestoneXP(milestone) {
    const baseXP = {
      daily: milestone.value * 50,
      weekly: milestone.value * 300,
      monthly: milestone.value * 1200
    };

    const rarityMultiplier = {
      common: 1,
      rare: 1.5,
      epic: 2.0,
      legendary: 3.0
    };

    const rarity = this.calculateMilestoneRarity(milestone);
    return Math.floor(baseXP[milestone.type] * rarityMultiplier[rarity]);
  }

  async createCompetitiveMilestoneAlerts(milestone) {
    try {
      // Find peers to notify about this achievement
      const peers = db.prepare(`
        SELECT id, name, streak_days, level
        FROM candidates
        WHERE status = 'active'
          AND location_area = ?
          AND level BETWEEN ? AND ?
          AND id != ?
          AND streak_days < ?
        LIMIT 10
      `).all(
        milestone.candidate.location_area,
        milestone.candidate.level - 10,
        milestone.candidate.level + 10,
        milestone.candidate.id,
        milestone.candidate.streak_days
      );

      // Send competitive alerts to peers
      const { notifyCompetitivePressure } = require('../websocket');

      peers.forEach(peer => {
        notifyCompetitivePressure(peer.id, {
          type: 'peer_milestone',
          achieverTier: milestone.candidate.tier,
          milestoneType: milestone.type,
          milestoneValue: milestone.value,
          streakGap: milestone.candidate.streak_days - peer.streak_days,
          motivationalMessage: this.generateCompetitiveMessage(milestone, peer)
        });
      });

      logger.debug('Created competitive milestone alerts', {
        achieverId: milestone.candidate.id,
        peerCount: peers.length,
        milestone: milestone
      });
    } catch (error) {
      logger.error('Failed to create competitive milestone alerts:', error);
    }
  }

  generateCompetitiveMessage(milestone, peer) {
    const gap = milestone.candidate.streak_days - peer.streak_days;

    if (gap > 50) {
      return `A peer just hit a ${milestone.value}-${milestone.type} milestone! They're ${gap} days ahead - time to catch up! 🏃‍♂️`;
    } else if (gap > 10) {
      return `Someone in your area achieved ${milestone.value} ${milestone.type}s! Close the ${gap}-day gap! 🎯`;
    } else {
      return `A nearby worker just hit ${milestone.value} ${milestone.type}s! You're only ${gap} days behind! 🔥`;
    }
  }

  // ==================== COMPETITIVE ALERTS ====================

  async sendCompetitiveMilestoneAlerts() {
    try {
      // Find recent milestone achievements that haven't triggered competitive alerts
      const recentMilestones = db.prepare(`
        SELECT sm.*, c.name, c.location_area, c.level, c.streak_days,
               CASE
                 WHEN c.level >= 100 THEN 'mythic'
                 WHEN c.level >= 75 THEN 'diamond'
                 WHEN c.level >= 50 THEN 'platinum'
                 WHEN c.level >= 25 THEN 'gold'
                 WHEN c.level >= 10 THEN 'silver'
                 ELSE 'bronze'
               END as tier
        FROM streak_milestones sm
        JOIN candidates c ON sm.candidate_id = c.id
        WHERE sm.achieved_at > datetime('now', '-2 hours')
          AND sm.competitive_alert_sent = FALSE
          AND c.status = 'active'
      `).all();

      for (const milestone of recentMilestones) {
        await this.sendDelayedCompetitiveAlert(milestone);

        // Mark as sent
        db.prepare(`
          UPDATE streak_milestones
          SET competitive_alert_sent = TRUE
          WHERE id = ?
        `).run(milestone.id);
      }

      logger.debug(`Sent competitive alerts for ${recentMilestones.length} milestones`);
    } catch (error) {
      logger.error('Failed to send competitive milestone alerts:', error);
    }
  }

  async sendDelayedCompetitiveAlert(milestone) {
    try {
      // Find candidates who might be motivated by this achievement
      const motivationTargets = db.prepare(`
        SELECT id, name, streak_days, level
        FROM candidates
        WHERE status = 'active'
          AND location_area = ?
          AND id != ?
          AND (
            streak_days BETWEEN ? AND ? OR
            level BETWEEN ? AND ?
          )
        LIMIT 15
      `).all(
        milestone.location_area,
        milestone.candidate_id,
        Math.max(0, milestone.streak_days - 20),
        milestone.streak_days + 10,
        milestone.level - 15,
        milestone.level + 15
      );

      const { broadcastToCandidate, EventTypes } = require('../websocket');

      motivationTargets.forEach(target => {
        const motivationMessage = this.generateDelayedMotivationMessage(milestone, target);

        broadcastToCandidate(target.id, {
          type: EventTypes.FOMO_PEER_ACTIVITY,
          subtype: 'milestone_motivation',
          message: motivationMessage,
          achieverTier: milestone.tier,
          milestoneData: {
            type: milestone.milestone_type,
            value: milestone.milestone_value,
            daysAhead: milestone.streak_days - target.streak_days
          },
          motivational: true,
          urgency: 'medium'
        });
      });

      logger.debug('Sent delayed competitive alert', {
        milestoneId: milestone.id,
        targetCount: motivationTargets.length
      });
    } catch (error) {
      logger.error('Failed to send delayed competitive alert:', error);
    }
  }

  generateDelayedMotivationMessage(milestone, target) {
    const gap = milestone.streak_days - target.streak_days;

    const messages = [
      `🏆 A ${milestone.tier} worker in your area just achieved their ${milestone.milestone_value}-${milestone.milestone_type} milestone!`,
      `💪 Someone nearby is dominating with ${milestone.streak_days} consecutive days!`,
      `🌟 Peer alert: Another worker just hit ${milestone.milestone_value} ${milestone.milestone_type}s of consistency!`,
      `🎯 Motivation boost: A colleague just reached ${milestone.streak_days} days straight!`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  // ==================== FOMO INTERVENTIONS ====================

  generateFOMOInterventions(candidate, riskFactors) {
    const interventions = [];

    // Time-based interventions
    if (riskFactors.timeRisk > 0.7) {
      interventions.push({
        type: 'urgency_alert',
        message: `⏰ Only ${Math.max(0, 24 - candidate.hours_since_checkin).toFixed(1)} hours left!`,
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
      const streakValue = this.calculateStreakValue(candidate.streak_days);
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

      const riskFactors = await this.calculateRiskFactors(candidate);
      const riskScore = this.calculateOverallRiskScore(riskFactors);

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
        streakValue: this.calculateStreakValue(candidate.streak_days)
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