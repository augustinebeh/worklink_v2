/**
 * GeBIZ RSS Feed Checking & Tender Alert Handler
 */

const { logger } = require('../../utils/structured-logger');
const { db } = require('../../db');

async function checkGeBIZFeed() {
  logger.info('Starting GeBIZ RSS feed check', { module: 'job-scheduler' });

  try {
    const Parser = require('rss-parser');
    const parser = new Parser();
    const GEBIZ_RSS_URL = 'https://www.gebiz.gov.sg/rss/ptn-rss.xml';

    const alerts = db.prepare('SELECT * FROM tender_alerts WHERE active = 1').all();
    if (alerts.length === 0) {
      return {
        type: 'gebiz_rss_check',
        status: 'completed',
        message: 'No active alerts to check',
        new_tenders: 0,
        new_matches: 0,
        processed_items: 0,
        timestamp: new Date().toISOString()
      };
    }

    const now = new Date().toISOString();
    let results = {
      type: 'gebiz_rss_check',
      status: 'completed',
      checkedAt: now,
      alertsChecked: alerts.length,
      newTenders: 0,
      newMatches: 0,
      processedItems: 0,
      errors: []
    };

    const feed = await parser.parseURL(GEBIZ_RSS_URL);
    results.processedItems = feed.items.length;

    logger.info('Fetched GeBIZ RSS feed', {
      module: 'job-scheduler',
      items_count: feed.items.length
    });

    for (const item of feed.items) {
      try {
        const tenderData = extractTenderFromRSSItem(item);

        const existingTender = db.prepare(
          'SELECT id FROM tenders WHERE external_id = ? AND source = "gebiz"'
        ).get(tenderData.external_id);

        let tenderId;

        if (!existingTender) {
          tenderId = 'TND' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4);

          db.prepare(`
            INSERT INTO tenders (
              id, source, external_id, title, agency, category,
              estimated_value, closing_date, status, location,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            tenderId, 'gebiz', tenderData.external_id, tenderData.title,
            tenderData.agency, tenderData.category, tenderData.estimated_value,
            tenderData.closing_date, 'new', tenderData.location, now, now
          );

          results.newTenders++;
          logger.info('Created new tender', {
            module: 'job-scheduler',
            tender_id: tenderId,
            title: tenderData.title
          });
        } else {
          tenderId = existingTender.id;
        }

        for (const alert of alerts) {
          const isMatch = checkKeywordMatch(tenderData.title, tenderData.category, alert.keyword);

          if (isMatch) {
            const existingMatch = db.prepare(
              'SELECT id FROM tender_matches WHERE alert_id = ? AND tender_id = ?'
            ).get(alert.id, tenderId);

            if (!existingMatch) {
              db.prepare(`
                INSERT INTO tender_matches (
                  alert_id, tender_id, external_url, title,
                  matched_keyword, notified, created_at
                ) VALUES (?, ?, ?, ?, ?, 0, ?)
              `).run(alert.id, tenderId, tenderData.external_url, tenderData.title, alert.keyword, now);

              results.newMatches++;
              logger.info('New tender match found', {
                module: 'job-scheduler',
                keyword: alert.keyword,
                tender_title: tenderData.title
              });

              if (alert.email_notify) {
                await sendTenderAlert(alert, tenderData);
              }
            }
          }
        }
      } catch (itemError) {
        logger.error('Error processing RSS item', {
          module: 'job-scheduler',
          error: itemError.message
        });
        results.errors.push(`Item processing error: ${itemError.message}`);
      }
    }

    db.prepare('UPDATE tender_alerts SET last_checked = ? WHERE active = 1').run(now);
    results.timestamp = new Date().toISOString();

    logger.info('GeBIZ RSS check completed', {
      module: 'job-scheduler',
      new_tenders: results.newTenders,
      new_matches: results.newMatches,
      processed_items: results.processedItems
    });

    return results;
  } catch (error) {
    logger.error('GeBIZ RSS check failed', {
      module: 'job-scheduler',
      error: error.message,
      stack: error.stack
    });

    const now = new Date().toISOString();
    db.prepare('UPDATE tender_alerts SET last_checked = ? WHERE active = 1').run(now);

    return {
      type: 'gebiz_rss_check',
      status: 'error',
      error: error.message,
      timestamp: now
    };
  }
}

function extractTenderFromRSSItem(item) {
  const title = item.title || '';
  const description = item.description || item.content || '';
  const external_url = item.link || item.guid || '';

  const agencyMatch = title.match(/^([^-]+)-(.+)$/);
  const agency = agencyMatch ? agencyMatch[1].trim() : null;
  const actualTitle = agencyMatch ? agencyMatch[2].trim() : title;

  const external_id = extractTenderIdFromUrl(external_url) || item.guid || external_url;
  const estimated_value = extractEstimatedValue(description);
  const closing_date = extractClosingDate(description, item.pubDate);
  const category = categorizeTender(actualTitle, description);

  return {
    external_id, title: actualTitle, agency, category,
    estimated_value, closing_date, external_url, location: 'Singapore'
  };
}

function checkKeywordMatch(title, category, keyword) {
  const searchText = `${title} ${category || ''}`.toLowerCase();
  const keywordLower = keyword.toLowerCase();

  if (searchText.includes(keywordLower)) return true;

  const keywordWords = keywordLower.split(/\s+/);
  const allWordsMatch = keywordWords.every(word => searchText.includes(word));
  return allWordsMatch && keywordWords.length > 1;
}

function extractTenderIdFromUrl(url) {
  if (!url) return null;
  const patterns = [/ptn_no=([^&]+)/i, /tender[_-]id=([^&]+)/i, /id=([^&]+)/i, /\/([A-Z0-9]+)$/i];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  const urlParts = url.split('/').filter(Boolean);
  return urlParts[urlParts.length - 1] || null;
}

function extractEstimatedValue(description) {
  if (!description) return null;
  const patterns = [
    /value[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
    /amount[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
    /budget[:\s]*S?\$?([\d,]+(?:\.\d{2})?)/i,
    /S\$([\d,]+(?:\.\d{2})?)/i
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(value) && value > 0) return value;
    }
  }
  return null;
}

function extractClosingDate(description, pubDate) {
  if (!description) return null;
  const patterns = [
    /closing[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /deadline[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /due[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/g
  ];
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      try {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime()) && date > new Date()) return date.toISOString();
      } catch (error) { continue; }
    }
  }
  return null;
}

function categorizeTender(title, description) {
  const content = `${title} ${description}`.toLowerCase();
  const categories = {
    'Manpower Services': ['manpower', 'staff', 'personnel', 'human resource', 'temporary', 'contract worker'],
    'Event Services': ['event', 'exhibition', 'conference', 'seminar', 'ceremony'],
    'Security Services': ['security', 'guard', 'surveillance', 'protection'],
    'Cleaning Services': ['cleaning', 'housekeeping', 'maintenance', 'janitorial'],
    'IT Services': ['information technology', 'software', 'hardware', 'digital', 'system'],
    'Professional Services': ['consultancy', 'advisory', 'professional', 'expert'],
    'Logistics Services': ['logistics', 'transportation', 'delivery', 'warehouse'],
    'Construction': ['construction', 'building', 'renovation', 'infrastructure'],
    'F&B Services': ['catering', 'food', 'beverage', 'meal', 'dining']
  };
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => content.includes(keyword))) return category;
  }
  return 'General Services';
}

async function sendTenderAlert(alert, tenderData) {
  try {
    const emailService = require('../email');
    if (emailService && emailService.isReady()) {
      await emailService.sendTenderAlert(alert, tenderData);
      logger.info('Tender alert email sent', {
        module: 'job-scheduler',
        alert_id: alert.id,
        tender_title: tenderData.title
      });
    } else {
      logger.warn('Email service not available for tender alert', {
        module: 'job-scheduler',
        alert_id: alert.id
      });
    }
  } catch (error) {
    logger.error('Failed to send tender alert email', {
      module: 'job-scheduler',
      alert_id: alert.id,
      error: error.message
    });
  }
}

module.exports = { checkGeBIZFeed };
