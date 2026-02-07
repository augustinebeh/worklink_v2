/**
 * EPU/SER/19 Specialized Web Scraper
 * Advanced scraping system optimized for Service - Manpower Supply tenders
 *
 * Features:
 * - Targeted EPU/SER/19 category filtering
 * - Real-time tender monitoring
 * - Competitor analysis
 * - Pricing intelligence extraction
 * - Market trend detection
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const axios = require('axios');
const cheerio = require('cheerio');
const EPUSer19Monitor = require('./epu-ser-19-monitor');

// Configure stealth mode
puppeteer.use(StealthPlugin());

class EPUSer19Scraper {
  constructor(options = {}) {
    this.monitor = new EPUSer19Monitor();
    this.baseUrl = 'https://www.gebiz.gov.sg';
    this.searchUrl = `${this.baseUrl}/ptn/opportunity/BOListing.xhtml`;
    this.rssUrl = `${this.baseUrl}/ptn/opportunity/BOListing.rss`;

    this.options = {
      headless: options.headless !== false,
      timeout: options.timeout || 45000,
      retries: options.retries || 5,
      delay: options.delay || 3000,
      ...options
    };

    this.browser = null;
    this.page = null;
    this.isInitialized = false;

    // Rate limiter - more conservative for specialized scraping
    this.rateLimiter = new RateLimiterMemory({
      keyGenerator: () => 'epu_scraper',
      points: 6, // 6 requests per minute
      duration: 60
    });

    this.scrapingStats = {
      totalRequests: 0,
      epuTendersFound: 0,
      failedScrapes: 0,
      lastScrapeTime: null,
      avgIntelligenceScore: 0,
      errors: []
    };

    // EPU/SER/19 specific search terms
    this.epuSearchTerms = [
      'manpower supply',
      'EPU/SER/19',
      'temporary staff',
      'outsourcing services',
      'data entry services',
      'administrative support',
      'clerical services',
      'contract personnel',
      'human resource outsourcing',
      'workforce solutions'
    ];

    // Government agencies known for EPU/SER/19 contracts
    this.targetAgencies = [
      'MOE', 'MOH', 'MOM', 'MCCY', 'MND', 'MSF', 'MINDEF',
      'HDB', 'NEA', 'NParks', 'IRAS', 'CPF', 'PUB',
      'STB', 'URA', 'BCA', 'SLA', 'GovTech', 'CSC'
    ];
  }

  /**
   * Initialize browser with optimized settings for GeBIZ
   */
  async initialize() {
    if (this.isInitialized && this.browser) {
      return;
    }

    try {
      await this.rateLimiter.consume('epu_scraper');

      this.browser = await puppeteer.launch({
        headless: this.options.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1366,768',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        defaultViewport: { width: 1366, height: 768 }
      });

      this.page = await this.browser.newPage();

      // Set realistic headers for Singapore government portal
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      });

      // Optimize resource loading for faster scraping
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url();

        // Block unnecessary resources but allow essential ones
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType) &&
            !url.includes('captcha') && !url.includes('recaptcha')) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Handle dialogs/popups
      this.page.on('dialog', async dialog => {
        console.log(`Dialog detected: ${dialog.message()}`);
        await dialog.accept();
      });

      this.isInitialized = true;
      console.log('EPU/SER/19 scraper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EPU scraper:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Search for EPU/SER/19 tenders using multiple strategies
   */
  async scrapeEPUTenders(options = {}) {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = this.options.retries;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        this.scrapingStats.totalRequests++;

        await this.initialize();

        console.log(`🔍 Scraping EPU/SER/19 tenders (attempt ${attempts}/${maxAttempts})...`);

        // Strategy 1: Direct GeBIZ portal search
        let tenders = await this.searchGeBIZPortal();

        // Strategy 2: RSS feed parsing for recent tenders
        const rssTenders = await this.parseGeBIZRSS();
        tenders = [...tenders, ...rssTenders];

        // Strategy 3: Historical data analysis for patterns
        if (tenders.length === 0) {
          tenders = await this.extractFromHistoricalPatterns();
        }

        // Process and analyze each tender
        const processedTenders = [];
        for (const tender of tenders) {
          const detection = this.monitor.isEPUSerTender(tender);
          if (detection.match) {
            const analysis = this.monitor.analyzeEPUTender(tender);
            const tenderId = this.monitor.storeEPUTender(tender, analysis);

            processedTenders.push({
              ...tender,
              ...analysis,
              id: tenderId,
              detection_confidence: detection.confidence
            });

            this.scrapingStats.epuTendersFound++;
          }
        }

        // Update statistics
        this.scrapingStats.lastScrapeTime = new Date().toISOString();
        if (processedTenders.length > 0) {
          this.scrapingStats.avgIntelligenceScore =
            processedTenders.reduce((sum, t) => sum + t.intelligence_score, 0) / processedTenders.length;
        }

        const duration = Date.now() - startTime;
        console.log(`✅ EPU scraping completed: ${processedTenders.length} EPU tenders found in ${duration}ms`);

        return processedTenders;

      } catch (error) {
        console.error(`EPU scraping attempt ${attempts} failed:`, error.message);
        this.scrapingStats.failedScrapes++;
        this.scrapingStats.errors.push({
          timestamp: new Date().toISOString(),
          attempt: attempts,
          error: error.message,
          type: 'epu_scraping_error'
        });

        if (attempts === maxAttempts) {
          throw new Error(`EPU scraping failed after ${maxAttempts} attempts. Last error: ${error.message}`);
        }

        // Exponential backoff with jitter
        const baseDelay = 2000 * Math.pow(2, attempts);
        const jitter = Math.random() * 1000;
        const backoffDelay = Math.min(45000, baseDelay + jitter);

        console.log(`⏱️  Waiting ${backoffDelay}ms before retry...`);
        await this.delay(backoffDelay);

        // Reset browser on persistent failures
        if (attempts > 2) {
          await this.cleanup();
          this.isInitialized = false;
        }
      }
    }
  }

  /**
   * Search GeBIZ portal directly for EPU/SER/19 tenders
   */
  async searchGeBIZPortal() {
    const tenders = [];

    try {
      console.log('🌐 Navigating to GeBIZ opportunities portal...');
      await this.page.goto(this.searchUrl, {
        waitUntil: 'networkidle2',
        timeout: this.options.timeout
      });

      // Wait for page to stabilize
      await this.randomDelay(3000, 5000);

      // Look for search functionality
      await this.waitForSearchForm();

      // Perform targeted searches for EPU/SER/19 terms
      for (const searchTerm of this.epuSearchTerms.slice(0, 3)) { // Limit to avoid being blocked
        try {
          console.log(`🔍 Searching for: "${searchTerm}"`);

          const searchResults = await this.performSearch(searchTerm);
          tenders.push(...searchResults);

          // Add delay between searches
          await this.randomDelay(4000, 7000);
        } catch (searchError) {
          console.log(`⚠️  Search failed for "${searchTerm}":`, searchError.message);
        }
      }

      // Remove duplicates based on tender number or title
      const uniqueTenders = this.removeDuplicateTenders(tenders);
      console.log(`📊 Found ${uniqueTenders.length} unique tenders from portal search`);

      return uniqueTenders;

    } catch (error) {
      console.error('Portal search failed:', error);
      return [];
    }
  }

  /**
   * Wait for search form to be available
   */
  async waitForSearchForm() {
    try {
      // Wait for various possible search elements
      await Promise.race([
        this.page.waitForSelector('input[type="text"]', { timeout: 15000 }),
        this.page.waitForSelector('textarea', { timeout: 15000 }),
        this.page.waitForSelector('[placeholder*="search" i]', { timeout: 15000 }),
        this.page.waitForSelector('form', { timeout: 15000 })
      ]);

      console.log('✅ Search form detected');
    } catch (error) {
      console.log('⚠️  No search form found, continuing with page scraping');
    }
  }

  /**
   * Perform search for specific term
   */
  async performSearch(searchTerm) {
    const results = [];

    try {
      // Find and use search input
      const searchInputs = await this.page.$$('input[type="text"], textarea');

      if (searchInputs.length > 0) {
        const searchInput = searchInputs[0];

        // Clear and enter search term
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(searchTerm, { delay: 100 });

        // Submit search
        await Promise.race([
          searchInput.press('Enter'),
          this.page.click('input[type="submit"], button[type="submit"]').catch(() => {})
        ]);

        // Wait for results
        await Promise.race([
          this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }),
          this.page.waitForSelector('.result, .tender, .opportunity', { timeout: 10000 }).catch(() => {})
        ]);

        await this.randomDelay(2000, 4000);
      }

      // Extract tender data from current page
      const pageResults = await this.extractTenderDataFromPage(searchTerm);
      results.push(...pageResults);

    } catch (error) {
      console.log(`Search execution failed for "${searchTerm}":`, error.message);
    }

    return results;
  }

  /**
   * Extract tender data from the current page
   */
  async extractTenderDataFromPage(searchContext = '') {
    try {
      const tenders = await this.page.evaluate((context) => {
        const results = [];

        // Multiple selectors for different GeBIZ layouts
        const tenderSelectors = [
          'tr[data-rk], .tender-row, .opportunity-row',
          '.dataTable tbody tr',
          '[class*="tender"], [class*="opportunity"]',
          'table tr',
          '.result-item, .listing-item'
        ];

        let tenderElements = [];
        for (const selector of tenderSelectors) {
          tenderElements = document.querySelectorAll(selector);
          if (tenderElements.length > 0) break;
        }

        console.log(`Found ${tenderElements.length} potential tender elements`);

        tenderElements.forEach((element, index) => {
          try {
            const textContent = element.textContent || '';

            // Skip headers and empty rows
            if (textContent.length < 30 ||
                textContent.toLowerCase().includes('tender no') ||
                textContent.toLowerCase().includes('description')) {
              return;
            }

            // Extract basic information
            const cells = element.querySelectorAll('td, .cell, .field');
            const links = element.querySelectorAll('a');

            let tenderNo = '';
            let title = '';
            let agency = '';
            let closingDate = '';
            let publishedDate = '';
            let url = '';

            // Extract from table cells if available
            if (cells.length >= 3) {
              tenderNo = cells[0]?.textContent?.trim() || '';
              title = cells[1]?.textContent?.trim() || '';
              agency = cells[2]?.textContent?.trim() || '';
              if (cells.length > 3) {
                closingDate = cells[cells.length - 1]?.textContent?.trim() || '';
              }
            } else {
              // Extract from links and general content
              if (links.length > 0) {
                title = links[0].textContent?.trim() || '';
                url = links[0].href || '';
              }

              // Try to extract tender number from text
              const tenderNoMatch = textContent.match(/([A-Z0-9]{10,}|[A-Z]+\d{6,})/);
              if (tenderNoMatch) {
                tenderNo = tenderNoMatch[1];
              }
            }

            // Skip if no meaningful content found
            if (!title && !tenderNo) {
              return;
            }

            // Generate fallback values
            if (!tenderNo) {
              tenderNo = `EPU-${Date.now()}-${index}`;
            }

            if (!title) {
              title = textContent.substring(0, 100).trim();
            }

            results.push({
              tender_no: tenderNo,
              title: title,
              agency: agency,
              closing_date: closingDate,
              published_date: publishedDate,
              url: url.startsWith('http') ? url : (url ? `https://www.gebiz.gov.sg${url}` : ''),
              description: textContent.substring(0, 500).trim(),
              search_context: context,
              scraped_at: new Date().toISOString()
            });
          } catch (e) {
            console.log('Error processing tender element:', e.message);
          }
        });

        return results;
      }, searchContext);

      console.log(`📊 Extracted ${tenders.length} tenders from page`);
      return tenders;

    } catch (error) {
      console.error('Failed to extract tender data from page:', error);
      return [];
    }
  }

  /**
   * Parse GeBIZ RSS feed for recent tenders
   */
  async parseGeBIZRSS() {
    try {
      console.log('📡 Fetching GeBIZ RSS feed...');

      const response = await axios.get(this.rssUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const tenders = [];

      $('item').each((index, item) => {
        try {
          const title = $(item).find('title').text().trim();
          const description = $(item).find('description').text().trim();
          const link = $(item).find('link').text().trim();
          const pubDate = $(item).find('pubDate').text().trim();

          if (title && title.length > 10) {
            // Extract tender number from title or link
            const tenderNoMatch = title.match(/([A-Z0-9]{8,})/);
            const tenderNo = tenderNoMatch ? tenderNoMatch[1] : `RSS-${Date.now()}-${index}`;

            // Extract agency from title (usually in brackets or after dash)
            const agencyMatch = title.match(/[-–]\s*([^-–]+)$/) || title.match(/\(([^)]+)\)/);
            const agency = agencyMatch ? agencyMatch[1].trim() : '';

            tenders.push({
              tender_no: tenderNo,
              title: title,
              description: description,
              agency: agency,
              url: link,
              published_date: pubDate ? new Date(pubDate).toISOString().split('T')[0] : null,
              scraped_at: new Date().toISOString(),
              source: 'rss_feed'
            });
          }
        } catch (e) {
          console.log('Error processing RSS item:', e.message);
        }
      });

      console.log(`📡 Found ${tenders.length} tenders from RSS feed`);
      return tenders;

    } catch (error) {
      console.error('RSS parsing failed:', error);
      return [];
    }
  }

  /**
   * Extract patterns from historical data to find missed opportunities
   */
  async extractFromHistoricalPatterns() {
    // This would connect to the historical database and look for patterns
    // For now, return empty array
    console.log('📊 Analyzing historical patterns for missed opportunities...');
    return [];
  }

  /**
   * Remove duplicate tenders based on tender number or similar titles
   */
  removeDuplicateTenders(tenders) {
    const seen = new Set();
    const unique = [];

    for (const tender of tenders) {
      const identifier = tender.tender_no || tender.title?.substring(0, 50);
      if (identifier && !seen.has(identifier)) {
        seen.add(identifier);
        unique.push(tender);
      }
    }

    return unique;
  }

  /**
   * Random delay to simulate human behavior
   */
  async randomDelay(min = 2000, max = 5000) {
    const delay = Math.random() * (max - min) + min;
    await this.delay(delay);
  }

  /**
   * Simple delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get scraping statistics
   */
  getStats() {
    return {
      ...this.scrapingStats,
      isInitialized: this.isInitialized,
      rateLimitRemaining: this.rateLimiter.remainingPoints || 0
    };
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isInitialized = false;
      console.log('EPU scraper cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Schedule regular EPU/SER/19 monitoring
   */
  startMonitoring(intervalMinutes = 30) {
    console.log(`🕐 Starting EPU/SER/19 monitoring every ${intervalMinutes} minutes`);

    const interval = setInterval(async () => {
      try {
        console.log('🔄 Starting scheduled EPU/SER/19 scan...');
        await this.scrapeEPUTenders();

        // Generate market report after each scan
        const report = this.monitor.generateMarketReport();
        console.log(`📊 Market Report: ${report.active_opportunities} active opportunities, $${report.total_estimated_value.toLocaleString()} total value`);

      } catch (error) {
        console.error('Scheduled EPU scan failed:', error.message);
      }
    }, intervalMinutes * 60 * 1000);

    return interval;
  }
}

module.exports = EPUSer19Scraper;