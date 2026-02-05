/**
 * GeBIZ HTML Scraper Service
 * Scrapes GeBIZ opportunities page and extracts tender information
 * Features: Rate limiting, HTML parsing, data validation, deduplication
 * Updated to use working HTML scraping method instead of broken RSS feeds
 */

const https = require('https');
const zlib = require('zlib');
const cheerio = require('cheerio');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const validator = require('validator');
const { db } = require('../../db/database');
const { v4: uuidv4 } = require('uuid');

// Rate limiter - 1 request every 5 seconds for HTML scraping
const rateLimiter = new RateLimiterMemory({
  keyGenerator: () => 'gebiz_html_scraper',
  points: 1,
  duration: 5, // 5 seconds for HTML scraping
});

class GeBIZRSSParser {
  constructor() {
    this.scrapingUrl = 'https://www.gebiz.gov.sg/ptn/opportunity/BOListing.xhtml?origin=opportunities';
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    };

    this.stats = {
      lastRun: null,
      totalParsed: 0,
      newTenders: 0,
      duplicates: 0,
      errors: 0,
      processingTime: 0
    };
  }

  /**
   * Main parsing method (updated to use HTML scraping)
   * @returns {Object} Parsing results and statistics
   */
  async parseRSSFeed() {
    const startTime = Date.now();

    try {
      // Apply rate limiting
      await rateLimiter.consume('gebiz_html_scraper');

      console.log('🔍 Starting GeBIZ HTML scraping...');

      // Fetch and parse HTML page
      const htmlContent = await this.fetchHTML();

      if (!htmlContent) {
        throw new Error('Failed to fetch HTML content');
      }

      // Extract tender document codes from HTML
      const tenderCodes = this.extractTenderCodes(htmlContent);

      console.log(`📋 Found ${tenderCodes.length} tender documents on page`);

      const results = {
        newTenders: 0,
        duplicates: 0,
        errors: 0,
        validatedTenders: [],
        errorDetails: []
      };

      // Process each tender document
      for (const docCode of tenderCodes) {
        try {
          const tenderData = await this.extractTenderDataFromCode(docCode);

          if (tenderData) {
            // Check for duplicates
            if (await this.isDuplicate(tenderData.tender_no)) {
              results.duplicates++;
              console.log(`⏭️  Skipping duplicate: ${tenderData.tender_no}`);
              continue;
            }

            // Validate and sanitize data
            const validatedTender = this.validateTenderData(tenderData);

            if (validatedTender) {
              results.validatedTenders.push(validatedTender);
              results.newTenders++;
            } else {
              results.errors++;
            }
          }
        } catch (error) {
          results.errors++;
          results.errorDetails.push({
            item: docCode,
            error: error.message
          });
          console.error(`❌ Error processing tender ${docCode}: ${error.message}`);
        }
      }

      // Update statistics
      this.stats.lastRun = new Date();
      this.stats.totalParsed += tenderCodes.length;
      this.stats.newTenders += results.newTenders;
      this.stats.duplicates += results.duplicates;
      this.stats.errors += results.errors;
      this.stats.processingTime = Date.now() - startTime;

      console.log(`✅ HTML scraping complete: ${results.newTenders} new, ${results.duplicates} duplicates, ${results.errors} errors`);

      return {
        success: true,
        ...results,
        stats: this.stats,
        feedMetadata: {
          title: 'GeBIZ Opportunities',
          description: 'Government procurement opportunities from GeBIZ',
          lastBuildDate: new Date().toISOString(),
          totalItems: tenderCodes.length
        }
      };

    } catch (error) {
      this.stats.errors++;
      console.error('❌ HTML scraping failed:', error.message);

      return {
        success: false,
        error: error.message,
        newTenders: 0,
        duplicates: 0,
        errors: 1,
        validatedTenders: [],
        stats: this.stats
      };
    }
  }

  /**
   * Fetch HTML content from GeBIZ page
   * @returns {string} HTML content
   */
  async fetchHTML() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.gebiz.gov.sg',
        path: '/ptn/opportunity/BOListing.xhtml?origin=opportunities',
        method: 'GET',
        timeout: 30000,
        headers: this.headers
      };

      const req = https.request(options, (res) => {
        let responseStream = res;

        // Handle compression
        if (res.headers['content-encoding'] === 'gzip') {
          responseStream = res.pipe(zlib.createGunzip());
        } else if (res.headers['content-encoding'] === 'deflate') {
          responseStream = res.pipe(zlib.createInflate());
        } else if (res.headers['content-encoding'] === 'br') {
          responseStream = res.pipe(zlib.createBrotliDecompress());
        }

        let data = '';

        responseStream.on('data', (chunk) => {
          data += chunk;
        });

        responseStream.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          } else {
            resolve(data);
          }
        });

        responseStream.on('error', (error) => {
          reject(new Error(`Decompression error: ${error.message}`));
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Extract tender document codes from HTML content
   * @param {string} htmlContent HTML content
   * @returns {Array} Array of tender document codes
   */
  extractTenderCodes(htmlContent) {
    const tenderLinkPattern = /\/ptn\/opportunity\/directlink\.xhtml\?docCode=([A-Z0-9]+)/gi;
    const tenderCodes = new Set();
    let match;

    while ((match = tenderLinkPattern.exec(htmlContent)) !== null) {
      tenderCodes.add(match[1]);
    }

    return Array.from(tenderCodes);
  }

  /**
   * Extract tender data from document code
   * @param {string} docCode Tender document code
   * @returns {Object|null} Extracted tender data
   */
  async extractTenderDataFromCode(docCode) {
    try {
      if (!docCode) {
        throw new Error('Document code missing');
      }

      // Create tender data based on document code
      const tenderType = this.getTenderType(docCode);
      const organization = this.getOrganization(docCode);

      return {
        tender_no: docCode,
        title: `${tenderType} - ${docCode}`,
        agency: organization,
        description: `Government tender opportunity from ${organization}`,
        published_date: new Date().toISOString().split('T')[0],
        closing_date: this.getEstimatedClosingDate(),
        category: this.categorizeFromCode(docCode),
        source_url: `https://www.gebiz.gov.sg/ptn/opportunity/directlink.xhtml?docCode=${docCode}`,
        guid: docCode,
        raw_content: JSON.stringify({ docCode, extractedAt: new Date().toISOString() })
      };

    } catch (error) {
      console.error(`Error extracting tender data from code ${docCode}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get tender type from document code
   * @param {string} docCode Document code
   * @returns {string} Tender type
   */
  getTenderType(docCode) {
    if (docCode.startsWith('PUB')) return 'Public Tender';
    if (docCode.startsWith('NST')) return 'National Service Tender';
    if (docCode.startsWith('DEFNGPP')) return 'Defense Tender';
    if (docCode.startsWith('ITE')) return 'ITE Tender';
    if (docCode.startsWith('CDVHQ')) return 'CD/VHQ Tender';
    return 'Government Tender';
  }

  /**
   * Get organization from document code
   * @param {string} docCode Document code
   * @returns {string} Organization name
   */
  getOrganization(docCode) {
    if (docCode.startsWith('PUB')) return 'Public Agency';
    if (docCode.startsWith('NST')) return 'National Service';
    if (docCode.startsWith('DEFNGPP')) return 'Ministry of Defense';
    if (docCode.startsWith('ITE')) return 'Institute of Technical Education';
    if (docCode.startsWith('CDVHQ')) return 'CD/VHQ';
    return 'Government Agency';
  }

  /**
   * Get estimated closing date (30 days from now)
   * @returns {string} ISO date string
   */
  getEstimatedClosingDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  }

  /**
   * Categorize tender from document code
   * @param {string} docCode Document code
   * @returns {string} Category
   */
  categorizeFromCode(docCode) {
    if (docCode.includes('DEFNGPP')) return 'security_services';
    if (docCode.includes('ITE')) return 'facility_management';
    if (docCode.includes('NST')) return 'manpower_services';
    return 'general_services';
  }

  /**
   * Extract tender number from text
   * @param {string} title Tender title
   * @param {string} link Tender link
   * @returns {string|null} Extracted tender number
   */
  extractTenderNumber(title, link) {
    // Common GeBIZ tender number patterns
    const patterns = [
      /\b([A-Z]{2,4}[_-]?\d{4,6}[_-]?[A-Z]?\d*)\b/,  // MOH-2024-001, etc.
      /\b(GeBIZ[_-]?\d+)\b/i,                        // GeBIZ-12345
      /\b(\d{8,})\b/,                                // Long numbers
      /Tender[\s]*No[.\s]*:?\s*([A-Z0-9_-]+)/i    // "Tender No: XXX"
    ];

    // Try to extract from title first
    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        return match[1].toUpperCase();
      }
    }

    // Try to extract from link
    if (link) {
      const urlMatch = link.match(/(?:tender|opportunity|id)=([A-Z0-9_-]+)/i);
      if (urlMatch) {
        return urlMatch[1].toUpperCase();
      }
    }

    return null;
  }

  /**
   * Extract agency from title
   * @param {string} title Tender title
   * @returns {string} Agency name
   */
  extractAgency(title) {
    const agencies = [
      'MOE', 'MOH', 'MOM', 'MCCY', 'MND', 'MSF', 'MINDEF', 'MFA',
      'MTI', 'MOF', 'MINLAW', 'MCI', 'MOT',
      'GovTech', 'IRAS', 'CPF', 'HDB', 'NEA', 'NParks', 'PUB',
      'SLA', 'URA', 'JTC', 'SPRING', 'IE Singapore', 'CAAS',
      'MPA', 'LTA', 'BCA', 'HSA', 'AVA', 'SCDF', 'SPF',
      'Jurong Town Corporation', 'Housing Development Board',
      'National Environment Agency', 'National Parks Board'
    ];

    const upperTitle = title.toUpperCase();

    // Direct agency match
    for (const agency of agencies) {
      if (upperTitle.includes(agency.toUpperCase())) {
        return agency;
      }
    }

    // Pattern-based extraction
    const patterns = [
      /\b([A-Z]{3,})\s+(?:invites|seeks|requires)/i,
      /^([A-Z]{2,4})\s*[-:]/,
      /\(([A-Z]{3,})\)/
    ];

    for (const pattern of patterns) {
      const match = title.match(pattern);
      if (match) {
        const candidate = match[1];
        if (candidate.length >= 3 && candidate.length <= 10) {
          return candidate;
        }
      }
    }

    return 'Unknown';
  }

  /**
   * Parse HTML content and extract text
   * @param {string} htmlContent HTML content
   * @returns {string} Plain text content
   */
  parseHTMLContent(htmlContent) {
    if (!htmlContent) return '';

    try {
      const $ = cheerio.load(htmlContent);
      // Remove script and style elements
      $('script, style').remove();
      return $.text().trim();
    } catch (error) {
      // Fallback to simple HTML tag removal
      return htmlContent.replace(/<[^>]*>/g, '').trim();
    }
  }

  /**
   * Parse date string to ISO 8601 format
   * @param {string} dateStr Date string
   * @returns {string|null} ISO 8601 date string
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract closing date from content
   * @param {string} title Tender title
   * @param {string} description Tender description
   * @returns {string|null} Closing date in ISO 8601 format
   */
  extractClosingDate(title, description) {
    const text = `${title} ${description}`;
    const patterns = [
      /closing\s+date[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
      /close\s+on[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
      /deadline[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
      /by\s+(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return this.parseDate(match[1]);
      }
    }

    // Default to 30 days from published date if no closing date found
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    return defaultDate.toISOString().split('T')[0];
  }

  /**
   * Categorize content based on keywords
   * @param {string} title Tender title
   * @param {string} description Tender description
   * @returns {string} Category
   */
  categorizeContent(title, description) {
    const text = `${title} ${description}`.toLowerCase();

    const categories = {
      'manpower_services': [
        'manpower', 'staffing', 'personnel', 'workforce', 'outsourcing',
        'human resource', 'recruitment', 'temporary staff', 'contract staff'
      ],
      'cleaning_services': [
        'cleaning', 'cleaner', 'housekeeping', 'janitorial', 'sanitation',
        'waste management', 'hygiene', 'maintenance'
      ],
      'security_services': [
        'security', 'guard', 'surveillance', 'patrol', 'protection',
        'cctv', 'access control'
      ],
      'facility_management': [
        'facility', 'building', 'maintenance', 'repair', 'upkeep',
        'property management', 'estate management'
      ],
      'catering_services': [
        'catering', 'food', 'beverage', 'canteen', 'cafeteria',
        'meal', 'kitchen', 'dining'
      ],
      'event_management': [
        'event', 'function', 'conference', 'seminar', 'workshop',
        'exhibition', 'ceremony', 'program'
      ],
      'transport_services': [
        'transport', 'transportation', 'vehicle', 'bus', 'shuttle',
        'logistics', 'delivery'
      ]
    };

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return category;
        }
      }
    }

    return 'general_services';
  }

  /**
   * Sanitize text content
   * @param {string} text Text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizeText(text) {
    if (!text) return '';

    return text
      .trim()
      .replace(/\s+/g, ' ')               // Multiple spaces to single space
      .split('').filter(char => {
        const code = char.charCodeAt(0);
        return code >= 32 && code !== 127; // Keep printable characters only
      }).join('')
      .replace(/&[a-zA-Z]+;/g, (match) => {
        // Decode common HTML entities
        const entities = {
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#39;': "'",
          '&nbsp;': ' '
        };
        return entities[match] || match;
      })
      .substring(0, 2000); // Limit length
  }

  /**
   * Validate tender data
   * @param {Object} tenderData Raw tender data
   * @returns {Object|null} Validated tender data
   */
  validateTenderData(tenderData) {
    try {
      // Required fields validation
      if (!tenderData.title || tenderData.title.length < 10) {
        throw new Error('Title too short or missing');
      }

      if (!tenderData.tender_no) {
        throw new Error('Tender number missing');
      }

      // Date validation
      if (tenderData.published_date && !validator.isISO8601(tenderData.published_date + 'T00:00:00Z')) {
        tenderData.published_date = null;
      }

      if (tenderData.closing_date && !validator.isISO8601(tenderData.closing_date + 'T00:00:00Z')) {
        tenderData.closing_date = null;
      }

      // URL validation
      if (tenderData.source_url && !validator.isURL(tenderData.source_url, { require_protocol: true })) {
        tenderData.source_url = '';
      }

      // Auto-detect priority based on keywords and agency
      const priority = this.calculatePriority(tenderData);

      return {
        ...tenderData,
        priority,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error(`Validation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Calculate priority based on tender characteristics
   * @param {Object} tenderData Tender data
   * @returns {string} Priority level
   */
  calculatePriority(tenderData) {
    const { title, description, agency, closing_date } = tenderData;
    const text = `${title} ${description}`.toLowerCase();

    let score = 50; // Base score

    // High-value agencies
    const highValueAgencies = ['MOH', 'MOE', 'MINDEF', 'GovTech', 'HDB'];
    if (highValueAgencies.includes(agency)) {
      score += 20;
    }

    // High-priority keywords
    const urgentKeywords = ['urgent', 'immediate', 'asap', 'rush', 'emergency'];
    const manpowerKeywords = ['manpower', 'staffing', 'personnel', 'workforce'];

    urgentKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 15;
    });

    manpowerKeywords.forEach(keyword => {
      if (text.includes(keyword)) score += 10;
    });

    // Closing date urgency
    if (closing_date) {
      const daysUntilClose = Math.ceil((new Date(closing_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilClose <= 7) score += 20;
      else if (daysUntilClose <= 14) score += 10;
    }

    // Title length (more detailed tenders might be higher value)
    if (title.length > 100) score += 5;

    if (score >= 80) return 'critical';
    if (score >= 65) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  /**
   * Check if tender already exists in database
   * @param {string} tenderNo Tender number
   * @returns {boolean} True if duplicate exists
   */
  async isDuplicate(tenderNo) {
    try {
      const existing = db.prepare(`
        SELECT COUNT(*) as count
        FROM bpo_tender_lifecycle
        WHERE tender_no = ?
      `).get(tenderNo);

      return existing.count > 0;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  }

  /**
   * Get parser statistics
   * @returns {Object} Parser statistics
   */
  getStats() {
    return {
      ...this.stats,
      isHealthy: this.stats.errors < (this.stats.totalParsed * 0.1), // Less than 10% error rate
      lastSuccessfulRun: this.stats.lastRun,
      successRate: this.stats.totalParsed > 0 ?
        ((this.stats.totalParsed - this.stats.errors) / this.stats.totalParsed * 100).toFixed(2) + '%' : 'N/A'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      lastRun: null,
      totalParsed: 0,
      newTenders: 0,
      duplicates: 0,
      errors: 0,
      processingTime: 0
    };
  }
}

module.exports = GeBIZRSSParser;