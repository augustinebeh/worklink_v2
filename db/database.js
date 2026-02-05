/**
 * Database Module - Backward Compatibility Wrapper
 * 
 * This file maintains backward compatibility by delegating to the new modular structure.
 * Original 1,962-line monolithic file has been refactored into 15 focused modules.
 * 
 * Old structure: Single 1,962-line file
 * New structure: 15 modular files (~1,927 lines)
 * 
 * All exports remain accessible at the same paths.
 * No breaking changes to the API.
 * 
 * To use the new modular structure directly:
 * const database = require('./index'); // or require('./db')
 * 
 * Original file preserved as: database.js.backup
 * 
 * Refactored: February 4, 2026
 */

// Simply delegate all requests to the new modular structure
module.exports = require('./database/index.js');
