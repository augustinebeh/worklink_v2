/**
 * Unit Tests: Utility Modules
 *
 * Tests for:
 *  - IntervalRegistry  (register, clear, clearAll, list, count)
 *  - candidateParser    (parseCandidateData, parseCandidatesData, stringifyJsonFields)
 *  - Gamification       (calculateLevel, XP calculations, tiers, titles, job XP)
 *  - Shared constants   (XP_REWARDS re-exports, TIER_CONFIG structure)
 */

// ============================================
// SETUP
// ============================================

jest.useFakeTimers();

// IntervalRegistry exports a singleton -- require a fresh instance per describe
// block by resetting the module cache.
function freshRegistry() {
  jest.resetModules();
  return require('../../utils/interval-registry');
}

// candidateParser depends on safeJsonParse from db-helpers which pulls in
// structured-logger / fs / path.  We mock the heavy dependency so tests stay
// lightweight and isolated.
jest.mock('../../utils/structured-logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

const {
  parseCandidateData,
  parseCandidatesData,
  safeJsonParse,
  stringifyJsonFields,
} = require('../../utils/candidateParser');

const gamification = require('../../shared/utils/gamification');
const constants = require('../../shared/constants');

// ============================================
// INTERVAL REGISTRY
// ============================================

describe('IntervalRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = freshRegistry();
  });

  afterEach(() => {
    // Clean up any live intervals to avoid timer leaks
    registry.clearAll();
  });

  // ---- register ----

  test('register stores an interval and increases count', () => {
    const id = setInterval(() => {}, 1000);
    registry.register('heartbeat', id, 'Heartbeat ping');

    expect(registry.count()).toBe(1);
  });

  test('register stores description and registeredAt date', () => {
    const id = setInterval(() => {}, 1000);
    registry.register('sync', id, 'Data sync');

    const items = registry.list();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('sync');
    expect(items[0].description).toBe('Data sync');
    expect(items[0].registeredAt).toBeInstanceOf(Date);
  });

  test('register overwrites entry when same name is used', () => {
    const id1 = setInterval(() => {}, 1000);
    const id2 = setInterval(() => {}, 2000);
    registry.register('poll', id1, 'First');
    registry.register('poll', id2, 'Second');

    expect(registry.count()).toBe(1);
    expect(registry.list()[0].description).toBe('Second');

    // Clean up orphaned interval
    clearInterval(id1);
  });

  test('register works without a description', () => {
    const id = setInterval(() => {}, 500);
    registry.register('anon', id);

    expect(registry.list()[0].description).toBe('');
  });

  // ---- clear ----

  test('clear removes a specific interval and returns true', () => {
    const id = setInterval(() => {}, 1000);
    registry.register('temp', id, 'Temporary');

    const result = registry.clear('temp');

    expect(result).toBe(true);
    expect(registry.count()).toBe(0);
  });

  test('clear returns false for non-existent name', () => {
    expect(registry.clear('ghost')).toBe(false);
  });

  test('clear only removes the targeted interval', () => {
    const id1 = setInterval(() => {}, 1000);
    const id2 = setInterval(() => {}, 2000);
    registry.register('a', id1);
    registry.register('b', id2);

    registry.clear('a');

    expect(registry.count()).toBe(1);
    expect(registry.list()[0].name).toBe('b');
  });

  // ---- clearAll ----

  test('clearAll removes every registered interval', () => {
    const id1 = setInterval(() => {}, 1000);
    const id2 = setInterval(() => {}, 2000);
    const id3 = setInterval(() => {}, 3000);
    registry.register('x', id1);
    registry.register('y', id2);
    registry.register('z', id3);

    const cleared = registry.clearAll();

    expect(cleared).toBe(3);
    expect(registry.count()).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  test('clearAll returns 0 when registry is empty', () => {
    expect(registry.clearAll()).toBe(0);
  });

  // ---- list / count ----

  test('list returns entries in insertion order', () => {
    registry.register('first', setInterval(() => {}, 100));
    registry.register('second', setInterval(() => {}, 200));

    const names = registry.list().map((i) => i.name);
    expect(names).toEqual(['first', 'second']);
  });

  test('count reflects register and clear operations', () => {
    expect(registry.count()).toBe(0);
    registry.register('one', setInterval(() => {}, 100));
    expect(registry.count()).toBe(1);
    registry.register('two', setInterval(() => {}, 200));
    expect(registry.count()).toBe(2);
    registry.clear('one');
    expect(registry.count()).toBe(1);
    registry.clearAll();
    expect(registry.count()).toBe(0);
  });

  // ---- logger integration ----

  test('logger receives info calls when set', () => {
    const mockLogger = { info: jest.fn() };
    registry.setLogger(mockLogger);

    const id = setInterval(() => {}, 1000);
    registry.register('logged', id, 'With logging');

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Interval registered',
      expect.objectContaining({ name: 'logged', total_intervals: 1 })
    );

    registry.clear('logged');
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Interval cleared',
      expect.objectContaining({ name: 'logged' })
    );
  });
});

// ============================================
// CANDIDATE PARSER
// ============================================

describe('candidateParser', () => {
  // ---- parseCandidateData ----

  describe('parseCandidateData', () => {
    test('returns null for null input', () => {
      expect(parseCandidateData(null)).toBeNull();
    });

    test('returns null for undefined input', () => {
      expect(parseCandidateData(undefined)).toBeNull();
    });

    test('parses JSON string fields into arrays/objects', () => {
      const raw = {
        id: 'C001',
        name: 'Alice',
        certifications: '["First Aid","OSHA"]',
        skills: '["JavaScript","Python"]',
        preferred_locations: '["Singapore","Remote"]',
        languages: '["English","Mandarin"]',
        availability: '{"monday":true,"tuesday":false}',
        work_history: '[{"company":"Acme","role":"Dev"}]',
      };

      const parsed = parseCandidateData(raw);

      expect(parsed.id).toBe('C001');
      expect(parsed.certifications).toEqual(['First Aid', 'OSHA']);
      expect(parsed.skills).toEqual(['JavaScript', 'Python']);
      expect(parsed.preferred_locations).toEqual(['Singapore', 'Remote']);
      expect(parsed.languages).toEqual(['English', 'Mandarin']);
      expect(parsed.availability).toEqual({ monday: true, tuesday: false });
      expect(parsed.work_history).toEqual([{ company: 'Acme', role: 'Dev' }]);
    });

    test('uses fallback defaults for null/empty JSON fields', () => {
      const raw = {
        id: 'C002',
        certifications: null,
        skills: '',
        preferred_locations: undefined,
        languages: null,
        availability: null,
        work_history: null,
      };

      const parsed = parseCandidateData(raw);

      expect(parsed.certifications).toEqual([]);
      expect(parsed.skills).toEqual([]);
      expect(parsed.preferred_locations).toEqual([]);
      expect(parsed.languages).toEqual([]);
      expect(parsed.availability).toEqual({});
      expect(parsed.work_history).toEqual([]);
    });

    test('uses fallback for malformed JSON strings', () => {
      const raw = {
        certifications: 'not-valid-json{',
        skills: '{broken',
        preferred_locations: '["ok"]',
        languages: null,
        availability: null,
        work_history: null,
      };

      const parsed = parseCandidateData(raw);

      expect(parsed.certifications).toEqual([]);
      expect(parsed.skills).toEqual([]);
      expect(parsed.preferred_locations).toEqual(['ok']);
    });
  });

  // ---- parseCandidatesData ----

  describe('parseCandidatesData', () => {
    test('returns empty array for non-array input', () => {
      expect(parseCandidatesData(null)).toEqual([]);
      expect(parseCandidatesData(undefined)).toEqual([]);
      expect(parseCandidatesData('string')).toEqual([]);
      expect(parseCandidatesData(42)).toEqual([]);
    });

    test('parses an array of candidates', () => {
      const raw = [
        { id: 'C1', skills: '["A"]', certifications: null, preferred_locations: null, languages: null, availability: null, work_history: null },
        { id: 'C2', skills: '["B","C"]', certifications: null, preferred_locations: null, languages: null, availability: null, work_history: null },
      ];

      const parsed = parseCandidatesData(raw);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].skills).toEqual(['A']);
      expect(parsed[1].skills).toEqual(['B', 'C']);
    });
  });

  // ---- stringifyJsonFields ----

  describe('stringifyJsonFields', () => {
    test('stringifies specified array fields', () => {
      const data = { skills: ['JS', 'TS'], name: 'Alice' };
      const result = stringifyJsonFields(data, ['skills']);

      expect(result.skills).toBe('["JS","TS"]');
      expect(result.name).toBe('Alice');
    });

    test('stringifies specified object fields', () => {
      const data = { availability: { mon: true }, id: 1 };
      const result = stringifyJsonFields(data, ['availability']);

      expect(result.availability).toBe('{"mon":true}');
      expect(result.id).toBe(1);
    });

    test('leaves already-string fields unchanged', () => {
      const data = { skills: '["already","string"]' };
      const result = stringifyJsonFields(data, ['skills']);

      expect(result.skills).toBe('["already","string"]');
    });

    test('leaves null/undefined fields unchanged', () => {
      const data = { skills: null, languages: undefined };
      const result = stringifyJsonFields(data, ['skills', 'languages']);

      expect(result.skills).toBeNull();
      expect(result.languages).toBeUndefined();
    });

    test('does not mutate the original object', () => {
      const data = { skills: ['A'] };
      const result = stringifyJsonFields(data, ['skills']);

      expect(data.skills).toEqual(['A']);
      expect(result.skills).toBe('["A"]');
    });
  });

  // ---- safeJsonParse (re-exported) ----

  describe('safeJsonParse', () => {
    test('parses valid JSON', () => {
      expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
      expect(safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    test('returns fallback for falsy values', () => {
      expect(safeJsonParse(null, [])).toEqual([]);
      expect(safeJsonParse('', {})).toEqual({});
      expect(safeJsonParse(undefined, 'default')).toBe('default');
    });

    test('returns null as default fallback', () => {
      expect(safeJsonParse(null)).toBeNull();
    });

    test('returns fallback for invalid JSON', () => {
      expect(safeJsonParse('not json', [])).toEqual([]);
    });
  });
});

// ============================================
// GAMIFICATION
// ============================================

describe('Gamification', () => {
  const {
    XP_VALUES,
    getXPForLevel,
    calculateLevel,
    calculateLevelProgress,
    getXPToNextLevel,
    getXPForNextLevel,
    TIERS,
    getLevelTier,
    getTierInfo,
    getTierBenefits,
    LEVEL_TITLES,
    getLevelTitle,
    formatXP,
    calculateJobXP,
    hasTierBenefit,
    getJobVisibilityDelay,
    ACHIEVEMENT_CATEGORIES,
    QUEST_TYPES,
    XP_THRESHOLDS,
  } = gamification;

  // ---- XP_VALUES constants ----

  describe('XP_VALUES', () => {
    test('has expected positive action values', () => {
      expect(XP_VALUES.PER_HOUR_WORKED).toBe(100);
      expect(XP_VALUES.ON_TIME_ARRIVAL).toBe(50);
      expect(XP_VALUES.FIVE_STAR_RATING).toBe(200);
      expect(XP_VALUES.URGENT_JOB_MULTIPLIER).toBe(1.5);
      expect(XP_VALUES.TRAINING_MODULE).toBe(500);
      expect(XP_VALUES.REFERRAL_ACTIVE).toBe(1000);
    });

    test('has negative penalty values', () => {
      expect(XP_VALUES.NO_SHOW_PENALTY).toBeLessThan(0);
      expect(XP_VALUES.LATE_CANCEL_PENALTY).toBeLessThan(0);
    });
  });

  // ---- getXPForLevel ----

  describe('getXPForLevel', () => {
    test('returns 0 for level 1 and below', () => {
      expect(getXPForLevel(1)).toBe(0);
      expect(getXPForLevel(0)).toBe(0);
      expect(getXPForLevel(-5)).toBe(0);
    });

    test('follows 500 * level^1.5 formula', () => {
      expect(getXPForLevel(2)).toBe(Math.floor(500 * Math.pow(2, 1.5)));
      expect(getXPForLevel(5)).toBe(Math.floor(500 * Math.pow(5, 1.5)));
      expect(getXPForLevel(10)).toBe(Math.floor(500 * Math.pow(10, 1.5)));
    });

    test('XP requirements increase with level', () => {
      for (let lvl = 2; lvl <= 20; lvl++) {
        expect(getXPForLevel(lvl + 1)).toBeGreaterThan(getXPForLevel(lvl));
      }
    });
  });

  // ---- calculateLevel ----

  describe('calculateLevel', () => {
    test('returns 1 for zero or negative XP', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(-100)).toBe(1);
    });

    test('returns 1 for XP just below level 2 threshold', () => {
      const threshold2 = getXPForLevel(2);
      expect(calculateLevel(threshold2 - 1)).toBe(1);
    });

    test('returns correct level at exact thresholds', () => {
      expect(calculateLevel(getXPForLevel(2))).toBe(2);
      expect(calculateLevel(getXPForLevel(5))).toBe(5);
      expect(calculateLevel(getXPForLevel(10))).toBe(10);
      expect(calculateLevel(getXPForLevel(25))).toBe(25);
    });

    test('returns correct level for XP between thresholds', () => {
      const xpBetween5and6 = getXPForLevel(5) + 1;
      expect(calculateLevel(xpBetween5and6)).toBe(5);
    });

    test('handles very large XP values', () => {
      const level = calculateLevel(10000000);
      expect(level).toBeGreaterThan(50);
    });
  });

  // ---- calculateLevelProgress ----

  describe('calculateLevelProgress', () => {
    test('returns 0 at start of a level', () => {
      const xp = getXPForLevel(5);
      expect(calculateLevelProgress(xp, 5)).toBe(0);
    });

    test('returns value between 0 and 100', () => {
      const xp = getXPForLevel(5) + 100;
      const progress = calculateLevelProgress(xp, 5);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });

    test('returns 100 when xpNeeded is zero or less', () => {
      // Edge case: level is very high making nextThreshold - currentThreshold <= 0
      // is not realistic but the guard handles it
      expect(calculateLevelProgress(999999999, 1)).toBe(100);
    });
  });

  // ---- getXPToNextLevel / getXPForNextLevel ----

  describe('getXPToNextLevel', () => {
    test('returns positive value when below next threshold', () => {
      const xp = getXPForLevel(3) + 50;
      const remaining = getXPToNextLevel(xp, 3);
      expect(remaining).toBeGreaterThan(0);
    });

    test('returns 0 when at or above next threshold', () => {
      const xp = getXPForLevel(4);
      expect(getXPToNextLevel(xp, 3)).toBe(0);
    });
  });

  describe('getXPForNextLevel', () => {
    test('returns XP required for level + 1', () => {
      expect(getXPForNextLevel(5)).toBe(getXPForLevel(6));
    });
  });

  // ---- Tier system ----

  describe('getLevelTier', () => {
    test('bronze for levels 1-9', () => {
      expect(getLevelTier(1)).toBe('bronze');
      expect(getLevelTier(9)).toBe('bronze');
    });

    test('silver for levels 10-24', () => {
      expect(getLevelTier(10)).toBe('silver');
      expect(getLevelTier(24)).toBe('silver');
    });

    test('gold for levels 25-49', () => {
      expect(getLevelTier(25)).toBe('gold');
      expect(getLevelTier(49)).toBe('gold');
    });

    test('platinum for levels 50-74', () => {
      expect(getLevelTier(50)).toBe('platinum');
      expect(getLevelTier(74)).toBe('platinum');
    });

    test('diamond for levels 75-99', () => {
      expect(getLevelTier(75)).toBe('diamond');
      expect(getLevelTier(99)).toBe('diamond');
    });

    test('mythic for level 100+', () => {
      expect(getLevelTier(100)).toBe('mythic');
      expect(getLevelTier(200)).toBe('mythic');
    });
  });

  describe('getTierInfo', () => {
    test('returns tier object with key and properties', () => {
      const info = getTierInfo(1);
      expect(info.key).toBe('bronze');
      expect(info.name).toBe('Bronze');
      expect(info.color).toBe('amber');
      expect(info.benefits).toEqual(expect.any(Array));
    });
  });

  describe('getTierBenefits', () => {
    test('returns benefits array for a given level', () => {
      const benefits = getTierBenefits(50);
      expect(Array.isArray(benefits)).toBe(true);
      expect(benefits.length).toBeGreaterThan(0);
    });
  });

  describe('TIERS constant', () => {
    test('has all six tier keys', () => {
      const expectedKeys = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'mythic'];
      expect(Object.keys(TIERS)).toEqual(expect.arrayContaining(expectedKeys));
    });

    test('each tier has required properties', () => {
      for (const [, tier] of Object.entries(TIERS)) {
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('min');
        expect(tier).toHaveProperty('max');
        expect(tier).toHaveProperty('color');
        expect(tier).toHaveProperty('benefits');
        expect(tier).toHaveProperty('visual');
      }
    });
  });

  // ---- Level titles ----

  describe('getLevelTitle', () => {
    test('returns exact title for defined levels', () => {
      expect(getLevelTitle(1)).toBe('Newcomer');
      expect(getLevelTitle(10)).toBe('Silver Member');
      expect(getLevelTitle(25)).toBe('Gold Member');
      expect(getLevelTitle(100)).toBe('Mythic');
    });

    test('interpolates to nearest lower defined title for unlisted levels', () => {
      // Level 27 is not defined, nearest lower defined is 25 -> Gold Member
      expect(getLevelTitle(27)).toBe('Gold Member');
    });

    test('returns Newcomer for level 0 or below', () => {
      expect(getLevelTitle(0)).toBe('Newcomer');
    });
  });

  // ---- Utility functions ----

  describe('formatXP', () => {
    test('formats millions with M suffix', () => {
      expect(formatXP(1500000)).toBe('1.5M');
      expect(formatXP(1000000)).toBe('1.0M');
    });

    test('formats thousands with K suffix', () => {
      expect(formatXP(2500)).toBe('2.5K');
      expect(formatXP(1000)).toBe('1.0K');
    });

    test('formats small numbers with locale string', () => {
      const result = formatXP(999);
      // toLocaleString output varies by runtime; just verify it is a string
      expect(typeof result).toBe('string');
    });
  });

  describe('calculateJobXP', () => {
    test('calculates base XP from hours', () => {
      expect(calculateJobXP(2)).toBe(200); // 2 * 100
    });

    test('applies urgent multiplier', () => {
      expect(calculateJobXP(2, true)).toBe(300); // 2 * 100 * 1.5
    });

    test('adds on-time bonus', () => {
      expect(calculateJobXP(2, false, true)).toBe(250); // 200 + 50
    });

    test('adds five-star rating bonus', () => {
      expect(calculateJobXP(2, false, false, 5)).toBe(400); // 200 + 200
    });

    test('does not add rating bonus for non-5 ratings', () => {
      expect(calculateJobXP(2, false, false, 4)).toBe(200);
      expect(calculateJobXP(2, false, false, null)).toBe(200);
    });

    test('combines all bonuses correctly', () => {
      // 2 hours urgent on-time 5-star: (2*100*1.5) + 50 + 200 = 550
      expect(calculateJobXP(2, true, true, 5)).toBe(550);
    });

    test('returns integer (floors the result)', () => {
      // 3 hours urgent = 3 * 100 * 1.5 = 450 (integer)
      const result = calculateJobXP(3, true);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('hasTierBenefit', () => {
    test('bronze has no special benefits', () => {
      expect(hasTierBenefit(1, 'priority_15min')).toBe(false);
      expect(hasTierBenefit(1, 'instant_payout')).toBe(false);
    });

    test('silver has 15min priority', () => {
      expect(hasTierBenefit(10, 'priority_15min')).toBe(true);
      expect(hasTierBenefit(10, 'priority_1hour')).toBe(false);
    });

    test('gold has instant payout and 1hr priority', () => {
      expect(hasTierBenefit(25, 'priority_1hour')).toBe(true);
      expect(hasTierBenefit(25, 'instant_payout')).toBe(true);
    });

    test('mythic has hall of fame', () => {
      expect(hasTierBenefit(100, 'hall_of_fame')).toBe(true);
    });

    test('returns false for unknown benefit', () => {
      expect(hasTierBenefit(100, 'free_pizza')).toBe(false);
    });
  });

  describe('getJobVisibilityDelay', () => {
    test('bronze gets 60 min delay', () => {
      expect(getJobVisibilityDelay(1)).toBe(60);
    });

    test('silver gets 45 min delay', () => {
      expect(getJobVisibilityDelay(10)).toBe(45);
    });

    test('gold and above get 0 delay', () => {
      expect(getJobVisibilityDelay(25)).toBe(0);
      expect(getJobVisibilityDelay(50)).toBe(0);
      expect(getJobVisibilityDelay(75)).toBe(0);
      expect(getJobVisibilityDelay(100)).toBe(0);
    });
  });

  // ---- Data structures ----

  describe('ACHIEVEMENT_CATEGORIES', () => {
    test('has reliable, skilled, and social categories', () => {
      expect(ACHIEVEMENT_CATEGORIES).toHaveProperty('reliable');
      expect(ACHIEVEMENT_CATEGORIES).toHaveProperty('skilled');
      expect(ACHIEVEMENT_CATEGORIES).toHaveProperty('social');
    });

    test('each category has name, description, and achievements array', () => {
      for (const [, cat] of Object.entries(ACHIEVEMENT_CATEGORIES)) {
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('description');
        expect(Array.isArray(cat.achievements)).toBe(true);
      }
    });
  });

  describe('QUEST_TYPES', () => {
    test('has daily, weekly, special, and repeatable types', () => {
      expect(QUEST_TYPES).toHaveProperty('daily');
      expect(QUEST_TYPES).toHaveProperty('weekly');
      expect(QUEST_TYPES).toHaveProperty('special');
      expect(QUEST_TYPES).toHaveProperty('repeatable');
    });
  });

  describe('XP_THRESHOLDS', () => {
    test('has 100 pre-calculated entries', () => {
      expect(XP_THRESHOLDS).toHaveLength(100);
    });

    test('first entry is 0 (level 1)', () => {
      expect(XP_THRESHOLDS[0]).toBe(0);
    });

    test('values are monotonically increasing', () => {
      for (let i = 1; i < XP_THRESHOLDS.length; i++) {
        expect(XP_THRESHOLDS[i]).toBeGreaterThan(XP_THRESHOLDS[i - 1]);
      }
    });
  });
});

// ============================================
// SHARED CONSTANTS (re-exports)
// ============================================

describe('Shared constants module', () => {
  test('re-exports XP_VALUES from gamification', () => {
    expect(constants.XP_VALUES).toBe(gamification.XP_VALUES);
  });

  test('re-exports TIERS from gamification', () => {
    expect(constants.TIERS).toBe(gamification.TIERS);
  });

  test('re-exports calculateLevel function', () => {
    expect(constants.calculateLevel).toBe(gamification.calculateLevel);
  });

  test('re-exports getLevelTier function', () => {
    expect(constants.getLevelTier).toBe(gamification.getLevelTier);
  });

  test('exports timezone constants', () => {
    expect(constants.TIMEZONE).toBe('Asia/Singapore');
    expect(constants.DEFAULT_LOCALE).toBe('en-SG');
  });

  test('exports getSGDateString function', () => {
    expect(typeof constants.getSGDateString).toBe('function');
  });

  test('getSGDateString returns YYYY-MM-DD format', () => {
    const result = constants.getSGDateString(new Date('2025-06-15T12:00:00Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('exports formatDateSG function', () => {
    expect(typeof constants.formatDateSG).toBe('function');
  });
});
