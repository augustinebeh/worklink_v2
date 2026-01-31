/**
 * Input validation middleware for API endpoints
 */

const validators = {
  email: (email) => {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  phone: (phone) => {
    if (!phone) return true; // Phone is often optional
    // Singapore phone format: +65 XXXX XXXX or 9XXX XXXX or 8XXX XXXX or 6XXX XXXX
    const cleaned = phone.replace(/[\s-]/g, '');
    const regex = /^(\+65)?[689]\d{7}$/;
    return regex.test(cleaned);
  },

  name: (name) => {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
  },

  required: (value) => {
    return value !== undefined && value !== null && value !== '';
  },

  minLength: (value, min) => {
    return value && value.length >= min;
  },

  maxLength: (value, max) => {
    return !value || value.length <= max;
  },
};

/**
 * Create validation middleware from a schema
 * @param {Object} schema - Validation schema { field: { required, type, minLength, maxLength } }
 * @returns {Function} Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Check required
      if (rules.required && !validators.required(value)) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip other validations if value is empty and not required
      if (!validators.required(value)) continue;

      // Type-specific validation
      if (rules.type === 'email' && !validators.email(value)) {
        errors.push(`${field} must be a valid email address`);
      }

      if (rules.type === 'phone' && !validators.phone(value)) {
        errors.push(`${field} must be a valid phone number`);
      }

      if (rules.type === 'name' && !validators.name(value)) {
        errors.push(`${field} must be 2-100 characters`);
      }

      // Length validations
      if (rules.minLength && !validators.minLength(value, rules.minLength)) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && !validators.maxLength(value, rules.maxLength)) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors
      });
    }

    next();
  };
}

// Pre-built validation schemas for common use cases
const schemas = {
  registration: {
    name: { required: true, type: 'name' },
    email: { required: true, type: 'email' },
    phone: { type: 'phone' },
  },

  referralRegistration: {
    name: { required: true, type: 'name' },
    email: { required: true, type: 'email' },
    phone: { type: 'phone' },
    referral_code: { required: true, minLength: 4 },
  },
};

module.exports = { validate, validators, schemas };
