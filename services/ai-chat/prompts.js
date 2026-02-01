/**
 * AI Chat Prompts
 *
 * System prompts and templates for the chat AI assistant.
 * Optimized for Singapore recruitment context.
 */

/**
 * Main system prompt for chat responses
 */
const RECRUITMENT_SYSTEM_PROMPT = `You are a friendly and professional recruitment assistant for WorkLink, a staffing agency based in Singapore. Your role is to help candidates with their inquiries about jobs, payments, schedules, and availability.

## About WorkLink
- WorkLink connects workers with temporary and part-time job opportunities in Singapore
- We specialize in event staffing, F&B service, retail, and administrative support roles
- Workers use the WorkLink app to find jobs, track earnings, and communicate with our team

## Your Communication Style
- CRITICAL: Keep responses to 1-2 sentences max (under 40 words)
- Be direct and helpful - no fluff or unnecessary details
- Use Singapore English naturally (occasional "can", "lah" is fine)
- Skip greetings if already in conversation
- Use 1-2 emojis naturally to make responses friendly and warm (👍 😊 💪 🙌 ✨ 📍 💼 etc.)
- No bullet points or lists unless absolutely necessary

## What You Can Help With
1. **Job Inquiries**: Answer questions about available jobs, requirements, locations, pay rates
2. **Payment Questions**: Explain payment schedules, how earnings are calculated, payment methods
3. **Schedule/Availability**: Help with availability updates, schedule conflicts
4. **General Support**: Onboarding questions, app usage, company policies
5. **Job Matching**: Suggest relevant jobs based on candidate profile and preferences

## What You Should NOT Do
- Make promises about specific job placements
- Guarantee specific pay amounts beyond listed rates
- Discuss confidential client information
- Handle complaints that need escalation (flag these for human review)
- Process actual payments or make binding commitments

## Response Format
- 1-2 sentences ONLY. Be brief like texting a friend.
- Answer the question directly, then stop.
- If suggesting jobs, mention 1 job max with key details.
- Flag urgent issues: [NEEDS ATTENTION]

## Current Context
{{CANDIDATE_CONTEXT}}

## Available Jobs (if asking about work)
{{AVAILABLE_JOBS}}`;

/**
 * Intent detection prompt
 */
const INTENT_DETECTION_PROMPT = `Analyze this message from a candidate and classify the intent. Return ONLY valid JSON.

Message: "{{MESSAGE}}"

Possible intents:
- pay_inquiry: Questions about payment, earnings, rates
- schedule_question: Questions about job schedules, dates, times
- availability_update: Updating their availability
- job_search: Looking for jobs or asking about opportunities
- job_application: Asking about applying to specific jobs
- general_greeting: Hello, hi, good morning
- general_question: Other questions about WorkLink
- complaint: Issues, problems, dissatisfaction
- urgent: Time-sensitive or emergency matters
- goodbye: Ending conversation, thanks
- unknown: Cannot classify

Return JSON format:
{"intent": "...", "confidence": 0.0-1.0, "keywords": ["...", "..."]}`;

/**
 * Job matching prompt
 */
const JOB_MATCHING_PROMPT = `Based on this candidate's message and profile, suggest the most relevant jobs from the available list.

Candidate Message: "{{MESSAGE}}"

Candidate Profile:
{{CANDIDATE_PROFILE}}

Available Jobs:
{{AVAILABLE_JOBS}}

Return the top 3 most relevant jobs with brief explanations. Format as natural conversation, not a list.`;

/**
 * Build the full system prompt with context
 */
function buildSystemPrompt(candidateContext = '', availableJobs = '') {
  let prompt = RECRUITMENT_SYSTEM_PROMPT;

  // Replace placeholders
  prompt = prompt.replace('{{CANDIDATE_CONTEXT}}', candidateContext || 'No specific candidate context available.');
  prompt = prompt.replace('{{AVAILABLE_JOBS}}', availableJobs || 'No specific job information available at this time.');

  return prompt;
}

/**
 * Build candidate context string
 */
function buildCandidateContext(candidate) {
  if (!candidate) {
    return 'Unknown candidate';
  }

  const parts = [];

  if (candidate.name) {
    parts.push(`Name: ${candidate.name.split(' ')[0]}`); // First name only
  }

  if (candidate.level) {
    parts.push(`Level: ${candidate.level}`);
  }

  if (candidate.total_jobs_completed) {
    parts.push(`Jobs completed: ${candidate.total_jobs_completed}`);
  }

  if (candidate.status) {
    parts.push(`Status: ${candidate.status}`);
  }

  if (candidate.certifications) {
    try {
      const certs = typeof candidate.certifications === 'string'
        ? JSON.parse(candidate.certifications)
        : candidate.certifications;
      if (Array.isArray(certs) && certs.length > 0) {
        parts.push(`Certifications: ${certs.join(', ')}`);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  return parts.join('\n');
}

/**
 * Build available jobs context string
 */
function buildJobsContext(jobs) {
  if (!jobs || jobs.length === 0) {
    return 'No jobs currently available.';
  }

  const jobLines = jobs.slice(0, 5).map(job => {
    const parts = [`- ${job.title}`];
    if (job.location) parts.push(`at ${job.location}`);
    if (job.pay_rate) parts.push(`($${job.pay_rate}/hr)`);
    if (job.job_date) parts.push(`on ${job.job_date}`);
    if (job.total_slots) parts.push(`(${job.total_slots - (job.filled_slots || 0)} slots)`);
    return parts.join(' ');
  });

  return jobLines.join('\n');
}

/**
 * Build conversation history context
 */
function buildConversationContext(messages, maxMessages = 5) {
  if (!messages || messages.length === 0) {
    return '';
  }

  const recentMessages = messages.slice(-maxMessages);

  const formatted = recentMessages.map(msg => {
    const role = msg.sender === 'candidate' ? 'Candidate' : 'WorkLink';
    return `${role}: ${msg.content}`;
  });

  return `\n\nRecent conversation:\n${formatted.join('\n')}`;
}

module.exports = {
  RECRUITMENT_SYSTEM_PROMPT,
  INTENT_DETECTION_PROMPT,
  JOB_MATCHING_PROMPT,
  buildSystemPrompt,
  buildCandidateContext,
  buildJobsContext,
  buildConversationContext,
};
