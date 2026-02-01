/**
 * Machine Learning API Routes
 *
 * Endpoints for managing the ML knowledge base, training data,
 * and monitoring ML performance.
 */

const express = require('express');
const router = express.Router();
const ml = require('../../../services/ml');
const trainer = require('../../../services/ml/trainer');

// =====================================================
// ML SETTINGS
// =====================================================

/**
 * GET /api/v1/ml/settings
 * Get all ML settings
 */
router.get('/settings', (req, res) => {
  try {
    const settings = ml.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/ml/settings
 * Update ML settings
 */
router.put('/settings', (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'Key is required' });
    }

    ml.updateSetting(key, value);
    res.json({ success: true, message: 'Setting updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// ML STATS & DASHBOARD
// =====================================================

/**
 * GET /api/v1/ml/stats
 * Get ML system statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = ml.getStats();
    const trainingStats = trainer.getTrainingStats();

    res.json({
      success: true,
      data: {
        ...stats,
        training: trainingStats,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// KNOWLEDGE BASE
// =====================================================

/**
 * GET /api/v1/ml/knowledge-base
 * Get knowledge base entries
 */
router.get('/knowledge-base', (req, res) => {
  try {
    const { limit = 50, offset = 0, category, minConfidence = 0 } = req.query;

    const entries = ml.getKnowledgeBase({
      limit: parseInt(limit),
      offset: parseInt(offset),
      category,
      minConfidence: parseFloat(minConfidence),
    });

    res.json({ success: true, data: entries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/ml/knowledge-base/:id
 * Delete a knowledge base entry
 */
router.delete('/knowledge-base/:id', (req, res) => {
  try {
    ml.deleteKBEntry(req.params.id);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ml/knowledge-base/test
 * Test a query against the knowledge base
 */
router.post('/knowledge-base/test', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const result = await ml.findAnswer(question);

    res.json({
      success: true,
      data: {
        found: !!result,
        result,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// FAQ MANAGEMENT
// =====================================================

/**
 * GET /api/v1/ml/faq
 * Get all FAQ entries
 */
router.get('/faq', (req, res) => {
  try {
    const { activeOnly = 'true' } = req.query;
    const faqs = ml.getFAQs(activeOnly === 'true');
    res.json({ success: true, data: faqs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ml/faq
 * Add a new FAQ entry
 */
router.post('/faq', (req, res) => {
  try {
    const { category, question, answer, keywords = [], priority = 0 } = req.body;

    if (!category || !question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Category, question, and answer are required',
      });
    }

    const id = ml.addFAQ(category, question, answer, keywords, priority);
    res.json({ success: true, data: { id }, message: 'FAQ added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/v1/ml/faq/:id
 * Update an FAQ entry
 */
router.put('/faq/:id', (req, res) => {
  try {
    const { category, question, answer, keywords, priority, active } = req.body;

    ml.updateFAQ(req.params.id, {
      category,
      question,
      answer,
      keywords,
      priority,
      active,
    });

    res.json({ success: true, message: 'FAQ updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/ml/faq/:id
 * Delete an FAQ entry
 */
router.delete('/faq/:id', (req, res) => {
  try {
    ml.deleteFAQ(req.params.id);
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// RESPONSE LOGS
// =====================================================

/**
 * GET /api/v1/ml/logs
 * Get AI response logs
 */
router.get('/logs', (req, res) => {
  try {
    const { limit = 50, offset = 0, candidateId, status } = req.query;

    const logs = ml.getResponseLogs({
      limit: parseInt(limit),
      offset: parseInt(offset),
      candidateId,
      status,
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ml/logs/:id/feedback
 * Submit feedback on an AI response
 */
router.post('/logs/:id/feedback', async (req, res) => {
  try {
    const { action, editedAnswer } = req.body;

    if (!['approved', 'edited', 'rejected', 'dismissed'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be: approved, edited, rejected, or dismissed',
      });
    }

    if (action === 'edited' && !editedAnswer) {
      return res.status(400).json({
        success: false,
        error: 'editedAnswer is required when action is edited',
      });
    }

    await ml.recordFeedback(req.params.id, action, editedAnswer);

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// TRAINING DATA
// =====================================================

/**
 * GET /api/v1/ml/training-data
 * Get training data entries
 */
router.get('/training-data', (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      minQuality = 0,
      adminApprovedOnly = 'false',
    } = req.query;

    const data = trainer.getTrainingData({
      limit: parseInt(limit),
      offset: parseInt(offset),
      minQuality: parseFloat(minQuality),
      adminApprovedOnly: adminApprovedOnly === 'true',
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v1/ml/training-data/stats
 * Get training data statistics
 */
router.get('/training-data/stats', (req, res) => {
  try {
    const stats = trainer.getTrainingStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ml/training-data
 * Add a training example manually
 */
router.post('/training-data', (req, res) => {
  try {
    const { input, output, intent, category, qualityScore = 0.8 } = req.body;

    if (!input || !output) {
      return res.status(400).json({
        success: false,
        error: 'Input and output are required',
      });
    }

    const id = trainer.addTrainingExample(input, output, {
      intent,
      category,
      qualityScore,
    });

    res.json({ success: true, data: { id }, message: 'Training example added' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/v1/ml/training-data/:id
 * Delete a training example
 */
router.delete('/training-data/:id', (req, res) => {
  try {
    trainer.deleteTrainingExample(req.params.id);
    res.json({ success: true, message: 'Training example deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ml/training-data/export
 * Export training data for fine-tuning
 */
router.post('/training-data/export', (req, res) => {
  try {
    const {
      format = 'jsonl',
      minQuality = 0.7,
      adminApprovedOnly = true,
    } = req.body;

    let result;

    switch (format) {
      case 'csv':
        result = trainer.exportToCSV({ minQuality, adminApprovedOnly });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=training_data.csv');
        break;

      case 'huggingface':
        result = trainer.exportToHuggingFace({ minQuality, adminApprovedOnly });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=dataset.json');
        break;

      case 'jsonl':
      default:
        result = trainer.exportToJSONL({ minQuality, adminApprovedOnly, format: 'chat' });
        res.setHeader('Content-Type', 'application/jsonl');
        res.setHeader('Content-Disposition', 'attachment; filename=training_data.jsonl');
        break;
    }

    res.send(result.content);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v1/ml/training-data/import
 * Import training data from JSONL
 */
router.post('/training-data/import', (req, res) => {
  try {
    const { content, qualityScore = 0.7 } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
      });
    }

    const result = trainer.importFromJSONL(content, { qualityScore });

    res.json({
      success: true,
      data: result,
      message: `Imported ${result.imported} examples (${result.errors} errors)`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
