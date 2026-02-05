const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Get all deployments with filters
router.get('/', (req, res) => {
  try {
    const { status, job_id, candidate_id, from_date, to_date } = req.query;
    
    let sql = `
      SELECT 
        d.*,
        c.name as candidate_name,
        c.email as candidate_email,
        c.level as candidate_level,
        c.rating as candidate_rating,
        j.title as job_title,
        j.job_date,
        j.start_time,
        j.end_time,
        j.location,
        cl.company_name as client_name
      FROM deployments d
      LEFT JOIN candidates c ON d.candidate_id = c.id
      LEFT JOIN jobs j ON d.job_id = j.id
      LEFT JOIN clients cl ON j.client_id = cl.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    if (job_id) {
      sql += ' AND d.job_id = ?';
      params.push(job_id);
    }
    if (candidate_id) {
      sql += ' AND d.candidate_id = ?';
      params.push(candidate_id);
    }
    if (from_date) {
      sql += ' AND j.job_date >= ?';
      params.push(from_date);
    }
    if (to_date) {
      sql += ' AND j.job_date <= ?';
      params.push(to_date);
    }

    sql += ' ORDER BY j.job_date DESC, d.created_at DESC';

    const deployments = db.prepare(sql).all(...params);
    res.json({ success: true, data: deployments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single deployment
router.get('/:id', (req, res) => {
  try {
    const deployment = db.prepare(`
      SELECT 
        d.*,
        c.name as candidate_name,
        c.email as candidate_email,
        c.phone as candidate_phone,
        c.level as candidate_level,
        j.title as job_title,
        j.job_date,
        j.start_time,
        j.end_time,
        j.location,
        j.address,
        cl.company_name as client_name
      FROM deployments d
      LEFT JOIN candidates c ON d.candidate_id = c.id
      LEFT JOIN jobs j ON d.job_id = j.id
      LEFT JOIN clients cl ON j.client_id = cl.id
      WHERE d.id = ?
    `).get(req.params.id);

    if (!deployment) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    res.json({ success: true, data: deployment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update deployment status
router.patch('/:id', (req, res) => {
  try {
    const { status, check_in_time, check_out_time, hours_worked, rating, feedback } = req.body;
    const deployment = db.prepare('SELECT * FROM deployments WHERE id = ?').get(req.params.id);

    if (!deployment) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    // If completing, calculate financials
    if (status === 'completed' && hours_worked) {
      const job = db.prepare('SELECT charge_rate, pay_rate FROM jobs WHERE id = ?').get(deployment.job_id);
      const grossRevenue = hours_worked * job.charge_rate;
      const candidatePay = hours_worked * job.pay_rate;
      const grossProfit = grossRevenue - candidatePay;

      db.prepare(`
        UPDATE deployments 
        SET status = ?, check_out_time = CURRENT_TIMESTAMP, hours_worked = ?,
            charge_rate = ?, pay_rate = ?, gross_revenue = ?, candidate_pay = ?, gross_profit = ?,
            rating = ?, feedback = ?
        WHERE id = ?
      `).run(status, hours_worked, job.charge_rate, job.pay_rate, grossRevenue, candidatePay, grossProfit, rating, feedback, req.params.id);

      // Update candidate stats
      if (rating) {
        db.prepare(`
          UPDATE candidates 
          SET total_jobs_completed = total_jobs_completed + 1,
              xp = xp + 100 + CASE WHEN ? = 5 THEN 50 ELSE 0 END
          WHERE id = ?
        `).run(rating, deployment.candidate_id);
      }
    } else {
      const updates = [];
      const params = [];

      if (status) { updates.push('status = ?'); params.push(status); }
      if (check_in_time) { updates.push('check_in_time = ?'); params.push(check_in_time); }
      if (check_out_time) { updates.push('check_out_time = ?'); params.push(check_out_time); }
      if (rating !== undefined) { updates.push('rating = ?'); params.push(rating); }
      if (feedback !== undefined) { updates.push('feedback = ?'); params.push(feedback); }

      if (updates.length > 0) {
        params.push(req.params.id);
        db.prepare(`UPDATE deployments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      }
    }

    const updated = db.prepare('SELECT * FROM deployments WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get deployment stats
router.get('/stats/overview', (req, res) => {
  try {
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM deployments').get().count,
      byStatus: db.prepare('SELECT status, COUNT(*) as count FROM deployments GROUP BY status').all(),
      today: db.prepare(`
        SELECT COUNT(*) as count FROM deployments d
        JOIN jobs j ON d.job_id = j.id
        WHERE j.job_date = date('now')
      `).get().count,
      thisWeek: db.prepare(`
        SELECT COUNT(*) as count FROM deployments d
        JOIN jobs j ON d.job_id = j.id
        WHERE j.job_date BETWEEN date('now', 'weekday 0', '-6 days') AND date('now')
      `).get().count,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
