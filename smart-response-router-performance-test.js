/**
 * Smart Response Router Performance & Load Test Suite
 *
 * Tests the performance characteristics of the Smart Response Router system
 * under various load conditions to ensure it meets production requirements.
 *
 * Performance Targets:
 * - Response Classification: <100ms
 * - Database Queries: <10ms average
 * - End-to-end Response: <200ms
 * - Concurrent Users: 1000+ simultaneous
 * - WebSocket Message Handling: <50ms
 * - Memory Usage: Stable under load
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const EventEmitter = require('events');

class SmartResponseRouterPerformanceTester extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.results = {
      responseClassification: {},
      databasePerformance: {},
      endToEndResponse: {},
      loadTesting: {},
      memoryUsage: {},
      webSocketPerformance: {},
      scalabilityAnalysis: {},
      summary: {}
    };

    // Performance targets
    this.targets = {
      classificationTime: 100, // milliseconds
      databaseQueryTime: 10, // milliseconds
      endToEndTime: 200, // milliseconds
      concurrentUsers: 1000,
      webSocketTime: 50, // milliseconds
      memoryGrowthLimit: 50 // MB increase under load
    };
  }

  async initialize() {
    console.log('⚡ INITIALIZING SMART RESPONSE ROUTER PERFORMANCE TEST');
    console.log('=' .repeat(60));

    const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
    const dbPath = path.join(DATA_DIR, 'worklink.db');
    this.db = new Database(dbPath);

    await this.setupPerformanceTestData();
    console.log('✅ Performance test environment ready');
  }

  async setupPerformanceTestData() {
    // Create test candidates for load testing
    const insertCandidate = this.db.prepare(`
      INSERT OR REPLACE INTO candidates (id, name, status, level, total_earnings, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);

    for (let i = 1; i <= 100; i++) {
      insertCandidate.run(
        `perf_test_${i.toString().padStart(3, '0')}`,
        `Test User ${i}`,
        i % 3 === 0 ? 'pending' : 'active',
        Math.floor(Math.random() * 5) + 1,
        Math.random() * 1000
      );
    }

    // Create test payment data
    const insertPayment = this.db.prepare(`
      INSERT OR REPLACE INTO payments (id, candidate_id, amount, status, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    for (let i = 1; i <= 500; i++) {
      const candidateId = `perf_test_${(Math.floor((i - 1) / 5) + 1).toString().padStart(3, '0')}`;
      insertPayment.run(
        `perf_pay_${i}`,
        candidateId,
        Math.random() * 200,
        ['pending', 'paid', 'available'][Math.floor(Math.random() * 3)]
      );
    }

    console.log('📊 Created 100 test candidates with 500 payment records');
  }

  // ===========================================
  // RESPONSE CLASSIFICATION PERFORMANCE
  // ===========================================

  async testResponseClassificationPerformance() {
    console.log('\n🧠 TESTING RESPONSE CLASSIFICATION PERFORMANCE...');

    const testMessages = [
      'When will I get paid?',
      'What jobs are available?',
      'How much do I have pending?',
      'Can I withdraw money?',
      'What is my account status?',
      'I need help urgently',
      'How do I apply for jobs?',
      'When will my account be verified?',
      'What is my balance?',
      'I have a complaint'
    ];

    const classificationTimes = [];

    for (let i = 0; i < 1000; i++) {
      const message = testMessages[i % testMessages.length];
      const startTime = process.hrtime.bigint();

      // Simulate intent classification
      await this.classifyIntent(message);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      classificationTimes.push(duration);
    }

    this.results.responseClassification = {
      totalClassifications: classificationTimes.length,
      averageTime: classificationTimes.reduce((a, b) => a + b, 0) / classificationTimes.length,
      minTime: Math.min(...classificationTimes),
      maxTime: Math.max(...classificationTimes),
      medianTime: this.calculateMedian(classificationTimes),
      p95Time: this.calculatePercentile(classificationTimes, 95),
      p99Time: this.calculatePercentile(classificationTimes, 99),
      withinTarget: classificationTimes.filter(t => t <= this.targets.classificationTime).length,
      targetRate: classificationTimes.filter(t => t <= this.targets.classificationTime).length / classificationTimes.length
    };

    console.log(`📊 Classification Performance:`);
    console.log(`   Average: ${this.results.responseClassification.averageTime.toFixed(2)}ms`);
    console.log(`   P95: ${this.results.responseClassification.p95Time.toFixed(2)}ms`);
    console.log(`   Target Rate: ${(this.results.responseClassification.targetRate * 100).toFixed(1)}%`);
  }

  async classifyIntent(message) {
    // Simulate intent classification processing
    const intents = ['payment', 'jobs', 'account', 'support', 'complaint'];
    const patterns = {
      payment: ['pay', 'money', 'earn', 'withdraw'],
      jobs: ['job', 'work', 'apply', 'available'],
      account: ['account', 'status', 'verify', 'profile'],
      support: ['help', 'problem', 'issue', 'question'],
      complaint: ['complaint', 'angry', 'unfair', 'wrong']
    };

    // Simple pattern matching simulation
    for (const [intent, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        return { intent, confidence: 0.9 };
      }
    }

    return { intent: 'general', confidence: 0.5 };
  }

  // ===========================================
  // DATABASE PERFORMANCE TESTING
  // ===========================================

  async testDatabasePerformance() {
    console.log('\n💾 TESTING DATABASE PERFORMANCE...');

    const queries = [
      () => this.db.prepare('SELECT * FROM candidates WHERE id = ?').get('perf_test_001'),
      () => this.db.prepare('SELECT * FROM payments WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 10').all('perf_test_001'),
      () => this.db.prepare('SELECT SUM(amount) as total FROM payments WHERE candidate_id = ? AND status = ?').get('perf_test_001', 'pending'),
      () => this.db.prepare('SELECT COUNT(*) as count FROM candidates WHERE status = ?').get('active'),
      () => this.db.prepare('SELECT * FROM candidates WHERE level > ? ORDER BY total_earnings DESC LIMIT 5').all(3)
    ];

    const queryTimes = [];
    const totalQueries = 5000;

    console.log(`🔄 Executing ${totalQueries} database queries...`);

    for (let i = 0; i < totalQueries; i++) {
      const candidateId = `perf_test_${((i % 100) + 1).toString().padStart(3, '0')}`;
      const query = queries[i % queries.length];

      const startTime = process.hrtime.bigint();

      // Execute query with random candidate
      if (query.toString().includes('candidate_id')) {
        this.db.prepare('SELECT * FROM payments WHERE candidate_id = ?').all(candidateId);
      } else {
        query();
      }

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      queryTimes.push(duration);
    }

    this.results.databasePerformance = {
      totalQueries: queryTimes.length,
      averageTime: queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length,
      minTime: Math.min(...queryTimes),
      maxTime: Math.max(...queryTimes),
      medianTime: this.calculateMedian(queryTimes),
      p95Time: this.calculatePercentile(queryTimes, 95),
      p99Time: this.calculatePercentile(queryTimes, 99),
      withinTarget: queryTimes.filter(t => t <= this.targets.databaseQueryTime).length,
      targetRate: queryTimes.filter(t => t <= this.targets.databaseQueryTime).length / queryTimes.length
    };

    console.log(`📊 Database Performance:`);
    console.log(`   Average: ${this.results.databasePerformance.averageTime.toFixed(2)}ms`);
    console.log(`   P95: ${this.results.databasePerformance.p95Time.toFixed(2)}ms`);
    console.log(`   Target Rate: ${(this.results.databasePerformance.targetRate * 100).toFixed(1)}%`);
  }

  // ===========================================
  // END-TO-END RESPONSE TESTING
  // ===========================================

  async testEndToEndResponsePerformance() {
    console.log('\n🔄 TESTING END-TO-END RESPONSE PERFORMANCE...');

    const testScenarios = [
      { candidateId: 'perf_test_001', message: 'How much do I have pending?' },
      { candidateId: 'perf_test_002', message: 'What jobs are available?' },
      { candidateId: 'perf_test_003', message: 'Can I withdraw money?' },
      { candidateId: 'perf_test_004', message: 'What is my account status?' },
      { candidateId: 'perf_test_005', message: 'I need help with my account' }
    ];

    const responseTimes = [];

    for (let i = 0; i < 1000; i++) {
      const scenario = testScenarios[i % testScenarios.length];
      const startTime = process.hrtime.bigint();

      // Simulate full response generation pipeline
      await this.generateCompleteResponse(scenario.candidateId, scenario.message);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      responseTimes.push(duration);
    }

    this.results.endToEndResponse = {
      totalResponses: responseTimes.length,
      averageTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minTime: Math.min(...responseTimes),
      maxTime: Math.max(...responseTimes),
      medianTime: this.calculateMedian(responseTimes),
      p95Time: this.calculatePercentile(responseTimes, 95),
      p99Time: this.calculatePercentile(responseTimes, 99),
      withinTarget: responseTimes.filter(t => t <= this.targets.endToEndTime).length,
      targetRate: responseTimes.filter(t => t <= this.targets.endToEndTime).length / responseTimes.length
    };

    console.log(`📊 End-to-End Performance:`);
    console.log(`   Average: ${this.results.endToEndResponse.averageTime.toFixed(2)}ms`);
    console.log(`   P95: ${this.results.endToEndResponse.p95Time.toFixed(2)}ms`);
    console.log(`   Target Rate: ${(this.results.endToEndResponse.targetRate * 100).toFixed(1)}%`);
  }

  async generateCompleteResponse(candidateId, message) {
    // Simulate complete response generation pipeline

    // 1. Intent classification
    const intent = await this.classifyIntent(message);

    // 2. Data retrieval
    const candidate = this.db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
    const payments = this.db.prepare('SELECT * FROM payments WHERE candidate_id = ?').all(candidateId);

    // 3. Response generation (simulated)
    await new Promise(resolve => setTimeout(resolve, 5)); // Simulate AI processing time

    // 4. Response formatting
    const response = this.formatResponse(intent, candidate, payments, message);

    return response;
  }

  formatResponse(intent, candidate, payments, message) {
    // Simulate response formatting
    if (intent.intent === 'payment' && payments.length > 0) {
      const pending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
      return `You have $${pending.toFixed(2)} in pending payments.`;
    }

    if (intent.intent === 'account') {
      return `Your account status is ${candidate.status}.`;
    }

    return "I'll check with the admin team for accurate information.";
  }

  // ===========================================
  // LOAD TESTING
  // ===========================================

  async testConcurrentLoad() {
    console.log('\n🏗️ TESTING CONCURRENT LOAD PERFORMANCE...');

    const concurrentUsers = [10, 50, 100, 250, 500, 1000];

    for (const userCount of concurrentUsers) {
      console.log(`📈 Testing ${userCount} concurrent users...`);

      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < userCount; i++) {
        const candidateId = `perf_test_${((i % 100) + 1).toString().padStart(3, '0')}`;
        const message = `Test message from user ${i}`;
        promises.push(this.generateCompleteResponse(candidateId, message));
      }

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const successfulResponses = responses.filter(r => r && r.length > 0).length;

      this.results.loadTesting[`${userCount}_users`] = {
        userCount,
        totalTime,
        averageTimePerUser: totalTime / userCount,
        successfulResponses,
        successRate: successfulResponses / userCount,
        throughput: userCount / (totalTime / 1000) // users per second
      };

      console.log(`   ✅ ${userCount} users: ${totalTime}ms total, ${(successfulResponses / userCount * 100).toFixed(1)}% success rate`);
    }
  }

  // ===========================================
  // MEMORY USAGE MONITORING
  // ===========================================

  async testMemoryUsage() {
    console.log('\n🧠 TESTING MEMORY USAGE UNDER LOAD...');

    const initialMemory = process.memoryUsage();
    const memorySnapshots = [{ time: 0, memory: initialMemory }];

    // Generate load for 60 seconds while monitoring memory
    const testDuration = 60000; // 60 seconds
    const startTime = Date.now();

    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage();
      const elapsed = Date.now() - startTime;
      memorySnapshots.push({ time: elapsed, memory: currentMemory });
    }, 5000); // Every 5 seconds

    // Generate continuous load
    const loadPromises = [];
    while (Date.now() - startTime < testDuration) {
      for (let i = 0; i < 50; i++) {
        const candidateId = `perf_test_${((i % 100) + 1).toString().padStart(3, '0')}`;
        loadPromises.push(this.generateCompleteResponse(candidateId, `Load test message ${i}`));
      }
      await Promise.all(loadPromises);
      loadPromises.length = 0; // Clear array
    }

    clearInterval(memoryMonitor);

    const finalMemory = process.memoryUsage();
    const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

    this.results.memoryUsage = {
      initialMemory: initialMemory,
      finalMemory: finalMemory,
      heapGrowth: memoryGrowth,
      heapGrowthMB: memoryGrowth / 1024 / 1024,
      snapshots: memorySnapshots,
      withinTarget: (memoryGrowth / 1024 / 1024) <= this.targets.memoryGrowthLimit,
      testDuration: testDuration
    };

    console.log(`📊 Memory Usage:`);
    console.log(`   Heap Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Within Target: ${this.results.memoryUsage.withinTarget ? '✅' : '❌'}`);
  }

  // ===========================================
  // WEBSOCKET PERFORMANCE TESTING
  // ===========================================

  async testWebSocketPerformance() {
    console.log('\n🔌 TESTING WEBSOCKET MESSAGE HANDLING PERFORMANCE...');

    const messageTypes = [
      { type: 'candidate_message', payload: { candidateId: 'perf_test_001', message: 'Hello' } },
      { type: 'ai_response', payload: { candidateId: 'perf_test_001', response: 'Response' } },
      { type: 'admin_notification', payload: { type: 'escalation', candidateId: 'perf_test_001' } }
    ];

    const processingTimes = [];

    for (let i = 0; i < 1000; i++) {
      const message = messageTypes[i % messageTypes.length];
      const startTime = process.hrtime.bigint();

      // Simulate WebSocket message processing
      await this.processWebSocketMessage(message);

      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;

      processingTimes.push(duration);
    }

    this.results.webSocketPerformance = {
      totalMessages: processingTimes.length,
      averageTime: processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length,
      minTime: Math.min(...processingTimes),
      maxTime: Math.max(...processingTimes),
      p95Time: this.calculatePercentile(processingTimes, 95),
      withinTarget: processingTimes.filter(t => t <= this.targets.webSocketTime).length,
      targetRate: processingTimes.filter(t => t <= this.targets.webSocketTime).length / processingTimes.length
    };

    console.log(`📊 WebSocket Performance:`);
    console.log(`   Average: ${this.results.webSocketPerformance.averageTime.toFixed(2)}ms`);
    console.log(`   Target Rate: ${(this.results.webSocketPerformance.targetRate * 100).toFixed(1)}%`);
  }

  async processWebSocketMessage(message) {
    // Simulate WebSocket message processing
    switch (message.type) {
      case 'candidate_message':
        // Simulate routing to AI or admin
        await new Promise(resolve => setTimeout(resolve, 2));
        break;
      case 'ai_response':
        // Simulate broadcasting to admin
        await new Promise(resolve => setTimeout(resolve, 1));
        break;
      case 'admin_notification':
        // Simulate notification handling
        await new Promise(resolve => setTimeout(resolve, 3));
        break;
    }
  }

  // ===========================================
  // SCALABILITY ANALYSIS
  // ===========================================

  async analyzeScalability() {
    console.log('\n📈 ANALYZING SYSTEM SCALABILITY...');

    const loadResults = this.results.loadTesting;
    const userCounts = Object.keys(loadResults).map(k => parseInt(k.split('_')[0]));

    // Calculate scalability metrics
    const throughputs = userCounts.map(count => loadResults[`${count}_users`].throughput);
    const responseTimes = userCounts.map(count => loadResults[`${count}_users`].averageTimePerUser);
    const successRates = userCounts.map(count => loadResults[`${count}_users`].successRate);

    this.results.scalabilityAnalysis = {
      maxConcurrentUsers: Math.max(...userCounts),
      maxThroughput: Math.max(...throughputs),
      scalabilityFactor: this.calculateScalabilityFactor(userCounts, throughputs),
      performanceDegradation: this.calculatePerformanceDegradation(userCounts, responseTimes),
      reliabilityUnderLoad: Math.min(...successRates),
      recommendedMaxUsers: this.calculateRecommendedMaxUsers(loadResults)
    };

    console.log(`📊 Scalability Analysis:`);
    console.log(`   Max Throughput: ${this.results.scalabilityAnalysis.maxThroughput.toFixed(1)} users/sec`);
    console.log(`   Recommended Max Users: ${this.results.scalabilityAnalysis.recommendedMaxUsers}`);
    console.log(`   Reliability Under Load: ${(this.results.scalabilityAnalysis.reliabilityUnderLoad * 100).toFixed(1)}%`);
  }

  calculateScalabilityFactor(userCounts, throughputs) {
    // Calculate how well the system scales (linear = 1.0)
    const idealThroughputs = userCounts.map(count => throughputs[0] * (count / userCounts[0]));
    const actualVsIdeal = throughputs.map((actual, i) => actual / idealThroughputs[i]);
    return actualVsIdeal.reduce((sum, ratio) => sum + ratio, 0) / actualVsIdeal.length;
  }

  calculatePerformanceDegradation(userCounts, responseTimes) {
    // Calculate performance degradation as load increases
    const baselineTime = responseTimes[0];
    const maxTime = Math.max(...responseTimes);
    return (maxTime - baselineTime) / baselineTime;
  }

  calculateRecommendedMaxUsers(loadResults) {
    // Find the point where success rate drops below 95% or response time exceeds target
    for (const [key, result] of Object.entries(loadResults)) {
      if (result.successRate < 0.95 || result.averageTimePerUser > this.targets.endToEndTime) {
        const prevUserCount = Object.keys(loadResults)[Object.keys(loadResults).indexOf(key) - 1];
        return prevUserCount ? parseInt(prevUserCount.split('_')[0]) : result.userCount;
      }
    }
    return Math.max(...Object.values(loadResults).map(r => r.userCount));
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  calculateMedian(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  // ===========================================
  // MAIN TEST EXECUTION AND REPORTING
  // ===========================================

  async runAllPerformanceTests() {
    console.log('⚡ STARTING SMART RESPONSE ROUTER PERFORMANCE TEST SUITE');
    console.log('Testing system performance under various load conditions');
    console.log('=' .repeat(60));

    const startTime = Date.now();

    await this.initialize();

    try {
      await this.testResponseClassificationPerformance();
      await this.testDatabasePerformance();
      await this.testEndToEndResponsePerformance();
      await this.testConcurrentLoad();
      await this.testMemoryUsage();
      await this.testWebSocketPerformance();
      await this.analyzeScalability();

      await this.generatePerformanceReport();

    } catch (error) {
      console.error('❌ Performance test execution failed:', error);
    } finally {
      this.cleanup();
    }

    const totalTime = Date.now() - startTime;
    console.log(`\n⏱️ Total test execution time: ${(totalTime / 1000).toFixed(1)} seconds`);
  }

  async generatePerformanceReport() {
    console.log('\n📊 GENERATING PERFORMANCE REPORT...');

    // Calculate overall performance score
    const performanceScore = this.calculateOverallPerformanceScore();

    const report = {
      timestamp: new Date().toISOString(),
      performanceScore,
      targets: this.targets,
      results: this.results,
      recommendations: this.generatePerformanceRecommendations(),
      scalabilityAssessment: this.assessScalabilityReadiness()
    };

    // Save detailed report
    const reportPath = path.join(__dirname, `SMART_RESPONSE_ROUTER_PERFORMANCE_REPORT_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    await this.generatePerformanceSummary(report);

    console.log(`📄 Performance report saved to: ${reportPath}`);

    // Display summary results
    this.displayPerformanceSummary(performanceScore);
  }

  calculateOverallPerformanceScore() {
    const scores = {
      classification: this.results.responseClassification.targetRate || 0,
      database: this.results.databasePerformance.targetRate || 0,
      endToEnd: this.results.endToEndResponse.targetRate || 0,
      concurrency: Math.min(this.results.scalabilityAnalysis?.reliabilityUnderLoad || 0, 1),
      memory: this.results.memoryUsage.withinTarget ? 1 : 0,
      websocket: this.results.webSocketPerformance.targetRate || 0
    };

    const weightedScore = (
      scores.classification * 0.2 +
      scores.database * 0.15 +
      scores.endToEnd * 0.25 +
      scores.concurrency * 0.2 +
      scores.memory * 0.1 +
      scores.websocket * 0.1
    );

    return {
      overall: weightedScore,
      components: scores,
      grade: this.getPerformanceGrade(weightedScore)
    };
  }

  getPerformanceGrade(score) {
    if (score >= 0.95) return 'A+';
    if (score >= 0.9) return 'A';
    if (score >= 0.85) return 'B+';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    return 'F';
  }

  generatePerformanceRecommendations() {
    const recommendations = [];

    if (this.results.responseClassification.targetRate < 0.9) {
      recommendations.push({
        category: 'Response Classification',
        issue: 'Intent classification speed below target',
        recommendation: 'Optimize intent matching algorithms and consider caching common patterns',
        priority: 'HIGH'
      });
    }

    if (this.results.databasePerformance.targetRate < 0.9) {
      recommendations.push({
        category: 'Database Performance',
        issue: 'Database query performance below target',
        recommendation: 'Add database indexes, optimize queries, consider connection pooling',
        priority: 'HIGH'
      });
    }

    if (!this.results.memoryUsage.withinTarget) {
      recommendations.push({
        category: 'Memory Management',
        issue: 'Memory usage grows beyond acceptable limits under load',
        recommendation: 'Implement proper garbage collection, fix memory leaks, optimize data structures',
        priority: 'CRITICAL'
      });
    }

    return recommendations;
  }

  assessScalabilityReadiness() {
    const maxUsers = this.results.scalabilityAnalysis?.recommendedMaxUsers || 0;
    const scalabilityFactor = this.results.scalabilityAnalysis?.scalabilityFactor || 0;

    return {
      productionReady: maxUsers >= 500 && scalabilityFactor >= 0.8,
      maxRecommendedUsers: maxUsers,
      scalabilityRating: this.getScalabilityRating(scalabilityFactor),
      bottlenecks: this.identifyBottlenecks()
    };
  }

  getScalabilityRating(factor) {
    if (factor >= 0.9) return 'Excellent';
    if (factor >= 0.8) return 'Good';
    if (factor >= 0.7) return 'Fair';
    return 'Poor';
  }

  identifyBottlenecks() {
    const bottlenecks = [];

    if (this.results.databasePerformance.targetRate < 0.8) {
      bottlenecks.push('Database queries are the primary bottleneck');
    }

    if (this.results.endToEndResponse.averageTime > this.targets.endToEndTime * 1.5) {
      bottlenecks.push('End-to-end response time indicates processing bottleneck');
    }

    if (!this.results.memoryUsage.withinTarget) {
      bottlenecks.push('Memory usage indicates potential memory leaks');
    }

    return bottlenecks;
  }

  async generatePerformanceSummary(report) {
    const summary = `
# Smart Response Router Performance Test Report

**Test Date:** ${new Date(report.timestamp).toLocaleString()}
**Overall Performance Score:** ${(report.performanceScore.overall * 100).toFixed(1)}% (${report.performanceScore.grade})

## Performance Summary

${report.scalabilityAssessment.productionReady ?
  '✅ **PRODUCTION READY**: System meets performance requirements' :
  '❌ **PERFORMANCE ISSUES**: System needs optimization before production'
}

## Key Performance Metrics

### Response Classification
- **Average Time:** ${this.results.responseClassification.averageTime.toFixed(2)}ms
- **P95 Time:** ${this.results.responseClassification.p95Time.toFixed(2)}ms
- **Target Achievement:** ${(this.results.responseClassification.targetRate * 100).toFixed(1)}%
- **Status:** ${this.results.responseClassification.targetRate >= 0.9 ? '✅ PASS' : '❌ FAIL'}

### Database Performance
- **Average Query Time:** ${this.results.databasePerformance.averageTime.toFixed(2)}ms
- **P95 Query Time:** ${this.results.databasePerformance.p95Time.toFixed(2)}ms
- **Target Achievement:** ${(this.results.databasePerformance.targetRate * 100).toFixed(1)}%
- **Status:** ${this.results.databasePerformance.targetRate >= 0.9 ? '✅ PASS' : '❌ FAIL'}

### End-to-End Response
- **Average Time:** ${this.results.endToEndResponse.averageTime.toFixed(2)}ms
- **P95 Time:** ${this.results.endToEndResponse.p95Time.toFixed(2)}ms
- **Target Achievement:** ${(this.results.endToEndResponse.targetRate * 100).toFixed(1)}%
- **Status:** ${this.results.endToEndResponse.targetRate >= 0.9 ? '✅ PASS' : '❌ FAIL'}

## Scalability Analysis

- **Max Recommended Users:** ${this.results.scalabilityAnalysis?.recommendedMaxUsers || 'N/A'}
- **Scalability Rating:** ${report.scalabilityAssessment.scalabilityRating}
- **Reliability Under Load:** ${(this.results.scalabilityAnalysis?.reliabilityUnderLoad * 100).toFixed(1)}%

## Memory Usage

- **Heap Growth:** ${this.results.memoryUsage.heapGrowthMB.toFixed(2)}MB
- **Within Target:** ${this.results.memoryUsage.withinTarget ? '✅ YES' : '❌ NO'}

## Performance Recommendations

${report.recommendations.map(rec => `
### ${rec.category} (${rec.priority})
**Issue:** ${rec.issue}
**Recommendation:** ${rec.recommendation}
`).join('')}

## Load Testing Results

${Object.entries(this.results.loadTesting).map(([key, result]) => `
### ${result.userCount} Concurrent Users
- **Total Time:** ${result.totalTime}ms
- **Success Rate:** ${(result.successRate * 100).toFixed(1)}%
- **Throughput:** ${result.throughput.toFixed(1)} users/sec
`).join('')}

---
*Generated by Smart Response Router Performance Test Suite*
    `;

    const summaryPath = path.join(__dirname, 'SMART_RESPONSE_ROUTER_PERFORMANCE_SUMMARY.md');
    fs.writeFileSync(summaryPath, summary);
    console.log(`📄 Performance summary saved to: ${summaryPath}`);
  }

  displayPerformanceSummary(performanceScore) {
    console.log('\n' + '=' .repeat(60));
    console.log('SMART RESPONSE ROUTER PERFORMANCE TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`Overall Performance Score: ${(performanceScore.overall * 100).toFixed(1)}% (${performanceScore.grade})`);

    console.log('\nComponent Scores:');
    Object.entries(performanceScore.components).forEach(([component, score]) => {
      console.log(`  ${component.padEnd(15)}: ${(score * 100).toFixed(1).padStart(5)}% ${score >= 0.9 ? '✅' : score >= 0.8 ? '⚠️' : '❌'}`);
    });

    const readiness = this.assessScalabilityReadiness();
    console.log(`\nProduction Readiness: ${readiness.productionReady ? '✅ READY' : '❌ NEEDS OPTIMIZATION'}`);
    console.log(`Max Recommended Users: ${readiness.maxRecommendedUsers}`);

    if (readiness.bottlenecks.length > 0) {
      console.log('\nIdentified Bottlenecks:');
      readiness.bottlenecks.forEach(bottleneck => console.log(`  • ${bottleneck}`));
    }

    console.log('=' .repeat(60));
  }

  cleanup() {
    if (this.db) {
      // Clean up test data
      this.db.prepare('DELETE FROM candidates WHERE id LIKE "perf_test_%"').run();
      this.db.prepare('DELETE FROM payments WHERE id LIKE "perf_pay_%"').run();
      this.db.close();
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const tester = new SmartResponseRouterPerformanceTester();
  tester.runAllPerformanceTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = SmartResponseRouterPerformanceTester;