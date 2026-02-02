const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Random default avatar generator
function generateRandomAvatar(name) {
  const styles = [
    'avataaars', 'avataaars-neutral', 'bottts', 'fun-emoji', 'lorelei',
    'lorelei-neutral', 'micah', 'miniavs', 'notionists', 'notionists-neutral',
    'open-peeps', 'personas', 'pixel-art', 'pixel-art-neutral', 'thumbs',
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const seed = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

// Get all candidates
router.get('/', (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM candidates WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const candidates = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;

    // Parse JSON fields
    const parsed = candidates.map(c => ({
      ...c,
      certifications: JSON.parse(c.certifications || '[]'),
      skills: JSON.parse(c.skills || '[]'),
      preferred_locations: JSON.parse(c.preferred_locations || '[]'),
    }));

    res.json({
      success: true,
      data: parsed,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single candidate
router.get('/:id', (req, res) => {
  try {
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }

    // Parse JSON fields
    candidate.certifications = JSON.parse(candidate.certifications || '[]');
    candidate.skills = JSON.parse(candidate.skills || '[]');
    candidate.preferred_locations = JSON.parse(candidate.preferred_locations || '[]');

    // Get achievements
    const achievements = db.prepare(`
      SELECT a.*, ca.unlocked_at 
      FROM achievements a
      JOIN candidate_achievements ca ON a.id = ca.achievement_id
      WHERE ca.candidate_id = ?
    `).all(req.params.id);

    // Get recent deployments
    const deployments = db.prepare(`
      SELECT d.*, j.title as job_title, j.job_date, j.location, c.company_name
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      WHERE d.candidate_id = ?
      ORDER BY d.created_at DESC
      LIMIT 10
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...candidate,
        achievements,
        deployments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create candidate
router.post('/', (req, res) => {
  try {
    const { name, email, phone, date_of_birth, source = 'direct', status = 'lead' } = req.body;
    const id = 'CND' + Date.now().toString(36).toUpperCase();

    const stmt = db.prepare(`
      INSERT INTO candidates (id, name, email, phone, date_of_birth, source, status, profile_photo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, email, phone, date_of_birth, source, status, generateRandomAvatar(name));

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    
    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update candidate
router.put('/:id', (req, res) => {
  try {
    const allowedFields = [
      'name', 'email', 'phone', 'date_of_birth', 'status', 'source',
      'profile_photo', 'certifications', 'skills', 'availability',
      'preferred_locations', 'bank_name', 'bank_account'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        const value = Array.isArray(req.body[field]) ? JSON.stringify(req.body[field]) : req.body[field];
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE candidates SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    candidate.certifications = JSON.parse(candidate.certifications || '[]');
    
    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get candidate stats (for pipeline)
// Simplified to: pending, active, inactive
router.get('/stats/pipeline', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM candidates
      GROUP BY status
    `).all();

    const pipeline = {
      pending: 0,
      active: 0,
      inactive: 0,
    };

    // Map old statuses to new simplified ones
    stats.forEach(s => {
      if (s.status === 'active') {
        pipeline.active = s.count;
      } else if (s.status === 'inactive') {
        pipeline.inactive = s.count;
      } else {
        // pending, lead, screening, onboarding, applied -> all count as pending
        pipeline.pending += s.count;
      }
    });

    res.json({ success: true, data: pipeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get candidate achievements
router.get('/:id/achievements', (req, res) => {
  try {
    const achievements = db.prepare(`
      SELECT a.*, ca.unlocked_at 
      FROM achievements a
      JOIN candidate_achievements ca ON a.id = ca.achievement_id
      WHERE ca.candidate_id = ?
      ORDER BY ca.unlocked_at DESC
    `).all(req.params.id);

    res.json({ success: true, data: achievements });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get candidate deployments
router.get('/:id/deployments', (req, res) => {
  try {
    const deployments = db.prepare(`
      SELECT d.*, j.title as job_title, j.job_date, j.location, j.start_time, j.end_time,
             c.company_name, c.industry
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE d.candidate_id = ?
      ORDER BY j.job_date DESC
    `).all(req.params.id);

    res.json({ success: true, data: deployments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get candidate notifications
router.get('/:id/notifications', (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(req.params.id, parseInt(limit));

    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark notification as read
router.post('/:id/notifications/:notificationId/read', (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET read = 1 
      WHERE id = ? AND candidate_id = ?
    `).run(req.params.notificationId, req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark all notifications as read
router.post('/:id/notifications/read-all', (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET read = 1
      WHERE candidate_id = ? AND read = 0
    `).run(req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload profile photo (base64)
router.post('/:id/photo', (req, res) => {
  try {
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({ success: false, error: 'No photo provided' });
    }

    // Validate it's a valid base64 image
    if (!photo.startsWith('data:image/')) {
      return res.status(400).json({ success: false, error: 'Invalid image format' });
    }

    // Limit size (roughly 5MB in base64)
    if (photo.length > 7000000) {
      return res.status(400).json({ success: false, error: 'Image too large. Max 5MB.' });
    }

    db.prepare(`
      UPDATE candidates
      SET profile_photo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(photo, req.params.id);

    res.json({ success: true, data: { profile_photo: photo } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete profile photo
router.delete('/:id/photo', (req, res) => {
  try {
    db.prepare(`
      UPDATE candidates
      SET profile_photo = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
