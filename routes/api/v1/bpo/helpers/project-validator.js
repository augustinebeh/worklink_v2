/**
 * BPO Project Validator Helper
 * Handles validation logic for tender workflows and assignments
 */

/**
 * Validate tender promotion to bidding
 */
function validateTenderPromotion(tender, params = {}) {
  const errors = [];

  if (!tender) {
    errors.push('Tender not found');
    return { valid: false, errors };
  }

  if (tender.status === 'bidding') {
    errors.push('Tender is already in bidding status');
  }

  if (tender.closing_date && new Date(tender.closing_date) < new Date()) {
    errors.push('Tender has already closed');
  }

  if (params.bid_amount && params.bid_amount <= 0) {
    errors.push('Bid amount must be positive');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate sourcing campaign creation
 */
function validateSourcingCampaign(tender, params = {}) {
  const errors = [];

  if (!tender) {
    errors.push('Tender not found');
    return { valid: false, errors };
  }

  if (tender.status === 'closed' || tender.status === 'cancelled') {
    errors.push('Cannot create campaign for closed/cancelled tender');
  }

  if (params.target_count && (params.target_count < 1 || params.target_count > 500)) {
    errors.push('Target count must be between 1 and 500');
  }

  if (params.priority && !['low', 'medium', 'high', 'urgent'].includes(params.priority)) {
    errors.push('Invalid priority level');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate tender assignment to client
 */
function validateTenderAssignment(tender, client, params = {}) {
  const errors = [];

  if (!tender) {
    errors.push('Tender not found');
    return { valid: false, errors };
  }

  if (!client) {
    errors.push('Client not found');
    return { valid: false, errors };
  }

  if (client.status !== 'active') {
    errors.push('Client is not active');
  }

  if (tender.assigned_to === client.id) {
    errors.push('Tender is already assigned to this client');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate monitoring alert creation
 */
function validateMonitoringAlert(tender, params = {}) {
  const errors = [];

  if (!tender) {
    errors.push('Tender not found');
    return { valid: false, errors };
  }

  if (params.keywords) {
    if (!Array.isArray(params.keywords)) {
      errors.push('Keywords must be an array');
    } else if (params.keywords.some(k => typeof k !== 'string' || k.length < 2)) {
      errors.push('All keywords must be strings with at least 2 characters');
    } else if (params.keywords.length > 10) {
      errors.push('Maximum 10 keywords allowed');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate bulk status update
 */
function validateBulkStatusUpdate(tender_ids, new_status) {
  const errors = [];

  if (!Array.isArray(tender_ids) || tender_ids.length === 0) {
    errors.push('tender_ids must be a non-empty array');
  }

  if (tender_ids.length > 100) {
    errors.push('Maximum 100 tenders can be updated at once');
  }

  const validStatuses = ['new', 'reviewing', 'bidding', 'submitted', 'won', 'lost', 'closed', 'cancelled'];
  if (!validStatuses.includes(new_status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate workflow action parameters
 */
function validateWorkflowAction(action, tender_id, params = {}) {
  const errors = [];

  if (!action) {
    errors.push('Action is required');
  }

  if (!tender_id) {
    errors.push('Tender ID is required');
  }

  const validActions = [
    'promote_to_bidding',
    'start_sourcing_campaign',
    'assign_to_client',
    'trigger_ai_analysis',
    'create_monitoring_alert',
    'bulk_update_status'
  ];

  if (!validActions.includes(action)) {
    errors.push(`Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  // Action-specific validation
  switch (action) {
    case 'assign_to_client':
      if (!params.client_id) {
        errors.push('client_id is required for assign_to_client action');
      }
      break;

    case 'bulk_update_status':
      if (!params.tender_ids || !params.new_status) {
        errors.push('tender_ids and new_status are required for bulk_update_status action');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate analytics query parameters
 */
function validateAnalyticsQuery(startDate, endDate, groupBy) {
  const errors = [];

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      errors.push('Invalid startDate format');
    }

    if (isNaN(end.getTime())) {
      errors.push('Invalid endDate format');
    }

    if (start >= end) {
      errors.push('startDate must be before endDate');
    }

    // Check if date range is too large
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      errors.push('Date range cannot exceed 365 days');
    }
  }

  const validGroupBy = ['day', 'week', 'month'];
  if (groupBy && !validGroupBy.includes(groupBy)) {
    errors.push(`Invalid groupBy. Must be one of: ${validGroupBy.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateTenderPromotion,
  validateSourcingCampaign,
  validateTenderAssignment,
  validateMonitoringAlert,
  validateBulkStatusUpdate,
  validateWorkflowAction,
  validateAnalyticsQuery
};