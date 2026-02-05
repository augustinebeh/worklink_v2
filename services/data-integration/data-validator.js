/**
 * Data Validator
 *
 * Provides comprehensive data validation and error handling
 * with GDPR/privacy compliance checks.
 */

const { db } = require('../../db');

class DataValidator {
  constructor() {
    this.validationRules = {
      candidateId: /^[A-Z]{3}_[A-Z0-9_]+$/,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[+]?[\d\s-()]{8,15}$/,
      nric: /^[STFG]\d{7}[A-Z]$/,
      amount: /^\d+(\.\d{2})?$/
    };

    // Define sensitive fields that require special handling
    this.sensitiveFields = [
      'nric_last4',
      'bank_account',
      'phone',
      'email',
      'address',
      'date_of_birth'
    ];

    // Define admin and support roles
    this.adminRoles = ['admin', 'super_admin'];
    this.supportRoles = ['support', 'customer_service'];
  }

  /**
   * Validate candidate ID format and existence
   * @param {string} candidateId - Candidate ID to validate
   * @returns {boolean} Validation result
   */
  validateCandidateId(candidateId) {
    try {
      if (!candidateId || typeof candidateId !== 'string') {
        return false;
      }

      // Check format
      if (!this.validationRules.candidateId.test(candidateId)) {
        return false;
      }

      // Check if candidate exists in database
      const exists = db.prepare('SELECT 1 FROM candidates WHERE id = ?').get(candidateId);
      return !!exists;

    } catch (error) {
      console.error('Candidate ID validation error:', error);
      return false;
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Validation result
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return this.validationRules.email.test(email.toLowerCase());
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} Validation result
   */
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    return this.validationRules.phone.test(phone);
  }

  /**
   * Validate amount (currency)
   * @param {number|string} amount - Amount to validate
   * @returns {boolean} Validation result
   */
  validateAmount(amount) {
    if (typeof amount === 'number') {
      return amount >= 0 && Number.isFinite(amount);
    }
    if (typeof amount === 'string') {
      return this.validationRules.amount.test(amount);
    }
    return false;
  }

  /**
   * Validate date format and reasonableness
   * @param {string} date - Date string to validate
   * @returns {boolean} Validation result
   */
  validateDate(date) {
    try {
      if (!date || typeof date !== 'string') return false;

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return false;

      // Check if date is reasonable (between 1900 and 2100)
      const year = parsedDate.getFullYear();
      return year >= 1900 && year <= 2100;

    } catch (error) {
      return false;
    }
  }

  /**
   * Validate user permissions for data access
   * @param {string} userId - User requesting data
   * @param {string} targetCandidateId - Target candidate
   * @param {string} dataType - Type of data being accessed
   * @returns {Object} Validation result with permissions
   */
  validateDataAccess(userId, targetCandidateId, dataType) {
    try {
      const result = {
        allowed: false,
        reason: 'Access denied',
        restrictions: [],
        auditRequired: false
      };

      // Validate IDs
      if (!this.validateCandidateId(userId) && !this.isSystemUser(userId)) {
        result.reason = 'Invalid user ID';
        return result;
      }

      if (!this.validateCandidateId(targetCandidateId)) {
        result.reason = 'Invalid target candidate ID';
        return result;
      }

      // Get user role and permissions
      const userRole = this.getUserRole(userId);
      const isSelfAccess = userId === targetCandidateId;

      // Check permissions based on role and data type
      if (this.isAdmin(userId)) {
        result.allowed = true;
        result.reason = 'Admin access granted';
        result.auditRequired = true;
      } else if (this.isSupportStaff(userId)) {
        result.allowed = this.validateSupportAccess(dataType);
        result.reason = result.allowed ? 'Support access granted' : 'Support access restricted for this data type';
        result.auditRequired = true;
        result.restrictions = this.getSupportRestrictions(dataType);
      } else if (isSelfAccess) {
        result.allowed = this.validateSelfAccess(dataType);
        result.reason = result.allowed ? 'Self access granted' : 'Self access restricted for this data type';
        result.restrictions = this.getSelfAccessRestrictions(dataType);
      } else {
        result.reason = 'Insufficient permissions';
      }

      // Add additional restrictions for sensitive data
      if (result.allowed && this.isSensitiveData(dataType)) {
        result.restrictions.push('Sensitive data - limited retention');
        result.auditRequired = true;
      }

      return result;

    } catch (error) {
      console.error('Data access validation error:', error);
      return {
        allowed: false,
        reason: 'Validation error',
        restrictions: [],
        auditRequired: true
      };
    }
  }

  /**
   * Validate and sanitize input data
   * @param {Object} data - Data to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validateInput(data, schema) {
    const result = {
      isValid: true,
      errors: [],
      sanitizedData: {},
      warnings: []
    };

    try {
      if (!data || typeof data !== 'object') {
        result.isValid = false;
        result.errors.push('Invalid input data format');
        return result;
      }

      // Validate each field according to schema
      for (const [field, rules] of Object.entries(schema)) {
        const value = data[field];
        const fieldResult = this.validateField(field, value, rules);

        if (!fieldResult.isValid) {
          result.isValid = false;
          result.errors.push(...fieldResult.errors);
        } else {
          result.sanitizedData[field] = fieldResult.sanitizedValue;
        }

        if (fieldResult.warnings.length > 0) {
          result.warnings.push(...fieldResult.warnings);
        }
      }

      // Check for unexpected fields
      const allowedFields = Object.keys(schema);
      const unexpectedFields = Object.keys(data).filter(field => !allowedFields.includes(field));

      if (unexpectedFields.length > 0) {
        result.warnings.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
      }

    } catch (error) {
      console.error('Input validation error:', error);
      result.isValid = false;
      result.errors.push('Validation process failed');
    }

    return result;
  }

  /**
   * Check GDPR compliance for data access
   * @param {string} candidateId - Candidate ID
   * @param {string} purpose - Purpose of data access
   * @param {Array} dataFields - Fields being accessed
   * @returns {Object} GDPR compliance check
   */
  checkGDPRCompliance(candidateId, purpose, dataFields) {
    try {
      const compliance = {
        compliant: true,
        issues: [],
        requirements: [],
        retention: null
      };

      // Check if candidate has given consent
      const consent = this.getConsentStatus(candidateId);
      if (!consent.hasValidConsent) {
        compliance.compliant = false;
        compliance.issues.push('No valid consent for data processing');
        compliance.requirements.push('Obtain explicit consent');
      }

      // Check if purpose is legitimate
      const legitimatePurposes = [
        'payment_processing',
        'job_matching',
        'customer_support',
        'legal_obligation',
        'contract_fulfillment'
      ];

      if (!legitimatePurposes.includes(purpose)) {
        compliance.compliant = false;
        compliance.issues.push('Invalid purpose for data processing');
      }

      // Check data minimization principle
      const excessiveFields = this.checkDataMinimization(dataFields, purpose);
      if (excessiveFields.length > 0) {
        compliance.issues.push(`Excessive data access: ${excessiveFields.join(', ')}`);
        compliance.requirements.push('Limit data access to necessary fields only');
      }

      // Set retention requirements
      compliance.retention = this.getRetentionRequirements(purpose, dataFields);

      // Check for special category data
      const specialCategoryFields = this.getSpecialCategoryFields(dataFields);
      if (specialCategoryFields.length > 0) {
        compliance.requirements.push('Additional safeguards required for special category data');
      }

      return compliance;

    } catch (error) {
      console.error('GDPR compliance check error:', error);
      return {
        compliant: false,
        issues: ['Compliance check failed'],
        requirements: ['Manual review required'],
        retention: null
      };
    }
  }

  // Helper methods

  /**
   * Validate individual field
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @param {Object} rules - Validation rules
   * @returns {Object} Field validation result
   */
  validateField(fieldName, value, rules) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedValue: value
    };

    try {
      // Check if field is required
      if (rules.required && (value === undefined || value === null || value === '')) {
        result.isValid = false;
        result.errors.push(`${fieldName} is required`);
        return result;
      }

      // Skip validation if field is optional and empty
      if (!rules.required && (value === undefined || value === null || value === '')) {
        result.sanitizedValue = null;
        return result;
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        result.isValid = false;
        result.errors.push(`${fieldName} must be of type ${rules.type}`);
        return result;
      }

      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        result.isValid = false;
        result.errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        result.isValid = false;
        result.errors.push(`${fieldName} must be no more than ${rules.maxLength} characters`);
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        result.isValid = false;
        result.errors.push(`${fieldName} format is invalid`);
      }

      // Custom validation
      if (rules.customValidator) {
        const customResult = rules.customValidator(value);
        if (!customResult.isValid) {
          result.isValid = false;
          result.errors.push(...customResult.errors);
        }
      }

      // Sanitization
      if (rules.sanitize && result.isValid) {
        result.sanitizedValue = this.sanitizeValue(value, rules.sanitize);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error for ${fieldName}`);
    }

    return result;
  }

  /**
   * Sanitize value based on sanitization rules
   * @param {any} value - Value to sanitize
   * @param {Array} sanitizeRules - Sanitization rules
   * @returns {any} Sanitized value
   */
  sanitizeValue(value, sanitizeRules) {
    let sanitized = value;

    sanitizeRules.forEach(rule => {
      switch (rule) {
        case 'trim':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.trim();
          }
          break;
        case 'lowercase':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.toLowerCase();
          }
          break;
        case 'uppercase':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.toUpperCase();
          }
          break;
        case 'removeSpaces':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.replace(/\s+/g, '');
          }
          break;
        case 'normalizeEmail':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.toLowerCase().trim();
          }
          break;
      }
    });

    return sanitized;
  }

  /**
   * Get user role from database
   * @param {string} userId - User ID
   * @returns {string} User role
   */
  getUserRole(userId) {
    try {
      // In a real implementation, this would query a users/roles table
      // For now, check if it's an admin based on ID pattern
      if (userId.startsWith('ADM_')) return 'admin';
      if (userId.startsWith('SUP_')) return 'support';
      return 'candidate';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Check if user is admin
   * @param {string} userId - User ID
   * @returns {boolean} Is admin
   */
  isAdmin(userId) {
    const role = this.getUserRole(userId);
    return this.adminRoles.includes(role);
  }

  /**
   * Check if user is support staff
   * @param {string} userId - User ID
   * @returns {boolean} Is support staff
   */
  isSupportStaff(userId) {
    const role = this.getUserRole(userId);
    return this.supportRoles.includes(role);
  }

  /**
   * Check if user is system user
   * @param {string} userId - User ID
   * @returns {boolean} Is system user
   */
  isSystemUser(userId) {
    return userId === 'SYSTEM' || userId.startsWith('SYS_');
  }

  /**
   * Validate support access for data type
   * @param {string} dataType - Data type
   * @returns {boolean} Access allowed
   */
  validateSupportAccess(dataType) {
    const allowedDataTypes = ['account', 'payment', 'jobs', 'interview'];
    return allowedDataTypes.includes(dataType);
  }

  /**
   * Validate self access for data type
   * @param {string} dataType - Data type
   * @returns {boolean} Access allowed
   */
  validateSelfAccess(dataType) {
    // Users can access all their own data
    return true;
  }

  /**
   * Get support access restrictions
   * @param {string} dataType - Data type
   * @returns {Array} Restrictions
   */
  getSupportRestrictions(dataType) {
    const restrictions = ['Business hours only', 'Audit logged'];

    if (dataType === 'payment') {
      restrictions.push('View only - no modifications');
    }

    return restrictions;
  }

  /**
   * Get self access restrictions
   * @param {string} dataType - Data type
   * @returns {Array} Restrictions
   */
  getSelfAccessRestrictions(dataType) {
    const restrictions = [];

    if (dataType === 'withdrawal') {
      restrictions.push('Rate limited');
    }

    return restrictions;
  }

  /**
   * Check if data type contains sensitive information
   * @param {string} dataType - Data type
   * @returns {boolean} Is sensitive
   */
  isSensitiveData(dataType) {
    const sensitiveTypes = ['payment', 'account', 'withdrawal'];
    return sensitiveTypes.includes(dataType);
  }

  /**
   * Get consent status for candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Object} Consent status
   */
  getConsentStatus(candidateId) {
    try {
      // In a real implementation, this would check a consent table
      // For now, assume consent is given when account is created
      const candidate = db.prepare('SELECT created_at FROM candidates WHERE id = ?').get(candidateId);

      return {
        hasValidConsent: !!candidate,
        consentDate: candidate?.created_at,
        consentType: 'registration',
        canRevoke: true
      };
    } catch (error) {
      return {
        hasValidConsent: false,
        consentDate: null,
        consentType: null,
        canRevoke: false
      };
    }
  }

  /**
   * Check data minimization compliance
   * @param {Array} dataFields - Requested data fields
   * @param {string} purpose - Purpose of access
   * @returns {Array} Excessive fields
   */
  checkDataMinimization(dataFields, purpose) {
    const purposeRequirements = {
      payment_processing: ['bank_details', 'payment_history', 'earnings'],
      job_matching: ['skills', 'preferences', 'availability', 'location'],
      customer_support: ['account_info', 'job_history', 'payment_status'],
      legal_obligation: ['all'], // Special case for legal requirements
      contract_fulfillment: ['all'] // Special case for contract requirements
    };

    const allowedFields = purposeRequirements[purpose] || [];

    if (allowedFields.includes('all')) {
      return []; // All fields allowed for this purpose
    }

    return dataFields.filter(field => !allowedFields.includes(field));
  }

  /**
   * Get retention requirements for data
   * @param {string} purpose - Purpose of access
   * @param {Array} dataFields - Data fields
   * @returns {Object} Retention requirements
   */
  getRetentionRequirements(purpose, dataFields) {
    const retentionPeriods = {
      payment_processing: '7 years',
      job_matching: '2 years after last activity',
      customer_support: '3 years',
      legal_obligation: 'As required by law',
      contract_fulfillment: 'Duration of contract + 6 years'
    };

    return {
      period: retentionPeriods[purpose] || '2 years',
      autoDelete: true,
      reviewRequired: this.getSpecialCategoryFields(dataFields).length > 0
    };
  }

  /**
   * Get special category data fields
   * @param {Array} dataFields - Data fields
   * @returns {Array} Special category fields
   */
  getSpecialCategoryFields(dataFields) {
    const specialCategories = [
      'date_of_birth', // Can reveal age discrimination
      'nric_last4', // Government identifier
      'bank_account' // Financial data
    ];

    return dataFields.filter(field => specialCategories.includes(field));
  }
}

module.exports = DataValidator;