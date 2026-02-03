/**
 * Minimal WorkLink Server
 * Stripped down version for development with just essential functionality
 * - Serves admin and worker portals
 * - Basic authentication
 * - Simple database connection
 * - NO hanging services (email, job scheduler, etc.)
 */

require('dotenv').config();

const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Simple console logger (no winston to avoid complexity)
const logger = {
  info: (...args) => console.log(`[INFO] ${new Date().toISOString()}`, ...args),
  warn: (...args) => console.log(`[WARN] ${new Date().toISOString()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
  debug: (...args) => console.log(`[DEBUG] ${new Date().toISOString()}`, ...args),
  success: (...args) => console.log(`[SUCCESS] ${new Date().toISOString()}`, ...args)
};

// Simple database setup (avoiding complex initialization)
let db;
try {
  const Database = require('better-sqlite3');
  const DATA_DIR = path.join(__dirname, 'data');
  const DB_PATH = path.join(DATA_DIR, 'worklink.db');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Ensure essential tables exist with minimal schema
  const initQueries = [
    `CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      status TEXT DEFAULT 'active',
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      total_earnings REAL DEFAULT 0,
      total_jobs_completed INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      certifications TEXT DEFAULT '[]',
      profile_photo TEXT,
      telegram_chat_id TEXT,
      telegram_username TEXT,
      google_id TEXT,
      referral_code TEXT,
      referred_by TEXT,
      source TEXT DEFAULT 'direct',
      online_status TEXT DEFAULT 'offline',
      whatsapp_opted_in INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      base_amount REAL NOT NULL,
      incentive_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL,
      hours_worked REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  initQueries.forEach(query => {
    try {
      db.exec(query);
    } catch (err) {
      logger.warn('Database init query failed:', err.message);
    }
  });

  // Ensure demo account exists
  const demoAccount = db.prepare('SELECT id FROM candidates WHERE email = ?').get('sarah.tan@email.com');
  if (!demoAccount) {
    try {
      db.prepare(`
        INSERT INTO candidates (
          id, name, email, phone, status, xp, level, total_earnings,
          total_jobs_completed, streak_days, rating, certifications,
          profile_photo, source, online_status, whatsapp_opted_in
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'CND_DEMO_001', 'Sarah Tan', 'sarah.tan@email.com', '+6591234567',
        'active', 15500, 14, 661.00, 42, 5, 4.8,
        '["Food Safety", "First Aid", "Customer Service"]',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah%20Tan',
        'direct', 'online', 1
      );
      logger.info('Demo account created: sarah.tan@email.com');
    } catch (err) {
      logger.warn('Could not create demo account:', err.message);
    }
  }

  logger.info('Database initialized successfully');
} catch (error) {
  logger.error('Database initialization failed:', error.message);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple CORS (allowing all origins for development)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Simple token generation (no JWT complexity)
function generateToken(user) {
  return `demo-token-${user.id}`;
}

function generateAdminToken(admin) {
  return `admin-token-${admin.id}`;
}

// Basic auth endpoints
app.post('/api/v1/auth/login', (req, res) => {
  try {
    const { email, password, type = 'candidate' } = req.body;

    if (type === 'admin') {
      // Admin login with hardcoded credentials
      if (email === 'admin@worklink.sg' && password === 'admin123') {
        const admin = {
          id: 'ADMIN001',
          name: 'Admin',
          email: email,
          role: 'admin'
        };
        return res.json({
          success: true,
          data: admin,
          token: generateAdminToken(admin)
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    // Candidate login
    const candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);
    if (!candidate) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    candidate.certifications = JSON.parse(candidate.certifications || '[]');
    res.json({
      success: true,
      data: candidate,
      token: generateToken(candidate)
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Worker app login
app.post('/api/v1/auth/worker/login', (req, res) => {
  try {
    const { email, phone } = req.body;

    let candidate;
    if (phone) {
      candidate = db.prepare('SELECT * FROM candidates WHERE phone = ?').get(phone);
    } else if (email) {
      candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);
    }

    // Special handling for demo account
    if (email === 'sarah.tan@email.com') {
      candidate = db.prepare('SELECT * FROM candidates WHERE email = ?').get(email);
      if (candidate) {
        // Ensure demo payments exist
        try {
          const payments = [
            ['PAY_DEMO_001', 120.00, 0, 120.00, 8.0, 'paid'],
            ['PAY_DEMO_002', 108.00, 20.00, 128.00, 6.0, 'paid'],
            ['PAY_DEMO_003', 160.00, 0, 160.00, 8.0, 'paid'],
            ['PAY_DEMO_004', 110.00, 15.00, 125.00, 5.0, 'pending'],
            ['PAY_DEMO_005', 128.00, 0, 128.00, 8.0, 'approved']
          ];
          payments.forEach(p => {
            try {
              db.prepare(`
                INSERT OR IGNORE INTO payments (id, candidate_id, base_amount, incentive_amount, total_amount, hours_worked, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(p[0], candidate.id, p[1], p[2], p[3], p[4], p[5]);
            } catch (err) {
              // Ignore payment creation errors
            }
          });
        } catch (err) {
          logger.warn('Could not create demo payments:', err.message);
        }
      }
    }

    if (!candidate) {
      const loginMethod = phone ? 'phone number' : 'email';
      return res.status(401).json({ success: false, error: `${loginMethod} not found. Please sign up first.` });
    }

    candidate.certifications = JSON.parse(candidate.certifications || '[]');
    res.json({
      success: true,
      data: candidate,
      token: generateToken(candidate)
    });
  } catch (error) {
    logger.error('Worker login error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Basic /me endpoint for authentication
app.get('/api/v1/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Simple token validation
    if (token.startsWith('admin-token-')) {
      return res.json({
        success: true,
        data: {
          id: 'ADMIN001',
          name: 'Admin',
          email: 'admin@worklink.sg',
          role: 'admin'
        }
      });
    }

    if (token.startsWith('demo-token-')) {
      const candidateId = token.replace('demo-token-', '');
      const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);

      if (!candidate) {
        return res.status(401).json({ success: false, error: 'Candidate not found' });
      }

      candidate.certifications = JSON.parse(candidate.certifications || '[]');
      return res.json({ success: true, data: candidate });
    }

    return res.status(401).json({ success: false, error: 'Invalid token' });
  } catch (error) {
    logger.error('/me error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  try {
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

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'WorkLink API (Minimal)',
    version: '2.0.0',
    status: 'minimal',
    endpoints: {
      auth: '/api/v1/auth',
      health: '/health'
    }
  });
});

// Favicon
app.get('/favicon.ico', (req, res) => {
  const faviconPath = path.join(__dirname, 'favicon.png');
  if (fs.existsSync(faviconPath)) {
    res.sendFile(faviconPath);
  } else {
    res.status(404).end();
  }
});

// Serve static files for admin portal
const adminDistPath = path.join(__dirname, 'admin', 'dist');
if (fs.existsSync(adminDistPath)) {
  app.use('/admin', express.static(adminDistPath, { maxAge: 0 }));
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
  logger.info('Admin portal available at /admin');
} else {
  logger.warn('Admin dist folder not found. Run: cd admin && npm run build');
  app.get('/admin', (req, res) => {
    res.status(503).send('Admin portal not built. Please run: cd admin && npm run build');
  });
}

// Serve static files for worker PWA
const workerDistPath = path.join(__dirname, 'worker', 'dist');
if (fs.existsSync(workerDistPath)) {
  app.use(express.static(workerDistPath, { maxAge: 0 }));

  // SPA fallback for worker app
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(workerDistPath, 'index.html'));
  });
  logger.info('Worker PWA available at /');
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
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// Start server
const PORT = 8080;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  const adminBuilt = fs.existsSync(path.join(__dirname, 'admin', 'dist'));
  const workerBuilt = fs.existsSync(path.join(__dirname, 'worker', 'dist'));

  console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║                                                                                ║
║   🚀 WorkLink Minimal Server - Started Successfully                           ║
║                                                                                ║
║   📍 Access URLs:                                                              ║
║      • Worker PWA:     http://${HOST}:${PORT}                                    ║
║      • Admin Portal:   http://${HOST}:${PORT}/admin                             ║
║      • API Endpoint:   http://${HOST}:${PORT}/api/v1                           ║
║      • Health Check:   http://${HOST}:${PORT}/health                           ║
║                                                                                ║
║   📊 Build Status:                                                             ║
║      • Admin Portal:   ${adminBuilt ? '✅ Built' : '❌ Not Built'}                                                ║
║      • Worker PWA:     ${workerBuilt ? '✅ Built' : '❌ Not Built'}                                                ║
║      • Database:       ✅ Connected                                            ║
║                                                                                ║
║   🎮 Demo Credentials:                                                         ║
║      • Worker:         sarah.tan@email.com (no password needed)               ║
║      • Admin:          admin@worklink.sg / admin123                           ║
║                                                                                ║
║   ⚡ This is a minimal server with NO hanging services:                        ║
║      • No email services                                                      ║
║      • No job scheduler                                                       ║
║      • No retention notifications                                             ║
║      • No heavy scraping dependencies                                         ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝

🎯 Ready! Visit http://${HOST}:${PORT} (Worker) or http://${HOST}:${PORT}/admin (Admin)
  `);

  logger.success('WorkLink Minimal Server is running successfully');
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    if (db) db.close();
    process.exit(0);
  });
});

module.exports = { app, server };