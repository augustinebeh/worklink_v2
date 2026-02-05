/**
 * Ad ML Training Data Manager
 *
 * Handles exporting training data for fine-tuning an ad-generation SLM.
 */

const { db } = require('../../db');
const fs = require('fs');
const path = require('path');

/**
 * Get training data with filters
 */
function getTrainingData(options = {}) {
  const {
    limit = 1000,
    offset = 0,
    minQuality = 0.5,
    winnersOnly = false,
  } = options;

  let query = `
    SELECT * FROM ad_training_data
    WHERE quality_score >= ?
  `;
  const params = [minQuality];

  if (winnersOnly) {
    query += ' AND is_winner = 1';
  }

  query += ' ORDER BY quality_score DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

/**
 * Get training data statistics
 */
function getTrainingStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM ad_training_data').get().count;
  const winners = db.prepare('SELECT COUNT(*) as count FROM ad_training_data WHERE is_winner = 1').get().count;
  const highQuality = db.prepare('SELECT COUNT(*) as count FROM ad_training_data WHERE quality_score >= 0.7').get().count;
  const avgQuality = db.prepare('SELECT AVG(quality_score) as avg FROM ad_training_data').get().avg || 0;

  const byVariable = db.prepare(`
    SELECT
      json_extract(variables, '$.tone') as tone,
      COUNT(*) as count,
      AVG(quality_score) as avg_quality
    FROM ad_training_data
    WHERE json_extract(variables, '$.tone') IS NOT NULL
    GROUP BY tone
  `).all();

  return {
    totalExamples: total,
    winnerExamples: winners,
    highQualityExamples: highQuality,
    averageQuality: avgQuality.toFixed(2),
    byTone: byVariable,
  };
}

/**
 * Export training data to JSONL format (for fine-tuning)
 */
function exportToJSONL(options = {}) {
  const {
    minQuality = 0.5,
    winnersOnly = true,
    outputPath = null,
    format = 'chat', // 'chat' | 'completion' | 'instruction'
  } = options;

  const data = getTrainingData({
    limit: 10000,
    minQuality,
    winnersOnly,
  });

  const lines = data.map(row => {
    const jobDetails = JSON.parse(row.job_details || '{}');
    const variables = JSON.parse(row.variables || '{}');

    const userPrompt = `Generate a job advertisement for:
Job: ${jobDetails.title || 'Unknown'}
Location: ${jobDetails.location || 'Singapore'}
Pay: $${jobDetails.pay_rate || 'Competitive'}/hr
Category: ${jobDetails.category || 'General'}

Style: ${variables.tone || 'friendly'} tone, ${variables.emoji_count || '3'} emojis, ${variables.length || 'medium'} length`;

    let example;

    switch (format) {
      case 'chat':
        example = {
          messages: [
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: row.ad_content },
          ],
        };
        break;

      case 'instruction':
        example = {
          instruction: 'Generate a job advertisement for a recruitment platform.',
          input: userPrompt,
          output: row.ad_content,
        };
        break;

      case 'completion':
        example = {
          prompt: userPrompt + '\n\nAd:\n',
          completion: row.ad_content,
        };
        break;

      default:
        example = {
          input: userPrompt,
          output: row.ad_content,
          quality: row.quality_score,
        };
    }

    return JSON.stringify(example);
  });

  const content = lines.join('\n');

  if (outputPath) {
    fs.writeFileSync(outputPath, content);
    return { path: outputPath, count: lines.length };
  }

  return { content, count: lines.length };
}

/**
 * Export training data to CSV format
 */
function exportToCSV(options = {}) {
  const { minQuality = 0.5, winnersOnly = true, outputPath = null } = options;

  const data = getTrainingData({
    limit: 10000,
    minQuality,
    winnersOnly,
  });

  const escapeCSV = (str) => {
    if (!str) return '';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const header = 'job_title,location,pay_rate,ad_content,tone,emoji_count,length,quality_score,is_winner\n';

  const rows = data.map(row => {
    const jobDetails = JSON.parse(row.job_details || '{}');
    const variables = JSON.parse(row.variables || '{}');

    return [
      escapeCSV(jobDetails.title),
      escapeCSV(jobDetails.location),
      jobDetails.pay_rate || '',
      escapeCSV(row.ad_content),
      escapeCSV(variables.tone),
      variables.emoji_count || '',
      escapeCSV(variables.length),
      row.quality_score,
      row.is_winner,
    ].join(',');
  });

  const content = header + rows.join('\n');

  if (outputPath) {
    fs.writeFileSync(outputPath, content);
    return { path: outputPath, count: rows.length };
  }

  return { content, count: rows.length };
}

/**
 * Export for Hugging Face datasets format
 */
function exportToHuggingFace(options = {}) {
  const { minQuality = 0.5, winnersOnly = true, outputPath = null } = options;

  const data = getTrainingData({
    limit: 10000,
    minQuality,
    winnersOnly,
  });

  const dataset = {
    version: '1.0.0',
    name: 'worklink-job-ads',
    description: 'Training data for WorkLink job advertisement generation',
    features: {
      job_title: { dtype: 'string' },
      job_location: { dtype: 'string' },
      job_pay_rate: { dtype: 'float32' },
      ad_content: { dtype: 'string' },
      tone: { dtype: 'string' },
      emoji_count: { dtype: 'int32' },
      length: { dtype: 'string' },
      quality_score: { dtype: 'float32' },
    },
    data: data.map(row => {
      const jobDetails = JSON.parse(row.job_details || '{}');
      const variables = JSON.parse(row.variables || '{}');

      return {
        job_title: jobDetails.title || '',
        job_location: jobDetails.location || '',
        job_pay_rate: parseFloat(jobDetails.pay_rate) || 0,
        ad_content: row.ad_content,
        tone: variables.tone || 'friendly',
        emoji_count: parseInt(variables.emoji_count) || 3,
        length: variables.length || 'medium',
        quality_score: row.quality_score,
      };
    }),
  };

  const content = JSON.stringify(dataset, null, 2);

  if (outputPath) {
    fs.writeFileSync(outputPath, content);
    return { path: outputPath, count: data.length };
  }

  return { content, count: data.length };
}

/**
 * Add training example manually
 */
function addTrainingExample(jobDetails, adContent, variables, options = {}) {
  const { qualityScore = 0.7, isWinner = false } = options;

  const result = db.prepare(`
    INSERT INTO ad_training_data (job_details, ad_content, variables, quality_score, is_winner, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(
    JSON.stringify(jobDetails),
    adContent,
    JSON.stringify(variables),
    qualityScore,
    isWinner ? 1 : 0
  );

  return result.lastInsertRowid;
}

/**
 * Delete training example
 */
function deleteTrainingExample(id) {
  db.prepare('DELETE FROM ad_training_data WHERE id = ?').run(id);
}

/**
 * Update quality scores based on response rates
 */
function updateQualityScores() {
  // Normalize quality scores based on response rates
  const stats = db.prepare(`
    SELECT
      MIN(response_rate) as min_rate,
      MAX(response_rate) as max_rate
    FROM ad_training_data
    WHERE response_rate > 0
  `).get();

  if (!stats.max_rate || stats.max_rate === stats.min_rate) {
    return { updated: 0 };
  }

  const range = stats.max_rate - stats.min_rate;

  const result = db.prepare(`
    UPDATE ad_training_data
    SET quality_score = 0.5 + (0.5 * (response_rate - ?) / ?)
    WHERE response_rate > 0
  `).run(stats.min_rate, range);

  return { updated: result.changes };
}

/**
 * Import training data from JSONL
 */
function importFromJSONL(content, options = {}) {
  const { qualityScore = 0.7 } = options;

  const lines = content.trim().split('\n');
  let imported = 0;
  let errors = 0;

  const insertStmt = db.prepare(`
    INSERT INTO ad_training_data (job_details, ad_content, variables, quality_score, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      let jobDetails, adContent;

      if (data.messages) {
        // Chat format
        const userMsg = data.messages.find(m => m.role === 'user');
        const assistantMsg = data.messages.find(m => m.role === 'assistant');
        jobDetails = { raw: userMsg?.content };
        adContent = assistantMsg?.content;
      } else if (data.instruction) {
        // Instruction format
        jobDetails = { raw: data.input };
        adContent = data.output;
      } else {
        jobDetails = { raw: data.input };
        adContent = data.output;
      }

      if (adContent) {
        insertStmt.run(JSON.stringify(jobDetails), adContent, '{}', qualityScore);
        imported++;
      }
    } catch (e) {
      errors++;
    }
  }

  return { imported, errors, total: lines.length };
}

module.exports = {
  getTrainingData,
  getTrainingStats,
  exportToJSONL,
  exportToCSV,
  exportToHuggingFace,
  addTrainingExample,
  deleteTrainingExample,
  updateQualityScores,
  importFromJSONL,
};
