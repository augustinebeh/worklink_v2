/**
 * WorkLink Platform Server v2
 * Main entry point with real-time chat support
 */

require('dotenv').config();

// Environment validation - ensure required variables are set
function validateEnvironment() {
  const requiredVars = [
    'ANTHROPIC_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'GOOGLE_API_KEY',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'VAPID_EMAIL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    logger.error('Missing required environment variables', {
      missing_vars: missingVars,
      module: 'environment'
    });
    process.exit(1);
  }

  // Validate API key formats
  if (!process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    logger.error('Invalid ANTHROPIC_API_KEY format', {
      expected_prefix: 'sk-ant-',
      module: 'environment'
    });
    process.exit(1);
  }

  if (!process.env.TELEGRAM_BOT_TOKEN.includes(':')) {
    logger.error('Invalid TELEGRAM_BOT_TOKEN format', {
      expected_format: 'contains ":"',
      module: 'environment'
    });
    process.exit(1);
  }

  if (!process.env.VAPID_EMAIL.startsWith('mailto:')) {
    logger.error('Invalid VAPID_EMAIL format', {
      expected_prefix: 'mailto:',
      module: 'environment'
    });
    process.exit(1);
  }

  logger.info('Environment validation passed', { module: 'environment' });
}

// Skip validation in development if explicitly disabled
if (process.env.NODE_ENV !== 'development' || process.env.VALIDATE_ENV !== 'false') {
  validateEnvironment();
}

const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { logger } = require('./utils/structured-logger');

// Initialize database (schema, migrations, and seeding handled in db/index.js)
const { db } = require('./db');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket for chat
const { setupWebSocket } = require('./websocket');
const wss = setupWebSocket(server);

// Trust proxy for Railway
app.set('trust proxy', 1);

// Input validation and sanitization middleware
const { sanitizeInput, validateRequestFrequency } = require('./middleware/input-validation');

// Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize all input data
app.use(sanitizeInput);

// Rate limiting - 500 requests per minute per IP
app.use('/api/', validateRequestFrequency(60000, 500));

// Add correlation ID for request tracking
app.use(logger.addCorrelationId);

// Request logging with structured data
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      const reqLogger = req.logger || logger;
      reqLogger.api(req.method, req.path, res.statusCode, duration, {
        user_agent: req.headers['user-agent'],
        ip: req.ip,
        content_length: res.getHeader('content-length')
      });
    }
  });
  next();
});

// CORS configuration - Secure implementation
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];

// Add Railway production URLs if available
if (process.env.RAILWAY_STATIC_URL) {
  allowedOrigins.push(`https://${process.env.RAILWAY_STATIC_URL}`);
}
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Check if origin is allowed
  const isOriginAllowed = !origin || allowedOrigins.includes(origin);

  if (isOriginAllowed) {
    // Set specific origin (never use wildcard with credentials)
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    // Block the request for unauthorized origins in production
    if (process.env.NODE_ENV === 'production') {
      logger.warn('CORS violation attempt', {
        origin,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
      return res.status(403).json({
        success: false,
        error: 'CORS policy violation'
      });
    } else {
      // In development, log warning but allow
      logger.warn('Development CORS: Allowing unauthorized origin', { origin });
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.header('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.header('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.header('X-XSS-Protection', '1; mode=block');

  // Only enforce HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy (basic)
  res.header(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self' data:;"
  );

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
  const reqLogger = req.logger || logger;
  reqLogger.error('Server error', {
    message: err.message,
    stack: err.stack,
    status: err.status,
    module: 'server'
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Initialize retention notification service
try {
  require('./services/retention-notifications');
  logger.info('Retention notification service initialized', { module: 'services' });
} catch (error) {
  logger.error('Failed to initialize retention notification service', {
    error: error.message,
    stack: error.stack,
    module: 'services'
  });
}

// Start server
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  // Structured logging for startup
  logger.info('WorkLink Platform Server v2 started successfully', {
    module: 'server',
    host: HOST,
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
    urls: {
      server: `http://${HOST}:${PORT}`,
      admin: `http://${HOST}:${PORT}/admin`,
      worker: `http://${HOST}:${PORT}`,
      health: `http://${HOST}:${PORT}/health`,
      websocket: `ws://${HOST}:${PORT}/ws`
    }
  });

  // Pretty console output in development
  if (process.env.NODE_ENV !== 'production') {
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
  }
});

module.exports = { app, server, wss };
