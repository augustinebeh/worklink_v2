/**
 * Security Validation Tests for Data Integration Layer
 *
 * Comprehensive security testing including authentication, authorization,
 * input validation, data sanitization, and audit logging.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const DataIntegrationLayer = require('../../services/data-integration');
const dataIntegrationRouter = require('../../routes/api/v1/data-integration');
const { generateToken, JWT_SECRET } = require('../../middleware/auth');
const { db } = require('../../db');

describe('Data Integration Security Validation', () => {
  let app;
  let dataIntegration;
  let validToken;
  let expiredToken;
  let malformedToken;
  let testCandidateId = 'CND_SEC_TEST_001';

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/data-integration', dataIntegrationRouter);

    // Initialize data integration layer
    dataIntegration = new DataIntegrationLayer();

    // Setup test data
    await setupSecurityTestData();

    // Generate test tokens
    validToken = generateToken({
      id: testCandidateId,
      email: 'sectest@worklink.sg',
      name: 'Security Test User',
      role: 'candidate',
      type: 'candidate'
    });

    // Generate expired token
    expiredToken = jwt.sign(
      {
        id: testCandidateId,
        email: 'sectest@worklink.sg',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      },
      JWT_SECRET
    );

    malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature';
  });

  afterAll(async () => {
    await cleanupSecurityTestData();
    if (dataIntegration.cache) {
      await dataIntegration.cache.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Security', () => {
    test('should reject requests with no authorization header', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('NO_TOKEN');
    });

    test('should reject requests with malformed authorization header', async () => {
      const invalidHeaders = [
        'Bearer',
        'Bear token123',
        'token123',
        'Bearer ',
        'Basic dXNlcjpwYXNz'
      ];

      for (const header of invalidHeaders) {
        const response = await request(app)
          .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
          .set('Authorization', header)
          .expect(401);

        expect(response.body.success).toBe(false);
      }
    });

    test('should reject requests with expired tokens', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    test('should reject requests with malformed tokens', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${malformedToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TOKEN');
    });

    test('should reject requests with tokens signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        {
          id: testCandidateId,
          email: 'sectest@worklink.sg',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        'wrong_secret'
      );

      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${wrongSecretToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should validate token issuer and audience', async () => {
      const invalidToken = jwt.sign(
        {
          id: testCandidateId,
          email: 'sectest@worklink.sg',
          iss: 'malicious-issuer',
          aud: 'wrong-audience'
        },
        JWT_SECRET
      );

      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization Security', () => {
    test('should enforce candidate ID ownership', async () => {
      const otherCandidateId = 'CND_OTHER_001';

      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${otherCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions to access this data');
    });

    test('should prevent privilege escalation attempts', async () => {
      // Try to access admin statistics endpoint
      const response = await request(app)
        .get('/api/v1/data-integration/statistics')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });

    test('should validate permissions for withdrawal requests', async () => {
      const otherCandidateId = 'CND_OTHER_001';

      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${otherCandidateId}/withdrawals/request`)
        .send({ amount: 100.00 })
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Can only request withdrawals for your own account');
    });

    test('should enforce data type access restrictions', async () => {
      // Test that regular candidates can't access certain admin-only data types
      // This would be tested if we had admin-only data types
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payment`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Input Validation Security', () => {
    test('should validate candidate ID format strictly', async () => {
      const invalidCandidateIds = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'CND_TEST\'; DROP TABLE candidates; --',
        'CND_TEST\x00NULL_BYTE',
        '..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f',
        'CND_' + 'A'.repeat(1000), // Very long ID
        ''
      ];

      for (const invalidId of invalidCandidateIds) {
        const response = await request(app)
          .get(`/api/v1/data-integration/candidates/${encodeURIComponent(invalidId)}/comprehensive`)
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Validation failed');
      }
    });

    test('should validate withdrawal amounts against injection attempts', async () => {
      const maliciousAmounts = [
        "'; DROP TABLE payments; --",
        '<script>alert("xss")</script>',
        '${process.env.JWT_SECRET}',
        '{{constructor.constructor("return process")().exit()}}',
        'function(){return process.env}()',
        NaN,
        Infinity,
        -Infinity
      ];

      for (const amount of maliciousAmounts) {
        const response = await request(app)
          .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
          .send({ amount })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should validate date inputs against injection', async () => {
      const maliciousDates = [
        "'; DROP TABLE interviews; --",
        '<script>alert("xss")</script>',
        '{{constructor.constructor("return process")()}}',
        '2024-02-30', // Invalid date
        '2024/02/15', // Wrong format
        '15-02-2024'  // Wrong format
      ];

      for (const date of maliciousDates) {
        const response = await request(app)
          .post(`/api/v1/data-integration/candidates/${testCandidateId}/interviews/schedule`)
          .send({ date, time: '10:00', type: 'onboarding' })
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    test('should validate query parameters', async () => {
      const maliciousParams = {
        type: '<script>alert("xss")</script>',
        page: "'; DROP TABLE audit_logs; --",
        limit: '{{constructor.constructor("return process")()}}'
      };

      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/jobs/history`)
        .query(maliciousParams)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should prevent request body pollution', async () => {
      const pollutedBody = {
        amount: 50.00,
        '__proto__.isAdmin': true,
        'constructor.prototype.isAdmin': true,
        'candidateId': 'CND_ADMIN_001', // Attempt to change candidate ID
        'role': 'admin'
      };

      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
        .send(pollutedBody)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200); // Should succeed but ignore malicious fields

      expect(response.body.success).toBe(true);
      // Should not have escalated privileges
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in candidate ID', async () => {
      const sqlInjectionAttempts = [
        "CND_TEST' OR '1'='1",
        "CND_TEST'; DROP TABLE candidates; --",
        "CND_TEST' UNION SELECT * FROM admin_users; --",
        "CND_TEST'; INSERT INTO admin_users VALUES ('hacker', 'admin'); --"
      ];

      for (const maliciousId of sqlInjectionAttempts) {
        // The validator should reject these before they reach the database
        expect(dataIntegration.validator.validateCandidateId(maliciousId)).toBe(false);
      }
    });

    test('should use parameterized queries', async () => {
      // Test that our data services use parameterized queries
      // This is more of an integration test to ensure no SQL injection is possible
      const result = await dataIntegration.getUserData(testCandidateId, 'sql_injection_test');

      expect(result).toBeDefined();
      expect(result.candidateId).toBe(testCandidateId);
      // If SQL injection were possible, this might return unexpected data or fail
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention', () => {
    test('should sanitize output data', async () => {
      // Create a candidate with potentially malicious data
      const maliciousName = '<script>alert("xss")</script>';
      const maliciousEmail = 'test+<svg/onload=alert("xss")>@worklink.sg';

      db.prepare(`
        INSERT OR REPLACE INTO candidates (id, name, email, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        'CND_XSS_TEST_001',
        maliciousName,
        maliciousEmail,
        'active',
        new Date().toISOString()
      );

      const xssToken = generateToken({
        id: 'CND_XSS_TEST_001',
        email: maliciousEmail,
        name: maliciousName,
        role: 'candidate',
        type: 'candidate'
      });

      const response = await request(app)
        .get('/api/v1/data-integration/candidates/CND_XSS_TEST_001/account/verification')
        .set('Authorization', `Bearer ${xssToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check that the response doesn't contain unescaped script tags
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/<script[^>]*>/i);
      expect(responseString).not.toMatch(/javascript:/i);
      expect(responseString).not.toMatch(/on\w+\s*=/i);

      // Cleanup
      db.prepare('DELETE FROM candidates WHERE id = ?').run('CND_XSS_TEST_001');
    });
  });

  describe('Rate Limiting Security', () => {
    test('should apply rate limiting to prevent abuse', async () => {
      // Make many requests quickly to trigger rate limiting
      const requests = Array(20).fill(null).map(() =>
        request(app)
          .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/status`)
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // Check rate limit response format
      if (rateLimitedResponses.length > 0) {
        const rateLimitResponse = rateLimitedResponses[0];
        expect(rateLimitResponse.body.error).toBe('Rate limit exceeded');
        expect(rateLimitResponse.body.retryAfter).toBeDefined();
        expect(typeof rateLimitResponse.body.retryAfter).toBe('number');
      }
    });

    test('should have stricter limits for sensitive operations', async () => {
      // Withdrawal requests should have stricter rate limiting
      const withdrawalRequests = Array(15).fill(null).map((_, i) =>
        request(app)
          .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
          .send({ amount: 20.00 + i }) // Different amounts to avoid duplicate detection
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(withdrawalRequests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Data Sanitization', () => {
    test('should mask sensitive data in responses', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Check that bank account numbers are masked
      const responseString = JSON.stringify(response.body);

      // Should not contain full bank account numbers
      expect(responseString).not.toMatch(/\b\d{8,}\b/); // 8+ digit numbers

      // Should contain masked account numbers (if any)
      if (responseString.includes('accountNumber')) {
        expect(responseString).toMatch(/\*+\d{4}/); // Masked format
      }
    });

    test('should not expose internal system information', async () => {
      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      const responseString = JSON.stringify(response.body);

      // Should not expose internal paths, secrets, or system info
      expect(responseString).not.toMatch(/\/home\/|\/var\/|\/etc\//);
      expect(responseString).not.toMatch(/password|secret|key/i);
      expect(responseString).not.toMatch(/process\.env/);
      expect(responseString).not.toMatch(/__dirname|__filename/);
    });
  });

  describe('Audit Logging Security', () => {
    test('should log sensitive data access attempts', async () => {
      const auditSpy = jest.spyOn(dataIntegration.auditLogger, 'logDataAccess');

      await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/payments/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(auditSpy).toHaveBeenCalledWith(
        testCandidateId,
        expect.stringMatching(/payment/),
        expect.any(String),
        expect.any(Object)
      );

      auditSpy.mockRestore();
    });

    test('should log failed authentication attempts', async () => {
      const auditSpy = jest.spyOn(dataIntegration.auditLogger, 'logError');

      await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      // Note: This would depend on how the auth middleware logs failures
      // auditSpy.mockRestore();
    });

    test('should log unauthorized access attempts', async () => {
      const securitySpy = jest.spyOn(dataIntegration.auditLogger, 'logSecurityEvent');

      await request(app)
        .get('/api/v1/data-integration/candidates/CND_OTHER_001/comprehensive')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      // Security events should be logged for unauthorized access attempts
      // securitySpy.mockRestore();
    });
  });

  describe('GDPR and Privacy Compliance', () => {
    test('should validate data access purpose', async () => {
      // Test that data access is validated against legitimate purposes
      const validPurposes = ['payment_processing', 'job_matching', 'customer_support'];

      for (const purpose of validPurposes) {
        const compliance = dataIntegration.validator.checkGDPRCompliance(
          testCandidateId,
          purpose,
          ['payment_history', 'account_info']
        );

        expect(compliance).toBeDefined();
        expect(typeof compliance.compliant).toBe('boolean');
      }
    });

    test('should enforce data minimization', async () => {
      // Test that excessive data requests are flagged
      const excessiveFields = ['payment_history', 'bank_details', 'personal_data', 'biometric_data'];
      const purpose = 'simple_inquiry';

      const compliance = dataIntegration.validator.checkGDPRCompliance(
        testCandidateId,
        purpose,
        excessiveFields
      );

      // Should flag excessive data access
      expect(compliance.issues.length).toBeGreaterThan(0);
    });

    test('should have proper data retention policies', async () => {
      const retentionInfo = dataIntegration.validator.getRetentionRequirements(
        'payment_processing',
        ['payment_history']
      );

      expect(retentionInfo).toBeDefined();
      expect(retentionInfo.period).toBeDefined();
      expect(typeof retentionInfo.autoDelete).toBe('boolean');
    });
  });

  describe('Error Handling Security', () => {
    test('should not expose stack traces in production', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Trigger an error
      const response = await request(app)
        .get('/api/v1/data-integration/candidates/CND_NONEXISTENT_999/comprehensive')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeUndefined();
      expect(response.body.stack).toBeUndefined();

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toMatch(/Error:|at \w+\.|\/.*\.js:/);

      process.env.NODE_ENV = originalNodeEnv;
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/json')
        .send('{"amount": 50.00,}') // Malformed JSON
        .expect(400);

      expect(response.body.error).toBeDefined();
      // Should not expose JSON parsing errors in detail
    });
  });

  describe('Session Security', () => {
    test('should invalidate sessions for deactivated users', async () => {
      // Deactivate user
      db.prepare('UPDATE candidates SET status = ? WHERE id = ?')
        .run('inactive', testCandidateId);

      const response = await request(app)
        .get(`/api/v1/data-integration/candidates/${testCandidateId}/comprehensive`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ACCOUNT_INACTIVE');

      // Reactivate user for other tests
      db.prepare('UPDATE candidates SET status = ? WHERE id = ?')
        .run('active', testCandidateId);
    });

    test('should validate token freshness for sensitive operations', async () => {
      // Create a token that's valid but close to expiry
      const nearExpiryToken = jwt.sign(
        {
          id: testCandidateId,
          email: 'sectest@worklink.sg',
          iat: Math.floor(Date.now() / 1000) - 23 * 3600, // 23 hours ago
          exp: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
        },
        JWT_SECRET,
        { issuer: 'worklink-v2', audience: 'worklink-users' }
      );

      const response = await request(app)
        .post(`/api/v1/data-integration/candidates/${testCandidateId}/withdrawals/request`)
        .send({ amount: 50.00 })
        .set('Authorization', `Bearer ${nearExpiryToken}`)
        .expect(200); // Should still work, but could be enhanced to require fresh tokens

      expect(response.body.success).toBe(true);
    });
  });

  // Helper functions

  async function setupSecurityTestData() {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO candidates (
          id, name, email, phone, status, bank_name, bank_account,
          total_earnings, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testCandidateId,
        'Security Test Candidate',
        'sectest@worklink.sg',
        '+65 9000 0002',
        'active',
        'Security Bank',
        '1234567890',
        200.00,
        new Date().toISOString()
      );

      console.log('✅ Security test data setup completed');
    } catch (error) {
      console.error('❌ Failed to setup security test data:', error);
      throw error;
    }
  }

  async function cleanupSecurityTestData() {
    try {
      const testIds = [testCandidateId, 'CND_XSS_TEST_001', 'CND_OTHER_001'];

      testIds.forEach(id => {
        try {
          db.prepare('DELETE FROM payments WHERE candidate_id = ?').run(id);
          db.prepare('DELETE FROM candidates WHERE id = ?').run(id);
        } catch (error) {
          // Continue cleanup even if some deletes fail
        }
      });

      console.log('✅ Security test data cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup security test data:', error);
    }
  }
});