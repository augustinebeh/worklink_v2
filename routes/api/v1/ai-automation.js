/**
 * AI Automation Routes - GeBIZ Scraping, Candidate Sourcing, Tender Analysis
 * TalentVis Worklink v2
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

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
 * Analyze a tender and provide AI recommendations
 */
router.post('/tenders/:id/analyze', (req, res) => {
  try {
    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
    if (!tender) {
      return res.status(404).json({ success: false, error: 'Tender not found' });
    }

    // Analyze based on our historical data
    const analysis = analyzeTender(tender);
    
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
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Batch analyze all new tenders
 */
router.post('/tenders/analyze-all', (req, res) => {
  try {
    const newTenders = db.prepare(`
      SELECT * FROM tenders WHERE status = 'new' AND win_probability IS NULL
    `).all();

    const results = newTenders.map(tender => {
      const analysis = analyzeTender(tender);
      db.prepare(`
        UPDATE tenders 
        SET win_probability = ?, recommended_action = ?
        WHERE id = ?
      `).run(analysis.winProbability, analysis.recommendedAction, tender.id);
      return { id: tender.id, title: tender.title, ...analysis };
    });

    res.json({
      success: true,
      message: `Analyzed ${results.length} tenders`,
      data: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================
// CANDIDATE SOURCING AUTOMATION
// ============================================

/**
 * Generate job posting content for multiple platforms
 */
router.post('/sourcing/generate-posting', (req, res) => {
  try {
    const { jobTitle, payRate, location, requirements, slots } = req.body;

    const postings = {
      telegram: generateTelegramPosting(jobTitle, payRate, location, requirements, slots),
      whatsapp: generateWhatsAppPosting(jobTitle, payRate, location, requirements, slots),
      fastjobs: generateFastJobsPosting(jobTitle, payRate, location, requirements, slots),
      instagram: generateInstagramPosting(jobTitle, payRate, location, requirements, slots),
    };

    res.json({ success: true, data: postings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate mass outreach messages for candidates
 */
router.post('/sourcing/generate-outreach', (req, res) => {
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

    const messages = candidates.map(candidate => ({
      candidateId: candidate.id,
      candidateName: candidate.name,
      phone: candidate.phone,
      message: generatePersonalizedOutreach(candidate, job),
    }));

    res.json({
      success: true,
      data: {
        job,
        totalCandidates: messages.length,
        messages,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get candidate recommendations for a job
 */
router.get('/sourcing/recommend/:jobId', (req, res) => {
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    // Score candidates based on match
    const candidates = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM deployments d WHERE d.candidate_id = c.id AND d.status = 'completed') as completed_jobs,
        (SELECT AVG(d.rating) FROM deployments d WHERE d.candidate_id = c.id AND d.rating IS NOT NULL) as avg_rating
      FROM candidates c
      WHERE c.status = 'active'
    `).all();

    const scored = candidates.map(c => {
      let score = 0;
      
      // Rating score (0-30)
      score += (c.avg_rating || 0) * 6;
      
      // Experience score (0-30)
      score += Math.min(30, c.completed_jobs * 2);
      
      // Level score (0-20)
      score += c.level * 2;
      
      // Certification match (0-20)
      const certs = JSON.parse(c.certifications || '[]');
      if (job.title.toLowerCase().includes('server') && certs.includes('Server Basics')) score += 10;
      if (job.title.toLowerCase().includes('food') && certs.includes('Food Safety')) score += 10;
      if (certs.includes('Customer Service')) score += 5;

      return { ...c, matchScore: Math.round(score) };
    });

    // Sort by match score
    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.json({
      success: true,
      data: {
        job,
        recommendations: scored.slice(0, 15),
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
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
  const jobDate = new Date(job.job_date).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
  
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

module.exports = router;
