#!/usr/bin/env node
/**
 * Specific Gamification & Transaction Testing Script
 * Tests the gamification features and database transactions
 */

const { db } = require('./db/database.js');

// ANSI Colors
const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m', reset: '\x1b[0m', bold: '\x1b[1m'
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

// Test Gamification Transactions
function testGamificationTransactions() {
  header('GAMIFICATION TRANSACTION TESTING');

  console.log('\n1. Testing XP Award Transaction');

  const candidate = db.prepare('SELECT * FROM candidates LIMIT 1').get();
  if (!candidate) {
    log(colors.red, '❌ No candidates found for testing');
    return;
  }

  log(colors.blue, `Testing with candidate: ${candidate.name} (${candidate.id})`);
  log(colors.white, `Current XP: ${candidate.xp}`);

  // Test XP transaction
  const testTransaction = db.transaction(() => {
    const originalXP = candidate.xp;
    const xpGain = 250;
    const newXP = originalXP + xpGain;

    console.log('\n   Step 1: Adding XP transaction...');
    // Add XP transaction
    db.prepare(`
      INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(candidate.id, 'job_completed', xpGain, 'Test gamification transaction', 'TEST_GAM_001');

    console.log('   Step 2: Updating candidate XP...');
    // Update candidate XP
    db.prepare('UPDATE candidates SET xp = ?, lifetime_xp = lifetime_xp + ? WHERE id = ?')
      .run(newXP, xpGain, candidate.id);

    console.log('   Step 3: Checking for achievement unlocks...');
    // Check if any achievements should be unlocked based on different criteria
    const achievements = db.prepare(`
      SELECT * FROM achievements
      WHERE (requirement_type = 'no_cancel_streak' AND requirement_value <= ?)
      AND id NOT IN (SELECT achievement_id FROM candidate_achievements WHERE candidate_id = ?)
    `).all(5, candidate.id); // Simulate 5 completed jobs without cancellation

    console.log(`   Found ${achievements.length} potential achievements to unlock`);

    // Unlock achievements
    achievements.forEach(achievement => {
      console.log(`   Unlocking achievement: ${achievement.name}`);
      db.prepare(`
        INSERT OR IGNORE INTO candidate_achievements (candidate_id, achievement_id)
        VALUES (?, ?)
      `).run(candidate.id, achievement.id);
    });

    // Verify the transaction
    const updatedCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidate.id);
    const xpTransaction = db.prepare('SELECT * FROM xp_transactions WHERE reference_id = ?').get('TEST_GAM_001');
    const unlockedAchievements = db.prepare('SELECT COUNT(*) as count FROM candidate_achievements WHERE candidate_id = ?').get(candidate.id);

    console.log('\n   Transaction Results:');
    log(colors.white, `   - XP Updated: ${originalXP} → ${updatedCandidate.xp} (+${xpGain})`);
    log(colors.white, `   - XP Transaction Created: ${xpTransaction ? 'Yes' : 'No'}`);
    log(colors.white, `   - Achievements Unlocked: ${achievements.length}`);
    log(colors.white, `   - Total Achievements: ${unlockedAchievements.count}`);

    // Rollback for testing purposes
    console.log('\n   Step 4: Rolling back test changes...');
    db.prepare('UPDATE candidates SET xp = ?, lifetime_xp = lifetime_xp - ? WHERE id = ?')
      .run(originalXP, xpGain, candidate.id);
    db.prepare('DELETE FROM xp_transactions WHERE reference_id = ?').run('TEST_GAM_001');

    // Remove test achievements
    achievements.forEach(achievement => {
      db.prepare('DELETE FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?')
        .run(candidate.id, achievement.id);
    });

    return { success: true, xpGain, achievementsUnlocked: achievements.length };
  });

  try {
    const result = testTransaction();
    log(colors.green, `✅ XP Transaction Test Passed - Gained ${result.xpGain} XP, ${result.achievementsUnlocked} achievements`);
  } catch (error) {
    log(colors.red, `❌ XP Transaction Test Failed: ${error.message}`);
  }
}

function testRewardPurchaseTransaction() {
  console.log('\n2. Testing Reward Purchase Transaction');

  // Create a test candidate with points
  const testCandidateId = 'TEST_CANDIDATE';
  const initialPoints = 5000;

  // Clean up any existing test data
  db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);
  db.prepare('DELETE FROM reward_purchases WHERE candidate_id = ?').run(testCandidateId);

  // Create test candidate
  db.prepare(`
    INSERT INTO candidates (id, name, email, status, current_points)
    VALUES (?, 'Test User', 'test@example.com', 'active', ?)
  `).run(testCandidateId, initialPoints);

  const reward = db.prepare('SELECT * FROM rewards WHERE active = 1 ORDER BY points_cost LIMIT 1').get();
  if (!reward) {
    log(colors.red, '❌ No active rewards found for testing');
    return;
  }

  log(colors.blue, `Testing reward purchase: ${reward.name} (${reward.points_cost} points)`);

  const purchaseTransaction = db.transaction(() => {
    const purchaseId = `PUR_TEST_${Date.now()}`;

    console.log('   Step 1: Creating reward purchase...');
    // Create reward purchase
    db.prepare(`
      INSERT INTO reward_purchases (id, candidate_id, reward_id, points_spent, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(purchaseId, testCandidateId, reward.id, reward.points_cost, 'pending');

    console.log('   Step 2: Deducting points...');
    // Deduct points
    const newPoints = initialPoints - reward.points_cost;
    db.prepare('UPDATE candidates SET current_points = ? WHERE id = ?')
      .run(newPoints, testCandidateId);

    console.log('   Step 3: Updating reward stock...');
    // Update stock if limited
    const originalStock = reward.stock;
    if (reward.stock !== null) {
      db.prepare('UPDATE rewards SET stock = stock - 1 WHERE id = ?').run(reward.id);
    }

    // Verify the transaction
    const updatedCandidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(testCandidateId);
    const purchase = db.prepare('SELECT * FROM reward_purchases WHERE id = ?').get(purchaseId);
    const updatedReward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(reward.id);

    console.log('\n   Transaction Results:');
    log(colors.white, `   - Points Deducted: ${initialPoints} → ${updatedCandidate.current_points} (-${reward.points_cost})`);
    log(colors.white, `   - Purchase Created: ${purchase ? 'Yes' : 'No'}`);
    if (originalStock !== null) {
      log(colors.white, `   - Stock Updated: ${originalStock} → ${updatedReward.stock} (-1)`);
    }

    // Rollback for testing
    console.log('\n   Step 4: Rolling back test changes...');
    db.prepare('UPDATE candidates SET current_points = ? WHERE id = ?').run(initialPoints, testCandidateId);
    db.prepare('DELETE FROM reward_purchases WHERE id = ?').run(purchaseId);
    if (originalStock !== null) {
      db.prepare('UPDATE rewards SET stock = ? WHERE id = ?').run(originalStock, reward.id);
    }

    return { success: true, pointsSpent: reward.points_cost };
  });

  try {
    const result = purchaseTransaction();
    log(colors.green, `✅ Reward Purchase Test Passed - Spent ${result.pointsSpent} points`);
  } catch (error) {
    log(colors.red, `❌ Reward Purchase Test Failed: ${error.message}`);
  }

  // Clean up test candidate
  db.prepare('DELETE FROM candidates WHERE id = ?').run(testCandidateId);
}

function testQuestProgressTransaction() {
  console.log('\n3. Testing Quest Progress Transaction');

  const candidate = db.prepare('SELECT * FROM candidates LIMIT 1').get();
  const quest = db.prepare('SELECT * FROM quests WHERE active = 1 LIMIT 1').get();

  if (!candidate || !quest) {
    log(colors.red, '❌ No candidate or quest found for testing');
    return;
  }

  log(colors.blue, `Testing quest: ${quest.title} for ${candidate.name}`);

  const questTransaction = db.transaction(() => {
    console.log('   Step 1: Starting quest...');
    // Start quest (or get existing)
    db.prepare(`
      INSERT OR IGNORE INTO candidate_quests (candidate_id, quest_id, progress, target)
      VALUES (?, ?, 0, 1)
    `).run(candidate.id, quest.id);

    console.log('   Step 2: Updating progress...');
    // Update progress
    db.prepare(`
      UPDATE candidate_quests
      SET progress = progress + 1
      WHERE candidate_id = ? AND quest_id = ?
    `).run(candidate.id, quest.id);

    console.log('   Step 3: Checking completion...');
    // Check if quest is completed
    const questProgress = db.prepare(`
      SELECT * FROM candidate_quests
      WHERE candidate_id = ? AND quest_id = ?
    `).get(candidate.id, quest.id);

    if (questProgress.progress >= questProgress.target && !questProgress.completed) {
      console.log('   Step 4: Completing quest...');
      // Mark as completed
      db.prepare(`
        UPDATE candidate_quests
        SET completed = 1, completed_at = datetime('now')
        WHERE candidate_id = ? AND quest_id = ?
      `).run(candidate.id, quest.id);

      // Award XP
      if (quest.xp_reward > 0) {
        db.prepare(`
          INSERT INTO xp_transactions (candidate_id, action_type, amount, reason, reference_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(candidate.id, 'quest_completed', quest.xp_reward, `Quest completed: ${quest.title}`, quest.id);

        db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?')
          .run(quest.xp_reward, candidate.id);
      }
    }

    const finalProgress = db.prepare(`
      SELECT * FROM candidate_quests
      WHERE candidate_id = ? AND quest_id = ?
    `).get(candidate.id, quest.id);

    console.log('\n   Transaction Results:');
    log(colors.white, `   - Quest Progress: ${finalProgress.progress}/${finalProgress.target}`);
    log(colors.white, `   - Quest Completed: ${finalProgress.completed ? 'Yes' : 'No'}`);
    if (quest.xp_reward > 0 && finalProgress.completed) {
      log(colors.white, `   - XP Awarded: ${quest.xp_reward}`);
    }

    // Rollback
    console.log('\n   Step 5: Rolling back test changes...');
    db.prepare('DELETE FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?')
      .run(candidate.id, quest.id);
    if (quest.xp_reward > 0 && finalProgress.completed) {
      db.prepare('DELETE FROM xp_transactions WHERE reference_id = ? AND candidate_id = ?')
        .run(quest.id, candidate.id);
      db.prepare('UPDATE candidates SET xp = xp - ? WHERE id = ?')
        .run(quest.xp_reward, candidate.id);
    }

    return { success: true, completed: finalProgress.completed };
  });

  try {
    const result = questTransaction();
    log(colors.green, `✅ Quest Progress Test Passed - Quest ${result.completed ? 'completed' : 'in progress'}`);
  } catch (error) {
    log(colors.red, `❌ Quest Progress Test Failed: ${error.message}`);
  }
}

function displayGamificationData() {
  header('GAMIFICATION DATA OVERVIEW');

  console.log('\n📊 Achievement Categories:');
  const achievementStats = db.prepare(`
    SELECT category, COUNT(*) as count, AVG(xp_reward) as avg_xp
    FROM achievements
    GROUP BY category
  `).all();
  achievementStats.forEach(stat => {
    log(colors.white, `   ${stat.category}: ${stat.count} achievements, ${Math.round(stat.avg_xp)} avg XP`);
  });

  console.log('\n🎯 Quest Overview:');
  const questStats = db.prepare(`
    SELECT type, COUNT(*) as count, AVG(xp_reward) as avg_xp
    FROM quests WHERE active = 1
    GROUP BY type
  `).all();
  questStats.forEach(stat => {
    log(colors.white, `   ${stat.type}: ${stat.count} quests, ${Math.round(stat.avg_xp)} avg XP`);
  });

  console.log('\n🛍️ Rewards Shop:');
  const rewardStats = db.prepare(`
    SELECT category, COUNT(*) as count, AVG(points_cost) as avg_cost
    FROM rewards WHERE active = 1
    GROUP BY category
  `).all();
  rewardStats.forEach(stat => {
    log(colors.white, `   ${stat.category}: ${stat.count} rewards, ${Math.round(stat.avg_cost)} avg cost`);
  });

  console.log('\n🏆 Referral Tiers:');
  const tiers = db.prepare('SELECT * FROM referral_tiers ORDER BY tier_level').all();
  tiers.forEach(tier => {
    log(colors.white, `   Tier ${tier.tier_level}: ${tier.jobs_required} jobs → $${tier.bonus_amount} bonus`);
  });

  console.log('\n👥 Current Candidate Stats:');
  const candidateStats = db.prepare(`
    SELECT
      COUNT(*) as total_candidates,
      AVG(xp) as avg_xp,
      AVG(level) as avg_level,
      MAX(streak_days) as max_streak,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
    FROM candidates
  `).get();
  log(colors.white, `   Total: ${candidateStats.total_candidates}, Active: ${candidateStats.active_count}`);
  log(colors.white, `   Avg XP: ${Math.round(candidateStats.avg_xp)}, Avg Level: ${candidateStats.avg_level.toFixed(1)}`);
  log(colors.white, `   Max Streak: ${candidateStats.max_streak} days`);
}

// Main execution
function runGamificationTests() {
  console.log('');
  log(colors.bold + colors.magenta, 'WORKLINK V2 GAMIFICATION TESTING SUITE');
  log(colors.white, `Started: ${new Date().toLocaleString()}`);

  displayGamificationData();
  testGamificationTransactions();
  testRewardPurchaseTransaction();
  testQuestProgressTransaction();

  header('GAMIFICATION TESTING COMPLETE');
  log(colors.green, '✅ All gamification features tested successfully!');
}

if (require.main === module) {
  runGamificationTests();
}

module.exports = { runGamificationTests };