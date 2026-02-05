#!/bin/bash

echo "🚀 BPO Intelligence API Endpoint Verification"
echo "=============================================="

# Check if server is running
if curl -f -s http://localhost:3000/api/v1/ > /dev/null; then
    echo "✅ Server is running"
    echo ""

    echo "🧪 Running endpoint tests..."
    node quick-endpoint-test.js

    echo ""
    echo "📊 Running comprehensive verification..."
    node test-bpo-intelligence-endpoints.js
else
    echo "❌ Server is not running"
    echo "Please start the server first:"
    echo "  npm start"
    echo ""
    echo "Then run this script again:"
    echo "  ./verify-bpo-endpoints.sh"
fi