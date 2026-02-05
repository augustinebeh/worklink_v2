#!/usr/bin/env node
/**
 * 🤖 AGENT 3: Port Conflict Detector
 * Ensures no duplicate port usage or conflicts
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const results = {
  portUsages: [],
  conflicts: [],
  recommendations: []
};

console.log('🤖 AGENT 3: Port Conflict Detector');
console.log('='.repeat(80) + '\n');

/**
 * Scan files for port usage
 */
function scanForPorts(dirPath, basePath = '') {
  const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'backups', 'logs', 'data'];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith('.')) {
          scanForPorts(fullPath, relativePath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.js', '.mjs', '.json'].includes(ext)) {
          analyzeFileForPorts(fullPath, relativePath);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

/**
 * Analyze file for port configurations
 */
function analyzeFileForPorts(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
      // Match port assignments and usage
      const portPatterns = [
        /PORT\s*=\s*(\d+)/gi,
        /port:\s*(\d+)/gi,
        /\.listen\s*\(\s*(\d+)/gi,
        /:(\d{4})\b/g  // Matches :3000, :8080, etc.
      ];
      
      portPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const port = parseInt(match[1]);
          
          // Only care about common dev ports
          if (port >= 3000 && port <= 9000) {
            results.portUsages.push({
              port: port,
              file: relativePath,
              line: idx + 1,
              context: line.trim()
            });
          }
        }
      });
    });
  } catch (error) {
    // Skip files we can't read
  }
}

/**
 * Analyze port conflicts
 */
function analyzeConflicts() {
  console.log('🔍 Analyzing port usage...\n');
  
  // Group by port
  const portGroups = {};
  results.portUsages.forEach(usage => {
    if (!portGroups[usage.port]) {
      portGroups[usage.port] = [];
    }
    portGroups[usage.port].push(usage);
  });
  
  // Check each port
  Object.entries(portGroups).forEach(([port, usages]) => {
    console.log(`Port ${port}:`);
    usages.forEach(usage => {
      console.log(`  ${usage.file}:${usage.line}`);
      console.log(`    ${usage.context}`);
    });
    console.log('');
    
    // Check for potential conflicts
    if (usages.length > 2) {
      results.conflicts.push({
        port: parseInt(port),
        count: usages.length,
        files: usages.map(u => u.file)
      });
    }
  });
}

/**
 * Check specific important ports
 */
function checkCriticalPorts() {
  console.log('🎯 Checking critical ports...\n');
  
  const criticalPorts = {
    8080: 'Production server (expected)',
    3000: 'Dev backend server',
    3001: 'Worker dev server',
    3002: 'Admin dev server'
  };
  
  Object.entries(criticalPorts).forEach(([port, purpose]) => {
    const usages = results.portUsages.filter(u => u.port === parseInt(port));
    
    if (usages.length > 0) {
      console.log(`✅ Port ${port} (${purpose}): ${usages.length} reference(s)`);
      usages.forEach(u => {
        console.log(`   ${u.file}:${u.line}`);
      });
    } else {
      console.log(`⚠️  Port ${port} (${purpose}): No references found`);
    }
    console.log('');
  });
}

/**
 * Generate report
 */
function generateReport() {
  console.log('='.repeat(80));
  console.log('📋 AGENT 3 FINDINGS');
  console.log('='.repeat(80) + '\n');
  
  console.log(`Total port references: ${results.portUsages.length}\n`);
  
  if (results.conflicts.length > 0) {
    console.log('⚠️  POTENTIAL CONFLICTS:\n');
    results.conflicts.forEach(conflict => {
      console.log(`Port ${conflict.port}: Used in ${conflict.count} locations`);
      conflict.files.forEach(file => {
        console.log(`  - ${file}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ No port conflicts detected\n');
  }
  
  // Recommendations
  console.log('💡 RECOMMENDATIONS:\n');
  console.log('1. Production (npm start): Use PORT=8080 from environment');
  console.log('2. Dev backend: Use PORT=3000');
  console.log('3. Dev admin: Use PORT=3002 (Vite)');
  console.log('4. Dev worker: Use PORT=3001 (Vite)');
  console.log('');
  
  // Save report
  const reportPath = path.join(PROJECT_ROOT, 'agent-3-port-conflict-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: agent-3-port-conflict-report.json\n`);
}

// Run analysis
console.log('Scanning codebase for port usage...\n');
scanForPorts(PROJECT_ROOT);
analyzeConflicts();
checkCriticalPorts();
generateReport();
