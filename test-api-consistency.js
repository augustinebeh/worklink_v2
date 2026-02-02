/**
 * API Data Consistency Test Utility
 * Tests API endpoints for data consistency and validates responses
 */

const fetch = require('node-fetch');

class ApiConsistencyTester {
  constructor(baseUrl = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async testEndpoint(name, endpoint, validationRules = {}) {
    const startTime = Date.now();

    try {
      console.log(`Testing: ${name} (${endpoint})`);
      const response = await this.makeRequest(endpoint);
      const duration = Date.now() - startTime;

      // Validate response structure
      const validation = this.validateResponse(response, validationRules);

      const result = {
        name,
        endpoint,
        status: validation.valid ? 'PASS' : 'FAIL',
        duration,
        response,
        validation,
        timestamp: new Date().toISOString()
      };

      this.testResults.push(result);

      if (validation.valid) {
        console.log(`✅ ${name} - PASS (${duration}ms)`);
      } else {
        console.log(`❌ ${name} - FAIL (${duration}ms)`);
        console.log('  Validation errors:', validation.errors);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        name,
        endpoint,
        status: 'ERROR',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.testResults.push(result);
      console.log(`❌ ${name} - ERROR (${duration}ms): ${error.message}`);
      return result;
    }
  }

  validateResponse(response, rules) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check if response is array when expected
    if (rules.isArray && !Array.isArray(response)) {
      validation.valid = false;
      validation.errors.push('Expected array response');
      return validation;
    }

    // Check required fields
    const dataToCheck = rules.isArray ? (response[0] || {}) : response;

    if (rules.requiredFields) {
      for (const field of rules.requiredFields) {
        if (!(field in dataToCheck)) {
          validation.valid = false;
          validation.errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check field types
    if (rules.fieldTypes) {
      for (const [field, expectedType] of Object.entries(rules.fieldTypes)) {
        const value = dataToCheck[field];
        if (value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== expectedType) {
            validation.valid = false;
            validation.errors.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
          }
        }
      }
    }

    // Check minimum array length
    if (rules.minItems && Array.isArray(response) && response.length < rules.minItems) {
      validation.warnings.push(`Array has ${response.length} items, expected at least ${rules.minItems}`);
    }

    return validation;
  }

  async testCandidateEndpoints() {
    console.log('\n🧪 Testing Candidate Endpoints...');

    await this.testEndpoint(
      'Get All Candidates',
      '/candidates',
      {
        isArray: true,
        requiredFields: ['id', 'name', 'email', 'status'],
        fieldTypes: {
          id: 'string',
          name: 'string',
          email: 'string',
          status: 'string',
          xp: 'number',
          level: 'number'
        }
      }
    );

    // Test specific candidate if candidates exist
    const candidates = await this.makeRequest('/candidates').catch(() => []);
    if (candidates.length > 0) {
      const candidateId = candidates[0].id;

      await this.testEndpoint(
        'Get Specific Candidate',
        `/candidates/${candidateId}`,
        {
          requiredFields: ['id', 'name', 'email', 'status'],
          fieldTypes: {
            id: 'string',
            name: 'string',
            email: 'string',
            status: 'string'
          }
        }
      );

      await this.testEndpoint(
        'Get Candidate Gamification',
        `/gamification/candidate/${candidateId}`,
        {
          requiredFields: ['xp', 'level'],
          fieldTypes: {
            xp: 'number',
            level: 'number',
            achievements: 'array'
          }
        }
      );
    }
  }

  async testJobEndpoints() {
    console.log('\n🧪 Testing Job Endpoints...');

    await this.testEndpoint(
      'Get All Jobs',
      '/jobs',
      {
        isArray: true,
        requiredFields: ['id', 'title', 'location', 'pay_rate', 'status'],
        fieldTypes: {
          id: 'string',
          title: 'string',
          location: 'string',
          pay_rate: 'number',
          status: 'string'
        }
      }
    );

    // Test specific job if jobs exist
    const jobs = await this.makeRequest('/jobs').catch(() => []);
    if (jobs.length > 0) {
      const jobId = jobs[0].id;

      await this.testEndpoint(
        'Get Specific Job',
        `/jobs/${jobId}`,
        {
          requiredFields: ['id', 'title', 'location', 'pay_rate'],
          fieldTypes: {
            id: 'string',
            title: 'string',
            location: 'string',
            pay_rate: 'number'
          }
        }
      );
    }
  }

  async testGamificationEndpoints() {
    console.log('\n🧪 Testing Gamification Endpoints...');

    await this.testEndpoint(
      'Get Achievements',
      '/gamification/achievements',
      {
        isArray: true,
        requiredFields: ['id', 'name', 'description'],
        fieldTypes: {
          id: 'string',
          name: 'string',
          description: 'string'
        }
      }
    );

    await this.testEndpoint(
      'Get Quests',
      '/gamification/quests',
      {
        isArray: true,
        fieldTypes: {
          id: 'string',
          title: 'string',
          description: 'string',
          xp_reward: 'number'
        }
      }
    );
  }

  async testPaymentEndpoints() {
    console.log('\n🧪 Testing Payment Endpoints...');

    await this.testEndpoint(
      'Get All Payments',
      '/payments',
      {
        isArray: true,
        fieldTypes: {
          id: 'string',
          candidate_id: 'string',
          total_amount: 'number',
          status: 'string'
        }
      }
    );
  }

  async testChatEndpoints() {
    console.log('\n🧪 Testing Chat Endpoints...');

    await this.testEndpoint(
      'Get Messages',
      '/chat/messages',
      {
        isArray: true,
        fieldTypes: {
          id: 'number',
          candidate_id: 'string',
          content: 'string',
          created_at: 'string'
        }
      }
    );
  }

  async testNotificationEndpoints() {
    console.log('\n🧪 Testing Notification Endpoints...');

    await this.testEndpoint(
      'Get Notifications',
      '/notifications',
      {
        isArray: true,
        fieldTypes: {
          id: 'number',
          candidate_id: 'string',
          title: 'string',
          message: 'string'
        }
      }
    );
  }

  async testDataConsistency() {
    console.log('\n🧪 Testing Cross-Endpoint Data Consistency...');

    try {
      // Get candidates and their related data
      const candidates = await this.makeRequest('/candidates');
      const payments = await this.makeRequest('/payments');
      const jobs = await this.makeRequest('/jobs');

      console.log(`Found ${candidates.length} candidates, ${payments.length} payments, ${jobs.length} jobs`);

      // Test data relationship consistency
      for (const candidate of candidates.slice(0, 3)) { // Test first 3 candidates
        // Check if candidate payments reference valid candidate
        const candidatePayments = payments.filter(p => p.candidate_id === candidate.id);

        console.log(`Candidate ${candidate.name}: ${candidatePayments.length} payments`);

        // Verify gamification data consistency
        try {
          const gamificationData = await this.makeRequest(`/gamification/candidate/${candidate.id}`);

          const consistencyResult = {
            candidateId: candidate.id,
            dbXP: candidate.xp || 0,
            gamificationXP: gamificationData.xp || 0,
            consistent: (candidate.xp || 0) === (gamificationData.xp || 0)
          };

          this.testResults.push({
            name: `XP Consistency for ${candidate.name}`,
            status: consistencyResult.consistent ? 'PASS' : 'FAIL',
            details: consistencyResult,
            timestamp: new Date().toISOString()
          });

          if (consistencyResult.consistent) {
            console.log(`✅ XP consistency check for ${candidate.name} - PASS`);
          } else {
            console.log(`❌ XP consistency check for ${candidate.name} - FAIL`);
            console.log(`  DB XP: ${consistencyResult.dbXP}, Gamification XP: ${consistencyResult.gamificationXP}`);
          }

        } catch (error) {
          console.log(`❌ Failed to check gamification data for ${candidate.name}: ${error.message}`);
        }
      }

    } catch (error) {
      console.log(`❌ Data consistency test failed: ${error.message}`);
    }
  }

  generateReport() {
    const summary = {
      total: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'PASS').length,
      failed: this.testResults.filter(r => r.status === 'FAIL').length,
      errors: this.testResults.filter(r => r.status === 'ERROR').length
    };

    console.log('\n📊 API CONSISTENCY TEST RESULTS');
    console.log('================================');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(2)}%`);

    const failedTests = this.testResults.filter(r => r.status !== 'PASS');
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED/ERROR TESTS:');
      failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.error || 'Validation failed'}`);
      });
    }

    return {
      summary,
      results: this.testResults,
      timestamp: new Date().toISOString()
    };
  }

  async runAllTests() {
    console.log('🚀 Starting API Consistency Tests...');
    console.log(`Base URL: ${this.baseUrl}`);

    try {
      // Test all endpoint categories
      await this.testCandidateEndpoints();
      await this.testJobEndpoints();
      await this.testGamificationEndpoints();
      await this.testPaymentEndpoints();
      await this.testChatEndpoints();
      await this.testNotificationEndpoints();

      // Test cross-endpoint consistency
      await this.testDataConsistency();

      // Generate final report
      return this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      return this.generateReport();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ApiConsistencyTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n✅ API consistency tests completed!');

      // Save report to file
      const fs = require('fs');
      const reportPath = `./test-results/api-consistency-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      if (!fs.existsSync('./test-results')) {
        fs.mkdirSync('./test-results', { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`Report saved to: ${reportPath}`);
    })
    .catch(error => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

module.exports = ApiConsistencyTester;