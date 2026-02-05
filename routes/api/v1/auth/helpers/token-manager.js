/**
 * Token Management Utilities
 * Functions for JWT token generation and verification
 */

// Import token functions from middleware
const { generateToken, generateAdminToken, authenticateToken } = require('../../../../../middleware/auth');

/**
 * Generate a demo token for development purposes
 * @param {object} user - User object
 * @returns {string} Demo token
 */
function generateDemoToken(user) {
  return `demo-token-${user.id}`;
}

module.exports = {
  generateToken,
  generateAdminToken,
  authenticateToken,
  generateDemoToken
};