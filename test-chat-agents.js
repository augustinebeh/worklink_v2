/**
 * Automated Chat AI Testing Suite
 * Deploys 10 agents to test scheduler with various edge cases
 */

const axios = require('axios');
const WebSocket = require('ws');
const { db } = require('./db');

const BASE_URL = 'http://localhost:8080';
const WS_URL = 'ws://localhost:8080/ws';

// Test agent profiles with different behaviors
const TEST_AGENTS = [
  {
    id: 'AGENT_001',
    name: 'Agent Perfect',
    email: 'agent.perfect@test.com',
    behavior: 'ideal', // Follows flow perfectly
    messages: ['hi', 'morning', '1', 'yes']
  },
  {
    id: 'AGENT_002', 
    name: 'Agent Typo',
    email: 'agent.typo@test.com',
    behavior: 'typos', // Makes typos
    messages: ['helo', 'morninng', '1 plz', 'yess']
  },
  {
    id: 'AGENT_003',
    name: 'Agent Natural',
    email: 'agent.natural@test.com', 
    behavior: 'natural_language', // Uses natural language
    messages: ['hey there!', 'I prefer mornings', 'this friday can?', 'sure, book it']
  },
  {
    id: 'AGENT_004',
    name: 'Agent Confused',
    email: 'agent.confused@test.com',
    behavior: 'confused', // Asks questions, changes mind
    messages: ['hi', 'what times do you have?', 'actually afternoon', 'wait, can I see morning again?', '2', 'yes']
  },
  {
    id: 'AGENT_005',
    name: 'Agent Rapid',
    email: 'agent.rapid@test.com',
    behavior: 'rapid_fire', // Sends messages very fast
    messages: ['hi', 'morning', '1', 'yes'],
    delay: 100 // 100ms between messages
  },
  {
    id: 'AGENT_006',
    name: 'Agent Slow',
    email: 'agent.slow@test.com',
    behavior: 'slow', // Long delays between messages
    messages: ['hi', 'morning', '1', 'yes'],
    delay: 10000 // 10 seconds between messages
  },
  {
    id: 'AGENT_007',
    name: 'Agent Mixed',
    email: 'agent.mixed@test.com',
    behavior: 'mixed_language', // Mixes languages, uses emoji
    messages: ['hi', 'morning pls 🙏', '第一个时间', 'ok lah confirm']
  },
  {
    id: 'AGENT_008',
    name: 'Agent Special',
    email: 'agent.special@test.com',
    behavior: 'special_chars', // Uses special characters
    messages: ['hi!!!', 'morning???', '#1', 'yes!!!']
  },
  {
    id: 'AGENT_009',
    name: 'Agent Verbose',
    email: 'agent.verbose@test.com',
    behavior: 'verbose', // Very long messages
    messages: [
      'Hello! I am very interested in scheduling an interview with your team.',
      'I would prefer morning slots if possible, as I have other commitments in the afternoon.',
      'The first option looks perfect for my schedule, can I book that one?',
      'Yes, I would like to confirm this booking, thank you very much!'
    ]
  },
  {
    id: 'AGENT_010',
    name: 'Agent Edge',
    email: 'agent.edge@test.com',
    behavior: 'edge_cases', // Tests edge cases
    messages: [
      'hi',
      '', // Empty message
      'morning afternoon both', // Conflicting preferences
      '99', // Invalid slot number
      'no wait yes', // Indecisive
      '1'
    ]
  }
];

class ChatTestAgent {
  constructor(profile) {
    this.profile = profile;
    this.candidateId = null;
    this.token = null;
    this.ws = null;
    this.messages = [];
    this.responses = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  async setup() {
    try {
      console.log(`\n[${this.profile.id}] Setting up agent: ${this.profile.name}`);
      
      // Create or get candidate
      const existing = db.prepare('SELECT * FROM candidates WHERE email = ?').get(this.profile.email);
      
      if (existing) {
        this.candidateId = existing.id;
        console.log(`[${this.profile.id}] Using existing candidate: ${this.candidateId}`);
      } else {
        this.candidateId = this.profile.id;
        
        // Create test candidate
        db.prepare(`
          INSERT INTO candidates (id, email, name, phone, status, certifications, created_at)
          VALUES (?, ?, ?, ?, 'pending', '[]', datetime('now'))
        `).run(
          this.candidateId,
          this.profile.email,
          this.profile.name,
          '+65 9999 ' + this.profile.id.slice(-4),
        );
        
        console.log(`[${this.profile.id}] Created new candidate: ${this.candidateId}`);
      }
      
      this.token = `demo-token-${this.candidateId}`;
      return true;
    } catch (error) {
      console.error(`[${this.profile.id}] Setup error:`, error.message);
      this.errors.push({ stage: 'setup', error: error.message });
      return false;
    }
  }

  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${WS_URL}?candidateId=${this.candidateId}&token=${this.token}`;
        console.log(`[${this.profile.id}] Connecting to WebSocket...`);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.on('open', () => {
          console.log(`[${this.profile.id}] ✅ WebSocket connected`);
          resolve();
        });
        
        this.ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log(`[${this.profile.id}] 📥 Received:`, message.content?.substring(0, 80) + '...');
          this.responses.push({
            timestamp: new Date(),
            message: message
          });
        });
        
        this.ws.on('error', (error) => {
          console.error(`[${this.profile.id}] ❌ WebSocket error:`, error.message);
          this.errors.push({ stage: 'websocket', error: error.message });
        });
        
        this.ws.on('close', () => {
          console.log(`[${this.profile.id}] WebSocket closed`);
        });
        
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  async sendMessage(text, delay = 2000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.error(`[${this.profile.id}] ❌ WebSocket not connected`);
          this.errors.push({ stage: 'send_message', error: 'WebSocket not connected', message: text });
          resolve();
          return;
        }
        
        console.log(`[${this.profile.id}] 📤 Sending: "${text}"`);
        
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
      console.log(`\n[${this.profile.id}] 🚀 Starting conversation flow...`);
      this.startTime = new Date();
      
      const delay = this.profile.delay || 2000;
      
      for (let i = 0; i < this.profile.messages.length; i++) {
        const message = this.profile.messages[i];
        
        // Wait for bot response before sending next message
        const messageDelay = i === 0 ? delay : delay + 1000;
        await this.sendMessage(message, messageDelay);
      }
      
      // Wait for final responses
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      this.endTime = new Date();
      const duration = (this.endTime - this.startTime) / 1000;
      
      console.log(`\n[${this.profile.id}] ✅ Conversation complete! Duration: ${duration}s`);
      console.log(`[${this.profile.id}] Messages sent: ${this.messages.length}`);
      console.log(`[${this.profile.id}] Responses received: ${this.responses.length}`);
      console.log(`[${this.profile.id}] Errors: ${this.errors.length}`);
      
    } catch (error) {
      console.error(`[${this.profile.id}] ❌ Conversation error:`, error.message);
      this.errors.push({ stage: 'conversation', error: error.message });
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
      duration: this.endTime && this.startTime ? (this.endTime - this.startTime) / 1000 : null,
      messagesSent: this.messages.length,
      responsesReceived: this.responses.length,
      errorsCount: this.errors.length,
      errors: this.errors,
      success: this.errors.length === 0 && this.responses.length > 0
    };
  }
}

async function runTests() {
  console.log('\n🤖🤖🤖 DEPLOYING 10 AI TESTING AGENTS 🤖🤖🤖\n');
  console.log('═══════════════════════════════════════════════\n');
  
  const agents = TEST_AGENTS.map(profile => new ChatTestAgent(profile));
  
  // Setup all agents
  console.log('📋 PHASE 1: Setting up agents...\n');
  for (const agent of agents) {
    await agent.setup();
  }
  
  console.log('\n📋 PHASE 2: Connecting to WebSocket...\n');
  for (const agent of agents) {
    try {
      await agent.connectWebSocket();
      await new Promise(resolve => setTimeout(resolve, 500)); // Stagger connections
    } catch (error) {
      console.error(`Failed to connect ${agent.profile.id}:`, error.message);
    }
  }
  
  console.log('\n📋 PHASE 3: Running conversations...\n');
  
  // Run conversations in parallel
  await Promise.all(agents.map(agent => agent.runConversation()));
  
  console.log('\n📋 PHASE 4: Disconnecting...\n');
  agents.forEach(agent => agent.disconnect());
  
  // Generate report
  console.log('\n\n📊 TEST RESULTS REPORT');
  console.log('═══════════════════════════════════════════════\n');
  
  const reports = agents.map(agent => agent.getReport());
  
  reports.forEach(report => {
    const status = report.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${report.agentName} (${report.behavior})`);
    console.log(`   Duration: ${report.duration?.toFixed(2)}s`);
    console.log(`   Messages: ${report.messagesSent} sent, ${report.responsesReceived} received`);
    if (report.errorsCount > 0) {
      console.log(`   ⚠️  Errors: ${report.errorsCount}`);
      report.errors.forEach(err => {
        console.log(`      - ${err.stage}: ${err.error}`);
      });
    }
    console.log('');
  });
  
  const totalTests = reports.length;
  const passed = reports.filter(r => r.success).length;
  const failed = totalTests - passed;
  const passRate = ((passed / totalTests) * 100).toFixed(1);
  
  console.log('═══════════════════════════════════════════════');
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Total Agents: ${totalTests}`);
  console.log(`   Passed: ${passed} (${passRate}%)`);
  console.log(`   Failed: ${failed}`);
  console.log(`\n✅ Testing complete!\n`);
  
  // Save detailed report to file
  const fs = require('fs');
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: { totalTests, passed, failed, passRate },
    agents: reports
  };
  
  fs.writeFileSync(
    'test-results.json',
    JSON.stringify(reportData, null, 2)
  );
  
  console.log('📄 Detailed report saved to: test-results.json\n');
  
  process.exit(0);
}

// Run tests
console.log('⏳ Waiting 3 seconds for server to be ready...\n');
setTimeout(() => {
  runTests().catch(error => {
    console.error('❌ Test suite error:', error);
    process.exit(1);
  });
}, 3000);
