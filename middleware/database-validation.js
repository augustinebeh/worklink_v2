/**
 * Database validation middleware
 * Since SQLite doesn't support ALTER TABLE ADD CONSTRAINT for CHECK constraints,
 * we implement validation at the application level
 */

const logger = require('../utils/logger');

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Validate job data
 */
function validateJob(data) {
  const errors = [];

  // Rate validation
  if (data.charge_rate !== undefined) {
    if (typeof data.charge_rate !== 'number' || data.charge_rate <= 0) {
      errors.push('charge_rate must be a positive number');
    }
  }

  if (data.pay_rate !== undefined) {
    if (typeof data.pay_rate !== 'number' || data.pay_rate <= 0) {
      errors.push('pay_rate must be a positive number');
    }
  }

  // Markup validation - charge rate should be >= pay rate for profitability
  if (data.charge_rate !== undefined && data.pay_rate !== undefined) {
    if (data.charge_rate < data.pay_rate) {
      errors.push('charge_rate must be greater than or equal to pay_rate for profitability');
    }
  }

  // Slots validation
  if (data.total_slots !== undefined) {
    if (!Number.isInteger(data.total_slots) || data.total_slots <= 0) {
      errors.push('total_slots must be a positive integer');
    }
  }

  if (data.filled_slots !== undefined) {
    if (!Number.isInteger(data.filled_slots) || data.filled_slots < 0) {
      errors.push('filled_slots must be a non-negative integer');
    }
  }

  if (data.total_slots !== undefined && data.filled_slots !== undefined) {
    if (data.filled_slots > data.total_slots) {
      errors.push('filled_slots cannot exceed total_slots');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Job validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Validate deployment data
 */
function validateDeployment(data) {
  const errors = [];

  // Rate validation
  if (data.charge_rate !== undefined && data.charge_rate !== null) {
    if (typeof data.charge_rate !== 'number' || data.charge_rate <= 0) {
      errors.push('charge_rate must be a positive number');
    }
  }

  if (data.pay_rate !== undefined && data.pay_rate !== null) {
    if (typeof data.pay_rate !== 'number' || data.pay_rate <= 0) {
      errors.push('pay_rate must be a positive number');
    }
  }

  // Hours validation
  if (data.hours_worked !== undefined && data.hours_worked !== null) {
    if (typeof data.hours_worked !== 'number' || data.hours_worked < 0) {
      errors.push('hours_worked must be a non-negative number');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Deployment validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Validate payment data
 */
function validatePayment(data) {
  const errors = [];

  // Amount validation
  if (data.base_amount !== undefined) {
    if (typeof data.base_amount !== 'number' || data.base_amount < 0) {
      errors.push('base_amount must be a non-negative number');
    }
  }

  if (data.incentive_amount !== undefined) {
    if (typeof data.incentive_amount !== 'number' || data.incentive_amount < 0) {
      errors.push('incentive_amount must be a non-negative number');
    }
  }

  if (data.total_amount !== undefined) {
    if (typeof data.total_amount !== 'number' || data.total_amount < 0) {
      errors.push('total_amount must be a non-negative number');
    }
  }

  // Total amount should be >= base amount
  if (data.total_amount !== undefined && data.base_amount !== undefined) {
    if (data.total_amount < data.base_amount) {
      errors.push('total_amount must be greater than or equal to base_amount');
    }
  }

  // Hours validation
  if (data.hours_worked !== undefined) {
    if (typeof data.hours_worked !== 'number' || data.hours_worked <= 0) {
      errors.push('hours_worked must be a positive number');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Payment validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Validate candidate data
 */
function validateCandidate(data) {
  const errors = [];

  // XP validation
  if (data.xp !== undefined) {
    if (typeof data.xp !== 'number' || data.xp < 0) {
      errors.push('xp must be a non-negative number');
    }
  }

  if (data.lifetime_xp !== undefined) {
    if (typeof data.lifetime_xp !== 'number' || data.lifetime_xp < 0) {
      errors.push('lifetime_xp must be a non-negative number');
    }
  }

  // Level validation
  if (data.level !== undefined) {
    if (!Number.isInteger(data.level) || data.level < 1) {
      errors.push('level must be a positive integer (minimum 1)');
    }
  }

  // Rating validation
  if (data.rating !== undefined && data.rating !== null) {
    if (typeof data.rating !== 'number' || data.rating < 1.0 || data.rating > 5.0) {
      errors.push('rating must be between 1.0 and 5.0');
    }
  }

  // Earnings validation
  if (data.total_earnings !== undefined) {
    if (typeof data.total_earnings !== 'number' || data.total_earnings < 0) {
      errors.push('total_earnings must be a non-negative number');
    }
  }

  // Email validation (basic)
  if (data.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('email must be a valid email address');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Candidate validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Validate XP transaction data
 */
function validateXPTransaction(data) {
  const errors = [];

  // Amount validation based on transaction type
  if (data.transaction_type && data.amount !== undefined) {
    switch (data.transaction_type) {
      case 'earned':
        if (typeof data.amount !== 'number' || data.amount <= 0) {
          errors.push('earned XP amount must be positive');
        }
        break;
      case 'spent':
        if (typeof data.amount !== 'number' || data.amount >= 0) {
          errors.push('spent XP amount must be negative');
        }
        break;
      case 'adjusted':
        if (typeof data.amount !== 'number' || data.amount === 0) {
          errors.push('adjusted XP amount must be non-zero');
        }
        break;
      default:
        errors.push('invalid transaction_type');
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`XP transaction validation failed: ${errors.join(', ')}`);
  }
}

/**
 * Express middleware factory for validating request data
 */
function createValidationMiddleware(validatorType) {
  return (req, res, next) => {
    try {
      const data = req.body;

      switch (validatorType) {
        case 'job':
          validateJob(data);
          break;
        case 'deployment':
          validateDeployment(data);
          break;
        case 'payment':
          validatePayment(data);
          break;
        case 'candidate':
          validateCandidate(data);
          break;
        case 'xp-transaction':
          validateXPTransaction(data);
          break;
        default:
          throw new Error(`Unknown validator type: ${validatorType}`);
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        logger.warn('Validation failed', {
          endpoint: req.path,
          error: error.message,
          data: req.body
        });

        return res.status(400).json({
          success: false,
          error: error.message,
          field: error.field
        });
      }

      // Re-throw unexpected errors
      throw error;
    }
  };
}

module.exports = {
  ValidationError,
  validateJob,
  validateDeployment,
  validatePayment,
  validateCandidate,
  validateXPTransaction,
  createValidationMiddleware
};