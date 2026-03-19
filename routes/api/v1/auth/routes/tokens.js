/**
 * Token Management Routes
 * Handles push-token and other token-related endpoints
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { authenticateToken } = require('../../../../../middleware/auth');

/**
 * POST /push-token
 * Update push token for notifications (authenticated - uses token owner's ID)
 */
router.post('/push-token', authenticateToken, (req, res) => {
  try {
    const { pushToken } = req.body;
    const candidateId = req.user.id;

    if (!pushToken || typeof pushToken !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid pushToken is required' });
    }

    db.prepare('UPDATE candidates SET push_token = ? WHERE id = ?').run(pushToken, candidateId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;