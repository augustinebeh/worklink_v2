/**
 * Scraping Helpers - Utilities for web scraping and data processing
 * Mock data generation and tender analysis functions
 * 
 * @module ai-automation/utils/scraping-helpers
 */

/**
 * Generate mock tenders for testing
 * @param {string[]} categories - Tender categories
 * @param {number} count - Number of tenders to generate
 * @returns {Object[]} Array of mock tenders
 */
function generateMockTenders(categories, count) {
  const agencies = ['MOE', 'MOH', 'MOM', 'MCCY', 'MND', 'GovTech', 'SLA', 'HDB', 'NEA', 'NParks'];
  const titles = [
    'Temporary Administrative Support Services',
    'Event Manpower Services',
    'Customer Service Officers',
    'Patient Service Associates',
    'Reception and Front Desk Services',
    'Logistics Support Manpower',
    'Data Entry Operators',
    'Call Centre Agents',
  ];
  const locations = ['Buona Vista', 'Jurong', 'Tampines', 'Woodlands', 'CBD', 'Changi', 'Toa Payoh', 'Queenstown'];

  const tenders = [];
  for (let i = 0; i < count; i++) {
    const value = Math.floor(Math.random() * 400000) + 100000;
    const manpower = Math.floor(Math.random() * 20) + 5;
    const duration = Math.floor(Math.random() * 12) + 3;
    const chargeRate = Math.floor(Math.random() * 8) + 16;
    const payRate = chargeRate - Math.floor(Math.random() * 4) - 4;

    tenders.push({
      id: `TND${Date.now()}${i}`,
      source: 'gebiz',
      external_id: `GBZ-2025-${String(Math.floor(Math.random() * 99999)).padStart(6, '0')}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      agency: agencies[Math.floor(Math.random() * agencies.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      estimated_value: value,
      closing_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      manpower_required: manpower,
      duration_months: duration,
      location: locations[Math.floor(Math.random() * locations.length)],
      estimated_charge_rate: chargeRate,
      estimated_pay_rate: payRate,
      estimated_monthly_revenue: Math.round(manpower * chargeRate * 160),
      win_probability: null,
      recommended_action: null,
    });
  }
  return tenders;
}

/**
 * Analyze tender and calculate win probability
 * @param {Object} tender - Tender to analyze
 * @returns {Object} Analysis results with score and recommended action
 */
function analyzeTender(tender) {
  let score = 50; // Base score
  const factors = [];

  // Value assessment
  if (tender.estimated_value < 200000) {
    score += 10;
    factors.push({ factor: 'Contract Size', impact: '+10', reason: 'Smaller contracts have less competition' });
  } else if (tender.estimated_value > 500000) {
    score -= 10;
    factors.push({ factor: 'Contract Size', impact: '-10', reason: 'Large contracts attract more competitors' });
  }

  // Manpower assessment
  if (tender.manpower_required <= 10) {
    score += 15;
    factors.push({ factor: 'Headcount', impact: '+15', reason: 'Manageable team size within our capacity' });
  } else if (tender.manpower_required > 30) {
    score -= 15;
    factors.push({ factor: 'Headcount', impact: '-15', reason: 'May strain current candidate pool' });
  }

  // Category match
  const strongCategories = ['event', 'f&b', 'hospitality', 'admin'];
  const titleLower = tender.title?.toLowerCase() || '';
  if (strongCategories.some(cat => titleLower.includes(cat))) {
    score += 15;
    factors.push({ factor: 'Category Match', impact: '+15', reason: 'Strong track record in this category' });
  }

  // Time pressure
  const daysToClose = Math.ceil((new Date(tender.closing_date) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysToClose < 7) {
    score += 10;
    factors.push({ factor: 'Time Pressure', impact: '+10', reason: 'Short deadline reduces competition' });
  }

  // Margin assessment
  const margin = tender.estimated_charge_rate && tender.estimated_pay_rate
    ? ((tender.estimated_charge_rate - tender.estimated_pay_rate) / tender.estimated_charge_rate * 100)
    : 30;
  if (margin >= 35) {
    score += 10;
    factors.push({ factor: 'Margin', impact: '+10', reason: 'Healthy profit margin' });
  } else if (margin < 25) {
    score -= 10;
    factors.push({ factor: 'Margin', impact: '-10', reason: 'Tight margins' });
  }

  // Clamp score
  score = Math.max(10, Math.min(90, score));

  // Determine action
  let recommendedAction;
  if (score >= 70) {
    recommendedAction = 'STRONG BID - Priority submission';
  } else if (score >= 50) {
    recommendedAction = 'MODERATE BID - Review and submit if capacity allows';
  } else {
    recommendedAction = 'PASS - Better opportunities likely available';
  }

  return {
    win_probability: score,
    recommended_action: recommendedAction,
    factors,
  };
}

/**
 * Validate scraped tender data
 * @param {Object} tender - Tender to validate
 * @returns {Object} Validation result
 */
function validateTenderData(tender) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!tender.title) errors.push('Missing title');
  if (!tender.agency) errors.push('Missing agency');
  if (!tender.external_id) errors.push('Missing external_id');
  if (!tender.closing_date) errors.push('Missing closing_date');

  // Data quality checks
  if (tender.estimated_value && tender.estimated_value < 10000) {
    warnings.push('Unusually low contract value');
  }
  if (tender.estimated_value && tender.estimated_value > 10000000) {
    warnings.push('Unusually high contract value');
  }

  if (tender.manpower_required && tender.manpower_required < 1) {
    errors.push('Invalid manpower_required (must be >= 1)');
  }
  if (tender.manpower_required && tender.manpower_required > 1000) {
    warnings.push('Very large manpower requirement');
  }

  // Date validation
  if (tender.closing_date) {
    const closingDate = new Date(tender.closing_date);
    const now = new Date();
    
    if (closingDate < now) {
      warnings.push('Tender closing date has already passed');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score: errors.length === 0 ? (warnings.length === 0 ? 100 : 80) : 0
  };
}

/**
 * Deduplicate tenders based on external_id and title similarity
 * @param {Object[]} tenders - Array of tenders
 * @returns {Object} Deduplication results
 */
function deduplicateTenders(tenders) {
  const seen = new Map();
  const unique = [];
  const duplicates = [];

  for (const tender of tenders) {
    const key = tender.external_id || tender.title.toLowerCase().trim();
    
    if (seen.has(key)) {
      duplicates.push(tender);
    } else {
      seen.set(key, true);
      unique.push(tender);
    }
  }

  return {
    unique,
    duplicates,
    uniqueCount: unique.length,
    duplicateCount: duplicates.length
  };
}

/**
 * Calculate days until tender closing
 * @param {string} closingDate - Closing date (ISO format)
 * @returns {number} Days until closing (negative if passed)
 */
function calculateDaysToClose(closingDate) {
  const closing = new Date(closingDate);
  const now = new Date();
  const diff = closing - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Categorize tender urgency
 * @param {number} daysToClose - Days until closing
 * @returns {string} Urgency level
 */
function getTenderUrgency(daysToClose) {
  if (daysToClose < 3) return 'CRITICAL';
  if (daysToClose < 7) return 'HIGH';
  if (daysToClose < 14) return 'MEDIUM';
  return 'LOW';
}

/**
 * Extract metadata from scraping session
 * @param {Object[]} tenders - Scraped tenders
 * @returns {Object} Session metadata
 */
function extractSessionMetadata(tenders) {
  return {
    totalScraped: tenders.length,
    avgValue: tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0) / tenders.length,
    totalValue: tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0),
    agencies: [...new Set(tenders.map(t => t.agency))],
    categories: [...new Set(tenders.map(t => t.category))],
    avgManpower: tenders.reduce((sum, t) => sum + (t.manpower_required || 0), 0) / tenders.length,
  };
}

module.exports = {
  generateMockTenders,
  analyzeTender,
  validateTenderData,
  deduplicateTenders,
  calculateDaysToClose,
  getTenderUrgency,
  extractSessionMetadata,
};
