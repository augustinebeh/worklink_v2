/**
 * Token Management Utilities
 * Functions for JWT token generation and verification
 */

// Import token functions from middleware
const { generateToken, generateAdminToken, authenticateToken } = require('../../../../../middleware/auth');

/**
 * Generate token for user (delegates to JWT-based generateToken)
 * Kept for backward compatibility - callers that used generateDemoToken
 * now get real JWT tokens instead of predictable demo tokens.
 */
function generateDemoToken(user) {
  return generateToken(user);
}

module.exports = {
  generateToken,
  generateAdminToken,
  authenticateToken,
  generateDemoToken
};