/**
 * AI Automation Routes - Backward Compatibility Wrapper
 * 
 * This file maintains backward compatibility by delegating to the new modular structure.
 * The original 2,421-line monolithic file has been refactored into 12 focused modules.
 * 
 * Old structure: Single 2,421-line file
 * New structure: 12 modular files (~3,279 lines with improvements)
 * 
 * All routes remain accessible at the same paths.
 * No breaking changes to the API.
 * 
 * To use the new modular structure directly:
 * const aiAutomationRoutes = require('./ai-automation');
 * 
 * Original file preserved as: ai-automation.js.backup
 * 
 * Refactored: February 4, 2026
 */

// Simply delegate all requests to the new modular structure
module.exports = require('./ai-automation');
