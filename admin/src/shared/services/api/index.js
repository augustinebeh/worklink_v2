/**
 * API Services Central Export
 * Single entry point for all API services
 */

// Export the main API client
export { default as apiClient, ApiClient } from './ApiClient.js';

// Import API client and services
import apiClient from './ApiClient.js';
import authService from './auth.service.js';
import candidatesService from './candidates.service.js';
import jobsService from './jobs.service.js';
import clientsService from './clients.service.js';
import analyticsService from './analytics.service.js';
import chatService from './chat.service.js';
import paymentsService from './payments.service.js';
import deploymentsService from './deployments.service.js';
import gamificationService from './gamification.service.js';
import trainingService from './training.service.js';
import tenderService from './tender.service.js';
import escalationService from './escalation.service.js';
import notificationService from './notification.service.js';
import renewalService from './renewal.service.js';
import alertService from './alert.service.js';
import lifecycleService from './lifecycle.service.js';

// Export individual services
export { authService };
export { candidatesService };
export { jobsService };
export { clientsService };
export { analyticsService };
export { chatService };
export { paymentsService };
export { deploymentsService };
export { gamificationService };
export { trainingService };
export { tenderService };
export { escalationService };
export { notificationService };
export { renewalService };
export { alertService };
export { lifecycleService };

// Named exports for destructuring
export {
  authService as auth,
  candidatesService as candidates,
  jobsService as jobs,
  clientsService as clients,
  analyticsService as analytics,
  chatService as chat,
  paymentsService as payments,
  deploymentsService as deployments,
  gamificationService as gamification,
  trainingService as training,
  tenderService as tender,
  escalationService as escalation,
  notificationService as notification,
  renewalService as renewal,
  alertService as alert,
  lifecycleService as lifecycle
};

/**
 * Convenience object for accessing all services
 * Usage:
 *   import { api } from '@/shared/services/api';
 *   const candidates = await api.candidates.getAll();
 */
export const api = {
  // Core services
  auth: authService,
  candidates: candidatesService,
  jobs: jobsService,
  clients: clientsService,
  deployments: deploymentsService,
  payments: paymentsService,
  
  // Communication & Support
  chat: chatService,
  escalation: escalationService,
  notification: notificationService,
  
  // Gamification & Training
  gamification: gamificationService,
  training: trainingService,
  
  // Business Development & BPO
  tender: tenderService,
  renewal: renewalService,
  lifecycle: lifecycleService,
  alert: alertService,
  
  // Analytics
  analytics: analyticsService,
  
  // Raw client for custom requests
  client: apiClient
};

/**
 * Type definitions for better IDE support
 * @typedef {typeof authService} AuthService
 * @typedef {typeof candidatesService} CandidatesService
 * @typedef {typeof jobsService} JobsService
 * @typedef {typeof clientsService} ClientsService
 * @typedef {typeof analyticsService} AnalyticsService
 * @typedef {typeof chatService} ChatService
 * @typedef {typeof paymentsService} PaymentsService
 * @typedef {typeof deploymentsService} DeploymentsService
 * @typedef {typeof gamificationService} GamificationService
 * @typedef {typeof trainingService} TrainingService
 * @typedef {typeof tenderService} TenderService
 * @typedef {typeof escalationService} EscalationService
 * @typedef {typeof notificationService} NotificationService
 * @typedef {typeof renewalService} RenewalService
 * @typedef {typeof alertService} AlertService
 * @typedef {typeof lifecycleService} LifecycleService
 * @typedef {typeof apiClient} ApiClient
 */

export default api;
