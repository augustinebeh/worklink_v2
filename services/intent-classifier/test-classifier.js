/**
 * Intent Classifier Test Suite
 *
 * Comprehensive testing for the intent classification system.
 * Tests all categories, edge cases, and performance requirements.
 */

const intentClassifier = require('./index');

// Test cases organized by intent category
const TEST_CASES = {
  payment_inquiry: [
    { text: "When will I get paid ah?", expectedConfidence: 0.8 },
    { text: "payment not received yet", expectedConfidence: 0.85 },
    { text: "where is my money", expectedConfidence: 0.8 },
    { text: "how much I earn this month", expectedConfidence: 0.8 },
    { text: "salary come when ah", expectedConfidence: 0.8 },
    { text: "money not in account lah", expectedConfidence: 0.8 },
    { text: "withdraw money how ah", expectedConfidence: 0.75 },
    { text: "payment method what", expectedConfidence: 0.7 },
    { text: "$50 for yesterday job got or not", expectedConfidence: 0.75 }
  ],

  verification_question: [
    { text: "account approved already anot?", expectedConfidence: 0.8 },
    { text: "when will my account be verified", expectedConfidence: 0.85 },
    { text: "still pending leh", expectedConfidence: 0.8 },
    { text: "how long must wait for approval", expectedConfidence: 0.8 },
    { text: "what documents need ah", expectedConfidence: 0.75 },
    { text: "verification status how", expectedConfidence: 0.8 },
    { text: "account ready to work or not", expectedConfidence: 0.8 },
    { text: "admin check liao or not", expectedConfidence: 0.8 }
  ],

  job_search: [
    { text: "any jobs available?", expectedConfidence: 0.8 },
    { text: "got work or not", expectedConfidence: 0.8 },
    { text: "looking for job lah", expectedConfidence: 0.85 },
    { text: "want to work weekend", expectedConfidence: 0.75 },
    { text: "f&b job got", expectedConfidence: 0.8 },
    { text: "CBD area job available", expectedConfidence: 0.75 },
    { text: "evening shift got or not", expectedConfidence: 0.7 },
    { text: "apply job how ah", expectedConfidence: 0.8 }
  ],

  technical_issue: [
    { text: "cannot login to app", expectedConfidence: 0.9 },
    { text: "app not working leh", expectedConfidence: 0.85 },
    { text: "password wrong lah", expectedConfidence: 0.8 },
    { text: "app crash everytime", expectedConfidence: 0.85 },
    { text: "notification not coming", expectedConfidence: 0.8 },
    { text: "cannot upload photo", expectedConfidence: 0.8 },
    { text: "loading very slow", expectedConfidence: 0.75 },
    { text: "app hang liao", expectedConfidence: 0.8 }
  ],

  urgent_escalation: [
    { text: "URGENT help needed!", expectedConfidence: 0.85 },
    { text: "very jialat need help now", expectedConfidence: 0.8 },
    { text: "angry with your service", expectedConfidence: 0.8 },
    { text: "want to complain", expectedConfidence: 0.8 },
    { text: "need help ASAP!!!", expectedConfidence: 0.85 },
    { text: "speak to manager please", expectedConfidence: 0.8 },
    { text: "die die must get help today", expectedConfidence: 0.8 }
  ],

  interview_scheduling: [
    { text: "want to schedule interview", expectedConfidence: 0.9 },
    { text: "can book appointment anot", expectedConfidence: 0.85 },
    { text: "interview slot got", expectedConfidence: 0.8 },
    { text: "when can meet ah", expectedConfidence: 0.7 },
    { text: "available for interview tomorrow", expectedConfidence: 0.8 },
    { text: "verification interview need or not", expectedConfidence: 0.8 }
  ],

  general_help: [
    { text: "hello", expectedConfidence: 0.8 },
    { text: "hi can help me", expectedConfidence: 0.7 },
    { text: "good morning", expectedConfidence: 0.8 },
    { text: "how are you", expectedConfidence: 0.6 },
    { text: "what is WorkLink", expectedConfidence: 0.75 },
    { text: "help lah", expectedConfidence: 0.7 },
    { text: "thank you", expectedConfidence: 0.8 }
  ]
};

// Edge cases and challenging scenarios
const EDGE_CASES = [
  { text: "", intent: "general_help", description: "Empty message" },
  { text: "a", intent: "general_help", description: "Single character" },
  { text: "????????????", intent: "general_help", description: "Non-English characters" },
  { text: "123456", intent: "general_help", description: "Only numbers" },
  { text: "job payment interview urgent help", intent: "urgent_escalation", description: "Multiple intent keywords" },
  { text: "urgent job payment asap", intent: "urgent_escalation", description: "Competing high-priority intents" },
  { text: "can help with payment for job interview scheduling", intent: "payment_inquiry", description: "Long mixed intent sentence" }
];

// Performance test messages
const PERFORMANCE_TESTS = [
  "When will I get my payment for the job I worked last week at Marina Bay Sands?",
  "急急急！！！app cannot login need help urgent lah!!!",
  "Hello good morning can help me schedule verification interview asap please thanks",
  "got f&b job at CBD area for weekend part time or not ah want to apply",
  "account pending for 5 days already when will approve very sian leh",
  "payment method what ah can use PayNow or must bank transfer only",
  "app keep crashing when upload IC photo very jialat cannot complete profile",
  "looking for evening shift job around Jurong area got or not available immediately"
];

// Context test scenarios
const CONTEXT_SCENARIOS = [
  {
    message: "when approve",
    context: { candidate: { status: 'pending', created_at: '2024-01-01T00:00:00Z' } },
    expectedIntent: 'verification_question',
    description: "Pending user asking about approval"
  },
  {
    message: "got job",
    context: { candidate: { status: 'active', total_jobs_completed: 5 } },
    expectedIntent: 'job_search',
    description: "Active user looking for work"
  },
  {
    message: "help urgent",
    context: { timeOfDay: 'late_night', channel: 'telegram' },
    expectedIntent: 'urgent_escalation',
    description: "Late night urgent request via Telegram"
  },
  {
    message: "payment when",
    context: { candidate: { status: 'active', total_jobs_completed: 0 } },
    expectedIntent: 'payment_inquiry',
    expectedLowConfidence: true,
    description: "Payment inquiry from user with no completed jobs"
  }
];

/**
 * Run comprehensive test suite
 */
function runTestSuite() {
  console.log('🧪 Starting Intent Classifier Test Suite\n');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    performance: {
      totalTime: 0,
      avgTime: 0,
      slowTests: []
    },
    details: []
  };

  // Test each intent category
  for (const [intent, testCases] of Object.entries(TEST_CASES)) {
    console.log(`\n📋 Testing ${intent.toUpperCase()}`);
    console.log('='.repeat(50));

    for (const testCase of testCases) {
      const result = runSingleTest(testCase.text, intent, testCase.expectedConfidence);
      results.details.push(result);

      if (result.passed) {
        results.passed++;
        console.log(`✅ "${testCase.text}" → ${result.classifiedAs} (${result.confidence.toFixed(2)})`);
      } else {
        results.failed++;
        console.log(`❌ "${testCase.text}" → ${result.classifiedAs} (${result.confidence.toFixed(2)}) [Expected: ${intent}]`);
      }

      // Track performance
      results.performance.totalTime += result.processingTime;
      if (result.processingTime > 100) {
        results.performance.slowTests.push({
          text: testCase.text,
          time: result.processingTime
        });
      }
    }
  }

  // Test edge cases
  console.log('\n🔍 Testing Edge Cases');
  console.log('='.repeat(50));

  for (const edgeCase of EDGE_CASES) {
    const result = runSingleTest(edgeCase.text, edgeCase.intent);
    results.details.push(result);

    if (result.classifiedAs === edgeCase.intent) {
      results.passed++;
      console.log(`✅ ${edgeCase.description}: "${edgeCase.text}" → ${result.classifiedAs}`);
    } else {
      results.failed++;
      console.log(`❌ ${edgeCase.description}: "${edgeCase.text}" → ${result.classifiedAs} [Expected: ${edgeCase.intent}]`);
    }
  }

  // Test performance requirements
  console.log('\n⚡ Performance Testing');
  console.log('='.repeat(50));

  const perfStartTime = Date.now();
  const perfResults = [];

  for (const message of PERFORMANCE_TESTS) {
    const startTime = Date.now();
    const classification = intentClassifier.classifyIntent(message);
    const endTime = Date.now();

    const processingTime = endTime - startTime;
    perfResults.push(processingTime);

    console.log(`📊 ${processingTime}ms: "${message.substring(0, 50)}..." → ${classification.intent}`);

    if (processingTime > 100) {
      results.warnings++;
      console.log(`⚠️  Slow classification: ${processingTime}ms (target: <100ms)`);
    }
  }

  const perfTotalTime = Date.now() - perfStartTime;
  results.performance.avgTime = perfResults.reduce((a, b) => a + b, 0) / perfResults.length;

  // Test context scenarios
  console.log('\n🎯 Context-Aware Testing');
  console.log('='.repeat(50));

  for (const scenario of CONTEXT_SCENARIOS) {
    const result = intentClassifier.classifyIntent(scenario.message, scenario.context);

    if (result.intent === scenario.expectedIntent) {
      results.passed++;
      console.log(`✅ ${scenario.description}: "${scenario.message}" → ${result.intent} (${result.confidence.toFixed(2)})`);
    } else {
      if (scenario.expectedLowConfidence && result.confidence < 0.5) {
        results.passed++;
        console.log(`✅ ${scenario.description}: "${scenario.message}" → ${result.intent} (${result.confidence.toFixed(2)}) [Low confidence expected]`);
      } else {
        results.failed++;
        console.log(`❌ ${scenario.description}: "${scenario.message}" → ${result.intent} [Expected: ${scenario.expectedIntent}]`);
      }
    }
  }

  // Print summary
  printTestSummary(results);

  return results;
}

/**
 * Run a single test case
 */
function runSingleTest(text, expectedIntent, expectedConfidence = null) {
  const startTime = Date.now();
  const result = intentClassifier.classifyIntent(text);
  const endTime = Date.now();

  const passed = result.intent === expectedIntent &&
                 (!expectedConfidence || result.confidence >= expectedConfidence);

  return {
    text,
    expectedIntent,
    classifiedAs: result.intent,
    confidence: result.confidence,
    processingTime: endTime - startTime,
    passed
  };
}

/**
 * Print test summary
 */
function printTestSummary(results) {
  console.log('\n📊 TEST SUMMARY');
  console.log('='.repeat(50));

  const total = results.passed + results.failed;
  const successRate = ((results.passed / total) * 100).toFixed(1);

  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`📈 Success Rate: ${successRate}%`);

  console.log('\n⏱️  PERFORMANCE METRICS');
  console.log('='.repeat(30));
  console.log(`Average Processing Time: ${results.performance.avgTime.toFixed(1)}ms`);
  console.log(`Target: < 100ms per classification`);

  if (results.performance.slowTests.length > 0) {
    console.log('\n🐌 Slow Tests (>100ms):');
    results.performance.slowTests.forEach(test => {
      console.log(`  ${test.time}ms: "${test.text.substring(0, 40)}..."`);
    });
  }

  console.log('\n🎯 CLASSIFICATION DISTRIBUTION');
  console.log('='.repeat(35));
  const distribution = {};
  results.details.forEach(detail => {
    distribution[detail.classifiedAs] = (distribution[detail.classifiedAs] || 0) + 1;
  });

  Object.entries(distribution).forEach(([intent, count]) => {
    console.log(`${intent}: ${count}`);
  });
}

/**
 * Benchmark performance with multiple runs
 */
function benchmarkPerformance(iterations = 1000) {
  console.log(`\n🏁 Performance Benchmark (${iterations} iterations)`);
  console.log('='.repeat(50));

  const testMessage = "When will I get paid for my job last week?";
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    intentClassifier.classifyIntent(testMessage);
    const end = Date.now();
    times.push(end - start);
  }

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const medianTime = times.sort((a, b) => a - b)[Math.floor(times.length / 2)];

  console.log(`Average: ${avgTime.toFixed(1)}ms`);
  console.log(`Median: ${medianTime}ms`);
  console.log(`Min: ${minTime}ms`);
  console.log(`Max: ${maxTime}ms`);
  console.log(`95th Percentile: ${times[Math.floor(times.length * 0.95)]}ms`);

  const sub100ms = times.filter(t => t < 100).length;
  const sub50ms = times.filter(t => t < 50).length;

  console.log(`\n📊 Performance Distribution:`);
  console.log(`< 50ms: ${sub50ms}/${iterations} (${((sub50ms/iterations)*100).toFixed(1)}%)`);
  console.log(`< 100ms: ${sub100ms}/${iterations} (${((sub100ms/iterations)*100).toFixed(1)}%)`);
}

/**
 * Test Singlish handling specifically
 */
function testSinglishHandling() {
  console.log('\n🇸🇬 Singlish Handling Test');
  console.log('='.repeat(30));

  const singlishTests = [
    { text: "payment come liao anot", intent: "payment_inquiry" },
    { text: "job got or not sia", intent: "job_search" },
    { text: "app spoil lah cannot login", intent: "technical_issue" },
    { text: "help lah very urgent", intent: "urgent_escalation" },
    { text: "interview can book or not", intent: "interview_scheduling" },
    { text: "account approve liao meh", intent: "verification_question" },
    { text: "wah hello morning", intent: "general_help" }
  ];

  singlishTests.forEach(test => {
    const result = intentClassifier.classifyIntent(test.text);
    const success = result.intent === test.intent;

    console.log(`${success ? '✅' : '❌'} "${test.text}" → ${result.intent} (${result.confidence.toFixed(2)})`);
  });
}

// Export test functions
module.exports = {
  runTestSuite,
  benchmarkPerformance,
  testSinglishHandling
};

// Run tests if called directly
if (require.main === module) {
  runTestSuite();
  benchmarkPerformance(100);
  testSinglishHandling();
}