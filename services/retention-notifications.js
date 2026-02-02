const webpush = require('web-push');
const { db } = require('../db');

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

    // Run immediate checks
    this.checkRetentionTriggers();
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
}

module.exports = new RetentionNotificationService();