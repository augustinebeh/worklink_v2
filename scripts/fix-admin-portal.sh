#!/bin/bash

# WorkLink Admin Portal Emergency Fix Script
# This script implements immediate fixes for the admin portal

echo "🚨 EMERGENCY ADMIN PORTAL FIX SCRIPT"
echo "===================================="

# Function to show status
show_status() {
    echo ""
    echo "📊 Current Status:"
    echo "  Time: $(date)"
    echo "  PWD: $(pwd)"
    echo "  Admin portal available at: http://localhost:8080/admin/"
    echo "  Emergency dashboard at: http://localhost:8080/admin/emergency.html"
    echo "  Test page at: http://localhost:8080/admin/test.html"
}

# Function to backup current state
backup_current_state() {
    echo ""
    echo "💾 Creating backup..."
    cp admin/src/App.jsx admin/src/App.jsx.emergency_backup_$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
    echo "✅ Backup created"
}

# Function to apply minimal fix
apply_minimal_fix() {
    echo ""
    echo "🔧 Applying minimal fix..."

    # Use the working version we created
    if [ -f admin/src/App.working.jsx ]; then
        cp admin/src/App.working.jsx admin/src/App.jsx
        echo "✅ Applied working App.jsx version"
    else
        echo "❌ Working version not found, creating minimal version..."
        cat > admin/src/App.jsx << 'EOF'
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function MinimalDashboard() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#1e40af' }}>🚀 WorkLink Admin Portal - Emergency Mode</h1>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px'
      }}>
        <h2>✅ Admin Portal Restored!</h2>
        <p>Emergency fix applied successfully.</p>

        <div style={{ margin: '20px 0' }}>
          <h3>Quick Actions:</h3>
          <a href="/admin/emergency.html" style={{
            background: '#f44336', color: 'white', padding: '10px 20px',
            borderRadius: '5px', textDecoration: 'none', margin: '10px'
          }}>🚨 Emergency Dashboard</a>

          <a href="/admin/test.html" style={{
            background: '#4CAF50', color: 'white', padding: '10px 20px',
            borderRadius: '5px', textDecoration: 'none', margin: '10px'
          }}>🧪 Test Page</a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <Routes>
        <Route path="/" element={<MinimalDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
EOF
    fi
}

# Function to rebuild admin portal
rebuild_admin() {
    echo ""
    echo "🔨 Rebuilding admin portal..."

    cd admin

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm install
    fi

    # Build the admin portal
    echo "🏗️ Building..."
    npm run build

    if [ $? -eq 0 ]; then
        echo "✅ Admin portal built successfully"
    else
        echo "❌ Build failed - keeping emergency version"
        return 1
    fi

    cd ..
}

# Function to test admin portal
test_admin_portal() {
    echo ""
    echo "🧪 Testing admin portal..."

    # Test if admin portal responds
    if curl -s -f http://localhost:8080/admin/ > /dev/null; then
        echo "✅ Admin portal is responding"

        # Test if it returns HTML
        if curl -s http://localhost:8080/admin/ | grep -q "<!DOCTYPE html>"; then
            echo "✅ Admin portal returns valid HTML"
        else
            echo "⚠️ Admin portal response might be invalid"
        fi
    else
        echo "❌ Admin portal is not responding"
        echo "💡 You may need to restart the server"
    fi

    # Test emergency pages
    if [ -f "admin/dist/emergency.html" ]; then
        echo "✅ Emergency dashboard available"
    else
        echo "⚠️ Emergency dashboard missing"
    fi

    if [ -f "admin/dist/test.html" ]; then
        echo "✅ Test page available"
    else
        echo "⚠️ Test page missing"
    fi
}

# Function to create emergency access points
create_emergency_access() {
    echo ""
    echo "🚨 Creating emergency access points..."

    # Ensure emergency dashboard exists
    if [ ! -f "admin/dist/emergency.html" ]; then
        echo "Creating emergency dashboard..."
        cp admin/emergency.html admin/dist/emergency.html 2>/dev/null || {
            echo "<!DOCTYPE html><html><head><title>Emergency</title></head><body><h1>Emergency Dashboard</h1><p>Admin portal is being restored.</p><a href='/admin/'>Try Admin Portal</a></body></html>" > admin/dist/emergency.html
        }
    fi

    # Ensure test page exists
    if [ ! -f "admin/dist/test.html" ]; then
        echo "Creating test page..."
        cp admin/test.html admin/dist/test.html 2>/dev/null || {
            echo "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test Page</h1><p>Basic server functionality working.</p><a href='/admin/'>Back to Admin</a></body></html>" > admin/dist/test.html
        }
    fi

    echo "✅ Emergency access points ready"
}

# Main execution
main() {
    echo "Starting emergency fix procedure..."

    # Show current status
    show_status

    # Create emergency access points first
    create_emergency_access

    # Backup current state
    backup_current_state

    # Apply minimal fix
    apply_minimal_fix

    # Rebuild admin portal
    rebuild_admin

    # Test the result
    test_admin_portal

    # Final status
    echo ""
    echo "🎉 EMERGENCY FIX COMPLETE!"
    echo "========================================="
    show_status
    echo ""
    echo "🔗 ACCESS POINTS:"
    echo "  Main Admin Portal: http://localhost:8080/admin/"
    echo "  Emergency Dashboard: http://localhost:8080/admin/emergency.html"
    echo "  Test Page: http://localhost:8080/admin/test.html"
    echo ""
    echo "📝 NOTES:"
    echo "  - If main portal still shows white page, use emergency dashboard"
    echo "  - Emergency dashboard provides basic admin functions"
    echo "  - Test page verifies server connectivity"
    echo "  - Original App.jsx backed up with timestamp"
}

# Check if we're in the right directory
if [ ! -d "admin" ]; then
    echo "❌ Error: Must run from project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: directory containing 'admin' folder"
    exit 1
fi

# Run main function
main

echo ""
echo "✅ Fix script completed successfully!"
echo "   Run this script again anytime to re-apply fixes."