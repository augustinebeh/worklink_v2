/**
 * TalentVis Platform Server
 * Main entry point with real-time chat support
 */

require('dotenv').config();

const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Initialize database
const { db } = require('./db/database');

// Run migrations
require('./db/migrate');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket for chat
const { setupWebSocket } = require('./websocket');
const wss = setupWebSocket(server);

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API routes
app.use('/api/v1', require('./routes/api/v1'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files for admin
const adminDistPath = path.join(__dirname, 'admin', 'dist');
if (fs.existsSync(adminDistPath)) {
  app.use('/admin', express.static(adminDistPath));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
}

// Serve static files for worker PWA
const workerDistPath = path.join(__dirname, 'worker', 'dist');
if (fs.existsSync(workerDistPath)) {
  app.use(express.static(workerDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(workerDistPath, 'index.html'));
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 TalentVis Platform Server                           ║
║                                                           ║
║   Backend API:    http://localhost:${PORT}                   ║
║   Admin Portal:   http://localhost:${PORT}/admin             ║
║   Worker PWA:     http://localhost:${PORT}                   ║
║   WebSocket:      ws://localhost:${PORT}/ws                  ║
║                                                           ║
║   Environment:    ${process.env.NODE_ENV || 'development'}                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

module.exports = { app, server, wss };
