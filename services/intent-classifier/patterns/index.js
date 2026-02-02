/**
 * Pattern Matching System
 *
 * Centralized pattern management for intent classification.
 * Each category has its own specialized matcher with optimized patterns.
 */

const urgent = require('./urgent-patterns');
const payment = require('./payment-patterns');
const verification = require('./verification-patterns');
const interview = require('./interview-patterns');
const jobs = require('./job-patterns');
const technical = require('./technical-patterns');
const general = require('./general-patterns');

module.exports = {
  urgent,
  payment,
  verification,
  interview,
  jobs,
  technical,
  general
};