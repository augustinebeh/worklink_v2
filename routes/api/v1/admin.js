const express = require('express');
const router = express.Router();
const { db, resetToSampleData } = require('../../../db/database');

// Reset database to sample data
router.post('/reset-to-sample', (req, res) => {
  try {
    resetToSampleData();
    res.json({ success: true, message: 'Database reset to sample data' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get database stats
router.get('/stats', (req, res) => {
  try {
    const stats = {
      candidates: db.prepare('SELECT COUNT(*) as count FROM candidates').get().count,
      jobs: db.prepare('SELECT COUNT(*) as count FROM jobs').get().count,
      deployments: db.prepare('SELECT COUNT(*) as count FROM deployments').get().count,
      payments: db.prepare('SELECT COUNT(*) as count FROM payments').get().count,
      clients: db.prepare('SELECT COUNT(*) as count FROM clients').get().count,
      tenders: db.prepare('SELECT COUNT(*) as count FROM tenders').get().count,
      training: db.prepare('SELECT COUNT(*) as count FROM training').get().count,
      achievements: db.prepare('SELECT COUNT(*) as count FROM achievements').get().count,
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// System settings
router.get('/settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM settings').all();
    const settingsMap = {};
    settings.forEach(s => { settingsMap[s.key] = s.value; });
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    const { key, value } = req.body;
    db.prepare(`
      INSERT INTO settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, value, value);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
