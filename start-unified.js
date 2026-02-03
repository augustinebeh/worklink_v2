#!/usr/bin/env node

/**
 * Unified Development Server
 * Serves both apps on port 8080:
 * - Worker App: http://localhost:8080/
 * - Admin App: http://localhost:8080/admin/
 */

import { spawn } from 'child_process';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 8080;

console.log('🚀 Starting WorkLink Unified Development Server...\n');

// Start worker app on 3001
console.log('📱 Starting Worker App (Mobile)...');
const workerProcess = spawn('npm', ['start'], {
  cwd: 'worker',
  stdio: 'pipe',
  env: { ...process.env, PORT: '3001' }
});

// Start admin app on 3002 with /admin base
console.log('🖥️  Starting Admin App (Dashboard)...');
const adminProcess = spawn('npm', ['run', 'dev'], {
  cwd: 'admin',
  stdio: 'pipe',
  env: { ...process.env, PORT: '3002' }
});

// Log outputs
workerProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) console.log(`[WORKER] ${output}`);
});

adminProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) console.log(`[ADMIN] ${output}`);
});

workerProcess.stderr.on('data', (data) => {
  console.log(`[WORKER ERROR] ${data.toString().trim()}`);
});

adminProcess.stderr.on('data', (data) => {
  console.log(`[ADMIN ERROR] ${data.toString().trim()}`);
});

// Wait for servers to start, then set up proxy
setTimeout(() => {
  // Proxy /admin/* to admin app
  app.use('/admin', createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true,
    logLevel: 'silent'
  }));

  // Proxy everything else to worker app
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    logLevel: 'silent'
  }));

  app.listen(PORT, () => {
    console.log(`
┌─────────────────────────────────────────────┐
│  🎉 WorkLink Development Server Ready!      │
├─────────────────────────────────────────────┤
│  📱 Worker App:  http://localhost:8080/     │
│  🖥️  Admin App:   http://localhost:8080/admin/ │
├─────────────────────────────────────────────┤
│  Press Ctrl+C to stop all servers          │
└─────────────────────────────────────────────┘
    `);
  });
}, 8000);

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  workerProcess.kill();
  adminProcess.kill();
  process.exit(0);
});