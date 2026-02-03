require('dotenv').config();
const express = require('express');
const app = express();
const PORT = 8080;

// Simple health endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple auth endpoints for testing
app.use(express.json());
app.post('/api/v1/auth/worker/login', (req, res) => {
  const { email } = req.body;
  console.log('Worker login attempt:', { email });
  if (email === 'sarah.tan@email.com') {
    res.json({
      success: true,
      data: {
        id: 'CND_DEMO_001',
        name: 'Sarah Tan',
        email: email
      },
      token: 'demo-token-123'
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/v1/auth/login', (req, res) => {
  const { email, password, type } = req.body;
  console.log('Admin login attempt:', { email, type });
  if (type === 'admin' && email === 'admin@worklink.sg' && password === 'admin123') {
    res.json({
      success: true,
      data: { id: 'ADMIN001', name: 'Admin', email: email, role: 'admin' },
      token: 'admin-token-123'
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid admin credentials' });
  }
});

// Serve a simple login page for testing
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WorkLink - Worker PWA</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          form { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
          .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        </style>
      </head>
      <body>
        <h1>WorkLink Worker PWA - Login Test</h1>
        <p>This page tests the Worker PWA login functionality. When not authenticated, users should be redirected to this login page.</p>

        <form id='loginForm'>
          <h3>Worker Login</h3>
          <div>
            <label for='email'>Email:</label>
            <input type='email' id='email' placeholder='sarah.tan@email.com' required>
          </div>
          <button type='submit'>Login</button>
        </form>

        <div id='result'></div>

        <h4>Demo Credentials:</h4>
        <ul>
          <li><strong>Worker:</strong> sarah.tan@email.com (no password required)</li>
        </ul>

        <script>
          document.getElementById('loginForm').onsubmit = function(e) {
            e.preventDefault();
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>Logging in...</p>';

            fetch('/api/v1/auth/worker/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: document.getElementById('email').value })
            })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                resultDiv.innerHTML = \`
                  <div class='result success'>
                    <h3>✅ Login Successful!</h3>
                    <p><strong>User:</strong> \${data.data.name}</p>
                    <p><strong>Token:</strong> \${data.token}</p>
                    <p><strong>User ID:</strong> \${data.data.id}</p>
                  </div>
                \`;
              } else {
                resultDiv.innerHTML = \`
                  <div class='result error'>
                    <h3>❌ Login Failed</h3>
                    <p>\${data.error}</p>
                  </div>
                \`;
              }
            })
            .catch(error => {
              resultDiv.innerHTML = \`
                <div class='result error'>
                  <h3>🚫 Network Error</h3>
                  <p>Failed to connect to API: \${error.message}</p>
                </div>
              \`;
            });
          };
        </script>
      </body>
    </html>
  `);
});

app.get('/admin', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WorkLink - Admin Portal</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
          form { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input { width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #c82333; }
          .result { margin-top: 20px; padding: 15px; border-radius: 5px; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
          .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
        </style>
      </head>
      <body>
        <h1>WorkLink Admin Portal - Login Test</h1>
        <p>This is the admin portal login page. Administrators can log in here to access the dashboard.</p>

        <form id='adminLoginForm'>
          <h3>Admin Login</h3>
          <div>
            <label for='adminEmail'>Email:</label>
            <input type='email' id='adminEmail' placeholder='admin@worklink.sg' required>
          </div>
          <div>
            <label for='adminPassword'>Password:</label>
            <input type='password' id='adminPassword' placeholder='admin123' required>
          </div>
          <button type='submit'>Admin Login</button>
        </form>

        <div id='result'></div>

        <h4>Demo Credentials:</h4>
        <ul>
          <li><strong>Admin:</strong> admin@worklink.sg / admin123</li>
        </ul>

        <script>
          document.getElementById('adminLoginForm').onsubmit = function(e) {
            e.preventDefault();
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>Logging in...</p>';

            fetch('/api/v1/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: document.getElementById('adminEmail').value,
                password: document.getElementById('adminPassword').value,
                type: 'admin'
              })
            })
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                resultDiv.innerHTML = \`
                  <div class='result success'>
                    <h3>✅ Admin Login Successful!</h3>
                    <p><strong>Admin:</strong> \${data.data.name}</p>
                    <p><strong>Token:</strong> \${data.token}</p>
                    <p><strong>Role:</strong> \${data.data.role}</p>
                  </div>
                \`;
              } else {
                resultDiv.innerHTML = \`
                  <div class='result error'>
                    <h3>❌ Admin Login Failed</h3>
                    <p>\${data.error}</p>
                  </div>
                \`;
              }
            })
            .catch(error => {
              resultDiv.innerHTML = \`
                <div class='result error'>
                  <h3>🚫 Network Error</h3>
                  <p>Failed to connect to API: \${error.message}</p>
                </div>
              \`;
            });
          };
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log(`Worker PWA: http://localhost:${PORT}/`);
  console.log(`Admin Portal: http://localhost:${PORT}/admin`);
});