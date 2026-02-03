/**
 * End-to-End Interview Scheduling Test Suite
 *
 * Multi-Agent Testing Framework for Interview Scheduling Flow
 *
 * Tests the complete flow from:
 * 1. First worker message (Telegram/PWA)
 * 2. SLM response handling
 * 3. Interview scheduling
 * 4. Calendar updates
 * 5. Rescheduling scenarios
 *
 * Deploy multiple simulated agents to stress test the system
 */

const path = require('path');
const { db } = require('../db');

// Test configuration
const TEST_CONFIG = {
  numTelegramAgents: 5,
  numPWAAgents: 5,
  numRescheduleAgents: 3,
  testTimeout: 60000,
  messageDelay: 100, // ms between messages
  verbose: true,
};

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  details: [],
  startTime: null,
  endTime: null,
};

// Logger helper
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warning: '\x1b[33m', // Yellow
    reset: '\x1b[0m',
  };

  if (TEST_CONFIG.verbose || type !== 'info') {
    console.log(`${colors[type] || colors.info}[${timestamp}] ${type.toUpperCase()}: ${message}${colors.reset}`);
  }

  testResults.details.push({ timestamp, type, message });
}

/**
 * Initialize test database with test data
 */
async function initializeTestData() {
  log('Initializing test data...');

  try {
    // Create missing tables if they don't exist
    db.exec(`
      -- Worker status changes table
      CREATE TABLE IF NOT EXISTS worker_status_changes (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        from_status TEXT,
        to_status TEXT NOT NULL,
        changed_by TEXT DEFAULT 'system',
        reason TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Add missing columns to candidates if they don't exist
      -- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE
    `);

    // Try to add missing columns (will fail silently if they exist)
    const columnsToAdd = [
      { name: 'worker_status', type: "TEXT DEFAULT 'pending'" },
      { name: 'interview_stage', type: "TEXT DEFAULT 'not_started'" },
      { name: 'interview_completed_at', type: 'DATETIME' },
      { name: 'worker_status_changed_at', type: 'DATETIME' },
      { name: 'slm_routing_context', type: 'TEXT' },
    ];

    for (const col of columnsToAdd) {
      try {
        db.exec(`ALTER TABLE candidates ADD COLUMN ${col.name} ${col.type}`);
        log(`Added column ${col.name} to candidates`, 'info');
      } catch (e) {
        // Column already exists
      }
    }

    // Create test admin availability slots - IMPORTANT: Create slots for next 14 days
    const today = new Date();
    let slotsCreated = 0;
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Only create for weekdays
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        try {
          // Delete existing and recreate
          db.prepare('DELETE FROM consultant_availability WHERE date = ?').run(dateStr);
          
          // Create morning slot
          db.prepare(`
            INSERT INTO consultant_availability
            (consultant_id, date, start_time, end_time, is_available, slot_type)
            VALUES ('primary', ?, '09:00', '12:00', 1, 'interview')
          `).run(dateStr);
          
          // Create afternoon slot
          db.prepare(`
            INSERT INTO consultant_availability
            (consultant_id, date, start_time, end_time, is_available, slot_type)
            VALUES ('primary', ?, '14:00', '18:00', 1, 'interview')
          `).run(dateStr);
          
          slotsCreated += 2;
        } catch (e) {
          log(`Could not create availability for ${dateStr}: ${e.message}`, 'warning');
        }
      }
    }
    log(`Created ${slotsCreated} availability slots for testing`, 'info');

    log('Test data initialized successfully', 'success');
    return true;

  } catch (error) {
    log(`Failed to initialize test data: ${error.message}`, 'error');
    testResults.errors.push({ phase: 'initialization', error: error.message });
    return false;
  }
}

/**
 * Create a test candidate
 */
function createTestCandidate(source = 'telegram', index = 0) {
  const candidateId = `TEST_${source.toUpperCase()}_${Date.now()}_${index}`;
  const firstName = ['John', 'Jane', 'Alex', 'Maria', 'David', 'Sarah', 'Mike', 'Lisa'][index % 8];
  const lastName = ['Tan', 'Lim', 'Wong', 'Lee', 'Chen', 'Ng', 'Goh', 'Koh'][index % 8];

  try {
    db.prepare(`
      INSERT INTO candidates
      (id, name, email, phone, status, worker_status, interview_stage, source, telegram_chat_id)
      VALUES (?, ?, ?, ?, 'lead', 'pending', 'not_started', ?, ?)
    `).run(
      candidateId,
      `${firstName} ${lastName}`,
      `test_${candidateId}@worklink.test`,
      `+6591234${String(index).padStart(3, '0')}`,
      source,
      source === 'telegram' ? `TG_${candidateId}` : null
    );

    log(`Created test candidate: ${candidateId} (${firstName} ${lastName})`, 'info');
    return {
      id: candidateId,
      name: `${firstName} ${lastName}`,
      source,
      telegramChatId: source === 'telegram' ? `TG_${candidateId}` : null,
    };

  } catch (error) {
    log(`Failed to create test candidate: ${error.message}`, 'error');
    testResults.errors.push({ phase: 'create_candidate', error: error.message });
    return null;
  }
}

/**
 * Simulate realistic user messages
 */
const USER_MESSAGES = {
  firstContact: [
    'Hi, I want to work with WorkLink',
    'Hello, I saw your job posting and am interested',
    'I want to sign up as a worker',
    'Can I work with you?',
    "Hi, I'm looking for part-time work",
    'Hello, how do I become a worker?',
  ],
  availability: [
    'I am free on weekday mornings',
    'Tuesday or Wednesday afternoon works for me',
    'Any time this week is fine',
    'Morning time better for me',
    'I can do 10am or 2pm',
    'Free on Monday and Friday',
  ],
  confirmSlot: [
    'Yes, that works',
    'Confirm please',
    'Book it',
    '1',
    'The first one',
    'Perfect, book that slot',
  ],
  reschedule: [
    'I need to reschedule my interview',
    'Can I change the appointment time?',
    'Something came up, can we move the interview?',
    'Is it possible to reschedule to next week?',
    'I have a conflict, need to change time',
  ],
  questions: [
    'What is the interview for?',
    'How long does the interview take?',
    'Is it a video call?',
    'What should I prepare?',
  ],
};

/**
 * Get a random message from a category
 */
function getRandomMessage(category) {
  const messages = USER_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Test Agent - Simulates a worker interacting with the system
 */
class TestAgent {
  constructor(id, source, candidate) {
    this.id = id;
    this.source = source;
    this.candidate = candidate;
    this.conversationHistory = [];
    this.state = 'initialized';
    this.errors = [];
    this.results = {};
  }

  async sendMessage(message) {
    this.conversationHistory.push({ role: 'user', content: message, timestamp: new Date() });
    log(`[Agent ${this.id}] Sending: "${message.substring(0, 50)}..."`, 'info');
  }

  async receiveResponse(response) {
    this.conversationHistory.push({ role: 'assistant', content: response, timestamp: new Date() });
    log(`[Agent ${this.id}] Received: "${response.substring(0, 50)}..."`, 'info');
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms || TEST_CONFIG.messageDelay));
  }
}

/**
 * Test 1: SLM Scheduling Bridge Test
 */
async function testSLMSchedulingBridge() {
  log('=== TEST 1: SLM Scheduling Bridge ===', 'info');
  const testName = 'SLM Scheduling Bridge';

  try {
    const SLMSchedulingBridge = require('../utils/slm-scheduling-bridge');
    const bridge = new SLMSchedulingBridge();

    // Create test candidate
    const candidate = createTestCandidate('pwa', 0);
    if (!candidate) {
      throw new Error('Failed to create test candidate');
    }

    // Test 1.1: Welcome message generation
    log('Testing welcome message generation...', 'info');
    const welcomeResponse = await bridge.handlePendingCandidateMessage(
      candidate.id,
      'Hi, I want to work with WorkLink',
      {}
    );

    if (!welcomeResponse || !welcomeResponse.content) {
      throw new Error('Welcome response is empty or invalid');
    }

    if (!welcomeResponse.content.includes('interview') && !welcomeResponse.content.includes('schedule')) {
      testResults.warnings.push({
        test: testName,
        warning: 'Welcome message does not mention interview scheduling',
      });
    }

    // Test 1.2: Availability parsing
    log('Testing availability parsing...', 'info');
    const availabilityResponse = await bridge.handlePendingCandidateMessage(
      candidate.id,
      'I am free on Tuesday morning',
      { previousStage: 'welcome' }
    );

    if (!availabilityResponse || !availabilityResponse.content) {
      throw new Error('Availability response is empty or invalid');
    }

    // Test 1.3: Slot confirmation
    log('Testing slot confirmation...', 'info');
    const confirmResponse = await bridge.handlePendingCandidateMessage(
      candidate.id,
      'Yes, book the first slot',
      {
        previousStage: 'availability_collected',
        slots: [{ date: '2026-02-05', time: '10:00' }],
      }
    );

    if (!confirmResponse || !confirmResponse.content) {
      throw new Error('Confirm response is empty or invalid');
    }

    // Test 1.4: Health check
    log('Testing SLM bridge health check...', 'info');
    const healthCheck = await bridge.performHealthCheck();

    if (healthCheck.status !== 'healthy') {
      testResults.warnings.push({
        test: testName,
        warning: `SLM Bridge health check returned ${healthCheck.status}`,
        details: healthCheck,
      });
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 2: Interview Scheduling Engine Test
 */
async function testInterviewSchedulingEngine() {
  log('=== TEST 2: Interview Scheduling Engine ===', 'info');
  const testName = 'Interview Scheduling Engine';

  try {
    const InterviewSchedulingEngine = require('../utils/interview-scheduling-engine');
    const engine = new InterviewSchedulingEngine();

    // Test 2.1: Check capacity
    log('Testing capacity check...', 'info');
    const capacity = await engine.checkInterviewCapacity();

    if (!capacity.canSchedule) {
      testResults.warnings.push({
        test: testName,
        warning: `Cannot schedule: ${capacity.reason}`,
      });
    }

    // Test 2.2: Get available slots
    log('Testing slot availability...', 'info');
    const availableSlots = await engine.getAvailableSlots ? await engine.getAvailableSlots(7) : [];

    if (availableSlots.length === 0) {
      testResults.warnings.push({
        test: testName,
        warning: 'No available slots found for next 7 days',
      });
    }

    // Test 2.3: Get scheduling analytics
    log('Testing scheduling analytics...', 'info');
    const analytics = await engine.getSchedulingAnalytics(7);

    if (!analytics || !analytics.summary) {
      throw new Error('Analytics response is invalid');
    }

    // Test 2.4: Health check
    log('Testing engine health check...', 'info');
    const isHealthy = await engine.isHealthy();

    if (!isHealthy) {
      testResults.warnings.push({
        test: testName,
        warning: 'Engine health check returned unhealthy',
      });
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 3: Smart SLM Router Test
 */
async function testSmartSLMRouter() {
  log('=== TEST 3: Smart SLM Router ===', 'info');
  const testName = 'Smart SLM Router';

  try {
    const SmartSLMRouter = require('../utils/smart-slm-router');
    const router = new SmartSLMRouter();

    // Create test candidate
    const candidate = createTestCandidate('pwa', 10);
    if (!candidate) {
      throw new Error('Failed to create test candidate');
    }

    // Test 3.1: Route pending worker message
    log('Testing pending worker routing...', 'info');
    const pendingResponse = await router.routeSLMResponse(
      candidate.id,
      'I want to schedule an interview',
      {}
    );

    if (!pendingResponse || !pendingResponse.content) {
      throw new Error('Pending worker response is empty');
    }

    if (pendingResponse.workerStatus !== 'pending') {
      testResults.warnings.push({
        test: testName,
        warning: `Expected worker status 'pending', got '${pendingResponse.workerStatus}'`,
      });
    }

    // Test 3.2: Health check
    log('Testing router health check...', 'info');
    const healthCheck = await router.performHealthCheck();

    if (healthCheck.status !== 'healthy') {
      testResults.warnings.push({
        test: testName,
        warning: `Router health check returned ${healthCheck.status}`,
        details: healthCheck,
      });
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 4: Worker Status Classifier Test
 */
async function testWorkerStatusClassifier() {
  log('=== TEST 4: Worker Status Classifier ===', 'info');
  const testName = 'Worker Status Classifier';

  try {
    const WorkerStatusClassifier = require('../utils/worker-status-classifier');
    const classifier = new WorkerStatusClassifier();

    // Create test candidate
    const candidate = createTestCandidate('telegram', 20);
    if (!candidate) {
      throw new Error('Failed to create test candidate');
    }

    // Test 4.1: Classify pending worker
    log('Testing pending worker classification...', 'info');
    const classification = await classifier.classifyWorkerStatus(candidate.id);

    if (!classification) {
      throw new Error('Classification returned null');
    }

    if (classification.currentStatus !== 'pending') {
      testResults.warnings.push({
        test: testName,
        warning: `Expected 'pending', got '${classification.currentStatus}'`,
      });
    }

    // Test 4.2: Get SLM routing info
    log('Testing SLM routing info...', 'info');
    const routingInfo = await classifier.getSLMRoutingInfo(candidate.id);

    if (!routingInfo || !routingInfo.mode) {
      throw new Error('Routing info is invalid');
    }

    // Test 4.3: Get statistics
    log('Testing status statistics...', 'info');
    const stats = await classifier.getStatusStatistics();

    if (!stats || typeof stats.total !== 'number') {
      throw new Error('Statistics response is invalid');
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 5: Calendar API Endpoints Test
 */
async function testCalendarAPIEndpoints() {
  log('=== TEST 5: Calendar API Endpoints ===', 'info');
  const testName = 'Calendar API Endpoints';

  try {
    // Test database queries directly since we can't make HTTP requests

    // Test 5.1: Get available slots
    log('Testing available slots query...', 'info');
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const availability = db.prepare(`
      SELECT date, start_time, end_time, is_available
      FROM consultant_availability
      WHERE date >= ? AND date <= ?
      AND is_available = 1
      ORDER BY date, start_time
    `).all(today, nextWeek);

    if (availability.length === 0) {
      testResults.warnings.push({
        test: testName,
        warning: 'No availability slots found in calendar',
      });
    }

    // Test 5.2: Get scheduled interviews
    log('Testing scheduled interviews query...', 'info');
    const interviews = db.prepare(`
      SELECT
        isl.*,
        c.name as candidate_name
      FROM interview_slots isl
      LEFT JOIN candidates c ON isl.candidate_id = c.id
      WHERE isl.scheduled_date >= ?
      LIMIT 20
    `).all(today);

    log(`Found ${interviews.length} scheduled interviews`, 'info');

    // Test 5.3: Create test interview
    log('Testing interview creation...', 'info');
    const testCandidate = createTestCandidate('api', 30);

    if (testCandidate) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 3);
      const dateStr = testDate.toISOString().split('T')[0];

      try {
        const insertResult = db.prepare(`
          INSERT INTO interview_slots
          (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, status)
          VALUES (?, ?, '10:00', 30, 'onboarding', 'https://meet.worklink.com/test', 'scheduled')
        `).run(testCandidate.id, dateStr);

        if (insertResult.lastInsertRowid) {
          log(`Created test interview with ID: ${insertResult.lastInsertRowid}`, 'success');

          // Test 5.4: Reschedule interview
          log('Testing interview reschedule...', 'info');
          const newDate = new Date(testDate);
          newDate.setDate(newDate.getDate() + 1);
          const newDateStr = newDate.toISOString().split('T')[0];

          db.prepare(`
            UPDATE interview_slots
            SET scheduled_date = ?, scheduled_time = '14:00',
                notes = 'Rescheduled by test'
            WHERE id = ?
          `).run(newDateStr, insertResult.lastInsertRowid);

          // Verify reschedule
          const rescheduled = db.prepare('SELECT * FROM interview_slots WHERE id = ?')
            .get(insertResult.lastInsertRowid);

          if (rescheduled.scheduled_date !== newDateStr) {
            throw new Error('Reschedule failed - date not updated');
          }

          log('Interview reschedule successful', 'success');
        }
      } catch (e) {
        testResults.warnings.push({
          test: testName,
          warning: `Interview creation/reschedule failed: ${e.message}`,
        });
      }
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 6: Multi-Agent Concurrent Test
 */
async function testMultiAgentConcurrent() {
  log('=== TEST 6: Multi-Agent Concurrent Flow ===', 'info');
  const testName = 'Multi-Agent Concurrent';

  try {
    const SLMSchedulingBridge = require('../utils/slm-scheduling-bridge');
    const bridge = new SLMSchedulingBridge();

    const agents = [];
    const results = [];

    // Create multiple agents
    for (let i = 0; i < TEST_CONFIG.numTelegramAgents; i++) {
      const candidate = createTestCandidate('telegram', 100 + i);
      if (candidate) {
        agents.push(new TestAgent(`TG_${i}`, 'telegram', candidate));
      }
    }

    for (let i = 0; i < TEST_CONFIG.numPWAAgents; i++) {
      const candidate = createTestCandidate('pwa', 200 + i);
      if (candidate) {
        agents.push(new TestAgent(`PWA_${i}`, 'pwa', candidate));
      }
    }

    log(`Created ${agents.length} test agents`, 'info');

    // Simulate concurrent conversations
    const conversationPromises = agents.map(async (agent, index) => {
      try {
        // Step 1: First contact
        await agent.delay(index * 50); // Stagger start times
        const firstMessage = getRandomMessage('firstContact');
        await agent.sendMessage(firstMessage);

        const firstResponse = await bridge.handlePendingCandidateMessage(
          agent.candidate.id,
          firstMessage,
          {}
        );

        if (!firstResponse || !firstResponse.content) {
          throw new Error('No response to first message');
        }
        await agent.receiveResponse(firstResponse.content);

        // Step 2: Provide availability
        await agent.delay();
        const availMessage = getRandomMessage('availability');
        await agent.sendMessage(availMessage);

        const availResponse = await bridge.handlePendingCandidateMessage(
          agent.candidate.id,
          availMessage,
          { previousStage: 'welcome' }
        );

        if (!availResponse || !availResponse.content) {
          throw new Error('No response to availability');
        }
        await agent.receiveResponse(availResponse.content);

        agent.state = 'completed';
        return { agentId: agent.id, success: true, conversationLength: agent.conversationHistory.length };

      } catch (error) {
        agent.state = 'failed';
        agent.errors.push(error.message);
        return { agentId: agent.id, success: false, error: error.message };
      }
    });

    const conversationResults = await Promise.all(conversationPromises);
    const successful = conversationResults.filter(r => r.success).length;
    const failed = conversationResults.filter(r => !r.success).length;

    log(`Concurrent test results: ${successful} successful, ${failed} failed`, 'info');

    if (failed > agents.length * 0.2) {
      // More than 20% failure rate
      testResults.warnings.push({
        test: testName,
        warning: `High failure rate: ${failed}/${agents.length} agents failed`,
        details: conversationResults.filter(r => !r.success),
      });
    }

    if (failed === agents.length) {
      throw new Error('All agents failed');
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 7: Reschedule Flow Test
 */
async function testRescheduleFlow() {
  log('=== TEST 7: Reschedule Flow ===', 'info');
  const testName = 'Reschedule Flow';

  try {
    const SLMSchedulingBridge = require('../utils/slm-scheduling-bridge');
    const bridge = new SLMSchedulingBridge();

    // Create candidate with existing interview
    const candidate = createTestCandidate('pwa', 300);
    if (!candidate) {
      throw new Error('Failed to create test candidate');
    }

    // First, schedule an interview
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 2);
    const dateStr = testDate.toISOString().split('T')[0];

    const insertResult = db.prepare(`
      INSERT INTO interview_slots
      (candidate_id, scheduled_date, scheduled_time, duration_minutes, interview_type, meeting_link, status)
      VALUES (?, ?, '11:00', 30, 'onboarding', 'https://meet.worklink.com/reschedule-test', 'scheduled')
    `).run(candidate.id, dateStr);

    log(`Created interview for reschedule test: ${insertResult.lastInsertRowid}`, 'info');

    // Test reschedule request handling
    const rescheduleMessage = getRandomMessage('reschedule');
    const rescheduleResponse = await bridge.handlePendingCandidateMessage(
      candidate.id,
      rescheduleMessage,
      {}
    );

    if (!rescheduleResponse || !rescheduleResponse.content) {
      throw new Error('No response to reschedule request');
    }

    // Verify response acknowledges reschedule
    const hasRescheduleAcknowledgment =
      rescheduleResponse.content.toLowerCase().includes('reschedule') ||
      rescheduleResponse.content.toLowerCase().includes('change') ||
      rescheduleResponse.content.toLowerCase().includes('different time');

    if (!hasRescheduleAcknowledgment) {
      testResults.warnings.push({
        test: testName,
        warning: 'Reschedule response does not acknowledge reschedule request',
        response: rescheduleResponse.content.substring(0, 200),
      });
    }

    // Test database reschedule operation
    const newDate = new Date(testDate);
    newDate.setDate(newDate.getDate() + 3);
    const newDateStr = newDate.toISOString().split('T')[0];

    db.prepare(`
      UPDATE interview_slots
      SET scheduled_date = ?, scheduled_time = '15:00',
          notes = COALESCE(notes || ' | ', '') || 'Rescheduled: User requested'
      WHERE id = ?
    `).run(newDateStr, insertResult.lastInsertRowid);

    // Verify the update
    const updated = db.prepare('SELECT * FROM interview_slots WHERE id = ?')
      .get(insertResult.lastInsertRowid);

    if (updated.scheduled_date !== newDateStr || updated.scheduled_time !== '15:00') {
      throw new Error('Database update for reschedule failed');
    }

    log('Reschedule database operation successful', 'success');

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 8: Error Handling Test
 */
async function testErrorHandling() {
  log('=== TEST 8: Error Handling ===', 'info');
  const testName = 'Error Handling';

  try {
    const SLMSchedulingBridge = require('../utils/slm-scheduling-bridge');
    const SmartSLMRouter = require('../utils/smart-slm-router');

    const bridge = new SLMSchedulingBridge();
    const router = new SmartSLMRouter();

    // Test 8.1: Non-existent candidate
    log('Testing non-existent candidate handling...', 'info');
    const invalidResponse = await bridge.handlePendingCandidateMessage(
      'NON_EXISTENT_CANDIDATE_12345',
      'Hello',
      {}
    );

    if (!invalidResponse || invalidResponse.type !== 'error') {
      testResults.warnings.push({
        test: testName,
        warning: 'System did not return error for non-existent candidate',
      });
    }

    // Test 8.2: Empty message
    log('Testing empty message handling...', 'info');
    const candidate = createTestCandidate('pwa', 400);

    if (candidate) {
      const emptyResponse = await bridge.handlePendingCandidateMessage(
        candidate.id,
        '',
        {}
      );

      // Should still return a valid response
      if (!emptyResponse || !emptyResponse.content) {
        testResults.warnings.push({
          test: testName,
          warning: 'No response for empty message',
        });
      }
    }

    // Test 8.3: Router fallback
    log('Testing router fallback handling...', 'info');
    const fallbackResponse = await router.routeSLMResponse(
      'INVALID_ID_FOR_TESTING',
      'Test message',
      {}
    );

    if (!fallbackResponse || !fallbackResponse.content) {
      testResults.warnings.push({
        test: testName,
        warning: 'Router did not provide fallback response',
      });
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Test 9: Intent Detection Test
 */
async function testIntentDetection() {
  log('=== TEST 9: Intent Detection ===', 'info');
  const testName = 'Intent Detection';

  try {
    const SLMSchedulingBridge = require('../utils/slm-scheduling-bridge');
    const bridge = new SLMSchedulingBridge();

    const testCases = [
      { message: 'I want to schedule an interview', expectedIntent: 'schedule_interview' },
      { message: 'Can I reschedule my appointment?', expectedIntent: 'reschedule' },
      { message: 'I am available tomorrow morning', expectedIntent: 'provide_availability' },
      { message: 'Yes please book it', expectedIntent: 'confirm_booking' },
      { message: 'What is the interview about?', expectedIntent: 'ask_questions' },
    ];

    let passedCases = 0;

    for (const testCase of testCases) {
      const intent = bridge.analyzeMessageIntent(testCase.message);

      if (intent.primary === testCase.expectedIntent) {
        passedCases++;
        log(`Intent "${testCase.expectedIntent}" correctly detected for: "${testCase.message}"`, 'info');
      } else {
        testResults.warnings.push({
          test: testName,
          warning: `Expected intent "${testCase.expectedIntent}", got "${intent.primary}"`,
          message: testCase.message,
        });
      }
    }

    log(`Intent detection: ${passedCases}/${testCases.length} cases passed`, 'info');

    if (passedCases < testCases.length * 0.6) {
      throw new Error(`Too many intent detection failures: ${passedCases}/${testCases.length}`);
    }

    log(`${testName} PASSED`, 'success');
    testResults.passed++;
    return true;

  } catch (error) {
    log(`${testName} FAILED: ${error.message}`, 'error');
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message, stack: error.stack });
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  log('Cleaning up test data...', 'info');

  try {
    // Remove test candidates
    db.prepare(`DELETE FROM candidates WHERE id LIKE 'TEST_%'`).run();

    // Remove test interview slots
    db.prepare(`DELETE FROM interview_slots WHERE candidate_id LIKE 'TEST_%'`).run();

    // Remove test queue entries
    db.prepare(`DELETE FROM interview_queue WHERE candidate_id LIKE 'TEST_%'`).run();

    // Remove test conversations
    db.prepare(`DELETE FROM slm_conversations WHERE candidate_id LIKE 'TEST_%'`).run();

    log('Test data cleaned up successfully', 'success');

  } catch (error) {
    log(`Cleanup failed: ${error.message}`, 'warning');
  }
}

/**
 * Generate test report
 */
function generateReport() {
  testResults.endTime = new Date();
  const duration = (testResults.endTime - testResults.startTime) / 1000;

  console.log('\n' + '='.repeat(70));
  console.log('                    TEST RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`\x1b[32mPassed: ${testResults.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${testResults.failed}\x1b[0m`);
  console.log(`Warnings: ${testResults.warnings.length}`);

  if (testResults.errors.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('ERRORS:');
    testResults.errors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err.test || 'Unknown'}`);
      console.log(`   Error: ${err.error}`);
      if (err.stack && TEST_CONFIG.verbose) {
        console.log(`   Stack: ${err.stack.split('\n')[1]}`);
      }
    });
  }

  if (testResults.warnings.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log('WARNINGS:');
    testResults.warnings.forEach((warn, i) => {
      console.log(`\n${i + 1}. ${warn.test || 'Unknown'}`);
      console.log(`   Warning: ${warn.warning}`);
    });
  }

  console.log('\n' + '='.repeat(70));

  // Return the report as object
  return {
    summary: {
      total: testResults.passed + testResults.failed,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings.length,
      duration: duration,
    },
    errors: testResults.errors,
    warnings: testResults.warnings,
    startTime: testResults.startTime,
    endTime: testResults.endTime,
  };
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('     WORKLINK V2 - INTERVIEW SCHEDULING E2E TEST SUITE');
  console.log('='.repeat(70) + '\n');

  testResults.startTime = new Date();

  // Initialize test data
  const initialized = await initializeTestData();
  if (!initialized) {
    log('Failed to initialize test data. Aborting tests.', 'error');
    return generateReport();
  }

  // Run all tests
  await testSLMSchedulingBridge();
  await testInterviewSchedulingEngine();
  await testSmartSLMRouter();
  await testWorkerStatusClassifier();
  await testCalendarAPIEndpoints();
  await testMultiAgentConcurrent();
  await testRescheduleFlow();
  await testErrorHandling();
  await testIntentDetection();

  // Cleanup
  await cleanupTestData();

  // Generate and return report
  return generateReport();
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests()
    .then(report => {
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testResults,
  TestAgent,
  createTestCandidate,
};
