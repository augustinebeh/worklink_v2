/**
 * Data Validation and Deduplication Utility
 * Ensures scraped tender data is clean, valid, and unique
 */

const crypto = require('crypto');

class DataValidator {
  constructor() {
    this.seenTenders = new Map();
    this.validationRules = this.initializeValidationRules();
    this.cleaningRules = this.initializeCleaningRules();
  }

  initializeValidationRules() {
    return {
      title: {
        required: true,
        minLength: 10,
        maxLength: 200,
        pattern: /^[a-zA-Z0-9\s\-.,()\/&]+$/,
        invalidPatterns: [
          /^test/i,
          /lorem\s+ipsum/i,
          /sample\s+tender/i,
          /^undefined$/i,
          /^null$/i
        ]
      },
      agency: {
        required: true,
        minLength: 2,
        maxLength: 50,
        validAgencies: ['MOE', 'MOH', 'MOM', 'MCCY', 'MND', 'GovTech', 'SLA', 'HDB', 'NEA', 'NParks', 'IRAS', 'CPF', 'PUB'],
        fallbackPattern: /^[A-Z]{2,4}$/
      },
      estimated_value: {
        required: true,
        min: 50000,
        max: 10000000,
        type: 'number'
      },
      closing_date: {
        required: true,
        type: 'date',
        minDate: new Date(),
        maxDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      },
      manpower_required: {
        required: true,
        min: 1,
        max: 500,
        type: 'number'
      },
      duration_months: {
        required: true,
        min: 1,
        max: 60,
        type: 'number'
      },
      estimated_charge_rate: {
        required: true,
        min: 12,
        max: 100,
        type: 'number'
      },
      estimated_pay_rate: {
        required: true,
        min: 10,
        max: 80,
        type: 'number'
      }
    };
  }

  initializeCleaningRules() {
    return {
      title: [
        { pattern: /\s+/g, replacement: ' ' },
        { pattern: /[^\w\s\-.,()\/&]/g, replacement: '' },
        { pattern: /^\s+|\s+$/g, replacement: '' }
      ],
      agency: [
        { pattern: /\s+/g, replacement: ' ' },
        { pattern: /[^a-zA-Z0-9\s]/g, replacement: '' },
        { pattern: /^\s+|\s+$/g, replacement: '' }
      ]
    };
  }

  validateTender(tender, options = {}) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      cleaned: { ...tender },
      confidence: 100
    };

    try {
      // Clean the data first
      this.cleanTenderData(result.cleaned);

      // Validate each field
      for (const [field, rules] of Object.entries(this.validationRules)) {
        const value = result.cleaned[field];
        const fieldValidation = this.validateField(field, value, rules);

        if (!fieldValidation.isValid) {
          result.isValid = false;
          result.errors.push(...fieldValidation.errors);
        }

        result.warnings.push(...fieldValidation.warnings);
        result.confidence -= fieldValidation.confidencePenalty || 0;
      }

      // Cross-field validation
      const crossValidation = this.validateCrossFields(result.cleaned);
      if (!crossValidation.isValid) {
        result.isValid = false;
        result.errors.push(...crossValidation.errors);
      }
      result.warnings.push(...crossValidation.warnings);
      result.confidence -= crossValidation.confidencePenalty || 0;

      // Business logic validation
      const businessValidation = this.validateBusinessLogic(result.cleaned);
      result.warnings.push(...businessValidation.warnings);
      result.confidence -= businessValidation.confidencePenalty || 0;

      // Ensure confidence doesn't go below 0
      result.confidence = Math.max(0, result.confidence);

      // Add data quality score
      result.dataQualityScore = this.calculateDataQualityScore(result.cleaned, result.errors, result.warnings);

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error.message}`);
      result.confidence = 0;
    }

    return result;
  }

  validateField(fieldName, value, rules) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      confidencePenalty: 0
    };

    // Check if required field is present
    if (rules.required && (value === null || value === undefined || value === '')) {
      result.isValid = false;
      result.errors.push(`${fieldName} is required but missing`);
      return result;
    }

    if (value === null || value === undefined || value === '') {
      return result; // Skip validation for optional empty fields
    }

    // Type validation
    if (rules.type === 'number' && (typeof value !== 'number' || isNaN(value))) {
      result.isValid = false;
      result.errors.push(`${fieldName} must be a valid number`);
      return result;
    }

    if (rules.type === 'date') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        result.isValid = false;
        result.errors.push(`${fieldName} must be a valid date`);
        return result;
      }

      // Date range validation
      if (rules.minDate && date < rules.minDate) {
        result.isValid = false;
        result.errors.push(`${fieldName} cannot be in the past`);
      }

      if (rules.maxDate && date > rules.maxDate) {
        result.warnings.push(`${fieldName} is unusually far in the future`);
        result.confidencePenalty = 10;
      }

      return result;
    }

    const stringValue = String(value);

    // Length validation
    if (rules.minLength && stringValue.length < rules.minLength) {
      result.isValid = false;
      result.errors.push(`${fieldName} is too short (minimum ${rules.minLength} characters)`);
    }

    if (rules.maxLength && stringValue.length > rules.maxLength) {
      result.isValid = false;
      result.errors.push(`${fieldName} is too long (maximum ${rules.maxLength} characters)`);
    }

    // Numeric range validation
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        result.isValid = false;
        result.errors.push(`${fieldName} is below minimum value (${rules.min})`);
      }

      if (rules.max !== undefined && value > rules.max) {
        result.isValid = false;
        result.errors.push(`${fieldName} exceeds maximum value (${rules.max})`);
      }
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      result.warnings.push(`${fieldName} contains unusual characters`);
      result.confidencePenalty = 15;
    }

    // Invalid pattern checks
    if (rules.invalidPatterns) {
      for (const invalidPattern of rules.invalidPatterns) {
        if (invalidPattern.test(stringValue)) {
          result.isValid = false;
          result.errors.push(`${fieldName} contains invalid test/placeholder data`);
          break;
        }
      }
    }

    // Valid agencies check
    if (fieldName === 'agency' && rules.validAgencies) {
      const upperValue = stringValue.toUpperCase();
      const isValidAgency = rules.validAgencies.some(agency =>
        upperValue.includes(agency) || upperValue === agency
      );

      if (!isValidAgency && !rules.fallbackPattern.test(upperValue)) {
        result.warnings.push(`Agency "${stringValue}" is not in known agencies list`);
        result.confidencePenalty = 20;
      }
    }

    return result;
  }

  validateCrossFields(tender) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      confidencePenalty: 0
    };

    try {
      // Pay rate should be less than charge rate
      if (tender.estimated_pay_rate && tender.estimated_charge_rate) {
        if (tender.estimated_pay_rate >= tender.estimated_charge_rate) {
          result.errors.push('Pay rate cannot be equal to or higher than charge rate');
          result.isValid = false;
        }

        // Check for reasonable margin
        const margin = (tender.estimated_charge_rate - tender.estimated_pay_rate) / tender.estimated_charge_rate * 100;
        if (margin < 15) {
          result.warnings.push('Profit margin appears very low (< 15%)');
          result.confidencePenalty = 10;
        } else if (margin > 50) {
          result.warnings.push('Profit margin appears unusually high (> 50%)');
          result.confidencePenalty = 10;
        }
      }

      // Monthly revenue consistency check
      if (tender.estimated_monthly_revenue && tender.manpower_required && tender.estimated_charge_rate) {
        const calculatedRevenue = tender.manpower_required * tender.estimated_charge_rate * 160;
        const difference = Math.abs(tender.estimated_monthly_revenue - calculatedRevenue) / calculatedRevenue;

        if (difference > 0.2) { // 20% difference threshold
          result.warnings.push('Monthly revenue calculation appears inconsistent');
          result.confidencePenalty = 15;
        }
      }

      // Total value vs duration check
      if (tender.estimated_value && tender.estimated_monthly_revenue && tender.duration_months) {
        const expectedTotalValue = tender.estimated_monthly_revenue * tender.duration_months;
        const difference = Math.abs(tender.estimated_value - expectedTotalValue) / expectedTotalValue;

        if (difference > 0.3) {
          result.warnings.push('Total tender value seems inconsistent with monthly revenue and duration');
          result.confidencePenalty = 20;
        }
      }

      // Manpower vs value check
      if (tender.manpower_required && tender.estimated_value && tender.duration_months) {
        const valuePerPersonMonth = tender.estimated_value / (tender.manpower_required * tender.duration_months);
        if (valuePerPersonMonth < 2000) {
          result.warnings.push('Value per person-month appears unusually low');
          result.confidencePenalty = 15;
        } else if (valuePerPersonMonth > 8000) {
          result.warnings.push('Value per person-month appears unusually high');
          result.confidencePenalty = 10;
        }
      }

    } catch (error) {
      result.warnings.push(`Cross-field validation error: ${error.message}`);
    }

    return result;
  }

  validateBusinessLogic(tender) {
    const result = {
      warnings: [],
      confidencePenalty: 0
    };

    try {
      // Check for weekend/holiday closing dates
      const closingDate = new Date(tender.closing_date);
      const dayOfWeek = closingDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        result.warnings.push('Tender closes on weekend - unusual for government tenders');
        result.confidencePenalty = 5;
      }

      // Check for very short bidding periods
      const daysToClose = (closingDate - new Date()) / (1000 * 60 * 60 * 24);
      if (daysToClose < 7) {
        result.warnings.push('Very short bidding period (< 7 days)');
        result.confidencePenalty = 10;
      } else if (daysToClose > 90) {
        result.warnings.push('Unusually long bidding period (> 90 days)');
        result.confidencePenalty = 5;
      }

      // Category-specific validations
      const category = tender.category?.toLowerCase() || '';
      const title = tender.title?.toLowerCase() || '';

      if (category.includes('event') || title.includes('event')) {
        if (tender.duration_months > 6) {
          result.warnings.push('Event tender with unusually long duration');
          result.confidencePenalty = 10;
        }
      }

      if (category.includes('security') || title.includes('security')) {
        if (tender.estimated_charge_rate < 15) {
          result.warnings.push('Security tender with unusually low charge rate');
          result.confidencePenalty = 15;
        }
      }

    } catch (error) {
      result.warnings.push(`Business logic validation error: ${error.message}`);
    }

    return result;
  }

  cleanTenderData(tender) {
    for (const [field, rules] of Object.entries(this.cleaningRules)) {
      if (tender[field] && typeof tender[field] === 'string') {
        let cleanedValue = tender[field];
        for (const rule of rules) {
          cleanedValue = cleanedValue.replace(rule.pattern, rule.replacement);
        }
        tender[field] = cleanedValue;
      }
    }

    // Normalize specific fields
    if (tender.agency) {
      tender.agency = this.normalizeAgency(tender.agency);
    }

    if (tender.location) {
      tender.location = this.normalizeLocation(tender.location);
    }

    // Ensure numeric fields are properly typed
    const numericFields = ['estimated_value', 'manpower_required', 'duration_months',
                          'estimated_charge_rate', 'estimated_pay_rate', 'estimated_monthly_revenue'];

    for (const field of numericFields) {
      if (tender[field] !== null && tender[field] !== undefined) {
        const num = Number(tender[field]);
        tender[field] = isNaN(num) ? null : num;
      }
    }

    return tender;
  }

  normalizeAgency(agency) {
    const knownAgencies = {
      'MINISTRY OF EDUCATION': 'MOE',
      'MINISTRY OF HEALTH': 'MOH',
      'MINISTRY OF MANPOWER': 'MOM',
      'MINISTRY OF CULTURE, COMMUNITY AND YOUTH': 'MCCY',
      'MINISTRY OF NATIONAL DEVELOPMENT': 'MND',
      'GOVERNMENT TECHNOLOGY AGENCY': 'GovTech',
      'HOUSING AND DEVELOPMENT BOARD': 'HDB',
      'NATIONAL ENVIRONMENT AGENCY': 'NEA',
      'NATIONAL PARKS BOARD': 'NParks',
      'INLAND REVENUE AUTHORITY': 'IRAS',
      'CENTRAL PROVIDENT FUND BOARD': 'CPF',
      'PUBLIC UTILITIES BOARD': 'PUB'
    };

    const upperAgency = agency.toUpperCase().trim();

    // Check for exact matches first
    for (const [fullName, acronym] of Object.entries(knownAgencies)) {
      if (upperAgency.includes(fullName)) {
        return acronym;
      }
    }

    // Return original if no match found
    return agency.trim();
  }

  normalizeLocation(location) {
    const locationMappings = {
      'CENTRAL BUSINESS DISTRICT': 'CBD',
      'MARINA BAY FINANCIAL CENTRE': 'Marina Bay',
      'JURONG INDUSTRIAL ESTATE': 'Jurong',
      'TAMPINES REGIONAL CENTRE': 'Tampines',
      'WOODLANDS REGIONAL CENTRE': 'Woodlands'
    };

    const upperLocation = location.toUpperCase().trim();

    for (const [fullName, shortName] of Object.entries(locationMappings)) {
      if (upperLocation.includes(fullName)) {
        return shortName;
      }
    }

    return location.trim();
  }

  calculateDataQualityScore(tender, errors, warnings) {
    let score = 100;

    // Deduct for errors
    score -= errors.length * 20;

    // Deduct for warnings
    score -= warnings.length * 5;

    // Bonus for completeness
    const requiredFields = ['title', 'agency', 'estimated_value', 'closing_date', 'manpower_required'];
    const completedFields = requiredFields.filter(field =>
      tender[field] !== null && tender[field] !== undefined && tender[field] !== '').length;

    const completenessBonus = (completedFields / requiredFields.length) * 20;
    score += completenessBonus;

    // Bonus for having optional fields
    const optionalFields = ['location', 'category', 'source_url'];
    const optionalFieldsPresent = optionalFields.filter(field =>
      tender[field] && tender[field] !== '').length;

    score += optionalFieldsPresent * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  checkForDuplicates(newTender, existingTenders = []) {
    const duplicateChecks = {
      exact: null,
      similar: [],
      confidence: 100
    };

    // Generate fingerprint for the new tender
    const newFingerprint = this.generateTenderFingerprint(newTender);

    // Check against existing tenders
    for (const existing of existingTenders) {
      const existingFingerprint = this.generateTenderFingerprint(existing);
      const similarity = this.calculateSimilarity(newTender, existing);

      if (newFingerprint === existingFingerprint) {
        duplicateChecks.exact = existing;
        duplicateChecks.confidence = 0;
        break;
      }

      if (similarity > 0.8) {
        duplicateChecks.similar.push({
          tender: existing,
          similarity: similarity,
          reason: this.getSimilarityReason(newTender, existing, similarity)
        });
      }
    }

    // Adjust confidence based on similarity
    if (duplicateChecks.similar.length > 0) {
      const maxSimilarity = Math.max(...duplicateChecks.similar.map(s => s.similarity));
      duplicateChecks.confidence = Math.round((1 - maxSimilarity) * 100);
    }

    return duplicateChecks;
  }

  generateTenderFingerprint(tender) {
    // Create a unique fingerprint based on key fields
    const keyFields = [
      tender.title?.toLowerCase().trim(),
      tender.agency?.toLowerCase().trim(),
      tender.estimated_value,
      tender.closing_date
    ];

    const fingerprintString = keyFields.join('|');
    return crypto.createHash('sha256').update(fingerprintString).digest('hex').substring(0, 16);
  }

  calculateSimilarity(tender1, tender2) {
    let similarityScore = 0;
    let totalWeight = 0;

    // Title similarity (weight: 40%)
    const titleSimilarity = this.calculateStringSimilarity(tender1.title, tender2.title);
    similarityScore += titleSimilarity * 0.4;
    totalWeight += 0.4;

    // Agency similarity (weight: 20%)
    if (tender1.agency && tender2.agency) {
      const agencySimilarity = tender1.agency.toLowerCase() === tender2.agency.toLowerCase() ? 1 : 0;
      similarityScore += agencySimilarity * 0.2;
      totalWeight += 0.2;
    }

    // Value similarity (weight: 20%)
    if (tender1.estimated_value && tender2.estimated_value) {
      const valueDiff = Math.abs(tender1.estimated_value - tender2.estimated_value);
      const avgValue = (tender1.estimated_value + tender2.estimated_value) / 2;
      const valueSimilarity = Math.max(0, 1 - (valueDiff / avgValue));
      similarityScore += valueSimilarity * 0.2;
      totalWeight += 0.2;
    }

    // Date similarity (weight: 20%)
    if (tender1.closing_date && tender2.closing_date) {
      const date1 = new Date(tender1.closing_date);
      const date2 = new Date(tender2.closing_date);
      const daysDiff = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
      const dateSimilarity = Math.max(0, 1 - (daysDiff / 30)); // Consider similar if within 30 days
      similarityScore += dateSimilarity * 0.2;
      totalWeight += 0.2;
    }

    return totalWeight > 0 ? similarityScore / totalWeight : 0;
  }

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;

    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;

    // Use Jaccard similarity on word sets
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  getSimilarityReason(tender1, tender2, similarity) {
    const reasons = [];

    const titleSim = this.calculateStringSimilarity(tender1.title, tender2.title);
    if (titleSim > 0.8) reasons.push('Very similar titles');

    if (tender1.agency && tender2.agency && tender1.agency.toLowerCase() === tender2.agency.toLowerCase()) {
      reasons.push('Same agency');
    }

    if (tender1.estimated_value && tender2.estimated_value) {
      const valueDiff = Math.abs(tender1.estimated_value - tender2.estimated_value) / ((tender1.estimated_value + tender2.estimated_value) / 2);
      if (valueDiff < 0.1) reasons.push('Very similar estimated values');
    }

    if (tender1.closing_date && tender2.closing_date) {
      const daysDiff = Math.abs((new Date(tender1.closing_date) - new Date(tender2.closing_date)) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 1) reasons.push('Same or consecutive closing dates');
    }

    return reasons.join(', ') || 'General similarity across multiple fields';
  }
}

module.exports = DataValidator;