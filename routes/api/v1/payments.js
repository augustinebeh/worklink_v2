const express = require('express');
const router = express.Router();
const { db } = require('../../../db/database');

// Get all payments with filters
router.get('/', (req, res) => {
  try {
    const { status, candidate_id, from_date, to_date } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        c.name as candidate_name,
        c.email as candidate_email,
        c.bank_name,
        c.bank_account,
        d.job_id,
        j.title as job_title,
        j.job_date
      FROM payments p
      LEFT JOIN candidates c ON p.candidate_id = c.id
      LEFT JOIN deployments d ON p.deployment_id = d.id
      LEFT JOIN jobs j ON d.job_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (candidate_id) {
      sql += ' AND p.candidate_id = ?';
      params.push(candidate_id);
    }
    if (from_date) {
      sql += ' AND p.created_at >= ?';
      params.push(from_date);
    }
    if (to_date) {
      sql += ' AND p.created_at <= ?';
      params.push(to_date);
    }

    sql += ' ORDER BY p.created_at DESC';

    const payments = db.prepare(sql).all(...params);
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get payment stats
router.get('/stats', (req, res) => {
  try {
    const stats = {
      total: db.prepare('SELECT COALESCE(SUM(total_amount), 0) as amount FROM payments').get().amount,
      pending: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as amount FROM payments WHERE status = 'pending'").get().amount,
      approved: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as amount FROM payments WHERE status = 'approved'").get().amount,
      paid: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as amount FROM payments WHERE status = 'paid'").get().amount,
      byStatus: db.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount FROM payments GROUP BY status').all(),
      thisMonth: db.prepare("SELECT COALESCE(SUM(total_amount), 0) as amount FROM payments WHERE status = 'paid' AND paid_at >= date('now', 'start of month')").get().amount,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update payment status
router.patch('/:id', (req, res) => {
  try {
    const { status, transaction_id, payment_proof, notes } = req.body;
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
      
      if (status === 'paid') {
        updates.push('paid_at = CURRENT_TIMESTAMP');
        
        // Update candidate earnings
        db.prepare(`
          UPDATE candidates 
          SET total_earnings = total_earnings + ?
          WHERE id = ?
        `).run(payment.total_amount, payment.candidate_id);
      }
    }
    if (transaction_id) { updates.push('transaction_id = ?'); params.push(transaction_id); }
    if (payment_proof) { updates.push('payment_proof = ?'); params.push(payment_proof); }
    if (notes) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE payments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch approve payments
router.post('/batch-approve', (req, res) => {
  try {
    const { payment_ids } = req.body;
    
    if (!payment_ids || payment_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No payment IDs provided' });
    }

    const placeholders = payment_ids.map(() => '?').join(',');
    db.prepare(`UPDATE payments SET status = 'approved' WHERE id IN (${placeholders}) AND status = 'pending'`).run(...payment_ids);

    const updated = db.prepare(`SELECT * FROM payments WHERE id IN (${placeholders})`).all(...payment_ids);
    res.json({ success: true, data: updated, message: `${updated.length} payments approved` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Batch mark as paid
router.post('/batch-paid', (req, res) => {
  try {
    const { payment_ids, transaction_id } = req.body;
    
    if (!payment_ids || payment_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'No payment IDs provided' });
    }

    const placeholders = payment_ids.map(() => '?').join(',');
    
    // Get payments to update candidate earnings
    const payments = db.prepare(`SELECT * FROM payments WHERE id IN (${placeholders}) AND status = 'approved'`).all(...payment_ids);
    
    // Update to paid
    db.prepare(`
      UPDATE payments 
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP, transaction_id = ?
      WHERE id IN (${placeholders}) AND status = 'approved'
    `).run(transaction_id, ...payment_ids);

    // Update candidate earnings
    payments.forEach(p => {
      db.prepare(`UPDATE candidates SET total_earnings = total_earnings + ? WHERE id = ?`).run(p.total_amount, p.candidate_id);
    });

    res.json({ success: true, message: `${payments.length} payments marked as paid` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Request withdrawal (for candidate use)
router.post('/:id/request-withdrawal', (req, res) => {
  try {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);

    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Payment must be approved before withdrawal can be requested' });
    }

    db.prepare(`
      UPDATE payments 
      SET withdrawal_requested = 1, withdrawal_requested_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    const updated = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
