/**
 * AI Assistant Routes - General purpose AI assistant
 * Ask Claude AI questions about business, tenders, or recruitment
 * 
 * @module ai-automation/assistant/routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { askClaude } = require('../../../../../utils/claude');

/**
 * POST /
 * Ask Claude AI a question with business context
 */
router.post('/', async (req, res) => {
  try {
    const { question, context = 'general' } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    // Get relevant data based on context
    let businessContext = '';

    if (context === 'tenders' || context === 'general') {
      const tenderStats = {
        total: db.prepare(`SELECT COUNT(*) as c FROM tenders`).get().c,
        highPriority: db.prepare(`
          SELECT COUNT(*) as c FROM tenders WHERE win_probability >= 60
        `).get().c,
        recent: db.prepare(`
          SELECT title, agency, win_probability
          FROM tenders
          ORDER BY created_at DESC
          LIMIT 5
        `).all(),
      };
      businessContext += `\nTender Pipeline: ${tenderStats.total} total, ${tenderStats.highPriority} high-priority\nRecent tenders: ${tenderStats.recent.map(t => t.title).join(', ')}`;
    }

    if (context === 'recruitment' || context === 'general') {
      const candidateStats = {
        total: db.prepare(`
          SELECT COUNT(*) as c FROM candidates WHERE status = 'active'
        `).get().c,
        topRated: db.prepare(`
          SELECT COUNT(*) as c FROM candidates WHERE rating >= 4.5
        `).get().c,
        openJobs: db.prepare(`
          SELECT COUNT(*) as c FROM jobs WHERE status = 'open'
        `).get().c,
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
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /analyze-text
 * Analyze arbitrary text with AI
 */
router.post('/analyze-text', async (req, res) => {
  try {
    const { text, analysisType = 'general' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const prompts = {
      general: 'Analyze the following text and provide insights:',
      sentiment: 'Analyze the sentiment of the following text (positive, negative, neutral) and explain why:',
      summary: 'Provide a concise summary of the following text:',
      action_items: 'Extract action items and key points from the following text:'
    };

    const prompt = prompts[analysisType] || prompts.general;
    const response = await askClaude(`${prompt}\n\n${text}`, null, { maxTokens: 500 });

    res.json({
      success: true,
      data: {
        analysisType,
        result: response
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
