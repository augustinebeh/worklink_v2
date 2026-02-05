#!/usr/bin/env node
/**
 * Master Orchestrator: Multi-Agent Deployment System
 * Runs all verification agents in parallel and compiles results
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();

console.log('🚀 MULTI-AGENT VERIFICATION SYSTEM');
console.log('='.repeat(80));
console.log('Deploying 5 specialized agents to verify your application...\n');

const agents = [
  {
    id: 1,
    name: 'Build Process Verifier',
    script: 'agent-1-build-verifier.js',
    description: 'Checks build scripts and package.json',
    icon: '🔨'
  },
  {
    id: 2,
    name: 'Database Connection Verifier',
    script: 'agent-2-database-verifier.js',
    description: 'Ensures single database instance',
    icon: '💾'
  },
  {
    id: 3,
    name: 'Server Configuration Verifier',
    script: 'agent-3-server-verifier.js',
    description: 'Verifies port 8080 and static serving',
    icon: '🖥️'
  },
  {
    id: 4,
    name: 'Route & Module Verifier',
    script: 'agent-4-route-verifier.js',
    description: 'Checks refactored module usage',
    icon: '🛣️'
  },
  {
    id: 5,
    name: 'Duplicate & Error Detector',
    script: 'agent-5-duplicate-detector.js',
    description: 'Finds duplicates and errors',
    icon: '🔍'
  }
];

const results = {
  agents: [],
  timestamp: new Date().toISOString(),
  summary: {
    total: agents.length,
    completed: 0,
    failed: 0,
    issues: 0
  }
};

/**
 * Run an agent
 */
function runAgent(agent) {
  return new Promise((resolve, reject) => {
    console.log(`${agent.icon} Starting Agent ${agent.id}: ${agent.name}...`);
    
    const startTime = Date.now();
    const agentProcess = spawn('node', [agent.script], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe'
    });
    
    let output = '';
    let errorOutput = '';
    
    agentProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    agentProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    agentProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        console.log(`${agent.icon} ✅ Agent ${agent.id} completed in ${(duration / 1000).toFixed(2)}s\n`);
        
        // Try to load the agent's JSON report
        const reportPath = path.join(PROJECT_ROOT, agent.script.replace('.js', '.json'));
        let report = null;
        
        if (fs.existsSync(reportPath)) {
          try {
            report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
          } catch (error) {
            console.log(`   ⚠️  Could not parse report JSON`);
          }
        }
        
        resolve({
          agent: agent.name,
          success: true,
          duration,
          output: output.split('\n').slice(0, 20).join('\n'), // First 20 lines
          report
        });
      } else {
        console.log(`${agent.icon} ❌ Agent ${agent.id} failed with code ${code}\n`);
        console.log(`Error: ${errorOutput}\n`);
        
        reject({
          agent: agent.name,
          success: false,
          duration,
          error: errorOutput,
          code
        });
      }
    });
    
    agentProcess.on('error', (error) => {
      console.log(`${agent.icon} ❌ Agent ${agent.id} error: ${error.message}\n`);
      reject({
        agent: agent.name,
        success: false,
        error: error.message
      });
    });
  });
}

/**
 * Run all agents in parallel
 */
async function runAllAgents() {
  console.log('📊 Deploying all agents in parallel...\n');
  
  const promises = agents.map(agent => runAgent(agent));
  
  const agentResults = await Promise.allSettled(promises);
  
  agentResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.agents.push(result.value);
      results.summary.completed++;
    } else {
      results.agents.push(result.reason);
      results.summary.failed++;
    }
  });
}

/**
 * Compile master report
 */
function compileMasterReport() {
  console.log('\n' + '='.repeat(80));
  console.log('MASTER VERIFICATION REPORT');
  console.log('='.repeat(80) + '\n');
  
  console.log('📊 Agent Execution Summary:\n');
  console.log(`   Total agents: ${results.summary.total}`);
  console.log(`   Completed: ${results.summary.completed} ✅`);
  console.log(`   Failed: ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : '✅'}`);
  console.log('');
  
  // Compile issues from all agents
  const allIssues = [];
  
  results.agents.forEach(agent => {
    if (agent.success && agent.report) {
      if (agent.report.issues) {
        allIssues.push(...agent.report.issues.map(issue => ({
          ...issue,
          agent: agent.agent
        })));
      }
      if (agent.report.potentialIssues) {
        allIssues.push(...agent.report.potentialIssues.map(issue => ({
          ...issue,
          agent: agent.agent
        })));
      }
    }
  });
  
  results.summary.issues = allIssues.length;
  
  console.log('🔍 Issues Found Across All Agents:\n');
  
  if (allIssues.length > 0) {
    const critical = allIssues.filter(i => i.severity === 'critical');
    const high = allIssues.filter(i => i.severity === 'high');
    const medium = allIssues.filter(i => i.severity === 'medium');
    const low = allIssues.filter(i => i.severity === 'low');
    
    console.log(`   🔴 Critical: ${critical.length}`);
    console.log(`   🟠 High: ${high.length}`);
    console.log(`   🟡 Medium: ${medium.length}`);
    console.log(`   🟢 Low: ${low.length}`);
    console.log('');
    
    // Show critical and high issues
    if (critical.length > 0) {
      console.log('🔴 CRITICAL ISSUES:\n');
      critical.forEach(issue => {
        console.log(`   [${issue.agent}] ${issue.file || 'General'}: ${issue.issue}`);
      });
      console.log('');
    }
    
    if (high.length > 0) {
      console.log('🟠 HIGH PRIORITY ISSUES:\n');
      high.slice(0, 10).forEach(issue => {
        console.log(`   [${issue.agent}] ${issue.file || 'General'}: ${issue.issue}`);
      });
      if (high.length > 10) {
        console.log(`   ... and ${high.length - 10} more\n`);
      }
      console.log('');
    }
  } else {
    console.log('   ✅ No critical issues found!\n');
  }
  
  // Generate recommendations
  console.log('💡 KEY RECOMMENDATIONS:\n');
  
  const recommendations = [
    'Run npm run build:all before starting',
    'Ensure PORT=8080 is set in .env and start:server script',
    'Verify all routes use refactored module imports',
    'Check that only db/index.js instantiates the database',
    'Remove any duplicate files or deprecated code',
    'Test the full build and start process'
  ];
  
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  console.log('');
  
  // Save master report
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'MASTER_VERIFICATION_REPORT.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('📄 Master report saved: MASTER_VERIFICATION_REPORT.json\n');
  
  // Generate human-readable report
  generateHumanReport();
}

/**
 * Generate human-readable markdown report
 */
function generateHumanReport() {
  const lines = [
    '# 🚀 Multi-Agent Verification Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## 📊 Executive Summary',
    '',
    `- **Total Agents Deployed:** ${results.summary.total}`,
    `- **Successfully Completed:** ${results.summary.completed} ✅`,
    `- **Failed:** ${results.summary.failed} ${results.summary.failed > 0 ? '❌' : '✅'}`,
    `- **Total Issues Found:** ${results.summary.issues}`,
    '',
    '## 🤖 Agent Results',
    ''
  ];
  
  agents.forEach(agent => {
    const agentResult = results.agents.find(r => r.agent === agent.name);
    
    lines.push(`### ${agent.icon} Agent ${agent.id}: ${agent.name}`);
    lines.push('');
    lines.push(`**Description:** ${agent.description}`);
    lines.push(`**Status:** ${agentResult && agentResult.success ? '✅ Success' : '❌ Failed'}`);
    
    if (agentResult && agentResult.duration) {
      lines.push(`**Duration:** ${(agentResult.duration / 1000).toFixed(2)}s`);
    }
    
    if (agentResult && agentResult.report) {
      const report = agentResult.report;
      
      if (report.issues && report.issues.length > 0) {
        lines.push(`**Issues Found:** ${report.issues.length}`);
      }
      
      if (report.potentialIssues && report.potentialIssues.length > 0) {
        lines.push(`**Potential Issues:** ${report.potentialIssues.length}`);
      }
      
      if (report.summary) {
        lines.push('');
        lines.push('**Summary:**');
        Object.entries(report.summary).forEach(([key, value]) => {
          lines.push(`- ${key}: ${value}`);
        });
      }
    }
    
    lines.push('');
  });
  
  lines.push('## 🎯 Next Steps');
  lines.push('');
  lines.push('1. Review individual agent reports for detailed findings');
  lines.push('2. Address critical and high-priority issues first');
  lines.push('3. Run `npm run build:all` to build admin and worker');
  lines.push('4. Test with `npm start` to verify port 8080');
  lines.push('5. Check all API endpoints are working');
  lines.push('');
  lines.push('## 📄 Detailed Reports');
  lines.push('');
  lines.push('Individual agent reports:');
  agents.forEach(agent => {
    lines.push(`- ${agent.icon} ${agent.name}: ${agent.script.replace('.js', '.json')}`);
  });
  lines.push('');
  
  fs.writeFileSync(
    path.join(PROJECT_ROOT, 'MASTER_VERIFICATION_REPORT.md'),
    lines.join('\n')
  );
  
  console.log('📄 Human-readable report saved: MASTER_VERIFICATION_REPORT.md\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    await runAllAgents();
    compileMasterReport();
    
    console.log('='.repeat(80));
    console.log('✅ MULTI-AGENT VERIFICATION COMPLETE!');
    console.log('='.repeat(80) + '\n');
    
    if (results.summary.issues === 0 && results.summary.failed === 0) {
      console.log('🎉 All agents completed successfully with no issues!\n');
      console.log('Your application is ready to build and run on port 8080.\n');
    } else if (results.summary.failed > 0) {
      console.log('⚠️  Some agents failed to complete. Check the reports.\n');
    } else {
      console.log(`⚠️  Found ${results.summary.issues} issues. Review the reports and address them.\n`);
    }
    
    console.log('📊 Reports generated:');
    console.log('   - MASTER_VERIFICATION_REPORT.json');
    console.log('   - MASTER_VERIFICATION_REPORT.md');
    agents.forEach(agent => {
      console.log(`   - ${agent.script.replace('.js', '.json')}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ Master orchestrator error:', error);
    process.exit(1);
  }
}

// Run the master orchestrator
main();
