/**
 * GeBIZ Routes - Web scraping and tender management
 * Handles GeBIZ scraping, monitoring, configuration, and testing
 * 
 * @module ai-automation/gebiz/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { generateMockTenders } = require('../utils/scraping-helpers');

// Production web scraping imports (lazy-loaded)
let GeBIZScraper = null;
let scrapingMonitor = null;
let DataValidator = null;
let gebizScraper = null;
let dataValidator = null;

/**
 * Lazy loading function for scraping dependencies
 */
function ensureScrapingDependencies() {
  if (!GeBIZScraper) {
    console.log('🔄 Loading scraping dependencies...');
    GeBIZScraper = require('../../../../../utils/scraping/gebiz-scraper');
    scrapingMonitor = require('../../../../../utils/scraping/scraping-monitor');
    DataValidator = require('../../../../../utils/scraping/data-validator');
    dataValidator = new DataValidator();
    console.log('✅ Scraping dependencies loaded successfully');
  }
}

/**
 * POST /scrape
 * Scrape GeBIZ for new tenders using production web scraping
 */
router.post('/scrape', async (req, res) => {
  const sessionId = `SCR${Date.now()}`;

  try {
    // Load scraping dependencies on first use
    ensureScrapingDependencies();

    const {
      categories = ['manpower', 'hr services', 'event support'],
      useHeadless = true,
      maxRetries = 3,
      forceRescrape = false
    } = req.body;

    // Start monitoring session
    scrapingMonitor.startSession(sessionId, {
      categories,
      useHeadless,
      maxRetries,
      forceRescrape
    });

    scrapingMonitor.addMilestone(sessionId, 'scraping_started',
      `Starting GeBIZ scrape for categories: ${categories.join(', ')}`);

    // Initialize scraper if not already done
    if (!gebizScraper || forceRescrape) {
      gebizScraper = new GeBIZScraper({
        headless: useHeadless,
        retries: maxRetries,
        timeout: 30000
      });
    }

    scrapingMonitor.updateSessionStats(sessionId, { requestsMade: 1 });

    // Perform actual scraping
    const scrapedTenders = await gebizScraper.scrapeTenders(categories);

    scrapingMonitor.addMilestone(sessionId, 'scraping_completed',
      `Raw scraping completed, found ${scrapedTenders.length} potential tenders`);

    // Get existing tenders for duplicate checking
    const existingTenders = db.prepare(`
      SELECT external_id, title, agency, estimated_value, closing_date
      FROM tenders WHERE source = 'gebiz'
    `).all();

    // Validate and deduplicate scraped data
    const validatedTenders = [];
    const rejectedTenders = [];
    const duplicateTenders = [];

    for (const tender of scrapedTenders) {
      // Validate tender data
      const validation = dataValidator.validateTender(tender);

      if (!validation.isValid) {
        rejectedTenders.push({
          tender: tender,
          errors: validation.errors,
          warnings: validation.warnings
        });
        continue;
      }

      // Check for duplicates
      const duplicateCheck = dataValidator.checkForDuplicates(validation.cleaned, existingTenders);

      if (duplicateCheck.exact) {
        duplicateTenders.push({
          tender: validation.cleaned,
          duplicate: duplicateCheck.exact,
          reason: 'Exact duplicate'
        });
        continue;
      }

      if (duplicateCheck.similar.length > 0 && duplicateCheck.confidence < 50) {
        duplicateTenders.push({
          tender: validation.cleaned,
          similar: duplicateCheck.similar[0],
          reason: duplicateCheck.similar[0].reason
        });
        continue;
      }

      // Add data quality metrics
      validation.cleaned.data_quality_score = validation.dataQualityScore;
      validation.cleaned.validation_warnings = validation.warnings;
      validation.cleaned.scraping_session_id = sessionId;

      validatedTenders.push(validation.cleaned);
    }

    scrapingMonitor.addMilestone(sessionId, 'validation_completed',
      `Validation completed: ${validatedTenders.length} valid, ${rejectedTenders.length} rejected, ${duplicateTenders.length} duplicates`);

    // Insert validated tenders
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO tenders
      (id, source, external_id, title, agency, category, estimated_value,
       closing_date, status, manpower_required, duration_months, location,
       estimated_charge_rate, estimated_pay_rate, estimated_monthly_revenue,
       win_probability, recommended_action, data_quality_score, source_url,
       scraping_session_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const inserted = [];
    validatedTenders.forEach(tender => {
      try {
        insertStmt.run(
          tender.id, tender.source, tender.external_id, tender.title,
          tender.agency, tender.category, tender.estimated_value,
          tender.closing_date, 'new', tender.manpower_required,
          tender.duration_months, tender.location, tender.estimated_charge_rate,
          tender.estimated_pay_rate, tender.estimated_monthly_revenue,
          tender.win_probability, tender.recommended_action,
          tender.data_quality_score, tender.source_url, tender.scraping_session_id
        );
        inserted.push(tender);
      } catch (e) {
        console.log('Failed to insert tender:', e.message);
      }
    });

    // Update session stats and end session
    scrapingMonitor.updateSessionStats(sessionId, {
      tendersFound: inserted.length,
      requestsMade: 1
    });

    scrapingMonitor.endSession(sessionId, true, {
      totalScraped: scrapedTenders.length,
      validatedTenders: validatedTenders.length,
      insertedTenders: inserted.length,
      rejectedTenders: rejectedTenders.length,
      duplicateTenders: duplicateTenders.length
    });

    scrapingMonitor.addMilestone(sessionId, 'process_completed',
      `Successfully inserted ${inserted.length} new tenders`);

    res.json({
      success: true,
      message: `Production scraping completed: ${inserted.length} new tenders added`,
      data: {
        sessionId,
        totalScraped: scrapedTenders.length,
        validated: validatedTenders.length,
        newInserted: inserted.length,
        rejected: rejectedTenders.length,
        duplicates: duplicateTenders.length,
        tenders: inserted,
        rejectedReasons: rejectedTenders.map(r => ({
          title: r.tender.title,
          errors: r.errors
        })).slice(0, 5),
        scrapingStats: gebizScraper?.getStats() || null,
        dataQualityAverage: inserted.length > 0 ?
          Math.round(inserted.reduce((sum, t) => sum + (t.data_quality_score || 0), 0) / inserted.length) : 0
      }
    });
  } catch (error) {
    scrapingMonitor.reportError(sessionId, error, { categories: req.body.categories });
    scrapingMonitor.endSession(sessionId, false);

    console.error('Production scraping failed:', error);

    // Fallback to mock data if scraping fails completely
    console.log('Falling back to mock data generation...');
    const fallbackTenders = generateMockTenders(
      req.body.categories || ['manpower', 'hr services', 'event support'], 2);

    res.status(500).json({
      success: false,
      error: error.message,
      fallback: true,
      message: 'Scraping failed, generated fallback data',
      data: {
        sessionId,
        fallbackTenders: fallbackTenders.length,
        tenders: fallbackTenders
      }
    });
  }
});

/**
 * GET /status
 * Get scraper status and history
 */
router.get('/status', (req, res) => {
  try {
    ensureScrapingDependencies();

    const recentTenders = db.prepare(`
      SELECT id, title, agency, estimated_value, closing_date, created_at,
             data_quality_score, scraping_session_id
      FROM tenders
      WHERE source = 'gebiz'
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // Basic stats
    const stats = {
      totalGebizTenders: db.prepare(`SELECT COUNT(*) as c FROM tenders WHERE source = 'gebiz'`).get().c,
      newTodayCount: db.prepare(`
        SELECT COUNT(*) as c FROM tenders
        WHERE source = 'gebiz' AND date(created_at) = date('now')
      `).get().c,
      newThisWeekCount: db.prepare(`
        SELECT COUNT(*) as c FROM tenders
        WHERE source = 'gebiz' AND created_at >= datetime('now', '-7 days')
      `).get().c,
      lastScrapeTime: recentTenders[0]?.created_at || null,
    };

    // Data quality metrics
    const qualityStats = db.prepare(`
      SELECT
        AVG(data_quality_score) as avgQualityScore,
        MIN(data_quality_score) as minQualityScore,
        MAX(data_quality_score) as maxQualityScore,
        COUNT(CASE WHEN data_quality_score >= 80 THEN 1 END) as highQualityCount,
        COUNT(CASE WHEN data_quality_score < 60 THEN 1 END) as lowQualityCount
      FROM tenders
      WHERE source = 'gebiz' AND data_quality_score IS NOT NULL
    `).get();

    // Scraping performance from monitoring system
    const scrapingStatus = scrapingMonitor.getAllSessionsStatus();
    const healthStatus = scrapingMonitor.getHealthStatus();

    // Scraper configuration
    const scraperConfig = gebizScraper ? {
      isInitialized: gebizScraper.isInitialized,
      stats: gebizScraper.getStats()
    } : null;

    res.json({
      success: true,
      data: {
        basicStats: stats,
        dataQuality: {
          averageScore: qualityStats.avgQualityScore ? Math.round(qualityStats.avgQualityScore) : null,
          scoreRange: qualityStats.minQualityScore ?
            `${qualityStats.minQualityScore} - ${qualityStats.maxQualityScore}` : 'N/A',
          highQualityCount: qualityStats.highQualityCount || 0,
          lowQualityCount: qualityStats.lowQualityCount || 0
        },
        scrapingPerformance: scrapingStatus.globalStats,
        healthStatus: healthStatus,
        scraperConfig: scraperConfig,
        recentSessions: scrapingStatus.sessions.slice(0, 5),
        recentTenders: recentTenders,
        recentErrors: scrapingStatus.recentErrors
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /session/:sessionId
 * Get detailed scraping session information
 */
router.get('/session/:sessionId', (req, res) => {
  try {
    ensureScrapingDependencies();

    const sessionStatus = scrapingMonitor.getSessionStatus(req.params.sessionId);

    if (!sessionStatus) {
      return res.status(404).json({
        success: false,
        error: 'Scraping session not found'
      });
    }

    res.json({
      success: true,
      data: sessionStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /configure
 * Configure scraper settings
 */
router.post('/configure', async (req, res) => {
  try {
    ensureScrapingDependencies();

    const {
      headless = true,
      timeout = 30000,
      retries = 3,
      delay = 2000,
      restartScraper = false
    } = req.body;

    // Restart scraper with new configuration
    if (gebizScraper && restartScraper) {
      await gebizScraper.cleanup();
      gebizScraper = null;
    }

    if (!gebizScraper) {
      gebizScraper = new GeBIZScraper({
        headless,
        timeout,
        retries,
        delay
      });
    }

    res.json({
      success: true,
      message: 'Scraper configuration updated',
      data: {
        headless,
        timeout,
        retries,
        delay,
        scraperRestarted: restartScraper
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /test
 * Test scraper connectivity and configuration
 */
router.post('/test', async (req, res) => {
  const testSessionId = `TEST${Date.now()}`;

  try {
    ensureScrapingDependencies();

    scrapingMonitor.startSession(testSessionId, { test: true });

    if (!gebizScraper) {
      gebizScraper = new GeBIZScraper({ headless: true });
    }

    // Test basic connectivity
    await gebizScraper.initialize();
    scrapingMonitor.addMilestone(testSessionId, 'initialization_test',
      'Scraper initialized successfully');

    // Quick test navigation
    await gebizScraper.page.goto('https://www.gebiz.gov.sg',
      { waitUntil: 'domcontentloaded', timeout: 15000 });
    scrapingMonitor.addMilestone(testSessionId, 'navigation_test',
      'Successfully navigated to GeBIZ');

    await gebizScraper.cleanup();
    scrapingMonitor.endSession(testSessionId, true);

    res.json({
      success: true,
      message: 'Scraper test completed successfully',
      data: {
        testSessionId,
        status: 'passed',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    scrapingMonitor.reportError(testSessionId, error);
    scrapingMonitor.endSession(testSessionId, false);

    res.status(500).json({
      success: false,
      message: 'Scraper test failed',
      error: error.message,
      data: {
        testSessionId,
        status: 'failed'
      }
    });
  }
});

/**
 * POST /cleanup
 * Cleanup scraper resources
 */
router.post('/cleanup', async (req, res) => {
  try {
    ensureScrapingDependencies();

    if (gebizScraper) {
      await gebizScraper.cleanup();
      gebizScraper = null;
    }

    res.json({
      success: true,
      message: 'Scraper resources cleaned up successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
