/**
 * 4 AI Agents to Test NEW Interview Scheduler
 * Tests complex scenarios including day-specific requests
 */

const WebSocket = require('ws');
const { db } = require('./db');

const WS_URL = 'ws://localhost:8080/ws';

// 4 Test agents with different conversation patterns
const TEST_AGENTS = [
  {
    id: 'AGENT_SIMPLE',
    name: 'Simple Sarah',
    email: 'simple.sarah@test.com',
    behavior: 'simple_flow',
    description: 'Follows perfect happy path',
    messages: [
      { text: 'hi', delay: 1000 },
      { text: 'morning', delay: 2000 },
      { text: '1', delay: 2000 },
    ]
  },
  {
    id: 'AGENT_DAY_REQUEST',
    name: 'Day-Specific Dan',
    email: 'dan.day@test.com',
    behavior: 'asks_for_specific_day',
    description: 'Asks "what about friday" - tests day-specific logic',
    messages: [
      { text: 'hello', delay: 1000 },
      { text: 'morning', delay: 2000 },
      { text: 'what about friday', delay: 2000 }, // KEY TEST
      { text: '2', delay: 2000 },
    ]
  },
  {
    id: 'AGENT_COMPLEX',
    name: 'Complex Carol',
    email: 'complex.carol@test.com',
    behavior: 'complex_requests',
    description: 'Changes mind, asks questions, requests different days',
    messages: [
      { text: 'hi there', delay: 1000 },
      { text: 'afternoon', delay: 2000 },
      { text: 'actually, what about thursday morning?', delay: 2000 }, // DAY + PREFERENCE
      { text: 'hmm, how about friday instead?', delay: 2000 }, // ANOTHER DAY
      { text: 'perfect, I\'ll take 3', delay: 2000 },
    ]
  },
  {
    id: 'AGENT_NATURAL',
    name: 'Natural Nancy',
    email: 'natural.nancy@test.com',
    behavior: 'natural_language',
    description: 'Uses very natural, conversational language',
    messages: [
      { text: 'hey!', delay: 1000 },
      { text: 'I prefer mornings if possible', delay: 2000 },
      { text: 'can I see what you have for next week tuesday?', delay: 2000 }, // DAY REQUEST
      { text: 'the 10am one looks good', delay: 2000 }, // TIME-BASED SELECTION
    ]
  }
];

class SchedulerTestAgent {
  constructor(profile) {
    this.profile = profile;
    this.candidateId = profile.id;
    this.token = `demo-token-${profile.id}`;
    this.ws = null;
    this.messages = [];
    this.responses = [];
    this.startTime = null;
    this.endTime = null;
    this.testResults = {
      passed: false,
      errors: [],
      keyTests: []
    };
  }

  async setup() {
    try {
      console.log(`\n[${this.profile.id}] 🔧 Setting up ${this.profile.name}`);
      console.log(`   Description: ${this.profile.description}`);
      
      // Create test candidate
      const existing = db.prepare('SELECT * FROM candidates WHERE id = ?').get(this.candidateId);
      
      if (!existing) {
        db.prepare(`
          INSERT INTO candidates (id, email, name, phone, status, certifications, created_at)
          VALUES (?, ?, ?, ?, 'pending', '[]', datetime('now'))
        `).run(
          this.candidateId,
          this.profile.email,
          this.profile.name,
          '+65 9999 TEST',
        );
        console.log(`[${this.profile.id}] ✅ Created candidate`);
      } else {
        console.log(`[${this.profile.id}] ℹ️  Using existing candidate`);
      }
      
      return true;
    } catch (error) {
      console.error(`[${this.profile.id}] ❌ Setup error:`, error.message);
      this.testResults.errors.push({ stage: 'setup', error: error.message });
      return false;
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${WS_URL}?candidateId=${this.candidateId}&token=${this.token}`;
        console.log(`[${this.profile.id}] 🔌 Connecting to WebSocket...`);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.on('open', () => {
          console.log(`[${this.profile.id}] ✅ Connected`);
          resolve();
        });
        
        this.ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          const content = message.content || '';
          
          console.log(`[${this.profile.id}] 📥 Bot: ${content.substring(0, 100)}...`);
          
          this.responses.push({
            timestamp: new Date(),
            message: message,
            content: content
          });
          
          // Check for key indicators
          this.analyzeResponse(content);
        });
        
        this.ws.on('error', (error) => {
          console.error(`[${this.profile.id}] ❌ WebSocket error:`, error.message);
          this.testResults.errors.push({ stage: 'websocket', error: error.message });
        });
        
        this.ws.on('close', () => {
          console.log(`[${this.profile.id}] 🔌 WebSocket closed`);
        });
        
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  analyzeResponse(content) {
    const lower = content.toLowerCase();
    
    // Check for error messages
    if (lower.includes('temporary issue') || lower.includes('technical difficult')) {
      this.testResults.keyTests.push({
        test: 'error_handling',
        passed: false,
        message: 'Bot showed error message'
      });
    }
    
    // Check for day-specific responses (for day request agents)
    if (this.profile.behavior === 'asks_for_specific_day') {
      if (lower.includes('friday')) {
        this.testResults.keyTests.push({
          test: 'day_specific_request',
          passed: true,
          message: 'Successfully handled "what about friday"'
        });
      }
    }
    
    // Check for confirmation
    if (lower.includes('confirmed') || lower.includes('interview confirmed')) {
      this.testResults.keyTests.push({
        test: 'booking_confirmation',
        passed: true,
        message: 'Successfully confirmed booking'
      });
    }
  }

  async sendMessage(text, delay = 2000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.error(`[${this.profile.id}] ❌ WebSocket not connected`);
          this.testResults.errors.push({ stage: 'send', message: text });
          resolve();
          return;
        }
        
        console.log(`[${this.profile.id}] 📤 User: "${text}"`);
        
        const message = {
          type: 'chat_message',
          content: text,
          candidateId: this.candidateId
        };
        
        this.ws.send(JSON.stringify(message));
        this.messages.push({
          timestamp: new Date(),
          text: text
        });
        
        resolve();
      }, delay);
    });
  }

  async runConversation() {
    try {
      console.log(`\n[${this.profile.id}] 🚀 Starting conversation...`);
      this.startTime = new Date();
      
      for (const msg of this.profile.messages) {
        await this.sendMessage(msg.text, msg.delay);
      }
      
      // Wait for final responses
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      this.endTime = new Date();
      const duration = (this.endTime - this.startTime) / 1000;
      
      // Evaluate success
      this.evaluateSuccess();
      
      const status = this.testResults.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`\n[${this.profile.id}] ${status}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Messages sent: ${this.messages.length}`);
      console.log(`   Responses received: ${this.responses.length}`);
      console.log(`   Errors: ${this.testResults.errors.length}`);
      
    } catch (error) {
      console.error(`[${this.profile.id}] ❌ Conversation error:`, error.message);
      this.testResults.errors.push({ stage: 'conversation', error: error.message });
    }
  }

  evaluateSuccess() {
    // Check if conversation completed without errors
    const noErrors = this.testResults.errors.length === 0;
    const gotResponses = this.responses.length > 0;
    const sentAllMessages = this.messages.length === this.profile.messages.length;
    
    // Specific test for day-request agent
    if (this.profile.behavior === 'asks_for_specific_day') {
      const handledDayRequest = this.testResults.keyTests.some(t => 
        t.test === 'day_specific_request' && t.passed
      );
      this.testResults.passed = noErrors && gotResponses && sentAllMessages && handledDayRequest;
    } else {
      this.testResults.passed = noErrors && gotResponses && sentAllMessages;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getReport() {
    return {
      agentId: this.profile.id,
      agentName: this.profile.name,
      behavior: this.profile.behavior,
      description: this.profile.description,
      duration: this.endTime && this.startTime ? (this.endTime - this.startTime) / 1000 : null,
      messagesSent: this.messages.length,
      responsesReceived: this.responses.length,
      passed: this.testResults.passed,
      errors: this.testResults.errors,
      keyTests: this.testResults.keyTests,
      responses: this.responses.map(r => r.content.substring(0, 100))
    };
  }
}

async function runSchedulerTests() {
  console.log('\n🤖 DEPLOYING 4 AI AGENTS TO TEST NEW SCHEDULER 🤖\n');
  console.log('═════════════════════════════════════════════════════\n');
  console.log('TESTING: Day-specific requests (e.g., "what about friday")\n');
  console.log('═════════════════════════════════════════════════════\n');
  
  const agents = TEST_AGENTS.map(profile => new SchedulerTestAgent(profile));
  
  // Setup all agents
  console.log('📋 PHASE 1: Setting up agents...\n');
  for (const agent of agents) {
    await agent.setup();
  }
  
  console.log('\n📋 PHASE 2: Connecting agents...\n');
  for (const agent of agents) {
    try {
      await agent.connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to connect ${agent.profile.id}:`, error.message);
    }
  }
  
  console.log('\n📋 PHASE 3: Running conversations...\n');
  await Promise.all(agents.map(agent => agent.runConversation()));
  
  console.log('\n📋 PHASE 4: Disconnecting...\n');
  agents.forEach(agent => agent.disconnect());
  
  // Generate report
  console.log('\n\n📊 TEST RESULTS REPORT');
  console.log('═════════════════════════════════════════════════════\n');
  
  const reports = agents.map(agent => agent.getReport());
  
  reports.forEach(report => {
    const status = report.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${report.agentName} (${report.behavior})`);
    console.log(`   ${report.description}`);
    console.log(`   Duration: ${report.duration?.toFixed(2)}s`);
    console.log(`   Messages: ${report.messagesSent} sent, ${report.responsesReceived} received`);
    
    if (report.keyTests.length > 0) {
      console.log(`   Key Tests:`);
      report.keyTests.forEach(test => {
        const testStatus = test.passed ? '✅' : '❌';
        console.log(`      ${testStatus} ${test.test}: ${test.message}`);
      });
    }
    
    if (report.errors.length > 0) {
      console.log(`   ⚠️  Errors: ${report.errors.length}`);
      report.errors.forEach(err => {
        console.log(`      - ${err.stage}: ${err.error || err.message}`);
      });
    }
    console.log('');
  });
  
  const totalTests = reports.length;
  const passed = reports.filter(r => r.passed).length;
  const failed = totalTests - passed;
  const passRate = ((passed / totalTests) * 100).toFixed(1);
  
  console.log('═════════════════════════════════════════════════════');
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total Agents: ${totalTests}`);
  console.log(`   Passed: ${passed} (${passRate}%)`);
  console.log(`   Failed: ${failed}`);
  
  // Specific test for "what about friday"
  const dayRequestAgent = reports.find(r => r.behavior === 'asks_for_specific_day');
  if (dayRequestAgent) {
    const fridayTest = dayRequestAgent.keyTests.find(t => t.test === 'day_specific_request');
    console.log(`\n🔑 KEY TEST: "What about friday"`);
    if (fridayTest && fridayTest.passed) {
      console.log(`   ✅ PASSED - Bot handled day-specific request!`);
    } else {
      console.log(`   ❌ FAILED - Bot did not handle "what about friday"`);
    }
  }
  
  console.log(`\n✅ Testing complete!\n`);
  
  // Save report
  const fs = require('fs');
  fs.writeFileSync(
    'scheduler-test-results.json',
    JSON.stringify({ timestamp: new Date().toISOString(), summary: { totalTests, passed, failed, passRate }, agents: reports }, null, 2)
  );
  console.log('📄 Detailed report: scheduler-test-results.json\n');
  
  process.exit(0);
}

// Run tests
console.log('⏳ Waiting 3 seconds for server...\n');
setTimeout(() => {
  runSchedulerTests().catch(error => {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  });
}, 3000);
