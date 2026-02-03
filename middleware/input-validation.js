/**
 * Comprehensive input validation middleware
 * Handles format validation, sanitization, length limits, and security checks
 */

const validator = require('validator');
const logger = require('../utils/logger');

/**
 * Input validation error class
 */
class InputValidationError extends Error {
  constructor(message, field, code = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'InputValidationError';
    this.field = field;
    this.code = code;
  }
}

/**
 * Sanitize string input
 */
function sanitizeString(str, maxLength = 1000) {
  if (typeof str !== 'string') return str;

  // Trim whitespace
  str = str.trim();

  // Limit length
  if (str.length > maxLength) {
    throw new InputValidationError(`String too long (max ${maxLength} characters)`, null, 'LENGTH_EXCEEDED');
  }

  // Remove null bytes and other dangerous characters
  str = str.replace(/\0/g, '');

  return str;
}

/**
 * Validate and sanitize email
 */
function validateEmail(email) {
  if (!email) return email;

  email = sanitizeString(email, 254); // RFC 5321 limit

  if (!validator.isEmail(email)) {
    throw new InputValidationError('Invalid email format', 'email');
  }

  return validator.normalizeEmail(email);
}

/**
 * Validate phone number
 */
function validatePhone(phone) {
  if (!phone) return phone;

  phone = sanitizeString(phone, 20);

  // Allow various international formats
  if (!validator.isMobilePhone(phone, 'any', { strictMode: false })) {
    throw new InputValidationError('Invalid phone number format', 'phone');
  }

  return phone;
}

/**
 * Validate URL
 */
function validateURL(url, options = {}) {
  if (!url) return url;

  url = sanitizeString(url, 2048); // Browser URL limit

  const validationOptions = {
    protocols: ['http', 'https'],
    require_protocol: true,
    ...options
  };

  if (!validator.isURL(url, validationOptions)) {
    throw new InputValidationError('Invalid URL format', 'url');
  }

  return url;
}

/**
 * Validate date string
 */
function validateDate(dateStr, field = 'date') {
  if (!dateStr) return dateStr;

  if (!validator.isISO8601(dateStr)) {
    throw new InputValidationError('Invalid date format (use ISO 8601)', field);
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new InputValidationError('Invalid date', field);
  }

  return dateStr;
}

/**
 * Validate numeric input
 */
function validateNumber(num, field, options = {}) {
  if (num === undefined || num === null) return num;

  const {
    min = Number.NEGATIVE_INFINITY,
    max = Number.POSITIVE_INFINITY,
    integer = false
  } = options;

  if (typeof num !== 'number' || isNaN(num)) {
    throw new InputValidationError('Must be a number', field);
  }

  if (integer && !Number.isInteger(num)) {
    throw new InputValidationError('Must be an integer', field);
  }

  if (num < min) {
    throw new InputValidationError(`Must be at least ${min}`, field);
  }

  if (num > max) {
    throw new InputValidationError(`Must be at most ${max}`, field);
  }

  return num;
}

/**
 * Validate JSON string
 */
function validateJSON(jsonStr, field = 'json') {
  if (!jsonStr) return jsonStr;

  if (typeof jsonStr !== 'string') {
    throw new InputValidationError('JSON must be a string', field);
  }

  try {
    JSON.parse(jsonStr);
  } catch (error) {
    throw new InputValidationError('Invalid JSON format', field);
  }

  return jsonStr;
}

/**
 * Comprehensive validation schemas
 */
const schemas = {
  job: {
    title: (val) => sanitizeString(val, 200),
    description: (val) => sanitizeString(val, 2000),
    location: (val) => sanitizeString(val, 200),
    job_date: (val) => validateDate(val, 'job_date'),
    charge_rate: (val) => validateNumber(val, 'charge_rate', { min: 0.01, max: 10000 }),
    pay_rate: (val) => validateNumber(val, 'pay_rate', { min: 0.01, max: 10000 }),
    total_slots: (val) => validateNumber(val, 'total_slots', { min: 1, max: 1000, integer: true }),
    filled_slots: (val) => validateNumber(val, 'filled_slots', { min: 0, integer: true }),
    xp_bonus: (val) => validateNumber(val, 'xp_bonus', { min: 0, max: 10000, integer: true }),
    required_skills: (val) => validateJSON(val, 'required_skills')
  },

  candidate: {
    name: (val) => sanitizeString(val, 100),
    email: (val) => validateEmail(val),
    phone: (val) => validatePhone(val),
    date_of_birth: (val) => validateDate(val, 'date_of_birth'),
    address: (val) => sanitizeString(val, 500),
    bank_name: (val) => sanitizeString(val, 100),
    bank_account: (val) => sanitizeString(val, 50),
    profile_photo: (val) => validateURL(val),
    xp: (val) => validateNumber(val, 'xp', { min: 0, max: 1000000, integer: true }),
    level: (val) => validateNumber(val, 'level', { min: 1, max: 100, integer: true }),
    rating: (val) => validateNumber(val, 'rating', { min: 1.0, max: 5.0 }),
    certifications: (val) => validateJSON(val, 'certifications'),
    skills: (val) => validateJSON(val, 'skills'),
    preferred_locations: (val) => validateJSON(val, 'preferred_locations')
  },

  payment: {
    base_amount: (val) => validateNumber(val, 'base_amount', { min: 0, max: 100000 }),
    incentive_amount: (val) => validateNumber(val, 'incentive_amount', { min: 0, max: 100000 }),
    total_amount: (val) => validateNumber(val, 'total_amount', { min: 0, max: 100000 }),
    hours_worked: (val) => validateNumber(val, 'hours_worked', { min: 0, max: 24 }),
    transaction_id: (val) => sanitizeString(val, 100),
    notes: (val) => sanitizeString(val, 1000)
  },

  client: {
    company_name: (val) => sanitizeString(val, 200),
    UEN: (val) => sanitizeString(val, 20),
    industry: (val) => sanitizeString(val, 100),
    contact_name: (val) => sanitizeString(val, 100),
    contact_email: (val) => validateEmail(val),
    contact_phone: (val) => validatePhone(val),
    logo_url: (val) => validateURL(val),
    notes: (val) => sanitizeString(val, 2000)
  },

  message: {
    content: (val) => sanitizeString(val, 5000),
    channel: (val) => {
      const validChannels = ['in-app', 'whatsapp', 'telegram'];
      if (!validChannels.includes(val)) {
        throw new InputValidationError('Invalid channel', 'channel');
      }
      return val;
    }
  },

  notification: {
    title: (val) => sanitizeString(val, 200),
    message: (val) => sanitizeString(val, 1000),
    type: (val) => sanitizeString(val, 50)
  }
};

/**
 * Create validation middleware for a specific schema
 */
function createInputValidationMiddleware(schemaName, options = {}) {
  const { optional = [], partial = false } = options;

  return (req, res, next) => {
    try {
      const schema = schemas[schemaName];
      if (!schema) {
        throw new Error(`Unknown schema: ${schemaName}`);
      }

      const data = req.body;
      const validatedData = {};

      // Validate each field according to schema
      for (const [field, validator] of Object.entries(schema)) {
        const value = data[field];

        // Skip undefined values for partial updates
        if (value === undefined && (partial || optional.includes(field))) {
          continue;
        }

        try {
          validatedData[field] = validator(value);
        } catch (error) {
          if (error instanceof InputValidationError) {
            error.field = field;
            throw error;
          }
          throw new InputValidationError(`Validation failed for ${field}: ${error.message}`, field);
        }
      }

      // Replace request body with validated data
      req.body = { ...req.body, ...validatedData };

      next();
    } catch (error) {
      if (error instanceof InputValidationError) {
        logger.warn('Input validation failed', {
          endpoint: req.path,
          field: error.field,
          error: error.message,
          data: req.body
        });

        return res.status(400).json({
          success: false,
          error: error.message,
          field: error.field,
          code: error.code
        });
      }

      // Re-throw unexpected errors
      throw error;
    }
  };
}

/**
 * General purpose input sanitization middleware
 */
function sanitizeInput(req, res, next) {
  try {
    const sanitizeValue = (value, key) => {
      if (typeof value === 'string') {
        // OAuth credentials and tokens need larger limits
        const isOAuthField = key && ['credential', 'token', 'access_token', 'id_token', 'refresh_token'].includes(key.toLowerCase());
        const maxLength = isOAuthField ? 5000 : 1000;
        return sanitizeString(value, maxLength);
      }
      if (typeof value === 'object' && value !== null) {
        const sanitized = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val, key);
        }
        return sanitized;
      }
      return value;
    };

    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    if (req.query) {
      req.query = sanitizeValue(req.query);
    }

    next();
  } catch (error) {
    if (error instanceof InputValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }
    throw error;
  }
}

/**
 * Rate limiting validation - prevent too many requests
 */
function validateRequestFrequency(windowMs = 60000, maxRequests = 100) {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || 'anonymous';
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, { count: 0, resetTime: now + windowMs });
    }

    const userRequests = requests.get(key);

    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + windowMs;
    }

    if (userRequests.count >= maxRequests) {
      logger.warn('Request frequency limit exceeded', {
        ip: key,
        endpoint: req.path,
        count: userRequests.count
      });

      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    userRequests.count++;
    next();
  };
}

module.exports = {
  InputValidationError,
  sanitizeString,
  validateEmail,
  validatePhone,
  validateURL,
  validateDate,
  validateNumber,
  validateJSON,
  schemas,
  createInputValidationMiddleware,
  sanitizeInput,
  validateRequestFrequency
};