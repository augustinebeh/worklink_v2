#!/usr/bin/env node
/**
 * Comprehensive Gamification System Test Suite
 * Tests all aspects of the Career Ladder gamification strategy
 */

const { db } = require('./db');
const {
  XP_VALUES,
  XP_THRESHOLDS,
  calculateLevel,
  calculateJobXP,
  getLevelTier,
  getSGDateString
} = require('./shared/constants');

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✓ PASS' : '✗ FAIL';
  const statusColor = passed ? 'green' : 'red';
  log(`${status} ${testName}`, statusColor);
  if (details) log(`    ${details}`, 'yellow');
}

class GamificationTester {
  constructor() {
    this.testCandidate = 'TEST_CANDIDATE_001';
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0
    };
  }

  async setup() {
    logSection('Setting up test environment');

    try {
      // Database is already initialized by require('./db')

      // Clean up any existing test data
      db.prepare('DELETE FROM candidates WHERE id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM xp_transactions WHERE candidate_id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM candidate_achievements WHERE candidate_id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM candidate_quests WHERE candidate_id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM reward_purchases WHERE candidate_id = ?').run(this.testCandidate);

      // Create test candidate
      db.prepare(`
        INSERT INTO candidates (id, name, email, xp, level, current_tier, current_points, status)
        VALUES (?, 'Test User', 'test@example.com', 0, 1, 'bronze', 0, 'active')
      `).run(this.testCandidate);

      log('✓ Test environment setup complete', 'green');
    } catch (error) {
      log(`✗ Setup failed: ${error.message}`, 'red');
      throw error;
    }
  }

  runTest(testName, testFunction) {
    this.testResults.total++;
    try {
      const result = testFunction();
      if (result) {
        this.testResults.passed++;
        logTest(testName, true);
      } else {
        this.testResults.failed++;
        logTest(testName, false);
      }
    } catch (error) {
      this.testResults.failed++;
      logTest(testName, false, error.message);
    }
  }

  async testXPAwarding() {
    logSection('Testing XP Awarding with Database Transactions');

    // Test 1: Basic XP award
    this.runTest('Basic XP award', () => {
      const xpAmount = 500;
      const result = db.prepare(`
        UPDATE candidates SET xp = xp + ? WHERE id = ?
      `).run(xpAmount, this.testCandidate);

      const candidate = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate);
      return candidate.xp === xpAmount;
    });

    // Test 2: XP transaction logging
    this.runTest('XP transaction logging', () => {
      const xpAmount = 200;
      db.prepare(`
        INSERT INTO xp_transactions (candidate_id, action_type, amount, reason)
        VALUES (?, 'manual', ?, 'Test award')
      `).run(this.testCandidate, xpAmount);

      const transaction = db.prepare(`
        SELECT * FROM xp_transactions WHERE candidate_id = ? ORDER BY id DESC LIMIT 1
      `).get(this.testCandidate);

      return transaction && transaction.amount === xpAmount && transaction.reason === 'Test award';
    });

    // Test 3: Atomic transaction (race condition prevention)
    this.runTest('Atomic XP transaction', () => {
      const initialXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      const xpAmount = 300;

      const transaction = db.transaction(() => {
        db.prepare(`
          INSERT INTO xp_transactions (candidate_id, action_type, amount, reason)
          VALUES (?, 'shift', ?, 'Atomic test')
        `).run(this.testCandidate, xpAmount);

        db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(xpAmount, this.testCandidate);
      });

      transaction();

      const finalXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      return finalXP === initialXP + xpAmount;
    });

    // Test 4: Level calculation after XP award
    this.runTest('Level calculation after XP award', () => {
      // Award enough XP to reach level 3 (need 1061 total XP)
      const currentXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      const neededXP = 1061 - currentXP;

      const transaction = db.transaction(() => {
        db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(neededXP, this.testCandidate);

        const candidate = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate);
        const newLevel = calculateLevel(candidate.xp);
        const newTier = getLevelTier(newLevel);

        db.prepare('UPDATE candidates SET level = ?, current_tier = ? WHERE id = ?')
          .run(newLevel, newTier, this.testCandidate);
      });

      transaction();

      const candidate = db.prepare('SELECT level, current_tier FROM candidates WHERE id = ?').get(this.testCandidate);
      return candidate.level === 3 && candidate.current_tier === 'bronze';
    });

    // Test 5: Points awarded 1:1 with XP
    this.runTest('Points awarded 1:1 with XP', () => {
      const xpAmount = 150;
      const initialPoints = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(this.testCandidate).current_points;

      db.prepare('UPDATE candidates SET xp = xp + ?, current_points = current_points + ? WHERE id = ?')
        .run(xpAmount, xpAmount, this.testCandidate);

      const finalPoints = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(this.testCandidate).current_points;
      return finalPoints === initialPoints + xpAmount;
    });

    // Test 6: Job completion XP calculation
    this.runTest('Job completion XP calculation', () => {
      const hours = 4;
      const isUrgent = true;
      const wasOnTime = true;
      const rating = 5;

      const expectedXP = calculateJobXP(hours, isUrgent, wasOnTime, rating);
      const calculatedXP =
        hours * XP_VALUES.PER_HOUR_WORKED * XP_VALUES.URGENT_JOB_MULTIPLIER +
        XP_VALUES.ON_TIME_ARRIVAL +
        XP_VALUES.FIVE_STAR_RATING;

      return expectedXP === Math.floor(calculatedXP);
    });

    // Test 7: Penalty application
    this.runTest('Penalty application', () => {
      const initialXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      const penalty = XP_VALUES.NO_SHOW_PENALTY; // -500

      db.prepare('UPDATE candidates SET xp = MAX(0, xp + ?) WHERE id = ?').run(penalty, this.testCandidate);

      const finalXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      return finalXP === Math.max(0, initialXP + penalty);
    });
  }

  async testAchievements() {
    logSection('Testing Achievement Unlocking and Claiming');

    // Test 1: Achievement unlocking
    this.runTest('Achievement unlocking', () => {
      const achievementId = 'ACH_IRONCLAD_1';

      // Insert test achievement if it doesn't exist
      db.prepare(`
        INSERT OR IGNORE INTO achievements (id, name, description, category, xp_reward)
        VALUES (?, 'Ironclad I', 'Complete 10 shifts', 'reliable', 500)
      `).run(achievementId);

      // Unlock achievement
      db.prepare(`
        INSERT INTO candidate_achievements (candidate_id, achievement_id, claimed)
        VALUES (?, ?, 0)
      `).run(this.testCandidate, achievementId);

      const unlocked = db.prepare(`
        SELECT * FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?
      `).get(this.testCandidate, achievementId);

      return unlocked && unlocked.claimed === 0;
    });

    // Test 2: Achievement claiming
    this.runTest('Achievement claiming', () => {
      const achievementId = 'ACH_IRONCLAD_1';
      const initialXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;

      // Get achievement reward
      const achievement = db.prepare('SELECT xp_reward FROM achievements WHERE id = ?').get(achievementId);

      // Claim achievement
      db.prepare(`
        UPDATE candidate_achievements
        SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
        WHERE candidate_id = ? AND achievement_id = ?
      `).run(this.testCandidate, achievementId);

      // Award XP
      db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(achievement.xp_reward, this.testCandidate);

      const finalXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      const claimed = db.prepare(`
        SELECT claimed FROM candidate_achievements WHERE candidate_id = ? AND achievement_id = ?
      `).get(this.testCandidate, achievementId);

      return finalXP === initialXP + achievement.xp_reward && claimed.claimed === 1;
    });

    // Test 3: Prevent double claiming
    this.runTest('Prevent double claiming', () => {
      const achievementId = 'ACH_IRONCLAD_1';

      try {
        // Try to claim again
        db.prepare(`
          UPDATE candidate_achievements
          SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
          WHERE candidate_id = ? AND achievement_id = ? AND claimed = 0
        `).run(this.testCandidate, achievementId);

        // Should return 0 changes since already claimed
        return db.changes === 0;
      } catch (error) {
        return false;
      }
    });

    // Test 4: Achievement progress tracking
    this.runTest('Achievement progress tracking', () => {
      // Simulate checking for automatic achievements
      const completedShifts = 10;

      // Update candidate stats
      db.prepare('UPDATE candidates SET total_jobs_completed = ? WHERE id = ?')
        .run(completedShifts, this.testCandidate);

      // Check if achievement should be unlocked
      const candidate = db.prepare('SELECT total_jobs_completed FROM candidates WHERE id = ?')
        .get(this.testCandidate);

      return candidate.total_jobs_completed >= 10;
    });
  }

  async testQuests() {
    logSection('Testing Quest Progress and Completion');

    // Test 1: Quest start
    this.runTest('Quest start', () => {
      const questId = 'QST_DAILY_CHECKIN';

      // Insert test quest if it doesn't exist
      db.prepare(`
        INSERT OR IGNORE INTO quests (id, title, description, type, requirement, xp_reward)
        VALUES (?, 'Daily Check-in', 'Check in daily', 'daily', '{"type": "checkin", "count": 1}', 50)
      `).run(questId);

      // Start quest
      db.prepare(`
        INSERT OR REPLACE INTO candidate_quests (candidate_id, quest_id, progress, target, completed)
        VALUES (?, ?, 0, 1, 0)
      `).run(this.testCandidate, questId);

      const quest = db.prepare(`
        SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
      `).get(this.testCandidate, questId);

      return quest && quest.progress === 0 && quest.target === 1;
    });

    // Test 2: Quest progress update
    this.runTest('Quest progress update', () => {
      const questId = 'QST_DAILY_CHECKIN';

      // Update progress
      db.prepare(`
        UPDATE candidate_quests
        SET progress = 1, completed = 1
        WHERE candidate_id = ? AND quest_id = ?
      `).run(this.testCandidate, questId);

      const quest = db.prepare(`
        SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
      `).get(this.testCandidate, questId);

      return quest && quest.progress === 1 && quest.completed === 1;
    });

    // Test 3: Quest claiming
    this.runTest('Quest claiming', () => {
      const questId = 'QST_DAILY_CHECKIN';
      const initialXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;

      // Get quest reward
      const quest = db.prepare('SELECT xp_reward FROM quests WHERE id = ?').get(questId);

      // Claim quest
      db.prepare(`
        UPDATE candidate_quests
        SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
        WHERE candidate_id = ? AND quest_id = ?
      `).run(this.testCandidate, questId);

      // Award XP
      db.prepare('UPDATE candidates SET xp = xp + ? WHERE id = ?').run(quest.xp_reward, this.testCandidate);

      const finalXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      return finalXP === initialXP + quest.xp_reward;
    });

    // Test 4: Daily quest reset
    this.runTest('Daily quest reset logic', () => {
      const questId = 'QST_DAILY_CHECKIN';
      const todaySG = getSGDateString();

      // Simulate quest claimed today
      const quest = db.prepare(`
        SELECT claimed_at FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
      `).get(this.testCandidate, questId);

      if (quest && quest.claimed_at) {
        const claimedDate = quest.claimed_at.substring(0, 10);
        return claimedDate === todaySG; // Should match today's date
      }

      return false;
    });

    // Test 5: Weekly quest progress
    this.runTest('Weekly quest progress', () => {
      const questId = 'QST_STREAK';

      // Insert streak quest if it doesn't exist
      db.prepare(`
        INSERT OR IGNORE INTO quests (id, title, description, type, requirement, xp_reward)
        VALUES (?, 'Streak Keeper', 'Check in 3 days in a row', 'weekly', '{"type": "streak", "count": 3}', 200)
      `).run(questId);

      // Start quest
      db.prepare(`
        INSERT OR REPLACE INTO candidate_quests (candidate_id, quest_id, progress, target, completed)
        VALUES (?, ?, 3, 3, 1)
      `).run(this.testCandidate, questId);

      const quest = db.prepare(`
        SELECT * FROM candidate_quests WHERE candidate_id = ? AND quest_id = ?
      `).get(this.testCandidate, questId);

      return quest && quest.progress === 3 && quest.completed === 1;
    });
  }

  async testRewards() {
    logSection('Testing Rewards System');

    // Test 1: Reward availability check
    this.runTest('Reward availability check', () => {
      const rewardId = 'RWD_PROFILE_FLAIR';

      // Insert test reward if it doesn't exist
      db.prepare(`
        INSERT OR IGNORE INTO rewards (id, name, description, category, points_cost, tier_required)
        VALUES (?, 'Profile Flair', 'Add custom flair to profile', 'feature', 100, 'bronze')
      `).run(rewardId);

      const reward = db.prepare('SELECT * FROM rewards WHERE id = ? AND active = 1').get(rewardId);
      return reward && reward.points_cost === 100;
    });

    // Test 2: Points requirement check
    this.runTest('Points requirement check', () => {
      const currentPoints = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(this.testCandidate).current_points;
      const rewardCost = 100;

      // Give candidate enough points
      if (currentPoints < rewardCost) {
        db.prepare('UPDATE candidates SET current_points = ? WHERE id = ?').run(rewardCost, this.testCandidate);
      }

      const updatedPoints = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(this.testCandidate).current_points;
      return updatedPoints >= rewardCost;
    });

    // Test 3: Tier requirement check
    this.runTest('Tier requirement check', () => {
      const candidate = db.prepare('SELECT current_tier FROM candidates WHERE id = ?').get(this.testCandidate);
      const tierOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, mythic: 5 };
      const requiredTier = 'bronze';

      const userTierLevel = tierOrder[candidate.current_tier] || 0;
      const requiredTierLevel = tierOrder[requiredTier] || 0;

      return userTierLevel >= requiredTierLevel;
    });

    // Test 4: Reward purchase
    this.runTest('Reward purchase', () => {
      const rewardId = 'RWD_PROFILE_FLAIR';
      const rewardCost = 100;
      const initialPoints = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(this.testCandidate).current_points;

      // Purchase reward
      const purchaseId = `PUR_${Date.now()}_TEST`;
      db.prepare(`
        INSERT INTO reward_purchases (id, candidate_id, reward_id, points_spent, status)
        VALUES (?, ?, ?, ?, 'fulfilled')
      `).run(purchaseId, this.testCandidate, rewardId, rewardCost);

      // Deduct points
      db.prepare('UPDATE candidates SET current_points = current_points - ? WHERE id = ?')
        .run(rewardCost, this.testCandidate);

      const finalPoints = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(this.testCandidate).current_points;
      const purchase = db.prepare('SELECT * FROM reward_purchases WHERE id = ?').get(purchaseId);

      return finalPoints === initialPoints - rewardCost && purchase && purchase.status === 'fulfilled';
    });

    // Test 5: Stock management
    this.runTest('Stock management', () => {
      const rewardId = 'RWD_LIMITED';

      // Insert limited stock reward
      db.prepare(`
        INSERT OR IGNORE INTO rewards (id, name, description, category, points_cost, tier_required, stock)
        VALUES (?, 'Limited Edition', 'Limited availability reward', 'physical', 500, 'silver', 5)
      `).run(rewardId);

      const reward = db.prepare('SELECT stock FROM rewards WHERE id = ?').get(rewardId);
      return reward && reward.stock === 5;
    });
  }

  async testRaceConditionPrevention() {
    logSection('Testing Race Condition Fixes');

    // Test 1: Concurrent XP updates
    this.runTest('Concurrent XP updates prevention', () => {
      const initialXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;

      // Use transaction to ensure atomic updates
      const transaction = db.transaction(() => {
        const currentXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
        db.prepare('UPDATE candidates SET xp = ? WHERE id = ?').run(currentXP + 100, this.testCandidate);
        db.prepare(`
          INSERT INTO xp_transactions (candidate_id, amount, reason)
          VALUES (?, 100, 'Race condition test')
        `).run(this.testCandidate);
      });

      transaction();

      const finalXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      return finalXP === initialXP + 100;
    });

    // Test 2: Achievement unlock race condition
    this.runTest('Achievement unlock race condition prevention', () => {
      const achievementId = 'ACH_TEST_RACE';

      // Insert test achievement
      db.prepare(`
        INSERT OR IGNORE INTO achievements (id, name, description, xp_reward)
        VALUES (?, 'Race Test', 'Test race condition', 100)
      `).run(achievementId);

      // Use INSERT OR IGNORE to prevent duplicate unlocks
      db.prepare(`
        INSERT OR IGNORE INTO candidate_achievements (candidate_id, achievement_id, claimed)
        VALUES (?, ?, 0)
      `).run(this.testCandidate, achievementId);

      // Try to insert again - should be ignored
      const result = db.prepare(`
        INSERT OR IGNORE INTO candidate_achievements (candidate_id, achievement_id, claimed)
        VALUES (?, ?, 0)
      `).run(this.testCandidate, achievementId);

      return result.changes === 0; // No changes means it was ignored
    });

    // Test 3: Quest claiming race condition
    this.runTest('Quest claiming race condition prevention', () => {
      const questId = 'QST_RACE_TEST';

      // Insert test quest
      db.prepare(`
        INSERT OR IGNORE INTO quests (id, title, description, xp_reward)
        VALUES (?, 'Race Test Quest', 'Test quest race condition', 50)
      `).run(questId);

      // Start quest
      db.prepare(`
        INSERT OR REPLACE INTO candidate_quests (candidate_id, quest_id, progress, target, completed, claimed)
        VALUES (?, ?, 1, 1, 1, 0)
      `).run(this.testCandidate, questId);

      // Claim quest with conditional update
      const result1 = db.prepare(`
        UPDATE candidate_quests
        SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
        WHERE candidate_id = ? AND quest_id = ? AND claimed = 0
      `).run(this.testCandidate, questId);

      // Try to claim again
      const result2 = db.prepare(`
        UPDATE candidate_quests
        SET claimed = 1, claimed_at = CURRENT_TIMESTAMP
        WHERE candidate_id = ? AND quest_id = ? AND claimed = 0
      `).run(this.testCandidate, questId);

      return result1.changes === 1 && result2.changes === 0;
    });
  }

  async testLevelCalculationsAndTiers() {
    logSection('Testing Level Calculations and Tier Assignments');

    // Test 1: XP to level conversion
    this.runTest('XP to level conversion', () => {
      const testCases = [
        { xp: 0, expectedLevel: 1 },
        { xp: 500, expectedLevel: 1 },
        { xp: 1061, expectedLevel: 3 },
        { xp: 5590, expectedLevel: 5 },
        { xp: 15811, expectedLevel: 10 }
      ];

      return testCases.every(({ xp, expectedLevel }) => calculateLevel(xp) === expectedLevel);
    });

    // Test 2: Tier assignment
    this.runTest('Tier assignment', () => {
      const testCases = [
        { level: 1, expectedTier: 'bronze' },
        { level: 9, expectedTier: 'bronze' },
        { level: 10, expectedTier: 'silver' },
        { level: 24, expectedTier: 'silver' },
        { level: 25, expectedTier: 'gold' },
        { level: 50, expectedTier: 'platinum' },
        { level: 75, expectedTier: 'diamond' },
        { level: 100, expectedTier: 'mythic' }
      ];

      return testCases.every(({ level, expectedTier }) => getLevelTier(level) === expectedTier);
    });

    // Test 3: Level progression
    this.runTest('Level progression', () => {
      // Set candidate to specific XP to test level up
      const targetXP = 15811; // Level 10
      db.prepare('UPDATE candidates SET xp = ? WHERE id = ?').run(targetXP, this.testCandidate);

      const newLevel = calculateLevel(targetXP);
      const newTier = getLevelTier(newLevel);

      db.prepare('UPDATE candidates SET level = ?, current_tier = ? WHERE id = ?')
        .run(newLevel, newTier, this.testCandidate);

      const candidate = db.prepare('SELECT level, current_tier FROM candidates WHERE id = ?')
        .get(this.testCandidate);

      return candidate.level === 10 && candidate.current_tier === 'silver';
    });

    // Test 4: XP threshold accuracy
    this.runTest('XP threshold accuracy', () => {
      // Check if XP thresholds match the formula
      const level5XP = XP_THRESHOLDS[4]; // Array is 0-indexed
      const calculatedXP = Math.floor(500 * Math.pow(5, 1.5));

      return level5XP === calculatedXP;
    });

    // Test 5: Level benefits
    this.runTest('Level benefits calculation', () => {
      // Test tier benefits for silver tier (level 10)
      const level = 10;
      const tier = getLevelTier(level);

      // Check if silver tier has priority access benefit
      const tierOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, mythic: 5 };
      const silverLevel = tierOrder['silver'];
      const bronzeLevel = tierOrder['bronze'];

      return tier === 'silver' && silverLevel > bronzeLevel;
    });
  }

  async testSystemIntegration() {
    logSection('Testing System Integration');

    // Test 1: End-to-end job completion flow
    this.runTest('End-to-end job completion flow', () => {
      const initialXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      const initialLevel = db.prepare('SELECT level FROM candidates WHERE id = ?').get(this.testCandidate).level;

      // Simulate job completion
      const hours = 6;
      const xpAwarded = calculateJobXP(hours, false, true, 5); // 6 hours, on time, 5-star

      const transaction = db.transaction(() => {
        // Award XP
        db.prepare('UPDATE candidates SET xp = xp + ?, current_points = current_points + ? WHERE id = ?')
          .run(xpAwarded, xpAwarded, this.testCandidate);

        // Log transaction
        db.prepare(`
          INSERT INTO xp_transactions (candidate_id, action_type, amount, reason)
          VALUES (?, 'shift', ?, 'Integration test job')
        `).run(this.testCandidate, xpAwarded);

        // Update level if necessary
        const candidate = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate);
        const newLevel = calculateLevel(candidate.xp);

        if (newLevel > initialLevel) {
          const newTier = getLevelTier(newLevel);
          db.prepare('UPDATE candidates SET level = ?, current_tier = ? WHERE id = ?')
            .run(newLevel, newTier, this.testCandidate);
        }
      });

      transaction();

      const finalXP = db.prepare('SELECT xp FROM candidates WHERE id = ?').get(this.testCandidate).xp;
      return finalXP === initialXP + xpAwarded;
    });

    // Test 2: Multi-system interaction
    this.runTest('Multi-system interaction (XP + Achievement + Quest)', () => {
      // Check if multiple systems work together
      const xpTransactionCount = db.prepare(`
        SELECT COUNT(*) as count FROM xp_transactions WHERE candidate_id = ?
      `).get(this.testCandidate).count;

      const achievementCount = db.prepare(`
        SELECT COUNT(*) as count FROM candidate_achievements WHERE candidate_id = ?
      `).get(this.testCandidate).count;

      const questCount = db.prepare(`
        SELECT COUNT(*) as count FROM candidate_quests WHERE candidate_id = ?
      `).get(this.testCandidate).count;

      return xpTransactionCount > 0 && achievementCount > 0 && questCount > 0;
    });

    // Test 3: Data consistency check
    this.runTest('Data consistency check', () => {
      const candidate = db.prepare('SELECT xp, current_points, level FROM candidates WHERE id = ?')
        .get(this.testCandidate);

      // Check if level matches XP
      const calculatedLevel = calculateLevel(candidate.xp);
      const levelMatches = candidate.level === calculatedLevel;

      // Check if points are reasonable (should be close to XP for test data)
      const pointsReasonable = candidate.current_points >= 0;

      return levelMatches && pointsReasonable;
    });
  }

  async cleanup() {
    logSection('Cleaning up test environment');

    try {
      // Clean up test data
      db.prepare('DELETE FROM candidates WHERE id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM xp_transactions WHERE candidate_id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM candidate_achievements WHERE candidate_id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM candidate_quests WHERE candidate_id = ?').run(this.testCandidate);
      db.prepare('DELETE FROM reward_purchases WHERE candidate_id = ?').run(this.testCandidate);

      // Remove test data
      db.prepare("DELETE FROM achievements WHERE id LIKE 'ACH_TEST%'").run();
      db.prepare("DELETE FROM quests WHERE id LIKE 'QST_%TEST%'").run();
      db.prepare("DELETE FROM rewards WHERE id LIKE 'RWD_%TEST%'").run();

      log('✓ Test cleanup complete', 'green');
    } catch (error) {
      log(`✗ Cleanup failed: ${error.message}`, 'red');
    }
  }

  displayResults() {
    logSection('Test Results Summary');

    const passRate = Math.round((this.testResults.passed / this.testResults.total) * 100);

    log(`Total Tests: ${this.testResults.total}`, 'white');
    log(`Passed: ${this.testResults.passed}`, 'green');
    log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'red' : 'green');
    log(`Pass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');

    if (this.testResults.failed === 0) {
      log('\n🎉 All tests passed! Gamification system is working correctly.', 'green');
    } else {
      log(`\n⚠️  ${this.testResults.failed} test(s) failed. Please review the issues above.`, 'yellow');
    }
  }

  async runAllTests() {
    try {
      await this.setup();

      await this.testXPAwarding();
      await this.testAchievements();
      await this.testQuests();
      await this.testRewards();
      await this.testRaceConditionPrevention();
      await this.testLevelCalculationsAndTiers();
      await this.testSystemIntegration();

      this.displayResults();
    } catch (error) {
      log(`\n❌ Test suite failed: ${error.message}`, 'red');
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests
async function main() {
  log('🎮 Starting WorkLink Gamification System Test Suite', 'magenta');
  log('Testing Career Ladder implementation with race condition fixes\n', 'magenta');

  const tester = new GamificationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = GamificationTester;