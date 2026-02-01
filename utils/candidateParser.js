/**
 * Candidate Data Parser Utility
 * Handles JSON field parsing for candidate records
 *
 * Used to avoid duplicate parsing code across routes
 */

/**
 * Parse JSON fields in a candidate record
 * @param {Object} candidate - Raw candidate record from database
 * @returns {Object|null} - Parsed candidate or null if input is null/undefined
 */
function parseCandidateData(candidate) {
  if (!candidate) return null;

  return {
    ...candidate,
    certifications: safeJsonParse(candidate.certifications, []),
    skills: safeJsonParse(candidate.skills, []),
    preferred_locations: safeJsonParse(candidate.preferred_locations, []),
    languages: safeJsonParse(candidate.languages, []),
    availability: safeJsonParse(candidate.availability, {}),
    work_history: safeJsonParse(candidate.work_history, []),
  };
}

/**
 * Parse JSON fields for multiple candidates
 * @param {Array} candidates - Array of raw candidate records
 * @returns {Array} - Array of parsed candidates
 */
function parseCandidatesData(candidates) {
  if (!Array.isArray(candidates)) return [];
  return candidates.map(parseCandidateData);
}

/**
 * Safely parse JSON with a default value
 * @param {string|any} value - Value to parse
 * @param {any} defaultValue - Default if parsing fails
 * @returns {any} - Parsed value or default
 */
function safeJsonParse(value, defaultValue = null) {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string') {
    return value; // Already parsed
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Stringify JSON fields for database storage
 * @param {Object} data - Data object with potential array/object fields
 * @param {Array<string>} fields - Field names to stringify
 * @returns {Object} - Data with stringified fields
 */
function stringifyJsonFields(data, fields = []) {
  const result = { ...data };

  fields.forEach(field => {
    if (result[field] !== undefined && result[field] !== null) {
      if (typeof result[field] !== 'string') {
        result[field] = JSON.stringify(result[field]);
      }
    }
  });

  return result;
}

module.exports = {
  parseCandidateData,
  parseCandidatesData,
  safeJsonParse,
  stringifyJsonFields,
};
