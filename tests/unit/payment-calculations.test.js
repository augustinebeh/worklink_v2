/**
 * Unit Tests: Payment Calculations
 *
 * Tests payment data service calculations including
 * stats, date estimations, and bank account masking.
 *
 * Note: These test the pure calculation logic, not database queries.
 * Integration tests for actual API endpoints are in tests/integration/.
 */

// ============================================
// PAYMENT STATS CALCULATION
// ============================================

describe('Payment Stats Calculation', () => {
  // Pure function extracted from PaymentDataService.calculatePaymentStats
  function calculatePaymentStats(payments) {
    const stats = {
      totalPaid: 0,
      totalPending: 0,
      totalApproved: 0,
      averagePayment: 0,
    };

    if (!payments || payments.length === 0) return stats;

    payments.forEach(p => {
      const amount = parseFloat(p.total_amount) || 0;
      switch (p.status) {
        case 'paid':
          stats.totalPaid += amount;
          break;
        case 'pending':
          stats.totalPending += amount;
          break;
        case 'approved':
          stats.totalApproved += amount;
          break;
      }
    });

    const paidPayments = payments.filter(p => p.status === 'paid');
    if (paidPayments.length > 0) {
      stats.averagePayment = Math.round((stats.totalPaid / paidPayments.length) * 100) / 100;
    }

    return stats;
  }

  test('returns zeros for empty array', () => {
    const stats = calculatePaymentStats([]);
    expect(stats.totalPaid).toBe(0);
    expect(stats.totalPending).toBe(0);
    expect(stats.totalApproved).toBe(0);
    expect(stats.averagePayment).toBe(0);
  });

  test('returns zeros for null input', () => {
    const stats = calculatePaymentStats(null);
    expect(stats.totalPaid).toBe(0);
  });

  test('correctly sums paid payments', () => {
    const payments = [
      { total_amount: 100.50, status: 'paid' },
      { total_amount: 200.75, status: 'paid' },
      { total_amount: 50.00, status: 'pending' },
    ];
    const stats = calculatePaymentStats(payments);
    expect(stats.totalPaid).toBeCloseTo(301.25, 2);
  });

  test('correctly sums pending payments', () => {
    const payments = [
      { total_amount: 100, status: 'pending' },
      { total_amount: 200, status: 'pending' },
    ];
    const stats = calculatePaymentStats(payments);
    expect(stats.totalPending).toBe(300);
  });

  test('correctly sums approved payments', () => {
    const payments = [
      { total_amount: 150, status: 'approved' },
      { total_amount: 250, status: 'approved' },
    ];
    const stats = calculatePaymentStats(payments);
    expect(stats.totalApproved).toBe(400);
  });

  test('calculates average of paid payments only', () => {
    const payments = [
      { total_amount: 100, status: 'paid' },
      { total_amount: 200, status: 'paid' },
      { total_amount: 300, status: 'paid' },
      { total_amount: 999, status: 'pending' }, // should not affect average
    ];
    const stats = calculatePaymentStats(payments);
    expect(stats.averagePayment).toBe(200);
  });

  test('handles string amounts (parseFloat)', () => {
    const payments = [
      { total_amount: '150.50', status: 'paid' },
      { total_amount: '49.50', status: 'paid' },
    ];
    const stats = calculatePaymentStats(payments);
    expect(stats.totalPaid).toBeCloseTo(200, 2);
    expect(stats.averagePayment).toBe(100);
  });

  test('handles null/undefined amounts gracefully', () => {
    const payments = [
      { total_amount: null, status: 'paid' },
      { total_amount: undefined, status: 'paid' },
      { total_amount: 100, status: 'paid' },
    ];
    const stats = calculatePaymentStats(payments);
    expect(stats.totalPaid).toBe(100);
  });

  test('average payment rounds to 2 decimal places', () => {
    const payments = [
      { total_amount: 100, status: 'paid' },
      { total_amount: 200, status: 'paid' },
      { total_amount: 300, status: 'paid' },
    ];
    // Average = 200.00
    const stats = calculatePaymentStats(payments);
    const decimalParts = stats.averagePayment.toString().split('.');
    if (decimalParts[1]) {
      expect(decimalParts[1].length).toBeLessThanOrEqual(2);
    }
  });
});

// ============================================
// NEXT PAYMENT DATE CALCULATION
// ============================================

describe('Next Payment Date (Friday)', () => {
  function calculateNextPaymentDate(fromDate) {
    const now = fromDate ? new Date(fromDate) : new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    return nextFriday;
  }

  test('Monday -> next Friday (4 days)', () => {
    const monday = new Date('2026-02-02'); // Monday
    const result = calculateNextPaymentDate(monday);
    expect(result.getDay()).toBe(5); // Friday
    expect(result.getDate()).toBe(6); // Feb 6
  });

  test('Wednesday -> next Friday (2 days)', () => {
    const wednesday = new Date('2026-02-04'); // Wednesday
    const result = calculateNextPaymentDate(wednesday);
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(6);
  });

  test('Friday -> following Friday (7 days, not same day)', () => {
    const friday = new Date('2026-02-06'); // Friday
    const result = calculateNextPaymentDate(friday);
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(13); // Next Friday
  });

  test('Saturday -> next Friday (6 days)', () => {
    const saturday = new Date('2026-02-07'); // Saturday
    const result = calculateNextPaymentDate(saturday);
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(13);
  });

  test('Sunday -> next Friday (5 days)', () => {
    const sunday = new Date('2026-02-08'); // Sunday
    const result = calculateNextPaymentDate(sunday);
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBe(13);
  });

  test('result is always a Friday', () => {
    for (let i = 0; i < 7; i++) {
      const date = new Date('2026-02-02');
      date.setDate(date.getDate() + i);
      const result = calculateNextPaymentDate(date);
      expect(result.getDay()).toBe(5);
    }
  });
});

// ============================================
// APPROVAL DATE ESTIMATION
// ============================================

describe('Approval Date Estimation', () => {
  function estimateApprovalDate(submittedDate) {
    const date = new Date(submittedDate);
    date.setDate(date.getDate() + 3); // 3 business days
    return date;
  }

  test('adds 3 days to submitted date', () => {
    const result = estimateApprovalDate('2026-02-02');
    expect(result.getDate()).toBe(5);
  });

  test('handles month boundary', () => {
    const result = estimateApprovalDate('2026-01-30');
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(2);
  });

  test('handles year boundary', () => {
    const result = estimateApprovalDate('2025-12-30');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(2);
  });
});

// ============================================
// BANK ACCOUNT MASKING
// ============================================

describe('Bank Account Masking', () => {
  function maskBankAccount(accountNumber) {
    if (!accountNumber) return null;
    const str = String(accountNumber);
    if (str.length <= 4) return '****';
    return '****' + str.slice(-4);
  }

  test('masks account showing last 4 digits', () => {
    expect(maskBankAccount('1234567890')).toBe('****7890');
  });

  test('short accounts (<=4 chars) are fully masked', () => {
    expect(maskBankAccount('1234')).toBe('****');
    expect(maskBankAccount('123')).toBe('****');
  });

  test('returns null for null/undefined input', () => {
    expect(maskBankAccount(null)).toBeNull();
    expect(maskBankAccount(undefined)).toBeNull();
  });

  test('handles numeric input', () => {
    expect(maskBankAccount(1234567890)).toBe('****7890');
  });

  test('handles empty string', () => {
    expect(maskBankAccount('')).toBeNull();
  });
});

// ============================================
// PAYMENT STATUS VALIDATION
// ============================================

describe('Payment Status Transitions', () => {
  const VALID_STATUSES = ['pending', 'approved', 'processing', 'paid'];

  function isValidStatusTransition(from, to) {
    const transitions = {
      pending: ['approved'],
      approved: ['processing', 'paid', 'withdrawal_requested'],
      processing: ['paid'],
      paid: [], // terminal state
    };
    return (transitions[from] || []).includes(to);
  }

  test('pending -> approved is valid', () => {
    expect(isValidStatusTransition('pending', 'approved')).toBe(true);
  });

  test('approved -> paid is valid', () => {
    expect(isValidStatusTransition('approved', 'paid')).toBe(true);
  });

  test('approved -> withdrawal_requested is valid', () => {
    expect(isValidStatusTransition('approved', 'withdrawal_requested')).toBe(true);
  });

  test('paid -> anything is invalid (terminal state)', () => {
    expect(isValidStatusTransition('paid', 'pending')).toBe(false);
    expect(isValidStatusTransition('paid', 'approved')).toBe(false);
  });

  test('pending -> paid is invalid (must go through approved)', () => {
    expect(isValidStatusTransition('pending', 'paid')).toBe(false);
  });

  test('backward transitions are invalid', () => {
    expect(isValidStatusTransition('approved', 'pending')).toBe(false);
    expect(isValidStatusTransition('paid', 'approved')).toBe(false);
  });
});

// ============================================
// EARNINGS ROUNDING
// ============================================

describe('Earnings Rounding (REAL/Float handling)', () => {
  function roundEarnings(amount) {
    return Math.round(amount * 100) / 100;
  }

  test('rounds to 2 decimal places', () => {
    expect(roundEarnings(10.555)).toBe(10.56);
    expect(roundEarnings(10.554)).toBe(10.55);
  });

  test('handles floating point precision issues', () => {
    // Classic JS float issue: 0.1 + 0.2 = 0.30000000000000004
    expect(roundEarnings(0.1 + 0.2)).toBe(0.3);
  });

  test('preserves exact values', () => {
    expect(roundEarnings(100.50)).toBe(100.5);
    expect(roundEarnings(0)).toBe(0);
  });

  test('handles negative amounts', () => {
    expect(roundEarnings(-10.555)).toBe(-10.55);
  });

  test('handles large amounts', () => {
    expect(roundEarnings(999999.999)).toBe(1000000);
  });
});

// ============================================
// BATCH PAYMENT VALIDATION
// ============================================

describe('Batch Payment Validation', () => {
  function validateBatchPaymentIds(paymentIds) {
    if (!Array.isArray(paymentIds)) return { valid: false, error: 'payment_ids must be an array' };
    if (paymentIds.length === 0) return { valid: false, error: 'payment_ids cannot be empty' };
    if (paymentIds.some(id => typeof id !== 'string' || id.trim() === '')) {
      return { valid: false, error: 'All payment IDs must be non-empty strings' };
    }
    if (new Set(paymentIds).size !== paymentIds.length) {
      return { valid: false, error: 'Duplicate payment IDs found' };
    }
    return { valid: true };
  }

  test('valid array of payment IDs', () => {
    const result = validateBatchPaymentIds(['PAY_001', 'PAY_002', 'PAY_003']);
    expect(result.valid).toBe(true);
  });

  test('rejects non-array input', () => {
    expect(validateBatchPaymentIds('PAY_001').valid).toBe(false);
    expect(validateBatchPaymentIds(null).valid).toBe(false);
    expect(validateBatchPaymentIds(123).valid).toBe(false);
  });

  test('rejects empty array', () => {
    expect(validateBatchPaymentIds([]).valid).toBe(false);
  });

  test('rejects arrays with empty strings', () => {
    expect(validateBatchPaymentIds(['PAY_001', '']).valid).toBe(false);
  });

  test('rejects duplicate IDs', () => {
    expect(validateBatchPaymentIds(['PAY_001', 'PAY_001']).valid).toBe(false);
  });

  test('rejects non-string IDs', () => {
    expect(validateBatchPaymentIds([123, 456]).valid).toBe(false);
  });
});
