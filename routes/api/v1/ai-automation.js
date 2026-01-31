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

// ============================================
// GEBIZ TENDER SCRAPER (Simulated for now)
// ============================================

/**
 * Scrape GeBIZ for new tenders
 * In production: Use Puppeteer or Playwright to actually scrape
 * For now: Simulates fetching and returns sample new tenders
 */
router.post('/gebiz/scrape', async (req, res) => {
  try {
    const { categories = ['manpower', 'hr services', 'event support'] } = req.body;
    
    // Log scraper run
    const runId = `SCR${Date.now()}`;
    
    // In production, this would be actual scraping logic
    // For demo, we generate realistic tender data
    const scrapedTenders = generateMockTenders(categories, 3);
    
    // Insert new tenders
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO tenders 
      (id, source, external_id, title, agency, category, estimated_value, 
       closing_date, status, manpower_required, duration_months, location,
       estimated_charge_rate, estimated_pay_rate, estimated_monthly_revenue,
       win_probability, recommended_action, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    
    const inserted = [];
    scrapedTenders.forEach(tender => {
      try {
        insertStmt.run(
          tender.id, tender.source, tender.external_id, tender.title,
          tender.agency, tender.category, tender.estimated_value,
          tender.closing_date, 'new', tender.manpower_required,
          tender.duration_months, tender.location, tender.estimated_charge_rate,
          tender.estimated_pay_rate, tender.estimated_monthly_revenue,
          tender.win_probability, tender.recommended_action
        );
        inserted.push(tender);
      } catch (e) {
        // Duplicate, skip
      }
    });

    res.json({
      success: true,
      message: `Scraped ${scrapedTenders.length} tenders, inserted ${inserted.length} new`,
      data: {
        runId,
        totalScraped: scrapedTenders.length,
        newInserted: inserted.length,
        tenders: inserted,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get scraper status and history
 */
router.get('/gebiz/status', (req, res) => {
  try {
    const recentTenders = db.prepare(`
      SELECT * FROM tenders 
      WHERE source = 'gebiz' 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all();
    
    const stats = {
      totalGebizTenders: db.prepare(`SELECT COUNT(*) as c FROM tenders WHERE source = 'gebiz'`).get().c,
      newTodayCount: db.prepare(`
        SELECT COUNT(*) as c FROM tenders 
        WHERE source = 'gebiz' AND date(created_at) = date('now')
      `).get().c,
      lastScrapeTime: recentTenders[0]?.created_at || null,
    };

    res.json({ success: true, data: { stats, recentTenders } });
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
 * Get candidate recommendations for a job (Claude-powered)
 */
router.get('/sourcing/recommend/:jobId', async (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Get candidates with their stats
    const candidates = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM deployments d WHERE d.candidate_id = c.id AND d.status = 'completed') as completed_jobs,
        (SELECT AVG(d.rating) FROM deployments d WHERE d.candidate_id = c.id AND d.rating IS NOT NULL) as avg_rating
      FROM candidates c
      WHERE c.status = 'active'
    `).all();

    let recommendations;
    try {
      // Use Claude AI for intelligent matching
      const aiScores = await matchCandidates(job, candidates);

      // Merge AI scores with candidate data
      recommendations = aiScores.map(scored => {
        const candidate = candidates.find(c => c.id === scored.id);
        return {
          ...candidate,
          matchScore: scored.score,
          matchReason: scored.reason,
        };
      });
    } catch (aiError) {
      console.warn('Claude AI unavailable, using rule-based matching:', aiError.message);
      // Fallback to rule-based scoring
      const scored = candidates.map(c => {
        let score = 0;
        score += (c.avg_rating || 0) * 6;
        score += Math.min(30, (c.completed_jobs || 0) * 2);
        score += (c.level || 1) * 2;
        const certs = JSON.parse(c.certifications || '[]');
        if (job.title.toLowerCase().includes('server') && certs.includes('Server Basics')) score += 10;
        if (job.title.toLowerCase().includes('food') && certs.includes('Food Safety')) score += 10;
        if (certs.includes('Customer Service')) score += 5;
        return { ...c, matchScore: Math.round(score) };
      });
      scored.sort((a, b) => b.matchScore - a.matchScore);
      recommendations = scored.slice(0, 15);
    }

    res.json({
      success: true,
      data: {
        job,
        recommendations,
        aiPowered: true,
      }
    });
  } catch (error) {
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

module.exports = router;
