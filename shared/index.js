/**
 * WorkLink Shared Package
 * Common utilities shared across Worker, Admin, and Backend
 *
 * Note: This file uses CommonJS for Node.js backend compatibility.
 * Frontend apps should import directly from specific files.
 */

const gamification = require('./utils/gamification');
const logger = require('./utils/logger');

module.exports = {
  ...gamification,
  logger,
};
