const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Get all jobs
router.get('/', (req, res) => {
  try {
    const { status, client_id, featured, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT j.*, c.company_name as client_name 
      FROM jobs j 
      LEFT JOIN clients c ON j.client_id = c.id 
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND j.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND j.client_id = ?';
      params.push(client_id);
    }

    if (featured === 'true') {
      query += ' AND j.featured = 1';
    }

    query += ' ORDER BY j.job_date ASC, j.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const jobs = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;

    const parsed = jobs.map(j => ({
      ...j,
      required_certifications: JSON.parse(j.required_certifications || '[]'),
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

// Get single job with deployments
router.get('/:id', (req, res) => {
  try {
    const job = db.prepare(`
      SELECT j.*, c.company_name, c.contact_name, c.contact_phone, c.industry
      FROM jobs j 
      LEFT JOIN clients c ON j.client_id = c.id 
      WHERE j.id = ?
    `).get(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    job.required_certifications = JSON.parse(job.required_certifications || '[]');

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get deployments for a job
router.get('/:id/deployments', (req, res) => {
  try {
    const deployments = db.prepare(`
      SELECT d.*, c.name as candidate_name, c.email as candidate_email, 
             c.phone as candidate_phone, c.rating as candidate_rating, c.level
      FROM deployments d
      JOIN candidates c ON d.candidate_id = c.id
      WHERE d.job_id = ?
      ORDER BY d.created_at DESC
    `).all(req.params.id);

    res.json({ success: true, data: deployments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create job
router.post('/', (req, res) => {
  try {
    const {
      client_id, title, description, job_date, start_time, end_time,
      location, address, pay_rate, total_slots, required_certifications,
      xp_bonus, featured
    } = req.body;

    const id = 'JOB' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO jobs (id, client_id, title, description, job_date, start_time, end_time, location, address, pay_rate, total_slots, required_certifications, xp_bonus, featured, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(
      id, client_id, title, description, job_date, start_time, end_time,
      location, address, pay_rate, total_slots,
      JSON.stringify(required_certifications || []),
      xp_bonus || 0, featured ? 1 : 0
    );

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update job
router.put('/:id', (req, res) => {
  try {
    const allowedFields = [
      'title', 'description', 'job_date', 'start_time', 'end_time',
      'location', 'address', 'pay_rate', 'total_slots', 'required_certifications',
      'xp_bonus', 'featured', 'status'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        const value = field === 'required_certifications' 
          ? JSON.stringify(req.body[field]) 
          : req.body[field];
        values.push(value);
      }
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Candidate accepts job
router.post('/:id/accept', (req, res) => {
  try {
    const { candidate_id } = req.body;
    const job_id = req.params.id;

    // Check if job exists and has slots
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.filled_slots >= job.total_slots) {
      return res.status(400).json({ success: false, error: 'Job is fully booked' });
    }

    // Check if already deployed
    const existing = db.prepare('SELECT * FROM deployments WHERE job_id = ? AND candidate_id = ?').get(job_id, candidate_id);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Already assigned to this job' });
    }

    // Create deployment
    const deployment_id = 'DEP' + Date.now().toString(36).toUpperCase();
    db.prepare(`
      INSERT INTO deployments (id, job_id, candidate_id, status)
      VALUES (?, ?, ?, 'assigned')
    `).run(deployment_id, job_id, candidate_id);

    // Update job filled slots
    db.prepare('UPDATE jobs SET filled_slots = filled_slots + 1 WHERE id = ?').run(job_id);

    res.json({ success: true, data: { deployment_id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
