/**
 * BPO Routes Index
 * Mounts all BPO-related routes
 */

const express = require('express');
const router = express.Router();

// Import BPO route modules
const lifecycleRoutes = require('./lifecycle');

// Mount BPO routes
router.use('/lifecycle', lifecycleRoutes);

module.exports = router;