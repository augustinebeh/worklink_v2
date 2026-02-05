/**
 * Query Builder for Candidate Database Operations
 * @module candidates/helpers/query-builder
 */

/**
 * Build a search query for candidates
 * @param {Object} filters - Filter parameters
 * @returns {Object} Query and parameters
 */
function buildSearchQuery(filters = {}) {
  let query = 'SELECT * FROM candidates WHERE 1=1';
  const params = [];

  // Status filter
  if (filters.status && filters.status !== 'all') {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  // Search term filter
  if (filters.search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  // Skills filter
  if (filters.skills && Array.isArray(filters.skills)) {
    const skillConditions = filters.skills.map(() => 'skills LIKE ?').join(' OR ');
    query += ` AND (${skillConditions})`;
    filters.skills.forEach(skill => {
      params.push(`%"${skill}"%`);
    });
  }

  // Location filter
  if (filters.location) {
    query += ' AND preferred_locations LIKE ?';
    params.push(`%"${filters.location}"%`);
  }

  // Experience level filter
  if (filters.experience_level) {
    query += ' AND experience_level = ?';
    params.push(filters.experience_level);
  }

  // Availability filter
  if (filters.available !== undefined) {
    query += ' AND available = ?';
    params.push(filters.available ? 1 : 0);
  }

  return { query, params };
}

/**
 * Build pagination parameters
 * @param {Object} options - Pagination options
 * @returns {Object} Pagination parameters
 */
function buildPagination(options = {}) {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build order clause
 * @param {string} sortBy - Sort field
 * @param {string} order - Sort order (ASC/DESC)
 * @returns {string} Order clause
 */
function buildOrderClause(sortBy = 'created_at', order = 'DESC') {
  const validSortFields = [
    'created_at', 'name', 'email', 'status', 'experience_level', 'last_active'
  ];

  const validOrders = ['ASC', 'DESC'];

  const field = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const direction = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

  return `ORDER BY ${field} ${direction}`;
}

/**
 * Build count query for pagination
 * @param {Object} filters - Filter parameters
 * @returns {Object} Count query and parameters
 */
function buildCountQuery(filters = {}) {
  let query = 'SELECT COUNT(*) as count FROM candidates WHERE 1=1';
  const params = [];

  // Apply same filters as search query
  if (filters.status && filters.status !== 'all') {
    query += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.skills && Array.isArray(filters.skills)) {
    const skillConditions = filters.skills.map(() => 'skills LIKE ?').join(' OR ');
    query += ` AND (${skillConditions})`;
    filters.skills.forEach(skill => {
      params.push(`%"${skill}"%`);
    });
  }

  if (filters.location) {
    query += ' AND preferred_locations LIKE ?';
    params.push(`%"${filters.location}"%`);
  }

  if (filters.experience_level) {
    query += ' AND experience_level = ?';
    params.push(filters.experience_level);
  }

  if (filters.available !== undefined) {
    query += ' AND available = ?';
    params.push(filters.available ? 1 : 0);
  }

  return { query, params };
}

module.exports = {
  buildSearchQuery,
  buildPagination,
  buildOrderClause,
  buildCountQuery
};