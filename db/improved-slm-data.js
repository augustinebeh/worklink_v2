/**
 * Improved SLM Data - Fact-Based Responses Only
 * Replaces the problematic seed data that makes false promises
 */

const improvedSLMData = [
  // PAYMENT INQUIRIES - FACT-BASED ONLY
  {
    question: "When will I get paid?",
    answer: "Payment timing depends on job completion and client approval. I'll check with the admin team on your specific jobs and provide an accurate timeline.",
    category: "payment",
    confidence: 0.9
  },
  {
    question: "How long does payment take?",
    answer: "Payment processing time varies by job type and client requirements. Let me have the admin team check your specific situation and get back to you with accurate timing.",
    category: "payment",
    confidence: 0.9
  },
  {
    question: "Why is my payment pending?",
    answer: "I can see you have pending earnings. Payment status depends on job completion verification and client approval processes. I'll flag this for admin review to get you specific details.",
    category: "payment",
    confidence: 0.85
  },

  // VERIFICATION INQUIRIES - WITH INTERVIEW SCHEDULING
  {
    question: "How long does verification take?",
    answer: "Account verification typically takes 2-3 business days through our standard review process. However, I can help speed this up by scheduling a verification interview with one of our consultants, which often leads to same-day approval. Would you like me to check available time slots?",
    category: "verification",
    confidence: 0.9
  },
  {
    question: "When will my account be approved?",
    answer: "Your account is currently under review by our team. To potentially speed up the process, I can help schedule a quick verification interview with our friendly consultant. This often fast-tracks approval significantly. Would you like me to find a good time for you?",
    category: "verification",
    confidence: 0.85
  },
  {
    question: "Why is my account pending?",
    answer: "Account reviews ensure quality and safety for all users. While our team completes the standard review process, I can offer to schedule a verification interview which typically accelerates approval. Would you be interested in scheduling one?",
    category: "verification",
    confidence: 0.85
  },

  // WITHDRAWAL INQUIRIES - NO FALSE PROMISES
  {
    question: "How do I withdraw money?",
    answer: "I'll have the admin team provide you with the current withdrawal process and any requirements. Each situation can be different, so they'll give you accurate, personalized instructions.",
    category: "withdrawal",
    confidence: 0.9
  },
  {
    question: "Are withdrawals free?",
    answer: "I'll check with the admin team about current withdrawal fees and policies to give you accurate, up-to-date information.",
    category: "withdrawal",
    confidence: 0.8
  },
  {
    question: "How fast are withdrawals?",
    answer: "Withdrawal timing depends on the method and various factors. Let me have the admin team check your specific situation and provide accurate timing information.",
    category: "withdrawal",
    confidence: 0.8
  },

  // JOB INQUIRIES - REALISTIC RESPONSES
  {
    question: "When will I get jobs?",
    answer: "Job availability depends on your skills, location, and current demand. I'll have the admin team check for opportunities that match your profile and get back to you with specific options.",
    category: "jobs",
    confidence: 0.85
  },
  {
    question: "Why am I not getting jobs?",
    answer: "There could be several factors affecting job assignments. Let me flag this for admin review so they can check your profile, availability settings, and current opportunities in your area.",
    category: "jobs",
    confidence: 0.85
  },
  {
    question: "How do I get more work?",
    answer: "I'll have the admin team review your profile and availability to suggest ways to increase your job opportunities. They can provide personalized advice based on current demand in your area.",
    category: "jobs",
    confidence: 0.8
  },

  // TECHNICAL ISSUES - ESCALATION FOCUSED
  {
    question: "The app is not working",
    answer: "I've flagged this technical issue for immediate admin attention. Please describe the specific problem you're experiencing so they can assist you properly and resolve it quickly.",
    category: "technical",
    confidence: 0.9
  },
  {
    question: "I can't log in",
    answer: "Login issues need immediate attention. I've escalated this to the admin team and they'll contact you directly to resolve this access problem.",
    category: "technical",
    confidence: 0.9
  },
  {
    question: "App keeps crashing",
    answer: "I've flagged this app stability issue for urgent technical review. The admin team will investigate this immediately and may reach out for additional details to fix it.",
    category: "technical",
    confidence: 0.9
  },

  // GENERAL SUPPORT - HONEST AND HELPFUL
  {
    question: "I need help",
    answer: "I'm here to help! Can you tell me more about what you need assistance with? I'll make sure the right team member gets back to you with accurate information.",
    category: "general",
    confidence: 0.8
  },
  {
    question: "Who can I contact?",
    answer: "I'll make sure your message reaches the appropriate admin team member who can best assist with your specific question. They'll respond personally within a few hours.",
    category: "general",
    confidence: 0.85
  },
  {
    question: "Is there a phone number?",
    answer: "I'll have the admin team provide you with the best contact method for your specific situation. Different issues may have different preferred contact channels.",
    category: "general",
    confidence: 0.8
  },

  // POLICY QUESTIONS - DEFER TO ADMIN
  {
    question: "What are your policies?",
    answer: "I'll have the admin team provide you with current policy information relevant to your question. Policies can change, so they'll give you the most up-to-date details.",
    category: "policy",
    confidence: 0.8
  },
  {
    question: "What are the requirements?",
    answer: "Requirements can vary by situation and location. I'll have the admin team provide you with specific requirements that apply to your circumstances.",
    category: "policy",
    confidence: 0.8
  },

  // EMERGENCY/URGENT - IMMEDIATE ESCALATION
  {
    question: "This is urgent",
    answer: "I understand this is urgent for you. I've immediately flagged your message for priority admin attention and they'll respond as quickly as possible.",
    category: "urgent",
    confidence: 0.95
  },
  {
    question: "I have a complaint",
    answer: "I've escalated your complaint to the admin team for immediate review. They'll address your concerns personally and work to resolve the issue quickly.",
    category: "urgent",
    confidence: 0.95
  }
];

// Categories that should trigger interview scheduling for pending candidates
const pendingCandidateSchedulingTriggers = [
  'verification',
  'approval',
  'account_status',
  'pending_review',
  'how_long_verification'
];

// Escalation triggers that need immediate admin attention
const escalationTriggers = [
  'urgent',
  'emergency',
  'complaint',
  'angry',
  'frustrated',
  'unfair',
  'wrong',
  'dispute',
  'cancel',
  'refund'
];

module.exports = {
  improvedSLMData,
  pendingCandidateSchedulingTriggers,
  escalationTriggers
};