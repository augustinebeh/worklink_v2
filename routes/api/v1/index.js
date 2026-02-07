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
const bpoLifecycleRoutes = require('./bpo/lifecycle');
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
router.use('/bpo/lifecycle', bpoLifecycleRoutes);
router.use('/scraping', scrapingRoutes);

// Consolidated BPO Routes (Feb 2026 Reorganization)
router.use('/pipeline', pipelineRoutes);
router.use('/scanner', scannerRoutes);
router.use('/intelligence', intelligenceRoutes);

// Scraping Services
router.use('/scraping/gebiz-rss', gebizRssRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'WorkLink API',
    version: '2.0.1',
    status: 'operational',
    endpoints: {
      // Core Operations
      auth: { path: '/api/v1/auth', status: 'active' },
      candidates: { path: '/api/v1/candidates', status: 'active' },
      jobs: { path: '/api/v1/jobs', status: 'active' },
      deployments: { path: '/api/v1/deployments', status: 'active' },
      payments: { path: '/api/v1/payments', status: 'active' },
      clients: { path: '/api/v1/clients', status: 'active' },
      tenders: { path: '/api/v1/tenders', status: 'active' },
      bpo: { path: '/api/v1/bpo', status: 'active' },
      training: { path: '/api/v1/training', status: 'active' },
      gamification: { path: '/api/v1/gamification', status: 'active' },
      chat: { path: '/api/v1/chat', status: 'active' },
      analytics: { path: '/api/v1/analytics', status: 'active' },
      admin: { path: '/api/v1/admin', status: 'active' },
      ai: { path: '/api/v1/ai', status: 'active' },
      
      // New features
      referrals: { path: '/api/v1/referrals', status: 'active' },
      availability: { path: '/api/v1/availability', status: 'active' },
      notifications: { path: '/api/v1/notifications', status: 'active' },
      tenderMonitor: { path: '/api/v1/tender-monitor', status: 'active' },
      emailPreferences: { path: '/api/v1/email-preferences', status: 'active' },
      
      // Messaging
      messaging: { path: '/api/v1/messaging', status: 'active' },
      webhooks: {
        telegram: { path: '/api/v1/webhooks/telegram', status: 'active' },
      },
      
      // AI & ML
      aiChat: { path: '/api/v1/ai-chat', status: 'active' },
      slmChat: { path: '/api/v1/slm-chat', status: 'active' },
      ml: { path: '/api/v1/ml', status: 'active' },
      adMl: { path: '/api/v1/ad-ml', status: 'active' },
      telegramGroups: { path: '/api/v1/telegram-groups', status: 'active' },
      llmConfig: { path: '/api/v1/llm-config', status: 'active' },
      
      // Background Jobs - NOW ACTIVE ✅
      jobScheduler: { path: '/api/v1/job-scheduler', status: 'active' },
      
      // 100x Performance System - NOW ACTIVE ✅
      consultantPerformance: { path: '/api/v1/consultant-performance', status: 'active' },
      
      // Fact-Based Template Responses - NOW ACTIVE ✅
      templateResponses: { path: '/api/v1/template-responses', status: 'active' },
      
      // Admin Escalation System
      adminEscalation: { path: '/api/v1/admin-escalation', status: 'active' },
      escalationAnalytics: { path: '/api/v1/escalation-analytics', status: 'active' },
      
      // Smart Response Router System
      smartResponseRouter: { path: '/api/v1/smart-response-router', status: 'active' },
      
      // Interview Scheduling System
      interviewScheduling: { path: '/api/v1/interview-scheduling', status: 'active' },
      
      // SLM Conversion Funnel Enhancement System
      conversationEnhancement: { path: '/api/v1/conversation-enhancement', status: 'active' },
      
      // Worker Status Classification System
      workerStatus: { path: '/api/v1/worker-status', status: 'active' },
      
      // GeBIZ Intelligence System
      gebizIntelligence: { path: '/api/v1/gebiz', status: 'active' },
      
      // 10-Agent BPO Intelligence System (NEW - Feb 2026)
      gebizRenewals: { path: '/api/v1/gebiz/renewals', status: 'active', description: 'Contract renewal predictions & engagement tracking' },
      alerts: { path: '/api/v1/alerts', status: 'active', description: 'Multi-channel alert system (email, SMS, Slack, in-app)' },
      bpoLifecycle: { path: '/api/v1/bpo/lifecycle', status: 'active', description: '7-stage tender pipeline management' },
      scraping: { path: '/api/v1/scraping', status: 'active', description: 'RSS scraping control and monitoring' },

      // Consolidated BPO Routes (Feb 2026 Reorganization)
      pipeline: { path: '/api/v1/pipeline', status: 'active', description: 'Unified tender pipeline management' },
      scanner: { path: '/api/v1/scanner', status: 'active', description: 'Live feed scanner, alerts & scraper controls' },
      intelligence: { path: '/api/v1/intelligence', status: 'active', description: 'Historical data, competitors & renewals' },
    },
    notes: {
      emailConfig: 'Disabled - not required for core functionality',
      recentlyEnabled: ['jobScheduler', 'consultantPerformance', 'templateResponses']
    }
  });
});

module.exports = router;
