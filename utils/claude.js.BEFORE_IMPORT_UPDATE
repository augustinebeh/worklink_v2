/**
 * LLM Integration Utility (Claude AI Primary)
 * WorkLink v2
 *
 * Primary: Claude API (Anthropic)
 * Fallback 1: Groq (Llama 3.1)
 * Fallback 2: Google Gemini
 *
 * Features:
 * - Intelligent provider selection and fallback
 * - Cost tracking and usage monitoring
 * - Rate limiting and retry logic
 * - Response caching for common queries
 */

const { db } = require('../db/database');

// API Configuration
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Cost tracking (per 1K tokens)
const API_COSTS = {
  claude: { input: 0.003, output: 0.015 }, // Claude 3.5 Sonnet
  groq: { input: 0.0001, output: 0.0002 }, // Groq rates
  gemini: { input: 0.00125, output: 0.00375 }, // Gemini Pro
};

// Provider configuration
const PROVIDERS = {
  claude: {
    name: 'Claude 3.5 Sonnet',
    apiKey: () => process.env.ANTHROPIC_API_KEY,
    maxTokens: 8192,
    contextWindow: 200000,
    priority: 3,  // Most expensive, final fallback
  },
  groq: {
    name: 'Llama 3.1 8B (Groq)',
    apiKey: () => process.env.GROQ_API_KEY,
    maxTokens: 8192,
    contextWindow: 32768,
    priority: 1,  // Cheapest and fastest, try first
  },
  gemini: {
    name: 'Gemini Pro',
    apiKey: () => process.env.GOOGLE_API_KEY,
    maxTokens: 8192,
    contextWindow: 32768,
    priority: 2,  // Middle option
  },
};

// Simple in-memory cache for common responses
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Main LLM function with intelligent provider selection
 */
async function askClaude(prompt, systemPrompt = '', options = {}) {
  const startTime = Date.now();
  const { forceProvider = null, useCache = true } = options;

  // Check cache first
  if (useCache) {
    const cacheKey = generateCacheKey(prompt, systemPrompt, options);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`🧠 [LLM] Cache hit for query`);
      recordUsage('cache', 0, 0, 0, Date.now() - startTime);
      return cached.response;
    }
  }

  // Determine provider order
  let providers = Object.keys(PROVIDERS);
  if (forceProvider && PROVIDERS[forceProvider]) {
    providers = [forceProvider];
  } else {
    // Sort by priority (lower number = higher priority)
    providers.sort((a, b) => PROVIDERS[a].priority - PROVIDERS[b].priority);
  }

  let lastError = null;

  for (const providerName of providers) {
    const provider = PROVIDERS[providerName];
    const apiKey = provider.apiKey();

    if (!apiKey) {
      console.log(`🧠 [LLM] ${provider.name}: No API key configured, skipping`);
      continue;
    }

    try {
      console.log(`🧠 [LLM] Trying ${provider.name}...`);

      let response, inputTokens, outputTokens;

      switch (providerName) {
        case 'claude':
          ({ response, inputTokens, outputTokens } = await askClaudeAPI(prompt, systemPrompt, options));
          break;
        case 'groq':
          ({ response, inputTokens, outputTokens } = await askGroq(prompt, systemPrompt, options));
          break;
        case 'gemini':
          ({ response, inputTokens, outputTokens } = await askGemini(prompt, systemPrompt, options));
          break;
      }

      const responseTime = Date.now() - startTime;

      // Cache successful response
      if (useCache && response) {
        const cacheKey = generateCacheKey(prompt, systemPrompt, options);
        responseCache.set(cacheKey, {
          response,
          timestamp: Date.now(),
        });

        // Clean old cache entries periodically
        if (responseCache.size > 100) {
          cleanCache();
        }
      }

      // Record usage
      recordUsage(providerName, inputTokens, outputTokens, calculateCost(providerName, inputTokens, outputTokens), responseTime);

      console.log(`🧠 [LLM] ${provider.name} succeeded (${responseTime}ms, $${calculateCost(providerName, inputTokens, outputTokens).toFixed(4)})`);
      return response;

    } catch (error) {
      lastError = error;
      console.error(`🧠 [LLM] ${provider.name} failed:`, error.message);

      // Record failed attempt
      recordUsage(providerName, 0, 0, 0, Date.now() - startTime, error.message);

      // If it's a rate limit error, wait a bit before trying next provider
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        await sleep(1000);
      }
    }
  }

  // All providers failed
  throw new Error(`All LLM providers failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Claude API (Anthropic) - Primary Provider
 */
async function askClaudeAPI(prompt, systemPrompt = '', options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const {
    maxTokens = 1024,
    model = 'claude-3-5-sonnet-20241022',
    temperature = 0.7,
  } = options;

  const messages = [{ role: 'user', content: prompt }];

  const requestBody = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  };

  if (systemPrompt) {
    requestBody.system = systemPrompt;
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || errorData.error?.type || `Claude API error: ${response.status}`;
    console.error('Claude API error:', errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  if (!text) {
    throw new Error('Empty response from Claude');
  }

  // Extract token usage for cost tracking
  const inputTokens = data.usage?.input_tokens || estimateTokens(prompt + (systemPrompt || ''));
  const outputTokens = data.usage?.output_tokens || estimateTokens(text);

  return { response: text, inputTokens, outputTokens };
}

/**
 * Groq API (Llama 3.1) - Fast Fallback
 */
async function askGroq(prompt, systemPrompt = '', options = {}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const {
    maxTokens = 1024,
    model = 'llama-3.1-8b-instant',
    temperature = 0.7,
  } = options;

  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `Groq API error: ${response.status}`;
    console.error('Groq API error:', errorMessage);
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  if (!text) {
    throw new Error('Empty response from Groq');
  }

  // Extract token usage for cost tracking
  const inputTokens = data.usage?.prompt_tokens || estimateTokens(prompt + (systemPrompt || ''));
  const outputTokens = data.usage?.completion_tokens || estimateTokens(text);

  return { response: text, inputTokens, outputTokens };
}

/**
 * Gemini API (Google) - Final Fallback
 */
async function askGemini(prompt, systemPrompt = '', options = {}) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured');
  }

  const {
    maxTokens = 1024,
    model = 'gemini-1.5-pro',
    temperature = 0.7,
  } = options;

  const url = `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`;

  let fullPrompt = prompt;
  if (systemPrompt) {
    fullPrompt = `${systemPrompt}\n\n---\n\nUser message:\n${prompt}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
        candidateCount: 1,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  // Estimate token usage for cost tracking
  const inputTokens = estimateTokens(fullPrompt);
  const outputTokens = estimateTokens(text);

  return { response: text, inputTokens, outputTokens };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Estimate tokens in a text (rough approximation)
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for API usage
 */
function calculateCost(provider, inputTokens, outputTokens) {
  const costs = API_COSTS[provider];
  if (!costs) return 0;

  return (inputTokens / 1000 * costs.input) + (outputTokens / 1000 * costs.output);
}

/**
 * Generate cache key for response caching
 */
function generateCacheKey(prompt, systemPrompt, options) {
  const key = JSON.stringify({
    prompt: prompt.substring(0, 200), // Limit key length
    system: systemPrompt.substring(0, 100),
    maxTokens: options.maxTokens || 1024,
    temperature: options.temperature || 0.7,
  });
  return Buffer.from(key).toString('base64').substring(0, 50);
}

/**
 * Clean old entries from cache
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of responseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      responseCache.delete(key);
    }
  }
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Record API usage for monitoring and cost tracking
 */
function recordUsage(provider, inputTokens, outputTokens, cost, responseTime, error = null) {
  try {
    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS llm_usage_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0,
        response_time_ms INTEGER DEFAULT 0,
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.prepare(`
      INSERT INTO llm_usage_logs
      (provider, input_tokens, output_tokens, cost_usd, response_time_ms, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(provider, inputTokens, outputTokens, cost, responseTime, error);

    // Update daily summary
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO llm_daily_usage (date, provider, calls, input_tokens, output_tokens, cost_usd, errors)
      VALUES (?, ?, 1, ?, ?, ?, ?)
      ON CONFLICT(date, provider) DO UPDATE SET
        calls = calls + 1,
        input_tokens = input_tokens + excluded.input_tokens,
        output_tokens = output_tokens + excluded.output_tokens,
        cost_usd = cost_usd + excluded.cost_usd,
        errors = errors + excluded.errors
    `).run(today, provider, inputTokens, outputTokens, cost, error ? 1 : 0);

  } catch (e) {
    // Create tables if they don't exist
    if (e.message.includes('no such table')) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS llm_usage_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          provider TEXT NOT NULL,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          cost_usd REAL DEFAULT 0,
          response_time_ms INTEGER DEFAULT 0,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS llm_daily_usage (
          date TEXT NOT NULL,
          provider TEXT NOT NULL,
          calls INTEGER DEFAULT 0,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          cost_usd REAL DEFAULT 0,
          errors INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (date, provider)
        );
      `);

      // Retry the insert
      recordUsage(provider, inputTokens, outputTokens, cost, responseTime, error);
    } else {
      console.warn('Failed to record LLM usage:', e.message);
    }
  }
}

// ============================================
// MONITORING & ANALYTICS FUNCTIONS
// ============================================

/**
 * Get LLM usage statistics
 */
function getLLMStats(days = 30) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const totalStats = db.prepare(`
      SELECT
        provider,
        SUM(calls) as total_calls,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(cost_usd) as total_cost,
        SUM(errors) as total_errors
      FROM llm_daily_usage
      WHERE date >= ?
      GROUP BY provider
      ORDER BY total_cost DESC
    `).all(sinceStr);

    const dailyStats = db.prepare(`
      SELECT date, provider, calls, input_tokens, output_tokens, cost_usd, errors
      FROM llm_daily_usage
      WHERE date >= ?
      ORDER BY date DESC, cost_usd DESC
    `).all(sinceStr);

    // Calculate totals
    const totals = totalStats.reduce((acc, row) => ({
      calls: acc.calls + row.total_calls,
      inputTokens: acc.inputTokens + row.total_input_tokens,
      outputTokens: acc.outputTokens + row.total_output_tokens,
      cost: acc.cost + row.total_cost,
      errors: acc.errors + row.total_errors,
    }), { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0, errors: 0 });

    const successRate = totals.calls > 0 ? ((totals.calls - totals.errors) / totals.calls * 100).toFixed(1) : 100;

    return {
      period: `${days} days`,
      totals: {
        ...totals,
        cost: Number(totals.cost.toFixed(4)),
        successRate: `${successRate}%`,
        avgCostPerCall: totals.calls > 0 ? Number((totals.cost / totals.calls).toFixed(4)) : 0,
      },
      byProvider: totalStats.map(row => ({
        provider: row.provider,
        calls: row.total_calls,
        inputTokens: row.total_input_tokens,
        outputTokens: row.total_output_tokens,
        cost: Number(row.total_cost.toFixed(4)),
        errors: row.total_errors,
        successRate: row.total_calls > 0 ? `${((row.total_calls - row.total_errors) / row.total_calls * 100).toFixed(1)}%` : '100%',
      })),
      dailyBreakdown: dailyStats.map(row => ({
        date: row.date,
        provider: row.provider,
        calls: row.calls,
        cost: Number(row.cost_usd.toFixed(4)),
        errors: row.errors,
      })),
    };
  } catch (e) {
    console.warn('Failed to get LLM stats:', e.message);
    return {
      period: `${days} days`,
      totals: { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0, errors: 0, successRate: '0%', avgCostPerCall: 0 },
      byProvider: [],
      dailyBreakdown: [],
    };
  }
}

/**
 * Get current provider status
 */
function getProviderStatus() {
  const status = {};

  for (const [name, config] of Object.entries(PROVIDERS)) {
    const hasApiKey = !!config.apiKey();
    status[name] = {
      name: config.name,
      hasApiKey,
      priority: config.priority,
      status: hasApiKey ? 'available' : 'not_configured',
    };
  }

  return status;
}

/**
 * Test all providers
 */
async function testAllProviders() {
  const results = {};
  const testPrompt = 'Say "ok"';
  const testSystemPrompt = 'Respond with only the word "ok"';

  for (const [name, config] of Object.entries(PROVIDERS)) {
    const hasApiKey = !!config.apiKey();

    if (!hasApiKey) {
      results[name] = {
        name: config.name,
        status: 'not_configured',
        error: 'No API key configured',
      };
      continue;
    }

    try {
      const startTime = Date.now();
      const response = await askClaude(testPrompt, testSystemPrompt, { forceProvider: name, useCache: false });
      const responseTime = Date.now() - startTime;

      results[name] = {
        name: config.name,
        status: 'working',
        responseTime: `${responseTime}ms`,
        response: response.substring(0, 50),
      };
    } catch (error) {
      results[name] = {
        name: config.name,
        status: 'error',
        error: error.message,
      };
    }
  }

  return results;
}

/**
 * Clean up old usage logs
 */
function cleanupUsageLogs(daysToKeep = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const deleted = db.prepare(`
      DELETE FROM llm_usage_logs WHERE date(created_at) < ?
    `).run(cutoffStr);

    return deleted.changes;
  } catch (e) {
    console.warn('Failed to cleanup usage logs:', e.message);
    return 0;
  }
}

// ============================================
// BACKWARDS COMPATIBILITY & ALIASES
// ============================================

/**
 * Alias for askClaude (backwards compatibility)
 */
const askLLM = askClaude;

/**
 * Legacy function names (backwards compatibility)
 */
const askGroqDirect = (prompt, systemPrompt = '', options = {}) =>
  askClaude(prompt, systemPrompt, { ...options, forceProvider: 'groq' });

const askGeminiDirect = (prompt, systemPrompt = '', options = {}) =>
  askClaude(prompt, systemPrompt, { ...options, forceProvider: 'gemini' });

const askClaudeDirect = (prompt, systemPrompt = '', options = {}) =>
  askClaude(prompt, systemPrompt, { ...options, forceProvider: 'claude' });

// ============================================
// AI AUTOMATION FUNCTIONS
// ============================================

/**
 * Generate job posting content for multiple platforms
 */
async function generateJobPostings(jobDetails) {
  const { jobTitle, payRate, location, requirements, slots } = jobDetails;

  const systemPrompt = `You are a recruitment marketing specialist for WorkLink, a Singapore-based staffing agency. Generate engaging job postings optimized for each platform. Use Singapore English and local context. Be professional but friendly. Include relevant emojis.`;

  const prompt = `Generate job postings for these platforms based on this job:

Job Title: ${jobTitle}
Pay Rate: $${payRate}/hr
Location: ${location}
Slots Available: ${slots}
Requirements: ${requirements}

Create separate postings for:
1. WhatsApp (short, direct, with call-to-action)
2. Telegram (with emojis, hashtags for Singapore jobs)
3. Facebook (professional but engaging)
4. Instagram (visual-focused caption with hashtags)

Return ONLY valid JSON in this exact format:
{
  "whatsapp": "posting text here",
  "telegram": "posting text here",
  "facebook": "posting text here",
  "instagram": {"caption": "caption here", "hashtags": "hashtags here"}
}`;

  try {
    const response = await askClaude(prompt, systemPrompt, { maxTokens: 1500 });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Job posting generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate personalized outreach message for a candidate
 */
async function generateOutreachMessage(candidate, job) {
  const systemPrompt = `You are a friendly recruiter at WorkLink Singapore. Write personalized WhatsApp messages that feel warm and personal, not robotic. Keep messages concise (under 200 words). Use Singapore English naturally.`;

  const prompt = `Write a personalized WhatsApp message to invite this candidate to a job:

Candidate:
- Name: ${candidate.name}
- Level: ${candidate.level}
- Jobs Completed: ${candidate.total_jobs_completed || 0}
- Rating: ${candidate.rating || 'New worker'}

Job:
- Title: ${job.title}
- Location: ${job.location || 'TBC'}
- Date: ${job.job_date}
- Time: ${job.start_time} - ${job.end_time}
- Pay: $${job.pay_rate}/hr
${job.xp_bonus ? `- Bonus XP: ${job.xp_bonus}` : ''}

Write a warm, personalized message that:
1. Addresses them by first name
2. Acknowledges their experience level appropriately
3. Highlights what makes this job a good fit
4. Has a clear call-to-action

Return ONLY the message text, no explanations.`;

  try {
    const response = await askClaude(prompt, systemPrompt, { maxTokens: 400 });
    return typeof response === 'string' ? response : response.response;
  } catch (error) {
    console.error('Outreach message generation failed:', error.message);
    throw error;
  }
}

/**
 * Analyze a tender and provide strategic recommendations
 */
async function analyzeTender(tender, companyContext = {}) {
  const systemPrompt = `You are a strategic business consultant specializing in Singapore government tenders (GeBIZ). Provide practical, actionable analysis for a manpower/staffing company deciding whether to bid.`;

  const prompt = `Analyze this tender opportunity:

Tender Details:
- Title: ${tender.title}
- Agency: ${tender.agency}
- Estimated Value: $${tender.estimated_value?.toLocaleString() || 'Not specified'}
- Manpower Required: ${tender.manpower_required || 'Not specified'} people
- Duration: ${tender.duration_months || 'Not specified'} months
- Location: ${tender.location || 'Not specified'}
- Closing Date: ${tender.closing_date}
- Category: ${tender.category}

Company Context:
- Total active candidates: ${companyContext.totalCandidates || 50}
- Average worker rating: ${companyContext.avgRating || 4.2}
- Specialties: Event staffing, F&B, administrative support

Provide analysis in this JSON format:
{
  "winProbability": <number 0-100>,
  "recommendedAction": "<STRONG BID | EVALUATE | LOW PRIORITY | SKIP> - <brief reason>",
  "factors": [
    {"factor": "<name>", "impact": "<+X or -X>", "reason": "<explanation>"}
  ],
  "pricingStrategy": "<brief pricing recommendation>",
  "keyRisks": ["<risk 1>", "<risk 2>"],
  "summary": "<2-3 sentence executive summary>"
}

Return ONLY valid JSON.`;

  try {
    const response = await askClaude(prompt, systemPrompt, { maxTokens: 1000 });
    const responseText = typeof response === 'string' ? response : response.response;

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI analysis');
  } catch (error) {
    console.error('Tender analysis failed:', error.message);
    throw error;
  }
}

/**
 * Generate candidate matching recommendations
 */
async function matchCandidates(job, candidates) {
  const systemPrompt = `You are an AI talent matcher for WorkLink Singapore. Score candidates based on fit for the job. Be objective and explain your reasoning briefly.`;

  const candidateList = candidates.slice(0, 20).map(c => ({
    id: c.id,
    name: c.name,
    level: c.level,
    rating: c.rating,
    jobsCompleted: c.total_jobs_completed,
    certifications: JSON.parse(c.certifications || '[]'),
  }));

  const prompt = `Match candidates to this job:

Job:
- Title: ${job.title}
- Type: ${job.category || 'General'}
- Location: ${job.location}
- Pay: $${job.pay_rate}/hr

Candidates:
${JSON.stringify(candidateList, null, 2)}

Score each candidate 0-100 based on:
- Experience level and rating (40%)
- Relevant certifications (30%)
- Reliability (jobs completed) (30%)

Return JSON array of top 10 matches:
[
  {"id": "<candidate id>", "score": <number>, "reason": "<brief reason>"}
]

Return ONLY valid JSON array.`;

  try {
    const response = await askClaude(prompt, systemPrompt, { maxTokens: 800 });
    const responseText = typeof response === 'string' ? response : response.response;

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI recommendations');
  } catch (error) {
    console.error('Candidate matching failed:', error.message);
    throw error;
  }
}

// ============================================
// MODULE EXPORTS
// ============================================

module.exports = {
  // Core LLM functions
  askClaude,
  askLLM, // Alias

  // Direct provider access
  askClaudeAPI,
  askGroq,
  askGemini,

  // Legacy/direct provider access
  askClaudeDirect,
  askGroqDirect,
  askGeminiDirect,

  // AI automation functions
  generateJobPostings,
  generateOutreachMessage,
  analyzeTender,
  matchCandidates,

  // Monitoring & analytics
  getLLMStats,
  getProviderStatus,
  testAllProviders,
  cleanupUsageLogs,

  // Utility functions
  estimateTokens,
  calculateCost,

  // Provider configuration
  PROVIDERS,
  API_COSTS,
};
