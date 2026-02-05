/**
 * Gamification Rewards Shop Routes
 * Handles rewards listing, purchasing, and management (The Sink - Career Ladder Strategy)
 * @module gamification/routes/rewards
 */

const express = require('express');
const router = express.Router();
const { db } = require('../../../../../db');
const { createLogger } = require('../../../../../utils/structured-logger');

const logger = createLogger('gamification-rewards');

/**
 * GET /rewards
 * Get all active rewards with pagination and filtering
 */
router.get('/rewards', (req, res) => {
  try {
    const { page = 1, limit = 20, category, tier_required } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE clause for filters
    let whereClause = 'WHERE active = 1';
    let params = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (tier_required) {
      whereClause += ' AND tier_required = ?';
      params.push(tier_required);
    }

    // Get total count for pagination
    const totalQuery = `SELECT COUNT(*) as total FROM rewards ${whereClause}`;
    const { total } = db.prepare(totalQuery).get(...params);

    // Get rewards with pagination
    const rewardsQuery = `
      SELECT * FROM rewards
      ${whereClause}
      ORDER BY category, point_cost
      LIMIT ? OFFSET ?
    `;
    const rewards = db.prepare(rewardsQuery).all(...params, parseInt(limit), offset);

    res.json({
      success: true,
      data: rewards,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Failed to get rewards', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /rewards/user/:candidateId
 * Get user's available and purchased rewards
 */
router.get('/rewards/user/:candidateId', (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { category } = req.query;

    // Get candidate info for tier and points check
    const candidate = db.prepare(`
      SELECT current_points, current_tier, level FROM candidates WHERE id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Build WHERE clause for category filter
    let whereClause = 'WHERE active = 1';
    let params = [];
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    // Get all active rewards
    const rewards = db.prepare(`
      SELECT * FROM rewards ${whereClause} ORDER BY category, point_cost
    `).all(...params);

    // Get user's purchases
    const purchases = db.prepare(`
      SELECT rp.*, r.name as reward_name, r.category
      FROM candidate_rewards rp
      JOIN rewards r ON rp.reward_id = r.id
      WHERE rp.candidate_id = ?
      ORDER BY rp.purchased_at DESC
    `).all(candidateId);

    // Create a map of purchased reward counts
    const purchaseCounts = {};
    purchases.forEach(p => {
      purchaseCounts[p.reward_id] = (purchaseCounts[p.reward_id] || 0) + 1;
    });

    // Tier hierarchy for comparison
    const tierOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, mythic: 5 };
    const userTierLevel = tierOrder[candidate.current_tier] || 0;

    // Annotate rewards with availability info
    const annotatedRewards = rewards.map(reward => {
      const requiredTierLevel = tierOrder[reward.tier_required] || 0;
      const meetsRequirement = userTierLevel >= requiredTierLevel;
      const canAfford = candidate.current_points >= reward.point_cost;
      const inStock = reward.stock === null || reward.stock > 0;
      const purchaseCount = purchaseCounts[reward.id] || 0;
      const purchased = purchaseCount > 0;

      let canPurchase = meetsRequirement && canAfford && inStock;

      // Check for single-purchase rewards
      if (reward.max_per_user === 1 && purchased) {
        canPurchase = false;
      }

      return {
        ...reward,
        meetsRequirement,
        canAfford,
        inStock,
        purchased,
        purchaseCount,
        canPurchase,
        statusMessage: getStatusMessage(meetsRequirement, canAfford, inStock, purchased, reward)
      };
    });

    logger.business('rewards_shop_viewed', {
      candidate_id: candidateId,
      current_points: candidate.current_points,
      current_tier: candidate.current_tier,
      available_rewards: annotatedRewards.filter(r => r.canPurchase).length,
      total_rewards: annotatedRewards.length
    });

    res.json({
      success: true,
      data: {
        rewards: annotatedRewards,
        candidate: {
          current_points: candidate.current_points,
          current_tier: candidate.current_tier,
          level: candidate.level
        },
        purchases: purchases
      }
    });

  } catch (error) {
    logger.error('Failed to get user rewards', {
      candidate_id: req.params.candidateId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /rewards/:rewardId/purchase
 * Purchase a reward
 */
router.post('/rewards/:rewardId/purchase', (req, res) => {
  try {
    const { candidateId, candidate_id } = req.body;
    const finalCandidateId = candidateId || candidate_id;
    const rewardId = req.params.rewardId;

    if (!finalCandidateId) {
      return res.status(400).json({
        success: false,
        error: 'candidateId or candidate_id is required'
      });
    }

    const transaction = db.transaction(() => {
      // Get candidate info
      const candidate = db.prepare(`
        SELECT current_points, current_tier, level FROM candidates WHERE id = ?
      `).get(finalCandidateId);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Get reward info
      const reward = db.prepare('SELECT * FROM rewards WHERE id = ? AND active = 1').get(rewardId);
      if (!reward) {
        throw new Error('Reward not found or inactive');
      }

      // Check tier requirement
      const tierOrder = { bronze: 0, silver: 1, gold: 2, platinum: 3, diamond: 4, mythic: 5 };
      const userTierLevel = tierOrder[candidate.current_tier] || 0;
      const requiredTierLevel = tierOrder[reward.tier_required] || 0;

      if (userTierLevel < requiredTierLevel) {
        throw new Error(`Requires ${reward.tier_required} tier or higher`);
      }

      // Check points
      if (candidate.current_points < reward.point_cost) {
        throw new Error('Insufficient points');
      }

      // Check stock
      if (reward.stock !== null && reward.stock <= 0) {
        throw new Error('Out of stock');
      }

      // Check max per user
      if (reward.max_per_user) {
        const userPurchaseCount = db.prepare(`
          SELECT COUNT(*) as count FROM candidate_rewards
          WHERE candidate_id = ? AND reward_id = ?
        `).get(finalCandidateId, rewardId).count;

        if (userPurchaseCount >= reward.max_per_user) {
          throw new Error(`Maximum ${reward.max_per_user} purchase(s) per user`);
        }
      }

      // Deduct points
      db.prepare(`
        UPDATE candidates SET current_points = current_points - ? WHERE id = ?
      `).run(reward.point_cost, finalCandidateId);

      // Add purchase record
      db.prepare(`
        INSERT INTO candidate_rewards (candidate_id, reward_id, purchased_at)
        VALUES (?, ?, datetime('now'))
      `).run(finalCandidateId, rewardId);

      // Update stock if applicable
      if (reward.stock !== null) {
        db.prepare('UPDATE rewards SET stock = stock - 1 WHERE id = ?').run(rewardId);
      }

      // Get updated candidate points
      const updatedCandidate = db.prepare('SELECT current_points FROM candidates WHERE id = ?').get(finalCandidateId);

      return { reward, oldPoints: candidate.current_points, newPoints: updatedCandidate.current_points };
    });

    const result = transaction();

    logger.business('reward_purchased', {
      candidate_id: finalCandidateId,
      reward_id: rewardId,
      reward_name: result.reward.name,
      reward_category: result.reward.category,
      points_spent: result.reward.point_cost,
      points_before: result.oldPoints,
      points_after: result.newPoints
    });

    res.json({
      success: true,
      data: {
        reward: result.reward,
        points_spent: result.reward.point_cost,
        remaining_points: result.newPoints,
        message: `Successfully purchased ${result.reward.name}!`
      }
    });

  } catch (error) {
    logger.error('Failed to purchase reward', {
      candidate_id: req.body.candidateId || req.body.candidate_id,
      reward_id: req.params.rewardId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Helper function to get status message for rewards
 */
function getStatusMessage(meetsRequirement, canAfford, inStock, purchased, reward) {
  if (purchased && reward.max_per_user === 1) {
    return 'Already purchased';
  }
  if (!meetsRequirement) {
    return `Requires ${reward.tier_required} tier`;
  }
  if (!canAfford) {
    return `Need ${reward.point_cost - candidate?.current_points || 0} more points`;
  }
  if (!inStock) {
    return 'Out of stock';
  }
  return 'Available to purchase';
}

module.exports = router;