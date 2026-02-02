/**
 * Intent Classifier Usage Examples
 *
 * Comprehensive examples showing how to use the lightweight intent classification system
 * in different scenarios and integrations.
 */

const intentClassifier = require('./index');
const integration = require('./integration');
const testSuite = require('./test-classifier');

/**
 * Basic Intent Classification Examples
 */
async function basicExamples() {
  console.log('🎯 Basic Intent Classification Examples\n');

  const examples = [
    'When will I get paid ah?',
    'account approved or not',
    'got job available',
    'app cannot login lah',
    'URGENT need help now!',
    'want to schedule interview',
    'hello good morning'
  ];

  for (const message of examples) {
    const result = intentClassifier.classifyIntent(message);

    console.log(`📝 "${message}"`);
    console.log(`🎯 Intent: ${result.intent}`);
    console.log(`📊 Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`⚡ Time: ${result.processingTimeMs}ms`);
    console.log(`🔍 Pattern: ${result.matchedPattern}`);
    console.log('---');
  }
}

/**
 * Context-Aware Classification Examples
 */
async function contextAwareExamples() {
  console.log('🎯 Context-Aware Classification Examples\n');

  const scenarios = [
    {
      message: 'when approve',
      context: {
        candidate: { status: 'pending', created_at: '2024-01-01T00:00:00Z' }
      },
      description: 'Pending user asking about approval'
    },
    {
      message: 'got job',
      context: {
        candidate: { status: 'active', total_jobs_completed: 5 }
      },
      description: 'Active user looking for work'
    },
    {
      message: 'help urgent',
      context: {
        timeOfDay: 'late_night',
        channel: 'telegram'
      },
      description: 'Late night urgent request via Telegram'
    },
    {
      message: 'payment when',
      context: {
        candidate: { status: 'active', total_jobs_completed: 0 }
      },
      description: 'Payment inquiry from user with no completed jobs'
    }
  ];

  for (const scenario of scenarios) {
    console.log(`📋 Scenario: ${scenario.description}`);
    console.log(`📝 Message: "${scenario.message}"`);

    const result = intentClassifier.classifyIntent(scenario.message, scenario.context);

    console.log(`🎯 Intent: ${result.intent}`);
    console.log(`📊 Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`🔄 Context Boost: ${result.contextBoost || 'none'}`);
    console.log(`⚠️ Priority: ${result.priority}`);
    console.log('---');
  }
}

/**
 * AI Chat Integration Examples
 */
async function aiChatIntegrationExamples() {
  console.log('🤖 AI Chat Integration Examples\n');

  const testCases = [
    { candidateId: 'user-001', message: 'When will I get paid for last week job?' },
    { candidateId: 'user-002', message: 'account still pending leh when approve' },
    { candidateId: 'user-003', message: 'any f&b job available this weekend' },
    { candidateId: 'user-004', message: 'app keep crashing cannot login' },
    { candidateId: 'user-005', message: 'VERY ANGRY with your service want to complain!' }
  ];

  for (const testCase of testCases) {
    console.log(`👤 User: ${testCase.candidateId}`);
    console.log(`📝 Message: "${testCase.message}"`);

    try {
      const result = await integration.classifyForAIChat(
        testCase.candidateId,
        testCase.message,
        'app'
      );

      console.log(`🎯 Intent: ${result.intent}`);
      console.log(`📊 Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`🔄 Strategy: ${result.responseStrategy}`);
      console.log(`⚠️ Escalation: ${result.escalationLevel}`);
      console.log(`🎮 Recommendations:`, JSON.stringify(result.aiChatRecommendations, null, 2));
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('---');
  }
}

/**
 * Batch Processing Examples
 */
async function batchProcessingExamples() {
  console.log('📦 Batch Processing Examples\n');

  const messages = [
    { text: 'payment when ah', context: {} },
    { text: 'job got or not', context: {} },
    { text: 'cannot login sia', context: {} },
    { text: 'urgent help needed', context: {} },
    { text: 'interview can schedule', context: {} },
    { text: 'account approve liao meh', context: {} },
    { text: 'hello good morning', context: {} }
  ];

  const startTime = Date.now();
  const results = intentClassifier.classifyBatch(messages);
  const totalTime = Date.now() - startTime;

  console.log(`📊 Processed ${messages.length} messages in ${totalTime}ms`);
  console.log(`⚡ Average time per message: ${(totalTime / messages.length).toFixed(1)}ms\n`);

  // Distribution analysis
  const distribution = {};
  results.forEach(result => {
    distribution[result.intent] = (distribution[result.intent] || 0) + 1;
  });

  console.log('📈 Intent Distribution:');
  Object.entries(distribution).forEach(([intent, count]) => {
    console.log(`  ${intent}: ${count} (${((count / results.length) * 100).toFixed(1)}%)`);
  });

  console.log('\n🎯 Detailed Results:');
  results.forEach((result, index) => {
    console.log(`${index + 1}. "${messages[index].text}" → ${result.intent} (${result.confidence.toFixed(2)})`);
  });
}

/**
 * Singlish Expression Examples
 */
async function singlishExamples() {
  console.log('🇸🇬 Singlish Expression Examples\n');

  const singlishTests = [
    { text: 'payment come liao anot', expected: 'payment_inquiry' },
    { text: 'job got or not sia', expected: 'job_search' },
    { text: 'app spoil lah cannot login', expected: 'technical_issue' },
    { text: 'help lah very urgent', expected: 'urgent_escalation' },
    { text: 'interview can book or not', expected: 'interview_scheduling' },
    { text: 'account approve liao meh', expected: 'verification_question' },
    { text: 'wah hello morning ah', expected: 'general_help' },
    { text: 'alamak forgot password again', expected: 'technical_issue' },
    { text: 'paiseh late reply, job still available', expected: 'job_search' },
    { text: 'confirm plus chop urgent need help', expected: 'urgent_escalation' }
  ];

  let correct = 0;

  for (const test of singlishTests) {
    const result = intentClassifier.classifyIntent(test.text);
    const isCorrect = result.intent === test.expected;

    if (isCorrect) correct++;

    console.log(`${isCorrect ? '✅' : '❌'} "${test.text}"`);
    console.log(`   → ${result.intent} (${result.confidence.toFixed(2)}) [expected: ${test.expected}]`);
  }

  const accuracy = (correct / singlishTests.length) * 100;
  console.log(`\n📊 Singlish Recognition Accuracy: ${accuracy.toFixed(1)}% (${correct}/${singlishTests.length})`);
}

/**
 * Performance Benchmarking Examples
 */
async function performanceBenchmarkExamples() {
  console.log('⚡ Performance Benchmarking Examples\n');

  // Single message performance test
  console.log('🎯 Single Message Performance:');
  const testMessage = 'When will I get paid for the job I worked last week?';
  const iterations = 1000;

  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    intentClassifier.classifyIntent(testMessage);
    times.push(Date.now() - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];

  console.log(`  Average: ${avgTime.toFixed(2)}ms`);
  console.log(`  Min: ${minTime}ms`);
  console.log(`  Max: ${maxTime}ms`);
  console.log(`  P95: ${p95}ms`);
  console.log(`  Target: < 100ms (${avgTime < 100 ? '✅ PASS' : '❌ FAIL'})\n`);

  // Concurrent processing test
  console.log('🔄 Concurrent Processing:');
  const concurrentMessages = Array(100).fill(testMessage);

  const concurrentStart = Date.now();
  const concurrentResults = intentClassifier.classifyBatch(concurrentMessages);
  const concurrentTotal = Date.now() - concurrentStart;

  console.log(`  100 messages processed in ${concurrentTotal}ms`);
  console.log(`  Average per message: ${(concurrentTotal / 100).toFixed(1)}ms`);
  console.log(`  Throughput: ${(100000 / concurrentTotal).toFixed(0)} messages/second\n`);

  // Memory usage
  const memUsage = process.memoryUsage();
  console.log('💾 Memory Usage:');
  console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Error Handling Examples
 */
async function errorHandlingExamples() {
  console.log('🛠️ Error Handling Examples\n');

  const errorCases = [
    { input: null, description: 'Null input' },
    { input: '', description: 'Empty string' },
    { input: undefined, description: 'Undefined input' },
    { input: 123, description: 'Number input' },
    { input: {}, description: 'Object input' },
    { input: 'a'.repeat(10000), description: 'Very long string (10k chars)' },
    { input: '🚀🎯💻🇸🇬', description: 'Only emojis' },
    { input: '!!!???...', description: 'Only punctuation' }
  ];

  for (const errorCase of errorCases) {
    try {
      console.log(`🧪 Testing: ${errorCase.description}`);
      const result = intentClassifier.classifyIntent(errorCase.input);
      console.log(`   → Intent: ${result.intent}, Confidence: ${result.confidence.toFixed(2)}`);
      console.log(`   → Time: ${result.processingTimeMs}ms`);

      if (result.error) {
        console.log(`   → Error handled: ${result.error}`);
      }
    } catch (error) {
      console.log(`   → Exception: ${error.message}`);
    }
    console.log('');
  }
}

/**
 * Integration Testing Examples
 */
async function integrationTestingExamples() {
  console.log('🔗 Integration Testing Examples\n');

  try {
    console.log('📋 Running test suite...');
    await integration.testIntegration();

    console.log('\n🧪 Running comprehensive tests...');
    testSuite.testSinglishHandling();

    console.log('\n📊 Getting system statistics...');
    const stats = intentClassifier.getPerformanceStats();
    console.log('System Statistics:', JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('Integration test error:', error.message);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🎮 Intent Classifier Examples\n');
  console.log('='.repeat(60));

  try {
    await basicExamples();
    console.log('\n' + '='.repeat(60));

    await contextAwareExamples();
    console.log('\n' + '='.repeat(60));

    await aiChatIntegrationExamples();
    console.log('\n' + '='.repeat(60));

    await batchProcessingExamples();
    console.log('\n' + '='.repeat(60));

    await singlishExamples();
    console.log('\n' + '='.repeat(60));

    await performanceBenchmarkExamples();
    console.log('\n' + '='.repeat(60));

    await errorHandlingExamples();
    console.log('\n' + '='.repeat(60));

    await integrationTestingExamples();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example execution failed:', error.message);
  }
}

// Export individual examples for targeted testing
module.exports = {
  basicExamples,
  contextAwareExamples,
  aiChatIntegrationExamples,
  batchProcessingExamples,
  singlishExamples,
  performanceBenchmarkExamples,
  errorHandlingExamples,
  integrationTestingExamples,
  runAllExamples
};

// Run examples if called directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}