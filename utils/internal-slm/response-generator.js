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
   * Generate response based on intent, context, and channel
   */
  async generateResponse(intent, context, candidateData, entities = [], channel = 'app') {
    const template = this.selectTemplate(intent, context, candidateData, channel);

    if (!template) {
      return this.generateFallbackResponse(candidateData, channel);
    }

    const personalizedContent = this.personalizeTemplate(template, candidateData, entities);
    const finalResponse = this.addPersonalityTouches(personalizedContent, intent, channel);

    const response = {
      content: finalResponse,
      intent,
      confidence: template.confidence || 0.85,
      messageType: template.messageType,
      nextActions: template.nextActions || [],
      conversationFlow: template.conversationFlow,
      channel: channel
    };

    // Generate smart quick replies based on intent and nextActions
    const quickReplies = this.generateSmartQuickReplies(intent, template.nextActions || [], candidateData, channel);
    if (quickReplies.length > 0) {
      response.quickReplies = quickReplies;

      // Generate Telegram inline keyboards for Telegram channel
      if (channel === 'telegram') {
        response.telegramButtons = this.generateTelegramButtons(quickReplies);
      }
    }

    return response;
  }

  /**
   * Build response templates for different intents
   */
  buildResponseTemplates() {
    return {
      greeting_pending: {
        telegram: {
          templates: [
            "Hi {firstName}! 👋 Welcome to WorkLink!\n\nYour account is currently under review. While you wait, I can help speed up the process by scheduling a quick verification interview.\n\n📅 **Would you like to schedule a verification call?**",
            "Hello {firstName}! 👋 Great to have you with WorkLink!\n\nI see your account is being reviewed. I can help expedite this by setting up a brief verification interview with our consultant.\n\n📅 **Shall we schedule a quick call?**",
            "Hi {firstName}! 👋 Welcome aboard!\n\nYour profile is under review right now. To help speed things up, I can arrange a quick 30-minute verification interview.\n\n📅 **Would that be helpful?**"
          ],
          confidence: 0.95,
          messageType: 'greeting_with_offer',
          nextActions: ['schedule_interview'],
          conversationFlow: 'initial_engagement'
        },
        app: {
          templates: [
            "Hey {firstName}! Welcome to WorkLink. Your account is being reviewed by our team right now. While you wait, I can actually help speed things up by scheduling a quick verification call with one of our consultants. Want me to find you a time?",
            "Hi {firstName}! Great to have you here. I can see your account is under review. To help move things along faster, I could set up a brief verification interview for you. Would that work?",
            "Hello {firstName}! Your account is currently being reviewed by our team. I can help expedite the process by arranging a quick verification call. Interested?"
          ],
          confidence: 0.95,
          messageType: 'greeting_with_offer',
          nextActions: ['schedule_interview'],
          conversationFlow: 'initial_engagement'
        }
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
        telegram: {
          templates: [
            "Perfect, {firstName}! I'd be happy to help schedule your verification interview.\n\n📋 **This will be a quick 30-minute call to:**\n• Verify your identity\n• Complete your profile\n• Answer any questions\n\n📅 **When are you generally available?** (e.g., \"weekday mornings\" or \"tomorrow afternoon\")",
            "Excellent choice, {firstName}! Let's get your verification interview scheduled.\n\n📋 **The interview covers:**\n• Identity verification\n• Profile completion\n• Q&A session\n\n📅 **What times work best for you?** Just let me know your general availability!",
            "Great, {firstName}! I'll help you schedule that verification interview.\n\n📋 **It's a friendly 30-minute conversation to:**\n• Verify your details\n• Complete onboarding\n• Address any questions\n\n📅 **When would be convenient for you?**"
          ],
          confidence: 0.95,
          messageType: 'interview_offer',
          nextActions: ['collect_availability'],
          conversationFlow: 'scheduling_started'
        },
        app: {
          templates: [
            "Perfect! I can help you schedule a verification call. It's just a quick 30-minute chat to verify your identity, complete your profile, and answer any questions you might have. When are you usually free? Just let me know like \"weekday mornings\" or \"tomorrow afternoon\" and I'll find something that works.",
            "Great! Let's get you scheduled for a verification interview. It'll be about 30 minutes to go through identity verification, complete your profile setup, and handle any questions. What times generally work for you?",
            "Awesome! I'll set up a verification call for you. It's a friendly 30-minute conversation to verify your details, finish your onboarding, and answer anything you're curious about. When would be convenient for you?"
          ],
          confidence: 0.95,
          messageType: 'interview_offer',
          nextActions: ['collect_availability'],
          conversationFlow: 'scheduling_started'
        }
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
   * Select appropriate template based on context and channel
   */
  selectTemplate(intent, context, candidateData, channel = 'app') {
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

    // Get the base template
    const baseTemplate = this.templates[templateKey] || this.templates['general_escalation'];

    // Return channel-specific version if available
    if (baseTemplate && baseTemplate[channel]) {
      return baseTemplate[channel];
    }

    // Fallback to base template for backwards compatibility
    return baseTemplate;
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
  addPersonalityTouches(content, intent, channel = 'app') {
    // Add random variations for some common phrases
    content = this.addRandomVariations(content, channel);

    // For in-app chat, remove formatting and make more conversational
    if (channel === 'app') {
      content = this.makeConversational(content);
    } else {
      // For Telegram, ensure appropriate emoji usage
      content = this.optimizeEmojis(content);
    }

    // Add natural language particles occasionally for in-app chat
    if (channel === 'app' && Math.random() < 0.3) {
      content = this.addLanguageParticles(content);
    }

    return content;
  }

  /**
   * Generate smart quick replies based on intent and context
   */
  generateSmartQuickReplies(intent, nextActions, candidateData, channel = 'app') {
    const quickReplies = [];

    // Generate contextual quick replies based on intent
    switch (intent) {
      case 'greeting_pending':
        quickReplies.push(
          {
            text: channel === 'telegram' ? '📅 Schedule Interview' : 'Schedule Interview',
            action: 'schedule_interview',
            params: { candidateId: candidateData.id },
            metadata: { icon: 'calendar', color: 'emerald' }
          },
          {
            text: channel === 'telegram' ? '❓ Ask Question' : 'Ask Question',
            action: 'general_inquiry',
            params: { topic: 'general' },
            metadata: { icon: 'help-circle', color: 'blue' }
          }
        );
        break;

      case 'greeting_active':
        quickReplies.push(
          {
            text: channel === 'telegram' ? '💼 View Jobs' : 'View Jobs',
            action: 'job_inquiry',
            params: { type: 'available' },
            metadata: { icon: 'briefcase', color: 'violet' }
          },
          {
            text: channel === 'telegram' ? '💰 Payment Info' : 'Payment Info',
            action: 'payment_inquiry',
            params: { type: 'status' },
            metadata: { icon: 'dollar-sign', color: 'emerald' }
          }
        );
        break;

      case 'interview_offer':
        quickReplies.push(
          {
            text: channel === 'telegram' ? '✅ Yes, Schedule' : 'Yes, Schedule',
            action: 'accept_interview_offer',
            params: { candidateId: candidateData.id },
            metadata: { icon: 'check', color: 'emerald' }
          },
          {
            text: channel === 'telegram' ? '📅 Different Time' : 'Different Time',
            action: 'request_different_time',
            params: { preference: 'other' },
            metadata: { icon: 'clock', color: 'amber' }
          }
        );
        break;

      case 'slot_options':
        // Generate quick replies for time slot selection
        // These should be generated dynamically based on available slots
        quickReplies.push(
          {
            text: 'Option 1',
            action: 'select_time_slot',
            params: { slotId: 1 },
            metadata: { icon: 'calendar', color: 'emerald' }
          },
          {
            text: 'Option 2',
            action: 'select_time_slot',
            params: { slotId: 2 },
            metadata: { icon: 'calendar', color: 'emerald' }
          },
          {
            text: 'Option 3',
            action: 'select_time_slot',
            params: { slotId: 3 },
            metadata: { icon: 'calendar', color: 'emerald' }
          },
          {
            text: channel === 'telegram' ? '🔄 More Options' : 'More Options',
            action: 'request_more_slots',
            params: {},
            metadata: { icon: 'refresh-cw', color: 'blue' }
          }
        );
        break;

      case 'booking_confirmation':
        quickReplies.push(
          {
            text: channel === 'telegram' ? '✅ Confirmed' : 'Confirmed',
            action: 'acknowledge_booking',
            params: { confirmed: true },
            metadata: { icon: 'check-circle', color: 'emerald' }
          },
          {
            text: channel === 'telegram' ? '📅 Reschedule' : 'Reschedule',
            action: 'request_reschedule',
            params: {},
            metadata: { icon: 'calendar', color: 'amber' }
          }
        );
        break;

      default:
        // General availability-based quick replies
        if (nextActions.includes('schedule_interview')) {
          quickReplies.push({
            text: channel === 'telegram' ? '📅 Schedule Now' : 'Schedule Now',
            action: 'schedule_interview',
            params: { candidateId: candidateData.id },
            metadata: { icon: 'calendar', color: 'emerald' }
          });
        }

        if (nextActions.includes('escalate_to_admin')) {
          quickReplies.push({
            text: channel === 'telegram' ? '👤 Talk to Admin' : 'Talk to Admin',
            action: 'escalate_to_admin',
            params: { reason: 'user_request' },
            metadata: { icon: 'user', color: 'blue' }
          });
        }

        // Always provide general help option
        quickReplies.push({
          text: channel === 'telegram' ? '❓ Help' : 'Help',
          action: 'general_help',
          params: {},
          metadata: { icon: 'help-circle', color: 'gray' }
        });
        break;
    }

    return quickReplies;
  }

  /**
   * Generate Telegram inline keyboard buttons
   */
  generateTelegramButtons(quickReplies) {
    // Convert quick replies to Telegram inline keyboard format
    const buttons = quickReplies.map(reply => ({
      text: reply.text,
      callback_data: `${reply.action}:${JSON.stringify(reply.params)}`
    }));

    // Group buttons in rows (max 2 buttons per row for better mobile UX)
    const buttonRows = [];
    for (let i = 0; i < buttons.length; i += 2) {
      buttonRows.push(buttons.slice(i, i + 2));
    }

    return buttonRows;
  }

  /**
   * Add random variations to common phrases
   */
  addRandomVariations(content, channel = 'app') {
    if (channel === 'telegram') {
      // Keep existing behavior for Telegram
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
    } else {
      // For in-app chat, use more casual variations
      const appReplacements = {
        'Great!': this.getRandomItem(['Nice!', 'Awesome!', 'Sounds good!', 'Perfect!']),
        'Perfect!': this.getRandomItem(['Great!', 'Excellent!', 'That works!', 'Sounds perfect!']),
        'Excellent!': this.getRandomItem(['Great!', 'Perfect!', 'Awesome!', 'Nice!']),
        'Hi ': this.getRandomItem(['Hey ', 'Hi ', 'Hello ']),
        'Hello ': this.getRandomItem(['Hi ', 'Hey ', 'Hello '])
      };

      Object.entries(appReplacements).forEach(([original, replacement]) => {
        if (content.includes(original) && Math.random() < 0.4) {
          content = content.replace(original, replacement);
        }
      });
    }

    return content;
  }

  /**
   * Make content more conversational for in-app chat
   */
  makeConversational(content) {
    // Remove Telegram-style formatting and make more human-like
    content = content
      // Remove structured formatting
      .replace(/\n\n📅\s*/g, '\n\n')
      .replace(/\n\n📋\s*/g, '\n\n')
      .replace(/\n\n🎉\s*/g, '\n\n')
      // Remove bullet points and make flowing
      .replace(/\n•\s*/g, ', ')
      .replace(/\n-\s*/g, ', ')
      // Remove excessive emojis but keep some
      .replace(/📅\s*/g, '')
      .replace(/📋\s*/g, '')
      .replace(/⏰\s*/g, '')
      .replace(/🔗\s*/g, '')
      // Keep friendly emojis but reduce frequency
      .replace(/👋/g, Math.random() < 0.3 ? '👋' : '')
      .replace(/😊/g, Math.random() < 0.5 ? '😊' : '')
      .replace(/🎉/g, Math.random() < 0.6 ? '🎉' : '')
      // Make more conversational
      .replace(/Would you like to/g, 'Want to')
      .replace(/I would be happy to/g, "I'd be happy to")
      .replace(/I will/g, "I'll")
      .replace(/You will/g, "You'll")
      // Remove overly formal language
      .replace(/verification interview/g, 'quick verification call')
      .replace(/verification call/g, 'verification call')
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();

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
  generateFallbackResponse(candidateData, channel = 'app') {
    const { name } = candidateData;
    const firstName = name ? name.split(' ')[0] : 'there';

    const telegramFallbacks = [
      `Hi ${firstName}! I want to make sure I give you the best help possible. Let me connect you with our admin team who can assist with your specific question.\n\nThey're online and ready to help! 😊`,
      `Thanks for reaching out, ${firstName}! To ensure you get exactly the help you need, I'll connect you with our admin team.\n\nThey'll take great care of you! 😊`,
      `Hi ${firstName}! I'd love to help you get the perfect assistance. Our admin team is best positioned to handle your specific needs.\n\nConnecting you now! 😊`
    ];

    const appFallbacks = [
      `Hey ${firstName}, let me get someone from our admin team to help you with that. They'll know exactly how to assist you.`,
      `Hi ${firstName}! I want to make sure you get the right help, so I'm connecting you with our admin team. They should be able to sort this out for you.`,
      `${firstName}, let me pass this along to our admin team - they'll be able to give you a proper answer on this.`
    ];

    const fallbacks = channel === 'telegram' ? telegramFallbacks : appFallbacks;

    return {
      content: this.getRandomItem(fallbacks),
      intent: 'general_escalation',
      confidence: 0.8,
      messageType: 'general_fallback',
      nextActions: ['escalate_to_admin'],
      escalate: true,
      channel: channel
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