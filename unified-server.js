#!/usr/bin/env node

/**
 * Unified Development Server
 * Everything runs on port 8080:
 * - Worker App: http://localhost:8080/
 * - Admin App: http://localhost:8080/admin/
 * - API: http://localhost:8080/api/
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8080;

console.log('🚀 WorkLink Unified Server - Starting All Services...\n');

let workerServer, adminServer, backendServer;
let serversReady = { worker: false, admin: false, backend: false };

// Start backend API server on port 3000
console.log('🔧 Starting Backend API Server...');
backendServer = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'pipe',
  env: { ...process.env, PORT: '3000' }
});

// Start worker dev server on port 3001 (force the port)
console.log('📱 Starting Worker App...');
workerServer = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'worker'),
  stdio: 'pipe',
  env: { ...process.env, PORT: '3001', VITE_PORT: '3001', FORCE_COLOR: '1' }
});

// Start admin dev server on port 3002 (force the port)
console.log('🖥️  Starting Admin App...');
adminServer = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'admin'),
  stdio: 'pipe',
  env: { ...process.env, PORT: '3002', VITE_PORT: '3002', FORCE_COLOR: '1' }
});

// Handle backend output
backendServer.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('Server running') || output.includes('listening')) {
    serversReady.backend = true;
    console.log('✅ Backend API ready on port 3000');
  }
  if (output) console.log(`[API] ${output}`);
});

backendServer.stderr.on('data', (data) => {
  console.log(`[API ERROR] ${data.toString().trim()}`);
});

// Handle worker output
workerServer.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('ready') || output.includes('Local:')) {
    serversReady.worker = true;
    console.log('✅ Worker app ready on port 3001');
  }
  if (output) console.log(`[WORKER] ${output}`);
});

workerServer.stderr.on('data', (data) => {
  console.log(`[WORKER ERROR] ${data.toString().trim()}`);
});

// Handle admin output
adminServer.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('ready') || output.includes('Local:')) {
    serversReady.admin = true;
    console.log('✅ Admin app ready on port 3002');
  }
  if (output) console.log(`[ADMIN] ${output}`);
});

adminServer.stderr.on('data', (data) => {
  console.log(`[ADMIN ERROR] ${data.toString().trim()}`);
});

// Wait for servers to start, then set up unified routing
setTimeout(() => {
  console.log('\n🔀 Setting up unified routing on port 8080...\n');

  // Proxy /api/* to backend server
  app.use('/api', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    logLevel: 'silent'
  }));

  // Proxy /uploads/* to backend server
  app.use('/uploads', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    logLevel: 'silent'
  }));

  // Proxy /ws (WebSocket) to backend server
  app.use('/ws', createProxyMiddleware({
    target: 'http://localhost:3000',
    ws: true,
    changeOrigin: true,
    logLevel: 'silent'
  }));

  // Proxy /admin/* to admin app (with proper path rewriting)
  app.use('/admin', createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true,
    logLevel: 'silent',
    pathRewrite: {
      '^/admin': '', // Remove /admin from the forwarded path
    },
  }));

  // Proxy everything else to worker app
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    logLevel: 'silent'
  }));

  // Start the unified server
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║  🎉 WorkLink Unified Server Ready!                ║
╠═══════════════════════════════════════════════════╣
║  📱 Worker App:   http://localhost:8080/          ║
║  🖥️  Admin Portal: http://localhost:8080/admin/    ║
║  🔧 Backend API:  http://localhost:8080/api/      ║
║  💬 WebSocket:    ws://localhost:8080/ws          ║
╠═══════════════════════════════════════════════════╣
║  All SLM AI features are active and ready!       ║
║  Press Ctrl+C to stop all servers                ║
╚═══════════════════════════════════════════════════╝
    `);
  });

}, 10000); // Give servers 10 seconds to start

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down all servers...');

  if (backendServer) backendServer.kill();
  if (workerServer) workerServer.kill();
  if (adminServer) adminServer.kill();

  setTimeout(() => {
    console.log('✅ All servers stopped');
    process.exit(0);
  }, 2000);
});

// Handle process crashes
process.on('SIGTERM', () => process.emit('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.emit('SIGINT');
});