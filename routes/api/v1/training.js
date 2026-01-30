const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Get all training courses
router.get('/', (req, res) => {
  try {
    const courses = db.prepare('SELECT * FROM training ORDER BY title').all();
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create training
router.post('/', (req, res) => {
  try {
    const { title, description, duration_minutes, xp_reward, certification_name } = req.body;
    const id = 'TRN' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO training (id, title, description, duration_minutes, xp_reward, certification_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, description, duration_minutes || 30, xp_reward || 100, certification_name || null);

    const training = db.prepare('SELECT * FROM training WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: training });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update training
router.put('/:id', (req, res) => {
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete training
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM training WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get candidate's training progress
router.get('/candidate/:candidateId', (req, res) => {
  try {
    const progress = db.prepare(`
      SELECT ct.*, t.title, t.certification_name, t.xp_reward
      FROM candidate_training ct
      JOIN training t ON ct.training_id = t.id
      WHERE ct.candidate_id = ?
    `).all(req.params.candidateId);
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enroll in training
router.post('/:id/enroll', (req, res) => {
  try {
    const { candidate_id } = req.body;
    db.prepare(`
      INSERT INTO candidate_training (candidate_id, training_id, status)
      VALUES (?, ?, 'enrolled')
    `).run(candidate_id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Complete training
router.post('/:id/complete', (req, res) => {
  try {
    const { candidate_id, score } = req.body;
    const training = db.prepare('SELECT * FROM training WHERE id = ?').get(req.params.id);
    
    const passed = score >= training.pass_score;
    const status = passed ? 'completed' : 'failed';

    db.prepare(`
      UPDATE candidate_training 
      SET status = ?, score = ?, completed_at = CURRENT_TIMESTAMP
      WHERE candidate_id = ? AND training_id = ?
    `).run(status, score, candidate_id, req.params.id);

    // Award XP if passed
    if (passed) {
      db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(training.xp_reward, candidate_id);
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, amount, reason, reference_id)
        VALUES (?, ?, 'training', ?)
      `).run(candidate_id, training.xp_reward, req.params.id);

      // Add certification
      const candidate = db.prepare('SELECT certifications FROM candidates WHERE id = ?').get(candidate_id);
      const certs = JSON.parse(candidate.certifications || '[]');
      if (!certs.includes(training.certification_name)) {
        certs.push(training.certification_name);
        db.prepare('UPDATE candidates SET certifications = ? WHERE id = ?').run(JSON.stringify(certs), candidate_id);
      }
    }

    res.json({ success: true, passed, xp_awarded: passed ? training.xp_reward : 0 });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
