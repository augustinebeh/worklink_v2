#!/bin/bash
# Quick server check
echo ""
echo "🔍 QUICK SERVER CHECK"
echo "===================="
echo ""

# Check if port 8080 is listening
echo "1. Is something listening on port 8080?"
if netstat -tuln 2>/dev/null | grep -q ":8080"; then
    echo "   ✅ YES - Port 8080 is active"
    netstat -tuln | grep ":8080"
elif ss -tuln 2>/dev/null | grep -q ":8080"; then
    echo "   ✅ YES - Port 8080 is active"
    ss -tuln | grep ":8080"
else
    echo "   ❌ NO - Nothing listening on port 8080!"
    echo "   💡 Server might not be running"
fi

echo ""
echo "2. Can we reach the server from WSL?"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null)
if [ "$RESPONSE" = "200" ]; then
    echo "   ✅ YES - Server responds: HTTP $RESPONSE"
    echo "   📄 Response:"
    curl -s http://localhost:8080/health | head -5
else
    echo "   ❌ NO - Server doesn't respond"
    echo "   Got HTTP code: $RESPONSE"
fi

echo ""
echo "3. What processes are using port 8080?"
lsof -i :8080 2>/dev/null || echo "   (lsof not available or no process found)"

echo ""
echo "4. WSL IP addresses:"
hostname -I

echo ""
echo "5. Try these URLs in your browser:"
echo "   • http://localhost:8080/admin"
echo "   • http://127.0.0.1:8080/admin"
WSL_IP=$(hostname -I | awk '{print $1}')
echo "   • http://$WSL_IP:8080/admin"

echo ""
