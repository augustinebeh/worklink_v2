/**
 * Tender Monitoring API
 * GeBIZ RSS feed monitoring and keyword alerts
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const Parser = require('rss-parser');
const parser = new Parser();

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

  const now = new Date().toISOString();
  let results = {
    checkedAt: now,
    alertsChecked: alerts.length,
    newTenders: 0,
    newMatches: 0,
    processedItems: 0,
    errors: []
  };

  try {
    console.log(`[${now}] Checking GeBIZ RSS feed: ${GEBIZ_RSS_URL}`);

    // Fetch and parse RSS feed
    const feed = await parser.parseURL(GEBIZ_RSS_URL);
    console.log(`Found ${feed.items.length} items in RSS feed`);

    results.processedItems = feed.items.length;

    // Process each RSS item
    for (const item of feed.items) {
      try {
        // Extract tender information from RSS item
        const tenderData = extractTenderFromRSSItem(item);

        // Check if tender already exists
        const existingTender = db.prepare(
          'SELECT id FROM tenders WHERE external_id = ? AND source = "gebiz"'
        ).get(tenderData.external_id);

        let tenderId;

        if (!existingTender) {
          // Create new tender
          tenderId = 'TND' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4);

          db.prepare(`
            INSERT INTO tenders (
              id, source, external_id, title, agency, category,
              estimated_value, closing_date, status, location,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            tenderId,
            'gebiz',
            tenderData.external_id,
            tenderData.title,
            tenderData.agency,
            tenderData.category,
            tenderData.estimated_value,
            tenderData.closing_date,
            'new',
            tenderData.location,
            now,
            now
          );

          results.newTenders++;
          console.log(`Created new tender: ${tenderId} - ${tenderData.title}`);
        } else {
          tenderId = existingTender.id;
        }

        // Check against all active alerts
        for (const alert of alerts) {
          const isMatch = checkKeywordMatch(tenderData.title, tenderData.category, alert.keyword);

          if (isMatch) {
            // Check if match already exists
            const existingMatch = db.prepare(
              'SELECT id FROM tender_matches WHERE alert_id = ? AND tender_id = ?'
            ).get(alert.id, tenderId);

            if (!existingMatch) {
              db.prepare(`
                INSERT INTO tender_matches (
                  alert_id, tender_id, external_url, title,
                  matched_keyword, notified, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, ?)
              `).run(
                alert.id,
                tenderId,
                tenderData.external_url,
                tenderData.title,
                alert.keyword,
                now
              );

              results.newMatches++;
              console.log(`New match: ${alert.keyword} -> ${tenderData.title}`);

              // Send email notification if enabled
              if (alert.email_notify) {
                await sendTenderAlert(alert, tenderData);
              }
            }
          }
        }

      } catch (itemError) {
        console.error('Error processing RSS item:', itemError);
        results.errors.push(`Item processing error: ${itemError.message}`);
      }
    }

    // Update last checked timestamps
    db.prepare('UPDATE tender_alerts SET last_checked = ? WHERE active = 1').run(now);

    console.log(`RSS check completed: ${results.newTenders} new tenders, ${results.newMatches} new matches`);

  } catch (error) {
    console.error('Error fetching GeBIZ RSS feed:', error);
    results.errors.push(`RSS fetch error: ${error.message}`);

    // Still update timestamp to avoid constant retries
    db.prepare('UPDATE tender_alerts SET last_checked = ? WHERE active = 1').run(now);
  }

  return results;
}

// Helper: Extract tender data from RSS item
function extractTenderFromRSSItem(item) {
  // GeBIZ RSS item typically has:
  // - title: "Agency - Tender Title"
  // - description: HTML with tender details
  // - link: URL to tender on GeBIZ
  // - pubDate: Publication date
  // - guid: Unique identifier

  const title = item.title || '';
  const description = item.description || item.content || '';
  const external_url = item.link || item.guid || '';

  // Extract agency (usually before first dash)
  const agencyMatch = title.match(/^([^-]+)-(.+)$/);
  const agency = agencyMatch ? agencyMatch[1].trim() : null;
  const actualTitle = agencyMatch ? agencyMatch[2].trim() : title;

  // Extract tender ID from URL or GUID
  const external_id = extractTenderIdFromUrl(external_url) || item.guid || external_url;

  // Try to extract estimated value from description
  const estimated_value = extractEstimatedValue(description);

  // Try to extract closing date
  const closing_date = extractClosingDate(description, item.pubDate);

  // Categorize tender based on title/description
  const category = categorizeTender(actualTitle, description);

  return {
    external_id,
    title: actualTitle,
    agency,
    category,
    estimated_value,
    closing_date,
    external_url,
    location: 'Singapore' // Default for GeBIZ
  };
}

// Helper: Check if tender matches keyword
function checkKeywordMatch(title, category, keyword) {
  const searchText = `${title} ${category || ''}`.toLowerCase();
  const keywordLower = keyword.toLowerCase();

  // Direct substring match
  if (searchText.includes(keywordLower)) {
    return true;
  }

  // Check individual words for better matching
  const keywordWords = keywordLower.split(/\s+/);
  const allWordsMatch = keywordWords.every(word =>
    searchText.includes(word)
  );

  return allWordsMatch && keywordWords.length > 1;
}

// Helper: Extract tender ID from URL
function extractTenderIdFromUrl(url) {
  if (!url) return null;

  // Try to extract ID from GeBIZ URL patterns
  const patterns = [
    /ptn_no=([^&]+)/i,
    /tender[_-]id=([^&]+)/i,
    /id=([^&]+)/i,
    /\/([A-Z0-9]+)$/i
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fallback: use last part of URL
  const urlParts = url.split('/').filter(Boolean);
  return urlParts[urlParts.length - 1] || null;
}

// Helper: Extract estimated value from description
function extractEstimatedValue(description) {
  if (!description) return null;

  const patterns = [
    /value[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
    /amount[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
    /budget[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
    /S\$([\d,]+(?:\.\d{2})?)/i
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) {
        return value;
      }
    }
  }

  return null;
}

// Helper: Extract closing date from description
function extractClosingDate(description, pubDate) {
  if (!description) return null;

  const patterns = [
    /closing[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /deadline[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      try {
        const dateStr = match[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime()) && date > new Date()) {
          return date.toISOString();
        }
      } catch (error) {
        continue;
      }
    }
  }

  return null;
}

// Helper: Categorize tender based on content
function categorizeTender(title, description) {
  const content = `${title} ${description}`.toLowerCase();

  const categories = {
    'Manpower Services': ['manpower', 'staff', 'personnel', 'human resource', 'temporary', 'contract worker'],
    'Event Services': ['event', 'exhibition', 'conference', 'seminar', 'ceremony'],
    'Security Services': ['security', 'guard', 'surveillance', 'protection'],
    'Cleaning Services': ['cleaning', 'housekeeping', 'maintenance', 'janitorial'],
    'IT Services': ['information technology', 'software', 'hardware', 'digital', 'system'],
    'Professional Services': ['consultancy', 'advisory', 'professional', 'expert'],
    'Logistics Services': ['logistics', 'transportation', 'delivery', 'warehouse'],
    'Construction': ['construction', 'building', 'renovation', 'infrastructure'],
    'F&B Services': ['catering', 'food', 'beverage', 'meal', 'dining']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      return category;
    }
  }

  return 'General Services';
}

// Helper: Send email alert
async function sendTenderAlert(alert, tenderData) {
  try {
    console.log(`Sending email alert for keyword "${alert.keyword}": ${tenderData.title}`);

    // Import email service
    const emailService = require('../../../services/email');

    // Send tender alert email
    const result = await emailService.sendTenderAlert(alert, tenderData);

    console.log(`Tender alert email sent successfully. Results:`, result);
    return result;
  } catch (error) {
    console.error(`Failed to send tender alert for keyword "${alert.keyword}":`, error);

    // Log the failure but don't throw - we don't want email failures to break tender monitoring
    try {
      const { db } = require('../../../db');
      db.prepare(`
        INSERT INTO email_delivery_log (
          tracking_id, recipient_email, subject, category, status,
          last_error, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'tender_alert_' + Date.now(),
        'admin@worklink.sg', // Default admin email
        `Tender Alert: ${alert.keyword} - ${tenderData.title}`,
        'tender-alert',
        'failed_permanent',
        error.message,
        new Date().toISOString()
      );
    } catch (logError) {
      console.error('Failed to log email failure:', logError);
    }

    return { success: false, error: error.message };
  }
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
