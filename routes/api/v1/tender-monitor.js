/**
 * Tender Monitoring API
 * GeBIZ RSS feed monitoring and keyword alerts
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');

// GeBIZ RSS Feed URL
const GEBIZ_RSS_URL = 'https://www.gebiz.gov.sg/rss/ptn-rss.xml';

// Get all tender alerts
router.get('/alerts', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT ta.*, 
        (SELECT COUNT(*) FROM tender_matches tm WHERE tm.alert_id = ta.id) as match_count,
        (SELECT COUNT(*) FROM tender_matches tm WHERE tm.alert_id = ta.id AND tm.notified = 0) as unread_count
      FROM tender_alerts ta
      ORDER BY ta.active DESC, ta.created_at DESC
    `).all();

    res.json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new tender alert
router.post('/alerts', (req, res) => {
  try {
    const { keyword, source = 'all', email_notify = true } = req.body;

    if (!keyword || keyword.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Keyword must be at least 3 characters' });
    }

    // Check for duplicate
    const existing = db.prepare('SELECT id FROM tender_alerts WHERE keyword = ?').get(keyword.trim());
    if (existing) {
      return res.status(400).json({ success: false, error: 'Alert for this keyword already exists' });
    }

    const result = db.prepare(`
      INSERT INTO tender_alerts (keyword, source, email_notify, active)
      VALUES (?, ?, ?, 1)
    `).run(keyword.trim(), source, email_notify ? 1 : 0);

    const alert = db.prepare('SELECT * FROM tender_alerts WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update tender alert
router.patch('/alerts/:id', (req, res) => {
  try {
    const { keyword, source, email_notify, active } = req.body;
    const updates = [];
    const values = [];

    if (keyword !== undefined) { updates.push('keyword = ?'); values.push(keyword); }
    if (source !== undefined) { updates.push('source = ?'); values.push(source); }
    if (email_notify !== undefined) { updates.push('email_notify = ?'); values.push(email_notify ? 1 : 0); }
    if (active !== undefined) { updates.push('active = ?'); values.push(active ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(req.params.id);
    db.prepare(`UPDATE tender_alerts SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const alert = db.prepare('SELECT * FROM tender_alerts WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: alert });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete tender alert
router.delete('/alerts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tender_matches WHERE alert_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tender_alerts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tender matches for an alert
router.get('/alerts/:id/matches', (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const matches = db.prepare(`
      SELECT tm.*, t.status as tender_status, t.closing_date, t.estimated_value
      FROM tender_matches tm
      LEFT JOIN tenders t ON tm.tender_id = t.id
      WHERE tm.alert_id = ?
      ORDER BY tm.created_at DESC
      LIMIT ?
    `).all(req.params.id, parseInt(limit));

    res.json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check GeBIZ RSS feed (manual trigger or cron job)
router.post('/check-gebiz', async (req, res) => {
  try {
    const results = await checkGeBIZFeed();
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all unread tender matches
router.get('/matches/unread', (req, res) => {
  try {
    const matches = db.prepare(`
      SELECT tm.*, ta.keyword, t.agency, t.closing_date, t.estimated_value
      FROM tender_matches tm
      JOIN tender_alerts ta ON tm.alert_id = ta.id
      LEFT JOIN tenders t ON tm.tender_id = t.id
      WHERE tm.notified = 0
      ORDER BY tm.created_at DESC
    `).all();

    res.json({ success: true, data: matches, count: matches.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark matches as read
router.post('/matches/mark-read', (req, res) => {
  try {
    const { match_ids } = req.body;

    if (Array.isArray(match_ids) && match_ids.length > 0) {
      db.prepare(`
        UPDATE tender_matches SET notified = 1 
        WHERE id IN (${match_ids.map(() => '?').join(',')})
      `).run(...match_ids);
    } else {
      // Mark all as read
      db.prepare('UPDATE tender_matches SET notified = 1').run();
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tender monitoring dashboard
router.get('/dashboard', (req, res) => {
  try {
    const stats = {
      activeAlerts: db.prepare('SELECT COUNT(*) as count FROM tender_alerts WHERE active = 1').get().count,
      totalMatches: db.prepare('SELECT COUNT(*) as count FROM tender_matches').get().count,
      unreadMatches: db.prepare('SELECT COUNT(*) as count FROM tender_matches WHERE notified = 0').get().count,
      lastChecked: db.prepare('SELECT MAX(last_checked) as time FROM tender_alerts').get().time,
    };

    // Get recent matches
    const recentMatches = db.prepare(`
      SELECT tm.*, ta.keyword
      FROM tender_matches tm
      JOIN tender_alerts ta ON tm.alert_id = ta.id
      ORDER BY tm.created_at DESC
      LIMIT 10
    `).all();

    // Get alert performance
    const alertPerformance = db.prepare(`
      SELECT ta.keyword, ta.source,
        COUNT(tm.id) as total_matches,
        SUM(CASE WHEN tm.created_at > datetime('now', '-7 days') THEN 1 ELSE 0 END) as matches_this_week
      FROM tender_alerts ta
      LEFT JOIN tender_matches tm ON ta.id = tm.alert_id
      WHERE ta.active = 1
      GROUP BY ta.id
      ORDER BY matches_this_week DESC
    `).all();

    // Recommended keywords based on tender categories
    const recommendedKeywords = [
      { keyword: 'Supply of Manpower Services', reason: 'Primary GeBIZ keyword for staffing tenders' },
      { keyword: 'Provision of Temporary Staff', reason: 'Common phrasing for temp work contracts' },
      { keyword: 'Event Support Services', reason: 'Event-based manpower needs' },
      { keyword: 'Customer Service Officers', reason: 'Front-line service staff tenders' },
      { keyword: 'Ad-hoc Manpower', reason: 'Short-term staffing requirements' },
      { keyword: 'Term Contract Labour', reason: 'Long-term recurring contracts' },
    ];

    // Filter out already existing alerts using SQL for better performance
    const placeholders = recommendedKeywords.map(() => '?').join(',');
    const existingKeywords = db.prepare(
      `SELECT keyword FROM tender_alerts WHERE LOWER(keyword) IN (${placeholders})`
    ).all(...recommendedKeywords.map(r => r.keyword.toLowerCase()));

    const existingSet = new Set(existingKeywords.map(a => a.keyword.toLowerCase()));
    const newRecommendations = recommendedKeywords.filter(
      r => !existingSet.has(r.keyword.toLowerCase())
    );

    res.json({
      success: true,
      data: {
        stats,
        recentMatches,
        alertPerformance,
        recommendedKeywords: newRecommendations,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manually add tender from external source
router.post('/import', (req, res) => {
  try {
    const {
      source, external_id, title, agency, category,
      estimated_value, closing_date, manpower_required,
      duration_months, location, url
    } = req.body;

    const id = 'TND' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO tenders (id, source, external_id, title, agency, category, 
        estimated_value, closing_date, status, manpower_required, duration_months, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `).run(id, source, external_id, title, agency, category, estimated_value, closing_date, manpower_required, duration_months, location);

    // Check if matches any alerts
    const alerts = db.prepare('SELECT * FROM tender_alerts WHERE active = 1').all();
    for (const alert of alerts) {
      if (title.toLowerCase().includes(alert.keyword.toLowerCase())) {
        db.prepare(`
          INSERT INTO tender_matches (alert_id, tender_id, external_url, title, matched_keyword)
          VALUES (?, ?, ?, ?, ?)
        `).run(alert.id, id, url, title, alert.keyword);
      }
    }

    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: tender });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Check GeBIZ RSS feed
async function checkGeBIZFeed() {
  const alerts = db.prepare('SELECT * FROM tender_alerts WHERE active = 1').all();
  if (alerts.length === 0) {
    return { message: 'No active alerts to check' };
  }

  // Note: In production, you'd actually fetch the RSS feed
  // For now, we'll simulate the check and update timestamps
  const now = new Date().toISOString();
  db.prepare('UPDATE tender_alerts SET last_checked = ? WHERE active = 1').run(now);

  // In a real implementation:
  // 1. Fetch GEBIZ_RSS_URL
  // 2. Parse XML to get tender items
  // 3. Match against alert keywords
  // 4. Create tender_matches for new matches
  // 5. Optionally send email notifications

  return {
    checkedAt: now,
    alertsChecked: alerts.length,
    message: 'RSS feed check simulated. Implement actual RSS parsing for production.',
    rssUrl: GEBIZ_RSS_URL,
    implementation: {
      step1: 'npm install rss-parser',
      step2: 'Fetch and parse GEBIZ_RSS_URL',
      step3: 'Match items against alert keywords',
      step4: 'Store matches and send notifications',
    },
  };
}

// Webhook endpoint for external tender sources (e.g., Zapier, Make.com)
router.post('/webhook', (req, res) => {
  try {
    const { source, tenders } = req.body;

    if (!Array.isArray(tenders)) {
      return res.status(400).json({ success: false, error: 'tenders array required' });
    }

    const alerts = db.prepare('SELECT * FROM tender_alerts WHERE active = 1').all();
    const results = { imported: 0, matched: 0 };

    for (const tender of tenders) {
      const id = 'TND' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4);

      db.prepare(`
        INSERT INTO tenders (id, source, external_id, title, agency, category, 
          estimated_value, closing_date, status, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
      `).run(
        id,
        source || 'webhook',
        tender.external_id || null,
        tender.title,
        tender.agency || null,
        tender.category || null,
        tender.estimated_value || null,
        tender.closing_date || null,
        tender.location || null
      );
      results.imported++;

      // Check alerts
      for (const alert of alerts) {
        if (tender.title.toLowerCase().includes(alert.keyword.toLowerCase())) {
          db.prepare(`
            INSERT INTO tender_matches (alert_id, tender_id, external_url, title, matched_keyword)
            VALUES (?, ?, ?, ?, ?)
          `).run(alert.id, id, tender.url || null, tender.title, alert.keyword);
          results.matched++;
        }
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
