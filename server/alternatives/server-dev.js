/**
 * Development server serving both Worker and Admin apps
 * Worker App: http://localhost:8080/
 * Admin App: http://localhost:8080/admin
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 8080;

// Start both Vite dev servers on different ports
const startViteServer = (name, dir, port) => {
  const vite = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, dir),
    env: { ...process.env, PORT: port },
    stdio: 'pipe'
  });

  vite.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  vite.stderr.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  return vite;
};

// Start worker on 3000, admin on 3001
console.log('🚀 Starting Vite servers...');
const workerServer = startViteServer('WORKER', 'worker', 3000);
const adminServer = startViteServer('ADMIN', 'admin', 3001);

// Wait a bit for servers to start
setTimeout(() => {
  // Proxy /admin/* to admin app on port 3001
  app.use('/admin', createProxyMiddleware({
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
      '^/admin': '', // Remove /admin prefix when proxying
    },
    onError: (err, req, res) => {
      console.error('Admin proxy error:', err.message);
      res.status(500).send('Admin app not ready yet...');
    }
  }));

  // Proxy everything else to worker app on port 3000
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error('Worker proxy error:', err.message);
      res.status(500).send('Worker app not ready yet...');
    }
  }));

  app.listen(PORT, () => {
    console.log(`
🎉 WorkLink Development Server Running!

📱 Worker App (Mobile):  http://localhost:${PORT}/
🖥️  Admin Portal:        http://localhost:${PORT}/admin

🔧 Backend API:          http://localhost:3000/api (auto-proxy)
💬 WebSocket:            ws://localhost:3000

Press Ctrl+C to stop all servers
    `);
  });
}, 5000);

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  workerServer.kill();
  adminServer.kill();
  process.exit(0);
});