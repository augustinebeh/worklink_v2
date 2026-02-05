import React from 'react';

export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1e40af' }}>🚀 WorkLink Admin Portal - Minimal Version</h1>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        margin: '20px 0'
      }}>
        <h2>✅ React App is Working!</h2>
        <p>This minimal version loads successfully. We can now add components one by one.</p>

        <div style={{ margin: '20px 0' }}>
          <h3>Navigation Test:</h3>
          <button
            onClick={() => alert('Button works!')}
            style={{
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              margin: '5px'
            }}
          >
            Test Button
          </button>
          <a
            href="/admin/test.html"
            style={{
              background: '#2196F3',
              color: 'white',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              margin: '5px',
              display: 'inline-block'
            }}
          >
            Go to Test Page
          </a>
          <a
            href="/admin/emergency.html"
            style={{
              background: '#ff9800',
              color: 'white',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              margin: '5px',
              display: 'inline-block'
            }}
          >
            Emergency Dashboard
          </a>
        </div>

        <div style={{ margin: '20px 0' }}>
          <h3>Component Testing Order:</h3>
          <ul>
            <li>✅ Basic React App - Working</li>
            <li>⏳ Add Router (next test)</li>
            <li>⏳ Add Auth Context</li>
            <li>⏳ Add Basic Layout</li>
            <li>⏳ Add One Page at a time</li>
          </ul>
        </div>

        <div style={{ margin: '20px 0' }}>
          <h3>Current Status:</h3>
          <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
          <p><strong>Location:</strong> {window.location.pathname}</p>
          <p><strong>User Agent:</strong> {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}</p>
        </div>
      </div>

      <div style={{
        background: '#f5f5f5',
        padding: '20px',
        borderRadius: '10px',
        border: '2px solid #4CAF50'
      }}>
        <h3>🔧 Next Steps:</h3>
        <ol>
          <li>Backup this working version</li>
          <li>Add React Router gradually</li>
          <li>Test each component addition</li>
          <li>Identify the problematic component</li>
          <li>Fix the issue</li>
        </ol>
      </div>
    </div>
  );
}