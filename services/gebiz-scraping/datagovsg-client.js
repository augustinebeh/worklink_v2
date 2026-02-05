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
    
    // Resource ID for Government Procurement dataset
    this.resourceId = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
    
    // Rate limiting
    this.lastRequestTime = null;
    this.minRequestDelay = 1000; // 1 second between requests
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
   * Search historical GeBIZ procurement data
   */
  async searchProcurement(filters = {}, limit = 100, offset = 0) {
    await this.respectRateLimit();

    try {
      const params = {
        resource_id: this.resourceId,
        limit: limit,
        offset: offset,
        ...filters
      };

      console.log(`🔍 Fetching procurement data: offset=${offset}, limit=${limit}`);

      const response = await axios.get(`${this.baseURL}/datastore_search`, {
        params: params,
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
      console.error('❌ Data.gov.sg API error:', error.message);
      return {
        success: false,
        error: error.message
      };
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
      const response = await axios.get(`${this.baseURL}/datastore_search`, {
        params: {
          resource_id: this.resourceId,
          limit: 1
        }
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
   * Normalize record format
   */
  normalizeRecord(record) {
    return {
      tender_no: record.tender_no || record.reference_no || null,
      description: record.tender_description || record.description || null,
      awarded_amount: parseFloat(record.awarded_amt || record.award_amt || 0),
      supplier_name: record.supplier_name || record.awardee || null,
      award_date: record.award_date || record.awarded_date || null,
      agency: record.agency || record.buyer_name || null,
      category: record.category || null,
      contract_period_start: record.contract_period_start || null,
      contract_period_end: record.contract_period_end || null,
      raw_data: JSON.stringify(record)
    };
  }
}

module.exports = new DataGovSGClient();
