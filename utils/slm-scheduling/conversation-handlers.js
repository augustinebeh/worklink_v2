/**
 * SLM Scheduling Bridge - Conversation Handlers
 *
 * Extracted response generation and conversation flow methods
 * for the SLM-to-SLM communication bridge.
 */

const { createLogger } = require('../structured-logger');
const logger = createLogger('slm-scheduling-conversation');

/**
 * Generate welcome message with interview scheduling offer
 */
async function generateWelcomeWithScheduling(candidate, { getConsultantReference }) {
  const firstName = candidate.name.split(' ')[0];
  const consultantRef = getConsultantReference();

  return {
    type: 'welcome_with_scheduling',
    content: `Hi ${firstName}! Welcome to WorkLink!

Your account is being reviewed by our team. While you wait, I can help speed up the process by scheduling a quick verification interview with ${consultantRef}.

**Do you prefer morning (9AM-1PM) or afternoon (2PM-6PM) for your interview?**

This will help fast-track your approval process!`,
    metadata: {
      candidateId: candidate.id,
      flow: 'welcome_with_scheduling',
      nextExpected: ['morning_preference', 'afternoon_preference']
    },
    schedulingContext: {
      stage: 'initial_offer',
      priority: 0.7
    },
    quickReplies: ['Morning', 'Afternoon']
  };
}

/**
 * Generate morning slot options (9AM-1PM)
 */
async function generateMorningSlotOptions(candidate, { getMorningSlots, formatSlotDateTime }) {
  const firstName = candidate.name.split(' ')[0];
  const morningSlots = await getMorningSlots(7);
  const topSlots = morningSlots.slice(0, 3);

  if (topSlots.length > 0) {
    const slotOptions = topSlots.map((slot, index) =>
      `${index + 1}. ${formatSlotDateTime(slot)}`
    ).join('\n');

    return {
      type: 'morning_slot_options',
      content: `Perfect! Here are the best morning slots available for you, ${firstName}:

**Morning Interview Options (9AM-1PM):**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), and I'll book it immediately!

**What you'll get:**
- 15-minute verification call
- Fast-track account approval
- Priority access to opportunities`,
      metadata: {
        candidateId: candidate.id,
        flow: 'morning_slots_offered',
        slots: topSlots,
        timePreference: 'morning'
      },
      schedulingContext: {
        stage: 'slots_offered',
        priority: 0.9,
        timePreference: 'morning',
        availableSlots: topSlots,
        shownSlots: topSlots
      }
    };
  } else {
    return {
      type: 'no_morning_slots',
      content: `Hi ${firstName}! I don't have any morning slots available in the next week.

Would you like to try **afternoon slots (2PM-6PM)** instead? Just reply "Afternoon" and I'll show you the available options!

Or I can connect you with our admin team for more scheduling options.`,
      metadata: {
        candidateId: candidate.id,
        flow: 'no_morning_availability'
      },
      quickReplies: ['Afternoon', 'Contact Admin']
    };
  }
}

/**
 * Generate afternoon slot options (2PM-6PM)
 */
async function generateAfternoonSlotOptions(candidate, { getAfternoonSlots, formatSlotDateTime }) {
  const firstName = candidate.name.split(' ')[0];
  const afternoonSlots = await getAfternoonSlots(7);
  const topSlots = afternoonSlots.slice(0, 3);

  if (topSlots.length > 0) {
    const slotOptions = topSlots.map((slot, index) =>
      `${index + 1}. ${formatSlotDateTime(slot)}`
    ).join('\n');

    return {
      type: 'afternoon_slot_options',
      content: `Excellent choice! Here are the best afternoon slots for you, ${firstName}:

**Afternoon Interview Options (2PM-6PM):**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), and I'll book it immediately!

**What you'll get:**
- 15-minute verification call
- Fast-track account approval
- Priority access to opportunities`,
      metadata: {
        candidateId: candidate.id,
        flow: 'afternoon_slots_offered',
        slots: topSlots,
        timePreference: 'afternoon'
      },
      schedulingContext: {
        stage: 'slots_offered',
        priority: 0.9,
        timePreference: 'afternoon',
        availableSlots: topSlots,
        shownSlots: topSlots
      }
    };
  } else {
    return {
      type: 'no_afternoon_slots',
      content: `Hi ${firstName}! I don't have any afternoon slots available in the next week.

Would you like to try **morning slots (9AM-1PM)** instead? Just reply "Morning" and I'll show you the available options!

Or I can connect you with our admin team for more scheduling options.`,
      metadata: {
        candidateId: candidate.id,
        flow: 'no_afternoon_availability'
      },
      quickReplies: ['Morning', 'Contact Admin']
    };
  }
}

/**
 * Generate interview offer
 */
async function generateInterviewOffer(candidate, { getConsultantReference, getAvailableSlots, formatSlotDateTime }) {
  const firstName = candidate.name.split(' ')[0];
  const consultantRef = getConsultantReference();
  const availableSlots = await getAvailableSlots(7);
  const nextSlot = availableSlots[0];

  let slotText = '';
  if (nextSlot) {
    slotText = `\n**Next available slot**: ${formatSlotDateTime(nextSlot)}`;
  }

  return {
    type: 'interview_offer',
    content: `Perfect, ${firstName}! I'd love to schedule your verification interview.

This will be a quick 15-minute chat with ${consultantRef} to:
- Verify your profile and experience
- Understand your career goals
- Fast-track your account approval
- Show you exciting opportunities available

${slotText}

**How would you like to proceed?**
1. "**BOOK NOW**" - I'll schedule the next available slot
2. "**MY AVAILABILITY**" - Tell me your preferred times
3. "**QUESTIONS**" - Ask anything about the process

What works best for you?`,
    metadata: {
      candidateId: candidate.id,
      flow: 'interview_offer',
      availableSlot: nextSlot
    },
    schedulingContext: {
      stage: 'offer_made',
      priority: 0.8
    }
  };
}

/**
 * Collect availability preferences
 */
async function collectAvailabilityPreferences(candidate, message, { parseAvailabilityFromMessage, findSlotsMatchingPreferences, formatSlotDateTime, context }) {
  const firstName = candidate.name.split(' ')[0];
  const availability = parseAvailabilityFromMessage(message);

  if (availability.found) {
    const matchingSlots = await findSlotsMatchingPreferences(availability, context.timePreference);

    if (matchingSlots.length > 0) {
      const topSlots = matchingSlots.slice(0, 3);
      const slotOptions = topSlots.map((slot, index) =>
        `${index + 1}. ${formatSlotDateTime(slot)}`
      ).join('\n');

      return {
        type: 'availability_options',
        content: `Great, ${firstName}! Based on your availability, here are the best options:

**Available Interview Slots:**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), or:
- "**1**" for ${formatSlotDateTime(topSlots[0])}
- "**DIFFERENT TIME**" if none of these work
- "**QUESTIONS**" if you need more info

I'll book it immediately once you confirm!`,
        metadata: {
          candidateId: candidate.id,
          flow: 'availability_collected',
          slots: topSlots
        },
        schedulingContext: {
          stage: 'slots_offered',
          priority: 0.9,
          availabilityPreferences: availability
        }
      };
    }
  }

  return {
    type: 'availability_clarification',
    content: `Thanks ${firstName}! To find the perfect time slot, could you help me understand your schedule better?

**Please let me know:**
- **Days**: Which days work best? (weekdays/weekends)
- **Time**: Morning (9-12), Afternoon (1-5), or Evening (6-8)?
- **Timezone**: Are you in Singapore timezone?

**Example responses:**
- "Weekday mornings work best"
- "Tuesday or Wednesday afternoon"
- "Any time except Monday"

Once I know your preferences, I can find the perfect slot!`,
    metadata: {
      candidateId: candidate.id,
      flow: 'availability_clarification'
    }
  };
}

/**
 * Process slot selection when user picks a specific slot
 */
async function processSlotSelection(candidate, flow, context, { getConsultantReference, formatSlotDateTime, updateConversationState }) {
  const firstName = candidate.name.split(' ')[0];

  try {
    let selectedSlot = flow.selectedSlot;
    if (!selectedSlot && context.shownSlots && flow.selectedIndex !== undefined) {
      selectedSlot = context.shownSlots[flow.selectedIndex];
    }

    if (!selectedSlot) {
      return generateErrorResponse('slot_not_found');
    }

    const formattedDateTime = formatSlotDateTime(selectedSlot);

    await updateConversationState(candidate.id, {
      current_stage: 'slot_selected',
      selected_slot_index: flow.selectedIndex,
      scheduling_context: JSON.stringify({
        selectedSlot,
        stage: 'slot_selected'
      })
    });

    return {
      type: 'slot_selection_confirmation',
      content: `Perfect choice, ${firstName}!

**You've selected**: ${formattedDateTime}
**Duration**: 15 minutes
**Meeting Type**: Video call
**Interviewer**: ${getConsultantReference()}

**Ready to confirm this interview?**

Reply "**CONFIRM**" to book this slot, or "**DIFFERENT TIME**" if you'd like to see other options.

This interview will help fast-track your account approval!`,
      metadata: {
        candidateId: candidate.id,
        selectedSlot,
        selectedIndex: flow.selectedIndex
      },
      schedulingContext: {
        stage: 'slot_selected',
        selectedSlot,
        selectedIndex: flow.selectedIndex,
        priority: 0.95
      }
    };

  } catch (error) {
    logger.error('Error processing slot selection:', { error: error });
    return generateErrorResponse('slot_not_found');
  }
}

/**
 * Clarify slot selection when user input is ambiguous
 */
async function clarifySlotSelection(candidate, context, { formatSlotDateTime, generateWelcomeWithSchedulingFn }) {
  const firstName = candidate.name.split(' ')[0];

  if (context.shownSlots && context.shownSlots.length > 0) {
    const slotOptions = context.shownSlots.map((slot, index) =>
      `${index + 1}. ${formatSlotDateTime(slot)}`
    ).join('\n');

    return {
      type: 'slot_selection_clarification',
      content: `Hi ${firstName}! I want to make sure I book the right time for you.

**Available options:**
${slotOptions}

Please reply with the **number** of your preferred slot (1, 2, or 3), like this:
- "**1**" for the first option
- "**2**" for the second option
- "**3**" for the third option

Which one works best for you?`,
      metadata: {
        candidateId: candidate.id,
        availableSlots: context.shownSlots
      },
      schedulingContext: {
        stage: 'slots_offered',
        availableSlots: context.shownSlots,
        priority: 0.9
      }
    };
  } else {
    return generateWelcomeWithSchedulingFn(candidate);
  }
}

/**
 * Confirm interview booking
 */
async function confirmInterviewBooking(candidate, context, { schedulingEngine, getConsultantReference, formatSlotDateTime, clearConversationState }) {
  const firstName = candidate.name.split(' ')[0];

  try {
    let selectedSlot = null;

    if (context.selectedSlot) {
      selectedSlot = context.selectedSlot;
    } else if (context.shownSlots && context.selectedSlotIndex !== undefined) {
      selectedSlot = context.shownSlots[context.selectedSlotIndex];
    } else if (context.schedulingContext?.selectedSlot) {
      selectedSlot = context.schedulingContext.selectedSlot;
    }

    if (!selectedSlot) {
      return generateErrorResponse('slot_not_found');
    }

    const candidateForBooking = {
      ...candidate,
      candidate_id: candidate.id
    };
    const bookingResult = await schedulingEngine.scheduleInterview(candidateForBooking, selectedSlot);

    if (bookingResult) {
      logger.info('Direct booking confirmed for candidate ${candidate.id}');
      await clearConversationState(candidate.id);

      const meetingLink = `https://meet.worklink.com/interview/${bookingResult}`;
      const dateTime = formatSlotDateTime(selectedSlot);

      return {
        type: 'booking_confirmed',
        content: `**Interview Confirmed!**

Hi ${firstName}, your verification interview is booked:

**Interview Details:**
- **Date & Time**: ${dateTime}
- **Duration**: 15 minutes
- **Meeting Link**: ${meetingLink}
- **Interviewer**: ${getConsultantReference()}

**What's Next:**
1. **Calendar Invite** - You'll receive an email confirmation shortly
2. **Reminder** - I'll remind you 24 hours before
3. **Preparation** - Have your resume ready (optional)
4. **Join Link** - Use the meeting link above when it's time

**Questions?** Just ask! I'm here to help.

Looking forward to meeting you!

*P.S. Your account approval will be fast-tracked after this interview.*`,
        metadata: {
          candidateId: candidate.id,
          interviewId: bookingResult,
          meetingLink,
          scheduledTime: selectedSlot
        },
        schedulingContext: {
          stage: 'confirmed',
          status: 'scheduled'
        }
      };
    } else {
      return generateErrorResponse('booking_failed');
    }

  } catch (error) {
    logger.error('Booking confirmation error:', { error: error });
    return generateErrorResponse('booking_failed');
  }
}

/**
 * Generate existing interview reminder
 */
async function generateExistingInterviewReminder(candidate, { schedulingEngine, formatSlotDateTime, generateInterviewOfferFn }) {
  const firstName = candidate.name.split(' ')[0];

  const existingInterview = schedulingEngine.db.prepare(`
    SELECT * FROM interview_slots
    WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
    ORDER BY scheduled_date, scheduled_time
    LIMIT 1
  `).get(candidate.id);

  if (existingInterview) {
    return {
      type: 'existing_interview_reminder',
      content: `Hi ${firstName}! You already have an interview scheduled.

**Your Interview Details:**
- **Date & Time**: ${formatSlotDateTime({
        date: existingInterview.scheduled_date,
        time: existingInterview.scheduled_time
      })}
- **Duration**: 15 minutes
- **Meeting Link**: ${existingInterview.meeting_link || 'Will be provided 24 hours before'}

**Need to make changes?**
- Reply "**RESCHEDULE**" to change the time
- Reply "**CONFIRM**" to confirm attendance
- Reply "**QUESTIONS**" if you need more info

Looking forward to meeting you!`,
      metadata: {
        candidateId: candidate.id,
        interviewId: existingInterview.id,
        scheduledTime: {
          date: existingInterview.scheduled_date,
          time: existingInterview.scheduled_time
        }
      }
    };
  } else {
    return generateInterviewOfferFn(candidate);
  }
}

/**
 * Generate real-time scheduling offer
 */
async function generateRealTimeSchedulingOffer(candidate, { schedulingEngine, formatInterviewDateTime, getAvailableCalendarSlots }) {
  const firstName = candidate.name.split(' ')[0];

  const existingInterview = schedulingEngine.db.prepare(`
    SELECT * FROM interview_slots
    WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
  `).get(candidate.id);

  if (existingInterview) {
    const interviewDate = new Date(existingInterview.scheduled_date + 'T' + existingInterview.scheduled_time);
    const formattedDate = formatInterviewDateTime(interviewDate);

    return {
      type: 'existing_interview',
      content: `Hi ${firstName}! You already have a verification interview scheduled:

**${formattedDate}**
**30 minutes**
**Meeting link**: ${existingInterview.meeting_link}

You'll receive a reminder 24 hours before. Need to reschedule? Just let me know!`,
      metadata: {
        candidateId: candidate.id,
        interviewId: existingInterview.id,
        scheduledDateTime: formattedDate
      }
    };
  }

  const availableSlots = await getAvailableCalendarSlots();

  if (availableSlots.length > 0) {
    const topSlots = availableSlots.slice(0, 3);
    const slotsList = topSlots.map((slot, index) =>
      `${index + 1}. **${formatInterviewDateTime(slot.datetime)}**`
    ).join('\n');

    return {
      type: 'real_time_scheduling',
      content: `Perfect! I can schedule your verification interview right now. Here are the next available slots:

**Available Times:**
${slotsList}

Simply reply with the number of your preferred time (1, 2, or 3) and I'll book it immediately!

Need different times? Just ask and I'll check our calendar for more options.`,
      metadata: {
        candidateId: candidate.id,
        availableSlots: topSlots.map((slot, index) => ({
          id: index + 1,
          datetime: slot.datetime,
          consultant_id: slot.consultant_id || 'primary'
        }))
      }
    };
  } else {
    return {
      type: 'no_availability',
      content: `Hi ${firstName}! I'd love to schedule your verification interview, but our calendar is currently full for the next few days.

Let me connect you with our admin team who can:
- Check for any last-minute openings
- Schedule you for next available slot
- Provide updates on availability

They'll reach out to you shortly!`,
      metadata: {
        candidateId: candidate.id,
        escalateReason: 'no_calendar_availability'
      }
    };
  }
}

/**
 * Handle escalation requests for scheduling issues
 */
async function handleEscalationRequest(candidate, message, intent, { schedulingEngine }) {
  const firstName = candidate.name.split(' ')[0];

  try {
    const AdminEscalationSystem = require('../../services/admin-escalation-system');
    const escalationSystem = new AdminEscalationSystem();

    let escalationData = {
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      urgency: 'HIGH',
      triggerType: 'CHAT_RESCHEDULE_REQUEST',
      context: {
        originalMessage: message,
        intent: intent.primary,
        conversationStage: 'scheduling_flow'
      },
      title: `Scheduling assistance requested by ${candidate.name}`,
      description: `Candidate requested scheduling assistance: "${message}"`
    };

    const existingInterview = schedulingEngine.db.prepare(`
      SELECT * FROM interview_slots
      WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
      ORDER BY scheduled_date DESC, scheduled_time DESC
      LIMIT 1
    `).get(candidate.id);

    if (existingInterview) {
      escalationData.context.existingInterview = {
        scheduledDate: existingInterview.scheduled_date,
        scheduledTime: existingInterview.scheduled_time,
        interviewId: existingInterview.id
      };

      const now = new Date();
      const interviewDateTime = new Date(`${existingInterview.scheduled_date}T${existingInterview.scheduled_time}`);
      const hoursUntilInterview = (interviewDateTime - now) / (1000 * 60 * 60);

      if (hoursUntilInterview <= 24) {
        escalationData.urgency = 'CRITICAL';
        escalationData.triggerType = 'RESCHEDULE_WITHIN_24H';
        escalationData.title = `URGENT: Reschedule request within 24 hours - ${candidate.name}`;
      }
    }

    await escalationSystem.createEscalation(escalationData);

    return {
      type: 'escalation_created',
      content: `Hi ${firstName}! I understand you need help with scheduling.

I've connected you with our admin team who can provide personalized assistance. They'll reach out to you shortly to help resolve your scheduling needs.

In the meantime, if this is urgent, you can also call/WhatsApp Augustine directly for immediate assistance.

Is there anything else I can help you with while you wait?`,
      metadata: {
        candidateId: candidate.id,
        escalated: true,
        escalationType: escalationData.triggerType
      }
    };

  } catch (error) {
    logger.error('Error creating escalation:', { error: error });

    return {
      type: 'escalation_fallback',
      content: `Hi ${firstName}! I understand you need help with scheduling.

I'll connect you with our admin team for personalized assistance. In the meantime, you can reach out directly for immediate help.

Is there anything else I can assist you with?`,
      metadata: {
        candidateId: candidate.id,
        escalationError: true
      }
    };
  }
}

/**
 * Generate slot selection confirmation when user requests specific time
 */
async function generateSlotSelectionConfirmation(candidate, message, context, { parseSpecificSlotRequest, getAvailableSlots, findMatchingSlot, formatSlotDateTime, getConsultantReference, generateRealTimeSchedulingOfferFn }) {
  const firstName = candidate.name.split(' ')[0];
  const requestedSlot = parseSpecificSlotRequest(message);

  if (requestedSlot) {
    const availableSlots = await getAvailableSlots(14);
    const matchingSlot = findMatchingSlot(availableSlots, requestedSlot);

    if (matchingSlot) {
      const formattedDateTime = formatSlotDateTime(matchingSlot);

      return {
        type: 'slot_selection_confirmation',
        content: `Perfect, ${firstName}! I can book you for ${formattedDateTime}.

**Interview Details:**
- **Date & Time**: ${formattedDateTime}
- **Duration**: 15 minutes
- **Meeting Type**: Video call
- **Interviewer**: ${getConsultantReference()}

**Ready to confirm your interview?**

Reply "**CONFIRM**" to book this slot, or "**DIFFERENT TIME**" to see other options.

This interview will help fast-track your account approval!`,
        metadata: {
          candidateId: candidate.id,
          selectedSlot: matchingSlot,
          requestedTime: requestedSlot
        },
        schedulingContext: {
          stage: 'slot_selected',
          selectedSlot: matchingSlot,
          priority: 0.95
        }
      };
    } else {
      const topSlots = availableSlots.slice(0, 3);
      const slotOptions = topSlots.map((slot, index) =>
        `${index + 1}. ${formatSlotDateTime(slot)}`
      ).join('\n');

      return {
        type: 'slot_unavailable_alternatives',
        content: `I understand you'd like to book for ${requestedSlot.originalText}, ${firstName}!

Unfortunately, that specific time slot isn't available. However, I have these great alternatives:

**Available Interview Slots:**
${slotOptions}

Simply reply with the number of your preferred slot (1, 2, or 3), or let me know your other preferences!

All slots are 15-minute verification calls that will help fast-track your approval.`,
        metadata: {
          candidateId: candidate.id,
          requestedSlot: requestedSlot,
          availableSlots: topSlots
        },
        schedulingContext: {
          stage: 'offering_alternatives',
          priority: 0.9
        }
      };
    }
  } else {
    return generateRealTimeSchedulingOfferFn(candidate);
  }
}

/**
 * Handle reschedule requests
 */
async function handleRescheduleRequest(candidate, context, { schedulingEngine, formatSlotDateTime, generateInterviewOfferFn }) {
  const firstName = candidate.name.split(' ')[0];

  const existingInterview = schedulingEngine.db.prepare(`
    SELECT * FROM interview_slots
    WHERE candidate_id = ? AND status IN ('scheduled', 'confirmed')
  `).get(candidate.id);

  if (existingInterview) {
    return {
      type: 'reschedule_offer',
      content: `No problem, ${firstName}! I can help you reschedule your interview.

**Current Booking**: ${formatSlotDateTime({
        date: existingInterview.scheduled_date,
        time: existingInterview.scheduled_time
      })}

**To reschedule:**
1. Tell me your new availability preferences
2. Or reply "**NEXT AVAILABLE**" for the earliest slot
3. Or call/WhatsApp Augustine directly: [contact info]

What works better for you?`,
      metadata: {
        candidateId: candidate.id,
        existingInterviewId: existingInterview.id
      }
    };
  } else {
    return generateInterviewOfferFn(candidate);
  }
}

/**
 * Generate generic response
 */
function generateGenericResponse(candidate) {
  const firstName = candidate.name.split(' ')[0];

  return {
    type: 'generic',
    content: `Hi ${firstName}! I'm here to help with your WorkLink verification process.

Would you like me to:
**Schedule your verification interview**
**Answer questions about the process**
**Check your application status**

Just let me know how I can assist you!`
  };
}

/**
 * Generate error response
 */
function generateErrorResponse(errorType, details = {}) {
  const errorMessages = {
    candidate_not_found: 'Sorry, I couldn\'t find your profile. Please contact support.',
    slot_not_found: 'I couldn\'t find that time slot. Let me show you available options.',
    booking_failed: 'Sorry, there was an issue booking your interview. Let me try again or show you other options.',
    system_error: 'I\'m experiencing technical difficulties. Please try again in a moment.',
    health_check_failed: 'I\'m having connectivity issues. Our admin team has been notified and will assist you shortly.'
  };

  return {
    type: 'error',
    content: errorMessages[errorType] || errorMessages.system_error,
    metadata: {
      errorType,
      timestamp: new Date().toISOString(),
      ...details
    }
  };
}

module.exports = {
  generateWelcomeWithScheduling,
  generateMorningSlotOptions,
  generateAfternoonSlotOptions,
  generateInterviewOffer,
  collectAvailabilityPreferences,
  processSlotSelection,
  clarifySlotSelection,
  confirmInterviewBooking,
  generateExistingInterviewReminder,
  generateRealTimeSchedulingOffer,
  handleEscalationRequest,
  generateSlotSelectionConfirmation,
  handleRescheduleRequest,
  generateGenericResponse,
  generateErrorResponse
};
