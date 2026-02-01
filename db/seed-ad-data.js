/**
 * Ad Optimization Seed Data
 * Creates diverse, unique entries for the ad optimization feature
 * Run with: node db/seed-ad-data.js
 */

const { db } = require('./database');

console.log('Cleaning up duplicate ad data...');

// Clear all ad-related tables
db.exec(`
  DELETE FROM ad_performance;
  DELETE FROM ad_variants;
  DELETE FROM ad_training_data;
  DELETE FROM ad_variable_scores;
  DELETE FROM ad_timing_scores;
`);

console.log('Adding unique constraints...');

// Add unique constraints to prevent future duplicates
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_variants_unique ON ad_variants(job_id, variant_key)`);
} catch (e) { /* already exists */ }

try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_variable_scores_unique ON ad_variable_scores(variable_name, variable_value)`);
} catch (e) { /* already exists */ }

try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_timing_scores_unique ON ad_timing_scores(hour, day_of_week)`);
} catch (e) { /* already exists */ }

console.log('Seeding diverse ad training data...');

// Diverse ad training data with different job types, styles, and performance metrics
const adTrainingData = [
  // F&B Jobs - High performers
  {
    job_details: JSON.stringify({ title: "F&B Service Crew", location: "Marina Bay Sands", pay_rate: 14, category: "fnb", slots: 5 }),
    ad_content: `🔥 *F&B SERVICE CREW - MBS*

📍 Marina Bay Sands
💰 $14/hr
📅 This Saturday 6pm-11pm

✅ No experience needed
✅ Meal provided

5 slots left! Apply now! 🚀`,
    variables: JSON.stringify({ tone: "friendly", emoji_count: 4, length: "short", cta_style: "urgent" }),
    response_rate: 0.082, is_winner: 1, quality_score: 0.94
  },
  {
    job_details: JSON.stringify({ title: "Banquet Server", location: "Raffles Hotel", pay_rate: 16, category: "fnb", slots: 8 }),
    ad_content: `✨ *BANQUET SERVERS - RAFFLES HOTEL*

Prestigious wedding dinner event!

💰 *$16/hr* - Premium rate!
📅 Saturday 7th Dec, 5pm-12am
📍 Raffles Hotel Ballroom

Requirements:
• All-black attire
• F&B experience preferred

Only 8 slots! Apply fast! 🎯`,
    variables: JSON.stringify({ tone: "professional", emoji_count: 3, length: "medium", cta_style: "scarcity" }),
    response_rate: 0.075, is_winner: 1, quality_score: 0.92
  },
  {
    job_details: JSON.stringify({ title: "Cafe Barista", location: "Bugis Junction", pay_rate: 13, category: "fnb", slots: 2 }),
    ad_content: `☕ *BARISTA WANTED*

Trendy cafe at Bugis!

$13/hr | Flexible hours
Training provided for latte art!

Love coffee? Join us! 🫶`,
    variables: JSON.stringify({ tone: "casual", emoji_count: 3, length: "short", cta_style: "question" }),
    response_rate: 0.068, is_winner: 1, quality_score: 0.88
  },

  // Event Jobs - Various styles
  {
    job_details: JSON.stringify({ title: "Event Crew", location: "Sentosa", pay_rate: 15, category: "events", slots: 12 }),
    ad_content: `🎪 *EVENT CREW - SENTOSA*

Corporate event this Friday!

💰 $15/hr (8 hours)
📍 Sentosa Gateway
⏰ 2pm - 10pm

Tasks: Registration, crowd management, setup

12 positions! Apply now! 🏃`,
    variables: JSON.stringify({ tone: "energetic", emoji_count: 4, length: "medium", cta_style: "direct" }),
    response_rate: 0.071, is_winner: 1, quality_score: 0.89
  },
  {
    job_details: JSON.stringify({ title: "Concert Usher", location: "National Stadium", pay_rate: 14, category: "events", slots: 50 }),
    ad_content: `🎤 *CONCERT USHERS NEEDED!*

Major K-pop concert at National Stadium!

$14/hr + FREE concert view! 🎶
Date: Next Saturday
Slots: 50 positions

First come first serve!
Apply in WorkLink now! 🔥`,
    variables: JSON.stringify({ tone: "excited", emoji_count: 4, length: "short", cta_style: "fomo" }),
    response_rate: 0.095, is_winner: 1, quality_score: 0.96
  },
  {
    job_details: JSON.stringify({ title: "Exhibition Guide", location: "ArtScience Museum", pay_rate: 15, category: "events", slots: 6 }),
    ad_content: `🎨 *EXHIBITION GUIDE*

ArtScience Museum - New Exhibition

$15/hr | Part-time
Speaking English required

Interested in art & science?
This is perfect for you! ✨`,
    variables: JSON.stringify({ tone: "sophisticated", emoji_count: 2, length: "short", cta_style: "appeal" }),
    response_rate: 0.052, is_winner: 0, quality_score: 0.78
  },

  // Warehouse/Logistics - Practical style
  {
    job_details: JSON.stringify({ title: "Warehouse Packer", location: "Tuas", pay_rate: 12, category: "warehouse", slots: 20 }),
    ad_content: `📦 *WAREHOUSE PACKERS - TUAS*

$12/hr | Mon-Fri available
🚌 FREE transport from Jurong East MRT

Simple packing job. No experience needed!
Training provided.

20 positions open 👆`,
    variables: JSON.stringify({ tone: "straightforward", emoji_count: 3, length: "medium", cta_style: "direct" }),
    response_rate: 0.058, is_winner: 1, quality_score: 0.85
  },
  {
    job_details: JSON.stringify({ title: "Delivery Helper", location: "Island-wide", pay_rate: 13, category: "logistics", slots: 8 }),
    ad_content: `🚚 *DELIVERY HELPER*

Island-wide deliveries
$13/hr + OT available

Requirements:
• Can lift 15kg
• Basic English

Start immediately! 💪`,
    variables: JSON.stringify({ tone: "practical", emoji_count: 2, length: "short", cta_style: "urgent" }),
    response_rate: 0.049, is_winner: 0, quality_score: 0.76
  },
  {
    job_details: JSON.stringify({ title: "Inventory Counter", location: "Changi", pay_rate: 11, category: "warehouse", slots: 15 }),
    ad_content: `📋 *INVENTORY COUNTERS*

Night shift at Changi warehouse
$11/hr (10pm - 6am)
$2/hr night allowance!

Easy counting job. AC environment.
15 slots available.`,
    variables: JSON.stringify({ tone: "informative", emoji_count: 1, length: "medium", cta_style: "factual" }),
    response_rate: 0.042, is_winner: 0, quality_score: 0.72
  },

  // Retail Jobs
  {
    job_details: JSON.stringify({ title: "Retail Assistant", location: "ION Orchard", pay_rate: 13, category: "retail", slots: 4 }),
    ad_content: `🛍️ *RETAIL ASSISTANT - ION ORCHARD*

Fashion brand needs help!

💰 $13/hr + commission
📅 Weekends available

Looking for:
• Friendly personality
• Neat appearance

Love fashion? Apply now! 😄`,
    variables: JSON.stringify({ tone: "friendly", emoji_count: 3, length: "medium", cta_style: "question" }),
    response_rate: 0.061, is_winner: 1, quality_score: 0.86
  },
  {
    job_details: JSON.stringify({ title: "Cashier", location: "VivoCity", pay_rate: 12, category: "retail", slots: 3 }),
    ad_content: `💳 *CASHIER - VIVOCITY*

Supermarket chain hiring!

$12/hr | Various shifts
Experience preferred but not required

Apply through WorkLink 👍`,
    variables: JSON.stringify({ tone: "neutral", emoji_count: 2, length: "short", cta_style: "direct" }),
    response_rate: 0.044, is_winner: 0, quality_score: 0.74
  },
  {
    job_details: JSON.stringify({ title: "Brand Ambassador", location: "Multiple Locations", pay_rate: 14, category: "retail", slots: 10 }),
    ad_content: `⭐ *BRAND AMBASSADORS*

New skincare brand launch!

$14/hr + product samples
Locations: Takashimaya, Tangs, Metro

Outgoing personality needed!
Full training provided 🎓

10 positions - Apply now!`,
    variables: JSON.stringify({ tone: "enthusiastic", emoji_count: 3, length: "medium", cta_style: "benefit" }),
    response_rate: 0.067, is_winner: 1, quality_score: 0.87
  },

  // Promoter Jobs
  {
    job_details: JSON.stringify({ title: "Roadshow Promoter", location: "Tampines Mall", pay_rate: 11, category: "promo", slots: 6 }),
    ad_content: `📢 *ROADSHOW PROMOTER*

Telco promotion at Tampines!

$11/hr + commission 💸
This weekend, 11am-9pm

Training on Day 1.
Interested? Apply now! 📱`,
    variables: JSON.stringify({ tone: "casual", emoji_count: 3, length: "short", cta_style: "question" }),
    response_rate: 0.055, is_winner: 1, quality_score: 0.82
  },
  {
    job_details: JSON.stringify({ title: "Flyer Distributor", location: "Orchard Road", pay_rate: 10, category: "promo", slots: 8 }),
    ad_content: `📄 Flyer Distribution - Orchard

$10/hr | 4-hour shifts
Simple job, just hand out flyers!

No experience needed.
8 positions available.`,
    variables: JSON.stringify({ tone: "minimal", emoji_count: 1, length: "short", cta_style: "factual" }),
    response_rate: 0.038, is_winner: 0, quality_score: 0.68
  },
  {
    job_details: JSON.stringify({ title: "Product Sampling", location: "NTUC Fairprice", pay_rate: 12, category: "promo", slots: 4 }),
    ad_content: `🧁 *PRODUCT SAMPLING CREW*

Free food + get paid!

$12/hr at NTUC outlets
Promote new snack brand

Fun job for friendly people! 🙌`,
    variables: JSON.stringify({ tone: "playful", emoji_count: 3, length: "short", cta_style: "benefit" }),
    response_rate: 0.072, is_winner: 1, quality_score: 0.88
  },

  // Admin/Office Jobs
  {
    job_details: JSON.stringify({ title: "Admin Assistant", location: "Raffles Place", pay_rate: 14, category: "admin", slots: 2 }),
    ad_content: `💼 *ADMIN ASSISTANT - CBD*

2-week contract at Raffles Place

$14/hr | Mon-Fri 9am-6pm

Tasks:
• Data entry
• Filing
• Basic admin

AC office, friendly team! ❄️`,
    variables: JSON.stringify({ tone: "professional", emoji_count: 2, length: "medium", cta_style: "direct" }),
    response_rate: 0.048, is_winner: 1, quality_score: 0.79
  },
  {
    job_details: JSON.stringify({ title: "Data Entry Clerk", location: "Jurong East", pay_rate: 12, category: "admin", slots: 5 }),
    ad_content: `⌨️ *DATA ENTRY CLERKS*

Work from Jurong East office

$12/hr | Flexible timing
Basic computer skills required

5 positions. Start next week!`,
    variables: JSON.stringify({ tone: "straightforward", emoji_count: 1, length: "short", cta_style: "factual" }),
    response_rate: 0.041, is_winner: 0, quality_score: 0.73
  },
  {
    job_details: JSON.stringify({ title: "Reception Temp", location: "Marina One", pay_rate: 15, category: "admin", slots: 1 }),
    ad_content: `🏢 *RECEPTIONIST - MARINA ONE*

Cover for 1 week

$15/hr | Professional setting
Good English & presentation required

Prestigious MNC office! ✨`,
    variables: JSON.stringify({ tone: "professional", emoji_count: 2, length: "short", cta_style: "prestige" }),
    response_rate: 0.039, is_winner: 0, quality_score: 0.71
  },

  // Kitchen/Food Prep
  {
    job_details: JSON.stringify({ title: "Kitchen Helper", location: "East Coast", pay_rate: 12, category: "fnb", slots: 3 }),
    ad_content: `🍳 *KITCHEN HELPER*

Busy restaurant at East Coast

$12/hr | Various shifts
Food prep, dishwashing, cleaning

No experience OK! 💪`,
    variables: JSON.stringify({ tone: "casual", emoji_count: 2, length: "short", cta_style: "direct" }),
    response_rate: 0.046, is_winner: 0, quality_score: 0.75
  },
  {
    job_details: JSON.stringify({ title: "Sushi Prep", location: "Suntec City", pay_rate: 13, category: "fnb", slots: 2 }),
    ad_content: `🍣 *SUSHI PREP ASSISTANT*

Japanese restaurant at Suntec

$13/hr + staff meal
Learn sushi-making skills!

Interested in Japanese cuisine?
Apply now! 🇯🇵`,
    variables: JSON.stringify({ tone: "appealing", emoji_count: 3, length: "short", cta_style: "skill" }),
    response_rate: 0.058, is_winner: 1, quality_score: 0.83
  },

  // Cleaning/Housekeeping
  {
    job_details: JSON.stringify({ title: "Hotel Housekeeping", location: "Orchard", pay_rate: 12, category: "cleaning", slots: 6 }),
    ad_content: `🛏️ *HOTEL HOUSEKEEPING*

5-star hotel at Orchard

$12/hr | Morning shifts
Room cleaning & turndown service

Training provided. 6 positions.`,
    variables: JSON.stringify({ tone: "professional", emoji_count: 1, length: "short", cta_style: "factual" }),
    response_rate: 0.043, is_winner: 0, quality_score: 0.74
  },
  {
    job_details: JSON.stringify({ title: "Office Cleaner", location: "CBD", pay_rate: 11, category: "cleaning", slots: 4 }),
    ad_content: `🧹 *OFFICE CLEANERS*

CBD area | Evening shifts

$11/hr | 6pm-10pm
Simple cleaning duties

4 slots. Start immediately!`,
    variables: JSON.stringify({ tone: "minimal", emoji_count: 1, length: "short", cta_style: "urgent" }),
    response_rate: 0.037, is_winner: 0, quality_score: 0.69
  },

  // Security
  {
    job_details: JSON.stringify({ title: "Event Security", location: "Various", pay_rate: 14, category: "security", slots: 10 }),
    ad_content: `🔒 *EVENT SECURITY OFFICERS*

Various events island-wide

$14/hr | Licensed preferred
Will consider unlicensed (training provided)

10 positions available 💼`,
    variables: JSON.stringify({ tone: "authoritative", emoji_count: 2, length: "short", cta_style: "direct" }),
    response_rate: 0.051, is_winner: 1, quality_score: 0.8
  },

  // Unique/Specialty Jobs
  {
    job_details: JSON.stringify({ title: "Mascot Performer", location: "Various Malls", pay_rate: 15, category: "events", slots: 2 }),
    ad_content: `🎭 *MASCOT PERFORMERS WANTED*

Fun job alert!

$15/hr | Weekends
Entertain kids at mall events

Must be energetic & love kids! 💕
Height: 160-175cm`,
    variables: JSON.stringify({ tone: "fun", emoji_count: 3, length: "short", cta_style: "appeal" }),
    response_rate: 0.063, is_winner: 1, quality_score: 0.85
  },
  {
    job_details: JSON.stringify({ title: "Survey Interviewer", location: "MRT Stations", pay_rate: 13, category: "survey", slots: 8 }),
    ad_content: `📊 *SURVEY INTERVIEWERS*

Market research project

$13/hr | Flexible hours
Conduct short surveys at MRT stations

Good communication skills needed.
8 positions! 🗣️`,
    variables: JSON.stringify({ tone: "professional", emoji_count: 2, length: "short", cta_style: "direct" }),
    response_rate: 0.047, is_winner: 0, quality_score: 0.76
  },
  {
    job_details: JSON.stringify({ title: "Photography Assistant", location: "Studio", pay_rate: 14, category: "creative", slots: 1 }),
    ad_content: `📸 *PHOTOGRAPHY ASSISTANT*

Help at professional studio

$14/hr | Weekends
Learn from pro photographers!

Interest in photography?
This is your chance! ✨`,
    variables: JSON.stringify({ tone: "inspiring", emoji_count: 2, length: "short", cta_style: "opportunity" }),
    response_rate: 0.069, is_winner: 1, quality_score: 0.87
  }
];

// Insert training data
const insertTraining = db.prepare(`
  INSERT INTO ad_training_data
  (job_details, ad_content, variables, response_rate, is_winner, quality_score)
  VALUES (?, ?, ?, ?, ?, ?)
`);

adTrainingData.forEach(ad => {
  insertTraining.run(
    ad.job_details,
    ad.ad_content,
    ad.variables,
    ad.response_rate,
    ad.is_winner,
    ad.quality_score
  );
});

console.log(`Inserted ${adTrainingData.length} training data entries`);

// Insert variable scores with diverse data
console.log('Seeding variable scores...');

const variableScores = [
  // Tone variations
  { name: 'tone', value: 'friendly', win: 29, lose: 8, tests: 37, responses: 204, rate: 0.08, confidence: 0.85 },
  { name: 'tone', value: 'casual', win: 18, lose: 14, tests: 32, responses: 89, rate: 0.07, confidence: 0.72 },
  { name: 'tone', value: 'professional', win: 15, lose: 12, tests: 27, responses: 72, rate: 0.065, confidence: 0.68 },
  { name: 'tone', value: 'excited', win: 12, lose: 6, tests: 18, responses: 67, rate: 0.09, confidence: 0.78 },
  { name: 'tone', value: 'minimal', win: 6, lose: 18, tests: 24, responses: 34, rate: 0.05, confidence: 0.55 },
  { name: 'tone', value: 'urgent', win: 10, lose: 8, tests: 18, responses: 52, rate: 0.08, confidence: 0.7 },

  // Emoji count
  { name: 'emoji_count', value: '3', win: 24, lose: 6, tests: 30, responses: 134, rate: 0.08, confidence: 0.84 },
  { name: 'emoji_count', value: '4', win: 21, lose: 8, tests: 29, responses: 116, rate: 0.09, confidence: 0.82 },
  { name: 'emoji_count', value: '2', win: 14, lose: 12, tests: 26, responses: 78, rate: 0.07, confidence: 0.68 },
  { name: 'emoji_count', value: '1', win: 8, lose: 16, tests: 24, responses: 45, rate: 0.05, confidence: 0.58 },
  { name: 'emoji_count', value: '5', win: 10, lose: 14, tests: 24, responses: 56, rate: 0.08, confidence: 0.62 },
  { name: 'emoji_count', value: '0', win: 4, lose: 22, tests: 26, responses: 23, rate: 0.04, confidence: 0.45 },

  // Length
  { name: 'length', value: 'short', win: 26, lose: 7, tests: 33, responses: 145, rate: 0.08, confidence: 0.82 },
  { name: 'length', value: 'medium', win: 20, lose: 10, tests: 30, responses: 112, rate: 0.07, confidence: 0.76 },
  { name: 'length', value: 'long', win: 8, lose: 19, tests: 27, responses: 45, rate: 0.06, confidence: 0.55 },

  // CTA style
  { name: 'cta_style', value: 'urgent', win: 22, lose: 6, tests: 28, responses: 128, rate: 0.09, confidence: 0.85 },
  { name: 'cta_style', value: 'direct', win: 20, lose: 9, tests: 29, responses: 108, rate: 0.07, confidence: 0.78 },
  { name: 'cta_style', value: 'question', win: 15, lose: 12, tests: 27, responses: 76, rate: 0.07, confidence: 0.68 },
  { name: 'cta_style', value: 'benefit', win: 14, lose: 8, tests: 22, responses: 68, rate: 0.08, confidence: 0.74 },
  { name: 'cta_style', value: 'scarcity', win: 12, lose: 6, tests: 18, responses: 65, rate: 0.09, confidence: 0.78 },
  { name: 'cta_style', value: 'fomo', win: 10, lose: 4, tests: 14, responses: 48, rate: 0.1, confidence: 0.82 },

  // Pay emphasis
  { name: 'pay_emphasis', value: 'prominent', win: 18, lose: 7, tests: 25, responses: 98, rate: 0.09, confidence: 0.8 },
  { name: 'pay_emphasis', value: 'normal', win: 14, lose: 10, tests: 24, responses: 72, rate: 0.07, confidence: 0.7 },
  { name: 'pay_emphasis', value: 'subtle', win: 7, lose: 15, tests: 22, responses: 38, rate: 0.06, confidence: 0.55 },

  // Format
  { name: 'format', value: 'bullets', win: 18, lose: 8, tests: 26, responses: 95, rate: 0.08, confidence: 0.78 },
  { name: 'format', value: 'paragraph', win: 10, lose: 14, tests: 24, responses: 54, rate: 0.07, confidence: 0.62 },
  { name: 'format', value: 'hybrid', win: 15, lose: 9, tests: 24, responses: 81, rate: 0.08, confidence: 0.74 }
];

const insertVariable = db.prepare(`
  INSERT INTO ad_variable_scores
  (variable_name, variable_value, win_count, lose_count, total_tests, total_responses, avg_response_rate, confidence)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

variableScores.forEach(v => {
  insertVariable.run(v.name, v.value, v.win, v.lose, v.tests, v.responses, v.rate, v.confidence);
});

console.log(`Inserted ${variableScores.length} variable scores`);

// Insert timing scores
console.log('Seeding timing scores...');

const timingScores = [];
// Generate realistic timing data (certain hours/days perform better)
for (let day = 0; day < 7; day++) {
  for (let hour = 8; hour <= 22; hour++) {
    // Peak performance: weekday evenings (6-9pm), weekend afternoons
    let baseScore = 0.5;

    // Weekday evening boost (Mon-Fri, 6-9pm)
    if (day >= 1 && day <= 5 && hour >= 18 && hour <= 21) {
      baseScore = 0.75 + Math.random() * 0.15;
    }
    // Weekend afternoon boost
    else if ((day === 0 || day === 6) && hour >= 12 && hour <= 17) {
      baseScore = 0.7 + Math.random() * 0.15;
    }
    // Lunch time boost
    else if (hour >= 12 && hour <= 13) {
      baseScore = 0.65 + Math.random() * 0.1;
    }
    // Morning commute
    else if (hour >= 8 && hour <= 9) {
      baseScore = 0.6 + Math.random() * 0.1;
    }
    // Late night penalty
    else if (hour >= 21) {
      baseScore = 0.4 + Math.random() * 0.1;
    }
    else {
      baseScore = 0.5 + Math.random() * 0.15;
    }

    const postCount = Math.floor(20 + Math.random() * 80);
    const responseRate = baseScore * 0.1;
    const totalResponses = Math.floor(postCount * responseRate);

    timingScores.push({
      hour,
      day_of_week: day,
      post_count: postCount,
      total_responses: totalResponses,
      avg_response_rate: parseFloat(responseRate.toFixed(3)),
      score: parseFloat(baseScore.toFixed(2))
    });
  }
}

const insertTiming = db.prepare(`
  INSERT INTO ad_timing_scores
  (hour, day_of_week, post_count, total_responses, avg_response_rate, score)
  VALUES (?, ?, ?, ?, ?, ?)
`);

timingScores.forEach(t => {
  insertTiming.run(t.hour, t.day_of_week, t.post_count, t.total_responses, t.avg_response_rate, t.score);
});

console.log(`Inserted ${timingScores.length} timing scores`);

// Create sample ad variants for existing jobs
console.log('Creating sample ad variants...');

const jobs = db.prepare(`SELECT id, title, location, pay_rate FROM jobs LIMIT 5`).all();

if (jobs.length > 0) {
  const insertVariant = db.prepare(`
    INSERT INTO ad_variants (job_id, variant_key, content, variables, source)
    VALUES (?, ?, ?, ?, 'seed')
  `);

  jobs.forEach((job, idx) => {
    // Variant A - Friendly/emoji-heavy
    insertVariant.run(
      job.id,
      'A',
      `🔥 *${job.title.toUpperCase()}!*\n\n📍 ${job.location}\n💰 $${job.pay_rate}/hr\n\nApply now! 🚀`,
      JSON.stringify({ tone: 'friendly', emoji_count: 4, length: 'short' })
    );

    // Variant B - Professional/minimal
    insertVariant.run(
      job.id,
      'B',
      `*${job.title}*\n\nLocation: ${job.location}\nRate: $${job.pay_rate} per hour\n\nInterested candidates please apply.`,
      JSON.stringify({ tone: 'professional', emoji_count: 0, length: 'medium' })
    );
  });

  console.log(`Created variants for ${jobs.length} jobs`);

  // Add performance data for variants
  const variants = db.prepare(`SELECT id, job_id FROM ad_variants`).all();
  const insertPerf = db.prepare(`
    INSERT INTO ad_performance
    (variant_id, job_id, telegram_group_id, posted_at, impressions, clicks, applications)
    VALUES (?, ?, 1, datetime('now', ?), ?, ?, ?)
  `);

  variants.forEach((v, idx) => {
    // Create historical performance data
    for (let i = 0; i < 3; i++) {
      const dayOffset = `-${(i + 1) * 2} days`;
      const impressions = Math.floor(50 + Math.random() * 150);
      const clicks = Math.floor(impressions * (0.05 + Math.random() * 0.1));
      const applications = Math.floor(clicks * (0.1 + Math.random() * 0.2));

      insertPerf.run(v.id, v.job_id, dayOffset, impressions, clicks, applications);
    }
  });

  console.log('Added performance history for variants');
}

console.log('\n✅ Ad optimization data seeded successfully!');
console.log('Summary:');
console.log(`  - Training data: ${adTrainingData.length} entries`);
console.log(`  - Variable scores: ${variableScores.length} entries`);
console.log(`  - Timing scores: ${timingScores.length} entries`);
console.log(`  - Ad variants: ${jobs.length * 2} entries`);
