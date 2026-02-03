#!/usr/bin/env node

/**
 * Production Server for WorkLink
 * Serves built admin and worker apps with API proxy
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PROD_PORT || 8080;

console.log('🚀 WorkLink Production Server - Starting...\n');

// Start backend API server
console.log('🔧 Starting Backend API Server...');
const backendServer = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'pipe',
  env: { ...process.env, PORT: '3000' }
});

// Handle backend output
backendServer.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output.includes('Server running') || output.includes('listening')) {
    console.log('✅ Backend API ready on port 3000');
  }
  if (output) console.log(`[API] ${output}`);
});

backendServer.stderr.on('data', (data) => {
  console.log(`[API ERROR] ${data.toString().trim()}`);
});

// Wait for backend to start, then set up routing
setTimeout(() => {
  console.log('🔀 Setting up production routing...\n');

  // Serve static files with proper MIME types
  app.use(express.static(path.join(__dirname, 'public')));

  // Add cache-busting headers only for HTML files to prevent development asset conflicts
  app.use((req, res, next) => {
    if (req.path.endsWith('.html') || req.path.endsWith('/')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    next();
  });

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

  // Serve admin app from /admin/* path
  app.use('/admin', express.static(path.join(__dirname, 'admin/dist')));

  // Handle admin SPA routing - redirect admin routes to index.html
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin/dist/index.html'));
  });

  // Serve worker app from root path
  app.use('/', express.static(path.join(__dirname, 'worker/dist')));

  // Handle worker SPA routing - redirect all other routes to worker index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'worker/dist/index.html'));
  });

  // Start the production server
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║  🎉 WorkLink Production Server Ready!             ║
╠═══════════════════════════════════════════════════╣
║  📱 Worker App:   http://localhost:${PORT}/          ║
║  🖥️  Admin Portal: http://localhost:${PORT}/admin/    ║
║  🔧 Backend API:  http://localhost:${PORT}/api/      ║
║  💬 WebSocket:    ws://localhost:${PORT}/ws          ║
╠═══════════════════════════════════════════════════╣
║  Serving built production files                   ║
║  Press Ctrl+C to stop the server                  ║
╚═══════════════════════════════════════════════════╝
    `);
  });

}, 5000); // Give backend 5 seconds to start

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down production server...');

  if (backendServer) backendServer.kill();

  setTimeout(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  }, 2000);
});

// Handle process crashes
process.on('SIGTERM', () => process.emit('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.emit('SIGINT');
});