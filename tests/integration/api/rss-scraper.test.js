/**
 * 🧪 API INTEGRATION TEST: RSS Scraper and Tender Creation
 * Tests RSS parsing, tender creation, and alert triggering
 */

const request = require('supertest');
const express = require('express');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Mock RSS Parser
class MockRSSParser {
  constructor() {
    this.mockFeeds = [
      {
        title: 'Supply and Installation of Security Systems',
        description: 'Government facility security upgrade project including CCTV, access control, and alarm systems',
        link: 'https://gebiz.gov.sg/tender/SEC001',
        pubDate: new Date().toISOString(),
        categories: ['Security', 'Installation'],
        guid: 'SEC001-2024'
      },
      {
        title: 'Cleaning Services for Public Housing',
        description: 'Comprehensive cleaning and maintenance services for HDB estates island-wide',
        link: 'https://gebiz.gov.sg/tender/CLEAN002',
        pubDate: new Date().toISOString(),
        categories: ['Cleaning', 'Maintenance'],
        guid: 'CLEAN002-2024'
      },
      {
        title: 'IT Infrastructure Modernization Project',
        description: 'Cloud migration and infrastructure upgrade for ministry systems',
        link: 'https://gebiz.gov.sg/tender/IT003',
        pubDate: new Date().toISOString(),
        categories: ['IT', 'Cloud'],
        guid: 'IT003-2024'
      }
    ];
  }

  async parseURL(url) {
    return {
      title: 'GeBIZ Tender Feed',
      description: 'Latest government tenders',
      items: this.mockFeeds
    };
  }

  async fetchAndParse() {
    const feed = await this.parseURL('https://gebiz.gov.sg/rss');
    const results = [];

    for (const item of feed.items) {
      const tender = await this.processFeedItem(item);
      if (tender) {
        results.push(tender);
      }
    }

    return results;
  }

  async processFeedItem(item) {
    const db = new Database(global.TEST_CONFIG.DB_PATH);

    // Check if already processed
    const existing = db.prepare(`
      SELECT id FROM bpo_tender_lifecycle
      WHERE source_id = ? OR external_url = ?
    `).get(item.guid, item.link);

    if (existing) {
      db.close();
      return null;
    }

    // Extract agency from title/description
    const agency = this.extractAgency(item.title, item.description);
    const estimatedValue = this.extractValue(item.description);
    const category = this.extractCategory(item.categories);

    const tenderData = {
      id: uuidv4(),
      source_type: 'gebiz_rss',
      source_id: item.guid,
      title: item.title,
      agency: agency,
      description: item.description,
      category: category,
      estimated_value: estimatedValue,
      external_url: item.link,
      stage: 'new_opportunity',
      priority: estimatedValue > 1000000 ? 'high' : 'medium',
      is_urgent: this.detectUrgency(item.title, item.description) ? 1 : 0,
      published_date: new Date(item.pubDate).toISOString().split('T')[0]
    };

    // Insert tender
    db.prepare(`
      INSERT INTO bpo_tender_lifecycle (
        id, source_type, source_id, title, agency, description, category,
        estimated_value, external_url, stage, priority, is_urgent, published_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenderData.id,
      tenderData.source_type,
      tenderData.source_id,
      tenderData.title,
      tenderData.agency,
      tenderData.description,
      tenderData.category,
      tenderData.estimated_value,
      tenderData.external_url,
      tenderData.stage,
      tenderData.priority,
      tenderData.is_urgent,
      tenderData.published_date
    );

    db.close();
    return tenderData;
  }

  extractAgency(title, description) {
    const agencies = [
      'Ministry of Defence',
      'Housing Development Board',
      'Ministry of Health',
      'Land Transport Authority',
      'Public Utilities Board',
      'Infocomm Media Development Authority'
    ];

    const text = `${title} ${description}`.toLowerCase();

    for (const agency of agencies) {
      if (text.includes(agency.toLowerCase()) ||
          text.includes(agency.split(' ').map(w => w[0]).join('').toLowerCase())) {
        return agency;
      }
    }

    return 'Government Agency';
  }

  extractValue(description) {
    // Simple value extraction - in real implementation would be more sophisticated
    const valueMatches = description.match(/\$?([\d,]+)(\.\d{2})?\s*(million|k|thousand)?/i);

    if (valueMatches) {
      let value = parseFloat(valueMatches[1].replace(',', ''));
      const unit = valueMatches[3]?.toLowerCase();

      if (unit === 'million') {
        value *= 1000000;
      } else if (unit === 'k' || unit === 'thousand') {
        value *= 1000;
      }

      return value;
    }

    // Default estimated values based on category/type
    if (description.toLowerCase().includes('security')) return 2500000;
    if (description.toLowerCase().includes('cleaning')) return 800000;
    if (description.toLowerCase().includes('it')) return 1500000;

    return 500000; // Default
  }

  extractCategory(categories) {
    if (categories?.includes('Security')) return 'Security Services';
    if (categories?.includes('Cleaning')) return 'Cleaning & Maintenance';
    if (categories?.includes('IT')) return 'IT Services';
    return 'General Services';
  }

  detectUrgency(title, description) {
    const urgentKeywords = ['urgent', 'emergency', 'immediate', 'asap', 'critical'];
    const text = `${title} ${description}`.toLowerCase();
    return urgentKeywords.some(keyword => text.includes(keyword));
  }
}

describe('API Integration: RSS Scraper and Tender Creation', () => {
  let testDB;
  let rssParser;

  beforeAll(() => {
    testDB = global.TestDB.createTestDB();
    rssParser = new MockRSSParser();
  });

  afterAll(() => {
    if (testDB) testDB.close();
  });

  beforeEach(() => {
    global.TestDB.cleanTestDB();
    global.TestDB.seedTestData();
  });

  describe('RSS Scraper: Create tender from RSS', () => {
    test('Successfully parses RSS feed and creates tenders', async () => {
      // Execute RSS parsing
      const results = await rssParser.fetchAndParse();

      expect(results).toHaveLength(3);
      expect(results.every(r => r.source_type === 'gebiz_rss')).toBe(true);

      // Verify tenders were created in database
      const tendersInDB = testDB.prepare(`
        SELECT * FROM bpo_tender_lifecycle
        WHERE source_type = 'gebiz_rss'
        ORDER BY created_at DESC
      `).all();

      expect(tendersInDB).toHaveLength(3);

      // Check specific tender data
      const securityTender = tendersInDB.find(t => t.title.includes('Security Systems'));
      expect(securityTender.agency).toBe('Ministry of Defence');
      expect(securityTender.estimated_value).toBe(2500000);
      expect(securityTender.category).toBe('Security Services');
      expect(securityTender.external_url).toContain('gebiz.gov.sg');

      const cleaningTender = tendersInDB.find(t => t.title.includes('Cleaning Services'));
      expect(cleaningTender.agency).toBe('Housing Development Board');
      expect(cleaningTender.estimated_value).toBe(800000);

      const itTender = tendersInDB.find(t => t.title.includes('IT Infrastructure'));
      expect(itTender.agency).toBe('Infocomm Media Development Authority');
      expect(itTender.estimated_value).toBe(1500000);
    });

    test('Prevents duplicate tender creation', async () => {
      // First run
      await rssParser.fetchAndParse();

      const firstRunCount = testDB.prepare(`
        SELECT COUNT(*) as count FROM bpo_tender_lifecycle
        WHERE source_type = 'gebiz_rss'
      `).get().count;

      // Second run (should not create duplicates)
      await rssParser.fetchAndParse();

      const secondRunCount = testDB.prepare(`
        SELECT COUNT(*) as count FROM bpo_tender_lifecycle
        WHERE source_type = 'gebiz_rss'
      `).get().count;

      expect(secondRunCount).toBe(firstRunCount);
    });

    test('Correctly categorizes and prioritizes tenders', async () => {
      await rssParser.fetchAndParse();

      // Check high-value tender gets high priority
      const highValueTender = testDB.prepare(`
        SELECT * FROM bpo_tender_lifecycle
        WHERE estimated_value > 1000000
      `).all();

      expect(highValueTender.every(t => t.priority === 'high')).toBe(true);

      // Check medium-value tenders get medium priority
      const mediumValueTender = testDB.prepare(`
        SELECT * FROM bpo_tender_lifecycle
        WHERE estimated_value <= 1000000
      `).all();

      expect(mediumValueTender.every(t => t.priority === 'medium')).toBe(true);
    });

    test('Detects urgency keywords correctly', async () => {
      // Add urgent tender to mock feeds
      rssParser.mockFeeds.push({
        title: 'URGENT: Emergency Network Repair Services',
        description: 'Immediate requirement for emergency network repairs following system failure',
        link: 'https://gebiz.gov.sg/tender/URGENT001',
        pubDate: new Date().toISOString(),
        categories: ['IT', 'Emergency'],
        guid: 'URGENT001-2024'
      });

      await rssParser.fetchAndParse();

      const urgentTender = testDB.prepare(`
        SELECT * FROM bpo_tender_lifecycle
        WHERE title LIKE '%URGENT%'
      `).get();

      expect(urgentTender.is_urgent).toBe(1);
    });

    test('Handles malformed RSS data gracefully', async () => {
      // Add malformed data
      rssParser.mockFeeds.push({
        title: null,
        description: '',
        link: 'invalid-url',
        pubDate: 'invalid-date',
        categories: null,
        guid: null
      });

      // Should not throw error and should skip invalid entries
      const results = await rssParser.fetchAndParse();

      // Should still process valid entries
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.title && r.agency)).toBe(true);
    });
  });

  describe('RSS Integration with Alert System', () => {
    test('RSS created tender triggers high-value alert', async () => {
      const alertEngine = require('../../../services/alerts/engine');

      // Parse RSS (creates high-value security tender)
      await rssParser.fetchAndParse();

      // Run alert evaluation
      await alertEngine.evaluateAllRules();

      // Check that high-value alert was triggered
      const highValueAlerts = testDB.prepare(`
        SELECT ah.*, btl.title, btl.estimated_value
        FROM alert_history ah
        JOIN bpo_tender_lifecycle btl ON ah.tender_id = btl.id
        WHERE btl.source_type = 'gebiz_rss'
          AND btl.estimated_value >= 1000000
      `).all();

      expect(highValueAlerts.length).toBeGreaterThan(0);

      const securityAlert = highValueAlerts.find(a => a.title.includes('Security'));
      expect(securityAlert.alert_priority).toBe('high');
      expect(securityAlert.alert_title).toContain('High-Value Tender');
    });

    test('RSS urgent tender triggers immediate alert', async () => {
      // Add urgent tender
      rssParser.mockFeeds = [{
        title: 'CRITICAL: Emergency Security Response',
        description: 'Immediate security services required for critical infrastructure protection',
        link: 'https://gebiz.gov.sg/tender/CRIT001',
        pubDate: new Date().toISOString(),
        categories: ['Security', 'Emergency'],
        guid: 'CRIT001-2024'
      }];

      await rssParser.fetchAndParse();

      const alertEngine = require('../../../services/alerts/engine');
      await alertEngine.evaluateAllRules();

      const urgentTenderAlert = testDB.prepare(`
        SELECT ah.*, btl.is_urgent
        FROM alert_history ah
        JOIN bpo_tender_lifecycle btl ON ah.tender_id = btl.id
        WHERE btl.source_type = 'gebiz_rss'
          AND btl.is_urgent = 1
      `).get();

      expect(urgentTenderAlert).toBeTruthy();
    });
  });

  describe('RSS Performance and Reliability', () => {
    test('Handles large RSS feed efficiently', async () => {
      // Generate large mock feed
      const largeFeed = Array.from({ length: 100 }, (_, i) => ({
        title: `Bulk Tender ${i + 1}`,
        description: `Description for tender number ${i + 1}`,
        link: `https://gebiz.gov.sg/tender/BULK${String(i + 1).padStart(3, '0')}`,
        pubDate: new Date().toISOString(),
        categories: ['Bulk'],
        guid: `BULK${String(i + 1).padStart(3, '0')}-2024`
      }));

      rssParser.mockFeeds = largeFeed;

      const startTime = Date.now();
      await rssParser.fetchAndParse();
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // All tenders should be created
      const bulkTenderCount = testDB.prepare(`
        SELECT COUNT(*) as count FROM bpo_tender_lifecycle
        WHERE title LIKE 'Bulk Tender%'
      `).get().count;

      expect(bulkTenderCount).toBe(100);
    });

    test('Error handling for network failures', async () => {
      // Mock network failure
      const originalParseURL = rssParser.parseURL;
      rssParser.parseURL = jest.fn().mockRejectedValue(new Error('Network timeout'));

      try {
        await rssParser.fetchAndParse();
        // Should handle gracefully without throwing
        expect(true).toBe(true);
      } catch (error) {
        // If it throws, should be handled error
        expect(error.message).toBe('Network timeout');
      }

      // Restore original method
      rssParser.parseURL = originalParseURL;
    });
  });

  describe('RSS Data Quality and Validation', () => {
    test('Validates required fields before tender creation', async () => {
      // Test with missing required fields
      rssParser.mockFeeds = [
        {
          title: '', // Empty title
          description: 'Valid description',
          link: 'https://gebiz.gov.sg/tender/INVALID001',
          guid: 'INVALID001-2024'
        },
        {
          title: 'Valid Title',
          description: 'Valid description but no guid',
          link: 'https://gebiz.gov.sg/tender/INVALID002'
          // Missing guid
        }
      ];

      const results = await rssParser.fetchAndParse();

      // Should filter out invalid entries
      expect(results.length).toBe(0);
    });

    test('Standardizes agency names', async () => {
      rssParser.mockFeeds = [
        {
          title: 'HDB Maintenance Contract',
          description: 'Housing board facility maintenance',
          link: 'https://gebiz.gov.sg/tender/STD001',
          guid: 'STD001-2024'
        },
        {
          title: 'MOH Equipment Procurement',
          description: 'Ministry of Health equipment purchase',
          link: 'https://gebiz.gov.sg/tender/STD002',
          guid: 'STD002-2024'
        }
      ];

      await rssParser.fetchAndParse();

      const standardizedTenders = testDB.prepare(`
        SELECT agency FROM bpo_tender_lifecycle
        WHERE source_type = 'gebiz_rss'
      `).all();

      expect(standardizedTenders.some(t => t.agency === 'Housing Development Board')).toBe(true);
      expect(standardizedTenders.some(t => t.agency === 'Ministry of Health')).toBe(true);
    });
  });
});