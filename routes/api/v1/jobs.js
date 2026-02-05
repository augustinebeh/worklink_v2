const express = require('express');
const router = express.Router();
const { db } = require('../../../db');
const { createValidationMiddleware } = require('../../../middleware/database-validation');
const { createInputValidationMiddleware } = require('../../../middleware/input-validation');

// Lazy-load telegram posting to avoid circular dependencies
let telegramPostingService = null;
function getTelegramPosting() {
  if (!telegramPostingService) {
    try {
      telegramPostingService = require('../../../services/telegram-posting');
    } catch (error) {
      console.error('Failed to load telegram-posting service:', error.message);
    }
  }
  return telegramPostingService;
}

/**
 * Auto-complete jobs that are past their end time
 * Updates status from 'open' or 'filled' to 'completed'
 */
function autoCompleteExpiredJobs() {
  try {
    // Get current date and time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    // Update jobs where:
    // 1. Status is 'open' or 'filled'
    // 2. job_date is before today OR (job_date is today AND end_time has passed)
    const result = db.prepare(`
      UPDATE jobs 
      SET status = 'completed'
      WHERE (status = 'open' OR status = 'filled')
      AND (
        job_date < ?
        OR (job_date = ? AND end_time <= ?)
      )
    `).run(currentDate, currentDate, currentTime);

    if (result.changes > 0) {
      console.log(`✅ Auto-completed ${result.changes} expired job(s)`);
    }
  } catch (error) {
    console.error('Error auto-completing expired jobs:', error);
    // Don't throw - this is a background operation
  }
}


// Get job statistics
router.get('/stats', (req, res) => {
  try {
    // Get status counts for frontend pipeline cards
    const statusStats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `).all();

    // Convert array to object format
    const stats = {
      open: 0,
      filled: 0,
      completed: 0
    };

    statusStats.forEach(stat => {
      if (stat.status === 'open') stats.open = stat.count;
      else if (stat.status === 'filled') stats.filled = stat.count;
      else if (stat.status === 'completed') stats.completed = stat.count;
    });

    // Get total count
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;

    // Recent job postings
    const recentPostings = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM jobs
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `).all();

    res.json({
      success: true,
      data: stats,
      meta: {
        total: totalJobs,
        recent_postings: recentPostings
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching job stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve job statistics',
      details: error.message
    });
  }
});

// Get all jobs
router.get('/', (req, res) => {
  try {
    // Auto-complete jobs that are past their end time
    autoCompleteExpiredJobs();

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
router.post('/',
  createInputValidationMiddleware('job'),
  createValidationMiddleware('job'),
  async (req, res) => {
  try {
    const {
      client_id, title, description, job_date, start_time, end_time,
      location, pay_rate, charge_rate, total_slots, required_skills,
      xp_bonus, featured, urgent, auto_post_telegram = false
    } = req.body;

    const id = 'JOB' + Date.now().toString(36).toUpperCase();
    // Use charge_rate if provided, otherwise default to pay_rate * 1.3 (30% markup)
    const finalChargeRate = charge_rate || (pay_rate * 1.3);

    db.prepare(`
      INSERT INTO jobs (id, client_id, title, description, job_date, start_time, end_time, location, charge_rate, pay_rate, total_slots, required_skills, xp_bonus, featured, urgent, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
    `).run(
      id, client_id, title, description, job_date, start_time, end_time,
      location, finalChargeRate, pay_rate, total_slots,
      JSON.stringify(required_skills || []),
      xp_bonus || 0, featured ? 1 : 0, urgent ? 1 : 0
    );

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    // Auto-post to Telegram if enabled (optional feature)
    let telegramResult = null;
    try {
      const telegramPosting = getTelegramPosting();
      if (telegramPosting) {
        const settings = telegramPosting.getSettings();
        if ((auto_post_telegram || settings.post_on_job_create) && settings.enabled) {
          telegramResult = await telegramPosting.postJobToAllGroups(job, {
            useABTesting: true,
          });
        }
      }
    } catch (error) {
      console.error('Auto-post to Telegram failed:', error.message);
      // Don't fail job creation if telegram posting fails
    }

    res.status(201).json({
      success: true,
      data: job,
      telegramPost: telegramResult,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update job
router.put('/:id', (req, res) => {
  try {
    console.log('🔧 PUT /jobs/:id - Request received:', { 
      id: req.params.id, 
      body: req.body 
    });

    const allowedFields = [
      'title', 'description', 'job_date', 'start_time', 'end_time',
      'location', 'pay_rate', 'charge_rate', 'total_slots', 'required_certifications',
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

    console.log('🔧 SQL Update:', { 
      sql: `UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`,
      values: values
    });

    db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    console.log('✅ Job updated successfully:', job);
    
    res.json({ success: true, data: job });
  } catch (error) {
    console.error('❌ Error updating job:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Candidate accepts job
router.post('/:id/accept', (req, res) => {
  try {
    const { candidate_id } = req.body;
    const job_id = req.params.id;

    // Check candidate status - only active users can accept jobs
    const candidate = db.prepare('SELECT status FROM candidates WHERE id = ?').get(candidate_id);
    if (!candidate) {
      return res.status(404).json({ success: false, error: 'Candidate not found' });
    }
    if (candidate.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending verification. Please wait for admin approval before accepting jobs.',
        code: 'ACCOUNT_PENDING'
      });
    }

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

    // Check if job is now fully booked and update status
    const updatedJob = db.prepare('SELECT filled_slots, total_slots FROM jobs WHERE id = ?').get(job_id);
    if (updatedJob.filled_slots >= updatedJob.total_slots) {
      db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run('filled', job_id);
    }

    res.json({ success: true, data: { deployment_id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update job status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const job_id = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const validStatuses = ['open', 'filled', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, job_id);

    const updatedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
    res.json({ success: true, data: updatedJob });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
