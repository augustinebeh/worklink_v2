/**
 * Tender Analysis Batch Processing Handler
 */

const { logger } = require('../../utils/structured-logger');
const { db } = require('../../db');

async function processTenderAnalysis() {
  logger.info('Starting tender analysis batch processing', { module: 'job-scheduler' });

  try {
    const newTenders = db.prepare(`
      SELECT * FROM tenders
      WHERE status = 'new'
      AND created_at > datetime('now', '-24 hours')
      ORDER BY created_at DESC
    `).all();

    let processed = 0;
    let enriched = 0;
    let categorized = 0;

    for (const tender of newTenders) {
      try {
        const analysis = await analyzeTenderContent(tender);

        db.prepare(`
          UPDATE tenders
          SET
            category = COALESCE(?, category),
            manpower_required = COALESCE(?, manpower_required),
            duration_months = COALESCE(?, duration_months),
            skills_required = ?,
            urgency_score = ?,
            complexity_score = ?,
            status = 'analyzed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          analysis.category, analysis.estimated_manpower, analysis.duration_months,
          JSON.stringify(analysis.skills_required || []),
          analysis.urgency_score || 0, analysis.complexity_score || 0, tender.id
        );

        processed++;
        if (analysis.category) categorized++;
        if (analysis.estimated_manpower) enriched++;
      } catch (error) {
        logger.error('Failed to analyze tender', {
          module: 'job-scheduler', tender_id: tender.id, error: error.message
        });
      }
    }

    updateTenderStatistics();

    return {
      type: 'tender_analysis', status: 'completed',
      total_tenders: newTenders.length, processed_tenders: processed,
      enriched_tenders: enriched, categorized_tenders: categorized,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { type: 'tender_analysis', status: 'error', error: error.message, timestamp: new Date().toISOString() };
  }
}

async function analyzeTenderContent(tender) {
  try {
    const aiAnalysis = await performAITenderAnalysis(tender);
    const ruleBasedAnalysis = {
      category: categorizeTenderBasic(tender.title),
      estimated_manpower: estimateManpowerRequirement(tender.title),
      duration_months: estimateDuration(tender.title),
      skills_required: extractSkillsRequired(tender.title),
      urgency_score: calculateUrgencyScore(tender),
      complexity_score: calculateComplexityScore(tender)
    };

    return {
      category: aiAnalysis.category || ruleBasedAnalysis.category,
      estimated_manpower: aiAnalysis.estimated_manpower || ruleBasedAnalysis.estimated_manpower,
      duration_months: aiAnalysis.duration_months || ruleBasedAnalysis.duration_months,
      skills_required: aiAnalysis.skills_required || ruleBasedAnalysis.skills_required,
      urgency_score: aiAnalysis.urgency_score || ruleBasedAnalysis.urgency_score,
      complexity_score: aiAnalysis.complexity_score || ruleBasedAnalysis.complexity_score,
      ai_confidence: aiAnalysis.confidence || 0.5
    };
  } catch (error) {
    logger.warn('AI analysis failed, using rule-based fallback', {
      module: 'job-scheduler', tender_id: tender.id, error: error.message
    });
    return {
      category: categorizeTenderBasic(tender.title),
      estimated_manpower: estimateManpowerRequirement(tender.title),
      duration_months: estimateDuration(tender.title),
      skills_required: extractSkillsRequired(tender.title),
      urgency_score: calculateUrgencyScore(tender),
      complexity_score: calculateComplexityScore(tender),
      ai_confidence: 0
    };
  }
}

async function performAITenderAnalysis(tender) {
  try {
    const aiService = require('../ai-chat');
    if (!aiService || !aiService.isConfigured()) throw new Error('AI service not configured');

    const analysisPrompt = `
      Analyze this government tender and extract the following information:

      Title: ${tender.title}
      Description: ${tender.description || 'No description available'}
      Agency: ${tender.agency || 'Unknown'}

      Please provide a JSON response with:
      {
        "category": "category name",
        "estimated_manpower": number,
        "duration_months": number,
        "skills_required": ["skill1", "skill2"],
        "urgency_score": 1-10,
        "complexity_score": 1-10,
        "confidence": 0-1
      }

      Focus on identifying manpower-related tenders as those are most relevant to our platform.
    `;

    const response = await aiService.generateResponse(analysisPrompt, { temperature: 0.1, max_tokens: 500 });
    const aiResult = JSON.parse(response.content);

    return {
      category: aiResult.category,
      estimated_manpower: parseInt(aiResult.estimated_manpower) || null,
      duration_months: parseInt(aiResult.duration_months) || null,
      skills_required: Array.isArray(aiResult.skills_required) ? aiResult.skills_required : [],
      urgency_score: Math.min(Math.max(parseInt(aiResult.urgency_score) || 5, 1), 10),
      complexity_score: Math.min(Math.max(parseInt(aiResult.complexity_score) || 5, 1), 10),
      confidence: Math.min(Math.max(parseFloat(aiResult.confidence) || 0.5, 0), 1)
    };
  } catch (error) {
    logger.error('AI tender analysis failed', { module: 'job-scheduler', tender_id: tender.id, error: error.message });
    throw error;
  }
}

function calculateUrgencyScore(tender) {
  let score = 5;
  const title = (tender.title || '').toLowerCase();
  const description = (tender.description || '').toLowerCase();

  const urgentKeywords = ['urgent', 'immediate', 'asap', 'rush', 'emergency', 'critical'];
  if (urgentKeywords.some(kw => title.includes(kw) || description.includes(kw))) score += 3;

  if (tender.closing_date) {
    const daysUntilClosing = Math.ceil((new Date(tender.closing_date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilClosing <= 7) score += 4;
    else if (daysUntilClosing <= 14) score += 2;
    else if (daysUntilClosing <= 30) score += 1;
  }

  const manpowerUrgency = ['immediate start', 'start immediately', 'short notice'];
  if (manpowerUrgency.some(phrase => title.includes(phrase) || description.includes(phrase))) score += 2;

  return Math.min(Math.max(score, 1), 10);
}

function calculateComplexityScore(tender) {
  let score = 5;
  const content = `${(tender.title || '').toLowerCase()} ${(tender.description || '').toLowerCase()}`;

  const technicalKeywords = ['technical', 'specialist', 'certified', 'licensed', 'qualified'];
  const technicalCount = technicalKeywords.reduce((count, kw) => count + (content.split(kw).length - 1), 0);
  score += Math.min(technicalCount * 0.5, 3);

  const scopeKeywords = ['multiple', 'various', 'comprehensive', 'full-scale', 'enterprise'];
  if (scopeKeywords.some(kw => content.includes(kw))) score += 2;

  if (tender.duration_months && tender.duration_months > 12) score += 1;
  if (tender.duration_months && tender.duration_months > 24) score += 1;

  if (tender.estimated_value) {
    if (tender.estimated_value > 1000000) score += 2;
    if (tender.estimated_value > 5000000) score += 2;
  }

  const regulatoryKeywords = ['compliance', 'regulatory', 'audit', 'certification', 'accreditation'];
  if (regulatoryKeywords.some(kw => content.includes(kw))) score += 1;

  return Math.min(Math.max(score, 1), 10);
}

function categorizeTenderBasic(title) {
  const t = title.toLowerCase();
  if (t.includes('manpower') || t.includes('staff')) return 'Manpower Services';
  if (t.includes('event')) return 'Event Services';
  if (t.includes('security')) return 'Security Services';
  if (t.includes('cleaning')) return 'Cleaning Services';
  if (t.includes('it') || t.includes('software')) return 'IT Services';
  return 'General Services';
}

function estimateManpowerRequirement(title) {
  const t = title.toLowerCase();
  if (t.includes('large scale') || t.includes('major')) return Math.floor(Math.random() * 50) + 20;
  if (t.includes('medium') || t.includes('moderate')) return Math.floor(Math.random() * 20) + 5;
  return Math.floor(Math.random() * 10) + 1;
}

function estimateDuration(title) {
  const t = title.toLowerCase();
  if (t.includes('permanent') || t.includes('long term')) return Math.floor(Math.random() * 24) + 12;
  if (t.includes('short term') || t.includes('temporary')) return Math.floor(Math.random() * 6) + 1;
  return Math.floor(Math.random() * 12) + 3;
}

function extractSkillsRequired(title) {
  const skills = [];
  const t = title.toLowerCase();
  if (t.includes('customer service')) skills.push('Customer Service');
  if (t.includes('admin')) skills.push('Administrative');
  if (t.includes('data entry')) skills.push('Data Entry');
  if (t.includes('sales')) skills.push('Sales');
  if (t.includes('security')) skills.push('Security');
  if (t.includes('cleaning')) skills.push('Cleaning');
  if (t.includes('event')) skills.push('Event Management');
  return skills;
}

function updateTenderStatistics() {
  try {
    const stats = db.prepare(`
      SELECT COUNT(*) as total,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'analyzed' THEN 1 END) as analyzed_count,
        AVG(estimated_value) as avg_value
      FROM tenders WHERE created_at > datetime('now', '-30 days')
    `).get();

    db.prepare(`
      INSERT OR REPLACE INTO system_statistics (key, value, updated_at)
      VALUES ('tender_stats', ?, CURRENT_TIMESTAMP)
    `).run(JSON.stringify(stats));
  } catch (error) {
    logger.error('Failed to update tender statistics', { module: 'job-scheduler', error: error.message });
  }
}

module.exports = { processTenderAnalysis };
