const express = require('express');
const router = express.Router();
const { db } = require('../../../db');

// Get all clients
router.get('/', (req, res) => {
  try {
    const { status, industry, search } = req.query;

    // Single query with JOIN to get clients and job stats (avoids N+1 problem)
    let query = `
      SELECT c.*,
        COALESCE(COUNT(j.id), 0) as total_jobs,
        COALESCE(SUM(CASE WHEN j.status IN ('open', 'in_progress') THEN 1 ELSE 0 END), 0) as active_jobs
      FROM clients c
      LEFT JOIN jobs j ON c.id = j.client_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (industry) {
      query += ' AND c.industry = ?';
      params.push(industry);
    }

    if (search) {
      query += ' AND (c.company_name LIKE ? OR c.contact_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY c.id ORDER BY c.company_name ASC';

    const clients = db.prepare(query).all(...params);

    res.json({ success: true, data: clients });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get client by ID
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get client's jobs
router.get('/:id/jobs', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT * FROM jobs WHERE client_id = ? ORDER BY job_date DESC
    `).all(req.params.id);

    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create client
router.post('/', (req, res) => {
  try {
    const { company_name, uen, industry, contact_name, contact_email, contact_phone, payment_terms, notes } = req.body;
    const id = 'CLT' + Date.now().toString(36).toUpperCase();

    db.prepare(`
      INSERT INTO clients (id, company_name, uen, industry, contact_name, contact_email, contact_phone, payment_terms, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, company_name, uen, industry, contact_name, contact_email, contact_phone, payment_terms || 30, notes);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update client
router.put('/:id', (req, res) => {
  try {
    const allowedFields = ['company_name', 'uen', 'industry', 'contact_name', 'contact_email', 'contact_phone', 'payment_terms', 'status', 'notes'];
    
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: client });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
