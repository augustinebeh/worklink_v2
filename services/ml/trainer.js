/**
 * ML Training Data Manager
 *
 * Handles exporting training data for fine-tuning your own SLM.
 * Supports multiple export formats for different training frameworks.
 */

const { db } = require('../../db/database');
const fs = require('fs');
const path = require('path');

/**
 * Get training data with filters
 */
function getTrainingData(options = {}) {
  const {
    limit = 1000,
    offset = 0,
    minQuality = 0.7,
    adminApprovedOnly = true,
    source = null,
  } = options;

  let query = `
    SELECT * FROM ml_training_data
    WHERE quality_score >= ?
  `;
  const params = [minQuality];

  if (adminApprovedOnly) {
    query += ' AND admin_approved = 1';
  }

  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }

  query += ' ORDER BY quality_score DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db.prepare(query).all(...params);
}

/**
 * Get training data statistics
 */
function getTrainingStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM ml_training_data').get().count;
  const approved = db.prepare('SELECT COUNT(*) as count FROM ml_training_data WHERE admin_approved = 1').get().count;
  const highQuality = db.prepare('SELECT COUNT(*) as count FROM ml_training_data WHERE quality_score >= 0.8').get().count;
  const exported = db.prepare('SELECT COUNT(*) as count FROM ml_training_data WHERE exported = 1').get().count;

  const avgQuality = db.prepare('SELECT AVG(quality_score) as avg FROM ml_training_data WHERE admin_approved = 1').get().avg || 0;

  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count
    FROM ml_training_data
    GROUP BY source
  `).all();

  const byIntent = db.prepare(`
    SELECT intent, COUNT(*) as count
    FROM ml_training_data
    WHERE intent IS NOT NULL
    GROUP BY intent
    ORDER BY count DESC
    LIMIT 10
  `).all();

  return {
    totalExamples: total,
    approvedExamples: approved,
    highQualityExamples: highQuality,
    exportedExamples: exported,
    averageQuality: avgQuality.toFixed(2),
    bySource: bySource.reduce((acc, row) => ({ ...acc, [row.source]: row.count }), {}),
    topIntents: byIntent,
  };
}

/**
 * Export training data to JSONL format (for fine-tuning)
 *
 * JSONL format is commonly used for:
 * - OpenAI fine-tuning
 * - Hugging Face datasets
 * - LLaMA/Mistral fine-tuning
 */
function exportToJSONL(options = {}) {
  const {
    minQuality = 0.7,
    adminApprovedOnly = true,
    includeContext = false,
    outputPath = null,
    format = 'chat', // 'chat' | 'completion' | 'instruction'
  } = options;

  const data = getTrainingData({
    limit: 10000,
    minQuality,
    adminApprovedOnly,
  });

  const lines = data.map(row => {
    let example;

    switch (format) {
      case 'chat':
        // OpenAI chat format
        example = {
          messages: [
            { role: 'user', content: row.input_text },
            { role: 'assistant', content: row.was_edited ? row.edited_output : row.output_text },
          ],
        };
        break;

      case 'instruction':
        // Alpaca/LLaMA instruction format
        example = {
          instruction: row.input_text,
          input: includeContext && row.context ? row.context : '',
          output: row.was_edited ? row.edited_output : row.output_text,
        };
        break;

      case 'completion':
        // Simple completion format
        example = {
          prompt: row.input_text,
          completion: row.was_edited ? row.edited_output : row.output_text,
        };
        break;

      default:
        example = {
          input: row.input_text,
          output: row.was_edited ? row.edited_output : row.output_text,
          quality: row.quality_score,
          intent: row.intent,
        };
    }

    return JSON.stringify(example);
  });

  const content = lines.join('\n');

  // Mark as exported
  const ids = data.map(d => d.id);
  if (ids.length > 0) {
    db.prepare(`
      UPDATE ml_training_data SET exported = 1 WHERE id IN (${ids.join(',')})
    `).run();
  }

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
  const {
    minQuality = 0.7,
    adminApprovedOnly = true,
    outputPath = null,
  } = options;

  const data = getTrainingData({
    limit: 10000,
    minQuality,
    adminApprovedOnly,
  });

  // CSV header
  const header = 'input,output,intent,quality_score,source\n';

  // Escape CSV field
  const escapeCSV = (str) => {
    if (!str) return '';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = data.map(row => {
    const output = row.was_edited ? row.edited_output : row.output_text;
    return [
      escapeCSV(row.input_text),
      escapeCSV(output),
      escapeCSV(row.intent),
      row.quality_score,
      escapeCSV(row.source),
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
  const {
    minQuality = 0.7,
    adminApprovedOnly = true,
    outputPath = null,
  } = options;

  const data = getTrainingData({
    limit: 10000,
    minQuality,
    adminApprovedOnly,
  });

  const dataset = {
    version: '1.0.0',
    name: 'worklink-chat-responses',
    description: 'Training data for WorkLink recruitment chat assistant',
    features: {
      input: { dtype: 'string' },
      output: { dtype: 'string' },
      intent: { dtype: 'string' },
      quality_score: { dtype: 'float32' },
    },
    data: data.map(row => ({
      input: row.input_text,
      output: row.was_edited ? row.edited_output : row.output_text,
      intent: row.intent || 'general',
      quality_score: row.quality_score,
    })),
  };

  const content = JSON.stringify(dataset, null, 2);

  if (outputPath) {
    fs.writeFileSync(outputPath, content);
    return { path: outputPath, count: data.length };
  }

  return { content, count: data.length };
}

/**
 * Generate synthetic training data using LLM
 * This helps expand the training dataset with variations
 */
async function generateSyntheticData(topic, count = 10, askClaude) {
  const systemPrompt = `You are generating training data for a recruitment chat assistant.
Generate ${count} Q&A pairs about: ${topic}

Format as JSON array:
[
  {"question": "...", "answer": "..."},
  ...
]

Guidelines:
- Questions should be natural, like a candidate would ask
- Answers should be helpful, friendly, and professional
- Use Singapore English context
- Keep answers concise (under 100 words)
- Vary the question phrasing`;

  const prompt = `Generate ${count} diverse Q&A pairs about "${topic}" for a recruitment/staffing chat assistant.`;

  try {
    const response = await askClaude(prompt, systemPrompt, { maxTokens: 2000 });

    // Parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const pairs = JSON.parse(jsonMatch[0]);

    // Insert into training data
    const insertStmt = db.prepare(`
      INSERT INTO ml_training_data
      (input_text, output_text, quality_score, source)
      VALUES (?, ?, 0.6, 'synthetic')
    `);

    pairs.forEach(pair => {
      insertStmt.run(pair.question, pair.answer);
    });

    return { generated: pairs.length, pairs };
  } catch (error) {
    console.error('Failed to generate synthetic data:', error);
    throw error;
  }
}

/**
 * Add training example manually
 */
function addTrainingExample(input, output, options = {}) {
  const {
    intent = null,
    category = null,
    qualityScore = 0.8,
    source = 'admin',
  } = options;

  const result = db.prepare(`
    INSERT INTO ml_training_data
    (input_text, output_text, intent, category, quality_score, admin_approved, source)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(input, output, intent, category, qualityScore, source);

  return result.lastInsertRowid;
}

/**
 * Delete training example
 */
function deleteTrainingExample(id) {
  db.prepare('DELETE FROM ml_training_data WHERE id = ?').run(id);
}

/**
 * Update training example quality score
 */
function updateQualityScore(id, qualityScore) {
  db.prepare(`
    UPDATE ml_training_data SET quality_score = ? WHERE id = ?
  `).run(qualityScore, id);
}

/**
 * Bulk import training data from JSONL
 */
function importFromJSONL(content, options = {}) {
  const { source = 'import', qualityScore = 0.7 } = options;

  const lines = content.trim().split('\n');
  let imported = 0;
  let errors = 0;

  const insertStmt = db.prepare(`
    INSERT INTO ml_training_data
    (input_text, output_text, quality_score, source)
    VALUES (?, ?, ?, ?)
  `);

  lines.forEach((line, index) => {
    try {
      const data = JSON.parse(line);

      // Handle different formats
      let input, output;

      if (data.messages) {
        // Chat format
        const userMsg = data.messages.find(m => m.role === 'user');
        const assistantMsg = data.messages.find(m => m.role === 'assistant');
        input = userMsg?.content;
        output = assistantMsg?.content;
      } else if (data.instruction) {
        // Instruction format
        input = data.instruction;
        output = data.output;
      } else if (data.prompt) {
        // Completion format
        input = data.prompt;
        output = data.completion;
      } else {
        input = data.input;
        output = data.output;
      }

      if (input && output) {
        insertStmt.run(input, output, qualityScore, source);
        imported++;
      }
    } catch (e) {
      errors++;
      console.warn(`Failed to parse line ${index + 1}:`, e.message);
    }
  });

  return { imported, errors, total: lines.length };
}

module.exports = {
  getTrainingData,
  getTrainingStats,
  exportToJSONL,
  exportToCSV,
  exportToHuggingFace,
  generateSyntheticData,
  addTrainingExample,
  deleteTrainingExample,
  updateQualityScore,
  importFromJSONL,
};
