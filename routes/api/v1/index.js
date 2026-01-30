/**
 * TalentVis API v1 Routes
 * Aggregates all route modules
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const candidateRoutes = require('./candidates');
const jobRoutes = require('./jobs');
const deploymentRoutes = require('./deployments');
const paymentRoutes = require('./payments');
const clientRoutes = require('./clients');
const tenderRoutes = require('./tenders');
const trainingRoutes = require('./training');
const gamificationRoutes = require('./gamification');
const chatRoutes = require('./chat');
const analyticsRoutes = require('./analytics');
const adminRoutes = require('./admin');
const aiAutomationRoutes = require('./ai-automation');

// Mount routes
router.use('/auth', authRoutes);
router.use('/candidates', candidateRoutes);
router.use('/jobs', jobRoutes);
router.use('/deployments', deploymentRoutes);
router.use('/payments', paymentRoutes);
router.use('/clients', clientRoutes);
router.use('/tenders', tenderRoutes);
router.use('/training', trainingRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/chat', chatRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiAutomationRoutes);

module.exports = router;
