/**
 * Claude AI Integration Utility
 * WorkLink v2
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Send a message to Claude and get a response
 * @param {string} prompt - The user prompt
 * @param {string} systemPrompt - System instructions for Claude
 * @param {object} options - Additional options (maxTokens, model)
 * @returns {Promise<string>} Claude's response text
 */
async function askClaude(prompt, systemPrompt = '', options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const {
    maxTokens = 1024,
    model = 'claude-3-5-sonnet-20241022',
  } = options;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  } catch (error) {
    console.error('Claude API error:', error.message);
    throw error;
  }
}

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

  const response = await askClaude(prompt, systemPrompt, { maxTokens: 1500 });

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse AI response');
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

  return await askClaude(prompt, systemPrompt, { maxTokens: 400 });
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

  const response = await askClaude(prompt, systemPrompt, { maxTokens: 1000 });

  // Parse JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse AI analysis');
}

/**
 * Generate candidate matching recommendations
 */
async function matchCandidates(job, candidates) {
  const systemPrompt = `You are an AI talent matcher for WorkLink Singapore. Score candidates based on fit for the job. Be objective and explain your reasoning briefly.`;

  // Limit to top 20 candidates to keep prompt size reasonable
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

  const response = await askClaude(prompt, systemPrompt, { maxTokens: 800 });

  // Parse JSON from response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error('Failed to parse AI recommendations');
}

module.exports = {
  askClaude,
  generateJobPostings,
  generateOutreachMessage,
  analyzeTender,
  matchCandidates,
};
