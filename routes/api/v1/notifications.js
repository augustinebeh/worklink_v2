/**
 * Push Notifications & Smart Job Matching API
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const { getSGDateString } = require('../../../shared/constants');
const retentionService = require('../../../services/retention-notifications');

// Initialize web-push if keys are available
let webpush = null;
try {
  webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@worklink.app',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Web Push configured');
  }
} catch (e) {
  console.log('⚠️ Web Push not configured');
}

// Get VAPID public key for frontend subscription
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        error: 'Push notifications not configured on server'
      });
    }
    res.json({ success: true, publicKey });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register push subscription
router.post('/subscribe', (req, res) => {
  try {
    const { candidate_id, subscription } = req.body;

    db.prepare('UPDATE candidates SET push_token = ? WHERE id = ?')
      .run(JSON.stringify(subscription), candidate_id);

    res.json({ success: true, message: 'Push subscription registered' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unsubscribe from push
router.post('/unsubscribe', (req, res) => {
  try {
    const { candidate_id } = req.body;
    db.prepare('UPDATE candidates SET push_token = NULL WHERE id = ?').run(candidate_id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send push notification to specific candidate
router.post('/send', async (req, res) => {
  try {
    const { candidate_id, title, body, data = {} } = req.body;

    const candidate = db.prepare('SELECT push_token, name FROM candidates WHERE id = ?').get(candidate_id);
    if (!candidate?.push_token) {
      return res.status(400).json({ success: false, error: 'No push subscription found' });
    }

    const result = await sendPushNotification(candidate_id, candidate.push_token, title, body, data);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send push to multiple candidates
router.post('/send-bulk', async (req, res) => {
  try {
    const { candidate_ids, title, body, data = {} } = req.body;

    const candidates = db.prepare(`
      SELECT id, push_token, name FROM candidates 
      WHERE id IN (${candidate_ids.map(() => '?').join(',')}) AND push_token IS NOT NULL
    `).all(...candidate_ids);

    const results = await Promise.allSettled(
      candidates.map(c => sendPushNotification(c.id, c.push_token, title, body, data))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ success: true, data: { sent, failed, total: candidates.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get job matches for a candidate
router.get('/matches/:candidateId', (req, res) => {
  try {
    const { limit = 10, min_score = 50 } = req.query;

    const matches = db.prepare(`
      SELECT jm.*, j.title, j.job_date, j.start_time, j.end_time, j.location,
             j.pay_rate, j.total_slots, j.filled_slots, j.featured, j.urgent,
             c.company_name
      FROM job_match_scores jm
      JOIN jobs j ON jm.job_id = j.id
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE jm.candidate_id = ? 
        AND jm.score >= ?
        AND j.status = 'open'
        AND j.filled_slots < j.total_slots
        AND j.job_date >= date('now')
      ORDER BY jm.score DESC, j.featured DESC, j.urgent DESC, j.job_date ASC
      LIMIT ?
    `).all(req.params.candidateId, parseInt(min_score), parseInt(limit));

    // Parse factors JSON
    const parsed = matches.map(m => ({
      ...m,
      factors: JSON.parse(m.factors || '{}'),
      slotsRemaining: m.total_slots - m.filled_slots,
    }));

    res.json({ success: true, data: parsed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate and store job matches for all candidates (batch job)
router.post('/calculate-matches', async (req, res) => {
  try {
    const { job_id } = req.body;

    // Get job details
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Get all active candidates
    const candidates = db.prepare(`
      SELECT c.*, ca.status as availability_status
      FROM candidates c
      LEFT JOIN candidate_availability ca ON c.id = ca.candidate_id AND ca.date = ?
      WHERE c.status = 'active'
      AND (ca.status = 'available' OR ca.status IS NULL)
      AND c.id NOT IN (
        SELECT candidate_id FROM deployments WHERE job_id = ?
      )
    `).all(job.job_date, job_id);

    const insertMatch = db.prepare(`
      INSERT INTO job_match_scores (job_id, candidate_id, score, factors)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(job_id, candidate_id) DO UPDATE SET
        score = excluded.score,
        factors = excluded.factors,
        notified = 0
    `);

    let matchCount = 0;
    for (const candidate of candidates) {
      const { score, factors } = calculateMatchScore(candidate, job);
      if (score >= 50) {
        insertMatch.run(job_id, candidate.id, score, JSON.stringify(factors));
        matchCount++;
      }
    }

    res.json({
      success: true,
      data: {
        jobId: job_id,
        candidatesEvaluated: candidates.length,
        matchesCreated: matchCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send job match notifications (batch job)
router.post('/notify-matches', async (req, res) => {
  try {
    const { job_id, min_score = 70 } = req.body;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Get unnotified high-score matches
    const matches = db.prepare(`
      SELECT jm.*, c.name, c.push_token, c.whatsapp_opted_in, c.phone, c.preferred_contact
      FROM job_match_scores jm
      JOIN candidates c ON jm.candidate_id = c.id
      WHERE jm.job_id = ? AND jm.score >= ? AND jm.notified = 0
      ORDER BY jm.score DESC
    `).all(job_id, min_score);

    const notifications = [];
    for (const match of matches) {
      const title = job.urgent ? '🚨 Urgent Job Match!' : '🎯 Perfect Job Match!';
      const body = `${job.title} on ${formatDate(job.job_date)} - $${job.pay_rate}/hr. ${match.score}% match!`;

      // Send push notification
      if (match.push_token) {
        await sendPushNotification(match.candidate_id, match.push_token, title, body, {
          type: 'job_match',
          job_id: job_id,
          score: match.score,
        });
      }

      // Create in-app notification
      db.prepare(`
        INSERT INTO notifications (candidate_id, type, title, message, data)
        VALUES (?, 'job_match', ?, ?, ?)
      `).run(match.candidate_id, title, body, JSON.stringify({ job_id, score: match.score }));

      // Mark as notified
      db.prepare('UPDATE job_match_scores SET notified = 1 WHERE job_id = ? AND candidate_id = ?')
        .run(job_id, match.candidate_id);

      notifications.push({ candidateId: match.candidate_id, score: match.score });
    }

    res.json({
      success: true,
      data: {
        jobId: job_id,
        notificationsSent: notifications.length,
        notifications,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send streak reminder notifications
router.post('/streak-reminders', async (req, res) => {
  try {
    // Find candidates with active streaks who haven't logged in today (Singapore timezone)
    const today = getSGDateString();
    const candidates = db.prepare(`
      SELECT id, name, push_token, streak_days, streak_last_date
      FROM candidates
      WHERE status = 'active'
        AND streak_days >= 3
        AND streak_last_date < ?
        AND push_token IS NOT NULL
    `).all(today);

    let sent = 0;
    for (const c of candidates) {
      const title = '🔥 Don\'t break your streak!';
      const body = `You're on a ${c.streak_days}-day streak! Log in now to keep it going.`;

      await sendPushNotification(c.id, c.push_token, title, body, {
        type: 'streak_reminder',
        streak_days: c.streak_days,
      });
      sent++;
    }

    res.json({ success: true, data: { remindersSent: sent } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send incentive progress notifications
router.post('/incentive-progress', async (req, res) => {
  try {
    // Find candidates close to consistency bonus (5 jobs/month) - Singapore timezone
    const thisMonth = getSGDateString().substring(0, 7);
    const candidates = db.prepare(`
      SELECT c.id, c.name, c.push_token, COUNT(d.id) as jobs_this_month
      FROM candidates c
      JOIN deployments d ON c.id = d.candidate_id
      JOIN jobs j ON d.job_id = j.id
      WHERE c.status = 'active'
        AND c.push_token IS NOT NULL
        AND d.status = 'completed'
        AND strftime('%Y-%m', j.job_date) = ?
      GROUP BY c.id
      HAVING jobs_this_month BETWEEN 3 AND 4
    `).all(thisMonth);

    let sent = 0;
    for (const c of candidates) {
      const remaining = 5 - c.jobs_this_month;
      const title = '💰 Bonus Alert!';
      const body = `Just ${remaining} more job${remaining > 1 ? 's' : ''} to earn your $20 Consistency Bonus this month!`;

      await sendPushNotification(c.id, c.push_token, title, body, {
        type: 'incentive_progress',
        jobs_completed: c.jobs_this_month,
        jobs_needed: 5,
      });
      sent++;
    }

    res.json({ success: true, data: { notificationsSent: sent } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Send push notification
async function sendPushNotification(candidateId, subscriptionStr, title, body, data = {}) {
  if (!webpush || !process.env.VAPID_PUBLIC_KEY) {
    // Queue for later if webpush not configured
    db.prepare(`
      INSERT INTO push_queue (candidate_id, title, body, data, status)
      VALUES (?, ?, ?, ?, 'queued')
    `).run(candidateId, title, body, JSON.stringify(data));
    return { status: 'queued', reason: 'Web push not configured' };
  }

  try {
    const subscription = JSON.parse(subscriptionStr);
    await webpush.sendNotification(subscription, JSON.stringify({
      title,
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data,
    }));

    db.prepare(`
      INSERT INTO push_queue (candidate_id, title, body, data, status, sent_at)
      VALUES (?, ?, ?, ?, 'sent', datetime('now'))
    `).run(candidateId, title, body, JSON.stringify(data));

    return { status: 'sent' };
  } catch (error) {
    db.prepare(`
      INSERT INTO push_queue (candidate_id, title, body, data, status, error)
      VALUES (?, ?, ?, ?, 'failed', ?)
    `).run(candidateId, title, body, JSON.stringify(data), error.message);

    // Remove invalid subscription
    if (error.statusCode === 410) {
      db.prepare('UPDATE candidates SET push_token = NULL WHERE id = ?').run(candidateId);
    }

    return { status: 'failed', error: error.message };
  }
}

// Helper: Calculate match score
function calculateMatchScore(candidate, job) {
  const factors = {};
  let score = 50;

  if (candidate.rating >= 4.5) { factors.rating = '+20'; score += 20; }
  else if (candidate.rating >= 4) { factors.rating = '+10'; score += 10; }

  if (candidate.total_jobs_completed >= 50) { factors.experience = '+15'; score += 15; }
  else if (candidate.total_jobs_completed >= 20) { factors.experience = '+10'; score += 10; }
  else if (candidate.total_jobs_completed >= 5) { factors.experience = '+5'; score += 5; }

  if (candidate.streak_days >= 7) { factors.streak = '+10'; score += 10; }
  else if (candidate.streak_days >= 3) { factors.streak = '+5'; score += 5; }

  if (candidate.level >= 5) { factors.level = '+5'; score += 5; }

  if (candidate.availability_status === 'available') { factors.availability = '+5'; score += 5; }

  return { score: Math.min(100, score), factors };
}

// Helper: Format date (Singapore timezone)
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Singapore' });
}

// =====================================================
// RETENTION NOTIFICATION SYSTEM
// =====================================================

// Enhanced push subscription with retention tracking
router.post('/subscribe-enhanced', async (req, res) => {
  try {
    const { candidateId, subscription } = req.body;

    if (!candidateId || !subscription) {
      return res.status(400).json({
        success: false,
        error: 'Missing candidateId or subscription'
      });
    }

    const { endpoint, keys } = subscription;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription format'
      });
    }

    // Store enhanced subscription for retention tracking
    const query = `
      INSERT OR REPLACE INTO push_subscriptions
      (candidate_id, subscription_endpoint, subscription_p256dh, subscription_auth, user_agent, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `;

    db.prepare(query).run(
      candidateId,
      endpoint,
      keys.p256dh,
      keys.auth,
      req.get('User-Agent') || 'Unknown'
    );

    // Initialize streak protection for new users
    const protectionQuery = `
      INSERT OR IGNORE INTO streak_protection (candidate_id, freeze_tokens, recovery_tokens)
      VALUES (?, 2, 1)
    `;
    db.prepare(protectionQuery).run(candidateId);

    console.log(`✅ Enhanced push subscription registered for candidate ${candidateId}`);

    res.json({
      success: true,
      message: 'Enhanced push subscription registered successfully'
    });

  } catch (error) {
    console.error('Error registering enhanced push subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register enhanced push subscription'
    });
  }
});

// Handle notification action responses (for retention tracking)
router.post('/action', async (req, res) => {
  try {
    const { candidateId, notificationType, action } = req.body;

    if (!candidateId || !notificationType || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Log the action for retention analytics
    const logQuery = `
      INSERT INTO notification_log (candidate_id, notification_type, status, response_action)
      VALUES (?, ?, 'responded', ?)
    `;
    db.prepare(logQuery).run(candidateId, notificationType, action);

    // Handle specific actions
    let result = {};

    if (notificationType === 'streak_risk' && action === 'checkin') {
      // Quick check-in to maintain streak
      const updateQuery = `
        UPDATE candidates
        SET streak_last_date = date('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `;
      db.prepare(updateQuery).run(candidateId);
      result.checkedIn = true;

    } else if (notificationType === 'streak_risk' && action === 'protect') {
      // Use freeze token to protect streak
      const protectResult = await protectStreak(candidateId);
      result = protectResult;
    }

    console.log(`✅ Notification action: ${candidateId} responded to ${notificationType} with ${action}`);

    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Error handling notification action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle notification action'
    });
  }
});

// Get notification status and streak protection info
router.get('/status/:candidateId', async (req, res) => {
  try {
    const { candidateId } = req.params;

    const query = `
      SELECT
        c.streak_days,
        c.streak_last_date,
        c.streak_protected_until,
        sp.freeze_tokens,
        sp.recovery_tokens,
        ps.subscription_endpoint IS NOT NULL as has_enhanced_subscription,
        (julianday('now') - julianday(c.streak_last_date)) * 24 as hours_since_checkin
      FROM candidates c
      LEFT JOIN streak_protection sp ON c.id = sp.candidate_id
      LEFT JOIN push_subscriptions ps ON c.id = ps.candidate_id
      WHERE c.id = ?
    `;

    const status = db.prepare(query).get(candidateId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Calculate streak risk
    const streakAtRisk = status.hours_since_checkin > 18 && status.hours_since_checkin < 24;
    const streakBroken = status.hours_since_checkin >= 24 && !status.streak_protected_until;

    res.json({
      success: true,
      data: {
        ...status,
        streakAtRisk,
        streakBroken,
        canProtectStreak: status.freeze_tokens > 0,
        canRecoverStreak: status.recovery_tokens > 0
      }
    });

  } catch (error) {
    console.error('Error getting notification status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification status'
    });
  }
});

// Use freeze token to protect streak
router.post('/protect-streak', async (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing candidateId'
      });
    }

    const result = await protectStreak(candidateId);
    res.json(result);

  } catch (error) {
    console.error('Error protecting streak:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to protect streak'
    });
  }
});

// Use recovery token to restore broken streak
router.post('/recover-streak', async (req, res) => {
  try {
    const { candidateId } = req.body;

    if (!candidateId) {
      return res.status(400).json({
        success: false,
        error: 'Missing candidateId'
      });
    }

    const result = await recoverStreak(candidateId);
    res.json(result);

  } catch (error) {
    console.error('Error recovering streak:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to recover streak'
    });
  }
});

// Test retention notification endpoint (development only)
router.post('/test-retention/:candidateId/:type', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Test endpoint not available in production'
      });
    }

    const { candidateId, type } = req.params;

    await retentionService.triggerNotification(candidateId, type);

    res.json({
      success: true,
      message: `Test retention notification sent to ${candidateId}`
    });

  } catch (error) {
    console.error('Error sending test retention notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions for streak protection
async function protectStreak(candidateId) {
  const transaction = db.transaction(() => {
    // Check if user has freeze tokens
    const protection = db.prepare(`
      SELECT freeze_tokens FROM streak_protection WHERE candidate_id = ?
    `).get(candidateId);

    if (!protection || protection.freeze_tokens <= 0) {
      throw new Error('No freeze tokens available');
    }

    // Use freeze token
    db.prepare(`
      UPDATE streak_protection
      SET freeze_tokens = freeze_tokens - 1,
          last_protection_used = datetime('now'),
          updated_at = datetime('now')
      WHERE candidate_id = ?
    `).run(candidateId);

    // Protect streak for 24 hours
    db.prepare(`
      UPDATE candidates
      SET streak_protected_until = datetime('now', '+24 hours'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(candidateId);

    return {
      success: true,
      message: 'Streak protected for 24 hours',
      tokensLeft: protection.freeze_tokens - 1
    };
  });

  return transaction();
}

async function recoverStreak(candidateId) {
  const transaction = db.transaction(() => {
    // Check if user has recovery tokens and streak is broken
    const query = `
      SELECT
        c.streak_days,
        c.streak_last_date,
        sp.recovery_tokens,
        (julianday('now') - julianday(c.streak_last_date)) * 24 as hours_since_checkin
      FROM candidates c
      LEFT JOIN streak_protection sp ON c.id = sp.candidate_id
      WHERE c.id = ?
    `;

    const data = db.prepare(query).get(candidateId);

    if (!data || data.recovery_tokens <= 0) {
      throw new Error('No recovery tokens available');
    }

    if (data.hours_since_checkin < 24) {
      throw new Error('Streak is not broken yet');
    }

    if (data.hours_since_checkin > 48) {
      throw new Error('Recovery window expired (max 48 hours)');
    }

    // Use recovery token
    db.prepare(`
      UPDATE streak_protection
      SET recovery_tokens = recovery_tokens - 1,
          updated_at = datetime('now')
      WHERE candidate_id = ?
    `).run(candidateId);

    // Restore streak
    db.prepare(`
      UPDATE candidates
      SET streak_last_date = date('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(candidateId);

    return {
      success: true,
      message: 'Streak recovered successfully',
      tokensLeft: data.recovery_tokens - 1,
      streakDays: data.streak_days
    };
  });

  return transaction();
}

module.exports = router;
