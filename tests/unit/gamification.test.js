/**
 * Unit Tests: Gamification System
 *
 * Tests XP calculations, leveling, tier system, and job XP formulas.
 * These are the core progression mechanics that affect worker engagement.
 */

const {
  XP_VALUES,
  getXPForLevel,
  calculateLevel,
  calculateLevelProgress,
  getXPToNextLevel,
  getLevelTier,
  getTierInfo,
  hasTierBenefit,
  getJobVisibilityDelay,
  calculateJobXP,
  getLevelTitle,
  formatXP,
  TIERS,
} = require('../../shared/utils/gamification');

// ============================================
// XP FOR LEVEL (Formula: 500 × level^1.5)
// ============================================

describe('getXPForLevel', () => {
  test('level 1 requires 0 XP', () => {
    expect(getXPForLevel(1)).toBe(0);
  });

  test('level 0 or negative returns 0', () => {
    expect(getXPForLevel(0)).toBe(0);
    expect(getXPForLevel(-1)).toBe(0);
  });

  test('level 2 requires 500 * 2^1.5 = 1414 XP', () => {
    expect(getXPForLevel(2)).toBe(Math.floor(500 * Math.pow(2, 1.5)));
  });

  test('XP increases monotonically with level', () => {
    for (let i = 2; i <= 50; i++) {
      expect(getXPForLevel(i)).toBeGreaterThan(getXPForLevel(i - 1));
    }
  });

  test('high levels require significantly more XP', () => {
    const level10 = getXPForLevel(10);
    const level50 = getXPForLevel(50);
    const level100 = getXPForLevel(100);

    expect(level50).toBeGreaterThan(level10 * 5);
    expect(level100).toBeGreaterThan(level50 * 2);
  });
});

// ============================================
// CALCULATE LEVEL (Binary search on thresholds)
// ============================================

describe('calculateLevel', () => {
  test('0 XP = level 1', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  test('negative XP = level 1', () => {
    expect(calculateLevel(-100)).toBe(1);
  });

  test('XP exactly at level threshold returns that level', () => {
    const xpForLevel5 = getXPForLevel(5);
    expect(calculateLevel(xpForLevel5)).toBe(5);
  });

  test('XP just below next level stays at current level', () => {
    const xpForLevel3 = getXPForLevel(3);
    expect(calculateLevel(xpForLevel3 - 1)).toBe(2);
  });

  test('very high XP returns high level', () => {
    const level = calculateLevel(5000000);
    expect(level).toBeGreaterThan(50);
  });

  test('level calculation is consistent with getXPForLevel', () => {
    // For levels 1-50, verify round-trip
    for (let lvl = 1; lvl <= 50; lvl++) {
      const xp = getXPForLevel(lvl);
      expect(calculateLevel(xp)).toBe(lvl);
    }
  });
});

// ============================================
// LEVEL PROGRESS (Percentage within level)
// ============================================

describe('calculateLevelProgress', () => {
  test('at exact level threshold returns 0%', () => {
    const xp = getXPForLevel(5);
    expect(calculateLevelProgress(xp, 5)).toBe(0);
  });

  test('halfway through a level returns ~50%', () => {
    const currentXP = getXPForLevel(5);
    const nextXP = getXPForLevel(6);
    const midXP = currentXP + Math.floor((nextXP - currentXP) / 2);
    const progress = calculateLevelProgress(midXP, 5);

    expect(progress).toBeGreaterThanOrEqual(49);
    expect(progress).toBeLessThanOrEqual(51);
  });

  test('progress is clamped between 0 and 100', () => {
    expect(calculateLevelProgress(0, 1)).toBeGreaterThanOrEqual(0);
    expect(calculateLevelProgress(999999999, 1)).toBeLessThanOrEqual(100);
  });

  test('returns 100 if xpNeeded is 0', () => {
    // This edge case shouldn't happen normally but tests the guard
    expect(calculateLevelProgress(0, 0)).toBe(100);
  });
});

// ============================================
// XP TO NEXT LEVEL
// ============================================

describe('getXPToNextLevel', () => {
  test('at level 1 with 0 XP, returns XP needed for level 2', () => {
    const needed = getXPToNextLevel(0, 1);
    expect(needed).toBe(getXPForLevel(2));
  });

  test('never returns negative', () => {
    expect(getXPToNextLevel(999999999, 1)).toBe(0);
  });

  test('decreases as you gain XP within a level', () => {
    const startXP = getXPForLevel(5);
    const needed1 = getXPToNextLevel(startXP, 5);
    const needed2 = getXPToNextLevel(startXP + 100, 5);

    expect(needed2).toBeLessThan(needed1);
  });
});

// ============================================
// TIER SYSTEM
// ============================================

describe('getLevelTier', () => {
  test('levels 1-9 are bronze', () => {
    expect(getLevelTier(1)).toBe('bronze');
    expect(getLevelTier(9)).toBe('bronze');
  });

  test('levels 10-24 are silver', () => {
    expect(getLevelTier(10)).toBe('silver');
    expect(getLevelTier(24)).toBe('silver');
  });

  test('levels 25-49 are gold', () => {
    expect(getLevelTier(25)).toBe('gold');
    expect(getLevelTier(49)).toBe('gold');
  });

  test('levels 50-74 are platinum', () => {
    expect(getLevelTier(50)).toBe('platinum');
    expect(getLevelTier(74)).toBe('platinum');
  });

  test('levels 75-99 are diamond', () => {
    expect(getLevelTier(75)).toBe('diamond');
    expect(getLevelTier(99)).toBe('diamond');
  });

  test('level 100+ is mythic', () => {
    expect(getLevelTier(100)).toBe('mythic');
    expect(getLevelTier(200)).toBe('mythic');
  });

  // Boundary tests
  test('tier boundaries are exact', () => {
    expect(getLevelTier(9)).toBe('bronze');
    expect(getLevelTier(10)).toBe('silver');
    expect(getLevelTier(24)).toBe('silver');
    expect(getLevelTier(25)).toBe('gold');
    expect(getLevelTier(49)).toBe('gold');
    expect(getLevelTier(50)).toBe('platinum');
    expect(getLevelTier(74)).toBe('platinum');
    expect(getLevelTier(75)).toBe('diamond');
    expect(getLevelTier(99)).toBe('diamond');
    expect(getLevelTier(100)).toBe('mythic');
  });
});

describe('getTierInfo', () => {
  test('returns tier object with name and benefits', () => {
    const info = getTierInfo(25);
    expect(info.key).toBe('gold');
    expect(info.name).toBe('Gold');
    expect(info.benefits).toBeDefined();
    expect(Array.isArray(info.benefits)).toBe(true);
  });
});

// ============================================
// TIER BENEFITS
// ============================================

describe('hasTierBenefit', () => {
  test('bronze has no special benefits', () => {
    expect(hasTierBenefit(5, 'priority_15min')).toBe(false);
    expect(hasTierBenefit(5, 'instant_payout')).toBe(false);
    expect(hasTierBenefit(5, 'vip_support')).toBe(false);
  });

  test('silver gets 15min priority', () => {
    expect(hasTierBenefit(10, 'priority_15min')).toBe(true);
    expect(hasTierBenefit(10, 'priority_1hour')).toBe(false);
  });

  test('gold gets 1hour priority and instant payout', () => {
    expect(hasTierBenefit(25, 'priority_1hour')).toBe(true);
    expect(hasTierBenefit(25, 'instant_payout')).toBe(true);
    expect(hasTierBenefit(25, 'vip_support')).toBe(false);
  });

  test('platinum gets VIP support', () => {
    expect(hasTierBenefit(50, 'vip_support')).toBe(true);
    expect(hasTierBenefit(50, 'revenue_share')).toBe(false);
  });

  test('diamond gets revenue share', () => {
    expect(hasTierBenefit(75, 'revenue_share')).toBe(true);
    expect(hasTierBenefit(75, 'hall_of_fame')).toBe(false);
  });

  test('mythic gets hall of fame', () => {
    expect(hasTierBenefit(100, 'hall_of_fame')).toBe(true);
  });

  test('higher tiers inherit lower tier benefits', () => {
    // Mythic should have all benefits
    expect(hasTierBenefit(100, 'priority_15min')).toBe(true);
    expect(hasTierBenefit(100, 'priority_1hour')).toBe(true);
    expect(hasTierBenefit(100, 'instant_payout')).toBe(true);
    expect(hasTierBenefit(100, 'vip_support')).toBe(true);
    expect(hasTierBenefit(100, 'revenue_share')).toBe(true);
    expect(hasTierBenefit(100, 'hall_of_fame')).toBe(true);
  });

  test('unknown benefit returns false', () => {
    expect(hasTierBenefit(100, 'nonexistent_benefit')).toBe(false);
  });
});

// ============================================
// JOB VISIBILITY DELAY
// ============================================

describe('getJobVisibilityDelay', () => {
  test('bronze sees jobs after 60 minutes', () => {
    expect(getJobVisibilityDelay(5)).toBe(60);
  });

  test('silver sees jobs after 45 minutes', () => {
    expect(getJobVisibilityDelay(15)).toBe(45);
  });

  test('gold and above see jobs immediately', () => {
    expect(getJobVisibilityDelay(25)).toBe(0);
    expect(getJobVisibilityDelay(50)).toBe(0);
    expect(getJobVisibilityDelay(75)).toBe(0);
    expect(getJobVisibilityDelay(100)).toBe(0);
  });
});

// ============================================
// JOB XP CALCULATION
// ============================================

describe('calculateJobXP', () => {
  test('base: 8 hours = 800 XP', () => {
    expect(calculateJobXP(8)).toBe(800);
  });

  test('0 hours = 0 XP', () => {
    expect(calculateJobXP(0)).toBe(0);
  });

  test('decimal hours work correctly', () => {
    expect(calculateJobXP(2.5)).toBe(250);
  });

  test('urgent job multiplier (1.5x)', () => {
    expect(calculateJobXP(8, true)).toBe(1200);
  });

  test('on-time bonus (+50)', () => {
    expect(calculateJobXP(8, false, true)).toBe(850);
  });

  test('5-star rating bonus (+200)', () => {
    expect(calculateJobXP(8, false, false, 5)).toBe(1000);
  });

  test('non-5-star rating gives no bonus', () => {
    expect(calculateJobXP(8, false, false, 4)).toBe(800);
    expect(calculateJobXP(8, false, false, 3)).toBe(800);
  });

  test('all bonuses combined', () => {
    // 8 hours * 100 * 1.5 (urgent) + 50 (on-time) + 200 (5-star) = 1450
    const xp = calculateJobXP(8, true, true, 5);
    expect(xp).toBe(Math.floor(8 * 100 * 1.5 + 50 + 200));
  });

  test('urgent multiplier applies before additive bonuses', () => {
    // Urgent: 8 * 100 * 1.5 = 1200, then +50 on-time = 1250
    expect(calculateJobXP(8, true, true, null)).toBe(1250);
  });

  test('result is always a floor integer', () => {
    const xp = calculateJobXP(3.7, true, true, 5);
    expect(Number.isInteger(xp)).toBe(true);
  });
});

// ============================================
// LEVEL TITLES
// ============================================

describe('getLevelTitle', () => {
  test('level 1 = Newcomer', () => {
    expect(getLevelTitle(1)).toBe('Newcomer');
  });

  test('level 10 = Silver Member', () => {
    expect(getLevelTitle(10)).toBe('Silver Member');
  });

  test('level 100 = Mythic', () => {
    expect(getLevelTitle(100)).toBe('Mythic');
  });

  test('unlisted level returns nearest lower title', () => {
    // Level 27 should fall back to level 25 = Gold Member
    expect(getLevelTitle(27)).toBe('Gold Member');
  });

  test('very high level returns Mythic', () => {
    expect(getLevelTitle(150)).toBe('Mythic');
  });
});

// ============================================
// FORMAT XP
// ============================================

describe('formatXP', () => {
  test('formats millions with M suffix', () => {
    expect(formatXP(1500000)).toBe('1.5M');
  });

  test('formats thousands with K suffix', () => {
    expect(formatXP(15000)).toBe('15.0K');
  });

  test('small numbers use locale string', () => {
    const result = formatXP(500);
    expect(result).toBe('500');
  });
});

// ============================================
// XP VALUES CONSTANTS
// ============================================

describe('XP_VALUES constants', () => {
  test('positive actions have positive values', () => {
    expect(XP_VALUES.PER_HOUR_WORKED).toBeGreaterThan(0);
    expect(XP_VALUES.ON_TIME_ARRIVAL).toBeGreaterThan(0);
    expect(XP_VALUES.FIVE_STAR_RATING).toBeGreaterThan(0);
    expect(XP_VALUES.TRAINING_MODULE).toBeGreaterThan(0);
    expect(XP_VALUES.REFERRAL_ACTIVE).toBeGreaterThan(0);
  });

  test('penalties are negative', () => {
    expect(XP_VALUES.NO_SHOW_PENALTY).toBeLessThan(0);
    expect(XP_VALUES.LATE_CANCEL_PENALTY).toBeLessThan(0);
  });

  test('urgent multiplier is greater than 1', () => {
    expect(XP_VALUES.URGENT_JOB_MULTIPLIER).toBeGreaterThan(1);
  });
});

// ============================================
// TIER DATA INTEGRITY
// ============================================

describe('TIERS data', () => {
  test('all 6 tiers are defined', () => {
    expect(Object.keys(TIERS)).toHaveLength(6);
    expect(TIERS.bronze).toBeDefined();
    expect(TIERS.silver).toBeDefined();
    expect(TIERS.gold).toBeDefined();
    expect(TIERS.platinum).toBeDefined();
    expect(TIERS.diamond).toBeDefined();
    expect(TIERS.mythic).toBeDefined();
  });

  test('tiers have non-overlapping level ranges', () => {
    expect(TIERS.bronze.max).toBeLessThan(TIERS.silver.min);
    expect(TIERS.silver.max).toBeLessThan(TIERS.gold.min);
    expect(TIERS.gold.max).toBeLessThan(TIERS.platinum.min);
    expect(TIERS.platinum.max).toBeLessThan(TIERS.diamond.min);
    expect(TIERS.diamond.max).toBeLessThan(TIERS.mythic.min);
  });

  test('each tier has name, benefits, and level range', () => {
    Object.values(TIERS).forEach(tier => {
      expect(tier.name).toBeDefined();
      expect(tier.min).toBeDefined();
      expect(tier.max).toBeDefined();
      expect(tier.benefits).toBeDefined();
      expect(Array.isArray(tier.benefits)).toBe(true);
      expect(tier.benefits.length).toBeGreaterThan(0);
    });
  });
});
