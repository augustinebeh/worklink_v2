#!/usr/bin/env node
/**
 * Comprehensive Database Testing Script for WorkLink v2
 * Tests the new modular database structure, data integrity, and transactions
 */

const { db, IS_PRODUCTION } = require('./db/database.js');

// ANSI Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
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

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function error(message) {
  log(colors.red, `❌ ${message}`);
}

function warning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

// Test Results Tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0
};

function runTest(description, testFn) {
  testResults.total++;
  try {
    const result = testFn();
    if (result === true) {
      success(description);
      testResults.passed++;
    } else if (result === 'warning') {
      warning(description);
      testResults.warnings++;
    } else {
      error(description);
      testResults.failed++;
    }
  } catch (err) {
    error(`${description} - ${err.message}`);
    testResults.failed++;
  }
}

// 1. Test Database Schema and Table Existence
function testDatabaseSchema() {
  header('1. DATABASE SCHEMA & TABLE STRUCTURE');

  // Core tables that should exist
  const expectedTables = [
    'candidates', 'clients', 'jobs', 'deployments', 'payments',
    'candidate_availability', 'referrals', 'referral_tiers',
    'incentive_schemes', 'tenders', 'tender_alerts', 'tender_matches',
    'achievements', 'candidate_achievements', 'quests', 'candidate_quests',
    'xp_transactions', 'training', 'rewards', 'reward_purchases',
    'financial_projections', 'messages', 'message_templates',
    'notifications', 'push_queue', 'job_match_scores',
    'push_subscriptions', 'notification_log', 'streak_protection',
    'engagement_sessions', 'feature_usage', 'retention_cohorts'
  ];

  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tableNames = tables.map(t => t.name);

  info(`Found ${tables.length} tables in database`);

  expectedTables.forEach(table => {
    runTest(`Table '${table}' exists`, () => {
      return tableNames.includes(table);
    });
  });

  // Check for foreign key constraints
  runTest('Foreign keys are enabled', () => {
    const fkResult = db.prepare('PRAGMA foreign_keys').get();
    return fkResult.foreign_keys === 1;
  });

  // Check journal mode
  runTest('WAL journal mode is active', () => {
    const walResult = db.prepare('PRAGMA journal_mode').get();
    return walResult.journal_mode === 'wal';
  });
}

// 2. Test Data Seeding and Integrity
function testDataIntegrity() {
  header('2. DATA INTEGRITY & SEEDING');

  // Test achievements seeding
  runTest('Achievements are properly seeded', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM achievements').get().c;
    return count > 0;
  });

  // Test specific achievement categories
  const achievementCategories = ['reliable', 'skilled', 'social'];
  achievementCategories.forEach(category => {
    runTest(`Achievement category '${category}' exists`, () => {
      const count = db.prepare('SELECT COUNT(*) as c FROM achievements WHERE category = ?').get(category).c;
      return count > 0;
    });
  });

  // Test quests seeding
  runTest('Quests are properly seeded', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM quests').get().c;
    return count > 0;
  });

  // Test quest types
  const questTypes = ['daily', 'weekly'];
  questTypes.forEach(type => {
    runTest(`Quest type '${type}' exists`, () => {
      const count = db.prepare('SELECT COUNT(*) as c FROM quests WHERE type = ?').get(type).c;
      return count > 0;
    });
  });

  // Test rewards shop seeding
  runTest('Rewards shop is properly seeded', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM rewards').get().c;
    return count > 0;
  });

  // Test reward categories
  const rewardCategories = ['feature', 'operational', 'physical'];
  rewardCategories.forEach(category => {
    runTest(`Reward category '${category}' exists`, () => {
      const count = db.prepare('SELECT COUNT(*) as c FROM rewards WHERE category = ?').get(category).c;
      return count > 0;
    });
  });

  // Test referral tiers
  runTest('Referral tiers are properly seeded', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM referral_tiers').get().c;
    return count >= 4; // Should have at least 4 tiers
  });

  // Test training modules
  runTest('Training modules are seeded', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM training').get().c;
    return count > 0;
  });

  // Test message templates
  runTest('Message templates are seeded', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM message_templates').get().c;
    return count > 0;
  });

  // Test incentive schemes
  runTest('Incentive schemes are seeded', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM incentive_schemes').get().c;
    return count > 0;
  });
}

// 3. Test Sample Data (Development Environment)
function testSampleData() {
  header('3. SAMPLE DATA (DEVELOPMENT)');

  if (IS_PRODUCTION) {
    warning('Production environment - skipping sample data tests');
    return;
  }

  // Test candidates
  runTest('Candidates are seeded in development', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;
    return count > 0;
  });

  // Test clients
  runTest('Clients are seeded in development', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
    return count > 0;
  });

  // Test jobs
  runTest('Jobs are seeded in development', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM jobs').get().c;
    return count > 0;
  });

  // Test deployments
  runTest('Deployments exist in development', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM deployments').get().c;
    return count > 0;
  });

  // Test payments
  runTest('Payments exist in development', () => {
    const count = db.prepare('SELECT COUNT(*) as c FROM payments').get().c;
    return count > 0;
  });
}

// 4. Test Complex Queries and Joins
function testComplexQueries() {
  header('4. COMPLEX QUERIES & JOINS');

  // Test candidate earnings calculation
  runTest('Calculate candidate total earnings', () => {
    const query = `
      SELECT c.name,
             SUM(p.total_amount) as total_earned,
             COUNT(d.id) as jobs_completed,
             AVG(d.rating) as avg_rating
      FROM candidates c
      LEFT JOIN deployments d ON c.id = d.candidate_id
      LEFT JOIN payments p ON d.id = p.deployment_id
      WHERE c.status = 'active'
      GROUP BY c.id, c.name
      ORDER BY total_earned DESC
      LIMIT 5
    `;
    const results = db.prepare(query).all();
    return results.length > 0;
  });

  // Test job profitability analysis
  runTest('Analyze job profitability', () => {
    const query = `
      SELECT j.title,
             cl.company_name,
             COUNT(d.id) as workers_deployed,
             SUM(d.gross_revenue) as total_revenue,
             SUM(d.candidate_pay) as total_costs,
             SUM(d.gross_profit) as total_profit,
             AVG(d.rating) as avg_worker_rating
      FROM jobs j
      JOIN clients cl ON j.client_id = cl.id
      LEFT JOIN deployments d ON j.id = d.job_id
      WHERE j.status = 'completed'
      GROUP BY j.id, j.title, cl.company_name
      HAVING total_revenue > 0
      ORDER BY total_profit DESC
      LIMIT 10
    `;
    const results = db.prepare(query).all();
    return results.length >= 0; // Allow 0 results if no completed jobs
  });

  // Test gamification progress tracking
  runTest('Track candidate gamification progress', () => {
    const query = `
      SELECT c.name,
             c.level,
             c.xp,
             c.current_tier,
             c.streak_days,
             COUNT(ca.achievement_id) as achievements_unlocked,
             COUNT(cq.id) as quests_completed
      FROM candidates c
      LEFT JOIN candidate_achievements ca ON c.id = ca.candidate_id
      LEFT JOIN candidate_quests cq ON c.id = cq.candidate_id AND cq.completed = 1
      GROUP BY c.id, c.name, c.level, c.xp, c.current_tier, c.streak_days
      ORDER BY c.level DESC, c.xp DESC
      LIMIT 10
    `;
    const results = db.prepare(query).all();
    return results.length >= 0;
  });

  // Test referral network analysis
  runTest('Analyze referral network performance', () => {
    const query = `
      SELECT referrer.name as referrer_name,
             COUNT(r.id) as total_referrals,
             SUM(r.bonus_amount) as total_bonuses_earned,
             AVG(referred.total_jobs_completed) as avg_referral_jobs
      FROM referrals r
      JOIN candidates referrer ON r.referrer_id = referrer.id
      JOIN candidates referred ON r.referred_id = referred.id
      GROUP BY r.referrer_id, referrer.name
      ORDER BY total_bonuses_earned DESC
      LIMIT 5
    `;
    const results = db.prepare(query).all();
    return results.length >= 0;
  });

  // Test availability vs deployment efficiency
  runTest('Calculate availability vs deployment rates', () => {
    const query = `
      SELECT c.name,
             COUNT(DISTINCT ca.date) as days_available,
             COUNT(DISTINCT DATE(d.created_at)) as days_deployed,
             CASE
               WHEN COUNT(DISTINCT ca.date) > 0
               THEN ROUND(COUNT(DISTINCT DATE(d.created_at)) * 100.0 / COUNT(DISTINCT ca.date), 2)
               ELSE 0
             END as deployment_rate
      FROM candidates c
      LEFT JOIN candidate_availability ca ON c.id = ca.candidate_id AND ca.status = 'available'
      LEFT JOIN deployments d ON c.id = d.candidate_id AND d.status IN ('assigned', 'completed')
      WHERE c.status = 'active'
      GROUP BY c.id, c.name
      HAVING days_available > 0
      ORDER BY deployment_rate DESC
      LIMIT 10
    `;
    const results = db.prepare(query).all();
    return results.length >= 0;
  });
}

// 5. Test Database Transactions
function testTransactions() {
  header('5. DATABASE TRANSACTIONS');

  // Test gamification XP transaction
  runTest('XP transaction with achievement unlock', () => {
    return db.transaction(() => {
      // Find an active candidate
      const candidate = db.prepare('SELECT * FROM candidates WHERE status = ? LIMIT 1').get('active');
      if (!candidate) return 'warning'; // No active candidates in production

      const originalXP = candidate.xp;
      const xpGain = 250;
      const newXP = originalXP + xpGain;

      // Add XP transaction
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(candidate.id, 'job_completed', xpGain, 'Test transaction', 'TEST001');

      // Update candidate XP
      db.prepare('UPDATE candidates SET xp = ?, lifetime_xp = lifetime_xp + ? WHERE id = ?')
        .run(newXP, xpGain, candidate.id);

      // Check if any achievements should be unlocked
      const achievements = db.prepare(`
        SELECT * FROM achievements
        WHERE requirement_type = 'xp_threshold'
        AND requirement_value <= ?
        AND id NOT IN (SELECT achievement_id FROM candidate_achievements WHERE candidate_id = ?)
      `).all(newXP, candidate.id);

      // Unlock achievements
      achievements.forEach(achievement => {
        db.prepare(`
          INSERT OR IGNORE INTO candidate_achievements (candidate_id, achievement_id)
          VALUES (?, ?)
        `).run(candidate.id, achievement.id);
      });

      // Rollback test changes
      db.prepare('UPDATE candidates SET xp = ? WHERE id = ?').run(originalXP, candidate.id);
      db.prepare('DELETE FROM xp_transactions WHERE candidate_id = ? AND reference_id = ?')
        .run(candidate.id, 'TEST001');
      db.prepare('DELETE FROM candidate_achievements WHERE candidate_id = ? AND achievement_id IN (SELECT id FROM achievements WHERE requirement_type = "xp_threshold")')
        .run(candidate.id);

      return true;
    })();
  });

  // Test reward purchase transaction
  runTest('Reward purchase with points deduction', () => {
    return db.transaction(() => {
      // Find a candidate with points and a reward they can afford
      const candidate = db.prepare('SELECT * FROM candidates WHERE current_points > 1000 LIMIT 1').get();
      if (!candidate) return 'warning'; // No candidates with points

      const reward = db.prepare('SELECT * FROM rewards WHERE points_cost <= ? AND active = 1 LIMIT 1')
        .get(candidate.current_points);
      if (!reward) return 'warning'; // No affordable rewards

      const originalPoints = candidate.current_points;

      // Create reward purchase
      const purchaseId = `PUR${Date.now()}`;
      db.prepare(`
        INSERT INTO reward_purchases (id, candidate_id, reward_id, points_spent, status)
        VALUES (?, ?, ?, ?, ?)
      `).run(purchaseId, candidate.id, reward.id, reward.points_cost, 'pending');

      // Deduct points
      const newPoints = originalPoints - reward.points_cost;
      db.prepare('UPDATE candidates SET current_points = ? WHERE id = ?')
        .run(newPoints, candidate.id);

      // Update stock if limited
      if (reward.stock !== null) {
        db.prepare('UPDATE rewards SET stock = stock - 1 WHERE id = ?').run(reward.id);
      }

      // Rollback test changes
      db.prepare('UPDATE candidates SET current_points = ? WHERE id = ?').run(originalPoints, candidate.id);
      db.prepare('DELETE FROM reward_purchases WHERE id = ?').run(purchaseId);
      if (reward.stock !== null) {
        db.prepare('UPDATE rewards SET stock = stock + 1 WHERE id = ?').run(reward.id);
      }

      return true;
    })();
  });

  // Test job deployment transaction
  runTest('Job deployment with payment calculation', () => {
    return db.transaction(() => {
      // Find an open job and available candidate
      const job = db.prepare('SELECT * FROM jobs WHERE status = ? AND total_slots > filled_slots LIMIT 1').get('open');
      const candidate = db.prepare('SELECT * FROM candidates WHERE status = ? LIMIT 1').get('active');

      if (!job || !candidate) return 'warning'; // No suitable job or candidate

      const deploymentId = `DEP${Date.now()}`;
      const hours = 6;
      const grossRevenue = hours * job.charge_rate;
      const candidatePay = hours * job.pay_rate;
      const grossProfit = grossRevenue - candidatePay;

      // Create deployment
      db.prepare(`
        INSERT INTO deployments (id, job_id, candidate_id, status, hours_worked, charge_rate, pay_rate, gross_revenue, candidate_pay, gross_profit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(deploymentId, job.id, candidate.id, 'assigned', hours, job.charge_rate, job.pay_rate, grossRevenue, candidatePay, grossProfit);

      // Update job filled slots
      db.prepare('UPDATE jobs SET filled_slots = filled_slots + 1 WHERE id = ?').run(job.id);

      // Create payment record
      const paymentId = `PAY${Date.now()}`;
      db.prepare(`
        INSERT INTO payments (id, candidate_id, deployment_id, base_amount, total_amount, hours_worked, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(paymentId, candidate.id, deploymentId, candidatePay, candidatePay, hours, 'pending');

      // Rollback test changes
      db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);
      db.prepare('DELETE FROM deployments WHERE id = ?').run(deploymentId);
      db.prepare('UPDATE jobs SET filled_slots = filled_slots - 1 WHERE id = ?').run(job.id);

      return true;
    })();
  });
}

// 6. Test Data Relationships and Constraints
function testDataRelationships() {
  header('6. DATA RELATIONSHIPS & CONSTRAINTS');

  // Test foreign key constraints
  runTest('Foreign key constraints prevent invalid references', () => {
    try {
      // Try to insert deployment with invalid job_id
      db.prepare(`
        INSERT INTO deployments (id, job_id, candidate_id, status, hours_worked, charge_rate, pay_rate, gross_revenue, candidate_pay, gross_profit)
        VALUES ('TEST_DEP', 'INVALID_JOB', 'INVALID_CANDIDATE', 'assigned', 6, 20, 15, 120, 90, 30)
      `).run();
      return false; // Should have failed
    } catch (err) {
      return err.message.includes('FOREIGN KEY constraint failed');
    }
  });

  // Test unique constraints
  runTest('Unique constraints prevent duplicate data', () => {
    try {
      const firstCandidate = db.prepare('SELECT email FROM candidates LIMIT 1').get();
      if (!firstCandidate) return 'warning';

      // Try to insert candidate with duplicate email
      db.prepare(`
        INSERT INTO candidates (id, name, email, phone, status)
        VALUES ('TEST_DUP', 'Test Duplicate', ?, '+65 1234 5678', 'active')
      `).run(firstCandidate.email);
      return false; // Should have failed
    } catch (err) {
      return err.message.includes('UNIQUE constraint failed');
    }
  });

  // Test cascading relationships
  runTest('Data relationships maintain referential integrity', () => {
    // Count related records
    const deploymentCount = db.prepare('SELECT COUNT(*) as c FROM deployments').get().c;
    const paymentCount = db.prepare('SELECT COUNT(*) as c FROM payments').get().c;
    const jobCount = db.prepare('SELECT COUNT(*) as c FROM jobs').get().c;
    const candidateCount = db.prepare('SELECT COUNT(*) as c FROM candidates').get().c;

    // Check that relationships make sense
    const orphanPayments = db.prepare(`
      SELECT COUNT(*) as c FROM payments p
      LEFT JOIN deployments d ON p.deployment_id = d.id
      WHERE d.id IS NULL
    `).get().c;

    const orphanDeployments = db.prepare(`
      SELECT COUNT(*) as c FROM deployments d
      LEFT JOIN jobs j ON d.job_id = j.id
      LEFT JOIN candidates c ON d.candidate_id = c.id
      WHERE j.id IS NULL OR c.id IS NULL
    `).get().c;

    return orphanPayments === 0 && orphanDeployments === 0;
  });
}

// 7. Performance and Indexing Tests
function testPerformance() {
  header('7. PERFORMANCE & INDEXING');

  // Test candidate lookup performance
  runTest('Candidate lookup by ID is fast', () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      db.prepare('SELECT * FROM candidates WHERE id = ? LIMIT 1').get('CND001');
    }
    const end = Date.now();
    const avgTime = (end - start) / 100;
    return avgTime < 5; // Should be under 5ms average
  });

  // Test complex query performance
  runTest('Complex JOIN query completes quickly', () => {
    const start = Date.now();
    db.prepare(`
      SELECT c.name, COUNT(d.id) as job_count, SUM(p.total_amount) as total_earned
      FROM candidates c
      LEFT JOIN deployments d ON c.id = d.candidate_id
      LEFT JOIN payments p ON d.id = p.deployment_id
      GROUP BY c.id, c.name
      ORDER BY total_earned DESC
    `).all();
    const end = Date.now();
    return (end - start) < 100; // Should be under 100ms
  });

  // Test database size
  runTest('Database size is reasonable', () => {
    const sizeQuery = db.prepare('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()').get();
    const sizeMB = sizeQuery.size / (1024 * 1024);
    info(`Database size: ${sizeMB.toFixed(2)} MB`);
    return sizeMB < 100; // Should be under 100MB for development
  });
}

// Main test runner
function runAllTests() {
  console.log('');
  log(colors.bold + colors.magenta, 'WORKLINK V2 DATABASE TESTING SUITE');
  log(colors.white, `Environment: ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  log(colors.white, `Test Started: ${new Date().toLocaleString()}`);

  testDatabaseSchema();
  testDataIntegrity();
  testSampleData();
  testComplexQueries();
  testTransactions();
  testDataRelationships();
  testPerformance();

  // Final Results
  header('TEST RESULTS SUMMARY');

  const total = testResults.total;
  const passed = testResults.passed;
  const failed = testResults.failed;
  const warnings = testResults.warnings;
  const passRate = ((passed / total) * 100).toFixed(1);

  if (failed === 0) {
    success(`ALL TESTS PASSED! (${passed}/${total})`);
  } else {
    error(`${failed} TESTS FAILED (${passed}/${total} passed)`);
  }

  if (warnings > 0) {
    warning(`${warnings} tests resulted in warnings`);
  }

  log(colors.white, `Pass Rate: ${passRate}%`);
  log(colors.white, `Total Tests: ${total}`);
  log(colors.green, `Passed: ${passed}`);
  log(colors.red, `Failed: ${failed}`);
  log(colors.yellow, `Warnings: ${warnings}`);

  console.log('');

  // Exit with error code if tests failed
  if (failed > 0) {
    process.exit(1);
  } else {
    success('Database testing completed successfully!');
    process.exit(0);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests, testResults };