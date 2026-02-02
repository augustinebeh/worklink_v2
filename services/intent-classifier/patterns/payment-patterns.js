/**
 * Payment Inquiry Pattern Matcher
 *
 * Detects messages related to payments, earnings, withdrawals, and financial questions.
 * Singapore context with local banking and payment methods.
 */

// Core payment inquiry keywords
const PAYMENT_KEYWORDS = [
  'payment', 'pay', 'salary', 'money', 'cash', 'earning', 'earnings',
  'wage', 'wages', 'income', 'payout', 'payroll', 'compensation',
  'remuneration', 'fee', 'commission', 'bonus', 'incentive'
];

// Payment status inquiries
const PAYMENT_STATUS = [
  'when will i get paid', 'when payment', 'payment date', 'pay day',
  'payment schedule', 'when my money come', 'when receive payment',
  'payment pending', 'payment processing', 'payment status',
  'where is my payment', 'where my money', 'still no payment',
  'payment not received', 'not paid yet', 'payment late', 'overdue payment'
];

// Singapore-specific payment terms
const SINGLISH_PAYMENT = [
  'when money come', 'money not in yet', 'salary come when', 'pay already or not',
  'money inside account already', 'can check my pay anot', 'pay slip got',
  'cpf contribution', 'bank transfer when', 'posb account', 'dbs account',
  'ocbc account', 'uob account', 'paynow payment', 'grab pay', 'nets payment'
];

// Payment method inquiries
const PAYMENT_METHODS = [
  'how to get paid', 'payment method', 'bank transfer', 'cash payment',
  'cheque', 'paypal', 'giro', 'wire transfer', 'direct deposit',
  'bank account', 'account number', 'routing number', 'swift code'
];

// Payment amount inquiries
const PAYMENT_AMOUNTS = [
  'how much', 'total amount', 'pay rate', 'hourly rate', 'daily rate',
  'my balance', 'current balance', 'total earnings', 'amount due',
  'outstanding payment', 'pending amount', 'calculation', 'breakdown'
];

// Withdrawal and cash-out related
const WITHDRAWAL_PATTERNS = [
  'withdraw', 'cash out', 'transfer money', 'bank transfer', 'send money',
  'get my money', 'access funds', 'available balance', 'minimum withdrawal',
  'withdrawal fee', 'processing time', 'instant transfer'
];

// Payment issues and problems
const PAYMENT_ISSUES = [
  'payment error', 'wrong amount', 'missing payment', 'payment failed',
  'account issue', 'bank details wrong', 'payment rejected',
  'insufficient funds', 'payment dispute', 'payment problem'
];

/**
 * Match payment inquiry patterns
 * @param {string} message - Preprocessed message
 * @param {object} context - Context information
 * @returns {array} Array of payment matches with confidence scores
 */
function match(message, context) {
  const matches = [];
  const lowerMessage = message.toLowerCase();

  // Check basic payment keywords
  const basicMatch = checkBasicPaymentKeywords(lowerMessage);
  if (basicMatch) {
    matches.push(basicMatch);
  }

  // Check payment status inquiries
  const statusMatch = checkPaymentStatus(lowerMessage);
  if (statusMatch) {
    matches.push(statusMatch);
  }

  // Check Singlish payment expressions
  const singlishMatch = checkSinglishPayment(lowerMessage);
  if (singlishMatch) {
    matches.push(singlishMatch);
  }

  // Check payment method inquiries
  const methodMatch = checkPaymentMethods(lowerMessage);
  if (methodMatch) {
    matches.push(methodMatch);
  }

  // Check payment amount inquiries
  const amountMatch = checkPaymentAmounts(lowerMessage);
  if (amountMatch) {
    matches.push(amountMatch);
  }

  // Check withdrawal patterns
  const withdrawalMatch = checkWithdrawalPatterns(lowerMessage);
  if (withdrawalMatch) {
    matches.push(withdrawalMatch);
  }

  // Check payment issues
  const issueMatch = checkPaymentIssues(lowerMessage);
  if (issueMatch) {
    matches.push(issueMatch);
  }

  // Check for dollar amounts or currency mentions
  if (message.includes('$') || message.includes('sgd') || message.includes('dollar')) {
    matches.push({
      pattern: 'currency_mention',
      confidence: 0.6,
      keywords: ['$', 'sgd', 'dollar'],
      subtype: 'amount_inquiry'
    });
  }

  // Context boosts for payment patterns
  if (context.userStatus === 'active' && context.hasCompletedJobs) {
    matches.forEach(match => {
      match.confidence = Math.min(1.0, match.confidence * 1.1);
      match.contextBoost = 'active_worker';
    });
  }

  return matches;
}

/**
 * Check basic payment keywords
 */
function checkBasicPaymentKeywords(message) {
  const foundKeywords = [];

  for (const keyword of PAYMENT_KEYWORDS) {
    if (message.includes(keyword)) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    return {
      pattern: 'basic_payment_keywords',
      confidence: 0.65 + (foundKeywords.length * 0.05),
      keywords: foundKeywords,
      subtype: 'general_payment'
    };
  }

  return null;
}

/**
 * Check payment status patterns
 */
function checkPaymentStatus(message) {
  for (const pattern of PAYMENT_STATUS) {
    if (message.includes(pattern)) {
      return {
        pattern: 'payment_status_inquiry',
        confidence: 0.85,
        keywords: [pattern],
        subtype: 'payment_status'
      };
    }
  }

  // Check for combinations of when + payment words
  const whenWords = ['when', 'what time', 'how long', 'when will'];
  const paymentWords = ['payment', 'pay', 'money', 'salary'];

  const hasWhen = whenWords.some(word => message.includes(word));
  const hasPayment = paymentWords.some(word => message.includes(word));

  if (hasWhen && hasPayment) {
    return {
      pattern: 'when_payment_combo',
      confidence: 0.8,
      keywords: [...whenWords.filter(w => message.includes(w)), ...paymentWords.filter(w => message.includes(w))],
      subtype: 'payment_timing'
    };
  }

  return null;
}

/**
 * Check Singlish payment expressions
 */
function checkSinglishPayment(message) {
  for (const expression of SINGLISH_PAYMENT) {
    if (message.includes(expression)) {
      return {
        pattern: 'singlish_payment',
        confidence: 0.8,
        keywords: [expression],
        subtype: 'local_payment_inquiry'
      };
    }
  }
  return null;
}

/**
 * Check payment method inquiries
 */
function checkPaymentMethods(message) {
  const foundMethods = [];

  for (const method of PAYMENT_METHODS) {
    if (message.includes(method)) {
      foundMethods.push(method);
    }
  }

  if (foundMethods.length > 0) {
    return {
      pattern: 'payment_method_inquiry',
      confidence: 0.75,
      keywords: foundMethods,
      subtype: 'payment_method'
    };
  }

  return null;
}

/**
 * Check payment amount inquiries
 */
function checkPaymentAmounts(message) {
  const foundPatterns = [];

  for (const pattern of PAYMENT_AMOUNTS) {
    if (message.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  if (foundPatterns.length > 0) {
    return {
      pattern: 'payment_amount_inquiry',
      confidence: 0.8,
      keywords: foundPatterns,
      subtype: 'amount_inquiry'
    };
  }

  // Special check for "how much" questions
  if (message.includes('how much') && (message.includes('earn') || message.includes('get') || message.includes('pay'))) {
    return {
      pattern: 'how_much_earn',
      confidence: 0.85,
      keywords: ['how much', 'earn/get/pay'],
      subtype: 'earnings_inquiry'
    };
  }

  return null;
}

/**
 * Check withdrawal patterns
 */
function checkWithdrawalPatterns(message) {
  const foundPatterns = [];

  for (const pattern of WITHDRAWAL_PATTERNS) {
    if (message.includes(pattern)) {
      foundPatterns.push(pattern);
    }
  }

  if (foundPatterns.length > 0) {
    return {
      pattern: 'withdrawal_inquiry',
      confidence: 0.75,
      keywords: foundPatterns,
      subtype: 'withdrawal'
    };
  }

  return null;
}

/**
 * Check payment issues
 */
function checkPaymentIssues(message) {
  const foundIssues = [];

  for (const issue of PAYMENT_ISSUES) {
    if (message.includes(issue)) {
      foundIssues.push(issue);
    }
  }

  if (foundIssues.length > 0) {
    return {
      pattern: 'payment_issue',
      confidence: 0.85,
      keywords: foundIssues,
      subtype: 'payment_problem'
    };
  }

  return null;
}

/**
 * Get total number of patterns
 */
function getPatternCount() {
  return PAYMENT_KEYWORDS.length +
         PAYMENT_STATUS.length +
         SINGLISH_PAYMENT.length +
         PAYMENT_METHODS.length +
         PAYMENT_AMOUNTS.length +
         WITHDRAWAL_PATTERNS.length +
         PAYMENT_ISSUES.length;
}

module.exports = {
  match,
  getPatternCount
};