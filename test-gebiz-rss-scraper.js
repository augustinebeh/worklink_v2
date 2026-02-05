/**
 * GeBIZ RSS Scraper Test Script
 * Tests all components of the RSS scraping system
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const GeBIZRSSParser = require('./services/scraping/gebizRssParser');
const DataLifecycleManager = require('./services/scraping/dataLifecycleManager');
const GeBIZRSSOrchestrator = require('./services/scraping/gebizRssOrchestrator');
const GeBIZRSSScheduler = require('./services/scraping/gebizRssScheduler');
const { scrapingService } = require('./services/scraping');

class GeBIZRSSTest {
  constructor() {
    this.testResults = {
      parser: null,
      lifecycleManager: null,
      orchestrator: null,
      scheduler: null,
      integration: null
    };
  }

  async runAllTests() {
    console.log('🧪 Starting GeBIZ RSS Scraper Test Suite');
    console.log('=' .repeat(50));

    try {
      // Test 1: RSS Parser
      console.log('\n📡 Testing RSS Parser...');
      await this.testRSSParser();

      // Test 2: Data Lifecycle Manager
      console.log('\n📝 Testing Data Lifecycle Manager...');
      await this.testLifecycleManager();

      // Test 3: Orchestrator
      console.log('\n🎯 Testing Orchestrator...');
      await this.testOrchestrator();

      // Test 4: Scheduler
      console.log('\n⏰ Testing Scheduler...');
      await this.testScheduler();

      // Test 5: Integration Service
      console.log('\n🔗 Testing Integration Service...');
      await this.testIntegrationService();

      // Summary
      console.log('\n📊 Test Summary');
      console.log('=' .repeat(30));
      this.printTestResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      console.error(error.stack);
    }
  }

  async testRSSParser() {
    try {
      const parser = new GeBIZRSSParser();

      console.log('  ⏳ Parsing RSS feed...');
      const result = await parser.parseRSSFeed();

      console.log(`  ✅ Parser test completed`);
      console.log(`     📋 Total items: ${result.feedMetadata?.totalItems || 0}`);
      console.log(`     🆕 New tenders: ${result.newTenders}`);
      console.log(`     🔄 Duplicates: ${result.duplicates}`);
      console.log(`     ❌ Errors: ${result.errors}`);

      // Check parser stats
      const stats = parser.getStats();
      console.log(`     📈 Success rate: ${stats.successRate}`);
      console.log(`     🏥 Health status: ${stats.isHealthy ? 'Healthy' : 'Issues'}`);

      this.testResults.parser = {
        success: result.success,
        newTenders: result.newTenders,
        errors: result.errors,
        stats: stats
      };

    } catch (error) {
      console.error('  ❌ Parser test failed:', error.message);
      this.testResults.parser = { success: false, error: error.message };
    }
  }

  async testLifecycleManager() {
    try {
      const lifecycleManager = new DataLifecycleManager();

      // Create mock tender data for testing
      const mockTenders = [
        {
          tender_no: `TEST-${Date.now()}`,
          title: 'Test Manpower Services for Government Agency',
          agency: 'MOH',
          description: 'Testing lifecycle management with mock data',
          published_date: new Date().toISOString().split('T')[0],
          closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'manpower_services',
          priority: 'high',
          source_url: 'https://example.com/test'
        }
      ];

      console.log('  ⏳ Creating lifecycle cards...');
      const result = await lifecycleManager.createLifecycleCards(mockTenders);

      console.log(`  ✅ Lifecycle manager test completed`);
      console.log(`     📝 Cards created: ${result.created}`);
      console.log(`     ⏭️  Cards skipped: ${result.skipped}`);
      console.log(`     ❌ Errors: ${result.errors}`);

      // Get stats
      const stats = await lifecycleManager.getStats();
      console.log(`     📊 Total lifecycle cards: ${stats.total_cards}`);
      console.log(`     📥 RSS imports: ${stats.rss_imports}`);

      this.testResults.lifecycleManager = {
        success: result.errors === 0,
        created: result.created,
        errors: result.errors,
        stats: stats
      };

    } catch (error) {
      console.error('  ❌ Lifecycle manager test failed:', error.message);
      this.testResults.lifecycleManager = { success: false, error: error.message };
    }
  }

  async testOrchestrator() {
    try {
      const orchestrator = new GeBIZRSSOrchestrator();

      console.log('  ⏳ Running complete scraping pipeline...');
      const result = await orchestrator.runCompleteScrapingPipeline({
        test: true
      });

      console.log(`  ✅ Orchestrator test completed`);
      console.log(`     🏁 Pipeline success: ${result.success}`);
      console.log(`     ⏱️  Duration: ${result.duration}ms`);
      console.log(`     📋 New tenders: ${result.summary.newTenders}`);
      console.log(`     🔄 Duplicates: ${result.summary.duplicates}`);
      console.log(`     ❌ Total errors: ${result.summary.errors}`);

      // Check individual stages
      console.log('     📊 Stage Results:');
      console.log(`       - Parsing: ${result.stages.parsing?.success ? '✅' : '❌'}`);
      console.log(`       - Lifecycle: ${result.stages.lifecycle?.success ? '✅' : '❌'}`);
      console.log(`       - Notifications: ${result.stages.notifications?.success ? '✅' : '❌'}`);

      this.testResults.orchestrator = {
        success: result.success,
        duration: result.duration,
        summary: result.summary,
        stages: result.stages
      };

    } catch (error) {
      console.error('  ❌ Orchestrator test failed:', error.message);
      this.testResults.orchestrator = { success: false, error: error.message };
    }
  }

  async testScheduler() {
    try {
      const scheduler = new GeBIZRSSScheduler();

      console.log('  ⏳ Testing scheduler functionality...');

      // Test scheduler status
      const initialStatus = scheduler.getStatus();
      console.log(`     📊 Initial status: ${initialStatus.isRunning ? 'Running' : 'Stopped'}`);

      // Test starting scheduler
      const started = scheduler.start();
      console.log(`     ▶️  Start result: ${started ? 'Success' : 'Failed'}`);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test scheduler status after start
      const runningStatus = scheduler.getStatus();
      console.log(`     🔄 Running status: ${runningStatus.isRunning ? 'Running' : 'Stopped'}`);
      console.log(`     ⏰ Next execution: ${runningStatus.nextExecution}`);
      console.log(`     📈 Success rate: ${runningStatus.successRate}`);

      // Test stopping scheduler
      const stopped = scheduler.stop();
      console.log(`     ⏹️  Stop result: ${stopped ? 'Success' : 'Failed'}`);

      // Final status
      const finalStatus = scheduler.getStatus();
      console.log(`  ✅ Scheduler test completed`);
      console.log(`     📊 Final status: ${finalStatus.isRunning ? 'Running' : 'Stopped'}`);

      this.testResults.scheduler = {
        success: started && stopped,
        canStart: started,
        canStop: stopped,
        stats: finalStatus
      };

    } catch (error) {
      console.error('  ❌ Scheduler test failed:', error.message);
      this.testResults.scheduler = { success: false, error: error.message };
    }
  }

  async testIntegrationService() {
    try {
      console.log('  ⏳ Testing integration service...');

      // Initialize service
      const initialized = await scrapingService.initialize({
        autoStartScheduler: false // Don't auto-start for testing
      });

      console.log(`     🚀 Initialization: ${initialized ? 'Success' : 'Failed'}`);

      // Get status
      const status = scrapingService.getStatus();
      console.log(`     📊 Service initialized: ${status.isInitialized}`);
      console.log(`     🏥 Parser healthy: ${status.parser?.isHealthy || false}`);

      // Get health check
      const healthCheck = await scrapingService.getHealthCheck();
      console.log(`     💚 Overall health: ${healthCheck.healthy ? 'Healthy' : 'Unhealthy'}`);

      // Test manual scrape (if possible)
      try {
        console.log('     ⏳ Testing manual scrape...');
        const manualResult = await scrapingService.manualScrape({ test: true });
        console.log(`     🔧 Manual scrape: ${manualResult.success ? 'Success' : 'Failed'}`);
        console.log(`     📋 New tenders found: ${manualResult.summary?.newTenders || 0}`);
      } catch (manualError) {
        console.log(`     ⚠️  Manual scrape test skipped: ${manualError.message}`);
      }

      console.log(`  ✅ Integration service test completed`);

      this.testResults.integration = {
        success: initialized && healthCheck.healthy,
        initialized: initialized,
        healthy: healthCheck.healthy,
        status: status
      };

    } catch (error) {
      console.error('  ❌ Integration service test failed:', error.message);
      this.testResults.integration = { success: false, error: error.message };
    }
  }

  printTestResults() {
    const results = this.testResults;

    console.log('📡 RSS Parser:', results.parser?.success ? '✅ PASS' : '❌ FAIL');
    if (results.parser?.success) {
      console.log(`    New tenders: ${results.parser.newTenders}, Errors: ${results.parser.errors}`);
    }

    console.log('📝 Lifecycle Manager:', results.lifecycleManager?.success ? '✅ PASS' : '❌ FAIL');
    if (results.lifecycleManager?.success) {
      console.log(`    Created: ${results.lifecycleManager.created}, Total cards: ${results.lifecycleManager.stats?.total_cards}`);
    }

    console.log('🎯 Orchestrator:', results.orchestrator?.success ? '✅ PASS' : '❌ FAIL');
    if (results.orchestrator?.success) {
      console.log(`    Duration: ${results.orchestrator.duration}ms, New: ${results.orchestrator.summary?.newTenders}`);
    }

    console.log('⏰ Scheduler:', results.scheduler?.success ? '✅ PASS' : '❌ FAIL');
    if (results.scheduler?.success) {
      console.log(`    Can start/stop: ${results.scheduler.canStart}/${results.scheduler.canStop}`);
    }

    console.log('🔗 Integration Service:', results.integration?.success ? '✅ PASS' : '❌ FAIL');
    if (results.integration?.success) {
      console.log(`    Initialized: ${results.integration.initialized}, Healthy: ${results.integration.healthy}`);
    }

    // Overall result
    const overallSuccess = Object.values(results).every(result => result?.success !== false);
    console.log('\n🏁 Overall Test Result:', overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

    if (overallSuccess) {
      console.log('\n🎉 GeBIZ RSS Scraper is ready for production!');
      console.log('📅 Scheduled runs: Every 6 hours (00:00, 06:00, 12:00, 18:00 SGT)');
      console.log('🖥️  Admin dashboard: /admin -> GeBIZ RSS Monitor');
      console.log('🔗 API endpoints: /api/v1/scraping/gebiz-rss/*');
    } else {
      console.log('\n⚠️  Please fix the failing tests before deploying to production.');
    }
  }
}

// Run the tests
async function main() {
  const testSuite = new GeBIZRSSTest();
  await testSuite.runAllTests();
  process.exit(0);
}

// Only run if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = GeBIZRSSTest;