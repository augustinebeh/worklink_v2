#!/bin/bash
# WSL Server Access Diagnostic
# Run this while server is running in another terminal

echo ""
echo "🔍 WSL SERVER ACCESS DIAGNOSTIC"
echo "================================"
echo ""

# Check if server is running
echo "1️⃣  Checking if server is listening on port 8080..."
if netstat -tuln 2>/dev/null | grep -q ":8080"; then
    echo "   ✅ Server IS listening on port 8080"
else
    if ss -tuln 2>/dev/null | grep -q ":8080"; then
        echo "   ✅ Server IS listening on port 8080"
    else
        echo "   ❌ Server NOT listening on port 8080"
        echo "   💡 Make sure server is running in another terminal"
        exit 1
    fi
fi

echo ""
echo "2️⃣  Getting WSL IP addresses..."
echo ""

# Get WSL IP
WSL_IP=$(hostname -I | awk '{print $1}')
echo "   📍 WSL IP: $WSL_IP"

# Get all IPs
echo ""
echo "   📋 All network interfaces:"
ip addr show | grep "inet " | awk '{print "      " $2}'

echo ""
echo "3️⃣  Testing server accessibility..."
echo ""

# Test localhost
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health 2>/dev/null | grep -q "200"; then
    echo "   ✅ http://localhost:8080 - WORKING"
else
    echo "   ❌ http://localhost:8080 - NOT ACCESSIBLE"
fi

# Test 127.0.0.1
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/health 2>/dev/null | grep -q "200"; then
    echo "   ✅ http://127.0.0.1:8080 - WORKING"
else
    echo "   ❌ http://127.0.0.1:8080 - NOT ACCESSIBLE"
fi

# Test WSL IP
if curl -s -o /dev/null -w "%{http_code}" http://$WSL_IP:8080/health 2>/dev/null | grep -q "200"; then
    echo "   ✅ http://$WSL_IP:8080 - WORKING"
else
    echo "   ❌ http://$WSL_IP:8080 - NOT ACCESSIBLE"
fi

echo ""
echo "4️⃣  URLs to try in your browser:"
echo ""
echo "   From Windows (try these in order):"
echo "   ┌────────────────────────────────────────────┐"
echo "   │ http://localhost:8080                      │"
echo "   │ http://localhost:8080/admin                │"
echo "   │ http://127.0.0.1:8080                      │"
echo "   │ http://$WSL_IP:8080              │"
echo "   └────────────────────────────────────────────┘"
echo ""

echo "5️⃣  Checking Windows firewall (if accessible from WSL)..."
if command -v powershell.exe &> /dev/null; then
    echo "   Checking firewall rules..."
    powershell.exe -Command "Get-NetFirewallRule -DisplayName '*8080*' | Select-Object DisplayName, Enabled, Direction" 2>/dev/null || echo "   ⚠️  Cannot check Windows firewall from WSL"
else
    echo "   ⚠️  PowerShell not accessible from WSL"
fi

echo ""
echo "6️⃣  Quick curl test:"
echo ""
curl -s http://localhost:8080/health | head -20 || echo "   ❌ Could not connect to server"

echo ""
echo ""
echo "💡 TROUBLESHOOTING:"
echo "   • If localhost works in WSL but not Windows:"
echo "     → Check Windows Firewall"
echo "     → Try: http://$WSL_IP:8080"
echo ""
echo "   • If nothing works:"
echo "     → Check server logs for errors"
echo "     → Make sure server started successfully"
echo "     → Try: netstat -tuln | grep 8080"
echo ""
