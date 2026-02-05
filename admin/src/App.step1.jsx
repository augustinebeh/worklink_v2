import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Simple test page component
function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1e40af' }}>🚀 Step 1: React Router Test</h1>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <h2>✅ React Router is Working!</h2>
        <p>URL: {window.location.pathname}</p>
        <p>Time: {new Date().toLocaleString()}</p>

        <div style={{ margin: '20px 0' }}>
          <h3>Test Links:</h3>
          <div>
            <a href="/admin/" style={{ color: 'white', margin: '10px' }}>Home</a>
            <a href="/admin/test-route" style={{ color: 'white', margin: '10px' }}>Test Route</a>
            <a href="/admin/test.html" style={{ color: 'white', margin: '10px' }}>Test Page</a>
            <a href="/admin/emergency.html" style={{ color: 'white', margin: '10px' }}>Emergency</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="/test-route" element={<TestPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}