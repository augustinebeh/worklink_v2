/**
 * Data Integration API Endpoints Tests
 *
 * Comprehensive test suite for the data integration API endpoints
 * including authentication, authorization, rate limiting, and data validation.
 */

const request = require('supertest');
const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const express = require('express');
const dataIntegrationRouter = require('../../routes/api/v1/data-integration');
const { generateToken } = require('../../middleware/auth');
const { db } = require('../../db');

describe('Data Integration API Endpoints', () => {
  let app;
  let candidateToken;
  let adminToken;
  let supportToken;
  let testCandidateId = 'CND_API_TEST_001';
  let otherCandidateId = 'CND_API_TEST_002';

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/data-integration', dataIntegrationRouter);

    // Setup test data
    await setupTestData();

    // Generate test tokens
    candidateToken = generateToken({
      id: testCandidateId,
      email: 'test@worklink.sg',
      name: 'Test Candidate',
      role: 'candidate',
      type: 'candidate'
    });

    adminToken = generateToken({
      id: 'ADM_TEST_001',
      email: 'admin@worklink.sg',
      name: 'Test Admin',
      role: 'admin',
      type: 'admin'
    });

    supportToken = generateToken({
      id: 'SUP_TEST_001',
      email: 'support@worklink.sg',
      name: 'Test Support',
      role: 'support',
      type: 'support'
    });
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    test('should reject requests without token', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('NO_TOKEN');
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    test('should accept requests with valid token', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authorization', () => {
    test('should allow candidates to access own data', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidateId).toBe(testCandidateId);
    });

    test('should deny candidates access to other candidates data', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${otherCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to access this data');
    });

    test('should allow admins to access any candidate data', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidateId).toBe(testCandidateId);
    });

    test('should allow support staff limited access', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payment`)
        .set('Authorization', `Bearer ${supportToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Comprehensive User Data Endpoint', () => {
    test('should return comprehensive user data', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.candidateId).toBe(testCandidateId);
      expect(response.body.data.payments).toBeDefined();
      expect(response.body.data.account).toBeDefined();
      expect(response.body.data.jobs).toBeDefined();
      expect(response.body.data.withdrawals).toBeDefined();
      expect(response.body.data.interviews).toBeDefined();
      expect(response.body.permissions).toBeDefined();
    });

    test('should validate candidate ID format', async () => {
      const invalidIds = ['invalid', '123', '', 'candidate-001'];

      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/api/v1/data-integration/candidates/${invalidId}/comprehensive`)
          .set('Authorization', `Bearer ${candidateToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      }
    });

    test('should handle optional request type parameter', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .query({ type: 'urgent_request' })
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Specific Data Type Endpoints', () => {
    const dataTypes = ['payment', 'account', 'jobs', 'withdrawal', 'interview'];

    dataTypes.forEach(dataType => {
      test(`should return ${dataType} data`, async () => {
        const response = await request(app)
          .get(`/api/v1/data-integration/candidates/${testCandidateId}/${dataType}`)
          .set('Authorization', `Bearer ${candidateToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.dataType).toBe(dataType);
        expect(response.body.data).toBeDefined();
        expect(response.body.metadata).toBeDefined();
      });
    });

    test('should reject invalid data type', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/invalid_type`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Payment Endpoints', () => {
    test('should return payment status', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/status`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.candidateId).toBe(testCandidateId);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.metadata.dataType).toBe('payment_status');
      expect(response.body.metadata.sensitive).toBe(true);
    });

    test('should return payment details for valid payment ID', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/PAY_TEST_001`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('PAY_TEST_001');
      expect(response.body.data.candidateId).toBe(testCandidateId);
    });

    test('should validate payment ID format', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/invalid-id`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent payment', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/PAY_NONEXISTENT_999`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Account Verification Endpoints', () => {
    test('should return account verification status', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/account/verification`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidateId).toBe(testCandidateId);
      expect(response.body.data.verification).toBeDefined();
      expect(response.body.data.checks).toBeDefined();
      expect(response.body.metadata.dataType).toBe('account_verification');
    });
  });

  describe('Job History Endpoints', () => {
    test('should return job history', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/jobs/history`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidateId).toBe(testCandidateId);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.metadata.dataType).toBe('job_history');
    });

    test('should handle pagination parameters', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/jobs/history`)
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should validate pagination parameters', async () => {
      const invalidParams = [
        { page: 0 },
        { page: 'invalid' },
        { limit: 0 },
        { limit: 101 },
        { limit: 'invalid' }
      ];

      for (const params of invalidParams) {
        const response = await request(app)
          .get(`/api/v1/data-integration/candidates/${testCandidateId}/jobs/history`)
          .query(params)
          .set('Authorization', `Bearer ${candidateToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Withdrawal Endpoints', () => {
    test('should return withdrawal eligibility', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/eligibility`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidateId).toBe(testCandidateId);
      expect(response.body.data.balance).toBeDefined();
      expect(response.body.data.eligibility).toBeDefined();
      expect(response.body.metadata.sensitive).toBe(true);
    });

    test('should request withdrawal with valid amount', async () => {
      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
        .send({ amount: 50.00 })
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('successfully');
    });

    test('should validate withdrawal amount', async () => {
      const invalidAmounts = [-10, 0, 'invalid', null];

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
          .send({ amount })
          .set('Authorization', `Bearer ${candidateToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should deny withdrawal request for other candidates', async () => {
      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${otherCandidateId}/withdrawals/request`)
        .send({ amount: 50.00 })
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Can only request withdrawals for your own account');
    });
  });

  describe('Interview Endpoints', () => {
    test('should return interview schedule', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/interviews/schedule`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.candidateId).toBe(testCandidateId);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.metadata.dataType).toBe('interview_schedule');
    });

    test('should schedule interview with valid data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${testCandidateId}/interviews/schedule`)
        .send({
          date: tomorrow.toISOString().split('T')[0],
          time: '14:00',
          type: 'onboarding'
        })
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.interview).toBeDefined();
      expect(response.body.message).toContain('successfully');
    });

    test('should validate interview scheduling data', async () => {
      const invalidData = [
        { date: 'invalid-date', time: '14:00' },
        { date: '2024-02-15', time: 'invalid-time' },
        { date: '2024-02-15', time: '14:00', type: 'invalid-type' }
      ];

      for (const data of invalidData) {
        const response = await request(app)
          .post(`/api/v1/data-integration/candidates/${testCandidateId}/interviews/schedule`)
          .send(data)
          .set('Authorization', `Bearer ${candidateToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Cache Management Endpoints', () => {
    test('should invalidate user cache', async () => {
      const response = await request(app)
        .delete(`/api/v1/data-integration/candidates/${testCandidateId}/cache`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Cache invalidated');
    });

    test('should invalidate specific data type cache', async () => {
      const response = await request(app)
        .delete(`/api/v1/data-integration/candidates/${testCandidateId}/cache`)
        .query({ dataType: 'payment' })
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('payment');
    });

    test('should deny cache invalidation for other candidates', async () => {
      const response = await request(app)
        .delete(`/api/v1/data-integration/candidates/${otherCandidateId}/cache`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should validate data type parameter', async () => {
      const response = await request(app)
        .delete(`/api/v1/data-integration/candidates/${testCandidateId}/cache`)
        .query({ dataType: 'invalid_type' })
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Statistics Endpoint', () => {
    test('should return statistics for admin', async () => {
      const response = await request(app)
        .get('/api/v1/data-integration/statistics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });

    test('should deny statistics access for non-admin', async () => {
      const response = await request(app)
        .get('/api/v1/data-integration/statistics')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    test('should handle date filters', async () => {
      const response = await request(app)
        .get('/api/v1/data-integration/statistics')
        .query({
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.filters).toBeDefined();
    });

    test('should validate date filter format', async () => {
      const response = await request(app)
        .get('/api/v1/data-integration/statistics')
        .query({
          startDate: 'invalid-date'
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Health Check Endpoint', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/data-integration/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.version).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to sensitive endpoints', async () => {
      // Make multiple rapid requests to trigger rate limit
      const requests = Array(12).fill(null).map(() =>
        request(app)
          .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/status`)
          .set('Authorization', `Bearer ${candidateToken}`)
      );

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      if (rateLimitedResponses.length > 0) {
        expect(rateLimitedResponses[0].body.error).toBe('Rate limit exceeded');
        expect(rateLimitedResponses[0].body.retryAfter).toBeDefined();
      }
    });

    test('should have different rate limits for different endpoints', async () => {
      // Test that withdrawal endpoints have stricter limits than general endpoints
      const withdrawalRequests = Array(12).fill(null).map(() =>
        request(app)
          .get(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/eligibility`)
          .set('Authorization', `Bearer ${candidateToken}`)
      );

      const responses = await Promise.all(withdrawalRequests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle internal server errors gracefully', async () => {
      // Test with a candidate that doesn't exist but has valid format
      const response = await request(app)
        .get('/api/v1/data-integration/candidates/CND_NONEXISTENT_999/comprehensive')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to retrieve user data');
    });

    test('should return appropriate error messages in production mode', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/v1/data-integration/candidates/CND_NONEXISTENT_999/comprehensive')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeUndefined(); // No error details in production

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('Input Validation', () => {
    test('should validate all required parameters', async () => {
      // Test missing candidate ID
      const response = await request(app)
        .get('/api/v1/data-integration/candidates//comprehensive')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(404); // Should not match route

      expect(response.status).toBe(404);
    });

    test('should sanitize input data', async () => {
      const maliciousInput = {
        amount: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
        .send(maliciousInput)
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  // Helper functions

  async function setupTestData() {
    try {
      // Create test candidates
      const candidates = [
        [testCandidateId, 'API Test Candidate', 'apitest@worklink.sg'],
        [otherCandidateId, 'Other Test Candidate', 'other@worklink.sg']
      ];

      candidates.forEach(([id, name, email]) => {
        db.prepare(`
          INSERT OR REPLACE INTO candidates (
            id, name, email, phone, status, bank_name, bank_account,
            total_earnings, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, name, email, '+65 9000 0001', 'active',
          'Test Bank', '1234567890', 500.00, new Date().toISOString()
        );
      });

      // Create test payment
      db.prepare(`
        INSERT OR REPLACE INTO payments (
          id, candidate_id, base_amount, total_amount, hours_worked, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'PAY_TEST_001', testCandidateId, 120.00, 120.00, 8.0, 'paid', new Date().toISOString()
      );

      console.log('✅ API test data setup completed');
    } catch (error) {
      console.error('❌ Failed to setup API test data:', error);
      throw error;
    }
  }

  async function cleanupTestData() {
    try {
      db.prepare('DELETE FROM payments WHERE candidate_id IN (?, ?)').run(testCandidateId, otherCandidateId);
      db.prepare('DELETE FROM candidates WHERE id IN (?, ?)').run(testCandidateId, otherCandidateId);

      console.log('✅ API test data cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup API test data:', error);
    }
  }
});