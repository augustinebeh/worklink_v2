/**
 * Production GeBIZ Tender Scraper
 * Replaces mock data with actual web scraping using Puppeteer
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

// Configure puppeteer plugins
puppeteer.use(StealthPlugin());
puppeteer.use(RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: process.env.CAPTCHA_API_KEY || 'demo_key'
  },
  visualFeedback: true
}));

// Rate limiter - max 10 requests per minute
const rateLimiter = new RateLimiterMemory({
  keyGenerator: () => 'gebiz_scraper',
  points: 10,
  duration: 60,
});

class GeBIZScraper {
  constructor(options = {}) {
    this.baseUrl = 'https://www.gebiz.gov.sg';
    this.searchUrl = `${this.baseUrl}/ptn/opportunity/BOListing.xhtml`;
    this.options = {
      headless: options.headless !== false,
      timeout: options.timeout || 30000,
      retries: options.retries || 3,
      delay: options.delay || 2000,
      ...options
    };

    this.browser = null;
    this.page = null;
    this.isInitialized = false;
    this.scrapingStats = {
      totalRequests: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      captchasSolved: 0,
      lastScrapeTime: null,
      errors: []
    };
  }

  async initialize() {
    if (this.isInitialized && this.browser) {
      return;
    }

    try {
      // Check rate limit
      await rateLimiter.consume('gebiz_scraper');

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
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ],
        defaultViewport: { width: 1366, height: 768 }
      });

      this.page = await this.browser.newPage();

      // Set realistic headers
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      // Block unnecessary resources to speed up scraping
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Handle dialogs/alerts
      this.page.on('dialog', async dialog => {
        console.log(`Dialog appeared: ${dialog.message()}`);
        await dialog.accept();
      });

      this.isInitialized = true;
      console.log('GeBIZ scraper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GeBIZ scraper:', error);
      await this.cleanup();
      throw error;
    }
  }

  async scrapeTenders(categories = ['manpower', 'hr services', 'event support'], options = {}) {
    const startTime = Date.now();
    let attempts = 0;
    const maxAttempts = this.options.retries;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        this.scrapingStats.totalRequests++;

        await this.initialize();

        console.log(`Scraping GeBIZ tenders (attempt ${attempts}/${maxAttempts})...`);

        // Navigate to GeBIZ opportunities page
        await this.page.goto(this.searchUrl, {
          waitUntil: 'networkidle2',
          timeout: this.options.timeout
        });

        // Wait for page to load completely
        await this.randomDelay(2000, 4000);

        // Check for CAPTCHA
        if (await this.handleCaptcha()) {
          this.scrapingStats.captchasSolved++;
        }

        // Perform search for relevant tenders
        const tenders = await this.searchTenders(categories);

        // Add delay between requests
        await this.randomDelay();

        this.scrapingStats.successfulScrapes++;
        this.scrapingStats.lastScrapeTime = new Date().toISOString();

        console.log(`Successfully scraped ${tenders.length} tenders in ${Date.now() - startTime}ms`);
        return tenders;

      } catch (error) {
        console.error(`Scraping attempt ${attempts} failed:`, error.message);
        this.scrapingStats.failedScrapes++;
        this.scrapingStats.errors.push({
          timestamp: new Date().toISOString(),
          attempt: attempts,
          error: error.message
        });

        if (attempts === maxAttempts) {
          throw new Error(`Failed to scrape after ${maxAttempts} attempts. Last error: ${error.message}`);
        }

        // Exponential backoff
        const backoffDelay = Math.min(30000, 1000 * Math.pow(2, attempts));
        console.log(`Waiting ${backoffDelay}ms before retry...`);
        await this.delay(backoffDelay);

        // Restart browser on persistent failures
        if (attempts > 1) {
          await this.cleanup();
          this.isInitialized = false;
        }
      }
    }
  }

  async searchTenders(categories) {
    const tenders = [];

    try {
      // Wait for search form
      await this.page.waitForSelector('form', { timeout: 10000 });

      // Look for search input fields
      const searchFields = await this.page.$$('input[type="text"], textarea');

      if (searchFields.length > 0) {
        // Enter search terms
        const searchTerm = categories.join(' OR ');
        await searchFields[0].click();
        await searchFields[0].clear();
        await searchFields[0].type(searchTerm, { delay: 100 });

        // Submit search
        const searchButton = await this.page.$('input[type="submit"], button[type="submit"]');
        if (searchButton) {
          await searchButton.click();
          await this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        }
      }

      // Wait for results to load
      await this.randomDelay(3000, 5000);

      // Extract tender data from results
      const tendersData = await this.page.evaluate(() => {
        const results = [];

        // Look for tender rows/cards
        const tenderElements = document.querySelectorAll('tr, .tender-item, .opportunity-item, .row');

        tenderElements.forEach((element, index) => {
          try {
            const text = element.textContent || '';
            const links = element.querySelectorAll('a');

            // Skip if not enough content
            if (text.length < 50) return;

            // Extract basic info
            const titleElement = links[0] || element.querySelector('h3, .title, [class*="title"]');
            const title = titleElement ? titleElement.textContent.trim() : '';

            if (!title) return;

            // Extract other details using various selectors
            const agency = this.extractText(element, ['.agency', '[class*="agency"]', 'td:nth-child(2)']) || '';
            const closingDate = this.extractText(element, ['.closing', '[class*="date"]', 'td:last-child']) || '';
            const description = this.extractText(element, ['.description', '.details']) || '';

            // Generate external ID from link or position
            let externalId = '';
            if (titleElement && titleElement.href) {
              const match = titleElement.href.match(/id=([^&]+)/);
              externalId = match ? match[1] : `AUTO-${Date.now()}-${index}`;
            } else {
              externalId = `AUTO-${Date.now()}-${index}`;
            }

            results.push({
              title: title,
              agency: agency,
              closingDate: closingDate,
              description: description,
              externalId: externalId,
              sourceUrl: titleElement && titleElement.href ? titleElement.href : '',
              scrapedAt: new Date().toISOString()
            });
          } catch (e) {
            console.log('Error processing tender element:', e.message);
          }
        });

        return results;
      });

      // Process and enhance the scraped data
      for (const tender of tendersData) {
        if (tender.title && tender.title.length > 10) {
          const processedTender = await this.processTenderData(tender, categories);
          if (processedTender) {
            tenders.push(processedTender);
          }
        }
      }

      // If no specific results found, scrape recent tenders from RSS as fallback
      if (tenders.length === 0) {
        console.log('No specific search results, falling back to RSS scraping...');
        const rssTenders = await this.scrapeRSSFeed();
        tenders.push(...rssTenders);
      }

    } catch (error) {
      console.error('Error in searchTenders:', error);
      // Fallback to RSS on search failure
      const rssTenders = await this.scrapeRSSFeed();
      tenders.push(...rssTenders);
    }

    return tenders;
  }

  async processTenderData(rawTender, categories) {
    try {
      // Clean and validate the data
      const title = this.cleanText(rawTender.title);
      const agency = this.cleanText(rawTender.agency) || this.extractAgencyFromTitle(title);
      const category = this.categorizeTitle(title, categories);

      // Parse closing date
      let closingDate = this.parseDate(rawTender.closingDate);
      if (!closingDate) {
        // Default to 30 days from now if no date found
        closingDate = new Date();
        closingDate.setDate(closingDate.getDate() + 30);
      }

      // Estimate values based on title and category
      const estimates = this.estimateTenderValues(title, category);

      return {
        id: `TND${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
        source: 'gebiz',
        external_id: rawTender.externalId || `GBZ-${Date.now()}`,
        title: title,
        agency: agency,
        category: category,
        estimated_value: estimates.totalValue,
        closing_date: closingDate.toISOString().split('T')[0],
        manpower_required: estimates.manpower,
        duration_months: estimates.duration,
        location: this.extractLocation(title + ' ' + (rawTender.description || '')),
        estimated_charge_rate: estimates.chargeRate,
        estimated_pay_rate: estimates.payRate,
        estimated_monthly_revenue: estimates.monthlyRevenue,
        win_probability: null,
        recommended_action: null,
        source_url: rawTender.sourceUrl,
        scraped_at: rawTender.scrapedAt
      };
    } catch (error) {
      console.error('Error processing tender data:', error);
      return null;
    }
  }

  async scrapeRSSFeed() {
    try {
      const Parser = require('rss-parser');
      const parser = new Parser();

      // GeBIZ RSS feed (if available)
      const rssUrl = 'https://www.gebiz.gov.sg/ptn/opportunity/BOListing.rss';

      const feed = await parser.parseURL(rssUrl);
      const tenders = [];

      for (const item of feed.items.slice(0, 10)) { // Limit to 10 recent items
        try {
          const tender = await this.processTenderData({
            title: item.title,
            description: item.contentSnippet || item.content,
            externalId: this.extractIdFromLink(item.link),
            sourceUrl: item.link,
            closingDate: item.pubDate,
            agency: this.extractAgencyFromTitle(item.title),
            scrapedAt: new Date().toISOString()
          }, ['manpower', 'hr services', 'event support']);

          if (tender) {
            tenders.push(tender);
          }
        } catch (e) {
          console.log('Error processing RSS item:', e.message);
        }
      }

      return tenders;
    } catch (error) {
      console.error('RSS scraping failed:', error);
      return [];
    }
  }

  async handleCaptcha() {
    try {
      // Check for various CAPTCHA indicators
      const captchaSelectors = [
        '.captcha',
        '[class*="captcha"]',
        'iframe[src*="recaptcha"]',
        '.g-recaptcha',
        '[class*="verification"]'
      ];

      for (const selector of captchaSelectors) {
        if (await this.page.$(selector)) {
          console.log('CAPTCHA detected, attempting to solve...');

          // Wait a bit for CAPTCHA to fully load
          await this.delay(3000);

          // Attempt to solve with plugin
          await this.page.solveRecaptchas();

          // Wait for solution
          await this.delay(5000);

          return true;
        }
      }

      return false;
    } catch (error) {
      console.log('CAPTCHA handling error:', error.message);
      return false;
    }
  }

  // Utility methods
  cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ').replace(/[^\w\s-.,()]/g, '');
  }

  extractAgencyFromTitle(title) {
    const agencies = ['MOE', 'MOH', 'MOM', 'MCCY', 'MND', 'GovTech', 'SLA', 'HDB', 'NEA', 'NParks', 'IRAS', 'CPF', 'PUB'];
    for (const agency of agencies) {
      if (title.toUpperCase().includes(agency)) {
        return agency;
      }
    }
    return 'Unknown Agency';
  }

  categorizeTitle(title, categories) {
    const lowerTitle = title.toLowerCase();
    for (const category of categories) {
      if (lowerTitle.includes(category.toLowerCase())) {
        return category;
      }
    }

    // Additional categorization logic
    if (lowerTitle.includes('event') || lowerTitle.includes('function')) return 'event support';
    if (lowerTitle.includes('admin') || lowerTitle.includes('clerical')) return 'administrative';
    if (lowerTitle.includes('security') || lowerTitle.includes('guard')) return 'security';
    if (lowerTitle.includes('cleaning') || lowerTitle.includes('maintenance')) return 'facility management';

    return 'general manpower';
  }

  parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      // Try various date formats
      const formats = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // DD/MM/YYYY
        /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i
      ];

      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }
    } catch (e) {
      console.log('Date parsing error:', e.message);
    }

    return null;
  }

  estimateTenderValues(title, category) {
    const lowerTitle = title.toLowerCase();
    let baseValue = 150000;
    let manpower = 10;
    let duration = 6;
    let chargeRate = 18;

    // Adjust based on keywords
    if (lowerTitle.includes('urgent') || lowerTitle.includes('immediate')) {
      baseValue *= 1.2;
      chargeRate += 2;
    }

    if (lowerTitle.includes('senior') || lowerTitle.includes('supervisor')) {
      chargeRate += 3;
    }

    if (lowerTitle.includes('weekend') || lowerTitle.includes('overtime')) {
      chargeRate += 4;
    }

    // Category-based adjustments
    switch (category) {
      case 'event support':
        duration = 2;
        manpower = 15;
        chargeRate = 20;
        break;
      case 'security':
        duration = 12;
        chargeRate = 16;
        break;
      case 'administrative':
        manpower = 5;
        chargeRate = 15;
        break;
    }

    const payRate = Math.max(12, chargeRate - 4);
    const monthlyRevenue = manpower * chargeRate * 160;
    const totalValue = monthlyRevenue * duration;

    return {
      totalValue: Math.round(totalValue),
      manpower: manpower,
      duration: duration,
      chargeRate: chargeRate,
      payRate: payRate,
      monthlyRevenue: Math.round(monthlyRevenue)
    };
  }

  extractLocation(text) {
    const locations = ['CBD', 'Jurong', 'Tampines', 'Woodlands', 'Buona Vista', 'Changi', 'Toa Payoh', 'Queenstown', 'Orchard', 'Marina Bay'];
    const lowerText = text.toLowerCase();

    for (const location of locations) {
      if (lowerText.includes(location.toLowerCase())) {
        return location;
      }
    }
    return 'TBC';
  }

  extractIdFromLink(link) {
    if (!link) return null;
    const match = link.match(/id=([^&]+)/);
    return match ? match[1] : null;
  }

  async randomDelay(min = 1000, max = 3000) {
    const delay = Math.random() * (max - min) + min;
    await this.delay(delay);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      ...this.scrapingStats,
      isInitialized: this.isInitialized,
      rateLimitRemaining: rateLimiter.remainingPoints || 0
    };
  }

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
      console.log('GeBIZ scraper cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = GeBIZScraper;