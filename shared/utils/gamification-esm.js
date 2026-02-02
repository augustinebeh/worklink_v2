/**
 * ES6 Module export of gamification system
 * This file provides ES6 exports for frontend usage while maintaining
 * compatibility with the main CommonJS gamification module
 */

// Import from the main gamification module
const gamificationModule = require('./gamification');

// Re-export everything as ES6 named exports
export const XP_VALUES = gamificationModule.XP_VALUES;
export const XP_THRESHOLDS = gamificationModule.XP_THRESHOLDS;
export const TIERS = gamificationModule.TIERS;
export const LEVEL_TIERS = gamificationModule.LEVEL_TIERS;
export const LEVEL_TITLES = gamificationModule.LEVEL_TITLES;
export const ACHIEVEMENT_CATEGORIES = gamificationModule.ACHIEVEMENT_CATEGORIES;
export const QUEST_TYPES = gamificationModule.QUEST_TYPES;

// Functions
export const getXPForLevel = gamificationModule.getXPForLevel;
export const calculateLevel = gamificationModule.calculateLevel;
export const calculateLevelProgress = gamificationModule.calculateLevelProgress;
export const getXPToNextLevel = gamificationModule.getXPToNextLevel;
export const getXPForNextLevel = gamificationModule.getXPForNextLevel;
export const getLevelTier = gamificationModule.getLevelTier;
export const getTierInfo = gamificationModule.getTierInfo;
export const getTierBenefits = gamificationModule.getTierBenefits;
export const getLevelTitle = gamificationModule.getLevelTitle;
export const formatXP = gamificationModule.formatXP;
export const calculateJobXP = gamificationModule.calculateJobXP;
export const hasTierBenefit = gamificationModule.hasTierBenefit;
export const getJobVisibilityDelay = gamificationModule.getJobVisibilityDelay;

// Default export for convenience
export default gamificationModule;