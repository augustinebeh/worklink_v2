/**
 * Test script for Internal SLM system
 * Verifies both internal processing and Groq fallback
 */

// Load environment variables from .env file
require('dotenv').config();

const { processWithInternalSLM, SLMIntegration } = require('./utils/internal-slm/integration');

async function testInternalSLM() {
  console.log('🧪 Testing Internal SLM System\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Health Check...');
    const health = await SLMIntegration.healthCheck();
    console.log('Health Status:', health.status);
    console.log('Groq Status:', health.groqStatus || 'Not checked');
    console.log('');

    // Test 2: Simple Greeting (Internal SLM)
    console.log('2️⃣ Testing Internal SLM - Simple Greeting...');
    const greetingResponse = await processWithInternalSLM('test123', 'hello', {
      candidateData: {
        id: 'test123',
        name: 'Sarah Johnson',
        status: 'pending'
      }
    });

    console.log('Input:', 'hello');
    console.log('Output:', greetingResponse.content);
    console.log('Source:', greetingResponse.source);
    console.log('Intent:', greetingResponse.intent);
    console.log('Confidence:', greetingResponse.confidence);
    console.log('');

    // Test 3: Interview Scheduling (Internal SLM)
    console.log('3️⃣ Testing Internal SLM - Interview Scheduling...');
    const scheduleResponse = await processWithInternalSLM('test123', 'I want to schedule an interview', {
      candidateData: {
        id: 'test123',
        name: 'Mike Chen',
        status: 'pending'
      }
    });

    console.log('Input:', 'I want to schedule an interview');
    console.log('Output:', scheduleResponse.content);
    console.log('Source:', scheduleResponse.source);
    console.log('Intent:', scheduleResponse.intent);
    console.log('');

    // Test 4: Complex Query (Should trigger Groq fallback)
    console.log('4️⃣ Testing Groq Fallback - Complex Question...');
    const complexResponse = await processWithInternalSLM('test123', 'Can you explain the detailed process of how WorkLink verifies candidates and what specific documents I need to provide for the verification interview along with the timeline for approval?', {
      candidateData: {
        id: 'test123',
        name: 'Alex Thompson',
        status: 'pending'
      }
    });

    console.log('Input:', 'Complex verification question...');
    console.log('Output:', complexResponse.content);
    console.log('Source:', complexResponse.source);
    console.log('');

    // Test 5: Performance Stats
    console.log('5️⃣ Performance Statistics...');
    const stats = SLMIntegration.getStats();
    console.log('Total Requests:', stats.totalRequests);
    console.log('Internal Handled:', `${stats.internalHandled} (${stats.internalHandledPercent}%)`);
    console.log('Groq Fallbacks:', `${stats.groqFallbacks} (${stats.groqFallbackPercent}%)`);
    console.log('Average Response Time:', `${stats.avgResponseTimeMs}ms`);
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testInternalSLM();
}

module.exports = { testInternalSLM };