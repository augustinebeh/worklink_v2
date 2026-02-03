const webpush = require('web-push');
const { db } = require('../db');

// Lazy-loaded FOMO engine integration
let fomoEngine = null;
function getFOMOEngine() {
  if (!fomoEngine) {
    try {
      fomoEngine = require('./fomo-engine');
    } catch (e) {
      console.log('FOMO engine not loaded:', e.message);
    }
  }
  return fomoEngine;
}

// Lazy-loaded streak protection system
let streakProtection = null;
function getStreakProtection() {
  if (!streakProtection) {
    try {
      streakProtection = require('./streak-protection-system');
    } catch (e) {
      console.log('Streak protection system not loaded:', e.message);
    }
  }
  return streakProtection;
}

class RetentionNotificationService {
  constructor() {
    this.setupVapid();
    this.initializeScheduler();
  }

  setupVapid() {
    try {
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_EMAIL || 'mailto:notifications@worklink.sg',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        console.log('✅ VAPID configured for push notifications');
      } else {
        console.log('⚠️  VAPID keys not configured - push notifications will be queued');
      }
    } catch (error) {
      console.log('⚠️  VAPID setup failed:', error.message);
      console.log('   Push notifications will be queued instead of sent');
    }
  }

  initializeScheduler() {
    // Run retention checks every hour
    setInterval(() => this.checkRetentionTriggers(), 60 * 60 * 1000);

    // Run FOMO-enhanced checks every 15 minutes
    setInterval(() => this.checkFOMOTriggers(), 15 * 60 * 1000);

    // Run immediate checks
    this.checkRetentionTriggers();
    this.checkFOMOTriggers();
  }

  async checkRetentionTriggers() {
    try {
      console.log('🔍 Checking retention triggers...');

      await Promise.all([
        this.checkInactiveUsers(),
        this.checkStreakRisks(),
        this.checkPaydayReminders(),
        this.checkWeatherOpportunities(),
        this.checkPeerAchievements()
      ]);
    } catch (error) {
      console.error('Error checking retention triggers:', error);
    }
  }

  async checkFOMOTriggers() {
    try {
      console.log('🎯 Checking FOMO triggers...');

      await Promise.all([
        this.checkJobSlotScarcity(),
        this.checkTimeLimitedOpportunities(),
        this.checkPeerActivitySurges(),
        this.checkCompetitivePressure(),
        this.checkStreakProtectionOpportunities(),
        this.checkTierCompetitionAlerts()
      ]);
    } catch (error) {
      console.error('Error checking FOMO triggers:', error);
    }
  }

  async checkInactiveUsers() {
    const query = `
      SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth,
             c.last_seen as last_activity,
             COUNT(j.id) as nearby_jobs
      FROM candidates c
      LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
      LEFT JOIN jobs j ON j.created_at > datetime('now', '-24 hours')
                      AND j.status = 'open'
      WHERE c.status = 'active'
        AND ps.subscription_endpoint IS NOT NULL
        AND datetime(c.last_seen) < datetime('now', '-3 days')
      GROUP BY c.id
      HAVING nearby_jobs > 0
    `;

    const inactiveUsers = db.prepare(query).all();

    for (const user of inactiveUsers) {
      if (this.shouldSendNotification(user.id, 'inactive_3_days')) {
        await this.sendNotification(user, {
          title: "💼 Jobs waiting for you!",
          body: `${user.name}, ${user.nearby_jobs} new jobs posted near you while you were away`,
          icon: '/icons/icon-192x192.png',
          data: {
            type: 'inactive_user',
            url: '/jobs',
            userId: user.id
          }
        });

        this.markNotificationSent(user.id, 'inactive_3_days');
      }
    }
  }

  async checkStreakRisks() {
    // Get users whose streaks are at risk (haven't checked in for 18+ hours)
    const query = `
      SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth,
             c.streak_days, c.streak_last_date,
             (julianday('now') - julianday(c.streak_last_date)) * 24 as hours_since_checkin
      FROM candidates c
      LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
      WHERE c.status = 'active'
        AND c.streak_days > 0
        AND ps.subscription_endpoint IS NOT NULL
        AND hours_since_checkin > 18
        AND hours_since_checkin < 24
    `;

    const atRiskUsers = db.prepare(query).all();

    for (const user of atRiskUsers) {
      if (this.shouldSendNotification(user.id, 'streak_risk')) {
        const hoursLeft = Math.max(0, 24 - user.hours_since_checkin);

        await this.sendNotification(user, {
          title: "🔥 Streak Alert!",
          body: `Don't lose your ${user.streak_days}-day streak! Check in within ${Math.round(hoursLeft)} hours`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: {
            type: 'streak_risk',
            url: '/',
            userId: user.id,
            streakDays: user.streak_days
          },
          actions: [
            { action: 'checkin', title: 'Quick Check-in', icon: '/icons/checkin-icon.png' },
            { action: 'protect', title: 'Use Freeze Token', icon: '/icons/protect-icon.png' }
          ]
        });

        this.markNotificationSent(user.id, 'streak_risk');
      }
    }
  }

  async checkPaydayReminders() {
    const query = `
      SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth,
             p.total_amount, p.created_at as payment_date,
             date(p.created_at, '+2 days') as expected_arrival
      FROM candidates c
      LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
      LEFT JOIN payments p ON c.id = p.candidate_id
      WHERE c.status = 'active'
        AND ps.subscription_endpoint IS NOT NULL
        AND p.status = 'confirmed'
        AND date('now') = date(p.created_at, '+1 day')
        AND p.total_amount > 0
    `;

    const paydayUsers = db.prepare(query).all();

    for (const user of paydayUsers) {
      if (this.shouldSendNotification(user.id, 'payday_reminder')) {
        await this.sendNotification(user, {
          title: "💰 Payment Update",
          body: `Your $${user.total_amount.toFixed(2)} payment is processing - should arrive tomorrow!`,
          icon: '/icons/icon-192x192.png',
          data: {
            type: 'payday_reminder',
            url: '/wallet',
            userId: user.id,
            amount: user.total_amount
          }
        });

        this.markNotificationSent(user.id, 'payday_reminder');
      }
    }
  }

  async checkWeatherOpportunities() {
    // Simplified weather check - in production, integrate with weather API
    const currentHour = new Date().getHours();
    const isGoodWeatherTime = currentHour >= 7 && currentHour <= 9; // Morning check

    if (!isGoodWeatherTime) return;

    const query = `
      SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth,
             COUNT(j.id) as outdoor_jobs
      FROM candidates c
      LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
      LEFT JOIN jobs j ON j.created_at > datetime('now', '-24 hours')
                      AND j.status = 'open'
                      AND (j.title LIKE '%outdoor%' OR j.title LIKE '%event%' OR j.title LIKE '%festival%')
      WHERE c.status = 'active'
        AND ps.subscription_endpoint IS NOT NULL
      GROUP BY c.id
      HAVING outdoor_jobs > 2
    `;

    const weatherUsers = db.prepare(query).all();

    for (const user of weatherUsers) {
      if (this.shouldSendNotification(user.id, 'weather_opportunity')) {
        await this.sendNotification(user, {
          title: "☀️ Perfect Weather Alert!",
          body: `Great weather = more outdoor events! ${user.outdoor_jobs} posted near you today`,
          icon: '/icons/icon-192x192.png',
          data: {
            type: 'weather_opportunity',
            url: '/jobs?filter=outdoor',
            userId: user.id
          }
        });

        this.markNotificationSent(user.id, 'weather_opportunity');
      }
    }
  }

  async checkPeerAchievements() {
    const query = `
      SELECT DISTINCT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth,
             peer_achievements.achievement_count
      FROM candidates c
      LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
      LEFT JOIN (
        SELECT c2.id as peer_id,
               COUNT(*) as achievement_count
        FROM candidates c2
        LEFT JOIN candidate_achievements ca ON c2.id = ca.candidate_id
        WHERE ca.unlocked_at > datetime('now', '-6 hours')
        GROUP BY c2.id
        HAVING achievement_count > 0
      ) peer_achievements ON peer_achievements.peer_id != c.id
      WHERE c.status = 'active'
        AND ps.subscription_endpoint IS NOT NULL
        AND peer_achievements.achievement_count > 0
    `;

    const peerUsers = db.prepare(query).all();

    for (const user of peerUsers) {
      if (this.shouldSendNotification(user.id, 'peer_achievement')) {
        await this.sendNotification(user, {
          title: "👋 Don't get left behind!",
          body: `${user.achievement_count} workers in your area just leveled up. Your turn?`,
          icon: '/icons/icon-192x192.png',
          data: {
            type: 'peer_achievement',
            url: '/achievements',
            userId: user.id
          }
        });

        this.markNotificationSent(user.id, 'peer_achievement');
      }
    }
  }

  async sendNotification(user, payload) {
    try {
      const subscription = {
        endpoint: user.subscription_endpoint,
        keys: {
          p256dh: user.subscription_p256dh,
          auth: user.subscription_auth
        }
      };

      await webpush.sendNotification(subscription, JSON.stringify(payload));

      // Log successful notification
      this.logNotification(user.id, payload.data.type, 'sent');

      console.log(`✅ Sent ${payload.data.type} notification to ${user.name}`);
    } catch (error) {
      console.error(`❌ Failed to send notification to ${user.name}:`, error);

      // Remove invalid subscription
      if (error.statusCode === 410) {
        this.removeInvalidSubscription(user.id);
      }
    }
  }

  shouldSendNotification(userId, type) {
    // Check if we've already sent this type of notification recently
    const query = `
      SELECT COUNT(*) as count
      FROM notification_log
      WHERE candidate_id = ?
        AND notification_type = ?
        AND created_at > datetime('now', '-24 hours')
    `;

    const result = db.prepare(query).get(userId, type);
    return result.count === 0;
  }

  markNotificationSent(userId, type) {
    const query = `
      INSERT INTO notification_log (candidate_id, notification_type, status, created_at)
      VALUES (?, ?, 'sent', datetime('now'))
    `;

    try {
      db.prepare(query).run(userId, type);
    } catch (error) {
      console.error('Error marking notification as sent:', error);
    }
  }

  logNotification(userId, type, status) {
    this.markNotificationSent(userId, type);
  }

  removeInvalidSubscription(userId) {
    const query = `DELETE FROM push_subscriptions WHERE candidate_id = ?`;
    try {
      db.prepare(query).run(userId);
      console.log(`🗑️  Removed invalid subscription for user ${userId}`);
    } catch (error) {
      console.error('Error removing invalid subscription:', error);
    }
  }

  // Method to manually trigger specific notification types (for testing)
  async triggerNotification(userId, type) {
    const user = db.prepare(`
      SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth
      FROM candidates c
      LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
      WHERE c.id = ?
    `).get(userId);

    if (!user || !user.subscription_endpoint) {
      throw new Error('User not found or no push subscription');
    }

    switch (type) {
      case 'streak_risk':
        await this.sendNotification(user, {
          title: "🔥 Test Streak Alert!",
          body: `Don't lose your ${user.streak_days || 5}-day streak! Check in now`,
          data: { type: 'streak_risk', url: '/', userId: user.id }
        });
        break;

      case 'job_alert':
        await this.sendNotification(user, {
          title: "💼 Test Job Alert!",
          body: "New high-paying job posted near you!",
          data: { type: 'job_alert', url: '/jobs', userId: user.id }
        });
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }

  // ==================== FOMO TRIGGER METHODS ====================

  async checkJobSlotScarcity() {
    try {
      // Find jobs with high slot fill rates that create scarcity
      const scarcityJobs = db.prepare(`
        SELECT j.*,
               (j.filled_slots * 1.0 / j.total_slots) as fill_ratio,
               (j.total_slots - j.filled_slots) as remaining_slots,
               COUNT(d.id) as recent_applications
        FROM jobs j
        LEFT JOIN deployments d ON j.id = d.job_id AND d.created_at > datetime('now', '-2 hours')
        WHERE j.status = 'open'
          AND j.filled_slots < j.total_slots
          AND (j.filled_slots * 1.0 / j.total_slots) >= 0.6
        GROUP BY j.id
        ORDER BY fill_ratio DESC, recent_applications DESC
        LIMIT 10
      `).all();

      for (const job of scarcityJobs) {
        await this.sendJobScarcityAlerts(job);
      }

      console.log(`📊 Processed ${scarcityJobs.length} jobs with slot scarcity`);
    } catch (error) {
      console.error('Error checking job slot scarcity:', error);
    }
  }

  async sendJobScarcityAlerts(job) {
    try {
      // Find candidates who might be interested in this job
      const relevantCandidates = db.prepare(`
        SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth
        FROM candidates c
        LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
        WHERE c.status = 'active'
          AND c.location_area = ?
          AND ps.subscription_endpoint IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM deployments d WHERE d.job_id = ? AND d.candidate_id = c.id
          )
      `).all(job.location_area, job.id);

      const urgencyMessage = this.generateScarcityMessage(job);

      for (const candidate of relevantCandidates) {
        if (this.shouldSendNotification(candidate.id, `job_scarcity_${job.id}`)) {
          await this.sendNotification(candidate, {
            title: "🔥 Slots Filling Fast!",
            body: urgencyMessage,
            icon: '/icons/icon-192x192.png',
            data: {
              type: 'job_scarcity',
              url: `/jobs/${job.id}`,
              userId: candidate.id,
              jobId: job.id,
              remainingSlots: job.remaining_slots,
              fillRatio: job.fill_ratio
            },
            actions: [
              { action: 'view_job', title: 'View Job', icon: '/icons/job-icon.png' },
              { action: 'apply_now', title: 'Apply Now!', icon: '/icons/apply-icon.png' }
            ]
          });

          this.markNotificationSent(candidate.id, `job_scarcity_${job.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to send job scarcity alerts:', error);
    }
  }

  generateScarcityMessage(job) {
    const messages = [
      `Only ${job.remaining_slots} spots left for "${job.title}"! Apply now before it fills up.`,
      `⚡ Almost full! "${job.title}" has just ${job.remaining_slots} openings remaining.`,
      `🎯 ${job.remaining_slots} workers needed for "${job.title}" - don't miss out!`,
      `🏃‍♂️ Hurry! "${job.title}" is ${Math.round(job.fill_ratio * 100)}% full with only ${job.remaining_slots} spots left!`
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  async checkTimeLimitedOpportunities() {
    try {
      // Find jobs with approaching deadlines
      const urgentJobs = db.prepare(`
        SELECT j.*,
               ROUND((julianday(j.application_deadline) - julianday('now')) * 24, 1) as hours_remaining
        FROM jobs j
        WHERE j.status = 'open'
          AND datetime(j.application_deadline) > datetime('now')
          AND datetime(j.application_deadline) <= datetime('now', '+8 hours')
          AND j.filled_slots < j.total_slots
        ORDER BY j.application_deadline ASC
      `).all();

      for (const job of urgentJobs) {
        await this.sendTimeUrgencyAlerts(job);
      }

      console.log(`⏰ Processed ${urgentJobs.length} time-limited opportunities`);
    } catch (error) {
      console.error('Error checking time-limited opportunities:', error);
    }
  }

  async sendTimeUrgencyAlerts(job) {
    try {
      const relevantCandidates = db.prepare(`
        SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth
        FROM candidates c
        LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
        WHERE c.status = 'active'
          AND c.location_area = ?
          AND ps.subscription_endpoint IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM deployments d WHERE d.job_id = ? AND d.candidate_id = c.id
          )
      `).all(job.location_area, job.id);

      for (const candidate of relevantCandidates) {
        if (this.shouldSendNotification(candidate.id, `time_urgent_${job.id}`)) {
          const urgencyLevel = job.hours_remaining <= 2 ? 'URGENT' : 'HURRY';
          const timeText = job.hours_remaining < 1 ? `${Math.round(job.hours_remaining * 60)} minutes` : `${job.hours_remaining} hours`;

          await this.sendNotification(candidate, {
            title: `${urgencyLevel}: Deadline Approaching!`,
            body: `Applications for "${job.title}" close in ${timeText}!`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/urgent-badge.png',
            data: {
              type: 'time_urgent',
              url: `/jobs/${job.id}`,
              userId: candidate.id,
              jobId: job.id,
              hoursRemaining: job.hours_remaining
            },
            actions: [
              { action: 'apply_now', title: 'Apply Now!', icon: '/icons/apply-icon.png' }
            ]
          });

          this.markNotificationSent(candidate.id, `time_urgent_${job.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to send time urgency alerts:', error);
    }
  }

  async checkPeerActivitySurges() {
    try {
      // Analyze recent peer activity to create social proof
      const activitySurges = db.prepare(`
        SELECT
          c.location_area,
          CASE
            WHEN c.level >= 100 THEN 'mythic'
            WHEN c.level >= 75 THEN 'diamond'
            WHEN c.level >= 50 THEN 'platinum'
            WHEN c.level >= 25 THEN 'gold'
            WHEN c.level >= 10 THEN 'silver'
            ELSE 'bronze'
          END as tier_level,
          COUNT(d.id) as recent_applications,
          COUNT(DISTINCT d.candidate_id) as active_candidates
        FROM deployments d
        JOIN candidates c ON d.candidate_id = c.id
        WHERE d.created_at > datetime('now', '-2 hours')
          AND c.status = 'active'
        GROUP BY c.location_area, tier_level
        HAVING recent_applications >= 5
        ORDER BY recent_applications DESC
      `).all();

      for (const surge of activitySurges) {
        await this.sendPeerActivityAlerts(surge);
      }

      console.log(`👥 Processed ${activitySurges.length} peer activity surges`);
    } catch (error) {
      console.error('Error checking peer activity surges:', error);
    }
  }

  async sendPeerActivityAlerts(surge) {
    try {
      // Find candidates in the same area and tier who haven't been active recently
      const inactiveCandidates = db.prepare(`
        SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth
        FROM candidates c
        LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
        WHERE c.status = 'active'
          AND c.location_area = ?
          AND CASE
                WHEN c.level >= 100 THEN 'mythic'
                WHEN c.level >= 75 THEN 'diamond'
                WHEN c.level >= 50 THEN 'platinum'
                WHEN c.level >= 25 THEN 'gold'
                WHEN c.level >= 10 THEN 'silver'
                ELSE 'bronze'
              END = ?
          AND ps.subscription_endpoint IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM deployments d
            WHERE d.candidate_id = c.id AND d.created_at > datetime('now', '-4 hours')
          )
        LIMIT 10
      `).all(surge.location_area, surge.tier_level);

      for (const candidate of inactiveCandidates) {
        if (this.shouldSendNotification(candidate.id, 'peer_activity_surge')) {
          await this.sendNotification(candidate, {
            title: "👋 Don't get left behind!",
            body: `${surge.recent_applications} workers in your area applied to jobs recently. Your turn?`,
            icon: '/icons/icon-192x192.png',
            data: {
              type: 'peer_activity',
              url: '/jobs',
              userId: candidate.id,
              peerCount: surge.recent_applications,
              tierLevel: surge.tier_level
            }
          });

          this.markNotificationSent(candidate.id, 'peer_activity_surge');
        }
      }
    } catch (error) {
      console.error('Failed to send peer activity alerts:', error);
    }
  }

  async checkCompetitivePressure() {
    try {
      // Find jobs with multiple recent applications to create competitive pressure
      const competitiveJobs = db.prepare(`
        SELECT j.*, COUNT(d.id) as recent_applications
        FROM jobs j
        JOIN deployments d ON j.id = d.job_id
        WHERE j.status = 'open'
          AND d.created_at > datetime('now', '-1 hour')
        GROUP BY j.id
        HAVING recent_applications >= 2
        ORDER BY recent_applications DESC
        LIMIT 5
      `).all();

      for (const job of competitiveJobs) {
        await this.sendCompetitivePressureAlerts(job);
      }

      console.log(`⚔️ Processed ${competitiveJobs.length} competitive job opportunities`);
    } catch (error) {
      console.error('Error checking competitive pressure:', error);
    }
  }

  async sendCompetitivePressureAlerts(job) {
    try {
      // Find candidates who viewed this job but haven't applied
      const viewedButNotApplied = db.prepare(`
        SELECT DISTINCT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth
        FROM candidates c
        LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
        WHERE c.status = 'active'
          AND c.location_area = ?
          AND ps.subscription_endpoint IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM deployments d WHERE d.job_id = ? AND d.candidate_id = c.id
          )
        LIMIT 15
      `).all(job.location_area, job.id);

      for (const candidate of viewedButNotApplied) {
        if (this.shouldSendNotification(candidate.id, `competitive_${job.id}`)) {
          await this.sendNotification(candidate, {
            title: "🏃‍♂️ Others are applying fast!",
            body: `${job.recent_applications} people just applied to "${job.title}". Don't miss out!`,
            icon: '/icons/icon-192x192.png',
            data: {
              type: 'competitive_pressure',
              url: `/jobs/${job.id}`,
              userId: candidate.id,
              jobId: job.id,
              recentApplications: job.recent_applications
            },
            actions: [
              { action: 'apply_now', title: 'Apply Now!', icon: '/icons/apply-icon.png' }
            ]
          });

          this.markNotificationSent(candidate.id, `competitive_${job.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to send competitive pressure alerts:', error);
    }
  }

  async checkStreakProtectionOpportunities() {
    try {
      const streakProtection = getStreakProtection();
      if (!streakProtection) return;

      // This integrates with the streak protection system
      const candidatesAtRisk = db.prepare(`
        SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth,
               (julianday('now') - julianday(c.streak_last_date)) * 24 as hours_since_checkin
        FROM candidates c
        LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
        WHERE c.status = 'active'
          AND c.streak_days >= 3
          AND ps.subscription_endpoint IS NOT NULL
          AND hours_since_checkin > 16
          AND hours_since_checkin < 26
      `).all();

      for (const candidate of candidatesAtRisk) {
        const protectionData = await streakProtection.getStreakProtectionData(candidate.id);

        if (protectionData && protectionData.riskScore > 0.5) {
          await this.sendStreakProtectionAlert(candidate, protectionData);
        }
      }

      console.log(`🔥 Processed streak protection for ${candidatesAtRisk.length} candidates`);
    } catch (error) {
      console.error('Error checking streak protection opportunities:', error);
    }
  }

  async sendStreakProtectionAlert(candidate, protectionData) {
    try {
      if (this.shouldSendNotification(candidate.id, 'streak_protection_fomo')) {
        const hoursLeft = Math.max(0, protectionData.hoursRemaining);
        const riskEmoji = protectionData.riskLevel === 'critical' ? '🚨' : protectionData.riskLevel === 'high' ? '⚠️' : '🔥';

        await this.sendNotification(candidate, {
          title: `${riskEmoji} Streak Protection Available!`,
          body: `Don't lose your ${protectionData.streakDays}-day streak! ${hoursLeft.toFixed(1)} hours left.`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/streak-badge.png',
          data: {
            type: 'streak_protection',
            url: '/streak-protection',
            userId: candidate.id,
            streakDays: protectionData.streakDays,
            riskLevel: protectionData.riskLevel,
            hoursRemaining: hoursLeft
          },
          actions: [
            { action: 'protect_streak', title: 'Protect Streak', icon: '/icons/protect-icon.png' },
            { action: 'checkin_now', title: 'Check In Now', icon: '/icons/checkin-icon.png' }
          ]
        });

        this.markNotificationSent(candidate.id, 'streak_protection_fomo');
      }
    } catch (error) {
      console.error('Failed to send streak protection alert:', error);
    }
  }

  async checkTierCompetitionAlerts() {
    try {
      // Find tier-based achievements that can motivate others
      const recentTierAchievements = db.prepare(`
        SELECT
          c.location_area,
          CASE
            WHEN c.level >= 100 THEN 'mythic'
            WHEN c.level >= 75 THEN 'diamond'
            WHEN c.level >= 50 THEN 'platinum'
            WHEN c.level >= 25 THEN 'gold'
            WHEN c.level >= 10 THEN 'silver'
            ELSE 'bronze'
          END as tier_level,
          COUNT(*) as recent_level_ups,
          AVG(c.level) as avg_level
        FROM candidates c
        WHERE c.status = 'active'
          AND datetime(c.updated_at) > datetime('now', '-6 hours')
          AND c.level % 5 = 0  -- Level milestones
        GROUP BY c.location_area, tier_level
        HAVING recent_level_ups >= 2
      `).all();

      for (const achievement of recentTierAchievements) {
        await this.sendTierCompetitionAlerts(achievement);
      }

      console.log(`🏆 Processed ${recentTierAchievements.length} tier competition opportunities`);
    } catch (error) {
      console.error('Error checking tier competition alerts:', error);
    }
  }

  async sendTierCompetitionAlerts(achievement) {
    try {
      // Find candidates at similar tier who might be motivated
      const competitiveCandidates = db.prepare(`
        SELECT c.*, ps.subscription_endpoint, ps.subscription_p256dh, ps.subscription_auth
        FROM candidates c
        LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
        WHERE c.status = 'active'
          AND c.location_area = ?
          AND CASE
                WHEN c.level >= 100 THEN 'mythic'
                WHEN c.level >= 75 THEN 'diamond'
                WHEN c.level >= 50 THEN 'platinum'
                WHEN c.level >= 25 THEN 'gold'
                WHEN c.level >= 10 THEN 'silver'
                ELSE 'bronze'
              END = ?
          AND ps.subscription_endpoint IS NOT NULL
          AND c.level < ?
        LIMIT 8
      `).all(achievement.location_area, achievement.tier_level, achievement.avg_level + 2);

      for (const candidate of competitiveCandidates) {
        if (this.shouldSendNotification(candidate.id, `tier_competition_${achievement.tier_level}`)) {
          await this.sendNotification(candidate, {
            title: "🏆 Your peers are leveling up!",
            body: `${achievement.recent_level_ups} ${achievement.tier_level} workers in your area just advanced. Keep up!`,
            icon: '/icons/icon-192x192.png',
            data: {
              type: 'tier_competition',
              url: '/achievements',
              userId: candidate.id,
              tierLevel: achievement.tier_level,
              peerLevelUps: achievement.recent_level_ups
            }
          });

          this.markNotificationSent(candidate.id, `tier_competition_${achievement.tier_level}`);
        }
      }
    } catch (error) {
      console.error('Failed to send tier competition alerts:', error);
    }
  }

  // ==================== FOMO INTEGRATION HELPERS ====================

  async integrateWithFOMOEngine(candidateId, eventType, eventData) {
    try {
      const fomo = getFOMOEngine();
      if (fomo) {
        fomo.recordActivity(candidateId, eventType, eventData);
        await fomo.processImmediateFOMO(candidateId, eventType, eventData);
      }
    } catch (error) {
      console.error('Failed to integrate with FOMO engine:', error);
    }
  }

  // Enhanced notification sending with FOMO tracking
  async sendNotification(user, payload) {
    try {
      // Original notification logic
      const subscription = {
        endpoint: user.subscription_endpoint,
        keys: {
          p256dh: user.subscription_p256dh,
          auth: user.subscription_auth
        }
      };

      await webpush.sendNotification(subscription, JSON.stringify(payload));

      // Log successful notification
      this.logNotification(user.id, payload.data.type, 'sent');

      // Track FOMO activity if applicable
      if (payload.data.type.includes('fomo') || payload.data.type.includes('urgency') || payload.data.type.includes('scarcity')) {
        await this.integrateWithFOMOEngine(user.id, 'notification_sent', {
          notificationType: payload.data.type,
          urgency: payload.urgency || 'medium'
        });
      }

      console.log(`✅ Sent ${payload.data.type} notification to ${user.name}`);
    } catch (error) {
      console.error(`❌ Failed to send notification to ${user.name}:`, error);

      // Remove invalid subscription
      if (error.statusCode === 410) {
        this.removeInvalidSubscription(user.id);
      }
    }
  }
}

module.exports = new RetentionNotificationService();