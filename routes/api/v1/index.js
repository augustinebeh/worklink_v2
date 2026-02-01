/**
 * WorkLink API v1 Routes
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

// New feature routes
const referralRoutes = require('./referrals');
const availabilityRoutes = require('./availability');
const notificationRoutes = require('./notifications');
const tenderMonitorRoutes = require('./tender-monitor');

// Messaging & Webhooks
const telegramWebhookRoutes = require('./webhooks/telegram');
const messagingRoutes = require('./messaging');

// AI & ML Routes
const aiChatRoutes = require('./ai-chat');
const mlRoutes = require('./ml');
const adMlRoutes = require('./ad-ml');
const telegramGroupsRoutes = require('./telegram-groups');

// Enhanced Chat Features
const conversationsRoutes = require('./conversations');
const chatAttachmentsRoutes = require('./chat-attachments');
const quickRepliesRoutes = require('./quick-replies');

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

// New feature routes
router.use('/referrals', referralRoutes);
router.use('/availability', availabilityRoutes);
router.use('/notifications', notificationRoutes);
router.use('/tender-monitor', tenderMonitorRoutes);

// Messaging & Webhooks
router.use('/webhooks/telegram', telegramWebhookRoutes);
router.use('/messaging', messagingRoutes);

// AI & ML Routes
router.use('/ai-chat', aiChatRoutes);
router.use('/ml', mlRoutes);
router.use('/ad-ml', adMlRoutes);
router.use('/telegram-groups', telegramGroupsRoutes);

// Enhanced Chat Features
router.use('/conversations', conversationsRoutes);
router.use('/chat/attachments', chatAttachmentsRoutes);
router.use('/quick-replies', quickRepliesRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'WorkLink API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      candidates: '/api/v1/candidates',
      jobs: '/api/v1/jobs',
      deployments: '/api/v1/deployments',
      payments: '/api/v1/payments',
      clients: '/api/v1/clients',
      tenders: '/api/v1/tenders',
      training: '/api/v1/training',
      gamification: '/api/v1/gamification',
      chat: '/api/v1/chat',
      analytics: '/api/v1/analytics',
      admin: '/api/v1/admin',
      ai: '/api/v1/ai',
      // New features
      referrals: '/api/v1/referrals',
      availability: '/api/v1/availability',
      notifications: '/api/v1/notifications',
      tenderMonitor: '/api/v1/tender-monitor',
      // Messaging
      messaging: '/api/v1/messaging',
      webhooks: {
        telegram: '/api/v1/webhooks/telegram',
      },
      // AI & ML
      aiChat: '/api/v1/ai-chat',
      ml: '/api/v1/ml',
      adMl: '/api/v1/ad-ml',
      telegramGroups: '/api/v1/telegram-groups',
    },
  });
});

module.exports = router;
