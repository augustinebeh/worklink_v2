/**
 * Candidates List Route
 * Handles listing and searching candidates
 * @module candidates/routes/list
 */

const express = require('express');
const { db } = require('../../../../../db');
const { authenticateAdmin } = require('../../../../../middleware/auth');
const { parseJSONFields } = require('../helpers/avatar-utils');
const { buildSearchQuery, buildPagination, buildOrderClause, buildCountQuery } = require('../helpers/query-builder');

const router = express.Router();

/**
 * GET /
 * Get all candidates with pagination and filtering
 */
router.get('/', authenticateAdmin, (req, res) => {
  try {
    const {
      status,
      search,
      skills,
      location,
      experience_level,
      available,
      sortBy,
      order
    } = req.query;

    const pagination = buildPagination(req.query);
    const filters = {
      status,
      search,
      skills: skills ? (Array.isArray(skills) ? skills : [skills]) : undefined,
      location,
      experience_level,
      available: available !== undefined ? available === 'true' : undefined
    };

    // Build search query
    const { query: searchQuery, params: searchParams } = buildSearchQuery(filters);
    const orderClause = buildOrderClause(sortBy, order);
    const finalQuery = `${searchQuery} ${orderClause} LIMIT ? OFFSET ?`;

    // Execute search query
    const candidates = db.prepare(finalQuery).all(
      ...searchParams,
      pagination.limit,
      pagination.offset
    );

    // Get total count for pagination
    const { query: countQuery, params: countParams } = buildCountQuery(filters);
    const total = db.prepare(countQuery).get(...countParams).count;

    // Parse JSON fields
    const parsedCandidates = candidates.map(parseJSONFields);

    const totalPages = Math.ceil(total / pagination.limit);

    res.json({
      success: true,
      data: parsedCandidates,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      },
      filters: filters,
      message: `Retrieved ${candidates.length} candidates`
    });

  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve candidates',
      details: error.message
    });
  }
});

/**
 * GET /search
 * Advanced candidate search
 */
router.get('/search', authenticateAdmin, (req, res) => {
  try {
    const {
      q: searchTerm,
      skills,
      location,
      experience_level,
      available,
      min_tier,
      max_tier,
      sortBy = 'relevance',
      order = 'DESC'
    } = req.query;

    const pagination = buildPagination(req.query);

    // Build more complex search query for advanced search
    let query = `
      SELECT *,
        CASE
          WHEN name LIKE ? THEN 3
          WHEN email LIKE ? THEN 2
          WHEN phone LIKE ? THEN 1
          ELSE 0
        END as relevance_score
      FROM candidates
      WHERE 1=1
    `;
    const params = [];

    if (searchTerm) {
      query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      params.push(
        `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, // for relevance score
        `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`  // for WHERE clause
      );
    } else {
      // Add placeholders for relevance score even if no search term
      params.push('', '', '');
    }

    // Additional filters
    if (skills && Array.isArray(skills)) {
      const skillConditions = skills.map(() => 'skills LIKE ?').join(' OR ');
      query += ` AND (${skillConditions})`;
      skills.forEach(skill => {
        params.push(`%"${skill}"%`);
      });
    }

    if (location) {
      query += ` AND preferred_locations LIKE ?`;
      params.push(`%"${location}"%`);
    }

    if (experience_level) {
      query += ` AND experience_level = ?`;
      params.push(experience_level);
    }

    if (available !== undefined) {
      query += ` AND available = ?`;
      params.push(available === 'true' ? 1 : 0);
    }

    if (min_tier !== undefined) {
      query += ` AND tier >= ?`;
      params.push(parseInt(min_tier));
    }

    if (max_tier !== undefined) {
      query += ` AND tier <= ?`;
      params.push(parseInt(max_tier));
    }

    // Sorting
    if (sortBy === 'relevance' && searchTerm) {
      query += ` ORDER BY relevance_score DESC, created_at DESC`;
    } else {
      const orderClause = buildOrderClause(sortBy, order);
      query += ` ${orderClause}`;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(pagination.limit, pagination.offset);

    const candidates = db.prepare(query).all(...params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM candidates WHERE 1=1';
    let countParams = [];

    if (searchTerm) {
      countQuery += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      countParams.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
    }

    // Apply same filters for count
    if (skills && Array.isArray(skills)) {
      const skillConditions = skills.map(() => 'skills LIKE ?').join(' OR ');
      countQuery += ` AND (${skillConditions})`;
      skills.forEach(skill => {
        countParams.push(`%"${skill}"%`);
      });
    }

    if (location) {
      countQuery += ` AND preferred_locations LIKE ?`;
      countParams.push(`%"${location}"%`);
    }

    if (experience_level) {
      countQuery += ` AND experience_level = ?`;
      countParams.push(experience_level);
    }

    if (available !== undefined) {
      countQuery += ` AND available = ?`;
      countParams.push(available === 'true' ? 1 : 0);
    }

    if (min_tier !== undefined) {
      countQuery += ` AND tier >= ?`;
      countParams.push(parseInt(min_tier));
    }

    if (max_tier !== undefined) {
      countQuery += ` AND tier <= ?`;
      countParams.push(parseInt(max_tier));
    }

    const total = db.prepare(countQuery).get(...countParams).count;

    // Parse JSON fields
    const parsedCandidates = candidates.map(parseJSONFields);

    const totalPages = Math.ceil(total / pagination.limit);

    res.json({
      success: true,
      data: parsedCandidates,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1
      },
      searchTerm,
      message: `Found ${candidates.length} candidates matching search criteria`
    });

  } catch (error) {
    console.error('Error searching candidates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search candidates',
      details: error.message
    });
  }
});

module.exports = router;