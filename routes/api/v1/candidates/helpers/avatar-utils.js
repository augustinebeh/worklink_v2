/**
 * Avatar Utilities for Candidates
 * @module candidates/helpers/avatar-utils
 */

/**
 * Generate a random avatar for a candidate
 * @param {string} name - Candidate name
 * @returns {string} Avatar URL
 */
function generateRandomAvatar(name) {
  const styles = [
    'avataaars', 'avataaars-neutral', 'bottts', 'fun-emoji', 'lorelei',
    'lorelei-neutral', 'micah', 'miniavs', 'notionists', 'notionists-neutral',
    'open-peeps', 'personas', 'pixel-art', 'pixel-art-neutral', 'thumbs',
  ];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const seed = `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Parse JSON fields in candidate object
 * @param {Object} candidate - Candidate object from database
 * @returns {Object} Parsed candidate object
 */
function parseJSONFields(candidate) {
  return {
    ...candidate,
    certifications: JSON.parse(candidate.certifications || '[]'),
    skills: JSON.parse(candidate.skills || '[]'),
    preferred_locations: JSON.parse(candidate.preferred_locations || '[]'),
    avatar_url: candidate.profile_photo || candidate.avatar_url, // Map profile_photo to avatar_url for frontend
  };
}

/**
 * Prepare candidate data for database insertion
 * @param {Object} candidateData - Raw candidate data
 * @param {boolean} isNewCandidate - Whether this is a new candidate (default: false)
 * @returns {Object} Prepared data
 */
function prepareCandidateForDB(candidateData, isNewCandidate = false) {
  const prepared = {
    ...candidateData,
    certifications: JSON.stringify(candidateData.certifications || []),
    skills: JSON.stringify(candidateData.skills || []),
    preferred_locations: JSON.stringify(candidateData.preferred_locations || []),
  };

  // Only generate avatar for NEW candidates without a profile photo
  if (isNewCandidate && !candidateData.profile_photo && !candidateData.avatar_url) {
    prepared.profile_photo = generateRandomAvatar(candidateData.name);
    prepared.created_at = new Date().toISOString();
  } else if (candidateData.profile_photo || candidateData.avatar_url) {
    // Use provided photo if available
    prepared.profile_photo = candidateData.profile_photo || candidateData.avatar_url;
  }
  // Otherwise, don't touch profile_photo (keep existing value during updates)

  return prepared;
}

module.exports = {
  generateRandomAvatar,
  parseJSONFields,
  prepareCandidateForDB
};