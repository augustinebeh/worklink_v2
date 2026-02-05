/**
 * Data Integration Layer Tests
 *
 * Comprehensive test suite for the data integration layer
 * including unit tests, integration tests, and performance tests.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const DataIntegrationLayer = require('../../services/data-integration');
const { db } = require('../../db/database');

describe('Data Integration Layer', () => {
  let dataIntegration;
  let testCandidateId = 'TEST_CANDIDATE_001';
  let testAdminId = 'ADM_TEST_001';

  beforeAll(async () => {
    // Initialize data integration layer
    dataIntegration = new DataIntegrationLayer();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();

    // Close connections
    if (dataIntegration.cache) {
      await dataIntegration.cache.close();
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    if (dataIntegration.cache) {
      await dataIntegration.cache.clear();
    }
  });

  describe('Initialization', () => {
    test('should initialize all services correctly', () => {
      expect(dataIntegration.paymentService).toBeDefined();
      expect(dataIntegration.accountService).toBeDefined();
      expect(dataIntegration.jobService).toBeDefined();
      expect(dataIntegration.withdrawalService).toBeDefined();
      expect(dataIntegration.interviewService).toBeDefined();
      expect(dataIntegration.cache).toBeDefined();
      expect(dataIntegration.validator).toBeDefined();
      expect(dataIntegration.auditLogger).toBeDefined();
    });

    test('should have valid configuration', () => {
      expect(typeof dataIntegration.getUserData).toBe('function');
      expect(typeof dataIntegration.getSpecificData).toBe('function');
      expect(typeof dataIntegration.invalidateCache).toBe('function');
    });
  });

  describe('getUserData', () => {
    test('should retrieve comprehensive user data', async () => {
      const userData = await dataIntegration.getUserData(testCandidateId, 'test_request');

      expect(userData).toBeDefined();
      expect(userData.candidateId).toBe(testCandidateId);
      expect(userData.timestamp).toBeDefined();
      expect(userData.payments).toBeDefined();
      expect(userData.account).toBeDefined();
      expect(userData.jobs).toBeDefined();
      expect(userData.withdrawals).toBeDefined();
      expect(userData.interviews).toBeDefined();
    });

    test('should handle invalid candidate ID', async () => {
      await expect(
        dataIntegration.getUserData('INVALID_ID', 'test_request')
      ).rejects.toThrow('Invalid candidate ID');
    });

    test('should cache user data', async () => {
      // First call
      const startTime = Date.now();
      await dataIntegration.getUserData(testCandidateId, 'test_request');
      const firstCallTime = Date.now() - startTime;

      // Second call (should be from cache)
      const cacheStartTime = Date.now();
      const cachedData = await dataIntegration.getUserData(testCandidateId, 'test_request');
      const cacheCallTime = Date.now() - cacheStartTime;

      expect(cachedData).toBeDefined();
      expect(cacheCallTime).toBeLessThan(firstCallTime);
    });

    test('should audit data access', async () => {
      // Get initial audit count
      const initialStats = await dataIntegration.getAccessStatistics();
      const initialCount = initialStats.overall?.total_requests || 0;

      // Make request
      await dataIntegration.getUserData(testCandidateId, 'audit_test');

      // Check audit log
      const finalStats = await dataIntegration.getAccessStatistics();
      const finalCount = finalStats.overall?.total_requests || 0;

      expect(finalCount).toBeGreaterThan(initialCount);
    });
  });

  describe('getSpecificData', () => {
    test('should retrieve payment data', async () => {
      const paymentData = await dataIntegration.getSpecificData(testCandidateId, 'payment');

      expect(paymentData).toBeDefined();
      expect(paymentData.candidateId).toBe(testCandidateId);
      expect(paymentData.summary).toBeDefined();
      expect(paymentData.currentStatus).toBeDefined();
    });

    test('should retrieve account data', async () => {
      const accountData = await dataIntegration.getSpecificData(testCandidateId, 'account');

      expect(accountData).toBeDefined();
      expect(accountData.candidateId).toBe(testCandidateId);
      expect(accountData.verification).toBeDefined();
      expect(accountData.checks).toBeDefined();
    });

    test('should retrieve job data', async () => {
      const jobData = await dataIntegration.getSpecificData(testCandidateId, 'jobs');

      expect(jobData).toBeDefined();
      expect(jobData.candidateId).toBe(testCandidateId);
      expect(jobData.summary).toBeDefined();
      expect(jobData.currentStatus).toBeDefined();
    });

    test('should retrieve withdrawal data', async () => {
      const withdrawalData = await dataIntegration.getSpecificData(testCandidateId, 'withdrawal');

      expect(withdrawalData).toBeDefined();
      expect(withdrawalData.candidateId).toBe(testCandidateId);
      expect(withdrawalData.balance).toBeDefined();
      expect(withdrawalData.eligibility).toBeDefined();
    });

    test('should retrieve interview data', async () => {
      const interviewData = await dataIntegration.getSpecificData(testCandidateId, 'interview');

      expect(interviewData).toBeDefined();
      expect(interviewData.candidateId).toBe(testCandidateId);
      expect(interviewData.status).toBeDefined();
      expect(interviewData.requirements).toBeDefined();
    });

    test('should reject invalid data type', async () => {
      await expect(
        dataIntegration.getSpecificData(testCandidateId, 'invalid_type')
      ).rejects.toThrow('Invalid data type');
    });
  });

  describe('Permission System', () => {
    test('should allow admin access to all data', () => {
      const hasPermission = dataIntegration.hasPermission(testAdminId, testCandidateId, 'payment');
      expect(hasPermission).toBe(true);
    });

    test('should allow self access to own data', () => {
      const hasPermission = dataIntegration.hasPermission(testCandidateId, testCandidateId, 'payment');
      expect(hasPermission).toBe(true);
    });

    test('should deny access to other users data', () => {
      const otherCandidateId = 'OTHER_CANDIDATE_001';
      const hasPermission = dataIntegration.hasPermission(testCandidateId, otherCandidateId, 'payment');
      expect(hasPermission).toBe(false);
    });

    test('should allow support staff limited access', () => {
      const supportId = 'SUP_TEST_001';
      const hasPaymentAccess = dataIntegration.hasPermission(supportId, testCandidateId, 'payment');
      const hasAccountAccess = dataIntegration.hasPermission(supportId, testCandidateId, 'account');

      expect(hasPaymentAccess).toBe(true);
      expect(hasAccountAccess).toBe(true);
    });
  });

  describe('Cache Management', () => {
    test('should invalidate specific data type cache', async () => {
      // Cache some data
      await dataIntegration.getSpecificData(testCandidateId, 'payment');

      // Invalidate specific cache
      await dataIntegration.invalidateCache(testCandidateId, 'payment');

      // Should fetch fresh data
      const freshData = await dataIntegration.getSpecificData(testCandidateId, 'payment');
      expect(freshData).toBeDefined();
    });

    test('should invalidate all user cache', async () => {
      // Cache multiple data types
      await dataIntegration.getSpecificData(testCandidateId, 'payment');
      await dataIntegration.getSpecificData(testCandidateId, 'account');

      // Invalidate all cache
      await dataIntegration.invalidateCache(testCandidateId);

      // Should fetch fresh data for all types
      const paymentData = await dataIntegration.getSpecificData(testCandidateId, 'payment');
      const accountData = await dataIntegration.getSpecificData(testCandidateId, 'account');

      expect(paymentData).toBeDefined();
      expect(accountData).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Test with a candidate that doesn't exist but has valid format
      const nonExistentId = 'CND_NONEXISTENT_999';

      await expect(
        dataIntegration.getUserData(nonExistentId, 'test_request')
      ).rejects.toThrow();
    });

    test('should handle service failures', async () => {
      // Mock a service failure
      const originalMethod = dataIntegration.paymentService.getPaymentStatus;
      dataIntegration.paymentService.getPaymentStatus = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      await expect(
        dataIntegration.getSpecificData(testCandidateId, 'payment')
      ).rejects.toThrow('Failed to fetch payment data');

      // Restore original method
      dataIntegration.paymentService.getPaymentStatus = originalMethod;
    });

    test('should log errors appropriately', async () => {
      // Mock audit logger
      const logErrorSpy = jest.spyOn(dataIntegration.auditLogger, 'logError');

      try {
        await dataIntegration.getUserData('INVALID_FORMAT', 'test_request');
      } catch (error) {
        // Expected to fail
      }

      expect(logErrorSpy).toHaveBeenCalled();

      logErrorSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      await dataIntegration.getUserData(testCandidateId, 'performance_test');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle concurrent requests', async () => {
      const promises = [];
      const concurrentRequests = 5;

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          dataIntegration.getSpecificData(testCandidateId, 'payment')
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.candidateId).toBe(testCandidateId);
      });
    });

    test('should cache effectively under load', async () => {
      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await dataIntegration.getSpecificData(testCandidateId, 'account');
        times.push(Date.now() - start);
      }

      // Later requests should be faster due to caching
      const firstHalf = times.slice(0, iterations / 2);
      const secondHalf = times.slice(iterations / 2);

      const firstHalfAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

      expect(secondHalfAvg).toBeLessThan(firstHalfAvg);
    });
  });

  describe('Data Consistency', () => {
    test('should return consistent data across calls', async () => {
      const firstCall = await dataIntegration.getSpecificData(testCandidateId, 'payment');
      const secondCall = await dataIntegration.getSpecificData(testCandidateId, 'payment');

      expect(firstCall.candidateId).toBe(secondCall.candidateId);
      expect(firstCall.summary).toEqual(secondCall.summary);
    });

    test('should maintain data integrity across services', async () => {
      const userData = await dataIntegration.getUserData(testCandidateId, 'consistency_test');

      // Check that candidate ID is consistent across all services
      expect(userData.payments.candidateId).toBe(testCandidateId);
      expect(userData.account.candidateId).toBe(testCandidateId);
      expect(userData.jobs.candidateId).toBe(testCandidateId);
      expect(userData.withdrawals.candidateId).toBe(testCandidateId);
      expect(userData.interviews.candidateId).toBe(testCandidateId);
    });
  });

  describe('Security', () => {
    test('should validate candidate ID format', async () => {
      const invalidFormats = ['', 'invalid', '123', 'CND_', 'candidate-001'];

      for (const invalidId of invalidFormats) {
        await expect(
          dataIntegration.getUserData(invalidId, 'security_test')
        ).rejects.toThrow();
      }
    });

    test('should audit sensitive data access', async () => {
      const auditSpy = jest.spyOn(dataIntegration.auditLogger, 'logDataAccess');

      await dataIntegration.getSpecificData(testCandidateId, 'payment');

      expect(auditSpy).toHaveBeenCalledWith(
        testCandidateId,
        'payment',
        expect.any(String),
        expect.any(Object)
      );

      auditSpy.mockRestore();
    });

    test('should sanitize data before return', async () => {
      const userData = await dataIntegration.getUserData(testCandidateId, 'sanitization_test');

      // Check that sensitive data is properly masked
      if (userData.payments.bankDetails.accountNumber) {
        expect(userData.payments.bankDetails.accountNumber).toMatch(/^\*+\d{4}$/);
      }
    });
  });

  // Helper functions

  async function setupTestData() {
    try {
      // Create test candidate
      db.prepare(`
        INSERT OR REPLACE INTO candidates (
          id, name, email, phone, status, bank_name, bank_account,
          total_earnings, xp, level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testCandidateId,
        'Test Candidate',
        'test@worklink.sg',
        '+65 9000 0000',
        'active',
        'Test Bank',
        '1234567890',
        1500.00,
        2500,
        5,
        new Date().toISOString()
      );

      // Create test payments
      const paymentData = [
        ['PAY_TEST_001', testCandidateId, null, 120.00, 0, 120.00, 8.0, 'paid'],
        ['PAY_TEST_002', testCandidateId, null, 150.00, 10.00, 160.00, 8.0, 'approved'],
        ['PAY_TEST_003', testCandidateId, null, 100.00, 0, 100.00, 6.0, 'pending']
      ];

      paymentData.forEach(payment => {
        db.prepare(`
          INSERT OR REPLACE INTO payments (
            id, candidate_id, deployment_id, base_amount, incentive_amount,
            total_amount, hours_worked, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(...payment, new Date().toISOString());
      });

      // Create test jobs and deployments
      db.prepare(`
        INSERT OR REPLACE INTO clients (id, company_name, contact_email, status, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('CLIENT_TEST_001', 'Test Client', 'client@test.com', 'active', new Date().toISOString());

      db.prepare(`
        INSERT OR REPLACE INTO jobs (
          id, client_id, title, description, job_date, start_time, end_time,
          charge_rate, pay_rate, total_slots, filled_slots, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'JOB_TEST_001',
        'CLIENT_TEST_001',
        'Test Event Staff',
        'Test event staffing job',
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
        '09:00',
        '17:00',
        25.00,
        20.00,
        5,
        1,
        'open',
        new Date().toISOString()
      );

      db.prepare(`
        INSERT OR REPLACE INTO deployments (
          id, job_id, candidate_id, status, hours_worked, charge_rate,
          pay_rate, gross_revenue, candidate_pay, gross_profit, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'DEP_TEST_001',
        'JOB_TEST_001',
        testCandidateId,
        'assigned',
        8.0,
        25.00,
        20.00,
        200.00,
        160.00,
        40.00,
        new Date().toISOString()
      );

      console.log('✅ Test data setup completed');
    } catch (error) {
      console.error('❌ Failed to setup test data:', error);
      throw error;
    }
  }

  async function cleanupTestData() {
    try {
      // Clean up test data
      const tables = ['payments', 'deployments', 'jobs', 'clients', 'candidates'];

      tables.forEach(table => {
        try {
          db.prepare(`DELETE FROM ${table} WHERE id LIKE 'TEST%' OR id LIKE '%_TEST_%'`).run();
        } catch (error) {
          // Table might not exist, continue
        }
      });

      // Clean up test candidate
      db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);

      console.log('✅ Test data cleanup completed');
    } catch (error) {
      console.error('❌ Failed to cleanup test data:', error);
    }
  }
});

// Performance benchmark tests
describe('Data Integration Performance Benchmarks', () => {
  let dataIntegration;
  const testCandidateId = 'PERF_TEST_001';

  beforeAll(async () => {
    dataIntegration = new DataIntegrationLayer();
    await setupPerformanceTestData();
  });

  afterAll(async () => {
    await cleanupPerformanceTestData();
    if (dataIntegration.cache) {
      await dataIntegration.cache.close();
    }
  });

  test('benchmark: comprehensive data retrieval', async () => {
    const iterations = 100;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await dataIntegration.getUserData(testCandidateId, 'benchmark_test');
      const end = process.hrtime.bigint();

      times.push(Number(end - start) / 1000000); // Convert to milliseconds
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`Performance Benchmark Results:
      Average: ${avgTime.toFixed(2)}ms
      Min: ${minTime.toFixed(2)}ms
      Max: ${maxTime.toFixed(2)}ms
      95th percentile: ${percentile(times, 95).toFixed(2)}ms
    `);

    expect(avgTime).toBeLessThan(500); // Average should be under 500ms
    expect(percentile(times, 95)).toBeLessThan(1000); // 95th percentile under 1s
  });

  test('benchmark: cache performance', async () => {
    const iterations = 50;
    const cacheMissTimes = [];
    const cacheHitTimes = [];

    // Measure cache misses
    for (let i = 0; i < iterations; i++) {
      await dataIntegration.invalidateCache(testCandidateId);

      const start = process.hrtime.bigint();
      await dataIntegration.getSpecificData(testCandidateId, 'payment');
      const end = process.hrtime.bigint();

      cacheMissTimes.push(Number(end - start) / 1000000);
    }

    // Measure cache hits
    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();
      await dataIntegration.getSpecificData(testCandidateId, 'payment');
      const end = process.hrtime.bigint();

      cacheHitTimes.push(Number(end - start) / 1000000);
    }

    const avgCacheMiss = cacheMissTimes.reduce((a, b) => a + b) / cacheMissTimes.length;
    const avgCacheHit = cacheHitTimes.reduce((a, b) => a + b) / cacheHitTimes.length;

    console.log(`Cache Performance:
      Average cache miss: ${avgCacheMiss.toFixed(2)}ms
      Average cache hit: ${avgCacheHit.toFixed(2)}ms
      Speed improvement: ${(avgCacheMiss / avgCacheHit).toFixed(2)}x
    `);

    expect(avgCacheHit).toBeLessThan(avgCacheMiss);
    expect(avgCacheHit).toBeLessThan(50); // Cache hits should be very fast
  });

  async function setupPerformanceTestData() {
    // Create performance test candidate with more data
    db.prepare(`
      INSERT OR REPLACE INTO candidates (
        id, name, email, phone, status, bank_name, bank_account,
        total_earnings, xp, level, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testCandidateId,
      'Performance Test Candidate',
      'perf@worklink.sg',
      '+65 9999 9999',
      'active',
      'Performance Bank',
      '9999999999',
      5000.00,
      10000,
      15,
      new Date().toISOString()
    );

    // Create multiple payments for performance testing
    for (let i = 0; i < 50; i++) {
      db.prepare(`
        INSERT OR REPLACE INTO payments (
          id, candidate_id, base_amount, total_amount, hours_worked, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        `PAY_PERF_${String(i).padStart(3, '0')}`,
        testCandidateId,
        100 + Math.random() * 100,
        120 + Math.random() * 120,
        6 + Math.random() * 4,
        Math.random() > 0.8 ? 'pending' : 'paid',
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      );
    }
  }

  async function cleanupPerformanceTestData() {
    db.prepare('DELETE FROM payments WHERE candidate_id = ?').run(testCandidateId);
    db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);
  }

  function percentile(arr, p) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    if (Math.floor(index) === index) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }
});