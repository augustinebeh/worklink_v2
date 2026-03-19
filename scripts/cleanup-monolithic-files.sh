#!/bin/bash
# Cleanup script for verified monolithic files
# Generated: 2026-02-04T19:29:10.813Z

echo "🧹 Cleaning up old monolithic files..."
echo ""

# Delete services/websocket-handlers.js
rm "services/websocket-handlers.js"

echo ""
echo "✅ Cleanup complete!"
