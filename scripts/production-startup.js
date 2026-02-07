#!/usr/bin/env node

/**
 * WorkLink v2 Production Startup Wrapper
 * Provides structured logging for server startup process
 */

const { spawn } = require('child_process');

// ANSI color codes for consistent styling
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Structured logging utility
const log = {
  header: () => console.log(`${colors.cyan}${colors.bright}══════════════════════════════════════════════════════════════════════════════════${colors.reset}`),
  title: (text) => console.log(`${colors.cyan}${colors.bright}🚀 ${text}${colors.reset}`),
  success: (text) => console.log(`${colors.green}✅ ${text}${colors.reset}`),
  warning: (text) => console.log(`${colors.yellow}⚠️  ${text}${colors.reset}`),
  error: (text) => console.log(`${colors.red}❌ ${text}${colors.reset}`),
  info: (text) => console.log(`${colors.blue}ℹ️  ${text}${colors.reset}`),
  step: (text) => console.log(`${colors.cyan}🔧 ${text}${colors.reset}`),
  server: (text) => console.log(`${colors.magenta}🌐 ${text}${colors.reset}`),
  footer: () => console.log(`${colors.cyan}${colors.bright}══════════════════════════════════════════════════════════════════════════════════${colors.reset}`)
};

function startServer() {
  return new Promise((resolve, reject) => {
    log.header();
    log.title('Starting WorkLink v2 Production Server');
    log.header();

    log.step('Initializing production server on port 8080...');
    console.log('');

    const serverProcess = spawn('node', ['server.js'], {
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '8080'
      }
    });

    let startupPhase = 'initializing';
    let hasStarted = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();

      // Parse and structure server output
      if (output.includes('Database path:') && !hasStarted) {
        log.step('Connecting to database...');
      } else if (output.includes('✅ Schema created successfully')) {
        log.success('Database schema initialized');
      } else if (output.includes('✅ Demo account exists:')) {
        log.success('User accounts verified');
      } else if (output.includes('WebSocket server initialized')) {
        log.success('WebSocket server ready');
      } else if (output.includes('WorkLink Platform Server v2 started successfully')) {
        log.success('Core server started');
      } else if (output.includes('GeBIZ Intelligence database connected')) {
        log.success('GeBIZ Intelligence system ready');
      } else if (output.includes('GeBIZ RSS Scraping Service initialized successfully')) {
        log.success('Automated tender monitoring active');
      } else if (output.includes('WorkLink v2 ready on')) {
        hasStarted = true;
        console.log('');
        log.header();
        log.success('WorkLink v2 Production Server Online!');
        log.server('🌐 Server: http://localhost:8080');
        log.server('👔 Admin Portal: http://localhost:8080/admin');
        log.server('📱 Worker App: http://localhost:8080');
        log.server('🏥 Health Check: http://localhost:8080/health');
        log.server('🔌 WebSocket: ws://localhost:8080/ws');
        log.header();
        console.log('');
        log.info('Server is running in production mode');
        log.info('Press Ctrl+C to stop the server');
        console.log('');
        resolve(serverProcess);
      }

      // Filter out verbose logging and show only important messages
      if (!output.includes('[INFO]') &&
          !output.includes('[stderr]') &&
          !output.includes('⚠️ [Template]') &&
          !output.includes('Could not create') &&
          output.trim() &&
          !hasStarted) {
        // Show filtered output for important non-structured messages
        const lines = output.split('\n').filter(line =>
          line.trim() &&
          !line.includes('🔌') &&
          !line.includes('🌍') &&
          !line.includes('⏰')
        );

        for (const line of lines) {
          if (line.includes('✅')) {
            // Already handled above
          } else if (line.includes('⚠️') && !line.includes('[Template]')) {
            log.warning(line.replace('⚠️', '').trim());
          }
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Only show critical errors, filter out warnings
      if (!output.includes('Template tables creation warning') &&
          !output.includes('Could not create escalation indexes') &&
          output.trim()) {
        log.warning('Server warning: ' + output.trim());
      }
    });

    serverProcess.on('close', (code) => {
      console.log('');
      if (code === 0) {
        log.success('Server shutdown gracefully');
      } else {
        log.error(`Server exited with code ${code}`);
      }
      process.exit(code);
    });

    serverProcess.on('error', (error) => {
      log.error(`Server startup failed: ${error.message}`);
      reject(error);
    });

    // Handle process termination
    process.on('SIGINT', () => {
      console.log('\n');
      log.step('Shutting down server...');
      serverProcess.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      console.log('\n');
      log.step('Shutting down server...');
      serverProcess.kill('SIGTERM');
    });
  });
}

// Start the server with structured logging
startServer().catch(error => {
  log.error(`Production startup failed: ${error.message}`);
  process.exit(1);
});