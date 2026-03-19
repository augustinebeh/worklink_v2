const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const { safeJsonParse } = require('../../../db/utils/db-helpers');
const { authenticateAdmin, authenticateToken } = require('../../../middleware/auth');

// Get all training courses
router.get('/', (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for search filter
    let whereClause = '';
    let params = [];
    if (search) {
      whereClause = 'WHERE title LIKE ? OR description LIKE ?';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM training ${whereClause}`;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get training courses with pagination
    const coursesQuery = `
      SELECT * FROM training
      ${whereClause}
      ORDER BY title
      LIMIT ? OFFSET ?
    `;
    const courses = db.prepare(coursesQuery).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Create training
router.post('/', authenticateAdmin, (req, res) => {
  try {
    const { title, description, duration_minutes, xp_reward, certification_name } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'title is required and must be a non-empty string' });
    }

    const id = 'TRN' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO training (id, title, description, duration_minutes, xp_reward, certification_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, description, duration_minutes || 30, xp_reward || 100, certification_name || null);

    const training = db.prepare('SELECT * FROM training WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: training });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update training
router.put('/:id', authenticateAdmin, (req, res) => {
  try {
    const { title, description, duration_minutes, xp_reward, certification_name } = req.body;

    db.prepare(`
      UPDATE training 
      SET title = ?, description = ?, duration_minutes = ?, xp_reward = ?, certification_name = ?
      WHERE id = ?
    `).run(title, description, duration_minutes, xp_reward, certification_name, req.params.id);

    const training = db.prepare('SELECT * FROM training WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: training });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete training
router.delete('/:id', authenticateAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM training WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get candidate's training progress
router.get('/candidate/:candidateId', (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const candidateId = req.params.candidateId;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for status filter
    let whereClause = 'WHERE ct.candidate_id = ?';
    let params = [candidateId];

    if (status) {
      whereClause += ' AND ct.status = ?';
      params.push(status);
    }

    // Get total count for pagination
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM candidate_training ct
      JOIN training t ON ct.training_id = t.id
      ${whereClause}
    `;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get candidate's training progress with pagination
    const progressQuery = `
      SELECT ct.*, t.title, t.certification_name, t.xp_reward
      FROM candidate_training ct
      JOIN training t ON ct.training_id = t.id
      ${whereClause}
      ORDER BY ct.enrolled_at DESC
      LIMIT ? OFFSET ?
    `;
    const progress = db.prepare(progressQuery).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: progress,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Enroll in training
router.post('/:id/enroll', authenticateToken, (req, res) => {
  try {
    const { candidate_id } = req.body;
    db.prepare(`
      INSERT INTO candidate_training (candidate_id, training_id, status)
      VALUES (?, ?, 'enrolled')
    `).run(candidate_id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Complete training
router.post('/:id/complete', authenticateToken, (req, res) => {
  try {
    const { candidate_id, score } = req.body;

    if (score === undefined || score === null || typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ success: false, error: 'score is required and must be a number between 0 and 100' });
    }
    if (!candidate_id || typeof candidate_id !== 'string') {
      return res.status(400).json({ success: false, error: 'candidate_id is required and must be a string' });
    }

    const training = db.prepare('SELECT * FROM training WHERE id = ?').get(req.params.id);

    if (!training) {
      return res.status(404).json({ success: false, error: 'Training not found' });
    }

    const passed = score >= training.pass_score;
    const status = passed ? 'completed' : 'failed';

    db.prepare(`
      UPDATE candidate_training 
      SET status = ?, score = ?, completed_at = CURRENT_TIMESTAMP
      WHERE candidate_id = ? AND training_id = ?
    `).run(status, score, candidate_id, req.params.id);

    // Award XP if passed - use transaction for atomicity
    if (passed) {
      const transaction = db.transaction(() => {
        // Award XP
        db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(training.xp_reward, candidate_id);

        // Record XP transaction
        db.prepare(`
          INSERT INTO xp_transactions (candidate_id, amount, reason, reference_id)
          VALUES (?, ?, 'training', ?)
        `).run(candidate_id, training.xp_reward, req.params.id);

        // Add certification atomically
        const candidate = db.prepare('SELECT certifications FROM candidates WHERE id = ?').get(candidate_id);
        const certs = safeJsonParse(candidate.certifications, []);
        if (!certs.includes(training.certification_name)) {
          certs.push(training.certification_name);
          db.prepare('UPDATE candidates SET certifications = ? WHERE id = ?')
            .run(JSON.stringify(certs), candidate_id);
        }
      });

      // Execute transaction atomically
      transaction();
    }

    res.json({ success: true, passed, xp_awarded: passed ? training.xp_reward : 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
