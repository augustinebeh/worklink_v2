/**
 * Response Formatter Tests
 *
 * Comprehensive test suite for the response formatter
 * including formatting accuracy, data handling, and edge cases.
 */

const { describe, test, expect, beforeAll } = require('@jest/globals');
const ResponseFormatter = require('../../services/data-integration/response-formatter');

describe('Response Formatter', () => {
  let formatter;

  beforeAll(() => {
    formatter = new ResponseFormatter();
  });

  describe('Payment Status Formatting', () => {
    test('should format complete payment data correctly', () => {
      const paymentData = {
        candidateId: 'CND_TEST_001',
        summary: {
          totalEarnings: 1500.00,
          pendingAmount: 200.00,
          approvedAmount: 300.00,
          totalPayments: 5,
          averagePayment: 300.00
        },
        currentStatus: {
          hasPendingPayments: true,
          pendingCount: 2,
          approvedCount: 1,
          nextPaymentDate: '2024-02-09',
          estimatedPaymentAmount: 500.00
        },
        timeline: {
          pendingPayments: [
            {
              id: 'PAY_001',
              jobTitle: 'Event Staff',
              jobDate: '2024-02-05',
              amount: 120.00,
              daysUntilPayment: 3
            },
            {
              id: 'PAY_002',
              jobTitle: 'Warehouse Helper',
              jobDate: '2024-02-06',
              amount: 80.00,
              daysUntilPayment: 3
            }
          ],
          paymentSchedule: {
            frequency: 'Weekly',
            paymentDay: 'Friday',
            processingTime: '2-3 business days'
          }
        },
        bankDetails: {
          bankName: 'DBS Bank',
          accountNumber: '****1234',
          isValid: true
        }
      };

      const formatted = formatter.formatPaymentStatus(paymentData);

      expect(formatted).toContain('💰 **Your Payment Status**');
      expect(formatted).toContain('Total Earnings');
      expect(formatted).toContain('$1,500.00');
      expect(formatted).toContain('Pending Approval');
      expect(formatted).toContain('$200.00');
      expect(formatted).toContain('Next Payment');
      expect(formatted).toContain('Event Staff');
      expect(formatted).toContain('Warehouse Helper');
      expect(formatted).toContain('DBS Bank');
      expect(formatted).toContain('****1234');
    });

    test('should handle missing payment data gracefully', () => {
      const emptyData = null;
      const formatted = formatter.formatPaymentStatus(emptyData);

      expect(formatted).toContain("I'm having trouble accessing");
      expect(formatted).toContain("payment information");
    });

    test('should format minimal payment data', () => {
      const minimalData = {
        summary: {
          totalEarnings: 0,
          pendingAmount: 0,
          approvedAmount: 0
        },
        currentStatus: {},
        timeline: {},
        bankDetails: { isValid: false }
      };

      const formatted = formatter.formatPaymentStatus(minimalData);

      expect(formatted).toContain('Action Needed');
      expect(formatted).toContain('update your bank details');
    });
  });

  describe('Account Verification Formatting', () => {
    test('should format complete account verification data', () => {
      const accountData = {
        candidateId: 'CND_TEST_001',
        verification: {
          overallStatus: 'verified',
          overallMessage: 'Account fully verified',
          completionPercentage: 100
        },
        checks: {
          personalInfo: { isValid: true },
          bankDetails: { isValid: true },
          documents: { isValid: true },
          skillsAndCertifications: { isValid: true },
          profilePhoto: { isValid: true, required: false }
        },
        requirements: {
          nextSteps: []
        },
        accountSettings: {
          canApplyForJobs: true,
          canReceivePayments: true
        }
      };

      const formatted = formatter.formatAccountVerification(accountData);

      expect(formatted).toContain('🔐 **Account Verification Status**');
      expect(formatted).toContain('✅');
      expect(formatted).toContain('Account fully verified');
      expect(formatted).toContain('100%');
      expect(formatted).toContain('Personal Information');
      expect(formatted).toContain('Bank Details');
      expect(formatted).toContain('Apply for jobs');
      expect(formatted).toContain('Receive payments');
    });

    test('should format incomplete verification with next steps', () => {
      const incompleteData = {
        verification: {
          overallStatus: 'pending',
          overallMessage: 'Account verification in progress',
          completionPercentage: 60
        },
        checks: {
          personalInfo: { isValid: true },
          bankDetails: { isValid: false },
          documents: { isValid: false },
          skillsAndCertifications: { isValid: true },
          profilePhoto: { isValid: false, required: false }
        },
        requirements: {
          nextSteps: [
            {
              priority: 'high',
              action: 'Add bank details',
              description: 'Required for receiving payments'
            },
            {
              priority: 'high',
              action: 'Submit documents',
              description: 'Upload NRIC for verification'
            }
          ]
        },
        accountSettings: {
          canApplyForJobs: false,
          canReceivePayments: false
        }
      };

      const formatted = formatter.formatAccountVerification(incompleteData);

      expect(formatted).toContain('🟠');
      expect(formatted).toContain('60%');
      expect(formatted).toContain('Next Steps');
      expect(formatted).toContain('🔥'); // High priority indicator
      expect(formatted).toContain('Add bank details');
      expect(formatted).toContain('Submit documents');
      expect(formatted).toContain('❌'); // Cannot apply for jobs
    });
  });

  describe('Job History Formatting', () => {
    test('should format comprehensive job data', () => {
      const jobData = {
        candidateId: 'CND_TEST_001',
        summary: {
          totalJobs: 10,
          completedJobs: 8,
          totalEarnings: 2400.00,
          averageRating: 4.5
        },
        currentStatus: {
          activeJobs: 1,
          upcomingJobs: 2,
          pendingApplications: 3
        },
        timeline: {
          upcoming: [
            {
              title: 'Event Staff',
              date: '2024-02-10',
              startTime: '09:00',
              location: 'Marina Bay Sands',
              estimatedEarnings: 160.00,
              daysUntilJob: 1
            }
          ],
          recentCompleted: [
            {
              title: 'Warehouse Helper',
              date: '2024-02-05',
              earnings: 120.00,
              hoursWorked: 6,
              rating: 5
            }
          ]
        },
        performance: {
          strengths: ['Punctual', 'Reliable']
        },
        opportunities: {
          totalAvailable: 15
        }
      };

      const formatted = formatter.formatJobHistory(jobData);

      expect(formatted).toContain('💼 **Your Job History**');
      expect(formatted).toContain('Total Jobs: 10');
      expect(formatted).toContain('Completed: 8');
      expect(formatted).toContain('$2,400.00');
      expect(formatted).toContain('4.5/5 ⭐');
      expect(formatted).toContain('Active Jobs: 1');
      expect(formatted).toContain('Event Staff');
      expect(formatted).toContain('Marina Bay Sands');
      expect(formatted).toContain('**Tomorrow**');
      expect(formatted).toContain('Warehouse Helper');
      expect(formatted).toContain('Punctual');
      expect(formatted).toContain('15 jobs available');
    });

    test('should handle job data with no history', () => {
      const emptyJobData = {
        summary: {
          totalJobs: 0,
          completedJobs: 0,
          totalEarnings: 0,
          averageRating: 0
        },
        currentStatus: {
          activeJobs: 0,
          upcomingJobs: 0,
          pendingApplications: 0
        },
        timeline: {
          upcoming: [],
          recentCompleted: []
        },
        opportunities: {
          totalAvailable: 5
        }
      };

      const formatted = formatter.formatJobHistory(emptyJobData);

      expect(formatted).toContain('Total Jobs: 0');
      expect(formatted).toContain('5 jobs available');
      expect(formatted).toContain('Check the Jobs tab');
    });
  });

  describe('Withdrawal Eligibility Formatting', () => {
    test('should format eligible withdrawal status', () => {
      const withdrawalData = {
        candidateId: 'CND_TEST_001',
        balance: {
          availableBalance: 250.00,
          pendingBalance: 100.00,
          approvedBalance: 80.00
        },
        eligibility: {
          canWithdraw: true,
          reasons: [],
          requirements: []
        },
        limits: {
          minimumWithdrawal: 20.00,
          maximumWithdrawal: 250.00,
          withdrawalFee: 2.00
        },
        bankDetails: {
          bankName: 'OCBC Bank',
          accountNumber: '****5678',
          isValid: true
        },
        pending: {
          expectedProcessingTime: {
            average: '1-2 business days'
          }
        }
      };

      const formatted = formatter.formatWithdrawalEligibility(withdrawalData);

      expect(formatted).toContain('💸 **Withdrawal Status**');
      expect(formatted).toContain('$250.00');
      expect(formatted).toContain('✅ **You can withdraw now!**');
      expect(formatted).toContain('Minimum: $20.00');
      expect(formatted).toContain('Maximum: $250.00');
      expect(formatted).toContain('Fee: $2.00');
      expect(formatted).toContain('OCBC Bank');
      expect(formatted).toContain('1-2 business days');
    });

    test('should format ineligible withdrawal status', () => {
      const ineligibleData = {
        balance: {
          availableBalance: 15.00,
          pendingBalance: 50.00
        },
        eligibility: {
          canWithdraw: false,
          reasons: [
            'Minimum balance of $20.00 required',
            'Complete at least 1 job before withdrawal'
          ],
          requirements: [
            'Earn at least $5.00 more',
            'Complete your first job assignment'
          ],
          nextEligibilityDate: '2024-02-15'
        },
        limits: {
          minimumWithdrawal: 20.00
        },
        bankDetails: {
          isValid: false
        }
      };

      const formatted = formatter.formatWithdrawalEligibility(ineligibleData);

      expect(formatted).toContain('❌ **Withdrawal not available**');
      expect(formatted).toContain('Minimum balance');
      expect(formatted).toContain('Complete at least 1 job');
      expect(formatted).toContain('Earn at least $5.00 more');
      expect(formatted).toContain('Next eligible');
      expect(formatted).toContain('Action Required');
    });
  });

  describe('Interview Schedule Formatting', () => {
    test('should format scheduled interview', () => {
      const interviewData = {
        candidateId: 'CND_TEST_001',
        status: {
          currentStatus: 'scheduled',
          nextAction: 'Prepare for your upcoming interview'
        },
        interviews: {
          scheduled: 1
        },
        schedule: {
          upcoming: [
            {
              id: 'INT_001',
              title: 'Onboarding Interview',
              date: '2024-02-12',
              time: '14:00',
              interviewer: 'HR Team',
              location: 'Video Call',
              meetingLink: 'https://meet.google.com/abc-defg-hij',
              daysUntilInterview: 2
            }
          ]
        },
        requirements: {
          isRequired: true
        },
        history: {
          interviewPerformance: {
            totalInterviews: 3,
            attendanceRate: 100,
            averageRating: 4.5
          }
        }
      };

      const formatted = formatter.formatInterviewSchedule(interviewData);

      expect(formatted).toContain('🎤 **Interview Status**');
      expect(formatted).toContain('📅');
      expect(formatted).toContain('Prepare for your upcoming interview');
      expect(formatted).toContain('Onboarding Interview');
      expect(formatted).toContain('HR Team');
      expect(formatted).toContain('Video Call');
      expect(formatted).toContain('[Join Meeting]');
      expect(formatted).toContain('In 2 days');
      expect(formatted).toContain('3 completed | 100% attendance');
    });

    test('should format interview requirement', () => {
      const requirementData = {
        status: {
          currentStatus: 'required',
          nextAction: 'Schedule your onboarding interview'
        },
        interviews: {
          scheduled: 0
        },
        schedule: {
          upcoming: [],
          availableSlots: [
            { date: '2024-02-13', time: '10:00' },
            { date: '2024-02-13', time: '14:00' },
            { date: '2024-02-14', time: '09:00' }
          ]
        },
        requirements: {
          isRequired: true,
          reason: 'New candidate onboarding',
          priority: 'high',
          deadline: '2024-02-20'
        },
        actions: {
          canSchedule: true
        }
      };

      const formatted = formatter.formatInterviewSchedule(requirementData);

      expect(formatted).toContain('📝');
      expect(formatted).toContain('Schedule your onboarding interview');
      expect(formatted).toContain('Interview Required');
      expect(formatted).toContain('New candidate onboarding');
      expect(formatted).toContain('Available Times');
      expect(formatted).toContain('Contact support');
    });
  });

  describe('Comprehensive Summary Formatting', () => {
    test('should format complete user summary', () => {
      const userData = {
        candidateId: 'CND_TEST_001',
        account: {
          verification: {
            completionPercentage: 85
          }
        },
        jobs: {
          summary: {
            completedJobs: 5,
            totalEarnings: 1200.00
          },
          opportunities: {
            totalAvailable: 8
          }
        },
        payments: {
          summary: {
            pendingAmount: 150.00,
            availableBalance: 300.00
          }
        },
        withdrawals: {
          eligibility: {
            canWithdraw: true
          },
          balance: {
            availableBalance: 300.00
          }
        },
        interviews: {
          requirements: {
            isRequired: false
          }
        }
      };

      const formatted = formatter.formatComprehensiveSummary(userData);

      expect(formatted).toContain('📋 **Your WorkLink Summary**');
      expect(formatted).toContain('Account: 85% verified');
      expect(formatted).toContain('Jobs: 5 completed');
      expect(formatted).toContain('$1,200.00 earned');
      expect(formatted).toContain('Pending: $150.00');
      expect(formatted).toContain('Available: $300.00');
      expect(formatted).toContain('Browse 8 available jobs');
      expect(formatted).toContain('Withdraw $300.00');
    });

    test('should handle missing user data gracefully', () => {
      const emptyData = null;
      const formatted = formatter.formatComprehensiveSummary(emptyData);

      expect(formatted).toContain("I'm having trouble accessing");
    });
  });

  describe('Intent Response Formatting', () => {
    test('should route to correct formatter based on intent', () => {
      const userData = {
        payments: { summary: { totalEarnings: 100 } }
      };

      const paymentResponse = formatter.formatIntentResponse('payment_inquiry', userData);
      const generalResponse = formatter.formatIntentResponse('general_status', userData);
      const unknownResponse = formatter.formatIntentResponse('unknown_intent', userData);

      expect(paymentResponse).toContain('Payment Status');
      expect(generalResponse).toContain('WorkLink Summary');
      expect(unknownResponse).toContain('I understand');
    });
  });

  describe('Job Opportunities Formatting', () => {
    test('should format available job opportunities', () => {
      const jobData = {
        opportunities: {
          totalAvailable: 5,
          matchingJobs: [
            {
              title: 'Event Staff',
              date: '2024-02-15',
              startTime: '10:00',
              location: 'Sentosa',
              estimatedEarnings: 180.00,
              matchScore: 95,
              isUrgent: true,
              isFeatured: false
            },
            {
              title: 'Warehouse Helper',
              date: '2024-02-16',
              startTime: '08:00',
              location: 'Jurong',
              estimatedEarnings: 120.00,
              matchScore: 87,
              isUrgent: false,
              isFeatured: true
            }
          ]
        },
        currentStatus: {
          pendingApplications: 2
        }
      };

      const formatted = formatter.formatJobOpportunities(jobData);

      expect(formatted).toContain('🎯 **Available Job Opportunities**');
      expect(formatted).toContain('5 jobs match');
      expect(formatted).toContain('Event Staff');
      expect(formatted).toContain('Sentosa');
      expect(formatted).toContain('$180.00');
      expect(formatted).toContain('95% match');
      expect(formatted).toContain('🔥 **Urgent**');
      expect(formatted).toContain('⭐ **Featured opportunity**');
      expect(formatted).toContain('2 pending applications');
      expect(formatted).toContain('Open the Jobs tab');
    });

    test('should handle no available jobs', () => {
      const noJobsData = {
        opportunities: {
          totalAvailable: 0,
          matchingJobs: []
        },
        summary: {
          completedJobs: 1
        }
      };

      const formatted = formatter.formatJobOpportunities(noJobsData);

      expect(formatted).toContain('No jobs are currently available');
      expect(formatted).toContain('check back soon');
    });
  });

  describe('Error Handling', () => {
    test('should handle formatting errors gracefully', () => {
      const corruptedData = {
        summary: {
          totalEarnings: 'invalid_number'
        }
      };

      const formatted = formatter.formatPaymentStatus(corruptedData);
      expect(formatted).toContain("I'm having trouble");
    });

    test('should format error responses appropriately', () => {
      const errorResponse = formatter.formatErrorResponse('payment', 'user query');

      expect(errorResponse).toContain('payment information');
      expect(errorResponse).toContain('Try again');
      expect(errorResponse).toContain('Contact support');
      expect(errorResponse).toContain('🔧');
    });
  });

  describe('Utility Functions', () => {
    test('should truncate text correctly', () => {
      const longText = 'This is a very long text that should be truncated properly when it exceeds the maximum length limit';
      const truncated = formatter.truncateText(longText, 50);

      expect(truncated.length).toBeLessThanOrEqual(50);
      expect(truncated).toContain('...');
    });

    test('should format relative time correctly', () => {
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      expect(formatter.formatRelativeTime(today)).toBe('today');
      expect(formatter.formatRelativeTime(tomorrow)).toBe('tomorrow');
      expect(formatter.formatRelativeTime(yesterday)).toBe('yesterday');

      const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
      expect(formatter.formatRelativeTime(threeDaysLater)).toBe('in 3 days');

      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
      expect(formatter.formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
    });

    test('should handle invalid dates in relative time', () => {
      expect(formatter.formatRelativeTime('invalid_date')).toBe('unknown');
      expect(formatter.formatRelativeTime(null)).toBe('unknown');
    });
  });

  describe('Currency and Date Formatting', () => {
    test('should format currency consistently', () => {
      const testAmounts = [0, 25.50, 100, 1234.56, 10000.99];

      testAmounts.forEach(amount => {
        const paymentData = {
          summary: { totalEarnings: amount },
          currentStatus: {},
          timeline: {},
          bankDetails: { isValid: true }
        };

        const formatted = formatter.formatPaymentStatus(paymentData);
        expect(formatted).toMatch(/\$[\d,]+\.\d{2}/); // Should contain properly formatted currency
      });
    });

    test('should handle zero amounts correctly', () => {
      const zeroData = {
        summary: {
          totalEarnings: 0,
          pendingAmount: 0,
          approvedAmount: 0
        },
        currentStatus: {},
        timeline: {},
        bankDetails: { isValid: false }
      };

      const formatted = formatter.formatPaymentStatus(zeroData);
      expect(formatted).not.toContain('Total Earnings: $0.00'); // Should not show zero earnings
      expect(formatted).toContain('Action Needed'); // Should show bank details issue
    });
  });
});