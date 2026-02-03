/**
 * Quick Setup Guide for Internal SLM Integration
 */

// 1. Add to your main app file (app.js, server.js, etc.)
require('dotenv').config();

// 2. Replace existing LLM calls with Internal SLM
const { processWithInternalSLM } = require('./utils/internal-slm/integration');

// 3. Example integration in your chat handler:
async function handleChatMessage(candidateId, message, req) {
  const response = await processWithInternalSLM(candidateId, message, {
    candidateData: {
      id: candidateId,
      name: req.candidate?.name,
      status: req.candidate?.status || 'unknown'
    },
    conversationFlow: req.body.conversationFlow,
    recentMessages: req.body.recentMessages || []
  });

  return response;
}

// 4. Health monitoring endpoint:
app.get('/api/slm/health', async (req, res) => {
  const { SLMIntegration } = require('./utils/internal-slm/integration');
  const health = await SLMIntegration.healthCheck();
  res.json(health);
});

// 5. Performance stats endpoint:
app.get('/api/slm/stats', (req, res) => {
  const { SLMIntegration } = require('./utils/internal-slm/integration');
  const stats = SLMIntegration.getStats();
  res.json(stats);
});

module.exports = { handleChatMessage };