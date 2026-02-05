#!/usr/bin/env node
/**
 * Agent 19: Server Process Hunter
 * Finds all Node processes and checks port 8080 status
 */

const { execSync } = require('child_process');

console.log('🔍 Agent 19: Server Process Hunter');
console.log('='.repeat(80) + '\n');

console.log('1️⃣ CHECKING PORT 8080:\n');

try {
  const portCheck = execSync('lsof -ti:8080 2>/dev/null || echo "No process"', { encoding: 'utf-8' });
  
  if (portCheck.trim() && portCheck.trim() !== 'No process') {
    console.log('   ⚠️  Port 8080 IS IN USE');
    console.log(`   PID: ${portCheck.trim()}`);
    
    // Get process details
    try {
      const processInfo = execSync(`ps -p ${portCheck.trim()} -o pid,ppid,cmd`, { encoding: 'utf-8' });
      console.log('\n   Process Details:');
      console.log(processInfo.split('\n').map(line => '      ' + line).join('\n'));
    } catch (e) {}
  } else {
    console.log('   ✅ Port 8080 is FREE');
  }
} catch (error) {
  console.log('   ℹ️  Could not check port (lsof not available)');
}

console.log('\n2️⃣ FINDING ALL NODE PROCESSES:\n');

try {
  const nodeProcesses = execSync('ps aux | grep node | grep -v grep || echo "No node processes"', { encoding: 'utf-8' });
  
  if (nodeProcesses.trim() === 'No node processes') {
    console.log('   ⚠️  NO NODE PROCESSES RUNNING');
  } else {
    console.log('   Node processes found:');
    nodeProcesses.trim().split('\n').forEach((line, i) => {
      if (line.includes('server.js')) {
        console.log(`\n   🎯 SERVER PROCESS (${i + 1}):`);
      } else {
        console.log(`\n   Process ${i + 1}:`);
      }
      console.log('      ' + line);
    });
  }
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

console.log('\n3️⃣ CHECKING IF SERVER IS RESPONDING:\n');

try {
  const curlTest = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null || echo "FAIL"', { encoding: 'utf-8' });
  
  if (curlTest === 'FAIL') {
    console.log('   ❌ Server NOT responding at localhost:8080');
  } else {
    console.log(`   ✅ Server responding with status: ${curlTest}`);
  }
} catch (error) {
  console.log('   ❌ Cannot reach server:', error.message);
}

console.log('\n='.repeat(80));
console.log('RECOMMENDATION:');
console.log('='.repeat(80) + '\n');

try {
  const portCheck = execSync('lsof -ti:8080 2>/dev/null', { encoding: 'utf-8' });
  if (portCheck.trim()) {
    console.log('❌ PORT CONFLICT DETECTED');
    console.log('   Run: kill -9 ' + portCheck.trim());
    console.log('   Then: npm start\n');
  } else {
    console.log('✅ Port is free - server should start normally\n');
  }
} catch (e) {
  console.log('Port check unavailable\n');
}
