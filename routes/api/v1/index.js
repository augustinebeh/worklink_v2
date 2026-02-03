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
const bpoRoutes = require('./bpo');
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
const emailPreferencesRoutes = require('./email-preferences');
// const emailConfigRoutes = require('./email-config'); // Disabled to prevent hanging

// Messaging & Webhooks
const telegramWebhookRoutes = require('./webhooks/telegram');
const messagingRoutes = require('./messaging');

// AI & ML Routes
const aiChatRoutes = require('./ai-chat');
const slmChatRoutes = require('./slm-chat');
const mlRoutes = require('./ml');
const adMlRoutes = require('./ad-ml');
const telegramGroupsRoutes = require('./telegram-groups');
const llmConfigRoutes = require('./llm-config');

// Enhanced Chat Features
const conversationsRoutes = require('./conversations');
const chatAttachmentsRoutes = require('./chat-attachments');
const quickRepliesRoutes = require('./quick-replies');

// Background Job Scheduler
// const jobSchedulerRoutes = require('./job-scheduler'); // Temporarily disabled

// 100x Consultant Performance System
const consultantPerformanceRoutes = require('./consultant-performance');

// Fact-Based Template Response System
// const templateResponseRoutes = require('./template-responses'); // Temporarily disabled

// Admin Escalation and Handoff System
const adminEscalationRoutes = require('./admin-escalation');
const escalationAnalyticsRoutes = require('./escalation-analytics');

// Smart Response Router System
// const smartResponseRouterRoutes = require('./smart-response-router'); // Temporarily disabled

// Interview Scheduling System
const interviewSchedulingRoutes = require('./interview-scheduling');

// SLM Conversion Funnel Enhancement System
const conversationEnhancementRoutes = require('./conversation-enhancement');

// Worker Status Classification System
const workerStatusRoutes = require('./worker-status');

// Mount routes
router.use('/auth', authRoutes);
router.use('/candidates', candidateRoutes);
router.use('/jobs', jobRoutes);
router.use('/deployments', deploymentRoutes);
router.use('/payments', paymentRoutes);
router.use('/clients', clientRoutes);
router.use('/tenders', tenderRoutes);
router.use('/bpo', bpoRoutes);
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
router.use('/email-preferences', emailPreferencesRoutes);
// router.use('/email-config', emailConfigRoutes); // Disabled to prevent hanging

// Messaging & Webhooks
router.use('/webhooks/telegram', telegramWebhookRoutes);
router.use('/messaging', messagingRoutes);

// AI & ML Routes
router.use('/ai-chat', aiChatRoutes);
router.use('/slm-chat', slmChatRoutes);
router.use('/ml', mlRoutes);
router.use('/ad-ml', adMlRoutes);
router.use('/telegram-groups', telegramGroupsRoutes);
router.use('/llm-config', llmConfigRoutes);

// Enhanced Chat Features
router.use('/conversations', conversationsRoutes);
router.use('/chat/attachments', chatAttachmentsRoutes);
router.use('/quick-replies', quickRepliesRoutes);

// Background Job Scheduler
// router.use('/job-scheduler', jobSchedulerRoutes); // Temporarily disabled

// 100x Consultant Performance System
router.use('/consultant-performance', consultantPerformanceRoutes);

// Fact-Based Template Response System
// router.use('/template-responses', templateResponseRoutes); // Temporarily disabled

// Admin Escalation and Handoff System
router.use('/admin-escalation', adminEscalationRoutes);
router.use('/escalation-analytics', escalationAnalyticsRoutes);

// Smart Response Router System
// router.use('/smart-response-router', smartResponseRouterRoutes); // Temporarily disabled

// Interview Scheduling System
router.use('/interview-scheduling', interviewSchedulingRoutes);

// SLM Conversion Funnel Enhancement System
router.use('/conversation-enhancement', conversationEnhancementRoutes);

// Worker Status Classification System
router.use('/worker-status', workerStatusRoutes);

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
      bpo: '/api/v1/bpo',
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
      emailPreferences: '/api/v1/email-preferences',
      // emailConfig: '/api/v1/email-config', // Disabled
      // Messaging
      messaging: '/api/v1/messaging',
      webhooks: {
        telegram: '/api/v1/webhooks/telegram',
      },
      // AI & ML
      aiChat: '/api/v1/ai-chat',
      slmChat: '/api/v1/slm-chat',
      ml: '/api/v1/ml',
      adMl: '/api/v1/ad-ml',
      telegramGroups: '/api/v1/telegram-groups',
      llmConfig: '/api/v1/llm-config',
      // Background Jobs
      jobScheduler: '/api/v1/job-scheduler',
      // 100x Performance System
      consultantPerformance: '/api/v1/consultant-performance',
      // Fact-Based Template Responses
      templateResponses: '/api/v1/template-responses',
      // Admin Escalation System
      adminEscalation: '/api/v1/admin-escalation',
      escalationAnalytics: '/api/v1/escalation-analytics',
      // Smart Response Router System
      smartResponseRouter: '/api/v1/smart-response-router',
      // Interview Scheduling System
      interviewScheduling: '/api/v1/interview-scheduling',
      // SLM Conversion Funnel Enhancement System
      conversationEnhancement: '/api/v1/conversation-enhancement',
      // Worker Status Classification System
      workerStatus: '/api/v1/worker-status',
    },
  });
});

module.exports = router;
