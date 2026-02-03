/**
 * Internal Response Generator
 * Generates human-like responses using templates and dynamic content
 */

class ResponseGenerator {
  constructor() {
    this.templates = this.buildResponseTemplates();
    this.variations = this.buildResponseVariations();
    this.personalityTraits = this.buildPersonalityTraits();
  }

  /**
   * Generate response based on intent and context
   */
  async generateResponse(intent, context, candidateData, entities = []) {
    const template = this.selectTemplate(intent, context, candidateData);

    if (!template) {
      return this.generateFallbackResponse(candidateData);
    }

    const personalizedContent = this.personalizeTemplate(template, candidateData, entities);
    const finalResponse = this.addPersonalityTouches(personalizedContent, intent);

    return {
      content: finalResponse,
      intent,
      confidence: template.confidence || 0.85,
      messageType: template.messageType,
      nextActions: template.nextActions || [],
      conversationFlow: template.conversationFlow
    };
  }

  /**
   * Build response templates for different intents
   */
  buildResponseTemplates() {
    return {
      greeting_pending: {
        templates: [
          "Hi {firstName}! 👋 Welcome to WorkLink!\n\nYour account is currently under review. While you wait, I can help speed up the process by scheduling a quick verification interview.\n\n📅 Would you like to schedule a verification call?",
          "Hello {firstName}! 👋 Great to have you with WorkLink!\n\nI see your account is being reviewed. I can help expedite this by setting up a brief verification interview with our consultant.\n\n📅 Shall we schedule a quick call?",
          "Hi {firstName}! 👋 Welcome aboard!\n\nYour profile is under review right now. To help speed things up, I can arrange a quick 30-minute verification interview.\n\n📅 Would that be helpful?"
        ],
        confidence: 0.95,
        messageType: 'greeting_with_offer',
        nextActions: ['schedule_interview'],
        conversationFlow: 'initial_engagement'
      },

      greeting_active: {
        templates: [
          "Hi {firstName}! 👋 Great to see you!\n\nI'm here to help with jobs, payments, or any questions you have. What can I assist you with today?",
          "Hello {firstName}! 👋 How are you doing?\n\nReady to help with anything you need - jobs, payments, account questions, you name it!",
          "Hi {firstName}! 👋 Hope you're having a great day!\n\nWhat can I help you with today? Jobs, payments, or something else?"
        ],
        confidence: 0.95,
        messageType: 'active_greeting',
        nextActions: ['job_support', 'payment_support', 'general_help']
      },

      interview_offer: {
        templates: [
          "Perfect, {firstName}! I'd be happy to help schedule your verification interview.\n\n📋 This will be a quick 30-minute call to:\n• Verify your identity\n• Complete your profile\n• Answer any questions\n\n📅 When are you generally available? (e.g., \"weekday mornings\" or \"tomorrow afternoon\")",
          "Excellent choice, {firstName}! Let's get your verification interview scheduled.\n\n📋 The interview covers:\n• Identity verification\n• Profile completion\n• Q&A session\n\n📅 What times work best for you? Just let me know your general availability!",
          "Great, {firstName}! I'll help you schedule that verification interview.\n\n📋 It's a friendly 30-minute conversation to:\n• Verify your details\n• Complete onboarding\n• Address any questions\n\n📅 When would be convenient for you?"
        ],
        confidence: 0.95,
        messageType: 'interview_offer',
        nextActions: ['collect_availability'],
        conversationFlow: 'scheduling_started'
      },

      slot_options: {
        templates: [
          "Great! Based on your availability, here are the best options:\n\n📅 Available Interview Slots:\n{slotList}\n\nSimply reply with the number of your preferred time, or let me know if you need different options!",
          "Perfect! I found some great times that match your availability:\n\n📅 Available Times:\n{slotList}\n\nJust reply with the number (1, 2, or 3) of your choice!",
          "Excellent! Here are the available slots that work with your schedule:\n\n📅 Interview Options:\n{slotList}\n\nReply with your preferred number, or ask for more options!"
        ],
        confidence: 0.95,
        messageType: 'slot_options',
        nextActions: ['select_slot']
      },

      booking_confirmation: {
        templates: [
          "🎉 Excellent! Your verification interview is confirmed:\n\n📅 {interviewDateTime}\n⏰ 30 minutes\n🔗 Meeting link: {meetingLink}\n\nYou'll receive a reminder 24 hours before. Looking forward to speaking with you!\n\nAny questions about the interview?",
          "🎉 Perfect! Your interview is all set:\n\n📅 {interviewDateTime}\n⏰ 30 minutes\n🔗 {meetingLink}\n\nI'll send you a reminder the day before. Excited to connect with you!\n\nNeed any details about what to expect?",
          "🎉 Wonderful! Interview successfully booked:\n\n📅 {interviewDateTime}\n⏰ 30 minutes\n🔗 Meeting link: {meetingLink}\n\nYou'll get an automated reminder. Can't wait for your interview!\n\nAny questions I can help with?"
        ],
        confidence: 0.98,
        messageType: 'confirmation',
        nextActions: ['interview_questions']
      },

      payment_pending: {
        templates: [
          "Your account is still under review, so there's no payment activity yet. Once you're verified and start working, I can help track your earnings!\n\n📅 Would you like to schedule your verification interview to speed up the process?",
          "Since your account is pending verification, there aren't any payments to show yet. But once you're active and working, I'll be here to help with all your payment questions!\n\n📅 Want to schedule your verification to get started?",
          "No payment activity yet because your account is being reviewed. After verification and your first job, I'll help you track everything!\n\n📅 Shall we schedule your verification interview?"
        ],
        confidence: 0.95,
        messageType: 'payment_redirect',
        nextActions: ['schedule_interview']
      },

      payment_escalation: {
        templates: [
          "I'd be happy to help with payment questions! For the most accurate and up-to-date information about your earnings, let me connect you with our admin team who can provide exact details.",
          "Great question about payments! Our admin team has access to your complete payment history and current balance. Let me connect you with them for precise information.",
          "For payment inquiries, I want to make sure you get the most accurate information. Our admin team can provide exact details about your earnings, withdrawals, and payment schedule."
        ],
        confidence: 0.9,
        messageType: 'payment_escalation',
        nextActions: ['escalate_to_admin'],
        escalate: true
      },

      jobs_pending: {
        templates: [
          "Hi {firstName}! I understand you're eager to start working. Your account is currently under review, but I can help speed this up!\n\n📋 Once verified, you'll have access to:\n• Event staffing jobs\n• F&B positions\n• Retail opportunities\n• Admin support roles\n\n📅 Would you like to schedule your verification interview?",
          "I love the enthusiasm, {firstName}! You're ready to work and we're ready to help. Your account just needs verification first.\n\n📋 After that, you'll see:\n• Event staffing\n• Food & beverage roles\n• Retail positions\n• Administrative work\n\n📅 Want to schedule that verification interview?",
          "Great to hear you're excited about working, {firstName}! Your account is under review, but we can expedite this.\n\n📋 Jobs waiting for you include:\n• Event staffing\n• F&B opportunities\n• Retail positions\n• Admin roles\n\n📅 Ready to schedule your verification?"
        ],
        confidence: 0.95,
        messageType: 'jobs_redirect',
        nextActions: ['schedule_interview']
      },

      jobs_escalation: {
        templates: [
          "Great question about job opportunities! Our admin team has the most current information about available positions matching your profile, upcoming events, and scheduling.\n\nLet me connect you with them for personalized job assistance! 📋",
          "I'd love to help you find the perfect job opportunities! Our admin team knows all about the latest openings, event schedules, and positions that match your skills.\n\nConnecting you now for the best job guidance! 📋",
          "Excellent question! Our admin team is the expert source for current job listings, event opportunities, and matching you with the right positions.\n\nLet me get you connected for personalized job recommendations! 📋"
        ],
        confidence: 0.9,
        messageType: 'jobs_escalation',
        nextActions: ['escalate_to_admin'],
        escalate: true
      },

      clarification: {
        templates: [
          "I'm not sure which time slot you'd like. Could you please:\n\n• Reply with a number (1, 2, or 3) from the options above\n• Or tell me your preferred time more specifically\n\nI'm here to help! 😊",
          "I want to make sure I book the right time for you! Please:\n\n• Choose a number (1, 2, or 3) from the options\n• Or let me know your preferred time in another way\n\nHappy to clarify anything! 😊",
          "Let me make sure I understand correctly. Could you:\n\n• Reply with the number of your preferred slot\n• Or describe your ideal time differently\n\nI want to get this right for you! 😊"
        ],
        confidence: 0.9,
        messageType: 'clarification',
        nextActions: ['clarify_slot']
      },

      general_escalation: {
        templates: [
          "Hi {firstName}! I want to make sure I give you the best help possible. Let me connect you with our admin team who can assist with your specific question.\n\nThey're online and ready to help! 😊",
          "I want to ensure you get exactly the help you need, {firstName}. Our admin team is perfectly positioned to assist with your question.\n\nConnecting you now! 😊",
          "To make sure you get the most accurate and helpful response, {firstName}, let me connect you with our admin team.\n\nThey'll take great care of you! 😊"
        ],
        confidence: 0.8,
        messageType: 'general_fallback',
        nextActions: ['escalate_to_admin'],
        escalate: true
      },

      alternative_slots: {
        templates: [
          "I couldn't find any available slots matching your preferences. Let me offer some alternative times:\n\n📅 Next available slots:\n{alternativeSlots}\n\nReply with a number, or let me know other times that work for you!",
          "No perfect matches for your preferred times, but I have these great alternatives:\n\n📅 Available options:\n{alternativeSlots}\n\nPick a number or suggest other times!",
          "Your preferred times aren't available, but here are some excellent alternatives:\n\n📅 Alternative slots:\n{alternativeSlots}\n\nChoose a number or tell me what else works!"
        ],
        confidence: 0.9,
        messageType: 'alternative_slots',
        nextActions: ['select_slot']
      }
    };
  }

  /**
   * Build response variations for natural language
   */
  buildResponseVariations() {
    return {
      greetings: [
        "Hi {firstName}! 👋",
        "Hello {firstName}! 👋",
        "Hey {firstName}! 👋",
        "Hi there, {firstName}! 👋"
      ],

      enthusiasm: [
        "Great!",
        "Excellent!",
        "Perfect!",
        "Wonderful!",
        "Fantastic!",
        "Amazing!"
      ],

      confirmations: [
        "Absolutely!",
        "Of course!",
        "Definitely!",
        "For sure!",
        "You got it!"
      ],

      transitions: [
        "Now,",
        "So,",
        "Alright,",
        "Great, so",
        "Perfect, now"
      ]
    };
  }

  /**
   * Build personality traits for responses
   */
  buildPersonalityTraits() {
    return {
      helpful: {
        phrases: ["I'm here to help", "Happy to assist", "Let me help you with that"],
        modifiers: ["definitely", "absolutely", "certainly", "of course"]
      },

      friendly: {
        phrases: ["Great to hear from you", "Hope you're doing well", "Nice to chat with you"],
        emojis: ["😊", "👋", "📅", "🎉", "📋", "✨"],
        particles: ["lah", "yeah", "sure thing"]
      },

      professional: {
        phrases: ["I'll be happy to", "Let me assist you", "I'd be glad to help"],
        closings: ["Please let me know if you need anything else", "Feel free to ask if you have questions"]
      }
    };
  }

  /**
   * Select appropriate template based on context
   */
  selectTemplate(intent, context, candidateData) {
    const { status } = candidateData;
    const { conversationFlow } = context;

    // Map intent to template category
    let templateKey = intent;

    // Add status suffix for status-dependent templates
    if (intent === 'greeting' && status === 'pending') {
      templateKey = 'greeting_pending';
    } else if (intent === 'greeting' && status === 'active') {
      templateKey = 'greeting_active';
    } else if (intent === 'interview_scheduling') {
      templateKey = 'interview_offer';
    } else if (intent === 'offer_slots') {
      templateKey = 'slot_options';
    } else if (intent === 'booking_confirmed') {
      templateKey = 'booking_confirmation';
    } else if (intent === 'payment_inquiry' && status === 'pending') {
      templateKey = 'payment_pending';
    } else if (intent === 'payment_inquiry') {
      templateKey = 'payment_escalation';
    } else if (intent === 'job_inquiry' && status === 'pending') {
      templateKey = 'jobs_pending';
    } else if (intent === 'job_inquiry') {
      templateKey = 'jobs_escalation';
    } else if (intent === 'clarify_selection') {
      templateKey = 'clarification';
    } else if (intent === 'offer_alternatives') {
      templateKey = 'alternative_slots';
    } else {
      templateKey = 'general_escalation';
    }

    return this.templates[templateKey] || this.templates['general_escalation'];
  }

  /**
   * Personalize template with candidate data
   */
  personalizeTemplate(template, candidateData, entities) {
    // Select random template variation
    const templates = template.templates;
    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

    // Extract data for personalization
    const { name } = candidateData;
    const firstName = name ? name.split(' ')[0] : 'there';

    // Replace placeholders
    let personalizedContent = selectedTemplate
      .replace(/{firstName}/g, firstName)
      .replace(/{name}/g, name || 'there');

    return personalizedContent;
  }

  /**
   * Add personality touches to make responses more natural
   */
  addPersonalityTouches(content, intent) {
    // Add random variations for some common phrases
    content = this.addRandomVariations(content);

    // Ensure appropriate emoji usage
    content = this.optimizeEmojis(content);

    // Add natural language particles occasionally
    if (Math.random() < 0.3) {
      content = this.addLanguageParticles(content);
    }

    return content;
  }

  /**
   * Add random variations to common phrases
   */
  addRandomVariations(content) {
    // Replace some common phrases with variations
    const replacements = {
      'Great!': this.getRandomItem(this.variations.enthusiasm),
      'Perfect!': this.getRandomItem(this.variations.enthusiasm),
      'Excellent!': this.getRandomItem(this.variations.enthusiasm)
    };

    Object.entries(replacements).forEach(([original, replacement]) => {
      if (content.includes(original) && Math.random() < 0.4) {
        content = content.replace(original, replacement);
      }
    });

    return content;
  }

  /**
   * Optimize emoji usage
   */
  optimizeEmojis(content) {
    // Ensure we don't have too many emojis
    const emojiCount = (content.match(/[^\w\s]/g) || []).filter(char =>
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(char)
    ).length;

    // If too many emojis, remove some randomly
    if (emojiCount > 4) {
      const emojis = content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || [];
      const toRemove = emojis.slice(4);
      toRemove.forEach(emoji => {
        content = content.replace(emoji, '');
      });
    }

    return content;
  }

  /**
   * Add natural language particles
   */
  addLanguageParticles(content) {
    const particles = ['!', ' :)', ' 😊'];
    const randomParticle = this.getRandomItem(particles);

    // Add particle to end if it doesn't already have punctuation
    if (!content.endsWith('!') && !content.endsWith('?') && !content.endsWith('.')) {
      content += randomParticle;
    }

    return content;
  }

  /**
   * Generate fallback response
   */
  generateFallbackResponse(candidateData) {
    const { name } = candidateData;
    const firstName = name ? name.split(' ')[0] : 'there';

    const fallbacks = [
      `Hi ${firstName}! I want to make sure I give you the best help possible. Let me connect you with our admin team who can assist with your specific question.\n\nThey're online and ready to help! 😊`,
      `Thanks for reaching out, ${firstName}! To ensure you get exactly the help you need, I'll connect you with our admin team.\n\nThey'll take great care of you! 😊`,
      `Hi ${firstName}! I'd love to help you get the perfect assistance. Our admin team is best positioned to handle your specific needs.\n\nConnecting you now! 😊`
    ];

    return {
      content: this.getRandomItem(fallbacks),
      intent: 'general_escalation',
      confidence: 0.8,
      messageType: 'general_fallback',
      nextActions: ['escalate_to_admin'],
      escalate: true
    };
  }

  /**
   * Get random item from array
   */
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

// Export the generator function
async function generateResponse(intent, context, candidateData, entities = []) {
  const generator = new ResponseGenerator();
  return await generator.generateResponse(intent, context, candidateData, entities);
}

module.exports = { generateResponse, ResponseGenerator };