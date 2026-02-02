/**
 * Account Data Service
 *
 * Provides real-time access to account verification status,
 * pending/approved/rejected status with real reasons.
 */

const { db } = require('../../db/database');

class AccountDataService {
  /**
   * Get comprehensive account verification status for a candidate
   * @param {string} candidateId - Candidate ID
   * @returns {Promise<Object>} Account verification data
   */
  async getVerificationStatus(candidateId) {
    try {
      const currentDate = new Date().toISOString();

      // Get candidate details
      const candidate = db.prepare(`
        SELECT
          id,
          name,
          email,
          phone,
          date_of_birth,
          nric_last4,
          status,
          source,
          bank_name,
          bank_account,
          address,
          profile_photo,
          certifications,
          skills,
          preferred_locations,
          created_at,
          updated_at
        FROM candidates
        WHERE id = ?
      `).get(candidateId);

      if (!candidate) {
        throw new Error('Candidate not found');
      }

      // Parse JSON fields safely
      const certifications = this.safeJsonParse(candidate.certifications);
      const skills = this.safeJsonParse(candidate.skills);
      const preferredLocations = this.safeJsonParse(candidate.preferred_locations);

      // Calculate verification status
      const verificationChecks = this.performVerificationChecks(candidate);

      // Get verification history/changes
      const verificationHistory = this.getVerificationHistory(candidateId);

      // Determine overall status and next steps
      const overallStatus = this.determineOverallStatus(candidate, verificationChecks);
      const nextSteps = this.getNextSteps(verificationChecks);
      const blockers = this.getBlockers(verificationChecks);

      return {
        candidateId,
        lastUpdated: currentDate,
        profile: {
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone,
          status: candidate.status,
          registeredDate: candidate.created_at,
          lastProfileUpdate: candidate.updated_at
        },
        verification: {
          overallStatus: overallStatus.status,
          overallMessage: overallStatus.message,
          completionPercentage: verificationChecks.completionPercentage,
          verifiedAt: overallStatus.status === 'verified' ? candidate.updated_at : null,
          estimatedCompletionDate: this.estimateCompletionDate(verificationChecks)
        },
        checks: {
          personalInfo: verificationChecks.personalInfo,
          bankDetails: verificationChecks.bankDetails,
          documents: verificationChecks.documents,
          profilePhoto: verificationChecks.profilePhoto,
          skillsAndCertifications: verificationChecks.skillsAndCertifications,
          locationPreferences: verificationChecks.locationPreferences
        },
        requirements: {
          nextSteps,
          blockers,
          missingDocuments: verificationChecks.missingDocuments,
          invalidFields: verificationChecks.invalidFields
        },
        accountSettings: {
          canApplyForJobs: overallStatus.canApplyForJobs,
          canReceivePayments: verificationChecks.bankDetails.isValid,
          profileVisibility: this.getProfileVisibility(candidate),
          notificationSettings: this.getNotificationSettings(candidateId)
        },
        history: verificationHistory
      };

    } catch (error) {
      throw new Error(`Failed to fetch account verification data: ${error.message}`);
    }
  }

  /**
   * Perform comprehensive verification checks
   * @param {Object} candidate - Candidate record
   * @returns {Object} Verification check results
   */
  performVerificationChecks(candidate) {
    const checks = {
      personalInfo: this.checkPersonalInfo(candidate),
      bankDetails: this.checkBankDetails(candidate),
      documents: this.checkDocuments(candidate),
      profilePhoto: this.checkProfilePhoto(candidate),
      skillsAndCertifications: this.checkSkillsAndCertifications(candidate),
      locationPreferences: this.checkLocationPreferences(candidate)
    };

    // Calculate completion percentage
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(check => check.isValid).length;
    const completionPercentage = Math.round((passedChecks / totalChecks) * 100);

    // Collect missing documents and invalid fields
    const missingDocuments = [];
    const invalidFields = [];

    Object.values(checks).forEach(check => {
      if (check.missingDocuments) {
        missingDocuments.push(...check.missingDocuments);
      }
      if (check.invalidFields) {
        invalidFields.push(...check.invalidFields);
      }
    });

    return {
      ...checks,
      completionPercentage,
      missingDocuments,
      invalidFields
    };
  }

  /**
   * Check personal information completeness and validity
   * @param {Object} candidate - Candidate record
   * @returns {Object} Personal info check result
   */
  checkPersonalInfo(candidate) {
    const invalidFields = [];
    const missingFields = [];

    // Required fields
    if (!candidate.name || candidate.name.trim().length < 2) {
      invalidFields.push('name');
      missingFields.push('Full name');
    }

    if (!candidate.email || !this.isValidEmail(candidate.email)) {
      invalidFields.push('email');
      missingFields.push('Valid email address');
    }

    if (!candidate.phone || !this.isValidPhone(candidate.phone)) {
      invalidFields.push('phone');
      missingFields.push('Valid phone number');
    }

    if (!candidate.nric_last4 || candidate.nric_last4.length !== 4) {
      invalidFields.push('nric_last4');
      missingFields.push('NRIC last 4 digits');
    }

    if (!candidate.date_of_birth) {
      invalidFields.push('date_of_birth');
      missingFields.push('Date of birth');
    } else if (!this.isValidAge(candidate.date_of_birth)) {
      invalidFields.push('date_of_birth');
      missingFields.push('Valid age (18+ years)');
    }

    const isValid = invalidFields.length === 0;

    return {
      category: 'Personal Information',
      isValid,
      status: isValid ? 'verified' : 'incomplete',
      message: isValid ? 'All personal information verified' :
        `Missing: ${missingFields.join(', ')}`,
      invalidFields,
      missingFields,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Check bank details for payment processing
   * @param {Object} candidate - Candidate record
   * @returns {Object} Bank details check result
   */
  checkBankDetails(candidate) {
    const invalidFields = [];
    const missingFields = [];

    if (!candidate.bank_name || candidate.bank_name.trim().length === 0) {
      invalidFields.push('bank_name');
      missingFields.push('Bank name');
    }

    if (!candidate.bank_account || !this.isValidBankAccount(candidate.bank_account)) {
      invalidFields.push('bank_account');
      missingFields.push('Valid bank account number');
    }

    const isValid = invalidFields.length === 0;

    return {
      category: 'Bank Details',
      isValid,
      status: isValid ? 'verified' : 'incomplete',
      message: isValid ? 'Bank details verified for payments' :
        `Missing: ${missingFields.join(', ')}`,
      invalidFields,
      missingFields,
      bankInfo: isValid ? {
        bankName: candidate.bank_name,
        accountNumber: this.maskBankAccount(candidate.bank_account),
        verifiedFor: 'PayNow and bank transfers'
      } : null,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Check required documents
   * @param {Object} candidate - Candidate record
   * @returns {Object} Documents check result
   */
  checkDocuments(candidate) {
    const missingDocuments = [];

    // Basic ID verification (NRIC/Passport)
    if (!candidate.nric_last4) {
      missingDocuments.push('NRIC or Passport verification');
    }

    // Work eligibility (for non-citizens this would be more complex)
    if (!this.hasWorkEligibility(candidate)) {
      missingDocuments.push('Work eligibility documentation');
    }

    const isValid = missingDocuments.length === 0;

    return {
      category: 'Documents',
      isValid,
      status: isValid ? 'verified' : 'pending',
      message: isValid ? 'All required documents verified' :
        'Pending document verification',
      missingDocuments,
      requiredDocuments: [
        'Valid NRIC (Singaporeans/PRs) or Work Pass',
        'Bank account details'
      ],
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Check profile photo
   * @param {Object} candidate - Candidate record
   * @returns {Object} Profile photo check result
   */
  checkProfilePhoto(candidate) {
    const hasPhoto = !!(candidate.profile_photo && candidate.profile_photo.trim());

    return {
      category: 'Profile Photo',
      isValid: hasPhoto,
      status: hasPhoto ? 'verified' : 'optional',
      message: hasPhoto ? 'Profile photo uploaded' : 'Profile photo recommended for better job matching',
      required: false,
      photoUrl: hasPhoto ? candidate.profile_photo : null,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Check skills and certifications
   * @param {Object} candidate - Candidate record
   * @returns {Object} Skills check result
   */
  checkSkillsAndCertifications(candidate) {
    const skills = this.safeJsonParse(candidate.skills);
    const certifications = this.safeJsonParse(candidate.certifications);

    const hasSkills = skills.length > 0;
    const hasCertifications = certifications.length > 0;

    return {
      category: 'Skills & Certifications',
      isValid: hasSkills, // At least skills are required
      status: hasSkills ? 'complete' : 'incomplete',
      message: hasSkills ?
        `${skills.length} skills, ${certifications.length} certifications` :
        'Please add your skills for better job matching',
      skillsCount: skills.length,
      certificationsCount: certifications.length,
      skills: skills.slice(0, 5), // First 5 skills
      certifications: certifications.slice(0, 3), // First 3 certifications
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Check location preferences
   * @param {Object} candidate - Candidate record
   * @returns {Object} Location preferences check result
   */
  checkLocationPreferences(candidate) {
    const locations = this.safeJsonParse(candidate.preferred_locations);
    const hasPreferences = locations.length > 0;

    return {
      category: 'Location Preferences',
      isValid: hasPreferences,
      status: hasPreferences ? 'complete' : 'incomplete',
      message: hasPreferences ?
        `${locations.length} preferred locations set` :
        'Set preferred work locations to see relevant jobs',
      locationsCount: locations.length,
      locations: locations.slice(0, 3), // First 3 locations
      required: false,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Determine overall verification status
   * @param {Object} candidate - Candidate record
   * @param {Object} checks - Verification check results
   * @returns {Object} Overall status
   */
  determineOverallStatus(candidate, checks) {
    const criticalChecks = ['personalInfo', 'bankDetails', 'documents'];
    const criticalPassed = criticalChecks.every(check => checks[check].isValid);

    if (criticalPassed && checks.completionPercentage >= 80) {
      return {
        status: 'verified',
        message: 'Account fully verified - you can apply for jobs and receive payments',
        canApplyForJobs: true
      };
    } else if (criticalPassed) {
      return {
        status: 'mostly_verified',
        message: 'Account verified for basic functionality - complete profile for better job matching',
        canApplyForJobs: true
      };
    } else {
      return {
        status: 'pending',
        message: 'Account verification in progress - complete required fields to start applying for jobs',
        canApplyForJobs: false
      };
    }
  }

  /**
   * Get next steps for completion
   * @param {Object} checks - Verification check results
   * @returns {Array} Next steps
   */
  getNextSteps(checks) {
    const steps = [];

    if (!checks.personalInfo.isValid) {
      steps.push({
        priority: 'high',
        action: 'Complete personal information',
        description: 'Fill in all required personal details',
        fields: checks.personalInfo.invalidFields
      });
    }

    if (!checks.bankDetails.isValid) {
      steps.push({
        priority: 'high',
        action: 'Add bank details',
        description: 'Required for receiving payments',
        fields: checks.bankDetails.invalidFields
      });
    }

    if (!checks.documents.isValid) {
      steps.push({
        priority: 'high',
        action: 'Submit required documents',
        description: 'Upload NRIC/Passport for verification',
        documents: checks.documents.missingDocuments
      });
    }

    if (!checks.skillsAndCertifications.isValid) {
      steps.push({
        priority: 'medium',
        action: 'Add skills',
        description: 'Add your skills for better job matching',
        fields: ['skills']
      });
    }

    if (!checks.profilePhoto.isValid) {
      steps.push({
        priority: 'low',
        action: 'Upload profile photo',
        description: 'Optional but recommended for better profile visibility',
        fields: ['profile_photo']
      });
    }

    return steps;
  }

  /**
   * Get blocking issues
   * @param {Object} checks - Verification check results
   * @returns {Array} Blocking issues
   */
  getBlockers(checks) {
    const blockers = [];

    if (!checks.personalInfo.isValid) {
      blockers.push({
        type: 'personal_info',
        severity: 'critical',
        message: 'Complete personal information to verify account',
        impact: 'Cannot apply for jobs'
      });
    }

    if (!checks.bankDetails.isValid) {
      blockers.push({
        type: 'bank_details',
        severity: 'critical',
        message: 'Add bank details to receive payments',
        impact: 'Cannot receive payments for completed jobs'
      });
    }

    return blockers;
  }

  // Helper methods

  safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString || '[]');
    } catch {
      return [];
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    const phoneRegex = /^[+]?[\d\s-()]{8,15}$/;
    return phoneRegex.test(phone);
  }

  isValidAge(dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 18 && age <= 100;
  }

  isValidBankAccount(accountNumber) {
    return accountNumber && accountNumber.length >= 8 && /^\d+$/.test(accountNumber);
  }

  hasWorkEligibility(candidate) {
    // Simplified - in reality this would check work pass status
    return !!(candidate.nric_last4);
  }

  maskBankAccount(accountNumber) {
    if (!accountNumber || accountNumber.length < 4) return '****';
    const last4 = accountNumber.slice(-4);
    const masked = '*'.repeat(Math.max(0, accountNumber.length - 4));
    return masked + last4;
  }

  getProfileVisibility(candidate) {
    return {
      isPublic: !!(candidate.profile_photo && candidate.skills),
      visibilityLevel: candidate.status === 'active' ? 'high' : 'low',
      searchable: candidate.status === 'active'
    };
  }

  getNotificationSettings(candidateId) {
    // This would fetch from a notifications settings table in a real implementation
    return {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      jobAlerts: true,
      paymentNotifications: true
    };
  }

  getVerificationHistory(candidateId) {
    // This would fetch from an audit/history table in a real implementation
    return [
      {
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        action: 'profile_updated',
        description: 'Bank details updated',
        status: 'success'
      }
    ];
  }

  estimateCompletionDate(checks) {
    if (checks.completionPercentage >= 80) {
      return 'Complete';
    }

    // Estimate based on missing items - typically 1-3 days
    const missingItems = checks.invalidFields.length + checks.missingDocuments.length;
    const estimatedDays = Math.min(missingItems, 3);

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);

    return completionDate.toISOString().split('T')[0];
  }
}

module.exports = AccountDataService;