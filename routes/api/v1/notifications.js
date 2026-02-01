/**
 * Push Notifications & Smart Job Matching API
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { getSGDateString } = require('../../../shared/constants');

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

module.exports = router;
