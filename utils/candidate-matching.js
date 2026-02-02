/**
 * Enhanced Candidate Matching System
 * WorkLink v2 - Advanced weighted scoring algorithms
 *
 * Features:
 * - Multi-factor weighted scoring
 * - Skills and certification matching
 * - Location and availability scoring
 * - Performance-based scoring
 * - AI-enhanced reasoning
 * - Engagement tracking integration
 */

const { askClaude } = require('./claude');

/**
 * Default scoring weights for candidate matching
 */
const DEFAULT_WEIGHTS = {
  experienceWeight: 0.25,    // 25% - Level and jobs completed
  skillsWeight: 0.20,        // 20% - Skills matching
  locationWeight: 0.15,      // 15% - Location preference
  availabilityWeight: 0.15,  // 15% - Online status and responsiveness
  performanceWeight: 0.15,   // 15% - Rating and feedback
  certificationWeight: 0.10, // 10% - Relevant certifications
};

/**
 * Enhanced weighted scoring for candidate matching
 */
function calculateCandidateMatchScore(candidate, job, weights = DEFAULT_WEIGHTS) {
  const {
    experienceWeight,
    skillsWeight,
    locationWeight,
    availabilityWeight,
    performanceWeight,
    certificationWeight,
  } = weights;

  let totalScore = 0;
  let maxScore = 0;
  const factors = [];

  // 1. Experience Score (25%)
  let experienceScore = 0;
  const level = candidate.level || 1;
  const jobsCompleted = candidate.total_jobs_completed || 0;

  // Base score by level
  if (level >= 5) experienceScore = 100;
  else if (level >= 4) experienceScore = 85;
  else if (level >= 3) experienceScore = 70;
  else if (level >= 2) experienceScore = 50;
  else experienceScore = 25;

  // Bonus for job completion count
  if (jobsCompleted >= 100) experienceScore += 15;
  else if (jobsCompleted >= 50) experienceScore += 10;
  else if (jobsCompleted >= 20) experienceScore += 5;
  else if (jobsCompleted >= 10) experienceScore += 2;

  // Cap at 100
  experienceScore = Math.min(100, experienceScore);

  totalScore += experienceScore * experienceWeight;
  maxScore += 100 * experienceWeight;
  factors.push({
    factor: 'Experience',
    score: experienceScore,
    weight: experienceWeight,
    contribution: experienceScore * experienceWeight,
    details: `Level ${level}, ${jobsCompleted} jobs completed`
  });

  // 2. Skills Matching Score (20%)
  const candidateSkills = JSON.parse(candidate.skills || '[]');
  const requiredSkills = JSON.parse(job.required_skills || '[]');
  const jobTitle = (job.title || '').toLowerCase();

  let skillsScore = 0;

  if (requiredSkills.length > 0) {
    // Direct skills matching
    const matchedSkills = candidateSkills.filter(skill =>
      requiredSkills.some(reqSkill =>
        skill.toLowerCase().includes(reqSkill.toLowerCase()) ||
        reqSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    skillsScore = (matchedSkills.length / requiredSkills.length) * 100;
  } else {
    // Job title-based skill inference
    const skillKeywords = extractSkillKeywords(jobTitle);
    const relevantSkills = candidateSkills.filter(skill =>
      skillKeywords.some(keyword =>
        skill.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    skillsScore = Math.min(100, (relevantSkills.length / Math.max(1, skillKeywords.length)) * 100);
  }

  totalScore += skillsScore * skillsWeight;
  maxScore += 100 * skillsWeight;
  factors.push({
    factor: 'Skills Match',
    score: skillsScore,
    weight: skillsWeight,
    contribution: skillsScore * skillsWeight,
    details: `${candidateSkills.length} total skills, ${requiredSkills.length} required`
  });

  // 3. Certifications Score (10%)
  const candidateCerts = JSON.parse(candidate.certifications || '[]');
  let certsScore = 0;

  // Job-specific certification bonuses
  const jobCertRequirements = getJobCertificationRequirements(jobTitle);
  jobCertRequirements.forEach(({ cert, score: certScore }) => {
    if (candidateCerts.includes(cert)) {
      certsScore += certScore;
    }
  });

  // General valuable certifications
  if (candidateCerts.includes('Customer Service')) certsScore += 15;
  if (candidateCerts.includes('First Aid')) certsScore += 10;
  if (candidateCerts.includes('Team Leadership')) certsScore += 10;

  certsScore = Math.min(100, certsScore);

  totalScore += certsScore * certificationWeight;
  maxScore += 100 * certificationWeight;
  factors.push({
    factor: 'Certifications',
    score: certsScore,
    weight: certificationWeight,
    contribution: certsScore * certificationWeight,
    details: candidateCerts.length > 0 ? candidateCerts.join(', ') : 'None'
  });

  // 4. Location Score (15%)
  let locationScore = 50; // Base neutral score
  const candidateLocations = JSON.parse(candidate.preferred_locations || '[]');
  const jobLocation = job.location || '';

  if (candidateLocations.length > 0 && jobLocation) {
    const locationMatch = candidateLocations.some(loc =>
      isLocationMatch(jobLocation, loc)
    );
    locationScore = locationMatch ? 100 : 20; // Strong preference vs mismatch
  } else if (candidateLocations.length === 0) {
    locationScore = 75; // No preference = flexible
  }

  totalScore += locationScore * locationWeight;
  maxScore += 100 * locationWeight;
  factors.push({
    factor: 'Location',
    score: locationScore,
    weight: locationWeight,
    contribution: locationScore * locationWeight,
    details: candidateLocations.length > 0 ? candidateLocations.join(', ') : 'No preference (flexible)'
  });

  // 5. Availability Score (15%)
  let availabilityScore = 75; // Default assume available

  // Online status scoring
  switch (candidate.online_status) {
    case 'online':
      availabilityScore = 100;
      break;
    case 'away':
      availabilityScore = 80;
      break;
    case 'busy':
      availabilityScore = 50;
      break;
    case 'offline':
      availabilityScore = 30;
      break;
    default:
      availabilityScore = 60;
  }

  // Recent activity bonus/penalty
  if (candidate.last_seen) {
    const daysSinceLastSeen = Math.floor((Date.now() - new Date(candidate.last_seen)) / (1000 * 60 * 60 * 24));
    if (daysSinceLastSeen <= 1) availabilityScore += 10;
    else if (daysSinceLastSeen <= 3) availabilityScore += 5;
    else if (daysSinceLastSeen <= 7) availabilityScore += 0;
    else if (daysSinceLastSeen <= 30) availabilityScore -= 10;
    else availabilityScore -= 25;
  }

  // Response rate factor (if available)
  if (candidate.response_rate) {
    const responseBonus = (candidate.response_rate / 100) * 20;
    availabilityScore += responseBonus;
  }

  availabilityScore = Math.max(0, Math.min(100, availabilityScore));

  totalScore += availabilityScore * availabilityWeight;
  maxScore += 100 * availabilityWeight;
  factors.push({
    factor: 'Availability',
    score: availabilityScore,
    weight: availabilityWeight,
    contribution: availabilityScore * availabilityWeight,
    details: `${candidate.online_status || 'unknown'}, last seen ${getLastSeenText(candidate.last_seen)}`
  });

  // 6. Performance Score (15%)
  const rating = candidate.rating || 0;
  let performanceScore = 50; // Default for new workers

  if (rating > 0) {
    performanceScore = (rating / 5) * 100;

    // Bonus for consistent high performance
    if (rating >= 4.8) performanceScore += 10;
    else if (rating >= 4.5) performanceScore += 5;

    // Penalty for low performance
    if (rating < 3.0) performanceScore -= 20;
  } else if (jobsCompleted > 0) {
    // No rating but has completed jobs - slight penalty
    performanceScore = 45;
  }

  // Recent performance trend (if available)
  if (candidate.recent_rating && candidate.recent_rating !== rating) {
    const trend = candidate.recent_rating - rating;
    performanceScore += trend > 0 ? 5 : -5; // Improving vs declining
  }

  performanceScore = Math.max(0, Math.min(100, performanceScore));

  totalScore += performanceScore * performanceWeight;
  maxScore += 100 * performanceWeight;
  factors.push({
    factor: 'Performance',
    score: performanceScore,
    weight: performanceWeight,
    contribution: performanceScore * performanceWeight,
    details: rating > 0 ? `${rating}/5 stars (${jobsCompleted} jobs)` : 'No ratings yet'
  });

  // Calculate final percentage
  const finalScore = Math.round((totalScore / maxScore) * 100);

  return {
    score: finalScore,
    factors,
    totalWeightedScore: totalScore,
    maxPossibleScore: maxScore,
    breakdown: {
      experience: Math.round(experienceScore * experienceWeight),
      skills: Math.round(skillsScore * skillsWeight),
      certifications: Math.round(certsScore * certificationWeight),
      location: Math.round(locationScore * locationWeight),
      availability: Math.round(availabilityScore * availabilityWeight),
      performance: Math.round(performanceScore * performanceWeight),
    },
    confidence: calculateConfidenceLevel(factors, candidate, job)
  };
}

/**
 * Enhanced candidate matching with weighted scoring and AI enhancement
 */
async function enhancedMatchCandidates(job, candidates, options = {}) {
  const {
    useAI = true,
    weights = DEFAULT_WEIGHTS,
    minScore = 30,
    maxResults = 10,
    includeReasons = true
  } = options;

  console.log(`🤖 [Matching] Starting enhanced matching for job "${job.title}" with ${candidates.length} candidates`);

  // Step 1: Calculate weighted scores for all candidates
  const scoredCandidates = candidates.map(candidate => {
    const scoreData = calculateCandidateMatchScore(candidate, job, weights);
    return {
      ...candidate,
      matchScore: scoreData.score,
      matchFactors: scoreData.factors,
      matchBreakdown: scoreData.breakdown,
      scoreDetails: scoreData,
      confidence: scoreData.confidence,
    };
  });

  // Step 2: Filter by minimum score and sort
  const qualifiedCandidates = scoredCandidates
    .filter(c => c.matchScore >= minScore)
    .sort((a, b) => {
      // Primary sort by score
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      // Secondary sort by confidence
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      // Tertiary sort by experience
      return (b.total_jobs_completed || 0) - (a.total_jobs_completed || 0);
    });

  console.log(`🤖 [Matching] ${qualifiedCandidates.length} candidates meet minimum score of ${minScore}`);

  const topCandidates = qualifiedCandidates.slice(0, Math.min(maxResults * 2, 20)); // Get extra for AI enhancement

  // Step 3: AI Enhancement (if enabled)
  if (useAI && topCandidates.length > 0) {
    try {
      console.log(`🤖 [Matching] Enhancing top ${topCandidates.length} candidates with AI insights`);

      const aiEnhanced = await enhanceCandidatesWithAI(job, topCandidates);

      // Merge AI insights back into candidates
      topCandidates.forEach(candidate => {
        const aiData = aiEnhanced.find(ai => ai.id === candidate.id);
        if (aiData) {
          candidate.aiReason = aiData.aiReason;
          candidate.keyStrengths = aiData.keyStrengths;
          candidate.potentialConcerns = aiData.potentialConcerns;
          candidate.fitAssessment = aiData.fitAssessment;

          // Apply AI score adjustment (small adjustment only)
          const adjustment = Math.max(-5, Math.min(5, aiData.scoreAdjustment || 0));
          candidate.matchScore = Math.max(0, Math.min(100, candidate.matchScore + adjustment));
          candidate.aiAdjustment = adjustment;
        }
      });

      // Re-sort after AI adjustments
      topCandidates.sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return b.confidence - a.confidence;
      });

      console.log(`🤖 [Matching] AI enhancement completed`);
    } catch (error) {
      console.warn('🤖 [Matching] AI enhancement failed, using weighted scoring only:', error.message);
    }
  }

  // Step 4: Format final results
  const finalResults = topCandidates.slice(0, maxResults).map((candidate, index) => {
    const baseResult = {
      id: candidate.id,
      name: candidate.name,
      rank: index + 1,
      score: candidate.matchScore,
      confidence: candidate.confidence,
      breakdown: candidate.matchBreakdown,
    };

    if (includeReasons) {
      baseResult.reason = candidate.aiReason || generateDefaultReason(candidate);
      baseResult.keyStrengths = candidate.keyStrengths || [];
      baseResult.potentialConcerns = candidate.potentialConcerns || [];
      baseResult.factors = candidate.matchFactors;
    }

    if (candidate.aiAdjustment) {
      baseResult.aiAdjustment = candidate.aiAdjustment;
    }

    return baseResult;
  });

  console.log(`🤖 [Matching] Completed matching, returning top ${finalResults.length} candidates`);

  return {
    matches: finalResults,
    totalCandidates: candidates.length,
    qualifiedCandidates: qualifiedCandidates.length,
    averageScore: Math.round(qualifiedCandidates.reduce((sum, c) => sum + c.matchScore, 0) / qualifiedCandidates.length) || 0,
    weights: weights,
    aiEnhanced: useAI && finalResults.some(r => r.aiAdjustment !== undefined)
  };
}

/**
 * Enhance top candidates with AI insights
 */
async function enhanceCandidatesWithAI(job, candidates) {
  const systemPrompt = `You are an expert talent matcher for WorkLink Singapore. Analyze each candidate's fit for the job and provide insights beyond the algorithmic scoring.

Focus on:
- Cultural fit and soft skills
- Potential for growth
- Risk factors or concerns
- Unique strengths that algorithms might miss

Be concise and practical in your assessments.`;

  const candidateList = candidates.slice(0, 10).map(c => ({
    id: c.id,
    name: c.name,
    level: c.level,
    rating: c.rating,
    matchScore: c.matchScore,
    jobsCompleted: c.total_jobs_completed,
    certifications: JSON.parse(c.certifications || '[]'),
    skills: JSON.parse(c.skills || '[]'),
    onlineStatus: c.online_status,
    lastSeen: c.last_seen
  }));

  const prompt = `Analyze these candidates for the following job:

JOB:
- Title: ${job.title}
- Category: ${job.category || 'General'}
- Location: ${job.location}
- Pay Rate: $${job.pay_rate}/hr
- Date: ${job.job_date}
- Required Skills: ${JSON.stringify(JSON.parse(job.required_skills || '[]'))}

CANDIDATES (with algorithmic scores):
${JSON.stringify(candidateList, null, 2)}

For each candidate, provide:
1. Brief assessment (2-3 sentences)
2. Key strengths for this specific job (max 3)
3. Any potential concerns (max 2, or empty array if none)
4. Score adjustment (-5 to +5) based on factors the algorithm missed
5. Overall fit assessment (excellent/good/fair/poor)

Return JSON:
[
  {
    "id": "candidate_id",
    "aiReason": "Brief assessment...",
    "keyStrengths": ["strength1", "strength2"],
    "potentialConcerns": ["concern1"] or [],
    "scoreAdjustment": -2,
    "fitAssessment": "good"
  }
]

Return ONLY valid JSON array.`;

  try {
    const response = await askClaude(prompt, systemPrompt, { maxTokens: 1500 });
    const jsonMatch = response.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.warn('AI enhancement parsing failed:', error.message);
  }

  return [];
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Extract skill keywords from job title
 */
function extractSkillKeywords(jobTitle) {
  const keywords = [];
  const title = jobTitle.toLowerCase();

  if (title.includes('server') || title.includes('f&b') || title.includes('food')) {
    keywords.push('food service', 'hospitality', 'customer service');
  }
  if (title.includes('admin') || title.includes('office') || title.includes('clerk')) {
    keywords.push('administration', 'office', 'data entry', 'filing');
  }
  if (title.includes('event') || title.includes('usher') || title.includes('crowd')) {
    keywords.push('event management', 'crowd control', 'customer service');
  }
  if (title.includes('sales') || title.includes('retail')) {
    keywords.push('sales', 'retail', 'customer service');
  }
  if (title.includes('warehouse') || title.includes('logistics')) {
    keywords.push('logistics', 'inventory', 'physical work');
  }
  if (title.includes('cleaning') || title.includes('housekeeping')) {
    keywords.push('cleaning', 'housekeeping', 'attention to detail');
  }

  return keywords;
}

/**
 * Get job-specific certification requirements
 */
function getJobCertificationRequirements(jobTitle) {
  const requirements = [];
  const title = jobTitle.toLowerCase();

  if (title.includes('server') || title.includes('f&b')) {
    requirements.push({ cert: 'Server Basics', score: 40 });
    requirements.push({ cert: 'Food Safety', score: 35 });
  }
  if (title.includes('food') || title.includes('kitchen')) {
    requirements.push({ cert: 'Food Safety', score: 50 });
    requirements.push({ cert: 'HACCP', score: 30 });
  }
  if (title.includes('event') || title.includes('usher')) {
    requirements.push({ cert: 'Event Management', score: 30 });
    requirements.push({ cert: 'Crowd Control', score: 25 });
  }
  if (title.includes('admin') || title.includes('office')) {
    requirements.push({ cert: 'Microsoft Office', score: 25 });
    requirements.push({ cert: 'Data Entry', score: 20 });
  }

  return requirements;
}

/**
 * Check if job location matches candidate preference
 */
function isLocationMatch(jobLocation, candidateLocation) {
  const job = jobLocation.toLowerCase();
  const candidate = candidateLocation.toLowerCase();

  // Direct match
  if (job.includes(candidate) || candidate.includes(job)) {
    return true;
  }

  // Regional matches
  const regions = {
    'central': ['city', 'cbd', 'orchard', 'bugis', 'raffles', 'marina bay'],
    'north': ['woodlands', 'yishun', 'admiralty', 'sembawang', 'marsiling'],
    'south': ['harbourfront', 'sentosa', 'telok blangah', 'alexandra'],
    'east': ['changi', 'pasir ris', 'tampines', 'bedok', 'simei'],
    'west': ['jurong', 'clementi', 'boon lay', 'pioneer', 'tuas'],
    'northeast': ['punggol', 'sengkang', 'hougang', 'ang mo kio', 'serangoon']
  };

  for (const [region, areas] of Object.entries(regions)) {
    const jobInRegion = areas.some(area => job.includes(area));
    const candidateInRegion = areas.some(area => candidate.includes(area)) || candidate === region;

    if (jobInRegion && candidateInRegion) {
      return true;
    }
  }

  return false;
}

/**
 * Format last seen timestamp into readable text
 */
function getLastSeenText(lastSeen) {
  if (!lastSeen) return 'unknown';

  const now = new Date();
  const seen = new Date(lastSeen);
  const diffMs = now - seen;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return seen.toLocaleDateString();
}

/**
 * Calculate confidence level based on available data
 */
function calculateConfidenceLevel(factors, candidate, job) {
  let confidence = 0.5; // Base confidence

  // More confidence with more completed jobs
  const jobsCompleted = candidate.total_jobs_completed || 0;
  if (jobsCompleted >= 20) confidence += 0.2;
  else if (jobsCompleted >= 10) confidence += 0.1;

  // More confidence with ratings
  if (candidate.rating > 0) confidence += 0.15;

  // More confidence with certifications
  const certs = JSON.parse(candidate.certifications || '[]');
  if (certs.length > 0) confidence += 0.1;

  // More confidence with skills data
  const skills = JSON.parse(candidate.skills || '[]');
  if (skills.length > 0) confidence += 0.1;

  // More confidence with location preferences
  const locations = JSON.parse(candidate.preferred_locations || '[]');
  if (locations.length > 0) confidence += 0.05;

  // Reduce confidence for very new workers
  if (jobsCompleted === 0 && !candidate.rating) confidence -= 0.2;

  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Generate default reason when AI is not available
 */
function generateDefaultReason(candidate) {
  const parts = [];

  if (candidate.matchScore >= 80) {
    parts.push('Excellent match');
  } else if (candidate.matchScore >= 65) {
    parts.push('Strong match');
  } else if (candidate.matchScore >= 50) {
    parts.push('Good match');
  } else {
    parts.push('Potential match');
  }

  const level = candidate.level || 1;
  const jobs = candidate.total_jobs_completed || 0;

  if (level >= 4) {
    parts.push(`experienced Level ${level} worker`);
  } else if (level >= 2) {
    parts.push(`reliable Level ${level} worker`);
  }

  if (jobs >= 50) {
    parts.push(`with ${jobs} completed jobs`);
  } else if (jobs >= 10) {
    parts.push(`with ${jobs} jobs completed`);
  }

  const rating = candidate.rating;
  if (rating >= 4.5) {
    parts.push('and excellent ratings');
  } else if (rating >= 4.0) {
    parts.push('and strong ratings');
  }

  return parts.join(' ') + '.';
}

module.exports = {
  calculateCandidateMatchScore,
  enhancedMatchCandidates,
  enhanceCandidatesWithAI,
  DEFAULT_WEIGHTS,
};