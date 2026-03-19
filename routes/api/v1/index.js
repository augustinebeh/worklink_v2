/**
 * WorkLink API v1 Routes
 * Aggregates all route modules
 * 
 * UPDATED: Re-enabled previously disabled routes
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
const bpoRoutes = require('./bpo'); // Now resolves to bpo/index.js (modular)
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
// Note: email-config disabled - not critical for core functionality
// const emailConfigRoutes = require('./email-config');

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

// Scraping Services
const gebizRssRoutes = require('./scraping/gebiz-rss');
const quickRepliesRoutes = require('./quick-replies');

// Background Job Scheduler - RE-ENABLED
const jobSchedulerRoutes = require('./job-scheduler');

// 100x Consultant Performance System - RE-ENABLED
const consultantPerformanceRoutes = require('./consultant-performance');

// Fact-Based Template Response System - RE-ENABLED
const templateResponseRoutes = require('./template-responses');

// Admin Escalation and Handoff System
const adminEscalationRoutes = require('./admin-escalation');
const escalationAnalyticsRoutes = require('./escalation-analytics');

// Smart Response Router System
const smartResponseRouterRoutes = require('./smart-response-router');

// Interview Scheduling System
const interviewSchedulingRoutes = require('./interview-scheduling');

// SLM Conversion Funnel Enhancement System
const conversationEnhancementRoutes = require('./conversation-enhancement');

// Worker Status Classification System
const workerStatusRoutes = require('./worker-status');

// GeBIZ Intelligence System
const gebizIntelligenceRoutes = require('./gebiz-intelligence');

// 10-Agent BPO Intelligence System (NEW - Feb 2026)
const gebizRenewalsRoutes = require('./gebiz/renewals');
const alertsRoutes = require('./alerts');
const scrapingRoutes = require('./scraping');

// Consolidated BPO Routes (Feb 2026 Reorganization)
const pipelineRoutes = require('./pipeline');
const scannerRoutes = require('./scanner');
const intelligenceRoutes = require('./intelligence');

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
// router.use('/email-config', emailConfigRoutes); // Disabled - not needed

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

// Background Job Scheduler - RE-ENABLED ✅
router.use('/job-scheduler', jobSchedulerRoutes);

// 100x Consultant Performance System - RE-ENABLED ✅
router.use('/consultant-performance', consultantPerformanceRoutes);

// Fact-Based Template Response System - RE-ENABLED ✅
router.use('/template-responses', templateResponseRoutes);

// Admin Escalation and Handoff System
router.use('/admin-escalation', adminEscalationRoutes);
router.use('/escalation-analytics', escalationAnalyticsRoutes);

// Smart Response Router System
router.use('/smart-response-router', smartResponseRouterRoutes);

// Interview Scheduling System
router.use('/interview-scheduling', interviewSchedulingRoutes);

// SLM Conversion Funnel Enhancement System
router.use('/conversation-enhancement', conversationEnhancementRoutes);

// Worker Status Classification System
router.use('/worker-status', workerStatusRoutes);

// GeBIZ Intelligence System
router.use('/gebiz', gebizIntelligenceRoutes);

// 10-Agent BPO Intelligence System (NEW - Feb 2026)
router.use('/gebiz/renewals', gebizRenewalsRoutes);
router.use('/alerts', alertsRoutes);
router.use('/scraping', scrapingRoutes);

// Consolidated BPO Routes (Feb 2026 Reorganization)
router.use('/pipeline', pipelineRoutes);
router.use('/scanner', scannerRoutes);
router.use('/intelligence', intelligenceRoutes);

// Scraping Services
router.use('/scraping/gebiz-rss', gebizRssRoutes);

// API info endpoint - minimal info only (no endpoint enumeration)
router.get('/', (req, res) => {
  res.json({
    name: 'WorkLink API',
    version: '2.0.1',
    status: 'operational'
  });
});

module.exports = router;
