#!/usr/bin/env node

// Simple server restart script
const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Starting server with database fixes applied...');

// Start the server
const server = spawn('npm', ['start'], {
  env: { ...process.env, NODE_ENV: 'production' },
  cwd: path.resolve(__dirname),
  stdio: 'inherit',
  detached: true
});

server.unref();

console.log(`🚀 Server started with PID: ${server.pid}`);
console.log('✅ Database connection fixes have been applied');
console.log('🤖 SLM should now be able to respond to messages');

process.exit(0);