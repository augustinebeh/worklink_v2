/**
 * API Services Central Export
 * Single entry point for all API services
 */

// Export the main API client
export { default as apiClient, ApiClient } from './ApiClient.js';

// Export individual services
export { default as authService } from './auth.service.js';
export { default as candidatesService } from './candidates.service.js';
export { default as jobsService } from './jobs.service.js';
export { default as clientsService } from './clients.service.js';
export { default as analyticsService } from './analytics.service.js';

// Named exports for destructuring
export {
  authService as auth,
  candidatesService as candidates,
  jobsService as jobs,
  clientsService as clients,
  analyticsService as analytics
};

/**
 * Convenience object for accessing all services
 * Usage:
 *   import { api } from '@/shared/services/api';
 *   const candidates = await api.candidates.getAll();
 */
export const api = {
  auth: authService,
  candidates: candidatesService,
  jobs: jobsService,
  clients: clientsService,
  analytics: analyticsService,
  client: apiClient // Access to raw client for custom requests
};

/**
 * Type definitions for better IDE support
 * @typedef {typeof authService} AuthService
 * @typedef {typeof candidatesService} CandidatesService
 * @typedef {typeof jobsService} JobsService
 * @typedef {typeof clientsService} ClientsService
 * @typedef {typeof analyticsService} AnalyticsService
 * @typedef {typeof apiClient} ApiClient
 */

export default api;