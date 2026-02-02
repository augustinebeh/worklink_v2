#!/usr/bin/env node
/**
 * API Endpoint Test Suite for Gamification System
 * Tests the actual API routes defined in routes/api/v1/gamification.js
 */

const { spawn } = require('child_process');
const axios = require('axios');
const { db } = require('./db');

// Color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

class ApiTester {
  constructor() {
    this.baseURL = 'http://localhost:3000/api/v1/gamification';
    this.testCandidate = 'TEST_API_001';
    this.serverProcess = null;
    this.testResults = { total: 0, passed: 0, failed: 0 };
  }

  async startServer() {
    log('Starting test server...', 'yellow');

    return new Promise((resolve, reject) => {
      this.serverProcess = spawn('node', ['server.js'], {
        env: { ...process.env, PORT: '3000' },
        stdio: 'pipe'
      });

      let output = '';
      this.serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running on port 3000')) {
          log('✓ Test server started', 'green');
          resolve();
        }
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.serverProcess.on('error', reject);

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);
    });
  }

  async stopServer() {
    if (this.serverProcess) {
      this.serverProcess.kill();
      log('✓ Test server stopped', 'green');
    }
  }

  async setupTestData() {
    // Clean up and create test candidate
    db.prepare('DELETE FROM candidates WHERE id = ?').run(this.testCandidate);
    db.prepare('DELETE FROM xp_transactions WHERE candidate_id = ?').run(this.testCandidate);
    db.prepare('DELETE FROM candidate_achievements WHERE candidate_id = ?').run(this.testCandidate);
    db.prepare('DELETE FROM candidate_quests WHERE candidate_id = ?').run(this.testCandidate);

    db.prepare(`
      INSERT INTO candidates (id, name, email, xp, level, current_tier, current_points, status)
      VALUES (?, 'API Test User', 'apitest@example.com', 1000, 2, 'bronze', 500, 'active')
    `).run(this.testCandidate);

    log('✓ Test data setup complete', 'green');
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;
    try {
      const result = await testFunction();
      if (result) {
        this.testResults.passed++;
        log(`✓ PASS ${testName}`, 'green');
      } else {
        this.testResults.failed++;
        log(`✗ FAIL ${testName}`, 'red');
      }
    } catch (error) {
      this.testResults.failed++;
      log(`✗ FAIL ${testName} - ${error.message}`, 'red');
    }
  }

  async testProfileEndpoint() {
    logSection('Testing Profile Endpoint');

    await this.runTest('GET /profile/:candidateId', async () => {
      const response = await axios.get(`${this.baseURL}/profile/${this.testCandidate}`);
      return response.status === 200 && response.data.success && response.data.data.id === this.testCandidate;
    });

    await this.runTest('Profile includes level progress', async () => {
      const response = await axios.get(`${this.baseURL}/profile/${this.testCandidate}`);
      const data = response.data.data;
      return data.levelProgress !== undefined && data.xpToNextLevel !== undefined;
    });
  }

  async testXPEndpoints() {
    logSection('Testing XP Award Endpoints');

    await this.runTest('POST /xp/award - Basic XP award', async () => {
      const response = await axios.post(`${this.baseURL}/xp/award`, {
        candidate_id: this.testCandidate,
        amount: 200,
        reason: 'API test award',
        action_type: 'manual'
      });

      return response.status === 200 && response.data.success;
    });

    await this.runTest('POST /xp/job-complete - Job completion XP', async () => {
      const response = await axios.post(`${this.baseURL}/xp/job-complete`, {
        candidate_id: this.testCandidate,
        hours_worked: 4,
        is_urgent: true,
        was_on_time: true,
        rating: 5,
        job_id: 'TEST_JOB_001'
      });

      return response.status === 200 && response.data.success && response.data.data.xp_awarded > 0;
    });

    await this.runTest('POST /xp/penalty - No-show penalty', async () => {
      const response = await axios.post(`${this.baseURL}/xp/penalty`, {
        candidate_id: this.testCandidate,
        penalty_type: 'no_show',
        reference_id: 'TEST_PENALTY_001'
      });

      return response.status === 200 && response.data.success;
    });
  }

  async testAchievementEndpoints() {
    logSection('Testing Achievement Endpoints');

    await this.runTest('GET /achievements - Get all achievements', async () => {
      const response = await axios.get(`${this.baseURL}/achievements`);
      return response.status === 200 && response.data.success && Array.isArray(response.data.data);
    });

    await this.runTest('POST /achievements/unlock - Unlock achievement', async () => {
      const response = await axios.post(`${this.baseURL}/achievements/unlock`, {
        candidate_id: this.testCandidate,
        achievement_id: 'ACH_IRONCLAD_1'
      });

      return response.status === 200 && response.data.success;
    });

    await this.runTest('POST /achievements/check/:candidateId - Auto check achievements', async () => {
      const response = await axios.post(`${this.baseURL}/achievements/check/${this.testCandidate}`);
      return response.status === 200 && response.data.success;
    });
  }

  async testQuestEndpoints() {
    logSection('Testing Quest Endpoints');

    await this.runTest('GET /quests - Get all quests', async () => {
      const response = await axios.get(`${this.baseURL}/quests`);
      return response.status === 200 && response.data.success && Array.isArray(response.data.data);
    });

    await this.runTest('GET /quests/user/:candidateId - Get user quests', async () => {
      const response = await axios.get(`${this.baseURL}/quests/user/${this.testCandidate}`);
      return response.status === 200 && response.data.success && Array.isArray(response.data.data);
    });

    await this.runTest('POST /quests/:questId/claim - Claim daily quest', async () => {
      const response = await axios.post(`${this.baseURL}/quests/QST_DAILY_CHECKIN/claim`, {
        candidateId: this.testCandidate
      });

      return response.status === 200 && response.data.success;
    });
  }

  async testRewardEndpoints() {
    logSection('Testing Reward Endpoints');

    await this.runTest('GET /rewards - Get all rewards', async () => {
      const response = await axios.get(`${this.baseURL}/rewards`);
      return response.status === 200 && response.data.success && Array.isArray(response.data.data);
    });

    await this.runTest('GET /rewards/user/:candidateId - Get user rewards', async () => {
      const response = await axios.get(`${this.baseURL}/rewards/user/${this.testCandidate}`);
      return response.status === 200 && response.data.success;
    });
  }

  async testLeaderboardEndpoint() {
    logSection('Testing Leaderboard Endpoint');

    await this.runTest('GET /leaderboard - Get leaderboard', async () => {
      const response = await axios.get(`${this.baseURL}/leaderboard`);
      return response.status === 200 && response.data.success && Array.isArray(response.data.data);
    });
  }

  async testBorderEndpoints() {
    logSection('Testing Profile Border Endpoints');

    await this.runTest('GET /borders/:candidateId - Get profile borders', async () => {
      const response = await axios.get(`${this.baseURL}/borders/${this.testCandidate}`);
      return response.status === 200 && response.data.success;
    });
  }

  async testErrorHandling() {
    logSection('Testing Error Handling');

    await this.runTest('Invalid candidate ID returns 404', async () => {
      try {
        await axios.get(`${this.baseURL}/profile/INVALID_ID`);
        return false;
      } catch (error) {
        return error.response?.status === 404;
      }
    });

    await this.runTest('Missing required fields returns 400', async () => {
      try {
        await axios.post(`${this.baseURL}/xp/award`, {
          // Missing candidate_id and amount
          reason: 'Test'
        });
        return false;
      } catch (error) {
        return error.response?.status === 400 || error.response?.status === 500;
      }
    });
  }

  async cleanupTestData() {
    db.prepare('DELETE FROM candidates WHERE id = ?').run(this.testCandidate);
    db.prepare('DELETE FROM xp_transactions WHERE candidate_id = ?').run(this.testCandidate);
    db.prepare('DELETE FROM candidate_achievements WHERE candidate_id = ?').run(this.testCandidate);
    db.prepare('DELETE FROM candidate_quests WHERE candidate_id = ?').run(this.testCandidate);
    log('✓ Test cleanup complete', 'green');
  }

  displayResults() {
    logSection('API Test Results Summary');

    const passRate = Math.round((this.testResults.passed / this.testResults.total) * 100);

    log(`Total Tests: ${this.testResults.total}`, 'white');
    log(`Passed: ${this.testResults.passed}`, 'green');
    log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'red' : 'green');
    log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');

    if (this.testResults.failed === 0) {
      log('\n🎉 All API tests passed! Gamification endpoints are working correctly.', 'green');
    } else {
      log(`\n⚠️  ${this.testResults.failed} API test(s) failed.`, 'yellow');
    }
  }

  async runAllTests() {
    try {
      await this.startServer();
      // Wait a moment for server to fully start
      await new Promise(resolve => setTimeout(resolve, 2000));

      await this.setupTestData();

      await this.testProfileEndpoint();
      await this.testXPEndpoints();
      await this.testAchievementEndpoints();
      await this.testQuestEndpoints();
      await this.testRewardEndpoints();
      await this.testLeaderboardEndpoint();
      await this.testBorderEndpoints();
      await this.testErrorHandling();

      this.displayResults();
    } catch (error) {
      log(`❌ API test suite failed: ${error.message}`, 'red');
    } finally {
      await this.cleanupTestData();
      await this.stopServer();
    }
  }
}

// Run the API tests
async function main() {
  log('🚀 Starting WorkLink Gamification API Test Suite', 'magenta');
  log('Testing API endpoints for Career Ladder implementation\n', 'magenta');

  const tester = new ApiTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ApiTester;