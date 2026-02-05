/**
 * Essential Data Seeder
 * Seeds core reference data needed for the platform to function
 * Runs in both production and development environments
 * 
 * @module db/seeds/essential-data
 */

/**
 * Seed essential data (achievements, quests, tiers, templates, etc.)
 * This data is required for the platform to function properly
 * 
 * @param {Database} db - better-sqlite3 database instance
 */
function seedEssentialData(db) {
  console.log('🌱 Seeding essential data...');

  // Check what's already seeded
  const achievementCount = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c;
  const questCount = db.prepare('SELECT COUNT(*) as c FROM quests').get().c;
  const rewardCount = db.prepare('SELECT COUNT(*) as c FROM rewards').get().c;
  const tierCount = db.prepare('SELECT COUNT(*) as c FROM referral_tiers').get().c;

  // ============================================
  // REFERRAL TIERS
  // ============================================
  if (tierCount === 0) {
    const tiers = [
      [1, 1, 30, 'Bronze - First job completed by referral'],
      [2, 5, 50, 'Silver - 5 jobs completed by referral'],
      [3, 15, 100, 'Gold - 15 jobs completed by referral'],
      [4, 30, 150, 'Platinum - 30 jobs completed by referral'],
    ];
    
    const tierStmt = db.prepare(`
      INSERT OR IGNORE INTO referral_tiers (tier_level, jobs_required, bonus_amount, description)
      VALUES (?,?,?,?)
    `);
    
    tiers.forEach(t => tierStmt.run(...t));
    console.log('  ✅ Seeded referral tiers');
  }

  // ============================================
  // ACHIEVEMENTS - Gamification Strategy
  // ============================================
  if (achievementCount === 0) {
    const achievements = [
      // GETTING STARTED - Special category for newcomers
      ['ACH_WELCOME', 'Welcome Aboard', 'Complete your first login to WorkLink', 'user-check', 'special', 'first_login', 1, 50, 'common'],
      ['ACH_ALL_SET', 'All Set', 'Complete your profile with name, phone, photo, and address', 'check-circle', 'special', 'profile_complete', 1, 100, 'common'],
      ['ACH_VERIFIED', 'Verified Worker', 'Successfully verify your email address', 'mail-check', 'special', 'email_verified', 1, 75, 'common'],
      ['ACH_QUEST_STARTER', 'Quest Starter', 'Complete your first quest', 'map', 'special', 'first_quest', 1, 100, 'common'],
      ['ACH_FIRST_SHIFT', 'First Shift Hero', 'Successfully complete your very first job shift', 'star', 'special', 'first_job_complete', 1, 250, 'rare'],

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
    
    const achStmt = db.prepare('INSERT OR IGNORE INTO achievements VALUES (?,?,?,?,?,?,?,?,?)');
    achievements.forEach(a => achStmt.run(...a));
    console.log('  ✅ Seeded achievements');
  }

  // ============================================
  // QUESTS - Career Ladder Strategy
  // ============================================
  if (questCount === 0) {
    const quests = [
      // One-time Quests
      ['QST_PROFILE', 'Complete Your Profile', 'Fill in all profile details: name, phone, photo, and address', 'special', '{"type":"profile_completion","count":1}', 100, 50, 1],

      // Daily Quests (Reset 00:00)
      ['QST_CHECKIN', 'Check-in', 'Open the app today', 'daily', '{"type":"app_open","count":1}', 10, 0, 1],
      ['QST_READY', 'Ready to Work', 'Update availability calendar for the next 3 days', 'daily', '{"type":"update_availability","days":3}', 50, 0, 1],
      ['QST_FAST', 'Fast Finger', 'Apply for a job within 30 mins of posting', 'daily', '{"type":"quick_apply","minutes":30}', 20, 0, 1],

      // Weekly Quests (Reset Monday)
      ['QST_WEEKENDER', 'The Weekender', 'Complete a shift on Saturday or Sunday', 'weekly', '{"type":"weekend_shift","count":1}', 300, 0, 1],
      ['QST_STREAK', 'Streak Keeper', 'Work 3 days in a row', 'weekly', '{"type":"work_streak","days":3}', 500, 0, 1],
      ['QST_EARNINGS', 'Earnings Goal', 'Earn $500 this week', 'weekly', '{"type":"weekly_earnings","amount":500}', 250, 25, 1],
    ];
    
    const questStmt = db.prepare('INSERT OR IGNORE INTO quests VALUES (?,?,?,?,?,?,?,?)');
    quests.forEach(q => questStmt.run(...q));
    console.log('  ✅ Seeded quests');
  }

  // ============================================
  // TRAINING MODULES
  // ============================================
  const training = [
    ['TRN001', 'Server Basics', 'F&B service fundamentals', 45, 'Server Basics', 150],
    ['TRN002', 'Food Safety', 'Food handling certification', 60, 'Food Safety', 200],
    ['TRN003', 'Customer Service', 'Customer interaction skills', 30, 'Customer Service', 100],
    ['TRN004', 'Bartending 101', 'Basic bartending skills', 90, 'Bartending', 250],
    ['TRN005', 'Event Management', 'Large event coordination', 60, 'Event Crew', 200],
  ];
  
  const trainStmt = db.prepare('INSERT OR IGNORE INTO training VALUES (?,?,?,?,?,?)');
  training.forEach(t => trainStmt.run(...t));

  // ============================================
  // REWARDS SHOP
  // ============================================
  if (rewardCount === 0) {
    const rewards = [
      // Feature Unlocks
      ['RWD_DARK_MODE', 'Dark Mode Pro', 'Unlock custom color themes for the app', 'palette', 'feature', 2500, 'bronze', null, 1],
      ['RWD_PROFILE_FLAIR', 'Profile Flair', 'Add an emoji or tag next to your name', 'sparkles', 'feature', 2000, 'bronze', null, 1],
      ['RWD_SHIFT_SWAP', 'Shift Swap', 'Trade shifts with other workers without penalty', 'refresh-cw', 'feature', 10000, 'gold', null, 1],

      // Operational Advantages
      ['RWD_INSTANT_PAY', 'Instant Pay Token', 'One-time immediate payout for completed shifts', 'zap', 'operational', 5000, 'silver', null, 1],
      ['RWD_FORGIVENESS', 'Forgiveness Voucher', 'Remove one late cancellation penalty from your record', 'shield', 'operational', 20000, 'platinum', null, 1],

      // Physical Rewards
      ['RWD_CAP', 'WorkLink Cap', 'Branded WorkLink cap delivered to you', 'hard-hat', 'physical', 8000, 'silver', 50, 1],
      ['RWD_TSHIRT', 'WorkLink T-Shirt', 'Branded WorkLink t-shirt delivered to you', 'shirt', 'physical', 15000, 'gold', 30, 1],
      ['RWD_CERT_VOUCHER', 'Cert Exam Voucher', 'Voucher to pay for a certification exam of your choice', 'award', 'physical', 50000, 'platinum', 10, 1],
    ];
    
    const rewardStmt = db.prepare(`
      INSERT OR IGNORE INTO rewards (id, name, description, icon, category, points_cost, tier_required, stock, active)
      VALUES (?,?,?,?,?,?,?,?,?)
    `);
    rewards.forEach(r => rewardStmt.run(...r));
    console.log('  ✅ Seeded rewards shop');
  }

  // ============================================
  // INCENTIVE SCHEMES
  // ============================================
  const schemes = [
    ['INC001', 'Consistency Bonus', '5+ jobs/month bonus', 'consistency', 'monthly_jobs', 5, 'fixed', 20, 50, 20, 1],
    ['INC002', 'Perfect Rating', '5-star rating bonus', 'performance', 'rating', 5, 'fixed', 5, 5, 20, 1],
    ['INC003', 'Referral Bonus', 'Refer a friend', 'referral', 'referral', 1, 'tiered', 30, 150, 20, 1],
    ['INC004', 'Streak Bonus', '7-day work streak', 'streak', 'streak_days', 7, 'fixed', 15, 15, 20, 1],
  ];
  
  const schemeStmt = db.prepare(`
    INSERT OR IGNORE INTO incentive_schemes
    VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
  `);
  schemes.forEach(s => schemeStmt.run(...s));

  // ============================================
  // MESSAGE TEMPLATES
  // ============================================
  const templates = [
    ['TPL001', 'Welcome', 'onboarding', 'Hi {name}! Welcome to WorkLink.', '👋 Hi {name}! Welcome to WorkLink!\n\n🔗 {app_link}', '["name","app_link"]'],
    ['TPL002', 'Job Match', 'job', 'Job available: {job_title} at {location}', '🎯 *Perfect Match!*\n\n{job_title}\n📍 {location}\n💰 ${pay_rate}/hr', '["job_title","location","pay_rate"]'],
    ['TPL003', 'Job Reminder', 'reminder', 'Reminder: Job tomorrow at {location}', '⏰ *Reminder*\n\n📍 {location}\n🕐 {time}', '["location","time"]'],
    ['TPL004', 'Payment', 'payment', 'Payment of ${amount} processed.', '💰 *Payment Received!*\n\n${amount}', '["amount"]'],
    ['TPL005', 'Referral Success', 'referral', '{friend_name} signed up!', '🎉 {friend_name} joined! Earn ${bonus} on first job.', '["friend_name","bonus"]'],
  ];
  
  const templateStmt = db.prepare(`
    INSERT OR IGNORE INTO message_templates (id, name, category, content, whatsapp_content, variables)
    VALUES (?,?,?,?,?,?)
  `);
  templates.forEach(t => templateStmt.run(...t));

  // ============================================
  // TENDER ALERTS
  // ============================================
  const alerts = [
    ['Supply of Manpower Services', 'gebiz'],
    ['Provision of Temporary Staff', 'gebiz'],
    ['Event Support', 'gebiz'],
    ['Admin Support', 'gebiz'],
  ];
  
  const alertStmt = db.prepare(`
    INSERT OR IGNORE INTO tender_alerts (keyword, source, email_notify, active)
    VALUES (?, ?, 1, 1)
  `);
  alerts.forEach(a => alertStmt.run(...a));

  // ============================================
  // AI/ML SETTINGS
  // ============================================
  seedAISettings(db);
  seedMLSettings(db);
  seedTelegramSettings(db);
  seedAdMLSettings(db);

  console.log('✅ Essential data seeded successfully');
}

/**
 * Seed AI chat settings
 */
function seedAISettings(db) {
  const aiSettings = [
    ['ai_enabled', 'true', 'Master switch for AI auto-reply'],
    ['default_mode', 'auto', 'Default AI mode: off | auto | suggest'],
    ['response_delay_ms', '1500', 'Delay before AI responds (ms)'],
    ['typing_delay_enabled', 'true', 'Show typing indicator'],
    ['response_style', 'concise', 'AI response style'],
    ['language_style', 'singlish', 'AI language style'],
    ['max_context_messages', '10', 'Previous messages in context'],
    ['include_candidate_profile', 'true', 'Include candidate info'],
    ['include_job_suggestions', 'true', 'Allow job suggestions'],
  ];
  
  const aiStmt = db.prepare(`
    INSERT OR IGNORE INTO ai_settings (key, value, description)
    VALUES (?, ?, ?)
  `);
  aiSettings.forEach(s => aiStmt.run(...s));

  // Ensure correct defaults
  db.prepare("UPDATE ai_settings SET value = 'true' WHERE key = 'ai_enabled'").run();
  db.prepare("UPDATE ai_settings SET value = 'auto' WHERE key = 'default_mode'").run();
}

/**
 * Seed ML settings
 */
function seedMLSettings(db) {
  const mlSettings = [
    ['kb_enabled', 'true', 'Use knowledge base before LLM'],
    ['min_confidence', '0.75', 'Minimum confidence for KB answer'],
    ['learn_from_llm', 'true', 'Auto-add LLM responses to KB'],
    ['learn_from_edits', 'true', 'Learn from admin corrections'],
    ['learn_from_approvals', 'true', 'Boost confidence on approval'],
    ['confidence_boost_approve', '0.1', 'Confidence increase on approval'],
    ['confidence_boost_edit', '0.05', 'Confidence increase on edit'],
    ['confidence_penalty_reject', '0.15', 'Confidence decrease on rejection'],
  ];
  
  const mlStmt = db.prepare(`
    INSERT OR IGNORE INTO ml_settings (key, value, description)
    VALUES (?, ?, ?)
  `);
  mlSettings.forEach(s => mlStmt.run(...s));
}

/**
 * Seed Telegram post settings
 */
function seedTelegramSettings(db) {
  const telegramSettings = [
    ['auto_post_enabled', 'false', 'Auto-post jobs when created'],
    ['ab_testing_enabled', 'true', 'Enable A/B testing for ads'],
    ['variants_per_job', '2', 'Number of ad variants'],
    ['measurement_hours', '48', 'Hours before evaluating A/B test'],
    ['use_optimal_timing', 'true', 'Schedule posts at optimal times'],
  ];
  
  const tgStmt = db.prepare(`
    INSERT OR IGNORE INTO telegram_post_settings (key, value)
    VALUES (?, ?)
  `);
  telegramSettings.forEach(s => tgStmt.run(s[0], s[1]));
}

/**
 * Seed Ad ML settings
 */
function seedAdMLSettings(db) {
  const adMlSettings = [
    ['use_learned_preferences', 'true', 'Apply learned preferences'],
    ['min_tests_for_confidence', '5', 'Min A/B tests for confidence'],
    ['exploration_rate', '0.2', 'Exploration vs exploitation'],
    ['auto_optimize', 'true', 'Auto-use best variables'],
  ];
  
  const adStmt = db.prepare(`
    INSERT OR IGNORE INTO ad_ml_settings (key, value, description)
    VALUES (?, ?, ?)
  `);
  adMlSettings.forEach(s => adStmt.run(s[0], s[1], s[2] || null));
}

module.exports = {
  seedEssentialData,
};
