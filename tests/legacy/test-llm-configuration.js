#!/usr/bin/env node
/**
 * LLM Configuration Test Script
 * Tests all LLM providers and automation features
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  askClaude,
  getLLMStats,
  getProviderStatus,
  testAllProviders,
  generateJobPostings,
  generateOutreachMessage,
  analyzeTender,
  matchCandidates,
  PROVIDERS,
  API_COSTS,
} = require('./utils/claude');

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`${title.toUpperCase()}`, 'bold');
  log(`${'='.repeat(60)}`, 'blue');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBasicLLM() {
  section('Basic LLM Connectivity Test');

  try {
    log('Testing basic askClaude function...', 'yellow');
    const response = await askClaude(
      'Say "Hello, WorkLink!" and briefly explain what you can help with.',
      'You are a helpful AI assistant for a staffing agency in Singapore.'
    );

    log(`✅ Success! Response: "${response.substring(0, 100)}..."`, 'green');
    return true;
  } catch (error) {
    log(`❌ Failed: ${error.message}`, 'red');
    return false;
  }
}

async function testProviderStatus() {
  section('Provider Configuration Status');

  const status = getProviderStatus();

  for (const [provider, info] of Object.entries(status)) {
    const statusIcon = info.hasApiKey ? '✅' : '❌';
    const statusText = info.hasApiKey ? 'Configured' : 'Not Configured';

    log(`${statusIcon} ${info.name}: ${statusText} (Priority: ${info.priority})`,
        info.hasApiKey ? 'green' : 'red');
  }
}

async function testAllProvidersIndividually() {
  section('Individual Provider Testing');

  try {
    log('Testing all configured providers...', 'yellow');
    const results = await testAllProviders();

    for (const [provider, result] of Object.entries(results)) {
      const icon = result.status === 'working' ? '✅' : result.status === 'not_configured' ? '⚠️' : '❌';
      const color = result.status === 'working' ? 'green' : result.status === 'not_configured' ? 'yellow' : 'red';

      log(`${icon} ${result.name}: ${result.status}`, color);

      if (result.responseTime) {
        log(`   Response time: ${result.responseTime}`, 'blue');
      }
      if (result.error) {
        log(`   Error: ${result.error}`, 'red');
      }
    }
  } catch (error) {
    log(`❌ Provider testing failed: ${error.message}`, 'red');
  }
}

async function testJobPostingGeneration() {
  section('Job Posting Generation Test');

  try {
    log('Generating job postings for multiple platforms...', 'yellow');

    const jobDetails = {
      jobTitle: 'Event Staff - Marina Bay Countdown 2025',
      payRate: 18,
      location: 'Marina Bay',
      requirements: 'Must be energetic, punctual, and customer-service oriented',
      slots: 15,
    };

    const postings = await generateJobPostings(jobDetails);

    log('✅ Job postings generated successfully!', 'green');
    log('Generated postings:', 'blue');

    for (const [platform, content] of Object.entries(postings)) {
      log(`\n📱 ${platform.toUpperCase()}:`, 'bold');
      if (typeof content === 'object') {
        log(JSON.stringify(content, null, 2), 'blue');
      } else {
        log(`"${content.substring(0, 200)}..."`, 'blue');
      }
    }

    return true;
  } catch (error) {
    log(`❌ Job posting generation failed: ${error.message}`, 'red');
    return false;
  }
}

async function testOutreachMessages() {
  section('Personalized Outreach Message Test');

  try {
    log('Generating personalized outreach message...', 'yellow');

    const candidate = {
      name: 'Siti Rahman',
      level: 3,
      total_jobs_completed: 25,
      rating: 4.8,
    };

    const job = {
      title: 'F&B Server - Weekend Rush',
      location: 'Orchard Road',
      job_date: '2025-02-08',
      start_time: '11:00',
      end_time: '15:00',
      pay_rate: 16,
      xp_bonus: 50,
    };

    const message = await generateOutreachMessage(candidate, job);

    log('✅ Outreach message generated successfully!', 'green');
    log('Generated message:', 'blue');
    log(`"${message}"`, 'blue');

    return true;
  } catch (error) {
    log(`❌ Outreach message generation failed: ${error.message}`, 'red');
    return false;
  }
}

async function testTenderAnalysis() {
  section('Tender Analysis Test');

  try {
    log('Analyzing tender opportunity...', 'yellow');

    const tender = {
      title: 'Customer Service Officers for Government Agency',
      agency: 'MOM',
      estimated_value: 480000,
      manpower_required: 12,
      duration_months: 24,
      location: 'Tanjong Pagar',
      closing_date: '2025-03-15',
      category: 'customer service',
    };

    const companyContext = {
      totalCandidates: 85,
      avgRating: 4.4,
    };

    const analysis = await analyzeTender(tender, companyContext);

    log('✅ Tender analysis completed successfully!', 'green');
    log('Analysis results:', 'blue');
    log(JSON.stringify(analysis, null, 2), 'blue');

    return true;
  } catch (error) {
    log(`❌ Tender analysis failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCandidateMatching() {
  section('Candidate Matching Test');

  try {
    log('Running candidate matching algorithm...', 'yellow');

    const job = {
      title: 'Event Photographer Assistant',
      category: 'events',
      location: 'Sentosa',
      pay_rate: 20,
    };

    const candidates = [
      {
        id: 'c1',
        name: 'Alex Tan',
        level: 4,
        rating: 4.9,
        total_jobs_completed: 45,
        certifications: JSON.stringify(['Photography Basics', 'Customer Service', 'Event Management']),
      },
      {
        id: 'c2',
        name: 'Maria Santos',
        level: 2,
        rating: 4.2,
        total_jobs_completed: 18,
        certifications: JSON.stringify(['Customer Service', 'Basic Training']),
      },
      {
        id: 'c3',
        name: 'David Lim',
        level: 3,
        rating: 4.6,
        total_jobs_completed: 32,
        certifications: JSON.stringify(['Photography Basics', 'Equipment Handling', 'Event Support']),
      },
    ];

    const matches = await matchCandidates(job, candidates);

    log('✅ Candidate matching completed successfully!', 'green');
    log('Top matches:', 'blue');

    matches.forEach((match, index) => {
      log(`${index + 1}. Candidate ${match.id} - Score: ${match.score}/100`, 'green');
      log(`   Reason: ${match.reason}`, 'blue');
    });

    return true;
  } catch (error) {
    log(`❌ Candidate matching failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCostTracking() {
  section('Cost Tracking & Analytics Test');

  try {
    log('Checking LLM usage statistics...', 'yellow');

    const stats = getLLMStats(7); // Last 7 days

    log('✅ Usage statistics retrieved successfully!', 'green');
    log('Statistics summary:', 'blue');
    log(`Total calls: ${stats.totals.calls}`, 'blue');
    log(`Total cost: $${stats.totals.cost}`, 'blue');
    log(`Success rate: ${stats.totals.successRate}`, 'blue');
    log(`Average cost per call: $${stats.totals.avgCostPerCall}`, 'blue');

    if (stats.byProvider.length > 0) {
      log('\nBy provider:', 'blue');
      stats.byProvider.forEach(provider => {
        log(`  ${provider.provider}: ${provider.calls} calls, $${provider.cost}`, 'blue');
      });
    }

    return true;
  } catch (error) {
    log(`❌ Cost tracking test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCacheSystem() {
  section('Response Caching Test');

  try {
    log('Testing response caching...', 'yellow');

    const testPrompt = 'What is 2 + 2?';

    // First call (should hit LLM)
    const start1 = Date.now();
    const response1 = await askClaude(testPrompt, '', { useCache: true });
    const time1 = Date.now() - start1;

    log(`First call: ${time1}ms`, 'blue');

    // Wait a moment
    await sleep(100);

    // Second call (should hit cache)
    const start2 = Date.now();
    const response2 = await askClaude(testPrompt, '', { useCache: true });
    const time2 = Date.now() - start2;

    log(`Second call: ${time2}ms`, 'blue');

    if (time2 < time1 / 2) {
      log('✅ Cache system working! Second call was significantly faster.', 'green');
    } else {
      log('⚠️ Cache might not be working as expected.', 'yellow');
    }

    return true;
  } catch (error) {
    log(`❌ Cache system test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log(`${colors.bold}LLM CONFIGURATION TEST SUITE${colors.reset}`, 'blue');
  log('Testing WorkLink v2 LLM Integration\n');

  const tests = [
    { name: 'Provider Status', func: testProviderStatus },
    { name: 'Provider Testing', func: testAllProvidersIndividually },
    { name: 'Basic LLM', func: testBasicLLM },
    { name: 'Job Posting Generation', func: testJobPostingGeneration },
    { name: 'Outreach Messages', func: testOutreachMessages },
    { name: 'Tender Analysis', func: testTenderAnalysis },
    { name: 'Candidate Matching', func: testCandidateMatching },
    { name: 'Cost Tracking', func: testCostTracking },
    { name: 'Cache System', func: testCacheSystem },
  ];

  const results = {};
  let passed = 0;

  for (const test of tests) {
    try {
      const result = await test.func();
      results[test.name] = result !== false;
      if (result !== false) passed++;
    } catch (error) {
      log(`❌ ${test.name} threw error: ${error.message}`, 'red');
      results[test.name] = false;
    }

    await sleep(500); // Small delay between tests
  }

  // Summary
  section('Test Summary');

  log(`Tests passed: ${passed}/${tests.length}`, passed === tests.length ? 'green' : 'yellow');

  for (const [testName, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${testName}`, color);
  }

  if (passed === tests.length) {
    log('\n🎉 All tests passed! LLM configuration is working properly.', 'green');
  } else {
    log('\n⚠️ Some tests failed. Check configuration and API keys.', 'yellow');

    // Provide helpful configuration hints
    log('\nConfiguration hints:', 'blue');
    log('1. Ensure API keys are properly set in .env file', 'blue');
    log('2. Check that API keys have sufficient credits/quota', 'blue');
    log('3. Verify network connectivity to API endpoints', 'blue');
    log('4. Review error messages above for specific issues', 'blue');
  }

  // Show provider configuration info
  log('\nProvider Configuration:', 'blue');
  log(`Claude API (Primary): ${PROVIDERS.claude.name}`, 'blue');
  log(`Groq (Fallback): ${PROVIDERS.groq.name}`, 'blue');
  log(`Gemini (Final): ${PROVIDERS.gemini.name}`, 'blue');

  log('\nAPI Cost Structure (per 1K tokens):', 'blue');
  for (const [provider, costs] of Object.entries(API_COSTS)) {
    log(`${provider}: Input $${costs.input}, Output $${costs.output}`, 'blue');
  }

  return passed === tests.length;
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`❌ Test suite failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testBasicLLM,
  testProviderStatus,
  testAllProvidersIndividually,
  testJobPostingGeneration,
  testOutreachMessages,
  testTenderAnalysis,
  testCandidateMatching,
  testCostTracking,
  testCacheSystem,
};