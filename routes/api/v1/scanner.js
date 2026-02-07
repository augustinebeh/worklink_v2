/**
 * Tender Scanner API
 * Consolidates tender monitoring (alerts + keyword matching) and scraping control
 *
 * Replaces parts of:
 * - /api/v1/tender-monitor (alerts + matches)
 * - /api/v1/scraping/gebiz-rss (scraper controls)
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db');

// Optional scraping service (may not be available in all environments)
let scrapingService;
try {
  const scraping = require('../../../services/scraping');
  scrapingService = scraping.scrapingService;
} catch (error) {
  console.warn('Scraping service not available:', error.message);
}

// ============================================================================
// FEED ENDPOINTS (gebiz_active_tenders table)
// ============================================================================

/**
 * GET /api/v1/scanner/feed
 * Get discovered tenders from gebiz_active_tenders
 */
router.get('/feed', (req, res) => {
  try {
    const {
      status = 'open',
      search = '',
      category = '',
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT *
      FROM gebiz_active_tenders
      WHERE 1=1
    `;
    const params = [];

    // Status filter - default shows open tenders that aren't dismissed or in pipeline
    if (status === 'open') {
      query += ` AND dismissed = 0 AND in_pipeline = 0`;
    } else if (status === 'dismissed') {
      query += ` AND dismissed = 1`;
    } else if (status === 'in_pipeline') {
      query += ` AND in_pipeline = 1`;
    } else if (status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    // Category filter — load from settings if not explicitly provided
    if (category !== 'all') {
      let enabledCategories = [];
      if (category) {
        enabledCategories = category.split(',').map(c => c.trim()).filter(Boolean);
      } else {
        // Load default from scanner_settings
        try {
          const setting = db.prepare("SELECT value FROM scanner_settings WHERE key = 'feed_categories'").get();
          if (setting && setting.value) {
            enabledCategories = setting.value.split(',').map(c => c.trim()).filter(Boolean);
          }
        } catch (_) { /* table may not exist yet */ }
      }
      if (enabledCategories.length > 0) {
        const placeholders = enabledCategories.map(() => '?').join(',');
        query += ` AND category IN (${placeholders})`;
        params.push(...enabledCategories);
      }
    }

    // Search filter
    if (search) {
      query += ` AND (title LIKE ? OR agency LIKE ? OR tender_no LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ` ORDER BY published_date DESC, created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const tenders = db.prepare(query).all(...params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as count FROM gebiz_active_tenders WHERE 1=1`;
    const countParams = [];

    if (status === 'open') {
      countQuery += ` AND dismissed = 0 AND in_pipeline = 0`;
    } else if (status === 'dismissed') {
      countQuery += ` AND dismissed = 1`;
    } else if (status === 'in_pipeline') {
      countQuery += ` AND in_pipeline = 1`;
    } else if (status !== 'all') {
      countQuery += ` AND status = ?`;
      countParams.push(status);
    }

    // Category filter for count query (same logic)
    if (category !== 'all') {
      let enabledCategories = [];
      if (category) {
        enabledCategories = category.split(',').map(c => c.trim()).filter(Boolean);
      } else {
        try {
          const setting = db.prepare("SELECT value FROM scanner_settings WHERE key = 'feed_categories'").get();
          if (setting && setting.value) {
            enabledCategories = setting.value.split(',').map(c => c.trim()).filter(Boolean);
          }
        } catch (_) {}
      }
      if (enabledCategories.length > 0) {
        const placeholders = enabledCategories.map(() => '?').join(',');
        countQuery += ` AND category IN (${placeholders})`;
        countParams.push(...enabledCategories);
      }
    }

    if (search) {
      countQuery += ` AND (title LIKE ? OR agency LIKE ? OR tender_no LIKE ?)`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const total = db.prepare(countQuery).get(...countParams).count;

    res.json({
      success: true,
      data: {
        tenders,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/scanner/feed/:id/dismiss
 * Mark a discovered tender as dismissed
 */
router.post('/feed/:id/dismiss', (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare(`
      UPDATE gebiz_active_tenders
      SET dismissed = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }

    const tender = db.prepare('SELECT * FROM gebiz_active_tenders WHERE id = ?').get(id);

    res.json({ success: true, data: tender });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/scanner/feed/stats
 * Get feed statistics
 */
router.get('/feed/stats', (req, res) => {
  try {
    const totalOpen = db.prepare(`
      SELECT COUNT(*) as count
      FROM gebiz_active_tenders
      WHERE dismissed = 0 AND in_pipeline = 0
    `).get().count;

    const totalDismissed = db.prepare(`
      SELECT COUNT(*) as count
      FROM gebiz_active_tenders
      WHERE dismissed = 1
    `).get().count;

    const totalInPipeline = db.prepare(`
      SELECT COUNT(*) as count
      FROM gebiz_active_tenders
      WHERE in_pipeline = 1
    `).get().count;

    const lastScraped = db.prepare(`
      SELECT MAX(scraped_at) as time
      FROM gebiz_active_tenders
    `).get().time;

    res.json({
      success: true,
      data: {
        totalOpen,
        totalDismissed,
        totalInPipeline,
        lastScraped
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// ALERT ENDPOINTS (tender_alerts + tender_matches tables)
// ============================================================================

/**
 * GET /api/v1/scanner/alerts
 * List all alerts with match counts
 */
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

/**
 * POST /api/v1/scanner/alerts
 * Create keyword alert
 */
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

/**
 * PATCH /api/v1/scanner/alerts/:id
 * Update alert
 */
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

/**
 * DELETE /api/v1/scanner/alerts/:id
 * Delete alert and its matches
 */
router.delete('/alerts/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tender_matches WHERE alert_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tender_alerts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/scanner/alerts/:id/matches
 * Get matches for an alert
 */
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

/**
 * GET /api/v1/scanner/matches/unread
 * Get all unread matches
 */
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

/**
 * POST /api/v1/scanner/matches/mark-read
 * Mark matches as read
 */
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

// ============================================================================
// SCRAPER CONTROL ENDPOINTS (scrapingService)
// ============================================================================

/**
 * GET /api/v1/scanner/scraper/status
 * Get scraping service status
 */
router.get('/scraper/status', async (req, res) => {
  try {
    if (!scrapingService) {
      return res.status(503).json({
        success: false,
        error: 'Scraping service not available'
      });
    }

    const status = scrapingService.getStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get scraping status',
      details: error.message
    });
  }
});

/**
 * GET /api/v1/scanner/scraper/health
 * Get health check status
 */
router.get('/scraper/health', async (req, res) => {
  try {
    if (!scrapingService) {
      return res.status(503).json({
        success: false,
        healthy: false,
        error: 'Scraping service not available'
      });
    }

    const healthCheck = await scrapingService.getHealthCheck();
    const statusCode = healthCheck.healthy ? 200 : 503;

    res.status(statusCode).json({
      success: healthCheck.healthy,
      data: healthCheck
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * POST /api/v1/scanner/scraper/trigger
 * Trigger manual scrape
 */
router.post('/scraper/trigger', async (req, res) => {
  try {
    if (!scrapingService) {
      return res.status(503).json({
        success: false,
        error: 'Scraping service not available'
      });
    }

    const options = req.body || {};
    options.manual = true;

    const result = await scrapingService.manualScrape(options);

    res.json({
      success: true,
      message: 'Manual scraping completed',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Manual scraping failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/scanner/scraper/scheduler/:action
 * Start/stop/restart scheduler
 * action = start|stop|restart
 */
router.post('/scraper/scheduler/:action', async (req, res) => {
  try {
    if (!scrapingService) {
      return res.status(503).json({
        success: false,
        error: 'Scraping service not available'
      });
    }

    const { action } = req.params;
    const scheduler = scrapingService.getScheduler();

    let result;
    let message;

    switch (action) {
      case 'start':
        result = scheduler.start();
        message = result ? 'Scheduler started successfully' : 'Failed to start scheduler (may already be running)';
        break;

      case 'stop':
        result = scheduler.stop();
        message = result ? 'Scheduler stopped successfully' : 'Failed to stop scheduler (may not be running)';
        break;

      case 'restart':
        scheduler.restart();
        // Give it a moment to restart
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = true;
        message = 'Scheduler restarted successfully';
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use: start, stop, or restart'
        });
    }

    const statusCode = result ? 200 : 400;

    res.status(statusCode).json({
      success: result,
      message,
      data: scheduler.getStatus(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Failed to ${req.params.action} scheduler`,
      details: error.message
    });
  }
});

/**
 * GET /api/v1/scanner/scraper/logs
 * Get scraping logs
 */
router.get('/scraper/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const logs = db.prepare(`
      SELECT *
      FROM scraping_jobs_log
      WHERE job_type = 'gebiz_rss'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const totalCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM scraping_jobs_log
      WHERE job_type = 'gebiz_rss'
    `).get();

    res.json({
      success: true,
      data: {
        logs,
        totalCount: totalCount.count,
        limit,
        offset
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get scraping logs',
      details: error.message
    });
  }
});

// ============================================================================
// PORTAL MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/scanner/portals
 * List all scraping portals with their status
 */
router.get('/portals', (req, res) => {
  try {
    const portals = db.prepare(`
      SELECT * FROM scraping_portals
      ORDER BY
        CASE type
          WHEN 'government' THEN 1
          WHEN 'aggregator' THEN 2
          WHEN 'hospitality' THEN 3
          ELSE 4
        END,
        name ASC
    `).all();

    res.json({ success: true, data: portals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/v1/scanner/portals/:key
 * Toggle portal enabled/disabled (only if scraper_available)
 */
router.patch('/portals/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined) {
      return res.status(400).json({ success: false, error: 'enabled field required' });
    }

    const portal = db.prepare('SELECT * FROM scraping_portals WHERE portal_key = ?').get(key);
    if (!portal) {
      return res.status(404).json({ success: false, error: 'Portal not found' });
    }

    // Only allow enabling if scraper is available
    if (enabled && !portal.scraper_available) {
      return res.status(400).json({
        success: false,
        error: 'Cannot enable portal: scraper not yet available (Coming Soon)'
      });
    }

    db.prepare(`
      UPDATE scraping_portals
      SET enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE portal_key = ?
    `).run(enabled ? 1 : 0, key);

    const updated = db.prepare('SELECT * FROM scraping_portals WHERE portal_key = ?').get(key);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// SETTINGS ENDPOINTS (scanner_settings table)
// ============================================================================

// All available categories with display labels
const ALL_CATEGORIES = [
  { key: 'healthcare_staffing', label: 'Healthcare Staffing', keywords: 'hospital, nursing, clinical, medical, ancillary' },
  { key: 'hospitality_services', label: 'Hospitality Services', keywords: 'hotel, banquet, resort, convention, F&B' },
  { key: 'manpower_services', label: 'Manpower Services', keywords: 'manpower, staffing, personnel, outsourcing' },
  { key: 'cleaning_services', label: 'Cleaning Services', keywords: 'cleaning, housekeeping, janitorial, sanitation' },
  { key: 'security_services', label: 'Security Services', keywords: 'security, guard, surveillance, patrol' },
  { key: 'catering_services', label: 'Catering Services', keywords: 'catering, food, beverage, canteen, dining' },
  { key: 'event_management', label: 'Event Management', keywords: 'event, conference, seminar, exhibition' },
  { key: 'facility_management', label: 'Facility Management', keywords: 'facility, building, repair, property' },
  { key: 'transport_services', label: 'Transport Services', keywords: 'transport, vehicle, bus, logistics' },
  { key: 'general_services', label: 'General Services', keywords: 'uncategorized tenders' }
];

/**
 * GET /api/v1/scanner/settings/categories
 * Get enabled feed categories
 */
router.get('/settings/categories', (req, res) => {
  try {
    let enabledKeys = [];
    try {
      const setting = db.prepare("SELECT value FROM scanner_settings WHERE key = 'feed_categories'").get();
      if (setting && setting.value) {
        enabledKeys = setting.value.split(',').map(c => c.trim()).filter(Boolean);
      }
    } catch (_) {}

    const available = ALL_CATEGORIES.map(cat => ({
      ...cat,
      enabled: enabledKeys.includes(cat.key)
    }));

    res.json({
      success: true,
      data: { enabled: enabledKeys, available }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/v1/scanner/settings/categories
 * Update enabled feed categories
 */
router.patch('/settings/categories', (req, res) => {
  try {
    let { categories } = req.body || {};
    // Handle string (comma-separated)
    if (typeof categories === 'string') {
      categories = categories.split(',').map(c => c.trim()).filter(Boolean);
    }
    // Handle object-form {"0":"val1","1":"val2"} from sanitizeInput middleware
    if (categories && typeof categories === 'object' && !Array.isArray(categories)) {
      categories = Object.values(categories);
    }
    if (!Array.isArray(categories)) {
      console.error('PATCH /settings/categories - invalid body:', JSON.stringify(req.body));
      return res.status(400).json({ success: false, error: 'categories must be an array' });
    }

    // Validate all keys
    const validKeys = ALL_CATEGORIES.map(c => c.key);
    const filtered = categories.filter(c => validKeys.includes(c));
    const value = filtered.join(',');

    db.prepare(`
      INSERT INTO scanner_settings (key, value, updated_at)
      VALUES ('feed_categories', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(value, value);

    const available = ALL_CATEGORIES.map(cat => ({
      ...cat,
      enabled: filtered.includes(cat.key)
    }));

    res.json({
      success: true,
      data: { enabled: filtered, available }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DASHBOARD ENDPOINT
// ============================================================================

/**
 * GET /api/v1/scanner/dashboard
 * Combined dashboard with all scanner metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Alert stats
    const activeAlerts = db.prepare('SELECT COUNT(*) as count FROM tender_alerts WHERE active = 1').get().count;
    const totalMatches = db.prepare('SELECT COUNT(*) as count FROM tender_matches').get().count;
    const unreadMatches = db.prepare('SELECT COUNT(*) as count FROM tender_matches WHERE notified = 0').get().count;
    const lastChecked = db.prepare('SELECT MAX(last_checked) as time FROM tender_alerts').get().time;

    // Feed stats
    const feedStats = {
      totalOpen: db.prepare(`
        SELECT COUNT(*) as count
        FROM gebiz_active_tenders
        WHERE dismissed = 0 AND in_pipeline = 0
      `).get().count,
      totalDismissed: db.prepare(`
        SELECT COUNT(*) as count
        FROM gebiz_active_tenders
        WHERE dismissed = 1
      `).get().count,
      totalInPipeline: db.prepare(`
        SELECT COUNT(*) as count
        FROM gebiz_active_tenders
        WHERE in_pipeline = 1
      `).get().count,
      lastScraped: db.prepare(`
        SELECT MAX(scraped_at) as time
        FROM gebiz_active_tenders
      `).get().time
    };

    // Scraper status
    let scraperStatus = null;
    if (scrapingService) {
      try {
        scraperStatus = scrapingService.getStatus();
      } catch (error) {
        console.error('Error getting scraper status:', error);
      }
    }

    // Recent matches
    const recentMatches = db.prepare(`
      SELECT tm.*, ta.keyword
      FROM tender_matches tm
      JOIN tender_alerts ta ON tm.alert_id = ta.id
      ORDER BY tm.created_at DESC
      LIMIT 10
    `).all();

    // Recommended keywords
    const recommendedKeywords = [
      { keyword: 'Supply of Manpower Services', reason: 'Primary GeBIZ keyword for staffing tenders' },
      { keyword: 'Provision of Temporary Staff', reason: 'Common phrasing for temp work contracts' },
      { keyword: 'Event Support Services', reason: 'Event-based manpower needs' },
      { keyword: 'Customer Service Officers', reason: 'Front-line service staff tenders' },
      { keyword: 'Ad-hoc Manpower', reason: 'Short-term staffing requirements' },
      { keyword: 'Term Contract Labour', reason: 'Long-term recurring contracts' },
    ];

    // Filter out already existing alerts
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
        alerts: {
          active: activeAlerts,
          totalMatches,
          unreadMatches,
          lastChecked
        },
        feed: feedStats,
        scraper: scraperStatus,
        recentMatches,
        recommendedKeywords: newRecommendations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
