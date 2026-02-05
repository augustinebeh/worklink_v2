/**
 * Sourcing Routes - Job posting generation and candidate matching
 * AI-powered candidate sourcing and outreach message generation
 * 
 * @module ai-automation/sourcing/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const {
  generateJobPostings,
  generateOutreachMessage
} = require('../../../../../utils/claude');
const {
  enhancedMatchCandidates
} = require('../../../../../utils/candidate-matching');
const {
  generateAllPostings,
  validatePostingParams
} = require('../utils/posting-generators');
const { generatePersonalizedOutreach } = require('../utils/message-templates');

/**
 * POST /generate-posting
 * Generate job postings for multiple platforms using AI
 */
router.post('/generate-posting', async (req, res) => {
  try {
    const { jobTitle, payRate, location, requirements, slots } = req.body;

    // Validate parameters
    const validation = validatePostingParams({
      title: jobTitle,
      pay: payRate,
      location,
      slots
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    let postings;
    let aiPowered = false;

    try {
      // Use Claude AI to generate engaging postings
      postings = await generateJobPostings({
        jobTitle,
        payRate,
        location,
        requirements,
        slots
      });
      aiPowered = true;
    } catch (aiError) {
      console.warn('Claude AI unavailable, using template postings:', aiError.message);
      // Fallback to template-based generation
      postings = generateAllPostings(jobTitle, payRate, location, requirements, slots);
    }

    res.json({
      success: true,
      data: postings,
      aiPowered
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /generate-outreach
 * Generate personalized outreach messages for candidates
 */
router.post('/generate-outreach', async (req, res) => {
  try {
    const { jobId, candidateIds } = req.body;

    const job = db.prepare(`
      SELECT j.*, c.company_name
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE j.id = ?
    `).get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
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

    if (candidates.length === 0) {
      return res.json({
        success: true,
        message: 'No candidates found',
        data: {
          job,
          totalCandidates: 0,
          messages: []
        }
      });
    }

    // Generate messages
    const messages = [];
    let aiSuccessCount = 0;
    let fallbackCount = 0;

    for (const candidate of candidates) {
      let message;
      let aiPowered = false;

      try {
        message = await generateOutreachMessage(candidate, job);
        aiPowered = true;
        aiSuccessCount++;
      } catch (aiError) {
        // Fallback to template
        message = generatePersonalizedOutreach(candidate, job);
        fallbackCount++;
      }

      messages.push({
        candidateId: candidate.id,
        candidateName: candidate.name,
        phone: candidate.phone,
        message,
        aiPowered
      });
    }

    res.json({
      success: true,
      data: {
        job,
        totalCandidates: messages.length,
        messages,
        stats: {
          aiPowered: aiSuccessCount,
          fallback: fallbackCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /recommend/:jobId
 * Get AI-powered candidate recommendations for a job
 */
router.get('/recommend/:jobId', async (req, res) => {
  try {
    const { useAI = 'true', minScore = '30', maxResults = '10' } = req.query;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    // Get candidates with comprehensive stats
    const candidates = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM deployments d
         WHERE d.candidate_id = c.id AND d.status = 'completed') as completed_jobs,
        (SELECT AVG(d.rating) FROM deployments d
         WHERE d.candidate_id = c.id AND d.rating IS NOT NULL) as avg_rating,
        (SELECT MAX(d.created_at) FROM deployments d
         WHERE d.candidate_id = c.id) as last_job_date,
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
        INSERT OR REPLACE INTO job_match_scores
        (job_id, candidate_id, score, factors, created_at)
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
              JSON.stringify(match.factors || {})
            );
          }
        });
      } catch (dbError) {
        console.warn('Failed to store match scores:', dbError.message);
      }
    }

    res.json({
      success: true,
      data: {
        job,
        totalCandidates: candidates.length,
        matches: matchingResults.matches,
        aiPowered: matchingResults.aiPowered,
        performance: matchingResults.performance
      }
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /batch-recommend
 * Get recommendations for multiple jobs at once
 */
router.post('/batch-recommend', async (req, res) => {
  try {
    const { jobIds, useAI = true, minScore = 30, maxResults = 5 } = req.body;

    if (!jobIds || jobIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'jobIds array is required'
      });
    }

    const results = [];

    for (const jobId of jobIds) {
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      if (!job) continue;

      const candidates = db.prepare(`
        SELECT c.* FROM candidates c WHERE c.status = 'active'
      `).all();

      const matchingResults = await enhancedMatchCandidates(job, candidates, {
        useAI,
        minScore,
        maxResults,
        includeReasons: false
      });

      results.push({
        jobId: job.id,
        jobTitle: job.title,
        matchCount: matchingResults.matches.length,
        matches: matchingResults.matches
      });
    }

    res.json({
      success: true,
      data: {
        totalJobs: jobIds.length,
        processedJobs: results.length,
        results
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
