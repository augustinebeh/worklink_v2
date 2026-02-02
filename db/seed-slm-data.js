/**
 * SLM Training Data Generator
 *
 * Generates high-quality training data for WorkLink's chat AI.
 * Creates variations using synonym replacement and template expansion.
 *
 * Usage: node db/seed-slm-data.js
 */

// Database instance - set lazily or passed in
let _db = null;

function setDb(dbInstance) {
  _db = dbInstance;
}

function getDb() {
  if (!_db) {
    // Only require if not already set (avoids circular dep when called from database.js)
    _db = require('./database').db;
  }
  return _db;
}

// ============================================
// PHASE 1: HIGH-QUALITY SEED DATA
// ============================================

const seedData = [
  // PAYMENT INQUIRIES - FACT-BASED ONLY
  {
    intent: "payment",
    prompt: "When will I get paid?",
    completion: "Payment timing depends on job completion and client approval. I'll check with the admin team on your specific jobs and provide an accurate timeline."
  },
  {
    intent: "payment",
    prompt: "How long does payment take?",
    completion: "Payment processing time varies by job type and client requirements. Let me have the admin team check your specific situation and get back to you with accurate timing."
  },
  {
    intent: "payment",
    prompt: "Why is my payment pending?",
    completion: "I can see you have pending earnings. Payment status depends on job completion verification and client approval processes. I'll flag this for admin review to get you specific details."
  },
  {
    intent: "payment",
    prompt: "How do I cash out my earnings?",
    completion: "Go to the Wallet tab and tap 'Withdraw'. Processing time varies by payment method - I'll have the admin team check your specific situation for accurate timing. 💰"
  },
  {
    intent: "payment",
    prompt: "Is there a withdrawal fee?",
    completion: "I'll check with the admin team about current withdrawal fees and policies to give you accurate, up-to-date information."
  },

  // VERIFICATION INQUIRIES - WITH INTERVIEW SCHEDULING
  {
    intent: "verification",
    prompt: "How long does verification take?",
    completion: "Account verification typically takes 2-3 business days through our standard review process. However, I can help speed this up by scheduling a verification interview with our friendly consultant, which often leads to same-day approval. Would you like me to check available time slots?"
  },
  {
    intent: "verification",
    prompt: "When will my account be approved?",
    completion: "Your account is currently under review by our team. To potentially speed up the process, I can help schedule a quick verification interview with our consultant. This often fast-tracks approval significantly. Would you like me to find a good time for you?"
  },
  {
    intent: "verification",
    prompt: "Why is my account pending?",
    completion: "Account reviews ensure quality and safety for all users. While our team completes the standard review process, I can offer to schedule a verification interview which typically accelerates approval. Would you be interested in scheduling one?"
  },

  // WITHDRAWAL INQUIRIES - NO FALSE PROMISES
  {
    intent: "withdrawal",
    prompt: "How do I withdraw money?",
    completion: "I'll have the admin team provide you with the current withdrawal process and any requirements. Each situation can be different, so they'll give you accurate, personalized instructions."
  },
  {
    intent: "withdrawal",
    prompt: "Are withdrawals free?",
    completion: "I'll check with the admin team about current withdrawal fees and policies to give you accurate, up-to-date information."
  },
  {
    intent: "withdrawal",
    prompt: "How fast are withdrawals?",
    completion: "Withdrawal timing depends on the method and various factors. Let me have the admin team check your specific situation and provide accurate timing information."
  },

  // Finance - Payment Amount Queries (triggers tool lookup)
  { intent: "finance_amount", prompt: "How much is my pending payment?", completion: "Let me check your pending earnings... [SYSTEM: Use payment data to show exact amount]" },
  { intent: "finance_amount", prompt: "I got a pending payment can you tell me how much it is", completion: "Sure! Let me look up your pending amount... [SYSTEM: Use payment data to show exact amount and breakdown]" },
  { intent: "finance_amount", prompt: "How much money do I have pending?", completion: "Let me check your account... [SYSTEM: Show pending earnings total and breakdown by job]" },
  { intent: "finance_amount", prompt: "What's my pending balance?", completion: "Checking your pending balance now... [SYSTEM: Show pending amount from payment data]" },
  { intent: "finance_amount", prompt: "How much will I get paid?", completion: "Let me calculate your earnings... [SYSTEM: Show pending earnings breakdown]" },
  { intent: "finance_amount", prompt: "Can you check my payment amount?", completion: "Sure! Looking up your payment details... [SYSTEM: Show payment amount from data]" },
  { intent: "finance_amount", prompt: "What is my total earnings?", completion: "Let me pull up your earnings summary... [SYSTEM: Show monthly and pending earnings]" },
  { intent: "finance_amount", prompt: "How much have I earned this month?", completion: "Checking your monthly earnings... [SYSTEM: Show monthly earnings total]" },

  // JOB INQUIRIES - REALISTIC RESPONSES
  {
    intent: "jobs",
    prompt: "When will I get jobs?",
    completion: "Job availability depends on your skills, location, and current demand. I'll have the admin team check for opportunities that match your profile and get back to you with specific options."
  },
  {
    intent: "jobs",
    prompt: "Why am I not getting jobs?",
    completion: "There could be several factors affecting job assignments. Let me flag this for admin review so they can check your profile, availability settings, and current opportunities in your area."
  },
  {
    intent: "jobs",
    prompt: "How do I get more work?",
    completion: "I'll have the admin team review your profile and availability to suggest ways to increase your job opportunities. They can provide personalized advice based on current demand in your area."
  },

  // TECHNICAL ISSUES - ESCALATION FOCUSED
  {
    intent: "technical",
    prompt: "The app is not working",
    completion: "I've flagged this technical issue for immediate admin attention. Please describe the specific problem you're experiencing so they can assist you properly and resolve it quickly."
  },
  {
    intent: "technical",
    prompt: "I can't log in",
    completion: "Login issues need immediate attention. I've escalated this to the admin team and they'll contact you directly to resolve this access problem."
  },
  {
    intent: "technical",
    prompt: "App keeps crashing",
    completion: "I've flagged this app stability issue for urgent technical review. The admin team will investigate this immediately and may reach out for additional details to fix it."
  },

  // GENERAL SUPPORT - HONEST AND HELPFUL
  {
    intent: "general",
    prompt: "I need help",
    completion: "I'm here to help! Can you tell me more about what you need assistance with? I'll make sure the right team member gets back to you with accurate information."
  },
  {
    intent: "general",
    prompt: "Who can I contact?",
    completion: "I'll make sure your message reaches the appropriate admin team member who can best assist with your specific question. They'll respond personally within a few hours."
  },
  {
    intent: "general",
    prompt: "Is there a phone number?",
    completion: "I'll have the admin team provide you with the best contact method for your specific situation. Different issues may have different preferred contact channels."
  },

  // URGENT/EMERGENCY - IMMEDIATE ESCALATION
  {
    intent: "urgent",
    prompt: "This is urgent",
    completion: "I understand this is urgent for you. I've immediately flagged your message for priority admin attention and they'll respond as quickly as possible."
  },
  {
    intent: "urgent",
    prompt: "I have a complaint",
    completion: "I've escalated your complaint to the admin team for immediate review. They'll address your concerns personally and work to resolve the issue quickly."
  },

  // Job Execution
  { intent: "job_execution", prompt: "The GPS won't let me check in.", completion: "Make sure you're within 50m of the job site. Try toggling WiFi off/on to refresh your location. Still stuck? Use the manual check-in option." },
  { intent: "job_execution", prompt: "The client is being difficult.", completion: "Your safety comes first! If you feel uncomfortable, leave the site and report via the Help icon on the job card. This won't affect your rating." },
  { intent: "job_execution", prompt: "I can't upload the proof photo.", completion: "Check your internet connection. If it fails twice, you can email the photo to support@worklink.sg with your Job ID." },
  { intent: "job_execution", prompt: "I'm running late to the job.", completion: "Message the client through the app ASAP! Being upfront about delays is better than no communication. Most clients appreciate the heads up." },
  { intent: "job_execution", prompt: "The job location is wrong.", completion: "Contact the client through the app chat to confirm the correct address. If you can't reach them, use the Help button to report it." },

  // Technical Issues
  { intent: "technical_login", prompt: "I forgot my password.", completion: "Tap 'Forgot Password' on the login screen. We'll send a reset link to your registered email or phone." },
  { intent: "technical_app", prompt: "The app keeps crashing.", completion: "Try clearing your app cache or updating to the latest version. This usually fixes most issues!" },
  { intent: "technical_app", prompt: "Notifications aren't working.", completion: "Check your phone settings - make sure WorkLink notifications are enabled. Also check the app settings under Profile > Notifications." },
  { intent: "technical_app", prompt: "The app is very slow.", completion: "Try closing other apps and restarting WorkLink. If it's still slow, clear the cache in your phone settings." },

  // Job Search
  { intent: "job_search", prompt: "There are no jobs in my area.", completion: "Job availability changes throughout the day. Turn on 'Job Alerts' in settings to get notified when new jobs drop nearby!" },
  { intent: "job_search", prompt: "How do I find higher paying jobs?", completion: "Filter by pay rate in the Jobs tab. Also, leveling up unlocks access to premium job listings!" },
  { intent: "job_search", prompt: "What types of jobs are available?", completion: "We have event staffing, F&B service, retail, warehouse, and admin support roles. Check the Categories filter to browse!" },
  { intent: "job_search", prompt: "Can I see jobs for next week?", completion: "Yes! Use the date filter in the Jobs tab to see upcoming opportunities. You can book jobs up to 2 weeks in advance." },

  // Policy & Rules
  { intent: "policy_cancellation", prompt: "Can I cancel a job last minute?", completion: "Cancellations within 2 hours of start time affect your rating. Try to cancel at least 24 hours ahead when possible." },
  { intent: "policy_cancellation", prompt: "What happens if I no-show?", completion: "No-shows result in XP deduction and can lead to account review. If you have an emergency, contact us ASAP!" },
  { intent: "policy_taxes", prompt: "Do you handle taxes?", completion: "As a freelancer, you handle your own taxes. We provide an earnings summary at year-end for your records." },

  // Account Issues
  { intent: "account_banned", prompt: "My account is suspended.", completion: "Suspensions happen due to policy violations or low ratings. Check your email for details and an appeal link. We're here to help sort it out!" },
  { intent: "account_profile", prompt: "How do I update my profile?", completion: "Go to Profile > Edit Profile. You can update your photo, skills, and availability there." },
  { intent: "account_profile", prompt: "How do I change my phone number?", completion: "Go to Profile > Account Settings > Phone Number. You'll need to verify the new number with an OTP." },

  // Trust & Safety
  { intent: "trust_safety", prompt: "Is this job safe?", completion: "All jobs are vetted, but trust your instincts! If something feels off, you can cancel using 'Safety Concern' - it won't affect your rating." },
  { intent: "trust_safety", prompt: "The client asked me to do something not in the job description.", completion: "You only need to do what's listed in the job scope. Politely decline extras and report it if the client insists." },

  // Community
  { intent: "community_referral", prompt: "My friend signed up but I didn't get the bonus.", completion: "Referral bonuses are paid after your friend completes their first verified job. Remind them to get started!" },
  { intent: "community_leaderboard", prompt: "Why am I not on the leaderboard?", completion: "The leaderboard updates every 15 minutes. Make sure your recent job XP has finished processing!" },

  // General Greetings
  { intent: "greeting", prompt: "Hello", completion: "Hey there! 👋 How can I help you today?" },
  { intent: "greeting", prompt: "Hi", completion: "Hi! What can I do for you?" },
  { intent: "greeting", prompt: "Good morning", completion: "Good morning! Ready to help - what do you need?" },
  { intent: "goodbye", prompt: "Thanks", completion: "No problem! Let me know if you need anything else. 😊" },
  { intent: "goodbye", prompt: "Bye", completion: "Take care! Good luck with your jobs! 💪" },

  // ============================================
  // GENERAL & ACCOUNT QUERIES
  // ============================================

  // Support & Contact
  { intent: "general_support", prompt: "How do I contact customer support?", completion: "You can reach our support team 24/7 by tapping the 'Headset' icon in the Profile tab or emailing support@worklink.app." },
  { intent: "general_support", prompt: "Is there a phone number I can call?", completion: "We do not offer phone support at this time. Please use the in-app chat for the fastest response (typically under 5 minutes)." },
  { intent: "general_support", prompt: "I need help urgently.", completion: "Use the in-app chat - our team responds within 5 minutes! For emergencies, tap the red 'SOS' button in the Help section." },

  // Account Credentials
  { intent: "account_credentials", prompt: "I want to change my password.", completion: "Go to Profile > Settings > Security. Enter your current password, then type your new password twice to confirm." },
  { intent: "account_credentials", prompt: "I didn't receive the OTP code.", completion: "Please wait 60 seconds and tap 'Resend'. Check your spam folder. If it still fails, ensure your carrier isn't blocking short-code SMS." },
  { intent: "account_credentials", prompt: "How do I reset my password?", completion: "Tap 'Forgot Password' on the login screen. We'll send a reset link to your registered email." },

  // Account Management
  { intent: "account_management", prompt: "How do I delete my account?", completion: "We're sad to see you go. You can request account deletion in Settings > Privacy. Your data will be wiped within 30 days." },
  { intent: "account_management", prompt: "Can I have two accounts?", completion: "No, creating multiple accounts is a violation of our Terms of Service and will result in a permanent ban on all associated accounts." },
  { intent: "account_management", prompt: "How do I verify my account?", completion: "Go to Profile > Verification. You'll need to upload your NRIC (front & back) and take a selfie for verification." },

  // App Settings
  { intent: "app_settings", prompt: "How do I change the language?", completion: "Go to Settings > General > Language. WorkLink currently supports English and Mandarin." },
  { intent: "app_settings", prompt: "Where do I update my notification settings?", completion: "Navigate to Settings > Notifications. You can toggle alerts for New Jobs, Payouts, and Messages individually." },
  { intent: "app_settings", prompt: "How do I enable dark mode?", completion: "Go to Settings > Display > Theme. You can choose Light, Dark, or Auto (follows your phone settings)." },

  // General Info
  { intent: "general_info", prompt: "Is the app free to use?", completion: "Yes, WorkLink is free for workers. We do not charge subscription fees; we only take a small service fee from the clients posting the jobs." },
  { intent: "general_info", prompt: "What version of the app do I have?", completion: "You can check your current version number at the very bottom of the Settings menu." },
  { intent: "general_info", prompt: "How does WorkLink work?", completion: "Clients post jobs, you apply, get confirmed, complete the work, and get paid! It's that simple. Start by browsing jobs in the Jobs tab." },

  // Technical Connectivity
  { intent: "technical_connectivity", prompt: "It says 'No Internet Connection'.", completion: "Please check your Wi-Fi or cellular data settings. If your connection is stable, try toggling Airplane Mode on and off to reset." },
  { intent: "technical_connectivity", prompt: "The server seems down.", completion: "We may be undergoing scheduled maintenance. Check our status page at status.worklink.app or try again in a few minutes." },
  { intent: "technical_connectivity", prompt: "App stuck on loading screen.", completion: "Force close the app and reopen it. If it persists, clear the app cache or reinstall WorkLink." },

  // Profile Media
  { intent: "profile_media", prompt: "My profile picture is blurry.", completion: "For best results, upload a square image (JPEG or PNG) with a resolution of at least 500x500 pixels." },
  { intent: "profile_media", prompt: "How do I change my profile photo?", completion: "Go to Profile > tap your photo > Choose from Gallery or Take Photo. Make sure it clearly shows your face!" },

  // Profile Info
  { intent: "profile_info", prompt: "Can I change my email address?", completion: "Yes, go to Edit Profile. You will need to verify the new email address via a confirmation link before the change takes effect." },
  { intent: "profile_info", prompt: "How do I add my skills?", completion: "Go to Profile > Edit > Skills. Select from the list or add custom skills. This helps match you with relevant jobs!" },

  // Legal & Privacy
  { intent: "legal_privacy", prompt: "Do you sell my data?", completion: "Absolutely not. We prioritize user privacy. Your data is used solely to match you with jobs and process payments. See our Privacy Policy for details." },
  { intent: "legal_privacy", prompt: "Where is your privacy policy?", completion: "You can find our Privacy Policy in Settings > Legal > Privacy Policy, or at worklink.app/privacy." },

  // Navigation UI
  { intent: "navigation_ui", prompt: "Where is the History tab?", completion: "The History tab has been moved inside the 'Wallet' section. Look for the clock icon!" },
  { intent: "navigation_ui", prompt: "I can't find the logout button.", completion: "Scroll to the very bottom of the Profile page. The 'Log Out' button is red and located below the version number." },
  { intent: "navigation_ui", prompt: "Where do I see my upcoming jobs?", completion: "Your confirmed jobs appear in the 'Deployments' tab on the main navigation bar. You can also check Calendar view!" },

  // Job Availability
  { intent: "job_availability", prompt: "When are new jobs posted?", completion: "New jobs are posted in real-time by clients. However, peak posting times are usually between 8 AM and 10 AM on weekdays." },
  { intent: "job_availability", prompt: "Why don't I see any jobs?", completion: "Jobs depend on your location and availability settings. Make sure your profile is complete and location services are enabled!" },

  // Feedback
  { intent: "feedback_suggestion", prompt: "I have a suggestion for the app.", completion: "We love feedback! Please submit your ideas via the 'Feature Request' form in the Help section. Great suggestions may earn you bonus XP!" },
  { intent: "feedback_suggestion", prompt: "How do I report a bug?", completion: "Go to Help > Report a Bug. Include screenshots if possible - it helps us fix issues faster!" },

  // Device Compatibility
  { intent: "general_access", prompt: "Can I use the app on a tablet?", completion: "WorkLink is optimized for smartphones. While it may run on tablets, GPS accuracy—which is required for checking in—may be unreliable." },
  { intent: "general_access", prompt: "Does it work on iPhone?", completion: "Yes! WorkLink is available on both iOS (App Store) and Android (Play Store). Requires iOS 14+ or Android 8+." },
];

// ============================================
// PHASE 2: SYNONYM DICTIONARIES
// ============================================

const synonyms = {
  // Money terms
  "cash out": ["withdraw", "transfer out", "get my money", "take out", "payout", "claim", "collect"],
  "earnings": ["money", "pay", "balance", "funds", "income", "salary", "wages", "payment"],
  "pending": ["processing", "on hold", "waiting", "stuck", "not released", "delayed", "held up"],

  // Job terms
  "job": ["task", "gig", "shift", "assignment", "work", "position", "role", "booking"],
  "complete": ["finish", "done", "end", "wrap up", "completed", "finished"],
  "client": ["employer", "customer", "company", "hirer", "boss", "supervisor", "manager"],
  "apply": ["sign up", "register", "book", "accept", "take"],

  // App terms
  "app": ["application", "platform", "system", "software", "WorkLink"],
  "check in": ["clock in", "start", "begin", "punch in", "sign in", "arrive"],
  "check out": ["clock out", "end shift", "finish up", "punch out", "sign out", "leave"],
  "settings": ["preferences", "options", "configuration", "setup", "menu"],
  "notifications": ["alerts", "push messages", "updates", "pings", "reminders", "notices"],

  // Time terms
  "today": ["now", "this moment", "right now", "immediately", "asap", "urgently"],
  "tomorrow": ["next day", "the following day", "tmr", "tml"],
  "this week": ["these few days", "coming days", "next few days"],
  "weekend": ["Saturday", "Sunday", "Sat", "Sun", "sat/sun"],

  // Feelings
  "help": ["assist", "support", "aid", "guide", "advise"],
  "problem": ["issue", "trouble", "difficulty", "error", "bug", "concern", "complaint"],

  // Question starters
  "I want to": ["I wanna", "Can I", "How to", "I need to", "I'd like to", "Trying to", "Want to"],
  "Why is": ["How come", "Why", "What's with", "Why's"],
  "How do I": ["How can I", "What's the way to", "How to", "Where do I", "How should I"],
  "What is": ["What's", "Whats", "Tell me about", "Explain"],
  "Where is": ["Where's", "Where can I find", "How do I find", "Looking for"],
  "Can I": ["Is it possible to", "Am I able to", "May I", "Could I"],

  // Support & Contact terms
  "contact": ["reach", "get in touch with", "speak to", "message", "talk to", "call", "email"],
  "support": ["customer service", "help desk", "the support team", "admin", "helpline", "assistance"],

  // Account terms
  "change": ["update", "modify", "reset", "edit", "switch", "alter"],
  "password": ["credentials", "login code", "passcode", "pin", "login details"],
  "delete": ["remove", "close", "deactivate", "wipe", "terminate", "cancel"],
  "account": ["profile", "membership", "user ID", "login", "user account"],
  "verify": ["confirm", "validate", "authenticate", "prove", "certify"],

  // Technical terms
  "internet": ["connection", "network", "wifi", "data", "signal", "connectivity"],
  "error": ["bug", "glitch", "issue", "problem", "crash", "failure", "fault"],
  "slow": ["laggy", "lagging", "hanging", "freezing", "unresponsive"],
  "fix": ["solve", "resolve", "repair", "troubleshoot", "sort out"],

  // Location terms
  "location": ["place", "venue", "site", "address", "area", "spot"],
  "near": ["nearby", "close to", "around", "in my area", "close by"],

  // Singlish particles (for variety)
  "lah": ["la", "lor", "leh", "ah", "sia", ""],
  "can": ["can lah", "can one", "possible", "okay", "sure"],
};

// ============================================
// PHASE 3: TEMPLATE EXPANSION
// ============================================

const templates = [
  // ============================================
  // WITHDRAWAL INQUIRIES - FACT-BASED ONLY
  // ============================================
  { intent: "withdrawal", text: "{I want to} {cash out} my {earnings}.", answer: "Go to the Wallet tab and tap 'Withdraw'. I'll have the admin team provide accurate timing for your specific case." },
  { intent: "withdrawal", text: "{How do I} {cash out}?", answer: "Head to Wallet > Withdraw. I'll check with admin about current processing times and fees." },
  { intent: "withdrawal", text: "{Can I} {cash out} my {earnings} {today}?", answer: "You can request withdrawal if your balance is above the minimum. Processing time varies - let me check with admin." },
  { intent: "withdrawal", text: "{I want to} get my {earnings} out.", answer: "I'll have the admin team provide you with the current withdrawal process and timeline for your situation." },
  { intent: "withdrawal", text: "When {can} I {cash out}?", answer: "Once you meet the minimum balance requirement. I'll check current policies with the admin team." },
  { intent: "withdrawal", text: "Is there a fee to {cash out}?", answer: "I'll check with the admin team about current withdrawal fees and policies to give you accurate information." },
  { intent: "withdrawal", text: "{Where is} the {cash out} button?", answer: "Open Wallet tab to find the Withdraw option. I'll have admin verify the current process for you." },
  { intent: "withdrawal", text: "Minimum {cash out} amount?", answer: "I'll check with the admin team about current minimum withdrawal amounts and requirements." },
  { intent: "withdrawal", text: "{How do I} transfer {earnings} to bank?", answer: "I'll have the admin team guide you through the bank transfer process and requirements." },
  { intent: "withdrawal", text: "{cash out} to PayNow {can}?", answer: "I'll check with admin about available withdrawal methods and their processing requirements." },
  { intent: "withdrawal", text: "{I want to} {cash out} everything.", answer: "I'll have the admin team help you with the complete withdrawal process and any requirements." },
  { intent: "withdrawal", text: "Why {can} I not {cash out}?", answer: "Let me flag this for admin review to check your account status and withdrawal eligibility." },
  { intent: "withdrawal", text: "{cash out} button grey.", answer: "Grey button usually indicates restrictions. I'll have the admin team check your account status." },
  { intent: "withdrawal", text: "How long for {cash out}?", answer: "Processing time varies by method and situation. I'll have admin provide accurate timing for your case." },

  // ============================================
  // PAYMENT INQUIRIES - FACT-BASED ONLY
  // ============================================
  { intent: "payment", text: "{Why is} my payment {pending}?", answer: "Payment status depends on job completion verification and client processes. I'll flag this for admin review to get you specific details." },
  { intent: "payment", text: "My {earnings} are {pending} too long.", answer: "I'll have the admin team check your specific payment status and provide accurate timing information." },
  { intent: "payment", text: "{Why is} my {earnings} still {pending}?", answer: "Payment processing time varies. Let me have the admin team check your specific situation and provide updates." },
  { intent: "payment", text: "Payment {pending} for days already.", answer: "I'll flag this for immediate admin attention to review your payment status and provide accurate information." },
  { intent: "payment", text: "{I want to} know why {earnings} {pending}.", answer: "Payment status depends on various factors. I'll have the admin team provide specific details about your case." },
  { intent: "payment", text: "{earnings} never come.", answer: "I'll escalate this to the admin team for immediate review of your payment status and timeline." },
  { intent: "payment", text: "Still waiting for {earnings}.", answer: "I'll have the admin team check your payment status and provide you with accurate timing information." },
  { intent: "payment", text: "{What is} {pending} payment?", answer: "Pending means payment is being processed. I'll have admin explain the specific status of your payment." },
  { intent: "payment", text: "When will {pending} clear?", answer: "Processing time varies by situation. Let me have the admin team check your specific case and provide accurate timing." },
  { intent: "payment", text: "{client} never approve my {earnings}.", answer: "I'll flag this for admin review to check the approval process and provide you with specific updates." },
  { intent: "payment", text: "Payment stuck.", answer: "I'll escalate this to the admin team for immediate review of your payment status." },
  { intent: "payment", text: "{How do I} speed up {pending}?", answer: "I'll have the admin team review your situation and explain the current process and any options available." },

  // ============================================
  // JOB SEARCH (25+ variations)
  // ============================================
  { intent: "job_search", text: "Any {job}s available {today}?", answer: "Let me check what's available in your area. Turn on Job Alerts to get notified instantly!" },
  { intent: "job_search", text: "I need a {job} {tomorrow}.", answer: "I'll find jobs for tomorrow. Check the Jobs tab with the date filter!" },
  { intent: "job_search", text: "Got any {job}s {near} me?", answer: "Check the Jobs tab - you can filter by location. Enable Job Alerts for instant notifications!" },
  { intent: "job_search", text: "Looking for {job}s {this week}.", answer: "Use the date filter in Jobs tab to see the whole week. Book early - slots fill fast!" },
  { intent: "job_search", text: "{How do I} find more {job}s?", answer: "Complete your profile and enable Job Alerts. More skills = more job matches!" },
  { intent: "job_search", text: "No {job}s showing up.", answer: "Jobs depend on your location and availability. Check your profile settings are complete!" },
  { intent: "job_search", text: "{Where is} {weekend} {job}s?", answer: "Filter by Sat/Sun in the Jobs tab. Weekend jobs are popular - apply early!" },
  { intent: "job_search", text: "{I want to} find {job}s {near} my {location}.", answer: "Enable location services and check Jobs tab. Filter by distance!" },
  { intent: "job_search", text: "Got {job} for {weekend}?", answer: "Check Jobs tab and filter by Saturday/Sunday. Apply early - weekend jobs fill fast!" },
  { intent: "job_search", text: "{How do I} get more {job} offers?", answer: "Complete your profile, add skills, and turn on Job Alerts. More activity = more matches!" },
  { intent: "job_search", text: "Looking for night {job}.", answer: "Filter by time in Jobs tab. Night shifts often pay more!" },
  { intent: "job_search", text: "{job}s with high pay?", answer: "Sort by pay rate in Jobs tab. Higher levels unlock premium job listings too!" },
  { intent: "job_search", text: "F&B {job}s available?", answer: "Yes! Filter by category 'F&B' in the Jobs tab." },
  { intent: "job_search", text: "Event {job}s where?", answer: "Check Jobs tab > Categories > Events. Lots of options for events!" },
  { intent: "job_search", text: "{I want to} {apply} for {job}.", answer: "Browse the Jobs tab, tap on a job you like, and hit Apply. Good luck!" },
  { intent: "job_search", text: "{How do I} {apply} to {job}?", answer: "Tap any job listing, review details, then tap Apply. You'll get notified if confirmed!" },
  { intent: "job_search", text: "No {job} {near} me.", answer: "Try expanding your search radius in filters. Also enable Job Alerts for new postings!" },
  { intent: "job_search", text: "{job} filter not working.", answer: "Try clearing filters and reapplying. Make sure location services are enabled." },
  { intent: "job_search", text: "{Where is} admin {job}s?", answer: "Filter by category 'Admin Support' in the Jobs tab." },
  { intent: "job_search", text: "Part time {job} got?", answer: "Most jobs are flexible! Filter by duration in Jobs tab to find shorter shifts." },
  { intent: "job_search", text: "{I want to} work {today}.", answer: "Check Jobs tab for same-day openings. Enable Job Alerts for last-minute posts!" },
  { intent: "job_search", text: "Urgent {job} where?", answer: "Same-day jobs are marked with 🔥. Check Jobs tab and sort by date!" },

  // ============================================
  // JOB EXECUTION (20+ variations)
  // ============================================
  { intent: "job_execution", text: "{Can I} not {check in} to my {job}.", answer: "Make sure you're within 50m of the location. Try toggling your WiFi to refresh GPS." },
  { intent: "job_execution", text: "Having {problem} with the {client}.", answer: "Your safety comes first! If needed, leave and report via the Help icon. Won't affect your rating." },
  { intent: "job_execution", text: "GPS not working for {check in}.", answer: "Toggle WiFi off/on to refresh GPS. Make sure you're within 50m of the job site." },
  { intent: "job_execution", text: "{Can I} not {complete} my {job}.", answer: "What's the issue? If it's technical, try restarting the app. If it's the client, use the Help button." },
  { intent: "job_execution", text: "{client} asking for extra work.", answer: "You only need to do what's in the job description. Politely decline extras and report if they insist." },
  { intent: "job_execution", text: "Running late to {job}.", answer: "Message the client ASAP through the app! Being upfront is better than no communication." },
  { intent: "job_execution", text: "{job} {location} is wrong.", answer: "Contact the client via app chat to confirm the correct address. Report via Help if you can't reach them." },
  { intent: "job_execution", text: "{check in} button not working.", answer: "Make sure GPS is on and you're within 50m. Try toggling WiFi to refresh location." },
  { intent: "job_execution", text: "{client} not at {location}.", answer: "Wait 15 mins and try contacting them. If no response, use Help button to report." },
  { intent: "job_execution", text: "{I want to} cancel this {job}.", answer: "Go to Deployments, find the job, tap Cancel. Try to do it 24hrs ahead to avoid penalties." },
  { intent: "job_execution", text: "{job} already started but {can} not {check in}.", answer: "Make sure you're at the right location. Try the Manual Check-in option or contact support." },
  { intent: "job_execution", text: "{client} is rude.", answer: "Your safety matters! Leave if uncomfortable and report via Help. Won't affect your rating." },
  { intent: "job_execution", text: "{How do I} {check out}?", answer: "Tap Check Out in the active job screen when you're done. Make sure to upload proof if required!" },
  { intent: "job_execution", text: "Forgot to {check out}.", answer: "Contact support ASAP. They can manually check you out and process your payment." },
  { intent: "job_execution", text: "{job} different from description.", answer: "Only do what's listed. Report any discrepancies via Help button after the job." },
  { intent: "job_execution", text: "{Where is} the {job} {location}?", answer: "Tap on your confirmed job in Deployments to see the full address and map." },
  { intent: "job_execution", text: "{client} wants me stay longer.", answer: "Check if there's overtime pay. You're not obligated to stay beyond scheduled hours." },
  { intent: "job_execution", text: "Weather bad, {can} cancel?", answer: "Yes, use 'Weather' as cancellation reason. Check if the job is rescheduled." },
  { intent: "job_execution", text: "Emergency, need cancel {job}.", answer: "Cancel ASAP in Deployments and select 'Emergency'. Contact support if needed." },
  { intent: "job_execution", text: "{I want to} report {client}.", answer: "Use the Help button on the job card. Describe the issue - we take reports seriously." },

  // ============================================
  // GAMIFICATION - XP (15+ variations)
  // ============================================
  { intent: "gamification_xp", text: "{How do I} earn more XP?", answer: "Complete jobs, maintain streaks, and get 5-star ratings. Peak hour jobs give 2x XP!" },
  { intent: "gamification_xp", text: "{I want to} level up faster.", answer: "Focus on streak bonuses and 5-star ratings. Every completed job gets you closer!" },
  { intent: "gamification_xp", text: "{How do I} get XP?", answer: "Complete jobs, keep your streak, get 5-star ratings. Peak hours = 2x XP!" },
  { intent: "gamification_xp", text: "{What is} gives the most XP?", answer: "Peak hour jobs (2x XP), 5-star ratings, and streak bonuses. Keep completing jobs!" },
  { intent: "gamification_xp", text: "{Why is} I lose XP?", answer: "XP can be deducted for no-shows or late cancellations. Check your notification history." },
  { intent: "gamification_xp", text: "XP not showing.", answer: "XP updates after job completion is verified. Check back in 24-48 hours." },
  { intent: "gamification_xp", text: "{What is} my level?", answer: "Check your Profile - your level and XP are shown at the top!" },
  { intent: "gamification_xp", text: "How much XP to level up?", answer: "Each level requires more XP. Check Progress in your Profile to see how close you are!" },
  { intent: "gamification_xp", text: "{What is} XP for?", answer: "XP increases your level, unlocking perks like priority booking and higher pay jobs!" },
  { intent: "gamification_xp", text: "XP bonus when?", answer: "Peak hours (lunch & dinner), weekends, and maintaining streaks give bonus XP!" },
  { intent: "gamification_xp", text: "{I want to} more XP.", answer: "Complete more jobs, maintain your streak, aim for 5-star ratings. You got this!" },
  { intent: "gamification_xp", text: "{How do I} get 2x XP?", answer: "Work during peak hours (lunch 11am-2pm, dinner 6pm-9pm) for double XP!" },

  // ============================================
  // GAMIFICATION - STREAK & BADGES (12+ variations)
  // ============================================
  { intent: "gamification_streak", text: "Lost my streak, what now?", answer: "Alamak! Start fresh and buy a Streak Freeze from the Shop to protect it next time." },
  { intent: "gamification_streak", text: "{How do I} maintain streak?", answer: "Complete at least one job or check in daily. Get a Streak Freeze as backup!" },
  { intent: "gamification_streak", text: "{What is} streak freeze?", answer: "It protects your streak if you miss a day. Buy it in the Shop before you need it!" },
  { intent: "gamification_streak", text: "Streak reset why?", answer: "Streaks reset if you don't complete a job or check in for a day. Get Streak Freeze next time!" },
  { intent: "gamification_streak", text: "{How do I} get streak back?", answer: "Unfortunately lost streaks can't be recovered. Start fresh and protect with Streak Freeze!" },
  { intent: "gamification_streak", text: "{What is} streak for?", answer: "Streaks give daily bonus XP and unlock special badges. Keep it going!" },
  { intent: "gamification_badges", text: "{How do I} get badges?", answer: "Badges unlock at milestones - jobs completed, streak days, 5-star ratings. Check Achievements!" },
  { intent: "gamification_badges", text: "{Where is} my badges?", answer: "Check Profile > Achievements to see all your badges and progress!" },
  { intent: "gamification_badges", text: "{What is} badges do?", answer: "Badges show your achievements and can unlock special perks. Collect them all!" },
  { intent: "gamification_rewards", text: "{What is} {can} I buy in shop?", answer: "Profile glows, avatar frames, streak freezes, and priority boosters. Spend your bonus points!" },
  { intent: "gamification_rewards", text: "{Where is} the shop?", answer: "Tap Shop in the bottom navigation to browse items you can buy with bonus points!" },
  { intent: "gamification_rewards", text: "{How do I} get bonus points?", answer: "Complete jobs, level up, and achieve milestones to earn bonus points!" },

  // ============================================
  // HELP & SUPPORT (15+ variations)
  // ============================================
  { intent: "general_help", text: "I need {help}.", answer: "I'm here! What's the issue? I can help with jobs, payments, or account questions." },
  { intent: "general_help", text: "Got a {problem}.", answer: "No worries, let me help! What's going on?" },
  { intent: "general_help", text: "{Can I} you {help} me?", answer: "Of course! What do you need help with - jobs, payments, or something else?" },
  { intent: "general_help", text: "Something went wrong.", answer: "Let me help! Tell me what happened and I'll sort it out." },
  { intent: "general_help", text: "Need {help} urgently.", answer: "I'm here! Tell me what's wrong and I'll help right away." },
  { intent: "general_help", text: "{help} please.", answer: "Of course! What do you need help with?" },
  { intent: "general_help", text: "Don't know what to do.", answer: "No problem! What are you trying to do? I can guide you." },
  { intent: "general_support", text: "{How do I} {can} I {contact} {support}?", answer: "Tap the Headset icon in Profile or email support@worklink.app." },
  { intent: "general_support", text: "I need to {contact} someone from {support}.", answer: "Use the in-app chat feature for immediate assistance!" },
  { intent: "general_support", text: "{Where is} do I get {help} from {support}?", answer: "Tap the Headset icon in Profile - our team responds within 5 minutes!" },
  { intent: "general_support", text: "Need to talk to {support}.", answer: "Use the in-app chat (Headset icon) or email support@worklink.app. We respond fast!" },
  { intent: "general_support", text: "{How do I} reach {support}?", answer: "Headset icon in Profile for chat, or email support@worklink.app." },
  { intent: "general_support", text: "{support} number?", answer: "We use in-app chat instead of phone. Tap Headset icon - response within 5 minutes!" },
  { intent: "general_support", text: "Email {support}?", answer: "Yes! Email support@worklink.app. In-app chat is faster though." },
  { intent: "general_support", text: "{I want to} complain.", answer: "Sorry to hear that! Use Help > Report Issue to submit your complaint. We take it seriously." },

  // ============================================
  // ACCOUNT - CREDENTIALS (15+ variations)
  // ============================================
  { intent: "account_credentials", text: "{I want to} {change} my {password}.", answer: "Go to Settings > Security to update your credentials." },
  { intent: "account_credentials", text: "{How do I} {change} my {password}?", answer: "Go to Profile > Settings > Security. Enter current password, then your new one." },
  { intent: "account_credentials", text: "Forgot my {password}.", answer: "Tap 'Forgot Password' on the login screen. We'll send a reset link to your email." },
  { intent: "account_credentials", text: "Need to {change} {password}.", answer: "Settings > Security. Enter current password, then your new one twice." },
  { intent: "account_credentials", text: "OTP not coming.", answer: "Wait 60 seconds and tap Resend. Check spam folder. Make sure your carrier isn't blocking SMS." },
  { intent: "account_credentials", text: "{Can I} not login.", answer: "Try 'Forgot Password' to reset. If still stuck, contact support." },
  { intent: "account_credentials", text: "{password} wrong.", answer: "Try 'Forgot Password' on login screen to reset it." },
  { intent: "account_credentials", text: "Reset {password} how?", answer: "On login screen, tap 'Forgot Password'. Check your email for reset link." },
  { intent: "account_credentials", text: "OTP expired.", answer: "Tap Resend to get a new OTP. Make sure to use it within 5 minutes." },
  { intent: "account_credentials", text: "{I want to} {change} email.", answer: "Go to Edit Profile > Email. You'll need to verify the new email address." },
  { intent: "account_credentials", text: "Locked out of {account}.", answer: "Use 'Forgot Password' to reset. If still locked, contact support." },

  // ============================================
  // ACCOUNT - MANAGEMENT (15+ variations)
  // ============================================
  { intent: "account_management", text: "{How do I} {delete} my {account}?", answer: "You can request deletion in Settings > Privacy. Data is wiped within 30 days." },
  { intent: "account_management", text: "{I want to} {verify} my {account}.", answer: "Go to Profile > Verification. Upload your NRIC and take a selfie to verify." },
  { intent: "account_management", text: "{Can I} I have multiple {account}s?", answer: "No, multiple accounts violate our Terms and will result in a permanent ban." },
  { intent: "account_management", text: "{How do I} {verify} my identity?", answer: "Profile > Verification. Upload NRIC (front & back) and take a selfie." },
  { intent: "account_management", text: "My {account} is suspended.", answer: "Check your email for details and appeal link. Usually due to policy violations or low ratings." },
  { intent: "account_management", text: "{I want to} close {account}.", answer: "Go to Settings > Privacy > Delete Account. Your data will be removed in 30 days." },
  { intent: "account_management", text: "Why {account} suspended?", answer: "Check your email for the specific reason. You can appeal through the link provided." },
  { intent: "account_management", text: "{How do I} appeal suspension?", answer: "Check your email for appeal link. Explain your situation and we'll review." },
  { intent: "account_management", text: "Verification failed.", answer: "Make sure NRIC photos are clear and selfie matches. Try again or contact support." },
  { intent: "account_management", text: "{How do I} long verification take?", answer: "Usually within 24 hours. If longer, contact support." },
  { intent: "account_management", text: "{I want to} reactivate {account}.", answer: "If you deleted recently, contact support. Otherwise, sign up again." },

  // ============================================
  // PROFILE INFO (12+ variations)
  // ============================================
  { intent: "profile_info", text: "{Where is} do I {change} my email on this {app}?", answer: "Go to Edit Profile to update your email address. You'll need to verify it." },
  { intent: "profile_info", text: "{How do I} {change} my phone number?", answer: "Go to Profile > Account Settings > Phone Number. Verify with OTP." },
  { intent: "profile_info", text: "{I want to} {change} my name.", answer: "Go to Edit Profile. Note: Name must match your NRIC for verification." },
  { intent: "profile_info", text: "{How do I} add skills to {account}?", answer: "Profile > Edit > Skills. More skills = more job matches!" },
  { intent: "profile_info", text: "{change} profile photo.", answer: "Profile > Tap your photo > Choose new image. Make sure your face is clearly visible!" },
  { intent: "profile_info", text: "{How do I} {change} availability?", answer: "Profile > Edit > Availability. Set the days and times you can work." },
  { intent: "profile_info", text: "Update bank details.", answer: "Profile > Payment Settings > Bank Account. Changes apply from next withdrawal." },
  { intent: "profile_info", text: "{Where is} edit profile?", answer: "Tap your avatar at the top right, then tap Edit Profile." },
  { intent: "profile_info", text: "{I want to} add address.", answer: "Profile > Edit > Address. This helps match you with nearby jobs!" },
  { intent: "profile_info", text: "Skills not saving.", answer: "Make sure to tap Save after editing. Check your internet connection too." },

  // ============================================
  // TECHNICAL - SETTINGS (15+ variations)
  // ============================================
  { intent: "app_settings", text: "I'm not getting any {notifications}.", answer: "Check Settings > Notifications to ensure alerts are toggled on." },
  { intent: "app_settings", text: "{Where is} are my {settings}?", answer: "Tap your avatar in the top right corner to access Settings." },
  { intent: "app_settings", text: "{How do I} turn on {notifications}?", answer: "Settings > Notifications. Toggle on the ones you want - Jobs, Payments, Messages." },
  { intent: "app_settings", text: "{I want to} to {change} {notifications}.", answer: "Go to Settings > Notifications. You can customize each alert type." },
  { intent: "app_settings", text: "Turn off {notifications}.", answer: "Settings > Notifications. Toggle off the ones you don't want." },
  { intent: "app_settings", text: "Dark mode?", answer: "Settings > Display > Theme. Choose Dark mode or Auto!" },
  { intent: "app_settings", text: "{How do I} {change} language?", answer: "Settings > General > Language. Pick your preferred language." },
  { intent: "app_settings", text: "{notifications} too many.", answer: "Go to Settings > Notifications and turn off the ones you don't need." },
  { intent: "app_settings", text: "{Where is} dark mode?", answer: "Settings > Display > Theme > Dark. Saves battery too!" },

  // ============================================
  // TECHNICAL - CONNECTIVITY (15+ variations)
  // ============================================
  { intent: "technical_connectivity", text: "My {internet} isn't working on the {app}.", answer: "Check your connection or try toggling Airplane mode on/off." },
  { intent: "technical_connectivity", text: "The {app} shows {error}.", answer: "Try force closing and reopening. If it persists, clear the cache or reinstall." },
  { intent: "technical_connectivity", text: "{app} won't load.", answer: "Check your internet. Try force close and reopen. Clear cache if it persists." },
  { intent: "technical_connectivity", text: "Getting {error} message.", answer: "What does it say? Try restarting the app. Clear cache if it continues." },
  { intent: "technical_connectivity", text: "{app} keeps crashing.", answer: "Update to the latest version or clear app cache. Reinstall if needed." },
  { intent: "technical_connectivity", text: "{app} is {slow}.", answer: "Close other apps and restart WorkLink. Clear cache in phone settings if still slow." },
  { intent: "technical_connectivity", text: "{Can I} not upload photo.", answer: "Check internet connection. If it fails, email the photo to support@worklink.app with Job ID." },
  { intent: "technical_connectivity", text: "{app} stuck loading.", answer: "Force close and reopen. Check your internet. Clear cache if needed." },
  { intent: "technical_connectivity", text: "Page not loading.", answer: "Check your internet connection. Try refreshing or restarting the app." },
  { intent: "technical_connectivity", text: "{error} when open {app}.", answer: "Try updating the app. If still broken, clear cache and reinstall." },
  { intent: "technical_connectivity", text: "{app} not responding.", answer: "Force close and restart. If it keeps happening, clear cache or reinstall." },
  { intent: "technical_connectivity", text: "White screen only.", answer: "Force close, clear cache, and restart. Update to latest version if available." },
  { intent: "technical_connectivity", text: "{How do I} {fix} {app}?", answer: "Try: 1) Restart app, 2) Clear cache, 3) Update app, 4) Reinstall. Contact support if still broken." },
  { intent: "technical_connectivity", text: "{app} very {slow}.", answer: "Close background apps, clear cache, and ensure good internet connection." },

  // ============================================
  // GENERAL INFO (15+ variations)
  // ============================================
  { intent: "general_info", text: "Is this {app} free?", answer: "Yes, WorkLink is completely free for workers. No hidden fees!" },
  { intent: "general_info", text: "{How do I} use this {app}?", answer: "Browse jobs, apply, get confirmed, complete work, get paid! Check the Jobs tab to start." },
  { intent: "general_info", text: "How does WorkLink work?", answer: "Clients post jobs, you apply and get confirmed, do the work, get paid. Simple!" },
  { intent: "general_info", text: "Is WorkLink legit?", answer: "Yes! We're a registered company in Singapore. All jobs and payments are verified." },
  { intent: "general_info", text: "{What is} kind of {job}s are there?", answer: "Events, F&B, retail, warehouse, admin support. Check the Categories filter!" },
  { intent: "general_info", text: "{What is} WorkLink?", answer: "A platform connecting workers with temporary jobs in Singapore. Find work, get paid!" },
  { intent: "general_info", text: "Got fees?", answer: "No fees for workers! We only charge clients. Your earnings are 100% yours." },
  { intent: "general_info", text: "How old must be?", answer: "You must be at least 18 years old and legally allowed to work in Singapore." },
  { intent: "general_info", text: "Need experience?", answer: "Many jobs don't require experience! Training provided. Just have a good attitude!" },
  { intent: "general_info", text: "{What is} pay like?", answer: "Pay varies by job - usually $8-20/hour. Check each listing for exact rates." },
  { intent: "general_info", text: "When get paid?", answer: "Within 24-72 hours after client verifies your work. Fast payout!" },
  { intent: "general_info", text: "{app} safe?", answer: "Yes! All clients are verified and we have safety reporting features. Your safety matters!" },

  // ============================================
  // NAVIGATION UI (12+ variations)
  // ============================================
  { intent: "navigation_ui", text: "I {can} not find the {settings} menu.", answer: "Tap your avatar in the top right corner to access Settings." },
  { intent: "navigation_ui", text: "{Where is} is the logout button on this {app}?", answer: "Scroll to the bottom of the Profile page - it's the red button." },
  { intent: "navigation_ui", text: "{Where is} to see my {job} history?", answer: "Go to Wallet > History, or check Deployments for all past jobs." },
  { intent: "navigation_ui", text: "{Can I} not find my upcoming {job}s.", answer: "Check the Deployments tab on the main navigation. Calendar view also shows them!" },
  { intent: "navigation_ui", text: "{Where is} wallet?", answer: "Bottom navigation bar - tap the Wallet icon to see your balance and history." },
  { intent: "navigation_ui", text: "{Where is} jobs tab?", answer: "Bottom navigation bar - tap Jobs to browse available work." },
  { intent: "navigation_ui", text: "{Where is} profile?", answer: "Tap your avatar in the top right corner, or the Profile tab in navigation." },
  { intent: "navigation_ui", text: "{How do I} see my earnings?", answer: "Tap Wallet in the bottom navigation to see balance and earnings history." },
  { intent: "navigation_ui", text: "{Where is} notifications?", answer: "Tap the bell icon at the top of the screen to see all notifications." },
  { intent: "navigation_ui", text: "{Where is} calendar?", answer: "Deployments tab has a calendar view showing all your scheduled jobs." },
  { intent: "navigation_ui", text: "Menu where?", answer: "Tap your avatar (top right) for menu, or use the bottom navigation tabs." },
  { intent: "navigation_ui", text: "{How do I} logout?", answer: "Profile page > Scroll to bottom > Tap red 'Log Out' button." },
];

// ============================================
// PHASE 4: DATA GENERATION
// ============================================

function replaceWithSynonyms(text) {
  let result = text;

  for (const [key, alternatives] of Object.entries(synonyms)) {
    const placeholder = `{${key}}`;
    if (result.includes(placeholder)) {
      const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
      result = result.replace(placeholder, replacement);
    }
  }

  return result;
}

function generateFromTemplates(count = 500) {
  const generated = [];

  for (let i = 0; i < count; i++) {
    const template = templates[Math.floor(Math.random() * templates.length)];
    const prompt = replaceWithSynonyms(template.text);

    generated.push({
      intent: template.intent,
      prompt: prompt,
      completion: template.answer,
    });
  }

  return generated;
}

// ============================================
// PHASE 5: DATABASE IMPORT (ADDITIVE + DEDUP)
// ============================================

/**
 * Normalize question for comparison
 */
function normalizeQuestion(q) {
  return q.toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

/**
 * Calculate similarity between two strings (simple word overlap)
 */
function similarity(a, b) {
  const wordsA = new Set(normalizeQuestion(a).split(' ').filter(w => w.length > 2));
  const wordsB = new Set(normalizeQuestion(b).split(' ').filter(w => w.length > 2));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return intersection / union; // Jaccard similarity
}

/**
 * Remove duplicates from knowledge base
 * Keeps the entry with highest confidence/use_count
 */
function deduplicateKnowledgeBase() {
  console.log('\n🧹 Deduplicating knowledge base...');

  const entries = getDb().prepare(`
    SELECT id, question, question_normalized, answer, intent, confidence, use_count, source
    FROM ml_knowledge_base
    ORDER BY confidence DESC, use_count DESC
  `).all();

  const seen = new Map(); // normalized -> best entry
  const toDelete = [];

  for (const entry of entries) {
    const norm = normalizeQuestion(entry.question);

    // Check for exact normalized match
    if (seen.has(norm)) {
      toDelete.push(entry.id);
      continue;
    }

    // Check for similar questions (>80% similarity)
    let isDupe = false;
    for (const [seenNorm, seenEntry] of seen) {
      if (similarity(norm, seenNorm) > 0.8) {
        // Keep the one with higher confidence or use_count
        const keepExisting = (seenEntry.confidence > entry.confidence) ||
          (seenEntry.confidence === entry.confidence && seenEntry.use_count >= entry.use_count);

        if (keepExisting) {
          toDelete.push(entry.id);
        } else {
          toDelete.push(seenEntry.id);
          seen.set(norm, entry);
        }
        isDupe = true;
        break;
      }
    }

    if (!isDupe) {
      seen.set(norm, entry);
    }
  }

  // Delete duplicates
  if (toDelete.length > 0) {
    const deleteStmt = getDb().prepare('DELETE FROM ml_knowledge_base WHERE id = ?');
    for (const id of toDelete) {
      deleteStmt.run(id);
    }
  }

  console.log(`   ✅ Removed ${toDelete.length} duplicates`);
  console.log(`   📊 Remaining entries: ${entries.length - toDelete.length}`);

  return toDelete.length;
}

/**
 * Remove duplicates from training data
 */
function deduplicateTrainingData() {
  console.log('\n🧹 Deduplicating training data...');

  const entries = getDb().prepare(`
    SELECT id, input_text, output_text, quality_score, admin_approved
    FROM ml_training_data
    ORDER BY quality_score DESC, admin_approved DESC
  `).all();

  const seen = new Map();
  const toDelete = [];

  for (const entry of entries) {
    const norm = normalizeQuestion(entry.input_text);

    if (seen.has(norm)) {
      toDelete.push(entry.id);
    } else {
      seen.set(norm, entry);
    }
  }

  if (toDelete.length > 0) {
    const deleteStmt = getDb().prepare('DELETE FROM ml_training_data WHERE id = ?');
    for (const id of toDelete) {
      deleteStmt.run(id);
    }
  }

  console.log(`   ✅ Removed ${toDelete.length} duplicates`);
  console.log(`   📊 Remaining entries: ${entries.length - toDelete.length}`);

  return toDelete.length;
}

/**
 * Import to knowledge base (ADDITIVE - only adds new entries)
 */
function importToKnowledgeBase(entries) {
  console.log(`\n📚 Importing ${entries.length} entries to knowledge base (additive)...`);

  // Get existing normalized questions
  const existing = new Set(
    getDb().prepare('SELECT question_normalized FROM ml_knowledge_base').all()
      .map(r => r.question_normalized)
  );

  const insertKB = getDb().prepare(`
    INSERT OR IGNORE INTO ml_knowledge_base
    (question, question_normalized, answer, intent, confidence, source)
    VALUES (?, ?, ?, ?, ?, 'seed')
  `);

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const normalized = normalizeQuestion(entry.prompt);

    // Skip if similar entry exists
    if (existing.has(normalized)) {
      skipped++;
      continue;
    }

    try {
      const result = insertKB.run(
        entry.prompt,
        normalized,
        entry.completion,
        entry.intent,
        0.85
      );

      if (result.changes > 0) {
        imported++;
        existing.add(normalized); // Track newly added
      } else {
        skipped++;
      }
    } catch (e) {
      skipped++;
    }
  }

  console.log(`   ✅ Added: ${imported} new entries`);
  console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);

  return imported;
}

/**
 * Import to training data (ADDITIVE - only adds new entries)
 */
function importToTrainingData(entries) {
  console.log(`\n🎓 Importing ${entries.length} entries to training data (additive)...`);

  // Get existing normalized inputs
  const existing = new Set(
    getDb().prepare('SELECT input_text FROM ml_training_data').all()
      .map(r => normalizeQuestion(r.input_text))
  );

  const insertTD = getDb().prepare(`
    INSERT OR IGNORE INTO ml_training_data
    (input_text, output_text, intent, quality_score, admin_approved, source)
    VALUES (?, ?, ?, ?, 1, 'seed')
  `);

  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const normalized = normalizeQuestion(entry.prompt);

    // Skip if similar entry exists
    if (existing.has(normalized)) {
      skipped++;
      continue;
    }

    try {
      insertTD.run(
        entry.prompt,
        entry.completion,
        entry.intent,
        0.9
      );
      imported++;
      existing.add(normalized);
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`   ✅ Added: ${imported} new entries`);
  console.log(`   ⏭️  Skipped: ${skipped} (already exist)`);

  return imported;
}

function importToFAQ(entries) {
  console.log(`\n❓ Importing unique intents to FAQ...`);

  // Get unique entries by intent (one per intent)
  const byIntent = {};
  for (const entry of entries) {
    if (!byIntent[entry.intent]) {
      byIntent[entry.intent] = entry;
    }
  }

  const insertFAQ = getDb().prepare(`
    INSERT OR IGNORE INTO ai_faq
    (category, question, answer, keywords, priority, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  let imported = 0;

  for (const [intent, entry] of Object.entries(byIntent)) {
    const category = intent.split('_')[0]; // e.g., "finance" from "finance_withdrawal"
    const keywords = entry.prompt.toLowerCase().split(' ').filter(w => w.length > 3).join(',');

    try {
      const result = insertFAQ.run(
        category,
        entry.prompt,
        entry.completion,
        keywords,
        10 // Default priority
      );

      if (result.changes > 0) {
        imported++;
      }
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`   ✅ Imported: ${imported} FAQ entries`);

  return imported;
}

// ============================================
// MAIN EXECUTION
// ============================================

function main() {
  const args = process.argv.slice(2);
  const dedupeOnly = args.includes('--dedupe');
  const skipDedupe = args.includes('--no-dedupe');

  console.log('🚀 WorkLink SLM Training Data Generator');
  console.log('========================================');
  console.log('Mode: ADDITIVE (preserves learned data)\n');

  // Dedupe only mode
  if (dedupeOnly) {
    console.log('🧹 Running deduplication only...');
    const kbRemoved = deduplicateKnowledgeBase();
    const tdRemoved = deduplicateTrainingData();
    console.log(`\n✅ Deduplication complete: removed ${kbRemoved + tdRemoved} total duplicates`);
    return;
  }

  // Phase 1: Deduplicate existing data first
  if (!skipDedupe) {
    console.log('📋 Phase 1: Cleaning up existing data...');
    deduplicateKnowledgeBase();
    deduplicateTrainingData();
  }

  // Phase 2: Seed data
  console.log('\n📝 Phase 2: Loading seed data...');
  console.log(`   Found ${seedData.length} seed entries`);

  // Phase 3: Generate variations
  console.log('\n🔄 Phase 3: Generating template variations...');
  const generated = generateFromTemplates(500);
  console.log(`   Generated ${generated.length} variations`);

  // Combine all data
  const allData = [...seedData, ...generated];
  console.log(`\n📊 Total new entries to process: ${allData.length}`);

  // Phase 4: Import to databases (ADDITIVE)
  console.log('\n💾 Phase 4: Merging into database (additive)...');

  const kbCount = importToKnowledgeBase(seedData); // Only seed data for KB (high quality)
  const tdCount = importToTrainingData(allData);    // All data for training
  const faqCount = importToFAQ(seedData);           // Unique FAQs

  // Get final counts
  const totalKB = getDb().prepare('SELECT COUNT(*) as c FROM ml_knowledge_base').get().c;
  const totalTD = getDb().prepare('SELECT COUNT(*) as c FROM ml_training_data').get().c;
  const totalFAQ = getDb().prepare('SELECT COUNT(*) as c FROM ai_faq WHERE active = 1').get().c;

  // Summary
  console.log('\n========================================');
  console.log('✨ Merge Complete!');
  console.log('========================================');
  console.log(`📚 Knowledge Base: +${kbCount} new (${totalKB} total)`);
  console.log(`🎓 Training Data: +${tdCount} new (${totalTD} total)`);
  console.log(`❓ FAQ: +${faqCount} new (${totalFAQ} total)`);

  // Show learned data preserved
  const learnedCount = getDb().prepare(`
    SELECT COUNT(*) as c FROM ml_knowledge_base
    WHERE source NOT IN ('seed', 'singlish_seed')
  `).get().c;
  console.log(`\n🧠 Learned entries preserved: ${learnedCount}`);

  // Show intent distribution
  const intentCounts = {};
  for (const entry of allData) {
    intentCounts[entry.intent] = (intentCounts[entry.intent] || 0) + 1;
  }

  console.log('\n📈 Intent Distribution (seed data):');
  const sorted = Object.entries(intentCounts).sort((a, b) => b[1] - a[1]);
  for (const [intent, count] of sorted.slice(0, 10)) {
    console.log(`   ${intent}: ${count}`);
  }

  console.log('\n🎯 Usage:');
  console.log('   node db/seed-slm-data.js           # Add new + dedupe');
  console.log('   node db/seed-slm-data.js --dedupe  # Dedupe only');
  console.log('   node db/seed-slm-data.js --no-dedupe # Add without deduping');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  seedData,
  synonyms,
  templates,
  generateFromTemplates,
  importToKnowledgeBase,
  importToTrainingData,
  deduplicateKnowledgeBase,
  deduplicateTrainingData,
  normalizeQuestion,
  setDb,
};
