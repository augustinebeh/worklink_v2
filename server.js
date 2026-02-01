/**
 * WorkLink Platform Server v2
 * Main entry point with real-time chat support
 */

require('dotenv').config();

const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const http = require('http');
const logger = require('./utils/logger');

// Initialize database
const { db } = require('./db/database');

// Run migrations
require('./db/migrate');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket for chat
const { setupWebSocket } = require('./websocket');
const wss = setupWebSocket(server);

// Trust proxy for Railway
app.set('trust proxy', 1);

// Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      logger.api(req.method, req.path, res.statusCode, duration);
    }
  });
  next();
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // In production, allow all origins from same domain or specified origins
  if (process.env.NODE_ENV === 'production') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// API routes
app.use('/api/v1', require('./routes/api/v1'));

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  try {
    // Test database connection
    db.prepare('SELECT 1').get();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Favicon and logo
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.png'));
});
app.get('/favicon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon.png'));
});
app.get('/favicon-32x32.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'favicon-32x32.png'));
});

// Serve static files for admin portal
const adminDistPath = path.join(__dirname, 'admin', 'dist');
if (fs.existsSync(adminDistPath)) {
  app.use('/admin', express.static(adminDistPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
  }));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
} else {
  logger.warn('Admin dist folder not found. Run: cd admin && npm run build');
  app.get('/admin', (req, res) => {
    res.status(503).send('Admin portal not built. Please run: cd admin && npm run build');
  });
}

// Serve static files for worker PWA
const workerDistPath = path.join(__dirname, 'worker', 'dist');
if (fs.existsSync(workerDistPath)) {
  app.use(express.static(workerDistPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    setHeaders: (res, filePath) => {
      // Prevent caching of icons, manifest, and service worker
      if (filePath.includes('icon-') ||
          filePath.includes('apple-touch-icon') ||
          filePath.includes('favicon') ||
          filePath.includes('manifest.json') ||
          filePath.includes('sw.js') ||
          filePath.includes('splash')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  
  // SPA fallback for worker app
  app.get('*', (req, res, next) => {
    // Skip API, admin, and websocket routes
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/ws') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(workerDistPath, 'index.html'));
  });
} else {
  logger.warn('Worker dist folder not found. Run: cd worker && npm run build');
  app.get('/', (req, res) => {
    res.status(503).send('Worker app not built. Please run: cd worker && npm run build');
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not Found',
    path: req.path 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Server error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 WorkLink Platform Server v2                          ║
║                                                            ║
║   Server:         http://${HOST}:${PORT}                       ║
║   Admin Portal:   http://${HOST}:${PORT}/admin                 ║
║   Worker PWA:     http://${HOST}:${PORT}                       ║
║   Health Check:   http://${HOST}:${PORT}/health                ║
║   WebSocket:      ws://${HOST}:${PORT}/ws                      ║
║                                                            ║
║   Environment:    ${(process.env.NODE_ENV || 'development').padEnd(20)}             ║
║   Node Version:   ${process.version.padEnd(20)}             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, wss };
