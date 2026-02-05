/**
 * Auth Validation Schemas and Functions
 * Input validation for authentication endpoints
 */

const { validate, schemas } = require('../../../../../middleware/validation');

// Re-export existing schemas for auth use
module.exports = {
  validate,
  schemas,

  // Additional auth-specific validation functions can be added here
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  validatePhone: (phone) => {
    // Basic phone validation - can be enhanced based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
};