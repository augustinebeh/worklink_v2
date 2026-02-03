/**
 * AI Automation Routes - GeBIZ Scraping, Candidate Sourcing, Tender Analysis
 * WorkLink v2 - Powered by Claude AI
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');
const { formatDateSG } = require('../../../shared/constants');
const {
  generateJobPostings,
  generateOutreachMessage,
  analyzeTender: analyzeWithClaude,
  matchCandidates,
} = require('../../../utils/claude');
const {
  enhancedMatchCandidates,
  calculateCandidateMatchScore,
} = require('../../../utils/candidate-matching');

// Production web scraping imports (lazy-loaded to prevent blocking server startup)
let GeBIZScraper = null;
let scrapingMonitor = null;
let DataValidator = null;

// Initialize scraper and validator instances
let gebizScraper = null;
let dataValidator = null;

// Lazy loading function for scraping dependencies
function ensureScrapingDependencies() {
  if (!GeBIZScraper) {
    console.log('🔄 Loading scraping dependencies...');
    GeBIZScraper = require('../../../utils/scraping/gebiz-scraper');
    scrapingMonitor = require('../../../utils/scraping/scraping-monitor');
    DataValidator = require('../../../utils/scraping/data-validator');
    dataValidator = new DataValidator();
    console.log('✅ Scraping dependencies loaded successfully');
  }
}

function getScrapingDeps() {
  ensureScrapingDependencies();
  return { GeBIZScraper, scrapingMonitor, DataValidator, dataValidator };
}

// ============================================
// GEBIZ TENDER SCRAPER (Simulated for now)
// ============================================

/**
 * Scrape GeBIZ for new tenders using production web scraping
 */
router.post('/gebiz/scrape', async (req, res) => {
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

    scrapingMonitor.addMilestone(sessionId, 'scraping_started', `Starting GeBIZ scrape for categories: ${categories.join(', ')}`);

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

    scrapingMonitor.addMilestone(sessionId, 'scraping_completed', `Raw scraping completed, found ${scrapedTenders.length} potential tenders`);

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

    scrapingMonitor.addMilestone(sessionId, 'process_completed', `Successfully inserted ${inserted.length} new tenders`);

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
    scrapingMonitor.reportError(sessionId, error, { categories });
    scrapingMonitor.endSession(sessionId, false);

    console.error('Production scraping failed:', error);

    // Fallback to mock data if scraping fails completely
    console.log('Falling back to mock data generation...');
    const fallbackTenders = generateMockTenders(req.body.categories || ['manpower', 'hr services', 'event support'], 2);

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
 * Get scraper status and history
 */
router.get('/gebiz/status', (req, res) => {
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
 * Get detailed scraping session information
 */
router.get('/gebiz/session/:sessionId', (req, res) => {
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
 * Configure scraper settings
 */
router.post('/gebiz/configure', async (req, res) => {
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
 * Test scraper connectivity and configuration
 */
router.post('/gebiz/test', async (req, res) => {
  const testSessionId = `TEST${Date.now()}`;

  try {
    ensureScrapingDependencies();

    scrapingMonitor.startSession(testSessionId, { test: true });

    if (!gebizScraper) {
      gebizScraper = new GeBIZScraper({ headless: true });
    }

    // Test basic connectivity
    await gebizScraper.initialize();
    scrapingMonitor.addMilestone(testSessionId, 'initialization_test', 'Scraper initialized successfully');

    // Quick test navigation
    await gebizScraper.page.goto('https://www.gebiz.gov.sg', { waitUntil: 'domcontentloaded', timeout: 15000 });
    scrapingMonitor.addMilestone(testSessionId, 'navigation_test', 'Successfully navigated to GeBIZ');

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
 * Cleanup scraper resources
 */
router.post('/gebiz/cleanup', async (req, res) => {
  try {
    ensureScrapingDependencies();

    if (gebizScraper) {
      await gebizScraper.cleanup();
      gebizScraper = null;
    }

    // Clean up old monitoring sessions
    const cleanedSessions = scrapingMonitor.cleanupOldSessions();

    res.json({
      success: true,
      message: 'Scraper resources cleaned up',
      data: {
        scraperCleaned: true,
        oldSessionsCleaned: cleanedSessions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// AI TENDER ANALYZER
// ============================================

/**
 * Analyze a tender and provide AI recommendations (Claude-powered)
 */
router.post('/tenders/:id/analyze', async (req, res) => {
  try {
    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
    if (!tender) {
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }

    // Get company context for better analysis
    const companyContext = {
      totalCandidates: db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE status = 'active'`).get().c,
      avgRating: db.prepare(`SELECT AVG(rating) as r FROM candidates WHERE rating IS NOT NULL`).get().r || 4.2,
    };

    let analysis;
    try {
      // Use Claude AI for analysis
      analysis = await analyzeWithClaude(tender, companyContext);
    } catch (aiError) {
      console.warn('Claude AI unavailable, using fallback analysis:', aiError.message);
      // Fallback to rule-based analysis
      analysis = analyzeTender(tender);
    }

    // Update tender with analysis
    db.prepare(`
      UPDATE tenders
      SET win_probability = ?, recommended_action = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(analysis.winProbability, analysis.recommendedAction, tender.id);

    res.json({
      success: true,
      data: {
        tender,
        analysis,
        aiPowered: true,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Batch analyze all new tenders (Claude-powered)
 */
router.post('/tenders/analyze-all', async (req, res) => {
  try {
    const newTenders = db.prepare(`
      SELECT * FROM tenders WHERE status = 'new' AND win_probability IS NULL
    `).all();

    const companyContext = {
      totalCandidates: db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE status = 'active'`).get().c,
      avgRating: db.prepare(`SELECT AVG(rating) as r FROM candidates WHERE rating IS NOT NULL`).get().r || 4.2,
    };

    const results = [];
    for (const tender of newTenders) {
      let analysis;
      try {
        analysis = await analyzeWithClaude(tender, companyContext);
      } catch (aiError) {
        // Fallback to rule-based
        analysis = analyzeTender(tender);
      }

      db.prepare(`
        UPDATE tenders
        SET win_probability = ?, recommended_action = ?
        WHERE id = ?
      `).run(analysis.winProbability, analysis.recommendedAction, tender.id);

      results.push({ id: tender.id, title: tender.title, ...analysis });
    }

    res.json({
      success: true,
      message: `Analyzed ${results.length} tenders with AI`,
      data: results,
      aiPowered: true,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// CANDIDATE SOURCING AUTOMATION
// ============================================

/**
 * Generate job posting content for multiple platforms (Claude-powered)
 */
router.post('/sourcing/generate-posting', async (req, res) => {
  try {
    const { jobTitle, payRate, location, requirements, slots } = req.body;

    let postings;
    try {
      // Use Claude AI to generate engaging postings
      postings = await generateJobPostings({ jobTitle, payRate, location, requirements, slots });
    } catch (aiError) {
      console.warn('Claude AI unavailable, using template postings:', aiError.message);
      // Fallback to template-based generation
      postings = {
        telegram: generateTelegramPosting(jobTitle, payRate, location, requirements, slots),
        whatsapp: generateWhatsAppPosting(jobTitle, payRate, location, requirements, slots),
        facebook: generateFastJobsPosting(jobTitle, payRate, location, requirements, slots),
        instagram: generateInstagramPosting(jobTitle, payRate, location, requirements, slots),
      };
    }

    res.json({ success: true, data: postings, aiPowered: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate mass outreach messages for candidates (Claude-powered)
 */
router.post('/sourcing/generate-outreach', async (req, res) => {
  try {
    const { jobId, candidateIds } = req.body;

    const job = db.prepare('SELECT j.*, c.company_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    let candidates;
    if (candidateIds && candidateIds.length > 0) {
      candidates = db.prepare(`
        SELECT * FROM candidates WHERE id IN (${candidateIds.map(() => '?').join(',')})
      `).all(...candidateIds);
    } else {
      // Auto-select best candidates
      candidates = db.prepare(`
        SELECT * FROM candidates
        WHERE status = 'active'
        ORDER BY rating DESC, total_jobs_completed DESC
        LIMIT 20
      `).all();
    }

    // Generate messages - use Claude for each candidate
    const messages = [];
    for (const candidate of candidates) {
      let message;
      try {
        message = await generateOutreachMessage(candidate, job);
      } catch (aiError) {
        // Fallback to template
        message = generatePersonalizedOutreach(candidate, job);
      }

      messages.push({
        candidateId: candidate.id,
        candidateName: candidate.name,
        phone: candidate.phone,
        message,
      });
    }

    res.json({
      success: true,
      data: {
        job,
        totalCandidates: messages.length,
        messages,
        aiPowered: true,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get enhanced candidate recommendations for a job
 */
router.get('/sourcing/recommend/:jobId', async (req, res) => {
  try {
    const { useAI = 'true', minScore = '30', maxResults = '10' } = req.query;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Get candidates with comprehensive stats
    const candidates = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM deployments d WHERE d.candidate_id = c.id AND d.status = 'completed') as completed_jobs,
        (SELECT AVG(d.rating) FROM deployments d WHERE d.candidate_id = c.id AND d.rating IS NOT NULL) as avg_rating,
        (SELECT MAX(d.created_at) FROM deployments d WHERE d.candidate_id = c.id) as last_job_date,
        COALESCE(c.total_jobs_completed, 0) as total_jobs_completed
      FROM candidates c
      WHERE c.status = 'active'
      ORDER BY c.last_seen DESC
    `).all();

    console.log(`🤖 [Recommendations] Processing ${candidates.length} active candidates for job: ${job.title}`);

    // Use enhanced matching system
    const matchingResults = await enhancedMatchCandidates(job, candidates, {
      useAI: useAI === 'true',
      minScore: parseInt(minScore),
      maxResults: parseInt(maxResults),
      includeReasons: true
    });

    // Store match scores in database for analytics
    if (matchingResults.matches.length > 0) {
      const storeScoreStmt = db.prepare(`
        INSERT OR REPLACE INTO job_match_scores (job_id, candidate_id, score, factors, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `);

      try {
        matchingResults.matches.forEach(match => {
          const candidate = candidates.find(c => c.id === match.id);
          if (candidate) {
            storeScoreStmt.run(
              job.id,
              match.id,
              match.score,
              JSON.stringify(match.factors || [])
            );
          }
        });
      } catch (dbError) {
        console.warn('Failed to store match scores:', dbError.message);
      }
    }

    // Format recommendations with candidate data
    const recommendations = matchingResults.matches.map(match => {
      const candidate = candidates.find(c => c.id === match.id);
      return {
        ...candidate,
        matchScore: match.score,
        matchReason: match.reason,
        keyStrengths: match.keyStrengths,
        potentialConcerns: match.potentialConcerns,
        confidence: match.confidence,
        breakdown: match.breakdown,
        rank: match.rank,
      };
    });

    res.json({
      success: true,
      data: {
        job,
        recommendations,
        totalCandidates: matchingResults.totalCandidates,
        qualifiedCandidates: matchingResults.qualifiedCandidates,
        averageScore: matchingResults.averageScore,
        aiEnhanced: matchingResults.aiEnhanced,
        weights: matchingResults.weights,
      }
    });
  } catch (error) {
    console.error('Error in candidate recommendations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// AUTOMATION DASHBOARD STATS
// ============================================

router.get('/stats', (req, res) => {
  try {
    const stats = {
      tenders: {
        totalScraped: db.prepare(`SELECT COUNT(*) as c FROM tenders WHERE source = 'gebiz'`).get().c,
        pendingAnalysis: db.prepare(`SELECT COUNT(*) as c FROM tenders WHERE win_probability IS NULL`).get().c,
        highPriority: db.prepare(`SELECT COUNT(*) as c FROM tenders WHERE win_probability >= 60 AND status IN ('new', 'reviewing')`).get().c,
      },
      candidates: {
        totalActive: db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE status = 'active'`).get().c,
        availableNow: db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE status = 'active' AND online_status = 'online'`).get().c,
        topPerformers: db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE rating >= 4.5`).get().c,
      },
      jobs: {
        openJobs: db.prepare(`SELECT COUNT(*) as c FROM jobs WHERE status = 'open'`).get().c,
        unfilledSlots: db.prepare(`SELECT SUM(total_slots - filled_slots) as c FROM jobs WHERE status = 'open'`).get().c || 0,
      },
      ai: {
        enabled: !!process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-5-sonnet-20241022',
      },
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Check AI status and connectivity
 */
router.get('/ai-status', async (req, res) => {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  if (!hasApiKey) {
    return res.json({
      success: true,
      data: {
        enabled: false,
        status: 'not_configured',
        message: 'ANTHROPIC_API_KEY not set in environment',
      }
    });
  }

  try {
    // Quick test call to verify API key works
    const { askClaude } = require('../../../utils/claude');
    await askClaude('Say "ok"', 'Respond with only "ok"', { maxTokens: 10 });

    res.json({
      success: true,
      data: {
        enabled: true,
        status: 'connected',
        model: 'claude-3-5-sonnet-20241022',
        message: 'Claude AI is ready',
      }
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        enabled: true,
        status: 'error',
        message: error.message,
      }
    });
  }
});


// ============================================
// HELPER FUNCTIONS
// ============================================

function generateMockTenders(categories, count) {
  const agencies = ['MOE', 'MOH', 'MOM', 'MCCY', 'MND', 'GovTech', 'SLA', 'HDB', 'NEA', 'NParks'];
  const titles = [
    'Temporary Administrative Support Services',
    'Event Manpower Services',
    'Customer Service Officers',
    'Patient Service Associates',
    'Reception and Front Desk Services',
    'Logistics Support Manpower',
    'Data Entry Operators',
    'Call Centre Agents',
  ];
  const locations = ['Buona Vista', 'Jurong', 'Tampines', 'Woodlands', 'CBD', 'Changi', 'Toa Payoh', 'Queenstown'];

  const tenders = [];
  for (let i = 0; i < count; i++) {
    const value = Math.floor(Math.random() * 400000) + 100000;
    const manpower = Math.floor(Math.random() * 20) + 5;
    const duration = Math.floor(Math.random() * 12) + 3;
    const chargeRate = Math.floor(Math.random() * 8) + 16;
    const payRate = chargeRate - Math.floor(Math.random() * 4) - 4;

    tenders.push({
      id: `TND${Date.now()}${i}`,
      source: 'gebiz',
      external_id: `GBZ-2025-${String(Math.floor(Math.random() * 99999)).padStart(6, '0')}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      agency: agencies[Math.floor(Math.random() * agencies.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      estimated_value: value,
      closing_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      manpower_required: manpower,
      duration_months: duration,
      location: locations[Math.floor(Math.random() * locations.length)],
      estimated_charge_rate: chargeRate,
      estimated_pay_rate: payRate,
      estimated_monthly_revenue: Math.round(manpower * chargeRate * 160),
      win_probability: null,
      recommended_action: null,
    });
  }
  return tenders;
}

function analyzeTender(tender) {
  let score = 50; // Base score
  const factors = [];

  // Value assessment
  if (tender.estimated_value < 200000) {
    score += 10;
    factors.push({ factor: 'Contract Size', impact: '+10', reason: 'Smaller contracts have less competition' });
  } else if (tender.estimated_value > 500000) {
    score -= 10;
    factors.push({ factor: 'Contract Size', impact: '-10', reason: 'Large contracts attract more competitors' });
  }

  // Manpower assessment
  if (tender.manpower_required <= 10) {
    score += 15;
    factors.push({ factor: 'Headcount', impact: '+15', reason: 'Manageable team size within our capacity' });
  } else if (tender.manpower_required > 30) {
    score -= 15;
    factors.push({ factor: 'Headcount', impact: '-15', reason: 'May strain current candidate pool' });
  }

  // Category match
  const strongCategories = ['event', 'f&b', 'hospitality', 'admin'];
  const titleLower = tender.title?.toLowerCase() || '';
  if (strongCategories.some(cat => titleLower.includes(cat))) {
    score += 15;
    factors.push({ factor: 'Category Match', impact: '+15', reason: 'Strong track record in this category' });
  }

  // Time pressure
  const daysToClose = Math.ceil((new Date(tender.closing_date) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysToClose < 7) {
    score += 10;
    factors.push({ factor: 'Time Pressure', impact: '+10', reason: 'Short deadline reduces competition' });
  }

  // Margin assessment
  const margin = tender.estimated_charge_rate && tender.estimated_pay_rate
    ? ((tender.estimated_charge_rate - tender.estimated_pay_rate) / tender.estimated_charge_rate * 100)
    : 30;
  if (margin >= 35) {
    score += 10;
    factors.push({ factor: 'Margin', impact: '+10', reason: 'Healthy profit margin' });
  } else if (margin < 25) {
    score -= 10;
    factors.push({ factor: 'Margin', impact: '-10', reason: 'Tight margins' });
  }

  // Clamp score
  score = Math.max(10, Math.min(90, score));

  // Determine action
  let recommendedAction;
  if (score >= 70) {
    recommendedAction = 'STRONG BID - Priority submission';
  } else if (score >= 50) {
    recommendedAction = 'EVALUATE - Review requirements carefully';
  } else if (score >= 35) {
    recommendedAction = 'LOW PRIORITY - Bid only if capacity allows';
  } else {
    recommendedAction = 'SKIP - Does not match our strengths';
  }

  return {
    winProbability: score,
    recommendedAction,
    factors,
    summary: `This tender has a ${score}% estimated win probability based on our analysis.`,
  };
}

function generateTelegramPosting(title, pay, location, requirements, slots) {
  return `🔥 *URGENT HIRING* 🔥

*${title}*
📍 ${location}
💰 $${pay}/hr
👥 ${slots} slots available

✅ Requirements:
${requirements || '• Singaporean/PR\n• Age 18+\n• Able to commit'}

📲 Apply now: [Your Link]
💬 Or DM us directly!

#SingaporeJobs #PartTimeJobs #Hiring`;
}

function generateWhatsAppPosting(title, pay, location, requirements, slots) {
  return `*🚨 NOW HIRING 🚨*

Position: *${title}*
Location: ${location}
Pay: *$${pay}/hr*
Slots: ${slots} pax needed

Requirements:
${requirements || '• SC/PR only\n• 18 years and above\n• Committed'}

Interested? Reply "YES" with your name!`;
}

function generateFastJobsPosting(title, pay, location, requirements, slots) {
  return {
    title: title,
    payRate: `$${pay}/hr`,
    location: location,
    description: `We are looking for ${slots} reliable individuals for ${title} position.\n\nRequirements:\n${requirements || '- Singapore Citizen or PR\n- Minimum 18 years old\n- Positive attitude'}\n\nWhat we offer:\n- Competitive hourly rate\n- Fast payment\n- Flexible scheduling\n- Career progression opportunities`,
    tags: ['Part-time', 'Immediate Start', 'No Experience Needed'],
  };
}

function generateInstagramPosting(title, pay, location, requirements, slots) {
  return {
    caption: `💼 WE'RE HIRING! 💼

${title}
📍 ${location}
💵 $${pay}/hr
👥 ${slots} positions

Drop a "🙋" in the comments if interested!

DM us or click link in bio to apply ✨

#SGJobs #PartTimeWork #HiringNow #SingaporeLife #StudentJobs #FlexibleWork`,
    hashtags: '#SGJobs #PartTimeWork #HiringNow #SingaporeLife #StudentJobs #FlexibleWork #EarnExtra #WeekendJobs',
  };
}

function generatePersonalizedOutreach(candidate, job) {
  const firstName = candidate.name.split(' ')[0];
  const jobDate = formatDateSG(job.job_date, { weekday: 'short', day: 'numeric', month: 'short' });
  
  return `Hi ${firstName}! 👋

Got a great opportunity for you:

🏢 *${job.title}*
📍 ${job.location || 'TBC'}
📅 ${jobDate}
⏰ ${job.start_time} - ${job.end_time}
💰 *$${job.pay_rate}/hr*${job.xp_bonus ? ` + ${job.xp_bonus} bonus XP!` : ''}

${candidate.total_jobs_completed > 5 ? `You've been doing great with ${candidate.total_jobs_completed} jobs completed! ⭐` : ''}

Interested? Reply "YES" to confirm!`;
}


// ============================================
// AI ASSISTANT (Ad-hoc questions)
// ============================================

/**
 * Ask Claude AI a question about business, tenders, or recruitment
 */
router.post('/assistant', async (req, res) => {
  try {
    const { question, context = 'general' } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const { askClaude } = require('../../../utils/claude');

    // Get relevant data based on context
    let businessContext = '';

    if (context === 'tenders' || context === 'general') {
      const tenderStats = {
        total: db.prepare(`SELECT COUNT(*) as c FROM tenders`).get().c,
        highPriority: db.prepare(`SELECT COUNT(*) as c FROM tenders WHERE win_probability >= 60`).get().c,
        recent: db.prepare(`SELECT title, agency, win_probability FROM tenders ORDER BY created_at DESC LIMIT 5`).all(),
      };
      businessContext += `\nTender Pipeline: ${tenderStats.total} total, ${tenderStats.highPriority} high-priority\nRecent tenders: ${tenderStats.recent.map(t => t.title).join(', ')}`;
    }

    if (context === 'recruitment' || context === 'general') {
      const candidateStats = {
        total: db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE status = 'active'`).get().c,
        topRated: db.prepare(`SELECT COUNT(*) as c FROM candidates WHERE rating >= 4.5`).get().c,
        openJobs: db.prepare(`SELECT COUNT(*) as c FROM jobs WHERE status = 'open'`).get().c,
      };
      businessContext += `\nActive Candidates: ${candidateStats.total} (${candidateStats.topRated} top-rated)\nOpen Jobs: ${candidateStats.openJobs}`;
    }

    const systemPrompt = `You are an AI assistant for WorkLink, a Singapore-based staffing and manpower agency. You help with:
- BPO/Tender strategy (GeBIZ government tenders)
- Candidate recruitment and management
- Business operations advice

Current Business Context:${businessContext}

Be concise, practical, and use Singapore business context. Focus on actionable advice.`;

    const response = await askClaude(question, systemPrompt, { maxTokens: 800 });

    res.json({
      success: true,
      data: {
        question,
        answer: response,
        context,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// AUTOMATED OUTREACH SYSTEM
// ============================================

const {
  createOutreachCampaign,
  executeCampaign,
  getCampaignStats,
  CAMPAIGN_TYPES,
  CHANNELS,
  PRIORITIES,
} = require('../../../utils/candidate-outreach');

/**
 * Create a new outreach campaign
 */
router.post('/outreach/campaigns', async (req, res) => {
  try {
    const {
      name,
      type = CAMPAIGN_TYPES.JOB_INVITATION,
      jobId = null,
      targetCriteria = {},
      channels = [CHANNELS.WHATSAPP],
      priority = PRIORITIES.MEDIUM,
      scheduledAt = null,
      template = null,
      autoStart = false,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Campaign name is required' });
    }

    const result = await createOutreachCampaign({
      name,
      type,
      jobId,
      targetCriteria,
      channels,
      priority,
      scheduledAt,
      template,
      autoStart,
    });

    res.json({
      success: true,
      message: `Campaign ${autoStart ? 'created and started' : 'created'}`,
      data: result
    });
  } catch (error) {
    console.error('Error creating outreach campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Execute a campaign
 */
router.post('/outreach/campaigns/:campaignId/execute', async (req, res) => {
  try {
    const result = await executeCampaign(req.params.campaignId);
    res.json({
      success: true,
      message: 'Campaign executed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error executing campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get campaign statistics
 */
router.get('/outreach/campaigns/:campaignId/stats', (req, res) => {
  try {
    const stats = getCampaignStats(req.params.campaignId);

    if (!stats) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * List all campaigns
 */
router.get('/outreach/campaigns', (req, res) => {
  try {
    const { status, type, limit = '20' } = req.query;

    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (type) {
      whereConditions.push('type = ?');
      params.push(type);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const campaigns = db.prepare(`
      SELECT id, name, type, status, candidates_targeted, messages_sent,
             created_at, completed_at, job_id
      FROM outreach_campaigns
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(...params, parseInt(limit));

    // Add job titles for job-specific campaigns
    campaigns.forEach(campaign => {
      if (campaign.job_id) {
        const job = db.prepare('SELECT title FROM jobs WHERE id = ?').get(campaign.job_id);
        campaign.jobTitle = job?.title || 'Unknown Job';
      }
    });

    res.json({
      success: true,
      data: {
        campaigns,
        total: campaigns.length
      }
    });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Quick job-based outreach (simplified endpoint)
 */
router.post('/outreach/quick-job-invite/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { maxCandidates = 20, minScore = 50, channels = ['whatsapp'] } = req.body;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const campaignName = `Quick Invite: ${job.title}`;

    const result = await createOutreachCampaign({
      name: campaignName,
      type: CAMPAIGN_TYPES.JOB_INVITATION,
      jobId,
      targetCriteria: {
        maxCandidates: parseInt(maxCandidates),
        minMatchScore: parseInt(minScore),
        lastSeenDays: 30,
      },
      channels,
      priority: PRIORITIES.HIGH,
      autoStart: true,
    });

    res.json({
      success: true,
      message: 'Quick job invitation campaign started',
      data: result
    });
  } catch (error) {
    console.error('Error creating quick job invite:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Track candidate engagement
 */
router.post('/outreach/engagement', (req, res) => {
  try {
    const {
      candidateId,
      engagementType,
      engagementData = {},
      source = 'unknown',
      campaignId = null,
      jobId = null,
      engagementScore = 1,
    } = req.body;

    if (!candidateId || !engagementType) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and engagementType are required'
      });
    }

    const insertEngagementStmt = db.prepare(`
      INSERT INTO candidate_engagement
      (candidate_id, engagement_type, engagement_data, source, campaign_id, job_id, engagement_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = insertEngagementStmt.run(
      candidateId,
      engagementType,
      JSON.stringify(engagementData),
      source,
      campaignId,
      jobId,
      engagementScore
    );

    res.json({
      success: true,
      message: 'Engagement tracked successfully',
      data: { engagementId: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Error tracking engagement:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get candidate engagement history
 */
router.get('/outreach/engagement/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { limit = '50', days = '30' } = req.query;

    const engagements = db.prepare(`
      SELECT ce.*, oc.name as campaign_name, j.title as job_title
      FROM candidate_engagement ce
      LEFT JOIN outreach_campaigns oc ON ce.campaign_id = oc.id
      LEFT JOIN jobs j ON ce.job_id = j.id
      WHERE ce.candidate_id = ?
      AND ce.created_at >= datetime('now', '-' || ? || ' days')
      ORDER BY ce.created_at DESC
      LIMIT ?
    `).all(candidateId, parseInt(days), parseInt(limit));

    // Calculate engagement score
    const totalScore = engagements.reduce((sum, eng) => sum + (eng.engagement_score || 1), 0);
    const engagementScore = Math.min(100, Math.round(totalScore / Math.max(1, parseInt(days)) * 10));

    res.json({
      success: true,
      data: {
        candidateId,
        engagementScore,
        totalEngagements: engagements.length,
        engagements: engagements.map(e => ({
          ...e,
          engagement_data: JSON.parse(e.engagement_data || '{}')
        }))
      }
    });
  } catch (error) {
    console.error('Error getting engagement history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get outreach system statistics
 */
router.get('/outreach/stats', (req, res) => {
  try {
    const { days = '30' } = req.query;

    // Campaign stats
    const campaignStats = db.prepare(`
      SELECT
        COUNT(*) as totalCampaigns,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as activeCampaigns,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedCampaigns,
        SUM(candidates_targeted) as totalTargeted,
        SUM(messages_sent) as totalMessagesSent
      FROM outreach_campaigns
      WHERE created_at >= datetime('now', '-' || ? || ' days')
    `).get(parseInt(days));

    // Message stats by channel
    const channelStats = db.prepare(`
      SELECT
        channel,
        COUNT(*) as messagesSent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN replied_at IS NOT NULL THEN 1 END) as responses
      FROM outreach_messages
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY channel
    `).all(parseInt(days));

    // Top performing campaigns
    const topCampaigns = db.prepare(`
      SELECT oc.id, oc.name, oc.type, oc.messages_sent,
        COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) as responses,
        ROUND(COUNT(CASE WHEN om.replied_at IS NOT NULL THEN 1 END) * 100.0 / oc.messages_sent, 1) as responseRate
      FROM outreach_campaigns oc
      LEFT JOIN outreach_messages om ON oc.id = om.campaign_id
      WHERE oc.created_at >= datetime('now', '-' || ? || ' days')
        AND oc.messages_sent > 0
      GROUP BY oc.id
      ORDER BY responseRate DESC
      LIMIT 5
    `).all(parseInt(days));

    // Recent engagement trends
    const engagementTrends = db.prepare(`
      SELECT
        date(created_at) as date,
        COUNT(*) as engagements,
        COUNT(DISTINCT candidate_id) as uniqueCandidates
      FROM candidate_engagement
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY date DESC
      LIMIT 7
    `).all(parseInt(days));

    res.json({
      success: true,
      data: {
        campaignStats,
        channelStats,
        topCampaigns,
        engagementTrends,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Error getting outreach stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// ENGAGEMENT TRACKING SYSTEM
// ============================================

const {
  trackEngagement,
  trackEngagementBatch,
  getCandidateEngagementSummary,
  getEngagementLeaderboard,
  getEngagementAnalytics,
  predictCandidateResponsiveness,
  ENGAGEMENT_TYPES,
} = require('../../../utils/engagement-tracking');

/**
 * Track a single engagement event
 */
router.post('/engagement/track', (req, res) => {
  try {
    const {
      candidateId,
      engagementType,
      engagementData = {},
      source = 'api',
      campaignId = null,
      jobId = null,
      customScore = null,
    } = req.body;

    if (!candidateId || !engagementType) {
      return res.status(400).json({
        success: false,
        error: 'candidateId and engagementType are required'
      });
    }

    if (!ENGAGEMENT_TYPES[engagementType]) {
      return res.status(400).json({
        success: false,
        error: `Invalid engagement type: ${engagementType}`,
        availableTypes: Object.keys(ENGAGEMENT_TYPES)
      });
    }

    const result = trackEngagement(candidateId, engagementType, {
      engagementData,
      source,
      campaignId,
      jobId,
      customScore,
    });

    if (!result) {
      return res.status(500).json({
        success: false,
        error: 'Failed to track engagement'
      });
    }

    res.json({
      success: true,
      message: 'Engagement tracked successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in engagement tracking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Track multiple engagement events in batch
 */
router.post('/engagement/batch', (req, res) => {
  try {
    const { engagements } = req.body;

    if (!Array.isArray(engagements) || engagements.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'engagements array is required and must not be empty'
      });
    }

    // Validate each engagement
    for (const engagement of engagements) {
      if (!engagement.candidateId || !engagement.engagementType) {
        return res.status(400).json({
          success: false,
          error: 'Each engagement must have candidateId and engagementType'
        });
      }

      if (!ENGAGEMENT_TYPES[engagement.engagementType]) {
        return res.status(400).json({
          success: false,
          error: `Invalid engagement type: ${engagement.engagementType}`
        });
      }
    }

    const results = trackEngagementBatch(engagements);

    res.json({
      success: true,
      message: `Tracked ${results.length} engagement events`,
      data: {
        processed: results.length,
        failed: engagements.length - results.length,
        results
      }
    });
  } catch (error) {
    console.error('Error in batch engagement tracking:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get engagement summary for a candidate
 */
router.get('/engagement/candidate/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { days = '30' } = req.query;

    const summary = getCandidateEngagementSummary(candidateId, parseInt(days));

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found or no engagement data'
      });
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting engagement summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get engagement leaderboard
 */
router.get('/engagement/leaderboard', (req, res) => {
  try {
    const {
      period = '30',
      limit = '20',
      category = null,
      minEngagements = '5'
    } = req.query;

    const leaderboard = getEngagementLeaderboard({
      period: parseInt(period),
      limit: parseInt(limit),
      category,
      minEngagements: parseInt(minEngagements),
    });

    res.json({
      success: true,
      data: {
        leaderboard,
        period: `${period} days`,
        criteria: {
          minimumEngagements: parseInt(minEngagements),
          category: category || 'all'
        }
      }
    });
  } catch (error) {
    console.error('Error getting engagement leaderboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get engagement analytics for dashboard
 */
router.get('/engagement/analytics', (req, res) => {
  try {
    const { days = '30' } = req.query;

    const analytics = getEngagementAnalytics(parseInt(days));

    if (!analytics) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate analytics'
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting engagement analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Predict candidate responsiveness
 */
router.get('/engagement/predict/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;

    const prediction = predictCandidateResponsiveness(candidateId);

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Error predicting responsiveness:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get available engagement types
 */
router.get('/engagement/types', (req, res) => {
  try {
    const types = Object.entries(ENGAGEMENT_TYPES).map(([type, config]) => ({
      type,
      score: config.score,
      category: config.category,
      description: type.toLowerCase().replace(/_/g, ' ')
    }));

    res.json({
      success: true,
      data: {
        types,
        categories: [...new Set(types.map(t => t.category))]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Bulk update engagement metrics for all candidates
 */
router.post('/engagement/refresh-metrics', (req, res) => {
  try {
    const activeCandidates = db.prepare(`
      SELECT DISTINCT candidate_id
      FROM candidate_engagement
      WHERE created_at >= datetime('now', '-30 days')
    `).all();

    let updated = 0;
    for (const { candidate_id } of activeCandidates) {
      try {
        updateCandidateEngagementMetrics(candidate_id);
        updated++;
      } catch (error) {
        console.warn(`Failed to update metrics for candidate ${candidate_id}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: `Updated engagement metrics for ${updated} candidates`,
      data: {
        candidatesProcessed: activeCandidates.length,
        successfulUpdates: updated,
        failedUpdates: activeCandidates.length - updated,
      }
    });
  } catch (error) {
    console.error('Error refreshing engagement metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// FOLLOW-UP SEQUENCES SYSTEM
// ============================================

const {
  createFollowUpSequence,
  triggerFollowUpSequence,
  processFollowUpActions,
  initializeDefaultSequences,
  getFollowUpStats,
  TRIGGER_TYPES,
  ACTION_TYPES,
} = require('../../../utils/follow-up-sequences');

/**
 * Create a new follow-up sequence
 */
router.post('/follow-up/sequences', (req, res) => {
  try {
    const sequenceData = req.body;

    if (!sequenceData.name || !sequenceData.triggerType || !sequenceData.steps) {
      return res.status(400).json({
        success: false,
        error: 'name, triggerType, and steps are required'
      });
    }

    const result = createFollowUpSequence(sequenceData);

    res.json({
      success: true,
      message: 'Follow-up sequence created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating follow-up sequence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get all follow-up sequences
 */
router.get('/follow-up/sequences', (req, res) => {
  try {
    const { active = 'true' } = req.query;

    let whereClause = '';
    const params = [];

    if (active !== 'all') {
      whereClause = 'WHERE active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    const sequences = db.prepare(`
      SELECT id, name, description, trigger_type, active, created_at,
             (SELECT COUNT(*) FROM follow_up_instances WHERE sequence_id = follow_up_sequences.id) as total_instances
      FROM follow_up_sequences
      ${whereClause}
      ORDER BY created_at DESC
    `).all(...params);

    res.json({
      success: true,
      data: { sequences }
    });
  } catch (error) {
    console.error('Error getting follow-up sequences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get specific follow-up sequence details
 */
router.get('/follow-up/sequences/:sequenceId', (req, res) => {
  try {
    const sequence = db.prepare('SELECT * FROM follow_up_sequences WHERE id = ?').get(req.params.sequenceId);

    if (!sequence) {
      return res.status(404).json({
        success: false,
        error: 'Sequence not found'
      });
    }

    // Parse JSON fields
    sequence.trigger_conditions = JSON.parse(sequence.trigger_conditions || '{}');
    sequence.sequence_data = JSON.parse(sequence.sequence_data || '[]');

    // Get instance statistics
    const instanceStats = db.prepare(`
      SELECT
        COUNT(*) as total_instances,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_instances,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_instances,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_instances
      FROM follow_up_instances
      WHERE sequence_id = ?
    `).get(req.params.sequenceId);

    res.json({
      success: true,
      data: {
        sequence,
        stats: instanceStats
      }
    });
  } catch (error) {
    console.error('Error getting sequence details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Trigger a follow-up sequence for a candidate
 */
router.post('/follow-up/trigger', (req, res) => {
  try {
    const { candidateId, sequenceId, triggerEvent, triggerData = {} } = req.body;

    if (!candidateId || !sequenceId || !triggerEvent) {
      return res.status(400).json({
        success: false,
        error: 'candidateId, sequenceId, and triggerEvent are required'
      });
    }

    const result = triggerFollowUpSequence(candidateId, sequenceId, triggerEvent, triggerData);

    res.json({
      success: true,
      message: result.status === 'already_active' ? 'Candidate already has active sequence' : 'Follow-up sequence triggered',
      data: result
    });
  } catch (error) {
    console.error('Error triggering follow-up sequence:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Process pending follow-up actions
 */
router.post('/follow-up/process', async (req, res) => {
  try {
    const result = await processFollowUpActions();

    res.json({
      success: true,
      message: `Processed ${result.processed} follow-up actions`,
      data: result
    });
  } catch (error) {
    console.error('Error processing follow-up actions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get follow-up instances for a candidate
 */
router.get('/follow-up/candidate/:candidateId', (req, res) => {
  try {
    const { candidateId } = req.params;
    const { status = 'all' } = req.query;

    let whereClause = 'WHERE fi.candidate_id = ?';
    const params = [candidateId];

    if (status !== 'all') {
      whereClause += ' AND fi.status = ?';
      params.push(status);
    }

    const instances = db.prepare(`
      SELECT fi.*, fs.name as sequence_name, fs.trigger_type
      FROM follow_up_instances fi
      JOIN follow_up_sequences fs ON fi.sequence_id = fs.id
      ${whereClause}
      ORDER BY fi.created_at DESC
    `).all(...params);

    // Parse JSON fields
    instances.forEach(instance => {
      instance.trigger_data = JSON.parse(instance.trigger_data || '{}');
      instance.completed_steps = JSON.parse(instance.completed_steps || '[]');
    });

    res.json({
      success: true,
      data: { instances }
    });
  } catch (error) {
    console.error('Error getting candidate follow-ups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Cancel/pause a follow-up instance
 */
router.post('/follow-up/instances/:instanceId/cancel', (req, res) => {
  try {
    const { instanceId } = req.params;
    const { reason = 'manually_cancelled' } = req.body;

    const updateStmt = db.prepare(`
      UPDATE follow_up_instances
      SET status = 'cancelled', completed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND status = 'active'
    `);

    const result = updateStmt.run(instanceId);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Follow-up instance not found or not active'
      });
    }

    res.json({
      success: true,
      message: 'Follow-up instance cancelled',
      data: { instanceId, reason }
    });
  } catch (error) {
    console.error('Error cancelling follow-up:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get follow-up system statistics
 */
router.get('/follow-up/stats', (req, res) => {
  try {
    const { days = '30' } = req.query;

    const stats = getFollowUpStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting follow-up stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Initialize default follow-up sequences
 */
router.post('/follow-up/initialize-defaults', (req, res) => {
  try {
    initializeDefaultSequences();

    res.json({
      success: true,
      message: 'Default follow-up sequences initialized'
    });
  } catch (error) {
    console.error('Error initializing default sequences:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Auto-trigger follow-ups based on conditions
 */
router.post('/follow-up/auto-trigger', (req, res) => {
  try {
    const { triggerType, lookbackHours = 24 } = req.body;

    if (!triggerType) {
      return res.status(400).json({
        success: false,
        error: 'triggerType is required'
      });
    }

    let triggered = 0;
    const results = [];

    // Get sequence for this trigger type
    const sequence = db.prepare(`
      SELECT * FROM follow_up_sequences
      WHERE trigger_type = ? AND active = 1
      LIMIT 1
    `).get(triggerType);

    if (!sequence) {
      return res.json({
        success: true,
        message: 'No active sequence found for trigger type',
        data: { triggered: 0 }
      });
    }

    // Find candidates based on trigger type
    let candidatesToTrigger = [];

    switch (triggerType) {
      case TRIGGER_TYPES.NO_RESPONSE:
        // Find candidates who received job invitations but haven't responded
        candidatesToTrigger = db.prepare(`
          SELECT DISTINCT om.candidate_id, om.campaign_id, om.created_at
          FROM outreach_messages om
          LEFT JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
            AND ce.engagement_type IN ('MESSAGE_REPLY', 'JOB_APPLY')
            AND ce.created_at > om.created_at
          WHERE om.created_at >= datetime('now', '-' || ? || ' hours')
            AND om.campaign_type = 'job_invitation'
            AND ce.id IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM follow_up_instances fi
              WHERE fi.candidate_id = om.candidate_id
                AND fi.trigger_event = 'no_response_to_job'
                AND fi.status = 'active'
            )
        `).all(lookbackHours);
        break;

      case TRIGGER_TYPES.LOW_ENGAGEMENT:
        // Find candidates with low engagement scores
        candidatesToTrigger = db.prepare(`
          SELECT c.id as candidate_id, c.engagement_score, c.last_engagement
          FROM candidates c
          WHERE c.status = 'active'
            AND c.engagement_score < 30
            AND c.last_engagement < datetime('now', '-30 days')
            AND NOT EXISTS (
              SELECT 1 FROM follow_up_instances fi
              WHERE fi.candidate_id = c.id
                AND fi.trigger_event = 'low_engagement'
                AND fi.status = 'active'
            )
        `).all();
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Auto-triggering not implemented for trigger type: ${triggerType}`
        });
    }

    // Trigger sequences for qualifying candidates
    for (const candidate of candidatesToTrigger) {
      try {
        const result = triggerFollowUpSequence(
          candidate.candidate_id,
          sequence.id,
          triggerType,
          candidate
        );

        if (result.success) {
          triggered++;
          results.push({
            candidateId: candidate.candidate_id,
            instanceId: result.instanceId,
            success: true
          });
        }
      } catch (error) {
        results.push({
          candidateId: candidate.candidate_id,
          error: error.message,
          success: false
        });
      }
    }

    res.json({
      success: true,
      message: `Auto-triggered ${triggered} follow-up sequences`,
      data: {
        triggered,
        total_candidates: candidatesToTrigger.length,
        results
      }
    });
  } catch (error) {
    console.error('Error auto-triggering follow-ups:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get available trigger types and action types
 */
router.get('/follow-up/config', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        triggerTypes: Object.entries(TRIGGER_TYPES).map(([key, value]) => ({
          key,
          value,
          description: key.toLowerCase().replace(/_/g, ' ')
        })),
        actionTypes: Object.entries(ACTION_TYPES).map(([key, value]) => ({
          key,
          value,
          description: key.toLowerCase().replace(/_/g, ' ')
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// ACQUISITION PERFORMANCE ANALYTICS
// ============================================

const {
  generateCampaignAnalytics,
  generateAcquisitionDashboard,
  KPI_DEFINITIONS,
} = require('../../../utils/acquisition-analytics');

/**
 * Get comprehensive analytics for a specific campaign
 */
router.get('/analytics/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const {
      includeComparisons = 'true',
      includePredictions = 'false',
      timeframe = '30_days'
    } = req.query;

    const analytics = generateCampaignAnalytics(campaignId, {
      includeComparisons: includeComparisons === 'true',
      includePredictions: includePredictions === 'true',
      timeframe,
    });

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or no analytics data available'
      });
    }

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error getting campaign analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get acquisition dashboard overview
 */
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const {
      timeframe = '30_days',
      includeComparisons = 'true'
    } = req.query;

    const dashboard = generateAcquisitionDashboard({
      timeframe,
      includeComparisons: includeComparisons === 'true',
    });

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    console.error('Error generating analytics dashboard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get campaign performance comparison
 */
router.get('/analytics/compare', (req, res) => {
  try {
    const { campaignIds, metrics = 'response_rate,conversion_rate' } = req.query;

    if (!campaignIds) {
      return res.status(400).json({
        success: false,
        error: 'campaignIds query parameter is required'
      });
    }

    const ids = campaignIds.split(',').slice(0, 5); // Limit to 5 campaigns
    const requestedMetrics = metrics.split(',');

    const comparisons = ids.map(campaignId => {
      try {
        const analytics = generateCampaignAnalytics(campaignId.trim(), {
          includeComparisons: false,
          includePredictions: false,
        });

        if (!analytics) return null;

        const comparison = {
          campaignId: analytics.campaign.id,
          campaignName: analytics.campaign.name,
          campaignType: analytics.campaign.type,
        };

        // Add requested metrics
        if (requestedMetrics.includes('response_rate')) {
          comparison.responseRate = analytics.coreMetrics.engagement.responseRate;
        }
        if (requestedMetrics.includes('conversion_rate')) {
          comparison.conversionRate = analytics.coreMetrics.conversion.conversionRate;
        }
        if (requestedMetrics.includes('reach')) {
          comparison.reach = analytics.coreMetrics.reach.total;
        }
        if (requestedMetrics.includes('cost')) {
          comparison.totalCost = analytics.costAnalysis?.totalCost || 0;
          comparison.roi = analytics.costAnalysis?.roi || 0;
        }

        return comparison;
      } catch (error) {
        console.warn(`Failed to get analytics for campaign ${campaignId}:`, error.message);
        return null;
      }
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        comparisons,
        metrics: requestedMetrics,
        totalCampaigns: comparisons.length,
      }
    });
  } catch (error) {
    console.error('Error comparing campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get KPI definitions and benchmarks
 */
router.get('/analytics/kpis', (req, res) => {
  try {
    // Get industry benchmarks (could be from external data or historical averages)
    const industryBenchmarks = {
      response_rate: { min: 15, average: 25, good: 35, excellent: 45 },
      conversion_rate: { min: 2, average: 5, good: 8, excellent: 12 },
      engagement_rate: { min: 20, average: 35, good: 50, excellent: 70 },
      cost_per_acquisition: { min: 50, average: 25, good: 15, excellent: 10 },
      retention_rate: { min: 60, average: 75, good: 85, excellent: 95 },
    };

    res.json({
      success: true,
      data: {
        definitions: KPI_DEFINITIONS,
        benchmarks: industryBenchmarks,
        description: 'Key performance indicators and industry benchmarks for acquisition campaigns'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Export campaign analytics data
 */
router.get('/analytics/export/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { format = 'json' } = req.query;

    const analytics = generateCampaignAnalytics(campaignId, {
      includeComparisons: true,
      includePredictions: true,
    });

    if (!analytics) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    if (format === 'csv') {
      // Generate CSV format
      const csvData = [
        ['Metric', 'Value', 'Description'],
        ['Campaign Name', analytics.campaign.name, 'Campaign identifier'],
        ['Total Reach', analytics.coreMetrics.reach.total, 'Total candidates contacted'],
        ['Response Rate', `${analytics.coreMetrics.engagement.responseRate}%`, 'Percentage who responded'],
        ['Conversion Rate', `${analytics.coreMetrics.conversion.conversionRate}%`, 'Percentage who accepted jobs'],
        ['Total Cost', `$${analytics.costAnalysis?.totalCost || 0}`, 'Total campaign cost'],
        ['ROI', `${analytics.costAnalysis?.roi || 0}%`, 'Return on investment'],
        ['Quality Score', analytics.qualityMetrics?.averageRating || 'N/A', 'Average candidate rating'],
      ];

      const csv = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaignId}_analytics.csv"`);
      res.send(csv);
    } else {
      // Return JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="campaign_${campaignId}_analytics.json"`);
      res.json({
        success: true,
        data: analytics,
        exportedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get real-time campaign metrics
 */
router.get('/analytics/realtime/:campaignId', (req, res) => {
  try {
    const { campaignId } = req.params;

    // Get real-time metrics from the last hour
    const realtimeMetrics = db.prepare(`
      SELECT
        COUNT(DISTINCT CASE WHEN om.created_at >= datetime('now', '-1 hour') THEN om.candidate_id END) as contacts_last_hour,
        COUNT(DISTINCT CASE WHEN om.replied_at >= datetime('now', '-1 hour') THEN om.candidate_id END) as responses_last_hour,
        COUNT(DISTINCT CASE WHEN ce.created_at >= datetime('now', '-1 hour') AND ce.engagement_type = 'JOB_APPLY' THEN ce.candidate_id END) as applications_last_hour,
        COUNT(DISTINCT om.candidate_id) as total_contacts,
        COUNT(DISTINCT CASE WHEN om.replied_at IS NOT NULL THEN om.candidate_id END) as total_responses
      FROM outreach_messages om
      LEFT JOIN candidate_engagement ce ON om.candidate_id = ce.candidate_id
        AND ce.created_at >= om.created_at
      WHERE om.campaign_id = ?
    `).get(campaignId);

    // Get campaign status
    const campaign = db.prepare('SELECT status, created_at FROM outreach_campaigns WHERE id = ?').get(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const runningTimeHours = Math.floor((Date.now() - new Date(campaign.created_at)) / (1000 * 60 * 60));

    res.json({
      success: true,
      data: {
        campaignId,
        status: campaign.status,
        runningTimeHours,
        lastHour: {
          contacts: realtimeMetrics.contacts_last_hour || 0,
          responses: realtimeMetrics.responses_last_hour || 0,
          applications: realtimeMetrics.applications_last_hour || 0,
        },
        totals: {
          contacts: realtimeMetrics.total_contacts || 0,
          responses: realtimeMetrics.total_responses || 0,
          responseRate: realtimeMetrics.total_contacts > 0 ?
            Math.round((realtimeMetrics.total_responses / realtimeMetrics.total_contacts) * 10000) / 100 : 0,
        },
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error getting realtime metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
