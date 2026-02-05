/**
 * SLM Training Data Validation System
 *
 * Prevents problematic entries from being added to the training data
 * by checking for unrealistic promises, specific timing commitments,
 * and other problematic patterns.
 */

const { db } = require('../db');

/**
 * Validate training data entry for problematic content
 * @param {string} inputText - The question/prompt
 * @param {string} outputText - The response/completion
 * @returns {Object} - Validation result with isValid, issues, and score
 */
function validateTrainingEntry(inputText, outputText) {
    const result = {
        isValid: true,
        issues: [],
        qualityScore: 1.0,
        suggestions: []
    };

    // Get forbidden phrases from settings
    let forbiddenPhrases = [];
    try {
        const setting = db.prepare('SELECT value FROM ml_settings WHERE key = ?').get('forbidden_phrases');
        if (setting) {
            forbiddenPhrases = JSON.parse(setting.value);
        }
    } catch (e) {
        // Use default if database query fails
        forbiddenPhrases = [
            'within 24 hours',
            'within 5 minutes',
            '72 hours max',
            'guaranteed',
            'will definitely',
            'instant approval',
            'immediate payment',
            'promise you',
            'free money',
            'easy cash',
            'quick money'
        ];
    }

    // Check for forbidden phrases
    const lowerOutput = outputText.toLowerCase();
    forbiddenPhrases.forEach(phrase => {
        if (lowerOutput.includes(phrase.toLowerCase())) {
            result.isValid = false;
            result.qualityScore -= 0.3;
            result.issues.push(`Contains forbidden phrase: "${phrase}"`);

            // Suggest replacements for common problematic phrases
            const suggestions = {
                'within 24 hours': 'as soon as processing is complete',
                'within 5 minutes': 'as quickly as possible',
                '72 hours max': 'within the standard processing timeframe',
                'guaranteed': 'typically',
                'will definitely': 'will work to',
                'instant approval': 'quick review process',
                'immediate payment': 'prompt payment processing',
                'promise you': 'our goal is to',
                'free money': 'earnings opportunities',
                'easy cash': 'work opportunities',
                'quick money': 'earning opportunities'
            };

            if (suggestions[phrase]) {
                result.suggestions.push(`Replace "${phrase}" with "${suggestions[phrase]}"`);
            }
        }
    });

    // Check for specific timing commitments
    const timePatterns = [
        /\d+\s*(hours?|minutes?|days?)/gi,
        /within \d+/gi,
        /in \d+ (hours?|minutes?|days?)/gi
    ];

    timePatterns.forEach((pattern, index) => {
        const matches = outputText.match(pattern);
        if (matches) {
            matches.forEach(match => {
                result.qualityScore -= 0.2;
                result.issues.push(`Contains specific timing commitment: "${match}"`);
                result.suggestions.push(`Replace specific timing "${match}" with general timeframes like "as soon as possible" or "within our standard timeframe"`);
            });
        }
    });

    // Check for unrealistic promises
    const unrealisticPatterns = [
        /get paid (today|now|immediately)/gi,
        /instant (money|cash|payment)/gi,
        /(guaranteed|promise) (work|jobs|money)/gi,
        /always (available|get)/gi,
        /never (fail|lose)/gi
    ];

    unrealisticPatterns.forEach((pattern, index) => {
        const matches = outputText.match(pattern);
        if (matches) {
            matches.forEach(match => {
                result.isValid = false;
                result.qualityScore -= 0.4;
                result.issues.push(`Contains unrealistic promise: "${match}"`);
                result.suggestions.push(`Remove unrealistic promise "${match}" and use realistic language`);
            });
        }
    });

    // Check for overly specific salary information
    const salaryPatterns = [
        /\$\d+(\.\d{2})?\s*(per hour|\/hour|hourly)/gi,
        /earn \$\d+/gi,
        /SGD \d+/gi
    ];

    salaryPatterns.forEach(pattern => {
        const matches = outputText.match(pattern);
        if (matches) {
            matches.forEach(match => {
                result.qualityScore -= 0.1;
                result.issues.push(`Contains specific salary information: "${match}"`);
                result.suggestions.push(`Replace specific salary "${match}" with general ranges or "competitive rates"`);
            });
        }
    });

    // Positive indicators that improve score
    const goodPhrases = [
        'I\'ll check with',
        'let me have the admin team',
        'I\'ll flag this for review',
        'depending on',
        'varies by',
        'as soon as possible',
        'within our standard',
        'according to our policy'
    ];

    goodPhrases.forEach(phrase => {
        if (lowerOutput.includes(phrase.toLowerCase())) {
            result.qualityScore += 0.1;
        }
    });

    // Ensure score stays within bounds
    result.qualityScore = Math.max(0, Math.min(1, result.qualityScore));

    // Set validity based on quality threshold
    const qualityThreshold = getQualityThreshold();
    if (result.qualityScore < qualityThreshold) {
        result.isValid = false;
    }

    return result;
}

/**
 * Get quality threshold from settings
 */
function getQualityThreshold() {
    try {
        const setting = db.prepare('SELECT value FROM ml_settings WHERE key = ?').get('quality_threshold');
        return setting ? parseFloat(setting.value) : 0.7;
    } catch (e) {
        return 0.7; // Default threshold
    }
}

/**
 * Batch validate multiple training entries
 * @param {Array} entries - Array of {input_text, output_text} objects
 * @returns {Array} - Array of validation results
 */
function batchValidateEntries(entries) {
    return entries.map(entry => ({
        ...entry,
        validation: validateTrainingEntry(entry.input_text, entry.output_text)
    }));
}

/**
 * Clean and validate existing training data
 * @returns {Object} - Summary of validation results
 */
function validateExistingTrainingData() {
    const allEntries = db.prepare('SELECT id, input_text, output_text, quality_score FROM ml_training_data').all();

    let validCount = 0;
    let invalidCount = 0;
    let updatedCount = 0;

    const updateStmt = db.prepare('UPDATE ml_training_data SET quality_score = ? WHERE id = ?');

    allEntries.forEach(entry => {
        const validation = validateTrainingEntry(entry.input_text, entry.output_text);

        if (validation.isValid) {
            validCount++;
        } else {
            invalidCount++;
        }

        // Update quality score if it's different
        if (Math.abs(validation.qualityScore - entry.quality_score) > 0.05) {
            updateStmt.run(validation.qualityScore, entry.id);
            updatedCount++;
        }
    });

    return {
        total: allEntries.length,
        valid: validCount,
        invalid: invalidCount,
        updated: updatedCount
    };
}

/**
 * Create review process documentation
 */
function createReviewProcessDocumentation() {
    return {
        title: "SLM Training Data Review Process",
        steps: [
            {
                step: 1,
                title: "Automatic Validation",
                description: "All new training data entries are automatically validated using the validation function to check for problematic content."
            },
            {
                step: 2,
                title: "Quality Scoring",
                description: "Each entry receives a quality score from 0.0 to 1.0 based on the presence of forbidden phrases, timing commitments, and unrealistic promises."
            },
            {
                step: 3,
                title: "Threshold Filtering",
                description: "Entries below the quality threshold (default 0.7) are flagged for manual review before being added to the training data."
            },
            {
                step: 4,
                title: "Manual Review",
                description: "Flagged entries are reviewed by admin team who can approve with edits, reject, or approve as-is."
            },
            {
                step: 5,
                title: "Continuous Monitoring",
                description: "Regular batch validation of existing training data to catch any entries that may have slipped through or need updates."
            }
        ],
        forbiddenPatterns: [
            "Specific timing commitments (within X hours/minutes)",
            "Unrealistic promises (guaranteed, definitely, instant)",
            "Specific salary amounts without context",
            "Payment promises (get paid today, immediate payment)",
            "Job availability promises (guaranteed work, lots of jobs)"
        ],
        bestPractices: [
            "Use escalation language (I'll check with admin team)",
            "Provide realistic timeframes (as soon as possible, standard processing)",
            "Acknowledge dependencies (depends on client verification)",
            "Use conditional language (typically, usually, may vary)",
            "Include context validation"
        ]
    };
}

module.exports = {
    validateTrainingEntry,
    batchValidateEntries,
    validateExistingTrainingData,
    getQualityThreshold,
    createReviewProcessDocumentation
};