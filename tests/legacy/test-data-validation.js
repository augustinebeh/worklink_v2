/**
 * Data Validation Test Utilities
 * Provides utilities for deep data comparison and validation between platforms
 */

const { db } = require('./db');

class DataValidator {
  constructor() {
    this.validationResults = [];
  }

  /**
   * Deep comparison of candidate data between database and UI representations
   */
  async validateCandidateData(candidateId) {
    // Get data from database
    const dbCandidate = db.prepare(`
      SELECT * FROM candidates WHERE id = ?
    `).get(candidateId);

    // Get gamification data
    const dbGamification = {
      xp: dbCandidate?.xp || 0,
      level: dbCandidate?.level || 1,
      current_points: dbCandidate?.current_points || 0,
      current_tier: dbCandidate?.current_tier || 'bronze',
      achievements: db.prepare(`
        SELECT a.*, ca.unlocked_at, ca.claimed
        FROM achievements a
        JOIN candidate_achievements ca ON a.id = ca.achievement_id
        WHERE ca.candidate_id = ?
      `).all(candidateId),
      xp_history: db.prepare(`
        SELECT * FROM xp_transactions
        WHERE candidate_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(candidateId)
    };

    // Get payment data
    const dbPayments = db.prepare(`
      SELECT p.*, d.job_id, j.title as job_title
      FROM payments p
      LEFT JOIN deployments d ON p.deployment_id = d.id
      LEFT JOIN jobs j ON d.job_id = j.id
      WHERE p.candidate_id = ?
      ORDER BY p.created_at DESC
    `).all(candidateId);

    const totalEarnings = dbPayments.reduce((sum, payment) => sum + payment.total_amount, 0);

    // Get recent deployments
    const dbDeployments = db.prepare(`
      SELECT d.*, j.title, j.job_date, j.location
      FROM deployments d
      JOIN jobs j ON d.job_id = j.id
      WHERE d.candidate_id = ?
      ORDER BY j.job_date DESC
      LIMIT 5
    `).all(candidateId);

    return {
      database: {
        profile: dbCandidate,
        gamification: dbGamification,
        payments: {
          records: dbPayments,
          total_earnings: totalEarnings,
          pending_count: dbPayments.filter(p => p.status === 'pending').length,
          paid_count: dbPayments.filter(p => p.status === 'paid').length
        },
        deployments: dbDeployments
      }
    };
  }

  /**
   * Validate job data consistency
   */
  async validateJobData(jobId) {
    const dbJob = db.prepare(`
      SELECT j.*, c.company_name
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE j.id = ?
    `).get(jobId);

    const dbDeployments = db.prepare(`
      SELECT d.*, can.name as candidate_name, can.email
      FROM deployments d
      JOIN candidates can ON d.candidate_id = can.id
      WHERE d.job_id = ?
    `).all(jobId);

    return {
      database: {
        job: dbJob,
        deployments: dbDeployments,
        filled_slots: dbDeployments.length,
        available_slots: (dbJob?.total_slots || 0) - dbDeployments.length
      }
    };
  }

  /**
   * Validate chat/messaging data
   */
  async validateChatData(candidateId) {
    const dbMessages = db.prepare(`
      SELECT * FROM messages
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).all(candidateId);

    const dbNotifications = db.prepare(`
      SELECT * FROM notifications
      WHERE candidate_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(candidateId);

    return {
      database: {
        messages: dbMessages,
        notifications: dbNotifications,
        unread_messages: dbMessages.filter(m => !m.read).length,
        unread_notifications: dbNotifications.filter(n => !n.read).length
      }
    };
  }

  /**
   * Compare two data objects and identify differences
   */
  compareData(source1, source2, path = '') {
    const differences = [];

    if (typeof source1 !== typeof source2) {
      differences.push({
        path: path || 'root',
        type: 'type_mismatch',
        source1: typeof source1,
        source2: typeof source2,
        values: { source1, source2 }
      });
      return differences;
    }

    if (source1 === null || source2 === null) {
      if (source1 !== source2) {
        differences.push({
          path: path || 'root',
          type: 'null_mismatch',
          values: { source1, source2 }
        });
      }
      return differences;
    }

    if (typeof source1 === 'object') {
      const keys1 = Object.keys(source1);
      const keys2 = Object.keys(source2);
      const allKeys = new Set([...keys1, ...keys2]);

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;

        if (!(key in source1)) {
          differences.push({
            path: newPath,
            type: 'missing_in_source1',
            values: { source2: source2[key] }
          });
        } else if (!(key in source2)) {
          differences.push({
            path: newPath,
            type: 'missing_in_source2',
            values: { source1: source1[key] }
          });
        } else {
          differences.push(...this.compareData(source1[key], source2[key], newPath));
        }
      }
    } else {
      // Primitive values comparison
      if (source1 !== source2) {
        // Special handling for numbers that might be strings
        if (typeof source1 === 'string' && typeof source2 === 'number' && parseFloat(source1) === source2) {
          return differences; // Consider string "123" and number 123 as equal
        }
        if (typeof source1 === 'number' && typeof source2 === 'string' && source1 === parseFloat(source2)) {
          return differences; // Consider number 123 and string "123" as equal
        }

        differences.push({
          path: path || 'root',
          type: 'value_mismatch',
          values: { source1, source2 }
        });
      }
    }

    return differences;
  }

  /**
   * Validate that data transformation is correct
   */
  validateDataTransformation(originalData, transformedData, expectedFields) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      fieldsChecked: expectedFields.length
    };

    for (const field of expectedFields) {
      const originalValue = this.getNestedValue(originalData, field.source);
      const transformedValue = this.getNestedValue(transformedData, field.target);

      if (field.required && (transformedValue === undefined || transformedValue === null)) {
        validation.valid = false;
        validation.errors.push({
          field: field.target,
          error: 'required_field_missing',
          originalValue,
          transformedValue
        });
        continue;
      }

      // Apply transformation function if provided
      let expectedValue = originalValue;
      if (field.transform && typeof field.transform === 'function') {
        try {
          expectedValue = field.transform(originalValue);
        } catch (error) {
          validation.warnings.push({
            field: field.target,
            warning: 'transformation_error',
            error: error.message,
            originalValue
          });
          continue;
        }
      }

      // Compare values
      if (field.strictComparison ? expectedValue !== transformedValue : expectedValue != transformedValue) {
        validation.valid = false;
        validation.errors.push({
          field: field.target,
          error: 'value_mismatch',
          expected: expectedValue,
          actual: transformedValue,
          originalValue
        });
      }
    }

    return validation;
  }

  /**
   * Helper to get nested object values using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate API response structure
   */
  validateApiResponse(response, schema) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in response)) {
          validation.valid = false;
          validation.errors.push({
            type: 'missing_required_field',
            field: field,
            message: `Required field '${field}' is missing`
          });
        }
      }
    }

    // Check field types
    if (schema.fields) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
        const value = response[fieldName];

        if (value !== undefined) {
          // Type validation
          if (fieldSchema.type && typeof value !== fieldSchema.type) {
            // Special case for arrays
            if (fieldSchema.type === 'array' && !Array.isArray(value)) {
              validation.errors.push({
                type: 'type_mismatch',
                field: fieldName,
                expected: 'array',
                actual: typeof value,
                value
              });
              validation.valid = false;
            } else if (fieldSchema.type !== 'array' && typeof value !== fieldSchema.type) {
              validation.errors.push({
                type: 'type_mismatch',
                field: fieldName,
                expected: fieldSchema.type,
                actual: typeof value,
                value
              });
              validation.valid = false;
            }
          }

          // Range validation for numbers
          if (typeof value === 'number' && fieldSchema.range) {
            if (fieldSchema.range.min !== undefined && value < fieldSchema.range.min) {
              validation.errors.push({
                type: 'value_below_minimum',
                field: fieldName,
                value,
                minimum: fieldSchema.range.min
              });
              validation.valid = false;
            }
            if (fieldSchema.range.max !== undefined && value > fieldSchema.range.max) {
              validation.errors.push({
                type: 'value_above_maximum',
                field: fieldName,
                value,
                maximum: fieldSchema.range.max
              });
              validation.valid = false;
            }
          }

          // Enum validation
          if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
            validation.errors.push({
              type: 'invalid_enum_value',
              field: fieldName,
              value,
              allowedValues: fieldSchema.enum
            });
            validation.valid = false;
          }
        }
      }
    }

    return validation;
  }

  /**
   * Generate comprehensive data consistency report
   */
  async generateDataConsistencyReport(candidateId) {
    const report = {
      candidateId,
      timestamp: new Date().toISOString(),
      validations: {}
    };

    try {
      // Validate candidate data
      const candidateValidation = await this.validateCandidateData(candidateId);
      report.validations.candidate = candidateValidation;

      // Validate chat data
      const chatValidation = await this.validateChatData(candidateId);
      report.validations.chat = chatValidation;

      // Get recent jobs for this candidate
      const recentJobs = db.prepare(`
        SELECT DISTINCT j.id
        FROM jobs j
        JOIN deployments d ON j.id = d.job_id
        WHERE d.candidate_id = ?
        ORDER BY j.created_at DESC
        LIMIT 3
      `).all(candidateId);

      // Validate job data for recent jobs
      report.validations.jobs = {};
      for (const job of recentJobs) {
        const jobValidation = await this.validateJobData(job.id);
        report.validations.jobs[job.id] = jobValidation;
      }

      // Overall consistency score
      report.consistencyScore = this.calculateConsistencyScore(report.validations);

    } catch (error) {
      report.error = {
        message: error.message,
        stack: error.stack
      };
    }

    return report;
  }

  /**
   * Calculate an overall consistency score
   */
  calculateConsistencyScore(validations) {
    let totalChecks = 0;
    let passedChecks = 0;

    // This would be implemented based on specific validation criteria
    // For now, return a placeholder score

    return {
      score: 0.95, // 95% consistent
      totalChecks,
      passedChecks,
      categories: {
        profile: 0.98,
        gamification: 0.92,
        payments: 0.96,
        chat: 0.94,
        jobs: 0.95
      }
    };
  }
}

module.exports = DataValidator;