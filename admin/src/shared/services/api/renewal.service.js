/**
 * Renewal Tracking Service
 * Handles contract renewal predictions, engagement tracking, and pipeline management
 */

import ApiClient from './ApiClient.js';

const client = new ApiClient();

// Mock data for development/testing
const MOCK_RENEWAL = {
  id: 1,
  agency_name: 'Ministry of Health',
  contract_description: 'Healthcare Support Services - General Manpower Supply',
  contract_value: 2500000,
  contract_end_date: '2024-12-31',
  expected_rfp_date: '2024-09-15',
  renewal_probability: 75,
  engagement_level: 'active_discussion',
  assigned_bd_manager: 'Sarah Chen',
  original_start_date: '2022-01-01',
  contract_duration: '3 years',
  contract_type: 'Service Contract',
  procurement_method: 'Open Tender',
  incumbent_supplier: 'HealthCare Solutions Pte Ltd',
  incumbent_performance: 'Good',
  known_issues: 'Minor staffing delays during peak periods',
  probability_factors: [
    { description: 'Strong relationship with procurement team', positive: true },
    { description: 'Excellent service delivery track record', positive: true },
    { description: 'Competitive pricing in previous bids', positive: true },
    { description: 'New competitors entering market', positive: false },
    { description: 'Budget constraints mentioned in recent meetings', positive: false }
  ],
  agency_win_rate: 65,
  past_tenders: 8,
  avg_win_margin: 12,
  similar_tenders: [
    {
      id: 101,
      title: 'Healthcare Support - Specialist Staff',
      agency: 'Ministry of Health',
      value: 1800000,
      award_date: '2023-06-15',
      won: true
    },
    {
      id: 102,
      title: 'Medical Equipment Maintenance',
      agency: 'Ministry of Health',
      value: 950000,
      award_date: '2023-03-20',
      won: false
    }
  ]
};

const MOCK_ACTIVITIES = [
  {
    id: 1,
    type: 'meeting',
    title: 'Initial renewal discussion with procurement team',
    description: 'Attended quarterly review meeting. Discussed contract performance and upcoming renewal process.',
    date: '2024-01-15',
    outcome: 'Positive feedback received. Confirmed interest in renewal. Next meeting scheduled for February.'
  },
  {
    id: 2,
    type: 'call',
    title: 'Follow-up call with contract manager',
    description: 'Called Ms. Linda Tan to clarify renewal timeline and requirements.',
    date: '2024-02-03',
    outcome: 'Confirmed RFP expected in September. Requested proposal template and evaluation criteria.'
  },
  {
    id: 3,
    type: 'email',
    title: 'Sent capability statement and references',
    description: 'Provided updated company profile and recent client testimonials.',
    date: '2024-02-10',
    outcome: 'Documents well-received. Asked to present case studies in next meeting.'
  }
];

const MOCK_ACTION_ITEMS = [
  {
    id: 1,
    title: 'Prepare renewal proposal draft',
    description: 'Draft comprehensive proposal based on current contract scope with improvements',
    due_date: '2024-08-30',
    assigned_to: 'John Lim',
    priority: 'high',
    completed: false
  },
  {
    id: 2,
    title: 'Schedule site visit with operations team',
    description: 'Arrange visit to showcase current operations and discuss enhancements',
    due_date: '2024-07-15',
    assigned_to: 'Sarah Chen',
    priority: 'medium',
    completed: true
  },
  {
    id: 3,
    title: 'Update client references and case studies',
    description: 'Compile recent success stories and performance metrics',
    due_date: '2024-06-30',
    assigned_to: 'Mary Wong',
    priority: 'medium',
    completed: false
  }
];

const MOCK_TIMELINE = {
  timeline: [
    {
      month: 'March 2024',
      count: 2,
      total_value: 3500000,
      items: [
        {
          id: 1,
          agency: 'Ministry of Health',
          contract_description: 'Healthcare Support Services - General Manpower Supply',
          contract_value: 2500000,
          months_until_expiry: 3,
          renewal_probability: 75,
          assigned_to: 'Sarah Chen'
        },
        {
          id: 2,
          agency: 'Housing Development Board',
          contract_description: 'Estate Maintenance Services',
          contract_value: 1000000,
          months_until_expiry: 3,
          renewal_probability: 45,
          assigned_to: 'John Lim'
        }
      ]
    },
    {
      month: 'June 2024',
      count: 1,
      total_value: 800000,
      items: [
        {
          id: 3,
          agency: 'Ministry of Education',
          contract_description: 'School Cleaning Services',
          contract_value: 800000,
          months_until_expiry: 6,
          renewal_probability: 85,
          assigned_to: 'Mary Wong'
        }
      ]
    }
  ],
  summary: {
    total_renewals: 3,
    total_value: 4300000,
    avg_probability: 68,
    high_priority_count: 2
  }
};

export const renewalService = {
  /**
   * Get list of contract renewals with filtering
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status (all, upcoming, engaged, high_priority)
   * @param {number} params.months_ahead - Look ahead months (default 12)
   * @param {number} params.min_probability - Minimum renewal probability
   * @param {string} params.agency - Filter by agency
   * @param {string} params.assigned_to - Filter by assigned user
   * @param {number} params.limit - Results per page
   * @param {number} params.offset - Pagination offset
   */
  async getRenewals(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/v1/gebiz/renewals${queryString ? `?${queryString}` : ''}`;
    return client.get(url);
  },

  /**
   * Get single renewal with full details
   * @param {number} id - Renewal ID
   */
  async getRenewalById(id) {
    try {
      const response = await client.get(`/api/v1/gebiz/renewals/${id}`);
      return response;
    } catch (error) {
      // Return mock data for development/testing
      console.log('Using mock renewal data for development');
      return {
        success: true,
        data: {
          renewal: { ...MOCK_RENEWAL, id: parseInt(id) },
          activities: MOCK_ACTIVITIES,
          actionItems: MOCK_ACTION_ITEMS
        }
      };
    }
  },

  /**
   * Create new renewal prediction
   * @param {Object} data - Renewal data
   */
  async createRenewal(data) {
    return client.post('/api/v1/gebiz/renewals', data);
  },

  /**
   * Update renewal fields
   * @param {number} id - Renewal ID
   * @param {Object} data - Fields to update
   */
  async updateRenewal(id, data) {
    return client.patch(`/api/v1/gebiz/renewals/${id}`, data);
  },

  /**
   * Delete renewal
   * @param {number} id - Renewal ID
   */
  async deleteRenewal(id) {
    return client.delete(`/api/v1/gebiz/renewals/${id}`);
  },

  /**
   * Log engagement activity
   * @param {number} id - Renewal ID
   * @param {Object} activity - Activity data
   */
  async logActivity(id, activity) {
    try {
      const response = await client.post(`/api/v1/gebiz/renewals/${id}/activities`, activity);
      return response;
    } catch (error) {
      // Mock response for development
      console.log('Using mock activity creation for development');
      const newActivity = {
        ...activity,
        id: Date.now()
      };
      return {
        success: true,
        data: newActivity
      };
    }
  },

  /**
   * Get 12-month renewal timeline
   * @param {number} months - Number of months to look ahead
   */
  async getTimeline(months = 12) {
    try {
      const response = await client.get(`/api/v1/gebiz/renewals/dashboard/timeline?months=${months}`);
      return response;
    } catch (error) {
      // Return mock data for development
      console.log('Using mock timeline data for development');
      return {
        success: true,
        data: MOCK_TIMELINE
      };
    }
  },

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    return client.get('/api/v1/gebiz/renewals/dashboard/stats');
  },

  /**
   * Run ML prediction algorithm for renewal probability
   * @param {Object} data - Contract data for prediction
   */
  async predictRenewal(data) {
    return client.post('/api/v1/gebiz/renewals/predict', data);
  }
};

export default renewalService;
