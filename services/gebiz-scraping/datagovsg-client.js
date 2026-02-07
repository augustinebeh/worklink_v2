/**
 * Data.gov.sg API Client
 * Fetches historical GeBIZ procurement data from Singapore's open data portal
 * 
 * API Documentation: https://data.gov.sg/developer
 * Dataset: Government Procurement via GeBIZ
 */

const axios = require('axios');

class DataGovSGClient {
  constructor() {
    this.baseURL = 'https://data.gov.sg/api/action';

    // Correct Resource ID for GeBIZ Government Procurement dataset
    this.resourceId = 'd_acde1106003906a75c3fa052592f2fcb';

    // API Key for authentication
    this.apiKey = process.env.DATA_GOV_SG_API_KEY;

    // Rate limiting — increased to 3s to avoid 429 errors
    this.lastRequestTime = null;
    this.minRequestDelay = 3000; // 3 seconds between requests
    this.maxRetries = 3;
  }

  /**
   * Respect rate limiting
   */
  async respectRateLimit() {
    if (this.lastRequestTime) {
      const elapsed = Date.now() - this.lastRequestTime;
      if (elapsed < this.minRequestDelay) {
        const delay = this.minRequestDelay - elapsed;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Search historical GeBIZ procurement data with retry on 429
   */
  async searchProcurement(filters = {}, limit = 100, offset = 0) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      await this.respectRateLimit();

      try {
        const params = {
          resource_id: this.resourceId,
          limit: limit,
          offset: offset,
          ...filters
        };

        console.log(`🔍 Fetching procurement data: offset=${offset}, limit=${limit}${attempt > 1 ? ` (retry ${attempt})` : ''}`);

        const headers = {};
        if (this.apiKey) {
          headers['Authorization'] = this.apiKey;
        }

        const response = await axios.get(`${this.baseURL}/datastore_search`, {
          params: params,
          headers: headers,
          timeout: 30000
        });

        if (response.data.success) {
          return {
            success: true,
            total: response.data.result.total,
            records: response.data.result.records,
            fields: response.data.result.fields
          };
        } else {
          return {
            success: false,
            error: 'API returned success: false'
          };
        }

      } catch (error) {
        const status = error.response?.status;
        // Retry on 429 (rate limit) or 5xx (server error) with exponential backoff
        if ((status === 429 || (status >= 500 && status < 600)) && attempt < this.maxRetries) {
          const backoff = Math.pow(2, attempt) * 5000; // 10s, 20s, 40s
          console.warn(`⚠️ Data.gov.sg ${status} error, retrying in ${backoff / 1000}s... (attempt ${attempt}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        console.error('❌ Data.gov.sg API error:', error.message);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  /**
   * Search by keywords
   */
  async searchByKeywords(keywords, maxResults = 10000) {
    console.log(`🔍 Searching for keywords: ${keywords.join(', ')}`);

    const query = keywords.join(' OR ');
    
    const filters = {
      q: query
    };
    
    let allRecords = [];
    let offset = 0;
    const limit = 1000;
    
    while (allRecords.length < maxResults) {
      const result = await this.searchProcurement(filters, limit, offset);
      
      if (!result.success || result.records.length === 0) {
        break;
      }
      
      allRecords = allRecords.concat(result.records);
      offset += limit;
      
      console.log(`  ✅ Fetched ${allRecords.length}/${Math.min(result.total, maxResults)} records`);
      
      if (allRecords.length >= result.total || allRecords.length >= maxResults) {
        break;
      }
    }
    
    return allRecords.slice(0, maxResults);
  }

  /**
   * Get dataset metadata
   */
  async getMetadata() {
    try {
      const headers = {};
      if (this.apiKey) {
        headers['Authorization'] = this.apiKey;
      }

      const response = await axios.get(`${this.baseURL}/datastore_search`, {
        params: {
          resource_id: this.resourceId,
          limit: 1
        },
        headers: headers
      });

      if (response.data.success) {
        return {
          success: true,
          total_records: response.data.result.total,
          fields: response.data.result.fields.map(f => ({
            id: f.id,
            type: f.type
          }))
        };
      }

      return { success: false };

    } catch (error) {
      console.error('❌ Error fetching metadata:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Normalize record format based on correct GeBIZ dataset structure
   * Fields from API: tender_no, tender_description, agency, award_date,
   * tender_detail_status, supplier_name, awarded_amt, _id
   */
  normalizeRecord(record) {
    return {
      tender_no: record.tender_no || null,
      description: record.tender_description || null,
      awarded_amount: parseFloat(record.awarded_amt || 0),
      supplier_name: record.supplier_name || null,
      award_date: record.award_date || null,
      agency: record.agency || null,
      tender_status: record.tender_detail_status || null,
      category: null, // Not available in this dataset
      contract_period_start: null, // Not available in this dataset
      contract_period_end: null, // Not available in this dataset
      raw_data: JSON.stringify(record)
    };
  }
}

module.exports = new DataGovSGClient();
