/**
 * Groq Fallback Service
 * Handles complex cases that need actual LLM processing
 * Uses Groq API as the external LLM when internal SLM can't handle requests
 */

const axios = require('axios');

class GroqService {
  constructor() {
    this.config = {
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'llama-3.1-8b-instant', // Fast and cost-effective
      maxTokens: 500,
      temperature: 0.7,
      timeout: 8000, // 8 second timeout (reasonable with working network)
      retries: 2 // 2 retries for reliability
    };

    this.systemPrompts = this.buildSystemPrompts();
    this.responseCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate response using Groq for complex cases
   */
  async generateResponse(message, context, candidateData, intentAnalysis) {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(message, context, candidateData);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { ...cached, source: 'groq_cached' };
      }

      // Build conversation context
      const conversationHistory = this.buildConversationHistory(context);

      // Select appropriate system prompt
      const systemPrompt = this.selectSystemPrompt(candidateData, intentAnalysis);

      // Build messages for Groq
      const messages = this.buildMessages(systemPrompt, conversationHistory, message, candidateData);

      // Call Groq API
      const groqResponse = await this.callGroqAPI(messages);

      // Parse and format response
      const formattedResponse = this.formatGroqResponse(groqResponse, intentAnalysis);

      // Cache the response
      this.cacheResponse(cacheKey, formattedResponse);

      return formattedResponse;

    } catch (error) {
      console.error('Groq fallback error:', error);
      return this.generateGroqErrorResponse(candidateData);
    }
  }

  /**
   * Build system prompts for different scenarios
   */
  buildSystemPrompts() {
    return {
      pending_candidate: `You are a helpful WorkLink recruitment assistant specializing in interview scheduling for pending candidates.

CONTEXT: WorkLink is a platform for event staffing, F&B, retail, and admin support jobs in Singapore.

YOUR ROLE:
- Help pending candidates schedule verification interviews
- Be friendly, professional, and encouraging
- Focus on getting them scheduled quickly
- Use Singapore English naturally

IMPORTANT RULES:
- NEVER make promises about timing ("usually takes 24 hours", "will be approved soon")
- NEVER claim to have done actions you haven't ("I've notified admin", "I've checked your account")
- ALWAYS be honest about what you can and cannot do
- For payment questions: explain no payments yet since account pending
- For job questions: explain need verification first, offer interview

RESPONSE STYLE:
- Warm and encouraging
- Professional but friendly
- Keep responses under 60 words when possible
- Use relevant emojis (📅 for scheduling, 👋 for greetings)
- End with clear next steps

FORBIDDEN:
- False promises or guarantees
- Made-up information
- Claims about approval timelines
- Pretending to contact admins`,

      active_candidate: `You are a helpful WorkLink assistant for active candidates.

CONTEXT: WorkLink connects candidates with event staffing, F&B, retail, and admin support opportunities in Singapore.

YOUR ROLE:
- Help with job-related questions
- Assist with payment inquiries (escalate for specifics)
- Provide general support and guidance
- Use Singapore English naturally

IMPORTANT RULES:
- For specific payment amounts/dates: escalate to admin team
- For specific job details: escalate to admin team
- NEVER make up data about payments, jobs, or schedules
- Be helpful while staying within your knowledge limits

RESPONSE STYLE:
- Friendly and supportive
- Professional guidance
- Clear next steps
- Appropriate emojis

ESCALATION TRIGGERS:
- Specific payment amounts or dates
- Complex job scheduling questions
- Account-specific technical issues
- Complaints or urgent matters`,

      general_support: `You are a friendly WorkLink support assistant.

CONTEXT: WorkLink is a Singapore-based platform for flexible work opportunities.

YOUR ROLE:
- Provide general information and support
- Guide users to appropriate resources
- Be helpful and professional

RESPONSE STYLE:
- Friendly and clear
- Professional but approachable
- Concise responses
- Helpful guidance

ESCALATION: For specific account, payment, or job questions, connect with admin team.`
    };
  }

  /**
   * Select appropriate system prompt
   */
  selectSystemPrompt(candidateData, intentAnalysis) {
    const { status } = candidateData;
    const { intent } = intentAnalysis;

    if (status === 'pending' || intent === 'interview_scheduling') {
      return this.systemPrompts.pending_candidate;
    } else if (status === 'active') {
      return this.systemPrompts.active_candidate;
    } else {
      return this.systemPrompts.general_support;
    }
  }

  /**
   * Build conversation history for context
   */
  buildConversationHistory(context) {
    const { recentMessages = [], conversationFlow } = context;

    let history = '';
    if (conversationFlow) {
      history += `Conversation stage: ${conversationFlow}\n`;
    }

    if (recentMessages.length > 0) {
      history += 'Recent conversation:\n';
      recentMessages.slice(-3).forEach(msg => {
        const sender = msg.sender === 'candidate' ? 'User' : 'Assistant';
        history += `${sender}: ${msg.content}\n`;
      });
    }

    return history;
  }

  /**
   * Build messages array for Groq API
   */
  buildMessages(systemPrompt, conversationHistory, message, candidateData) {
    const { name, status } = candidateData;
    const firstName = name ? name.split(' ')[0] : 'User';

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      }
    ];

    // Add conversation history if available
    if (conversationHistory) {
      messages.push({
        role: 'user',
        content: `Context:\nCandidate: ${firstName}, Status: ${status}\n\n${conversationHistory}\n\nCurrent message: ${message}`
      });
    } else {
      messages.push({
        role: 'user',
        content: `Candidate: ${firstName}, Status: ${status}\nMessage: ${message}`
      });
    }

    return messages;
  }

  /**
   * Call Groq API
   */
  async callGroqAPI(messages, attempt = 1) {
    try {
      if (!this.config.apiKey) {
        throw new Error('Groq API key not configured');
      }

      const response = await axios.post(this.config.baseURL, {
        model: this.config.model,
        messages: messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.config.timeout
      });

      return response.data;

    } catch (error) {
      if (attempt <= this.config.retries) {
        console.log(`Groq API attempt ${attempt} failed, retrying...`);
        await this.delay(1000 * attempt); // Progressive delay
        return this.callGroqAPI(messages, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Format Groq response to match internal SLM format
   */
  formatGroqResponse(groqResponse, intentAnalysis) {
    const content = groqResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Invalid Groq response format');
    }

    // Clean up the response
    const cleanContent = this.cleanResponse(content);

    // Determine response metadata
    const messageType = this.determineMessageType(cleanContent, intentAnalysis);
    const nextActions = this.determineNextActions(cleanContent, intentAnalysis);
    const shouldEscalate = this.shouldEscalateResponse(cleanContent);

    return {
      content: cleanContent,
      intent: intentAnalysis.intent || 'general_question',
      confidence: 0.75, // Lower confidence for LLM responses
      messageType,
      nextActions,
      source: 'groq',
      escalate: shouldEscalate,
      usage: {
        inputTokens: groqResponse.usage?.prompt_tokens || 0,
        outputTokens: groqResponse.usage?.completion_tokens || 0,
        totalTokens: groqResponse.usage?.total_tokens || 0
      }
    };
  }

  /**
   * Clean up Groq response
   */
  cleanResponse(content) {
    return content
      .trim()
      .replace(/^\*\*.*?\*\*\s*/, '') // Remove markdown headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic
      .replace(/\n{3,}/g, '\n\n') // Limit line breaks
      .substring(0, 400); // Limit length
  }

  /**
   * Determine message type from content
   */
  determineMessageType(content, intentAnalysis) {
    const { intent } = intentAnalysis;

    if (content.includes('schedule') || content.includes('interview')) {
      return 'scheduling_response';
    }
    if (content.includes('admin') || content.includes('connect')) {
      return 'escalation_response';
    }
    if (intent === 'payment_inquiry') {
      return 'payment_response';
    }
    if (intent === 'job_inquiry') {
      return 'job_response';
    }

    return 'general_response';
  }

  /**
   * Determine next actions from content
   */
  determineNextActions(content, intentAnalysis) {
    const actions = [];

    if (content.includes('admin') || content.includes('connect')) {
      actions.push('escalate_to_admin');
    }
    if (content.includes('schedule') || content.includes('interview')) {
      actions.push('schedule_interview');
    }
    if (content.includes('help') || content.includes('assist')) {
      actions.push('provide_help');
    }

    return actions.length > 0 ? actions : ['general_help'];
  }

  /**
   * Determine if response should escalate
   */
  shouldEscalateResponse(content) {
    const escalationKeywords = ['admin', 'connect', 'team', 'human', 'escalate'];
    return escalationKeywords.some(keyword =>
      content.toLowerCase().includes(keyword)
    );
  }

  /**
   * Generate error response when Groq fails
   */
  generateGroqErrorResponse(candidateData) {
    const { name } = candidateData;
    const firstName = name ? name.split(' ')[0] : 'there';

    return {
      content: `Hi ${firstName}! I'm experiencing a temporary issue with my advanced processing. Let me connect you with our admin team to ensure you get immediate assistance.\n\nSorry for the inconvenience! 😊`,
      intent: 'system_error',
      confidence: 0.9,
      messageType: 'error',
      nextActions: ['escalate_to_admin'],
      escalate: true,
      source: 'groq_error'
    };
  }

  /**
   * Cache management
   */
  generateCacheKey(message, context, candidateData) {
    const key = JSON.stringify({
      message: message.toLowerCase().trim(),
      status: candidateData.status,
      flow: context.conversationFlow
    });

    return this.hashString(key);
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  getFromCache(key) {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.response;
    }
    return null;
  }

  cacheResponse(key, response) {
    // Limit cache size
    if (this.responseCache.size >= 100) {
      const firstKey = this.responseCache.keys().next().value;
      this.responseCache.delete(firstKey);
    }

    this.responseCache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  /**
   * Utility function for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for Groq service
   */
  async healthCheck() {
    try {
      if (!this.config.apiKey) {
        return { status: 'error', message: 'API key not configured' };
      }

      const testResponse = await this.callGroqAPI([
        { role: 'user', content: 'Test connection' }
      ]);

      return {
        status: 'healthy',
        model: this.config.model,
        response_time: testResponse.usage?.total_tokens ? 'fast' : 'unknown'
      };

    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        fallback: 'Internal SLM will handle all requests'
      };
    }
  }
}

module.exports = GroqService;