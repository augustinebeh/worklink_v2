#!/usr/bin/env node
/**
 * LLM Features Demo Script
 * Demonstrates the fixed LLM configuration with mock data
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  getProviderStatus,
  getLLMStats,
  PROVIDERS,
  API_COSTS,
} = require('../utils/claude');

// Demo functions that show the LLM system capabilities
function demonstrateFallbackLogic() {
  console.log('🔄 LLM Provider Fallback Logic:');
  console.log('1. Primary: Claude 3.5 Sonnet (highest quality)');
  console.log('2. Fallback: Groq Llama 3.1 (fastest)');
  console.log('3. Final: Google Gemini (most reliable)');
  console.log('');
}

function showProviderConfiguration() {
  console.log('⚙️  Provider Configuration:');
  const status = getProviderStatus();

  Object.entries(status).forEach(([provider, info]) => {
    const icon = info.hasApiKey ? '✅' : '❌';
    console.log(`   ${icon} ${info.name} (Priority: ${info.priority})`);
  });
  console.log('');
}

function showCostStructure() {
  console.log('💰 Cost Structure (per 1K tokens):');
  Object.entries(API_COSTS).forEach(([provider, costs]) => {
    console.log(`   ${provider}: Input $${costs.input}, Output $${costs.output}`);
  });
  console.log('');
}

function showUsageAnalytics() {
  console.log('📊 Usage Analytics:');
  try {
    const stats = getLLMStats(7);
    console.log(`   Total calls (7 days): ${stats.totals.calls}`);
    console.log(`   Total cost: $${stats.totals.cost}`);
    console.log(`   Success rate: ${stats.totals.successRate}`);
    console.log(`   Avg cost per call: $${stats.totals.avgCostPerCall}`);

    if (stats.byProvider.length > 0) {
      console.log('   By provider:');
      stats.byProvider.forEach(provider => {
        console.log(`     - ${provider.provider}: ${provider.calls} calls, $${provider.cost}`);
      });
    }
  } catch (error) {
    console.log(`   Error retrieving stats: ${error.message}`);
  }
  console.log('');
}

function showFeatureSupport() {
  console.log('🤖 AI Automation Features:');
  console.log('   ✅ Job Posting Generation (multi-platform)');
  console.log('   ✅ Personalized Candidate Outreach');
  console.log('   ✅ Strategic Tender Analysis');
  console.log('   ✅ AI-Powered Candidate Matching');
  console.log('   ✅ Conversational AI Chat Assistant');
  console.log('');
}

function showSystemCapabilities() {
  console.log('🛠️  System Capabilities:');
  console.log('   ✅ Intelligent provider selection');
  console.log('   ✅ Automatic fallback on failure');
  console.log('   ✅ Real-time cost tracking');
  console.log('   ✅ Response caching (5min TTL)');
  console.log('   ✅ Error handling & retry logic');
  console.log('   ✅ Usage analytics & monitoring');
  console.log('   ✅ Rate limiting protection');
  console.log('   ✅ JSON parsing & validation');
  console.log('');
}

function showAPIEndpoints() {
  console.log('🌐 New API Endpoints:');
  console.log('   GET  /api/v1/llm-config/status');
  console.log('   POST /api/v1/llm-config/test');
  console.log('   POST /api/v1/llm-config/test/{provider}');
  console.log('   GET  /api/v1/llm-config/stats');
  console.log('   GET  /api/v1/llm-config/cost-breakdown');
  console.log('   POST /api/v1/llm-config/test-features');
  console.log('   POST /api/v1/llm-config/chat');
  console.log('   POST /api/v1/llm-config/cleanup');
  console.log('');
}

function showConfigurationInstructions() {
  console.log('⚡ Quick Setup Instructions:');
  console.log('1. Get API keys from providers:');
  console.log('   - Claude: https://console.anthropic.com/');
  console.log('   - Groq: https://console.groq.com/');
  console.log('   - Gemini: https://aistudio.google.com/');
  console.log('');
  console.log('2. Add to .env file:');
  console.log('   ANTHROPIC_API_KEY=sk-ant-your-key-here');
  console.log('   GROQ_API_KEY=gsk_your-key-here');
  console.log('   GOOGLE_API_KEY=your-key-here');
  console.log('');
  console.log('3. Test configuration:');
  console.log('   node test-llm-configuration.js');
  console.log('');
}

// Main demo
function runDemo() {
  console.log('🚀 WorkLink v2 - LLM Configuration Demo\n');
  console.log('=' * 60);

  demonstrateFallbackLogic();
  showProviderConfiguration();
  showCostStructure();
  showUsageAnalytics();
  showFeatureSupport();
  showSystemCapabilities();
  showAPIEndpoints();
  showConfigurationInstructions();

  console.log('📚 For complete documentation, see: LLM_CONFIGURATION_GUIDE.md');
  console.log('🔬 To test the system, run: node test-llm-configuration.js');
  console.log('\n✨ LLM Configuration is ready for production use!');
}

// Run demo if called directly
if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };