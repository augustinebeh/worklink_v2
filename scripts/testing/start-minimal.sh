#!/bin/bash

# WorkLink Minimal Server Startup Script
# Quick way to start the development server without hanging services

echo "🚀 Starting WorkLink Minimal Server..."
echo "📍 Server will be available at:"
echo "   • Worker PWA: http://localhost:8080"
echo "   • Admin Portal: http://localhost:8080/admin"
echo ""
echo "🎮 Demo Credentials:"
echo "   • Worker: sarah.tan@email.com (no password needed)"
echo "   • Admin: admin@worklink.sg / admin123"
echo ""
echo "⚡ This server excludes hanging services (email, schedulers, etc.)"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================="

node minimal-server.js