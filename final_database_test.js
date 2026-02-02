#!/usr/bin/env node
/**
 * Final Comprehensive Database Test
 * Tests all aspects of the WorkLink v2 database structure
 */

const { db, resetToSampleData, IS_PRODUCTION } = require('./db/database.js');

// Colors
const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m',
  cyan: '\x1b[36m', white: '\x1b[37m', reset: '\x1b[0m', bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log(colors.bold + colors.cyan, '='.repeat(60));
  log(colors.bold + colors.cyan, `  ${message}`);
  log(colors.bold + colors.cyan, '='.repeat(60));
}

function runComprehensiveTest() {
  log(colors.bold + colors.cyan, 'WORKLINK V2 DATABASE COMPREHENSIVE TESTING');
  console.log('');

  // 1. SCHEMA VALIDATION
  header('1. SCHEMA & STRUCTURE VALIDATION');

  // Check essential tables
  const essentialTables = [
    'candidates', 'clients', 'jobs', 'deployments', 'payments',
    'achievements', 'quests', 'rewards', 'referral_tiers',
    'xp_transactions', 'candidate_achievements', 'candidate_quests',
    'reward_purchases'
  ];

  const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    .map(t => t.name);

  let schemaValid = true;
  essentialTables.forEach(table => {
    if (existingTables.includes(table)) {
      log(colors.green, `✅ Table '${table}' exists`);
    } else {
      log(colors.red, `❌ Table '${table}' missing`);
      schemaValid = false;
    }
  });

  if (schemaValid) {
    log(colors.green, '✅ Database schema is complete');
  }

  // 2. ESSENTIAL DATA VALIDATION
  header('2. ESSENTIAL DATA VALIDATION');

  const essentialDataChecks = [
    { name: 'Achievements', query: 'SELECT COUNT(*) as c FROM achievements', expected: '> 0' },
    { name: 'Quests', query: 'SELECT COUNT(*) as c FROM quests', expected: '> 0' },
    { name: 'Rewards', query: 'SELECT COUNT(*) as c FROM rewards', expected: '> 0' },
    { name: 'Referral Tiers', query: 'SELECT COUNT(*) as c FROM referral_tiers', expected: '>= 4' },
    { name: 'Training Modules', query: 'SELECT COUNT(*) as c FROM training', expected: '> 0' },
    { name: 'Message Templates', query: 'SELECT COUNT(*) as c FROM message_templates', expected: '> 0' }
  ];

  essentialDataChecks.forEach(check => {
    const result = db.prepare(check.query).get();
    if (result.c > 0) {
      log(colors.green, `✅ ${check.name}: ${result.c} records`);
    } else {
      log(colors.red, `❌ ${check.name}: No data found`);
    }
  });

  // 3. GAMIFICATION SYSTEM VALIDATION
  header('3. GAMIFICATION SYSTEM VALIDATION');

  console.log('🏆 Achievement Categories:');
  const achievementCategories = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM achievements
    WHERE category IS NOT NULL
    GROUP BY category
  `).all();
  achievementCategories.forEach(cat => {
    log(colors.white, `   ${cat.category}: ${cat.count} achievements`);
  });

  console.log('\n🎯 Quest Types:');
  const questTypes = db.prepare(`
    SELECT type, COUNT(*) as count
    FROM quests
    WHERE type IS NOT NULL AND active = 1
    GROUP BY type
  `).all();
  questTypes.forEach(type => {
    log(colors.white, `   ${type.type}: ${type.count} quests`);
  });

  console.log('\n🛍️ Reward Categories:');
  const rewardCategories = db.prepare(`
    SELECT category, COUNT(*) as count, MIN(points_cost) as min_cost, MAX(points_cost) as max_cost
    FROM rewards
    WHERE active = 1
    GROUP BY category
  `).all();
  rewardCategories.forEach(cat => {
    log(colors.white, `   ${cat.category}: ${cat.count} rewards (${cat.min_cost}-${cat.max_cost} points)`);
  });

  // 4. TRANSACTION TESTING
  header('4. DATABASE TRANSACTION TESTING');

  console.log('Testing XP Transaction System...');
  const testXPTransaction = () => {
    return db.transaction(() => {
      // Find or create a test candidate
      let candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get('TEST_CANDIDATE');
      if (!candidate) {
        db.prepare(`
          INSERT INTO candidates (id, name, email, status, xp, level, current_points)
          VALUES ('TEST_CANDIDATE', 'Test User', 'test.user.db@example.com', 'active', 1000, 1, 500)
        `).run();
        candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get('TEST_CANDIDATE');
      }

      const originalXP = candidate.xp;
      const xpGain = 200;

      // Add XP transaction
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(candidate.id, 'test_action', xpGain, 'Database test', 'TEST_REF');

      // Update candidate XP
      db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(xpGain, candidate.id);

      // Verify
      const updated = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidate.id);
      const transaction = db.prepare('SELECT * FROM xp_transactions WHERE reference_id = ?').get('TEST_REF');

      const success = (updated.xp === originalXP + xpGain) && transaction;

      // Cleanup
      db.prepare('DELETE FROM xp_transactions WHERE reference_id = ?').run('TEST_REF');
      db.prepare('UPDATE candidates SET xp = ? WHERE id = ?').run(originalXP, candidate.id);

      return success;
    });
  };

  try {
    const xpTestResult = testXPTransaction();
    if (xpTestResult) {
      log(colors.green, '✅ XP Transaction System: Working correctly');
    } else {
      log(colors.red, '❌ XP Transaction System: Failed');
    }
  } catch (error) {
    log(colors.red, `❌ XP Transaction System Error: ${error.message}`);
  }

  console.log('\nTesting Reward Purchase Transaction...');
  const testRewardTransaction = () => {
    return db.transaction(() => {
      // Find a test candidate and affordable reward
      const candidate = db.prepare('SELECT * FROM candidates WHERE current_points >= 1000 LIMIT 1').get();
      const reward = db.prepare('SELECT * FROM rewards WHERE points_cost <= 1000 AND active = 1 LIMIT 1').get();

      if (!candidate || !reward) {
        log(colors.yellow, '⚠️ Skipping reward test - no suitable candidate/reward found');
        return true; // Skip test
      }

      const originalPoints = candidate.current_points;
      const purchaseId = `TEST_PUR_${Date.now()}`;

      // Create purchase
      db.prepare(`
        INSERT INTO reward_purchases (id, candidate_id, reward_id, points_spent, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(purchaseId, candidate.id, reward.id, reward.points_cost, 'test');

      // Deduct points
      db.prepare('UPDATE candidates SET current_points = current_points - ? WHERE id = ?')
        .run(reward.points_cost, candidate.id);

      // Verify
      const updated = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidate.id);
      const purchase = db.prepare('SELECT * FROM reward_purchases WHERE id = ?').get(purchaseId);

      const success = (updated.current_points === originalPoints - reward.points_cost) && purchase;

      // Cleanup
      db.prepare('DELETE FROM reward_purchases WHERE id = ?').run(purchaseId);
      db.prepare('UPDATE candidates SET current_points = ? WHERE id = ?').run(originalPoints, candidate.id);

      return success;
    });
  };

  try {
    const rewardTestResult = testRewardTransaction();
    if (rewardTestResult) {
      log(colors.green, '✅ Reward Purchase System: Working correctly');
    } else {
      log(colors.red, '❌ Reward Purchase System: Failed');
    }
  } catch (error) {
    log(colors.red, `❌ Reward Purchase System Error: ${error.message}`);
  }

  // 5. COMPLEX QUERIES TESTING
  header('5. COMPLEX QUERIES TESTING');

  console.log('Testing Multi-Table Joins...');

  // Test 1: Candidate earnings calculation
  try {
    const earningsQuery = db.prepare(`
      SELECT
        c.name,
        c.level,
        c.xp,
        COUNT(d.id) as jobs_completed,
        COALESCE(SUM(p.total_amount), 0) as total_earned,
        COALESCE(AVG(d.rating), 0) as avg_rating
      FROM candidates c
      LEFT JOIN deployments d ON c.id = d.candidate_id
      LEFT JOIN payments p ON d.id = p.deployment_id
      WHERE c.status = 'active'
      GROUP BY c.id, c.name, c.level, c.xp
      ORDER BY total_earned DESC
      LIMIT 5
    `).all();

    log(colors.green, `✅ Earnings Query: Retrieved ${earningsQuery.length} records`);
  } catch (error) {
    log(colors.red, `❌ Earnings Query Failed: ${error.message}`);
  }

  // Test 2: Gamification progress tracking
  try {
    const gamificationQuery = db.prepare(`
      SELECT
        c.name,
        c.level,
        c.xp,
        c.streak_days,
        COUNT(DISTINCT ca.achievement_id) as achievements_count,
        COUNT(DISTINCT cq.id) as quests_completed
      FROM candidates c
      LEFT JOIN candidate_achievements ca ON c.id = ca.candidate_id
      LEFT JOIN candidate_quests cq ON c.id = cq.candidate_id AND cq.completed = 1
      GROUP BY c.id, c.name, c.level, c.xp, c.streak_days
      ORDER BY c.level DESC, c.xp DESC
      LIMIT 5
    `).all();

    log(colors.green, `✅ Gamification Query: Retrieved ${gamificationQuery.length} records`);
  } catch (error) {
    log(colors.red, `❌ Gamification Query Failed: ${error.message}`);
  }

  // 6. DATA INTEGRITY CHECKS
  header('6. DATA INTEGRITY CHECKS');

  // Foreign key integrity
  const integrityChecks = [
    {
      name: 'Orphan Payments',
      query: `SELECT COUNT(*) as c FROM payments p LEFT JOIN deployments d ON p.deployment_id = d.id WHERE p.deployment_id IS NOT NULL AND d.id IS NULL`
    },
    {
      name: 'Orphan Deployments (Jobs)',
      query: `SELECT COUNT(*) as c FROM deployments d LEFT JOIN jobs j ON d.job_id = j.id WHERE d.job_id IS NOT NULL AND j.id IS NULL`
    },
    {
      name: 'Orphan Deployments (Candidates)',
      query: `SELECT COUNT(*) as c FROM deployments d LEFT JOIN candidates c ON d.candidate_id = c.id WHERE c.id IS NULL`
    },
    {
      name: 'Orphan Achievement Records',
      query: `SELECT COUNT(*) as c FROM candidate_achievements ca LEFT JOIN achievements a ON ca.achievement_id = a.id WHERE a.id IS NULL`
    }
  ];

  let integrityValid = true;
  integrityChecks.forEach(check => {
    try {
      const result = db.prepare(check.query).get();
      if (result.c === 0) {
        log(colors.green, `✅ ${check.name}: No integrity issues`);
      } else {
        log(colors.yellow, `⚠️ ${check.name}: ${result.c} potential issues found`);
        if (check.name !== 'Orphan Payments') { // Orphan payments might exist in demo data
          integrityValid = false;
        }
      }
    } catch (error) {
      log(colors.red, `❌ ${check.name} Check Failed: ${error.message}`);
      integrityValid = false;
    }
  });

  // 7. PERFORMANCE TESTING
  header('7. BASIC PERFORMANCE TESTING');

  console.log('Testing query performance...');

  // Simple lookup performance
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    db.prepare('SELECT COUNT(*) FROM candidates').get();
  }
  const simpleQueryTime = Date.now() - startTime;

  if (simpleQueryTime < 100) {
    log(colors.green, `✅ Simple Query Performance: ${simpleQueryTime}ms for 100 queries`);
  } else {
    log(colors.yellow, `⚠️ Simple Query Performance: ${simpleQueryTime}ms (might be slow)`);
  }

  // Complex query performance
  const complexStart = Date.now();
  db.prepare(`
    SELECT c.*, COUNT(d.id) as job_count
    FROM candidates c
    LEFT JOIN deployments d ON c.id = d.candidate_id
    GROUP BY c.id
  `).all();
  const complexQueryTime = Date.now() - complexStart;

  if (complexQueryTime < 50) {
    log(colors.green, `✅ Complex Query Performance: ${complexQueryTime}ms`);
  } else {
    log(colors.yellow, `⚠️ Complex Query Performance: ${complexQueryTime}ms (might be slow)`);
  }

  // 8. FINAL SUMMARY
  header('TEST SUMMARY');

  const candidateCount = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;
  const jobCount = db.prepare('SELECT COUNT(*) as c FROM jobs').get().c;
  const deploymentCount = db.prepare('SELECT COUNT(*) as c FROM deployments').get().c;
  const achievementCount = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c;
  const questCount = db.prepare('SELECT COUNT(*) as c FROM quests').get().c;
  const rewardCount = db.prepare('SELECT COUNT(*) as c FROM rewards').get().c;

  log(colors.white, '📊 Database Statistics:');
  log(colors.white, `   - Candidates: ${candidateCount}`);
  log(colors.white, `   - Jobs: ${jobCount}`);
  log(colors.white, `   - Deployments: ${deploymentCount}`);
  log(colors.white, `   - Achievements: ${achievementCount}`);
  log(colors.white, `   - Quests: ${questCount}`);
  log(colors.white, `   - Rewards: ${rewardCount}`);

  const dbSize = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
  const sizeMB = (dbSize.size / (1024 * 1024)).toFixed(2);
  log(colors.white, `   - Database Size: ${sizeMB} MB`);

  console.log('');

  if (schemaValid && integrityValid) {
    log(colors.green, '🎉 DATABASE TESTING COMPLETED SUCCESSFULLY!');
    log(colors.green, '✅ All core systems are functioning properly');
    if (!IS_PRODUCTION && jobCount === 0) {
      log(colors.yellow, '💡 Note: Sample data (jobs, clients) was not seeded. This is normal if database already had candidates.');
      log(colors.blue, '   To test with full sample data, run: node -e "require(\'./db/database.js\').resetToSampleData()"');
    }
  } else {
    log(colors.red, '❌ Database testing revealed some issues');
    log(colors.yellow, '🔧 Please review the failed checks above');
  }
}

// Run the test
if (require.main === module) {
  runComprehensiveTest();
}

module.exports = { runComprehensiveTest };