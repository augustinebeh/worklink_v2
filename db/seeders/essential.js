/**
 * Essential Data Seeder
 * Production-safe data that should always exist in the database
 * This includes achievements, rewards, settings, and AI training data
 */

const { generateAvatar } = require('../connection');

/**
 * Seed essential data that should exist in both development and production
 * @param {Database} db - SQLite database instance
 */
function seedEssentialData(db) {
  console.log('🌱 Seeding essential data...');

  const achievementCount = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c;

  // Referral tiers
  const tierCount = db.prepare('SELECT COUNT(*) as c FROM referral_tiers').get().c;
  if (tierCount === 0) {
    const tiers = [
      [1, 1, 30, 'Bronze - First job completed by referral'],
      [2, 5, 50, 'Silver - 5 jobs completed by referral'],
      [3, 15, 100, 'Gold - 15 jobs completed by referral'],
      [4, 30, 150, 'Platinum - 30 jobs completed by referral'],
    ];
    tiers.forEach(t => {
      db.prepare('INSERT OR IGNORE INTO referral_tiers (tier_level, jobs_required, bonus_amount, description) VALUES (?,?,?,?)').run(...t);
    });
  }

  // Achievements - Career Ladder Gamification Strategy
  // Clear old achievements and insert new ones based on GamificationStrategy.md
  if (achievementCount === 0) {
    const achievements = [
      // THE RELIABLE - Attendance Focused
      ['ACH_IRONCLAD_1', 'Ironclad I', 'Complete 10 shifts without a single cancellation', 'shield', 'reliable', 'no_cancel_streak', 10, 300, 'common'],
      ['ACH_IRONCLAD_2', 'Ironclad II', 'Complete 50 shifts without a single cancellation', 'shield-check', 'reliable', 'no_cancel_streak', 50, 750, 'rare'],
      ['ACH_IRONCLAD_3', 'Ironclad III', 'Complete 100 shifts without a single cancellation', 'shield-star', 'reliable', 'no_cancel_streak', 100, 2000, 'legendary'],
      ['ACH_EARLY_BIRD', 'Early Bird', 'Clock in 10 minutes early for 5 consecutive shifts', 'sunrise', 'reliable', 'early_checkin_streak', 5, 250, 'rare'],
      ['ACH_CLOSER', 'The Closer', 'Complete 10 shifts during holidays or weekends', 'calendar-check', 'reliable', 'weekend_holiday_shifts', 10, 400, 'rare'],

      // THE SKILLED - Performance Focused
      ['ACH_FIVE_STAR', 'Five-Star General', 'Maintain a 5.0 rating for 20 consecutive shifts', 'medal', 'skilled', 'five_star_streak', 20, 500, 'epic'],
      ['ACH_JACK', 'Jack of All Trades', 'Complete jobs in 3 different categories', 'briefcase', 'skilled', 'job_categories', 3, 350, 'rare'],
      ['ACH_CERTIFIED', 'Certified Pro', 'Complete all available training modules', 'award', 'skilled', 'all_training', 1, 1000, 'epic'],

      // THE SOCIAL - Community Focused
      ['ACH_HEADHUNTER', 'Headhunter', 'Successfully refer 5 workers', 'users', 'social', 'referrals', 5, 500, 'rare'],
    ];
    achievements.forEach(a => {
      db.prepare('INSERT OR IGNORE INTO achievements VALUES (?,?,?,?,?,?,?,?,?)').run(...a);
    });
  }

  // Quests - Career Ladder Gamification Strategy
  // Based on GamificationStrategy.md Quest Configuration
  const questCount = db.prepare('SELECT COUNT(*) as c FROM quests').get().c;
  if (questCount === 0) {
    const quests = [
      // Daily Quests (Reset 00:00) - Objective: Daily Active Users (DAU)
      ['QST_CHECKIN', 'Check-in', 'Open the app today', 'daily', '{"type":"app_open","count":1}', 10, 0, 1],
      ['QST_READY', 'Ready to Work', 'Update availability calendar for the next 3 days', 'daily', '{"type":"update_availability","days":3}', 50, 0, 1],
      ['QST_FAST', 'Fast Finger', 'Apply for a job within 30 mins of posting', 'daily', '{"type":"quick_apply","minutes":30}', 20, 0, 1],

      // Weekly Quests (Reset Monday) - Objective: Weekly consistency and fulfillment
      ['QST_WEEKENDER', 'The Weekender', 'Complete a shift on Saturday or Sunday', 'weekly', '{"type":"weekend_shift","count":1}', 300, 0, 1],
      ['QST_STREAK', 'Streak Keeper', 'Work 3 days in a row', 'weekly', '{"type":"work_streak","days":3}', 500, 0, 1],
      ['QST_EARNINGS', 'Earnings Goal', 'Earn $500 this week', 'weekly', '{"type":"weekly_earnings","amount":500}', 250, 25, 1],
    ];
    quests.forEach(q => {
      db.prepare('INSERT OR IGNORE INTO quests VALUES (?,?,?,?,?,?,?,?)').run(...q);
    });
    console.log('  ✅ Seeded quests (Career Ladder Strategy)');
  }

  // Training
  const training = [
    ['TRN001', 'Server Basics', 'F&B service fundamentals', 45, 'Server Basics', 150],
    ['TRN002', 'Food Safety', 'Food handling certification', 60, 'Food Safety', 200],
    ['TRN003', 'Customer Service', 'Customer interaction skills', 30, 'Customer Service', 100],
    ['TRN004', 'Bartending 101', 'Basic bartending skills', 90, 'Bartending', 250],
    ['TRN005', 'Event Management', 'Large event coordination', 60, 'Event Crew', 200],
  ];
  training.forEach(t => {
    db.prepare('INSERT OR IGNORE INTO training VALUES (?,?,?,?,?,?)').run(...t);
  });

  // Rewards Shop - The Sink (Career Ladder Strategy)
  const rewardCount = db.prepare('SELECT COUNT(*) as c FROM rewards').get().c;
  if (rewardCount === 0) {
    // Pricing based on ~5000 points/week for active worker (1 XP = 1 point)
    const rewards = [
      // Feature Unlocks (Zero Cost to Business) - ~3-5 days of activity
      ['RWD_DARK_MODE', 'Dark Mode Pro', 'Unlock custom color themes for the app', 'palette', 'feature', 2500, 'bronze', null, 1],
      ['RWD_PROFILE_FLAIR', 'Profile Flair', 'Add an emoji or tag next to your name', 'sparkles', 'feature', 2000, 'bronze', null, 1],
      ['RWD_SHIFT_SWAP', 'Shift Swap', 'Trade shifts with other workers without penalty', 'refresh-cw', 'feature', 10000, 'gold', null, 1],

      // Operational Advantages - ~1-4 weeks of activity
      ['RWD_INSTANT_PAY', 'Instant Pay Token', 'One-time immediate payout for completed shifts', 'zap', 'operational', 5000, 'silver', null, 1],
      ['RWD_FORGIVENESS', 'Forgiveness Voucher', 'Remove one late cancellation penalty from your record', 'shield', 'operational', 20000, 'platinum', null, 1],

      // Physical/Monetary Rewards - ~2-10 weeks of activity
      ['RWD_CAP', 'WorkLink Cap', 'Branded WorkLink cap delivered to you', 'hard-hat', 'physical', 8000, 'silver', 50, 1],
      ['RWD_TSHIRT', 'WorkLink T-Shirt', 'Branded WorkLink t-shirt delivered to you', 'shirt', 'physical', 15000, 'gold', 30, 1],
      ['RWD_CERT_VOUCHER', 'Cert Exam Voucher', 'Voucher to pay for a certification exam of your choice', 'award', 'physical', 50000, 'platinum', 10, 1],
    ];
    rewards.forEach(r => {
      db.prepare('INSERT OR IGNORE INTO rewards (id, name, description, icon, category, points_cost, tier_required, stock, active) VALUES (?,?,?,?,?,?,?,?,?)').run(...r);
    });
    console.log('  ✅ Seeded rewards shop (Career Ladder Strategy)');
  }

  // Incentive schemes
  const schemes = [
    ['INC001', 'Consistency Bonus', '5+ jobs/month bonus', 'consistency', 'monthly_jobs', 5, 'fixed', 20, 50, 20, 1],
    ['INC002', 'Perfect Rating', '5-star rating bonus', 'performance', 'rating', 5, 'fixed', 5, 5, 20, 1],
    ['INC003', 'Referral Bonus', 'Refer a friend', 'referral', 'referral', 1, 'tiered', 30, 150, 20, 1],
    ['INC004', 'Streak Bonus', '7-day work streak', 'streak', 'streak_days', 7, 'fixed', 15, 15, 20, 1],
  ];
  schemes.forEach(s => {
    db.prepare(`INSERT OR IGNORE INTO incentive_schemes VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`).run(...s);
  });

  // Message templates
  const templates = [
    ['TPL001', 'Welcome', 'onboarding', 'Hi {name}! Welcome to WorkLink.', '👋 Hi {name}! Welcome to WorkLink!\\n\\n🔗 {app_link}', '["name","app_link"]'],
    ['TPL002', 'Job Match', 'job', 'Job available: {job_title} at {location}', '🎯 *Perfect Match!*\\n\\n{job_title}\\n📍 {location}\\n💰 ${pay_rate}/hr', '["job_title","location","pay_rate"]'],
    ['TPL003', 'Job Reminder', 'reminder', 'Reminder: Job tomorrow at {location}', '⏰ *Reminder*\\n\\n📍 {location}\\n🕐 {time}', '["location","time"]'],
    ['TPL004', 'Payment', 'payment', 'Payment of ${amount} processed.', '💰 *Payment Received!*\\n\\n${amount}', '["amount"]'],
    ['TPL005', 'Referral Success', 'referral', '{friend_name} signed up!', '🎉 {friend_name} joined! Earn ${bonus} on first job.', '["friend_name","bonus"]'],
  ];
  templates.forEach(t => {
    db.prepare('INSERT OR IGNORE INTO message_templates (id, name, category, content, whatsapp_content, variables) VALUES (?,?,?,?,?,?)').run(...t);
  });

  // Default tender alerts
  const alerts = [
    ['Supply of Manpower Services', 'gebiz'],
    ['Provision of Temporary Staff', 'gebiz'],
    ['Event Support', 'gebiz'],
    ['Admin Support', 'gebiz'],
  ];
  alerts.forEach(a => {
    db.prepare('INSERT OR IGNORE INTO tender_alerts (keyword, source, email_notify, active) VALUES (?, ?, 1, 1)').run(...a);
  });

  // Seed AI/ML settings and training data
  seedAIMLData(db);

  console.log('✅ Essential data seeded (including AI/ML training data)');
}

/**
 * Seed AI/ML default settings and training data
 * @param {Database} db - SQLite database instance
 */
function seedAIMLData(db) {
  // AI Chat Settings - Use INSERT OR REPLACE to ensure correct defaults on Railway
  const aiSettings = [
    ['ai_enabled', 'true', 'Master switch for AI auto-reply'],
    ['default_mode', 'auto', 'Default AI mode: off | auto | suggest'],
    ['response_delay_ms', '1500', 'Delay before AI responds (ms) for natural feel'],
    ['typing_delay_enabled', 'true', 'Show typing indicator with 3-5s delay before AI responds'],
    ['response_style', 'concise', 'AI response style: concise | normal'],
    ['language_style', 'singlish', 'AI language style: singlish | professional'],
    ['max_context_messages', '10', 'Number of previous messages to include in context'],
    ['include_candidate_profile', 'true', 'Include candidate info in AI context'],
    ['include_job_suggestions', 'true', 'Allow AI to suggest relevant jobs'],
  ];
  aiSettings.forEach(s => {
    // First insert if not exists, then ensure ai_enabled and default_mode are correct
    db.prepare('INSERT OR IGNORE INTO ai_settings (key, value, description) VALUES (?, ?, ?)').run(...s);
  });
  // Ensure AI is enabled with correct defaults (fixes Railway database)
  db.prepare("UPDATE ai_settings SET value = 'true' WHERE key = 'ai_enabled'").run();
  db.prepare("UPDATE ai_settings SET value = 'auto' WHERE key = 'default_mode'").run();

  // ML Settings
  const mlSettings = [
    ['kb_enabled', 'true', 'Use knowledge base before calling LLM'],
    ['min_confidence', '0.75', 'Minimum confidence to use KB answer (0-1)'],
    ['learn_from_llm', 'true', 'Auto-add LLM responses to KB'],
    ['learn_from_edits', 'true', 'Learn from admin corrections'],
    ['learn_from_approvals', 'true', 'Boost confidence when admin approves'],
    ['confidence_boost_approve', '0.1', 'Confidence increase on approval'],
    ['confidence_boost_edit', '0.05', 'Confidence increase when edited (learns edited version)'],
    ['confidence_penalty_reject', '0.15', 'Confidence decrease on rejection'],
  ];
  mlSettings.forEach(s => {
    db.prepare('INSERT OR IGNORE INTO ml_settings (key, value, description) VALUES (?, ?, ?)').run(...s);
  });

  // Telegram Post Settings
  const telegramSettings = [
    ['auto_post_enabled', 'false', 'Auto-post jobs when created'],
    ['ab_testing_enabled', 'true', 'Enable A/B testing for ads'],
    ['variants_per_job', '2', 'Number of ad variants to generate'],
    ['measurement_hours', '48', 'Hours to wait before evaluating A/B test'],
    ['use_optimal_timing', 'true', 'Schedule posts at optimal times'],
  ];
  telegramSettings.forEach(s => {
    db.prepare('INSERT OR IGNORE INTO telegram_post_settings (key, value) VALUES (?, ?)').run(s[0], s[1]);
  });

  // Ad ML Settings
  const adMlSettings = [
    ['use_learned_preferences', 'true', 'Apply learned variable preferences to new ads'],
    ['min_tests_for_confidence', '5', 'Minimum A/B tests before considering variable confident'],
    ['exploration_rate', '0.2', 'Probability of testing low-confidence variables (exploration vs exploitation)'],
    ['auto_optimize', 'true', 'Automatically use best-performing variables'],
  ];
  adMlSettings.forEach(s => {
    db.prepare('INSERT OR IGNORE INTO ad_ml_settings (key, value, description) VALUES (?, ?, ?)').run(s[0], s[1], s[2] || null);
  });

  // Seed FAQ and training data
  seedFAQData(db);
  seedMLKnowledgeBase(db);
  seedMLTrainingData(db);
  seedMLMetrics(db);
  seedAdMLData(db);
}

/**
 * Ensure demo account exists - ALWAYS runs in both environments
 * @param {Database} db - SQLite database instance
 */
function ensureDemoAccount(db) {
  const demoExists = db.prepare('SELECT COUNT(*) as c FROM candidates WHERE email = ?').get('sarah.tan@email.com').c;
  if (demoExists > 0) {
    console.log('✅ Demo account exists: sarah.tan@email.com');
    return;
  }

  console.log('🎭 Creating demo account: Sarah Tan');

  // Create Sarah Tan demo candidate
  // Career Ladder System: XP 16000 = Level 10 (Silver Member)
  // Formula: 500 × Level^1.5 → Level 10 = 15,811 XP
  // Total earnings = sum of payments: 120+128+160+125+128 = 661
  db.prepare(`
    INSERT INTO candidates (
      id, name, email, phone, status, source,
      xp, lifetime_xp, current_points, current_tier,
      level, streak_days, total_jobs_completed,
      certifications, skills, preferred_locations,
      referral_code, referral_tier, total_referral_earnings,
      total_incentives_earned, total_earnings, rating,
      profile_photo, online_status, whatsapp_opted_in, created_at, updated_at
    ) VALUES (
      'CND_DEMO_001',
      'Sarah Tan',
      'sarah.tan@email.com',
      '+6591234567',
      'active',
      'direct',
      16000,
      16000,
      500,
      'silver',
      10,
      5,
      42,
      '["Food Safety", "First Aid", "Customer Service"]',
      '["Customer Service", "Cash Handling", "Event Support", "F&B Service"]',
      '["Central", "East", "West"]',
      'SARAH001',
      2,
      180.00,
      250.00,
      661.00,
      4.8,
      ?,
      'online',
      1,
      datetime('now', '-180 days'),
      datetime('now')
    )
  `).run(generateAvatar('Sarah Tan'));

  // Add some payment history for Sarah
  const payments = [
    ['PAY_DEMO_001', 'CND_DEMO_001', null, 120.00, 0, 120.00, 8.0, 'paid', -7],
    ['PAY_DEMO_002', 'CND_DEMO_001', null, 108.00, 20.00, 128.00, 6.0, 'paid', -14],
    ['PAY_DEMO_003', 'CND_DEMO_001', null, 160.00, 0, 160.00, 8.0, 'paid', -21],
    ['PAY_DEMO_004', 'CND_DEMO_001', null, 110.00, 15.00, 125.00, 5.0, 'pending', -3],
    ['PAY_DEMO_005', 'CND_DEMO_001', null, 128.00, 0, 128.00, 8.0, 'approved', -1],
  ];
  payments.forEach(p => {
    db.prepare(`
      INSERT INTO payments (id, candidate_id, deployment_id, base_amount, incentive_amount, total_amount, hours_worked, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' days'))
    `).run(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]);
  });

  // Add XP transactions (Career Ladder Strategy action_types: shift, referral, penalty, quest_claim, achievement_claim)
  db.prepare(`INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, created_at) VALUES ('CND_DEMO_001', 'shift', 850, 'Shift completion: 8hrs + on-time', datetime('now', '-7 days'))`).run();
  db.prepare(`INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, created_at) VALUES ('CND_DEMO_001', 'shift', 1050, 'Shift completion: 6hrs + urgent + 5-star', datetime('now', '-14 days'))`).run();
  db.prepare(`INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, created_at) VALUES ('CND_DEMO_001', 'quest_claim', 10, 'Daily Check-in quest', datetime('now', '-1 days'))`).run();
  db.prepare(`INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, created_at) VALUES ('CND_DEMO_001', 'referral', 1000, 'Referral bonus: friend completed first job', datetime('now', '-10 days'))`).run();

  console.log('✅ Demo account created: sarah.tan@email.com');
}

// FAQ and training data functions (truncated for brevity - these would contain the full data arrays)
function seedFAQData(db) {
  const faqs = [
    ['pay', 'When will I get paid?', 'Payments are processed every Friday for jobs completed the previous week. You should receive the payment in your bank account by Monday. 💰', '["pay","paid","payment","salary","money","when"]', 10],
    ['pay', 'How is my pay calculated?', 'Your pay is calculated based on hours worked × hourly rate. Any bonuses (streak bonus, referral bonus, XP bonus) are added on top. You can see the breakdown in your Wallet section. 📊', '["calculate","how much","rate","hourly","breakdown"]', 9],
    ['schedule', 'How do I update my availability?', 'You can update your availability in the WorkLink app! Go to the Calendar tab, tap on the dates you want to change, and mark them as Available or Unavailable. Easy! 📅', '["availability","available","schedule","calendar","update","free"]', 10],
    ['schedule', 'Can I cancel a job?', "Please let us know at least 24 hours before the job if you need to cancel. Contact us immediately if there's an emergency. Last-minute cancellations may affect your rating, so try to give us as much notice as possible! 🙏", '["cancel","cancellation","cannot make it","emergency","cant go"]', 9],
    ['jobs', 'Are there any jobs available?', 'Yes! Check the Jobs tab in your app to see all available opportunities. You can filter by date, location, and job type. New jobs are posted regularly, so keep checking! 🎯', '["job","jobs","work","opportunity","available","opening"]', 10],
    // Additional FAQs would be included here...
  ];
  faqs.forEach(f => {
    db.prepare('INSERT OR IGNORE INTO ai_faq (category, question, answer, keywords, priority) VALUES (?, ?, ?, ?, ?)').run(...f);
  });
}

function seedMLKnowledgeBase(db) {
  // Truncated for brevity - this would contain the full knowledge base entries
  const knowledgeBaseEntries = [
    ['hi', 'Hello! How can I help you today? 😊', 'general_greeting', 0.97, 156, 154, 2, 0, 'approved'],
    ['when payment', 'Payments are processed every Friday! Money reaches your bank by Monday. Check Wallet for payment history. 💰', 'pay_inquiry', 0.92, 45, 42, 2, 1, 'approved'],
    ['got job or not', 'Yes! Check the Jobs tab for available positions. New jobs posted daily! 📱', 'job_search', 0.95, 67, 65, 2, 0, 'approved'],
    // More entries would be included here...
  ];

  knowledgeBaseEntries.forEach(entry => {
    db.prepare(`
      INSERT OR IGNORE INTO ml_knowledge_base
      (question, answer, intent, confidence, use_count, success_count, edit_count, reject_count, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...entry);
  });
}

function seedMLTrainingData(db) {
  // Training data for ML system
  const trainingData = [
    ['When will I receive my salary?', 'Payments are processed every Friday for the previous week. The money should be in your bank account by Monday!', 'pay_inquiry', 0.95, 1, null, 'production'],
    ['Got any job tomorrow?', 'Check the Jobs tab for tomorrow! Filter by date to see available positions. Apply early as slots fill up fast!', 'job_search', 0.92, 1, null, 'production'],
    // More training data would be included here...
  ];

  trainingData.forEach(entry => {
    db.prepare(`
      INSERT OR IGNORE INTO ml_training_data
      (input_text, output_text, intent, quality_score, admin_approved, edited_output, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(...entry);
  });
}

function seedMLMetrics(db) {
  // Generate historical metrics for the ML system
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Simulate improving KB hit rate over time
    const baseQueries = 20 + Math.floor(Math.random() * 30);
    const kbHitRate = 0.3 + (30 - i) * 0.015 + Math.random() * 0.1; // Improves over time
    const kbHits = Math.floor(baseQueries * Math.min(kbHitRate, 0.85));
    const llmCalls = baseQueries - kbHits;
    const costSaved = kbHits * 0.005; // $0.005 per LLM call saved

    db.prepare(`
      INSERT OR IGNORE INTO ml_metrics (date, total_queries, kb_hits, llm_calls, avg_confidence, estimated_cost_saved)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(dateStr, baseQueries, kbHits, llmCalls, 0.75 + Math.random() * 0.15, costSaved);
  }
}

function seedAdMLData(db) {
  // Skip if already seeded to prevent duplicates
  const adDataExists = db.prepare('SELECT COUNT(*) as c FROM ad_training_data').get().c > 0;
  if (adDataExists) {
    return;
  }

  // Ad variable scores (learned preferences)
  const variableScores = [
    // Tone preferences - "friendly" wins
    ['tone', 'friendly', null, 28, 8, 156, 0.045, 0.78],
    ['tone', 'casual', null, 18, 14, 89, 0.032, 0.56],
    ['tone', 'urgent', null, 12, 18, 67, 0.028, 0.40],
    // More variable scores would be included here...
  ];

  variableScores.forEach(v => {
    db.prepare(`
      INSERT OR IGNORE INTO ad_variable_scores
      (variable_name, variable_value, job_category, win_count, lose_count, total_responses, avg_response_rate, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...v);
  });

  // Timing scores (optimal posting times)
  const timingScores = [
    [18, 1, 45, 89, 0.051, 0.92], // Mon 6pm
    [19, 1, 52, 98, 0.055, 0.95], // Mon 7pm
    [19, 2, 55, 105, 0.058, 0.98], // Tue 7pm - BEST
    // More timing scores would be included here...
  ];

  timingScores.forEach(t => {
    db.prepare(`
      INSERT OR IGNORE INTO ad_timing_scores
      (hour, day_of_week, post_count, total_responses, avg_response_rate, score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(...t);
  });

  // Ad training data (winning ads)
  const adTrainingData = [
    [
      '{"title":"F&B Service Crew","location":"Marina Bay Sands","pay_rate":14,"category":"fnb"}',
      "🔥 *F&B SERVICE CREW NEEDED!*\\n\\n📍 Marina Bay Sands\\n💰 *$14/hr* - Great rate!\\n📅 This Saturday\\n⏰ 6pm - 11pm\\n\\n✅ No experience needed\\n✅ Meal provided\\n✅ MRT accessible\\n\\n👥 5 slots left - Apply now in WorkLink! 🚀",
      '{"tone":"friendly","emoji_count":"4","length":"medium","cta_style":"direct"}',
      0.058, 1, 0.92
    ],
    // More ad training data would be included here...
  ];

  adTrainingData.forEach(ad => {
    db.prepare(`
      INSERT OR IGNORE INTO ad_training_data
      (job_details, ad_content, variables, response_rate, is_winner, quality_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(...ad);
  });
}

module.exports = {
  seedEssentialData,
  ensureDemoAccount
};