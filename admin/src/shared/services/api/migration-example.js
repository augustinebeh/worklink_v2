/**
 * API Migration Example
 * Demonstrates how to migrate from direct fetch calls to centralized API services
 */

// === BEFORE (Dashboard.jsx - Old approach) ===
/*
const fetchData = async () => {
  try {
    const [analyticsRes, financialRes] = await Promise.all([
      fetch('/api/v1/analytics/dashboard'),
      fetch('/api/v1/analytics/financial/dashboard'),
    ]);

    const analyticsData = await analyticsRes.json();
    const finData = await financialRes.json();

    if (analyticsData.success) setData(analyticsData.data);
    if (finData.success) setFinancialData(finData.data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Manual error handling for each API call
  }
};
*/

// === AFTER (Dashboard.jsx - New approach) ===

import { api } from '../services/api';

const fetchData = async () => {
  try {
    const [analyticsData, finData] = await Promise.all([
      api.analytics.getDashboard(),
      api.analytics.getFinancialDashboard(),
    ]);

    // API services automatically handle response parsing and error checking
    setData(analyticsData.data);
    setFinancialData(finData.data);
  } catch (error) {
    // Centralized error handling with user-friendly messages
    console.error('Error fetching dashboard data:', error.message);

    // Error objects now have structured information
    if (error.status === 401) {
      // Redirect to login - already handled by API client
      return;
    }

    // Show user-friendly error message
    setError(error.message || 'Failed to load dashboard data');
  }
};

// === More Examples ===

// BEFORE: Candidates page fetch
/*
const loadCandidates = async () => {
  try {
    const response = await fetch('/api/v1/candidates?page=1&limit=20&status=active');
    if (!response.ok) {
      throw new Error('Failed to fetch candidates');
    }
    const data = await response.json();
    setCandidates(data.candidates);
  } catch (error) {
    console.error('Error loading candidates:', error);
  }
};
*/

// AFTER: Using candidates service
const loadCandidates = async () => {
  try {
    const data = await api.candidates.getAll({
      page: 1,
      limit: 20,
      status: 'active'
    });
    setCandidates(data.candidates);
  } catch (error) {
    setError(error.message);
  }
};

// BEFORE: Creating a new job
/*
const createJob = async (jobData) => {
  try {
    const response = await fetch('/api/v1/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionStorage.getItem('admin_token')}`,
      },
      body: JSON.stringify(jobData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create job');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
};
*/

// AFTER: Using jobs service
const createJob = async (jobData) => {
  try {
    const result = await api.jobs.create(jobData);
    return result;
  } catch (error) {
    // Error handling is automatic, authentication is handled by interceptors
    throw error;
  }
};

// BEFORE: File upload with manual FormData handling
/*
const uploadCandidateDocuments = async (candidateId, files) => {
  try {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));

    const response = await fetch(`/api/v1/candidates/${candidateId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('admin_token')}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error('Upload failed');
    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
*/

// AFTER: Using candidates service
const uploadCandidateDocuments = async (candidateId, files) => {
  try {
    const formData = new FormData();
    files.forEach(file => formData.append('documents', file));

    const result = await api.candidates.uploadDocuments(candidateId, formData);
    return result;
  } catch (error) {
    // All error handling is centralized
    throw error;
  }
};

// === Benefits Achieved ===

/*
1. **Centralized Configuration**: Base URLs, timeouts, retry logic all in one place
2. **Automatic Authentication**: Tokens automatically attached to all requests
3. **Consistent Error Handling**: All 401 errors automatically handled
4. **Better Developer Experience**: TypeScript-like intellisense for API methods
5. **Request/Response Logging**: Automatic logging in development
6. **Retry Logic**: Automatic retries for network errors
7. **Type Safety**: Better parameter validation and response structure
8. **Easier Testing**: Mock services instead of individual fetch calls
9. **Reduced Boilerplate**: No more manual JSON parsing and error checking
10. **Future-Proof**: Easy to add new interceptors, caching, etc.

MIGRATION CHECKLIST:
☐ Replace raw fetch() calls with api.service.method()
☐ Remove manual JSON parsing (.json() calls)
☐ Remove manual Authorization headers
☐ Update error handling to use error.message
☐ Remove manual Content-Type headers for JSON
☐ Update file uploads to use service methods
☐ Test authentication flows
☐ Verify error handling works correctly
*/

export {
  fetchData,
  loadCandidates,
  createJob,
  uploadCandidateDocuments
};